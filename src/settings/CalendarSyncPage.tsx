import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { CalendarDays, ChevronLeft, CloudCog, Link2, Plus, RefreshCw, Timer, Trash2, Unplug } from "lucide-react";
import { SettingRow } from "./SettingRow";
import { Dropdown } from "./Dropdown";
import { useCaldav } from "../hooks/useCaldav";
import { useT, t } from "../i18n";
import type { MessageKey } from "../i18n/en";

function timeAgo(ms: number | null): string {
  if (!ms) return t("caldav.time.never");
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return t("caldav.time.now");
  if (mins < 60) return t("caldav.time.minutes", { count: mins });
  const hours = Math.round(mins / 60);
  return hours < 24
    ? t("caldav.time.hours", { count: hours })
    : t("caldav.time.days", { count: Math.round(hours / 24) });
}

const PROVIDER_LABELS: Record<string, MessageKey> = {
  google: "caldav.provider.google",
  icloud: "caldav.provider.icloud",
  outlook: "caldav.provider.outlook",
  proton: "caldav.provider.proton",
  fastmail: "caldav.provider.fastmail",
  nextcloud: "caldav.provider.nextcloud",
  other: "caldav.provider.other",
};

interface Guide {
  id: string;
  labelKey: MessageKey;
  stepKeys: MessageKey[];
  noteKey: MessageKey;
}

const GUIDES: Guide[] = [
  {
    id: "google",
    labelKey: "caldav.guide.google.label",
    stepKeys: ["caldav.guide.google.s1", "caldav.guide.google.s2", "caldav.guide.google.s3"],
    noteKey: "caldav.guide.google.note",
  },
  {
    id: "icloud",
    labelKey: "caldav.guide.icloud.label",
    stepKeys: ["caldav.guide.icloud.s1", "caldav.guide.icloud.s2", "caldav.guide.icloud.s3", "caldav.guide.icloud.s4"],
    noteKey: "caldav.guide.icloud.note",
  },
  {
    id: "outlook",
    labelKey: "caldav.guide.outlook.label",
    stepKeys: ["caldav.guide.outlook.s1", "caldav.guide.outlook.s2", "caldav.guide.outlook.s3", "caldav.guide.outlook.s4"],
    noteKey: "caldav.guide.outlook.note",
  },
  {
    id: "proton",
    labelKey: "caldav.guide.proton.label",
    stepKeys: ["caldav.guide.proton.s1", "caldav.guide.proton.s2", "caldav.guide.proton.s3", "caldav.guide.proton.s4"],
    noteKey: "caldav.guide.proton.note",
  },
  {
    id: "nextcloud",
    labelKey: "caldav.guide.nextcloud.label",
    stepKeys: ["caldav.guide.nextcloud.s1", "caldav.guide.nextcloud.s2", "caldav.guide.nextcloud.s3"],
    noteKey: "caldav.guide.nextcloud.note",
  },
  {
    id: "other",
    labelKey: "caldav.guide.other.label",
    stepKeys: ["caldav.guide.other.s1", "caldav.guide.other.s2"],
    noteKey: "caldav.guide.other.note",
  },
];

type Provider = "nextcloud" | "icloud" | "other";

const ICLOUD_URL = "https://caldav.icloud.com";

const ACCOUNT_PROVIDERS: Record<
  Provider,
  { labelKey: MessageKey; urlKey: MessageKey | null; userKey: MessageKey; hintKey: MessageKey }
> = {
  nextcloud: {
    labelKey: "caldav.acct.nextcloud.label",
    urlKey: "caldav.acct.nextcloud.url",
    userKey: "caldav.acct.nextcloud.user",
    hintKey: "caldav.acct.nextcloud.hint",
  },
  icloud: {
    labelKey: "caldav.acct.icloud.label",
    urlKey: null,
    userKey: "caldav.acct.icloud.user",
    hintKey: "caldav.acct.icloud.hint",
  },
  other: {
    labelKey: "caldav.acct.other.label",
    urlKey: "caldav.acct.other.url",
    userKey: "caldav.acct.other.user",
    hintKey: "caldav.acct.other.hint",
  },
};

interface Detection {
  provider: string;
  label: string;
  problem: string | null;
}

export function CalendarSyncPage({ onBack }: { onBack: () => void }) {
  const t = useT();
  const state = useCaldav();
  const [interval, setIntervalValue] = useState("15");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [linkUrl, setLinkUrl] = useState("");
  const [linkName, setLinkName] = useState("");
  const [detection, setDetection] = useState<Detection | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [guideId, setGuideId] = useState<string | null>(null);

  const [provider, setProvider] = useState<Provider>("nextcloud");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    invoke<Record<string, string>>("load_settings")
      .then((s) => {
        const savedUrl = s["islet-caldav-url"] ?? "";
        setUrl(savedUrl);
        if (savedUrl.includes("icloud.com")) setProvider("icloud");
        setUsername(s["islet-caldav-username"] ?? "");
        setIntervalValue(s["islet-caldav-interval"] ?? "15");
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!linkUrl.trim()) {
      setDetection(null);
      return;
    }
    let alive = true;
    invoke<Detection | null>("ics_detect", { url: linkUrl })
      .then((d) => alive && setDetection(d))
      .catch(() => alive && setDetection(null));
    return () => {
      alive = false;
    };
  }, [linkUrl]);

  const run = async (id: string, command: string, args?: Record<string, unknown>, onOk?: () => void) => {
    setBusy(id);
    setMessage(null);
    try {
      await invoke(command, args);
      onOk?.();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(null);
    }
  };

  const changeInterval = (minutes: string) => {
    setIntervalValue(minutes);
    invoke("save_setting", { key: "islet-caldav-interval", value: minutes }).catch(() => {});
  };

  const pickProvider = (next: Provider) => {
    setProvider(next);
    setMessage(null);
    if (next === "icloud") setUrl(ICLOUD_URL);
    else if (url === ICLOUD_URL) setUrl("");
  };

  const sources = (state.account ? 1 : 0) + state.links.length;
  const status = sources
    ? t("caldav.summary", {
        sources: t("caldav.sources", { count: sources }),
        events: t("caldav.events", { count: state.events.length }),
        when: timeAgo(state.syncedAt),
      })
    : t("caldav.nothing");

  const account = ACCOUNT_PROVIDERS[provider];
  const activeGuide =
    GUIDES.find((g) => g.id === (guideId ?? detection?.provider)) ?? GUIDES[GUIDES.length - 1];

  return (
    <>
      <div className="caldav-page-header">
        <button className="caldav-back" onClick={onBack}>
          <ChevronLeft size={14} /> {t("caldav.back")}
        </button>
        <div className="caldav-actions">
          {sources > 0 && (
            <button className="caldav-btn" onClick={() => invoke("open_calendar_window").catch(() => {})}>
              <CalendarDays size={11} /> {t("caldav.openCalendar")}
            </button>
          )}
          {sources > 0 && (
            <button className="caldav-btn" disabled={busy !== null} onClick={() => run("sync", "caldav_sync_now")}>
              <RefreshCw size={11} /> {busy === "sync" ? t("caldav.syncing") : t("caldav.syncNow")}
            </button>
          )}
        </div>
      </div>

      <div className="setting-group-label">{t("caldav.group")}</div>
      <div className="setting-group">
        <SettingRow
          icon={Timer}
          label={t("caldav.interval")}
          desc={status}
          divider={false}
        >
          <Dropdown
            value={interval}
            onChange={changeInterval}
            options={[
              { value: "5", label: t("caldav.interval.5") },
              { value: "15", label: t("caldav.interval.15") },
              { value: "30", label: t("caldav.interval.30") },
              { value: "60", label: t("caldav.interval.60") },
            ]}
          />
        </SettingRow>
      </div>

      {message && <div className="caldav-error caldav-error--page">{message}</div>}

      <div className="setting-group-label setting-group-label--spaced">{t("caldav.links")}</div>
      <div className="setting-group">
        <div className="caldav-intro">{t("caldav.links.intro")}</div>

        {state.links.map((link) => (
          <div key={link.id}>
            <SettingRow
              icon={Link2}
              label={link.name}
              desc={t("caldav.summary", {
                sources: PROVIDER_LABELS[link.provider] ? t(PROVIDER_LABELS[link.provider]) : t("caldav.provider.other"),
                events: t("caldav.events", { count: link.events }),
                when: timeAgo(link.syncedAt),
              })}
            >
              <button
                className="caldav-btn danger"
                disabled={busy !== null}
                onClick={() => run(`rm-${link.id}`, "ics_remove_link", { id: link.id })}
              >
                <Trash2 size={11} /> {t("caldav.remove")}
              </button>
            </SettingRow>
            {link.error && <div className="caldav-error">{link.error}</div>}
          </div>
        ))}

        <div className="caldav-form">
          <input
            type="text"
            placeholder={t("caldav.linkPlaceholder")}
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            spellCheck={false}
          />
          {detection && (
            <div className={`caldav-detect ${detection.problem ? "bad" : "good"}`}>
              {detection.problem ?? t("caldav.recognized", { provider: detection.label })}
            </div>
          )}
          <input
            type="text"
            placeholder={t("caldav.namePlaceholder")}
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            autoComplete="off"
          />
          <div className="caldav-form-footer">
            <button className="caldav-link-btn" onClick={() => setShowGuide((v) => !v)}>
              {showGuide ? t("caldav.hide") : t("caldav.whereLink")}
            </button>
            <button
              className="caldav-btn primary"
              disabled={busy !== null || !linkUrl.trim() || !!detection?.problem}
              onClick={() =>
                run("add", "ics_add_link", { url: linkUrl, name: linkName }, () => {
                  setLinkUrl("");
                  setLinkName("");
                })
              }
            >
              <Plus size={11} /> {busy === "add" ? t("caldav.adding") : t("caldav.add")}
            </button>
          </div>
        </div>

        {showGuide && (
          <div className="caldav-guide">
            <div className="caldav-chips">
              {GUIDES.map((g) => (
                <button key={g.id} className={g.id === activeGuide.id ? "active" : ""} onClick={() => setGuideId(g.id)}>
                  {t(g.labelKey)}
                </button>
              ))}
            </div>
            <ol>
              {activeGuide.stepKeys.map((stepKey) => (
                <li key={stepKey}>{t(stepKey)}</li>
              ))}
            </ol>
            <p>{t(activeGuide.noteKey)}</p>
          </div>
        )}
      </div>

      <div className="setting-group-label setting-group-label--spaced">{t("caldav.account")}</div>
      <div className="setting-group">
        <SettingRow
          icon={CloudCog}
          label={t("caldav.account.label")}
          desc={
            state.account
              ? t("caldav.accountSummary", {
                  calendars: t("caldav.calendars", { count: state.account.calendars }),
                  events: t("caldav.events", { count: state.account.events }),
                  when: timeAgo(state.account.syncedAt),
                })
              : t("caldav.account.desc")
          }
          divider={!state.account}
        >
          {state.account && (
            <button className="caldav-btn danger" disabled={busy !== null} onClick={() => run("disconnect", "caldav_disconnect")}>
              <Unplug size={11} /> {t("caldav.disconnect")}
            </button>
          )}
        </SettingRow>
        {state.account?.error && <div className="caldav-error">{state.account.error}</div>}

        {!state.account && (
          <div className="caldav-form">
            <div className="unit-toggle-minimal wide caldav-providers">
              {(Object.keys(ACCOUNT_PROVIDERS) as Provider[]).map((key) => (
                <span key={key} className={provider === key ? "active" : ""} onClick={() => pickProvider(key)}>
                  {t(ACCOUNT_PROVIDERS[key].labelKey)}
                </span>
              ))}
            </div>
            {account.urlKey && (
              <input
                type="text"
                placeholder={t(account.urlKey)}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                spellCheck={false}
              />
            )}
            <input
              type="text"
              placeholder={t(account.userKey)}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
            <input
              type="password"
              placeholder={t("caldav.appPassword")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="off"
            />
            <div className="caldav-form-footer">
              <span className="caldav-hint">
                {t(account.hintKey)} {t("caldav.acct.secret")}
              </span>
              <button
                className="caldav-btn primary"
                disabled={busy !== null || !url.trim() || !username.trim() || !password}
                onClick={() => run("connect", "caldav_connect", { url, username, password }, () => setPassword(""))}
              >
                <Link2 size={11} /> {busy === "connect" ? t("caldav.connecting") : t("caldav.connect")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
