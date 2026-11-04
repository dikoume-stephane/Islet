/**
 * English messages — the source of truth for every key in the app.
 *
 * Not because English is more important, but because *one* dictionary has to
 * define the shape: `fr.ts` is typed against this object, so a key added here
 * and forgotten there is a compile error rather than a blank label in the
 * middle of the French UI.
 *
 * Conventions
 *  - Flat, dot-separated keys: `area.thing`. No nesting, so lookup stays a
 *    plain object access and renaming a key is a single search.
 *  - Placeholders are `{{name}}` and are filled by `t(key, params)`.
 *  - A value may be `{ one, other }` for plurals. `t` picks the form from
 *    `params.count`. French needs this as much as English ("1 jour" / "2 jours").
 *  - Never build a sentence by concatenating two keys: word order differs
 *    between languages. Put the whole sentence in one key and use placeholders.
 */
export const en = {
  // — Is: tips shown in the notch ------------------------------------------
  "tip.batteryCritical": "Battery at {{percent}}% — plug in now",
  "tip.batteryLow": "Battery at {{percent}}% — time to charge",
  "tip.batteryLowWithTime": "Battery at {{percent}}% — {{time}} left, charge soon",
  "tip.batteryTime": "About {{time}} of battery left",
  "tip.batteryFull": "Battery full — you can unplug",
  "tip.chargeReminder": "Charged to {{percent}}% — you can unplug",
  "tip.diskCritical": "{{mount}} almost out of space — {{free}} left",
  "tip.diskLow": "{{mount}} almost full — {{free}} left",
  "tip.memoryCritical": "Memory nearly full ({{percent}}%) — save your work",
  "tip.memoryHigh": "Memory at {{percent}}% — close an app?",
  "tip.cpuHigh": "CPU at {{percent}}% — something is busy",
  "tip.restart": {
    one: "{{count}} day without a restart — reboot?",
    other: "{{count}} days without a restart — reboot?",
  },
  "tip.sessionLong": "{{hours}} h uptime — take a break?",
  "tip.lateNight": "It's {{time}} — time to wrap up?",
  "tip.dismiss": "Dismiss tip",

  // — The notch ------------------------------------------------------------
  "notch.updateAvailable": "Update Available",
  "notch.lowBattery": "Low Battery",
  "notch.charging": "Charging",
  "notch.onBattery": "On Battery",

  // — Shared UI ------------------------------------------------------------
  "common.none": "—",
  "common.charing": "charging",
  "common.now": "Now: {{value}}",

  // — Settings window ------------------------------------------------------
  "settings.title": "Settings",
  "settings.welcomeTitle": "Welcome to Islet",
  "settings.tab.general": "General",
  "settings.tab.appearance": "Appearance",
  "settings.tab.notch": "Notch",
  "settings.tab.dock": "Dock",
  "settings.tab.overlays": "Overlays",
  "settings.tab.about": "About",

  // — Settings: General ----------------------------------------------------
  "settings.general.system": "System",
  "settings.general.autostart": "Launch at Login",
  "settings.general.autostart.desc": "Open Islet automatically",
  "settings.general.updateIndicator": "Update Indicator",
  "settings.general.updateIndicator.desc": "Show green dot when update available",
  "settings.general.timeFormat": "24-Hour Time",
  "settings.general.timeFormat.desc": "Use 24-hour clock format",
  "settings.general.lowBattery": "Low Battery Alert",
  "settings.general.lowBattery.desc": "Trigger at {{percent}}%",
  "settings.general.app": "App",
  "settings.general.replay": "Replay the Welcome",
  "settings.general.replay.desc": "Walk through the first-run setup again — nothing is reset",
  "settings.general.restart": "Restart Islet",
  "settings.general.restart.desc": "Reinitialize all components",
  "settings.general.quit": "Quit Islet",
  "settings.general.quit.desc": "Exit application completely",

  // — Settings: language ---------------------------------------------------
  "settings.language": "Language",
  "settings.language.title": "Language",
  "settings.language.desc": "Applied immediately, across the whole app",
  "settings.language.system": "Follow Windows",
  "settings.language.fr": "Français",
  "settings.language.en": "English",

  // — Settings: Is ---------------------------------------------------------
  "settings.assistant.group": "{{name}} — Assistant",
  "settings.assistant.name": "Name",
  "settings.assistant.name.desc": "What the notch calls your assistant",
  "settings.assistant.enable": "Enable {{name}}",
  "settings.assistant.enable.desc":
    "Short tips in the notch, plus a coloured outline that stays until you click it and read them",
  "settings.assistant.watches": "What {{name}} watches",
  "settings.assistant.battery": "Battery",
  "settings.assistant.battery.live": "Now: {{percent}}%{{charging}}",
  "settings.assistant.battery.desc": "Low battery, charge reminder, full charge",
  "settings.assistant.storage": "Storage",
  "settings.assistant.storage.desc": "Disk filling up, and drives about to run out of space",
  "settings.assistant.performance": "Performance",
  "settings.assistant.performance.desc": "Sustained CPU load and memory pressure",
  "settings.assistant.session": "Session",
  "settings.assistant.session.live": "Uptime now: {{uptime}}",
  "settings.assistant.session.desc": "Long session, delayed restart and late nights",

  "settings.assistant.thresholds": "Thresholds",
  "settings.assistant.lowBattery": "Low battery warning",
  "settings.assistant.lowBattery.desc": "Warn when the battery drops to this level",
  "settings.assistant.chargeLimit": "Charge reminder",
  "settings.assistant.chargeLimit.desc": "Suggest unplugging once the battery reaches this level",
  "settings.assistant.freeSpaceFloor": "Free space floor",
  "settings.assistant.freeSpaceFloor.desc": "Warn when a drive has less than this share free",
  "settings.assistant.sessionHours": "Long session",
  "settings.assistant.sessionHours.desc": "Suggest a break after this many hours of uptime",

  "settings.assistant.live": "Right now",
  "settings.assistant.cpu": "CPU",
  "settings.assistant.cpu.desc": "Instantaneous load",
  "settings.assistant.memory": "Memory",
  "settings.assistant.memory.desc": "Physical memory in use",
  "settings.assistant.uptime": "Uptime",
  "settings.assistant.uptime.desc": "Time since Windows started",
  "settings.assistant.disks": "Disks",
  "settings.assistant.disks.desc": "Fixed volumes and free space",

  // — Welcome flow ---------------------------------------------------------
  "welcome.title": "Welcome to Islet",
  "welcome.lead":
    "A notch and a dock, on top of your screen. Two minutes to set it up the way you work — and nothing is locked in afterwards.",
  "welcome.name": "What should I be called?",
  "welcome.nameHint": "The little assistant that reads your PC and tells you about it.",
  "welcome.nameAria": "Assistant name",

  "welcome.look": "Choose a look",
  "welcome.lookLead":
    "The notch, the dock and Is all follow this. You can change it any time in Settings › Appearance.",
  "welcome.theme.dark": "Dark",
  "welcome.theme.darkHint": "The default. Blends into a dark wallpaper.",
  "welcome.theme.light": "Light",
  "welcome.theme.lightHint": "Frosted white, readable on bright desktops.",
  "welcome.theme.custom": "Custom",
  "welcome.theme.customHint": "Your own accent colour, darkened to stay readable.",
  "welcome.theme.adaptive": "Adaptive",
  "welcome.theme.adaptiveHint": "Follows the Windows accent colour automatically.",
  "welcome.accent": "Accent colour",

  "welcome.home": "Where does it live?",
  "welcome.homeLead":
    "The notch hangs from the top of the screen. The dock replaces the Start menu strip at the bottom. Both can run at once.",
  "welcome.top": "Top of the screen",
  "welcome.notch.fixed": "Fixed",
  "welcome.notch.fixedHint": "Always visible. The classic notch.",
  "welcome.notch.smart": "Smart",
  "welcome.notch.smartHint": "Hides itself until the mouse reaches the top edge.",
  "welcome.notch.peek": "Peek",
  "welcome.notch.peekHint": "Stays as a small pill, unfolds on hover.",
  "welcome.bottom": "Bottom of the screen",
  "welcome.dock": "Show the dock",
  "welcome.dockHint": "Your pinned apps, window previews and a search field, at the bottom edge.",

  "welcome.privacy": "What leaves your PC",
  "welcome.privacyLead":
    "Almost nothing. Islet works offline; three things can reach the internet, and each one is yours to decide.",
  "welcome.privacy.local": "Stays here.",
  "welcome.privacy.localBody":
    "Battery, disks, memory, CPU, uptime, your windows, your settings, what Is tells you. None of it is sent anywhere, and there is no account.",
  "welcome.privacy.weather": "Weather",
  "welcome.privacy.weatherBody":
    "asks a public forecast service for one city — the name of it, nothing else. Off unless you set a city.",
  "welcome.privacy.calendar": "Calendar sync",
  "welcome.privacy.calendarBody":
    "only talks to the CalDAV server you configure yourself. Off by default.",
  "welcome.updates": "Check for updates automatically",
  "welcome.updatesHint":
    "Contacts GitHub on startup and downloads new versions. Installing stays manual — you always get the prompt.",

  "welcome.done": "You're set",
  "welcome.doneLead":
    "Everything here is reversible: Settings › General has an entry to replay this screen.",
  "welcome.summary.assistant": "Assistant",
  "welcome.summary.theme": "Theme",
  "welcome.summary.notch": "Notch",
  "welcome.summary.dock": "Dock",
  "welcome.summary.on": "On",
  "welcome.summary.off": "Off",
  "welcome.summary.customAccent": "Custom accent",
  "welcome.footnote":
    "Next: hover the notch to open it, or right-click its icon in the tray for the same Settings window you are looking at.",

  "welcome.back": "Back",
  "welcome.skip": "Skip",
  "welcome.continue": "Continue",
  "welcome.start": "Start using Islet",
} as const;

export type MessageKey = keyof typeof en;
export type MessageValue = string | { one: string; other: string };
