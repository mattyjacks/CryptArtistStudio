// System Prompt Configuration for Terminal Commands
// Windsurf-style system prompt management for VibeCodeWorker

import { invoke } from "@tauri-apps/api/core";

export interface SystemPromptConfig {
  enabled: boolean;
  filePath: string;
  content: string;
  lastModified: number;
  autoLoad: boolean;
}

export class TerminalSystemPrompt {
  private config: SystemPromptConfig;
  private fileWatchTimer: ReturnType<typeof setInterval> | null = null;

  constructor(filePath: string = ".vibecode-system-prompt.txt") {
    this.config = {
      enabled: true,
      filePath,
      content: this.getDefaultPrompt(),
      lastModified: Date.now(),
      autoLoad: true,
    };
  }

  /**
   * Get default system prompt
   */
  private getDefaultPrompt(): string {
    return `You are VibeCodeWorker, an AI-powered code development assistant integrated with CryptArtist Studio.

Your role is to help developers write, debug, and optimize code. You have access to terminal commands and can execute them to help with development tasks.

Guidelines:
1. Always prioritize code quality and best practices
2. Ask for clarification when requirements are ambiguous
3. Suggest improvements and optimizations
4. Explain your reasoning for code decisions
5. Test code before suggesting it
6. Handle errors gracefully and provide helpful error messages
7. Keep code DRY (Don't Repeat Yourself)
8. Follow the project's existing code style
9. Document complex logic
10. Consider performance and security implications

When executing terminal commands:
- Always explain what command you're running and why
- Check command results and handle errors appropriately
- Ask for permission before running potentially destructive commands
- Provide clear feedback on command execution
- Log important operations for future reference

Safety:
- Never execute commands without understanding their full impact
- Always respect the configured safety level
- Ask for approval when in doubt
- Report any security concerns immediately

Remember: Your goal is to make the developer's life easier while maintaining code quality and safety.`;
  }

  /**
   * Initialize system prompt from file
   */
  async initialize(): Promise<void> {
    try {
      const content = await invoke<string>("read_text_file", { path: this.config.filePath });
      this.config.content = content;
      this.config.lastModified = Date.now();
    } catch {
      // File doesn't exist, use default
      await this.save();
    }

    if (this.config.autoLoad) {
      this.startFileWatch();
    }
  }

  /**
   * Get current system prompt
   */
  getPrompt(): string {
    return this.config.content;
  }

  /**
   * Set system prompt
   */
  setPrompt(content: string): void {
    this.config.content = content;
    this.config.lastModified = Date.now();
  }

  /**
   * Append to system prompt
   */
  appendToPrompt(content: string): void {
    this.config.content += "\n\n" + content;
    this.config.lastModified = Date.now();
  }

  /**
   * Reset to default prompt
   */
  resetToDefault(): void {
    this.config.content = this.getDefaultPrompt();
    this.config.lastModified = Date.now();
  }

  /**
   * Save prompt to file
   */
  async save(): Promise<void> {
    try {
      await invoke("write_text_file", {
        path: this.config.filePath,
        contents: this.config.content,
      });
      this.config.lastModified = Date.now();
    } catch (err) {
      console.error("Failed to save system prompt:", err);
    }
  }

  /**
   * Load prompt from file
   */
  async load(): Promise<void> {
    try {
      const content = await invoke<string>("read_text_file", { path: this.config.filePath });
      this.config.content = content;
      this.config.lastModified = Date.now();
    } catch (err) {
      console.error("Failed to load system prompt:", err);
    }
  }

  /**
   * Start watching file for changes
   */
  private startFileWatch(): void {
    if (this.fileWatchTimer) clearInterval(this.fileWatchTimer);

    this.fileWatchTimer = setInterval(async () => {
      try {
        const content = await invoke<string>("read_text_file", { path: this.config.filePath });
        if (content !== this.config.content) {
          this.config.content = content;
          this.config.lastModified = Date.now();
        }
      } catch {
        // File may have been deleted or is inaccessible
      }
    }, 5000);
  }

  /**
   * Stop watching file
   */
  stopFileWatch(): void {
    if (this.fileWatchTimer) {
      clearInterval(this.fileWatchTimer);
      this.fileWatchTimer = null;
    }
  }

  /**
   * Get configuration
   */
  getConfig(): SystemPromptConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SystemPromptConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.autoLoad !== undefined) {
      if (config.autoLoad) {
        this.startFileWatch();
      } else {
        this.stopFileWatch();
      }
    }
  }

  /**
   * Create a context-aware prompt for a specific task
   */
  createContextPrompt(task: string, context?: string): string {
    let prompt = this.config.content;
    prompt += `\n\nCurrent Task: ${task}`;
    if (context) {
      prompt += `\n\nContext:\n${context}`;
    }
    return prompt;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    this.stopFileWatch();
    await this.save();
  }
}

export default TerminalSystemPrompt;
