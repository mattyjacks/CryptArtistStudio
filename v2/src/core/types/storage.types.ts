// ============================================================================
// CryptArtist Studio v2 - Storage Abstraction Types
// ============================================================================

export interface StorageUsage {
  usedBytes: number;
  quotaBytes?: number;
  percentUsed?: number;
}

export interface UserPreferences {
  theme: "dark" | "light" | "cyberpunk" | "matrix" | "synthwave";
  fontSize: number;
  autoSave: boolean;
  autoSaveIntervalSeconds: number;
  showLegalLinks: boolean;
  reducedMotion: boolean;
  lastProgram: string;
  defaultTimelineFps: number;
  defaultTimelineResolution: "1080p" | "4k" | "vertical" | "square";
  renderQuality: "fast" | "balanced" | "ultra";
}

export interface RecentProject {
  id: string;
  name: string;
  program: string;
  thumbnail?: string;
  lastModified: number;
  durationSeconds?: number;
  clipCount?: number;
  isCloudSynced?: boolean;
}

export interface IStorageDriver {
  /** Get item from storage */
  getItem<T>(key: string, fallback: T): Promise<T>;
  /** Set item in storage */
  setItem<T>(key: string, value: T): Promise<void>;
  /** Remove item */
  removeItem(key: string): Promise<void>;
  /** Clear all studio storage */
  clear(): Promise<void>;
  /** Get all keys with optional prefix */
  getAllKeys(prefix?: string): Promise<string[]>;
  /** Get current storage usage estimate */
  getStorageUsage(): Promise<StorageUsage>;
}
