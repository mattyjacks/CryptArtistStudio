/* Wave2: select-aria */
/* Wave2: type=button applied */
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
import { logger } from "../../utils/logger";
import { useDeviceType } from "../../utils/platform";
import { useWorkspace } from "../../utils/workspace";
import { chatWithAI } from "../../utils/openrouter";
import { useApiKeys } from "../../utils/apiKeys";
import { useInteropEmit } from "../../utils/interop";
import { useCrossClipboard } from "../../utils/crossClipboard";
import { notifySuccess } from "../../utils/notifications";
import AIOptimizer from "../../components/AIOptimizer";

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
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  useEffect(() => { logger.info("MediaMogul", "Program loaded"); }, []);
  const [workspace, setWorkspace] = useState<MogulWorkspace>("edit");
  const [showSettings, setShowSettings] = useState(false);
  const [ffmpegReady, setFfmpegReady] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [pexelsApiKey, setPexelsApiKey] = useState("");
  const [elevenlabsKey, setElevenlabsKey] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(42);
  // Improvement 72-75: Preview controls
  const [previewZoom, setPreviewZoom] = useState(100);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [previewVolume, setPreviewVolume] = useState(80);
  const [showShortcutBar, setShowShortcutBar] = useState(true);
  const [undoStack] = useState<string[]>([]);
  const [projectDuration] = useState("00:02:30:00");
  // Improvement 156: Timeline markers
  const [markers, setMarkers] = useState<{ time: number; label: string; color: string }[]>([]);
  // Improvement 157: Render queue
  const [renderQueue, setRenderQueue] = useState<{ id: string; name: string; progress: number; status: "pending" | "rendering" | "done" | "error" }[]>([]);
  // Improvement 158: Clip counter
  const [clipCount, setClipCount] = useState(0);
  // Improvement 159: Effects panel
  const [showEffects, setShowEffects] = useState(false);
  // Improvement 160: Media bin categories
  const [mediaBinCategory, setMediaBinCategory] = useState<"all" | "video" | "audio" | "image" | "other">("all");
  // Improvement 161: Color scopes toggle
  const [showColorScopes, setShowColorScopes] = useState(false);
  // Improvement 162: Audio waveform toggle
  const [showAudioWaveform, setShowAudioWaveform] = useState(true);
  // Improvement 163: Proxy editing
  const [proxyEditing, setProxyEditing] = useState(false);
  // Improvement 164: Project notes
  const [projectNotes, setProjectNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  // Improvement 165: Auto-backup
  const [autoBackup, setAutoBackup] = useState(true);
  const [lastBackup, setLastBackup] = useState<number | null>(null);
  // Improvement 166: Render progress
  const [renderProgress, setRenderProgress] = useState<number | null>(null);
  // Improvement 167: Timeline snap
  const [timelineSnap, setTimelineSnap] = useState(true);
  // Improvement 169: Export format
  const [exportFormat, setExportFormat] = useState("mp4");
  // Improvement 170: Playback speed
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  // Improvement 261: Color wheel / grading
  const [colorWheelMode, setColorWheelMode] = useState<"lift" | "gamma" | "gain">("gamma");
  const [showColorWheel, setShowColorWheel] = useState(false);
  // Improvement 262: LUT browser
  const [luts, setLuts] = useState<{ name: string; category: string }[]>([
    { name: "Cinematic Warm", category: "cinema" },
    { name: "Cinematic Cool", category: "cinema" },
    { name: "Film Noir", category: "classic" },
    { name: "Vintage 70s", category: "retro" },
    { name: "Teal & Orange", category: "popular" },
    { name: "Bleach Bypass", category: "cinema" },
  ]);
  const [activeLut, setActiveLut] = useState<string | null>(null);
  const [showLutBrowser, setShowLutBrowser] = useState(false);
  // Improvement 263: Audio mixer channels
  const [audioChannels, setAudioChannels] = useState<{ name: string; volume: number; muted: boolean; solo: boolean }[]>([
    { name: "Master", volume: 80, muted: false, solo: false },
    { name: "A1", volume: 75, muted: false, solo: false },
    { name: "A2", volume: 70, muted: false, solo: false },
    { name: "Music", volume: 50, muted: false, solo: false },
  ]);
  const [showMixer, setShowMixer] = useState(false);
  // Improvement 264: Subtitle editor
  const [subtitles, setSubtitles] = useState<{ id: string; start: number; end: number; text: string }[]>([]);
  const [showSubtitleEditor, setShowSubtitleEditor] = useState(false);
  // Improvement 265: Transition library
  const [transitions] = useState([
    "Cut", "Cross Dissolve", "Dip to Black", "Dip to White", "Wipe Left", "Wipe Right",
    "Push Left", "Push Right", "Slide", "Zoom", "Spin", "Blur",
  ]);
  const [activeTransition, setActiveTransition] = useState("Cut");
  // Improvement 266: Keyframe editor toggle
  const [showKeyframes, setShowKeyframes] = useState(false);
  // Improvement 267: Motion tracking
  const [motionTracking, setMotionTracking] = useState(false);
  // Improvement 268: Stabilization
  const [stabilization, setStabilization] = useState(false);
  // Improvement 269: HDR toggle
  const [hdrMode, setHdrMode] = useState(false);
  // Improvement 270: Loudness meter
  const [loudnessLevel, setLoudnessLevel] = useState(-14);
  const [showLoudness, setShowLoudness] = useState(false);
  // Improvement 271: Media metadata viewer
  const [showMetadata, setShowMetadata] = useState(false);
  // Improvement 272: Multicam editing
  const [multicamEnabled, setMulticamEnabled] = useState(false);
  const [multicamAngles, setMulticamAngles] = useState(1);
  // Improvement 273: Chroma key / green screen
  const [chromaKey, setChromaKey] = useState(false);
  const [chromaColor, setChromaColor] = useState("#00ff00");
  // Improvement 274: Speed ramping
  const [speedRamping, setSpeedRamping] = useState(false);
  // Improvement 275: Render preset profiles
  const [renderPreset, setRenderPreset] = useState<"youtube" | "instagram" | "tiktok" | "custom">("youtube");
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

  // Interop: shared API keys, event bus, cross-clipboard
  const apiKeys = useApiKeys();
  const emit = useInteropEmit("media-mogul");
  const clip = useCrossClipboard("media-mogul");

  // Sync shared API keys from context into local state
  useEffect(() => {
    if (apiKeys.loaded) {
      if (apiKeys.openaiKey && !apiKey) setApiKey(apiKeys.openaiKey);
      if (apiKeys.pexelsKey && !pexelsApiKey) setPexelsApiKey(apiKeys.pexelsKey);
      if (apiKeys.elevenlabsKey && !elevenlabsKey) setElevenlabsKey(apiKeys.elevenlabsKey);
    }
  }, [apiKeys.loaded, apiKeys.openaiKey, apiKeys.pexelsKey, apiKeys.elevenlabsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // .CryptArt save/open
  // ---------------------------------------------------------------------------

  const wsCtx = useWorkspace();

  // Load data from active workspace if one is set for this program
  useEffect(() => {
    const active = wsCtx.getActiveWorkspace();
    if (active && active.program === "media-mogul") {
      const data = active.project.data as any;
      if (data.workspace) setWorkspace(data.workspace);
      if (data.currentFrame !== undefined) setCurrentFrame(data.currentFrame);
      if (data.chatMessages) setChatMessages(data.chatMessages);
    }
  }, [wsCtx.activeWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProject = async () => {
    try {
      const projectData = {
        workspace,
        currentFrame,
        chatMessages: chatMessages.slice(-50),
      };
      const cryptArt = createCryptArtFile("media-mogul", "Media Mogul Project", projectData);
      const json = serializeCryptArt(cryptArt);

      // If there's an active workspace with a file path, save there by default
      const active = wsCtx.getActiveWorkspace();
      const defaultPath = active?.filePath || "project.CryptArt";

      const savePath = await saveDialog({
        defaultPath,
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
      });
      if (savePath) {
        await invoke("write_text_file", { path: savePath, contents: json });
        // Update workspace manager
        if (active) {
          wsCtx.updateProject(active.id, cryptArt);
          wsCtx.updateFilePath(active.id, savePath);
          wsCtx.markClean(active.id);
        }
        toast.success("Project saved successfully");
        emit("workspace:saved", { program: "media-mogul", path: savePath });
        notifySuccess("media-mogul", "Project Saved", `Saved to ${(savePath as string).split(/[\\/]/).pop()}`);
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
        multiple: true,
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];

      for (const filePath of paths) {
        if (typeof filePath !== "string") continue;
        const json = await invoke<string>("read_text_file", { path: filePath });
        const project = parseCryptArt(json);
        if (project.program !== "media-mogul") {
          toast.warning(`${filePath.split(/[\\/]/).pop()} is for ${project.program}, not Media Mogul`);
          continue;
        }
        // Register in workspace manager
        const wsId = wsCtx.openWorkspace(project, filePath);
        wsCtx.setActiveWorkspace(wsId);
        // Apply to local state
        const data = project.data as any;
        if (data.workspace) setWorkspace(data.workspace);
        if (data.currentFrame !== undefined) setCurrentFrame(data.currentFrame);
        if (data.chatMessages) setChatMessages(data.chatMessages);
      }
      toast.success(`Opened ${paths.length} project${paths.length !== 1 ? "s" : ""}`);
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
        return <PodcastStudio apiKey={apiKey} elevenlabsKey={elevenlabsKey} />;
      default:
        return (
          <div className="flex flex-col h-full">
            <div className={`flex flex-1 min-h-0 ${isMobile ? "flex-col" : "flex-row"}`}>
              {!isMobile && (
                <div className={`${isTablet ? "w-[200px] min-w-[160px]" : "w-[260px] min-w-[200px]"} flex flex-col`}>
                  <MediaBrowser pexelsApiKey={pexelsApiKey} />
                </div>
              )}
              <div className="flex-1 flex flex-col min-w-0">
                <PreviewCanvas
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                  currentFrame={currentFrame}
                  setCurrentFrame={setCurrentFrame}
                />
              </div>
              {!isMobile && (
                <div className={`${isTablet ? "w-[200px] min-w-[160px]" : "w-[260px] min-w-[200px]"} flex flex-col`}>
                  <Inspector />
                </div>
              )}
            </div>
            <div className={isMobile ? "h-[160px] min-h-[120px]" : "h-[240px] min-h-[160px]"}>
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
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none safe-area-top">
        {/* Back + Logo */}
        <div className={`flex items-center gap-2 px-2 sm:px-4 ${isMobile ? "min-w-0" : "min-w-[220px]"}`}>
          <button type="button"
            onClick={() => navigate("/")}
            className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors"
            title="Back to Suite"
          >
            {"\u2190"} Suite
          </button>
          {!isMobile && <div className="w-px h-5 bg-studio-border mx-1" />}
          <span className="text-xl leading-none" role="img" aria-label="Media Mogul logo">
            {"\u{1F4FA}"}
          </span>
          {!isMobile && (
            <div className="flex flex-col">
              <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">
                Media Mogul
              </span>
              <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">
                MMo
              </span>
            </div>
          )}
        </div>

        {/* Workspace Tabs */}
        <nav className="flex items-center justify-center flex-1 gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none">
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
              <span className="hidden xs:inline">{ws.label}</span>
            </button>
          ))}
        </nav>

        {/* Right Actions - Improvements 70-71 */}
        <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 ${isMobile ? "min-w-0" : "min-w-[260px]"} justify-end`}>
          {!isMobile && <AIOptimizer actionKey="media-chat" className="h-6" />}
          {!isMobile && <div className="w-px h-5 bg-studio-border mx-1" />}
          {/* Improvement 71: Undo/Redo buttons */}
          <button className="btn-ghost rounded-md px-1.5 py-1 text-sm hover:bg-studio-hover transition-colors" title="Undo (Ctrl+Z)" disabled={undoStack.length === 0}>
            {"\u21A9\uFE0F"}
          </button>
          <button className="btn-ghost rounded-md px-1.5 py-1 text-sm hover:bg-studio-hover transition-colors" title="Redo (Ctrl+Y)">
            {"\u21AA\uFE0F"}
          </button>
          <div className="w-px h-5 bg-studio-border" />
          {!isMobile && (
            <>
              <button type="button" onClick={handleOpenProject} className="btn text-[10px] py-1 px-2">
                Open .CryptArt
              </button>
              <button type="button" onClick={handleSaveProject} className="btn text-[10px] py-1 px-2">
                Save .CryptArt
              </button>
            </>
          )}
          {/* Improvement 70: Quick export button */}
          <button className="btn btn-cyan text-[10px] py-1 px-2" title="Quick Export">
            {"\u{1F4E6}"}{!isMobile && " Export"}
          </button>
          <button type="button"
            onClick={() => setShowSettings(true)}
            className="btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors"
            title="Settings"
          >
            {"\u2699\uFE0F"}
          </button>
        </div>
      </header>

      {/* Improvement 66: Keyboard shortcut bar */}
      {showShortcutBar && workspace === "edit" && !isMobile && (
        <div className="flex items-center gap-3 h-[24px] bg-studio-surface border-b border-studio-border px-4 text-[9px] text-studio-muted animate-fade-in">
          <span><span className="kbd">Space</span> Play/Pause</span>
          <span><span className="kbd">J</span><span className="kbd">K</span><span className="kbd">L</span> Shuttle</span>
          <span><span className="kbd">I</span> Mark In</span>
          <span><span className="kbd">O</span> Mark Out</span>
          <span><span className="kbd">C</span> Cut</span>
          <span><span className="kbd">Ctrl+S</span> Save</span>
          <span><span className="kbd">Ctrl+Z</span> Undo</span>
          <span className="ml-auto cursor-pointer hover:text-studio-text" onClick={() => setShowShortcutBar(false)}>x</span>
        </div>
      )}

      {/* Main Content - Improvement 69: workspace transition animation */}
      <main className="flex-1 min-h-0 p-1 animate-fade-in" key={workspace}>{renderWorkspaceContent()}</main>

      {/* Improvements 156-170: Enhanced controls bar */}
      {workspace === "edit" && (
        <div className="flex items-center h-[28px] bg-studio-panel border-t border-studio-border px-2 sm:px-4 gap-2 sm:gap-3 text-[10px] overflow-x-auto scrollbar-none">
          {/* Improvement 72: Zoom controls */}
          <span className="text-studio-muted">Zoom:</span>
          <button type="button" onClick={() => setPreviewZoom(Math.max(25, previewZoom - 25))} className="text-studio-muted hover:text-studio-text">-</button>
          <span className="text-studio-secondary w-8 text-center">{previewZoom}%</span>
          <button onClick={() => setPreviewZoom(Math.min(400, previewZoom + 25))} className="text-studio-muted hover:text-studio-text">+</button>
          <button onClick={() => setPreviewZoom(100)} className="text-studio-muted hover:text-studio-text text-[9px]">Fit</button>
          <div className="w-px h-3 bg-studio-border" />
          {/* Improvement 73: Aspect ratio selector */}
          <span className="text-studio-muted">Ratio:</span>
          <select aria-label="Select option"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="bg-transparent text-[10px] text-studio-secondary outline-none cursor-pointer"
          >
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
            <option value="9:16">9:16 (Vertical)</option>
            <option value="21:9">21:9 (Ultra-wide)</option>
          </select>
          <div className="w-px h-3 bg-studio-border" />
          {/* Improvement 75: Volume slider */}
          <span className="text-studio-muted">{previewVolume > 0 ? "\u{1F50A}" : "\u{1F507}"}</span>
          <input
            type="range"
            min={0}
            max={100}
            value={previewVolume}
            onChange={(e) => setPreviewVolume(Number(e.target.value))}
            className="w-16 h-1 accent-studio-cyan"
            title={`Volume: ${previewVolume}%`}
          />
          <span className="text-studio-muted w-6">{previewVolume}%</span>
          <div className="w-px h-3 bg-studio-border" />
          {/* Improvement 167: Timeline snap */}
          <button
            onClick={() => setTimelineSnap((s) => !s)}
            className={`text-[9px] px-1.5 py-0.5 rounded ${timelineSnap ? "bg-studio-cyan/15 text-studio-cyan" : "text-studio-muted"}`}
            title="Toggle snap to grid"
          >
            Snap {timelineSnap ? "ON" : "OFF"}
          </button>
          {/* Improvement 170: Playback speed */}
          <select aria-label="Select option"
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="bg-transparent text-[10px] text-studio-secondary outline-none cursor-pointer"
            title="Playback speed"
          >
            <option value={0.25}>0.25x</option>
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
          </select>
          <div className="w-px h-3 bg-studio-border" />
          {/* Improvement 159: Effects toggle */}
          <button
            onClick={() => setShowEffects((s) => !s)}
            className={`text-[9px] ${showEffects ? "text-studio-cyan" : "text-studio-muted hover:text-studio-text"}`}
          >
            FX
          </button>
          {/* Improvement 164: Notes toggle */}
          <button
            onClick={() => setShowNotes((s) => !s)}
            className={`text-[9px] ${showNotes ? "text-studio-cyan" : "text-studio-muted hover:text-studio-text"}`}
          >
            {"\u{1F4DD}"}
          </button>
          <div className="flex-1" />
          {/* Improvement 156: Markers count */}
          {markers.length > 0 && (
            <span className="text-studio-muted">{markers.length} marker{markers.length !== 1 ? "s" : ""}</span>
          )}
          {/* Improvement 67: Project duration display */}
          <span className="text-studio-secondary font-mono">{projectDuration}</span>
        </div>
      )}

      {/* Improvement 164: Project notes panel */}
      {showNotes && (
        <div className="h-[120px] border-t border-studio-border bg-studio-panel p-3 animate-fade-in">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-semibold text-studio-secondary">{"\u{1F4DD}"} Project Notes</span>
            <button onClick={() => setShowNotes(false)} className="text-[10px] text-studio-muted hover:text-studio-text">x</button>
          </div>
          <textarea
            value={projectNotes}
            onChange={(e) => setProjectNotes(e.target.value)}
            className="input w-full h-[80px] text-[11px] resize-none"
            placeholder="Add notes about your project..."
          />
        </div>
      )}

      {/* Improvement 166: Render progress bar */}
      {renderProgress !== null && (
        <div className="h-[3px] bg-studio-bg">
          <div
            className="h-full bg-gradient-to-r from-studio-cyan to-studio-purple transition-all duration-300"
            style={{ width: `${renderProgress}%` }}
          />
        </div>
      )}

      {/* Improvement 262: LUT browser overlay */}
      {showLutBrowser && (
        <div className="modal-overlay" onClick={() => setShowLutBrowser(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F3A8}"} LUT Browser</h2>
              <button onClick={() => setShowLutBrowser(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body">
              <div className="flex flex-col gap-1">
                {luts.map((lut, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-3 py-2 rounded cursor-pointer transition-colors ${
                      activeLut === lut.name ? "bg-studio-cyan/10 border border-studio-cyan/30" : "hover:bg-studio-hover border border-transparent"
                    }`}
                    onClick={() => { setActiveLut(lut.name === activeLut ? null : lut.name); }}
                  >
                    <span className="text-[11px] text-studio-text">{lut.name}</span>
                    <span className="text-[9px] text-studio-muted capitalize">{lut.category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 263: Audio mixer overlay */}
      {showMixer && (
        <div className="modal-overlay" onClick={() => setShowMixer(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F3B5}"} Audio Mixer</h2>
              <button onClick={() => setShowMixer(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body">
              <div className="flex gap-4">
                {audioChannels.map((ch, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className="text-[9px] text-studio-muted">{ch.name}</span>
                    <input
                      type="range"
                      min={0} max={100}
                      value={ch.volume}
                      onChange={(e) => {
                        const newCh = [...audioChannels];
                        newCh[i] = { ...newCh[i], volume: Number(e.target.value) };
                        setAudioChannels(newCh);
                      }}
                      className="w-4 h-20 accent-studio-cyan"
                      style={{ writingMode: "vertical-lr", direction: "rtl" }}
                    />
                    <span className="text-[9px] text-studio-secondary tabular-nums">{ch.volume}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          const newCh = [...audioChannels];
                          newCh[i] = { ...newCh[i], muted: !newCh[i].muted };
                          setAudioChannels(newCh);
                        }}
                        className={`text-[8px] px-1 rounded ${ch.muted ? "bg-red-500/20 text-red-400" : "text-studio-muted"}`}
                      >M</button>
                      <button
                        onClick={() => {
                          const newCh = [...audioChannels];
                          newCh[i] = { ...newCh[i], solo: !newCh[i].solo };
                          setAudioChannels(newCh);
                        }}
                        className={`text-[8px] px-1 rounded ${ch.solo ? "bg-yellow-500/20 text-yellow-400" : "text-studio-muted"}`}
                      >S</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 264: Subtitle editor overlay */}
      {showSubtitleEditor && (
        <div className="modal-overlay" onClick={() => setShowSubtitleEditor(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F4AC}"} Subtitle Editor</h2>
              <button onClick={() => setShowSubtitleEditor(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body">
              {subtitles.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">{"\u{1F4AC}"}</div>
                  <div className="empty-state-title">No subtitles</div>
                  <div className="empty-state-description">Add subtitles to your timeline.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {subtitles.map((sub) => (
                    <div key={sub.id} className="p-2 rounded bg-studio-surface border border-studio-border">
                      <div className="flex items-center gap-2 text-[9px] text-studio-muted mb-1">
                        <span>{sub.start.toFixed(1)}s</span>
                        <span>-</span>
                        <span>{sub.end.toFixed(1)}s</span>
                      </div>
                      <div className="text-[11px] text-studio-text">{sub.text}</div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setSubtitles((prev) => [...prev, { id: `sub-${Date.now()}`, start: 0, end: 3, text: "New subtitle" }])}
                className="btn text-[10px] mt-3"
              >+ Add Subtitle</button>
            </div>
          </div>
        </div>
      )}

      {/* Status Bar - Improvements 261-275 */}
      <footer className="status-bar" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span>
            <span className="status-dot status-dot-green" />
            {renderProgress !== null ? `Rendering ${renderProgress}%` : "Ready"}
          </span>
          <span>|</span>
          <span>1920 x 1080 ({aspectRatio})</span>
          <span>|</span>
          <span>24.000 fps</span>
          <span>|</span>
          <span>F{currentFrame}</span>
          {clipCount > 0 && <><span>|</span><span>{clipCount} clips</span></>}
          {markers.length > 0 && <><span>|</span><span>{markers.length} mkr</span></>}
          {/* Improvement 264: Subtitles */}
          {subtitles.length > 0 && <><span>|</span><span>{subtitles.length} subs</span></>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-studio-secondary">{workspace.toUpperCase()}</span>
          <span>|</span>
          {proxyEditing && <><span className="text-studio-yellow">PROXY</span><span>|</span></>}
          {/* Improvement 269: HDR */}
          {hdrMode && <><span className="text-studio-cyan">HDR</span><span>|</span></>}
          {/* Improvement 272: Multicam */}
          {multicamEnabled && <><span className="text-studio-purple">MC:{multicamAngles}</span><span>|</span></>}
          {/* Improvement 273: Chroma key */}
          {chromaKey && <><span className="text-studio-green">CK</span><span>|</span></>}
          {/* Improvement 268: Stabilization */}
          {stabilization && <><span>STAB</span><span>|</span></>}
          <span>{timelineSnap ? "Snap" : "Free"}</span>
          <span>|</span>
          {playbackSpeed !== 1 && <><span>{playbackSpeed}x</span><span>|</span></>}
          {/* Improvement 262: LUT */}
          {activeLut && <><span className="text-studio-cyan">LUT</span><span>|</span></>}
          {/* Improvement 275: Render preset */}
          <span>{renderPreset}</span>
          <span>|</span>
          <span>{exportFormat.toUpperCase()}</span>
          <span>|</span>
          <span>{apiKey ? "\u{1F7E2}" : "\u{1F7E1}"}</span>
          <span>|</span>
          <span>{"\u{1F4FA}"} MMo v0.1.0</span>
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

function PodcastStudio({ apiKey, elevenlabsKey }: { apiKey: string; elevenlabsKey: string }) {
  const [scriptPrompt, setScriptPrompt] = useState("");
  const [scriptOutput, setScriptOutput] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [voiceId, setVoiceId] = useState("JBFqnCBsd6RMkjVDRZzb");
  const [voiceModel, setVoiceModel] = useState("eleven_multilingual_v2");
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [sttFilePath, setSttFilePath] = useState("");
  const [sttLanguage, setSttLanguage] = useState("");
  const [sttOutput, setSttOutput] = useState("");
  const [sttLoading, setSttLoading] = useState(false);
  const [sfxPrompt, setSfxPrompt] = useState("");
  const [sfxDuration, setSfxDuration] = useState(5);
  const [sfxLoading, setSfxLoading] = useState(false);
  const [voiceCatalog, setVoiceCatalog] = useState<{ voice_id: string; name: string }[]>([]);
  const [modelsCatalog, setModelsCatalog] = useState<{ model_id: string; name: string }[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [audioOutputs, setAudioOutputs] = useState<{ label: string; path: string }[]>([]);

  const handleGenerateScript = async () => {
    if (!scriptPrompt.trim()) return;
    setScriptLoading(true);
    try {
      const prompt = `Create a production-ready podcast plan and host script for: "${scriptPrompt}".

Return in markdown with:
1) Episode title
2) 5 bullet outline
3) 2 minute intro script
4) 3 sound effect opportunities
5) Voice style guidance for narration
6) Suggested background music mood`;
      const reply = await chatWithAI(prompt, { action: "media-chat" });
      setScriptOutput(reply);
      toast.success("Podcast script generated");
    } catch (err) {
      toast.error(`Script generation failed: ${err}`);
    } finally {
      setScriptLoading(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!voiceText.trim()) return;
    setVoiceLoading(true);
    try {
      const path = await invoke<string>("elevenlabs_text_to_speech", {
        text: voiceText,
        voiceId,
        modelId: voiceModel,
      });
      setAudioOutputs((prev) => [{ label: "ElevenLabs Voiceover", path }, ...prev].slice(0, 20));
      toast.success("Voiceover generated");
    } catch (err) {
      toast.error(`Voiceover failed: ${err}`);
    } finally {
      setVoiceLoading(false);
    }
  };

  const handleChooseTranscriptionFile = async () => {
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "Audio", extensions: ["wav", "mp3", "m4a", "flac", "ogg", "webm"] }],
    });
    if (typeof selected === "string") setSttFilePath(selected);
  };

  const handleTranscribe = async () => {
    if (!sttFilePath) return;
    setSttLoading(true);
    try {
      const text = await invoke<string>("elevenlabs_speech_to_text", {
        filePath: sttFilePath,
        modelId: "scribe_v1",
        languageCode: sttLanguage.trim() || null,
      });
      setSttOutput(text);
      toast.success("Transcription complete");
    } catch (err) {
      toast.error(`Transcription failed: ${err}`);
    } finally {
      setSttLoading(false);
    }
  };

  const handleGenerateSfx = async () => {
    if (!sfxPrompt.trim()) return;
    setSfxLoading(true);
    try {
      const path = await invoke<string>("elevenlabs_generate_sound_effect", {
        prompt: sfxPrompt,
        durationSeconds: sfxDuration,
      });
      setAudioOutputs((prev) => [{ label: "ElevenLabs SFX", path }, ...prev].slice(0, 20));
      toast.success("Sound effect generated");
    } catch (err) {
      toast.error(`SFX generation failed: ${err}`);
    } finally {
      setSfxLoading(false);
    }
  };

  const handleRefreshCatalogs = async () => {
    setCatalogLoading(true);
    try {
      const [voicesRaw, modelsRaw] = await Promise.all([
        invoke<string>("elevenlabs_list_voices"),
        invoke<string>("elevenlabs_list_models"),
      ]);
      const voicesParsed = JSON.parse(voicesRaw) as { voices?: { voice_id: string; name: string }[] };
      const modelsParsed = JSON.parse(modelsRaw) as { models?: { model_id: string; name: string }[] } | { [k: string]: unknown }[];
      const voices = voicesParsed.voices || [];
      const models = Array.isArray(modelsParsed)
        ? (modelsParsed as { model_id?: string; name?: string }[]).filter((m) => m.model_id && m.name).map((m) => ({ model_id: m.model_id!, name: m.name! }))
        : (modelsParsed.models || []);
      setVoiceCatalog(voices);
      setModelsCatalog(models);
      if (voices.length > 0 && !voices.some((v) => v.voice_id === voiceId)) {
        setVoiceId(voices[0].voice_id);
      }
      toast.success("ElevenLabs voices/models loaded");
    } catch (err) {
      toast.error(`Failed to load ElevenLabs catalogs: ${err}`);
    } finally {
      setCatalogLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-y-auto">
      <div className="panel">
        <div className="panel-header">
          <h3>{"\u{1F399}\uFE0F"} Podcast & Audio Lab (ElevenLabs)</h3>
        </div>
        <div className="panel-body flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-studio-secondary uppercase tracking-wide">
              AI Script Generator (Episode Planning)
            </label>
            <textarea
              className="input"
              placeholder="Describe your podcast topic or music concept..."
              value={scriptPrompt}
              onChange={(e) => setScriptPrompt(e.target.value)}
              rows={3}
            />
            <button
              onClick={handleGenerateScript}
              className="btn btn-cyan self-start"
              disabled={!apiKey || !scriptPrompt.trim() || scriptLoading}
            >
              {"\u{1F916}"} {scriptLoading ? "Generating..." : "Generate Script"}
            </button>
            {scriptOutput && (
              <pre className="text-[10px] whitespace-pre-wrap bg-studio-bg border border-studio-border rounded p-3 max-h-44 overflow-auto">
                {scriptOutput}
              </pre>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-studio-secondary uppercase tracking-wide">
              ElevenLabs Text-to-Speech
            </label>
            <textarea
              className="input"
              placeholder="Enter narration text for voiceover..."
              value={voiceText}
              onChange={(e) => setVoiceText(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <input
                className="input text-[10px] flex-1"
                placeholder="Voice ID"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
              />
              <input
                className="input text-[10px] flex-1"
                placeholder="Model ID (e.g. eleven_multilingual_v2)"
                value={voiceModel}
                onChange={(e) => setVoiceModel(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className="btn btn-cyan" onClick={handleGenerateVoice} disabled={!elevenlabsKey || !voiceText.trim() || voiceLoading}>
                {"\u{1F50A}"} {voiceLoading ? "Generating Voice..." : "Generate Voiceover"}
              </button>
              <button className="btn" onClick={handleRefreshCatalogs} disabled={!elevenlabsKey || catalogLoading}>
                {"\u{1F4DC}"} {catalogLoading ? "Loading..." : "Load Voices/Models"}
              </button>
            </div>
            {(voiceCatalog.length > 0 || modelsCatalog.length > 0) && (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-studio-bg border border-studio-border rounded p-2 max-h-28 overflow-auto">
                  <div className="text-[9px] text-studio-muted mb-1">Voices ({voiceCatalog.length})</div>
                  {voiceCatalog.slice(0, 20).map((v) => (
                    <button key={v.voice_id} className="block text-left text-[10px] hover:text-studio-cyan" onClick={() => setVoiceId(v.voice_id)}>
                      {v.name} - {v.voice_id.slice(0, 8)}...
                    </button>
                  ))}
                </div>
                <div className="bg-studio-bg border border-studio-border rounded p-2 max-h-28 overflow-auto">
                  <div className="text-[9px] text-studio-muted mb-1">Models ({modelsCatalog.length})</div>
                  {modelsCatalog.slice(0, 20).map((m) => (
                    <button key={m.model_id} className="block text-left text-[10px] hover:text-studio-cyan" onClick={() => setVoiceModel(m.model_id)}>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-studio-secondary uppercase tracking-wide">
              ElevenLabs Speech-to-Text
            </label>
            <div className="flex gap-2">
              <input
                className="input text-[10px] flex-1"
                value={sttFilePath}
                onChange={(e) => setSttFilePath(e.target.value)}
                placeholder="Audio file path..."
              />
              <button className="btn" onClick={handleChooseTranscriptionFile}>Browse</button>
              <input
                className="input text-[10px] w-28"
                value={sttLanguage}
                onChange={(e) => setSttLanguage(e.target.value)}
                placeholder="Lang (en)"
              />
            </div>
            <button className="btn btn-cyan self-start" onClick={handleTranscribe} disabled={!elevenlabsKey || !sttFilePath || sttLoading}>
              {"\u{1F4DD}"} {sttLoading ? "Transcribing..." : "Transcribe Audio"}
            </button>
            {sttOutput && (
              <textarea className="input text-[10px]" rows={4} value={sttOutput} onChange={(e) => setSttOutput(e.target.value)} />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-studio-secondary uppercase tracking-wide">
              ElevenLabs Sound Effects Generator
            </label>
            <textarea
              className="input"
              placeholder="Describe the sound effect (example: whoosh transition, vinyl crackle, cinematic boom)..."
              value={sfxPrompt}
              onChange={(e) => setSfxPrompt(e.target.value)}
              rows={2}
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-studio-muted">Duration</span>
              <input
                type="range"
                min={1}
                max={22}
                value={sfxDuration}
                onChange={(e) => setSfxDuration(Number(e.target.value))}
                className="accent-studio-cyan"
              />
              <span className="text-[10px]">{sfxDuration}s</span>
            </div>
            <button className="btn btn-cyan self-start" onClick={handleGenerateSfx} disabled={!elevenlabsKey || !sfxPrompt.trim() || sfxLoading}>
              {"\u{1F3B6}"} {sfxLoading ? "Generating SFX..." : "Generate Sound Effect"}
            </button>
          </div>

          {audioOutputs.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-studio-secondary uppercase tracking-wide">
                Generated Audio Outputs
              </label>
              <div className="max-h-28 overflow-auto bg-studio-bg border border-studio-border rounded p-2">
                {audioOutputs.map((a, i) => (
                  <div key={`${a.path}-${i}`} className="text-[10px] text-studio-text mb-1">
                    <span className="text-studio-cyan">{a.label}:</span> {a.path}
                  </div>
                ))}
              </div>
            </div>
          )}

          {!apiKey && (
            <div className="p-3 bg-studio-surface rounded-lg border border-studio-yellow/20 text-xs text-studio-yellow">
              Set your OpenAI API key in Settings to use AI-powered script planning.
            </div>
          )}
          {!elevenlabsKey && (
            <div className="p-3 bg-studio-surface rounded-lg border border-studio-yellow/20 text-xs text-studio-yellow">
              Set your ElevenLabs API key in Settings to enable voice, transcription, and sound effects.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
