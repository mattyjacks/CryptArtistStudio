// Taskbar menu utilities for CryptArtist Studio
// Provides integration with system taskbar context menu

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type MenuAction = 
  | "new-window"
  | "new-media-mogul"
  | "new-vibecode"
  | "new-gamestudio"
  | "new-valleynet"
  | "new-demorecorder"
  | "show-all"
  | "hide-all"
  | "close-all"
  | "quit";

export interface TaskbarMenuConfig {
  onNewWindow?: () => void;
  onNewMediaMogul?: () => void;
  onNewVibeCode?: () => void;
  onNewGameStudio?: () => void;
  onNewValleyNet?: () => void;
  onNewDemoRecorder?: () => void;
  onShowAll?: () => void;
  onHideAll?: () => void;
  onCloseAll?: () => void;
  onQuit?: () => void;
}

class TaskbarMenuManager {
  private static instance: TaskbarMenuManager;
  private listeners: Map<string, () => void> = new Map();
  private unlisteners: (() => void)[] = [];

  private constructor() {}

  static getInstance(): TaskbarMenuManager {
    if (!TaskbarMenuManager.instance) {
      TaskbarMenuManager.instance = new TaskbarMenuManager();
    }
    return TaskbarMenuManager.instance;
  }

  /**
   * Initialize taskbar menu listeners
   */
  async initialize(config: TaskbarMenuConfig): Promise<void> {
    // Register callbacks
    if (config.onNewWindow) this.listeners.set("new-window", config.onNewWindow);
    if (config.onNewMediaMogul) this.listeners.set("new-media-mogul", config.onNewMediaMogul);
    if (config.onNewVibeCode) this.listeners.set("new-vibecode", config.onNewVibeCode);
    if (config.onNewGameStudio) this.listeners.set("new-gamestudio", config.onNewGameStudio);
    if (config.onNewValleyNet) this.listeners.set("new-valleynet", config.onNewValleyNet);
    if (config.onNewDemoRecorder) this.listeners.set("new-demorecorder", config.onNewDemoRecorder);
    if (config.onShowAll) this.listeners.set("show-all", config.onShowAll);
    if (config.onHideAll) this.listeners.set("hide-all", config.onHideAll);
    if (config.onCloseAll) this.listeners.set("close-all", config.onCloseAll);
    if (config.onQuit) this.listeners.set("quit", config.onQuit);

    // Listen for menu events from Tauri
    try {
      const unlisten = await listen<{ action: MenuAction }>("menu-action", (event) => {
        const callback = this.listeners.get(event.payload.action);
        if (callback) {
          callback();
        }
      });
      this.unlisteners.push(unlisten);
    } catch (error) {
      console.warn("Taskbar menu not available:", error);
    }
  }

  /**
   * Create a new window
   */
  async createNewWindow(program: string = "media-mogul"): Promise<void> {
    try {
      await invoke("create_window_from_menu", { program });
    } catch (error) {
      console.error("Failed to create window:", error);
    }
  }

  /**
   * Show all windows
   */
  async showAllWindows(): Promise<void> {
    try {
      await invoke("show_all_windows", {});
    } catch (error) {
      console.error("Failed to show windows:", error);
    }
  }

  /**
   * Hide all windows
   */
  async hideAllWindows(): Promise<void> {
    try {
      await invoke("hide_all_windows", {});
    } catch (error) {
      console.error("Failed to hide windows:", error);
    }
  }

  /**
   * Close all windows
   */
  async closeAllWindows(): Promise<void> {
    try {
      await invoke("close_all_windows", {});
    } catch (error) {
      console.error("Failed to close windows:", error);
    }
  }

  /**
   * Cleanup listeners
   */
  cleanup(): void {
    this.unlisteners.forEach(unlisten => unlisten());
    this.unlisteners = [];
    this.listeners.clear();
  }
}

export const taskbarMenuManager = TaskbarMenuManager.getInstance();

export default taskbarMenuManager;
