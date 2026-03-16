// Multi-window management utilities for CryptArtist Studio
// Provides React hooks and utilities for managing multiple windows

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, useCallback } from "react";

export interface WindowInfo {
  id: string;
  title: string;
  width: number;
  height: number;
  x: number;
  y: number;
  program: string;
  focused: boolean;
  minimized: boolean;
}

export interface CreateWindowOptions {
  title: string;
  width?: number;
  height?: number;
  program: string;
  data?: string;
}

class MultiWindowManager {
  private static instance: MultiWindowManager;
  private windows: Map<string, WindowInfo> = new Map();
  private listeners: Set<(windows: WindowInfo[]) => void> = new Set();

  private constructor() {}

  static getInstance(): MultiWindowManager {
    if (!MultiWindowManager.instance) {
      MultiWindowManager.instance = new MultiWindowManager();
    }
    return MultiWindowManager.instance;
  }

  /**
   * Create a new window
   */
  async createWindow(options: CreateWindowOptions): Promise<string> {
    try {
      const windowId = await invoke<string>("create_window", {
        title: options.title,
        width: options.width || 1440,
        height: options.height || 900,
        program: options.program,
        data: options.data,
      });

      const windowInfo: WindowInfo = {
        id: windowId,
        title: options.title,
        width: options.width || 1440,
        height: options.height || 900,
        x: 0,
        y: 0,
        program: options.program,
        focused: true,
        minimized: false,
      };

      this.windows.set(windowId, windowInfo);
      this.notifyListeners();

      return windowId;
    } catch (error) {
      throw new Error(`Failed to create window: ${error}`);
    }
  }

  /**
   * Close a window
   */
  async closeWindow(windowId: string): Promise<void> {
    try {
      await invoke("close_window", { windowId });
      this.windows.delete(windowId);
      this.notifyListeners();
    } catch (error) {
      throw new Error(`Failed to close window: ${error}`);
    }
  }

  /**
   * Get all open windows
   */
  async getWindows(): Promise<WindowInfo[]> {
    try {
      const windows = await invoke<WindowInfo[]>("get_windows", {});
      this.windows.clear();
      windows.forEach(w => this.windows.set(w.id, w));
      return windows;
    } catch (error) {
      throw new Error(`Failed to get windows: ${error}`);
    }
  }

  /**
   * Get a specific window
   */
  async getWindow(windowId: string): Promise<WindowInfo> {
    try {
      return await invoke<WindowInfo>("get_window", { windowId });
    } catch (error) {
      throw new Error(`Failed to get window: ${error}`);
    }
  }

  /**
   * Get window count
   */
  async getWindowCount(): Promise<number> {
    try {
      return await invoke<number>("get_window_count", {});
    } catch (error) {
      throw new Error(`Failed to get window count: ${error}`);
    }
  }

  /**
   * Check if can create more windows
   */
  async canCreateWindow(): Promise<boolean> {
    try {
      return await invoke<boolean>("can_create_window", {});
    } catch (error) {
      throw new Error(`Failed to check window limit: ${error}`);
    }
  }

  /**
   * Get max windows limit
   */
  async getMaxWindows(): Promise<number> {
    try {
      return await invoke<number>("get_max_windows", {});
    } catch (error) {
      throw new Error(`Failed to get max windows: ${error}`);
    }
  }

  /**
   * Update window state
   */
  async updateWindowState(
    windowId: string,
    width: number,
    height: number,
    x: number,
    y: number,
    focused: boolean,
    minimized: boolean
  ): Promise<void> {
    try {
      await invoke("update_window_state", {
        windowId,
        width,
        height,
        x,
        y,
        focused,
        minimized,
      });

      const window = this.windows.get(windowId);
      if (window) {
        window.width = width;
        window.height = height;
        window.x = x;
        window.y = y;
        window.focused = focused;
        window.minimized = minimized;
        this.notifyListeners();
      }
    } catch (error) {
      throw new Error(`Failed to update window state: ${error}`);
    }
  }

  /**
   * Broadcast message to all windows
   */
  async broadcastToWindows(event: string, payload: any): Promise<void> {
    try {
      await invoke("broadcast_to_windows", { event, payload });
    } catch (error) {
      throw new Error(`Failed to broadcast: ${error}`);
    }
  }

  /**
   * Send message to specific window
   */
  async sendToWindow(windowId: string, event: string, payload: any): Promise<void> {
    try {
      await invoke("send_to_window", { windowId, event, payload });
    } catch (error) {
      throw new Error(`Failed to send message: ${error}`);
    }
  }

  /**
   * Subscribe to window changes
   */
  subscribe(listener: (windows: WindowInfo[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of window changes
   */
  private notifyListeners(): void {
    const windows = Array.from(this.windows.values());
    this.listeners.forEach(listener => listener(windows));
  }
}

export const windowManager = MultiWindowManager.getInstance();

/**
 * React hook for multi-window management
 */
export function useMultiWindow() {
  const [windows, setWindows] = useState<WindowInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load initial windows
    windowManager
      .getWindows()
      .then(setWindows)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    // Subscribe to window changes
    const unsubscribe = windowManager.subscribe(setWindows);

    return unsubscribe;
  }, []);

  const createWindow = useCallback(async (options: CreateWindowOptions) => {
    try {
      setError(null);
      const windowId = await windowManager.createWindow(options);
      return windowId;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  const closeWindow = useCallback(async (windowId: string) => {
    try {
      setError(null);
      await windowManager.closeWindow(windowId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  const canCreate = useCallback(async () => {
    try {
      return await windowManager.canCreateWindow();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return false;
    }
  }, []);

  const getMaxWindows = useCallback(async () => {
    try {
      return await windowManager.getMaxWindows();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      return 10;
    }
  }, []);

  const broadcast = useCallback(async (event: string, payload: any) => {
    try {
      setError(null);
      await windowManager.broadcastToWindows(event, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  const sendMessage = useCallback(async (windowId: string, event: string, payload: any) => {
    try {
      setError(null);
      await windowManager.sendToWindow(windowId, event, payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  return {
    windows,
    loading,
    error,
    createWindow,
    closeWindow,
    canCreate,
    getMaxWindows,
    broadcast,
    sendMessage,
    windowCount: windows.length,
  };
}

export default windowManager;
