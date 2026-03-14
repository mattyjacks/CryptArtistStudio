// ---------------------------------------------------------------------------
// CryptArtist Studio - Mod System
// ZIP-based mods that are self-contained programs using the app infrastructure
// ---------------------------------------------------------------------------

import type {
  ModManifest,
  InstalledExtension,
} from "./extensions";
import {
  STORAGE_KEY_MODS,
  extractManifest,
  parseZipFile,
  formatBytes,
} from "./extensions";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Mod Storage
// ---------------------------------------------------------------------------

export function getInstalledMods(): InstalledExtension<ModManifest>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MODS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveInstalledMods(mods: InstalledExtension<ModManifest>[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_MODS, JSON.stringify(mods));
  } catch (e) {
    logger.error("Mods", `Failed to save mods: ${e}`);
  }
}

// ---------------------------------------------------------------------------
// Install Mod from ZIP
// ---------------------------------------------------------------------------

export async function installModFromZip(file: File): Promise<{
  success: boolean;
  message: string;
  mod?: ModManifest;
}> {
  try {
    const entries = await parseZipFile(file);
    const manifest = await extractManifest<ModManifest>(entries, "mod");

    if (!manifest) {
      return { success: false, message: "Invalid mod ZIP: missing or malformed manifest.json with type 'mod'" };
    }

    if (!manifest.programId) {
      return { success: false, message: "Mod manifest is missing required 'programId' field" };
    }

    if (!manifest.programName) {
      return { success: false, message: "Mod manifest is missing required 'programName' field" };
    }

    if (!manifest.entry) {
      return { success: false, message: "Mod manifest is missing required 'entry' field" };
    }

    // Validate programId format
    if (!/^[a-z0-9][a-z0-9-]{0,31}$/.test(manifest.programId)) {
      return { success: false, message: "Mod programId must be lowercase alphanumeric with hyphens, 1-32 chars" };
    }

    // Prevent conflicts with built-in program IDs
    const BUILTIN_IDS = [
      "media-mogul", "vibecode-worker", "demo-recorder",
      "valley-net", "game-studio", "commander",
      "settings", "donate-personal-seconds", "clone-tool",
      "dictate-pic", "luck-factory", "suite-launcher",
    ];
    if (BUILTIN_IDS.includes(manifest.programId)) {
      return { success: false, message: `Cannot use reserved program ID '${manifest.programId}'` };
    }

    // Check that entry file exists in ZIP
    const entryFile = entries.find(
      (e) => e.name === manifest.entry || e.name.endsWith(`/${manifest.entry}`)
    );
    if (!entryFile) {
      return { success: false, message: `Mod entry file '${manifest.entry}' not found in ZIP` };
    }

    const installed = getInstalledMods();
    const existingIdx = installed.findIndex((m) => m.manifest.id === manifest.id);

    // Check for programId conflicts with other mods
    const idConflict = installed.find(
      (m) => m.manifest.programId === manifest.programId && m.manifest.id !== manifest.id
    );
    if (idConflict) {
      return { success: false, message: `Program ID '${manifest.programId}' is already used by mod '${idConflict.manifest.name}'` };
    }

    const record: InstalledExtension<ModManifest> = {
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

    saveInstalledMods(installed);
    logger.action("Mods", `Installed mod: ${manifest.programName} (${manifest.programId}) v${manifest.version} (${formatBytes(file.size)})`);
    return { success: true, message: `Mod '${manifest.programName}' installed successfully!`, mod: manifest };
  } catch (e) {
    return { success: false, message: `Failed to install mod: ${e}` };
  }
}

// ---------------------------------------------------------------------------
// Uninstall Mod
// ---------------------------------------------------------------------------

export function uninstallMod(modId: string): boolean {
  const installed = getInstalledMods();
  const filtered = installed.filter((m) => m.manifest.id !== modId);
  if (filtered.length === installed.length) return false;

  saveInstalledMods(filtered);
  logger.action("Mods", `Uninstalled mod: ${modId}`);
  return true;
}

// ---------------------------------------------------------------------------
// Enable / Disable Mod
// ---------------------------------------------------------------------------

export function toggleMod(modId: string, enabled: boolean): boolean {
  const installed = getInstalledMods();
  const mod = installed.find((m) => m.manifest.id === modId);
  if (!mod) return false;

  mod.enabled = enabled;
  saveInstalledMods(installed);
  logger.action("Mods", `${enabled ? "Enabled" : "Disabled"} mod: ${mod.manifest.programName}`);
  return true;
}

// ---------------------------------------------------------------------------
// Get Enabled Mods (for Suite Launcher integration)
// ---------------------------------------------------------------------------

export function getEnabledMods(): InstalledExtension<ModManifest>[] {
  return getInstalledMods().filter((m) => m.enabled);
}

// ---------------------------------------------------------------------------
// Get Mod Route
// ---------------------------------------------------------------------------

export function getModRoute(mod: ModManifest): string {
  return mod.route || `/mod-${mod.programId}`;
}

// ---------------------------------------------------------------------------
// Get Mod Program Entry for Suite Launcher
// ---------------------------------------------------------------------------

export interface ModProgramEntry {
  id: string;
  name: string;
  icon: string;
  shortCode: string;
  description: string;
  route: string;
  category: string;
  isMod: true;
  modId: string;
}

export function getModProgramEntries(): ModProgramEntry[] {
  return getEnabledMods().map((m) => ({
    id: m.manifest.programId,
    name: m.manifest.programName,
    icon: m.manifest.programIcon || "\u{1F9E9}",
    shortCode: m.manifest.programShortCode || m.manifest.programId.substring(0, 3).toUpperCase(),
    description: m.manifest.description,
    route: getModRoute(m.manifest),
    category: m.manifest.category || "mod",
    isMod: true as const,
    modId: m.manifest.id,
  }));
}
