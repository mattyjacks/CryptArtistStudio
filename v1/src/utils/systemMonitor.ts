// Advanced System Monitoring Utilities for Master
// Provides real-time system metrics and process information

import { invoke } from "@tauri-apps/api/core";

export interface SystemMetrics {
  cpu: {
    usage: number; // 0-100
    cores: number;
    frequency: number; // GHz
    temperature?: number; // Celsius
  };
  memory: {
    total: number; // GB
    used: number; // GB
    available: number; // GB
    usage: number; // 0-100
  };
  disk: {
    total: number; // GB
    used: number; // GB
    available: number; // GB
    usage: number; // 0-100
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
  };
  uptime: number; // seconds
  timestamp: number;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  status: "running" | "sleeping" | "stopped" | "zombie";
  cpu: number; // 0-100
  memory: number; // MB
  memoryPercent: number; // 0-100
  threads: number;
  priority: number;
  user: string;
  startTime: number;
  command: string;
}

export interface ProcessDetails extends ProcessInfo {
  children: number[];
  openFiles: number;
  ioRead: number; // bytes
  ioWrite: number; // bytes
  environment: Record<string, string>;
}

class SystemMonitor {
  private static instance: SystemMonitor;
  private metrics: SystemMetrics | null = null;
  private processes: ProcessInfo[] = [];
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(metrics: SystemMetrics) => void> = new Set();

  private constructor() {}

  static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  /**
   * Initialize system monitoring
   */
  async initialize(): Promise<void> {
    await this.updateMetrics();
    this.startAutoUpdate();
  }

  /**
   * Start auto-update of metrics
   */
  private startAutoUpdate(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);

    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000); // Update every second
  }

  /**
   * Stop auto-update
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Update system metrics
   */
  async updateMetrics(): Promise<SystemMetrics> {
    try {
      const metrics = await invoke<SystemMetrics>("get_system_metrics", {});
      this.metrics = metrics;
      this.notifyListeners(metrics);
      return metrics;
    } catch (error) {
      console.error("Failed to get system metrics:", error);
      throw error;
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): SystemMetrics | null {
    return this.metrics;
  }

  /**
   * Get all processes
   */
  async getProcesses(): Promise<ProcessInfo[]> {
    try {
      const processes = await invoke<ProcessInfo[]>("get_processes", {});
      this.processes = processes;
      return processes;
    } catch (error) {
      console.error("Failed to get processes:", error);
      throw error;
    }
  }

  /**
   * Get process details
   */
  async getProcessDetails(pid: number): Promise<ProcessDetails> {
    try {
      return await invoke<ProcessDetails>("get_process_details", { pid });
    } catch (error) {
      console.error(`Failed to get process details for PID ${pid}:`, error);
      throw error;
    }
  }

  /**
   * Kill process
   */
  async killProcess(pid: number): Promise<void> {
    try {
      await invoke("kill_process", { pid });
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error);
      throw error;
    }
  }

  /**
   * Set process priority
   */
  async setProcessPriority(pid: number, priority: number): Promise<void> {
    try {
      await invoke("set_process_priority", { pid, priority });
    } catch (error) {
      console.error(`Failed to set priority for process ${pid}:`, error);
      throw error;
    }
  }

  /**
   * Suspend process
   */
  async suspendProcess(pid: number): Promise<void> {
    try {
      await invoke("suspend_process", { pid });
    } catch (error) {
      console.error(`Failed to suspend process ${pid}:`, error);
      throw error;
    }
  }

  /**
   * Resume process
   */
  async resumeProcess(pid: number): Promise<void> {
    try {
      await invoke("resume_process", { pid });
    } catch (error) {
      console.error(`Failed to resume process ${pid}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to metrics updates
   */
  subscribe(listener: (metrics: SystemMetrics) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(metrics: SystemMetrics): void {
    this.listeners.forEach(listener => listener(metrics));
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.stopAutoUpdate();
    this.listeners.clear();
  }
}

export const systemMonitor = SystemMonitor.getInstance();

export default SystemMonitor;
