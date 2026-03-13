// ---------------------------------------------------------------------------
// CryptArtist Studio - Plugin System
// ZIP-based plugins that add effects, features, panels, and integrations
// ---------------------------------------------------------------------------

import type {
  PluginManifest,
  InstalledExtension,
  PluginSetting,
} from "./extensions";
import {
  STORAGE_KEY_PLUGINS,
  extractManifest,
  parseZipFile,
  formatBytes,
} from "./extensions";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Plugin Storage
// ---------------------------------------------------------------------------

export function getInstalledPlugins(): InstalledExtension<PluginManifest>[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PLUGINS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveInstalledPlugins(plugins: InstalledExtension<PluginManifest>[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_PLUGINS, JSON.stringify(plugins));
  } catch (e) {
    logger.error("Plugins", `Failed to save plugins: ${e}`);
  }
}

// ---------------------------------------------------------------------------
// Install Plugin from ZIP
// ---------------------------------------------------------------------------

export async function installPluginFromZip(file: File): Promise<{
  success: boolean;
  message: string;
  plugin?: PluginManifest;
}> {
  try {
    const entries = await parseZipFile(file);
    const manifest = await extractManifest<PluginManifest>(entries, "plugin");

    if (!manifest) {
      return { success: false, message: "Invalid plugin ZIP: missing or malformed manifest.json with type 'plugin'" };
    }

    if (!manifest.entry) {
      return { success: false, message: "Plugin manifest is missing required 'entry' field" };
    }

    if (!manifest.category) {
      return { success: false, message: "Plugin manifest is missing required 'category' field" };
    }

    // Check that entry file exists in ZIP
    const entryFile = entries.find(
      (e) => e.name === manifest.entry || e.name.endsWith(`/${manifest.entry}`)
    );
    if (!entryFile) {
      return { success: false, message: `Plugin entry file '${manifest.entry}' not found in ZIP` };
    }

    // Check dependencies
    if (manifest.dependencies && manifest.dependencies.length > 0) {
      const installed = getInstalledPlugins();
      const missing = manifest.dependencies.filter(
        (dep) => !installed.some((p) => p.manifest.id === dep && p.enabled)
      );
      if (missing.length > 0) {
        return { success: false, message: `Missing dependencies: ${missing.join(", ")}` };
      }
    }

    const installed = getInstalledPlugins();
    const existingIdx = installed.findIndex((p) => p.manifest.id === manifest.id);

    // Build default settings values
    const settingsValues: Record<string, string | number | boolean> = {};
    if (manifest.settings) {
      manifest.settings.forEach((s: PluginSetting) => {
        settingsValues[s.key] = s.default;
      });
    }

    const record: InstalledExtension<PluginManifest> = {
      manifest,
      installedAt: new Date().toISOString(),
      enabled: true,
      zipSize: file.size,
      filesCount: entries.filter((e) => !e.isDirectory).length,
      settingsValues,
    };

    if (existingIdx >= 0) {
      // Preserve user settings on update
      const existing = installed[existingIdx];
      if (existing.settingsValues) {
        Object.entries(existing.settingsValues).forEach(([key, val]) => {
          if (key in settingsValues) {
            record.settingsValues![key] = val;
          }
        });
      }
      installed[existingIdx] = record;
    } else {
      installed.push(record);
    }

    saveInstalledPlugins(installed);
    logger.action("Plugins", `Installed plugin: ${manifest.name} v${manifest.version} [${manifest.category}] (${formatBytes(file.size)})`);
    return { success: true, message: `Plugin '${manifest.name}' installed successfully!`, plugin: manifest };
  } catch (e) {
    return { success: false, message: `Failed to install plugin: ${e}` };
  }
}

// ---------------------------------------------------------------------------
// Uninstall Plugin
// ---------------------------------------------------------------------------

export function uninstallPlugin(pluginId: string): boolean {
  const installed = getInstalledPlugins();
  const filtered = installed.filter((p) => p.manifest.id !== pluginId);
  if (filtered.length === installed.length) return false;

  // Check if other plugins depend on this one
  const dependents = filtered.filter(
    (p) => p.manifest.dependencies?.includes(pluginId)
  );
  if (dependents.length > 0) {
    logger.warn("Plugins", `Warning: ${dependents.map((d) => d.manifest.name).join(", ")} depend on ${pluginId}`);
  }

  saveInstalledPlugins(filtered);
  logger.action("Plugins", `Uninstalled plugin: ${pluginId}`);
  return true;
}

// ---------------------------------------------------------------------------
// Enable / Disable Plugin
// ---------------------------------------------------------------------------

export function togglePlugin(pluginId: string, enabled: boolean): boolean {
  const installed = getInstalledPlugins();
  const plugin = installed.find((p) => p.manifest.id === pluginId);
  if (!plugin) return false;

  plugin.enabled = enabled;
  saveInstalledPlugins(installed);
  logger.action("Plugins", `${enabled ? "Enabled" : "Disabled"} plugin: ${plugin.manifest.name}`);
  return true;
}

// ---------------------------------------------------------------------------
// Update Plugin Setting
// ---------------------------------------------------------------------------

export function updatePluginSetting(
  pluginId: string,
  key: string,
  value: string | number | boolean
): boolean {
  const installed = getInstalledPlugins();
  const plugin = installed.find((p) => p.manifest.id === pluginId);
  if (!plugin) return false;

  if (!plugin.settingsValues) plugin.settingsValues = {};
  plugin.settingsValues[key] = value;
  saveInstalledPlugins(installed);
  return true;
}

// ---------------------------------------------------------------------------
// Get Plugins by Category
// ---------------------------------------------------------------------------

export function getPluginsByCategory(category: string): InstalledExtension<PluginManifest>[] {
  return getInstalledPlugins().filter(
    (p) => p.manifest.category === category && p.enabled
  );
}

// ---------------------------------------------------------------------------
// Get Plugins for a Program
// ---------------------------------------------------------------------------

export function getPluginsForProgram(programId: string): InstalledExtension<PluginManifest>[] {
  return getInstalledPlugins().filter(
    (p) =>
      p.enabled &&
      (!p.manifest.programs || p.manifest.programs.length === 0 || p.manifest.programs.includes(programId))
  );
}

// ---------------------------------------------------------------------------
// Plugin Category Labels
// ---------------------------------------------------------------------------

export const PLUGIN_CATEGORY_LABELS: Record<string, string> = {
  effect: "Effects",
  filter: "Filters",
  transition: "Transitions",
  generator: "Generators",
  panel: "Panels",
  tool: "Tools",
  integration: "Integrations",
  language: "Languages",
  "ai-model": "AI Models",
  export: "Exporters",
  import: "Importers",
  utility: "Utilities",
  other: "Other",
};

// ---------------------------------------------------------------------------
// Plugin Permission Labels
// ---------------------------------------------------------------------------

export const PLUGIN_PERMISSION_LABELS: Record<string, string> = {
  filesystem: "File System Access",
  network: "Network Access",
  clipboard: "Clipboard Access",
  notifications: "Notifications",
  ai: "AI / LLM Access",
  media: "Media Processing",
  "system-info": "System Information",
};
