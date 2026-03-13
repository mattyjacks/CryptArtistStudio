// ---------------------------------------------------------------------------
// Local storage helpers with JSON serialization and error handling
// ---------------------------------------------------------------------------

const PREFIX = "cryptartist_";

export function getStorageItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
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
  const existing = getRecentProjects().filter((p) => p.path !== project.path);
  existing.unshift(project);
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
  return { ...DEFAULT_PREFS, ...getStorageItem<Partial<UserPreferences>>("preferences", {}) };
}

export function savePreferences(prefs: Partial<UserPreferences>): void {
  const current = getPreferences();
  setStorageItem("preferences", { ...current, ...prefs });
}
