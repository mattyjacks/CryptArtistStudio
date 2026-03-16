// Auto-updating Memory System for Terminal Commands
// Persists to .txt files and auto-updates based on command execution

import { invoke } from "@tauri-apps/api/core";

export interface MemoryEntry {
  id: string;
  timestamp: number;
  type: "command" | "error" | "success" | "note" | "context";
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface MemoryConfig {
  enabled: boolean;
  autoUpdate: boolean;
  maxEntries: number;
  filePath: string;
  updateInterval: number;
  categories: string[];
}

export class TerminalMemorySystem {
  private entries: MemoryEntry[] = [];
  private config: MemoryConfig;
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  private dirty = false;

  constructor(filePath: string = ".vibecode-memory.txt") {
    this.config = {
      enabled: true,
      autoUpdate: true,
      maxEntries: 1000,
      filePath,
      updateInterval: 30000,
      categories: ["commands", "errors", "successes", "context", "notes"],
    };
  }

  /**
   * Initialize memory system and load from file
   */
  async initialize(): Promise<void> {
    try {
      const content = await invoke<string>("read_text_file", { path: this.config.filePath });
      this.parseMemoryFile(content);
    } catch {
      // File doesn't exist yet, start fresh
      this.entries = [];
    }

    if (this.config.autoUpdate) {
      this.startAutoUpdate();
    }
  }

  /**
   * Add entry to memory
   */
  addEntry(
    type: MemoryEntry["type"],
    content: string,
    metadata?: Record<string, any>,
    tags?: string[]
  ): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      content,
      metadata,
      tags,
    };

    this.entries.push(entry);
    this.dirty = true;

    // Enforce max entries
    if (this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(-this.config.maxEntries);
    }

    return entry;
  }

  /**
   * Record a command execution
   */
  recordCommand(
    command: string,
    success: boolean,
    output?: string,
    error?: string,
    duration?: number
  ): MemoryEntry {
    const type = success ? "success" : "error";
    const content = `Command: ${command}\nOutput: ${output || "N/A"}\nError: ${error || "None"}\nDuration: ${duration}ms`;

    return this.addEntry(type, content, {
      command,
      success,
      output,
      error,
      duration,
    });
  }

  /**
   * Add context note
   */
  addContext(context: string, metadata?: Record<string, any>): MemoryEntry {
    return this.addEntry("context", context, metadata);
  }

  /**
   * Add general note
   */
  addNote(note: string, tags?: string[]): MemoryEntry {
    return this.addEntry("note", note, {}, tags);
  }

  /**
   * Search memory entries
   */
  search(query: string, type?: MemoryEntry["type"]): MemoryEntry[] {
    return this.entries.filter(entry => {
      const matchesQuery = entry.content.toLowerCase().includes(query.toLowerCase());
      const matchesType = !type || entry.type === type;
      return matchesQuery && matchesType;
    });
  }

  /**
   * Get entries by type
   */
  getByType(type: MemoryEntry["type"]): MemoryEntry[] {
    return this.entries.filter(entry => entry.type === type);
  }

  /**
   * Get entries by tag
   */
  getByTag(tag: string): MemoryEntry[] {
    return this.entries.filter(entry => entry.tags?.includes(tag));
  }

  /**
   * Get recent entries
   */
  getRecent(count: number = 10): MemoryEntry[] {
    return this.entries.slice(-count).reverse();
  }

  /**
   * Get memory summary
   */
  getSummary(): {
    totalEntries: number;
    byType: Record<string, number>;
    recentCommands: string[];
    successRate: number;
  } {
    const byType: Record<string, number> = {};
    let successCount = 0;
    let commandCount = 0;

    for (const entry of this.entries) {
      byType[entry.type] = (byType[entry.type] || 0) + 1;
      if (entry.type === "success") successCount++;
      if (entry.type === "success" || entry.type === "error") commandCount++;
    }

    const recentCommands = this.entries
      .filter(e => e.type === "success" || e.type === "error")
      .slice(-5)
      .map(e => e.metadata?.command || "unknown");

    return {
      totalEntries: this.entries.length,
      byType,
      recentCommands,
      successRate: commandCount > 0 ? (successCount / commandCount) * 100 : 0,
    };
  }

  /**
   * Clear memory
   */
  clear(): void {
    this.entries = [];
    this.dirty = true;
  }

  /**
   * Export memory as formatted text
   */
  private formatMemoryFile(): string {
    const lines: string[] = [
      "# VibeCodeWorker Terminal Memory",
      `# Generated: ${new Date().toISOString()}`,
      `# Total Entries: ${this.entries.length}`,
      "",
    ];

    for (const entry of this.entries) {
      lines.push(`## [${entry.type.toUpperCase()}] ${new Date(entry.timestamp).toISOString()}`);
      lines.push(`ID: ${entry.id}`);
      if (entry.tags?.length) {
        lines.push(`Tags: ${entry.tags.join(", ")}`);
      }
      lines.push("");
      lines.push(entry.content);
      if (entry.metadata) {
        lines.push("");
        lines.push("Metadata:");
        for (const [key, value] of Object.entries(entry.metadata)) {
          lines.push(`  ${key}: ${JSON.stringify(value)}`);
        }
      }
      lines.push("");
      lines.push("---");
      lines.push("");
    }

    return lines.join("\n");
  }

  /**
   * Parse memory file
   */
  private parseMemoryFile(content: string): void {
    this.entries = [];
    const sections = content.split("---").filter(s => s.trim());

    for (const section of sections) {
      const lines = section.trim().split("\n");
      if (lines.length < 2) continue;

      const headerMatch = lines[0].match(/\[(\w+)\]\s+(.+)/);
      if (!headerMatch) continue;

      const type = headerMatch[1].toLowerCase() as MemoryEntry["type"];
      const timestamp = new Date(headerMatch[2]).getTime();

      let id = "";
      let content = "";
      let tags: string[] = [];
      let metadata: Record<string, any> = {};
      let inMetadata = false;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith("ID:")) {
          id = line.substring(3).trim();
        } else if (line.startsWith("Tags:")) {
          tags = line.substring(5).trim().split(",").map(t => t.trim());
        } else if (line.startsWith("Metadata:")) {
          inMetadata = true;
        } else if (inMetadata && line.startsWith("  ")) {
          const [key, ...valueParts] = line.substring(2).split(":");
          try {
            metadata[key.trim()] = JSON.parse(valueParts.join(":").trim());
          } catch {
            metadata[key.trim()] = valueParts.join(":").trim();
          }
        } else if (!line.startsWith("ID:") && !line.startsWith("Tags:") && !inMetadata) {
          content += (content ? "\n" : "") + line;
        }
      }

      if (id && content) {
        this.entries.push({
          id,
          timestamp,
          type,
          content,
          tags: tags.length > 0 ? tags : undefined,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        });
      }
    }
  }

  /**
   * Save memory to file
   */
  async save(): Promise<void> {
    if (!this.dirty) return;

    try {
      const content = this.formatMemoryFile();
      await invoke("write_text_file", {
        path: this.config.filePath,
        contents: content,
      });
      this.dirty = false;
    } catch (err) {
      console.error("Failed to save memory:", err);
    }
  }

  /**
   * Start auto-update timer
   */
  private startAutoUpdate(): void {
    if (this.updateTimer) clearInterval(this.updateTimer);

    this.updateTimer = setInterval(() => {
      if (this.dirty) {
        this.save();
      }
    }, this.config.updateInterval);
  }

  /**
   * Stop auto-update timer
   */
  stopAutoUpdate(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.autoUpdate !== undefined) {
      if (config.autoUpdate) {
        this.startAutoUpdate();
      } else {
        this.stopAutoUpdate();
      }
    }
  }

  /**
   * Get configuration
   */
  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.stopAutoUpdate();
    await this.save();
  }
}

export default TerminalMemorySystem;
