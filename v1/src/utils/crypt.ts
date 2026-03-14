// ============================================================================
// CryptArtist Crypt (.Crypt) Collection File Format
// ============================================================================
//
// A .Crypt file is a ZIP archive containing multiple .CryptArt files,
// shared assets, documentation, AI prompts, logs, and more.
//
// Design goals (mirrors .CryptArt philosophy):
//   1. NEVER needs a format upgrade - the envelope is stable forever.
//   2. Any .Crypt file ever created will always be readable.
//   3. New folders/fields are added WITHOUT breaking old files.
//   4. Self-identifying via "$crypt" magic key in Memorial.txt.
//   5. Readers MUST ignore unknown folders and unknown manifest fields.
//   6. Writers MUST NOT remove or rename existing folders.
//   7. All folders are optional except Skeleton/ and Memorial.txt.
//
// Internal structure (all folders, no nested ZIPs):
//   Memorial.txt   - JSON manifest (version, author, metadata)
//   Skeleton/      - Main .CryptArt project files ("Bones")
//   Grave/         - Shared assets: images, audio, fonts ("Flesh")
//   Urn/           - Backups & version history ("Ashes")
//   Epitaph/       - Documentation: README, CHANGELOG, LICENSE
//   Vault/         - Encrypted secrets: API keys, credentials
//   Catacombs/     - Nested .Crypt files (sub-projects)
//   Reliquary/     - Curated collections: favorites, templates
//   Soul/          - AI prompts & outputs ("Brain")
//   LastWords/     - Log files: build, operations, errors, activity
//   Pyramid/       - Self-running bootstrap: Mummy agent + Curse traces
//
// Forward compatibility:
//   - Readers MUST ignore unknown top-level folders.
//   - Readers MUST ignore unknown Memorial.txt fields.
//   - Writers MUST preserve unknown folders when re-saving.
//   - $crypt version only increments on breaking changes (expect: never).
//
// ============================================================================

import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CRYPT_FORMAT_VERSION = 1 as const;
export const CRYPT_EXTENSION = ".Crypt";
export const MEMORIAL_FILENAME = "Memorial.txt";
export const CRYPT_MIME_TYPE = "application/x-cryptartist-crypt";
export const MAX_CRYPT_NAME_LENGTH = 128;
export const MAX_DESCRIPTION_LENGTH = 2048;
export const MAX_ENTRIES_PER_FOLDER = 10000;
export const MAX_CRYPT_SIZE_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB
export const PYRAMID_FILES = ["Mummy.bat", "Mummy.ps1", "Mummy.sh", "Mummy.json"] as const;
export const SUPPORTED_PLATFORMS = ["windows", "macos", "linux"] as const;
export type CurseLocation = "desktop" | "documents" | "temp";
export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

export const KNOWN_FOLDERS = [
  "Skeleton",
  "Grave",
  "Urn",
  "Epitaph",
  "Vault",
  "Catacombs",
  "Reliquary",
  "Soul",
  "LastWords",
  "Pyramid",
] as const;

export type CryptFolderName = (typeof KNOWN_FOLDERS)[number];

// ---------------------------------------------------------------------------
// Save Dialog - Anatomical terms for each component
// ---------------------------------------------------------------------------

export interface CryptComponent {
  /** Internal folder name */
  folder: CryptFolderName;
  /** Fun anatomical display name */
  displayName: string;
  /** Emoji icon */
  emoji: string;
  /** Short description */
  description: string;
  /** Whether this component is required (cannot be unchecked) */
  required: boolean;
}

export const CRYPT_COMPONENTS: CryptComponent[] = [
  { folder: "Skeleton",  displayName: "Bones",     emoji: "\uD83E\uDDB4", description: "The skeletal structure - all .CryptArt project files", required: true },
  { folder: "Grave",     displayName: "Flesh",     emoji: "\uD83E\uDDEC", description: "The body - shared assets (images, audio, fonts, brushes)", required: false },
  { folder: "Urn",       displayName: "Ashes",     emoji: "\uD83D\uDD25", description: "The remains - backups, versions, exports, history", required: false },
  { folder: "Soul",      displayName: "Brain",     emoji: "\uD83E\uDDE0", description: "The mind - AI prompts, outputs, context, training data", required: false },
  { folder: "Epitaph",   displayName: "Epitaph",   emoji: "\uD83D\uDCDC", description: "The inscription - documentation, README, CHANGELOG, LICENSE", required: false },
  { folder: "Vault",     displayName: "Vault",     emoji: "\uD83D\uDD10", description: "The treasure - encrypted secrets, API keys, credentials", required: false },
  { folder: "Catacombs", displayName: "Catacombs", emoji: "\uD83C\uDFDB\uFE0F", description: "The chambers - nested .Crypt files, sub-projects", required: false },
  { folder: "Reliquary", displayName: "Reliquary", emoji: "\uD83D\uDC8E", description: "The relics - curated collections, favorites, templates", required: false },
  { folder: "LastWords", displayName: "LastWords", emoji: "\uD83D\uDCDD", description: "The record - all logs (build, operations, errors, activity)", required: false },
  { folder: "Pyramid",   displayName: "Mummy",     emoji: "\uD83C\uDFDB\uFE0F", description: "The guardian - self-running bootstrap agent that downloads CryptArtist & launches this .Crypt", required: false },
];

// ---------------------------------------------------------------------------
// Manifest (Memorial.txt) types
// ---------------------------------------------------------------------------

export interface CryptManifestContentsEntry {
  description?: string;
  count?: number;
  [key: string]: unknown;
}

export interface CryptManifest {
  /** Format version - always 1. Only increment on breaking change (never). */
  $crypt: number;
  /** Content version (user-defined, semver recommended) */
  version: string;
  /** Human-readable name */
  name: string;
  /** Description of this crypt */
  description?: string;
  /** Author name */
  author?: string;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** ISO-8601 last-updated timestamp */
  updatedAt: string;
  /** App version that created this crypt */
  appVersion?: string;
  /** License identifier */
  license?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Metadata about the crypt */
  metadata?: Record<string, unknown>;
  /** Contents summary for each folder */
  contents?: Record<string, CryptManifestContentsEntry>;
  /** Compatibility info */
  compatibility?: {
    minAppVersion?: string;
    platforms?: string[];
    [key: string]: unknown;
  };
  /** Forward-compat: allow any extra fields */
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// CryptFile - In-memory representation of an opened .Crypt
// ---------------------------------------------------------------------------

export interface CryptFolderEntry {
  /** Relative path within the folder (e.g., "project-1.CryptArt") */
  path: string;
  /** File size in bytes */
  size: number;
  /** Whether this is a directory */
  isDirectory: boolean;
}

export interface CryptFile {
  /** The parsed manifest from Memorial.txt */
  manifest: CryptManifest;
  /** Absolute path to the .Crypt file on disk (null if unsaved) */
  filePath: string | null;
  /** Contents of each known folder */
  folders: Partial<Record<CryptFolderName, CryptFolderEntry[]>>;
  /** Names of unknown folders (from newer versions) */
  unknownFolders: string[];
  /** Total size in bytes */
  totalSize: number;
}

// ---------------------------------------------------------------------------
// Create a new manifest
// ---------------------------------------------------------------------------

export function createManifest(
  name: string,
  options?: {
    description?: string;
    author?: string;
    license?: string;
    tags?: string[];
  }
): CryptManifest {
  const now = new Date().toISOString();
  return {
    $crypt: CRYPT_FORMAT_VERSION,
    version: "1.0.0",
    name,
    description: options?.description || "",
    author: options?.author || "",
    createdAt: now,
    updatedAt: now,
    appVersion: "1.69.420",
    license: options?.license || "",
    tags: options?.tags || [],
    metadata: {
      totalProjects: 0,
      totalAssets: 0,
      compressionLevel: 6,
      encrypted: false,
    },
    contents: {},
    compatibility: {
      minAppVersion: "1.69.420",
      platforms: ["windows", "macos", "linux"],
    },
  };
}

// ---------------------------------------------------------------------------
// Serialize manifest to JSON string
// ---------------------------------------------------------------------------

export function serializeManifest(manifest: CryptManifest): string {
  const updated: CryptManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
  };
  // Put $crypt first for human readability
  const { $crypt, version, name, ...rest } = updated;
  const ordered: Record<string, unknown> = { $crypt, version, name, ...rest };
  return JSON.stringify(ordered, null, 2);
}

// ---------------------------------------------------------------------------
// Parse manifest from JSON string (version-tolerant)
// ---------------------------------------------------------------------------

export function parseManifest(json: string): CryptManifest {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error(`Invalid Memorial.txt: malformed JSON. ${e instanceof Error ? e.message : String(e)}`);
  }

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid Memorial.txt: root must be a JSON object.");
  }

  // Version tolerance: warn but don't fail on future versions
  if (typeof raw.$crypt === "number" && raw.$crypt > CRYPT_FORMAT_VERSION) {
    logger.warn("crypt", `Future .Crypt format version ${raw.$crypt}, attempting v1 parser`);
  }

  // If $crypt is missing, assume v1 (graceful degradation)
  if (raw.$crypt === undefined) {
    raw.$crypt = CRYPT_FORMAT_VERSION;
  }

  // Validate minimum fields
  if (typeof raw.$crypt !== "number" || raw.$crypt < 1) {
    throw new Error("Invalid Memorial.txt: '$crypt' must be a positive number.");
  }

  // Ensure required fields have sensible defaults
  if (!raw.name || typeof raw.name !== "string") {
    raw.name = "Unnamed Crypt";
  }
  if (!raw.version || typeof raw.version !== "string") {
    raw.version = "1.0.0";
  }
  if (!raw.createdAt || typeof raw.createdAt !== "string") {
    raw.createdAt = new Date().toISOString();
  }
  if (!raw.updatedAt || typeof raw.updatedAt !== "string") {
    raw.updatedAt = new Date().toISOString();
  }

  return raw as unknown as CryptManifest;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Error class for Crypt operations
// ---------------------------------------------------------------------------

export class CryptError extends Error {
  constructor(
    message: string,
    public readonly code: CryptErrorCode,
    public readonly details?: string,
  ) {
    super(message);
    this.name = "CryptError";
  }
}

export type CryptErrorCode =
  | "INVALID_FORMAT"
  | "MISSING_MEMORIAL"
  | "MISSING_SKELETON"
  | "INVALID_MANIFEST"
  | "CORRUPT_ARCHIVE"
  | "SIZE_EXCEEDED"
  | "NAME_TOO_LONG"
  | "WRITE_FAILED"
  | "READ_FAILED"
  | "ENTRY_NOT_FOUND"
  | "UNKNOWN";

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function isValidCryptName(name: string): { valid: boolean; reason?: string } {
  if (!name || name.trim().length === 0) return { valid: false, reason: "Name cannot be empty" };
  if (name.length > MAX_CRYPT_NAME_LENGTH) return { valid: false, reason: `Name exceeds ${MAX_CRYPT_NAME_LENGTH} characters` };
  if (/[<>:"\/|?*\x00-\x1f]/g.test(name)) return { valid: false, reason: "Name contains invalid characters" };
  return { valid: true };
}

export function sanitizeCryptName(name: string): string {
  return name
    .replace(/[<>:"\/|?*\x00-\x1f]/g, "_")
    .trim()
    .slice(0, MAX_CRYPT_NAME_LENGTH) || "Unnamed";
}

export function validateManifestFields(manifest: CryptManifest): string[] {
  const warnings: string[] = [];
  if (!manifest.name) warnings.push("Missing name");
  if (!manifest.author) warnings.push("Missing author");
  if (!manifest.createdAt) warnings.push("Missing creation date");
  if (manifest.$crypt > CRYPT_FORMAT_VERSION) warnings.push(`Future format version: ${manifest.$crypt}`);
  if (manifest.description && manifest.description.length > MAX_DESCRIPTION_LENGTH) warnings.push("Description too long");
  if (manifest.tags && manifest.tags.length > 50) warnings.push("Too many tags (max 50)");
  return warnings;
}

export function validateCurseConfig(curse: CurseConfig): string[] {
  const warnings: string[] = [];
  if (!curse.filename) warnings.push("Missing curse filename");
  if (curse.filename && /[<>:"\/|?*]/g.test(curse.filename)) warnings.push("Curse filename has invalid characters");
  if (!curse.message) warnings.push("Missing curse message");
  if (!["desktop", "documents", "temp"].includes(curse.location)) warnings.push(`Invalid curse location: ${curse.location}`);
  return warnings;
}

export function validateMummyConfig(config: MummyConfig): string[] {
  const warnings: string[] = [];
  if (!config.downloadUrl) warnings.push("Missing download URL");
  if (config.mummyMode) {
    if (config.mummyMode.restartDelayMs < 500) warnings.push("restartDelayMs too low (min 500)");
    if (config.mummyMode.healthCheckMs < 1000) warnings.push("healthCheckMs too low (min 1000)");
    if (config.mummyMode.maxConsecutiveRestarts < 1) warnings.push("maxConsecutiveRestarts must be >= 1");
  }
  if (config.curse) warnings.push(...validateCurseConfig(config.curse));
  return warnings;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isCryptPath(path: string): boolean {
  return /\.crypt$/i.test(path);
}

export function getCryptDisplayName(manifest: CryptManifest): string {
  return manifest.name || "Unnamed Crypt";
}

export function formatBytes(bytes: number): string {
  if (bytes < 0) return "0 B";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function getCryptAge(manifest: CryptManifest): string {
  const created = new Date(manifest.createdAt).getTime();
  if (isNaN(created)) return "Unknown age";
  const age = Date.now() - created;
  if (age < 86400000) return "Created today";
  const days = Math.floor(age / 86400000);
  if (days === 1) return "1 day old";
  if (days < 30) return `${days} days old`;
  if (days < 365) return `${Math.floor(days / 30)} months old`;
  return `${Math.floor(days / 365)} years old`;
}

export function getCryptSummary(manifest: CryptManifest, entryCount: number, totalBytes: number): string {
  const parts: string[] = [];
  parts.push(`"${getCryptDisplayName(manifest)}"`);
  parts.push(`v${manifest.version}`);
  if (manifest.author) parts.push(`by ${manifest.author}`);
  parts.push(`${entryCount} entries`);
  parts.push(formatBytes(totalBytes));
  parts.push(getCryptAge(manifest));
  return parts.join(" - ");
}

export function getFileTypeIcon(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "cryptart": return "\uD83C\uDFA8"; // palette
    case "json": return "\uD83D\uDCCB"; // clipboard
    case "txt": case "md": return "\uD83D\uDCC4"; // page
    case "png": case "jpg": case "jpeg": case "gif": case "webp": case "svg": return "\uD83D\uDDBC\uFE0F"; // frame
    case "mp3": case "wav": case "ogg": case "flac": return "\uD83C\uDFB5"; // music
    case "mp4": case "webm": case "mov": case "avi": return "\uD83C\uDFAC"; // clapper
    case "bat": case "ps1": case "sh": case "bash": return "\u2699\uFE0F"; // gear
    case "crypt": return "\u26B0\uFE0F"; // crypt
    case "zip": case "tar": case "gz": case "7z": case "rar": return "\uD83D\uDCE6"; // package
    case "log": return "\uD83D\uDCDD"; // memo
    case "html": case "htm": return "\uD83C\uDF10"; // globe
    case "css": case "scss": case "sass": case "less": return "\uD83C\uDFA8"; // palette
    case "ts": case "tsx": case "js": case "jsx": case "mjs": return "\uD83D\uDCDC"; // scroll
    case "py": return "\uD83D\uDC0D"; // snake
    case "rs": return "\u2699\uFE0F"; // gear
    case "toml": case "yaml": case "yml": case "ini": case "cfg": case "conf": return "\u2699\uFE0F"; // gear
    case "go": case "java": case "c": case "cpp": case "h": case "hpp": return "\uD83D\uDCBB"; // computer
    case "xml": case "xsl": return "\uD83D\uDCC3"; // page with curl
    case "pdf": return "\uD83D\uDCD5"; // book
    case "exe": case "msi": case "dmg": case "deb": case "rpm": return "\uD83D\uDCE5"; // inbox
    case "ttf": case "otf": case "woff": case "woff2": return "\uD83D\uDD24"; // abc
    default: return "\uD83D\uDCC4"; // page
  }
}

export function getCompressionRatio(originalSize: number, compressedSize: number): string {
  if (originalSize === 0) return "N/A";
  const ratio = ((1 - compressedSize / originalSize) * 100);
  return `${ratio.toFixed(1)}% smaller`;
}

export function estimateSaveTime(totalBytes: number): string {
  // Rough estimate: ~50MB/s write speed
  const seconds = totalBytes / (50 * 1024 * 1024);
  if (seconds < 1) return "Less than a second";
  return `About ${Math.ceil(seconds)} second${Math.ceil(seconds) !== 1 ? "s" : ""}`;
}

export function parseMummyConfig(json: string): MummyConfig | null {
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed === "object" && parsed !== null) return parsed as MummyConfig;
    return null;
  } catch {
    return null;
  }
}

export function mergeMummyConfigs(base: MummyConfig, overrides: Partial<MummyConfig>): MummyConfig {
  return {
    ...base,
    ...overrides,
    preconfigs: { ...base.preconfigs, ...overrides.preconfigs },
    mummyMode: overrides.mummyMode ? { ...base.mummyMode!, ...overrides.mummyMode } : base.mummyMode,
    curse: overrides.curse ? { ...base.curse!, ...overrides.curse } : base.curse,
  };
}

export function countCryptArtFiles(entries: Array<{ name: string; is_dir: boolean }>): number {
  return entries.filter((e) => !e.is_dir && /\.cryptart$/i.test(e.name)).length;
}

export function getFolderEntryCount(entries: Array<{ name: string }>, folder: string): number {
  return entries.filter((e) => e.name.startsWith(folder + "/")).length;
}

export function getSkeletonProjectCount(entries: Array<{ name: string; is_dir: boolean }>): number {
  return entries.filter((e) => !e.is_dir && e.name.startsWith("Skeleton/") && /\.cryptart$/i.test(e.name)).length;
}

export function isMummyPopulated(entries: Array<{ name: string }>): boolean {
  return PYRAMID_FILES.some((pf) => entries.some((e) => e.name === `Pyramid/${pf}`));
}

export function getEntryFolder(entryPath: string): string | null {
  const slash = entryPath.indexOf("/");
  if (slash < 0) return null;
  return entryPath.slice(0, slash);
}

export function validateEntryPath(path: string): { valid: boolean; reason?: string } {
  if (!path || path.trim().length === 0) return { valid: false, reason: "Path cannot be empty" };
  if (path.includes("..")) return { valid: false, reason: "Path traversal (..) not allowed" };
  if (path.startsWith("/") || path.startsWith("\\")) return { valid: false, reason: "Absolute paths not allowed" };
  if (/[\x00-\x1f]/.test(path)) return { valid: false, reason: "Path contains control characters" };
  return { valid: true };
}

export function folderHasContent(entries: Array<{ name: string; is_dir: boolean }>, folder: string): boolean {
  return entries.some((e) => !e.is_dir && e.name.startsWith(folder + "/"));
}

export const FOLDER_DESCRIPTIONS: Record<string, string> = {
  Skeleton: "Main .CryptArt project files - the bones of the crypt",
  Grave: "Shared assets - images, audio, fonts, brushes, textures",
  Urn: "Backups and version history - previous versions, exports, snapshots",
  Epitaph: "Documentation - README, CHANGELOG, LICENSE, guides",
  Vault: "Encrypted secrets - API keys, credentials, sensitive config",
  Catacombs: "Nested .Crypt files - sub-projects and hierarchical collections",
  Reliquary: "Curated collections - favorites, templates, presets",
  Soul: "AI prompts and outputs - context, training data, responses",
  LastWords: "Log files - build, operations, errors, activity history",
  Pyramid: "Self-running bootstrap - Mummy agent scripts and configuration",
};

// ---------------------------------------------------------------------------
// Pyramid/Mummy - Self-running bootstrap agent
// ---------------------------------------------------------------------------
//
// The Pyramid/ folder contains:
//   Mummy.bat      - Windows double-click launcher (calls Mummy.ps1)
//   Mummy.ps1      - PowerShell bootstrap: downloads CryptArtist, launches .Crypt
//   Mummy.sh       - Linux/macOS bash bootstrap
//   Mummy.json     - Configuration: download URL, curse settings, preconfigs
//   Curse/         - Curse templates (txt files left on host after running)
//
// How it works:
//   1. User has only a .Crypt file on a new computer
//   2. They rename to .zip (or use any ZIP extractor) and open it
//   3. They navigate to Pyramid/ and double-click Mummy.bat (or run Mummy.sh)
//   4. The Mummy detects the OS, downloads CryptArtist Studio from GitHub
//   5. Installs/extracts the app, then launches it with this .Crypt file
//   6. Optionally leaves a "Curse" .txt file on the host computer
//
// Curses:
//   A Curse is a trace file (.txt) left on the host computer after the Mummy
//   runs. It's like an ancient Egyptian curse that haunts whoever opens the
//   tomb. The curse file contains:
//     - Timestamp of when the .Crypt was opened
//     - Name and author of the .Crypt
//     - A custom message from the creator (optional)
//     - System fingerprint (OS, hostname)
//     - The curse can be benign (just a fun message) or functional
//       (e.g., a reminder, a watermark, a license notice)
//   Curse files are placed on the user's Desktop by default.
//   The user is ALWAYS notified before a curse is placed.
// ---------------------------------------------------------------------------

export interface MummyConfig {
  /** Download URL for CryptArtist Studio */
  downloadUrl: string;
  /** Specific version to download ("latest" for newest) */
  version: string;
  /** Whether to auto-launch after download */
  autoLaunch: boolean;
  /** Pre-configurations to apply on first launch */
  preconfigs?: {
    /** API keys to pre-load (encrypted) */
    apiKeys?: Record<string, string>;
    /** Theme to apply */
    theme?: string;
    /** Default program to open */
    defaultProgram?: string;
    /** Settings overrides */
    settings?: Record<string, unknown>;
    /** Forward-compat */
    [key: string]: unknown;
  };
  /** Mummy resilient runner mode - "Awaken the Mummy" */
  mummyMode?: MummyRunnerConfig;
  /** Curse configuration */
  curse?: CurseConfig;
  /** Forward-compat */
  [key: string]: unknown;
}

export interface MummyRunnerConfig {
  /** Program to launch when awakened (default: "valley-net") */
  program: string;
  /** Auto-restart on error (default: true) */
  autoRestart: boolean;
  /** Delay in ms before restarting after an error (default: 3000) */
  restartDelayMs: number;
  /** Max consecutive restarts before pausing (default: 10) */
  maxConsecutiveRestarts: number;
  /** Pause duration in ms after hitting max restarts (default: 30000) */
  pauseDurationMs: number;
  /** Health check interval in ms (default: 5000) */
  healthCheckMs: number;
  /** Forward-compat */
  [key: string]: unknown;
}

export interface CurseConfig {
  /** Whether to leave a curse file on the host */
  enabled: boolean;
  /** Custom message in the curse file */
  message: string;
  /** Where to place the curse ("desktop", "documents", "temp") */
  location: "desktop" | "documents" | "temp";
  /** Filename for the curse (without .txt extension) */
  filename: string;
  /** Whether to ask the user before placing the curse */
  askFirst: boolean;
  /** Forward-compat */
  [key: string]: unknown;
}

export const DEFAULT_MUMMY_RUNNER: MummyRunnerConfig = {
  program: "valley-net",
  autoRestart: true,
  restartDelayMs: 3000,
  maxConsecutiveRestarts: 10,
  pauseDurationMs: 30000,
  healthCheckMs: 5000,
};

export const DEFAULT_MUMMY_CONFIG: MummyConfig = {
  downloadUrl: "https://github.com/mattyjacks/CryptArtistStudio/tree/main/download",
  version: "latest",
  autoLaunch: true,
  preconfigs: {
    defaultProgram: "valley-net",
  },
  mummyMode: { ...DEFAULT_MUMMY_RUNNER },
  curse: {
    enabled: true,
    message: "You have been visited by a CryptArtist Crypt. The creator left this message for you.",
    location: "desktop",
    filename: "CryptArtist_Curse",
    askFirst: true,
  },
};

export function createMummyConfig(cryptName: string, author: string, curseMessage?: string): MummyConfig {
  return {
    ...DEFAULT_MUMMY_CONFIG,
    curse: {
      ...DEFAULT_MUMMY_CONFIG.curse!,
      filename: `CryptArtist_Curse_${cryptName.replace(/[^a-zA-Z0-9_-]/g, "_")}`,
      message: curseMessage || `This computer has been blessed by the Crypt "${cryptName}" by ${author || "Unknown"}. The Mummy has risen.`,
    },
  };
}

export function serializeMummyConfig(config: MummyConfig): string {
  return JSON.stringify(config, null, 2);
}

// ---------------------------------------------------------------------------
// Mummy bootstrap script templates
// These are embedded in every .Crypt that includes Pyramid/
// ---------------------------------------------------------------------------

export function generateMummyBat(cryptFileName: string): string {
  return `@echo off
REM =========================================================================
REM  CryptArtist Mummy - Self-Running Bootstrap Agent
REM  Crypt: ${cryptFileName}
REM  This script downloads CryptArtist Studio and opens this .Crypt file.
REM  Just double-click this file on any Windows computer!
REM =========================================================================
title CryptArtist Mummy - Awakening...
set "MUMMY_VERSION=1.1.0"
echo.
echo   ==============================================
echo    CryptArtist Mummy v%MUMMY_VERSION%
echo    The Guardian Awakens
echo   ==============================================
echo.
echo   Crypt: ${cryptFileName}
echo   Time:  %DATE% %TIME%
echo.
echo   This .Crypt file contains a self-running agent.
echo   It will download CryptArtist Studio and open
echo   your project automatically in ValleyNet.
echo   The Mummy runs forever, restarting on errors.
echo.

REM Setup logging
set "SCRIPT_DIR=%~dp0"
set "LOG_FILE=%SCRIPT_DIR%Mummy.log"
echo [%DATE% %TIME%] Mummy awakening for ${cryptFileName} >> "%LOG_FILE%"
echo [%DATE% %TIME%] Windows version: %OS% >> "%LOG_FILE%"

REM Check disk space (need at least 500MB free)
for /f "tokens=3" %%a in ('dir %LOCALAPPDATA% /-c ^| findstr /c:"bytes free"') do set FREE_BYTES=%%a
echo   [*] Checking system requirements...

REM Find the .Crypt file (go up from Pyramid/ to the extracted root)
set "CRYPT_ROOT=%SCRIPT_DIR%..\\"
set "CRYPT_FILE="

REM Check if we're inside an extracted ZIP or next to the .Crypt
if exist "%CRYPT_ROOT%Memorial.txt" (
    echo   [OK] Found extracted .Crypt contents
    echo [%DATE% %TIME%] Found extracted .Crypt contents >> "%LOG_FILE%"
) else (
    echo   [*] Looking for .Crypt file...
    for %%f in ("%SCRIPT_DIR%..\\*.Crypt") do set "CRYPT_FILE=%%f"
    for %%f in ("%SCRIPT_DIR%..\\*.crypt") do set "CRYPT_FILE=%%f"
    if defined CRYPT_FILE (
        echo   [OK] Found .Crypt file: %CRYPT_FILE%
        echo [%DATE% %TIME%] Found .Crypt file: %CRYPT_FILE% >> "%LOG_FILE%"
    )
)

REM Check if CryptArtist Studio is installed (check multiple locations)
set "APP_PATH="
set "RETRY_COUNT=0"
:FIND_APP
if exist "%LOCALAPPDATA%\\CryptArtist Studio\\CryptArtist Studio.exe" (
    set "APP_PATH=%LOCALAPPDATA%\\CryptArtist Studio\\CryptArtist Studio.exe"
    echo   [OK] CryptArtist Studio found!
    echo [%DATE% %TIME%] App found at LOCALAPPDATA >> "%LOG_FILE%"
) else if exist "%PROGRAMFILES%\\CryptArtist Studio\\CryptArtist Studio.exe" (
    set "APP_PATH=%PROGRAMFILES%\\CryptArtist Studio\\CryptArtist Studio.exe"
    echo   [OK] CryptArtist Studio found!
    echo [%DATE% %TIME%] App found at PROGRAMFILES >> "%LOG_FILE%"
) else if exist "%USERPROFILE%\\AppData\\Local\\Programs\\CryptArtist Studio\\CryptArtist Studio.exe" (
    set "APP_PATH=%USERPROFILE%\\AppData\\Local\\Programs\\CryptArtist Studio\\CryptArtist Studio.exe"
    echo   [OK] CryptArtist Studio found!
    echo [%DATE% %TIME%] App found at Programs >> "%LOG_FILE%"
) else (
    echo   [!!] CryptArtist Studio not found. Downloading...
    echo [%DATE% %TIME%] App not found, downloading (attempt %RETRY_COUNT%) >> "%LOG_FILE%"
    echo.
    powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Mummy.ps1" -Action download
    if exist "%LOCALAPPDATA%\\CryptArtist Studio\\CryptArtist Studio.exe" (
        set "APP_PATH=%LOCALAPPDATA%\\CryptArtist Studio\\CryptArtist Studio.exe"
    ) else (
        REM Retry up to 2 times
        set /a RETRY_COUNT+=1
        if %RETRY_COUNT% LSS 3 (
            echo   [*] Retrying download (attempt %RETRY_COUNT% of 3)...
            timeout /t 5 >nul
            goto :FIND_APP
        )
    )
)

REM Handle the curse
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%Mummy.ps1" -Action curse

REM Launch CryptArtist Studio with the .Crypt file (default: ValleyNet program)
if defined APP_PATH (
    echo.
    echo   [*] Launching CryptArtist Studio (ValleyNet)...
    echo [%DATE% %TIME%] Launching: %APP_PATH% >> "%LOG_FILE%"
    if defined CRYPT_FILE (
        start "" "%APP_PATH%" "%CRYPT_FILE%" --program valley-net
    ) else (
        start "" "%APP_PATH%" --program valley-net
    )
    echo   [OK] The Mummy has completed its duty. It watches forever.
    echo [%DATE% %TIME%] Launch successful >> "%LOG_FILE%"
) else (
    echo.
    echo   [ERROR] Could not find or install CryptArtist Studio.
    echo   Please download manually from:
    echo   https://github.com/mattyjacks/CryptArtistStudio/tree/main/download
    echo [%DATE% %TIME%] ERROR: Launch failed - app not found >> "%LOG_FILE%"
    echo.
    pause
)

timeout /t 3 >nul
`;
}

export function generateMummyPs1(cryptFileName: string): string {
  return `# ==========================================================================
# CryptArtist Mummy - PowerShell Bootstrap Agent
# Downloads CryptArtist Studio and manages curses.
# ==========================================================================
param(
    [string]$Action = "all"  # "download", "curse", "all"
)

$ErrorActionPreference = "Continue"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ConfigPath = Join-Path $ScriptDir "Mummy.json"
$DownloadUrl = "https://github.com/mattyjacks/CryptArtistStudio/tree/main/download"
$AppName = "CryptArtist Studio"

# Load config
$Config = @{}
if (Test-Path $ConfigPath) {
    try {
        $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        if ($Config.downloadUrl) { $DownloadUrl = $Config.downloadUrl }
    } catch {
        Write-Host "  [WARN] Could not read Mummy.json: $_"
    }
}

# Logging helper
$LogFile = Join-Path $ScriptDir "Mummy.log"
function Write-Log {
    param([string]$Message)
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $LogFile -Value "[$Timestamp] $Message" -ErrorAction SilentlyContinue
}

function Test-NetworkConnection {
    try {
        $result = Test-Connection -ComputerName "github.com" -Count 1 -Quiet -ErrorAction SilentlyContinue
        return $result
    } catch {
        return $false
    }
}

function Get-FreeDiskSpaceMB {
    try {
        $drive = (Get-Item $env:LOCALAPPDATA).PSDrive
        return [math]::Round($drive.Free / 1MB)
    } catch {
        return -1
    }
}

function Download-CryptArtist {
    Write-Log "Download-CryptArtist started"
    Write-Host ""
    Write-Host "  Downloading $AppName..."
    Write-Host "  From: $DownloadUrl"
    Write-Host ""

    # Check network
    if (-not (Test-NetworkConnection)) {
        Write-Host "  [WARN] No network connection detected. Retrying in 5s..."
        Write-Log "No network connection"
        Start-Sleep -Seconds 5
        if (-not (Test-NetworkConnection)) {
            Write-Host "  [ERROR] Still no network. Please check your internet connection."
            Write-Log "Network check failed after retry"
            return
        }
    }

    # Check disk space (need at least 500MB)
    $freeMB = Get-FreeDiskSpaceMB
    if ($freeMB -ge 0 -and $freeMB -lt 500) {
        Write-Host "  [WARN] Low disk space: $($freeMB)MB free (need 500MB)"
        Write-Log "Low disk space: $($freeMB)MB"
    } elseif ($freeMB -ge 0) {
        Write-Host "  [OK] Disk space: $($freeMB)MB free"
    }

    $InstallDir = Join-Path $env:LOCALAPPDATA "CryptArtist Studio"
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }

    # Try to find the installer/portable zip from the download page
    try {
        # Download the release page to find the actual download link
        $ReleasePage = "https://api.github.com/repos/mattyjacks/CryptArtistStudio/releases/latest"
        $Headers = @{ "User-Agent" = "CryptArtist-Mummy/1.0" }

        try {
            Write-Log "Querying GitHub API: $ReleasePage"
            $Release = Invoke-RestMethod -Uri $ReleasePage -Headers $Headers -TimeoutSec 30
            Write-Log "GitHub API returned release: $($Release.tag_name)"
            $WinAsset = $Release.assets | Where-Object { $_.name -match "\\.(msi|exe|zip)" -and $_.name -match "(?i)windows" } | Select-Object -First 1

            if ($WinAsset) {
                $DownloadFile = Join-Path $env:TEMP $WinAsset.name
                Write-Host "  Downloading: $($WinAsset.name) ($([math]::Round($WinAsset.size/1MB, 1)) MB)"
                Write-Log "Downloading: $($WinAsset.browser_download_url) -> $DownloadFile"
                Invoke-WebRequest -Uri $WinAsset.browser_download_url -OutFile $DownloadFile -UseBasicParsing

                if ($WinAsset.name -match "\\.zip$") {
                    Write-Host "  Extracting to: $InstallDir"
                    Expand-Archive -Path $DownloadFile -DestinationPath $InstallDir -Force
                } elseif ($WinAsset.name -match "\\.(msi|exe)$") {
                    Write-Host "  Running installer: $DownloadFile"
                    Start-Process -FilePath $DownloadFile -Wait
                }
                Remove-Item $DownloadFile -Force -ErrorAction SilentlyContinue
                Write-Host "  [OK] $AppName installed!"
                Write-Log "Installation completed successfully"
                return
            }
        } catch {
            Write-Host "  [WARN] GitHub API request failed: $_"
            Write-Log "GitHub API error: $_"
        }

        # Fallback: open the download page in browser
        Write-Host "  [*] Opening download page in browser..."
        Start-Process $DownloadUrl
        Write-Host "  [*] Please download and install $AppName manually."
        Write-Host "  [*] Then re-run this Mummy script."
    } catch {
        Write-Host "  [ERROR] Download failed: $_"
        Write-Host "  Please download manually from: $DownloadUrl"
        Write-Log "Download failed: $_"
        Start-Process $DownloadUrl
    }
}

function Place-Curse {
    if (-not $Config.curse -or -not $Config.curse.enabled) { return }

    $CurseMsg = $Config.curse.message
    $CurseLoc = $Config.curse.location
    $CurseFile = $Config.curse.filename
    $AskFirst = $Config.curse.askFirst

    # Determine curse location
    $CurseDir = switch ($CurseLoc) {
        "desktop"   { [Environment]::GetFolderPath("Desktop") }
        "documents" { [Environment]::GetFolderPath("MyDocuments") }
        "temp"      { $env:TEMP }
        default     { [Environment]::GetFolderPath("Desktop") }
    }

    $CursePath = Join-Path $CurseDir "$CurseFile.txt"

    # Ask first if configured
    if ($AskFirst) {
        Write-Host ""
        Write-Host "  The Mummy wants to leave a Curse on your computer."
        Write-Host "  This is a harmless .txt file at: $CursePath"
        Write-Host ""
        $response = Read-Host "  Allow the Curse? (Y/n)"
        if ($response -eq "n" -or $response -eq "N") {
            Write-Host "  [*] Curse averted. The Mummy respects your wishes."
            return
        }
    }

    # Write the curse
    $CurseContent = @"
================================================================================
  CRYPTARTIST CURSE
================================================================================

  You have opened a CryptArtist Crypt.
  The Mummy has risen and left this mark.

  $CurseMsg

  -------------------------------------------------------
  Crypt opened:    $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
  Computer:        $env:COMPUTERNAME
  User:            $env:USERNAME
  OS:              $(Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Caption)
  -------------------------------------------------------

  This file is harmless. It was placed by the Pyramid/Mummy
  bootstrap agent inside a .Crypt file. You may delete it.

  Learn more: https://github.com/mattyjacks/CryptArtistStudio

================================================================================
"@

    try {
        Set-Content -Path $CursePath -Value $CurseContent -Encoding UTF8
        Write-Host "  [*] Curse placed at: $CursePath"
        Write-Log "Curse placed at: $CursePath"
    } catch {
        Write-Host "  [WARN] Could not place curse: $_"
        Write-Log "Curse placement failed: $_"
    }
}

# Main
switch ($Action) {
    "download" { Download-CryptArtist }
    "curse"    { Place-Curse }
    "all"      { Download-CryptArtist; Place-Curse }
}
`;
}

export function generateMummySh(cryptFileName: string): string {
  return `#!/bin/bash
# ==========================================================================
# CryptArtist Mummy - Bash Bootstrap Agent (Linux/macOS)
# Downloads CryptArtist Studio and opens this .Crypt file.
# ==========================================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/Mummy.json"
DOWNLOAD_URL="https://github.com/mattyjacks/CryptArtistStudio/tree/main/download"
APP_NAME="CryptArtist Studio"

echo ""
echo "  =============================================="
echo "   CryptArtist Mummy - The Guardian Awakens"
echo "  =============================================="
echo ""
echo "  This .Crypt file contains a self-running agent."
echo "  It will download CryptArtist Studio and open"
echo "  your project automatically in ValleyNet."
echo "  The Mummy runs forever, restarting on errors."
echo ""

# Load config if present
if [ -f "$CONFIG_FILE" ]; then
    URL=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); print(d.get('downloadUrl',''))" 2>/dev/null || echo "")
    if [ -n "$URL" ]; then
        DOWNLOAD_URL="$URL"
    fi
fi

# Find the .Crypt file
CRYPT_FILE=""
for f in "$SCRIPT_DIR"/../*.Crypt "$SCRIPT_DIR"/../*.crypt; do
    if [ -f "$f" ]; then
        CRYPT_FILE="$f"
        break
    fi
done

# Detect OS
OS="$(uname -s)"
case "$OS" in
    Linux*)  PLATFORM="linux" ;;
    Darwin*) PLATFORM="macos" ;;
    *)       PLATFORM="unknown" ;;
esac

echo "  Platform: $PLATFORM"

# Check if CryptArtist Studio is installed
APP_PATH=""
if [ "$PLATFORM" = "macos" ]; then
    if [ -d "/Applications/CryptArtist Studio.app" ]; then
        APP_PATH="/Applications/CryptArtist Studio.app"
        echo "  [OK] CryptArtist Studio found!"
    fi
elif [ "$PLATFORM" = "linux" ]; then
    if command -v cryptartist-studio &>/dev/null; then
        APP_PATH="cryptartist-studio"
        echo "  [OK] CryptArtist Studio found!"
    elif [ -f "$HOME/.local/bin/cryptartist-studio" ]; then
        APP_PATH="$HOME/.local/bin/cryptartist-studio"
        echo "  [OK] CryptArtist Studio found!"
    fi
fi

# Download if not found
if [ -z "$APP_PATH" ]; then
    echo "  [!!] CryptArtist Studio not found. Opening download page..."
    if [ "$PLATFORM" = "macos" ]; then
        open "$DOWNLOAD_URL"
    elif [ "$PLATFORM" = "linux" ]; then
        xdg-open "$DOWNLOAD_URL" 2>/dev/null || echo "  Please visit: $DOWNLOAD_URL"
    fi
    echo "  Please install CryptArtist Studio, then re-run this script."
    echo ""
    read -p "  Press Enter after installing..." _

    # Re-check
    if [ "$PLATFORM" = "macos" ] && [ -d "/Applications/CryptArtist Studio.app" ]; then
        APP_PATH="/Applications/CryptArtist Studio.app"
    elif [ "$PLATFORM" = "linux" ] && command -v cryptartist-studio &>/dev/null; then
        APP_PATH="cryptartist-studio"
    fi
fi

# Handle curse
if [ -f "$CONFIG_FILE" ]; then
    CURSE_ENABLED=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); c=d.get('curse',{}); print('true' if c.get('enabled') else 'false')" 2>/dev/null || echo "false")
    if [ "$CURSE_ENABLED" = "true" ]; then
        CURSE_MSG=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); print(d.get('curse',{}).get('message',''))" 2>/dev/null || echo "")
        CURSE_FILE=$(python3 -c "import json; d=json.load(open('$CONFIG_FILE')); print(d.get('curse',{}).get('filename','CryptArtist_Curse'))" 2>/dev/null || echo "CryptArtist_Curse")
        CURSE_PATH="$HOME/Desktop/$CURSE_FILE.txt"

        echo ""
        echo "  The Mummy wants to leave a Curse on your computer."
        echo "  This is a harmless .txt file at: $CURSE_PATH"
        read -p "  Allow the Curse? (Y/n) " RESPONSE
        if [ "$RESPONSE" != "n" ] && [ "$RESPONSE" != "N" ]; then
            cat > "$CURSE_PATH" << CURSE_EOF
================================================================================
  CRYPTARTIST CURSE
================================================================================

  You have opened a CryptArtist Crypt.
  The Mummy has risen and left this mark.

  $CURSE_MSG

  -------------------------------------------------------
  Crypt opened:    $(date '+%Y-%m-%d %H:%M:%S')
  Computer:        $(hostname)
  User:            $(whoami)
  OS:              $(uname -srm)
  -------------------------------------------------------

  This file is harmless. It was placed by the Pyramid/Mummy
  bootstrap agent inside a .Crypt file. You may delete it.

  Learn more: https://github.com/mattyjacks/CryptArtistStudio

================================================================================
CURSE_EOF
            echo "  [*] Curse placed at: $CURSE_PATH"
        else
            echo "  [*] Curse averted."
        fi
    fi
fi

# Launch (default: ValleyNet program, runs forever)
if [ -n "$APP_PATH" ]; then
    echo ""
    echo "  [*] Launching CryptArtist Studio (ValleyNet)..."
    if [ "$PLATFORM" = "macos" ]; then
        if [ -n "$CRYPT_FILE" ]; then
            open -a "$APP_PATH" "$CRYPT_FILE" --args --program valley-net
        else
            open -a "$APP_PATH" --args --program valley-net
        fi
    else
        if [ -n "$CRYPT_FILE" ]; then
            "$APP_PATH" "$CRYPT_FILE" --program valley-net &
        else
            "$APP_PATH" --program valley-net &
        fi
    fi
    echo "  [OK] The Mummy has completed its duty. It watches forever."
else
    echo ""
    echo "  [ERROR] Could not find CryptArtist Studio."
    echo "  Please download from: $DOWNLOAD_URL"
fi

echo ""
`;
}
