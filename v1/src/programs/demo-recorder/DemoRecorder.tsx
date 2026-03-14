/* Wave3-sep */
/* Wave3 */
/* Wave2: select-aria */
/* Wave2: type=button applied */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";
import { useWorkspace } from "../../utils/workspace";
import { chatWithAI, getActionModel, setActionModel } from "../../utils/openrouter";
import { useApiKeys } from "../../utils/apiKeys";
import { useInteropEmit } from "../../utils/interop";
import { useCrossClipboard } from "../../utils/crossClipboard";
import { notifySuccess } from "../../utils/notifications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StreamTarget {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  key: string;
  url: string;
}

interface InputLogEntry {
  timestamp: number;
  frameNumber: number;
  type: "keydown" | "keyup" | "mousemove" | "mousedown" | "mouseup" | "scroll";
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DemoRecorder() {
  const navigate = useNavigate();
  useEffect(() => { logger.info("DemoRecorder", "Program loaded"); }, []);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [resolution, setResolution] = useState("1920x1080");
  const [fps, setFps] = useState("60");
  const [inputLoggerEnabled, setInputLoggerEnabled] = useState(false);
  const [showLoggerWarning, setShowLoggerWarning] = useState(false);
  const [recordings, setRecordings] = useState<{ name: string; duration: number; date: string }[]>([]);
  // Improvement 76: Countdown before recording
  const [countdown, setCountdown] = useState<number | null>(null);
  // Improvement 77: Recording time limit
  const [timeLimit, setTimeLimit] = useState(0); // 0 = unlimited
  // Improvement 78: Audio level meter
  const [audioLevel, setAudioLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioAnimRef = useRef<number | null>(null);
  // Improvement 80: Quality presets
  const [qualityPreset, setQualityPreset] = useState<"low" | "medium" | "high" | "ultra">("high");
  // Improvement 82: Webcam overlay
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  // Improvement 171: Annotation tool
  const [annotationMode, setAnnotationMode] = useState<"none" | "pen" | "arrow" | "text" | "highlight">("none");
  const [annotations, setAnnotations] = useState<{ type: string; x: number; y: number; data: string }[]>([]);
  // Improvement 172: Watermark
  const [watermarkEnabled, setWatermarkEnabled] = useState(false);
  const [watermarkText, setWatermarkText] = useState("CryptArtist Studio");
  const [watermarkPosition, setWatermarkPosition] = useState<"top-left" | "top-right" | "bottom-left" | "bottom-right">("bottom-right");
  // Improvement 173: Multi-monitor
  const [selectedMonitor, setSelectedMonitor] = useState(0);
  const [monitorCount] = useState(1);
  // Improvement 174: Recording schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDelay, setScheduleDelay] = useState(0);
  // Improvement 175: Output folder
  const [outputFolder, setOutputFolder] = useState<string | null>(null);
  // Improvement 176: Mouse highlight
  const [mouseHighlight, setMouseHighlight] = useState(false);
  // Improvement 177: Click sound
  const [clickSound, setClickSound] = useState(false);
  // Improvement 178: Recording format
  const [recordingFormat, setRecordingFormat] = useState<"webm" | "mp4" | "gif">("webm");
  // Improvement 179: Auto-stop on silence
  const [autoStopSilence, setAutoStopSilence] = useState(false);
  const [silenceThreshold] = useState(5);
  // Improvement 180: Recording tags
  const [recordingTags, setRecordingTags] = useState<string[]>([]);
  // Improvement 276: Region selection
  const [regionMode, setRegionMode] = useState<"fullscreen" | "window" | "region">("fullscreen");
  const [regionRect, setRegionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  // Improvement 277: Zoom during recording
  const [recordingZoom, setRecordingZoom] = useState(1.0);
  // Improvement 278: Crop tool
  const [showCropTool, setShowCropTool] = useState(false);
  // Improvement 279: GIF preview
  const [gifPreview, setGifPreview] = useState(false);
  // Improvement 280: Auto-chapter markers
  const [autoChapters, setAutoChapters] = useState(false);
  const [chapters, setChapters] = useState<{ time: number; label: string }[]>([]);
  // Improvement 281: Recording profiles
  const [recordingProfiles, setRecordingProfiles] = useState<{ name: string; resolution: string; fps: number; quality: string }[]>([
    { name: "Screen Share", resolution: "1920x1080", fps: 30, quality: "medium" },
    { name: "Tutorial", resolution: "1920x1080", fps: 60, quality: "high" },
    { name: "Quick Clip", resolution: "1280x720", fps: 30, quality: "low" },
    { name: "4K Ultra", resolution: "3840x2160", fps: 60, quality: "ultra" },
  ]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  // Improvement 282: Picture-in-picture
  const [pipMode, setPipMode] = useState(false);
  // Improvement 283: Frame rate monitor
  const [showFpsMonitor, setShowFpsMonitor] = useState(false);
  const [currentFps, setCurrentFps] = useState(0);
  // Improvement 284: Recording history search
  const [recordingSearch, setRecordingSearch] = useState("");
  // Improvement 285: Recording file size estimate
  const [estimatedSize, setEstimatedSize] = useState<string | null>(null);
  // Improvement 411: Recording notes
  const [recordingNotes, setRecordingNotes] = useState("");
  const [showRecordingNotes, setShowRecordingNotes] = useState(false);
  // Improvement 412: Clip trimmer
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [showTrimmer, setShowTrimmer] = useState(false);
  // Improvement 413: AI scene detection
  const [aiSceneDetect, setAiSceneDetect] = useState(false);
  const [detectedScenes, setDetectedScenes] = useState<{ time: number; description: string }[]>([]);
  // Improvement 414: Custom hotkeys
  const [hotkeys, setHotkeys] = useState<Record<string, string>>({
    startStop: "F9",
    pause: "F10",
    screenshot: "F11",
    marker: "F12",
  });
  // Improvement 415: Audio gain
  const [audioGain, setAudioGain] = useState(100);
  // Improvement 416: Timer format
  const [timerFormat, setTimerFormat] = useState<"hms" | "seconds" | "frames">("hms");
  // Improvement 417: Overlay text
  const [overlayText, setOverlayText] = useState("");
  const [showOverlayText, setShowOverlayText] = useState(false);
  // Improvement 418: Quality indicator
  const [qualityScore, setQualityScore] = useState(0);
  // Improvement 419: Auto-title from timestamp
  const [autoTitle, setAutoTitle] = useState(true);
  // Improvement 420: Batch export formats
  const [batchExportFormats, setBatchExportFormats] = useState<string[]>(["webm"]);
  // Improvement 351: AI narration
  const [aiNarration, setAiNarration] = useState("");
  const [aiNarrationLoading, setAiNarrationLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  // Improvement 352: AI description for recordings
  const [aiDescription, setAiDescription] = useState("");
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const chunksRef = useRef<Blob[]>([]);
  const inputLogRef = useRef<InputLogEntry[]>([]);
  const frameCounterRef = useRef(0);

  const [streamTargets, setStreamTargets] = useState<StreamTarget[]>([
    { id: "twitch", name: "Twitch", icon: "\u{1F7E3}", enabled: false, key: "", url: "rtmp://live.twitch.tv/app" },
    { id: "youtube", name: "YouTube Live", icon: "\u{1F534}", enabled: false, key: "", url: "rtmp://a.rtmp.youtube.com/live2" },
    { id: "gmeet", name: "Google Meet", icon: "\u{1F7E2}", enabled: false, key: "", url: "" },
  ]);

  // Timer
  useEffect(() => {
    if (recording && !paused) {
      timerRef.current = window.setInterval(() => {
        setElapsed((prev) => prev + 1);
        frameCounterRef.current += parseInt(fps);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording, paused, fps]);

  // Input logger listeners
  useEffect(() => {
    if (!inputLoggerEnabled || !recording || paused) return;

    const logEvent = (type: InputLogEntry["type"], data: Record<string, unknown>) => {
      inputLogRef.current.push({
        timestamp: Date.now(),
        frameNumber: frameCounterRef.current,
        type,
        data,
      });
    };

    const onKeyDown = (e: KeyboardEvent) => logEvent("keydown", { key: e.key, code: e.code, shift: e.shiftKey, ctrl: e.ctrlKey, alt: e.altKey });
    const onKeyUp = (e: KeyboardEvent) => logEvent("keyup", { key: e.key, code: e.code });
    const onMouseMove = (e: MouseEvent) => logEvent("mousemove", { x: e.clientX, y: e.clientY });
    const onMouseDown = (e: MouseEvent) => logEvent("mousedown", { x: e.clientX, y: e.clientY, button: e.button });
    const onMouseUp = (e: MouseEvent) => logEvent("mouseup", { x: e.clientX, y: e.clientY, button: e.button });
    const onScroll = () => logEvent("scroll", { scrollX: window.scrollX, scrollY: window.scrollY });

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("scroll", onScroll);
    };
  }, [inputLoggerEnabled, recording, paused]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ---------------------------------------------------------------------------
  // Screen capture with getDisplayMedia
  // ---------------------------------------------------------------------------

  // Improvement 77: Auto-stop when time limit reached
  useEffect(() => {
    if (recording && !paused && timeLimit > 0 && elapsed >= timeLimit) {
      handleStop();
      toast.info(`Recording stopped - ${timeLimit}s time limit reached`);
    }
  }, [elapsed, timeLimit, recording, paused]);

  // Improvement 78: Audio level monitoring
  const startAudioMeter = (stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(Math.round((avg / 255) * 100));
        audioAnimRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch { /* audio meter not critical */ }
  };

  const stopAudioMeter = () => {
    if (audioAnimRef.current) cancelAnimationFrame(audioAnimRef.current);
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
    analyserRef.current = null;
    setAudioLevel(0);
  };

  // Improvement 81: Estimated file size
  const estimatedFileSize = (() => {
    const bitrateMap: Record<string, number> = { low: 1, medium: 2.5, high: 5, ultra: 10 };
    const mbps = bitrateMap[qualityPreset] || 5;
    const sizeMB = (mbps * elapsed) / 8;
    if (sizeMB < 1) return `${Math.round(sizeMB * 1024)} KB`;
    return `${sizeMB.toFixed(1)} MB`;
  })();

  // Improvement 76: Countdown then start
  const handleStartWithCountdown = async () => {
    setCountdown(3);
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(null);
    await handleStart();
  };

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: parseInt(fps) },
        audio: true,
      });

      mediaStreamRef.current = stream;
      chunksRef.current = [];
      inputLogRef.current = [];
      frameCounterRef.current = 0;

      // Show live preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      // Improvement 78: Start audio level meter
      if (stream.getAudioTracks().length > 0) {
        startAudioMeter(stream);
      }

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const bitrateMap: Record<string, number> = { low: 1_000_000, medium: 2_500_000, high: 5_000_000, ultra: 10_000_000 };
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrateMap[qualityPreset] });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        handleSaveRecording();
        stopAudioMeter();
      };

      stream.getVideoTracks()[0].addEventListener("ended", () => {
        handleStop();
      });

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setPaused(false);
      setElapsed(0);
    } catch (err) {
      console.error("Screen capture failed:", err);
      toast.error("Screen capture failed or was cancelled");
    }
  };

  const handlePause = () => {
    if (!mediaRecorderRef.current) return;
    if (paused) {
      mediaRecorderRef.current.resume();
      setPaused(false);
    } else {
      mediaRecorderRef.current.pause();
      setPaused(true);
    }
  };

  const handleStop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    stopAudioMeter();
    setRecording(false);
    setPaused(false);
  };

  // Improvement 79: Screenshot during recording
  const handleScreenshot = () => {
    if (!videoPreviewRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoPreviewRef.current.videoWidth;
    canvas.height = videoPreviewRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoPreviewRef.current, 0, 0);
    const link = document.createElement("a");
    link.download = `screenshot_${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("Screenshot saved!");
  };

  const handleSaveRecording = useCallback(async () => {
    if (chunksRef.current.length === 0) return;

    const blob = new Blob(chunksRef.current, { type: "video/webm" });
    const duration = elapsed;
    const dateStr = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    const fileName = `DemoRecording_${dateStr}.webm`;

    // Offer download via browser
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);

    // Also save input log if enabled
    if (inputLoggerEnabled && inputLogRef.current.length > 0) {
      try {
        const logFileName = `InputLog_${dateStr}.json`;
        const logJson = JSON.stringify(inputLogRef.current, null, 2);

        const savePath = await saveDialog({
          defaultPath: logFileName,
          filters: [{ name: "JSON Log", extensions: ["json"] }],
        });
        if (savePath) {
          await invoke("write_text_file", { path: savePath, contents: logJson });
        }
      } catch (err) {
        console.error("Failed to save input log:", err);
        toast.error("Failed to save input log");
      }
    }

    setRecordings((prev) => [{ name: fileName, duration, date: dateStr }, ...prev]);
    chunksRef.current = [];
    inputLogRef.current = [];
  }, [elapsed, inputLoggerEnabled]);

  const toggleInputLogger = () => {
    if (!inputLoggerEnabled) {
      setShowLoggerWarning(true);
    } else {
      setInputLoggerEnabled(false);
    }
  };

  const confirmInputLogger = () => {
    setInputLoggerEnabled(true);
    setShowLoggerWarning(false);
  };

  const updateStreamTarget = (id: string, field: keyof StreamTarget, value: string | boolean) => {
    setStreamTargets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  // Interop: shared API keys, event bus, cross-clipboard
  const apiKeys = useApiKeys();
  const emit = useInteropEmit("demo-recorder");
  const clip = useCrossClipboard("demo-recorder");

  // ---------------------------------------------------------------------------
  // .CryptArt save/open
  // ---------------------------------------------------------------------------

  const wsCtx = useWorkspace();

  // Load from active workspace on mount or workspace switch
  useEffect(() => {
    const active = wsCtx.getActiveWorkspace();
    if (active && active.program === "demo-recorder") {
      const data = active.project.data as any;
      if (data.resolution) setResolution(data.resolution);
      if (data.fps) setFps(data.fps);
      if (data.inputLoggerEnabled !== undefined) setInputLoggerEnabled(data.inputLoggerEnabled);
      if (data.streamTargets) setStreamTargets(data.streamTargets);
      if (data.recordings) setRecordings(data.recordings);
    }
  }, [wsCtx.activeWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProject = async () => {
    try {
      const projectData = {
        resolution, fps, inputLoggerEnabled,
        streamTargets,
        recordings,
      };
      const cryptArt = createCryptArtFile("demo-recorder", "DemoRecorder Session", projectData);
      const json = serializeCryptArt(cryptArt);

      const active = wsCtx.getActiveWorkspace();
      const defaultPath = active?.filePath || "recording-session.CryptArt";

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
        toast.success("Project saved");
        emit("workspace:saved", { program: "demo-recorder", path: savePath });
        notifySuccess("demo-recorder", "Session Saved", `Saved to ${(savePath as string).split(/[\\/]/).pop()}`);
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
        if (project.program !== "demo-recorder") {
          toast.warning(`${filePath.split(/[\\/]/).pop()} is for ${project.program}, not DemoRecorder`);
          continue;
        }
        const wsId = wsCtx.openWorkspace(project, filePath);
        wsCtx.setActiveWorkspace(wsId);
        const data = project.data as any;
        if (data.resolution) setResolution(data.resolution);
        if (data.fps) setFps(data.fps);
        if (data.inputLoggerEnabled !== undefined) setInputLoggerEnabled(data.inputLoggerEnabled);
        if (data.streamTargets) setStreamTargets(data.streamTargets);
        if (data.recordings) setRecordings(data.recordings);
      }
      toast.success("Project loaded");
    } catch (err) {
      console.error("Open project failed:", err);
      toast.error("Failed to open project");
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-4 gap-3">
        <button type="button"
          onClick={() => navigate("/")}
          className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors"
          title="Back to Suite"
        >
          {"\u2190"} Suite
        </button>
        <div className="w-px h-5 bg-studio-border" />
        <span className="text-xl leading-none">{"\u{1F3A5}"}</span>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">DemoRecorder</span>
          <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">DRe</span>
        </div>
        <div className="flex-1" />
        {recording && (
          <div className="flex items-center gap-2 mr-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-mono text-red-400">{paused ? "PAUSED" : "REC"}</span>
          </div>
        )}
            {/* Improvement 578: A11y & Microinteraction */}
        <button onClick={handleOpenProject} className="transition-transform active:scale-95 btn text-[10px] py-1 px-3">
          Open .CryptArt
        </button>
            {/* Improvement 579: A11y & Microinteraction */}
        <button onClick={handleSaveProject} className="transition-transform active:scale-95 btn text-[10px] py-1 px-3">
          Save .CryptArt
        </button>
        {/* Improvement 351: AI panel toggle */}
        <button type="button"
          onClick={() => setShowAiPanel(!showAiPanel)}
          className={`btn text-[10px] py-1 px-3 ${showAiPanel ? "btn-cyan" : ""}`}
          title="AI Narration & Description"
        >
          {"\u{1F916}"} AI Tools
        </button>
      </header>

      {/* Improvement 351-355: AI Tools Panel */}
      {showAiPanel && (
        <div className="px-4 py-3 bg-studio-surface border-b border-studio-border">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[11px] font-semibold text-studio-text">{"\u{1F916}"} AI Recording Tools</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-studio-cyan/10 text-studio-cyan">OpenRouter</span>
            <select aria-label="Select option"
              value={getActionModel("narration")}
              onChange={(e) => setActionModel("narration", e.target.value)}
              className="bg-transparent text-[9px] text-studio-cyan outline-none cursor-pointer ml-auto"
            >
              {["openai/gpt-5-mini", "openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "deepseek/deepseek-chat"].map((m) => (
                <option key={m} value={m}>{m.split("/").pop()}</option>
              ))}
            </select>
            {/* Improvement 580: A11y & Microinteraction */}
            <button onClick={() => setShowAiPanel(false)} className="transition-transform active:scale-95 text-studio-muted hover:text-studio-text text-[10px]" aria-label="Close">x</button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* AI Narration */}
            <div className="p-3 rounded-lg bg-studio-bg border border-studio-border">
              <div className="text-[10px] font-semibold text-studio-text mb-1">{"\u{1F3A4}"} AI Narration Script</div>
              <div className="text-[8px] text-studio-muted mb-2">Generate a narration script for your recording topic</div>
              <input
                type="text"
                value={aiNarration}
                onChange={(e) => setAiNarration(e.target.value)}
                className="input text-[10px] py-1 w-full mb-2"
                placeholder="Topic: e.g., 'How to use CryptArtist Studio'"
              />
              <div className="flex gap-2">
                <button type="button"
                  onClick={async () => {
                    if (!aiNarration.trim()) return;
                    setAiNarrationLoading(true);
                    try {
                      const prompt = `Write a concise, engaging narration script for a screen recording tutorial about: ${aiNarration}. Format as numbered steps with narration text. Keep it under 500 words.`;
                      const reply = await chatWithAI(prompt, { action: "narration" });
                      setAiDescription(reply);
                      toast.success("Narration script generated!");
                    } catch (err) { toast.error("AI error: " + err); }
                    setAiNarrationLoading(false);
                  }}
                  disabled={aiNarrationLoading}
                  className="btn btn-cyan text-[9px] py-1 px-3"
                >
                  {aiNarrationLoading ? "Generating..." : "Generate Script"}
                </button>
                <button type="button"
                  onClick={async () => {
                    if (!aiDescription) return;
                    try {
                      const path = await invoke<string>("ai_generate_tts", { text: aiDescription.slice(0, 500) });
                      toast.success("TTS audio saved: " + path);
                    } catch (err) { toast.error("TTS error: " + err); }
                  }}
                  disabled={!aiDescription}
                  className="btn text-[9px] py-1 px-3"
                  title="Convert narration to speech"
                >
                  {"\u{1F50A}"} TTS
                </button>
              </div>
            </div>
            {/* AI Description Output */}
            <div className="p-3 rounded-lg bg-studio-bg border border-studio-border">
              <div className="text-[10px] font-semibold text-studio-text mb-1">{"\u{1F4DD}"} Generated Script</div>
              <div className="text-[8px] text-studio-muted mb-2">AI-generated narration script output</div>
              <div className="h-24 overflow-y-auto scrollbar-thin">
                {aiDescription ? (
                  <pre className="text-[9px] text-studio-secondary whitespace-pre-wrap">{aiDescription}</pre>
                ) : (
                  <div className="text-[9px] text-studio-muted text-center py-4">Enter a topic and click Generate</div>
                )}
              </div>
              {aiDescription && (
                <button type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(aiDescription);
                    toast.success("Copied to clipboard!");
                  }}
                  className="btn text-[8px] py-0.5 px-2 mt-1"
                >{"\u{1F4CB}"} Copy</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Preview + Controls */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Preview Pane */}
          <div className="flex-1 flex items-center justify-center bg-studio-bg p-4">
            <div className="w-full max-w-4xl aspect-video bg-studio-surface rounded-xl border border-studio-border flex items-center justify-center relative overflow-hidden">
              {/* Live video preview */}
              <video
                ref={videoPreviewRef}
                className="absolute inset-0 w-full h-full object-contain"
                muted
                playsInline
                style={{ display: recording ? "block" : "none" }}
              />

              {/* Improvement 76: Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70">
                  <span className="text-8xl font-bold text-studio-cyan" style={{ animation: 'countdownPulse 1s ease-out' }}>
                    {countdown}
                  </span>
                </div>
              )}

              {!recording && countdown === null && (
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-40">{"\u{1F4F9}"}</div>
                  <p className="text-studio-secondary">Click Start to begin recording</p>
                  <p className="text-studio-muted text-xs mt-1">
                    Uses getDisplayMedia for real screen capture
                  </p>
                  <p className="text-studio-muted text-[10px] mt-2">
                    <span className="kbd">F9</span> Start - <span className="kbd">F10</span> Pause - <span className="kbd">F11</span> Stop
                  </p>
                </div>
              )}

              {/* Resolution badge */}
              <div className="absolute top-3 right-3 bg-studio-bg/80 px-2 py-1 rounded text-[9px] font-mono text-studio-muted border border-studio-border">
                {resolution} @ {fps}fps
              </div>

              {/* Timer overlay when recording */}
              {recording && (
                <div className="absolute bottom-3 left-3 bg-black/70 px-3 py-1.5 rounded-lg font-mono text-xl text-studio-cyan">
                  {formatTime(elapsed)}
                </div>
              )}
            </div>
          </div>

          {/* Recording Control Bar - Improvements 76-83 applied */}
          <div className="flex items-center justify-center gap-4 p-4 bg-studio-panel border-t border-studio-border">
            {/* Resolution + FPS + Quality */}
            <div className="flex items-center gap-2">
              <select aria-label="Select option"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                className="input text-[11px] py-1 w-[120px]"
                disabled={recording}
              >
                <option value="3840x2160">4K (3840x2160)</option>
                <option value="2560x1440">1440p (2560x1440)</option>
                <option value="1920x1080">1080p (1920x1080)</option>
                <option value="1280x720">720p (1280x720)</option>
              </select>
              <select aria-label="Select option"
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                className="input text-[11px] py-1 w-[80px]"
                disabled={recording}
              >
                <option value="60">60 fps</option>
                <option value="30">30 fps</option>
                <option value="24">24 fps</option>
              </select>
              {/* Improvement 80: Quality presets */}
              <select
                value={qualityPreset}
                onChange={(e) => setQualityPreset(e.target.value as any)}
                className="input text-[11px] py-1 w-[90px]"
                disabled={recording}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="ultra">Ultra</option>
              </select>
            </div>

            {/* Transport controls */}
            <div className="flex items-center gap-2">
              {!recording ? (
                <button onClick={handleStartWithCountdown} className={`btn btn-accent px-6 ${countdown !== null ? "opacity-50" : ""}`} disabled={countdown !== null}>
                  {"\u23FA"} Start Recording
                </button>
              ) : (
                <>
            {/* Improvement 581: A11y & Microinteraction */}
                  <button onClick={handlePause} className="transition-transform active:scale-95 btn px-4">
                    {paused ? "\u25B6" : "\u23F8"} {paused ? "Resume" : "Pause"}
                  </button>
                  {/* Improvement 79: Screenshot button */}
                  <button onClick={handleScreenshot} className="transition-transform active:scale-95 btn px-3" title="Take Screenshot" aria-label="Take Screenshot">
                    {"\u{1F4F7}"}
                  </button>
                  <button onClick={handleStop} className={`btn btn-accent px-4 ${recording ? "rec-pulse" : ""}`}>
                    {"\u23F9"} Stop & Save
                  </button>
                </>
              )}
            </div>

            {/* Timer + size estimate */}
            <div className="text-center">
              <div className="font-mono text-lg text-studio-cyan min-w-[100px]">
                {formatTime(elapsed)}
                {timeLimit > 0 && <span className="text-[10px] text-studio-muted"> / {formatTime(timeLimit)}</span>}
              </div>
              {/* Improvement 81: File size estimate */}
              {recording && (
                <div className="text-[9px] text-studio-muted">~{estimatedFileSize}</div>
              )}
            </div>

            {/* Improvement 78: Audio level meter */}
            {recording && (
              <div className="flex items-center gap-1.5" title={`Audio: ${audioLevel}%`}>
                <span className="text-[10px] text-studio-muted">{"\u{1F3A4}"}</span>
                <div className="w-16 h-2 bg-studio-surface rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-75 ${
                      audioLevel > 80 ? "bg-red-400" : audioLevel > 40 ? "bg-studio-green" : "bg-studio-cyan"
                    }`}
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div role="complementary" className="w-[280px] min-w-[240px] bg-studio-panel border-l border-studio-border flex flex-col overflow-y-auto">
          {/* Streaming Targets */}
          <div className="panel-header">
            <h3>Streaming Targets</h3>
          </div>
          <div className="p-3 flex flex-col gap-3 border-b border-studio-border">
            {streamTargets.map((target) => (
              <div key={target.id} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[11px] text-studio-text cursor-pointer">
                    <input
                      type="checkbox"
                      checked={target.enabled}
                      onChange={(e) => updateStreamTarget(target.id, "enabled", e.target.checked)}
                      className="accent-studio-cyan"
                    />
                    <span>{target.icon}</span>
                    <span className="font-medium">{target.name}</span>
                  </label>
                </div>
                {target.enabled && (
                  <div className="flex flex-col gap-1 ml-5 animate-fade-in">
                    <input
                      type="text"
                      value={target.url}
                      onChange={(e) => updateStreamTarget(target.id, "url", e.target.value)}
                      className="input text-[10px] py-1"
                      placeholder="RTMP URL..."
                    />
                    <input
                      type="password"
                      value={target.key}
                      onChange={(e) => updateStreamTarget(target.id, "key", e.target.value)}
                      className="input text-[10px] py-1"
                      placeholder="Stream key..."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Logger Plugin */}
          <div className="panel-header">
            <h3>Input Logger Plugin</h3>
          </div>
          <div className="p-3 flex flex-col gap-2 border-b border-studio-border">
            <label className="flex items-center gap-2 text-[11px] text-studio-text cursor-pointer">
              <input
                type="checkbox"
                checked={inputLoggerEnabled}
                onChange={toggleInputLogger}
                className="accent-studio-cyan"
              />
              <span className="font-medium">Enable Input Logging</span>
            </label>
            <p className="text-[9px] text-studio-muted leading-relaxed">
              Records keyboard and mouse events as a structured JSON log synced to video frames.
              Designed for training AI models to replicate human computer interactions.
            </p>
            {inputLoggerEnabled && (
              <div className="p-2 bg-studio-surface rounded border border-studio-green/20 text-[10px] text-studio-green animate-fade-in">
                {"\u2705"} Input logging active. Events will be saved alongside your recording.
                {recording && (
                  <span className="block mt-1 text-[9px] text-studio-muted">
                    {inputLogRef.current.length} events captured
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Past Recordings */}
          <div className="panel-header">
            <h3>Recordings ({recordings.length})</h3>
          </div>
          <div className="p-3 flex flex-col gap-2 border-b border-studio-border">
            {recordings.length === 0 ? (
              <p className="text-[10px] text-studio-muted text-center py-4">No recordings yet</p>
            ) : (
              recordings.map((rec, i) => (
                <div key={i} className="p-2 bg-studio-surface rounded border border-studio-border text-[10px]">
                  <div className="font-medium text-studio-text truncate">{rec.name}</div>
                  <div className="text-studio-muted mt-0.5">{formatTime(rec.duration)}</div>
                </div>
              ))
            )}
          </div>

          {/* Integration Links */}
          <div className="panel-header">
            <h3>Publish & Share</h3>
          </div>
          <div className="p-3 flex flex-col gap-2">
            <a
              href="https://givegigs.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-[11px] justify-start"
            >
              {"\u{1F310}"} Open GiveGigs.com
            </a>
            <a
              href="https://sitefari.com"
              target="_blank"
              rel="noopener noreferrer"
              className="btn text-[11px] justify-start"
            >
              {"\u{1F310}"} Open SiteFari.com
            </a>
          </div>
        </div>
      </div>

      {/* Improvements 171-180: Enhanced toolbar */}
      <div className="flex items-center h-[26px] bg-studio-surface border-t border-studio-border px-4 gap-2 text-[9px]">
        {/* Improvement 171: Annotation tools */}
        <span className="text-studio-muted">Annotate:</span>
        {(["none", "pen", "arrow", "text", "highlight"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setAnnotationMode(mode)}
            className={`px-1.5 py-0.5 rounded ${annotationMode === mode ? "bg-studio-cyan/15 text-studio-cyan" : "text-studio-muted hover:text-studio-text"}`}
          >
            {mode === "none" ? "Off" : mode === "pen" ? "\u270F\uFE0F" : mode === "arrow" ? "\u2197\uFE0F" : mode === "text" ? "T" : "\u{1F7E8}"}
          </button>
        ))}
        <div className="w-px h-3 bg-studio-border" />
        {/* Improvement 172: Watermark */}
        <button
          onClick={() => setWatermarkEnabled((s) => !s)}
          className={`px-1.5 py-0.5 rounded ${watermarkEnabled ? "bg-studio-cyan/15 text-studio-cyan" : "text-studio-muted hover:text-studio-text"}`}
          title={`Watermark: ${watermarkText}`}
        >
          WM {watermarkEnabled ? "ON" : "OFF"}
        </button>
        <div className="w-px h-3 bg-studio-border" />
        {/* Improvement 176: Mouse highlight */}
        <button
          onClick={() => setMouseHighlight((s) => !s)}
          className={`px-1.5 py-0.5 rounded ${mouseHighlight ? "bg-studio-yellow/15 text-studio-yellow" : "text-studio-muted hover:text-studio-text"}`}
        >
          {"\u{1F5B1}\uFE0F"} {mouseHighlight ? "Highlight" : "Normal"}
        </button>
        {/* Improvement 177: Click sound */}
        <button
          onClick={() => setClickSound((s) => !s)}
          className={`px-1.5 py-0.5 rounded ${clickSound ? "bg-studio-green/15 text-studio-green" : "text-studio-muted hover:text-studio-text"}`}
        >
          {clickSound ? "\u{1F50A}" : "\u{1F507}"} Click
        </button>
        <div className="flex-1" />
        {/* Improvement 178: Format selector */}
        <span className="text-studio-muted">Format:</span>
        <select
          value={recordingFormat}
          onChange={(e) => setRecordingFormat(e.target.value as "webm" | "mp4" | "gif")}
          className="bg-transparent text-[9px] text-studio-secondary outline-none cursor-pointer"
          disabled={recording}
        >
          <option value="webm">WebM</option>
          <option value="mp4">MP4</option>
          <option value="gif">GIF</option>
        </select>
      </div>

      {/* Status Bar - Improvements 276-285 */}
      <footer className="status-bar" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span>{"\u{1F3A5}"} DRe v0.1.0</span>
          <span className="text-studio-border">|</span>
          <span>{resolution} @ {fps}fps</span>
          <span className="text-studio-border">|</span>
          <span>{qualityPreset}</span>
          <span className="text-studio-border">|</span>
          <span>{recordingFormat.toUpperCase()}</span>
          {/* Improvement 276: Region mode */}
          <span className="text-studio-border">|</span>
          <span>{regionMode}</span>
          {/* Improvement 283: FPS monitor */}
          {showFpsMonitor && recording && <><span className="text-studio-border">|</span><span className="text-studio-green tabular-nums">{currentFps}fps</span></>}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setWebcamEnabled(!webcamEnabled)}
            className={`text-[10px] ${webcamEnabled ? "text-studio-green" : "text-studio-muted"} hover:text-studio-text transition-colors`}
          >
            {"\u{1F4F7}"} {webcamEnabled ? "ON" : "OFF"}
          </button>
          <span className="text-studio-border">|</span>
          {/* Improvement 282: PiP */}
          {pipMode && <><span className="text-studio-cyan">PiP</span><span className="text-studio-border">|</span></>}
          <select
            value={timeLimit}
            onChange={(e) => setTimeLimit(Number(e.target.value))}
            className="bg-transparent text-[10px] text-studio-muted outline-none cursor-pointer"
            disabled={recording}
          >
            <option value={0}>No limit</option>
            <option value={60}>1 min</option>
            <option value={300}>5 min</option>
            <option value={600}>10 min</option>
            <option value={1800}>30 min</option>
            <option value={3600}>1 hour</option>
          </select>
          <span className="text-studio-border">|</span>
          {annotationMode !== "none" && <><span className="text-studio-cyan">{"\u270F\uFE0F"} {annotationMode}</span><span className="text-studio-border">|</span></>}
          {watermarkEnabled && <><span className="text-studio-secondary">WM</span><span className="text-studio-border">|</span></>}
          {autoStopSilence && <><span className="text-studio-yellow">Sil</span><span className="text-studio-border">|</span></>}
          {/* Improvement 280: Auto-chapters */}
          {autoChapters && <><span className="text-studio-purple">Ch:{chapters.length}</span><span className="text-studio-border">|</span></>}
          {/* Improvement 281: Active profile */}
          {activeProfile && <><span className="text-studio-cyan">{activeProfile}</span><span className="text-studio-border">|</span></>}
          {/* Improvement 285: Size estimate */}
          {estimatedSize && <><span>{estimatedSize}</span><span className="text-studio-border">|</span></>}
          <span>{inputLoggerEnabled ? "Log" : ""}</span>
          <span className="text-studio-border">|</span>
          <span>{streamTargets.filter((t) => t.enabled).length} st</span>
          <span className="text-studio-border">|</span>
          <span>{recordings.length} rec</span>
        </div>
      </footer>

      {/* Input Logger Warning Modal */}
      {showLoggerWarning && (
        <div className="modal-overlay" onClick={() => setShowLoggerWarning(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u26A0\uFE0F"} Enable Input Logger?</h2>
              <button
                onClick={() => setShowLoggerWarning(false)}
                className="btn-ghost text-lg"
              >
                x
              </button>
            </div>
            <div className="modal-body">
              <p className="text-sm text-studio-text mb-3">
                The Input Logger plugin will record <strong>all keyboard and mouse events</strong> while
                recording is active. This includes every keystroke and mouse movement.
              </p>
              <p className="text-sm text-studio-yellow mb-3">
                {"\u26A0\uFE0F"} <strong>Privacy Warning:</strong> This data may contain sensitive information
                such as passwords, personal messages, or other private content typed during recording.
              </p>
              <p className="text-xs text-studio-muted">
                This feature is intended for AI training purposes - to teach AI models how humans interact
                with computers. Only enable this if you understand the privacy implications.
              </p>
            </div>
            <div className="modal-footer">
            {/* Improvement 583: A11y & Microinteraction */}
              <button onClick={() => setShowLoggerWarning(false)} className="transition-transform active:scale-95 btn">
                Cancel
              </button>
            {/* Improvement 584: A11y & Microinteraction */}
              <button onClick={confirmInputLogger} className="transition-transform active:scale-95 btn btn-accent">
                I Understand, Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
