/* Wave2: select-aria */
/* Wave2: type=button applied */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import Editor from "@monaco-editor/react";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";
import { useDeviceType } from "../../utils/platform";
import { safeGetRaw, safeSetRaw, safeGetRawJSON } from "../../utils/storage";
import { useWorkspace } from "../../utils/workspace";
import { chatWithAI, getDefaultModel, setDefaultModel } from "../../utils/openrouter";
import { useApiKeys } from "../../utils/apiKeys";
import { useInteropEmit } from "../../utils/interop";
import { useCrossClipboard } from "../../utils/crossClipboard";
import { notifySuccess } from "../../utils/notifications";
import AIOptimizer from "../../components/AIOptimizer";

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

type BottomTab = "terminal" | "problems" | "testing" | "webaudit" | "search";

interface ProblemEntry {
  file: string;
  line: number;
  col: number;
  severity: "error" | "warning" | "info";
  message: string;
  source: string;
}

interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip" | "running";
  duration?: number;
  message?: string;
}

interface TestSuite {
  framework: string;
  running: boolean;
  results: TestResult[];
  summary: { passed: number; failed: number; skipped: number; total: number };
  lastRun?: string;
  autoTest: boolean;
}

interface WebAuditScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

interface WebAuditCheck {
  category: string;
  name: string;
  status: "pass" | "fail" | "warn" | "info";
  detail: string;
}

interface WebAudit {
  url: string;
  running: boolean;
  scores: WebAuditScore | null;
  checks: WebAuditCheck[];
  timestamp?: string;
}

interface SearchResult {
  file: string;
  line: number;
  content: string;
  matchStart: number;
  matchEnd: number;
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

// Improvement 47: File type icons mapping
function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const icons: Record<string, string> = {
    ts: "\u{1F7E6}", tsx: "\u{1F7E6}", js: "\u{1F7E8}", jsx: "\u{1F7E8}",
    py: "\u{1F40D}", rs: "\u{1F980}", json: "\u{1F4CB}", md: "\u{1F4DD}",
    html: "\u{1F310}", css: "\u{1F3A8}", scss: "\u{1F3A8}", toml: "\u{2699}\uFE0F",
    yaml: "\u{2699}\uFE0F", yml: "\u{2699}\uFE0F", sql: "\u{1F4BE}",
    go: "\u{1F439}", java: "\u2615", cpp: "\u{1F1E8}", c: "\u{1F1E8}",
    sh: "\u{1F4DF}", bash: "\u{1F4DF}", xml: "\u{1F4C4}", svg: "\u{1F5BC}\uFE0F",
    txt: "\u{1F4C4}", env: "\u{1F510}", lock: "\u{1F512}", gitignore: "\u{1F6AB}",
  };
  return icons[ext] || "\u{1F4C4}";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VibeCodeWorker() {
  const navigate = useNavigate();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  useEffect(() => { logger.info("VibeCodeWorker", "Program loaded"); }, []);
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
  // Improvement 49-53: Editor config state
  const [editorWordWrap, setEditorWordWrap] = useState<"on" | "off">("on");
  const [editorMinimap, setEditorMinimap] = useState(true);
  const [editorFontSize, setEditorFontSize] = useState(13);
  const [editorTabSize, setEditorTabSize] = useState(2);
  const [editorTheme, setEditorTheme] = useState("vs-dark");
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTab>("terminal");
  const [problems, setProblems] = useState<ProblemEntry[]>([]);
  const [testSuite, setTestSuite] = useState<TestSuite>({
    framework: "auto",
    running: false,
    results: [],
    summary: { passed: 0, failed: 0, skipped: 0, total: 0 },
    autoTest: false,
  });
  const [webAudit, setWebAudit] = useState<WebAudit>({
    url: "http://localhost:3000",
    running: false,
    scores: null,
    checks: [],
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchReplace, setSearchReplace] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchCaseSensitive, setSearchCaseSensitive] = useState(false);
  const [searchRegex, setSearchRegex] = useState(false);
  // Improvement 141: Git status indicator
  const [gitBranch, setGitBranch] = useState<string | null>(null);
  const [gitChanges, setGitChanges] = useState(0);
  // Improvement 143: Cursor position
  const [cursorLine, setCursorLine] = useState(1);
  const [cursorCol, setCursorCol] = useState(1);
  // Improvement 144: File encoding
  const [fileEncoding, setFileEncoding] = useState("UTF-8");
  // Improvement 145: Line ending style
  const [lineEnding, setLineEnding] = useState<"LF" | "CRLF">("LF");
  // Improvement 148: Auto-save
  const [autoSave, setAutoSave] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  // Improvement 150: Command palette
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandFilter, setCommandFilter] = useState("");
  // Improvement 152: Terminal history
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [terminalHistoryIdx, setTerminalHistoryIdx] = useState(-1);
  // Improvement 153: Code folding toggle
  const [codeFolding, setCodeFolding] = useState(true);
  // Improvement 154: Editor zoom
  const [editorZoom, setEditorZoom] = useState(100);
  // Improvement 241: Split editor
  const [splitView, setSplitView] = useState(false);
  const [splitOrientation, setSplitOrientation] = useState<"horizontal" | "vertical">("vertical");
  // Improvement 242: Diff viewer
  const [showDiff, setShowDiff] = useState(false);
  const [diffMode, setDiffMode] = useState<"inline" | "side-by-side">("side-by-side");
  // Improvement 243: Code snippets library
  const [snippets, setSnippets] = useState<{ id: string; name: string; language: string; code: string }[]>([
    { id: "s1", name: "React Component", language: "tsx", code: "export default function Component() {\n  return <div>Hello</div>;\n}" },
    { id: "s2", name: "useState Hook", language: "tsx", code: "const [value, setValue] = useState<string>('');" },
    { id: "s3", name: "useEffect", language: "tsx", code: "useEffect(() => {\n  // effect\n  return () => { /* cleanup */ };\n}, []);" },
    { id: "s4", name: "Try/Catch", language: "ts", code: "try {\n  // code\n} catch (error) {\n  console.error(error);\n}" },
    { id: "s5", name: "Fetch API", language: "ts", code: "const response = await fetch(url);\nconst data = await response.json();" },
  ]);
  const [showSnippets, setShowSnippets] = useState(false);
  // Improvement 244: Editor bookmarks
  const [bookmarks, setBookmarks] = useState<{ file: string; line: number; label: string }[]>([]);
  // Improvement 245: Go-to-line
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [goToLineInput, setGoToLineInput] = useState("");
  // Improvement 246: File templates
  const [fileTemplates] = useState([
    { name: "React Component", ext: "tsx", template: "import React from 'react';\n\nexport default function Component() {\n  return <div></div>;\n}\n" },
    { name: "TypeScript Module", ext: "ts", template: "// Module\nexport {};\n" },
    { name: "CSS Module", ext: "module.css", template: "/* Styles */\n.container {}\n" },
    { name: "Test File", ext: "test.ts", template: "import { describe, it, expect } from 'vitest';\n\ndescribe('', () => {\n  it('should', () => {\n    expect(true).toBe(true);\n  });\n});\n" },
  ]);
  // Improvement 247: Indent detection display
  const [detectedIndent, setDetectedIndent] = useState<"spaces" | "tabs">("spaces");
  // Improvement 248: Symbol outline panel
  const [showOutline, setShowOutline] = useState(false);
  const [outlineSymbols, setOutlineSymbols] = useState<{ name: string; kind: string; line: number }[]>([]);
  // Improvement 249: Sticky scroll
  const [stickyScroll, setStickyScroll] = useState(true);
  // Improvement 250: Bracket pair colorization
  const [bracketColors, setBracketColors] = useState(true);
  // Improvement 251: Linked editing (rename on type)
  const [linkedEditing, setLinkedEditing] = useState(false);
  // Improvement 252: Minimap decorations
  const [minimapDecorations, setMinimapDecorations] = useState(true);
  // Improvement 253: Editor ruler columns
  const [rulerColumns, setRulerColumns] = useState<number[]>([80, 120]);
  // Improvement 391: Recent files
  const [recentFiles, setRecentFiles] = useState<string[]>(() => {
    return safeGetRawJSON<string[]>("cryptartist_vcw_recent_files", []);
  });
  // Improvement 392: File stats
  const [fileStats, setFileStats] = useState<{ lines: number; words: number; chars: number } | null>(null);
  // Improvement 393: Pinned tabs
  const [pinnedTabs, setPinnedTabs] = useState<string[]>([]);
  // Improvement 394: AI quick actions
  const [showAiActions, setShowAiActions] = useState(false);
  // Improvement 395: File comparison mode
  const [compareMode, setCompareMode] = useState(false);
  const [compareFile, setCompareFile] = useState<string | null>(null);
  // Improvement 254: Multiple cursors indicator
  const [cursorCount, setCursorCount] = useState(1);
  // Improvement 255: Inline git blame
  const [inlineBlame, setInlineBlame] = useState(false);
  // Improvement 256: Code lens
  const [codeLens, setCodeLens] = useState(true);
  // Improvement 257: Selection character count
  const [selectionCount, setSelectionCount] = useState(0);
  // Improvement 258: Find in files scope
  const [findScope, setFindScope] = useState<"workspace" | "open-files" | "current">("workspace");
  // Improvement 259: Editor breadcrumb depth
  const [breadcrumbDepth, setBreadcrumbDepth] = useState(3);
  // Improvement 260: Word count display
  const [wordCount, setWordCount] = useState(0);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const aiEndRef = useRef<HTMLDivElement>(null);
  const commandPaletteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  // Interop: shared API keys, event bus, cross-clipboard
  const apiKeys = useApiKeys();
  const emit = useInteropEmit("vibecode-worker");
  const clip = useCrossClipboard("vibecode-worker");

  // Sync shared API key from context
  useEffect(() => {
    if (apiKeys.loaded && apiKeys.openaiKey && !vcwApiKey) {
      setVcwApiKey(apiKeys.openaiKey);
    }
  }, [apiKeys.loaded, apiKeys.openaiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Improvement 141: Detect git branch on root path change
  useEffect(() => {
    if (!rootPath) return;
    invoke<string>("run_shell", { command: "git", args: ["branch", "--show-current"], cwd: rootPath })
      .then((branch) => setGitBranch(branch.trim()))
      .catch(() => setGitBranch(null));
    invoke<string>("run_shell", { command: "git", args: ["status", "--porcelain"], cwd: rootPath })
      .then((out) => setGitChanges(out.trim().split("\n").filter(Boolean).length))
      .catch(() => setGitChanges(0));
  }, [rootPath]);

  // Improvement 150: Command palette keyboard shortcut (Ctrl+Shift+P)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setShowCommandPalette((s) => !s);
        setCommandFilter("");
      }
      if (e.key === "Escape") setShowCommandPalette(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Improvement 150: Focus command palette input when shown
  useEffect(() => {
    if (showCommandPalette) commandPaletteRef.current?.focus();
  }, [showCommandPalette]);

  // Improvement 150: Command palette commands
  const commands = [
    { id: "toggle-minimap", label: "Toggle Minimap", action: () => setEditorMinimap((s) => !s) },
    { id: "toggle-wordwrap", label: "Toggle Word Wrap", action: () => setEditorWordWrap((s) => s === "on" ? "off" : "on") },
    { id: "toggle-folding", label: "Toggle Code Folding", action: () => setCodeFolding((s) => !s) },
    { id: "toggle-autosave", label: "Toggle Auto Save", action: () => { setAutoSave((s) => !s); toast.info(`Auto-save ${!autoSave ? "enabled" : "disabled"}`); } },
    { id: "increase-font", label: "Increase Font Size", action: () => setEditorFontSize((s) => Math.min(32, s + 1)) },
    { id: "decrease-font", label: "Decrease Font Size", action: () => setEditorFontSize((s) => Math.max(8, s - 1)) },
    { id: "zoom-in", label: "Zoom In", action: () => setEditorZoom((s) => Math.min(200, s + 10)) },
    { id: "zoom-out", label: "Zoom Out", action: () => setEditorZoom((s) => Math.max(50, s - 10)) },
    { id: "zoom-reset", label: "Reset Zoom", action: () => setEditorZoom(100) },
    { id: "theme-dark", label: "Theme: VS Dark", action: () => setEditorTheme("vs-dark") },
    { id: "theme-light", label: "Theme: VS Light", action: () => setEditorTheme("light") },
    { id: "theme-hc", label: "Theme: High Contrast", action: () => setEditorTheme("hc-black") },
    { id: "tab-2", label: "Tab Size: 2", action: () => setEditorTabSize(2) },
    { id: "tab-4", label: "Tab Size: 4", action: () => setEditorTabSize(4) },
    { id: "open-shortcuts", label: "Show Keyboard Shortcuts", action: () => setShowShortcuts(true) },
    { id: "open-settings", label: "Open Settings", action: () => setShowSettings(true) },
    { id: "clear-terminal", label: "Clear Terminal", action: () => setTerminalOutput(["$ Terminal cleared."]) },
    { id: "encoding-utf8", label: "Encoding: UTF-8", action: () => setFileEncoding("UTF-8") },
    { id: "encoding-ascii", label: "Encoding: ASCII", action: () => setFileEncoding("ASCII") },
    { id: "line-lf", label: "Line Ending: LF", action: () => setLineEnding("LF") },
    { id: "line-crlf", label: "Line Ending: CRLF", action: () => setLineEnding("CRLF") },
  ];

  const filteredCommands = commands.filter((c) =>
    !commandFilter || c.label.toLowerCase().includes(commandFilter.toLowerCase())
  );

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
      // Improvement 391: Track recent files
      setRecentFiles((prev) => {
        const updated = [node.path, ...prev.filter((p) => p !== node.path)].slice(0, 20);
        safeSetRaw("cryptartist_vcw_recent_files", JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Failed to read: ${node.name} - ${err}`]);
    }
  };

  const closeTab = (path: string) => {
    // Improvement 393: Prevent closing pinned tabs
    if (pinnedTabs.includes(path)) return;
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
      emit("code:file-saved", { path: tab.path, name: tab.name, program: "vibecode-worker" });
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Save failed: ${err}`]);
    }
  };

  const activeTab = openTabs.find((t) => t.path === activeTabPath) || null;

  // Improvement 392: Update file stats when active tab changes
  useEffect(() => {
    if (activeTab) {
      const lines = activeTab.content.split("\n").length;
      const words = activeTab.content.split(/\s+/).filter(Boolean).length;
      const chars = activeTab.content.length;
      setFileStats({ lines, words, chars });
    } else {
      setFileStats(null);
    }
  }, [activeTab?.content, activeTab?.path]);

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

      const reply = await chatWithAI(prompt, { action: "coding-assistant" });
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
  // Search across files
  // ---------------------------------------------------------------------------

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !rootPath) return;
    setSearchResults([]);
    setBottomTab("search");
    const results: SearchResult[] = [];

    const searchInDir = async (dirPath: string) => {
      try {
        const entries = await invoke<DirEntry[]>("read_directory", { path: dirPath });
        for (const entry of entries) {
          if (entry.is_dir) {
            await searchInDir(entry.path);
          } else if (!isBinaryFile(entry.name)) {
            try {
              const content = await invoke<string>("read_text_file", { path: entry.path });
              const lines = content.split("\n");
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                let flags = searchCaseSensitive ? "g" : "gi";
                let pattern: RegExp;
                try {
                  pattern = searchRegex
                    ? new RegExp(searchQuery, flags)
                    : new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), flags);
                } catch {
                  return;
                }
                const match = pattern.exec(line);
                if (match) {
                  results.push({
                    file: entry.path,
                    line: i + 1,
                    content: line.trim().slice(0, 200),
                    matchStart: match.index,
                    matchEnd: match.index + match[0].length,
                  });
                }
                if (results.length >= 500) return;
              }
            } catch { /* skip unreadable files */ }
          }
          if (results.length >= 500) return;
        }
      } catch { /* skip unreadable dirs */ }
    };

    await searchInDir(rootPath);
    setSearchResults(results);
    setTerminalOutput((prev) => [...prev, `$ Search: "${searchQuery}" - ${results.length} results`]);
  }, [searchQuery, rootPath, searchCaseSensitive, searchRegex, loadDirectory]);

  // ---------------------------------------------------------------------------
  // Problem scanner (basic lint/pattern detection)
  // ---------------------------------------------------------------------------

  const scanForProblems = useCallback(() => {
    const newProblems: ProblemEntry[] = [];
    for (const tab of openTabs) {
      const lines = tab.content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // console.log left in code
        if (/console\.log\(/.test(line) && !tab.name.endsWith(".test.ts") && !tab.name.endsWith(".test.js")) {
          newProblems.push({ file: tab.name, line: i + 1, col: line.indexOf("console.log") + 1, severity: "warning", message: "console.log statement found", source: "vcw-lint" });
        }
        // TODO/FIXME/HACK comments
        const todoMatch = line.match(/\/\/\s*(TODO|FIXME|HACK|XXX)[\s:]/i);
        if (todoMatch) {
          newProblems.push({ file: tab.name, line: i + 1, col: (todoMatch.index || 0) + 1, severity: "info", message: `${todoMatch[1].toUpperCase()}: ${line.trim().slice(todoMatch[0].length).trim() || "(no description)"}`, source: "todo-scanner" });
        }
        // Very long lines
        if (line.length > 200) {
          newProblems.push({ file: tab.name, line: i + 1, col: 200, severity: "warning", message: `Line too long (${line.length} chars)`, source: "vcw-lint" });
        }
        // Debugger statements
        if (/\bdebugger\b/.test(line)) {
          newProblems.push({ file: tab.name, line: i + 1, col: line.indexOf("debugger") + 1, severity: "error", message: "debugger statement found", source: "vcw-lint" });
        }
        // Empty catch blocks
        if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(line)) {
          newProblems.push({ file: tab.name, line: i + 1, col: line.indexOf("catch") + 1, severity: "warning", message: "Empty catch block", source: "vcw-lint" });
        }
      }
    }
    setProblems(newProblems);
  }, [openTabs]);

  // Re-scan when tabs change
  useEffect(() => {
    scanForProblems();
  }, [openTabs, scanForProblems]);

  // ---------------------------------------------------------------------------
  // Test runner (AI-powered analysis + pattern detection)
  // ---------------------------------------------------------------------------

  const detectTestFramework = useCallback((): string => {
    for (const tab of openTabs) {
      if (tab.name === "package.json") {
        try {
          const pkg = JSON.parse(tab.content);
          const allDeps = { ...pkg.devDependencies, ...pkg.dependencies };
          if (allDeps["jest"]) return "jest";
          if (allDeps["vitest"]) return "vitest";
          if (allDeps["mocha"]) return "mocha";
          if (allDeps["playwright"]) return "playwright";
          if (allDeps["cypress"]) return "cypress";
          if (pkg.scripts?.test) return "npm-test";
        } catch { /* ignore parse errors */ }
      }
      if (tab.name === "Cargo.toml") return "cargo-test";
      if (tab.name === "pytest.ini" || tab.name === "setup.py" || tab.name === "pyproject.toml") return "pytest";
    }
    return "unknown";
  }, [openTabs]);

  const runTests = async () => {
    const framework = detectTestFramework();
    setTestSuite((prev) => ({ ...prev, framework, running: true, results: [] }));
    setBottomTab("testing");
    logger.info("VibeCodeWorker", `Running tests (framework: ${framework})`);

    // Gather test files from open tabs
    const testFiles = openTabs.filter((t) =>
      t.name.includes(".test.") || t.name.includes(".spec.") || t.name.includes("_test.") || t.name.startsWith("test_")
    );

    // Use AI to analyze for test quality if we have a key
    const key = vcwApiKey;
    if (key && activeTab) {
      try {
        const codeSnippet = activeTab.content.slice(0, 6000);
        const prompt = `You are a senior QA engineer. Analyze this code for potential bugs, edge cases, and test coverage gaps. Return a JSON array of test results with this exact format (no markdown, just valid JSON):
[{"name":"test name","status":"pass"|"fail"|"warn","message":"explanation"}]

Code (${activeTab.name}):
\`\`\`
${codeSnippet}
\`\`\`

Analyze for: null checks, error handling, boundary conditions, type safety, security issues, race conditions. Return 5-15 checks as JSON array only.`;

        const reply = await chatWithAI(prompt, { action: "coding-planner" });
        // Try to parse JSON from the reply
        const jsonMatch = reply.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]) as { name: string; status: string; message: string }[];
            const results: TestResult[] = parsed.map((r) => ({
              name: r.name,
              status: r.status === "pass" ? "pass" : r.status === "warn" ? "skip" : "fail",
              message: r.message,
            }));
            const passed = results.filter((r) => r.status === "pass").length;
            const failed = results.filter((r) => r.status === "fail").length;
            const skipped = results.filter((r) => r.status === "skip").length;
            setTestSuite((prev) => ({
              ...prev,
              running: false,
              results,
              summary: { passed, failed, skipped, total: results.length },
              lastRun: new Date().toLocaleTimeString(),
            }));
            setTerminalOutput((prev) => [...prev, `$ Tests: ${passed} passed, ${failed} failed, ${skipped} warnings (AI analysis)`]);
            return;
          } catch { /* fall through to basic analysis */ }
        }
      } catch { /* fall through to basic analysis */ }
    }

    // Basic pattern-based test analysis (no AI required)
    const results: TestResult[] = [];
    if (testFiles.length > 0) {
      for (const tf of testFiles) {
        results.push({ name: `${tf.name} - file exists`, status: "pass" });
        const assertCount = (tf.content.match(/expect\(|assert[\.(]/g) || []).length;
        results.push({ name: `${tf.name} - ${assertCount} assertions`, status: assertCount > 0 ? "pass" : "fail", message: assertCount === 0 ? "No assertions found" : undefined });
      }
    } else {
      results.push({ name: "No test files found", status: "skip", message: "Create .test. or .spec. files" });
    }

    // Check for common issues in all open files
    for (const tab of openTabs) {
      if (tab.content.includes("any") && (tab.name.endsWith(".ts") || tab.name.endsWith(".tsx"))) {
        results.push({ name: `${tab.name} - TypeScript 'any' usage`, status: "fail", message: "Avoid using 'any' type" });
      }
      if (/catch\s*\([^)]*\)\s*\{\s*\}/.test(tab.content)) {
        results.push({ name: `${tab.name} - empty catch blocks`, status: "fail", message: "Handle errors properly" });
      }
    }

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const skipped = results.filter((r) => r.status === "skip").length;
    setTestSuite((prev) => ({
      ...prev,
      running: false,
      results,
      summary: { passed, failed, skipped, total: results.length },
      lastRun: new Date().toLocaleTimeString(),
    }));
  };

  // Auto-test on save
  const saveCurrentFileWithTest = async () => {
    await saveCurrentFile();
    if (testSuite.autoTest) {
      runTests();
    }
  };

  // ---------------------------------------------------------------------------
  // Web Audit (AI-powered Lighthouse-style analysis)
  // ---------------------------------------------------------------------------

  const runWebAudit = async () => {
    setWebAudit((prev) => ({ ...prev, running: true, scores: null, checks: [] }));
    setBottomTab("webaudit");
    logger.info("VibeCodeWorker", `Web audit: ${webAudit.url}`);

    const key = vcwApiKey;
    // Gather all HTML/CSS/JS files from open tabs for analysis
    const webFiles = openTabs.filter((t) =>
      ["html", "css", "javascript", "typescript"].includes(t.language)
    );
    const codeContext = webFiles.map((f) => `--- ${f.name} ---\n${f.content.slice(0, 3000)}`).join("\n\n");

    if (key && (codeContext.length > 0 || webAudit.url)) {
      try {
        const prompt = `You are a web quality auditor like Google Lighthouse. Analyze this web project and return a JSON object with scores and individual checks.

${codeContext.length > 0 ? `Source code:\n${codeContext.slice(0, 8000)}` : `Target URL: ${webAudit.url}`}

Return ONLY valid JSON (no markdown) in this exact format:
{
  "scores": {"performance": 0-100, "accessibility": 0-100, "bestPractices": 0-100, "seo": 0-100},
  "checks": [
    {"category": "performance|accessibility|bestPractices|seo", "name": "check name", "status": "pass|fail|warn", "detail": "explanation"}
  ]
}

Check for: page load optimizations, image alt tags, semantic HTML, ARIA roles, meta tags, viewport, HTTPS, CSP headers, font loading, CSS specificity, JS bundle size, accessibility contrast, keyboard navigation, heading hierarchy, link text, form labels, mobile responsiveness. Return 15-25 checks.`;

        const reply = await chatWithAI(prompt, { action: "coding-review" });
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setWebAudit((prev) => ({
            ...prev,
            running: false,
            scores: parsed.scores,
            checks: parsed.checks || [],
            timestamp: new Date().toLocaleTimeString(),
          }));
          setTerminalOutput((prev) => [...prev,
            `$ Web Audit: P:${parsed.scores?.performance} A:${parsed.scores?.accessibility} BP:${parsed.scores?.bestPractices} SEO:${parsed.scores?.seo}`,
          ]);
          return;
        }
      } catch { /* fall through */ }
    }

    // Fallback: basic pattern checks on code
    const checks: WebAuditCheck[] = [];
    for (const tab of webFiles) {
      if (tab.language === "html") {
        checks.push({ category: "seo", name: "HTML file exists", status: "pass", detail: tab.name });
        checks.push({
          category: "seo", name: "Meta viewport",
          status: tab.content.includes("viewport") ? "pass" : "fail",
          detail: tab.content.includes("viewport") ? "viewport meta tag found" : "Missing viewport meta tag",
        });
        checks.push({
          category: "accessibility", name: "Image alt attributes",
          status: (tab.content.match(/<img(?![^>]*alt=)/g) || []).length === 0 ? "pass" : "fail",
          detail: `${(tab.content.match(/<img(?![^>]*alt=)/g) || []).length} images missing alt text`,
        });
        checks.push({
          category: "seo", name: "Title tag",
          status: tab.content.includes("<title>") ? "pass" : "fail",
          detail: tab.content.includes("<title>") ? "Title tag present" : "Missing <title> tag",
        });
        checks.push({
          category: "accessibility", name: "Language attribute",
          status: tab.content.includes('lang=') ? "pass" : "warn",
          detail: tab.content.includes('lang=') ? "lang attribute found" : "Missing lang attribute on <html>",
        });
      }
    }
    if (checks.length === 0) {
      checks.push({ category: "info", name: "No web files", status: "info", detail: "Open HTML/CSS/JS files or set an API key for AI-powered analysis" });
    }
    const p = checks.filter((c) => c.category === "performance" && c.status === "pass").length;
    const a = checks.filter((c) => c.category === "accessibility" && c.status === "pass").length;
    const total = Math.max(checks.length, 1);
    setWebAudit((prev) => ({
      ...prev,
      running: false,
      scores: { performance: Math.round((p / total) * 100) || 50, accessibility: Math.round((a / total) * 100) || 50, bestPractices: 50, seo: 50 },
      checks,
      timestamp: new Date().toLocaleTimeString(),
    }));
  };

  // ---------------------------------------------------------------------------
  // .CryptArt save/open
  // ---------------------------------------------------------------------------

  const wsCtx = useWorkspace();

  // Load from active workspace on mount or workspace switch
  useEffect(() => {
    const active = wsCtx.getActiveWorkspace();
    if (active && active.program === "vibecode-worker") {
      const data = active.project.data as { rootPath?: string; openFiles?: { path: string; name: string }[]; activeFile?: string; aiProvider?: string; model?: string };
      if (data.rootPath) {
        setRootPath(data.rootPath);
        loadDirectory(data.rootPath).then(setFileTree).catch(() => {});
      }
      if (data.aiProvider) setApiProvider(data.aiProvider);
      if (data.model) setVcwModel(data.model);
      setTerminalOutput((prev) => [...prev, `$ Loaded workspace: ${active.displayName}`]);
    }
  }, [wsCtx.activeWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

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

      const active = wsCtx.getActiveWorkspace();
      const defaultPath = active?.filePath || "project.CryptArt";

      const savePath = await saveDialog({
        defaultPath,
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
      });
      if (savePath) {
        await invoke("write_text_file", { path: savePath, contents: json });
        if (active) {
          wsCtx.updateProject(active.id, cryptArt);
          wsCtx.updateFilePath(active.id, savePath);
          wsCtx.markClean(active.id);
        }
        setTerminalOutput((prev) => [...prev, `$ Project saved: ${savePath}`]);
        emit("workspace:saved", { program: "vibecode-worker", path: savePath });
        notifySuccess("vibecode-worker", "Project Saved", `Saved to ${(savePath as string).split(/[\\/]/).pop()}`);
      }
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Save project failed: ${err}`]);
    }
  };

  const handleOpenProject = async () => {
    try {
      const selected = await openDialog({
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
        multiple: true,
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];

      for (const filePath of paths) {
        if (typeof filePath !== "string") continue;
        const json = await invoke<string>("read_text_file", { path: filePath });
        const project = parseCryptArt(json);
        if (project.program !== "vibecode-worker") {
          setTerminalOutput((prev) => [...prev, `[error] ${filePath.split(/[\\/]/).pop()} is for ${project.program}, not VibeCodeWorker`]);
          continue;
        }
        const wsId = wsCtx.openWorkspace(project, filePath);
        wsCtx.setActiveWorkspace(wsId);
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

  // Improvement 61: Close all tabs
  const closeAllTabs = () => {
    setOpenTabs([]);
    setActiveTabPath(null);
  };

  // ---------------------------------------------------------------------------
  // File tree renderer - Improvement 47: file type icons
  // ---------------------------------------------------------------------------

  const renderTree = (nodes: FileNode[], depth = 0): JSX.Element[] => {
    return nodes.map((node) => (
      <div key={node.path}>
        <button type="button"
          onClick={() => openFile(node)}
          className={`w-full text-left px-2 py-[3px] text-[11px] flex items-center gap-1.5 hover:bg-studio-hover rounded transition-colors ${
            activeTabPath === node.path ? "bg-studio-hover text-studio-text" : "text-studio-secondary"
          }`}
          style={{ paddingLeft: `${8 + depth * 14}px` }}
        >
          <span className="text-[10px] opacity-70">
            {node.type === "directory"
              ? node.expanded ? "\u{1F4C2}" : "\u{1F4C1}"
              : fileIcon(node.name)}
          </span>
          <span className="truncate">{node.name}</span>
          {node.type === "file" && (
            <span className="ml-auto text-[8px] text-studio-muted opacity-0 group-hover:opacity-100">
              {node.name.split(".").pop()}
            </span>
          )}
        </button>
        {node.type === "directory" && node.expanded && node.children && renderTree(node.children, depth + 1)}
      </div>
    ));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-2 sm:px-4 gap-1 sm:gap-2 safe-area-top">
        <button type="button"
          onClick={() => navigate("/")}
          className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors"
          title="Back to Suite"
        >
          {"\u2190"}{!isMobile && " Suite"}
        </button>
        {isMobile && (
          <button type="button"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors"
            title="Toggle File Tree"
          >
            {"\u{1F4C1}"}
          </button>
        )}
        {!isMobile && <div className="w-px h-5 bg-studio-border" />}
        <span className="text-xl leading-none">{"\u{1F469}\u{1F3FB}\u200D\u{1F4BB}"}</span>
        {!isMobile && (
          <div className="flex flex-col">
            <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">VibeCodeWorker</span>
            <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">VCW</span>
          </div>
        )}
        <div className="flex-1" />
        <button type="button" onClick={handleOpenFolder} className="btn text-[10px] py-1 px-2 sm:px-3">
          {"\u{1F4C2}"}{!isMobile && " Open Folder"}
        </button>
        {!isMobile && (
          <>
            <button type="button" onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
              Open .CryptArt
            </button>
            <button onClick={handleSaveProject} className="btn text-[10px] py-1 px-3">
              Save .CryptArt
            </button>
            <button onClick={runTests} className="btn text-[10px] py-1 px-3" title="Run Tests">
              {testSuite.running ? "Testing..." : "\u{1F9EA} Test"}
            </button>
            <button onClick={runWebAudit} className="btn text-[10px] py-1 px-3" title="Web Audit">
              {webAudit.running ? "Auditing..." : "\u{1F310} Audit"}
            </button>
          </>
        )}
        {activeTab?.dirty && (
          <button onClick={saveCurrentFileWithTest} className="btn btn-cyan text-[10px] py-1 px-2 sm:px-3">
            {isMobile ? "Save" : "Save File"}
          </button>
        )}
        {/* Improvement 56: Keyboard shortcut help */}
        {!isMobile && (
          <button
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors ${showShortcuts ? "bg-studio-hover" : ""}`}
            title="Keyboard Shortcuts"
          >
            {"\u2328\uFE0F"}
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

      {/* Improvement 56: Keyboard shortcuts overlay */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <div className="bg-studio-panel border border-studio-border rounded-xl p-5 w-[400px] max-w-[90vw] shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-bold text-studio-text mb-3">{"\u2328\uFE0F"} Keyboard Shortcuts</h2>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[11px]">
              {[
                ["Ctrl+S", "Save current file"],
                ["Ctrl+Shift+P", "Command palette"],
                ["Ctrl+B", "Toggle sidebar"],
                ["Ctrl+`", "Toggle terminal"],
                ["Ctrl+/", "Toggle comment"],
                ["Ctrl+D", "Select next match"],
                ["Ctrl+F", "Find in file"],
                ["Ctrl+H", "Find & replace"],
                ["Ctrl+Shift+F", "Search in files"],
                ["Ctrl+W", "Close tab"],
                ["Alt+Up/Down", "Move line"],
                ["Ctrl++/-", "Zoom in/out"],
              ].map(([key, desc]) => (
                <div key={key} className="contents">
                  <span className="kbd text-[10px]">{key}</span>
                  <span className="text-studio-secondary">{desc}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowShortcuts(false)} className="btn text-[10px] py-1 px-3 mt-4 w-full">Close</button>
          </div>
        </div>
      )}

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
          {/* Improvement 48: Breadcrumb navigation bar */}
          {activeTab && (
            <div className="flex items-center h-[22px] bg-studio-surface border-b border-studio-border px-3 text-[10px] text-studio-muted overflow-hidden">
              {activeTab.path.split(/[\\/]/).slice(-3).map((seg, i, arr) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="mx-1 opacity-50">/</span>}
                  <span className={i === arr.length - 1 ? "text-studio-text font-medium" : ""}>{seg}</span>
                </span>
              ))}
              <span className="ml-2 text-[9px] text-studio-muted">({activeTab.language})</span>
            </div>
          )}

          {/* Tabs - Improvement 60: open file count + Improvement 61: close all */}
          <div className="flex items-center h-[32px] bg-studio-panel border-b border-studio-border overflow-x-auto">
            {openTabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabPath(tab.path)}
                className={`flex items-center gap-1.5 px-3 h-full text-[11px] cursor-pointer border-r border-studio-border transition-colors ${
                  activeTabPath === tab.path
                    ? "bg-studio-bg text-studio-text border-b-2 border-b-studio-cyan"
                    : "text-studio-secondary hover:bg-studio-surface"
                }`}
              >
                <span className="text-[9px]">{fileIcon(tab.name)}</span>
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
            {openTabs.length > 1 && (
              <button
                onClick={closeAllTabs}
                className="ml-auto mr-2 text-[9px] text-studio-muted hover:text-studio-text transition-colors px-2"
                title="Close all tabs"
              >
                Close All
              </button>
            )}
            {openTabs.length > 0 && (
              <span className="text-[9px] text-studio-muted pr-2">{openTabs.length} file{openTabs.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {/* Improvement 49-53: Editor toolbar */}
          {activeTab && (
            <div className="flex items-center gap-2 h-[26px] bg-studio-panel border-b border-studio-border px-3 text-[10px]">
              <button
                onClick={() => setEditorWordWrap(editorWordWrap === "on" ? "off" : "on")}
                className={`px-1.5 py-0.5 rounded transition-colors ${editorWordWrap === "on" ? "bg-studio-cyan/15 text-studio-cyan" : "text-studio-muted hover:text-studio-text"}`}
                title="Toggle word wrap"
              >
                Wrap {editorWordWrap === "on" ? "ON" : "OFF"}
              </button>
              <button
                onClick={() => setEditorMinimap(!editorMinimap)}
                className={`px-1.5 py-0.5 rounded transition-colors ${editorMinimap ? "bg-studio-cyan/15 text-studio-cyan" : "text-studio-muted hover:text-studio-text"}`}
                title="Toggle minimap"
              >
                Minimap
              </button>
              <div className="w-px h-3 bg-studio-border" />
              <button onClick={() => setEditorFontSize(Math.max(9, editorFontSize - 1))} className="text-studio-muted hover:text-studio-text" title="Decrease font size">A-</button>
              <span className="text-studio-secondary w-5 text-center">{editorFontSize}</span>
              <button onClick={() => setEditorFontSize(Math.min(24, editorFontSize + 1))} className="text-studio-muted hover:text-studio-text" title="Increase font size">A+</button>
              <div className="w-px h-3 bg-studio-border" />
              <button onClick={() => setEditorTabSize(editorTabSize === 2 ? 4 : 2)} className="text-studio-muted hover:text-studio-text" title="Toggle tab size">
                Tab: {editorTabSize}
              </button>
              <div className="w-px h-3 bg-studio-border" />
              <select aria-label="Select option"
                value={editorTheme}
                onChange={(e) => setEditorTheme(e.target.value)}
                className="bg-transparent text-[10px] text-studio-secondary outline-none cursor-pointer"
                title="Editor theme"
              >
                <option value="vs-dark">Dark</option>
                <option value="vs">Light</option>
                <option value="hc-black">High Contrast</option>
              </select>
            </div>
          )}

          {/* Monaco Editor - Improvements 49-53, 59 applied */}
          <div className="flex-1 min-h-0">
            {activeTab ? (
              <Editor
                height="100%"
                language={activeTab.language}
                value={activeTab.content}
                theme={editorTheme}
                onChange={(value) => {
                  setOpenTabs((prev) =>
                    prev.map((t) => (t.path === activeTab.path ? { ...t, content: value || "", dirty: true } : t))
                  );
                }}
                options={{
                  fontSize: editorFontSize,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: editorMinimap },
                  scrollBeyondLastLine: false,
                  padding: { top: 8 },
                  renderLineHighlight: "all",
                  bracketPairColorization: { enabled: true },
                  wordWrap: editorWordWrap,
                  tabSize: editorTabSize,
                  guides: { indentation: true },
                  lineNumbers: "on",
                }}
              />
            ) : (
              /* Improvement 65: Welcome tab when no files open */
              <div className="flex items-center justify-center h-full text-studio-muted text-sm animate-fade-in">
                <div className="text-center max-w-sm">
                  <span className="text-5xl block mb-3">{"\u{1F469}\u{1F3FB}\u200D\u{1F4BB}"}</span>
                  <p className="font-semibold text-studio-secondary text-base mb-1">VibeCodeWorker</p>
                  <p className="text-xs text-studio-muted mb-4">Your personal vibe-coding IDE</p>
                  <div className="grid grid-cols-2 gap-2 text-left mb-4">
                    <div className="p-2 rounded-lg bg-studio-surface border border-studio-border">
                      <span className="text-[10px] font-semibold text-studio-text">{"\u{1F4C2}"} Open Folder</span>
                      <p className="text-[9px] text-studio-muted mt-0.5">Browse and edit project files</p>
                    </div>
                    <div className="p-2 rounded-lg bg-studio-surface border border-studio-border">
                      <span className="text-[10px] font-semibold text-studio-text">{"\u{1F916}"} AI Chat</span>
                      <p className="text-[9px] text-studio-muted mt-0.5">Ask questions about your code</p>
                    </div>
                    <div className="p-2 rounded-lg bg-studio-surface border border-studio-border">
                      <span className="text-[10px] font-semibold text-studio-text">{"\u{1F9EA}"} Testing</span>
                      <p className="text-[9px] text-studio-muted mt-0.5">AI-powered code analysis</p>
                    </div>
                    <div className="p-2 rounded-lg bg-studio-surface border border-studio-border">
                      <span className="text-[10px] font-semibold text-studio-text">{"\u{1F310}"} Web Audit</span>
                      <p className="text-[9px] text-studio-muted mt-0.5">Lighthouse-style checks</p>
                    </div>
                  </div>
                  <div className="text-[10px] text-studio-muted space-y-1">
                    <p><span className="kbd">Ctrl+S</span> Save - <span className="kbd">Ctrl+/</span> Comment - <span className="kbd">{"\u2328\uFE0F"}</span> All shortcuts</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Panel - Tabbed */}
          <div className="h-[200px] min-h-[120px] bg-studio-panel border-t border-studio-border flex flex-col">
            {/* Tab bar */}
            <div className="flex items-center h-[28px] border-b border-studio-border bg-studio-panel px-1 gap-0.5">
              {([
                ["terminal", "Terminal", null],
                ["problems", `Problems${problems.length > 0 ? ` (${problems.length})` : ""}`, problems.filter((p) => p.severity === "error").length > 0 ? "text-red-400" : null],
                ["testing", `Testing${testSuite.summary.total > 0 ? ` ${testSuite.summary.passed}/${testSuite.summary.total}` : ""}`, testSuite.summary.failed > 0 ? "text-red-400" : testSuite.summary.passed > 0 ? "text-green-400" : null],
                ["webaudit", "Web Audit", webAudit.scores ? (Math.min(webAudit.scores.performance, webAudit.scores.accessibility, webAudit.scores.bestPractices, webAudit.scores.seo) >= 80 ? "text-green-400" : "text-yellow-400") : null],
                ["search", `Search${searchResults.length > 0 ? ` (${searchResults.length})` : ""}`, null],
              ] as [BottomTab, string, string | null][]).map(([id, label, color]) => (
                <button
                  key={id}
                  onClick={() => setBottomTab(id)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-t transition-colors ${
                    bottomTab === id ? "bg-studio-bg text-studio-text border-t-2 border-t-studio-cyan" : "text-studio-muted hover:text-studio-secondary"
                  } ${color || ""}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Terminal tab */}
            {bottomTab === "terminal" && (
              <>
                <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[11px] text-studio-green">
                  {terminalOutput.map((line, i) => (
                    <div key={i} className={line.startsWith("$") ? "text-studio-cyan" : line.startsWith("[error]") ? "text-red-400" : line.startsWith("[info]") ? "text-studio-secondary" : "text-studio-secondary"}>
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
              </>
            )}

            {/* Problems tab */}
            {bottomTab === "problems" && (
              <div className="flex-1 overflow-y-auto">
                {problems.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[11px] text-studio-muted">No problems detected</div>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-studio-muted border-b border-studio-border">
                        <th className="px-2 py-1 w-8"></th>
                        <th className="px-2 py-1">Message</th>
                        <th className="px-2 py-1 w-32">File</th>
                        <th className="px-2 py-1 w-16">Line</th>
                        <th className="px-2 py-1 w-20">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {problems.map((p, i) => (
                        <tr key={i} className="hover:bg-studio-hover border-b border-studio-border/30 cursor-pointer">
                          <td className="px-2 py-0.5">{p.severity === "error" ? "\u{274C}" : p.severity === "warning" ? "\u{26A0}\uFE0F" : "\u{2139}\uFE0F"}</td>
                          <td className="px-2 py-0.5 text-studio-text">{p.message}</td>
                          <td className="px-2 py-0.5 text-studio-secondary truncate">{p.file}</td>
                          <td className="px-2 py-0.5 text-studio-muted">{p.line}:{p.col}</td>
                          <td className="px-2 py-0.5 text-studio-muted">{p.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Testing tab */}
            {bottomTab === "testing" && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="flex items-center gap-3 px-3 py-1.5 border-b border-studio-border">
                  <button onClick={runTests} disabled={testSuite.running} className="btn btn-cyan text-[10px] py-0.5 px-3">
                    {testSuite.running ? "Running..." : "\u{25B6} Run Tests"}
                  </button>
                  <label className="flex items-center gap-1.5 text-[10px] text-studio-secondary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={testSuite.autoTest}
                      onChange={(e) => setTestSuite((prev) => ({ ...prev, autoTest: e.target.checked }))}
                      className="w-3 h-3"
                    />
                    Auto-test on save
                  </label>
                  <span className="text-[10px] text-studio-muted">Framework: {testSuite.framework}</span>
                  {testSuite.lastRun && <span className="text-[10px] text-studio-muted ml-auto">Last run: {testSuite.lastRun}</span>}
                </div>
                {testSuite.summary.total > 0 && (
                  <div className="flex items-center gap-4 px-3 py-1 border-b border-studio-border/50 text-[10px]">
                    <span className="text-green-400 font-semibold">{testSuite.summary.passed} passed</span>
                    <span className="text-red-400 font-semibold">{testSuite.summary.failed} failed</span>
                    <span className="text-yellow-400 font-semibold">{testSuite.summary.skipped} warnings</span>
                    <span className="text-studio-muted">{testSuite.summary.total} total</span>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto px-3 py-1">
                  {testSuite.results.length === 0 && !testSuite.running && (
                    <div className="flex items-center justify-center h-full text-[11px] text-studio-muted">Click "Run Tests" to analyze your code</div>
                  )}
                  {testSuite.results.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5 text-[11px]">
                      <span className="mt-0.5">{r.status === "pass" ? "\u2705" : r.status === "fail" ? "\u274C" : r.status === "running" ? "\u23F3" : "\u26A0\uFE0F"}</span>
                      <div>
                        <span className="text-studio-text">{r.name}</span>
                        {r.message && <span className="text-studio-muted ml-2">- {r.message}</span>}
                        {r.duration !== undefined && <span className="text-studio-muted ml-2">({r.duration}ms)</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Web Audit tab */}
            {bottomTab === "webaudit" && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="flex items-center gap-3 px-3 py-1.5 border-b border-studio-border">
                  <input
                    type="text"
                    value={webAudit.url}
                    onChange={(e) => setWebAudit((prev) => ({ ...prev, url: e.target.value }))}
                    className="input text-[11px] py-0.5 w-64"
                    placeholder="http://localhost:3000"
                  />
                  <button onClick={runWebAudit} disabled={webAudit.running} className="btn btn-cyan text-[10px] py-0.5 px-3">
                    {webAudit.running ? "Auditing..." : "\u{1F50D} Run Audit"}
                  </button>
                  {webAudit.timestamp && <span className="text-[10px] text-studio-muted ml-auto">Last: {webAudit.timestamp}</span>}
                </div>
                {webAudit.scores && (
                  <div className="flex items-center gap-4 px-3 py-2 border-b border-studio-border/50">
                    {(Object.entries(webAudit.scores) as [string, number][]).map(([key, val]) => {
                      const color = val >= 90 ? "text-green-400" : val >= 50 ? "text-yellow-400" : "text-red-400";
                      const bg = val >= 90 ? "bg-green-400/10 border-green-400/30" : val >= 50 ? "bg-yellow-400/10 border-yellow-400/30" : "bg-red-400/10 border-red-400/30";
                      const label = key === "bestPractices" ? "Best Practices" : key.charAt(0).toUpperCase() + key.slice(1);
                      return (
                        <div key={key} className={`flex flex-col items-center px-3 py-1 rounded border ${bg}`}>
                          <span className={`text-lg font-bold ${color}`}>{val}</span>
                          <span className="text-[9px] text-studio-muted">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex-1 overflow-y-auto px-3 py-1">
                  {webAudit.checks.length === 0 && !webAudit.running && (
                    <div className="flex items-center justify-center h-full text-[11px] text-studio-muted">Run an audit to see results</div>
                  )}
                  {webAudit.checks.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 py-0.5 text-[11px]">
                      <span className="mt-0.5">{c.status === "pass" ? "\u2705" : c.status === "fail" ? "\u274C" : c.status === "warn" ? "\u26A0\uFE0F" : "\u{2139}\uFE0F"}</span>
                      <div>
                        <span className="text-studio-text font-medium">{c.name}</span>
                        <span className="text-studio-muted ml-1 text-[10px]">[{c.category}]</span>
                        <div className="text-studio-secondary text-[10px]">{c.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search tab */}
            {bottomTab === "search" && (
              <div className="flex-1 overflow-y-auto flex flex-col">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b border-studio-border">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="input text-[11px] py-0.5 flex-1"
                    placeholder="Search in files..." autoComplete="off" spellCheck={false}
                  />
                  <input
                    type="text"
                    value={searchReplace}
                    onChange={(e) => setSearchReplace(e.target.value)}
                    className="input text-[11px] py-0.5 flex-1"
                    placeholder="Replace with..."
                  />
                  <label className="flex items-center gap-1 text-[9px] text-studio-muted cursor-pointer" title="Case sensitive">
                    <input type="checkbox" checked={searchCaseSensitive} onChange={(e) => setSearchCaseSensitive(e.target.checked)} className="w-3 h-3" />
                    Aa
                  </label>
                  <label className="flex items-center gap-1 text-[9px] text-studio-muted cursor-pointer" title="Regex">
                    <input type="checkbox" checked={searchRegex} onChange={(e) => setSearchRegex(e.target.checked)} className="w-3 h-3" />
                    .*
                  </label>
                  <button onClick={handleSearch} className="btn btn-cyan text-[10px] py-0.5 px-3">Search</button>
                </div>
                <div className="flex-1 overflow-y-auto px-1 py-1">
                  {searchResults.length === 0 && (
                    <div className="flex items-center justify-center h-full text-[11px] text-studio-muted">
                      {searchQuery ? "No results" : "Enter a search term"}
                    </div>
                  )}
                  {searchResults.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const existing = openTabs.find((t) => t.path === r.file);
                        if (existing) {
                          setActiveTabPath(r.file);
                        } else {
                          openFile({ name: r.file.split(/[\\/]/).pop() || r.file, path: r.file, type: "file" });
                        }
                      }}
                      className="w-full text-left px-2 py-0.5 text-[11px] hover:bg-studio-hover rounded flex gap-2 items-baseline"
                    >
                      <span className="text-studio-muted w-8 text-right shrink-0">{r.line}</span>
                      <span className="text-studio-cyan truncate w-32 shrink-0">{r.file.split(/[\\/]/).pop()}</span>
                      <span className="text-studio-secondary truncate">{r.content}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Panel */}
        <div className="w-[300px] min-w-[240px] bg-studio-panel border-l border-studio-border flex flex-col">
          <div className="panel-header flex items-center justify-between px-3 py-2 border-b border-studio-border">
            <div className="flex items-center gap-2">
              <h3 className="m-0 text-[11px] font-bold">{"\u{1F916}"} AI Assistant</h3>
              {aiLoading && <span className="text-[9px] text-studio-cyan animate-pulse">thinking...</span>}
            </div>
            <AIOptimizer actionKey="coding-assistant" />
          </div>

          {/* Settings Panel (inline toggle) */}
          {showSettings && (
            <div className="p-3 border-b border-studio-border bg-studio-surface animate-fade-in">
              <h4 className="text-[10px] font-semibold uppercase text-studio-secondary mb-2">API Configuration</h4>
              <div className="flex flex-col gap-2">
                <select aria-label="Select option"
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  className="input text-[11px] py-1"
                >
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter (200+ models)</option>
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
                {/* Improvement 341: OpenRouter model selector */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={vcwModel}
                    onChange={(e) => setVcwModel(e.target.value)}
                    className="input text-[11px] py-1 flex-1"
                    placeholder="Model name (e.g. gpt-4o)"
                  />
                  <select aria-label="Select option"
                    value={getDefaultModel()}
                    onChange={(e) => setDefaultModel(e.target.value)}
                    className="input text-[9px] py-1 w-28"
                    title="OpenRouter model"
                  >
                    {["openai/gpt-5-mini", "openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "anthropic/claude-3-haiku", "google/gemini-pro-1.5", "google/gemini-2.0-flash-001", "meta-llama/llama-3.1-70b-instruct", "deepseek/deepseek-chat", "deepseek/deepseek-r1", "mistralai/mistral-large"].map((m) => (
                      <option key={m} value={m}>{m.split("/").pop()}</option>
                    ))}
                  </select>
                </div>
                <div className="text-[9px] text-studio-muted">
                  {vcwApiKey ? "\u2705 Key set" : "\u26A0\uFE0F No key - uses shared CryptArtist key if available"}
                  {" | OR: "}{getDefaultModel().split("/").pop()}
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

      {/* Improvement 150: Command Palette overlay */}
      {showCommandPalette && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowCommandPalette(false)}>
          <div className="w-[420px] bg-studio-panel border border-studio-border-bright rounded-xl shadow-2xl" style={{ marginTop: '-20vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="p-2 border-b border-studio-border">
              <input
                ref={commandPaletteRef}
                type="text"
                value={commandFilter}
                onChange={(e) => setCommandFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowCommandPalette(false);
                  if (e.key === "Enter" && filteredCommands.length > 0) {
                    filteredCommands[0].action();
                    setShowCommandPalette(false);
                  }
                }}
                className="input text-[12px] py-2"
                placeholder="Type a command..."
              />
            </div>
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin p-1">
              {filteredCommands.map((cmd) => (
                <div
                  key={cmd.id}
                  className="dropdown-item py-2"
                  onClick={() => { cmd.action(); setShowCommandPalette(false); }}
                >
                  {cmd.label}
                </div>
              ))}
              {filteredCommands.length === 0 && (
                <div className="text-[11px] text-studio-muted text-center py-4">No matching commands</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Improvement 243: Snippets panel */}
      {showSnippets && (
        <div className="modal-overlay" onClick={() => setShowSnippets(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F4CB}"} Code Snippets</h2>
              <button onClick={() => setShowSnippets(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-2">
                {snippets.map((s) => (
                  <div key={s.id} className="p-2 rounded bg-studio-surface border border-studio-border cursor-pointer hover:border-studio-cyan transition-colors"
                    onClick={() => { setShowSnippets(false); toast.info(`Inserted: ${s.name}`); }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-studio-text">{s.name}</span>
                      <span className="badge text-[8px]">{s.language}</span>
                    </div>
                    <pre className="text-[9px] text-studio-muted mt-1 truncate-2">{s.code}</pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 245: Go-to-line dialog */}
      {showGoToLine && (
        <div className="modal-overlay" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setShowGoToLine(false)}>
          <div className="w-[280px] bg-studio-panel border border-studio-border-bright rounded-xl shadow-2xl p-3" style={{ marginTop: '-25vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="text-[11px] text-studio-secondary mb-2">Go to Line</div>
            <input
              type="number"
              value={goToLineInput}
              onChange={(e) => setGoToLineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const line = parseInt(goToLineInput);
                  if (line > 0) { setCursorLine(line); setCursorCol(1); }
                  setShowGoToLine(false); setGoToLineInput("");
                }
                if (e.key === "Escape") { setShowGoToLine(false); setGoToLineInput(""); }
              }}
              className="input text-[12px] py-1.5 w-full"
              placeholder="Line number..."
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Improvement 248: Symbol outline panel */}
      {showOutline && (
        <div className="modal-overlay" onClick={() => setShowOutline(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F4D1}"} Symbol Outline</h2>
              <button onClick={() => setShowOutline(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body">
              {outlineSymbols.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">{"\u{1F4D1}"}</div>
                  <div className="empty-state-title">No symbols found</div>
                  <div className="empty-state-description">Open a file to see its symbol outline.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {outlineSymbols.map((sym, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-studio-hover cursor-pointer text-[10px]">
                      <span className="text-studio-cyan">{sym.kind === "function" ? "f" : sym.kind === "class" ? "C" : sym.kind === "variable" ? "v" : "#"}</span>
                      <span className="text-studio-text">{sym.name}</span>
                      <span className="ml-auto text-studio-muted">:{sym.line}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Bar - Improvements 241-260 */}
      <footer className="status-bar" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span>{"\u{1F469}\u{1F3FB}\u200D\u{1F4BB}"} VCW v0.1.0</span>
          {gitBranch && (
            <>
              <span>|</span>
              <span className="flex items-center gap-1">
                <span className="text-studio-cyan">{"\u{1F33F}"}</span>
                {gitBranch}
                {gitChanges > 0 && <span className="text-studio-yellow">+{gitChanges}</span>}
              </span>
            </>
          )}
          <span>|</span>
          <span>Ln {cursorLine}, Col {cursorCol}</span>
          {/* Improvement 254: Multiple cursors */}
          {cursorCount > 1 && <span className="text-studio-cyan">({cursorCount} cursors)</span>}
          {/* Improvement 257: Selection count */}
          {selectionCount > 0 && (
            <>
              <span>|</span>
              <span>{selectionCount} selected</span>
            </>
          )}
          {/* Improvement 244: Bookmarks */}
          {bookmarks.length > 0 && (
            <>
              <span>|</span>
              <span>{"\u{1F516}"} {bookmarks.length}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span>{activeTab ? `${fileIcon(activeTab.name)} ${activeTab.language}` : "No file"}</span>
          <span>|</span>
          <span>{fileEncoding}</span>
          <span>|</span>
          <span>{lineEnding}</span>
          <span>|</span>
          {/* Improvement 247: Indent */}
          <span>{detectedIndent === "spaces" ? `Spaces: ${editorTabSize}` : "Tabs"}</span>
          <span>|</span>
          <span>{editorZoom}%</span>
          <span>|</span>
          {/* Improvement 241: Split indicator */}
          {splitView && <><span className="text-studio-cyan">Split</span><span>|</span></>}
          {/* Improvement 255: Inline blame */}
          {inlineBlame && <><span className="text-studio-purple">Blame</span><span>|</span></>}
          <span>{apiProvider}/{vcwModel}</span>
          <span>|</span>
          <span>{vcwApiKey ? "\u{1F7E2}" : "\u{1F7E1}"}</span>
          {autoSave && <><span>|</span><span className="text-studio-green">AS</span></>}
          {openTabs.length > 0 && <><span>|</span><span>{openTabs.length} files</span></>}
          {problems.filter((p) => p.severity === "error").length > 0 && (
            <><span>|</span><span className="text-red-400">{problems.filter((p) => p.severity === "error").length} err</span></>
          )}
          {/* Improvement 260: Word count */}
          {wordCount > 0 && <><span>|</span><span>{wordCount}w</span></>}
        </div>
      </footer>
    </div>
  );
}
