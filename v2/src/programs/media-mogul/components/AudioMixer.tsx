import React, { useState, useEffect } from "react";
import { useProject } from "../../../core/context/ProjectContext";
import { useStudioCore } from "../../../core/context/StudioCoreContext";

export const AudioMixer: React.FC = () => {
  const { tracks, isPlaying } = useProject();
  const { videoEngine } = useStudioCore();

  const [channels, setChannels] = useState([
    { id: "master", name: "Master Mix", volume: 85, pan: 0, muted: false, solo: false, eq: { low: 0, mid: 0, high: 0 } },
    { id: "a1", name: "A1 (Voiceover)", volume: 90, pan: 0, muted: false, solo: false, eq: { low: -1, mid: 2, high: 1 } },
    { id: "a2", name: "A2 (Music BGM)", volume: 55, pan: 0, muted: false, solo: false, eq: { low: 2, mid: -2, high: 0 } },
    { id: "a3", name: "A3 (SFX / Foley)", volume: 75, pan: 0, muted: false, solo: false, eq: { low: 0, mid: 0, high: 0 } },
  ]);

  const [activeMeterLevels, setActiveMeterLevels] = useState<Record<string, number>>({});

  // Simulate or read live VU levels during playback
  useEffect(() => {
    if (!isPlaying) {
      setActiveMeterLevels({});
      return;
    }

    const interval = setInterval(() => {
      const live: Record<string, number> = {};
      channels.forEach((ch) => {
        if (ch.muted) {
          live[ch.id] = 0;
        } else {
          live[ch.id] = Math.min(100, Math.max(10, (ch.volume * 0.8) + (Math.random() * 20 - 10)));
        }
      });
      setActiveMeterLevels(live);
    }, 60);

    return () => clearInterval(interval);
  }, [isPlaying, channels]);

  const updateChannel = (id: string, updates: Partial<(typeof channels)[0]>) => {
    setChannels((prev) =>
      prev.map((ch) => (ch.id === id ? { ...ch, ...updates } : ch))
    );
  };

  return (
    <div className="flex flex-col h-full bg-studio-panel p-4 overflow-y-auto select-none">
      <div className="border-b border-studio-border pb-3 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-studio-text flex items-center gap-2">
            <span>🎙️</span> Multi-Channel Fairlight Audio Mixer
          </h2>
          <p className="text-xs text-studio-muted">
            Live gain faders, stereo panning, 3-band parametric EQ, and real-time audio VU loudness meters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-studio-surface border border-studio-border text-studio-green">
            Master Limiter: ACTIVE
          </span>
        </div>
      </div>

      {/* Channel Faders Grid */}
      <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto flex-1">
        {channels.map((ch) => {
          const isMaster = ch.id === "master";
          const currentMeter = activeMeterLevels[ch.id] || (ch.muted ? 0 : isPlaying ? 65 : 0);

          return (
            <div
              key={ch.id}
              className={`flex flex-col items-center p-3.5 rounded-xl border transition ${
                isMaster
                  ? "bg-studio-surface border-studio-cyan/40 shadow-glow-sm"
                  : "bg-studio-surface/50 border-studio-border"
              }`}
            >
              {/* Channel Title */}
              <span className={`text-xs font-bold mb-2 truncate ${isMaster ? "text-studio-cyan" : "text-studio-text"}`}>
                {ch.name}
              </span>

              {/* Stereo Pan Control */}
              <div className="w-full mb-3 space-y-1">
                <div className="flex justify-between text-[10px] text-studio-muted">
                  <span>Pan</span>
                  <span className="font-mono text-studio-cyan">
                    {ch.pan === 0 ? "C" : ch.pan < 0 ? `L${Math.abs(ch.pan)}` : `R${ch.pan}`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  value={ch.pan}
                  onChange={(e) => updateChannel(ch.id, { pan: parseInt(e.target.value, 10) })}
                  className="w-full h-1 accent-studio-cyan bg-studio-bg rounded"
                />
              </div>

              {/* Peak Meter & Vertical Volume Fader */}
              <div className="flex items-center gap-3 h-48 my-2">
                {/* Visual Audio Peak Meter */}
                <div className="w-2.5 h-full bg-studio-bg rounded-full p-0.5 flex flex-col justify-end overflow-hidden border border-studio-border">
                  <div
                    style={{ height: `${currentMeter}%` }}
                    className="w-full bg-gradient-to-t from-studio-green via-studio-yellow to-studio-red rounded-full transition-all duration-75"
                  />
                </div>

                {/* Vertical Volume Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={ch.volume}
                  onChange={(e) => updateChannel(ch.id, { volume: parseInt(e.target.value, 10) })}
                  style={{ transform: "rotate(-90deg)", width: "160px" }}
                  className="accent-studio-cyan cursor-pointer"
                />
              </div>

              {/* Volume Value readout */}
              <span className="font-mono text-xs text-studio-cyan font-bold my-2">
                {ch.volume}%
              </span>

              {/* Mute & Solo Buttons */}
              <div className="flex items-center gap-1.5 w-full mb-3">
                <button
                  onClick={() => updateChannel(ch.id, { muted: !ch.muted })}
                  className={`flex-1 py-1 text-[11px] font-bold rounded transition ${
                    ch.muted
                      ? "bg-studio-red text-white shadow-glow-red"
                      : "bg-studio-bg text-studio-muted hover:text-studio-text border border-studio-border"
                  }`}
                >
                  MUTE
                </button>
                <button
                  onClick={() => updateChannel(ch.id, { solo: !ch.solo })}
                  className={`flex-1 py-1 text-[11px] font-bold rounded transition ${
                    ch.solo
                      ? "bg-studio-yellow text-black font-bold"
                      : "bg-studio-bg text-studio-muted hover:text-studio-text border border-studio-border"
                  }`}
                >
                  SOLO
                </button>
              </div>

              {/* 3-Band EQ Quick Controls */}
              <div className="w-full border-t border-studio-border pt-2 space-y-1 text-[10px]">
                <div className="flex justify-between text-studio-muted">
                  <span>Low: {ch.eq.low > 0 ? `+${ch.eq.low}` : ch.eq.low}dB</span>
                  <span>Mid: {ch.eq.mid > 0 ? `+${ch.eq.mid}` : ch.eq.mid}dB</span>
                  <span>Hi: {ch.eq.high > 0 ? `+${ch.eq.high}` : ch.eq.high}dB</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AudioMixer;
