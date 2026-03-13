import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";
import { logSecurityEvent, sanitizeFilePath } from "../../utils/security";

const MAX_CMD_HISTORY = 500; // Vuln 60: Max command history entries
const MAX_DISPLAY_HISTORY = 200; // Vuln 60: Max display history
const MAX_SCRIPT_SIZE = 50000; // Vuln 67: Max script content size
const MAX_ENV_VARS = 100; // Vuln 73: Max environment variables
const MAX_ALIASES = 50; // Vuln 74: Max command aliases
const MAX_INPUT_LENGTH = 10000; // Vuln 35: Max command input length

interface CommandHistoryEntry {
  id: string;
  command: string;
  result: string;
  status: "success" | "error" | "info";
  timestamp: number;
}

interface ScriptFile {
  id: string;
  name: string;
  content: string;
  language: "javascript" | "shell" | "python";
  lastRun: number | null;
}

interface ApiEndpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  params?: string;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  { method: "GET", path: "/api/health", description: "Health check" },
  { method: "GET", path: "/api/project", description: "Get current project state" },
  { method: "GET", path: "/api/keys/status", description: "Check configured API keys" },
  { method: "POST", path: "/api/chat", description: "AI chat via OpenAI", params: "prompt, model?" },
  { method: "POST", path: "/api/openrouter/chat", description: "Chat via OpenRouter", params: "prompt, model" },
  { method: "GET", path: "/api/openrouter/models", description: "List OpenRouter models" },
  { method: "POST", path: "/api/image/generate", description: "Generate image", params: "prompt" },
  { method: "POST", path: "/api/tts", description: "Text-to-speech", params: "text" },
  { method: "GET", path: "/api/fs/read?path=", description: "Read a text file", params: "path" },
  { method: "POST", path: "/api/fs/write", description: "Write a text file", params: "path, contents" },
  { method: "GET", path: "/api/fs/ls?path=", description: "List directory", params: "path" },
  { method: "GET", path: "/api/pexels?query=&type=", description: "Search Pexels", params: "query, type" },
  { method: "GET", path: "/api/sysinfo", description: "System information" },
  { method: "GET", path: "/api/ffmpeg/status", description: "FFmpeg status" },
  { method: "POST", path: "/api/ffmpeg/install", description: "Install FFmpeg" },
  { method: "GET", path: "/api/godot/detect", description: "Detect Godot" },
  { method: "POST", path: "/api/keys/export", description: "Export all API keys" },
  { method: "POST", path: "/api/keys/import", description: "Import API keys", params: "json" },
];

const BUILTIN_COMMANDS = [
  { cmd: "help", desc: "Show all commands" },
  { cmd: "clear", desc: "Clear terminal" },
  { cmd: "version", desc: "Show version" },
  { cmd: "sysinfo", desc: "System information" },
  { cmd: "health", desc: "Run health check" },
  { cmd: "keys status", desc: "Check API key status" },
  { cmd: "keys export", desc: "Export API keys" },
  { cmd: "ffmpeg status", desc: "Check FFmpeg" },
  { cmd: "ffmpeg install", desc: "Install FFmpeg" },
  { cmd: "godot detect", desc: "Detect Godot" },
  { cmd: "ls <path>", desc: "List directory" },
  { cmd: "cat <path>", desc: "Read a file" },
  { cmd: "write <path> <content>", desc: "Write to file" },
  { cmd: "chat <prompt>", desc: "AI chat (OpenAI)" },
  { cmd: "or <prompt>", desc: "AI chat (OpenRouter)" },
  { cmd: "or models", desc: "List OpenRouter models" },
  { cmd: "pexels <query>", desc: "Search Pexels" },
  { cmd: "generate <prompt>", desc: "Generate AI image" },
  { cmd: "tts <text>", desc: "Text-to-speech" },
  { cmd: "project", desc: "Show project state" },
  { cmd: "programs", desc: "List programs" },
  { cmd: "run <script>", desc: "Run saved script" },
  { cmd: "scripts", desc: "List scripts" },
  { cmd: "api", desc: "REST API reference" },
  { cmd: "echo <text>", desc: "Echo text" },
  { cmd: "time", desc: "Current time" },
  { cmd: "history", desc: "Command history" },
  { cmd: "alias <name>=<cmd>", desc: "Create command alias" },
  { cmd: "aliases", desc: "List all aliases" },
  { cmd: "uptime", desc: "Session uptime" },
  { cmd: "whoami", desc: "Show user info" },
  { cmd: "open <program>", desc: "Open a program" },
  { cmd: "env", desc: "Show environment vars" },
  { cmd: "env set <k> <v>", desc: "Set env variable" },
  { cmd: "bench <cmd>", desc: "Benchmark a command" },
  { cmd: "count", desc: "Count total commands run" },
  { cmd: "grep <pattern> <path>", desc: "Search in file" },
  { cmd: "head <n> <path>", desc: "First N lines of file" },
  { cmd: "tail <n> <path>", desc: "Last N lines of file" },
  { cmd: "wc <path>", desc: "Word/line/char count" },
  { cmd: "sort <path>", desc: "Sort lines of file" },
  { cmd: "uniq <path>", desc: "Unique lines of file" },
  { cmd: "date", desc: "Current date and time" },
  { cmd: "calc <expr>", desc: "Evaluate math expression" },
  { cmd: "pwd", desc: "Print working directory" },
  { cmd: "touch <path>", desc: "Create empty file" },
  { cmd: "export-history", desc: "Export command history" },
];

export default function Commander() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<CommandHistoryEntry[]>([{
    id: "welcome", command: "", status: "info", timestamp: Date.now(),
    result: "\u{1F431} CryptArt Commander v0.1.0\n---\nControl CryptArtist Studio through the command line.\nType \"help\" for commands, \"api\" for REST API reference.\nOpenRouter integration: type \"or <prompt>\" to chat with any AI.\n---",
  }]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [scripts, setScripts] = useState<ScriptFile[]>(() => {
    try {
      const s = localStorage.getItem("cryptartist_commander_scripts");
      return s ? JSON.parse(s) : [
        { id: "d1", name: "hello-world", content: "echo Hello from CryptArt Commander!\nversion\ntime", language: "shell" as const, lastRun: null },
        { id: "d2", name: "system-check", content: "sysinfo\nhealth\nffmpeg status\ngodot detect\nkeys status", language: "shell" as const, lastRun: null },
      ];
    } catch { return []; }
  });
  const [activeTab, setActiveTab] = useState<"terminal" | "scripts" | "api">("terminal");
  const [editingScript, setEditingScript] = useState<ScriptFile | null>(null);
  const [running, setRunning] = useState(false);
  const termEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Improvement 311: Command aliases
  const [aliases, setAliases] = useState<Record<string, string>>(() => {
    try { const a = localStorage.getItem("cryptartist_cmd_aliases"); return a ? JSON.parse(a) : { ll: "ls .", st: "keys status", hc: "health", v: "version" }; }
    catch { return {}; }
  });
  // Improvement 312: Tab completion suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIdx, setSuggestionIdx] = useState(-1);
  // Improvement 313: Session uptime
  const [sessionStart] = useState(Date.now());
  // Improvement 314: Environment variables
  const [envVars, setEnvVars] = useState<Record<string, string>>({ USER: "Matt", SHELL: "cac", HOME: "~", EDITOR: "vibecode-worker", TERM: "cryptart-commander" });
  // Improvement 315: Command count
  const [totalCmdCount, setTotalCmdCount] = useState(() => {
    const c = localStorage.getItem("cryptartist_cmd_count"); return c ? parseInt(c, 10) : 0;
  });

  useEffect(() => { localStorage.setItem("cryptartist_commander_scripts", JSON.stringify(scripts)); }, [scripts]);
  useEffect(() => { localStorage.setItem("cryptartist_cmd_aliases", JSON.stringify(aliases)); }, [aliases]);
  useEffect(() => { localStorage.setItem("cryptartist_cmd_count", String(totalCmdCount)); }, [totalCmdCount]);
  useEffect(() => { termEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [history]);
  useEffect(() => { if (activeTab === "terminal") inputRef.current?.focus(); }, [activeTab]);

  const addEntry = useCallback((command: string, result: string, status: "success" | "error" | "info" = "success") => {
    setHistory((prev) => {
      const next = [...prev, { id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, command, result, status, timestamp: Date.now() }];
      // Vuln 60: Limit display history size
      if (next.length > MAX_DISPLAY_HISTORY) return next.slice(next.length - MAX_DISPLAY_HISTORY);
      return next;
    });
  }, []);

  const executeCommand = useCallback(async (raw: string): Promise<void> => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    // Vuln 35: Limit command input length
    if (trimmed.length > MAX_INPUT_LENGTH) {
      addEntry(trimmed.substring(0, 50) + "...", "Command too long (max " + MAX_INPUT_LENGTH + " chars)", "error");
      return;
    }
    // Improvement 311: Resolve aliases
    const firstWord = trimmed.split(/\s+/)[0].toLowerCase();
    const resolved = aliases[firstWord] ? aliases[firstWord] + trimmed.slice(firstWord.length) : trimmed;
    const parts = resolved.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(" ");
    setTotalCmdCount((prev) => prev + 1);

    try {
      if (cmd === "help") {
        addEntry(trimmed, "Available commands:\n" + BUILTIN_COMMANDS.map((c) => "  " + c.cmd.padEnd(26) + c.desc).join("\n"));
      } else if (cmd === "clear") {
        setHistory([]);
      } else if (cmd === "version") {
        addEntry(trimmed, "CryptArtist Studio v0.1.0\nCryptArt Commander [CAC] v0.1.0");
      } else if (cmd === "sysinfo") {
        const info = await invoke<string>("get_platform_info").catch(() => "Failed to get info");
        addEntry(trimmed, typeof info === "string" ? info : JSON.stringify(info, null, 2));
      } else if (cmd === "health") {
        const r = await invoke<string>("health_check").catch((e: unknown) => "Failed: " + e);
        addEntry(trimmed, typeof r === "string" ? r : JSON.stringify(r, null, 2));
      } else if (cmd === "keys") {
        if (args === "status") {
          const oa = await invoke<string>("get_api_key").catch(() => "");
          const px = await invoke<string>("get_pexels_key").catch(() => "");
          const or = await invoke<string>("get_openrouter_key").catch(() => "");
          addEntry(trimmed, [
            "OpenAI:      " + (oa ? "\u2705 Set (" + oa.slice(0, 8) + "...)" : "\u274C Not set"),
            "OpenRouter:  " + (or ? "\u2705 Set (" + or.slice(0, 8) + "...)" : "\u274C Not set"),
            "Pexels:      " + (px ? "\u2705 Set" : "\u274C Not set"),
          ].join("\n"));
        } else if (args === "export") {
          const json = await invoke<string>("export_all_api_keys");
          addEntry(trimmed, "Keys exported:\n" + json);
        } else {
          addEntry(trimmed, "Usage: keys status | keys export", "error");
        }
      } else if (cmd === "ffmpeg") {
        if (args === "status") {
          const ok = await invoke<boolean>("check_ffmpeg_installed");
          addEntry(trimmed, ok ? "\u2705 FFmpeg installed" : "\u274C FFmpeg not installed");
        } else if (args === "install") {
          addEntry(trimmed, "Installing FFmpeg...", "info");
          const r = await invoke<string>("install_ffmpeg");
          addEntry("", r);
        } else { addEntry(trimmed, "Usage: ffmpeg status | ffmpeg install", "error"); }
      } else if (cmd === "godot") {
        const info = await invoke<Record<string, unknown>>("godot_detect");
        addEntry(trimmed, JSON.stringify(info, null, 2));
      } else if (cmd === "ls") {
        if (!args) { addEntry(trimmed, "Usage: ls <path>", "error"); return; }
        const entries = await invoke<{ name: string; is_dir: boolean; size: number }[]>("read_directory", { path: args });
        addEntry(trimmed, entries.map((e) => (e.is_dir ? "[DIR]" : String(e.size).padStart(10) + "B") + " " + e.name).join("\n") || "(empty)");
      } else if (cmd === "cat") {
        if (!args) { addEntry(trimmed, "Usage: cat <path>", "error"); return; }
        // Vuln 36: Sanitize file path
        const safeCatPath = sanitizeFilePath(args);
        const c = await invoke<string>("read_text_file", { path: safeCatPath });
        addEntry(trimmed, c);
      } else if (cmd === "write") {
        const si = args.indexOf(" ");
        if (si === -1) { addEntry(trimmed, "Usage: write <path> <content>", "error"); return; }
        await invoke("write_text_file", { path: args.slice(0, si), contents: args.slice(si + 1) });
        addEntry(trimmed, "Written successfully.");
      } else if (cmd === "chat") {
        if (!args) { addEntry(trimmed, "Usage: chat <prompt>", "error"); return; }
        addEntry(trimmed, "Thinking...", "info");
        const reply = await invoke<string>("ai_chat", { prompt: args });
        addEntry("", reply);
      } else if (cmd === "or") {
        if (args === "models") {
          const m = await invoke<string>("openrouter_list_models");
          try { const p = JSON.parse(m); addEntry(trimmed, "Models:\n" + (p.data || []).slice(0, 30).map((x: { id: string }) => "  " + x.id).join("\n")); }
          catch { addEntry(trimmed, m); }
          return;
        }
        if (!args) { addEntry(trimmed, "Usage: or <prompt> | or models", "error"); return; }
        const model = localStorage.getItem("cryptartist_openrouter_model") || "openai/gpt-4o";
        addEntry(trimmed, "Sending to " + model + "...", "info");
        const orReply = await invoke<string>("openrouter_chat", { prompt: args, model });
        addEntry("", orReply);
      } else if (cmd === "pexels") {
        if (!args) { addEntry(trimmed, "Usage: pexels <query>", "error"); return; }
        const r = await invoke<string>("search_pexels", { query: args, searchType: "image" });
        try { const p = JSON.parse(r); addEntry(trimmed, "Found " + (p.photos?.length || 0) + " results for \"" + args + "\""); }
        catch { addEntry(trimmed, r); }
      } else if (cmd === "generate") {
        if (!args) { addEntry(trimmed, "Usage: generate <prompt>", "error"); return; }
        addEntry(trimmed, "Generating...", "info");
        const url = await invoke<string>("ai_generate_image", { prompt: args });
        addEntry("", "Image: " + url);
      } else if (cmd === "tts") {
        if (!args) { addEntry(trimmed, "Usage: tts <text>", "error"); return; }
        addEntry(trimmed, "Generating audio...", "info");
        const p = await invoke<string>("ai_generate_tts", { text: args });
        addEntry("", "Audio saved: " + p);
      } else if (cmd === "project") {
        const proj = await invoke<Record<string, unknown>>("get_project_state");
        addEntry(trimmed, JSON.stringify(proj, null, 2));
      } else if (cmd === "programs") {
        addEntry(trimmed, [
          "\u{1F4FA} Media Mogul     - Video/Image Editor",
          "\u{1F469}\u{1F3FB}\u200D\u{1F4BB} VibeCodeWorker  - AI Code IDE",
          "\u{1F3A5} DemoRecorder    - Screen Recorder",
          "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F ValleyNet       - AI Agent",
          "\u{1F3AE} GameStudio      - Game Dev + Godot",
          "\u{1F431} Commander       - API/CLI (here)",
          "\u2699\uFE0F Settings        - Configuration",
        ].join("\n"));
      } else if (cmd === "scripts") {
        addEntry(trimmed, scripts.length === 0 ? "No scripts." : scripts.map((s) => "  " + s.name + " (" + s.language + ")").join("\n"));
      } else if (cmd === "run") {
        const sc = scripts.find((s) => s.name.toLowerCase() === args.toLowerCase());
        if (!sc) { addEntry(trimmed, "Script not found: " + args, "error"); return; }
        addEntry(trimmed, "Running: " + sc.name, "info");
        for (const line of sc.content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"))) {
          await executeCommand(line);
        }
        setScripts((prev) => prev.map((s) => s.id === sc.id ? { ...s, lastRun: Date.now() } : s));
      } else if (cmd === "api") {
        addEntry(trimmed, "REST API (port 9420):\n" + API_ENDPOINTS.map((e) => "  " + e.method.padEnd(7) + e.path.padEnd(32) + e.description).join("\n"));
      } else if (cmd === "echo") {
        addEntry(trimmed, args);
      } else if (cmd === "time") {
        addEntry(trimmed, new Date().toLocaleString());
      } else if (cmd === "history") {
        addEntry(trimmed, cmdHistory.length === 0 ? "No history." : cmdHistory.slice(-20).map((c, i) => "  " + (i + 1) + ". " + c).join("\n"));
      } else if (cmd === "alias") {
        // Improvement 311: alias name=command
        const eq = args.indexOf("=");
        if (eq === -1) { addEntry(trimmed, "Usage: alias name=command", "error"); return; }
        const name = args.slice(0, eq).trim();
        const val = args.slice(eq + 1).trim();
        setAliases((prev) => ({ ...prev, [name]: val }));
        addEntry(trimmed, "Alias set: " + name + " -> " + val);
      } else if (cmd === "aliases") {
        const entries = Object.entries(aliases);
        addEntry(trimmed, entries.length === 0 ? "No aliases." : entries.map(([k, v]) => "  " + k + " -> " + v).join("\n"));
      } else if (cmd === "uptime") {
        // Improvement 313
        const secs = Math.floor((Date.now() - sessionStart) / 1000);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        addEntry(trimmed, "Session uptime: " + (m > 0 ? m + "m " : "") + s + "s\nTotal commands run: " + totalCmdCount);
      } else if (cmd === "whoami") {
        addEntry(trimmed, "User: " + envVars.USER + "\nShell: CryptArt Commander\nEditor: VibeCodeWorker\nHome: CryptArtist Studio");
      } else if (cmd === "open") {
        const programMap: Record<string, string> = {
          "media-mogul": "/media-mogul", mm: "/media-mogul",
          "vibecode-worker": "/vibecode-worker", vcw: "/vibecode-worker", vibe: "/vibecode-worker",
          "demo-recorder": "/demo-recorder", dr: "/demo-recorder",
          "valley-net": "/valley-net", vn: "/valley-net",
          "game-studio": "/game-studio", gs: "/game-studio",
          settings: "/settings", set: "/settings",
          home: "/", launcher: "/",
        };
        const route = programMap[args.toLowerCase()];
        if (route) { addEntry(trimmed, "Opening " + args + "..."); navigate(route); }
        else { addEntry(trimmed, "Unknown program: " + args + "\nAvailable: " + Object.keys(programMap).join(", "), "error"); }
      } else if (cmd === "env") {
        // Improvement 314
        if (args.startsWith("set ")) {
          const envParts = args.slice(4).split(/\s+/);
          if (envParts.length < 2) { addEntry(trimmed, "Usage: env set <key> <value>", "error"); return; }
          setEnvVars((prev) => ({ ...prev, [envParts[0]]: envParts.slice(1).join(" ") }));
          addEntry(trimmed, "Set " + envParts[0] + "=" + envParts.slice(1).join(" "));
        } else {
          addEntry(trimmed, Object.entries(envVars).map(([k, v]) => "  " + k + "=" + v).join("\n"));
        }
      } else if (cmd === "bench") {
        // Improvement 315: Benchmark
        if (!args) { addEntry(trimmed, "Usage: bench <command>", "error"); return; }
        const start = performance.now();
        await executeCommand(args);
        const elapsed = (performance.now() - start).toFixed(2);
        addEntry("", "Benchmark: " + elapsed + "ms", "info");
      } else if (cmd === "count") {
        addEntry(trimmed, "Total commands this session: " + totalCmdCount);
      } else if (cmd === "grep") {
        // Improvement 316: grep in file
        const gParts = args.split(/\s+/);
        if (gParts.length < 2) { addEntry(trimmed, "Usage: grep <pattern> <path>", "error"); return; }
        const pattern = gParts[0];
        const filePath = gParts.slice(1).join(" ");
        const content = await invoke<string>("read_text_file", { path: filePath });
        const matches = content.split("\n").filter((l) => l.toLowerCase().includes(pattern.toLowerCase()));
        addEntry(trimmed, matches.length === 0 ? "No matches." : matches.slice(0, 50).map((l, i) => (i + 1) + ": " + l).join("\n"));
      } else if (cmd === "head") {
        const hParts = args.split(/\s+/);
        if (hParts.length < 2) { addEntry(trimmed, "Usage: head <n> <path>", "error"); return; }
        const n = parseInt(hParts[0], 10) || 10;
        const content = await invoke<string>("read_text_file", { path: hParts.slice(1).join(" ") });
        addEntry(trimmed, content.split("\n").slice(0, n).join("\n"));
      } else if (cmd === "tail") {
        const tParts = args.split(/\s+/);
        if (tParts.length < 2) { addEntry(trimmed, "Usage: tail <n> <path>", "error"); return; }
        const n = parseInt(tParts[0], 10) || 10;
        const content = await invoke<string>("read_text_file", { path: tParts.slice(1).join(" ") });
        const lines = content.split("\n");
        addEntry(trimmed, lines.slice(Math.max(0, lines.length - n)).join("\n"));
      } else if (cmd === "wc") {
        // Improvement 377: Word count
        if (!args) { addEntry(trimmed, "Usage: wc <path>", "error"); return; }
        const content = await invoke<string>("read_text_file", { path: args });
        const lines = content.split("\n").length;
        const words = content.split(/\s+/).filter(Boolean).length;
        const chars = content.length;
        addEntry(trimmed, `  ${lines} lines  ${words} words  ${chars} chars  ${args}`);
      } else if (cmd === "sort") {
        // Improvement 378: Sort lines
        if (!args) { addEntry(trimmed, "Usage: sort <path>", "error"); return; }
        const content = await invoke<string>("read_text_file", { path: args });
        addEntry(trimmed, content.split("\n").sort().join("\n"));
      } else if (cmd === "uniq") {
        // Improvement 379: Unique lines
        if (!args) { addEntry(trimmed, "Usage: uniq <path>", "error"); return; }
        const content = await invoke<string>("read_text_file", { path: args });
        addEntry(trimmed, [...new Set(content.split("\n"))].join("\n"));
      } else if (cmd === "date") {
        // Improvement 380: Full date info
        const now = new Date();
        addEntry(trimmed, [
          "Date: " + now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
          "Time: " + now.toLocaleTimeString(),
          "ISO:  " + now.toISOString(),
          "Unix: " + Math.floor(now.getTime() / 1000),
        ].join("\n"));
      } else if (cmd === "calc") {
        // Improvement 381: Calculator
        if (!args) { addEntry(trimmed, "Usage: calc <expression>  e.g. calc 2+2", "error"); return; }
        try {
          const safe = args.replace(/[^0-9+\-*/().%\s]/g, "");
          const result = Function('"use strict"; return (' + safe + ')')();
          addEntry(trimmed, "= " + result);
        } catch { addEntry(trimmed, "Invalid expression: " + args, "error"); }
      } else if (cmd === "pwd") {
        // Improvement 382: Print working directory
        try {
          const cwd = await invoke<string>("get_cwd").catch(() => "~");
          addEntry(trimmed, cwd || "~");
        } catch { addEntry(trimmed, "~ (CryptArtist Studio home)"); }
      } else if (cmd === "touch") {
        // Improvement 383: Create empty file
        if (!args) { addEntry(trimmed, "Usage: touch <path>", "error"); return; }
        await invoke("write_text_file", { path: args, contents: "" });
        addEntry(trimmed, "Created: " + args);
      } else if (cmd === "export-history") {
        // Improvement 384: Export command history
        const text = cmdHistory.map((c, i) => (i + 1) + ". " + c).join("\n");
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `commander-history-${Date.now()}.txt`; a.click();
        URL.revokeObjectURL(url);
        addEntry(trimmed, "History exported (" + cmdHistory.length + " commands)");
      } else {
        addEntry(trimmed, "Unknown command: " + cmd + ". Type \"help\" for available commands.", "error");
      }
    } catch (err) {
      addEntry(trimmed, "Error: " + String(err), "error");
    }
  }, [addEntry, scripts, cmdHistory, aliases, sessionStart, totalCmdCount, envVars, navigate]);

  const handleSubmit = async () => {
    if (!input.trim() || running) return;
    setRunning(true);
    setCmdHistory((prev) => [...prev, input.trim()]);
    setHistoryIdx(-1);
    await executeCommand(input);
    setInput("");
    setRunning(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      // Improvement 312: Tab completion
      e.preventDefault();
      if (suggestions.length > 0) {
        const nextIdx = (suggestionIdx + 1) % suggestions.length;
        setSuggestionIdx(nextIdx);
        setInput(suggestions[nextIdx]);
      } else {
        const allCmds = BUILTIN_COMMANDS.map((c) => c.cmd.split(" ")[0]);
        const allAliases = Object.keys(aliases);
        const all = [...new Set([...allCmds, ...allAliases])];
        const matches = all.filter((c) => c.startsWith(input.toLowerCase()));
        if (matches.length === 1) { setInput(matches[0] + " "); setSuggestions([]); }
        else if (matches.length > 1) { setSuggestions(matches); setSuggestionIdx(0); setInput(matches[0]); }
      }
      return;
    }
    setSuggestions([]); setSuggestionIdx(-1);
    if (e.key === "Enter") { handleSubmit(); }
    else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (cmdHistory.length > 0) {
        const idx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
        setHistoryIdx(idx);
        setInput(cmdHistory[idx]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx >= 0) {
        const idx = historyIdx + 1;
        if (idx >= cmdHistory.length) { setHistoryIdx(-1); setInput(""); }
        else { setHistoryIdx(idx); setInput(cmdHistory[idx]); }
      }
    }
  };

  const saveScript = () => {
    if (!editingScript) return;
    setScripts((prev) => {
      const exists = prev.find((s) => s.id === editingScript.id);
      if (exists) return prev.map((s) => s.id === editingScript.id ? editingScript : s);
      return [...prev, editingScript];
    });
    setEditingScript(null);
    toast.success("Script saved!");
  };

  return (
    <div className="flex flex-col h-screen bg-studio-bg text-studio-text">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-studio-panel border-b border-studio-border shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="btn-ghost text-studio-muted hover:text-studio-text text-sm">{"\u2190"} Back</button>
          <span className="text-lg font-bold">{"\u{1F431}"} CryptArt Commander</span>
          <span className="badge text-[8px]">CAC</span>
        </div>
        <div className="flex gap-1">
          {(["terminal", "scripts", "api"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-[10px] rounded transition-colors ${
                activeTab === tab ? "bg-studio-cyan/15 text-studio-cyan" : "text-studio-muted hover:text-studio-text"
              }`}
            >
              {tab === "terminal" ? "\u{1F4BB} Terminal" : tab === "scripts" ? "\u{1F4DC} Scripts" : "\u{1F310} API Ref"}
            </button>
          ))}
        </div>
      </header>

      {/* Terminal Tab */}
      {activeTab === "terminal" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto scrollbar-thin p-4 font-mono text-[11px]" onClick={() => inputRef.current?.focus()}>
            {history.map((entry) => (
              <div key={entry.id} className="mb-2">
                {entry.command && (
                  <div className="flex items-center gap-2">
                    <span className="text-studio-cyan select-none">{"\u{1F431}"} {">"}</span>
                    <span className="text-studio-text">{entry.command}</span>
                    <span className="text-[8px] text-studio-muted ml-auto select-none">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  </div>
                )}
                <pre className={`whitespace-pre-wrap ml-6 ${
                  entry.status === "error" ? "text-red-400" : entry.status === "info" ? "text-studio-muted" : "text-studio-secondary"
                }`}>{entry.result}</pre>
              </div>
            ))}
            <div ref={termEndRef} />
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-studio-panel border-t border-studio-border shrink-0">
            <span className="text-studio-cyan font-mono text-[11px] select-none">{"\u{1F431}"} {">"}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-[11px] text-studio-text font-mono outline-none placeholder:text-studio-muted"
              placeholder="Type a command..."
              disabled={running}
              autoFocus
            />
            {running && <span className="text-[9px] text-studio-muted animate-pulse">Running...</span>}
            {suggestions.length > 1 && (
              <div className="flex gap-1">
                {suggestions.slice(0, 8).map((s, i) => (
                  <span key={s} className={`text-[8px] px-1 rounded ${i === suggestionIdx ? "bg-studio-cyan/20 text-studio-cyan" : "text-studio-muted"}`}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scripts Tab */}
      {activeTab === "scripts" && (
        <div className="flex-1 flex overflow-hidden">
          <aside className="w-56 bg-studio-panel border-r border-studio-border flex flex-col shrink-0">
            <div className="px-3 py-2 text-[10px] text-studio-muted border-b border-studio-border flex items-center justify-between">
              <span>Scripts</span>
              <button
                onClick={() => setEditingScript({
                  id: "s-" + Date.now(),
                  name: "new-script",
                  content: "# New script\necho Hello!",
                  language: "shell",
                  lastRun: null,
                })}
                className="text-studio-cyan hover:text-cyan-300"
              >+</button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {scripts.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => setEditingScript({ ...sc })}
                  className={`w-full text-left px-3 py-2 text-[10px] border-b border-studio-border transition-colors ${
                    editingScript?.id === sc.id ? "bg-studio-cyan/10 text-studio-cyan" : "text-studio-secondary hover:bg-studio-hover"
                  }`}
                >
                  <div className="font-semibold">{sc.name}</div>
                  <div className="text-[8px] text-studio-muted">{sc.language} - {sc.content.split("\n").length} lines</div>
                </button>
              ))}
            </div>
          </aside>
          <main className="flex-1 flex flex-col">
            {editingScript ? (
              <>
                <div className="flex items-center gap-2 px-4 py-2 border-b border-studio-border bg-studio-panel shrink-0">
                  <input
                    type="text"
                    value={editingScript.name}
                    onChange={(e) => setEditingScript({ ...editingScript, name: e.target.value })}
                    className="input text-[11px] py-1 w-48"
                    placeholder="Script name..."
                  />
                  <select
                    value={editingScript.language}
                    onChange={(e) => setEditingScript({ ...editingScript, language: e.target.value as ScriptFile["language"] })}
                    className="input text-[10px] py-1 w-28"
                  >
                    <option value="shell">Shell</option>
                    <option value="javascript">JavaScript</option>
                    <option value="python">Python</option>
                  </select>
                  <div className="flex-1" />
                  <button
                    onClick={async () => {
                      addEntry("run " + editingScript.name, "Running...", "info");
                      setActiveTab("terminal");
                      for (const line of editingScript.content.split("\n").filter((l) => l.trim() && !l.trim().startsWith("#"))) {
                        await executeCommand(line);
                      }
                    }}
                    className="btn btn-cyan text-[10px] px-3 py-1"
                  >{"\u25B6"} Run</button>
                  <button onClick={saveScript} className="btn text-[10px] px-3 py-1">{"\u{1F4BE}"} Save</button>
                  <button
                    onClick={() => {
                      setScripts((prev) => prev.filter((s) => s.id !== editingScript.id));
                      setEditingScript(null);
                    }}
                    className="btn-ghost text-red-400 hover:text-red-300 text-[10px] px-2"
                  >{"\u{1F5D1}"}</button>
                </div>
                <textarea
                  value={editingScript.content}
                  onChange={(e) => setEditingScript({ ...editingScript, content: e.target.value })}
                  className="flex-1 bg-studio-bg text-[11px] text-studio-text font-mono p-4 outline-none resize-none scrollbar-thin"
                  spellCheck={false}
                />
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="empty-state">
                  <div className="empty-state-icon">{"\u{1F4DC}"}</div>
                  <div className="empty-state-title">Select or create a script</div>
                  <div className="empty-state-description">Scripts let you automate sequences of Commander commands.</div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* API Reference Tab */}
      {activeTab === "api" && (
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          <div className="max-w-3xl">
            <h2 className="text-lg font-bold mb-1">{"\u{1F310}"} CryptArtist Studio REST API</h2>
            <p className="text-[11px] text-studio-muted mb-4">
              Start the API server with: <code className="inline-code">cryptartist-studio serve --port 9420</code>
            </p>
            <div className="flex flex-col gap-2">
              {API_ENDPOINTS.map((ep, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-studio-surface border border-studio-border">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    ep.method === "GET" ? "bg-green-500/15 text-green-400" :
                    ep.method === "POST" ? "bg-cyan-500/15 text-cyan-400" :
                    ep.method === "PUT" ? "bg-yellow-500/15 text-yellow-400" :
                    "bg-red-500/15 text-red-400"
                  }`}>{ep.method}</span>
                  <code className="text-[10px] text-studio-text font-mono">{ep.path}</code>
                  <span className="flex-1 text-[10px] text-studio-muted">{ep.description}</span>
                  {ep.params && <span className="text-[8px] text-studio-secondary">params: {ep.params}</span>}
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 rounded-xl bg-studio-surface border border-studio-border">
              <h3 className="text-[12px] font-semibold text-studio-text mb-2">Example: OpenRouter Chat</h3>
              <pre className="text-[10px] text-studio-secondary font-mono bg-studio-bg p-3 rounded">
{`curl -X POST http://localhost:9420/api/openrouter/chat \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "Hello!", "model": "openai/gpt-4o"}'`}
              </pre>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-studio-surface border border-studio-border">
              <h3 className="text-[12px] font-semibold text-studio-text mb-2">Example: Export Keys</h3>
              <pre className="text-[10px] text-studio-secondary font-mono bg-studio-bg p-3 rounded">
{`curl -X POST http://localhost:9420/api/keys/export
# Saves to Forbidden-Secrets-of-CryptArtist-Keys-N.txt`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="flex items-center gap-3">
          <span>{"\u{1F431}"} CAC v0.1.0</span>
          <span>|</span>
          <span>{cmdHistory.length} commands</span>
          <span>|</span>
          <span>{scripts.length} scripts</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{history.filter((h) => h.status === "error").length} errors</span>
          <span>|</span>
          <span>{Object.keys(aliases).length} aliases</span>
          <span>|</span>
          <span>#{totalCmdCount}</span>
          <span>|</span>
          <span>OR: {localStorage.getItem("cryptartist_openrouter_model")?.split("/").pop() || "gpt-4o"}</span>
        </div>
      </footer>
    </div>
  );
}
