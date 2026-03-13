import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import Editor from "@monaco-editor/react";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";
import { toast } from "../../utils/toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
  loading?: boolean;
}

interface OpenTab {
  path: string;
  name: string;
  content: string;
  language: string;
  dirty: boolean;
}

interface AIChatMsg {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", json: "json", md: "markdown", html: "html",
    css: "css", scss: "scss", toml: "toml", yaml: "yaml", yml: "yaml",
    sh: "shell", bash: "shell", sql: "sql", go: "go", java: "java",
    cpp: "cpp", c: "c", h: "c", hpp: "cpp", xml: "xml", svg: "xml",
  };
  return map[ext] || "plaintext";
}

function isBinaryFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const binary = ["png","jpg","jpeg","gif","bmp","webp","ico","exe","dll","so","wasm","zip","tar","gz","7z","pdf","mp4","mp3","wav","ogg","ttf","woff","woff2","eot","lock"];
  return binary.includes(ext);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VibeCodeWorker() {
  const navigate = useNavigate();
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "$ VibeCodeWorker Terminal v0.1.0",
    "$ Ready. Open a folder to get started.",
  ]);
  const [terminalInput, setTerminalInput] = useState("");
  const [aiMessages, setAiMessages] = useState<AIChatMsg[]>([
    {
      role: "assistant",
      content: "Hi! I'm your VibeCodeWorker AI assistant. Open a folder, then ask me anything about your code. I'll include the currently open file as context.\n\nSet your API key in the settings panel (gear icon) or use the shared OpenAI key from CryptArtist Studio settings.",
      timestamp: Date.now(),
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiProvider, setApiProvider] = useState("openai");
  const [vcwApiKey, setVcwApiKey] = useState("");
  const [vcwModel, setVcwModel] = useState("gpt-4o");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Load shared API key from Rust backend on mount
  useEffect(() => {
    invoke<string>("get_api_key")
      .then((key) => { if (key && !vcwApiKey) setVcwApiKey(key); })
      .catch(() => {});
  }, []);

  // ---------------------------------------------------------------------------
  // Filesystem operations
  // ---------------------------------------------------------------------------

  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      const entries = await invoke<DirEntry[]>("read_directory", { path: dirPath });
      return entries.map((e) => ({
        name: e.name,
        path: e.path,
        type: e.is_dir ? "directory" as const : "file" as const,
        children: e.is_dir ? undefined : undefined,
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
      // Collapse
      const collapse = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) =>
          n.path === node.path ? { ...n, expanded: false } : { ...n, children: n.children ? collapse(n.children) : undefined }
        );
      setFileTree(collapse(fileTree));
    } else {
      // Expand - load children
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
    const existing = openTabs.find((t) => t.path === node.path);
    if (existing) {
      setActiveTabPath(node.path);
      return;
    }
    try {
      const content = await invoke<string>("read_text_file", { path: node.path });
      setOpenTabs((prev) => [
        ...prev,
        { path: node.path, name: node.name, content, language: detectLanguage(node.name), dirty: false },
      ]);
      setActiveTabPath(node.path);
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Failed to read: ${node.name} - ${err}`]);
    }
  };

  const closeTab = (path: string) => {
    setOpenTabs((prev) => prev.filter((t) => t.path !== path));
    if (activeTabPath === path) {
      const remaining = openTabs.filter((t) => t.path !== path);
      setActiveTabPath(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  };

  const saveCurrentFile = async () => {
    const tab = openTabs.find((t) => t.path === activeTabPath);
    if (!tab) return;
    try {
      await invoke("write_text_file", { path: tab.path, contents: tab.content });
      setOpenTabs((prev) => prev.map((t) => (t.path === tab.path ? { ...t, dirty: false } : t)));
      setTerminalOutput((prev) => [...prev, `$ Saved: ${tab.name}`]);
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Save failed: ${err}`]);
    }
  };

  const activeTab = openTabs.find((t) => t.path === activeTabPath) || null;

  // ---------------------------------------------------------------------------
  // Terminal
  // ---------------------------------------------------------------------------

  const handleTerminalSubmit = () => {
    if (!terminalInput.trim()) return;
    const cmd = terminalInput.trim();
    setTerminalOutput((prev) => [...prev, `$ ${cmd}`]);
    setTerminalInput("");

    // Basic built-in commands
    if (cmd === "clear") {
      setTerminalOutput(["$ Terminal cleared."]);
      return;
    }
    if (cmd === "pwd" && rootPath) {
      setTerminalOutput((prev) => [...prev, rootPath]);
      return;
    }
    if (cmd === "help") {
      setTerminalOutput((prev) => [
        ...prev,
        "  Built-in: clear, pwd, help",
        "  Shell commands require Tauri shell plugin permissions.",
      ]);
      return;
    }

    setTerminalOutput((prev) => [...prev, `[info] Shell execution requires tauri-plugin-shell permissions. Built-in: clear, pwd, help`]);
  };

  // ---------------------------------------------------------------------------
  // AI Chat - real backend call
  // ---------------------------------------------------------------------------

  const handleAiSubmit = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg: AIChatMsg = { role: "user", content: aiInput, timestamp: Date.now() };
    setAiMessages((prev) => [...prev, userMsg]);
    setAiInput("");

    const key = vcwApiKey;
    if (!key) {
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Please set your API key in the settings panel (gear icon) to enable AI responses.", timestamp: Date.now() },
      ]);
      return;
    }

    setAiLoading(true);
    try {
      // Build context from active file
      let context = "";
      if (activeTab) {
        const fileContent = activeTab.content.length > 8000 ? activeTab.content.slice(0, 8000) + "\n...[truncated]" : activeTab.content;
        context = `\n\nCurrently open file (${activeTab.name}):\n\`\`\`${activeTab.language}\n${fileContent}\n\`\`\``;
      }

      const prompt = `You are a senior software engineer AI assistant in VibeCodeWorker IDE. Help the user with their coding request. Be concise and provide code when appropriate.${context}\n\nUser: ${userMsg.content}`;

      // Use the shared Rust backend for the API call
      const reply = await invoke<string>("ai_chat", { prompt });
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, timestamp: Date.now() },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${msg}`, timestamp: Date.now() },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // .CryptArt save/open
  // ---------------------------------------------------------------------------

  const handleSaveProject = async () => {
    try {
      const projectData = {
        rootPath,
        openFiles: openTabs.map((t) => ({ path: t.path, name: t.name })),
        activeFile: activeTabPath,
        aiProvider: apiProvider,
        model: vcwModel,
      };
      const cryptArt = createCryptArtFile("vibecode-worker", rootPath || "Untitled", projectData);
      const json = serializeCryptArt(cryptArt);

      const savePath = await saveDialog({
        defaultPath: "project.CryptArt",
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
      });
      if (savePath) {
        await invoke("write_text_file", { path: savePath, contents: json });
        setTerminalOutput((prev) => [...prev, `$ Project saved: ${savePath}`]);
      }
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Save project failed: ${err}`]);
    }
  };

  const handleOpenProject = async () => {
    try {
      const selected = await openDialog({
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        const json = await invoke<string>("read_text_file", { path: selected });
        const project = parseCryptArt(json);
        if (project.program !== "vibecode-worker") {
          setTerminalOutput((prev) => [...prev, `[error] This .CryptArt file is for ${project.program}, not VibeCodeWorker`]);
          return;
        }
        const data = project.data as { rootPath?: string; openFiles?: { path: string; name: string }[]; activeFile?: string; aiProvider?: string; model?: string };
        if (data.rootPath) {
          setRootPath(data.rootPath);
          const nodes = await loadDirectory(data.rootPath);
          setFileTree(nodes);
        }
        if (data.aiProvider) setApiProvider(data.aiProvider);
        if (data.model) setVcwModel(data.model);
        setTerminalOutput((prev) => [...prev, `$ Loaded project: ${project.name}`]);
      }
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Open project failed: ${err}`]);
    }
  };

  // ---------------------------------------------------------------------------
  // File tree renderer
  // ---------------------------------------------------------------------------

  const renderTree = (nodes: FileNode[], depth = 0): JSX.Element[] => {
    return nodes.map((node) => (
      <div key={node.path}>
        <button
          onClick={() => openFile(node)}
          className={`w-full text-left px-2 py-[3px] text-[11px] flex items-center gap-1.5 hover:bg-studio-hover rounded transition-colors ${
            activeTabPath === node.path ? "bg-studio-hover text-studio-text" : "text-studio-secondary"
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <span className="text-[10px] opacity-60">
            {node.type === "directory"
              ? node.expanded ? "\u{1F4C2}" : "\u{1F4C1}"
              : "\u{1F4C4}"}
          </span>
          {node.name}
        </button>
        {node.type === "directory" && node.expanded && node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-4 gap-3">
        <button
          onClick={() => navigate("/")}
          className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors"
          title="Back to Suite"
        >
          {"\u2190"} Suite
        </button>
        <div className="w-px h-5 bg-studio-border" />
        <span className="text-xl leading-none">{"\u{1F469}\u{1F3FB}\u200D\u{1F4BB}"}</span>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">VibeCodeWorker</span>
          <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">VCW</span>
        </div>
        <div className="flex-1" />
        <button onClick={handleOpenFolder} className="btn text-[10px] py-1 px-3">
          {"\u{1F4C2}"} Open Folder
        </button>
        <button onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
          Open .CryptArt
        </button>
        <button onClick={handleSaveProject} className="btn text-[10px] py-1 px-3">
          Save .CryptArt
        </button>
        {activeTab?.dirty && (
          <button onClick={saveCurrentFile} className="btn btn-cyan text-[10px] py-1 px-3">
            Save File
          </button>
        )}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors ${showSettings ? "bg-studio-hover" : ""}`}
          title="Settings"
        >
          {"\u2699\uFE0F"}
        </button>
      </header>

      {/* Main IDE Layout */}
      <div className="flex flex-1 min-h-0">
        {/* File Explorer */}
        <div className="w-[200px] min-w-[160px] bg-studio-panel border-r border-studio-border flex flex-col">
          <div className="panel-header">
            <h3>Explorer</h3>
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {fileTree.length > 0 ? (
              renderTree(fileTree)
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <span className="text-2xl mb-2 opacity-40">{"\u{1F4C1}"}</span>
                <p className="text-[10px] text-studio-muted">No folder open</p>
                <button onClick={handleOpenFolder} className="btn text-[10px] py-1 px-3 mt-2">
                  Open Folder
                </button>
              </div>
            )}
          </div>
          {rootPath && (
            <div className="px-2 py-1 border-t border-studio-border text-[9px] text-studio-muted truncate" title={rootPath}>
              {rootPath}
            </div>
          )}
        </div>

        {/* Editor + Terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <div className="flex items-center h-[32px] bg-studio-panel border-b border-studio-border overflow-x-auto">
            {openTabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabPath(tab.path)}
                className={`flex items-center gap-2 px-3 h-full text-[11px] cursor-pointer border-r border-studio-border transition-colors ${
                  activeTabPath === tab.path
                    ? "bg-studio-bg text-studio-text border-b-2 border-b-studio-cyan"
                    : "text-studio-secondary hover:bg-studio-surface"
                }`}
              >
                <span>{tab.dirty ? "\u25CF " : ""}{tab.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.path); }}
                  className="text-[9px] text-studio-muted hover:text-studio-text ml-1"
                >
                  x
                </button>
              </div>
            ))}
            {openTabs.length === 0 && (
              <span className="px-3 text-[11px] text-studio-muted">No files open</span>
            )}
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            {activeTab ? (
              <Editor
                height="100%"
                language={activeTab.language}
                value={activeTab.content}
                theme="vs-dark"
                onChange={(value) => {
                  setOpenTabs((prev) =>
                    prev.map((t) => (t.path === activeTab.path ? { ...t, content: value || "", dirty: true } : t))
                  );
                }}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  padding: { top: 8 },
                  renderLineHighlight: "all",
                  bracketPairColorization: { enabled: true },
                  wordWrap: "on",
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-studio-muted text-sm">
                <div className="text-center">
                  <span className="text-4xl block mb-3">{"\u{1F469}\u{1F3FB}\u200D\u{1F4BB}"}</span>
                  <p className="font-semibold text-studio-secondary">VibeCodeWorker</p>
                  <p className="text-xs mt-1">Open a folder and click a file to start coding</p>
                  <p className="text-[10px] text-studio-muted mt-2">Ctrl+S to save - AI chat on the right</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal */}
          <div className="h-[140px] min-h-[100px] bg-studio-panel border-t border-studio-border flex flex-col">
            <div className="panel-header">
              <h3>Terminal</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[11px] text-studio-green">
              {terminalOutput.map((line, i) => (
                <div key={i} className={line.startsWith("$") ? "text-studio-cyan" : line.startsWith("[error]") ? "text-red-400" : "text-studio-secondary"}>
                  {line}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>
            <div className="flex items-center border-t border-studio-border px-3 py-1">
              <span className="text-[11px] text-studio-cyan font-mono mr-2">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTerminalSubmit()}
                className="flex-1 bg-transparent text-[11px] font-mono text-studio-text outline-none"
                placeholder="Type a command... (clear, pwd, help)"
              />
            </div>
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="w-[300px] min-w-[240px] bg-studio-panel border-l border-studio-border flex flex-col">
          <div className="panel-header">
            <h3>{"\u{1F916}"} AI Assistant</h3>
            {aiLoading && <span className="text-[9px] text-studio-cyan animate-pulse">thinking...</span>}
          </div>

          {/* Settings Panel (inline toggle) */}
          {showSettings && (
            <div className="p-3 border-b border-studio-border bg-studio-surface animate-fade-in">
              <h4 className="text-[10px] font-semibold uppercase text-studio-secondary mb-2">API Configuration</h4>
              <div className="flex flex-col gap-2">
                <select
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  className="input text-[11px] py-1"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="custom">Custom (OpenAI-compatible)</option>
                </select>
                <input
                  type="password"
                  value={vcwApiKey}
                  onChange={(e) => setVcwApiKey(e.target.value)}
                  className="input text-[11px] py-1"
                  placeholder="API Key..."
                />
                <input
                  type="text"
                  value={vcwModel}
                  onChange={(e) => setVcwModel(e.target.value)}
                  className="input text-[11px] py-1"
                  placeholder="Model name (e.g. gpt-4o)"
                />
                <div className="text-[9px] text-studio-muted">
                  {vcwApiKey ? "\u2705 Key set" : "\u26A0\uFE0F No key - uses shared CryptArtist key if available"}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {aiMessages.map((msg, i) => (
              <div
                key={i}
                className={`ai-message ${msg.role === "user" ? "ai-message-user" : "ai-message-assistant"}`}
              >
                <div className="text-[10px] font-semibold text-studio-muted mb-1">
                  {msg.role === "user" ? "You" : "\u{1F916} AI"}
                </div>
                <div className="text-[11px] text-studio-text whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
            {aiLoading && (
              <div className="ai-message ai-message-assistant">
                <div className="ai-typing-indicator">
                  <div className="ai-typing-dot" />
                  <div className="ai-typing-dot" />
                  <div className="ai-typing-dot" />
                </div>
              </div>
            )}
            <div ref={aiEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-studio-border p-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAiSubmit()}
                className="input flex-1 text-[11px] py-1.5"
                placeholder="Ask AI about your code..."
                disabled={aiLoading}
              />
              <button onClick={handleAiSubmit} className="btn btn-cyan text-[11px] px-3 py-1" disabled={aiLoading}>
                {aiLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="status-bar">
        <span>{"\u{1F469}\u{1F3FB}\u200D\u{1F4BB}"} VibeCodeWorker v0.1.0</span>
        <div className="flex items-center gap-3">
          <span>{activeTab ? activeTab.language : "No file"}</span>
          <span>|</span>
          <span>{apiProvider} / {vcwModel}</span>
          <span>|</span>
          <span>{vcwApiKey ? "\u{1F7E2} API ready" : "\u{1F7E1} No key"}</span>
        </div>
      </footer>
    </div>
  );
}
