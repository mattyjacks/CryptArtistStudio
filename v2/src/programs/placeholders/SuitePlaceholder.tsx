import React from "react";
import { Link } from "react-router-dom";

export interface SuitePlaceholderProps {
  id: string;
  name: string;
  shortCode: string;
  emoji: string;
  description: string;
  accentColor: string;
  gradient: string;
}

export const SuitePlaceholder: React.FC<SuitePlaceholderProps> = ({
  name,
  shortCode,
  emoji,
  description,
  accentColor,
}) => {
  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg text-studio-text overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-studio-border bg-studio-panel px-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-2.5 py-1 text-xs rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-secondary hover:text-studio-cyan transition"
          >
            ← Back to Suite
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">{emoji}</span>
            <span className="font-bold text-sm text-white">
              {name} [{shortCode}]
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-cyan/20 text-studio-cyan font-bold">
              v2 Web Ready
            </span>
          </div>
        </div>
      </header>

      {/* Body Showcase */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto space-y-5">
        <div className="w-24 h-24 rounded-3xl bg-studio-surface border border-studio-border flex items-center justify-center text-5xl shadow-elevated">
          {emoji}
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">{name}</h2>
          <span className="text-xs font-mono text-studio-secondary uppercase tracking-widest block mt-1">
            Program Short Code: [{shortCode}]
          </span>
          <p className="text-sm text-studio-secondary mt-3 leading-relaxed">{description}</p>
        </div>

        <div className="p-4 rounded-xl bg-studio-surface border border-studio-border w-full text-left space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-studio-secondary">State Serialization:</span>
            <span className="font-mono text-studio-cyan">.cryptart Compatible</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-studio-secondary">Storage Driver:</span>
            <span className="font-mono text-studio-green">IndexedDB + OPFS</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-studio-secondary">Universal Bridge:</span>
            <span className="font-mono text-studio-purple">Web / Desktop Dual-Core</span>
          </div>
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Link
            to="/web/mediamogul"
            className={`px-6 py-2.5 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-xs rounded-xl transition shadow-glow-sm`}
          >
            Launch Flagship Media Mogul
          </Link>
          <Link
            to="/"
            className="px-5 py-2.5 bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-text font-semibold text-xs rounded-xl transition"
          >
            Suite Launcher
          </Link>
        </div>
      </main>
    </div>
  );
};

export default SuitePlaceholder;
