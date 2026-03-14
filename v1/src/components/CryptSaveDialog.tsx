// ============================================================================
// CryptSaveDialog - Save dialog with anatomical terms for .Crypt components
// Presents checkboxes for each component (Bones, Flesh, Ashes, Brain, etc.)
// with file size estimates and Save All / Save Selected / Cancel buttons.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog } from "@tauri-apps/plugin-dialog";
import {
  CRYPT_COMPONENTS,
  createManifest,
  serializeManifest,
  formatBytes,
  estimateSaveTime,
  isValidCryptName,
  sanitizeCryptName,
  MAX_CRYPT_NAME_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  createMummyConfig,
  serializeMummyConfig,
  generateMummyBat,
  generateMummyPs1,
  generateMummySh,
  type CryptComponent,
  type CryptFolderName,
} from "../utils/crypt";
import { logger } from "../utils/logger";
import { toast } from "../utils/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComponentSelection {
  folder: CryptFolderName;
  checked: boolean;
  sizeBytes: number;
}

interface CryptSaveDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (filePath: string) => void;
  cryptName?: string;
  cryptDescription?: string;
  cryptAuthor?: string;
  /** Pre-populated content for specific folders: { "Skeleton/project.CryptArt": "json..." } */
  folderContents?: Record<string, string>;
  /** Existing .Crypt path for overwrite (null = new file) */
  existingPath?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CryptSaveDialog({
  open,
  onClose,
  onSaved,
  cryptName = "My Project",
  cryptDescription = "",
  cryptAuthor = "",
  folderContents = {},
  existingPath = null,
}: CryptSaveDialogProps) {
  const [selections, setSelections] = useState<ComponentSelection[]>([]);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(cryptName);
  const [description, setDescription] = useState(cryptDescription);
  const [author, setAuthor] = useState(cryptAuthor);
  const [curseMessage, setCurseMessage] = useState("");
  const [curseEnabled, setCurseEnabled] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [saveProgress, setSaveProgress] = useState(0);
  const [nameError, setNameError] = useState<string | null>(null);

  // Initialize selections from CRYPT_COMPONENTS
  useEffect(() => {
    if (!open) return;
    setName(cryptName);
    setDescription(cryptDescription);
    setAuthor(cryptAuthor);
    setTags([]);
    setTagInput("");
    setVersion("1.0.0");
    setSaveProgress(0);
    setNameError(null);

    const initial: ComponentSelection[] = CRYPT_COMPONENTS.map((comp) => {
      // Calculate size from folderContents
      let size = 0;
      for (const [key, value] of Object.entries(folderContents)) {
        if (key.startsWith(comp.folder + "/")) {
          size += new Blob([value]).size;
        }
      }
      return {
        folder: comp.folder,
        checked: comp.required || size > 0,
        sizeBytes: size,
      };
    });
    setSelections(initial);
  }, [open, cryptName, cryptDescription, cryptAuthor, folderContents]);

  const toggleComponent = useCallback((folder: CryptFolderName) => {
    setSelections((prev) =>
      prev.map((s) => {
        if (s.folder === folder) {
          // Cannot uncheck required components
          const comp = CRYPT_COMPONENTS.find((c) => c.folder === folder);
          if (comp?.required) return s;
          return { ...s, checked: !s.checked };
        }
        return s;
      })
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelections((prev) => prev.map((s) => ({ ...s, checked: true })));
  }, []);

  const deselectOptional = useCallback(() => {
    setSelections((prev) =>
      prev.map((s) => {
        const comp = CRYPT_COMPONENTS.find((c) => c.folder === s.folder);
        return comp?.required ? s : { ...s, checked: false };
      })
    );
  }, []);

  const handleNameChange = useCallback((val: string) => {
    setName(val);
    const result = isValidCryptName(val);
    setNameError(result.valid ? null : result.reason || "Invalid name");
  }, []);

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && tags.length < 20) {
      setTags((prev) => [...prev, trimmed]);
      setTagInput("");
    }
  }, [tagInput, tags]);

  const removeTag = useCallback((tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const totalSize = selections
    .filter((s) => s.checked)
    .reduce((sum, s) => sum + s.sizeBytes, 0);

  const checkedCount = selections.filter((s) => s.checked).length;

  // Save handler
  const handleSave = useCallback(async () => {
    const nameCheck = isValidCryptName(name);
    if (!nameCheck.valid) {
      toast.error(nameCheck.reason || "Invalid crypt name");
      return;
    }
    setSaving(true);
    setSaveProgress(5);
    try {
      let savePath = existingPath;

      if (!savePath) {
        const selected = await saveDialog({
          filters: [{ name: "CryptArtist Crypt", extensions: ["Crypt"] }],
          defaultPath: `${name}.Crypt`,
        });
        if (!selected) {
          setSaving(false);
          return;
        }
        savePath = selected;
      }

      // Build manifest
      setSaveProgress(10);
      const manifest = createManifest(name, {
        description,
        author,
        tags,
      });
      manifest.version = version;

      // Update contents summary
      const checkedFolders = selections.filter((s) => s.checked);
      manifest.contents = {};
      for (const sel of checkedFolders) {
        const entries = Object.keys(folderContents).filter((k) =>
          k.startsWith(sel.folder + "/")
        );
        manifest.contents[sel.folder.toLowerCase()] = {
          description: CRYPT_COMPONENTS.find((c) => c.folder === sel.folder)?.description || "",
          count: entries.length,
        };
      }

      manifest.metadata = {
        ...manifest.metadata,
        totalProjects: Object.keys(folderContents).filter((k) => k.startsWith("Skeleton/")).length,
        totalAssets: Object.keys(folderContents).filter((k) => k.startsWith("Grave/")).length,
      };

      const manifestJson = serializeManifest(manifest);
      setSaveProgress(20);

      // Create the .Crypt file
      await invoke("create_crypt", { path: savePath, manifestJson });
      setSaveProgress(30);

      // Add all checked folder contents
      const totalContentEntries = checkedFolders.reduce((sum, sel) => {
        return sum + Object.keys(folderContents).filter((k) => k.startsWith(sel.folder + "/")).length;
      }, 0);
      let addedCount = 0;
      for (const sel of checkedFolders) {
        for (const [entryPath, content] of Object.entries(folderContents)) {
          if (entryPath.startsWith(sel.folder + "/")) {
            await invoke("add_to_crypt", {
              cryptPath: savePath,
              entryPath,
              content,
            });
            addedCount++;
            setSaveProgress(30 + Math.floor((addedCount / Math.max(totalContentEntries, 1)) * 50));
          }
        }
      }

      // Populate Pyramid/ with Mummy scripts if checked
      const pyramidChecked = selections.find((s) => s.folder === "Pyramid")?.checked;
      if (pyramidChecked) {
        const cryptFileName = name.replace(/[^a-zA-Z0-9_-]/g, "_");
        const mummyConfig = createMummyConfig(name, author, curseMessage || undefined);
        mummyConfig.curse!.enabled = curseEnabled;
        await invoke("populate_pyramid", {
          cryptPath: savePath,
          mummyBat: generateMummyBat(cryptFileName),
          mummyPs1: generateMummyPs1(cryptFileName),
          mummySh: generateMummySh(cryptFileName),
          mummyJson: serializeMummyConfig(mummyConfig),
        });
        logger.action("CryptSaveDialog", `Pyramid/ populated with Mummy scripts`);
      }
      setSaveProgress(95);

      logger.action("CryptSaveDialog", `Saved .Crypt to: ${savePath}`);
      toast.success(`Saved Crypt: "${name}"`);
      onSaved?.(savePath);
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("CryptSaveDialog", `Save failed: ${msg}`);
      toast.error(`Failed to save .Crypt: ${msg}`);
    } finally {
      setSaving(false);
      setSaveProgress(0);
    }
  }, [name, description, author, version, tags, selections, folderContents, existingPath, onSaved, onClose, curseMessage, curseEnabled]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-studio-surface border border-studio-border rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-studio-border bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
          <h2 className="text-lg font-bold text-studio-text flex items-center gap-2">
            <span className="text-2xl">&#x26B0;&#xFE0F;</span>
            Save CryptArtist Crypt
          </h2>
          <p className="text-sm text-studio-text-muted mt-1">
            Select which components to entomb
          </p>
        </div>

        {/* Name / Description / Author */}
        <div className="px-6 py-3 border-b border-studio-border space-y-2">
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Crypt name..."
              maxLength={MAX_CRYPT_NAME_LENGTH}
              className={`w-full px-3 py-1.5 bg-studio-bg border rounded text-sm text-studio-text placeholder:text-studio-text-muted focus:outline-none ${nameError ? 'border-red-500 focus:border-red-400' : 'border-studio-border focus:border-purple-500'}`}
            />
            {nameError && <p className="text-[10px] text-red-400 mt-0.5">{nameError}</p>}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author..."
              className="flex-1 px-3 py-1.5 bg-studio-bg border border-studio-border rounded text-sm text-studio-text placeholder:text-studio-text-muted focus:outline-none focus:border-purple-500"
            />
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className="w-24 px-3 py-1.5 bg-studio-bg border border-studio-border rounded text-sm text-studio-text placeholder:text-studio-text-muted focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION_LENGTH))}
              placeholder="Description..."
              rows={2}
              className="w-full px-3 py-1.5 bg-studio-bg border border-studio-border rounded text-sm text-studio-text placeholder:text-studio-text-muted focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="text-[10px] text-studio-text-muted text-right">{description.length}/{MAX_DESCRIPTION_LENGTH}</div>
          </div>
          <div>
            <div className="flex gap-1 flex-wrap mb-1">
              {tags.map((tag) => (
                <span key={tag} className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-purple-400 hover:text-purple-200">x</button>
                </span>
              ))}
            </div>
            <div className="flex gap-1">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder={tags.length >= 20 ? 'Max 20 tags' : 'Add tag...'}
                disabled={tags.length >= 20}
                className="flex-1 px-2 py-1 bg-studio-bg border border-studio-border rounded text-xs text-studio-text placeholder:text-studio-text-muted focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button type="button" onClick={addTag} disabled={!tagInput.trim() || tags.length >= 20} className="px-2 py-1 text-xs rounded bg-purple-600/50 hover:bg-purple-500/50 text-purple-300 disabled:opacity-30">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Component Checkboxes */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-studio-text-muted uppercase tracking-wide">
              Components ({checkedCount}/{CRYPT_COMPONENTS.length})
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                All
              </button>
              <span className="text-xs text-studio-text-muted">|</span>
              <button
                type="button"
                onClick={deselectOptional}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                Minimal
              </button>
            </div>
          </div>

          {CRYPT_COMPONENTS.map((comp: CryptComponent) => {
            const sel = selections.find((s) => s.folder === comp.folder);
            if (!sel) return null;
            return (
              <label
                key={comp.folder}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  sel.checked
                    ? "bg-purple-900/20 border border-purple-500/30"
                    : "bg-studio-bg/50 border border-transparent hover:border-studio-border"
                } ${comp.required ? "opacity-90" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={sel.checked}
                  onChange={() => toggleComponent(comp.folder)}
                  disabled={comp.required}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                <span className="text-xl w-7 text-center">{comp.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-studio-text">
                      {comp.displayName}
                    </span>
                    <span className="text-xs text-studio-text-muted">
                      ({comp.folder}/)
                    </span>
                    {comp.required && (
                      <span className="text-[10px] bg-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-studio-text-muted truncate">
                    {comp.description}
                  </p>
                </div>
                <span className="text-xs text-studio-text-muted whitespace-nowrap ml-2">
                  {formatBytes(sel.sizeBytes)}
                </span>
              </label>
            );
          })}
        </div>

        {/* Mummy/Curse Config (shown when Pyramid is checked) */}
        {selections.find((s) => s.folder === "Pyramid")?.checked && (
          <div className="px-6 py-3 border-t border-studio-border bg-amber-900/10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">&#x1F9CC;</span>
              <span className="text-xs font-semibold text-amber-300 uppercase tracking-wide">Mummy Curse Settings</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={curseEnabled}
                  onChange={(e) => setCurseEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-amber-500"
                />
                <span className="text-xs text-studio-text">Leave a Curse (.txt) on the host computer</span>
              </label>
            </div>
            {curseEnabled && (
              <input
                type="text"
                value={curseMessage}
                onChange={(e) => setCurseMessage(e.target.value)}
                placeholder="Custom curse message (leave empty for default)..."
                className="w-full px-3 py-1.5 bg-studio-bg border border-amber-500/30 rounded text-xs text-studio-text placeholder:text-studio-text-muted focus:outline-none focus:border-amber-400"
              />
            )}
            <p className="text-[10px] text-studio-text-muted">
              The Mummy will download CryptArtist Studio and open this .Crypt on any new computer.
              {curseEnabled && " A harmless .txt file will be placed on the user's Desktop (with permission)."}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-studio-border bg-studio-bg/50 flex items-center justify-between">
          <div className="text-sm text-studio-text-muted space-y-0.5">
            <div>Total: <span className="font-medium text-studio-text">{formatBytes(totalSize)}</span></div>
            {totalSize > 0 && <div className="text-[10px]">{estimateSaveTime(totalSize)}</div>}
            {saving && saveProgress > 0 && (
              <div className="w-32 h-1 bg-studio-border rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${saveProgress}%` }} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-1.5 text-sm rounded border border-studio-border text-studio-text hover:bg-studio-surface transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || checkedCount === 0}
              className="px-4 py-1.5 text-sm rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? `Saving... ${saveProgress}%` : existingPath ? "Save" : "Save As..."}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
