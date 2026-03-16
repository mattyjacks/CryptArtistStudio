// Terminal Command Executor for VibeCodeWorker
// Integrates safety validation, memory, and system prompts

import { invoke } from "@tauri-apps/api/core";
import TerminalSafetyValidator, { AISafetyLevel, CommandExecutionRequest, CommandExecutionResult } from "./terminalSafety";
import TerminalMemorySystem from "./terminalMemory";
import TerminalSystemPrompt from "./terminalSystemPrompt";

export interface TerminalExecutorConfig {
  safetyLevel: AISafetyLevel;
  enableMemory: boolean;
  enableSystemPrompt: boolean;
  memoryFilePath: string;
  promptFilePath: string;
  approvalCallback?: (command: string, reason: string) => Promise<boolean>;
}

export class TerminalExecutor {
  private validator: TerminalSafetyValidator;
  private memory: TerminalMemorySystem;
  private systemPrompt: TerminalSystemPrompt;
  private config: TerminalExecutorConfig;
  private commandHistory: CommandExecutionResult[] = [];

  constructor(config: Partial<TerminalExecutorConfig> = {}) {
    this.config = {
      safetyLevel: config.safetyLevel || "balanced",
      enableMemory: config.enableMemory !== false,
      enableSystemPrompt: config.enableSystemPrompt !== false,
      memoryFilePath: config.memoryFilePath || ".vibecode-memory.txt",
      promptFilePath: config.promptFilePath || ".vibecode-system-prompt.txt",
      approvalCallback: config.approvalCallback,
    };

    this.validator = new TerminalSafetyValidator(this.config.safetyLevel);
    this.memory = new TerminalMemorySystem(this.config.memoryFilePath);
    this.systemPrompt = new TerminalSystemPrompt(this.config.promptFilePath);
  }

  /**
   * Initialize all systems
   */
  async initialize(): Promise<void> {
    if (this.config.enableMemory) {
      await this.memory.initialize();
    }
    if (this.config.enableSystemPrompt) {
      await this.systemPrompt.initialize();
    }
  }

  /**
   * Execute a command with safety validation
   */
  async executeCommand(request: CommandExecutionRequest): Promise<CommandExecutionResult> {
    const startTime = Date.now();
    const command = this.buildCommand(request);

    // Validate command
    const validation = this.validator.validateCommand(command);

    // Check if approval is needed
    if (validation.requiresApproval && this.config.approvalCallback) {
      const approved = await this.config.approvalCallback(command, validation.reason);
      if (!approved) {
        const result: CommandExecutionResult = {
          success: false,
          command,
          output: "",
          error: "Command rejected by user",
          duration: Date.now() - startTime,
          approved: false,
          reason: "User denied approval",
        };

        if (this.config.enableMemory) {
          this.memory.recordCommand(command, false, "", "User denied approval", result.duration);
        }

        return result;
      }
    }

    // Check if command is allowed
    if (!validation.allowed) {
      const result: CommandExecutionResult = {
        success: false,
        command,
        output: "",
        error: validation.reason,
        duration: Date.now() - startTime,
        approved: false,
        reason: validation.reason,
      };

      if (this.config.enableMemory) {
        this.memory.recordCommand(command, false, "", validation.reason, result.duration);
      }

      return result;
    }

    // Execute command
    try {
      const output = await invoke<string>("execute_command", {
        command,
        cwd: request.cwd,
        timeout: request.timeout || this.validator.getConfig().timeoutMs,
      });

      const result: CommandExecutionResult = {
        success: true,
        command,
        output,
        duration: Date.now() - startTime,
        approved: true,
      };

      if (this.config.enableMemory) {
        this.memory.recordCommand(command, true, output, undefined, result.duration);
      }

      this.commandHistory.push(result);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const result: CommandExecutionResult = {
        success: false,
        command,
        output: "",
        error: errorMsg,
        duration: Date.now() - startTime,
        approved: true,
        reason: "Command execution failed",
      };

      if (this.config.enableMemory) {
        this.memory.recordCommand(command, false, "", errorMsg, result.duration);
      }

      this.commandHistory.push(result);
      return result;
    }
  }

  /**
   * Build command string from request
   */
  private buildCommand(request: CommandExecutionRequest): string {
    if (request.args && request.args.length > 0) {
      return `${request.command} ${request.args.map(arg => this.escapeArg(arg)).join(" ")}`;
    }
    return request.command;
  }

  /**
   * Escape command argument
   */
  private escapeArg(arg: string): string {
    if (arg.includes(" ") || arg.includes('"')) {
      return `"${arg.replace(/"/g, '\\"')}"`;
    }
    return arg;
  }

  /**
   * Get system prompt
   */
  getSystemPrompt(): string {
    return this.systemPrompt.getPrompt();
  }

  /**
   * Set system prompt
   */
  setSystemPrompt(content: string): void {
    this.systemPrompt.setPrompt(content);
  }

  /**
   * Get memory summary
   */
  getMemorySummary() {
    return this.memory.getSummary();
  }

  /**
   * Search memory
   */
  searchMemory(query: string) {
    return this.memory.search(query);
  }

  /**
   * Get command history
   */
  getCommandHistory(limit: number = 10): CommandExecutionResult[] {
    return this.commandHistory.slice(-limit);
  }

  /**
   * Set safety level
   */
  setSafetyLevel(level: AISafetyLevel): void {
    this.config.safetyLevel = level;
    this.validator.setSafetyLevel(level);
  }

  /**
   * Add command to allow list
   */
  allowCommand(command: string): void {
    this.validator.addToAllowList(command);
  }

  /**
   * Add command to deny list
   */
  denyCommand(command: string): void {
    this.validator.addToDenyList(command);
  }

  /**
   * Get validator configuration
   */
  getValidatorConfig() {
    return this.validator.getConfig();
  }

  /**
   * Update validator configuration
   */
  updateValidatorConfig(config: any): void {
    this.validator.setConfig(config);
  }

  /**
   * Get memory configuration
   */
  getMemoryConfig() {
    return this.memory.getConfig();
  }

  /**
   * Update memory configuration
   */
  updateMemoryConfig(config: any): void {
    this.memory.updateConfig(config);
  }

  /**
   * Get system prompt configuration
   */
  getPromptConfig() {
    return this.systemPrompt.getConfig();
  }

  /**
   * Update system prompt configuration
   */
  updatePromptConfig(config: any): void {
    this.systemPrompt.updateConfig(config);
  }

  /**
   * Save all systems
   */
  async saveAll(): Promise<void> {
    if (this.config.enableMemory) {
      await this.memory.save();
    }
    if (this.config.enableSystemPrompt) {
      await this.systemPrompt.save();
    }
  }

  /**
   * Cleanup and save
   */
  async cleanup(): Promise<void> {
    await this.memory.cleanup();
    await this.systemPrompt.cleanup();
  }
}

export default TerminalExecutor;
