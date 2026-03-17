import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useDeviceType } from "../../utils/platform";
import { useProgramTabs } from "../../utils/programTabs";
import { AndroidFileExplorer } from "../../components/AndroidFileExplorer";
import { AndroidCodeEditor } from "../../components/AndroidCodeEditor";
import { AndroidVibeCodeWorkerLayout } from "../../components/AndroidVibeCodeWorkerLayout";
import { GitPanel } from "../../components/GitPanel";
import { GitHubAuthModal } from "../../components/GitHubAuthModal";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";
import { cloneRepository, getGitToken } from "../../utils/gitIntegration";

interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  expanded?: boolean;
}

interface OpenFile {
  path: string;
  name: string;
  content: string;
  language: string;
  dirty: boolean;
}

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", json: "json", md: "markdown", html: "html",
    css: "css", scss: "scss", toml: "toml", yaml: "yaml", yml: "yaml",
    sh: "shell", bash: "shell", sql: "sql", go: "go", java: "java",
  };
  return map[ext] || "plaintext";
}

function isBinaryFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const binary = ["png","jpg","jpeg","gif","bmp","webp","ico","exe","dll","so","wasm","zip","tar","gz","7z","pdf","mp4","mp3","wav"];
  return binary.includes(ext);
}

export function VibeCodeWorkerAndroid() {
  const navigate = useNavigate();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const { openTab, markTabDirty, markTabClean } = useProgramTabs();

  const [rootPath, setRootPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "$ VibeCodeWorker Terminal",
    "$ Ready. Open a folder to get started.",
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [editorFontSize, setEditorFontSize] = useState(isMobile ? 12 : 13);
  const [editorWordWrap, setEditorWordWrap] = useState<"on" | "off">("on");
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: "Hi! I'm your VibeCodeWorker AI assistant. Open a folder to get started.",
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [showGitHubAuth, setShowGitHubAuth] = useState(false);
  const [gitHubToken, setGitHubToken] = useState<string | null>(null);
  const [cloneUrl, setCloneUrl] = useState("");
  const [showCloneDialog, setShowCloneDialog] = useState(false);

  useEffect(() => {
    logger.info("VibeCodeWorkerAndroid", "Program loaded");
    // Open a program tab for this instance
    openTab("vibecode-worker", "VibeCodeWorker", null);
    // Check for existing GitHub token
    const token = getGitToken("github");
    if (token) setGitHubToken(token);
  }, [openTab]);

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      const entries = await invoke<DirEntry[]>("read_directory", { path: dirPath });
      return entries.map((e) => ({
        name: e.name,
        path: e.path,
        type: e.is_dir ? "directory" : "file",
        expanded: false,
      }));
    } catch (err) {
      console.error("Failed to read directory:", err);
      setTerminalOutput((prev) => [...prev, `[error] Failed to read: ${dirPath}`]);
      return [];
    }
  }, []);

  const handleOpenFolder = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setRootPath(selected);
        const nodes = await loadDirectory(selected);
        setFileTree(nodes);
        setTerminalOutput((prev) => [...prev, `$ Opened folder: ${selected}`]);
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
      toast.error("Failed to open folder");
    }
  };

  const toggleDirectory = async (node: FileNode) => {
    if (node.type !== "directory") return;
    if (node.expanded) {
      const collapse = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) =>
          n.path === node.path ? { ...n, expanded: false } : { ...n, children: n.children ? collapse(n.children) : undefined }
        );
      setFileTree(collapse(fileTree));
    } else {
      const children = await loadDirectory(node.path);
      const expand = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) =>
          n.path === node.path ? { ...n, expanded: true, children } : { ...n, children: n.children ? expand(n.children) : undefined }
        );
      setFileTree(expand(fileTree));
    }
  };

  const openFile = async (node: FileNode) => {
    if (node.type === "directory") {
      toggleDirectory(node);
      return;
    }
    if (isBinaryFile(node.name)) {
      setTerminalOutput((prev) => [...prev, `[info] Cannot open binary file: ${node.name}`]);
      return;
    }
    const existing = openFiles.find((f) => f.path === node.path);
    if (existing) {
      setActiveFilePath(node.path);
      return;
    }
    try {
      const content = await invoke<string>("read_text_file", { path: node.path });
      const newFile: OpenFile = {
        path: node.path,
        name: node.name,
        content,
        language: detectLanguage(node.name),
        dirty: false,
      };
      setOpenFiles((prev) => [...prev, newFile]);
      setActiveFilePath(node.path);
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Failed to read: ${node.name}`]);
    }
  };

  const closeFile = (path: string) => {
    setOpenFiles((prev) => prev.filter((f) => f.path !== path));
    if (activeFilePath === path) {
      const remaining = openFiles.filter((f) => f.path !== path);
      setActiveFilePath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  };

  const saveFile = async (path: string) => {
    const file = openFiles.find((f) => f.path === path);
    if (!file) return;
    try {
      await invoke("write_text_file", { path, contents: file.content });
      setOpenFiles((prev) =>
        prev.map((f) => (f.path === path ? { ...f, dirty: false } : f))
      );
      setTerminalOutput((prev) => [...prev, `$ Saved: ${file.name}`]);
      markTabClean(`tab-vibecode-${path}`);
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Save failed: ${err}`]);
    }
  };

  const activeFile = openFiles.find((f) => f.path === activeFilePath);

  const handleTerminalSubmit = () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalOutput((prev) => [...prev, `$ ${cmd}`]);
    setTerminalInput("");

    if (cmd === "clear") {
      setTerminalOutput(["$ Terminal cleared."]);
      return;
    }
    if (cmd === "pwd" && rootPath) {
      setTerminalOutput((prev) => [...prev, rootPath]);
      return;
    }
    setTerminalOutput((prev) => [...prev, `[info] Shell execution requires permissions. Built-in: clear, pwd`]);
  };

  const handleCloneRepository = async () => {
    if (!cloneUrl.trim()) {
      toast.error("Please enter a repository URL");
      return;
    }
    try {
      const targetPath = `${rootPath || "/tmp"}/cloned-repo`;
      await cloneRepository(cloneUrl, targetPath, gitHubToken || undefined);
      setRootPath(targetPath);
      const nodes = await loadDirectory(targetPath);
      setFileTree(nodes);
      setCloneUrl("");
      setShowCloneDialog(false);
      setTerminalOutput((prev) => [...prev, `$ Cloned repository to ${targetPath}`]);
      toast.success("Repository cloned");
    } catch (err) {
      toast.error(`Failed to clone repository: ${err}`);
    }
  };

  if (isMobile) {
    return (
      <AndroidVibeCodeWorkerLayout>
        <div className="vcw-editor flex flex-col h-full w-full">
          {activeFile ? (
            <>
              <div className="flex items-center gap-2 px-3 py-2 border-b border-studio-border bg-studio-panel">
                <span className="text-[12px] text-studio-secondary flex-1 truncate">{activeFile.name}</span>
                {activeFile.dirty && (
                  <button
                    onClick={() => saveFile(activeFile.path)}
                    className="btn btn-cyan text-[10px] py-1 px-2"
                  >
                    Save
                  </button>
                )}
                <button
                  onClick={() => closeFile(activeFile.path)}
                  className="text-[12px] text-studio-muted hover:text-studio-text"
                >
                  ✕
                </button>
              </div>
              <AndroidCodeEditor
                content={activeFile.content}
                language={activeFile.language}
                onChange={(content) => {
                  setOpenFiles((prev) =>
                    prev.map((f) =>
                      f.path === activeFile.path ? { ...f, content, dirty: true } : f
                    )
                  );
                  markTabDirty(`tab-vibecode-${activeFile.path}`);
                }}
                fontSize={editorFontSize}
                wordWrap={editorWordWrap}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="text-4xl mb-3">📝</span>
              <p className="text-[12px] text-studio-muted mb-3">No file open</p>
              <button onClick={handleOpenFolder} className="btn btn-cyan text-[11px] py-1.5 px-3">
                Open Folder
              </button>
            </div>
          )}
        </div>

        <div className="vcw-explorer h-full w-full flex flex-col">
          <div className="flex items-center gap-1 px-2 py-1 border-b border-studio-border bg-studio-panel">
            <button onClick={handleOpenFolder} className="btn text-[10px] py-1 px-2 flex-1">
              📁 Open
            </button>
            <button
              onClick={() => setShowCloneDialog(true)}
              className="btn text-[10px] py-1 px-2 flex-1"
              title="Clone from GitHub"
            >
              🐙 Clone
            </button>
            {gitHubToken && (
              <button
                onClick={() => setShowGitHubAuth(true)}
                className="btn text-[10px] py-1 px-2"
                title="GitHub authenticated"
              >
                ✓
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {rootPath ? (
              <AndroidFileExplorer
                fileTree={fileTree}
                onFileSelect={openFile}
                onToggleDirectory={toggleDirectory}
                activeFilePath={activeFilePath}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <span className="text-4xl mb-3">📁</span>
                <p className="text-[12px] text-studio-muted mb-3">No folder open</p>
              </div>
            )}
          </div>
        </div>

        <div className="vcw-ai flex flex-col h-full w-full bg-studio-panel">
          <GitPanel repositoryPath={rootPath} />
        </div>

        <div className="vcw-terminal flex flex-col h-full w-full bg-studio-panel">
          <div className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[10px] text-studio-green">
            {terminalOutput.map((line, i) => (
              <div key={i} className={line.startsWith("$") ? "text-studio-cyan" : "text-studio-secondary"}>
                {line}
              </div>
            ))}
          </div>
          <div className="flex items-center border-t border-studio-border px-3 py-1">
            <span className="text-[10px] text-studio-cyan font-mono mr-2">$</span>
            <input
              type="text"
              value={terminalInput}
              onChange={(e) => setTerminalInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTerminalSubmit()}
              className="flex-1 bg-transparent text-[10px] font-mono text-studio-text outline-none"
              placeholder="Type command..."
            />
          </div>
        </div>

        {/* Clone Dialog */}
        {showCloneDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCloneDialog(false)}>
            <div
              className="bg-studio-panel border border-studio-border rounded-lg shadow-2xl w-[90vw] max-w-sm p-4 space-y-3"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[12px] font-bold text-studio-text">Clone Repository</h3>
              <input
                type="text"
                value={cloneUrl}
                onChange={(e) => setCloneUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="input w-full text-[11px] py-2"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCloneRepository}
                  className="btn btn-cyan flex-1 text-[11px] py-2"
                >
                  Clone
                </button>
                <button
                  onClick={() => setShowCloneDialog(false)}
                  className="btn flex-1 text-[11px] py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GitHub Auth Modal */}
        <GitHubAuthModal
          isOpen={showGitHubAuth}
          onClose={() => setShowGitHubAuth(false)}
          onAuthenticated={(user, repos) => {
            setGitHubToken(getGitToken("github"));
            toast.success(`Authenticated as ${user.login}`);
          }}
        />
      </AndroidVibeCodeWorkerLayout>
    );
  }

  // Desktop layout
  return (
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden">
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border px-4 gap-2">
        <button
          onClick={() => navigate("/")}
          className="btn-ghost rounded px-2 py-1 text-xs hover:bg-studio-hover"
        >
          ← Suite
        </button>
        <span className="text-lg">👩‍💻</span>
        <span className="text-sm font-bold">VibeCodeWorker</span>
        <div className="flex-1" />
        <button onClick={handleOpenFolder} className="btn text-[10px] py-1 px-3">
          📁 Open Folder
        </button>
        <button
          onClick={() => setShowCloneDialog(true)}
          className="btn text-[10px] py-1 px-3"
          title="Clone from GitHub"
        >
          🐙 Clone
        </button>
        {gitHubToken ? (
          <button
            onClick={() => setShowGitHubAuth(true)}
            className="btn text-[10px] py-1 px-3"
            title="GitHub authenticated"
          >
            ✓ GitHub
          </button>
        ) : (
          <button
            onClick={() => setShowGitHubAuth(true)}
            className="btn text-[10px] py-1 px-3"
            title="Authenticate with GitHub"
          >
            🐙 Auth
          </button>
        )}
        {activeFile?.dirty && (
          <button onClick={() => saveFile(activeFile.path)} className="btn btn-cyan text-[10px] py-1 px-3">
            Save
          </button>
        )}
      </header>

      <div className="flex flex-1 min-h-0">
        <div className="w-[200px] border-r border-studio-border bg-studio-panel flex flex-col">
          <div className="px-3 py-2 border-b border-studio-border text-[10px] font-bold text-studio-muted">
            EXPLORER
          </div>
          {rootPath ? (
            <AndroidFileExplorer
              fileTree={fileTree}
              onFileSelect={openFile}
              onToggleDirectory={toggleDirectory}
              activeFilePath={activeFilePath}
            />
          ) : (
            <div className="flex items-center justify-center flex-1 text-center px-3">
              <div>
                <p className="text-[10px] text-studio-muted">No folder open</p>
                <button onClick={handleOpenFolder} className="btn text-[9px] py-1 px-2 mt-2">
                  Open
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {activeFile ? (
            <>
              <div className="flex items-center h-[28px] bg-studio-panel border-b border-studio-border px-3 gap-2">
                {openFiles.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => setActiveFilePath(file.path)}
                    className={`px-2 py-1 text-[10px] rounded transition-colors ${
                      activeFilePath === file.path
                        ? "bg-studio-cyan/20 text-studio-cyan"
                        : "text-studio-secondary hover:bg-studio-hover"
                    }`}
                  >
                    {file.dirty ? "● " : ""}{file.name}
                    <button
                      onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}
                      className="ml-1 text-[8px]"
                    >
                      ✕
                    </button>
                  </button>
                ))}
              </div>
              <AndroidCodeEditor
                content={activeFile.content}
                language={activeFile.language}
                onChange={(content) => {
                  setOpenFiles((prev) =>
                    prev.map((f) =>
                      f.path === activeFile.path ? { ...f, content, dirty: true } : f
                    )
                  );
                  markTabDirty(`tab-vibecode-${activeFile.path}`);
                }}
                fontSize={editorFontSize}
                wordWrap={editorWordWrap}
              />
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <span className="text-5xl block mb-3">📝</span>
                <p className="text-[12px] text-studio-muted">No file open</p>
              </div>
            </div>
          )}
        </div>

        <div className="w-[300px] border-l border-studio-border bg-studio-panel flex flex-col">
          <GitPanel repositoryPath={rootPath} />
        </div>
      </div>

      {/* Clone Dialog */}
      {showCloneDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCloneDialog(false)}>
          <div
            className="bg-studio-panel border border-studio-border rounded-lg shadow-2xl w-[450px] p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[12px] font-bold text-studio-text">Clone Repository</h3>
            <input
              type="text"
              value={cloneUrl}
              onChange={(e) => setCloneUrl(e.target.value)}
              placeholder="https://github.com/user/repo.git"
              className="input w-full text-[11px] py-2"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCloneRepository}
                className="btn btn-cyan flex-1 text-[11px] py-2"
              >
                Clone
              </button>
              <button
                onClick={() => setShowCloneDialog(false)}
                className="btn flex-1 text-[11px] py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GitHub Auth Modal */}
      <GitHubAuthModal
        isOpen={showGitHubAuth}
        onClose={() => setShowGitHubAuth(false)}
        onAuthenticated={(user, repos) => {
          setGitHubToken(getGitToken("github"));
          toast.success(`Authenticated as ${user.login}`);
        }}
      />
    </div>
  );
}
