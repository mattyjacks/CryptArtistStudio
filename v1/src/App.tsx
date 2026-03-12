import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Header from "./components/Header";
import MediaBrowser from "./components/MediaBrowser";
import Timeline from "./components/Timeline";
import PreviewCanvas from "./components/PreviewCanvas";
import Inspector from "./components/Inspector";
import NodeEditor from "./components/NodeEditor";
import AIStudio from "./components/AIStudio";
import SettingsModal from "./components/SettingsModal";
import FFmpegSetup from "./components/FFmpegSetup";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Workspace = "edit" | "node-mode" | "color" | "audio" | "ai" | "deliver";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace>("edit");
  const [showSettings, setShowSettings] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(true); // true to skip setup screen in dev
  const [apiKey, setApiKey] = useState("");
  const [pexelsApiKey, setPexelsApiKey] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(42);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm **CryptArtist AI** 💀🎨 — your creative partner. I can help you with:\n\n" +
        "• **Generate images** — describe what you want and I'll create it\n" +
        "• **Color grading** — suggest palettes and LUT styles\n" +
        "• **Scene analysis** — break down composition and mood\n" +
        "• **VFX advice** — recommend effects and techniques\n\n" +
        "Try asking me to generate an image, or ask anything about video editing!",
      timestamp: Date.now(),
    },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  // -- Load state from Rust backend --
  useEffect(() => {
    invoke<string>("get_api_key")
      .then((key) => {
        if (key) setApiKey(key);
      })
      .catch((err) => console.error("Failed to load API key from Rust:", err));

    invoke<string>("get_pexels_key")
      .then((key) => {
        if (key) setPexelsApiKey(key);
      })
      .catch((err) => console.error("Failed to load Pexels key from Rust:", err));
  }, []);

  // -- FFmpeg setup bypass --
  if (!ffmpegReady) {
    return <FFmpegSetup onComplete={() => setFfmpegReady(true)} />;
  }

  // -- Render workspace content --
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
      default:
        return (
          <div className="flex flex-col h-full">
            {/* Top Section: Media Browser + Preview + Inspector */}
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
            {/* Bottom Section: Timeline */}
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
      <Header
        workspace={workspace}
        setWorkspace={setWorkspace}
        onOpenSettings={() => setShowSettings(true)}
      />

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
          <span>1920 × 1080</span>
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
          <span>GPU: wgpu</span>
          <span>|</span>
          <span>v0.1.0</span>
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
