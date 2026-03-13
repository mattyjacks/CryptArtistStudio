// ===========================================================================
// Improvement 299: Shared Constants & Types Library
// Centralized constants and type definitions for CryptArtist Studio
// ===========================================================================

// ---------------------------------------------------------------------------
// Application Metadata
// ---------------------------------------------------------------------------

export const APP_NAME = "CryptArtist Studio";
export const APP_VERSION = "1.69.420.4";
export const APP_AUTHOR = "Matt";
export const APP_WEBSITE = "https://mattyjacks.com";
export const APP_DONATE = "https://givegigs.com";
export const APP_EMAIL = "Matt@MattyJacks.com";
export const APP_CONTACT = "https://mattyjacks.com/Contact";
export const APP_LOCATION = "New Hampshire, USA";

// ---------------------------------------------------------------------------
// Program IDs and Names
// ---------------------------------------------------------------------------

export const PROGRAMS = {
  MEDIA_MOGUL: "media-mogul",
  VIBECODE_WORKER: "vibecode-worker",
  DEMO_RECORDER: "demo-recorder",
  VALLEY_NET: "valley-net",
  GAME_STUDIO: "game-studio",
  COMMANDER: "commander",
  SETTINGS: "settings",
} as const;

export type ProgramId = typeof PROGRAMS[keyof typeof PROGRAMS];

export const PROGRAM_NAMES: Record<ProgramId, string> = {
  "media-mogul": "Media Mogul",
  "vibecode-worker": "VibeCodeWorker",
  "demo-recorder": "DemoRecorder",
  "valley-net": "ValleyNet",
  "game-studio": "GameStudio",
  "commander": "CryptArt Commander",
  "settings": "Settings",
};

export const PROGRAM_ICONS: Record<ProgramId, string> = {
  "media-mogul": "\u{1F4FA}",
  "vibecode-worker": "\u{1F469}\u{1F3FB}\u200D\u{1F4BB}",
  "demo-recorder": "\u{1F3A5}",
  "valley-net": "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F",
  "game-studio": "\u{1F3AE}",
  "commander": "\u{1F431}",
  "settings": "\u2699\uFE0F",
};

export const PROGRAM_VERSIONS: Record<ProgramId, string> = {
  "media-mogul": "1.69.420.4",
  "vibecode-worker": "1.69.420.4",
  "demo-recorder": "1.69.420.4",
  "valley-net": "1.69.420.4",
  "game-studio": "1.69.420.4",
  "commander": "1.69.420.4",
  "settings": "1.69.420.4",
};

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export const ROUTES = {
  HOME: "/",
  MEDIA_MOGUL: "/media-mogul",
  VIBECODE_WORKER: "/vibecode-worker",
  DEMO_RECORDER: "/demo-recorder",
  VALLEY_NET: "/valley-net",
  GAME_STUDIO: "/game-studio",
  COMMANDER: "/commander",
  SETTINGS: "/settings",
  PRIVACY: "/privacy",
  TERMS: "/terms",
} as const;

// ---------------------------------------------------------------------------
// LocalStorage Keys
// ---------------------------------------------------------------------------

export const STORAGE_KEYS = {
  FAVORITES: "cryptartist_favorites",
  RECENT_PROJECTS: "cryptartist_recent_projects",
  LAUNCH_COUNTS: "cryptartist_launch_counts",
  ACCENT_THEME: "cryptartist_accent",
  API_KEY: "cryptartist_api_key",
  OPENROUTER_MODEL: "cryptartist_openrouter_model",
  KEY_EXPORT_COUNT: "cryptartist_key_export_count",
  COMMANDER_SCRIPTS: "cryptartist_commander_scripts",
  LAST_OPENED: "cryptartist_last_opened",
  EDITOR_SETTINGS: "cryptartist_editor_settings",
  THEME: "cryptartist_theme",
  FONT_FAMILY: "cryptartist_font_family",
  SIDEBAR_WIDTH: "cryptartist_sidebar_width",
  NOTIFICATIONS_ENABLED: "cryptartist_notifications",
} as const;

// ---------------------------------------------------------------------------
// API Providers
// ---------------------------------------------------------------------------

export const API_PROVIDERS = ["openai", "anthropic", "google", "openrouter", "local"] as const;
export type ApiProvider = typeof API_PROVIDERS[number];

export const AI_MODELS: Record<ApiProvider, string[]> = {
  openai: ["gpt-5-mini", "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1", "o1-mini"],
  anthropic: ["claude-3.5-sonnet", "claude-3-opus", "claude-3-haiku"],
  google: ["gemini-pro-1.5", "gemini-2.0-flash-001"],
  openrouter: [
    "openai/gpt-5-mini", "openai/gpt-4o", "openai/gpt-4o-mini", "openai/o1",
    "anthropic/claude-3.5-sonnet", "anthropic/claude-3-opus", "anthropic/claude-3-haiku",
    "google/gemini-pro-1.5", "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.1-405b-instruct", "meta-llama/llama-3.1-70b-instruct",
    "mistralai/mistral-large", "deepseek/deepseek-chat", "deepseek/deepseek-r1",
    "qwen/qwen-2.5-72b-instruct", "cohere/command-r-plus",
  ],
  local: ["llama-3", "mistral", "codellama"],
};

// ---------------------------------------------------------------------------
// OpenRouter Configuration
// ---------------------------------------------------------------------------

export const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
export const OPENROUTER_REFERER = "https://mattyjacks.com";
export const OPENROUTER_TITLE = "CryptArtist Studio";

// ---------------------------------------------------------------------------
// Editor Defaults
// ---------------------------------------------------------------------------

export const EDITOR_DEFAULTS = {
  FONT_SIZE: 14,
  TAB_SIZE: 2,
  WORD_WRAP: true,
  MINIMAP: true,
  THEME: "dark",
  LINE_ENDING: "LF" as "LF" | "CRLF",
  ENCODING: "UTF-8",
  ZOOM: 100,
  AUTO_SAVE: false,
} as const;

// ---------------------------------------------------------------------------
// Media Formats
// ---------------------------------------------------------------------------

export const VIDEO_FORMATS = ["mp4", "webm", "mov", "avi", "mkv"] as const;
export const AUDIO_FORMATS = ["mp3", "wav", "ogg", "flac", "aac"] as const;
export const IMAGE_FORMATS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"] as const;
export const RECORDING_FORMATS = ["webm", "mp4", "gif"] as const;

export type VideoFormat = typeof VIDEO_FORMATS[number];
export type AudioFormat = typeof AUDIO_FORMATS[number];
export type ImageFormat = typeof IMAGE_FORMATS[number];
export type RecordingFormat = typeof RECORDING_FORMATS[number];

// ---------------------------------------------------------------------------
// Resolution Presets
// ---------------------------------------------------------------------------

export const RESOLUTIONS = {
  "4K": { width: 3840, height: 2160, label: "4K Ultra HD" },
  "1080p": { width: 1920, height: 1080, label: "Full HD" },
  "720p": { width: 1280, height: 720, label: "HD" },
  "480p": { width: 640, height: 480, label: "SD" },
  "240p": { width: 320, height: 240, label: "Low" },
} as const;

// ---------------------------------------------------------------------------
// Quality Presets
// ---------------------------------------------------------------------------

export const QUALITY_PRESETS = ["ultra", "high", "medium", "low"] as const;
export type QualityPreset = typeof QUALITY_PRESETS[number];

// ---------------------------------------------------------------------------
// Keyboard Shortcut Definitions
// ---------------------------------------------------------------------------

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  label: string;
  action: string;
}

export const GLOBAL_SHORTCUTS: KeyboardShortcut[] = [
  { key: "s", ctrl: true, label: "Save", action: "save" },
  { key: "z", ctrl: true, label: "Undo", action: "undo" },
  { key: "z", ctrl: true, shift: true, label: "Redo", action: "redo" },
  { key: "f", ctrl: true, label: "Find", action: "find" },
  { key: "h", ctrl: true, label: "Replace", action: "replace" },
  { key: "p", ctrl: true, shift: true, label: "Command Palette", action: "command-palette" },
  { key: "g", ctrl: true, label: "Go to Line", action: "goto-line" },
  { key: ",", ctrl: true, label: "Settings", action: "settings" },
];

// ---------------------------------------------------------------------------
// Color Palettes
// ---------------------------------------------------------------------------

export const ACCENT_COLORS = {
  cyan: "#00d2ff",
  red: "#ff3b3b",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#7b2ff7",
  pink: "#ec4899",
  orange: "#f97316",
  teal: "#14b8a6",
} as const;

export type AccentColor = keyof typeof ACCENT_COLORS;

// ---------------------------------------------------------------------------
// Status Types
// ---------------------------------------------------------------------------

export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";
export type BuildStatus = "idle" | "building" | "success" | "error";
export type RecordingStatus = "idle" | "recording" | "paused" | "stopped";
export type RenderStatus = "idle" | "rendering" | "done" | "error";
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export type Severity = "info" | "warning" | "error" | "success";
export type Priority = "low" | "normal" | "high" | "urgent";

// ---------------------------------------------------------------------------
// File Type Associations
// ---------------------------------------------------------------------------

export const FILE_ICONS: Record<string, string> = {
  ts: "\u{1F4D8}",
  tsx: "\u269B\uFE0F",
  js: "\u{1F4D9}",
  jsx: "\u269B\uFE0F",
  css: "\u{1F3A8}",
  html: "\u{1F310}",
  json: "\u{1F4CB}",
  md: "\u{1F4DD}",
  py: "\u{1F40D}",
  rs: "\u{1F980}",
  go: "\u{1F439}",
  toml: "\u2699\uFE0F",
  yaml: "\u2699\uFE0F",
  yml: "\u2699\uFE0F",
  sh: "\u{1F4BB}",
  sql: "\u{1F5C4}\uFE0F",
  svg: "\u{1F58C}\uFE0F",
  png: "\u{1F5BC}\uFE0F",
  jpg: "\u{1F5BC}\uFE0F",
  gif: "\u{1F5BC}\uFE0F",
  mp4: "\u{1F3AC}",
  mp3: "\u{1F3B5}",
  gd: "\u{1F3AE}",
  txt: "\u{1F4C4}",
};

// ---------------------------------------------------------------------------
// Build Target Platforms
// ---------------------------------------------------------------------------

export const BUILD_TARGETS = ["windows", "linux", "macos", "web", "android"] as const;
export type BuildTarget = typeof BUILD_TARGETS[number];

// ---------------------------------------------------------------------------
// Game Genres
// ---------------------------------------------------------------------------

export const GAME_GENRES = [
  "platformer", "rpg", "puzzle", "shooter", "strategy",
  "adventure", "simulation", "racing", "fighting", "sandbox",
] as const;
export type GameGenre = typeof GAME_GENRES[number];

// ---------------------------------------------------------------------------
// Timing Constants
// ---------------------------------------------------------------------------

export const DEBOUNCE_MS = 300;
export const THROTTLE_MS = 100;
export const AUTO_SAVE_INTERVAL_MS = 30000;
export const TIP_ROTATION_MS = 8000;
export const CLOCK_UPDATE_MS = 1000;
export const TOAST_DURATION_MS = 3000;

// ---------------------------------------------------------------------------
// Size Limits
// ---------------------------------------------------------------------------

export const MAX_FILE_SIZE_MB = 50;
export const MAX_RECENT_PROJECTS = 10;
export const MAX_TERMINAL_LINES = 500;
export const MAX_AI_MESSAGES = 200;
export const MAX_UNDO_HISTORY = 50;
export const MAX_BOOKMARKS = 100;
