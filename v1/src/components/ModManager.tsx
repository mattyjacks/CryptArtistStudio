/* Wave2: type=button applied */
// ---------------------------------------------------------------------------
// CryptArtist Studio - Mod Manager Component
// Install, enable/disable, and remove mods (self-contained programs) from ZIP files
// ---------------------------------------------------------------------------

import { useState, useRef } from "react";
import { toast } from "../utils/toast";
import { formatBytes } from "../utils/extensions";
import {
  getInstalledMods,
  installModFromZip,
  uninstallMod,
  toggleMod,
  getModRoute,
} from "../utils/mods";

export default function ModManager() {
  const [installed, setInstalled] = useState(getInstalledMods);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleInstall = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      toast.error("Please select a .zip file");
      return;
    }
    const result = await installModFromZip(file);
    if (result.success) {
      toast.success(result.message);
      setInstalled(getInstalledMods());
    } else {
      toast.error(result.message);
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleToggle = (id: string, enabled: boolean) => {
    toggleMod(id, enabled);
    setInstalled(getInstalledMods());
  };

  const handleUninstall = (id: string, name: string) => {
    if (uninstallMod(id)) {
      toast.success(`Mod '${name}' uninstalled`);
      setInstalled(getInstalledMods());
    }
  };

  return (
    <div className="max-w-2xl">
            {/* Improvement 511: Screen Reader Accessibility */}
      <h2 role="heading" aria-level={2} className="text-lg font-bold mb-1">{"\u{1F680}"} Mods</h2>
      <p className="text-[11px] text-studio-muted mb-4">
        Install mods to add entirely new self-contained programs to CryptArtist Studio.
        Mods use the existing infrastructure (UI framework, Tauri backend, utilities) to deliver major new functionality.
        Distributed as <code className="inline-code">.zip</code> files.
      </p>

      {/* Actions bar */}
      <div className="flex items-center gap-2 mb-4">
        <label className="btn btn-cyan text-[10px] px-3 py-1.5 cursor-pointer">
          {"\u{1F4E5}"} Install Mod (.zip)
          <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleInstall} />
        </label>
        <span className="text-[10px] text-studio-muted">
          {installed.length} mod{installed.length !== 1 ? "s" : ""} installed
          {" - "}{installed.filter((m) => m.enabled).length} enabled
        </span>
      </div>

      {/* Installed mods list */}
      {installed.length > 0 ? (
        <div className="flex flex-col gap-3 mb-4">
          {installed.map((ext) => {
            const m = ext.manifest;
            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition-all ${
                  ext.enabled
                    ? "bg-studio-surface border-studio-border"
                    : "bg-studio-bg border-studio-border opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="text-2xl shrink-0 w-10 h-10 rounded-xl bg-studio-bg border border-studio-border flex items-center justify-center">
                    {m.programIcon || "\u{1F9E9}"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-studio-text">{m.programName}</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded bg-studio-purple/10 border border-studio-purple/20 text-studio-purple font-semibold">
                        MOD
                      </span>
                      <span className="text-[8px] text-studio-muted">v{m.version}</span>
                      {m.programShortCode && (
                        <span className="text-[7px] px-1 py-0.5 rounded bg-studio-bg border border-studio-border text-studio-muted font-mono">
                          {m.programShortCode}
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-studio-muted mt-0.5">{m.description}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] mt-2">
                      <div><span className="text-studio-muted">Author:</span> <span className="text-studio-text">{m.author}</span></div>
                      <div><span className="text-studio-muted">Size:</span> <span className="text-studio-text">{formatBytes(ext.zipSize)}</span></div>
                      <div><span className="text-studio-muted">Route:</span> <span className="text-studio-text font-mono">{getModRoute(m)}</span></div>
                      <div><span className="text-studio-muted">Files:</span> <span className="text-studio-text">{ext.filesCount}</span></div>
                      <div><span className="text-studio-muted">Installed:</span> <span className="text-studio-text">{new Date(ext.installedAt).toLocaleDateString()}</span></div>
                      {m.license && <div><span className="text-studio-muted">License:</span> <span className="text-studio-text">{m.license}</span></div>}
                    </div>
                    {/* Permissions */}
                    {m.permissions && m.permissions.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-2">
                        {m.permissions.map((p) => (
                          <span key={p} className="text-[8px] px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                    {/* Tags */}
                    {m.tags && m.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {m.tags.map((tag) => (
                          <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded bg-studio-bg border border-studio-border text-studio-muted">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {/* Enable/disable toggle */}
                    <button type="button"
                      onClick={() => handleToggle(m.id, !ext.enabled)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${ext.enabled ? "bg-studio-cyan" : "bg-studio-border"}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${ext.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                    <span className="text-[8px] text-studio-muted">{ext.enabled ? "Enabled" : "Disabled"}</span>
                    <button type="button"
                      onClick={() => handleUninstall(m.id, m.programName)}
                      className="btn text-[9px] px-2 py-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      Uninstall
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-studio-muted">
          <div className="text-3xl mb-2">{"\u{1F680}"}</div>
          <div className="text-[11px]">No mods installed yet.</div>
          <div className="text-[9px] mt-1">Install mods from .zip files to add new programs to the suite.</div>
        </div>
      )}

      {/* How mods differ from plugins */}
      <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
        <div className="text-[11px] font-semibold text-studio-text mb-2">{"\u{2753}"} Mods vs Plugins</div>
        <div className="text-[9px] text-studio-muted space-y-1">
          <p><strong className="text-studio-text">Plugins</strong> add features to existing programs (effects, filters, tools, panels).</p>
          <p><strong className="text-studio-text">Mods</strong> are entire self-contained programs that appear in the Suite Launcher alongside the built-in programs.</p>
          <p><strong className="text-studio-text">Themes</strong> change only visual appearance (colors, fonts, effects).</p>
        </div>
      </div>

      {/* Mod ZIP format info */}
      <div className="p-4 rounded-xl bg-studio-bg border border-studio-border">
        <div className="text-[11px] font-semibold text-studio-text mb-2">{"\u{1F4E6}"} Mod ZIP Format</div>
        <div className="text-[9px] text-studio-muted space-y-1">
          <p>A mod ZIP must contain a <code className="inline-code">manifest.json</code> at the root with:</p>
          <pre className="p-2 rounded bg-studio-surface border border-studio-border text-[8px] mt-1 overflow-x-auto">
{`{
  "type": "mod",
  "id": "my-awesome-mod",
  "name": "My Awesome Mod",
  "version": "1.0.0",
  "description": "A new program for CryptArtist Studio",
  "author": "Your Name",
  "programId": "awesome-tool",
  "programName": "Awesome Tool",
  "programIcon": "\u{1F6E0}\uFE0F",
  "programShortCode": "AWE",
  "entry": "index.tsx",
  "permissions": ["filesystem", "network"]
}`}
          </pre>
          <p className="mt-2">
            The <code className="inline-code">programId</code> must be unique and not conflict with built-in programs.
            Enabled mods appear in the Suite Launcher automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
