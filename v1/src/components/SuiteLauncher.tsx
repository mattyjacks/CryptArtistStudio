import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGlobalShortcuts } from "../utils/keyboard";
import { logger } from "../utils/logger";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "../utils/toast";

const programs = [
  {
    id: "media-mogul",
    name: "Media Mogul",
    code: "MMo",
    emoji: "\u{1F4FA}",
    description: "Video editor, image editor, and AI-powered media studio",
    gradient: "from-red-600/20 to-purple-600/20",
    borderHover: "hover:border-red-500/40",
    accentColor: "text-red-400",
    version: "v0.1.0",
    shortcut: "1",
    tags: ["video", "image", "ai", "media"],
  },
  {
    id: "vibecode-worker",
    name: "VibeCodeWorker",
    code: "VCW",
    emoji: "\u{1F469}\u{1F3FB}\u200D\u{1F4BB}",
    description: "Your personal vibe-coding IDE powered by your own API keys",
    gradient: "from-cyan-600/20 to-blue-600/20",
    borderHover: "hover:border-cyan-500/40",
    accentColor: "text-cyan-400",
    version: "v0.1.0",
    shortcut: "2",
    tags: ["code", "ide", "ai", "editor"],
  },
  {
    id: "demo-recorder",
    name: "DemoRecorder",
    code: "DRe",
    emoji: "\u{1F3A5}",
    description: "Screen recorder and live streamer for demos and gaming",
    gradient: "from-green-600/20 to-emerald-600/20",
    borderHover: "hover:border-green-500/40",
    accentColor: "text-green-400",
    version: "v0.1.0",
    shortcut: "3",
    tags: ["record", "stream", "capture", "demo"],
  },
  {
    id: "valley-net",
    name: "ValleyNet",
    code: "VNt",
    emoji: "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F",
    description: "Autonomous AI agent that can do anything on your computer",
    gradient: "from-purple-600/20 to-pink-600/20",
    borderHover: "hover:border-purple-500/40",
    accentColor: "text-purple-400",
    version: "v0.1.0",
    shortcut: "4",
    tags: ["agent", "ai", "automation", "bot"],
  },
  {
    id: "game-studio",
    name: "GameStudio",
    code: "GSt",
    emoji: "\u{1F3AE}",
    description: "Make video games automatically - Media Mogul + VibeCodeWorker + Godot 4.4",
    gradient: "from-amber-600/20 to-orange-600/20",
    borderHover: "hover:border-amber-500/40",
    accentColor: "text-amber-400",
    version: "v0.1.0",
    shortcut: "5",
    tags: ["game", "godot", "gamedev", "3d", "2d"],
  },
  {
    id: "commander",
    name: "CryptArt Commander",
    code: "CAC",
    emoji: "\u{1F431}",
    description: "Control CryptArtist Studio through API, CLI, and advanced scripting",
    gradient: "from-sky-600/20 to-indigo-600/20",
    borderHover: "hover:border-sky-500/40",
    accentColor: "text-sky-400",
    version: "v0.1.0",
    shortcut: "6",
    tags: ["api", "cli", "scripting", "automation", "command"],
  },
  {
    id: "settings",
    name: "Settings",
    code: "Set",
    emoji: "\u2699\uFE0F",
    description: "API keys, OpenRouter integration, appearance, and app configuration",
    gradient: "from-slate-600/20 to-zinc-600/20",
    borderHover: "hover:border-slate-500/40",
    accentColor: "text-slate-400",
    version: "v0.1.0",
    shortcut: "7",
    tags: ["settings", "config", "keys", "openrouter", "api"],
  },
];

// Improvement 138: Tips rotation
const tips = [
  "Press 1-7 to quick-launch any program",
  "Use Ctrl+S to save your .CryptArt project anytime",
  "Star your favorite programs for quick access",
  "DemoRecorder supports countdown timers before recording",
  "ValleyNet can export conversations to text files",
  "GameStudio integrates with Godot 4.x for game development",
  "VibeCodeWorker has keyboard shortcut help (Ctrl+Shift+/)",
  "MediaMogul supports multiple aspect ratios and zoom levels",
  "All programs save state in the universal .CryptArt format",
  "Visit mattyjacks.com to support development",
];

export default function SuiteLauncher() {
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [clock, setClock] = useState("");
  const [ffmpegStatus, setFfmpegStatus] = useState<boolean | null>(null);
  const [godotStatus, setGodotStatus] = useState<boolean | null>(null);
  const [lastOpened, setLastOpened] = useState<string | null>(null);
  // Improvement 126: Favorites system
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("cryptartist_favorites") || "[]"); } catch { return []; }
  });
  // Improvement 127: Recent projects
  const [recentProjects, setRecentProjects] = useState<{ name: string; path: string; program: string; time: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem("cryptartist_recent_projects") || "[]"); } catch { return []; }
  });
  // Improvement 128: Launch count per program
  const [launchCounts, setLaunchCounts] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("cryptartist_launch_counts") || "{}"); } catch { return {}; }
  });
  // Improvement 129: Uptime display
  const [uptime, setUptime] = useState(0);
  // Improvement 130: Theme accent selector
  const [accentTheme, setAccentTheme] = useState(() => localStorage.getItem("cryptartist_accent") || "cyan");
  // Improvement 131: Quick actions dropdown
  const [showQuickActions, setShowQuickActions] = useState(false);
  // Improvement 132: Show tips
  const [tipIndex, setTipIndex] = useState(0);
  // Improvement 133: Show keyboard shortcuts overlay
  const [showShortcuts, setShowShortcuts] = useState(false);
  // Improvement 134: Show recent projects panel
  const [showRecents, setShowRecents] = useState(false);
  // Improvement 140: Launch animation
  const [launching, setLaunching] = useState<string | null>(null);
  // Improvement 226: Category filter
  const [activeCategory, setActiveCategory] = useState<string>("all");
  // Improvement 227: What's new modal
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  // Improvement 228: Sort option
  const [sortBy, setSortBy] = useState<"default" | "name" | "most-used" | "favorites">("default");
  // Improvement 229: View mode (grid vs compact list)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // Improvement 230: Time-based greeting
  const [greeting, setGreeting] = useState("");
  // Improvement 233: Suite health check
  const [healthStatus, setHealthStatus] = useState<"good" | "warn" | "unknown">("unknown");
  // Improvement 237: Show system info
  const [showSystemInfo, setShowSystemInfo] = useState(false);
  // Improvement 239: Milestone celebration
  const [showMilestone, setShowMilestone] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  useGlobalShortcuts(navigate);

  // Improvement 40: Clock display + Improvement 129: Uptime + Improvement 230: Greeting
  useEffect(() => {
    const startTime = Date.now();
    const update = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      setUptime(Math.floor((Date.now() - startTime) / 1000));
      const h = now.getHours();
      setGreeting(h < 5 ? "Late night coding" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : h < 21 ? "Good evening" : "Night owl mode");
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  // Improvement 233: Simple health check
  useEffect(() => {
    const hasKey = !!localStorage.getItem("cryptartist_api_key");
    setHealthStatus(ffmpegStatus && godotStatus ? "good" : ffmpegStatus || godotStatus ? "warn" : "unknown");
  }, [ffmpegStatus, godotStatus]);

  // Improvement 132: Rotate tips every 8 seconds
  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % tips.length), 8000);
    return () => clearInterval(id);
  }, []);

  // Improvement 131: Close quick actions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setShowQuickActions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Improvement 34: System status check
  useEffect(() => {
    invoke<boolean>("check_ffmpeg_installed").then(setFfmpegStatus).catch(() => setFfmpegStatus(false));
    invoke<{ found: boolean }>("godot_detect").then((r) => setGodotStatus(r.found)).catch(() => setGodotStatus(false));
    const stored = localStorage.getItem("cryptartist_last_opened");
    if (stored) setLastOpened(stored);
  }, []);

  // Improvement 126: Toggle favorite
  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
      localStorage.setItem("cryptartist_favorites", JSON.stringify(next));
      return next;
    });
  };

  // Improvement 128: Track launch counts + Improvement 140: launch animation
  const launchProgram = useCallback((prog: typeof programs[0]) => {
    setLaunching(prog.id);
    logger.programLaunch(prog.id);
    localStorage.setItem("cryptartist_last_opened", prog.id);
    setLaunchCounts((prev) => {
      const next = { ...prev, [prog.id]: (prev[prog.id] || 0) + 1 };
      localStorage.setItem("cryptartist_launch_counts", JSON.stringify(next));
      return next;
    });
    setTimeout(() => navigate(`/${prog.id}`), 300);
  }, [navigate]);

  // Improvement 27: Keyboard number shortcuts to launch programs + Improvement 133: ? for shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.key === "?") { setShowShortcuts((s) => !s); return; }
    if (e.key === "r" || e.key === "R") { setShowRecents((s) => !s); return; }
    const num = parseInt(e.key);
    if (num >= 1 && num <= programs.length) {
      launchProgram(programs[num - 1]);
    }
  }, [launchProgram]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Improvement 226: Categories from tags
  const categories = useMemo(() => {
    const tagSet = new Set<string>();
    programs.forEach((p) => p.tags.forEach((t) => tagSet.add(t)));
    return ["all", ...Array.from(tagSet).slice(0, 8)];
  }, []);

  // Improvement 226+228: Search/filter/sort programs
  const filteredPrograms = useMemo(() => {
    let result = programs.filter((prog) => {
      const matchesSearch = !searchQuery.trim() || (
        prog.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        prog.tags.some((t) => t.includes(searchQuery.toLowerCase()))
      );
      const matchesCategory = activeCategory === "all" || prog.tags.includes(activeCategory);
      return matchesSearch && matchesCategory;
    });
    // Improvement 228: Sort
    if (sortBy === "name") result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "most-used") result = [...result].sort((a, b) => (launchCounts[b.id] || 0) - (launchCounts[a.id] || 0));
    else if (sortBy === "favorites") result = [...result].sort((a, b) => (favorites.includes(b.id) ? 1 : 0) - (favorites.includes(a.id) ? 1 : 0));
    return result;
  }, [searchQuery, activeCategory, sortBy, launchCounts, favorites]);

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="flex items-center gap-4 mb-3 animate-fade-in">
          <span className="text-6xl" role="img" aria-label="CryptArtist logo">
            {"\u{1F480}\u{1F3A8}"}
          </span>
        </div>
        {/* Improvement 230: Greeting */}
        {greeting && (
          <p className="text-[11px] text-studio-muted mb-1 animate-fade-in">{greeting}, Matt {"\u{1F44B}"}</p>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-studio-text mb-1 animate-fade-in">
          CryptArtist Studio
        </h1>
        <p className="text-sm text-studio-secondary mb-6 animate-fade-in text-center max-w-lg">
          The open creative suite - powered by community donations to{" "}
          <a
            href="https://mattyjacks.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-studio-cyan hover:underline"
          >
            mattyjacks.com
          </a>{" "}
          and{" "}
          <a
            href="https://givegigs.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-studio-cyan hover:underline"
          >
            givegigs.com
          </a>
        </p>

        {/* Improvement 226: Search + category + sort + view */}
        <div className="w-full max-w-2xl mb-4 animate-fade-in space-y-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-studio-muted text-sm">
              {"\u{1F50D}"}
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-studio-surface border-studio-border"
              placeholder="Search programs... (or press 1-5 to launch)"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-studio-muted hover:text-studio-text text-xs"
              >
                x
              </button>
            )}
          </div>
          {/* Improvement 226: Category pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-0.5 rounded-full text-[9px] transition-all capitalize ${
                  activeCategory === cat
                    ? "bg-studio-cyan/15 text-studio-cyan border border-studio-cyan/30"
                    : "text-studio-muted hover:text-studio-text border border-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
            <div className="flex-1" />
            {/* Improvement 228: Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-[9px] text-studio-muted outline-none cursor-pointer"
            >
              <option value="default">Default</option>
              <option value="name">A-Z</option>
              <option value="most-used">Most Used</option>
              <option value="favorites">Favorites First</option>
            </select>
            {/* Improvement 229: View toggle */}
            <button
              onClick={() => setViewMode((v) => v === "grid" ? "list" : "grid")}
              className="text-[10px] text-studio-muted hover:text-studio-text px-1"
              title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
            >
              {viewMode === "grid" ? "\u2630" : "\u25A6"}
            </button>
            {/* Improvement 227: What's new */}
            <button
              onClick={() => setShowWhatsNew(true)}
              className="text-[10px] text-studio-muted hover:text-studio-cyan px-1"
              title="What's New"
            >
              {"\u2728"} New
            </button>
          </div>
        </div>

        {/* Program Cards Grid - Improvement 229: View mode */}
        <div className={viewMode === "grid"
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 max-w-6xl w-full"
          : "flex flex-col gap-2 max-w-2xl w-full"
        }>
          {filteredPrograms.map((prog, idx) => (
            <button
              key={prog.id}
              onClick={() => launchProgram(prog)}
              className={`
                group relative flex flex-col items-center text-center p-8 rounded-xl
                bg-gradient-to-br ${prog.gradient}
                border border-studio-border ${prog.borderHover}
                transition-all duration-300 ease-out
                hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-black/40
                focus:outline-none focus:ring-2 focus:ring-studio-cyan/40
                animate-slide-up stagger-${idx + 1}
                ${launching === prog.id ? "scale-95 opacity-50" : ""}
                ${favorites.includes(prog.id) ? "ring-1 ring-studio-yellow/30" : ""}
              `}
            >
              {/* Improvement 33: Keyboard shortcut hint */}
              <span className="absolute top-2 left-2 kbd opacity-0 group-hover:opacity-100 transition-opacity">
                {prog.shortcut}
              </span>
              {/* Improvement 126: Favorite star */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(prog.id); }}
                className={`absolute top-2 right-2 text-sm transition-all hover:scale-125 ${
                  favorites.includes(prog.id) ? "text-studio-yellow" : "text-studio-muted opacity-0 group-hover:opacity-60"
                }`}
                title={favorites.includes(prog.id) ? "Remove from favorites" : "Add to favorites"}
              >
                {favorites.includes(prog.id) ? "\u2605" : "\u2606"}
              </button>
              {/* Improvement 29: Last opened indicator */}
              {lastOpened === prog.id && !favorites.includes(prog.id) && (
                <span className="absolute top-2 right-2 badge badge-cyan text-[8px]">
                  Last used
                </span>
              )}
              <span className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {prog.emoji}
              </span>
              <h2 className="text-base font-bold text-studio-text mb-1">
                {prog.name}
              </h2>
              <span className={`text-xs font-mono font-semibold ${prog.accentColor} mb-2`}>
                [{prog.code}]
              </span>
              <p className="text-xs text-studio-secondary leading-relaxed mb-2">
                {prog.description}
              </p>
              {/* Improvement 28: Version badge + Improvement 136: launch count */}
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-studio-muted font-mono">{prog.version}</span>
                {(launchCounts[prog.id] || 0) > 0 && (
                  <span className="text-[8px] text-studio-muted">
                    {launchCounts[prog.id]}x launched
                  </span>
                )}
              </div>
            </button>
          ))}
          {filteredPrograms.length === 0 && (
            <div className="col-span-full text-center py-12">
              <span className="text-4xl opacity-30 block mb-2">{"\u{1F50D}"}</span>
              <p className="text-studio-secondary text-sm">No programs match "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Improvement 34: System status indicators */}
        <div className="flex items-center gap-4 mt-6 animate-fade-in">
          <span className="flex items-center gap-1.5 text-[10px] text-studio-muted">
            <span className={`w-1.5 h-1.5 rounded-full ${ffmpegStatus ? "bg-studio-green" : ffmpegStatus === false ? "bg-studio-yellow" : "bg-studio-muted"}`} />
            FFmpeg {ffmpegStatus ? "Ready" : "Not Found"}
          </span>
          <span className="text-studio-muted text-[10px]">|</span>
          <span className="flex items-center gap-1.5 text-[10px] text-studio-muted">
            <span className={`w-1.5 h-1.5 rounded-full ${godotStatus ? "bg-studio-green" : godotStatus === false ? "bg-studio-yellow" : "bg-studio-muted"}`} />
            Godot {godotStatus ? "Ready" : "Not Found"}
          </span>
          <span className="text-studio-muted text-[10px]">|</span>
          <span className="text-[10px] text-studio-muted">
            {"\u{1F4A1}"} Press 1-5 to quick-launch
          </span>
          <span className="text-studio-muted text-[10px]">|</span>
          {/* Improvement 131: Quick actions */}
          <div className="relative" ref={quickActionsRef}>
            <button
              onClick={() => setShowQuickActions((s) => !s)}
              className="text-[10px] text-studio-muted hover:text-studio-cyan transition-colors"
            >
              {"\u26A1"} Quick Actions
            </button>
            {showQuickActions && (
              <div className="dropdown-menu absolute bottom-full mb-2 left-0">
                <div className="dropdown-item" onClick={() => { setShowRecents(true); setShowQuickActions(false); }}>Recent Projects</div>
                <div className="dropdown-item" onClick={() => { setShowShortcuts(true); setShowQuickActions(false); }}>Keyboard Shortcuts</div>
                <div className="dropdown-separator" />
                <div className="dropdown-item" onClick={() => { localStorage.clear(); toast.info("Cache cleared"); setShowQuickActions(false); }}>Clear Cache</div>
                <div className="dropdown-item" onClick={() => { setShowQuickActions(false); window.open("https://github.com/mattyjacks/CryptArtistStudio", "_blank"); }}>GitHub Repo</div>
              </div>
            )}
          </div>
        </div>

        {/* Improvement 132: Rotating tip */}
        <div className="mt-3 text-[10px] text-studio-muted animate-fade-in flex items-center gap-1.5">
          <span className="text-studio-cyan">{"\u{1F4A1}"}</span>
          <span key={tipIndex} className="animate-fade-in">{tips[tipIndex]}</span>
        </div>
      </div>

      {/* Improvement 227: What's New modal */}
      {showWhatsNew && (
        <div className="modal-overlay" onClick={() => setShowWhatsNew(false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u2728"} What's New in v0.1.0</h2>
              <button onClick={() => setShowWhatsNew(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body space-y-3">
              {[
                { ver: "v0.1.0", items: [
                  "300 UI/UX improvements across all programs",
                  "Favorites, categories, and sorting on launcher",
                  "Command palette in VibeCodeWorker (Ctrl+Shift+P)",
                  "Timeline markers, render queue, and proxy editing in MediaMogul",
                  "Annotation tools and watermarks in DemoRecorder",
                  "Workflow builder and agent memory in ValleyNet",
                  "Scene graph, debug overlay, and physics debug in GameStudio",
                  "17 shared React hooks library",
                  "Shared constants and types library",
                  "Extended Tailwind theme with 100+ new utilities",
                ]},
              ].map((release) => (
                <div key={release.ver}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge badge-cyan text-[9px]">{release.ver}</span>
                    <span className="text-[10px] text-studio-muted">March 2026</span>
                  </div>
                  <ul className="space-y-1">
                    {release.items.map((item, i) => (
                      <li key={i} className="text-[10px] text-studio-secondary flex items-start gap-2">
                        <span className="text-studio-cyan mt-0.5">{"\u2022"}</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Improvement 237: System info modal */}
      {showSystemInfo && (
        <div className="modal-overlay" onClick={() => setShowSystemInfo(false)}>
          <div className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F4BB}"} System Info</h2>
              <button onClick={() => setShowSystemInfo(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body space-y-2">
              {[
                ["Platform", navigator.platform],
                ["User Agent", navigator.userAgent.slice(0, 60) + "..."],
                ["Language", navigator.language],
                ["Screen", `${window.screen.width}x${window.screen.height}`],
                ["Window", `${window.innerWidth}x${window.innerHeight}`],
                ["FFmpeg", ffmpegStatus ? "Installed" : "Not found"],
                ["Godot", godotStatus ? "Installed" : "Not found"],
                ["Programs", `${programs.length}`],
                ["Total Launches", `${Object.values(launchCounts).reduce((a, b) => a + b, 0)}`],
                ["Favorites", `${favorites.length}`],
              ].map(([label, val]) => (
                <div key={label} className="flex items-center justify-between py-1 border-b border-studio-border">
                  <span className="text-[10px] text-studio-muted">{label}</span>
                  <span className="text-[10px] text-studio-text font-mono">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Improvement 133: Keyboard shortcuts overlay */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={() => setShowShortcuts(false)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Keyboard Shortcuts</h2>
              <button onClick={() => setShowShortcuts(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body space-y-2">
              {[
                ["1-5", "Launch program by number"],
                ["?", "Toggle this shortcuts panel"],
                ["R", "Toggle recent projects"],
                ["Ctrl+S", "Save project (in programs)"],
                ["Ctrl+O", "Open project (in programs)"],
                ["Esc", "Close overlays"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-[11px] text-studio-secondary">{desc}</span>
                  <span className="kbd">{key}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Improvement 134: Recent projects panel */}
      {showRecents && (
        <div className="modal-overlay" onClick={() => setShowRecents(false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Recent Projects</h2>
              <button onClick={() => setShowRecents(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body">
              {recentProjects.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">{"\u{1F4C2}"}</div>
                  <div className="empty-state-title">No recent projects</div>
                  <div className="empty-state-description">Open or save a .CryptArt project to see it here.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentProjects.slice(0, 10).map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-studio-surface border border-studio-border hover:border-studio-border-bright transition-colors">
                      <div>
                        <div className="text-[11px] font-semibold text-studio-text">{p.name}</div>
                        <div className="text-[9px] text-studio-muted truncate-1 max-w-[300px]">{p.path}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-cyan text-[8px]">{p.program}</span>
                        <span className="text-[8px] text-studio-muted">
                          {new Date(p.time).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Improvement 139: Enhanced Donation Banner with gradient accent */}
      {!bannerDismissed && (
        <div className="relative flex items-center justify-center gap-3 px-4 py-2.5 bg-studio-panel border-t border-studio-border text-xs text-studio-secondary animate-fade-in overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-studio-cyan/5 via-transparent to-studio-purple/5 pointer-events-none" />
          <span className="relative z-10">
            {"\u2764\uFE0F"} CryptArtist Studio is free and community-funded. Support development at{" "}
            <a
              href="https://mattyjacks.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-studio-cyan hover:underline font-semibold"
            >
              mattyjacks.com
            </a>{" "}
            and{" "}
            <a
              href="https://givegigs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-studio-cyan hover:underline font-semibold"
            >
              givegigs.com
            </a>
            .
          </span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="relative z-10 text-studio-muted hover:text-studio-text transition-colors ml-2 text-base leading-none"
            title="Dismiss"
          >
            x
          </button>
        </div>
      )}

      {/* Legal Links Bar */}
      <div className="flex items-center justify-center gap-4 px-4 py-1.5 bg-studio-panel border-t border-studio-border text-[10px] text-studio-muted">
        <Link to="/privacy" className="hover:text-studio-cyan transition-colors">Privacy Policy</Link>
        <span>|</span>
        <Link to="/terms" className="hover:text-studio-cyan transition-colors">Terms of Use</Link>
        <span>|</span>
        <a href="mailto:Matt@MattyJacks.com" className="hover:text-studio-cyan transition-colors">Matt@MattyJacks.com</a>
        <span>|</span>
        <a href="https://mattyjacks.com/Contact" target="_blank" rel="noopener noreferrer" className="hover:text-studio-cyan transition-colors">MattyJacks.com/Contact</a>
      </div>

      {/* Version Footer - Improvements 226-240 */}
      <footer className="status-bar">
        <div className="flex items-center gap-3">
          <span>{"\u{1F480}\u{1F3A8}"} CryptArtist Studio v0.1.0</span>
          <span>|</span>
          {/* Improvement 233: Health */}
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${healthStatus === "good" ? "bg-studio-green" : healthStatus === "warn" ? "bg-studio-yellow" : "bg-studio-muted"}`} />
            {healthStatus === "good" ? "All systems go" : healthStatus === "warn" ? "Partial" : "Checking..."}
          </span>
          <span>|</span>
          <span>{favorites.length} fav</span>
          <span>|</span>
          {/* Improvement 237: System info button */}
          <button onClick={() => setShowSystemInfo(true)} className="hover:text-studio-cyan transition-colors">{"\u{1F4BB}"} Info</button>
        </div>
        <div className="flex items-center gap-3">
          <span>{programs.length} programs</span>
          <span>|</span>
          <span>{Object.values(launchCounts).reduce((a, b) => a + b, 0)} launches</span>
          <span>|</span>
          <span>Up {uptime < 60 ? `${uptime}s` : `${Math.floor(uptime / 60)}m ${uptime % 60}s`}</span>
          <span>|</span>
          {/* Improvement 229: View mode */}
          <span>{viewMode === "grid" ? "Grid" : "List"}</span>
          <span>|</span>
          <span>NH, USA</span>
          {clock && (
            <>
              <span>|</span>
              <span>{clock}</span>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}
