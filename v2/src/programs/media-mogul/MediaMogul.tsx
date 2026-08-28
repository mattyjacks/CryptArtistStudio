import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useProject } from "../../core/context/ProjectContext";
import { MediaBrowser } from "./components/MediaBrowser";
import { Timeline } from "./components/Timeline";
import { PreviewCanvas } from "./components/PreviewCanvas";
import { Inspector } from "./components/Inspector";
import { ColorGrading } from "./components/ColorGrading";
import { AudioMixer } from "./components/AudioMixer";
import { AIAutoEdit } from "./components/AIAutoEdit";
import { ExportModal } from "./components/ExportModal";
import { SettingsModal } from "../../components/SettingsModal";

export type WorkspaceView = "edit" | "color" | "audio" | "aistudio";

export interface MediaMogulProps {
  onOpenSettings?: () => void;
}

export const MediaMogul: React.FC<MediaMogulProps> = ({ onOpenSettings }) => {
  const { project, saveProject, exportProjectAsCryptArt, isDirty, lastSavedAt, projectSettings } = useProject();

  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceView>("edit");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [projectNotes, setProjectNotes] = useState(
    "# Media Mogul Master Project\n- Scene 1: Hook and Intro with Cyber Title\n- Scene 2: High Energy City B-Roll\n- Scene 3: Demo Walkthrough\n- Scene 4: Call to Action"
  );
  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleSave = async () => {
    await saveProject();
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg text-studio-text overflow-hidden select-none">
      {/* Top Application Bar */}
      <header className="h-12 border-b border-studio-border bg-studio-panel/90 px-4 flex items-center justify-between flex-shrink-0 z-40">
        {/* Left: Suite Logo & Project Name */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs text-studio-secondary hover:text-studio-cyan transition py-1 px-2 rounded hover:bg-studio-surface"
            title="Back to Suite Launcher"
          >
            <span>←</span> Back to Suite
          </Link>

          <div className="h-4 w-px bg-studio-border" />

          <div className="flex items-center gap-2">
            <span className="text-base">📺</span>
            <span className="font-black text-sm tracking-wide bg-gradient-to-r from-studio-cyan via-white to-studio-pink bg-clip-text text-transparent">
              MEDIA MOGUL
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-cyan/10 text-studio-cyan font-bold border border-studio-cyan/30">
              v2.0 PRO
            </span>
          </div>

          <div className="h-4 w-px bg-studio-border" />

          <span className="text-xs text-studio-secondary font-medium truncate max-w-xs" title={projectSettings.name}>
            {projectSettings.name}
          </span>
        </div>

        {/* Center: DaVinci Workspace Selectors */}
        <div className="flex items-center gap-1 p-1 bg-studio-surface/80 rounded-xl border border-studio-border text-xs">
          <button
            onClick={() => setActiveWorkspace("edit")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              activeWorkspace === "edit"
                ? "bg-studio-cyan text-black shadow-glow-sm"
                : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            <span>✂️</span> Edit
          </button>
          <button
            onClick={() => setActiveWorkspace("color")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              activeWorkspace === "color"
                ? "bg-studio-purple text-white shadow-glow-purple"
                : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            <span>🎨</span> Color
          </button>
          <button
            onClick={() => setActiveWorkspace("audio")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              activeWorkspace === "audio"
                ? "bg-studio-green text-black shadow-glow-green"
                : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            <span>🎙️</span> Audio
          </button>
          <button
            onClick={() => setActiveWorkspace("aistudio")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              activeWorkspace === "aistudio"
                ? "bg-studio-pink text-white shadow-sm"
                : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            <span>🤖</span> AI Studio
          </button>
        </div>

        {/* Right: Notes, Settings, Save & Export */}
        <div className="flex items-center gap-2">
          {/* Script Notes Drawer Toggle */}
          <button
            onClick={() => setIsNotesOpen(!isNotesOpen)}
            className={`p-1.5 rounded-lg border text-xs transition ${
              isNotesOpen ? "bg-studio-yellow/20 border-studio-yellow text-studio-yellow" : "bg-studio-surface border-studio-border text-studio-secondary hover:text-studio-text"
            }`}
            title="Project Script & Teleprompter Notes"
          >
            📝 Notes
          </button>

          <button
            onClick={() => setIsSettingsModalOpen(true)}
            className="p-1.5 rounded-lg bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-secondary hover:text-studio-text text-xs transition"
            title="Settings & AI Key Vault"
          >
            ⚙️ Keys & Vault
          </button>

          <button
            onClick={handleSave}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 ${
              isDirty
                ? "bg-studio-surface hover:bg-studio-elevated border-studio-cyan/50 text-studio-cyan"
                : "bg-studio-surface border-studio-border text-studio-secondary hover:text-studio-text"
            }`}
            title="Save Project (Ctrl+S)"
          >
            <span>💾</span> Save {isDirty ? "*" : ""}
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-1.5 rounded-lg bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-xs transition shadow-glow-sm flex items-center gap-1.5"
          >
            <span>🚀</span> Export Video
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Workspace: EDIT */}
        {activeWorkspace === "edit" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Top Split: Media Browser (Left), Preview Canvas (Center), Inspector (Right) */}
            <div className="h-[55%] flex border-b border-studio-border overflow-hidden">
              <div className="w-80 flex-shrink-0 h-full overflow-hidden">
                <MediaBrowser />
              </div>
              <div className="flex-1 h-full overflow-hidden">
                <PreviewCanvas />
              </div>
              <div className="w-80 flex-shrink-0 h-full overflow-hidden">
                <Inspector />
              </div>
            </div>

            {/* Bottom Split: DaVinci Multi-Track Timeline */}
            <div className="flex-1 h-[45%] overflow-hidden">
              <Timeline />
            </div>
          </div>
        )}

        {/* Workspace: COLOR */}
        {activeWorkspace === "color" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-1/2 flex border-b border-studio-border overflow-hidden">
              <div className="w-80 flex-shrink-0 h-full overflow-hidden">
                <MediaBrowser />
              </div>
              <div className="flex-1 h-full overflow-hidden">
                <PreviewCanvas />
              </div>
            </div>
            <div className="flex-1 h-1/2 overflow-hidden">
              <ColorGrading />
            </div>
          </div>
        )}

        {/* Workspace: AUDIO */}
        {activeWorkspace === "audio" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="h-1/2 flex border-b border-studio-border overflow-hidden">
              <div className="flex-1 h-full overflow-hidden">
                <PreviewCanvas />
              </div>
            </div>
            <div className="flex-1 h-1/2 overflow-hidden">
              <AudioMixer />
            </div>
          </div>
        )}

        {/* Workspace: AI STUDIO */}
        {activeWorkspace === "aistudio" && (
          <div className="flex-1 h-full overflow-hidden">
            <AIAutoEdit />
          </div>
        )}

        {/* Script & Teleprompter Slide-Out Drawer */}
        {isNotesOpen && (
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-studio-panel border-l border-studio-border shadow-elevated z-30 flex flex-col p-4">
            <div className="flex items-center justify-between pb-3 border-b border-studio-border mb-3">
              <h3 className="text-xs font-bold text-studio-text flex items-center gap-1.5">
                <span>📝</span> Project Script & Teleprompter
              </h3>
              <button
                onClick={() => setIsNotesOpen(false)}
                className="text-studio-muted hover:text-studio-text text-xs"
              >
                ✕
              </button>
            </div>
            <textarea
              value={projectNotes}
              onChange={(e) => setProjectNotes(e.target.value)}
              className="flex-1 bg-studio-bg border border-studio-border rounded-lg p-3 text-xs text-studio-text font-mono leading-relaxed focus:outline-none focus:border-studio-yellow resize-none"
              placeholder="Type script notes or voiceover teleprompter lines here..."
            />
          </div>
        )}
      </main>

      {/* Save Notification Toast */}
      {showSaveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-studio-cyan text-black px-4 py-2 rounded-xl font-bold text-xs shadow-glow-sm flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span>✅</span> Project Autosaved to Local Storage!
        </div>
      )}

      {/* Export Deliver Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Settings & AI Vault Modal */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default MediaMogul;
