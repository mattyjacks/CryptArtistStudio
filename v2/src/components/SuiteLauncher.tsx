import React, { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProject } from "../core/context/ProjectContext";
import { useStudioCore } from "../core/context/StudioCoreContext";
import { SuiteProgramManifest } from "../core/types/suite.types";

export const SUITE_PROGRAMS: SuiteProgramManifest[] = [
  {
    id: "media-mogul",
    name: "Media Mogul",
    shortCode: "MMo",
    emoji: "📺",
    route: "/web/mediamogul",
    description: "Browser-native video editor, DaVinci color grading, and AI auto-edit studio",
    category: "creative",
    gradient: "from-red-600/30 to-purple-600/30",
    accentColor: "text-red-400",
    borderHover: "hover:border-red-500/50",
    version: "v2.0.0",
    isFlagship: true,
    tags: ["video", "editor", "davinci", "capcut", "ai", "media"],
  },
  {
    id: "vibecode-worker",
    name: "VibeCodeWorker",
    shortCode: "VCW",
    emoji: "👩🏻‍💻",
    route: "/vibecode-worker",
    description: "Your personal in-browser vibe-coding IDE powered by Monaco & AI keys",
    category: "development",
    gradient: "from-cyan-600/30 to-blue-600/30",
    accentColor: "text-cyan-400",
    borderHover: "hover:border-cyan-500/50",
    version: "v2.0.0",
    tags: ["code", "ide", "monaco", "ai", "developer"],
  },
  {
    id: "demo-recorder",
    name: "DemoRecorder",
    shortCode: "DRe",
    emoji: "🎥",
    route: "/demo-recorder",
    description: "Web screen recorder, live streamer, and browser demo capture suite",
    category: "creative",
    gradient: "from-green-600/30 to-emerald-600/30",
    accentColor: "text-green-400",
    borderHover: "hover:border-green-500/50",
    version: "v2.0.0",
    tags: ["record", "screen", "stream", "capture", "demo"],
  },
  {
    id: "valley-net",
    name: "ValleyNet",
    shortCode: "VNt",
    emoji: "👱🏻‍♀️",
    route: "/valley-net",
    description: "Autonomous AI agent inspired by OpenClaw with web automation and skills",
    category: "automation",
    gradient: "from-purple-600/30 to-pink-600/30",
    accentColor: "text-purple-400",
    borderHover: "hover:border-purple-500/50",
    version: "v2.0.0",
    tags: ["agent", "ai", "automation", "skills", "openclaw"],
  },
  {
    id: "game-studio",
    name: "GameStudio",
    shortCode: "GSt",
    emoji: "🎮",
    route: "/game-studio",
    description: "2D/3D Game Studio engine combining Media Mogul, Three.js, and VibeCode",
    category: "gaming",
    gradient: "from-amber-600/30 to-orange-600/30",
    accentColor: "text-amber-400",
    borderHover: "hover:border-amber-500/50",
    version: "v2.0.0",
    tags: ["game", "threejs", "godot", "gamedev"],
  },
  {
    id: "virtual-pet",
    name: "Virtual Pet",
    shortCode: "VPt",
    emoji: "🐶",
    route: "/virtual-pet",
    description: "AI companion creature that lives on your screen and learns your habits",
    category: "gaming",
    gradient: "from-pink-600/30 to-rose-600/30",
    accentColor: "text-pink-400",
    borderHover: "hover:border-pink-500/50",
    version: "v2.0.0",
    tags: ["pet", "companion", "ai"],
  },
  {
    id: "commander",
    name: "CryptArt Commander",
    shortCode: "Cmd",
    emoji: "⚡",
    route: "/commander",
    description: "Unified terminal and natural language CLI orchestrator for all suite tools",
    category: "utilities",
    gradient: "from-blue-600/30 to-indigo-600/30",
    accentColor: "text-blue-400",
    borderHover: "hover:border-blue-500/50",
    version: "v2.0.0",
    tags: ["cli", "terminal", "commander"],
  },
  {
    id: "donate-personal-seconds",
    name: "DonatePersonalSeconds",
    shortCode: "DPS",
    emoji: "⏱️",
    route: "/donate-personal-seconds",
    description: "Micro-volunteering network and global leaderboard for creative contributions",
    category: "community",
    gradient: "from-emerald-600/30 to-teal-600/30",
    accentColor: "text-emerald-400",
    borderHover: "hover:border-emerald-500/50",
    version: "v2.0.0",
    tags: ["donate", "volunteering", "givegigs"],
  },
  {
    id: "donate-computer",
    name: "Donate Computer",
    shortCode: "DCo",
    emoji: "💻",
    route: "/donate-computer",
    description: "Peer-to-peer compute sharing network for distributed AI video rendering",
    category: "community",
    gradient: "from-sky-600/30 to-blue-600/30",
    accentColor: "text-sky-400",
    borderHover: "hover:border-sky-500/50",
    version: "v2.0.0",
    tags: ["compute", "p2p", "donate"],
  },
  {
    id: "clone-tool",
    name: "Clone Tool",
    shortCode: "Cln",
    emoji: "🧬",
    route: "/clone-tool",
    description: "Instant repository cloner, project templater, and asset forker",
    category: "utilities",
    gradient: "from-violet-600/30 to-purple-600/30",
    accentColor: "text-violet-400",
    borderHover: "hover:border-violet-500/50",
    version: "v2.0.0",
    tags: ["clone", "git", "template"],
  },
  {
    id: "luck-factory",
    name: "Luck Factory",
    shortCode: "Lck",
    emoji: "🍀",
    route: "/luck-factory",
    description: "Quantum random number generator and lucky creative prompt synthesizer",
    category: "utilities",
    gradient: "from-lime-600/30 to-green-600/30",
    accentColor: "text-lime-400",
    borderHover: "hover:border-lime-500/50",
    version: "v2.0.0",
    tags: ["rng", "luck", "generator"],
  },
  {
    id: "dictate-pic",
    name: "DictatePic",
    shortCode: "DPc",
    emoji: "🎨",
    route: "/dictate-pic",
    description: "Voice-driven generative image canvas and AI inpainting studio",
    category: "creative",
    gradient: "from-fuchsia-600/30 to-pink-600/30",
    accentColor: "text-fuchsia-400",
    borderHover: "hover:border-fuchsia-500/50",
    version: "v2.0.0",
    tags: ["image", "dictation", "voice", "inpaint"],
  },
  {
    id: "tax-info-bot",
    name: "Tax Info Bot",
    shortCode: "Tax",
    emoji: "🤖",
    route: "/tax-info-bot",
    description: "Autonomous freelance and creator tax calculator & expense categorizer",
    category: "utilities",
    gradient: "from-teal-600/30 to-cyan-600/30",
    accentColor: "text-teal-400",
    borderHover: "hover:border-teal-500/50",
    version: "v2.0.0",
    tags: ["tax", "finance", "freelance"],
  },
  {
    id: "alive-speech",
    name: "Alive Speech",
    shortCode: "ALv",
    emoji: "🗣️",
    route: "/alive-speech",
    description: "Ultra-realistic text-to-speech voice clone and interactive conversational avatar",
    category: "creative",
    gradient: "from-rose-600/30 to-red-600/30",
    accentColor: "text-rose-400",
    borderHover: "hover:border-rose-500/50",
    version: "v2.0.0",
    tags: ["tts", "voice", "speech", "elevenlabs"],
  },
  {
    id: "master",
    name: "Master Dashboard",
    shortCode: "Mst",
    emoji: "👑",
    route: "/master",
    description: "Central command dashboard for suite telemetry, projects, and active tasks",
    category: "utilities",
    gradient: "from-amber-600/30 to-yellow-600/30",
    accentColor: "text-amber-400",
    borderHover: "hover:border-amber-500/50",
    version: "v2.0.0",
    tags: ["dashboard", "admin", "telemetry"],
  },
];

export const SuiteLauncher: React.FC<{ onOpenSettings?: () => void }> = ({ onOpenSettings }) => {
  const navigate = useNavigate();
  const { importCryptArtFile } = useProject();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isDragging, setIsDragging] = useState(false);

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      try {
        await importCryptArtFile(file);
        navigate("/web/mediamogul");
      } catch (err: any) {
        alert(`Failed to open project: ${err.message}`);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importCryptArtFile(file);
        navigate("/web/mediamogul");
      } catch (err: any) {
        alert(`Failed to open project: ${err.message}`);
      }
    }
  };

  const filteredPrograms = SUITE_PROGRAMS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleFileDrop}
      className="flex flex-col h-screen w-screen bg-studio-bg text-studio-text overflow-y-auto"
    >
      {/* Top Banner / Header */}
      <header className="px-8 py-6 border-b border-studio-border bg-studio-panel/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">💀🎨</span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-studio-cyan via-white to-studio-purple bg-clip-text text-transparent">
              CryptArtist Studio v2
            </h1>
            <p className="text-xs text-studio-secondary">
              The open browser-native creative suite • Powered by community donations to{" "}
              <a
                href="https://mattyjacks.com"
                target="_blank"
                rel="noreferrer"
                className="text-studio-cyan hover:underline font-semibold"
              >
                mattyjacks.com
              </a>{" "}
              and{" "}
              <a
                href="https://givegigs.com"
                target="_blank"
                rel="noreferrer"
                className="text-studio-purple hover:underline font-semibold"
              >
                givegigs.com
              </a>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".cryptart,application/json"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-studio-surface hover:bg-studio-elevated border border-studio-border hover:border-studio-cyan/40 text-studio-text transition flex items-center gap-2"
          >
            <span>📂</span> Open .cryptart File
          </button>

          <button
            onClick={onOpenSettings}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-cyan transition flex items-center gap-2"
          >
            <span>⚙️</span> Settings & Vault
          </button>
        </div>
      </header>

      {/* Main Suite Showcase */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Drop zone highlight if dragging */}
        {isDragging && (
          <div className="p-8 border-2 border-dashed border-studio-cyan bg-studio-cyan/10 rounded-2xl text-center text-studio-cyan font-bold text-sm animate-pulse">
            Drop .cryptart project file to launch!
          </div>
        )}

        {/* Flagship Media Mogul Featured Banner */}
        <div className="relative overflow-hidden rounded-3xl border border-studio-cyan/30 bg-gradient-to-r from-studio-panel via-studio-surface to-studio-panel p-8 shadow-elevated">
          <div className="relative z-10 max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-studio-cyan/20 border border-studio-cyan/40 text-studio-cyan text-xs font-bold">
              <span>🌟</span> Flagship Release
            </div>
            <h2 className="text-3xl font-black text-white tracking-tight">
              📺 Media Mogul v2
            </h2>
            <p className="text-sm text-studio-secondary leading-relaxed">
              Browser-native creative powerhouse inspired by DaVinci Resolve & CapCut. Featuring WebCodecs hardware rendering, 3-way color wheels, local computer folder mounting, Google Drive share-link imports, and OpenAI/OpenRouter auto-edit.
            </p>
            <div className="pt-2 flex items-center gap-3">
              <Link
                to="/web/mediamogul"
                className="px-6 py-2.5 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-sm rounded-xl shadow-glow-sm transition flex items-center gap-2"
              >
                <span>🚀 Launch Media Mogul</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-studio-surface/50 border border-studio-border rounded-xl">
            {["all", "creative", "development", "automation", "gaming", "utilities", "community"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition ${
                  selectedCategory === cat
                    ? "bg-studio-cyan text-black"
                    : "text-studio-secondary hover:text-studio-text"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="w-full md:w-72">
            <input
              type="text"
              placeholder="Search suite programs & tools..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-studio-surface border border-studio-border rounded-xl px-3.5 py-2 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
            />
          </div>
        </div>

        {/* Programs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrograms.map((prog) => (
            <Link
              key={prog.id}
              to={prog.route}
              className={`group p-5 rounded-2xl border border-studio-border ${prog.borderHover} bg-studio-panel/70 hover:bg-studio-surface/90 transition shadow-panel flex flex-col justify-between relative overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${prog.gradient} rounded-bl-full -mr-6 -mt-6 pointer-events-none opacity-40 group-hover:opacity-70 transition`} />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl p-2 rounded-xl bg-studio-bg border border-studio-border">
                    {prog.emoji}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-studio-surface text-studio-secondary border border-studio-border">
                    [{prog.shortCode}]
                  </span>
                </div>
                <h3 className={`text-base font-bold text-white group-hover:${prog.accentColor} transition flex items-center gap-2`}>
                  {prog.name}
                </h3>
                <p className="text-xs text-studio-secondary mt-1.5 leading-relaxed">
                  {prog.description}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs mt-2 border-t border-studio-border/40">
                <span className="text-[10px] font-mono text-studio-muted capitalize">
                  {prog.category}
                </span>
                <span className={`${prog.accentColor} font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition`}>
                  Launch →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Donation Banner Footer */}
      <footer className="p-4 border-t border-studio-border bg-studio-panel/80 text-center text-xs text-studio-muted flex items-center justify-center gap-2">
        <span>CryptArtist Studio is 100% free and community-funded. Support ongoing development at</span>
        <a
          href="https://mattyjacks.com"
          target="_blank"
          rel="noreferrer"
          className="text-studio-cyan font-bold hover:underline"
        >
          mattyjacks.com
        </a>
        <span>&</span>
        <a
          href="https://givegigs.com"
          target="_blank"
          rel="noreferrer"
          className="text-studio-purple font-bold hover:underline"
        >
          givegigs.com
        </a>
      </footer>
    </div>
  );
};

export default SuiteLauncher;
