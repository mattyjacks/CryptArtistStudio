// ============================================================================
// CryptArtist Studio v2 - Permanent .CryptArt Project Specification
// ============================================================================

export type CryptArtProgram =
  | "media-mogul"
  | "vibecode-worker"
  | "demo-recorder"
  | "valley-net"
  | "game-studio"
  | "virtual-pet"
  | "commander"
  | "donate-personal-seconds"
  | "donate-computer"
  | "clone-tool"
  | "luck-factory"
  | "dictate-pic"
  | "tax-info-bot"
  | "alive-speech"
  | "master"
  | "settings"
  | (string & {});

export interface CryptArtMeta {
  author?: string;
  email?: string;
  website?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  duration?: number;
  resolution?: string;
  fps?: number;
  audioSampleRate?: number;
  customData?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface CryptArtHistoryEntry {
  timestamp: string;
  action: string;
  user?: string;
  detail?: string;
}

export interface CryptArtFile {
  /** Magic format version indicator (always 1 for backward compatibility) */
  $cryptart: 1;
  /** Studio version creating this file */
  studioVersion: "2.0.0";
  /** Target program */
  program: CryptArtProgram;
  /** Project display name */
  name: string;
  /** Unique project UUID */
  id: string;
  /** ISO-8601 creation & update timestamps */
  createdAt: string;
  updatedAt: string;
  /** Project metadata */
  meta?: CryptArtMeta;
  /** Program-specific state data payload (e.g. timeline tracks, clips, inspector) */
  data: Record<string, unknown>;
  /** Optional embedded binary assets (data URLs or base64 blobs) for standalone backups */
  embeddedAssets?: Record<string, { name: string; mimeType: string; dataUrl: string }>;
  /** Optional history tracking entries */
  history?: CryptArtHistoryEntry[];
  [key: string]: unknown;
}

export interface ICryptArtEngine {
  /** Create new empty project object */
  createProject(program: CryptArtProgram, name: string, data?: Record<string, unknown>): CryptArtFile;
  /** Serialize project to JSON string */
  serializeProject(project: CryptArtFile): string;
  /** Parse JSON string into valid CryptArtFile */
  parseProject(json: string): CryptArtFile;
  /** Export project file and trigger download */
  exportProjectFile(project: CryptArtFile, fileName?: string): Promise<void>;
  /** Import project from File object */
  importProjectFile(file: File): Promise<CryptArtFile>;
}
