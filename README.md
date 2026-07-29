# Vim IM Control for Obsidian

Control Input Method (IM) when `InsertLeave` and `InsertEnter` in Vim mode. Supports macOS, Windows, and Linux.

> **This is a fork** of [hideakitai/obsidian-vim-im-control](https://github.com/hideakitai/obsidian-vim-im-control) with the following fixes, mostly Windows/Korean-focused:
>
> - Environment variables such as `%USERPROFILE%` (Windows) or `$HOME` (POSIX) in **PATH to IM Controller** are now expanded. On the original, the default Windows path (`%USERPROFILE%\AppData\Local\bin`) was inserted into `PATH` verbatim and never resolved, so every IM command failed with `'im-select.exe' is not recognized...`.
> - The plugin's **own folder is added to `PATH`**, so an IM controller executable placed next to `main.js` is found without any absolute path. This fork ships `im-select.exe`, so on Windows it works out of the box and travels with your vault.
> - **Mode-change events are debounced.** Commands like `o`/`O`/`cc` emit a burst of vim mode-change events in one tick, which fired racing async IM commands and left the IM stuck (usually forced to the InsertLeave value). The plugin now reacts only to the settled mode.
> - **Korean IME support** via a bundled `imectl.exe`. `im-select` only switches the keyboard layout (HKL), so it cannot toggle Hangul/English *inside* the single Korean IME (`1042`). `imectl` drives the IME conversion mode instead — see [Korean IME (Hangul) on Windows](#korean-ime-hangul-on-windows).
>
> This fork uses a distinct plugin id (`vim-im-control-rev`), so it can be installed alongside the original without conflicting. **Do not enable both at the same time** — both react to the same vim-mode-change event and would switch the IM twice. Keep only one enabled.

## Build & Deploy

This plugin is not on the community store, so install it manually.

**Prerequisites:** [Node.js](https://nodejs.org/) + npm.

### 1. Build

```sh
git clone https://github.com/woody0325/obsidian-vim-im-control.git
cd obsidian-vim-im-control
npm install
npm run build   # produces main.js
```

### 2. Copy the files into your vault

Copy the following into `<your-vault>/.obsidian/plugins/vim-im-control-rev/` (create the folder if it does not exist):

| File | Notes |
| --- | --- |
| `main.js` | build output from step 1 |
| `manifest.json` | required by Obsidian |
| `im-select.exe` | **Windows only** — ships in this repo; lets the default settings work with no extra setup |
| `imectl.exe` | **Windows only, for the Korean IME** — ships in this repo; see [Korean IME (Hangul) on Windows](#korean-ime-hangul-on-windows) |

On macOS / Linux you still need the relevant IM controller installed separately (e.g. [`im-select`](https://github.com/daipeihust/im-select) for macOS, [`fcitx5-remote`](https://github.com/fcitx/fcitx5) for Linux); the bundled executable is Windows-only.

### 3. Enable in Obsidian

1. **Settings → Community plugins** → enable *Vim IM Control*.
2. **Restart Obsidian** (required).

Because the plugin prepends its own folder to `PATH`, the bundled `im-select.exe` is found automatically with the default Windows settings — no need to install `im-select` separately or configure an absolute path. To verify, open the developer console (`Ctrl+Shift+I`) and look for a `current process PATH updated: ...` line ending with the plugin folder; entering/leaving insert mode should no longer log `command failed`.

## Usage

You can set the following four settings for each platform. If you want to use the `InsertEnter` command, you should also set the `Get Current IM` command to restore the state of IM. If you leave blank either of them, `InsertEnter` will be skipped.

The default settings are defined as below. For the defaults, [`im-select`](https://github.com/daipeihust/im-select) is used for macOS and Windows, and [`fcitx5-remote`](https://github.com/fcitx/fcitx5) for Linux. But you can use any IM controller as you want.

Note: Please restart Obsidian after installing this plugin.

### macOS

```
PATH to IM Controller: "/opt/homebrew/bin",
On InsertLeave: "im-select com.apple.keylayout.ABC",
On InsertEnter: "im-select {{im}}",
Get Current IM: "im-select",
```

### Windows

```
PATH to IM Controller: "%USERPROFILE%\\AppData\\Local\\bin",
On InsertLeave: "im-select.exe 1033",
On InsertEnter: "im-select.exe {{im}}",
Get Current IM: "im-select.exe",
```

#### Korean IME (Hangul) on Windows

`im-select` switches the keyboard **layout** (HKL). The Korean Microsoft IME,
however, is a single input source (`1042`) whose Hangul ↔ English toggle is the
IME **conversion mode**, not the layout — so `im-select` reports `1042` for both
Hangul and English and cannot switch between them. Forcing a separate English
layout (`1033`) instead leaves you stuck in a layout where the 한/영 key does
nothing until you fix it from the tray.

Use the bundled **`imectl.exe`** instead, which drives the conversion mode
directly (`1` = Hangul, `0` = English):

```
PATH to IM Controller: (leave blank — imectl.exe ships next to main.js)
On InsertLeave: "imectl.exe 0",
On InsertEnter: "imectl.exe {{im}}",
Get Current IM: "imectl.exe",
```

With this, leaving insert mode sets the IME to English (so Vim commands work)
and re-entering restores whatever Hangul/English state you were last in — all
inside the normal Korean IME, so the 한/영 key keeps working as usual.

**Requirement:** enable **"Use previous version of Microsoft IME"** (한국어 →
Microsoft IME → 옵션 → 호환성 → *이전 버전의 Microsoft IME 사용*). Windows 10/11's
newer TSF IME ignores the `WM_IME_CONTROL` message `imectl` relies on.

`imectl` is a ~40-line C program; its source and build instructions are in
[`imectl/`](imectl/).

### Linux

**fcitx5-remote** (default)

```
PATH to IM Controller: "/usr/bin",
On InsertLeave: "fcitx5-remote -c",
On InsertEnter: "fcitx5-remote -o",
Get Current IM: "fcitx5-remote",
```

**fcitx-remote**

```
PATH to IM Controller: "/usr/bin/fcitx-remote"
On InsertLeave: "fcitx-remote -c"
On InsertEnter: "fcitx-remote -o"
Get Current IM: "fcitx-remote"
```

**ibus**

```
PATH to IM Controller: "/usr/bin/ibus"
On InsertLeave: "ibus engine xkb:us::eng"
On InsertEnter: "ibus engine {{im}}"
Get Current IM: "ibus engine"
```

### Other Configuration

**Async Switch**

Whether to switch IM asynchronously or not. Default: `true`

**Status Bar Message**

Whether to show ERROR/WARN messages on Status Bar. Default: `false`

## Limitaion

For Linux, this plugin does **NOT** support Obsidian installed from Snap or Flatpak. Please try `AppImage` or `deb` file.

## Related Plugins

-   [Obsidian Vimrc Support Plugin](https://github.com/esm7/obsidian-vimrc-support)
-   [Obsidian Vim IM Select Plugin](https://github.com/ALONELUR/vim-im-select-obsidian)
-   [Obsidian Vim IM Switch Plugin](https://github.com/yuanotes/obsidian-vim-im-switch-plugin)

## LICENSE

MIT
