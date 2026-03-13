import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";

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

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        // Recording ended - save the file
        handleSaveRecording();
      };

      // Stop recording if user clicks browser's native "Stop sharing" button
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        handleStop();
      });

      recorder.start(1000); // Collect data every second
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setPaused(false);
      setElapsed(0);
    } catch (err) {
      console.error("Screen capture failed:", err);
      toast.error("Screen capture failed or was cancelled");
      // User cancelled the screen picker - that's fine
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
    setRecording(false);
    setPaused(false);
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

  // ---------------------------------------------------------------------------
  // .CryptArt save/open
  // ---------------------------------------------------------------------------

  const handleSaveProject = async () => {
    try {
      const projectData = {
        resolution, fps, inputLoggerEnabled,
        streamTargets,
        recordings,
      };
      const cryptArt = createCryptArtFile("demo-recorder", "DemoRecorder Session", projectData);
      const json = serializeCryptArt(cryptArt);
      const savePath = await saveDialog({
        defaultPath: "recording-session.CryptArt",
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
      });
      if (savePath) {
        await invoke("write_text_file", { path: savePath, contents: json });
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
        if (project.program !== "demo-recorder") return;
        const data = project.data as any;
        if (data.resolution) setResolution(data.resolution);
        if (data.fps) setFps(data.fps);
        if (data.inputLoggerEnabled !== undefined) setInputLoggerEnabled(data.inputLoggerEnabled);
        if (data.streamTargets) setStreamTargets(data.streamTargets);
        if (data.recordings) setRecordings(data.recordings);
      }
    } catch (err) {
      console.error("Open project failed:", err);
      toast.error("Failed to open project");
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-4 gap-3">
        <button
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
        <button onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
          Open .CryptArt
        </button>
        <button onClick={handleSaveProject} className="btn text-[10px] py-1 px-3">
          Save .CryptArt
        </button>
      </header>

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

              {!recording && (
                <div className="text-center">
                  <div className="text-6xl mb-4 opacity-40">{"\u{1F4F9}"}</div>
                  <p className="text-studio-secondary">Click Start to begin recording</p>
                  <p className="text-studio-muted text-xs mt-1">
                    Uses getDisplayMedia for real screen capture
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

          {/* Recording Control Bar */}
          <div className="flex items-center justify-center gap-4 p-4 bg-studio-panel border-t border-studio-border">
            {/* Resolution + FPS */}
            <div className="flex items-center gap-2">
              <select
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
              <select
                value={fps}
                onChange={(e) => setFps(e.target.value)}
                className="input text-[11px] py-1 w-[80px]"
                disabled={recording}
              >
                <option value="60">60 fps</option>
                <option value="30">30 fps</option>
                <option value="24">24 fps</option>
              </select>
            </div>

            {/* Transport controls */}
            <div className="flex items-center gap-2">
              {!recording ? (
                <button onClick={handleStart} className="btn btn-accent px-6">
                  {"\u23FA"} Start Recording
                </button>
              ) : (
                <>
                  <button onClick={handlePause} className="btn px-4">
                    {paused ? "\u25B6" : "\u23F8"} {paused ? "Resume" : "Pause"}
                  </button>
                  <button onClick={handleStop} className="btn btn-accent px-4">
                    {"\u23F9"} Stop & Save
                  </button>
                </>
              )}
            </div>

            {/* Timer */}
            <div className="font-mono text-lg text-studio-cyan min-w-[100px] text-center">
              {formatTime(elapsed)}
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[280px] min-w-[240px] bg-studio-panel border-l border-studio-border flex flex-col overflow-y-auto">
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

      {/* Status Bar */}
      <footer className="status-bar">
        <span>{"\u{1F3A5}"} DemoRecorder v0.1.0</span>
        <div className="flex items-center gap-3">
          <span>{resolution} @ {fps}fps</span>
          <span>|</span>
          <span>{inputLoggerEnabled ? "Input Logger: ON" : "Input Logger: OFF"}</span>
          <span>|</span>
          <span>{streamTargets.filter((t) => t.enabled).length} stream(s)</span>
          <span>|</span>
          <span>{recordings.length} recording(s)</span>
        </div>
      </footer>

      {/* Input Logger Warning Modal */}
      {showLoggerWarning && (
        <div className="modal-overlay" onClick={() => setShowLoggerWarning(false)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
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
              <button onClick={() => setShowLoggerWarning(false)} className="btn">
                Cancel
              </button>
              <button onClick={confirmInputLogger} className="btn btn-accent">
                I Understand, Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
