// ============================================================================
// CryptArtist Studio - Frontend Logging Utility
// Sends all frontend logs to the Rust backend which writes them to 3 files:
//   1. cryptartist-recent.txt      - Last 1000 lines (rolling)
//   2. cryptartist-full-history.txt - Every line ever logged (append-only)
//   3. cryptartist-session.txt      - Last 100 lines since this run started
// ============================================================================

import { invoke } from "@tauri-apps/api/core";

type LogLevel = "debug" | "info" | "warn" | "error" | "frontend";

// Buffer for logs that happen before Tauri is ready
let pendingLogs: { level: LogLevel; source: string; message: string }[] = [];
let tauriReady = false;

function sendLog(level: LogLevel, source: string, message: string) {
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
};
