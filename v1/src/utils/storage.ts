// ---------------------------------------------------------------------------
// Local storage helpers with JSON serialization and error handling
// ---------------------------------------------------------------------------

import { validateStorageKey, validateStorageValue, logSecurityEvent } from "./security";

const PREFIX = "cryptartist_";
const MAX_STORAGE_VALUE_SIZE = 5 * 1024 * 1024; // Vuln 29: 5 MB per value

export function getStorageItem<T>(key: string, fallback: T): T {
  try {
    // Vuln 28: Validate key format
    if (!validateStorageKey(PREFIX + key)) {
      logSecurityEvent("storage", "medium", "Invalid storage key rejected", key);
      return fallback;
    }
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    // Vuln 28: Validate key format
    if (!validateStorageKey(PREFIX + key)) {
      logSecurityEvent("storage", "medium", "Invalid storage key rejected on write", key);
      return;
    }
    const serialized = JSON.stringify(value);
    // Vuln 29: Check value size
    if (!validateStorageValue(serialized)) {
      logSecurityEvent("storage", "high", "Storage value too large", `key=${key} size=${serialized.length}`);
      console.warn("[CryptArtist] Storage value too large for key:", key);
      return;
    }
    localStorage.setItem(PREFIX + key, serialized);
  } catch (e) {
    console.warn("[CryptArtist] Failed to save to localStorage:", e);
  }
}

export function removeStorageItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Recent projects tracking
// ---------------------------------------------------------------------------

export interface RecentProject {
  path: string;
  program: string;
  name: string;
  openedAt: number;
}

const MAX_RECENT = 10;

export function getRecentProjects(): RecentProject[] {
  return getStorageItem<RecentProject[]>("recent_projects", []);
}

export function addRecentProject(project: RecentProject): void {
  // Vuln 32: Sanitize recent project paths
  const safePath = project.path.replace(/[<>"'`&]/g, "");
  const safeName = project.name.replace(/[<>"'`&]/g, "").substring(0, 256);
  const safeProject = { ...project, path: safePath, name: safeName };
  const existing = getRecentProjects().filter((p) => p.path !== safeProject.path);
  existing.unshift(safeProject);
  setStorageItem("recent_projects", existing.slice(0, MAX_RECENT));
}

// ---------------------------------------------------------------------------
// User preferences
// ---------------------------------------------------------------------------

export interface UserPreferences {
  theme: "dark" | "light";
  fontSize: number;
  autoSave: boolean;
  showLegalLinks: boolean;
  reducedMotion: boolean;
  lastProgram: string | null;
}

const DEFAULT_PREFS: UserPreferences = {
  theme: "dark",
  fontSize: 14,
  autoSave: true,
  showLegalLinks: true,
  reducedMotion: false,
  lastProgram: null,
};

export function getPreferences(): UserPreferences {
  const stored = getStorageItem<Partial<UserPreferences>>("preferences", {});
  // Vuln 31: Validate preferences schema before applying
  const validated: Partial<UserPreferences> = {};
  if (stored.theme === "dark" || stored.theme === "light") validated.theme = stored.theme;
  if (typeof stored.fontSize === "number" && stored.fontSize >= 8 && stored.fontSize <= 32) validated.fontSize = stored.fontSize;
  if (typeof stored.autoSave === "boolean") validated.autoSave = stored.autoSave;
  if (typeof stored.showLegalLinks === "boolean") validated.showLegalLinks = stored.showLegalLinks;
  if (typeof stored.reducedMotion === "boolean") validated.reducedMotion = stored.reducedMotion;
  if (stored.lastProgram === null || (typeof stored.lastProgram === "string" && stored.lastProgram.length < 100)) validated.lastProgram = stored.lastProgram;
  return { ...DEFAULT_PREFS, ...validated };
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  const current = getPreferences();
  setStorageItem("preferences", { ...current, ...prefs });
}

// ---------------------------------------------------------------------------
// Safe raw localStorage access (no prefix) for direct key usage
// ---------------------------------------------------------------------------

export function safeGetRaw(key: string, fallback: string = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeSetRaw(key: string, value: string): void {
  try {
    // Vuln 45: Validate before raw writes
    if (value.length > MAX_STORAGE_VALUE_SIZE) {
      console.warn("[CryptArtist] Value too large for key:", key);
      return;
    }
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("[CryptArtist] Failed to write localStorage key:", key, e);
  }
}

export function safeGetRawJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeStorageUsage(): number {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("cryptartist")) {
        total += (localStorage.getItem(key) || "").length;
      }
    }
    return total;
  } catch {
    return 0;
  }
}
