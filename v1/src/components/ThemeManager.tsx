/* Wave2: select-aria */
/* Wave2: type=button applied */
// ---------------------------------------------------------------------------
// CryptArtist Studio - Theme Manager Component
// Install, preview, switch, and create themes from ZIP files
// ---------------------------------------------------------------------------

import { useState, useRef } from "react";
import { toast } from "../utils/toast";
import type { ThemeManifest } from "../utils/extensions";
import { formatBytes } from "../utils/extensions";
import {
  BUILTIN_THEMES,
  getInstalledThemes,
  getActiveThemeId,
  applyTheme,
  installThemeFromZip,
  uninstallTheme,
  cloneTheme,
  getRandomThemeId,
  getAllThemes,
  saveInstalledThemes,
} from "../utils/themes";
import type { InstalledExtension } from "../utils/extensions";

export default function ThemeManager() {
  const [activeId, setActiveId] = useState(getActiveThemeId);
  const [installed, setInstalled] = useState(getInstalledThemes);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [baseThemeId, setBaseThemeId] = useState("primordial");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const allThemes = getAllThemes();

  const handleInstall = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      toast.error("Please select a .zip file");
      return;
    }
    const result = await installThemeFromZip(file);
    if (result.success) {
      toast.success(result.message);
      setInstalled(getInstalledThemes());
    } else {
      toast.error(result.message);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleActivate = (id: string) => {
    applyTheme(id);
    setActiveId(id);
    setPreviewId(null);
    toast.success(`Theme '${allThemes.find((t) => t.id === id)?.name || id}' activated`);
  };

  const handlePreview = (id: string) => {
    applyTheme(id);
    setPreviewId(id);
  };

  const handleCancelPreview = () => {
    if (previewId) {
      applyTheme(activeId);
      setPreviewId(null);
    }
  };

  const handleUninstall = (id: string) => {
    if (uninstallTheme(id)) {
      toast.success("Theme uninstalled");
      setInstalled(getInstalledThemes());
      if (activeId === id) setActiveId("primordial");
    }
  };

  const handleCreateTheme = () => {
    if (!newName.trim()) {
      toast.error("Enter a name for your theme");
      return;
    }
    const id = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!id) {
      toast.error("Invalid theme name");
      return;
    }
    if (allThemes.some((t) => t.id === id)) {
      toast.error(`Theme ID '${id}' already exists`);
      return;
    }

    const newTheme = cloneTheme(baseThemeId, id, newName.trim());
    const record: InstalledExtension<ThemeManifest> = {
      manifest: newTheme,
      installedAt: new Date().toISOString(),
      enabled: true,
      zipSize: 0,
      filesCount: 0,
    };
    const updated = [...installed, record];
    saveInstalledThemes(updated);
    setInstalled(updated);
    setCreating(false);
    setNewName("");
    toast.success(`Theme '${newName.trim()}' created from ${allThemes.find((t) => t.id === baseThemeId)?.name || baseThemeId}`);
  };

  const handleRandomBase = () => {
    setBaseThemeId(getRandomThemeId());
  };

  const isBuiltin = (id: string) => BUILTIN_THEMES.some((t) => t.id === id);

  return (
    <div className="max-w-2xl">
            {/* Improvement 544: Screen Reader Accessibility */}
      <h2 role="heading" aria-level={2} className="text-lg font-bold mb-1">{"\u{1F3A8}"} Themes</h2>
      <p className="text-[11px] text-studio-muted mb-4">
        Install, create, and switch between visual themes. Themes change colors, fonts, and visual effects.
        Install themes from <code className="inline-code">.zip</code> files or create new ones from existing themes.
      </p>

      {/* Actions bar */}
      <div className="flex items-center gap-2 mb-4">
        <label className="btn btn-cyan text-[10px] px-3 py-1.5 cursor-pointer">
          {"\u{1F4E5}"} Install Theme (.zip)
          <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleInstall} />
        </label>
            {/* Improvement 545: A11y & Microinteraction */}
        <button onClick={() => setCreating(!creating)} className="transition-transform active:scale-95 btn text-[10px] px-3 py-1.5">
          {creating ? "\u2715 Cancel" : "\u2795 Create New Theme"}
        </button>
      </div>

      {/* Create new theme panel */}
      {creating && (
        <div className="p-4 rounded-xl bg-studio-surface border border-studio-cyan/20 mb-4 animate-fade-in">
          <div className="text-[12px] font-semibold text-studio-text mb-3">Create New Theme</div>
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-[10px] text-studio-muted block mb-1">Theme Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="input text-[11px] py-1.5 w-full"
                placeholder="My Custom Theme..."
                maxLength={64}
              />
            </div>
            <div>
              <label className="text-[10px] text-studio-muted block mb-1">
                Clone From Base Theme
            {/* Improvement 546: A11y & Microinteraction */}
                <button onClick={handleRandomBase} className="transition-transform active:scale-95 ml-2 text-studio-cyan hover:underline text-[9px]">
                  {"\u{1F3B2}"} Random
                </button>
              </label>
              <select aria-label="Select option"
                value={baseThemeId}
                onChange={(e) => setBaseThemeId(e.target.value)}
                className="input text-[11px] py-1.5 w-full"
              >
                {allThemes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} {t.id === "primordial" ? "(Default)" : t.id === "blank" ? "(Bare-bones)" : ""}
                  </option>
                ))}
              </select>
              <div className="text-[9px] text-studio-muted mt-1">
                Your new theme starts as a clone of the selected base. "Primordial" is the cosmic default, "Blank" is the utilitarian base.
              </div>
            </div>
            {/* Improvement 547: A11y & Microinteraction */}
            <button onClick={handleCreateTheme} className="transition-transform active:scale-95 btn btn-cyan text-[10px] px-4 py-1.5 self-start">
              Create Theme
            </button>
          </div>
        </div>
      )}

      {/* Active theme indicator */}
      <div className="p-3 rounded-xl bg-studio-cyan/5 border border-studio-cyan/20 mb-4 flex items-center gap-3">
        <span className="text-lg">{"\u2713"}</span>
        <div>
          <div className="text-[11px] font-semibold text-studio-cyan">
            Active: {allThemes.find((t) => t.id === activeId)?.name || activeId}
          </div>
          <div className="text-[9px] text-studio-muted">
            {allThemes.find((t) => t.id === activeId)?.description?.substring(0, 100) || ""}
          </div>
        </div>
        {previewId && (
          <button onClick={handleCancelPreview} className="transition-transform active:scale-95 ml-auto btn text-[9px] px-2 py-1 border-yellow-500/30 text-yellow-400">
            Cancel Preview
          </button>
        )}
      </div>

      {/* Built-in themes */}
      <div className="text-[11px] font-semibold text-studio-text mb-2">Built-in Themes</div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {BUILTIN_THEMES.map((theme) => (
          <div
            key={theme.id}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeId === theme.id
                ? "bg-studio-cyan/10 border-studio-cyan/30"
                : "bg-studio-surface border-studio-border hover:border-studio-cyan/20"
            }`}
            onClick={() => handleActivate(theme.id)}
            onMouseEnter={() => { if (activeId !== theme.id) handlePreview(theme.id); }}
            onMouseLeave={handleCancelPreview}
          >
            {/* Color swatches */}
            <div className="flex gap-1 mb-2">
              {[
                theme.colors.bgPrimary,
                theme.colors.bgPanel,
                theme.colors.bgSurface,
                theme.colors.accentPrimary,
                theme.colors.accentSecondary,
                theme.colors.textPrimary,
              ].filter(Boolean).map((c, i) => (
                <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ background: c }} />
              ))}
            </div>
            <div className="text-[12px] font-semibold text-studio-text">{theme.name}</div>
            <div className="text-[9px] text-studio-muted mt-0.5 line-clamp-2">{theme.description}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              {theme.tags?.slice(0, 4).map((tag) => (
                <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded bg-studio-bg border border-studio-border text-studio-muted">{tag}</span>
              ))}
            </div>
            {activeId === theme.id && (
              <div className="text-[8px] text-studio-cyan font-semibold mt-2">{"\u2713"} Active</div>
            )}
          </div>
        ))}
      </div>

      {/* Installed themes */}
      {installed.length > 0 && (
        <>
          <div className="text-[11px] font-semibold text-studio-text mb-2">
            Installed Themes ({installed.length})
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {installed.map((ext) => (
              <div
                key={ext.manifest.id}
                className={`p-3 rounded-xl border transition-all ${
                  activeId === ext.manifest.id
                    ? "bg-studio-cyan/10 border-studio-cyan/30"
                    : "bg-studio-surface border-studio-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {/* Color swatches */}
                    <div className="flex gap-1 mb-1.5">
                      {[
                        ext.manifest.colors.bgPrimary,
                        ext.manifest.colors.bgPanel,
                        ext.manifest.colors.accentPrimary,
                        ext.manifest.colors.textPrimary,
                      ].filter(Boolean).map((c, i) => (
                        <div key={i} className="w-4 h-4 rounded-full border border-white/10" style={{ background: c }} />
                      ))}
                    </div>
                    <div className="text-[12px] font-semibold text-studio-text">{ext.manifest.name}</div>
                    <div className="text-[9px] text-studio-muted">
                      v{ext.manifest.version} by {ext.manifest.author}
                      {ext.zipSize > 0 && ` - ${formatBytes(ext.zipSize)}`}
                      {" - base: "}{ext.manifest.baseTheme}
                    </div>
                    <div className="text-[9px] text-studio-muted mt-0.5">{ext.manifest.description?.substring(0, 120)}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {activeId !== ext.manifest.id && (
                      <button type="button"
                        onClick={() => handleActivate(ext.manifest.id)}
                        className="btn btn-cyan text-[9px] px-2 py-1"
                      >
                        Activate
                      </button>
                    )}
                    {activeId === ext.manifest.id && (
                      <span className="text-[9px] text-studio-cyan font-semibold">{"\u2713"} Active</span>
                    )}
                    <button type="button"
                      onClick={() => handleUninstall(ext.manifest.id)}
                      className="btn text-[9px] px-2 py-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Theme ZIP format info */}
      <div className="p-4 rounded-xl bg-studio-bg border border-studio-border mt-2">
        <div className="text-[11px] font-semibold text-studio-text mb-2">{"\u{1F4E6}"} Theme ZIP Format</div>
        <div className="text-[9px] text-studio-muted space-y-1">
          <p>A theme ZIP must contain a <code className="inline-code">manifest.json</code> at the root with:</p>
          <pre className="p-2 rounded bg-studio-surface border border-studio-border text-[8px] mt-1 overflow-x-auto">
{`{
  "type": "theme",
  "id": "my-theme",
  "name": "My Theme",
  "version": "1.0.0",
  "description": "A custom theme",
  "author": "Your Name",
  "baseTheme": "primordial",
  "colors": {
    "bgPrimary": "#0a0a12",
    "accentPrimary": "#ff6600",
    "textPrimary": "#f0f0f0"
  },
  "fonts": { "sans": "Arial, sans-serif" },
  "effects": { "glowEnabled": true }
}`}
          </pre>
          <p className="mt-2">Only override the properties you want to change. Everything else inherits from <code className="inline-code">baseTheme</code>.</p>
        </div>
      </div>
    </div>
  );
}
