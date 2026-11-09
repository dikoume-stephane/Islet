# Islet Settings Reference

All settings are stored in `settings.json` in the app config directory (`%APPDATA%/com.2DS.islet/`, derived from the Tauri app identifier). The file is a flat JSON object with `islet-` prefixed keys. Islet watches this file for external changes and applies them in real-time.

## Quick Start

Edit `settings.json` with any text editor while Islet is running. Changes are applied immediately — no restart required.

```json
{
  "islet-dock-enabled": "true",
  "islet-dock-mode": "smart",
  "islet-theme-mode": "dark",
  "islet-scale": "1.0"
}
```

## Settings Keys

### Dock

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-dock-enabled` | `"true"` / `"false"` | `"true"` | Show or hide the Islet Dock (taskbar replacement). |
| `islet-dock-mode` | `"fixed"` / `"smart"` / `"peek"` | `"smart"` | Dock visibility behavior. **fixed** = always visible as AppBar. **smart** = auto-hide when overlapped by another window or a fullscreen app. **peek** = hidden until cursor approaches bottom edge. Smart/peek still reveal on hover and are clickable even over a fullscreen app — only a thin pre-emptive strip right at the screen edge stays click-through, so other apps' own edge-hugging UI (e.g. a Snipping Tool selection) is never intercepted. |
| `islet-dock-preview-enabled` | `"true"` / `"false"` | `"true"` | Show window thumbnail previews when hovering dock icons. |
| `islet-dock-search-enabled` | `"true"` / `"false"` | `"true"` | Show a search icon next to Start that opens Windows Search (Win+S). |
| `islet-dock-calendar-enabled` | `"true"` / `"false"` | `"true"` | Show a calendar icon next to the search icon that opens the Calendar window. The Calendar window is also in the dock's Islet Options menu, the tray menu, and the notch calendar's open button. |
| `islet-dock-icon-only` | `"true"` / `"false"` | `"false"` | Minimal icon-only style (no background/padding around icons). |
| `islet-start-icon` | `"default"` / `"windows"` / `custom:<data URI>` | `"default"` | Start button icon in the dock: the Islet logo, the Windows logo, or an uploaded image (`custom:` followed by its data URI). |
| `islet-dock-adaptive` | `"true"` / `"false"` | `"false"` | Fixed dock only. Stretch the dock to full width like a traditional taskbar while a window is maximized, and contract back when it's restored. |
| `islet-dock-win-number-enabled` | `"true"` / `"false"` | `"true"` | When the taskbar is replaced, Win+1 through Win+9 activate the matching pinned dock app (focus/minimize if running, launch otherwise) instead of the native taskbar slots. |
| `islet-dock-mixed-reorder` | `"true"` / `"false"` | `"false"` | `"false"` = pinned and running icons stay in two separate groups with a divider between them. `"true"` = a single group — any icon, pinned or not, can be dragged anywhere. |

### Notch

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-notch-edge-delay` | number string (ms) | `"200"` | Smart and peek notch only. How long the cursor has to rest on the top edge before the notch peeks, so sweeping across a maximized window's tabs doesn't trigger it. `0` peeks instantly. Maximum `2000`. |
| `islet-notch-mode` | `"fixed"` / `"smart"` / `"peek"` | `"fixed"` | Notch (top bar) visibility behavior. **fixed** = always visible, never auto-hides (including over fullscreen apps — matches a real hardware notch, which doesn't disappear either). **smart** = hides when overlapped by another window/fullscreen app, reveals on hover. **peek** = hidden until cursor approaches the top edge, a media event, or a notification. Smart/peek reveal and are fully clickable on hover even over a fullscreen app (only a thin strip right at the screen edge stays click-through, so it never steals input meant for another app). Unlike the Dock, the notch never reserves desktop work-area space, so it never leaves a gap above maximized windows' content. |

### Monitors

The dock and the notch each choose their monitors separately. In Settings this is the **Show On** dropdown on the Dock and Notch tabs.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-dock-monitor-mode` | `"primary"` / `"all"` / `"specific"` | `"primary"` | Where the dock appears. **primary** = your primary display only. **all** = every connected display gets its own dock. **specific** = the single display named in `islet-dock-monitor-id`. |
| `islet-dock-monitor-id` | string | `""` | Windows display name of the monitor to use when the dock mode is `"specific"` (for example `\\.\DISPLAY2`). Set automatically when you pick a monitor in Settings. |
| `islet-notch-monitor-mode` | `"primary"` / `"all"` / `"specific"` | `"primary"` | Where the notch appears. Same values as the dock. |
| `islet-notch-monitor-id` | string | `""` | Windows display name of the monitor to use when the notch mode is `"specific"`. Set automatically when you pick a monitor in Settings. |

If the chosen monitor is unplugged, Islet falls back to the primary display.

With **All Monitors** and more than one display, the **Per-Monitor Behavior** toggle on the Dock and Notch tabs gives each monitor its own Fixed / Smart / Peek. Turning it off goes back to one behavior for all of them.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-dock-mode-by-monitor` | JSON string | `"{}"` | Per-monitor dock behavior: a JSON object mapping each Windows display name (as in `islet-dock-monitor-id`) to `"fixed"`, `"smart"` or `"peek"`. A monitor without an entry uses `islet-dock-mode`. |
| `islet-notch-mode-by-monitor` | JSON string | `"{}"` | Same as above for the notch, falling back to `islet-notch-mode`. |

### Weather

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-weather-enabled` | `"true"` / `"false"` | `"true"` | Show weather widget in the notch status bar. |
| `islet-weather-city` | string | `""` | Manually set city name for weather. Empty string = auto-detect via IP geolocation. |
| `islet-weather-lat` | number string | (auto) | Latitude coordinate for weather. Set automatically when a city is selected. |
| `islet-weather-lon` | number string | (auto) | Longitude coordinate for weather. Set automatically when a city is selected. |
| `islet-weather-cached-temp` | number string | (none) | Cached temperature value shown before next API fetch. |
| `islet-weather-cached-condition` | string | (none) | Cached weather condition text (e.g. "Partly Cloudy"). |
| `islet-temp-unit` | `"celsius"` / `"fahrenheit"` | `"celsius"` | Temperature display unit. |

### Modules

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-calendar-enabled` | `"true"` / `"false"` | `"true"` | Show the calendar in the notch's calendar panel. |
| `islet-timer-enabled` | `"true"` / `"false"` | follows `islet-calendar-enabled` | Show the countdown timer (presets and a custom time) in the notch's calendar panel. |
| `islet-timer-sound-enabled` | `"true"` / `"false"` | `"true"` | Play a short chime when the countdown timer finishes. |
| `islet-stopwatch-enabled` | `"true"` / `"false"` | follows `islet-calendar-enabled` | Show the stopwatch (with laps) next to the timer. |
| `islet-calendar-view` | `"day"` / `"week"` / `"month"` / `"agenda"` | `"month"` | Which view the notch calendar shows once a calendar source is connected. Set by the Day / Week / Month / Agenda switcher in the notch. |
| `islet-music-mode-enabled` | `"true"` / `"false"` | `"true"` | Enable interactive music media widget. |
| `islet-music-compact-notch` | `"true"` / `"false"` | `"true"` | Show compact music display (visualizer + artwork) in collapsed notch. |
| `islet-notch-pill-minimal` | `"true"` / `"false"` | `"false"` | Minimal pill: the collapsed notch shows the time alone, narrower, with no artwork or visualizer even while music plays. Hovering brings everything back. |
| `islet-clipboard-enabled` | `"true"` / `"false"` | `"true"` | Keep a clipboard history in the notch (Settings › Notch › Clipboard History). Turning it off stops the watcher, not just the panel. |
| `islet-clipboard-paste` | `"true"` / `"false"` | `"false"` | Clicking an entry pastes it into the window you came from instead of only copying it. |
| `islet-lyrics-enabled` | `"true"` / `"false"` | `"false"` | Look up the current track's lyrics on LRCLIB. The only feature that talks to a server, so it is off until you turn it on. |
| `islet-lyrics-offset` | integer, milliseconds | absent (= `0`) | Your manual correction to the lyrics timing, from `-5000` to `5000`. Written by the ± control in the lyrics panel. Not a settings-window field. |
| `islet-shelf-enabled` | `"true"` / `"false"` | `"true"` | Accept files dropped on the notch and keep them in the shelf. Off means the drop handler is not even registered. |
| `islet-keyboard-indicators-enabled` | `"true"` / `"false"` | `"true"` | Show a brief overlay when Caps Lock, Num Lock, Scroll Lock or the input language changes. Off means the backend reads nothing. |
| `islet-todo-enabled` | `"true"` / `"false"` | `"true"` | Show today's tasks in the notch. Off means the file is not read and the reminder never fires. |
| `islet-dev-enabled` | `"true"` / `"false"` | `"true"` | Show the developer panel (branch, changed files, listening ports). Off means neither `git` nor `netstat` runs. |
| `islet-dev-folder` | string | `""` | The repository Islet reads. Empty means no `git` command is ever launched. Chosen with the folder picker in Settings › Notch. |
| `islet-timer-state` | JSON object | absent | The running countdown, stored as an absolute target (`{"v":1,"t":1500000,"e":1762345678901,"h":0}`). Written by the timer, not a settings-window field. |
| `islet-stopwatch-state` | JSON object | absent | The stopwatch: accumulated time, start of the current segment, and laps. Written by the stopwatch, not a settings-window field. |

### Developer signals

The notch has a Developer panel with two things: the state of one git repository, and the ports
listening on this machine.

**The repository is the one you picked**, in Settings › Notch › Developer. Empty by default, and while
it is empty no `git` command runs at all: Islet never guesses a folder to look into. What is read is
three read-only answers, `rev-parse`, `status --porcelain` and `rev-list --count --left-right`, launched
with `--no-optional-locks` so a background refresh never fights a `git status` you have running.

**The ports come from `netstat -ano -p TCP`**, reported line by line by Rust and interpreted in
TypeScript, where the IPv4/IPv6 and localisation quirks are covered by tests. Each row shows the port,
the owning process, how long it has been held, and a yellow dot when the port listens on every interface
rather than the loopback: that is the one worth closing. The × frees the port by ending the process,
through the same protected-process guard as the process list.

Three remarks appear above the list when they apply: commits behind the upstream branch, a branch left
dirty for more than twelve minutes, a port held for more than two hours. Nothing runs while the panel is
closed, and nothing at all while the setting is off.

### Minimal pill

A notch that is collapsed has nothing to prove, and the collapsed Islet notch can still carry a
visualizer and album art while music plays. Turn this on and the collapsed notch becomes a narrow pill
with the time, nothing else: no artwork, no visualizer, 96 pixels wide instead of 140 or 200.

Hovering brings everything back at once, and so do a tip, a battery alert or an open panel: the reduced
shape only ever governs the notch at rest. A running timer still shows, because that is something you
asked for.

Off by default. Changing the notch's shape under someone who has arranged their widgets would be a
regression dressed up as a finishing touch.

### Keyboard indicators

Press Caps Lock and a small pill appears at the bottom of the screen for about a second: `Verr Maj`,
`Verr Num`, and the input language. Only the indicator that just changed is highlighted, because three
lights moving at once say nothing.

The keys are **never swallowed**: Windows still toggles Caps Lock itself, Islet only reports it. The
language is read from the foreground window's keyboard layout and reported as a short code (`FR`, `EN`,
`DE`); an unknown language is left out rather than shown as a hexadecimal number.

### Today's tasks

A task list with an optional due time. Titles and due times are stored in
`%APPDATA%\com.2DS.islet\todos.json`, next to `settings.json`: it is your data, so it is a file you can
read and back up, not a webview cache.

| Gesture | Where |
|---------|-------|
| Add | The field at the top; the second field takes a time (`9`, `9h30`, `14:30`, `demain 9h`) |
| Done / not done | The checkbox, or the title |
| Move to tomorrow | The clock icon on a row, keeping the time of day |
| Delete | The bin icon on a row |
| Empty the finished ones | "Clear" in the Done section |

**A due time already past means tomorrow**: typing `9` at 10 in the morning schedules tomorrow at 9, not a
task that is late before it exists. When a due time is reached, the notch opens on the list once and shows
it. There is no sound: the notch is the reminder, and it is already on screen.

### Timer and stopwatch

The countdown stores **when it must ring**, not how much time is left: close Islet for ten minutes mid-timer
and it comes back with the ten minutes gone. The stopwatch works the same way, so a running watch keeps
measuring real time across a restart. Both live in `localStorage` and are **read back with suspicion**: a
target more than a day old, a start date in the future, or unreadable JSON resets the clock instead of
showing `NaN`. Pausing freezes the exact remainder, resuming re-aims the target.

### Shelf

Drop a file on the notch and it stays one click away. The shelf stores **paths, not copies**: a 4 GB video
costs one line of JSON, and deleting the original is reported as "Missing" rather than hidden. Entries live in
`%APPDATA%\com.2DS.islet\shelf.json` and are capped at 24, the oldest leaving first.

| Action | Where |
|--------|-------|
| Add | Drag one or more files onto the notch |
| Open | Click the row |
| Show in Explorer | The folder icon on the right of a row |
| Remove one | The bin icon |
| Clean up missing files | The amber counter in the header, when there is one |
| Empty the shelf | "Clear" in the footer (the files themselves are untouched) |

### Synced Lyrics

Off by default. When on, opening the lyrics panel of the track that is playing sends the title, artist and
duration to [LRCLIB](https://lrclib.net), a free public lyrics database that needs no account and no key. The
answer is kept on disk under the app config folder, so a track you play again is served without a request.
Only the track you actually open the panel for is looked up; skipping through a playlist sends nothing.

In the panel: the current line is highlighted and follows playback, a line clicked seeks to it, and the ±
buttons shift the lyrics by 0.25 s (up to 5 s either way) for rips whose timestamps drift. The value is
remembered. Settings › Notch shows how many tracks are cached and can clear them.

### Clipboard History

The history lives in memory only: nothing is written to disk, and the list is gone when Islet exits. Windows
gives applications a way to opt out of clipboard monitoring, and Islet honours it: a password manager that
marks its copy as private never reaches the history.

| Action | Where |
|--------|-------|
| Open the panel | Hover the notch, scroll to the clipboard mode |
| Copy an entry | Click it (or type in the search field and press Enter) |
| Pin / unpin | The pin icon on the right of a row |
| Remove one entry | The bin icon on the right of a row |
| Clear everything | "Clear history" in the footer (pinned entries are kept) |
| Stop recording temporarily | The pause button in the panel header |

### Calendar Sync (links and CalDAV)

Read-only sync of your calendars into the notch calendar. Open Settings › Notch › Calendar Sync (shown while Calendar is on). There are two ways to connect, and you can use both at once. Islet never writes to a server.

- **Calendar links** need no password: paste a Google, iCloud, Outlook, Proton, Nextcloud or any other `.ics` / `webcal://` link. Repeating events, exceptions and time zones are expanded locally.
- **CalDAV account** (Nextcloud, iCloud, or any CalDAV server) also reads private calendars, using an app password.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-caldav-enabled` | `"true"` / `"false"` | `"false"` | Whether calendar sync is active. Set to `"true"` when you connect and `"false"` when you disconnect. |
| `islet-caldav-url` | string | `""` | Server address, for example `cloud.example.com`. A bare host is expanded to `/remote.php/dav/`; you can also give a full CalDAV URL. iCloud uses `https://caldav.icloud.com` (filled in for you) with an app-specific password. |
| `islet-caldav-username` | string | `""` | Account username. |
| `islet-caldav-interval` | number string | `"15"` | Minutes between background syncs. Minimum `5`. |

`islet-caldav-interval` applies to every source, links included. After Islet restarts or crashes it syncs right away instead of waiting out the interval, and retries a few times if the network isn't back yet.

Secrets are **not** in `settings.json`. The CalDAV app password lives in Windows Credential Manager as `Islet CalDAV`, and each calendar link (which acts like a password, since anyone holding it can read the calendar) lives there as `Islet Calendar Link`. Everything else is local to the app config directory:

| File | Contents |
|------|----------|
| `calendar_links.json` | The names and provider of your calendar links (not the links themselves). |
| `calendar_cache.json` | Synced events, so the calendar works offline. Nothing is sent to any third-party service. |

Removing a link or disconnecting the account deletes its stored secret and cached events. If a CalDAV server rejects the login, automatic syncing of that account pauses until you reconnect, so a wrong password can't trigger a lockout. Events from 35 days back to 95 days ahead are synced.

### Music Appearance

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-media-layout` | `"classic"` / `"compact"` | `"classic"` | Expanded player style. **classic** = large album art. **compact** = small thumbnail + controls. |
| `islet-media-ambience-enabled` | `"true"` / `"false"` | `"true"` | Colored ambient glow behind expanded album art. |
| `islet-media-compact-glow-enabled` | `"true"` / `"false"` | `"true"` | Glow effect around the collapsed compact thumbnail. |
| `islet-media-visualizer-enabled` | `"true"` / `"false"` | `"true"` | Audio visualizer bars in music mode. Also accepts `islet-visualizer-enabled` (legacy alias). |
| `islet-media-album-art-enabled` | `"true"` / `"false"` | `"true"` | Show album artwork in the notch music display. |

### Overlays

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-volume-overlay-enabled` | `"true"` / `"false"` | `"true"` | Show Islet volume HUD when volume changes (replaces native Windows OSD). |
| `islet-volume-edge-enabled` | `"true"` / `"false"` | `"true"` | Trigger volume HUD by hovering the left screen edge. |
| `islet-brightness-overlay-enabled` | `"true"` / `"false"` | `"true"` | Show Islet brightness HUD when brightness changes. |
| `islet-brightness-edge-enabled` | `"true"` / `"false"` | `"true"` | Trigger brightness HUD by hovering the right screen edge. |

### Appearance

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-theme-mode` | preset id: `"onyx"` · `"liquid"` · `"frost-light"` · `"aurora"` · `"nord"` · `"paper"` · `"neon"` · `"bento"`, plus `"custom"` / `"adaptive"` | `"dark"` (resolves to `onyx`) | Theme preset. Legacy `"dark"` and `"light"` still resolve to `onyx` and `frost-light`, so no migration pass was needed. **custom** = user-picked colour, **adaptive** = follows the Windows accent. Presets also set the material (blur strength, rim, sheen). |
| `islet-theme-color` | hex string | `"#007aff"` | Custom theme color (used in `custom` and `adaptive` modes). |
| `islet-theme-opacity` | float string | `"0.80"` | Opacity slider (0.1 to 1.0). It scales the preset's own alpha: at the neutral 0.8 a preset renders exactly as defined, so switching preset never silently changes the slider. Floor 0.35. |
| `islet-theme-saturation` | float string | `"0.50"` | Color saturation for custom/adaptive themes (0.0 to 1.0). |
| `islet-theme-brightness` | float string | `"0.15"` | Background brightness for custom/adaptive themes (0.0 to 1.0). |
| `islet-corners-enabled` | `"true"` / `"false"` | `"false"` | Render rounded screen corner overlays on top edges. |

### Status Widgets

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-status-widgets` | JSON string | `{"left":["weather"],"right":["battery"]}` | Widget layout in collapsed notch. Available: `"weather"`, `"battery"`, `"cpu"`, `"ram"`, `"disk"`, `"net"`. The `"battery"` widget (and its low-battery/charging pulses) is automatically suppressed on desktops with no physical battery — detected via Windows' `PowerManager.BatteryStatus`, not the browser's Battery API (which fakes a permanent "100%, charging" reading on desktops). It's also silently dropped from a placed config on such machines, even if set manually or imported from a laptop's settings file. |

Example:
```json
{
  "islet-status-widgets": "{\"left\":[\"cpu\",\"ram\"],\"right\":[\"battery\",\"net\"]}"
}
```

### Is (assistant)

Is watches the machine and shows one short tip at a time in the notch — battery, charge reminder, disk space, memory/CPU pressure and long sessions. It reads only local Windows counters (`GetSystemPowerStatus`, `GlobalMemoryStatusEx`, `GetDriveTypeW`/`GetDiskFreeSpaceExW`, `GetSystemTimes`, `GetTickCount64`), sampled every 30 seconds. Nothing leaves the machine and no account is needed. Tips never interrupt: they respect a per-tip cooldown (10 min for a critical battery, up to 12 h for a disk).

So that a tip is not missed, Is signals it in three steps. On arrival, two rings bloom out of the mascot and the row flashes once in its severity colour. While the tip is up (10 s for information, 12 s for a warning, 15 s for a critical one), the severity dot keeps a slow heartbeat. When the window closes, the tip does not vanish silently: the collapsed notch keeps a thin outline in the severity colour, carrying the message as a tooltip, until the notch is clicked. Under `prefers-reduced-motion`, the rings and the heartbeat are dropped and the outline stays static.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-assistant-name` | string | `"Is"` | What the assistant is called. Set by the welcome flow, editable in Settings › Is; also used as the sidebar label of that tab. Empty values fall back to `"Is"`. |
| `islet-onboarded` | `"true"` | — | Written when the welcome flow ends. Its absence on a fresh install is what triggers the first-run screen. Installs that predate the flow are marked automatically at startup (any non-empty `settings.json` counts as already welcomed), so upgrading never re-opens it. Clear the key (or delete `settings.json`) to see the flow again, or use Settings › General › Replay the Welcome. |
| `islet-assistant-enabled` | `"true"` / `"false"` | `"true"` | Master switch. When `"false"`, Is is silent and the classic low-battery pulse takes over again. |
| `islet-assistant-battery` | `"true"` / `"false"` | `"true"` | Low battery, critical battery, charge reminder and "battery full" tips. While this is on, the legacy `islet-low-battery-threshold` pulse is suppressed to avoid two messages for the same fact. |
| `islet-assistant-storage` | `"true"` / `"false"` | `"true"` | Warn when a fixed drive has less than `islet-assistant-free-space-floor` percent free. Removable drives are ignored. |
| `islet-assistant-performance` | `"true"` / `"false"` | `"true"` | Warn on sustained memory (≥ 90 %) or CPU (≥ 90 %) load. |
| `islet-assistant-session` | `"true"` / `"false"` | `"true"` | Suggest a break once Windows uptime passes `islet-assistant-session-hours`. |
| `islet-assistant-low-battery` | integer string | `"20"` | Battery percentage that triggers the low-battery tip (5 to 50). |
| `islet-assistant-charge-limit` | integer string | `"80"` | While charging, suggest unplugging once the battery reaches this level (60 to 100). `100` gives a single "battery full" tip. |
| `islet-assistant-free-space-floor` | integer string | `"10"` | Minimum free space, in percent, before warning about a drive (5 to 25). |
| `islet-assistant-session-hours` | integer string | `"8"` | Hours of uptime before suggesting a break (2 to 16). |
| `islet-assistant-cooldowns` | JSON string | `{}` | Internal. Last display time per tip id, so a tip does not repeat too soon. Safe to clear. |

### Language

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-language` | `"system"` / `"fr"` / `"en"` | `"system"` | Display language. `system` follows the Windows UI language: French if it starts with `fr`, English otherwise. Applies immediately everywhere — notch, dock, settings, and Is' tips — without a restart. |

### System

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `islet-scale` | float string | `"1.0"` | UI scale factor (0.8 to 1.3). Changing this re-registers AppBars to resize the reserved screen area. |
| `islet-low-battery-threshold` | integer string | `"20"` | Battery percentage that triggers the low-battery alert pulse (5 to 50, step 5). |
| `islet-auto-update` | `"true"` / `"false"` | `"false"` | Check for and download updates automatically on startup. |
| `islet-show-update-indicator` | `"true"` / `"false"` | `"true"` | Show a green dot on the notch when an update is available. |
| `islet-hide-in-fullscreen` | `"true"` / `"false"` | `"true"` | Hide the dock, and disable its hover reveal, while a fullscreen app (game or video) is in front. The notch is not affected. |
| `islet-time-format-24h` | `"true"` / `"false"` | `"false"` | Use 24-hour clock format in the notch. When `"false"`, displays 12-hour format with AM/PM. |

### Internal (Do Not Edit Manually)

| Key | Type | Description |
|-----|------|-------------|
| `islet-first-run` | sentinel | Set to `"done"` after first launch. Triggers splash screen if absent. |
| `islet-app-version` | string | Last known app version. If it differs from current, splash screen is shown on update. |

## Event System

Islet uses two Tauri events for settings synchronization:

### `settings-changed`
- **Emitted by:** `save_setting` command (frontend or backend)
- **Payload:** `{ "key": "islet-...", "value": ... }`
- **Purpose:** Broadcasts changes made through the Islet UI to all windows
- **Key format:** Islet-prefixed keys as-is (e.g. `"islet-dock-mode"`)

### `settings-external-changed`
- **Emitted by:** File watcher (detects external edits to `settings.json`)
- **Payload:** `{ "key": "islet-...", "value": ... }` or `{ "key": "islet-...", "value": null }` for removed keys
- **Purpose:** Broadcasts changes made by external editors (VS Code, notepad, scripts)
- **Key format:** Islet-prefixed keys as-is
- **Behavior:** Also syncs values to `localStorage` for instant frontend reads

### Flow
```
External editor saves settings.json
    ↓
File watcher detects change (ReadDirectoryChangesW)
    ↓
Diffs against SETTINGS_CACHE
    ↓
Emits settings-external-changed for each changed/removed key
    ↓
useSettingsSync hook updates React state + localStorage
    ↓
UI re-renders with new values
```

## Example: Changing Dock Mode via Script

```powershell
# PowerShell: switch dock to smart mode
$json = Get-Content "$env:APPDATA\com.2DS.islet\settings.json" | ConvertFrom-Json
$json.'islet-dock-mode' = 'smart'
$json | ConvertTo-Json | Set-Content "$env:APPDATA\com.2DS.islet\settings.json"
```

```python
# Python: disable dock
import json, os
path = os.path.join(os.environ['APPDATA'], 'com.2DS.islet', 'settings.json')
with open(path) as f: settings = json.load(f)
settings['islet-dock-enabled'] = 'false'
with open(path, 'w') as f: json.dump(settings, f)
```

## Notes

- All boolean values are strings (`"true"` / `"false"`) for consistency with `localStorage`.
- The `useSettingsSync` hook auto-converts `"true"` / `"false"` strings to booleans.
- `auto-hide` mode values in `islet-dock-mode` and `islet-notch-mode` are legacy aliases for `smart` — they are mapped automatically.
- Changing `islet-scale` triggers AppBar re-registration to adjust reserved screen space.
- Theme changes (`islet-theme-*`) are applied by reading all theme values from `localStorage` and calling `applyTheme()` — the theme system depends on all five theme keys being in sync.
