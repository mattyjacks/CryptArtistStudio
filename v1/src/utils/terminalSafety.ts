// Terminal Command Safety System for VibeCodeWorker
// Implements AI safety levels, allow/deny lists, and command validation

export type AISafetyLevel = "unrestricted" | "permissive" | "balanced" | "strict" | "paranoid";

export interface CommandRule {
  pattern: string | RegExp;
  allowed: boolean;
  reason?: string;
  level?: AISafetyLevel;
}

export interface TerminalSafetyConfig {
  safetyLevel: AISafetyLevel;
  allowList: string[];
  denyList: string[];
  customRules: CommandRule[];
  requireApproval: boolean;
  logCommands: boolean;
  maxCommandLength: number;
  timeoutMs: number;
}

export interface CommandExecutionRequest {
  command: string;
  args?: string[];
  cwd?: string;
  timeout?: number;
  requireApproval?: boolean;
}

export interface CommandExecutionResult {
  success: boolean;
  command: string;
  output: string;
  error?: string;
  exitCode?: number;
  duration: number;
  approved: boolean;
  reason?: string;
}

// Default safety configurations for different levels
export const SAFETY_LEVEL_CONFIGS: Record<AISafetyLevel, Partial<TerminalSafetyConfig>> = {
  unrestricted: {
    safetyLevel: "unrestricted",
    requireApproval: false,
    maxCommandLength: 10000,
    timeoutMs: 300000,
  },
  permissive: {
    safetyLevel: "permissive",
    requireApproval: false,
    maxCommandLength: 5000,
    timeoutMs: 120000,
  },
  balanced: {
    safetyLevel: "balanced",
    requireApproval: true,
    maxCommandLength: 2000,
    timeoutMs: 60000,
  },
  strict: {
    safetyLevel: "strict",
    requireApproval: true,
    maxCommandLength: 1000,
    timeoutMs: 30000,
  },
  paranoid: {
    safetyLevel: "paranoid",
    requireApproval: true,
    maxCommandLength: 500,
    timeoutMs: 10000,
  },
};

// Dangerous command patterns for different safety levels
export const DANGEROUS_PATTERNS: Record<AISafetyLevel, RegExp[]> = {
  unrestricted: [],
  permissive: [
    /rm\s+-rf/i,
    /mkfs/i,
    /dd\s+if=/i,
    /:(){ :|:& };:/i,
  ],
  balanced: [
    /rm\s+-rf/i,
    /mkfs/i,
    /dd\s+if=/i,
    /:(){ :|:& };:/i,
    /sudo/i,
    /chmod\s+777/i,
    /chown/i,
    /format\s+[a-z]:/i,
  ],
  strict: [
    /rm\s+-rf/i,
    /mkfs/i,
    /dd\s+if=/i,
    /:(){ :|:& };:/i,
    /sudo/i,
    /chmod/i,
    /chown/i,
    /format/i,
    /del\s+\/s/i,
    /deltree/i,
    /shutdown/i,
    /reboot/i,
    /halt/i,
  ],
  paranoid: [
    /rm/i,
    /del/i,
    /mkfs/i,
    /dd/i,
    /:(){ :|:& };:/i,
    /sudo/i,
    /chmod/i,
    /chown/i,
    /format/i,
    /shutdown/i,
    /reboot/i,
    /halt/i,
    /kill/i,
    /pkill/i,
    /killall/i,
    /curl\s+.*\|.*sh/i,
    /wget\s+.*\|.*sh/i,
  ],
};

// Safe commands that are always allowed
export const SAFE_COMMANDS = [
  "ls",
  "dir",
  "pwd",
  "cd",
  "echo",
  "cat",
  "type",
  "find",
  "grep",
  "npm",
  "yarn",
  "pnpm",
  "git",
  "node",
  "python",
  "python3",
  "tsc",
  "cargo",
  "go",
  "rustc",
  "javac",
  "java",
  "dotnet",
  "make",
  "cmake",
  "gcc",
  "clang",
  "nvim",
  "vim",
  "nano",
  "code",
  "subl",
  "atom",
  "code-insiders",
];

export class TerminalSafetyValidator {
  private config: TerminalSafetyConfig;

  constructor(safetyLevel: AISafetyLevel = "balanced") {
    this.config = {
      safetyLevel,
      allowList: [...SAFE_COMMANDS],
      denyList: [],
      customRules: [],
      requireApproval: SAFETY_LEVEL_CONFIGS[safetyLevel].requireApproval ?? true,
      logCommands: true,
      maxCommandLength: SAFETY_LEVEL_CONFIGS[safetyLevel].maxCommandLength ?? 2000,
      timeoutMs: SAFETY_LEVEL_CONFIGS[safetyLevel].timeoutMs ?? 60000,
    };
  }

  /**
   * Validate a command against safety rules
   */
  validateCommand(command: string): {
    allowed: boolean;
    requiresApproval: boolean;
    reason: string;
    riskLevel: "safe" | "warning" | "danger";
  } {
    // Check command length
    if (command.length > this.config.maxCommandLength) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Command exceeds maximum length (${this.config.maxCommandLength} chars)`,
        riskLevel: "danger",
      };
    }

    // Extract base command
    const baseCommand = command.split(/\s+/)[0];

    // Check deny list first
    if (this.config.denyList.some(denied => this.matchesPattern(baseCommand, denied))) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Command is in deny list`,
        riskLevel: "danger",
      };
    }

    // Check allow list
    if (this.config.allowList.some(allowed => this.matchesPattern(baseCommand, allowed))) {
      return {
        allowed: true,
        requiresApproval: false,
        reason: "Command is in allow list",
        riskLevel: "safe",
      };
    }

    // Check dangerous patterns for current safety level
    const dangerousPatterns = DANGEROUS_PATTERNS[this.config.safetyLevel];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: this.config.safetyLevel === "unrestricted",
          requiresApproval: this.config.safetyLevel !== "unrestricted",
          reason: `Command matches dangerous pattern for ${this.config.safetyLevel} mode`,
          riskLevel: "danger",
        };
      }
    }

    // Check custom rules
    for (const rule of this.config.customRules) {
      if (this.matchesPattern(command, rule.pattern)) {
        return {
          allowed: rule.allowed,
          requiresApproval: !rule.allowed && this.config.safetyLevel !== "unrestricted",
          reason: rule.reason || "Matched custom rule",
          riskLevel: rule.allowed ? "safe" : "warning",
        };
      }
    }

    // Default: require approval for unknown commands in strict modes
    const requiresApproval = this.config.safetyLevel !== "unrestricted" && this.config.safetyLevel !== "permissive";
    return {
      allowed: !requiresApproval,
      requiresApproval,
      reason: "Unknown command - requires approval in this safety level",
      riskLevel: "warning",
    };
  }

  /**
   * Check if a string matches a pattern (string or regex)
   */
  private matchesPattern(text: string, pattern: string | RegExp): boolean {
    if (typeof pattern === "string") {
      return text.toLowerCase().includes(pattern.toLowerCase());
    }
    return pattern.test(text);
  }

  /**
   * Update safety level
   */
  setSafetyLevel(level: AISafetyLevel): void {
    this.config.safetyLevel = level;
    const levelConfig = SAFETY_LEVEL_CONFIGS[level];
    this.config.requireApproval = levelConfig.requireApproval ?? true;
    this.config.maxCommandLength = levelConfig.maxCommandLength ?? 2000;
    this.config.timeoutMs = levelConfig.timeoutMs ?? 60000;
  }

  /**
   * Add command to allow list
   */
  addToAllowList(command: string): void {
    if (!this.config.allowList.includes(command)) {
      this.config.allowList.push(command);
    }
  }

  /**
   * Add command to deny list
   */
  addToDenyList(command: string): void {
    if (!this.config.denyList.includes(command)) {
      this.config.denyList.push(command);
    }
  }

  /**
   * Remove command from allow list
   */
  removeFromAllowList(command: string): void {
    this.config.allowList = this.config.allowList.filter(c => c !== command);
  }

  /**
   * Remove command from deny list
   */
  removeFromDenyList(command: string): void {
    this.config.denyList = this.config.denyList.filter(c => c !== command);
  }

  /**
   * Add custom rule
   */
  addCustomRule(rule: CommandRule): void {
    this.config.customRules.push(rule);
  }

  /**
   * Get current configuration
   */
  getConfig(): TerminalSafetyConfig {
    return { ...this.config };
  }

  /**
   * Set configuration
   */
  setConfig(config: Partial<TerminalSafetyConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default TerminalSafetyValidator;
