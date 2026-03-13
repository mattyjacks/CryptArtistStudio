// ---------------------------------------------------------------------------
// CryptArtist Studio - Extension System Core Types
// Plugins, Mods, and Themes all use ZIP-based packaging
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Shared Manifest Base
// ---------------------------------------------------------------------------

export interface ExtensionManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  authorUrl?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  tags?: string[];
  minAppVersion?: string;
  icon?: string; // relative path inside ZIP
  readme?: string; // relative path inside ZIP
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Plugin Manifest (additions: effects, features, panels)
// ---------------------------------------------------------------------------

export interface PluginManifest extends ExtensionManifest {
  type: "plugin";
  category: PluginCategory;
  entry: string; // JS entry file relative to ZIP root
  programs?: string[]; // which programs this plugin targets (empty = all)
  permissions?: PluginPermission[];
  settings?: PluginSetting[];
  dependencies?: string[]; // other plugin IDs
}

export type PluginCategory =
  | "effect"
  | "filter"
  | "transition"
  | "generator"
  | "panel"
  | "tool"
  | "integration"
  | "language"
  | "ai-model"
  | "export"
  | "import"
  | "utility"
  | "other";

export type PluginPermission =
  | "filesystem"
  | "network"
  | "clipboard"
  | "notifications"
  | "ai"
  | "media"
  | "system-info";

export interface PluginSetting {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "select" | "color";
  default: string | number | boolean;
  options?: string[]; // for select type
  description?: string;
}

// ---------------------------------------------------------------------------
// Mod Manifest (self-contained programs using the infrastructure)
// ---------------------------------------------------------------------------

export interface ModManifest extends ExtensionManifest {
  type: "mod";
  programId: string; // unique route/ID for this mod program
  programName: string; // display name in Suite Launcher
  programIcon: string; // emoji or icon reference
  programShortCode: string; // 3-letter code
  entry: string; // main TSX/JS entry file
  route?: string; // custom route (default: /mod-{programId})
  category?: string; // launcher category tag
  permissions?: PluginPermission[];
  assets?: string[]; // relative paths to bundled assets
}

// ---------------------------------------------------------------------------
// Theme Manifest (visual customization)
// ---------------------------------------------------------------------------

export interface ThemeManifest extends ExtensionManifest {
  type: "theme";
  baseTheme: string; // which theme this extends ("primordial" | "blank" | other ID)
  preview?: string; // relative path to preview image inside ZIP
  colors: ThemeColors;
  fonts?: ThemeFonts;
  spacing?: ThemeSpacing;
  effects?: ThemeEffects;
  custom?: Record<string, string>; // custom CSS variables
}

export interface ThemeColors {
  bgPrimary?: string;
  bgSecondary?: string;
  bgPanel?: string;
  bgSurface?: string;
  bgElevated?: string;
  bgHover?: string;
  borderSubtle?: string;
  borderDefault?: string;
  borderBright?: string;
  textPrimary?: string;
  textSecondary?: string;
  textMuted?: string;
  accentPrimary?: string;
  accentSecondary?: string;
  accentTertiary?: string;
  success?: string;
  warning?: string;
  danger?: string;
  info?: string;
  // Additional named slots
  [key: string]: string | undefined;
}

export interface ThemeFonts {
  sans?: string;
  mono?: string;
  heading?: string;
  baseSizePx?: number;
  lineHeight?: number;
  letterSpacing?: string;
}

export interface ThemeSpacing {
  panelPadding?: string;
  cardRadius?: string;
  borderWidth?: string;
  gap?: string;
}

export interface ThemeEffects {
  glassEnabled?: boolean;
  glassOpacity?: number;
  glassBlur?: string;
  glowEnabled?: boolean;
  glowColor?: string;
  glowIntensity?: string;
  gradientText?: boolean;
  animationsEnabled?: boolean;
  scrollbarStyle?: "thin" | "default" | "hidden";
  selectionColor?: string;
}

// ---------------------------------------------------------------------------
// Installed Extension Record (stored in localStorage)
// ---------------------------------------------------------------------------

export interface InstalledExtension<M extends ExtensionManifest = ExtensionManifest> {
  manifest: M;
  installedAt: string;
  enabled: boolean;
  zipSize: number; // bytes
  filesCount: number;
  settingsValues?: Record<string, string | number | boolean>;
}

// ---------------------------------------------------------------------------
// Extension Registry Keys
// ---------------------------------------------------------------------------

export const STORAGE_KEY_PLUGINS = "cryptartist_plugins";
export const STORAGE_KEY_MODS = "cryptartist_mods";
export const STORAGE_KEY_THEMES = "cryptartist_themes";
export const STORAGE_KEY_ACTIVE_THEME = "cryptartist_active_theme";

// ---------------------------------------------------------------------------
// ZIP Utilities (browser-side, using JSZip-compatible ArrayBuffer parsing)
// ---------------------------------------------------------------------------

export interface ZipEntry {
  name: string;
  isDirectory: boolean;
  content: () => Promise<string>;
  contentBytes: () => Promise<Uint8Array>;
  size: number;
}

export async function parseZipFile(file: File): Promise<ZipEntry[]> {
  const buffer = await file.arrayBuffer();
  return parseZipBuffer(buffer);
}

export async function parseZipBuffer(buffer: ArrayBuffer): Promise<ZipEntry[]> {
  // Minimal ZIP parser - reads local file headers from a ZIP archive
  // Supports STORE (no compression) and provides raw content
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);
  const entries: ZipEntry[] = [];
  let offset = 0;

  const decoder = new TextDecoder("utf-8");

  while (offset < buffer.byteLength - 4) {
    const sig = view.getUint32(offset, true);
    // Local file header signature = 0x04034b50
    if (sig !== 0x04034b50) break;

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameBytes = uint8.slice(offset + 30, offset + 30 + nameLength);
    const name = decoder.decode(nameBytes);
    const dataStart = offset + 30 + nameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    const isDirectory = name.endsWith("/") || uncompressedSize === 0;

    const rawData = uint8.slice(dataStart, dataEnd);

    if (compressionMethod === 0) {
      // STORE - no compression
      entries.push({
        name,
        isDirectory,
        size: uncompressedSize,
        content: async () => decoder.decode(rawData),
        contentBytes: async () => rawData,
      });
    } else if (compressionMethod === 8) {
      // DEFLATE - use DecompressionStream if available
      const dataSlice = rawData;
      entries.push({
        name,
        isDirectory,
        size: uncompressedSize,
        content: async () => {
          try {
            const decompressed = await decompressDeflate(dataSlice);
            return decoder.decode(decompressed);
          } catch {
            return "[compressed - unable to decompress]";
          }
        },
        contentBytes: async () => {
          try {
            return await decompressDeflate(dataSlice);
          } catch {
            return new Uint8Array(0);
          }
        },
      });
    } else {
      // Unknown compression - skip
      entries.push({
        name,
        isDirectory,
        size: uncompressedSize,
        content: async () => `[unsupported compression method ${compressionMethod}]`,
        contentBytes: async () => new Uint8Array(0),
      });
    }

    offset = dataEnd;
  }

  return entries;
}

async function decompressDeflate(data: Uint8Array): Promise<Uint8Array> {
  // Use the browser's DecompressionStream API (raw deflate)
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DecompressionStream not available");
  }
  const ds = new DecompressionStream("deflate-raw" as CompressionFormat);
  const writer = ds.writable.getWriter();
  const reader = ds.readable.getReader();
  writer.write(data as unknown as BufferSource);
  writer.close();
  const chunks: Uint8Array[] = [];
  let totalLen = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLen += value.length;
  }
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Manifest Extraction
// ---------------------------------------------------------------------------

export async function extractManifest<M extends ExtensionManifest>(
  entries: ZipEntry[],
  expectedType: "plugin" | "mod" | "theme"
): Promise<M | null> {
  const manifestEntry = entries.find(
    (e) => e.name === "manifest.json" || e.name.endsWith("/manifest.json")
  );
  if (!manifestEntry) return null;

  try {
    const text = await manifestEntry.content();
    const parsed = JSON.parse(text);
    if (parsed.type !== expectedType) return null;
    if (!parsed.id || !parsed.name || !parsed.version) return null;
    return parsed as M;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function generateExtensionId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 64);
}

export function validateManifestId(id: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,63}$/.test(id);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
