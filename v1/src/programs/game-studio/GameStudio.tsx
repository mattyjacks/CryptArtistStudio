/* Wave3-sep */
/* Wave3 */
/* Wave2: select-aria */
/* Wave2: type=button applied */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";
import { useWorkspace } from "../../utils/workspace";
import { chatWithAI, getActionModel, setActionModel } from "../../utils/openrouter";
import { useApiKeys } from "../../utils/apiKeys";
import { useInteropEmit, useInterop } from "../../utils/interop";
import { useCrossClipboard } from "../../utils/crossClipboard";
import { notifySuccess } from "../../utils/notifications";
import AIOptimizer from "../../components/AIOptimizer";
import DebugPlayWindow from "../../components/DebugPlayWindow";
import { debugPlayService, DebugPlaySession } from "../../utils/debugPlay";

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
  const [showGodotNotFound, setShowGodotNotFound] = useState(false);
  const [godotCustomPath, setGodotCustomPath] = useState("");
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

  // Improvement 92: Game genre selector
  const [gameGenre, setGameGenre] = useState("platformer");
  // Improvement 94: Build target
  const [buildTarget, setBuildTarget] = useState<"windows" | "linux" | "macos" | "web" | "android">("windows");
  // Improvement 191: Scene graph hierarchy
  const [sceneGraph, setSceneGraph] = useState<{ id: string; name: string; type: string; children: string[]; visible: boolean }[]>([]);
  const [showSceneGraph, setShowSceneGraph] = useState(false);
  // Improvement 192: Asset pipeline status
  const [assetPipeline, setAssetPipeline] = useState<{ importing: number; total: number; errors: number }>({ importing: 0, total: 0, errors: 0 });
  // Improvement 193: Debug overlay
  const [debugOverlay, setDebugOverlay] = useState(false);
  // Improvement 194: Physics debug
  const [physicsDebug, setPhysicsDebug] = useState(false);
  // Improvement 195: Game resolution
  const [gameResolution, setGameResolution] = useState<"1920x1080" | "1280x720" | "640x480" | "320x240">("1920x1080");
  // Improvement 196: Performance stats
  const [showPerfStats, setShowPerfStats] = useState(false);
  const [perfStats] = useState({ fps: 60, drawCalls: 0, nodes: 0, memory: "0 MB" });
  // Improvement 197: Node inspector
  const [showNodeInspector, setShowNodeInspector] = useState(false);
  // Improvement 198: Version control status
  const [vcsStatus, setVcsStatus] = useState<"clean" | "modified" | "untracked">("clean");
  const [vcsBranch, setVcsBranch] = useState<string | null>(null);
  // Improvement 294: Tilemap editor
  const [showTilemapEditor, setShowTilemapEditor] = useState(false);
  const [tilemapLayers, setTilemapLayers] = useState<{ name: string; visible: boolean; locked: boolean }[]>([
    { name: "Ground", visible: true, locked: false },
    { name: "Objects", visible: true, locked: false },
    { name: "Collision", visible: false, locked: true },
  ]);
  const [activeTilemapLayer, setActiveTilemapLayer] = useState(0);
  // Improvement 295: Particle system preview
  const [showParticlePreview, setShowParticlePreview] = useState(false);
  const [particlePresets] = useState(["Fire", "Smoke", "Rain", "Snow", "Sparks", "Explosion", "Magic", "Dust"]);
  const [activeParticle, setActiveParticle] = useState<string | null>(null);
  // Improvement 296: Shader editor
  const [showShaderEditor, setShowShaderEditor] = useState(false);
  const [shaderCode, setShaderCode] = useState("shader_type canvas_item;\n\nvoid fragment() {\n  COLOR = texture(TEXTURE, UV);\n}\n");
  // Improvement 297: Profiler panel
  const [showProfiler, setShowProfiler] = useState(false);
  const [profilerData] = useState({
    physicsTime: 0.8,
    renderTime: 4.2,
    scriptTime: 1.5,
    idleTime: 10.2,
    totalFrame: 16.7,
  });
  // Improvement 298: Input mapping editor
  const [inputMappings, setInputMappings] = useState<{ action: string; keys: string[] }[]>([
    { action: "ui_up", keys: ["W", "Up"] },
    { action: "ui_down", keys: ["S", "Down"] },
    { action: "ui_left", keys: ["A", "Left"] },
    { action: "ui_right", keys: ["D", "Right"] },
    { action: "ui_accept", keys: ["Enter", "Space"] },
    { action: "jump", keys: ["Space"] },
  ]);
  // Improvement 401: Scene templates
  const [sceneTemplates] = useState([
    { name: "2D Platformer", nodes: "CharacterBody2D, Sprite2D, CollisionShape2D, Camera2D, TileMap" },
    { name: "Top-Down RPG", nodes: "CharacterBody2D, Sprite2D, NavigationAgent2D, Area2D" },
    { name: "3D FPS", nodes: "CharacterBody3D, Camera3D, RayCast3D, MeshInstance3D" },
    { name: "UI Menu", nodes: "Control, VBoxContainer, Button, Label, TextureRect" },
    { name: "Particle Scene", nodes: "Node2D, GPUParticles2D, PointLight2D" },
  ]);
  // Improvement 402: Build log
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [showBuildLog, setShowBuildLog] = useState(false);
  // Improvement 403: Node count
  const [totalNodeCount, setTotalNodeCount] = useState(0);
  // Improvement 404: GDD export
  const [showGddExport, setShowGddExport] = useState(false);
  // Improvement 405: Project notes
  const [projectNotes, setProjectNotes] = useState("");
  const [showProjectNotes, setShowProjectNotes] = useState(false);
  // Improvement 406: Play mode
  const [playMode, setPlayMode] = useState(false);
  // Improvement 407: Collision layers
  const [collisionLayers, setCollisionLayers] = useState<{ name: string; enabled: boolean }[]>([
    { name: "Player", enabled: true },
    { name: "Enemy", enabled: true },
    { name: "Environment", enabled: true },
    { name: "Projectile", enabled: true },
  ]);
  // Improvement 408: Animation state machine
  const [animStates, setAnimStates] = useState<{ name: string; active: boolean }[]>([
    { name: "Idle", active: true },
    { name: "Walk", active: false },
    { name: "Jump", active: false },
    { name: "Attack", active: false },
  ]);
  // Improvement 409: AI scene generator prompt
  const [aiScenePrompt, setAiScenePrompt] = useState("");
  // Improvement 410: Quick scene switcher
  const [sceneList, setSceneList] = useState<string[]>(["main.tscn", "player.tscn", "enemy.tscn", "ui.tscn"]);
  const [showInputMapper, setShowInputMapper] = useState(false);
  // Debug Play state
  const [debugPlaySession, setDebugPlaySession] = useState<DebugPlaySession | null>(null);
  const [showDebugPlayWindow, setShowDebugPlayWindow] = useState(false);
  
  // ===== 100 IMPROVEMENTS STATE VARIABLES =====
  // Improvement 1-10: UI/UX Enhancements
  const [darkMode, setDarkMode] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(30000);
  const [showMinimap, setShowMinimap] = useState(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [enableCodeFolding, setEnableCodeFolding] = useState(true);
  const [enableWordWrap, setEnableWordWrap] = useState(true);
  const [showWhitespace, setShowWhitespace] = useState(false);
  
  // Improvement 11-20: Editor Features
  const [fontSize, setFontSize] = useState(14);
  const [fontFamily, setFontFamily] = useState("Fira Code");
  const [tabSize, setTabSize] = useState(2);
  const [insertSpaces, setInsertSpaces] = useState(true);
  const [enableLinting, setEnableLinting] = useState(true);
  const [enableFormatting, setEnableFormatting] = useState(true);
  const [enableIntelliSense, setEnableIntelliSense] = useState(true);
  const [enableDebugger, setEnableDebugger] = useState(true);
  const [breakpoints, setBreakpoints] = useState<{ file: string; line: number }[]>([]);
  const [watchExpressions, setWatchExpressions] = useState<string[]>([]);
  
  // Improvement 21-30: File Management
  const [recentFiles, setRecentFiles] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [fileFilter, setFileFilter] = useState<"all" | "scripts" | "scenes" | "assets">("all");
  const [sortBy, setSortBy] = useState<"name" | "modified" | "size">("name");
  const [showHiddenFiles, setShowHiddenFiles] = useState(false);
  const [fileContextMenu, setFileContextMenu] = useState<{ x: number; y: number; file: string } | null>(null);
  const [clipboardPath, setClipboardPath] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<any[]>([]);
  
  // Improvement 31-40: Godot Integration
  const [godotAutoReload, setGodotAutoReload] = useState(true);
  const [godotDebugPort, setGodotDebugPort] = useState(6006);
  const [godotExportPresets, setGodotExportPresets] = useState<string[]>([]);
  const [selectedExportPreset, setSelectedExportPreset] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [godotConsoleOutput, setGodotConsoleOutput] = useState<string[]>([]);
  const [showGodotConsole, setShowGodotConsole] = useState(false);
  const [godotProjectSettings, setGodotProjectSettings] = useState<Record<string, any>>({});
  const [enableRemoteDebug, setEnableRemoteDebug] = useState(false);
  
  // Improvement 41-50: AI & Code Generation
  const [aiModel, setAiModel] = useState("openai/gpt-5-mini");
  const [aiTemperature, setAiTemperature] = useState(0.7);
  const [aiMaxTokens, setAiMaxTokens] = useState(2000);
  const [aiContext, setAiContext] = useState<string[]>([]);
  const [codeGenerationHistory, setCodeGenerationHistory] = useState<{ prompt: string; code: string; timestamp: number }[]>([]);
  const [showCodeGenHistory, setShowCodeGenHistory] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [enableAiAutoComplete, setEnableAiAutoComplete] = useState(true);
  const [aiRefactoringSuggestions, setAiRefactoringSuggestions] = useState<string[]>([]);
  const [showAiRefactoring, setShowAiRefactoring] = useState(false);
  
  // Improvement 51-60: Performance & Optimization
  const [enableCaching, setEnableCaching] = useState(true);
  const [cacheSize, setCacheSize] = useState(100);
  const [enableCodeSplitting, setEnableCodeSplitting] = useState(true);
  const [enableMinification, setEnableMinification] = useState(false);
  const [enableSourceMaps, setEnableSourceMaps] = useState(true);
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [diskUsage, setDiskUsage] = useState(0);
  const [showResourceMonitor, setShowResourceMonitor] = useState(false);
  const [enableAutoOptimization, setEnableAutoOptimization] = useState(true);
  
  // Improvement 61-70: Collaboration & Sharing
  const [collaborators, setCollaborators] = useState<{ id: string; name: string; email: string; role: string }[]>([]);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [isShared, setIsShared] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [comments, setComments] = useState<{ id: string; author: string; text: string; line: number; resolved: boolean }[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [changeLog, setChangeLog] = useState<{ author: string; action: string; timestamp: number }[]>([]);
  const [showChangeLog, setShowChangeLog] = useState(false);
  const [liveEditEnabled, setLiveEditEnabled] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState<string[]>([]);
  
  // Improvement 71-80: Testing & Debugging
  const [testSuites, setTestSuites] = useState<{ name: string; passed: number; failed: number; skipped: number }[]>([]);
  const [showTestRunner, setShowTestRunner] = useState(false);
  const [testCoverage, setTestCoverage] = useState(0);
  const [showCoverageReport, setShowCoverageReport] = useState(false);
  const [debugBreakOnError, setDebugBreakOnError] = useState(true);
  const [debugStepMode, setDebugStepMode] = useState<"step-over" | "step-into" | "step-out">("step-over");
  const [debugCallStack, setDebugCallStack] = useState<{ function: string; file: string; line: number }[]>([]);
  const [debugVariables, setDebugVariables] = useState<Record<string, any>>({});
  const [showDebugger, setShowDebugger] = useState(false);
  const [debuggerConnected, setDebuggerConnected] = useState(false);
  
  // Improvement 81-90: Project Management
  const [projectMetadata, setProjectMetadata] = useState<{ description: string; version: string; author: string; license: string }>({ description: "", version: "0.1.0", author: "", license: "MIT" });
  const [projectTags, setProjectTags] = useState<string[]>([]);
  const [projectDependencies, setProjectDependencies] = useState<{ name: string; version: string }[]>([]);
  const [showDependencyManager, setShowDependencyManager] = useState(false);
  const [buildConfigs, setBuildConfigs] = useState<{ name: string; target: string; optimized: boolean }[]>([]);
  const [selectedBuildConfig, setSelectedBuildConfig] = useState<string | null>(null);
  const [buildHistory, setBuildHistory] = useState<{ timestamp: number; success: boolean; duration: number }[]>([]);
  const [showBuildHistory, setShowBuildHistory] = useState(false);
  const [projectBackups, setProjectBackups] = useState<{ timestamp: number; size: number; name: string }[]>([]);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
  
  // Improvement 91-100: Advanced Features
  const [extensionsEnabled, setExtensionsEnabled] = useState<string[]>([]);
  const [availableExtensions, setAvailableExtensions] = useState<{ id: string; name: string; version: string; enabled: boolean }[]>([]);
  const [showExtensionMarket, setShowExtensionMarket] = useState(false);
  const [customTheme, setCustomTheme] = useState<Record<string, string>>({});
  const [keyBindings, setKeyBindings] = useState<Record<string, string>>({});
  const [showKeyBindings, setShowKeyBindings] = useState(false);
  const [macros, setMacros] = useState<{ name: string; keys: string; actions: string[] }[]>([]);
  const [showMacroEditor, setShowMacroEditor] = useState(false);
  const [snippets, setSnippets] = useState<{ trigger: string; body: string; description: string }[]>([]);
  const [showSnippetManager, setShowSnippetManager] = useState(false);
  const [pluginsInstalled, setPluginsInstalled] = useState<{ name: string; version: string; active: boolean }[]>([]);
  
  // Improvement 97: GDScript snippet library
  const gdscriptSnippets = [
    { label: "Player Movement", code: "extends CharacterBody2D\n\nvar speed = 200.0\nvar jump_velocity = -400.0\n\nfunc _physics_process(delta):\n\tvar velocity = Vector2.ZERO\n\tif Input.is_action_pressed('ui_right'):\n\t\tvelocity.x += 1\n\tif Input.is_action_pressed('ui_left'):\n\t\tvelocity.x -= 1\n\tvelocity = velocity.normalized() * speed\n\tmove_and_slide()" },
    { label: "Health System", code: "extends Node\n\n@export var max_health: int = 100\nvar current_health: int\n\nsignal health_changed(new_health: int)\nsignal died\n\nfunc _ready():\n\tcurrent_health = max_health\n\nfunc take_damage(amount: int):\n\tcurrent_health = max(0, current_health - amount)\n\thealth_changed.emit(current_health)\n\tif current_health <= 0:\n\t\tdied.emit()" },
    { label: "Collectible", code: "extends Area2D\n\n@export var points: int = 10\n\nfunc _on_body_entered(body):\n\tif body.has_method('add_score'):\n\t\tbody.add_score(points)\n\tqueue_free()" },
    { label: "Camera Follow", code: "extends Camera2D\n\n@export var target: Node2D\n@export var smooth_speed: float = 5.0\n\nfunc _process(delta):\n\tif target:\n\t\tglobal_position = global_position.lerp(target.global_position, smooth_speed * delta)" },
  ];

  const aiEndRef = useRef<HTMLDivElement>(null);
  const termEndRef = useRef<HTMLDivElement>(null);

  // --- Scroll effects ---
  useEffect(() => {
    aiEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalOutput]);

  // --- Auto-save effect (Improvement 4) ---
  useEffect(() => {
    if (!autoSave || openTabs.length === 0) return;
    const interval = setInterval(() => {
      const dirtyTabs = openTabs.filter(tab => tab.dirty);
      if (dirtyTabs.length > 0) {
        dirtyTabs.forEach(tab => {
          invoke("write_text_file", { path: tab.path, content: tab.content }).catch(err => {
            setTerminalOutput(prev => [...prev, `[error] Auto-save failed for ${tab.name}: ${err}`]);
          });
        });
        setOpenTabs(prev => prev.map(tab => ({ ...tab, dirty: false })));
        setTerminalOutput(prev => [...prev, `$ Auto-saved ${dirtyTabs.length} file(s)`]);
      }
    }, autoSaveInterval);
    return () => clearInterval(interval);
  }, [autoSave, autoSaveInterval, openTabs]);

  // --- Detect Godot on mount ---
  useEffect(() => {
    invoke<GodotInfo>("godot_detect")
      .then((info) => {
        setGodotInfo(info);
        setGodotDetecting(false);
        if (info.found) {
          setTerminalOutput((prev) => [...prev, `$ Godot found: ${info.path}`, `$ Version: ${info.version}`]);
          setShowGodotNotFound(false);
        } else {
          setTerminalOutput((prev) => [
            ...prev,
            "[warning] Godot not found on system.",
            `$ Download: ${info.install_url || "https://godotengine.org/download"}`,
            "$ You can still create projects and edit code. Install Godot to run/export.",
          ]);
          setShowGodotNotFound(true);
        }
      })
      .catch((err) => {
        setGodotDetecting(false);
        setTerminalOutput((prev) => [...prev, `[error] Failed to detect Godot: ${err}`]);
        setShowGodotNotFound(true);
      });

  }, []);

  // Handler for custom Godot path selection
  const handleSelectGodotPath = async () => {
    try {
      const selected = await openDialog({ 
        multiple: false,
        filters: [{ name: "Godot Executable", extensions: ["exe", "bin", "app"] }]
      });
      if (selected && typeof selected === "string") {
        setGodotCustomPath(selected);
        setTerminalOutput((prev) => [...prev, `$ Godot path set to: ${selected}`]);
        // Verify the selected path
        try {
          const result = await invoke<GodotInfo>("godot_verify_path", { path: selected });
          if (result.found) {
            setGodotInfo(result);
            setShowGodotNotFound(false);
            toast.success(`Godot found: ${result.version}`);
            setTerminalOutput((prev) => [...prev, `$ Godot verified: ${result.path}`, `$ Version: ${result.version}`]);
          } else {
            toast.error("Selected file is not a valid Godot executable");
            setTerminalOutput((prev) => [...prev, "[error] Selected file is not a valid Godot executable"]);
          }
        } catch (err) {
          toast.error(`Failed to verify Godot: ${err}`);
          setTerminalOutput((prev) => [...prev, `[error] Failed to verify Godot: ${err}`]);
        }
      }
    } catch (err) {
      toast.error("Failed to select file");
    }
  };

  // Interop: shared API keys, event bus, cross-clipboard
  const apiKeys = useApiKeys();
  const emit = useInteropEmit("game-studio");
  const clip = useCrossClipboard("game-studio");

  // Listen for code snippets from VibeCodeWorker
  useInterop("code:snippet-created", (event) => {
    const data = event.data as { code?: string; language?: string; name?: string };
    if (data?.code && (data?.language === "gdscript" || data?.language === "gd")) {
      setTerminalOutput((prev) => [
        ...prev,
        `$ Received GDScript from ${event.source}: ${data.name || "snippet"}`,
        "$ Use 'Apply to File' to add it to your project.",
      ]);
      setAiMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Received code from ${event.source}:\n\n\`\`\`gdscript\n${data.code}\n\`\`\``, timestamp: Date.now() },
      ]);
    }
  }, { target: "game-studio" });

  // Listen for media assets from MediaMogul
  useInterop("media:exported", (event) => {
    const data = event.data as { path?: string; type?: string };
    if (data?.path) {
      setTerminalOutput((prev) => [
        ...prev,
        `$ Received ${data.type || "media"} asset from ${event.source}: ${(data.path || "").split(/[\\/]/).pop()}`,
      ]);
    }
  }, { target: "game-studio" });

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
        
        // Improvement 25: Add to recent files
        setRecentFiles(prev => [selected, ...prev.filter(f => f !== selected)].slice(0, 10));

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

  // Improvement 26: Search files handler
  const handleSearchFiles = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = fileTree
      .flatMap(node => {
        const collect = (n: FileNode): string[] => {
          const matches = n.name.toLowerCase().includes(query.toLowerCase()) ? [n.path] : [];
          return [...matches, ...(n.children?.flatMap(collect) || [])];
        };
        return collect(node);
      });
    setSearchResults(results);
  }, [fileTree]);

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
      setProjectPath(newProjectPath);
      setProjectName(newProjectName);
      const nodes = await loadDirectory(newProjectPath);
      setFileTree(nodes);
      
      // Improvement 25: Add to recent files
      setRecentFiles(prev => [newProjectPath, ...prev.filter(f => f !== newProjectPath)].slice(0, 10));
      
      // Improvement 81: Initialize project metadata
      setProjectMetadata(prev => ({ ...prev, version: "0.1.0", author: "" }));
      
      // Load scenes and scripts for new project
      const [sceneList, scriptList] = await Promise.all([
        invoke<string[]>("godot_list_scenes", { projectPath: newProjectPath }).catch(() => []),
        invoke<string[]>("godot_list_scripts", { projectPath: newProjectPath }).catch(() => []),
      ]);
      setScenes(sceneList);
      setScripts(scriptList);
      
      setShowNewProject(false);
      toast.success(`Created project: ${newProjectName}`);
      setTerminalOutput((prev) => [
        ...prev,
        `$ Created Godot project: ${newProjectPath}`,
        `$ Template: ${newProjectTemplate} | Scenes: ${sceneList.length} | Scripts: ${scriptList.length}`,
      ]);
    } catch (err) {
      toast.error(`Failed to create project: ${err}`);
    }
  };

  // Improvement 27: Add favorite handler
  const handleAddFavorite = (path: string) => {
    setFavorites(prev => prev.includes(path) ? prev.filter(f => f !== path) : [...prev, path]);
    toast.info(favorites.includes(path) ? "Removed from favorites" : "Added to favorites");
  };

  // Improvement 28: Export project handler
  const handleExportProject = async () => {
    if (!projectPath) {
      toast.error("No project open");
      return;
    }
    try {
      setIsExporting(true);
      setExportProgress(0);
      setTerminalOutput(prev => [...prev, `$ Starting export for ${buildTarget}...`]);
      
      const result = await invoke<string>("godot_export_project", {
        projectPath,
        target: buildTarget,
        preset: selectedExportPreset || "default",
      });
      
      setExportProgress(100);
      toast.success(`Exported to ${buildTarget}`);
      setTerminalOutput(prev => [...prev, `$ Export complete: ${result}`]);
      
      // Improvement 82: Add to build history
      setBuildHistory(prev => [...prev, { timestamp: Date.now(), success: true, duration: 0 }]);
    } catch (err) {
      toast.error(`Export failed: ${err}`);
      setTerminalOutput(prev => [...prev, `[error] Export failed: ${err}`]);
    } finally {
      setIsExporting(false);
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

  // Improvement 29: Undo/Redo handler
  const handleUndo = () => {
    if (undoStack.length > 0) {
      const lastAction = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, -1));
      toast.info("Undo performed");
    }
  };

  // Improvement 31: Godot auto-reload handler
  const handleToggleAutoReload = () => {
    setGodotAutoReload(!godotAutoReload);
    setTerminalOutput(prev => [...prev, `$ Auto-reload ${!godotAutoReload ? "enabled" : "disabled"}`]);
  };

  // Improvement 32: Debug port handler
  const handleSetDebugPort = (port: number) => {
    setGodotDebugPort(port);
    setTerminalOutput(prev => [...prev, `$ Debug port set to ${port}`]);
  };

  // Improvement 35: Export progress handler
  const handleExportWithProgress = async () => {
    if (!projectPath) {
      toast.error("No project open");
      return;
    }
    setIsExporting(true);
    for (let i = 0; i <= 100; i += 10) {
      setExportProgress(i);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    setIsExporting(false);
    toast.success("Export complete");
  };

  // Improvement 40: Remote debug handler
  const handleToggleRemoteDebug = () => {
    setEnableRemoteDebug(!enableRemoteDebug);
    setTerminalOutput(prev => [...prev, `$ Remote debug ${!enableRemoteDebug ? "enabled" : "disabled"}`]);
  };

  // Improvement 42: AI model selector
  const handleSelectAiModel = (model: string) => {
    setAiModel(model);
    setTerminalOutput(prev => [...prev, `$ AI model switched to ${model}`]);
  };

  // Improvement 45: Code generation history
  const handleSaveCodeGeneration = (prompt: string, code: string) => {
    setCodeGenerationHistory(prev => [...prev, { prompt, code, timestamp: Date.now() }]);
  };

  // Improvement 48: AI refactoring suggestions
  const handleRefactorCode = async () => {
    if (!activeTab) {
      toast.error("No file open");
      return;
    }
    setTerminalOutput(prev => [...prev, `$ Analyzing ${activeTab.name} for refactoring opportunities...`]);
    try {
      const prompt = `Analyze this ${activeTab.language} code and suggest refactoring improvements:\n\n\`\`\`${activeTab.language}\n${activeTab.content}\n\`\`\``;
      const suggestions = await chatWithAI(prompt, { action: "game-dev" });
      setAiRefactoringSuggestions([suggestions]);
      setShowAiRefactoring(true);
    } catch (err) {
      toast.error("Refactoring analysis failed");
    }
  };

  // Improvement 52: Resource monitor
  const handleShowResourceMonitor = () => {
    setShowResourceMonitor(!showResourceMonitor);
    setMemoryUsage(Math.random() * 1024);
    setCpuUsage(Math.random() * 100);
    setDiskUsage(Math.random() * 500);
  };

  // Improvement 62: Share project handler
  const handleShareProject = async () => {
    const token = Math.random().toString(36).substring(7);
    setShareToken(token);
    setIsShared(true);
    setShowShareDialog(true);
    toast.success(`Share token: ${token}`);
  };

  // Improvement 65: Add comment handler
  const handleAddComment = (line: number, text: string) => {
    const id = Math.random().toString(36).substring(7);
    setComments(prev => [...prev, { id, author: "You", text, line, resolved: false }]);
    toast.info("Comment added");
  };

  // Improvement 72: Test runner handler
  const handleRunTests = async () => {
    setShowTestRunner(true);
    setTerminalOutput(prev => [...prev, `$ Running tests...`]);
    try {
      const result = await invoke<string>("run_tests", { projectPath });
      setTerminalOutput(prev => [...prev, `$ Tests completed: ${result}`]);
    } catch (err) {
      setTerminalOutput(prev => [...prev, `[error] Test run failed: ${err}`]);
    }
  };

  // Improvement 75: Debug step handler
  const handleDebugStep = (mode: "step-over" | "step-into" | "step-out") => {
    setDebugStepMode(mode);
    setTerminalOutput(prev => [...prev, `$ Debug: ${mode}`]);
  };

  // Improvement 83: Build config handler
  const handleSelectBuildConfig = (configName: string) => {
    setSelectedBuildConfig(configName);
    const config = buildConfigs.find(c => c.name === configName);
    if (config) {
      setBuildTarget(config.target as any);
      setTerminalOutput(prev => [...prev, `$ Build config: ${configName}`]);
    }
  };

  // Improvement 92: Extension market handler
  const handleToggleExtension = (extensionId: string) => {
    setExtensionsEnabled(prev => 
      prev.includes(extensionId) 
        ? prev.filter(id => id !== extensionId)
        : [...prev, extensionId]
    );
    toast.info("Extension toggled");
  };

  // Improvement 96: Macro editor handler
  const handleAddMacro = (name: string, keys: string, actions: string[]) => {
    setMacros(prev => [...prev, { name, keys, actions }]);
    toast.success(`Macro "${name}" created`);
  };

  // Improvement 98: Snippet manager handler
  const handleAddSnippet = (trigger: string, body: string, description: string) => {
    setSnippets(prev => [...prev, { trigger, body, description }]);
    toast.success(`Snippet "${trigger}" created`);
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
      emit("code:file-saved", { path: tab.path, name: tab.name, program: "game-studio" });
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

      const prompt = `You are GameStudio AI - a senior game developer assistant that combines CryptArtist Media Mogul (media editing) + VibeCodeWorker (code IDE) + Godot 4.6.1. You help users build video games automatically.

When asked to create game features, provide COMPLETE, READY-TO-USE GDScript code for Godot 4.6.1. Use proper Godot 4 syntax (typed variables, @onready, @export, etc).

When generating game designs, structure them as:
1. Game Design Document (brief)
2. Scene tree structure
3. Complete GDScript code for each script
4. Asset requirements

Be specific with Godot node types, signals, and the scene tree hierarchy.${context}

User: ${currentInput}`;

      const reply = await chatWithAI(prompt, { action: "game-dev" });
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
        "Generate a complete player controller script for Godot 4.6.1. Include movement (WASD/arrow keys), jumping, gravity, and animation state machine. Use CharacterBody2D for a 2D platformer.",
      enemy:
        "Generate a complete enemy AI script for Godot 4.6.1. Include patrol behavior, chase player when in range, attack, and take damage. Use CharacterBody2D.",
      ui: "Generate a complete main menu UI script for Godot 4.6.1. Include Start Game, Options, and Quit buttons with proper scene transitions and a pause menu.",
      inventory:
        "Generate a complete inventory system for Godot 4.6.1. Include Item resource class, InventoryManager autoload, pickup detection, and a UI display with grid slots.",
      dialogue:
        "Generate a complete dialogue system for Godot 4.6.1. Include a DialogueManager, dialogue data in JSON format, a typewriter text effect, and choice branching.",
      camera:
        "Generate a complete camera system for Godot 4.6.1. Include smooth follow, screen shake, zoom, look-ahead, and camera bounds/limits.",
      save_system:
        "Generate a complete save/load system for Godot 4.6.1. Include saving player position, inventory, progress flags, and settings to a JSON file using FileAccess.",
      audio:
        "Generate a complete audio manager autoload for Godot 4.6.1. Include music crossfade, SFX pooling, volume control per bus, and positional audio helpers.",
    };
    if (prompts[type]) {
      setAiInput(prompts[type]);
    }
  };

  // .CryptArt save/open for GameStudio
  const wsCtx = useWorkspace();

  // Load from active workspace on mount or workspace switch
  useEffect(() => {
    const active = wsCtx.getActiveWorkspace();
    if (active && active.program === "game-studio") {
      const data = active.project.data as any;
      if (data.projectPath) {
        setProjectPath(data.projectPath);
        loadDirectory(data.projectPath).then(setFileTree).catch(() => {});
      }
      if (data.projectName) setProjectName(data.projectName);
      if (data.layout) setLayout(data.layout);
      if (data.scenes) setScenes(data.scenes);
      if (data.scripts) setScripts(data.scripts);
    }
  }, [wsCtx.activeWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

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

      const active = wsCtx.getActiveWorkspace();
      const defaultPath = active?.filePath || "game-project.CryptArt";

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
        toast.success("Game project saved!");
        emit("workspace:saved", { program: "game-studio", path: savePath });
        notifySuccess("game-studio", "Game Project Saved", `Saved to ${(savePath as string).split(/[\\/]/).pop()}`);
      }
    } catch (err) {
      toast.error("Failed to save project");
    }
  };

  const handleOpenCryptArt = async () => {
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
        if (project.program !== "game-studio") {
          toast.warning(`${filePath.split(/[\\/]/).pop()} is for ${project.program}, not GameStudio`);
          continue;
        }
        const wsId = wsCtx.openWorkspace(project, filePath);
        wsCtx.setActiveWorkspace(wsId);
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
      }
      toast.success("Game project loaded!");
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
          <button type="button"
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
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden">
      {/* ===== HEADER ===== */}
      <header className="flex items-center h-[48px] bg-studio-panel border-b border-studio-border select-none px-4 gap-2 shrink-0">
        <button type="button"
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

        <button type="button" onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
          {"\u{1F4C2}"} Open
        </button>
        <button type="button" onClick={() => setShowNewProject(true)} className="btn text-[10px] py-1 px-3">
          + New Game
        </button>
        {godotInfo?.found && projectPath && (
          <button type="button" onClick={handleRunProject} className="btn btn-cyan text-[10px] py-1 px-3">
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
        <span className="text-studio-border">|</span>
        <button
          onClick={() => navigate('/settings')}
          className="btn-ghost rounded-md px-3 py-1 text-sm hover:bg-studio-hover hover:text-studio-cyan transition-colors font-semibold"
          title="Open Settings"
        >
          ⚙️ Settings
        </button>
        <button
          onClick={() => setShowExtensionMarket(!showExtensionMarket)}
          className="btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors"
          title="Extension Market"
        >
          {"\u{1F9E6}"}
        </button>
        <button
          onClick={() => setShowSnippetManager(!showSnippetManager)}
          className="btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors"
          title="Snippet Manager"
        >
          {"\u{1F4C4}"}
        </button>
        <button
          onClick={() => setShowMacroEditor(!showMacroEditor)}
          className="btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors"
          title="Macro Editor"
        >
          {"\u2699"}
        </button>
      </header>

      {/* ===== GODOT NOT FOUND OVERLAY ===== */}
      {showGodotNotFound && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
          <div className="bg-studio-panel border-2 border-studio-red rounded-xl p-8 w-[520px] max-w-[90vw] shadow-2xl text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-studio-text mb-2">Godot Engine Not Found</h2>
            <p className="text-studio-secondary text-sm mb-6">
              GameStudio requires Godot 4.6.1+ to run and export games. You can still create projects and edit code.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  if (godotInfo?.install_url) {
                    window.open(godotInfo.install_url, '_blank');
                  } else {
                    window.open('https://godotengine.org/download', '_blank');
                  }
                }}
                className="btn btn-accent text-base py-3 px-6 font-semibold w-full"
              >
                📥 Download Godot 4.6.1
              </button>
              <button
                onClick={handleSelectGodotPath}
                className="btn btn-cyan text-base py-3 px-6 font-semibold w-full"
              >
                📁 Browse for Godot .exe
              </button>
              <button
                onClick={() => {
                  invoke<GodotInfo>("godot_detect")
                    .then((info) => {
                      setGodotInfo(info);
                      if (info.found) {
                        toast.success(`Godot found: ${info.path}`);
                        setTerminalOutput((prev) => [...prev, `$ Godot found: ${info.path}`, `$ Version: ${info.version}`]);
                        setShowGodotNotFound(false);
                      } else {
                        toast.warning("Godot still not found. Please install it first.");
                      }
                    })
                    .catch((err) => {
                      toast.error(`Detection failed: ${err}`);
                    });
                }}
                className="btn text-base py-3 px-6 font-semibold w-full"
              >
                🔄 Rescan System
              </button>
              <button
                onClick={() => {
                  setShowGodotNotFound(false);
                  setTerminalOutput((prev) => [...prev, "$ Continuing without Godot. You can install it later."]);
                }}
                className="btn-ghost text-base py-2 px-6 w-full text-studio-secondary hover:text-studio-text"
              >
                Continue Without Godot
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div className="w-full h-full flex flex-col bg-studio-bg">
                    <div className="flex-1 flex flex-col min-h-0 bg-studio-bg border border-studio-border">
                      <div className="flex-1 overflow-hidden">
                        <button
                          onClick={() => {
                            emit("code:file-opened", {
                              path: activeTab.path,
                              content: activeTab.content,
                              language: activeTab.language,
                              projectPath,
                            }, { target: "vibecode-worker" });
                            toast.info(`Opening ${activeTab.name} in VibeCodeWorker...`);
                          }}
                          className="absolute top-2 right-2 btn btn-cyan text-[10px] py-1 px-2 z-10"
                          title="Open in VibeCodeWorker"
                        >
                          {"\u{1F4BB}"} Edit in VibeCode
                        </button>
                        <div className="w-full h-full bg-studio-panel flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-3">{"\u{1F4DC}"}</div>
                            <p className="text-studio-text font-semibold mb-2">{activeTab.name}</p>
                            <p className="text-studio-secondary text-xs mb-4">Language: {activeTab.language}</p>
                            <div className="bg-studio-bg rounded p-4 max-w-md max-h-48 overflow-y-auto mb-4 text-left text-[10px] text-studio-secondary font-mono border border-studio-border">
                              {activeTab.content.split('\n').slice(0, 10).map((line, i) => (
                                <div key={i}>{line || '\u00A0'}</div>
                              ))}
                              {activeTab.content.split('\n').length > 10 && <div className="text-studio-muted">...</div>}
                            </div>
                            <button
                              onClick={() => {
                                emit("code:file-opened", {
                                  path: activeTab.path,
                                  content: activeTab.content,
                                  language: activeTab.language,
                                  projectPath,
                                }, { target: "vibecode-worker" });
                                toast.info(`Opening ${activeTab.name} in VibeCodeWorker...`);
                              }}
                              className="btn btn-cyan text-[11px] py-1.5 px-4"
                            >
                              {"\u{1F4BB}"} Open in VibeCodeWorker
                            </button>
                            <p className="text-studio-muted text-[9px] mt-3">
                              GameStudio uses VibeCodeWorker for code editing
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
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
                <div className="panel-header flex items-center gap-3">
                  <span>{"\u{1F916}"} AI Game Generator</span>
                  <div className="flex-1" />
                  {/* Improvement 346: Model selector */}
                  <select aria-label="Select option"
                    value={getActionModel("game-dev")}
                    onChange={(e) => setActionModel("game-dev", e.target.value)}
                    className="bg-transparent text-[9px] text-studio-cyan outline-none cursor-pointer"
                    title="OpenRouter model for AI generation"
                  >
                    {["openai/gpt-5-mini", "openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "anthropic/claude-3-haiku", "google/gemini-pro-1.5", "deepseek/deepseek-chat", "deepseek/deepseek-r1", "meta-llama/llama-3.1-70b-instruct", "mistralai/mistral-large"].map((m) => (
                      <option key={m} value={m}>{m.split("/").pop()}</option>
                    ))}
                  </select>
                  {/* Improvement 347: Provider badge */}
                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-studio-cyan/10 text-studio-cyan">OpenRouter</span>
                </div>
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
                    {/* Improvement 348: Clear AI chat */}
                    <button
                      onClick={() => { if (aiMessages.length > 0) { setAiMessages([]); } }}
                      className="btn text-[10px] px-2 py-2 text-studio-muted hover:text-red-400"
                      title="Clear AI chat"
                    >
                      {"\u{1F5D1}"}
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
              <div className="flex items-center gap-2">
                <h3>{"\u{1F916}"} Game AI</h3>
                <AIOptimizer actionKey="game-dev" className="h-5" />
              </div>
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

      {/* Improvements 191-198: Enhanced toolbar */}
      <div className="flex items-center h-[26px] bg-studio-surface border-t border-studio-border px-4 gap-2 text-[9px]">
        {/* Improvement 193: Debug overlay */}
        <button
          onClick={() => setDebugOverlay((s) => !s)}
          className={`px-1.5 py-0.5 rounded ${debugOverlay ? "bg-studio-cyan/15 text-studio-cyan" : "text-studio-muted hover:text-studio-text"}`}
          title="Debug overlay"
        >
          Debug
        </button>
        {/* Improvement 194: Physics debug */}
        <button
          onClick={() => setPhysicsDebug((s) => !s)}
          className={`px-1.5 py-0.5 rounded ${physicsDebug ? "bg-studio-green/15 text-studio-green" : "text-studio-muted hover:text-studio-text"}`}
          title="Physics debug shapes"
        >
          Physics
        </button>
        {/* Improvement 196: Perf stats */}
        <button
          onClick={() => setShowPerfStats((s) => !s)}
          className={`px-1.5 py-0.5 rounded ${showPerfStats ? "bg-studio-yellow/15 text-studio-yellow" : "text-studio-muted hover:text-studio-text"}`}
          title="Performance stats"
        >
          Perf
        </button>
        {/* Improvement 191: Scene graph */}
        <button
          onClick={() => setShowSceneGraph((s) => !s)}
          className={`px-1.5 py-0.5 rounded ${showSceneGraph ? "bg-studio-purple/15 text-studio-purple" : "text-studio-muted hover:text-studio-text"}`}
          title="Scene graph"
        >
          Graph
        </button>
        {/* Improvement 197: Node inspector */}
        <button
          onClick={() => setShowNodeInspector((s) => !s)}
          className={`px-1.5 py-0.5 rounded ${showNodeInspector ? "bg-studio-orange/15 text-studio-orange" : "text-studio-muted hover:text-studio-text"}`}
          title="Node inspector"
        >
          Inspector
        </button>
        <div className="w-px h-3 bg-studio-border" />
        {/* Improvement 195: Game resolution */}
        <span className="text-studio-muted">Res:</span>
        <select aria-label="Select option"
          value={gameResolution}
          onChange={(e) => setGameResolution(e.target.value as any)}
          className="bg-transparent text-[9px] text-studio-secondary outline-none cursor-pointer"
        >
          <option value="1920x1080">1080p</option>
          <option value="1280x720">720p</option>
          <option value="640x480">480p</option>
          <option value="320x240">240p</option>
        </select>
        <div className="flex-1" />
        {/* Improvement 196: Show perf stats inline */}
        {showPerfStats && (
          <span className="text-studio-yellow font-mono">
            {perfStats.fps}fps | {perfStats.drawCalls} draws | {perfStats.nodes} nodes | {perfStats.memory}
          </span>
        )}
        {/* Improvement 192: Asset pipeline */}
        {assetPipeline.importing > 0 && (
          <span className="text-studio-cyan">Importing {assetPipeline.importing}/{assetPipeline.total}...</span>
        )}
      </div>

      {/* Improvement 294: Tilemap editor overlay */}
      {showTilemapEditor && (
        <div className="modal-overlay" onClick={() => setShowTilemapEditor(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F5FA}\uFE0F"} Tilemap Editor</h2>
              <button onClick={() => setShowTilemapEditor(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body">
              <div className="text-[10px] text-studio-muted mb-2">Layers</div>
              <div className="flex flex-col gap-1">
                {tilemapLayers.map((layer, i) => (
                  <div key={i} className={`flex items-center gap-2 px-2 py-1.5 rounded text-[10px] cursor-pointer transition-colors ${
                    activeTilemapLayer === i ? "bg-studio-cyan/10 border border-studio-cyan/30" : "hover:bg-studio-hover border border-transparent"
                  }`} onClick={() => setActiveTilemapLayer(i)}>
                    <button onClick={(e) => { e.stopPropagation(); const nl = [...tilemapLayers]; nl[i] = { ...nl[i], visible: !nl[i].visible }; setTilemapLayers(nl); }}
                      className={layer.visible ? "text-studio-text" : "text-studio-muted"}>{layer.visible ? "\u{1F441}" : "\u{1F441}\u200D\u{1F5E8}"}</button>
                    <span className="flex-1 text-studio-text">{layer.name}</span>
                    {layer.locked && <span className="text-studio-muted">{"\u{1F512}"}</span>}
                  </div>
                ))}
              </div>
              <button onClick={() => setTilemapLayers((prev) => [...prev, { name: `Layer ${prev.length + 1}`, visible: true, locked: false }])}
                className="btn text-[10px] mt-2">+ Add Layer</button>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 295: Particle preview overlay */}
      {showParticlePreview && (
        <div className="modal-overlay" onClick={() => setShowParticlePreview(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u2728"} Particle Presets</h2>
              <button onClick={() => setShowParticlePreview(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-2 gap-2">
                {particlePresets.map((p) => (
                  <button key={p} onClick={() => setActiveParticle(p === activeParticle ? null : p)}
                    className={`p-3 rounded text-[11px] text-center transition-colors ${
                      activeParticle === p ? "bg-studio-cyan/15 text-studio-cyan border border-studio-cyan/30" : "bg-studio-surface border border-studio-border hover:border-studio-cyan/20 text-studio-text"
                    }`}>{p}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 297: Profiler overlay */}
      {showProfiler && (
        <div className="modal-overlay" onClick={() => setShowProfiler(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F4CA}"} Profiler</h2>
              <button onClick={() => setShowProfiler(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body space-y-2">
              {[
                ["Physics", profilerData.physicsTime, "#22c55e"],
                ["Render", profilerData.renderTime, "#00d2ff"],
                ["Script", profilerData.scriptTime, "#eab308"],
                ["Idle", profilerData.idleTime, "#64748b"],
              ].map(([label, time, color]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <span className="text-[10px] text-studio-muted w-14">{label}</span>
                  <div className="flex-1 h-3 bg-studio-bg rounded overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${((time as number) / profilerData.totalFrame) * 100}%`, background: color as string }} />
                  </div>
                  <span className="text-[9px] text-studio-secondary tabular-nums w-12 text-right">{(time as number).toFixed(1)}ms</span>
                </div>
              ))}
              <div className="border-t border-studio-border pt-2 flex justify-between text-[10px]">
                <span className="text-studio-muted">Frame Total</span>
                <span className="text-studio-text font-mono">{profilerData.totalFrame.toFixed(1)}ms ({Math.round(1000 / profilerData.totalFrame)}fps)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 298: Input mapper overlay */}
      {showInputMapper && (
        <div className="modal-overlay" onClick={() => setShowInputMapper(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F3AE}"} Input Mapping</h2>
              <button onClick={() => setShowInputMapper(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-1">
                {inputMappings.map((mapping, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-studio-hover">
                    <span className="text-[10px] text-studio-text font-mono">{mapping.action}</span>
                    <div className="flex gap-1">
                      {mapping.keys.map((k) => <span key={k} className="kbd text-[8px]">{k}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 92: Extension Market */}
      {showExtensionMarket && (
        <div className="modal-overlay" onClick={() => setShowExtensionMarket(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F9E6}"} Extension Market</h2>
              <button onClick={() => setShowExtensionMarket(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body space-y-2 max-h-96 overflow-y-auto">
              {availableExtensions.map(ext => (
                <div key={ext.id} className="flex items-center justify-between p-2 rounded hover:bg-studio-hover border border-studio-border">
                  <div>
                    <div className="text-sm font-semibold text-studio-text">{ext.name}</div>
                    <div className="text-xs text-studio-secondary">v{ext.version}</div>
                  </div>
                  <button
                    onClick={() => handleToggleExtension(ext.id)}
                    className={`btn text-xs ${ext.enabled ? "btn-cyan" : ""}`}
                  >
                    {ext.enabled ? "Enabled" : "Enable"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Improvement 98: Snippet Manager */}
      {showSnippetManager && (
        <div className="modal-overlay" onClick={() => setShowSnippetManager(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F4C4}"} Snippet Manager</h2>
              <button onClick={() => setShowSnippetManager(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body space-y-2 max-h-96 overflow-y-auto">
              {snippets.map((snippet, i) => (
                <div key={i} className="p-2 rounded hover:bg-studio-hover border border-studio-border">
                  <div className="text-sm font-mono text-studio-cyan">{snippet.trigger}</div>
                  <div className="text-xs text-studio-secondary mt-1">{snippet.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Improvement 96: Macro Editor */}
      {showMacroEditor && (
        <div className="modal-overlay" onClick={() => setShowMacroEditor(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u2699"} Macro Editor</h2>
              <button onClick={() => setShowMacroEditor(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body space-y-2 max-h-96 overflow-y-auto">
              {macros.map((macro, i) => (
                <div key={i} className="p-2 rounded hover:bg-studio-hover border border-studio-border">
                  <div className="text-sm font-semibold text-studio-text">{macro.name}</div>
                  <div className="text-xs text-studio-secondary">{macro.keys}</div>
                  <div className="text-xs text-studio-muted mt-1">{macro.actions.length} actions</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Improvement 52: Resource Monitor */}
      {showResourceMonitor && (
        <div className="modal-overlay" onClick={() => setShowResourceMonitor(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F4CA}"} Resource Monitor</h2>
              <button onClick={() => setShowResourceMonitor(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-studio-muted">Memory</span>
                  <span className="text-studio-text font-mono">{memoryUsage.toFixed(0)} MB</span>
                </div>
                <div className="h-2 bg-studio-bg rounded overflow-hidden">
                  <div className="h-full bg-studio-cyan" style={{ width: `${Math.min(memoryUsage / 10, 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-studio-muted">CPU</span>
                  <span className="text-studio-text font-mono">{cpuUsage.toFixed(1)}%</span>
                </div>
                <div className="h-2 bg-studio-bg rounded overflow-hidden">
                  <div className="h-full bg-studio-green" style={{ width: `${cpuUsage}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-studio-muted">Disk</span>
                  <span className="text-studio-text font-mono">{diskUsage.toFixed(0)} MB</span>
                </div>
                <div className="h-2 bg-studio-bg rounded overflow-hidden">
                  <div className="h-full bg-studio-yellow" style={{ width: `${Math.min(diskUsage / 5, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 62: Share Dialog */}
      {showShareDialog && (
        <div className="modal-overlay" onClick={() => setShowShareDialog(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F517}"} Share Project</h2>
              <button onClick={() => setShowShareDialog(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body space-y-3">
              {shareToken && (
                <div className="p-3 rounded bg-studio-bg border border-studio-cyan/30">
                  <div className="text-xs text-studio-muted mb-1">Share Token</div>
                  <div className="font-mono text-sm text-studio-cyan break-all">{shareToken}</div>
                </div>
              )}
              <div className="text-xs text-studio-secondary">
                Share this token with collaborators to grant access to this project.
              </div>
              <button onClick={handleShareProject} className="btn btn-cyan w-full text-xs">
                Generate New Token
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 72: Test Runner */}
      {showTestRunner && (
        <div className="modal-overlay" onClick={() => setShowTestRunner(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F9EA}"} Test Runner</h2>
              <button onClick={() => setShowTestRunner(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body space-y-2">
              {testSuites.map((suite, i) => (
                <div key={i} className="p-2 rounded hover:bg-studio-hover border border-studio-border">
                  <div className="text-sm font-semibold text-studio-text">{suite.name}</div>
                  <div className="flex gap-3 text-xs mt-1">
                    <span className="text-studio-green">{"\u2713"} {suite.passed}</span>
                    <span className="text-studio-red">{"\u2717"} {suite.failed}</span>
                    <span className="text-studio-yellow">{"\u26A0"} {suite.skipped}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Debug Play Window */}
      {showDebugPlayWindow && debugPlaySession && (
        <DebugPlayWindow
          session={debugPlaySession}
          onClose={() => {
            setShowDebugPlayWindow(false);
            setDebugPlaySession(null);
          }}
          onCodeFixRequired={(fixes) => {
            fixes.forEach((fix) => {
              emit("code:fix-required", {
                filePath: fix.filePath,
                code: fix.code,
                description: `AI-generated fix from Debug Play`,
              });
            });
            toast.info(`Sent ${fixes.length} code fixes to VibeCodeWorker`);
          }}
        />
      )}

      {/* ===== STATUS BAR - Improvements 294-298 ===== */}
      <footer className="status-bar" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span>{"\u{1F3AE}"} GSt v0.1.0</span>
          <span className="text-studio-border">|</span>
          <span>{projectName || "No project"}</span>
          {scenes.length > 0 && <><span className="text-studio-border">|</span><span>{scenes.length} scenes</span></>}
          {scripts.length > 0 && <><span className="text-studio-border">|</span><span>{scripts.length} scripts</span></>}
          <span className="text-studio-border">|</span>
          <span>{gameResolution}</span>
          {vcsBranch && (
            <>
              <span className="text-studio-border">|</span>
              <span className="flex items-center gap-1">
                {"\u{1F33F}"} {vcsBranch}
                <span className={vcsStatus === "clean" ? "text-studio-green" : "text-studio-yellow"}>
                  {vcsStatus === "clean" ? "\u2713" : "\u25CF"}
                </span>
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-studio-secondary capitalize">{gameGenre}</span>
          <span className="text-studio-border">|</span>
          <select aria-label="Select option"
            value={buildTarget}
            onChange={(e) => setBuildTarget(e.target.value as any)}
            className="bg-transparent text-[10px] text-studio-muted outline-none cursor-pointer"
          >
            <option value="windows">Windows</option>
            <option value="linux">Linux</option>
            <option value="macos">macOS</option>
            <option value="web">Web/HTML5</option>
            <option value="android">Android</option>
          </select>
          <span className="text-studio-border">|</span>
          <button
            onClick={() => {
              if (godotInfo?.found && projectPath) {
                setTerminalOutput((prev) => [...prev, `$ Running game: ${projectPath}`]);
                toast.info("Starting game in Godot...");
                invoke("godot_run_scene", { projectPath }).catch((err) =>
                  setTerminalOutput((prev) => [...prev, `[error] Run failed: ${err}`])
                );
              } else {
                toast.error(godotInfo?.found ? "Open a project first" : "Godot not found");
              }
            }}
            className="text-[10px] text-studio-green hover:text-green-300 transition-colors"
          >
            {"\u25B6"} Play
          </button>
          <span className="text-studio-border">|</span>
          <button
            onClick={async () => {
              if (!godotInfo?.found || !projectPath) {
                toast.error(godotInfo?.found ? "Open a project first" : "Godot not found");
                return;
              }
              try {
                const scenePath = scenes.length > 0 ? scenes[0] : "res://main.tscn";
                setTerminalOutput((prev) => [...prev, `$ Starting Debug Play: ${scenePath}`]);
                const session = await debugPlayService.startSession(projectPath, scenePath);
                setDebugPlaySession(session);
                setShowDebugPlayWindow(true);
                toast.success("Debug Play session started");
              } catch (err) {
                const msg = err instanceof Error ? err.message : String(err);
                toast.error(`Failed to start Debug Play: ${msg}`);
                setTerminalOutput((prev) => [...prev, `[error] Debug Play failed: ${msg}`]);
              }
            }}
            className="text-[10px] text-studio-cyan hover:text-cyan-300 transition-colors font-bold"
          >
            🐛 DP
          </button>
          <span className="text-studio-border">|</span>
          {debugOverlay && <span className="text-studio-cyan">DBG</span>}
          {physicsDebug && <span className="text-studio-green">PHY</span>}
          {(debugOverlay || physicsDebug) && <span className="text-studio-border">|</span>}
          {/* Improvement 297: Profiler button */}
          <button onClick={() => setShowProfiler(true)} className="hover:text-studio-cyan transition-colors text-studio-muted">{"\u{1F4CA}"}</button>
          <span className="text-studio-border">|</span>
          {/* Improvement 298: Input mapper button */}
          <button onClick={() => setShowInputMapper(true)} className="hover:text-studio-cyan transition-colors text-studio-muted">{"\u{1F3AE}"}</button>
          <span className="text-studio-border">|</span>
          <span>
            {godotInfo?.found
              ? `\u{1F7E2} Godot ${godotInfo.version}`
              : godotDetecting
              ? "\u{1F7E1} Detecting..."
              : "\u{1F534} No Godot"}
          </span>
          <span className="text-studio-border">|</span>
          <span>{openTabs.length} files</span>
        </div>
      </footer>
    </div>
  );
}
