// ---------------------------------------------------------------------------
// CryptArtist Studio - Theme System
// ZIP-based themes with Primordial (default) and Blank built-in themes
// ---------------------------------------------------------------------------

import type {
  ThemeManifest,
  ThemeColors,
  ThemeFonts,
  ThemeEffects,
  ThemeSpacing,
  InstalledExtension,
  ZipEntry,
} from "./extensions";
import {
  STORAGE_KEY_THEMES,
  STORAGE_KEY_ACTIVE_THEME,
  extractManifest,
  parseZipFile,
  formatBytes,
} from "./extensions";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Built-in Theme: Primordial
// The original, foundational theme - deep cosmic void, ancient, primal energy
// ---------------------------------------------------------------------------

const PRIMORDIAL_COLORS: ThemeColors = {
  bgPrimary: "#08080f",
  bgSecondary: "#0d0d18",
  bgPanel: "#0e0e1a",
  bgSurface: "#141425",
  bgElevated: "#1a1a30",
  bgHover: "#222240",
  borderSubtle: "rgba(255, 255, 255, 0.04)",
  borderDefault: "rgba(255, 255, 255, 0.08)",
  borderBright: "rgba(255, 255, 255, 0.14)",
  textPrimary: "#e4e4ef",
  textSecondary: "#8888a0",
  textMuted: "#555570",
  accentPrimary: "#00d2ff",
  accentSecondary: "#7b2ff7",
  accentTertiary: "#e94560",
  success: "#4ade80",
  warning: "#fbbf24",
  danger: "#e94560",
  info: "#3b82f6",
};

const PRIMORDIAL_FONTS: ThemeFonts = {
  sans: "'Inter', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
  heading: "'Inter', system-ui, sans-serif",
  baseSizePx: 13,
  lineHeight: 1.4,
  letterSpacing: "normal",
};

const PRIMORDIAL_EFFECTS: ThemeEffects = {
  glassEnabled: true,
  glassOpacity: 0.85,
  glassBlur: "12px",
  glowEnabled: true,
  glowColor: "rgba(0, 210, 255, 0.3)",
  glowIntensity: "16px",
  gradientText: true,
  animationsEnabled: true,
  scrollbarStyle: "thin",
  selectionColor: "rgba(0, 210, 255, 0.25)",
};

const PRIMORDIAL_SPACING: ThemeSpacing = {
  panelPadding: "12px",
  cardRadius: "12px",
  borderWidth: "1px",
  gap: "8px",
};

export const PRIMORDIAL_THEME: ThemeManifest = {
  type: "theme",
  id: "primordial",
  name: "Primordial",
  version: "1.0.0",
  description: "The original foundational theme - deep cosmic void, ancient and primal. Existing at the beginning of time, basic and fundamental.",
  author: "CryptArtist Studio",
  authorUrl: "https://mattyjacks.com",
  license: "MIT",
  tags: ["dark", "default", "cosmic", "deep", "ancient", "primal"],
  baseTheme: "primordial",
  colors: PRIMORDIAL_COLORS,
  fonts: PRIMORDIAL_FONTS,
  effects: PRIMORDIAL_EFFECTS,
  spacing: PRIMORDIAL_SPACING,
};

// ---------------------------------------------------------------------------
// Built-in Theme: Blank
// Bare-bones utilitarian - no frills, maximally extensible
// ---------------------------------------------------------------------------

const BLANK_COLORS: ThemeColors = {
  bgPrimary: "#0c0c0c",
  bgSecondary: "#121212",
  bgPanel: "#161616",
  bgSurface: "#1c1c1c",
  bgElevated: "#242424",
  bgHover: "#2c2c2c",
  borderSubtle: "rgba(255, 255, 255, 0.06)",
  borderDefault: "rgba(255, 255, 255, 0.10)",
  borderBright: "rgba(255, 255, 255, 0.18)",
  textPrimary: "#d4d4d4",
  textSecondary: "#808080",
  textMuted: "#505050",
  accentPrimary: "#808080",
  accentSecondary: "#606060",
  accentTertiary: "#404040",
  success: "#6abf69",
  warning: "#c9a832",
  danger: "#c94040",
  info: "#5080b0",
};

const BLANK_FONTS: ThemeFonts = {
  sans: "system-ui, -apple-system, sans-serif",
  mono: "monospace",
  heading: "system-ui, sans-serif",
  baseSizePx: 13,
  lineHeight: 1.5,
  letterSpacing: "normal",
};

const BLANK_EFFECTS: ThemeEffects = {
  glassEnabled: false,
  glassOpacity: 1,
  glassBlur: "0px",
  glowEnabled: false,
  glowColor: "transparent",
  glowIntensity: "0px",
  gradientText: false,
  animationsEnabled: false,
  scrollbarStyle: "default",
  selectionColor: "rgba(128, 128, 128, 0.3)",
};

const BLANK_SPACING: ThemeSpacing = {
  panelPadding: "8px",
  cardRadius: "4px",
  borderWidth: "1px",
  gap: "4px",
};

export const BLANK_THEME: ThemeManifest = {
  type: "theme",
  id: "blank",
  name: "Blank",
  version: "1.0.0",
  description: "Bare-bones utilitarian theme - the most boring and functional starting point possible. Meant to be extended and customized.",
  author: "CryptArtist Studio",
  authorUrl: "https://mattyjacks.com",
  license: "MIT",
  tags: ["minimal", "blank", "utilitarian", "extensible", "base"],
  baseTheme: "blank",
  colors: BLANK_COLORS,
  fonts: BLANK_FONTS,
  effects: BLANK_EFFECTS,
  spacing: BLANK_SPACING,
};

// ---------------------------------------------------------------------------
// Built-in Themes Registry
// ---------------------------------------------------------------------------

export const BUILTIN_THEMES: ThemeManifest[] = [PRIMORDIAL_THEME, BLANK_THEME];

// ---------------------------------------------------------------------------
// Theme Storage
// ---------------------------------------------------------------------------

export function getInstalledThemes(): InstalledExtension<ThemeManifest>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THEMES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveInstalledThemes(themes: InstalledExtension<ThemeManifest>[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEMES, JSON.stringify(themes));
  } catch (e) {
    logger.error("Themes", `Failed to save themes: ${e}`);
  }
}

export function getActiveThemeId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_THEME) || "primordial";
  } catch {
    return "primordial";
  }
}

export function setActiveThemeId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY_ACTIVE_THEME, id);
  } catch (e) {
    logger.error("Themes", `Failed to set active theme: ${e}`);
  }
}

// ---------------------------------------------------------------------------
// Theme Resolution (merge base + overrides)
// ---------------------------------------------------------------------------

export function resolveTheme(themeId: string): ThemeManifest {
  // Check built-in themes first
  const builtin = BUILTIN_THEMES.find((t) => t.id === themeId);
  if (builtin) return builtin;

  // Check installed themes
  const installed = getInstalledThemes();
  const custom = installed.find((t) => t.manifest.id === themeId);
  if (!custom) return PRIMORDIAL_THEME;

  // Resolve base theme, then merge
  const base = resolveTheme(custom.manifest.baseTheme);
  return mergeThemes(base, custom.manifest);
}

function mergeThemes(base: ThemeManifest, override: ThemeManifest): ThemeManifest {
  return {
    ...override,
    colors: { ...base.colors, ...override.colors },
    fonts: { ...base.fonts, ...override.fonts },
    spacing: { ...base.spacing, ...override.spacing },
    effects: { ...base.effects, ...override.effects },
    custom: { ...(base.custom || {}), ...(override.custom || {}) },
  };
}

// ---------------------------------------------------------------------------
// Apply Theme to DOM
// ---------------------------------------------------------------------------

export function applyTheme(themeId?: string): void {
  const id = themeId || getActiveThemeId();
  const theme = resolveTheme(id);
  const root = document.documentElement;

  // Colors
  if (theme.colors.bgPrimary) root.style.setProperty("--bg-primary", theme.colors.bgPrimary);
  if (theme.colors.bgSecondary) root.style.setProperty("--bg-secondary", theme.colors.bgSecondary);
  if (theme.colors.bgPanel) root.style.setProperty("--bg-panel", theme.colors.bgPanel);
  if (theme.colors.bgSurface) root.style.setProperty("--bg-surface", theme.colors.bgSurface);
  if (theme.colors.bgElevated) root.style.setProperty("--bg-elevated", theme.colors.bgElevated);
  if (theme.colors.bgHover) root.style.setProperty("--bg-hover", theme.colors.bgHover);
  if (theme.colors.borderSubtle) root.style.setProperty("--border-subtle", theme.colors.borderSubtle);
  if (theme.colors.borderDefault) root.style.setProperty("--border-default", theme.colors.borderDefault);
  if (theme.colors.borderBright) root.style.setProperty("--border-bright", theme.colors.borderBright);
  if (theme.colors.textPrimary) root.style.setProperty("--text-primary", theme.colors.textPrimary);
  if (theme.colors.textSecondary) root.style.setProperty("--text-secondary", theme.colors.textSecondary);
  if (theme.colors.textMuted) root.style.setProperty("--text-muted", theme.colors.textMuted);
  if (theme.colors.accentPrimary) root.style.setProperty("--accent-cyan", theme.colors.accentPrimary);
  if (theme.colors.accentSecondary) root.style.setProperty("--accent-purple", theme.colors.accentSecondary);
  if (theme.colors.accentTertiary) root.style.setProperty("--accent-red", theme.colors.accentTertiary);
  if (theme.colors.success) root.style.setProperty("--accent-green", theme.colors.success);
  if (theme.colors.warning) root.style.setProperty("--accent-yellow", theme.colors.warning);
  if (theme.colors.danger) root.style.setProperty("--accent-red", theme.colors.danger);

  // Fonts
  if (theme.fonts?.sans) root.style.setProperty("--font-sans", theme.fonts.sans);
  if (theme.fonts?.mono) root.style.setProperty("--font-mono", theme.fonts.mono);
  if (theme.fonts?.baseSizePx) root.style.setProperty("--font-base-size", `${theme.fonts.baseSizePx}px`);

  // Effects
  if (theme.effects) {
    root.style.setProperty("--glass-bg", theme.effects.glassEnabled
      ? `rgba(14, 14, 26, ${theme.effects.glassOpacity || 0.85})`
      : theme.colors.bgPanel || "#0e0e1a");
    root.style.setProperty("--glass-blur", theme.effects.glassEnabled
      ? (theme.effects.glassBlur || "12px")
      : "0px");
    if (theme.effects.selectionColor) root.style.setProperty("--selection-color", theme.effects.selectionColor);

    // Toggle animation class on body
    if (theme.effects.animationsEnabled === false) {
      document.body.classList.add("no-animations");
    } else {
      document.body.classList.remove("no-animations");
    }

    // Scrollbar style
    if (theme.effects.scrollbarStyle === "hidden") {
      document.body.classList.add("scrollbar-hidden");
    } else {
      document.body.classList.remove("scrollbar-hidden");
    }
  }

  // Spacing
  if (theme.spacing) {
    if (theme.spacing.panelPadding) root.style.setProperty("--panel-padding", theme.spacing.panelPadding);
    if (theme.spacing.cardRadius) root.style.setProperty("--card-radius", theme.spacing.cardRadius);
    if (theme.spacing.gap) root.style.setProperty("--theme-gap", theme.spacing.gap);
  }

  // Custom CSS variables
  if (theme.custom) {
    Object.entries(theme.custom).forEach(([key, value]) => {
      if (key.startsWith("--") && value) root.style.setProperty(key, value);
    });
  }

  setActiveThemeId(id);
  logger.action("Themes", `Applied theme: ${theme.name} (${id})`);
}

// ---------------------------------------------------------------------------
// Install Theme from ZIP
// ---------------------------------------------------------------------------

export async function installThemeFromZip(file: File): Promise<{
  success: boolean;
  message: string;
  theme?: ThemeManifest;
}> {
  try {
    const entries = await parseZipFile(file);
    const manifest = await extractManifest<ThemeManifest>(entries, "theme");

    if (!manifest) {
      return { success: false, message: "Invalid theme ZIP: missing or malformed manifest.json with type 'theme'" };
    }

    // Validate required fields
    if (!manifest.colors) {
      return { success: false, message: "Theme manifest is missing required 'colors' object" };
    }

    // Check for conflicts
    if (BUILTIN_THEMES.some((t) => t.id === manifest.id)) {
      return { success: false, message: `Cannot overwrite built-in theme '${manifest.id}'` };
    }

    const installed = getInstalledThemes();
    const existingIdx = installed.findIndex((t) => t.manifest.id === manifest.id);

    const record: InstalledExtension<ThemeManifest> = {
      manifest,
      installedAt: new Date().toISOString(),
      enabled: true,
      zipSize: file.size,
      filesCount: entries.filter((e) => !e.isDirectory).length,
    };

    if (existingIdx >= 0) {
      installed[existingIdx] = record;
    } else {
      installed.push(record);
    }

    saveInstalledThemes(installed);
    logger.action("Themes", `Installed theme: ${manifest.name} v${manifest.version} (${formatBytes(file.size)})`);
    return { success: true, message: `Theme '${manifest.name}' installed successfully!`, theme: manifest };
  } catch (e) {
    return { success: false, message: `Failed to install theme: ${e}` };
  }
}

// ---------------------------------------------------------------------------
// Uninstall Theme
// ---------------------------------------------------------------------------

export function uninstallTheme(themeId: string): boolean {
  if (BUILTIN_THEMES.some((t) => t.id === themeId)) return false;

  const installed = getInstalledThemes();
  const filtered = installed.filter((t) => t.manifest.id !== themeId);
  if (filtered.length === installed.length) return false;

  saveInstalledThemes(filtered);

  // If this was the active theme, fall back to Primordial
  if (getActiveThemeId() === themeId) {
    applyTheme("primordial");
  }

  logger.action("Themes", `Uninstalled theme: ${themeId}`);
  return true;
}

// ---------------------------------------------------------------------------
// Clone Theme (for creating new themes based on existing ones)
// ---------------------------------------------------------------------------

export function cloneTheme(sourceId: string, newId: string, newName: string): ThemeManifest {
  const source = resolveTheme(sourceId);
  return {
    ...source,
    id: newId,
    name: newName,
    baseTheme: sourceId,
    version: "1.0.0",
    description: `Custom theme based on ${source.name}`,
    author: "User",
    tags: ["custom", ...(source.tags || [])],
    createdAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Get Random Installed Theme
// ---------------------------------------------------------------------------

export function getRandomThemeId(): string {
  const all = [...BUILTIN_THEMES.map((t) => t.id), ...getInstalledThemes().map((t) => t.manifest.id)];
  return all[Math.floor(Math.random() * all.length)] || "primordial";
}

// ---------------------------------------------------------------------------
// Get All Available Themes (built-in + installed)
// ---------------------------------------------------------------------------

export function getAllThemes(): ThemeManifest[] {
  const installed = getInstalledThemes().map((t) => t.manifest);
  return [...BUILTIN_THEMES, ...installed];
}
