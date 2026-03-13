// ---------------------------------------------------------------------------
// CryptArtist Studio - Plugin Manager Component
// Install, enable/disable, configure, and remove plugins from ZIP files
// ---------------------------------------------------------------------------

import { useState, useRef } from "react";
import { toast } from "../utils/toast";
import { formatBytes } from "../utils/extensions";
import {
  getInstalledPlugins,
  installPluginFromZip,
  uninstallPlugin,
  togglePlugin,
  updatePluginSetting,
  PLUGIN_CATEGORY_LABELS,
  PLUGIN_PERMISSION_LABELS,
} from "../utils/plugins";
import type { InstalledExtension, PluginManifest } from "../utils/extensions";

export default function PluginManager() {
  const [installed, setInstalled] = useState(getInstalledPlugins);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleInstall = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      toast.error("Please select a .zip file");
      return;
    }
    const result = await installPluginFromZip(file);
    if (result.success) {
      toast.success(result.message);
      setInstalled(getInstalledPlugins());
    } else {
      toast.error(result.message);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleToggle = (id: string, enabled: boolean) => {
    togglePlugin(id, enabled);
    setInstalled(getInstalledPlugins());
  };

  const handleUninstall = (id: string, name: string) => {
    if (uninstallPlugin(id)) {
      toast.success(`Plugin '${name}' uninstalled`);
      setInstalled(getInstalledPlugins());
      if (expandedId === id) setExpandedId(null);
    }
  };

  const handleSettingChange = (pluginId: string, key: string, value: string | number | boolean) => {
    updatePluginSetting(pluginId, key, value);
    setInstalled(getInstalledPlugins());
  };

  const categories = ["all", ...Object.keys(PLUGIN_CATEGORY_LABELS)];
  const filtered = filterCategory === "all"
    ? installed
    : installed.filter((p) => p.manifest.category === filterCategory);

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold mb-1">{"\u{1F9E9}"} Plugins</h2>
      <p className="text-[11px] text-studio-muted mb-4">
        Install plugins to add effects, filters, transitions, tools, and new features to CryptArtist Studio programs.
        Plugins are distributed as <code className="inline-code">.zip</code> files.
      </p>

      {/* Actions bar */}
      <div className="flex items-center gap-2 mb-4">
        <label className="btn btn-cyan text-[10px] px-3 py-1.5 cursor-pointer">
          {"\u{1F4E5}"} Install Plugin (.zip)
          <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleInstall} />
        </label>
        <span className="text-[10px] text-studio-muted">
          {installed.length} plugin{installed.length !== 1 ? "s" : ""} installed
          {" - "}{installed.filter((p) => p.enabled).length} enabled
        </span>
      </div>

      {/* Category filter */}
      {installed.length > 0 && (
        <div className="flex gap-1 mb-4 flex-wrap">
          {categories.map((cat) => {
            const count = cat === "all" ? installed.length : installed.filter((p) => p.manifest.category === cat).length;
            if (cat !== "all" && count === 0) return null;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`text-[9px] px-2 py-1 rounded-full border transition-colors ${
                  filterCategory === cat
                    ? "bg-studio-cyan/10 border-studio-cyan/30 text-studio-cyan"
                    : "border-studio-border text-studio-muted hover:text-studio-text"
                }`}
              >
                {cat === "all" ? "All" : PLUGIN_CATEGORY_LABELS[cat] || cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Installed plugins list */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2 mb-4">
          {filtered.map((ext) => (
            <PluginCard
              key={ext.manifest.id}
              ext={ext}
              expanded={expandedId === ext.manifest.id}
              onToggleExpand={() => setExpandedId(expandedId === ext.manifest.id ? null : ext.manifest.id)}
              onToggle={(enabled) => handleToggle(ext.manifest.id, enabled)}
              onUninstall={() => handleUninstall(ext.manifest.id, ext.manifest.name)}
              onSettingChange={(key, val) => handleSettingChange(ext.manifest.id, key, val)}
            />
          ))}
        </div>
      ) : installed.length > 0 ? (
        <div className="text-[11px] text-studio-muted text-center py-6">No plugins in this category.</div>
      ) : (
        <div className="text-center py-8 text-studio-muted">
          <div className="text-3xl mb-2">{"\u{1F9E9}"}</div>
          <div className="text-[11px]">No plugins installed yet.</div>
          <div className="text-[9px] mt-1">Install plugins from .zip files to extend CryptArtist Studio.</div>
        </div>
      )}

      {/* Plugin ZIP format info */}
      <div className="p-4 rounded-xl bg-studio-bg border border-studio-border mt-2">
        <div className="text-[11px] font-semibold text-studio-text mb-2">{"\u{1F4E6}"} Plugin ZIP Format</div>
        <div className="text-[9px] text-studio-muted space-y-1">
          <p>A plugin ZIP must contain a <code className="inline-code">manifest.json</code> at the root with:</p>
          <pre className="p-2 rounded bg-studio-surface border border-studio-border text-[8px] mt-1 overflow-x-auto">
{`{
  "type": "plugin",
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "description": "Adds a cool effect",
  "author": "Your Name",
  "category": "effect",
  "entry": "index.js",
  "programs": ["media-mogul"],
  "permissions": ["media"],
  "settings": [
    { "key": "intensity", "label": "Intensity",
      "type": "number", "default": 50 }
  ]
}`}
          </pre>
          <p className="mt-2">
            <strong>Categories:</strong> {Object.values(PLUGIN_CATEGORY_LABELS).join(", ")}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plugin Card Sub-Component
// ---------------------------------------------------------------------------

function PluginCard({
  ext,
  expanded,
  onToggleExpand,
  onToggle,
  onUninstall,
  onSettingChange,
}: {
  ext: InstalledExtension<PluginManifest>;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
  onSettingChange: (key: string, val: string | number | boolean) => void;
}) {
  const m = ext.manifest;

  return (
    <div className={`rounded-xl border transition-all ${
      ext.enabled
        ? "bg-studio-surface border-studio-border"
        : "bg-studio-bg border-studio-border opacity-60"
    }`}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggleExpand}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold text-studio-text truncate">{m.name}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-studio-bg border border-studio-border text-studio-muted">
              {PLUGIN_CATEGORY_LABELS[m.category] || m.category}
            </span>
            <span className="text-[8px] text-studio-muted">v{m.version}</span>
          </div>
          <div className="text-[9px] text-studio-muted truncate mt-0.5">{m.description}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Enable/disable toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onToggle(!ext.enabled); }}
            className={`w-9 h-5 rounded-full transition-colors relative ${ext.enabled ? "bg-studio-cyan" : "bg-studio-border"}`}
          >
            <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${ext.enabled ? "left-[18px]" : "left-[3px]"}`} />
          </button>
          <span className="text-[10px]">{expanded ? "\u25B2" : "\u25BC"}</span>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-studio-border pt-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[9px] mb-3">
            <div><span className="text-studio-muted">Author:</span> <span className="text-studio-text">{m.author}</span></div>
            <div><span className="text-studio-muted">Size:</span> <span className="text-studio-text">{formatBytes(ext.zipSize)}</span></div>
            <div><span className="text-studio-muted">Files:</span> <span className="text-studio-text">{ext.filesCount}</span></div>
            <div><span className="text-studio-muted">Installed:</span> <span className="text-studio-text">{new Date(ext.installedAt).toLocaleDateString()}</span></div>
            {m.license && <div><span className="text-studio-muted">License:</span> <span className="text-studio-text">{m.license}</span></div>}
            {m.programs && m.programs.length > 0 && (
              <div><span className="text-studio-muted">Programs:</span> <span className="text-studio-text">{m.programs.join(", ")}</span></div>
            )}
          </div>

          {/* Permissions */}
          {m.permissions && m.permissions.length > 0 && (
            <div className="mb-3">
              <div className="text-[9px] font-semibold text-studio-text mb-1">Permissions</div>
              <div className="flex gap-1 flex-wrap">
                {m.permissions.map((p) => (
                  <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                    {PLUGIN_PERMISSION_LABELS[p] || p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Settings */}
          {m.settings && m.settings.length > 0 && (
            <div className="mb-3">
              <div className="text-[9px] font-semibold text-studio-text mb-2">Settings</div>
              <div className="flex flex-col gap-2">
                {m.settings.map((setting) => {
                  const val = ext.settingsValues?.[setting.key] ?? setting.default;
                  return (
                    <div key={setting.key} className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-studio-text">{setting.label}</div>
                        {setting.description && <div className="text-[8px] text-studio-muted">{setting.description}</div>}
                      </div>
                      {setting.type === "boolean" ? (
                        <button
                          onClick={() => onSettingChange(setting.key, !val)}
                          className={`w-9 h-5 rounded-full transition-colors relative ${val ? "bg-studio-cyan" : "bg-studio-border"}`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full bg-white absolute top-[3px] transition-all ${val ? "left-[18px]" : "left-[3px]"}`} />
                        </button>
                      ) : setting.type === "select" ? (
                        <select
                          value={String(val)}
                          onChange={(e) => onSettingChange(setting.key, e.target.value)}
                          className="input text-[9px] py-1 w-32"
                        >
                          {setting.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : setting.type === "number" ? (
                        <input
                          type="number"
                          value={Number(val)}
                          onChange={(e) => onSettingChange(setting.key, parseFloat(e.target.value) || 0)}
                          className="input text-[9px] py-1 w-20 text-right"
                        />
                      ) : setting.type === "color" ? (
                        <input
                          type="color"
                          value={String(val)}
                          onChange={(e) => onSettingChange(setting.key, e.target.value)}
                          className="w-8 h-6 rounded border border-studio-border cursor-pointer"
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(val)}
                          onChange={(e) => onSettingChange(setting.key, e.target.value)}
                          className="input text-[9px] py-1 w-40"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {m.tags && m.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mb-3">
              {m.tags.map((tag) => (
                <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded bg-studio-bg border border-studio-border text-studio-muted">{tag}</span>
              ))}
            </div>
          )}

          {/* Uninstall */}
          <div className="flex justify-end">
            <button
              onClick={onUninstall}
              className="btn text-[9px] px-3 py-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              Uninstall
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
