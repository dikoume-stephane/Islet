import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BUILD_TAIL,
  buildTail,
  buildVerdict,
  devNotes,
  DIRTY_AFTER_MS,
  formatAge,
  formatDuration,
  isExposedAddress,
  MAX_PORTS,
  parseGitPulse,
  parseNetstat,
  PORT_HELD_MS,
  trackGit,
  trackPorts,
  type GitPulse,
  type PortEntry,
} from "../src/lib/dev.ts";

/**
 * Les signaux du développeur.
 *
 * Le parseur de `netstat` est la pièce à risque : sa sortie change de forme
 * entre IPv4 et IPv6, les en-têtes sont traduits et les lignes non. Tout est
 * donc vérifié sur des lignes figées, sans machine Windows.
 */

const HEADER = [
  "Connexions actives",
  "",
  "  Proto  Adresse locale         Adresse externe        État            PID",
];

const pulse = (over: Partial<GitPulse> = {}): GitPulse => ({
  branch: "main",
  detached: false,
  dirty: 0,
  ahead: 0,
  behind: 0,
  dirtySince: null,
  at: 0,
  ...over,
});

describe("parseNetstat", () => {
  it("lit une ligne IPv4 classique", () => {
    const rows = parseNetstat([...HEADER, "  TCP    127.0.0.1:3000         0.0.0.0:0              LISTENING       22012"]);
    assert.deepEqual(rows, [{ port: 3000, address: "127.0.0.1", pid: 22012 }]);
  });

  it("lit une ligne IPv6 à crochets", () => {
    const rows = parseNetstat([...HEADER, "  TCP    [::]:445               [::]:0                 LISTENING       4"]);
    assert.deepEqual(rows, [{ port: 445, address: "::", pid: 4 }]);
  });

  it("lit une adresse IPv6 de boucle locale", () => {
    const rows = parseNetstat([...HEADER, "  TCP    [::1]:5173             [::]:0                 LISTENING       9911"]);
    assert.deepEqual(rows, [{ port: 5173, address: "::1", pid: 9911 }]);
  });

  it("ignore tout ce qui n'écoute pas", () => {
    const rows = parseNetstat([
      ...HEADER,
      "  TCP    192.168.1.20:51544     93.184.216.34:443      ESTABLISHED     4100",
      "  TCP    192.168.1.20:51545     93.184.216.34:443      TIME_WAIT       0",
    ]);
    assert.deepEqual(rows, []);
  });

  it("ignore les lignes d'en-tête traduites", () => {
    assert.deepEqual(parseNetstat(HEADER), []);
  });

  it("ignore une ligne tronquée", () => {
    assert.deepEqual(parseNetstat(["  TCP    127.0.0.1:3000"]), []);
  });

  it("ignore un port hors bornes", () => {
    assert.deepEqual(parseNetstat(["  TCP    127.0.0.1:70000  0.0.0.0:0  LISTENING  12"]), []);
    assert.deepEqual(parseNetstat(["  TCP    127.0.0.1:0      0.0.0.0:0  LISTENING  12"]), []);
  });

  it("ignore un PID qui n'est pas un nombre", () => {
    assert.deepEqual(parseNetstat(["  TCP    127.0.0.1:3000  0.0.0.0:0  LISTENING  ???"]), []);
  });

  it("accepte plusieurs lignes d'un coup", () => {
    const rows = parseNetstat([
      "  TCP    0.0.0.0:135      0.0.0.0:0   LISTENING  1124",
      "  TCP    0.0.0.0:3000     0.0.0.0:0   LISTENING  22012",
      "  TCP    [::]:3000        [::]:0      LISTENING  22012",
    ]);
    assert.equal(rows.length, 3);
  });
});

describe("isExposedAddress", () => {
  it("reconnaît les adresses de toutes les interfaces", () => {
    assert.equal(isExposedAddress("0.0.0.0"), true);
    assert.equal(isExposedAddress("::"), true);
    assert.equal(isExposedAddress("[::]"), true);
    assert.equal(isExposedAddress("*"), true);
  });

  it("ne signale pas la boucle locale", () => {
    assert.equal(isExposedAddress("127.0.0.1"), false);
    assert.equal(isExposedAddress("::1"), false);
    assert.equal(isExposedAddress("192.168.1.20"), false);
  });
});

describe("trackPorts", () => {
  const now = 1_000_000;

  it("fusionne IPv4 et IPv6 d'un même port", () => {
    const ports = trackPorts(
      [],
      [
        { port: 3000, address: "0.0.0.0", pid: 22012 },
        { port: 3000, address: "::", pid: 22012 },
      ],
      now,
    );
    assert.equal(ports.length, 1);
    assert.deepEqual(ports[0].addresses, ["0.0.0.0", "::"]);
    assert.equal(ports[0].exposed, true);
  });

  it("garde l'horodatage d'origine tant que le processus tient le port", () => {
    const before: PortEntry[] = [
      { port: 3000, addresses: ["127.0.0.1"], exposed: false, pid: 22012, since: 500_000 },
    ];
    const ports = trackPorts(before, [{ port: 3000, address: "127.0.0.1", pid: 22012 }], now);
    assert.equal(ports[0].since, 500_000);
  });

  it("repart à zéro quand le port change de propriétaire", () => {
    const before: PortEntry[] = [
      { port: 3000, addresses: ["127.0.0.1"], exposed: false, pid: 1, since: 500_000 },
    ];
    const ports = trackPorts(before, [{ port: 3000, address: "127.0.0.1", pid: 2 }], now);
    assert.equal(ports[0].since, now);
  });

  it("oublie les ports qui ne sont plus là", () => {
    const before: PortEntry[] = [
      { port: 3000, addresses: ["127.0.0.1"], exposed: false, pid: 1, since: 1 },
    ];
    assert.deepEqual(trackPorts(before, [], now), []);
  });

  it("trie par numéro de port et borne la liste", () => {
    const many = Array.from({ length: MAX_PORTS + 12 }, (_, index) => ({
      port: 9000 - index,
      address: "127.0.0.1",
      pid: index + 1,
    }));
    const ports = trackPorts([], many, now);
    assert.equal(ports.length, MAX_PORTS);
    assert.equal(ports[0].port, 9000 - (MAX_PORTS + 11));
  });
});

describe("parseGitPulse", () => {
  it("compte les fichiers modifiés", () => {
    const pulse = parseGitPulse(
      { branch: "main\n", porcelain: " M src/App.tsx\n?? notes.md\n", counts: "" },
      42,
    );
    assert.equal(pulse.branch, "main");
    assert.equal(pulse.dirty, 2);
    assert.equal(pulse.ahead, 0);
    assert.equal(pulse.behind, 0);
    assert.equal(pulse.at, 42);
  });

  it("lit le retard puis l'avance dans cet ordre", () => {
    const pulse = parseGitPulse({ branch: "dev", porcelain: "", counts: "3\t5\n" }, 0);
    assert.equal(pulse.behind, 3);
    assert.equal(pulse.ahead, 5);
  });

  it("met tout à zéro sans branche amont", () => {
    const pulse = parseGitPulse({ branch: "dev", porcelain: "", counts: "" }, 0);
    assert.equal(pulse.ahead, 0);
    assert.equal(pulse.behind, 0);
  });

  it("reconnaît une tête détachée", () => {
    assert.equal(parseGitPulse({ branch: "HEAD", porcelain: "", counts: "" }, 0).detached, true);
  });

  it("ne laisse pas une branche vide", () => {
    assert.equal(parseGitPulse({ branch: "", porcelain: "", counts: "" }, 0).branch, "?");
  });
});

describe("trackGit", () => {
  const fresh = parseGitPulse({ branch: "main", porcelain: " M a.ts\n", counts: "" }, 1000);

  it("date la saleté au premier relevé sale", () => {
    assert.equal(trackGit(null, fresh, 1000).dirtySince, 1000);
  });

  it("conserve la date tant que la branche reste sale", () => {
    const first = trackGit(null, fresh, 1000);
    const later = trackGit(first, fresh, 5000);
    assert.equal(later.dirtySince, 1000);
  });

  it("oublie la date quand la branche redevient propre", () => {
    const first = trackGit(null, fresh, 1000);
    const clean = parseGitPulse({ branch: "main", porcelain: "", counts: "" }, 5000);
    assert.equal(trackGit(first, clean, 5000).dirtySince, null);
  });
});

describe("devNotes", () => {
  const now = 10 * 60_000_000;

  it("ne dit rien sur un dépôt propre et une machine au repos", () => {
    assert.deepEqual(devNotes(pulse(), [], now), []);
  });

  it("signale un retard sur la branche amont", () => {
    assert.deepEqual(devNotes(pulse({ behind: 4 }), [], now), [{ kind: "behind", commits: 4 }]);
  });

  it("attend douze minutes avant de parler d'une branche sale", () => {
    const young = pulse({ dirty: 3, dirtySince: now - DIRTY_AFTER_MS + 1000 });
    assert.deepEqual(devNotes(young, [], now), []);
    const old = pulse({ dirty: 3, dirtySince: now - DIRTY_AFTER_MS });
    assert.deepEqual(devNotes(old, [], now), [{ kind: "dirty", minutes: 12 }]);
  });

  it("signale un port tenu depuis deux heures", () => {
    const ports: PortEntry[] = [
      { port: 3000, addresses: ["127.0.0.1"], exposed: false, pid: 9, since: now - PORT_HELD_MS },
    ];
    assert.deepEqual(devNotes(null, ports, now), [{ kind: "port", port: 3000, pid: 9, minutes: 120 }]);
  });

  it("ignore les ports que le système garde ouverts pour toujours", () => {
    const ports: PortEntry[] = [
      { port: 445, addresses: ["0.0.0.0"], exposed: true, pid: 4, since: now - PORT_HELD_MS * 3 },
      { port: 135, addresses: ["0.0.0.0"], exposed: true, pid: 1124, since: now - PORT_HELD_MS * 3 },
    ];
    assert.deepEqual(devNotes(null, ports, now), []);
  });

  it("ignore un port récent", () => {
    const ports: PortEntry[] = [
      { port: 5173, addresses: ["127.0.0.1"], exposed: false, pid: 9, since: now - 60_000 },
    ];
    assert.deepEqual(devNotes(null, ports, now), []);
  });

  it("ne garde que deux remarques, la plus utile d'abord", () => {
    const notes = devNotes(
      pulse({ dirty: 1, dirtySince: now - DIRTY_AFTER_MS, behind: 2 }),
      [
        { port: 3000, addresses: [], exposed: false, pid: 1, since: now - PORT_HELD_MS },
        { port: 4000, addresses: [], exposed: false, pid: 2, since: now - PORT_HELD_MS * 2 },
      ],
      now,
    );
    assert.equal(notes.length, 2);
    assert.equal(notes[0].kind, "behind");
    assert.equal(notes[1].kind, "dirty");
  });
});

describe("formatAge", () => {
  it("reste en minutes sous l'heure", () => {
    assert.equal(formatAge(12 * 60_000), "12 min");
    assert.equal(formatAge(59.9 * 60_000), "59 min");
  });

  it("passe en heures avec des minutes sur deux chiffres", () => {
    assert.equal(formatAge(60 * 60_000), "1 h");
    assert.equal(formatAge(125 * 60_000), "2 h 05");
  });

  it("ne bronche pas sur une valeur absurde", () => {
    assert.equal(formatAge(Number.NaN), "0 min");
    assert.equal(formatAge(-5000), "0 min");
  });
});

describe("buildTail", () => {
  it("garde la fin de la sortie, là où se trouve l'erreur", () => {
    const lines = ["vite v7.0.0 building", "transform 42 modules", "x unused variable", "error: exit 1"];
    assert.deepEqual(buildTail(lines, 2), ["x unused variable", "error: exit 1"]);
    assert.equal(buildTail(lines).length, BUILD_TAIL);
  });

  it("retire les couleurs d'un terminal", () => {
    const ansi = "\u001b[32m✓\u001b[0m built in 3.4s";
    assert.deepEqual(buildTail([ansi], 4), ["✓ built in 3.4s"]);
  });

  it("laisse tomber les lignes vides et les espaces de fin", () => {
    assert.deepEqual(buildTail(["", "   ", "cargo: ok   ", ""], 4), ["cargo: ok"]);
  });

  it("ne bronche pas sur une sortie vide", () => {
    assert.deepEqual(buildTail([], 4), []);
    assert.deepEqual(buildTail(["a"], 0), []);
  });
});

describe("buildVerdict", () => {
  const raw = (code: number | null, timed_out = false) => ({
    code,
    timed_out,
    duration_ms: 1000,
    lines: [],
  });

  it("un code zéro est une réussite", () => {
    assert.equal(buildVerdict(raw(0)), "ok");
  });

  it("un code non zéro est un échec", () => {
    assert.equal(buildVerdict(raw(1)), "failed");
    assert.equal(buildVerdict(raw(null)), "failed");
  });

  it("une commande arrêtée n'est ni une réussite ni un échec", () => {
    assert.equal(buildVerdict(raw(null, true)), "timeout");
    // Même si le shell avait déjà rendu zéro avant d'être tué.
    assert.equal(buildVerdict(raw(0, true)), "timeout");
  });
});

describe("formatDuration", () => {
  it("reste en millisecondes sous la seconde", () => {
    assert.equal(formatDuration(0), "0 ms");
    assert.equal(formatDuration(850), "850 ms");
  });

  it("donne un dixième sous la dizaine de secondes", () => {
    assert.equal(formatDuration(3_400), "3.4 s");
    assert.equal(formatDuration(9_999), "9.9 s");
  });

  it("arrondit à la seconde au-delà", () => {
    assert.equal(formatDuration(10_000), "10 s");
    assert.equal(formatDuration(48_700), "48 s");
  });

  it("repasse aux minutes, puis aux heures", () => {
    assert.equal(formatDuration(60_000), "1 min");
    assert.equal(formatDuration(125 * 60_000), "2 h 05");
  });

  it("ne bronche pas sur une valeur absurde", () => {
    assert.equal(formatDuration(Number.NaN), "0 ms");
    assert.equal(formatDuration(-10), "0 ms");
  });
});
