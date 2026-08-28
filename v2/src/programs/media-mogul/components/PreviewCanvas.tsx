import React, { useEffect, useRef, useState } from "react";
import { useProject } from "../../../core/context/ProjectContext";
import { useStudioCore } from "../../../core/context/StudioCoreContext";

export const PreviewCanvas: React.FC = () => {
  const { videoEngine, fs } = useStudioCore();
  const {
    tracks,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    projectSettings,
    setInPoint,
    setOutPoint,
  } = useProject();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "9:16" | "1:1" | "4:3">("16:9");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [audioLevels, setAudioLevels] = useState<{ left: number; right: number }>({ left: 0, right: 0 });

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current) {
      videoEngine.initialize(canvasRef.current);
    }
  }, [videoEngine]);

  // Re-render frame whenever currentFrame, tracks, or settings change
  useEffect(() => {
    if (canvasRef.current) {
      videoEngine.renderFrame(currentFrame, tracks, projectSettings);
    }
  }, [currentFrame, tracks, projectSettings, videoEngine]);

  // Playback animation loop & audio level metering
  useEffect(() => {
    if (!isPlaying) {
      setAudioLevels({ left: 0, right: 0 });
      return;
    }

    const interval = setInterval(() => {
      setCurrentFrame((prev) => {
        const next = prev + 1;
        return next > 480 ? 0 : next;
      });

      if ((videoEngine as any).getAudioLevels) {
        setAudioLevels((videoEngine as any).getAudioLevels());
      }
    }, 1000 / (projectSettings.fps || 30));

    return () => clearInterval(interval);
  }, [isPlaying, projectSettings.fps, setCurrentFrame, videoEngine]);

  const handleCaptureScreenshot = async () => {
    const blob = await videoEngine.captureFrameScreenshot();
    if (blob) {
      await fs.saveFileToDisk(`Still_Frame_${currentFrame}.png`, blob, "image/png");
      alert(`📸 Still frame ${currentFrame} saved to computer!`);
    }
  };

  const getAspectDimensions = () => {
    switch (aspectRatio) {
      case "9:16":
        return { width: 450, height: 800, label: "Vertical (TikTok/Reels/Shorts)" };
      case "1:1":
        return { width: 600, height: 600, label: "Square (Instagram)" };
      case "4:3":
        return { width: 800, height: 600, label: "Standard 4:3" };
      case "16:9":
      default:
        return { width: 960, height: 540, label: "16:9 Full HD" };
    }
  };

  const dims = getAspectDimensions();

  return (
    <div className="flex flex-col h-full bg-studio-panel border-b border-studio-border">
      {/* Viewport Top Bar */}
      <div className="h-9 border-b border-studio-border px-3 flex items-center justify-between bg-studio-surface/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-studio-text">🎬 Monitor Preview</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-cyan/20 text-studio-cyan font-bold">
            {projectSettings.fps} FPS
          </span>
          {projectSettings.inPoint !== undefined && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-studio-green/20 text-studio-green">
              IN: {projectSettings.inPoint}
            </span>
          )}
          {projectSettings.outPoint !== undefined && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-studio-red/20 text-studio-red">
              OUT: {projectSettings.outPoint}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Screenshot capture button */}
          <button
            onClick={handleCaptureScreenshot}
            className="px-2 py-0.5 rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-[11px] text-studio-secondary hover:text-studio-cyan transition flex items-center gap-1"
            title="Capture frame screenshot"
          >
            <span>📸</span> Still
          </button>

          {/* In / Out buttons */}
          <button
            onClick={() => setInPoint(currentFrame)}
            className="px-1.5 py-0.5 rounded bg-studio-surface text-[10px] font-mono text-studio-green hover:bg-studio-green/20"
            title="Set In Point (I)"
          >
            [ IN
          </button>
          <button
            onClick={() => setOutPoint(currentFrame)}
            className="px-1.5 py-0.5 rounded bg-studio-surface text-[10px] font-mono text-studio-red hover:bg-studio-red/20"
            title="Set Out Point (O)"
          >
            OUT ]
          </button>

          {/* Aspect Ratio Selector */}
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value as any)}
            className="bg-studio-bg border border-studio-border rounded px-2 py-0.5 text-xs text-studio-secondary focus:outline-none focus:border-studio-cyan"
          >
            <option value="16:9">16:9 (YouTube)</option>
            <option value="9:16">9:16 (TikTok / Reels)</option>
            <option value="1:1">1:1 (Square)</option>
            <option value="4:3">4:3 (Classic)</option>
          </select>

          {/* Zoom */}
          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
            className="bg-studio-bg border border-studio-border rounded px-2 py-0.5 text-xs text-studio-secondary focus:outline-none focus:border-studio-cyan"
          >
            <option value="50">Fit (50%)</option>
            <option value="75">75%</option>
            <option value="100">100%</option>
            <option value="150">150%</option>
          </select>
        </div>
      </div>

      {/* Canvas Viewport Area */}
      <div className="flex-1 bg-black flex items-center justify-center p-3 overflow-hidden relative">
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            maxWidth: "100%",
            maxHeight: "100%",
          }}
          className="relative transition-transform duration-100 shadow-2xl flex items-center justify-center"
        >
          <canvas
            ref={canvasRef}
            width={dims.width}
            height={dims.height}
            className="rounded border border-studio-border/60 bg-studio-bg shadow-panel"
            style={{
              aspectRatio: aspectRatio.replace(":", "/"),
              maxHeight: "420px",
              width: "auto",
            }}
          />

          {/* Overlay Safe Area Guides */}
          <div className="absolute inset-4 border border-dashed border-white/10 pointer-events-none rounded" />
        </div>

        {/* Live Audio Level VU Meter on Right edge */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-black/60 backdrop-blur-sm p-1.5 rounded-lg border border-studio-border/50">
          <div className="w-1.5 h-32 bg-studio-surface rounded-full overflow-hidden flex flex-col justify-end">
            <div
              style={{ height: `${(audioLevels.left || (isPlaying ? 0.65 : 0)) * 100}%` }}
              className="w-full bg-gradient-to-t from-studio-green via-studio-yellow to-studio-red rounded-full transition-all duration-75"
            />
          </div>
          <div className="w-1.5 h-32 bg-studio-surface rounded-full overflow-hidden flex flex-col justify-end">
            <div
              style={{ height: `${(audioLevels.right || (isPlaying ? 0.6 : 0)) * 100}%` }}
              className="w-full bg-gradient-to-t from-studio-green via-studio-yellow to-studio-red rounded-full transition-all duration-75"
            />
          </div>
        </div>
      </div>

      {/* Transport Controls Bar */}
      <div className="h-11 border-t border-studio-border px-4 flex items-center justify-between bg-studio-surface/50">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentFrame(0)}
            className="p-1.5 rounded hover:bg-studio-surface text-studio-secondary hover:text-studio-text transition"
            title="Jump to Start (Home)"
          >
            ⏮
          </button>
          <button
            onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
            className="p-1.5 rounded hover:bg-studio-surface text-studio-secondary hover:text-studio-text transition"
            title="Step Back 1 Frame (Left Arrow)"
          >
            ◀
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`px-4 py-1 rounded font-bold text-sm transition flex items-center gap-1 shadow-md ${
              isPlaying
                ? "bg-studio-red hover:bg-studio-red/80 text-white"
                : "bg-studio-cyan hover:bg-studio-cyan/80 text-black"
            }`}
            title="Play / Pause (Spacebar)"
          >
            <span>{isPlaying ? "⏸ Pause" : "▶ Play"}</span>
          </button>
          <button
            onClick={() => setCurrentFrame(currentFrame + 1)}
            className="p-1.5 rounded hover:bg-studio-surface text-studio-secondary hover:text-studio-text transition"
            title="Step Forward 1 Frame (Right Arrow)"
          >
            ▶
          </button>
          <button
            onClick={() => setCurrentFrame(360)}
            className="p-1.5 rounded hover:bg-studio-surface text-studio-secondary hover:text-studio-text transition"
            title="Jump to End (End)"
          >
            ⏭
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 text-xs">
          <span className="font-mono text-studio-secondary">
            Resolution: <strong className="text-studio-text">{dims.width} × {dims.height}</strong>
          </span>
          <div className="h-4 w-px bg-studio-border" />
          <span className="text-studio-muted">
            Engine: <strong className="text-studio-cyan">Canvas & Web Audio</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default PreviewCanvas;
