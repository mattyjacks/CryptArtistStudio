import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { toast } from "../../utils/toast";
import MediaBrowser from "../../components/MediaBrowser";
import Timeline from "../../components/Timeline";
import PreviewCanvas from "../../components/PreviewCanvas";
import Inspector from "../../components/Inspector";
import NodeEditor from "../../components/NodeEditor";
import AIStudio from "../../components/AIStudio";
import SettingsModal from "../../components/SettingsModal";
import FFmpegSetup from "../../components/FFmpegSetup";
import type { ChatMessage } from "../../App";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";

export type MogulWorkspace = "edit" | "node-mode" | "color" | "audio" | "ai" | "deliver" | "podcast";

const workspaces: { id: MogulWorkspace; label: string; icon: string }[] = [
  { id: "edit", label: "Edit", icon: "\u2702\uFE0F" },
  { id: "node-mode", label: "Node Mode", icon: "\u{1F517}" },
  { id: "color", label: "Color", icon: "\u{1F3A8}" },
  { id: "audio", label: "Audio", icon: "\u{1F3B5}" },
  { id: "ai", label: "AI Studio", icon: "\u{1F916}" },
  { id: "podcast", label: "Podcast", icon: "\u{1F399}\uFE0F" },
  { id: "deliver", label: "Deliver", icon: "\u{1F4E6}" },
];

export default function MediaMogul() {
  const navigate = useNavigate();
  const [workspace, setWorkspace] = useState<MogulWorkspace>("edit");
  const [showSettings, setShowSettings] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [pexelsApiKey, setPexelsApiKey] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(42);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm **Media Mogul AI** \u{1F4FA} - your creative partner. I can help you with:\n\n" +
        "- **Generate images** - describe what you want and I'll create it\n" +
        "- **Color grading** - suggest palettes and LUT styles\n" +
        "- **Scene analysis** - break down composition and mood\n" +
        "- **VFX advice** - recommend effects and techniques\n\n" +
        "Try asking me to generate an image, or ask anything about video editing!",
      timestamp: Date.now(),
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    invoke<string>("get_api_key")
      .then((key) => {
        if (key) setApiKey(key);
      })
      .catch((err) => console.error("Failed to load API key:", err));

    invoke<string>("get_pexels_key")
      .then((key) => {
        if (key) setPexelsApiKey(key);
      })
      .catch((err) => console.error("Failed to load Pexels key:", err));
  }, []);

  // ---------------------------------------------------------------------------
  // .CryptArt save/open
  // ---------------------------------------------------------------------------

  const handleSaveProject = async () => {
    try {
      const projectData = {
        workspace,
        currentFrame,
        chatMessages: chatMessages.slice(-50),
      };
      const cryptArt = createCryptArtFile("media-mogul", "Media Mogul Project", projectData);
      const json = serializeCryptArt(cryptArt);
      const savePath = await saveDialog({
        defaultPath: "project.CryptArt",
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
      });
      if (savePath) {
        await invoke("write_text_file", { path: savePath, contents: json });
        toast.success("Project saved successfully");
      }
    } catch (err) {
      console.error("Save project failed:", err);
      toast.error("Failed to save project");
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
        if (project.program !== "media-mogul") {
          console.warn("This .CryptArt file is for", project.program);
          return;
        }
        const data = project.data as any;
        if (data.workspace) setWorkspace(data.workspace);
        if (data.currentFrame !== undefined) setCurrentFrame(data.currentFrame);
        if (data.chatMessages) setChatMessages(data.chatMessages);
        toast.success("Project loaded successfully");
      }
    } catch (err) {
      console.error("Open project failed:", err);
      toast.error("Failed to open project");
    }
  };

  if (!ffmpegReady) {
    return <FFmpegSetup onComplete={() => setFfmpegReady(true)} />;
  }

  const renderWorkspaceContent = () => {
    switch (workspace) {
      case "ai":
        return (
          <AIStudio
            apiKey={apiKey}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            aiLoading={aiLoading}
            setAiLoading={setAiLoading}
            onOpenSettings={() => setShowSettings(true)}
          />
        );
      case "node-mode":
        return <NodeEditor />;
      case "podcast":
        return <PodcastStudio apiKey={apiKey} />;
      default:
        return (
          <div className="flex flex-col h-full">
            <div className="flex flex-1 min-h-0">
              <div className="w-[260px] min-w-[200px] flex flex-col">
                <MediaBrowser pexelsApiKey={pexelsApiKey} />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <PreviewCanvas
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  currentFrame={currentFrame}
                  setCurrentFrame={setCurrentFrame}
                />
              </div>
              <div className="w-[260px] min-w-[200px] flex flex-col">
                <Inspector />
              </div>
            </div>
            <div className="h-[240px] min-h-[160px]">
              <Timeline
                currentFrame={currentFrame}
                setCurrentFrame={setCurrentFrame}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none">
        {/* Back + Logo */}
        <div className="flex items-center gap-2 px-4 min-w-[220px]">
          <button
            onClick={() => navigate("/")}
            className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors"
            title="Back to Suite"
          >
            {"\u2190"} Suite
          </button>
          <div className="w-px h-5 bg-studio-border mx-1" />
          <span className="text-xl leading-none" role="img" aria-label="Media Mogul logo">
            {"\u{1F4FA}"}
          </span>
          <div className="flex flex-col">
            <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">
              Media Mogul
            </span>
            <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">
              MMo
            </span>
          </div>
        </div>

        {/* Workspace Tabs */}
        <nav className="flex items-center justify-center flex-1 gap-1">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => setWorkspace(ws.id)}
              className={`
                flex items-center gap-[6px] px-4 py-[6px] rounded-md text-[11px] font-semibold
                tracking-wide uppercase transition-all duration-150
                ${
                  workspace === ws.id
                    ? "bg-studio-elevated text-studio-text border border-studio-border-bright shadow-md"
                    : "text-studio-secondary hover:text-studio-text hover:bg-studio-surface border border-transparent"
                }
              `}
            >
              <span className="text-sm">{ws.icon}</span>
              {ws.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 px-4 min-w-[180px] justify-end">
          <button onClick={handleOpenProject} className="btn text-[10px] py-1 px-2">
            Open .CryptArt
          </button>
          <button onClick={handleSaveProject} className="btn text-[10px] py-1 px-2">
            Save .CryptArt
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors"
            title="Settings"
          >
            {"\u2699\uFE0F"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 min-h-0 p-1">{renderWorkspaceContent()}</main>

      {/* Status Bar */}
      <footer className="status-bar">
        <div className="flex items-center gap-3">
          <span>
            <span className="status-dot status-dot-green" />
            Ready
          </span>
          <span>|</span>
          <span>1920 x 1080</span>
          <span>|</span>
          <span>24.000 fps</span>
        </div>
        <div className="flex items-center gap-3">
          <span>
            {apiKey ? (
              <>
                <span className="status-dot status-dot-green" />
                OpenAI Connected
              </>
            ) : (
              <>
                <span className="status-dot status-dot-yellow" />
                No API Key
              </>
            )}
          </span>
          <span>|</span>
          <span>{"\u{1F4FA}"} Media Mogul v0.1.0</span>
        </div>
      </footer>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          apiKey={apiKey}
          setApiKey={setApiKey}
          pexelsApiKey={pexelsApiKey}
          setPexelsApiKey={setPexelsApiKey}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Podcast Studio (stub workspace)
// ---------------------------------------------------------------------------

function PodcastStudio({ apiKey }: { apiKey: string }) {
  const [scriptPrompt, setScriptPrompt] = useState("");

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="panel flex-1">
        <div className="panel-header">
          <h3>{"\u{1F399}\uFE0F"} Podcast & Music Studio</h3>
        </div>
        <div className="panel-body flex flex-col gap-4">
          {/* Script Generator */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-studio-secondary uppercase tracking-wide">
              AI Script Generator
            </label>
            <textarea
              className="input"
              placeholder="Describe your podcast topic or music concept..."
              value={scriptPrompt}
              onChange={(e) => setScriptPrompt(e.target.value)}
              rows={3}
            />
            <button
              className="btn btn-cyan self-start"
              disabled={!apiKey || !scriptPrompt.trim()}
            >
              {"\u{1F916}"} Generate Script
            </button>
          </div>

          {/* Two-Track Editor (stub) */}
          <div className="flex flex-col gap-2 mt-4">
            <label className="text-xs font-semibold text-studio-secondary uppercase tracking-wide">
              Audio Tracks
            </label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 p-3 bg-studio-surface rounded-lg border border-studio-border">
                <span className="text-studio-cyan text-sm font-mono">Track 1</span>
                <div className="flex-1 h-8 bg-studio-bg rounded flex items-center px-2">
                  <span className="text-[10px] text-studio-muted">Voiceover / TTS - Drop audio or generate with AI</span>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-studio-surface rounded-lg border border-studio-border">
                <span className="text-studio-green text-sm font-mono">Track 2</span>
                <div className="flex-1 h-8 bg-studio-bg rounded flex items-center px-2">
                  <span className="text-[10px] text-studio-muted">Background Music - Drop audio or generate with AI</span>
                </div>
              </div>
            </div>
          </div>

          {/* TTS Section */}
          <div className="flex flex-col gap-2 mt-4">
            <label className="text-xs font-semibold text-studio-secondary uppercase tracking-wide">
              Text-to-Speech (OpenAI TTS)
            </label>
            <textarea
              className="input"
              placeholder="Enter text for AI voiceover..."
              rows={2}
            />
            <div className="flex gap-2">
              <button className="btn" disabled={!apiKey}>
                {"\u{1F50A}"} Generate Voiceover
              </button>
              <button className="btn" disabled={!apiKey}>
                {"\u{1F3B5}"} Generate Music
              </button>
            </div>
          </div>

          {!apiKey && (
            <div className="p-3 bg-studio-surface rounded-lg border border-studio-yellow/20 text-xs text-studio-yellow">
              Set your OpenAI API key in Settings to use AI-powered podcast features.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
