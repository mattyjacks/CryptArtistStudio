// Enhanced System Monitoring with Advanced Features
// Includes GPU monitoring, alerts, history export, benchmarks, and more

import { invoke } from "@tauri-apps/api/core";

export interface EnhancedSystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    frequency: number;
    temperature?: number;
    perCoreUsage?: number[];
    cacheSize?: number;
    tdp?: number;
  };
  memory: {
    total: number;
    used: number;
    available: number;
    usage: number;
    swapTotal?: number;
    swapUsed?: number;
    swapUsage?: number;
  };
  disk: {
    total: number;
    used: number;
    available: number;
    usage: number;
    readSpeed?: number;
    writeSpeed?: number;
    ioWait?: number;
  };
  gpu?: {
    name: string;
    usage: number;
    memory: number;
    temperature?: number;
    powerUsage?: number;
  }[];
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    errors?: number;
    dropped?: number;
  };
  uptime: number;
  timestamp: number;
  bootTime?: number;
  osVersion?: string;
  hostname?: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  status: "running" | "sleeping" | "stopped" | "zombie";
  cpu: number;
  memory: number;
  memoryPercent: number;
  threads: number;
  priority: number;
  user: string;
  startTime: number;
  command: string;
  cpuAffinity?: number[];
  ioRead?: number;
  ioWrite?: number;
  gpuUsage?: number;
}

export interface Alert {
  id: string;
  type: "cpu" | "memory" | "disk" | "gpu" | "temperature";
  severity: "info" | "warning" | "critical";
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved?: boolean;
}

export interface Benchmark {
  name: string;
  score: number;
  timestamp: number;
  cpuScore?: number;
  memoryScore?: number;
  diskScore?: number;
  gpuScore?: number;
}

class EnhancedSystemMonitor {
  private static instance: EnhancedSystemMonitor;
  private metrics: EnhancedSystemMetrics | null = null;
  private processes: ProcessInfo[] = [];
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<(metrics: EnhancedSystemMetrics) => void> = new Set();
  private alerts: Alert[] = [];
  private history: EnhancedSystemMetrics[] = [];
  private benchmarks: Benchmark[] = [];
  private alertThresholds = {
    cpu: 90,
    memory: 85,
    disk: 90,
    temperature: 85,
  };
  private favorites: Set<number> = new Set();
  private processFilters: Map<string, boolean> = new Map();
  private darkMode = true;
  private autoRefresh = true;
  private refreshRate = 1000;
  private maxHistorySize = 3600; // 1 hour at 1s intervals

  private constructor() {}

  static getInstance(): EnhancedSystemMonitor {
    if (!EnhancedSystemMonitor.instance) {
      EnhancedSystemMonitor.instance = new EnhancedSystemMonitor();
    }
    return EnhancedSystemMonitor.instance;
  }

  async initialize(): Promise<void> {
    await this.updateMetrics();
    this.startAutoUpdate();
  }

  private startAutoUpdate(): void {
    if (this.updateInterval) clearInterval(this.updateInterval);
    if (!this.autoRefresh) return;

    this.updateInterval = setInterval(() => {
      this.updateMetrics();
    }, this.refreshRate);
  }

  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateMetrics(): Promise<EnhancedSystemMetrics> {
    try {
      const metrics = await invoke<EnhancedSystemMetrics>("get_system_metrics", {});
      this.metrics = metrics;
      this.history.push(metrics);
      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }
      this.checkAlerts(metrics);
      this.notifyListeners(metrics);
      return metrics;
    } catch (error) {
      console.error("Failed to get system metrics:", error);
      throw error;
    }
  }

  private checkAlerts(metrics: EnhancedSystemMetrics): void {
    // CPU alert
    if (metrics.cpu.usage > this.alertThresholds.cpu) {
      this.addAlert({
        id: `cpu-${Date.now()}`,
        type: "cpu",
        severity: metrics.cpu.usage > 95 ? "critical" : "warning",
        message: `High CPU usage: ${metrics.cpu.usage.toFixed(1)}%`,
        value: metrics.cpu.usage,
        threshold: this.alertThresholds.cpu,
        timestamp: Date.now(),
      });
    }

    // Memory alert
    if (metrics.memory.usage > this.alertThresholds.memory) {
      this.addAlert({
        id: `memory-${Date.now()}`,
        type: "memory",
        severity: metrics.memory.usage > 95 ? "critical" : "warning",
        message: `High memory usage: ${metrics.memory.usage.toFixed(1)}%`,
        value: metrics.memory.usage,
        threshold: this.alertThresholds.memory,
        timestamp: Date.now(),
      });
    }

    // Disk alert
    if (metrics.disk.usage > this.alertThresholds.disk) {
      this.addAlert({
        id: `disk-${Date.now()}`,
        type: "disk",
        severity: metrics.disk.usage > 95 ? "critical" : "warning",
        message: `High disk usage: ${metrics.disk.usage.toFixed(1)}%`,
        value: metrics.disk.usage,
        threshold: this.alertThresholds.disk,
        timestamp: Date.now(),
      });
    }

    // Temperature alert
    if (metrics.cpu.temperature && metrics.cpu.temperature > this.alertThresholds.temperature) {
      this.addAlert({
        id: `temp-${Date.now()}`,
        type: "temperature",
        severity: metrics.cpu.temperature > 95 ? "critical" : "warning",
        message: `High CPU temperature: ${metrics.cpu.temperature.toFixed(1)}°C`,
        value: metrics.cpu.temperature,
        threshold: this.alertThresholds.temperature,
        timestamp: Date.now(),
      });
    }
  }

  private addAlert(alert: Alert): void {
    // Avoid duplicate alerts within 5 seconds
    const recentAlert = this.alerts.find(
      a => a.type === alert.type && Date.now() - a.timestamp < 5000
    );
    if (!recentAlert) {
      this.alerts.push(alert);
      if (this.alerts.length > 100) {
        this.alerts.shift();
      }
    }
  }

  getMetrics(): EnhancedSystemMetrics | null {
    return this.metrics;
  }

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

  async killProcess(pid: number): Promise<void> {
    try {
      await invoke("kill_process", { pid });
    } catch (error) {
      console.error(`Failed to kill process ${pid}:`, error);
      throw error;
    }
  }

  async suspendProcess(pid: number): Promise<void> {
    try {
      await invoke("suspend_process", { pid });
    } catch (error) {
      console.error(`Failed to suspend process ${pid}:`, error);
      throw error;
    }
  }

  async resumeProcess(pid: number): Promise<void> {
    try {
      await invoke("resume_process", { pid });
    } catch (error) {
      console.error(`Failed to resume process ${pid}:`, error);
      throw error;
    }
  }

  async setProcessPriority(pid: number, priority: number): Promise<void> {
    try {
      await invoke("set_process_priority", { pid, priority });
    } catch (error) {
      console.error(`Failed to set priority for process ${pid}:`, error);
      throw error;
    }
  }

  // Favorites management
  addFavorite(pid: number): void {
    this.favorites.add(pid);
  }

  removeFavorite(pid: number): void {
    this.favorites.delete(pid);
  }

  isFavorite(pid: number): boolean {
    return this.favorites.has(pid);
  }

  getFavorites(): number[] {
    return Array.from(this.favorites);
  }

  // Process filtering
  setProcessFilter(name: string, enabled: boolean): void {
    this.processFilters.set(name, enabled);
  }

  getProcessFilter(name: string): boolean {
    return this.processFilters.get(name) ?? true;
  }

  // Alert management
  getAlerts(): Alert[] {
    return this.alerts;
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  setAlertThreshold(type: keyof typeof this.alertThresholds, value: number): void {
    this.alertThresholds[type] = value;
  }

  // History and benchmarks
  getHistory(): EnhancedSystemMetrics[] {
    return this.history;
  }

  clearHistory(): void {
    this.history = [];
  }

  async runBenchmark(): Promise<Benchmark> {
    try {
      const result = await invoke<Benchmark>("run_benchmark", {});
      this.benchmarks.push(result);
      return result;
    } catch (error) {
      console.error("Failed to run benchmark:", error);
      throw error;
    }
  }

  getBenchmarks(): Benchmark[] {
    return this.benchmarks;
  }

  // Export functionality
  exportMetrics(format: "json" | "csv"): string {
    if (format === "json") {
      return JSON.stringify(
        {
          metrics: this.metrics,
          history: this.history,
          benchmarks: this.benchmarks,
          alerts: this.alerts,
        },
        null,
        2
      );
    } else {
      // CSV format
      let csv = "timestamp,cpu,memory,disk,temperature\n";
      this.history.forEach(m => {
        csv += `${m.timestamp},${m.cpu.usage},${m.memory.usage},${m.disk.usage},${m.cpu.temperature || "N/A"}\n`;
      });
      return csv;
    }
  }

  // Settings
  setDarkMode(enabled: boolean): void {
    this.darkMode = enabled;
  }

  isDarkMode(): boolean {
    return this.darkMode;
  }

  setAutoRefresh(enabled: boolean): void {
    this.autoRefresh = enabled;
    if (enabled) {
      this.startAutoUpdate();
    } else {
      this.stopAutoUpdate();
    }
  }

  setRefreshRate(ms: number): void {
    this.refreshRate = Math.max(100, Math.min(10000, ms));
    if (this.autoRefresh) {
      this.startAutoUpdate();
    }
  }

  // Subscriptions
  subscribe(listener: (metrics: EnhancedSystemMetrics) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(metrics: EnhancedSystemMetrics): void {
    this.listeners.forEach(listener => listener(metrics));
  }

  cleanup(): void {
    this.stopAutoUpdate();
    this.listeners.clear();
  }
}

export const enhancedSystemMonitor = EnhancedSystemMonitor.getInstance();

export default EnhancedSystemMonitor;
