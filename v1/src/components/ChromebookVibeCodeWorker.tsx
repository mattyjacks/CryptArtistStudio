import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChromebookDetection, useChromebookKeyboardShortcuts, useChromebookStorage } from "../hooks/useChromebook";
import { requestDownloadsAccess, requestFolderAccess, listDirectory, readFileContent, writeFileContent } from "../utils/chromebookFileSystem";
import { CHROMEBOOK_SHORTCUTS } from "../utils/chromebookDetection";
import { toast } from "../utils/toast";
import { logger } from "../utils/logger";

interface ChromebookFile {
  name: string;
  path: string;
  type: "file" | "directory";
  handle?: FileSystemFileHandle | FileSystemDirectoryHandle;
}

export function ChromebookVibeCodeWorker() {
  const navigate = useNavigate();
  const chromebookInfo = useChromebookDetection();
  const { storageQuota, isPersistent } = useChromebookStorage();

  const [rootHandle, setRootHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileTree, setFileTree] = useState<ChromebookFile[]>([]);
  const [openFiles, setOpenFiles] = useState<Map<string, string>>(new Map());
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Keyboard shortcuts
  const shortcuts = useCallback(() => ({
    "CTRL+O": () => handleOpenFolder(),
    "CTRL+S": () => saveActiveFile(),
    "CTRL+P": () => setShowFileDialog(true),
    "CTRL+SHIFT+G": () => handleCloneRepo(),
  }), []);

  useChromebookKeyboardShortcuts(shortcuts());

  const handleOpenFolder = async () => {
    try {
      const handle = await requestFolderAccess();
      if (handle) {
        setRootHandle(handle);
        const files = await listDirectory(handle);
        setFileTree(files);
        toast.success(`Opened folder: ${handle.name}`);
      }
    } catch (err) {
      toast.error(`Failed to open folder: ${err}`);
    }
  };

  const handleOpenDownloads = async () => {
    try {
      const handle = await requestDownloadsAccess();
      if (handle) {
        setRootHandle(handle);
        const files = await listDirectory(handle);
        setFileTree(files);
        toast.success("Opened Downloads folder");
      }
    } catch (err) {
      toast.error(`Failed to open Downloads: ${err}`);
    }
  };

  const handleOpenFile = async (file: ChromebookFile) => {
    if (file.type === "directory") {
      try {
        const dirHandle = file.handle as FileSystemDirectoryHandle;
        const files = await listDirectory(dirHandle);
        setFileTree(files);
      } catch (err) {
        toast.error(`Failed to open directory: ${err}`);
      }
      return;
    }

    try {
      const fileHandle = file.handle as FileSystemFileHandle;
      const content = await readFileContent(fileHandle);
      setOpenFiles((prev) => new Map(prev).set(file.path, content));
      setActiveFilePath(file.path);
    } catch (err) {
      toast.error(`Failed to open file: ${err}`);
    }
  };

  const saveActiveFile = async () => {
    if (!activeFilePath || !rootHandle) return;

    try {
      const content = openFiles.get(activeFilePath);
      if (!content) return;

      const fileHandle = await rootHandle.getFileHandle(activeFilePath);
      await writeFileContent(fileHandle, content);
      toast.success(`Saved: ${activeFilePath}`);
    } catch (err) {
      toast.error(`Failed to save file: ${err}`);
    }
  };

  const handleCloneRepo = async () => {
    toast.info("Clone feature requires Git integration");
  };

  const handleCreateFile = async () => {
    if (!rootHandle) {
      toast.error("Please open a folder first");
      return;
    }

    const fileName = prompt("Enter file name:");
    if (!fileName) return;

    try {
      const fileHandle = await rootHandle.getFileHandle(fileName, { create: true });
      setOpenFiles((prev) => new Map(prev).set(fileName, ""));
      setActiveFilePath(fileName);
      toast.success(`Created: ${fileName}`);
    } catch (err) {
      toast.error(`Failed to create file: ${err}`);
    }
  };

  const filteredFiles = fileTree.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeFile = activeFilePath ? openFiles.get(activeFilePath) : null;

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden chromebook-vcw">
      {/* Header */}
      <header className="flex items-center h-[48px] bg-studio-panel border-b border-studio-border px-4 gap-2">
        <button
          onClick={() => navigate("/")}
          className="btn-ghost rounded px-2 py-1 text-xs hover:bg-studio-hover"
          title="Back to Suite (Ctrl+Home)"
        >
          ← Suite
        </button>
        <span className="text-lg">👩‍💻</span>
        <span className="text-sm font-bold">VibeCodeWorker</span>
        <span className="text-[10px] text-studio-muted ml-2">
          {chromebookInfo.screenSize === "small" ? "📱 Mobile" : chromebookInfo.isTabletMode ? "📱 Tablet" : "🖥️ Desktop"}
        </span>
        <div className="flex-1" />

        {/* Storage indicator */}
        <div className="flex items-center gap-1 text-[10px] text-studio-muted">
          <span>💾</span>
          <div className="w-20 h-2 bg-studio-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-studio-cyan transition-all"
              style={{ width: `${Math.min(storageQuota.percentage * 100, 100)}%` }}
            />
          </div>
          <span>{Math.round(storageQuota.percentage * 100)}%</span>
        </div>

        {/* Buttons */}
        <button
          onClick={handleOpenFolder}
          className="btn text-[10px] py-1 px-3"
          title="Open folder (Ctrl+O)"
        >
          📁 Open
        </button>
        <button
          onClick={handleOpenDownloads}
          className="btn text-[10px] py-1 px-3"
          title="Open Downloads"
        >
          ⬇️ Downloads
        </button>
        <button
          onClick={saveActiveFile}
          disabled={!activeFile}
          className="btn btn-cyan text-[10px] py-1 px-3"
          title="Save (Ctrl+S)"
        >
          💾 Save
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* File explorer */}
        <div className="w-[220px] border-r border-studio-border bg-studio-panel flex flex-col">
          <div className="px-3 py-2 border-b border-studio-border">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="input w-full text-[10px] py-1"
            />
          </div>
          <div className="flex items-center gap-1 px-2 py-1 border-b border-studio-border">
            <button
              onClick={handleCreateFile}
              className="btn text-[9px] py-0.5 px-1.5 flex-1"
              title="Create new file"
            >
              ➕ New
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {rootHandle ? (
              <div className="space-y-0">
                {filteredFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => handleOpenFile(file)}
                    className={`w-full text-left px-3 py-1.5 text-[10px] transition-colors ${
                      activeFilePath === file.path
                        ? "bg-studio-cyan/20 text-studio-cyan"
                        : "text-studio-secondary hover:bg-studio-hover"
                    }`}
                  >
                    <span className="mr-1">{file.type === "directory" ? "📁" : "📄"}</span>
                    {file.name}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center px-3">
                <p className="text-[10px] text-studio-muted">
                  Open a folder to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0">
          {activeFile !== null ? (
            <>
              <div className="flex items-center h-[32px] bg-studio-panel border-b border-studio-border px-3 gap-2">
                <span className="text-[10px] text-studio-secondary flex-1 truncate">
                  {activeFilePath}
                </span>
                <button
                  onClick={() => {
                    setOpenFiles((prev) => {
                      const next = new Map(prev);
                      next.delete(activeFilePath!);
                      return next;
                    });
                    setActiveFilePath(null);
                  }}
                  className="text-[10px] text-studio-muted hover:text-studio-text"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={activeFile}
                onChange={(e) => {
                  setOpenFiles((prev) => new Map(prev).set(activeFilePath!, e.target.value));
                }}
                className="flex-1 bg-studio-surface text-studio-text font-mono p-3 outline-none resize-none"
                style={{
                  fontSize: chromebookInfo.screenSize === "small" ? "11px" : "12px",
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineHeight: "1.6",
                }}
                spellCheck="false"
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="text-5xl block mb-3">📝</span>
                <p className="text-[12px] text-studio-muted">
                  Open a file to start editing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Chromebook info */}
      <footer className="h-[24px] bg-studio-panel border-t border-studio-border px-3 flex items-center text-[9px] text-studio-muted gap-3">
        <span>Chrome OS</span>
        {chromebookInfo.hasLinuxContainer && <span>🐧 Linux</span>}
        {isPersistent && <span>🔒 Persistent</span>}
        <span className="flex-1" />
        <span>{chromebookInfo.screenSize}</span>
      </footer>
    </div>
  );
}
