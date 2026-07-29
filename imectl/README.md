# imectl

A tiny Windows helper that gets/sets the **IME conversion mode** of the
foreground window, for controlling the Korean Microsoft IME (Hangul ↔ English)
from the Vim IM Control plugin.

`im-select` only manipulates the keyboard layout (HKL), so it cannot switch
Hangul/English *inside* the single Korean IME (both report `1042`). `imectl`
drives the conversion mode directly via `WM_IME_CONTROL`.

## Usage

```
imectl        # print current conversion mode (Korean IME: 1 = Hangul, 0 = English)
imectl 0      # set English (alphanumeric)
imectl 1      # set Hangul
```

## Build

With [mingw-w64](https://www.mingw-w64.org/) (cross-compiling from Linux/WSL):

```sh
x86_64-w64-mingw32-gcc imectl.c -o imectl.exe -limm32 -mconsole -O2 -s
```

On Windows with MSVC:

```
cl imectl.c imm32.lib user32.lib
```

## Requirement

On Windows 10/11 enable **"Use previous version of Microsoft IME"** (한국어 →
Microsoft IME → 옵션 → 호환성 → 이전 버전의 Microsoft IME 사용) so the IME
responds to `WM_IME_CONTROL`.
