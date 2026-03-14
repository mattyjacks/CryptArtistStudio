/* Wave2: type=button applied */
import { useState } from "react";

// ------- Demo track data -------
interface Clip {
  id: string;
  name: string;
  startFrame: number;
  endFrame: number;
  color: string;
}
interface Track {
  id: string;
  name: string;
  type: "video" | "audio";
  muted: boolean;
  locked: boolean;
  solo: boolean;
  clips: Clip[];
}

const TRACKS: Track[] = [
  {
    id: "v3", name: "Video 3", type: "video", muted: false, locked: false, solo: false,
    clips: [],
  },
  {
    id: "v2", name: "Video 2", type: "video", muted: false, locked: false, solo: false,
    clips: [
      { id: "c2", name: "Overlay.png", startFrame: 72, endFrame: 168, color: "#7b2ff7" },
    ],
  },
  {
    id: "v1", name: "Video 1", type: "video", muted: false, locked: false, solo: false,
    clips: [
      { id: "c1", name: "Interview_Main.mp4", startFrame: 0, endFrame: 120, color: "#e94560" },
      { id: "c3", name: "B-Roll_City.mp4", startFrame: 130, endFrame: 240, color: "#00d2ff" },
    ],
  },
  {
    id: "a1", name: "Audio 1", type: "audio", muted: false, locked: false, solo: false,
    clips: [
      { id: "c4", name: "Voiceover.wav", startFrame: 0, endFrame: 200, color: "#4ade80" },
    ],
  },
  {
    id: "a2", name: "Audio 2", type: "audio", muted: false, locked: false, solo: false,
    clips: [
      { id: "c5", name: "BGM_Ambient.mp3", startFrame: 0, endFrame: 240, color: "#fbbf24" },
    ],
  },
];

const TOTAL_FRAMES = 300;
const PX_PER_FRAME = 3;

interface TimelineProps {
  currentFrame: number;
  setCurrentFrame: (f: number) => void;
}

export default function Timeline({ currentFrame, setCurrentFrame }: TimelineProps) {
  const [zoom, setZoom] = useState(1);
  const [tracks, setTracks] = useState(TRACKS);
  const scale = PX_PER_FRAME * zoom;

  const toggleMute = (id: string) =>
    setTracks((t) => t.map((tr) => (tr.id === id ? { ...tr, muted: !tr.muted } : tr)));
  const toggleSolo = (id: string) =>
    setTracks((t) => t.map((tr) => (tr.id === id ? { ...tr, solo: !tr.solo } : tr)));
  const toggleLock = (id: string) =>
    setTracks((t) => t.map((tr) => (tr.id === id ? { ...tr, locked: !tr.locked } : tr)));

  // Generate ruler ticks
  const rulerTicks: { frame: number; major: boolean }[] = [];
  const tickInterval = zoom > 1.5 ? 12 : zoom > 0.8 ? 24 : 48;
  for (let f = 0; f <= TOTAL_FRAMES; f += tickInterval) {
    rulerTicks.push({ frame: f, major: f % (tickInterval * 2) === 0 });
  }

  return (
    <div className="panel h-full m-1 mt-0 flex flex-col">
      {/* Timeline Header */}
      <div className="panel-header">
        <h3>Timeline</h3>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-studio-muted font-mono">
            Zoom
          </span>
          <input
            type="range"
            min="0.3"
            max="3"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-20 h-1 accent-studio-cyan"
          />
          <span className="text-[10px] text-studio-cyan font-mono w-8">
            {zoom.toFixed(1)}×
          </span>
        </div>
      </div>

      {/* Ruler + Tracks */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track Headers Column */}
        <div className="flex flex-col min-w-[140px] w-[140px] border-r border-studio-border bg-studio-panel">
          {/* Ruler spacer */}
          <div className="h-[28px] border-b border-studio-border bg-studio-panel flex items-center px-2">
            <span className="text-[9px] text-studio-muted font-mono">
              {tracks.length} tracks
            </span>
          </div>
          {tracks.map((track) => (
            <div key={track.id} className="track-header border-b border-studio-border">
              <span
                className={`text-[10px] w-4 h-4 flex items-center justify-center rounded ${
                  track.type === "video"
                    ? "bg-studio-purple/20 text-studio-purple"
                    : "bg-studio-green/20 text-studio-green"
                }`}
              >
                {track.type === "video" ? "V" : "A"}
              </span>
              <span className="flex-1 truncate text-[11px]">{track.name}</span>
              <div className="flex gap-[2px]">
                <button type="button"
                  onClick={() => toggleMute(track.id)}
                  className={`text-[9px] w-4 h-4 rounded flex items-center justify-center ${
                    track.muted ? "bg-studio-accent/30 text-studio-accent" : "text-studio-muted hover:text-studio-secondary"
                  }`}
                  title="Mute"
                >
                  M
                </button>
                <button type="button"
                  onClick={() => toggleSolo(track.id)}
                  className={`text-[9px] w-4 h-4 rounded flex items-center justify-center ${
                    track.solo ? "bg-studio-yellow/30 text-studio-yellow" : "text-studio-muted hover:text-studio-secondary"
                  }`}
                  title="Solo"
                >
                  S
                </button>
                <button type="button"
                  onClick={() => toggleLock(track.id)}
                  className={`text-[9px] w-4 h-4 rounded flex items-center justify-center ${
                    track.locked ? "bg-studio-orange/30 text-studio-orange" : "text-studio-muted hover:text-studio-secondary"
                  }`}
                  title="Lock"
                >
                  L
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable timeline area */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: TOTAL_FRAMES * scale, minHeight: "100%" }} className="relative">
            {/* Ruler */}
            <div
              className="timeline-ruler sticky top-0 z-10"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                setCurrentFrame(Math.round(x / scale));
              }}
              style={{ cursor: "pointer" }}
            >
              {rulerTicks.map((tick) => (
                <div key={tick.frame}>
                  <div
                    className="timeline-ruler-tick"
                    style={{
                      left: tick.frame * scale,
                      height: tick.major ? 12 : 6,
                    }}
                  />
                  {tick.major && (
                    <span
                      className="timeline-ruler-label"
                      style={{ left: tick.frame * scale }}
                    >
                      {tick.frame}
                    </span>
                  )}
                </div>
              ))}
              {/* Playhead top marker */}
              <div
                className="absolute bottom-0 w-[2px] h-full bg-studio-accent z-20"
                style={{ left: currentFrame * scale }}
              />
            </div>

            {/* Track content rows */}
            {tracks.map((track) => (
              <div key={track.id} className="track-row" style={{ height: 40 }}>
                <div className="track-content">
                  {track.clips.map((clip) => {
                    const left = clip.startFrame * scale;
                    const width = (clip.endFrame - clip.startFrame) * scale;
                    return (
                      <div
                        key={clip.id}
                        className="clip"
                        style={{
                          left,
                          width,
                          backgroundColor: clip.color + "cc",
                        }}
                      >
                        {track.type === "audio" ? (
                          <div className="waveform-container" style={{ color: clip.color }}>
                            {Array.from({ length: Math.floor(width / 4) }, (_, i) => (
                              <div
                                key={i}
                                className="waveform-bar"
                                style={{
                                  height: `${30 + Math.sin(i * 0.7) * 40 + Math.random() * 30}%`,
                                  "--duration": `${1 + Math.random() * 0.5}s`,
                                  "--delay": `${i * 0.05}s`,
                                } as React.CSSProperties}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="relative z-10 text-[10px]">{clip.name}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Full-height playhead line */}
            <div
              className="playhead"
              style={{ left: currentFrame * scale, top: 0, bottom: 0, position: "absolute" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
