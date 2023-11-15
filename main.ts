import { App, MarkdownView, Plugin, PluginSettingTab, Setting } from "obsidian";
import * as os from "os";
import { exec, execSync } from "child_process";

interface VimImControSetting {
	pathToIMControl: string;
	cmdOnInsertLeave: string;
	cmdOnInsertEnter: string;
	cmdGetCurrentIM: string;
}
interface VimImControlSettings {
	macos: VimImControSetting;
	windows: VimImControSetting;
	linux: VimImControSetting;
	isAsync: boolean;
	isStatusBarEnabled: boolean;
}

const DEFAULT_SETTINGS: VimImControlSettings = {
	macos: {
		pathToIMControl: "/opt/homebrew/bin",
		cmdOnInsertLeave: "im-select com.apple.keylayout.ABC",
		cmdOnInsertEnter: "im-select {{im}}",
		cmdGetCurrentIM: "im-select",
	},
	windows: {
		pathToIMControl: "%USERPROFILE%\\AppData\\Local\\bin",
		cmdOnInsertLeave: "im-select.exe 1033",
		cmdOnInsertEnter: "im-select.exe {{im}}",
		cmdGetCurrentIM: "im-select.exe",
	},
	linux: {
		pathToIMControl: "/usr/bin",
		cmdOnInsertLeave: "fcitx5-remote -c",
		cmdOnInsertEnter: "fcitx5-remote -o",
		cmdGetCurrentIM: "fcitx5-remote",
	},
	isAsync: true,
	isStatusBarEnabled: false,
};

export default class VimImSwitcher extends Plugin {
	// global settings for multiple platforms
	settings: VimImControlSettings;
	// selected setting for current platform
	private setting: VimImControSetting;
	// status bar item
	private statusBarItemEl: HTMLElement;

	// internal state for the plugin
	private isInitialized = false;
	private imToRestore = "";
	private prevVimMode = "normal";

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new VimImSwitcherSettingTab(this.app, this));

		this.statusBarItemEl = this.addStatusBarItem();
		this.statusBarItemEl.setText("");

		// Register two events because:
		// this don't trigger on loading/reloading obsidian with note opened
		// this.registerEvent(this.app.workspace.on("active-leaf-change", this.registerWorkspaceEvent));
		// and this don't trigger on opening same file in new pane
		this.registerEvent(this.app.workspace.on("file-open", this.registerWorkspaceEvent));
	}

	private async initialize() {
		if (this.isInitialized) {
			this.logWarn("plugin already initialized");
			return;
		}
		console.debug(`plugin init start (platform = ${process.platform})`);

		switch (process.platform) {
			case "win32":
				this.setting = this.settings.windows;
				break;
			case "darwin":
				this.setting = this.settings.macos;
				break;
			case "linux":
				this.setting = this.settings.linux;
				break;
			default:
				this.logError("unsupported platform");
				break;
		}

		this.updateEnvironmentVariableForProcess();
		this.statusBarItemEl.setText("");
		this.imToRestore = "";
		this.prevVimMode = "normal";
		this.isInitialized = true;
	}

	private updateEnvironmentVariableForProcess() {
		const delimiter = process.platform === "win32" ? ";" : ":";
		process.env.PATH = `${process.env.PATH}${delimiter}${this.setting.pathToIMControl}`;
		console.debug(`current process PATH updated: ${process.env.PATH}`);
	}

	private registerWorkspaceEvent = async () => {
		if (!this.isInitialized) {
			await this.initialize();
		}
		this.registerVimModeChangeEvent();
	};

	private registerVimModeChangeEvent() {
		const view = this.getActiveMarkdownView();
		if (!view) {
			return;
		}
		const editor = this.getCodeMirrorEditor(view);
		if (!editor) {
			return;
		}

		// run commands when vim mode has changed
		editor.on("vim-mode-change", (modeObj: any) => {
			if (modeObj) {
				this.onVimModeChanged(modeObj);
			}
		});
		console.debug("vim-mode-change event registered");
	}

	private getActiveMarkdownView(): MarkdownView | null {
		return this.app.workspace.getActiveViewOfType(MarkdownView);
	}

	private getCodeMirrorEditor(view: MarkdownView): CodeMirror.Editor {
		return (view as any).sourceMode?.cmEditor?.cm?.cm;
	}

	private onVimModeChanged(modeObj: any) {
		switch (modeObj.mode) {
			case "insert":
				this.onInsertEnter();
				break;
			default:
				if (this.prevVimMode != "insert") {
					break;
				}
				if (this.settings.isAsync) {
					this.onInsertLeaveAsync();
				} else {
					this.onInsertLeaveSync();
				}
				break;
		}
		this.prevVimMode = modeObj.mode;
	}

	private isOnInsertEnterEnabled() {
		return (
			!!this.setting.cmdOnInsertEnter && !!this.setting.cmdGetCurrentIM
		);
	}

	private isOnInsertLeaveEnabled() {
		return !!this.setting.cmdOnInsertLeave;
	}

	private onInsertEnter() {
		if (!this.isOnInsertEnterEnabled()) {
			console.debug("onInsertEnter is disabled: skip");
			return;
		}

		const enableCommand = this.setting.cmdOnInsertEnter.replace(
			/{{im}}/,
			this.imToRestore
		);

		if (this.settings.isAsync) {
			this.runCommandAsync(enableCommand).then((stdout: any) => {
				console.debug(`im switched to ${stdout} by ${enableCommand}`);
			});
		} else {
			const stdout = this.runCommandSync(enableCommand);
			console.debug(`im switched to ${stdout} by ${enableCommand}`);
		}
	}

	private onInsertLeaveAsync() {
		if (!this.isOnInsertLeaveEnabled()) {
			console.debug("onInsertLeave is disabled: skip");
			return;
		}
		console.debug("run onInsertLeaveAsync");

		if (this.isOnInsertEnterEnabled()) {
			// if onInsertEnter is enabled, we need to get current IM first
			this.runCommandAsync(this.setting.cmdGetCurrentIM).then(
				(stdout: any) => {
					this.imToRestore = stdout;
					console.debug(`im cached: ${this.imToRestore}`);

					// then run onInsertLeave command
					this.runCommandAsync(this.setting.cmdOnInsertLeave).then(
						(_stdout: any) => {
							console.debug(
								`im switched by ${this.setting.cmdOnInsertLeave}`
							);
						}
					);
				}
			);
		} else {
			this.runCommandAsync(this.setting.cmdOnInsertLeave).then(
				(_stdout: any) => {
					console.debug(
						`im switched by ${this.setting.cmdOnInsertLeave}`
					);
				}
			);
		}
	}

	private onInsertLeaveSync() {
		if (!this.isOnInsertLeaveEnabled()) {
			console.debug("onInsertLeave is disabled: skip");
			return;
		}
		console.debug("run onInsertLeaveSync");

		if (this.isOnInsertEnterEnabled()) {
			// if onInsertEnter is enabled, we need to get current IM first
			this.imToRestore = this.runCommandSync(
				this.setting.cmdGetCurrentIM
			);
			console.debug(`im cached: ${this.imToRestore}`);
		}

		// then run onInsertLeave command
		this.runCommandSync(this.setting.cmdOnInsertLeave);
		console.debug(`im switched by ${this.setting.cmdOnInsertLeave}`);
	}

	private runCommandAsync(command: string) {
		return new Promise((resolve, reject) => {
			exec(command, (error: any, stdout: any, stderr: any) => {
				if (error) {
					this.logError(
						`command failed with error: ${error}, stdout: ${stdout}, stderr: ${stderr}`
					);
					reject(error);
					return;
				}
				resolve(stdout);
			});
		});
	}

	private runCommandSync(command: string): string {
		try {
			const stdout = execSync(command, { encoding: "utf-8" });
			return stdout;
		} catch (error) {
			this.logError(`command failed with error: ${error}`);
			return "";
		}
	}

	private logWarn(msg: string) {
		console.warn(msg);
		if (this.settings.isStatusBarEnabled) {
			this.statusBarItemEl.setText(`WARN: ${msg}`);
		}
	}

	private logError(msg: string) {
		console.error(msg);
		if (this.settings.isStatusBarEnabled) {
			this.statusBarItemEl.setText(`ERROR: ${msg}`);
		}
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class VimImSwitcherSettingTab extends PluginSettingTab {
	plugin: VimImSwitcher;

	constructor(app: App, plugin: VimImSwitcher) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h1", { text: "Vim IM Control Settings" });
		new Setting(containerEl).setDesc(
			"You can set the following four settings for each platform. \
			If you want to use the `InsertEnter` command, \
			you should also set the `Get Current IM` command to restore the state of IM. \
			If you leave blank either of them, `InsertEnter` will be skipped."
		);

		containerEl.createEl("h3", { text: "macOS" });
		this.createSettingForOS(
			containerEl,
			this.plugin.settings.macos,
			DEFAULT_SETTINGS.macos
		);

		containerEl.createEl("h3", { text: "Windows" });
		this.createSettingForOS(
			containerEl,
			this.plugin.settings.windows,
			DEFAULT_SETTINGS.windows
		);

		containerEl.createEl("h3", { text: "Linux" });
		new Setting(containerEl).setDesc(
			"WARN: This plugin doesn't work with Obsidian installed from Snap or Flatpak. \
			Please try `AppImage` or `deb` file. \
			If you want to use `ibus` or `fcitx-remote`, please refere README on GitHub repo."
		);
		this.createSettingForOS(
			containerEl,
			this.plugin.settings.linux,
			DEFAULT_SETTINGS.linux
		);

		containerEl.createEl("h3", { text: "Async Switch" });
		new Setting(containerEl)
			.setName("Async Switch")
			.setDesc("Whether to switch IM asynchronously or not")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.isAsync);
				toggle.onChange(async (value) => {
					console.debug(`Async Switch: ${value}`);
					this.plugin.settings.isAsync = value;
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl("h3", { text: "Status Bar Message" });
		new Setting(containerEl)
			.setName("Status Bar Message")
			.setDesc("Whether to show ERROR/WARN messages on Status Bar")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.isStatusBarEnabled);
				toggle.onChange(async (value) => {
					console.debug(`Status Bar Message: ${value}`);
					this.plugin.settings.isStatusBarEnabled = value;
					await this.plugin.saveSettings();
				});
			});
	}

	private createSettingForOS(
		containerEl: HTMLElement,
		setting: VimImControSetting,
		defaults: VimImControSetting
	) {
		new Setting(containerEl)
			.setName("PATH to IM Controller")
			.setDesc("PATH to IM Controller used only in the internal process")
			.addText((text) =>
				text
					.setPlaceholder(defaults.pathToIMControl)
					.setValue(setting.pathToIMControl)
					.onChange(async (value) => {
						console.debug(`PATH to IM Controller: ${value}`);
						setting.pathToIMControl = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Get Current IM")
			.setDesc("The command to get current IM")
			.addText((text) =>
				text
					.setPlaceholder(defaults.cmdGetCurrentIM)
					.setValue(setting.cmdGetCurrentIM)
					.onChange(async (value) => {
						console.debug("Get Current IM: " + value);
						setting.cmdGetCurrentIM = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("On InsertEnter")
			.setDesc(
				"The command when entering insert mode (Use {{im}} as placeholder of cached IM)"
			)
			.addText((text) =>
				text
					.setPlaceholder(defaults.cmdOnInsertEnter)
					.setValue(setting.cmdOnInsertEnter)
					.onChange(async (value) => {
						console.debug("On InsertEnter: " + value);
						setting.cmdOnInsertEnter = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("On InsertLeave")
			.setDesc("The command when leaving insert mode")
			.addText((text) =>
				text
					.setPlaceholder(defaults.cmdOnInsertLeave)
					.setValue(setting.cmdOnInsertLeave)
					.onChange(async (value) => {
						console.debug("On InsertLeave: " + value);
						setting.cmdOnInsertLeave = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
