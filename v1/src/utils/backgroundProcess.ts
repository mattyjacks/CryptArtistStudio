// Background Process Management for Frontend
// Handles communication with background process, system tray integration, and lifecycle

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export interface BackgroundState {
  isRunning: boolean;
  isMinimized: boolean;
  startTime: number;
  lastActivity: number;
  errorCount: number;
  lastError?: string;
}

class BackgroundProcessManager {
  private static instance: BackgroundProcessManager;
  private isMinimized = false;
  private listeners: Set<(state: BackgroundState) => void> = new Set();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private lastKnownState: BackgroundState | null = null;

  private constructor() {}

  static getInstance(): BackgroundProcessManager {
    if (!BackgroundProcessManager.instance) {
      BackgroundProcessManager.instance = new BackgroundProcessManager();
    }
    return BackgroundProcessManager.instance;
  }

  /**
   * Initialize background process manager
   */
  async initialize(): Promise<void> {
    try {
      // Start health check
      this.startHealthCheck();

      // Listen for window close events
      const unlistenClose = await listen("tauri://close-requested", () => {
        this.handleWindowClose();
      });

      // Listen for window focus events
      const unlistenFocus = await listen("tauri://focus", () => {
        this.isMinimized = false;
      });

      // Listen for window blur events
      const unlistenBlur = await listen("tauri://blur", () => {
        // Don't minimize on blur, only on explicit minimize
      });
    } catch (error) {
      console.error("Failed to initialize background process manager:", error);
    }
  }

  /**
   * Minimize to system tray
   */
  async minimizeToTray(): Promise<void> {
    try {
      this.isMinimized = true;
      await invoke("minimize_to_tray", {});
    } catch (error) {
      console.error("Failed to minimize to tray:", error);
      throw error;
    }
  }

  /**
   * Restore from system tray
   */
  async restoreFromTray(): Promise<void> {
    try {
      this.isMinimized = false;
      await invoke("restore_from_tray", {});
    } catch (error) {
      console.error("Failed to restore from tray:", error);
      throw error;
    }
  }

  /**
   * Get current background state
   */
  async getBackgroundState(): Promise<BackgroundState> {
    try {
      const stateStr = await invoke<string>("get_background_state", {});
      const parsed = JSON.parse(stateStr);
      return {
        isRunning: true,
        isMinimized: this.isMinimized,
        startTime: Date.now(),
        lastActivity: Date.now(),
        errorCount: 0,
        ...parsed,
      };
    } catch (error) {
      console.error("Failed to get background state:", error);
      throw error;
    }
  }

  /**
   * Check if app is running in background
   */
  async isAppRunning(): Promise<boolean> {
    try {
      return await invoke<boolean>("is_app_running", {});
    } catch (error) {
      console.error("Failed to check if app is running:", error);
      return false;
    }
  }

  /**
   * Quit application gracefully
   */
  async quitApp(): Promise<void> {
    try {
      await invoke("quit_app", {});
    } catch (error) {
      console.error("Failed to quit app:", error);
      throw error;
    }
  }

  /**
   * Handle window close event
   */
  private handleWindowClose(): void {
    // Minimize to tray instead of closing
    this.minimizeToTray().catch(err => {
      console.error("Failed to minimize on close:", err);
    });
  }

  /**
   * Start health check
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const state = await this.getBackgroundState();
        this.lastKnownState = state;
        this.notifyListeners(state);
      } catch (error) {
        console.error("Health check failed:", error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop health check
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: BackgroundState) => void): () => void {
    this.listeners.add(listener);
    // Send current state immediately
    if (this.lastKnownState) {
      listener(this.lastKnownState);
    }
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(state: BackgroundState): void {
    this.listeners.forEach(listener => listener(state));
  }

  /**
   * Get minimized state
   */
  getMinimizedState(): boolean {
    return this.isMinimized;
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopHealthCheck();
    this.listeners.clear();
  }
}

export const backgroundProcessManager = BackgroundProcessManager.getInstance();

export default BackgroundProcessManager;
