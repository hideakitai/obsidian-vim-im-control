# Vim IM Control for Obsidian

Control Input Method (IM) when `InsertLeave` and `InsertEnter` in Vim mode. Supports macOS, Windows, and Linux.

> **This is a fork** of [hideakitai/obsidian-vim-im-control](https://github.com/hideakitai/obsidian-vim-im-control) with the following fixes, mostly Windows/Korean-focused:
>
> - Environment variables such as `%USERPROFILE%` (Windows) or `$HOME` (POSIX) in **PATH to IM Controller** are now expanded. On the original, the default Windows path (`%USERPROFILE%\AppData\Local\bin`) was inserted into `PATH` verbatim and never resolved, so every IM command failed with `'im-select.exe' is not recognized...`.
> - The plugin's **own folder is added to `PATH`**, so an IM controller executable placed next to `main.js` is found without any absolute path. This fork ships `im-select.exe`, so on Windows it works out of the box and travels with your vault.
> - **Mode-change events are debounced.** Commands like `o`/`O`/`cc` emit a burst of vim mode-change events in one tick, which fired racing async IM commands and left the IM stuck (usually forced to the InsertLeave value). The plugin now reacts only to the settled mode.
> - **Korean IME support** via a bundled `imectl.exe`. `im-select` only switches the keyboard layout (HKL), so it cannot toggle Hangul/English *inside* the single Korean IME (`1042`). `imectl` drives the IME conversion mode instead — see [Korean IME (Hangul) on Windows](#korean-ime-hangul-on-windows). 🇰🇷 한글 사용자는 [한국어 IME(한글) 설정 안내](#한국어-ime한글-설정-안내)를 참고하세요.
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
directly (`1` = Hangul, `0` = English). The easiest way is the **Korean IME
(한글)** toggle at the top of the Windows settings — turning it on fills the
Windows fields with the preset below (and turning it off restores the im-select
preset):

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

#### 한국어 IME(한글) 설정 안내

Windows에서 Vim 모드로 한글을 쓸 때, `im-select`만으로는 한/영 전환이 제대로
되지 않습니다. 이유는 다음과 같습니다.

- `im-select`는 **키보드 레이아웃(HKL)** 만 바꿉니다.
- 한국어 MS IME는 **하나의 입력 소스(`1042`)** 이고, 한/영 토글은 레이아웃이
  아니라 IME 내부의 **변환 모드(conversion mode)** 입니다. 그래서 `im-select`는
  한글이든 영문이든 똑같이 `1042`로만 보고하며, 둘을 구분하거나 전환하지
  못합니다.
- 대신 별도 영어 레이아웃(`1033`)으로 강제하면, 한/영 키가 안 먹는 레이아웃에
  갇혀서 트레이로 직접 바꿔야 하는 상황이 됩니다.

이 저장소에 포함된 **`imectl.exe`** 를 쓰면 변환 모드를 직접 제어합니다
(`1` = 한글, `0` = 영문). 가장 쉬운 방법은 Windows 설정 맨 위의 **Korean IME
(한글)** 토글을 켜는 것입니다. 켜면 아래 프리셋이 자동으로 채워지고, 끄면
`im-select` 프리셋으로 되돌아갑니다.

```
PATH to IM Controller: (비워 둠 — imectl.exe가 main.js 옆에 함께 배포됨)
On InsertLeave: "imectl.exe 0",
On InsertEnter: "imectl.exe {{im}}",
Get Current IM: "imectl.exe",
```

이렇게 하면 insert 모드를 나갈 때 IME가 영문으로 바뀌어 Vim 명령이 정상
동작하고, 다시 insert로 들어오면 직전의 한/영 상태로 복원됩니다. 모두 기존
한국어 IME 안에서 이뤄지므로 한/영 키도 평소처럼 그대로 쓸 수 있습니다.

**필수 조건:** **"이전 버전의 Microsoft IME 사용"** 을 켜야 합니다
(설정 → 시간 및 언어 → 언어 및 지역 → 한국어 → 언어 옵션 → Microsoft IME →
옵션 → 호환성 → *이전 버전의 Microsoft IME 사용*). Windows 10/11의 새 TSF IME는
`imectl`이 사용하는 `WM_IME_CONTROL` 메시지를 무시합니다.

`imectl`은 약 40줄짜리 C 프로그램이며, 소스와 빌드 방법은
[`imectl/`](imectl/) 에 있습니다.

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

## Acknowledgements

The fork's fixes (env-var expansion, mode-change debounce, the `imectl` Korean
IME helper, and this documentation) were developed with the help of
[Claude Code](https://claude.com/claude-code). 이 fork의 수정 사항은
Claude Code의 도움을 받아 작성되었습니다.

## LICENSE

MIT
