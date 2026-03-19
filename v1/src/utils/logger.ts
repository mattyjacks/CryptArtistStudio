// ============================================================================
// CryptArtist Studio - Frontend Logging Utility
// Sends all frontend logs to the Rust backend which writes them to 3 files:
//   1. cryptartist-recent.txt      - Last 1000 lines (rolling)
//   2. cryptartist-full-history.txt - Every line ever logged (append-only)
//   3. cryptartist-session.txt      - Last 100 lines since this run started
// ============================================================================

import { invoke } from "@tauri-apps/api/core";

type LogLevel = "debug" | "info" | "warn" | "error" | "frontend";

// Imp 69: Log level filtering
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, frontend: 1, warn: 2, error: 3 };
let minLogLevel: LogLevel = "debug";

// Imp 70: Log count tracking
let logCounts: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0, frontend: 0 };

// Imp 71: Breadcrumb trail (last N actions for debugging)
const MAX_BREADCRUMBS = 50;
let breadcrumbs: { time: number; source: string; message: string }[] = [];

// Imp 72: Performance timing map
const perfTimers: Map<string, number> = new Map();

// Buffer for logs that happen before Tauri is ready
let pendingLogs: { level: LogLevel; source: string; message: string }[] = [];
let tauriReady = false;

// Imp 73: Safe stringify for log arguments
function safeStringify(val: unknown): string {
  if (typeof val === "string") return val;
  try { return JSON.stringify(val).slice(0, 2000); } catch { return String(val); }
}

function sendLog(level: LogLevel, source: string, message: string) {
  // Imp 69: Filter by min log level
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[minLogLevel]) return;
  // Imp 70: Track counts
  logCounts[level] = (logCounts[level] || 0) + 1;
  // Imp 71: Add breadcrumb
  breadcrumbs.push({ time: Date.now(), source, message: message.slice(0, 200) });
  if (breadcrumbs.length > MAX_BREADCRUMBS) breadcrumbs.shift();

  if (!tauriReady) {
    pendingLogs.push({ level, source, message });
    return;
  }
  invoke("log_from_frontend", { level, source, message }).catch(() => {
    // If invoke fails, fall back to console only (Tauri not available, e.g. browser dev)
  });
}

function flushPending() {
  tauriReady = true;
  for (const entry of pendingLogs) {
    sendLog(entry.level, entry.source, entry.message);
  }
  pendingLogs = [];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const logger = {
  /** Initialize the frontend logger - call once at app startup */
  init() {
    flushPending();
    sendLog("info", "frontend", "Frontend logger initialized");

    // Intercept console.error and console.warn globally
    const origError = console.error;
    const origWarn = console.warn;

    console.error = (...args: unknown[]) => {
      origError.apply(console, args);
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      sendLog("error", "console.error", msg);
    };

    console.warn = (...args: unknown[]) => {
      origWarn.apply(console, args);
      const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
      sendLog("warn", "console.warn", msg);
    };

    // Catch unhandled errors
    window.addEventListener("error", (event) => {
      sendLog(
        "error",
        "window.onerror",
        `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`
      );
    });

    // Catch unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      const reason =
        event.reason instanceof Error
          ? `${event.reason.message}\n${event.reason.stack}`
          : String(event.reason);
      sendLog("error", "unhandledrejection", reason);
    });
  },

  debug(source: string, message: string) {
    sendLog("debug", source, message);
  },

  info(source: string, message: string) {
    sendLog("info", source, message);
  },

  warn(source: string, message: string) {
    sendLog("warn", source, message);
  },

  error(source: string, message: string) {
    sendLog("error", source, message);
  },

  /** Log a user action (navigation, button click, etc.) */
  action(source: string, action: string) {
    sendLog("info", source, `[ACTION] ${action}`);
  },

  /** Log a program launch */
  programLaunch(programId: string) {
    sendLog("info", "navigation", `Launched program: ${programId}`);
  },

  /** Log a file operation */
  fileOp(op: string, path: string) {
    sendLog("info", "file-op", `${op}: ${path}`);
  },

  /** Log an AI interaction */
  aiRequest(program: string, promptLength: number) {
    sendLog("info", program, `AI request (${promptLength} chars)`);
  },

  aiResponse(program: string, responseLength: number) {
    sendLog("info", program, `AI response (${responseLength} chars)`);
  },

  // Imp 74: Pet-specific logging
  petAction(action: string, details?: string) {
    sendLog("info", "virtual-pet", `[PET] ${action}${details ? " - " + details : ""}`);
  },

  // Imp 75: Security event logging
  securityEvent(event: string, details?: string) {
    sendLog("warn", "security", `[SECURITY] ${event}${details ? " - " + details : ""}`);
  },

  // Imp 76: Performance timing - start
  timeStart(label: string) {
    perfTimers.set(label, performance.now());
  },

  // Imp 77: Performance timing - end and log
  timeEnd(label: string) {
    const start = perfTimers.get(label);
    if (start !== undefined) {
      const elapsed = performance.now() - start;
      perfTimers.delete(label);
      sendLog("debug", "perf", `[TIMING] ${label}: ${elapsed.toFixed(2)}ms`);
      return elapsed;
    }
    return 0;
  },

  // Imp 78: Get breadcrumb trail for debugging
  getBreadcrumbs() {
    return [...breadcrumbs];
  },

  // Imp 79: Get log counts
  getLogCounts() {
    return { ...logCounts };
  },

  // Imp 80: Set minimum log level
  setMinLevel(level: LogLevel) {
    minLogLevel = level;
  },

  // Imp 81: Log with structured metadata
  meta(source: string, message: string, metadata: Record<string, unknown>) {
    sendLog("info", source, `${message} | ${safeStringify(metadata)}`);
  },

  /** Read session logs (last 100 since run) */
  async getSessionLogs(): Promise<string[]> {
    try {
      return await invoke<string[]>("get_log_session");
    } catch {
      return [];
    }
  },

  /** Read recent logs (last 1000) */
  async getRecentLogs(): Promise<string[]> {
    try {
      return await invoke<string[]>("get_log_recent");
    } catch {
      return [];
    }
  },

  /** Get paths to all 3 log files */
  async getLogPaths(): Promise<{
    recent: string;
    full_history: string;
    session: string;
  } | null> {
    try {
      return await invoke("get_log_paths");
    } catch {
      return null;
    }
  },

  // Imp 82: Log a group of related messages
  group(source: string, label: string, messages: string[]) {
    sendLog("info", source, `[GROUP:${label}] ${messages.length} entries`);
    for (const msg of messages.slice(0, 20)) {
      sendLog("debug", source, `  ${msg}`);
    }
  },

  // Imp 83: Clear breadcrumbs
  clearBreadcrumbs() {
    breadcrumbs = [];
  },
};
