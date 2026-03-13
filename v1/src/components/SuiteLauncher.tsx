import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useGlobalShortcuts } from "../utils/keyboard";
import { logger } from "../utils/logger";

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
  },
];

export default function SuiteLauncher() {
  const navigate = useNavigate();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  useGlobalShortcuts(navigate);

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
        <h1 className="text-3xl font-bold tracking-tight text-studio-text mb-1 animate-fade-in">
          CryptArtist Studio
        </h1>
        <p className="text-sm text-studio-secondary mb-10 animate-fade-in text-center max-w-lg">
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

        {/* Program Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 max-w-6xl w-full animate-slide-up">
          {programs.map((prog) => (
            <button
              key={prog.id}
              onClick={() => { logger.programLaunch(prog.id); navigate(`/${prog.id}`); }}
              className={`
                group relative flex flex-col items-center text-center p-8 rounded-xl
                bg-gradient-to-br ${prog.gradient}
                border border-studio-border ${prog.borderHover}
                transition-all duration-300 ease-out
                hover:translate-y-[-4px] hover:shadow-2xl hover:shadow-black/40
                focus:outline-none focus:ring-2 focus:ring-studio-cyan/40
              `}
            >
              <span className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                {prog.emoji}
              </span>
              <h2 className="text-base font-bold text-studio-text mb-1">
                {prog.name}
              </h2>
              <span className={`text-xs font-mono font-semibold ${prog.accentColor} mb-3`}>
                [{prog.code}]
              </span>
              <p className="text-xs text-studio-secondary leading-relaxed">
                {prog.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Donation Banner */}
      {!bannerDismissed && (
        <div className="flex items-center justify-center gap-3 px-4 py-2 bg-studio-panel border-t border-studio-border text-xs text-studio-secondary animate-fade-in">
          <span>
            CryptArtist Studio is free and community-funded. Support development at{" "}
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
            className="text-studio-muted hover:text-studio-text transition-colors ml-2 text-base leading-none"
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

      {/* Version Footer */}
      <footer className="status-bar">
        <span>{"\u{1F480}\u{1F3A8}"} CryptArtist Studio v0.1.0</span>
        <span className="text-studio-muted">New Hampshire, USA</span>
      </footer>
    </div>
  );
}
