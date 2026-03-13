import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import Editor from "@monaco-editor/react";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";

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

interface GodotInfo {
  found: boolean;
  path: string | null;
  version: string | null;
  install_url?: string;
}

type PaneLayout = "code" | "media" | "split" | "ai-gen";
type GameTemplate = "2d_platformer" | "3d_fps" | "ui_app" | "empty";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    gd: "gdscript", gdshader: "glsl", tscn: "ini", tres: "ini", godot: "ini",
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", rs: "rust", json: "json", md: "markdown", html: "html",
    css: "css", scss: "scss", toml: "toml", yaml: "yaml", yml: "yaml",
    sh: "shell", bash: "shell", sql: "sql", go: "go", java: "java",
    cpp: "cpp", c: "c", h: "c", hpp: "cpp", xml: "xml", svg: "xml",
    cs: "csharp", cfg: "ini", import: "ini",
  };
  return map[ext] || "plaintext";
}

function isBinaryFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const binary = [
    "png", "jpg", "jpeg", "gif", "bmp", "webp", "ico", "exe", "dll", "so",
    "wasm", "zip", "tar", "gz", "7z", "pdf", "mp4", "mp3", "wav", "ogg",
    "ttf", "woff", "woff2", "eot", "lock", "pck", "res", "obj", "glb",
    "gltf", "fbx", "blend", "ctex", "stex", "scn",
  ];
  return binary.includes(ext);
}

function isImageFile(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(ext);
}

// ---------------------------------------------------------------------------
// GameStudio Component
// ---------------------------------------------------------------------------

export default function GameStudio() {
  const navigate = useNavigate();
  useEffect(() => { logger.info("GameStudio", "Program loaded"); }, []);

  // --- Godot state ---
  const [godotInfo, setGodotInfo] = useState<GodotInfo | null>(null);
  const [godotDetecting, setGodotDetecting] = useState(true);
  const [projectPath, setProjectPath] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("My Game");
  const [scenes, setScenes] = useState<string[]>([]);
  const [scripts, setScripts] = useState<string[]>([]);

  // --- File explorer state ---
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeTabPath, setActiveTabPath] = useState<string | null>(null);

  // --- Pane layout ---
  const [layout, setLayout] = useState<PaneLayout>("split");

  // --- AI state ---
  const [aiMessages, setAiMessages] = useState<AIChatMsg[]>([
    {
      role: "assistant",
      content:
        "Welcome to GameStudio! I combine Media Mogul + VibeCodeWorker + Godot 4.x to help you make video games.\n\n" +
        "I can:\n" +
        "- Generate complete game designs from a description\n" +
        "- Write GDScript code for your scenes\n" +
        "- Create game assets (sprites, UI, audio descriptions)\n" +
        "- Help debug your Godot project\n\n" +
        "Try: \"Make a 2D platformer with a jumping character and collectible coins\"",
      timestamp: Date.now(),
    },
  ]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(true);

  // --- New project dialog ---
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("MyGame");
  const [newProjectTemplate, setNewProjectTemplate] = useState<GameTemplate>("2d_platformer");
  const [newProjectPath, setNewProjectPath] = useState("");

  // --- Media preview ---
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  // --- Terminal ---
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "$ GameStudio Terminal v0.1.0",
    "$ Detecting Godot installation...",
  ]);

  const aiEndRef = useRef<HTMLDivElement>(null);
  const termEndRef = useRef<HTMLDivElement>(null);

  // --- Scroll effects ---
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  // --- Detect Godot on mount ---
  useEffect(() => {
    invoke<GodotInfo>("godot_detect")
      .then((info) => {
        setGodotInfo(info);
        setGodotDetecting(false);
        if (info.found) {
          setTerminalOutput((prev) => [...prev, `$ Godot found: ${info.path}`, `$ Version: ${info.version}`]);
        } else {
          setTerminalOutput((prev) => [
            ...prev,
            "[warning] Godot not found on system.",
            `$ Download: ${info.install_url || "https://godotengine.org/download"}`,
            "$ You can still create projects and edit code. Install Godot to run/export.",
          ]);
        }
      })
      .catch((err) => {
        setGodotDetecting(false);
        setTerminalOutput((prev) => [...prev, `[error] Failed to detect Godot: ${err}`]);
      });

    // Load shared API key
    invoke<string>("get_api_key").catch(() => {});
  }, []);

  // --- File operations ---
  const loadDirectory = useCallback(async (dirPath: string): Promise<FileNode[]> => {
    try {
      const entries = await invoke<DirEntry[]>("read_directory", { path: dirPath });
      return entries.map((e) => ({
        name: e.name,
        path: e.path,
        type: e.is_dir ? ("directory" as const) : ("file" as const),
        children: undefined,
        expanded: false,
      }));
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Failed to read: ${dirPath} - ${err}`]);
      return [];
    }
  }, []);

  const handleOpenProject = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        // Check if it's a Godot project
        const hasProjectGodot = await invoke<string>("read_text_file", {
          path: selected.replace(/[\\/]$/, "") + "/project.godot",
        }).catch(() => null);

        setProjectPath(selected);
        const nodes = await loadDirectory(selected);
        setFileTree(nodes);

        if (hasProjectGodot) {
          // Parse project name from project.godot
          const nameMatch = hasProjectGodot.match(/config\/name="([^"]+)"/);
          if (nameMatch) setProjectName(nameMatch[1]);
          toast.success(`Opened Godot project: ${selected}`);

          // Load scenes and scripts
          const [sceneList, scriptList] = await Promise.all([
            invoke<string[]>("godot_list_scenes", { projectPath: selected }).catch(() => []),
            invoke<string[]>("godot_list_scripts", { projectPath: selected }).catch(() => []),
          ]);
          setScenes(sceneList);
          setScripts(scriptList);
          setTerminalOutput((prev) => [
            ...prev,
            `$ Opened Godot project: ${selected}`,
            `$ Scenes: ${sceneList.length} | Scripts: ${scriptList.length}`,
          ]);
        } else {
          setProjectName("Project");
          toast.info("Opened folder (not a Godot project)");
          setTerminalOutput((prev) => [...prev, `$ Opened folder: ${selected}`, "$ No project.godot found - open or create a Godot project."]);
        }
      }
    } catch (err) {
      toast.error("Failed to open project");
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim() || !newProjectPath.trim()) {
      toast.error("Please provide a project name and path");
      return;
    }
    try {
      const result = await invoke<string>("godot_create_project", {
        path: newProjectPath,
        name: newProjectName,
        template: newProjectTemplate,
      });
      setProjectPath(result);
      setProjectName(newProjectName);
      const nodes = await loadDirectory(result);
      setFileTree(nodes);
      setShowNewProject(false);

      const [sceneList, scriptList] = await Promise.all([
        invoke<string[]>("godot_list_scenes", { projectPath: result }).catch(() => []),
        invoke<string[]>("godot_list_scripts", { projectPath: result }).catch(() => []),
      ]);
      setScenes(sceneList);
      setScripts(scriptList);

      toast.success(`Created Godot project: ${newProjectName}`);
      setTerminalOutput((prev) => [
        ...prev,
        `$ Created new ${newProjectTemplate} project: ${result}`,
        `$ Template: ${newProjectTemplate} | Scenes: ${sceneList.length} | Scripts: ${scriptList.length}`,
      ]);
    } catch (err) {
      toast.error(`Failed to create project: ${err}`);
    }
  };

  const handlePickProjectPath = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setNewProjectPath(selected);
      }
    } catch {}
  };

  const handleRunProject = async () => {
    if (!godotInfo?.found || !godotInfo.path || !projectPath) {
      toast.error("Godot not found or no project open");
      return;
    }
    try {
      const result = await invoke<string>("godot_run_project", {
        godotPath: godotInfo.path,
        projectPath,
      });
      toast.success("Godot launched!");
      setTerminalOutput((prev) => [...prev, `$ ${result}`]);
    } catch (err) {
      toast.error(`Failed to run: ${err}`);
      setTerminalOutput((prev) => [...prev, `[error] ${err}`]);
    }
  };

  const toggleDirectory = async (node: FileNode) => {
    if (node.type !== "directory") return;
    if (node.expanded) {
      const collapse = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) =>
          n.path === node.path
            ? { ...n, expanded: false }
            : { ...n, children: n.children ? collapse(n.children) : undefined }
        );
      setFileTree(collapse(fileTree));
    } else {
      const children = await loadDirectory(node.path);
      const expand = (nodes: FileNode[]): FileNode[] =>
        nodes.map((n) =>
          n.path === node.path
            ? { ...n, expanded: true, children }
            : { ...n, children: n.children ? expand(n.children) : undefined }
        );
      setFileTree(expand(fileTree));
    }
  };

  const openFile = async (node: FileNode) => {
    if (node.type === "directory") {
      toggleDirectory(node);
      return;
    }
    if (isImageFile(node.name)) {
      setPreviewFile(node.path);
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
      toast.success(`Saved ${tab.name}`);
    } catch (err) {
      setTerminalOutput((prev) => [...prev, `[error] Save failed: ${err}`]);
      toast.error("Save failed");
    }
  };

  const activeTab = openTabs.find((t) => t.path === activeTabPath) || null;

  // --- AI Game Generation ---
  const handleAiSubmit = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const userMsg: AIChatMsg = { role: "user", content: aiInput, timestamp: Date.now() };
    setAiMessages((prev) => [...prev, userMsg]);
    const currentInput = aiInput;
    setAiInput("");
    setAiLoading(true);

    try {
      // Build context
      let context = "";
      if (activeTab) {
        const fileContent =
          activeTab.content.length > 6000
            ? activeTab.content.slice(0, 6000) + "\n...[truncated]"
            : activeTab.content;
        context += `\n\nCurrently open file (${activeTab.name}):\n\`\`\`${activeTab.language}\n${fileContent}\n\`\`\``;
      }
      if (projectPath) {
        context += `\n\nGodot project: ${projectName} at ${projectPath}`;
        if (scenes.length > 0) context += `\nScenes: ${scenes.map((s) => s.split(/[/\\]/).pop()).join(", ")}`;
        if (scripts.length > 0) context += `\nScripts: ${scripts.map((s) => s.split(/[/\\]/).pop()).join(", ")}`;
      }

      const prompt = `You are GameStudio AI - a senior game developer assistant that combines CryptArtist Media Mogul (media editing) + VibeCodeWorker (code IDE) + Godot 4.4. You help users build video games automatically.

When asked to create game features, provide COMPLETE, READY-TO-USE GDScript code for Godot 4.4. Use proper Godot 4 syntax (typed variables, @onready, @export, etc).

When generating game designs, structure them as:
1. Game Design Document (brief)
2. Scene tree structure
3. Complete GDScript code for each script
4. Asset requirements

Be specific with Godot node types, signals, and the scene tree hierarchy.${context}

User: ${currentInput}`;

      const reply = await invoke<string>("ai_chat", { prompt });
      setAiMessages((prev) => [...prev, { role: "assistant", content: reply, timestamp: Date.now() }]);

      // Auto-detect if AI generated code and offer to save it
      if (reply.includes("```gdscript") || reply.includes("```gd")) {
        setTerminalOutput((prev) => [
          ...prev,
          "$ AI generated GDScript code. Select code blocks and use 'Apply to File' to save them to your project.",
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAiMessages((prev) => [...prev, { role: "assistant", content: `Error: ${msg}`, timestamp: Date.now() }]);
    } finally {
      setAiLoading(false);
    }
  };

  // Extract GDScript code blocks from AI response and save to project
  const applyCodeBlock = async (code: string, filename: string) => {
    if (!projectPath) {
      toast.error("No project open - open or create a Godot project first");
      return;
    }
    const filePath = projectPath.replace(/[\\/]$/, "") + "/scripts/" + filename;
    try {
      await invoke("write_text_file", { path: filePath, contents: code });
      toast.success(`Saved ${filename} to project scripts`);
      setTerminalOutput((prev) => [...prev, `$ Applied AI code to: ${filePath}`]);

      // Open the file
      setOpenTabs((prev) => [
        ...prev.filter((t) => t.path !== filePath),
        { path: filePath, name: filename, content: code, language: "gdscript", dirty: false },
      ]);
      setActiveTabPath(filePath);

      // Refresh scripts list
      const scriptList = await invoke<string[]>("godot_list_scripts", { projectPath }).catch(() => []);
      setScripts(scriptList);
    } catch (err) {
      toast.error(`Failed to save: ${err}`);
    }
  };

  // Quick AI generation buttons
  const handleQuickGenerate = (type: string) => {
    const prompts: Record<string, string> = {
      player:
        "Generate a complete player controller script for Godot 4.4. Include movement (WASD/arrow keys), jumping, gravity, and animation state machine. Use CharacterBody2D for a 2D platformer.",
      enemy:
        "Generate a complete enemy AI script for Godot 4.4. Include patrol behavior, chase player when in range, attack, and take damage. Use CharacterBody2D.",
      ui: "Generate a complete main menu UI script for Godot 4.4. Include Start Game, Options, and Quit buttons with proper scene transitions and a pause menu.",
      inventory:
        "Generate a complete inventory system for Godot 4.4. Include Item resource class, InventoryManager autoload, pickup detection, and a UI display with grid slots.",
      dialogue:
        "Generate a complete dialogue system for Godot 4.4. Include a DialogueManager, dialogue data in JSON format, a typewriter text effect, and choice branching.",
      camera:
        "Generate a complete camera system for Godot 4.4. Include smooth follow, screen shake, zoom, look-ahead, and camera bounds/limits.",
      save_system:
        "Generate a complete save/load system for Godot 4.4. Include saving player position, inventory, progress flags, and settings to a JSON file using FileAccess.",
      audio:
        "Generate a complete audio manager autoload for Godot 4.4. Include music crossfade, SFX pooling, volume control per bus, and positional audio helpers.",
    };
    if (prompts[type]) {
      setAiInput(prompts[type]);
    }
  };

  // .CryptArt save/open for GameStudio
  const handleSaveCryptArt = async () => {
    try {
      const projectData = {
        projectPath,
        projectName,
        layout,
        openFiles: openTabs.map((t) => ({ path: t.path, name: t.name })),
        activeFile: activeTabPath,
        scenes,
        scripts,
      };
      const cryptArt = createCryptArtFile("game-studio", projectName || "Untitled Game", projectData);
      const json = serializeCryptArt(cryptArt);
      const savePath = await saveDialog({
        defaultPath: "game-project.CryptArt",
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
      });
      if (savePath) {
        await invoke("write_text_file", { path: savePath, contents: json });
        toast.success("Game project saved!");
      }
    } catch (err) {
      toast.error("Failed to save project");
    }
  };

  const handleOpenCryptArt = async () => {
    try {
      const selected = await openDialog({
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        const json = await invoke<string>("read_text_file", { path: selected });
        const project = parseCryptArt(json);
        if (project.program !== "game-studio") {
          toast.warning(`This .CryptArt file is for ${project.program}, not GameStudio`);
          return;
        }
        const data = project.data as any;
        if (data.projectPath) {
          setProjectPath(data.projectPath);
          const nodes = await loadDirectory(data.projectPath);
          setFileTree(nodes);
        }
        if (data.projectName) setProjectName(data.projectName);
        if (data.layout) setLayout(data.layout);
        if (data.scenes) setScenes(data.scenes);
        if (data.scripts) setScripts(data.scripts);
        toast.success("Game project loaded!");
      }
    } catch (err) {
      toast.error("Failed to open project");
    }
  };

  // --- File tree renderer ---
  const renderTree = (nodes: FileNode[], depth = 0): JSX.Element[] => {
    return nodes.map((node) => {
      const isGd = node.name.endsWith(".gd");
      const isTscn = node.name.endsWith(".tscn");
      const isShader = node.name.endsWith(".gdshader");
      const nodeIcon =
        node.type === "directory"
          ? node.expanded
            ? "\u{1F4C2}"
            : "\u{1F4C1}"
          : isGd
          ? "\u{1F4DC}"
          : isTscn
          ? "\u{1F3AC}"
          : isShader
          ? "\u{2728}"
          : "\u{1F4C4}";

      return (
        <div key={node.path}>
          <button
            onClick={() => openFile(node)}
            className={`w-full text-left px-2 py-[3px] text-[11px] flex items-center gap-1.5 hover:bg-studio-hover rounded transition-colors ${
              activeTabPath === node.path ? "bg-studio-hover text-studio-text" : "text-studio-secondary"
            }`}
            style={{ paddingLeft: `${8 + depth * 14}px` }}
          >
            <span className="text-[10px] opacity-70">{nodeIcon}</span>
            <span className={isGd ? "text-blue-300" : isTscn ? "text-green-300" : ""}>{node.name}</span>
          </button>
          {node.type === "directory" && node.expanded && node.children && renderTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  // --- Extract code blocks from AI messages for apply button ---
  const extractCodeBlocks = (content: string): { code: string; lang: string }[] => {
    const blocks: { code: string; lang: string }[] = [];
    const regex = /```(gdscript|gd|python|csharp|cs|glsl|gdshader)([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      blocks.push({ code: match[2].trim(), lang: match[1] });
    }
    return blocks;
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg overflow-hidden">
      {/* ===== HEADER ===== */}
      <header className="flex items-center h-[48px] bg-studio-panel border-b border-studio-border select-none px-4 gap-2 shrink-0">
        <button
          onClick={() => navigate("/")}
          className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors"
          title="Back to Suite"
        >
          {"\u2190"} Suite
        </button>
        <div className="w-px h-5 bg-studio-border" />
        <span className="text-xl leading-none">{"\u{1F3AE}"}</span>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">GameStudio</span>
          <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">
            GSt - Media Mogul + VibeCode + Godot
          </span>
        </div>

        <div className="flex-1" />

        {/* Layout buttons */}
        <div className="flex items-center gap-1 mr-2">
          {(["code", "media", "split", "ai-gen"] as PaneLayout[]).map((l) => (
            <button
              key={l}
              onClick={() => setLayout(l)}
              className={`px-2 py-1 text-[10px] rounded transition-colors ${
                layout === l ? "bg-studio-cyan/20 text-studio-cyan border border-studio-cyan/30" : "btn text-[10px]"
              }`}
            >
              {l === "code" ? "\u{1F4BB} Code" : l === "media" ? "\u{1F3A8} Media" : l === "split" ? "\u{1F5C2}\uFE0F Split" : "\u{1F916} AI Gen"}
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-studio-border" />

        <button onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
          {"\u{1F4C2}"} Open
        </button>
        <button onClick={() => setShowNewProject(true)} className="btn text-[10px] py-1 px-3">
          + New Game
        </button>
        {godotInfo?.found && projectPath && (
          <button onClick={handleRunProject} className="btn btn-cyan text-[10px] py-1 px-3">
            {"\u25B6"} Run in Godot
          </button>
        )}
        <button onClick={handleOpenCryptArt} className="btn text-[10px] py-1 px-3">
          Open .CryptArt
        </button>
        <button onClick={handleSaveCryptArt} className="btn text-[10px] py-1 px-3">
          Save .CryptArt
        </button>
        <button
          onClick={() => setShowAiPanel(!showAiPanel)}
          className={`btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors ${showAiPanel ? "bg-studio-hover" : ""}`}
          title="Toggle AI Panel"
        >
          {"\u{1F916}"}
        </button>
      </header>

      {/* ===== NEW PROJECT DIALOG ===== */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-studio-panel border border-studio-border rounded-xl p-6 w-[480px] max-w-[90vw] shadow-2xl">
            <h2 className="text-lg font-bold text-studio-text mb-4">{"\u{1F3AE}"} New Godot Game Project</h2>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] text-studio-secondary font-semibold block mb-1">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input w-full text-[12px]"
                  placeholder="MyGame"
                />
              </div>
              <div>
                <label className="text-[11px] text-studio-secondary font-semibold block mb-1">Location</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                    className="input flex-1 text-[12px]"
                    placeholder="C:\Games or ~/Games"
                  />
                  <button onClick={handlePickProjectPath} className="btn text-[10px] px-3">
                    Browse
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] text-studio-secondary font-semibold block mb-1">Template</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "2d_platformer" as GameTemplate, label: "2D Platformer", icon: "\u{1F3AE}", desc: "Side-scroller with CharacterBody2D" },
                    { id: "3d_fps" as GameTemplate, label: "3D First Person", icon: "\u{1F3AF}", desc: "3D FPS with CharacterBody3D" },
                    { id: "ui_app" as GameTemplate, label: "UI Application", icon: "\u{1F5A5}\uFE0F", desc: "Control-based UI app" },
                    { id: "empty" as GameTemplate, label: "Empty Project", icon: "\u{1F4C4}", desc: "Blank Godot 4.4 project" },
                  ].map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => setNewProjectTemplate(tpl.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        newProjectTemplate === tpl.id
                          ? "border-studio-cyan bg-studio-cyan/10"
                          : "border-studio-border hover:border-studio-border-bright"
                      }`}
                    >
                      <div className="text-lg mb-1">{tpl.icon}</div>
                      <div className="text-[11px] font-semibold text-studio-text">{tpl.label}</div>
                      <div className="text-[9px] text-studio-muted">{tpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              {!godotInfo?.found && (
                <div className="text-[10px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-2">
                  {"\u26A0\uFE0F"} Godot not found. You can still create the project and edit code. Install Godot 4.4 to run and export.
                  <br />
                  <a
                    href="https://godotengine.org/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-studio-cyan hover:underline"
                  >
                    Download Godot
                  </a>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowNewProject(false)} className="btn text-[11px] px-4 py-1.5">
                Cancel
              </button>
              <button onClick={handleCreateProject} className="btn btn-cyan text-[11px] px-4 py-1.5">
                Create Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 min-h-0">
        {/* --- File Explorer Panel --- */}
        <div className="w-[200px] min-w-[160px] bg-studio-panel border-r border-studio-border flex flex-col shrink-0">
          <div className="panel-header flex items-center justify-between">
            <h3>{"\u{1F4C1}"} Explorer</h3>
            {projectPath && (
              <span className="text-[9px] text-studio-muted truncate max-w-[100px]" title={projectPath}>
                {projectName}
              </span>
            )}
          </div>

          {/* Quick links for scenes/scripts */}
          {(scenes.length > 0 || scripts.length > 0) && (
            <div className="px-2 py-1 border-b border-studio-border">
              <div className="text-[9px] font-semibold text-studio-secondary uppercase mb-1">Godot Project</div>
              {scenes.length > 0 && (
                <div className="text-[9px] text-studio-muted">{"\u{1F3AC}"} {scenes.length} scene{scenes.length !== 1 ? "s" : ""}</div>
              )}
              {scripts.length > 0 && (
                <div className="text-[9px] text-studio-muted">{"\u{1F4DC}"} {scripts.length} script{scripts.length !== 1 ? "s" : ""}</div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-1">
            {fileTree.length > 0 ? (
              renderTree(fileTree)
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <span className="text-3xl mb-2 opacity-40">{"\u{1F3AE}"}</span>
                <p className="text-[10px] text-studio-muted mb-2">No project open</p>
                <button onClick={() => setShowNewProject(true)} className="btn text-[10px] py-1 px-3 mb-1">
                  + New Game
                </button>
                <button onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
                  Open Folder
                </button>
              </div>
            )}
          </div>
        </div>

        {/* --- CENTER AREA: Code + Media panes --- */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tab bar */}
          <div className="flex items-center h-[32px] bg-studio-panel border-b border-studio-border overflow-x-auto shrink-0">
            {openTabs.map((tab) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabPath(tab.path)}
                className={`flex items-center gap-2 px-3 h-full text-[11px] cursor-pointer border-r border-studio-border transition-colors whitespace-nowrap ${
                  activeTabPath === tab.path
                    ? "bg-studio-bg text-studio-text border-b-2 border-b-studio-cyan"
                    : "text-studio-secondary hover:bg-studio-surface"
                }`}
              >
                <span>
                  {tab.dirty ? "\u25CF " : ""}
                  {tab.name.endsWith(".gd") ? "\u{1F4DC} " : tab.name.endsWith(".tscn") ? "\u{1F3AC} " : ""}
                  {tab.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.path);
                  }}
                  className="text-[9px] text-studio-muted hover:text-studio-text ml-1"
                >
                  x
                </button>
              </div>
            ))}
            {openTabs.length === 0 && <span className="px-3 text-[11px] text-studio-muted">No files open</span>}
            {activeTab?.dirty && (
              <button onClick={saveCurrentFile} className="ml-auto mr-2 btn btn-cyan text-[9px] py-0.5 px-2">
                Save
              </button>
            )}
          </div>

          {/* Main editor / split area */}
          <div className="flex-1 flex min-h-0">
            {/* LEFT PANE (code or media depending on layout) */}
            {(layout === "code" || layout === "split") && (
              <div className={layout === "split" ? "flex-1 min-w-0 border-r border-studio-border" : "flex-1 min-w-0"}>
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
                      <span className="text-5xl block mb-3">{"\u{1F3AE}"}</span>
                      <p className="font-semibold text-studio-secondary text-base">CryptArtist GameStudio</p>
                      <p className="text-xs mt-1 text-studio-muted">Media Mogul + VibeCodeWorker + Godot 4.4</p>
                      <p className="text-[10px] text-studio-muted mt-3 max-w-xs">
                        Open or create a Godot project, then use the AI panel to generate entire games from a description.
                        Edit GDScript, scenes, and media assets all in one place.
                      </p>
                      <div className="flex gap-2 justify-center mt-4">
                        <button onClick={() => setShowNewProject(true)} className="btn btn-cyan text-[10px] py-1 px-3">
                          + New Game
                        </button>
                        <button onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
                          Open Project
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* RIGHT PANE (media preview in split, or full media view) */}
            {(layout === "media" || layout === "split") && (
              <div className={layout === "split" ? "flex-1 min-w-0" : "flex-1 min-w-0"}>
                <div className="flex flex-col h-full">
                  <div className="panel-header">{"\u{1F3A8}"} Media Preview</div>
                  <div className="flex-1 flex items-center justify-center bg-studio-bg p-4 overflow-auto">
                    {previewFile ? (
                      <div className="text-center">
                        <img
                          src={convertFileSrc(previewFile)}
                          alt="Preview"
                          className="max-w-full max-h-[60vh] rounded-lg border border-studio-border"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <p className="text-[10px] text-studio-muted mt-2">{previewFile.split(/[/\\]/).pop()}</p>
                      </div>
                    ) : (
                      <div className="text-center text-studio-muted">
                        <span className="text-4xl block mb-2 opacity-40">{"\u{1F5BC}\uFE0F"}</span>
                        <p className="text-xs">Click an image file to preview it here</p>
                        <p className="text-[9px] mt-1">Supports PNG, JPG, GIF, WebP, SVG</p>
                      </div>
                    )}
                  </div>
                  {/* Asset quick-actions */}
                  <div className="p-2 border-t border-studio-border bg-studio-panel flex gap-2 flex-wrap">
                    <span className="text-[9px] text-studio-muted self-center">Assets:</span>
                    <button className="btn text-[9px] py-0.5 px-2" onClick={() => setTerminalOutput((p) => [...p, "$ Import asset... (use File Explorer to add files to assets/ folder)"])}>
                      Import File
                    </button>
                    <button className="btn text-[9px] py-0.5 px-2" onClick={() => { setAiInput("Generate a 16x16 pixel art sprite sheet for a platformer character with idle, run, and jump animations. Describe the exact pixel layout."); setShowAiPanel(true); }}>
                      AI Sprite
                    </button>
                    <button className="btn text-[9px] py-0.5 px-2" onClick={() => { setAiInput("Generate a tilemap for a 2D platformer level. Include ground, platforms, decorations, and hazards. Describe the layout as a grid."); setShowAiPanel(true); }}>
                      AI Tilemap
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* AI GENERATION FULL VIEW */}
            {layout === "ai-gen" && (
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="panel-header">{"\u{1F916}"} AI Game Generator</div>
                <div className="p-4 border-b border-studio-border bg-studio-surface">
                  <h3 className="text-sm font-bold text-studio-text mb-2">Quick Generate</h3>
                  <p className="text-[10px] text-studio-muted mb-3">
                    Click a button to populate the AI prompt, or type your own game description below.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: "player", label: "\u{1F3C3} Player Controller" },
                      { id: "enemy", label: "\u{1F47E} Enemy AI" },
                      { id: "ui", label: "\u{1F5A5}\uFE0F Main Menu UI" },
                      { id: "inventory", label: "\u{1F392} Inventory System" },
                      { id: "dialogue", label: "\u{1F4AC} Dialogue System" },
                      { id: "camera", label: "\u{1F4F7} Camera System" },
                      { id: "save_system", label: "\u{1F4BE} Save/Load System" },
                      { id: "audio", label: "\u{1F3B5} Audio Manager" },
                    ].map((btn) => (
                      <button
                        key={btn.id}
                        onClick={() => handleQuickGenerate(btn.id)}
                        className="btn text-[10px] py-1 px-3 hover:border-studio-cyan/30"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Full-page AI chat */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                  {aiMessages.map((msg, i) => {
                    const codeBlocks = msg.role === "assistant" ? extractCodeBlocks(msg.content) : [];
                    return (
                      <div key={i} className={`ai-message ${msg.role === "user" ? "ai-message-user" : "ai-message-assistant"}`}>
                        <div className="text-[10px] font-semibold text-studio-muted mb-1">
                          {msg.role === "user" ? "You" : "\u{1F916} GameStudio AI"}
                        </div>
                        <div className="text-[11px] text-studio-text whitespace-pre-wrap">{msg.content}</div>
                        {codeBlocks.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {codeBlocks.map((block, bi) => (
                              <button
                                key={bi}
                                onClick={() => {
                                  const name = prompt("Save as filename (e.g. player.gd):", `generated_${bi}.gd`);
                                  if (name) applyCodeBlock(block.code, name);
                                }}
                                className="btn btn-cyan text-[9px] py-0.5 px-2"
                              >
                                Apply Block {bi + 1} to Project
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                <div className="border-t border-studio-border p-3 bg-studio-panel">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAiSubmit()}
                      className="input flex-1 text-[12px] py-2"
                      placeholder="Describe a game to generate, or ask for specific code/features..."
                      disabled={aiLoading}
                    />
                    <button onClick={handleAiSubmit} className="btn btn-cyan text-[11px] px-4 py-2" disabled={aiLoading}>
                      {aiLoading ? "Generating..." : "\u{1F916} Generate"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Terminal */}
          <div className="h-[120px] min-h-[80px] bg-studio-panel border-t border-studio-border flex flex-col shrink-0">
            <div className="panel-header flex items-center gap-2">
              <h3>Terminal</h3>
              {godotDetecting && <span className="text-[9px] text-studio-cyan animate-pulse">detecting Godot...</span>}
              {godotInfo && !godotInfo.found && <span className="text-[9px] text-yellow-400">Godot not found</span>}
              {godotInfo?.found && <span className="text-[9px] text-green-400">Godot ready</span>}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-1 font-mono text-[11px]">
              {terminalOutput.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith("$")
                      ? "text-studio-cyan"
                      : line.startsWith("[error]")
                      ? "text-red-400"
                      : line.startsWith("[warning]")
                      ? "text-yellow-400"
                      : "text-studio-secondary"
                  }
                >
                  {line}
                </div>
              ))}
              <div ref={termEndRef} />
            </div>
          </div>
        </div>

        {/* --- AI SIDE PANEL (visible in code/split/media layouts) --- */}
        {showAiPanel && layout !== "ai-gen" && (
          <div className="w-[320px] min-w-[260px] bg-studio-panel border-l border-studio-border flex flex-col shrink-0">
            <div className="panel-header flex items-center justify-between">
              <h3>{"\u{1F916}"} Game AI</h3>
              {aiLoading && <span className="text-[9px] text-studio-cyan animate-pulse">thinking...</span>}
            </div>

            {/* Quick generate buttons (compact) */}
            <div className="px-2 py-1.5 border-b border-studio-border flex flex-wrap gap-1">
              {[
                { id: "player", label: "\u{1F3C3}" },
                { id: "enemy", label: "\u{1F47E}" },
                { id: "ui", label: "\u{1F5A5}\uFE0F" },
                { id: "inventory", label: "\u{1F392}" },
                { id: "dialogue", label: "\u{1F4AC}" },
                { id: "camera", label: "\u{1F4F7}" },
                { id: "save_system", label: "\u{1F4BE}" },
                { id: "audio", label: "\u{1F3B5}" },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => handleQuickGenerate(btn.id)}
                  className="text-[12px] hover:bg-studio-hover rounded p-1 transition-colors"
                  title={btn.id.replace("_", " ")}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {aiMessages.map((msg, i) => {
                const codeBlocks = msg.role === "assistant" ? extractCodeBlocks(msg.content) : [];
                return (
                  <div key={i} className={`ai-message ${msg.role === "user" ? "ai-message-user" : "ai-message-assistant"}`}>
                    <div className="text-[10px] font-semibold text-studio-muted mb-1">
                      {msg.role === "user" ? "You" : "\u{1F916} AI"}
                    </div>
                    <div className="text-[11px] text-studio-text whitespace-pre-wrap">{msg.content}</div>
                    {codeBlocks.length > 0 && (
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {codeBlocks.map((block, bi) => (
                          <button
                            key={bi}
                            onClick={() => {
                              const name = prompt("Filename:", `generated_${bi}.gd`);
                              if (name) applyCodeBlock(block.code, name);
                            }}
                            className="btn btn-cyan text-[8px] py-0.5 px-1.5"
                          >
                            Apply #{bi + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
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
                  placeholder="Describe a game feature..."
                  disabled={aiLoading}
                />
                <button onClick={handleAiSubmit} className="btn btn-cyan text-[10px] px-2 py-1" disabled={aiLoading}>
                  {aiLoading ? "..." : "Go"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ===== STATUS BAR ===== */}
      <footer className="status-bar">
        <span>{"\u{1F3AE}"} GameStudio v0.1.0</span>
        <div className="flex items-center gap-3">
          <span>{projectName || "No project"}</span>
          <span>|</span>
          <span>
            {godotInfo?.found
              ? `\u{1F7E2} Godot ${godotInfo.version}`
              : godotDetecting
              ? "\u{1F7E1} Detecting..."
              : "\u{1F534} Godot not found"}
          </span>
          <span>|</span>
          <span>{activeTab ? activeTab.language : "No file"}</span>
          <span>|</span>
          <span>Layout: {layout}</span>
        </div>
      </footer>
    </div>
  );
}
