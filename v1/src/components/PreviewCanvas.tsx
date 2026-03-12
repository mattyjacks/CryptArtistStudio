interface PreviewCanvasProps {
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
  currentFrame: number;
  setCurrentFrame: (f: number) => void;
}

function frameToTimecode(frame: number, fps: number = 24): string {
  const totalSeconds = frame / fps;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const f = frame % Math.round(fps);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(f).padStart(2, "0")}`;
}

export default function PreviewCanvas({
  isPlaying,
  setIsPlaying,
  currentFrame,
  setCurrentFrame,
}: PreviewCanvasProps) {
  return (
    <div className="panel h-full m-1 flex flex-col">
      <div className="panel-header">
        <h3>Preview</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-studio-muted font-mono">
            1920×1080
          </span>
          <span className="text-[10px] px-[6px] py-[1px] rounded bg-studio-accent/20 text-studio-accent font-semibold">
            HD
          </span>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 bg-black flex items-center justify-center relative overflow-hidden">
        {/* Simulated viewport */}
        <div className="relative" style={{ width: "80%", aspectRatio: "16/9" }}>
          {/* Dark canvas with grid */}
          <div
            className="absolute inset-0 rounded"
            style={{
              background:
                "linear-gradient(135deg, #0a0a14 0%, #12121f 50%, #0a0a14 100%)",
              boxShadow: "inset 0 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Center play indicator */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-4xl mb-2 opacity-20">💀🎨</div>
              <span className="text-[11px] text-studio-muted opacity-40">
                CryptArtist Studio
              </span>
              <span className="text-[9px] text-studio-muted opacity-30 mt-1">
                Import media to begin editing
              </span>
            </div>

            {/* Safe area guides */}
            <div
              className="absolute border border-dashed border-white/5 rounded"
              style={{ inset: "10%" }}
            />
            <div
              className="absolute border border-dashed border-white/[0.03] rounded"
              style={{ inset: "5%" }}
            />
          </div>
        </div>

        {/* Frame counter overlay */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-studio-cyan">
          Frame {currentFrame}
        </div>
      </div>

      {/* Transport Controls */}
      <div className="transport-bar">
        <button
          className="transport-btn"
          title="Previous frame"
          onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
        >
          ⏮
        </button>
        <button
          className="transport-btn"
          title="Step back"
          onClick={() => setCurrentFrame(Math.max(0, currentFrame - 1))}
        >
          ◀
        </button>
        <button
          className="transport-btn transport-btn-play"
          title={isPlaying ? "Pause" : "Play"}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
        <button
          className="transport-btn"
          title="Step forward"
          onClick={() => setCurrentFrame(currentFrame + 1)}
        >
          ▶
        </button>
        <button
          className="transport-btn"
          title="Next frame"
          onClick={() => setCurrentFrame(currentFrame + 1)}
        >
          ⏭
        </button>
        <div className="mx-2 h-5 w-px bg-studio-border" />
        <span className="timecode">{frameToTimecode(currentFrame)}</span>
      </div>
    </div>
  );
}
