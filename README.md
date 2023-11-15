# Vim IM Control for Obsidian

Control Input Method (IM) when `InsertLeave` and `InsertEnter` in Vim mode. Supports macOS, Windows, and Linux.

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
