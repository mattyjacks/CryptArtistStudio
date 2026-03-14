// ============================================================================
// CryptArtist Art (.CryptArt) Project File Format  -  Permanent Schema
// ============================================================================
//
// Design goals:
//   1. NEVER needs a base format upgrade - the envelope is stable forever.
//   2. Any .CryptArt file ever created will always be readable.
//   3. New programs, fields, and capabilities are added WITHOUT breaking old files.
//   4. Self-identifying via "$cryptart" magic key.
//   5. Open program IDs - any string, no fixed union type.
//   6. Optional rich metadata (tags, author, description, thumbnail, etc.)
//   7. Optional extensions section for future capabilities.
//   8. Optional history array for edit tracking.
//
// Envelope fields:
//   REQUIRED (the only 3 fields that MUST exist):
//     "$cryptart"    - always 1. Identifies the file AND its envelope version.
//     "program"      - free-form string identifying which program created it.
//     "data"         - program-specific payload. Opaque to the envelope.
//
//   RECOMMENDED (written by default, but not required to parse):
//     "name"         - human-readable project name.
//     "createdAt"    - ISO-8601 creation timestamp.
//     "updatedAt"    - ISO-8601 last-save timestamp.
//     "appVersion"   - version of CryptArtist Studio that wrote the file.
//
//   OPTIONAL (for richer workflows):
//     "id"           - UUID for deduplication / cloud sync.
//     "parentId"     - UUID of the parent file (for forks/branches).
//     "source"       - Origin URL or path of the file.
//     "meta"         - Rich metadata object with ALL optional fields:
//                      Identity: author, email, organization, website, repository
//                      Description: description, readme, tags[], keywords[], category
//                      Legal: license, copyright, rating
//                      Visual: thumbnail, preview, icon, color
//                      Collaboration: collaborators[]
//                      Stats: fileCount, duration, resolution, language, locale
//     "dependencies" - Array of { name, version?, type? } for project deps.
//     "environment"  - { os?, arch?, runtime?, runtimeVersion? }
//     "checksum"     - SHA-256 hash of data section for integrity.
//     "encryption"   - Encryption algorithm used, if any.
//     "compression"  - Compression algorithm used, if any.
//     "minAppVersion"- Minimum app version required to read this file.
//     "maxAppVersion"- Maximum app version known to work.
//     "compatibility"- Array of compatible reader identifiers.
//     "history"      - Array of { timestamp, action, detail?, user? } entries.
//     "extensions"   - Record<string, unknown> for future plug-in data.
//     "plugins"      - Array of plugin identifiers used.
//     "schemas"      - Map of data key -> JSON Schema URL for validation.
//     "exportedAt"   - ISO-8601 timestamp of last export.
//     "exportedBy"   - Who/what exported the file.
//     "exportFormat" - Target format of export.
//     "shareUrl"     - Public sharing URL.
//
// Compatibility contract:
//   - Readers MUST ignore unknown top-level keys.
//   - Readers MUST NOT fail if optional keys are missing.
//   - Writers MUST always include the 3 required keys.
//   - Writers SHOULD preserve unknown keys when re-saving a file.
//
// ============================================================================

// ---------------------------------------------------------------------------
// Current known program IDs (not enforced - any string is valid)
// ---------------------------------------------------------------------------

import { sanitizeObjectKeys, isValidISODate, logSecurityEvent } from "./security";

export const KNOWN_PROGRAMS = [
  "media-mogul",
  "vibecode-worker",
  "demo-recorder",
  "valley-net",
  "game-studio",
  "commander",
  "donate-personal-seconds",
  "clone-tool",
  "dictate-pic",
  "luck-factory",
  "settings",
] as const;

// Program type is a string, not a closed union - future programs just work.
export type CryptArtProgram = (typeof KNOWN_PROGRAMS)[number] | (string & {});

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface CryptArtMeta {
  // Identity
  author?: string;
  email?: string;
  organization?: string;
  website?: string;
  repository?: string;

  // Description
  description?: string;
  readme?: string;
  tags?: string[];
  keywords?: string[];
  category?: string;

  // Legal
  license?: string;
  copyright?: string;
  rating?: string;

  // Visual
  thumbnail?: string;
  preview?: string;
  icon?: string;
  color?: string;

  // Collaboration
  collaborators?: string[];

  // Project stats (informational, not authoritative)
  fileCount?: number;
  duration?: number;
  resolution?: string;
  language?: string;
  locale?: string;

  // Forward-compat: any key is allowed
  [key: string]: unknown;
}

export interface CryptArtHistoryEntry {
  timestamp: string;
  action: string;
  detail?: string;
  user?: string;
}

export interface CryptArtDependency {
  name: string;
  version?: string;
  type?: string;
  [key: string]: unknown;
}

export interface CryptArtEnvironment {
  os?: string;
  arch?: string;
  runtime?: string;
  runtimeVersion?: string;
  [key: string]: unknown;
}

export interface CryptArtFile {
  // --- REQUIRED (envelope) ---
  $cryptart: 1;
  program: CryptArtProgram;
  data: Record<string, unknown>;

  // --- RECOMMENDED ---
  name?: string;
  createdAt?: string;
  updatedAt?: string;
  appVersion?: string;

  // --- OPTIONAL: identity & sync ---
  id?: string;
  parentId?: string;
  source?: string;

  // --- OPTIONAL: rich metadata ---
  meta?: CryptArtMeta;

  // --- OPTIONAL: project structure ---
  dependencies?: CryptArtDependency[];
  environment?: CryptArtEnvironment;

  // --- OPTIONAL: integrity ---
  checksum?: string;
  encryption?: string;
  compression?: string;

  // --- OPTIONAL: compatibility ---
  minAppVersion?: string;
  maxAppVersion?: string;
  compatibility?: string[];

  // --- OPTIONAL: audit trail ---
  history?: CryptArtHistoryEntry[];

  // --- OPTIONAL: extensibility ---
  extensions?: Record<string, unknown>;
  plugins?: string[];
  schemas?: Record<string, string>;

  // --- OPTIONAL: export/sharing ---
  exportedAt?: string;
  exportedBy?: string;
  exportFormat?: string;
  shareUrl?: string;

  // Forward-compat: allow any extra top-level keys
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CRYPTART_FORMAT_VERSION = 1 as const;
const APP_VERSION = "0.1.0";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export function createCryptArtFile(
  program: CryptArtProgram,
  name: string,
  data: Record<string, unknown> = {},
  options?: {
    meta?: CryptArtMeta;
    id?: string;
  }
): CryptArtFile {
  const now = new Date().toISOString();
  const file: CryptArtFile = {
    $cryptart: CRYPTART_FORMAT_VERSION,
    program,
    name,
    createdAt: now,
    updatedAt: now,
    appVersion: APP_VERSION,
    data,
  };
  if (options?.id) file.id = options.id;
  if (options?.meta) {
    file.meta = options.meta;
  } else {
    // Default meta includes the official website
    file.meta = { website: "https://mattyjacks.com" };
  }
  return file;
}

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

export function serializeCryptArt(file: CryptArtFile): string {
  // Always refresh updatedAt on save
  const out: CryptArtFile = {
    ...file,
    $cryptart: CRYPTART_FORMAT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  // Put $cryptart and program first for human readability
  const { $cryptart, program, name, createdAt, updatedAt, appVersion, data, ...rest } = out;
  const ordered: Record<string, unknown> = {
    $cryptart,
    program,
    ...(name !== undefined && { name }),
    ...(createdAt !== undefined && { createdAt }),
    ...(updatedAt !== undefined && { updatedAt }),
    ...(appVersion !== undefined && { appVersion }),
    ...rest,
    data,
  };
  return JSON.stringify(ordered, null, 2);
}

// ---------------------------------------------------------------------------
// Parse (backward-compatible with ALL past .CryptArt files)
// ---------------------------------------------------------------------------

const MAX_CRYPTART_SIZE = 50 * 1024 * 1024; // 50 MB

export function parseCryptArt(json: string): CryptArtFile {
  // Size guard to prevent parsing extremely large payloads
  if (json.length > MAX_CRYPTART_SIZE) {
    throw new Error(`CryptArt file too large: ${json.length} bytes (max ${MAX_CRYPTART_SIZE}).`);
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    throw new Error(`Invalid .CryptArt file: malformed JSON. ${e instanceof Error ? e.message : String(e)}`);
  }

  // Must be a plain object
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Invalid .CryptArt file: root must be a JSON object.");
  }

  // Vuln 50: Protect against prototype pollution
  raw = sanitizeObjectKeys(raw);

  // --- Backward compatibility: upgrade old format files in-memory ---
  // Old files have {program, version, name, createdAt, updatedAt, data} but no $cryptart.
  if (raw.$cryptart === undefined) {
    // This is a pre-v1 file. Normalize it.
    raw.$cryptart = CRYPTART_FORMAT_VERSION;
    // Migrate "version" -> "appVersion" (old field name)
    if (raw.version && !raw.appVersion) {
      raw.appVersion = raw.version;
      delete raw.version;
    }
  }

  // Validate $cryptart is a number
  if (typeof raw.$cryptart !== "number" || raw.$cryptart < 1) {
    throw new Error("Invalid .CryptArt file: '$cryptart' must be a positive number.");
  }

  // --- Validate minimum required fields ---
  if (!raw.program || typeof raw.program !== "string") {
    throw new Error("Invalid .CryptArt file: missing or invalid 'program' field.");
  }
  if (typeof raw.program === "string" && raw.program.length > 200) {
    throw new Error("Invalid .CryptArt file: 'program' field too long.");
  }
  if (raw.data === undefined || raw.data === null) {
    // Tolerate missing data by defaulting to empty object
    raw.data = {};
  }
  // Ensure data is a plain object
  if (typeof raw.data !== "object" || Array.isArray(raw.data)) {
    throw new Error("Invalid .CryptArt file: 'data' must be an object.");
  }

  // Vuln 49: Validate ISO date strings if present
  if (raw.createdAt && typeof raw.createdAt === "string" && !isValidISODate(raw.createdAt as string)) {
    logSecurityEvent("cryptart", "low", "Invalid createdAt date in .CryptArt file", raw.createdAt as string);
    raw.createdAt = new Date().toISOString();
  }
  if (raw.updatedAt && typeof raw.updatedAt === "string" && !isValidISODate(raw.updatedAt as string)) {
    logSecurityEvent("cryptart", "low", "Invalid updatedAt date in .CryptArt file", raw.updatedAt as string);
    raw.updatedAt = new Date().toISOString();
  }

  return raw as unknown as CryptArtFile;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function routeForProgram(program: string): string {
  return `/${program}`;
}

export function isCryptArtFile(json: string): boolean {
  if (!json || json.length > MAX_CRYPTART_SIZE) return false;
  try {
    const raw = JSON.parse(json);
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return false;
    return (raw.$cryptart !== undefined || (typeof raw.program === "string" && raw.version !== undefined));
  } catch {
    return false;
  }
}

export function getCryptArtProgram(json: string): string | null {
  if (!json || json.length > MAX_CRYPTART_SIZE) return null;
  try {
    const raw = JSON.parse(json);
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return null;
    return typeof raw.program === "string" ? raw.program : null;
  } catch {
    return null;
  }
}
