import React, { useRef, useState, useEffect } from "react";
import { useProject } from "../../../core/context/ProjectContext";
import { TimelineClip, TimelineTrack } from "../../../core/types/video.types";

export const Timeline: React.FC = () => {
  const {
    tracks,
    markers,
    currentFrame,
    setCurrentFrame,
    selectedClipId,
    setSelectedClipId,
    splitClipAtPlayhead,
    removeClip,
    rippleDeleteClip,
    updateClipTiming,
    addTrack,
    removeTrack,
    addMarker,
    removeMarker,
    setInPoint,
    setOutPoint,
    undo,
    redo,
    canUndo,
    canRedo,
    projectSettings,
    isPlaying,
    setIsPlaying,
  } = useProject();

  const [zoom, setZoom] = useState<number>(1.2);
  const [isSnapping, setIsSnapping] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<"pointer" | "blade" | "hand">("pointer");
  const [dragState, setDragState] = useState<{
    type: "move" | "trim-start" | "trim-end";
    clipId: string;
    originalTrackId: string;
    originalStart: number;
    originalEnd: number;
    startX: number;
  } | null>(null);

  const timelineContainerRef = useRef<HTMLDivElement>(null);

  const totalFrames = 480;
  const pixelsPerFrame = 3.5 * zoom;
  const fps = projectSettings.fps || 30;

  // Format frame index to HH:MM:SS:FF
  const formatTimecode = (f: number) => {
    const totalSeconds = Math.floor(f / fps);
    const frames = f % fps;
    const s = totalSeconds % 60;
    const m = Math.floor(totalSeconds / 60) % 60;
    const h = Math.floor(totalSeconds / 3600);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(frames).padStart(2, "0")}`;
  };

  // Keyboard NLE Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid firing when typing in an input/textarea
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      } else if (e.code === "KeyC") {
        setActiveTool("blade");
      } else if (e.code === "KeyV") {
        setActiveTool("pointer");
      } else if (e.code === "KeyM") {
        addMarker(currentFrame, `Marker @ ${currentFrame}`);
      } else if (e.code === "KeyI") {
        setInPoint(currentFrame);
      } else if (e.code === "KeyO") {
        setOutPoint(currentFrame);
      } else if (e.code === "Delete" || e.code === "Backspace") {
        if (selectedClipId) {
          if (e.shiftKey) {
            rippleDeleteClip(selectedClipId);
          } else {
            removeClip(selectedClipId);
          }
        }
      } else if (e.ctrlKey && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.ctrlKey && e.code === "KeyY") {
        e.preventDefault();
        redo();
      } else if (e.ctrlKey && e.code === "KeyB") {
        e.preventDefault();
        if (selectedClipId) splitClipAtPlayhead(selectedClipId);
      } else if (e.code === "KeyJ") {
        setCurrentFrame((prev) => Math.max(0, prev - 15));
      } else if (e.code === "KeyK") {
        setIsPlaying(false);
      } else if (e.code === "KeyL") {
        setCurrentFrame((prev) => Math.min(totalFrames, prev + 15));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying, selectedClipId, currentFrame, addMarker, setInPoint, setOutPoint, removeClip, rippleDeleteClip, splitClipAtPlayhead, undo, redo, setIsPlaying, setCurrentFrame]);

  // Timeline scrub handler
  const handleTimelineMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (dragState) return;
    if (!timelineContainerRef.current) return;
    const rect = timelineContainerRef.current.getBoundingClientRect();
    const scrollLeft = timelineContainerRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const targetFrame = Math.max(0, Math.round(clickX / pixelsPerFrame));
    setCurrentFrame(targetFrame);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const moveX = moveEvent.clientX - rect.left + timelineContainerRef.current!.scrollLeft;
      const newFrame = Math.max(0, Math.round(moveX / pixelsPerFrame));
      setCurrentFrame(newFrame);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Razor Blade cut anywhere on clip
  const handleClipClick = (e: React.MouseEvent, clip: TimelineClip) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);

    if (activeTool === "blade") {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickInsideClipX = e.clientX - rect.left;
      const frameOffset = Math.round(clickInsideClipX / pixelsPerFrame);
      const cutFrame = clip.startFrame + frameOffset;
      if (cutFrame > clip.startFrame && cutFrame < clip.endFrame) {
        setCurrentFrame(cutFrame);
        splitClipAtPlayhead(clip.id);
      }
    }
  };

  // Start clip drag or trim
  const startClipDrag = (
    e: React.MouseEvent,
    clip: TimelineClip,
    type: "move" | "trim-start" | "trim-end"
  ) => {
    e.stopPropagation();
    if (activeTool === "blade") return;

    setSelectedClipId(clip.id);
    setDragState({
      type,
      clipId: clip.id,
      originalTrackId: clip.trackId,
      originalStart: clip.startFrame,
      originalEnd: clip.endFrame,
      startX: e.clientX,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - e.clientX;
      const deltaFrames = Math.round(deltaPx / pixelsPerFrame);

      if (type === "move") {
        let newStart = Math.max(0, clip.startFrame + deltaFrames);
        const duration = clip.endFrame - clip.startFrame;
        let newEnd = newStart + duration;

        // Snap to playhead
        if (isSnapping && Math.abs(newStart - currentFrame) < 6) {
          newStart = currentFrame;
          newEnd = newStart + duration;
        }

        updateClipTiming(clip.id, { startFrame: newStart, endFrame: newEnd });
      } else if (type === "trim-start") {
        const newStart = Math.min(clip.endFrame - 10, Math.max(0, clip.startFrame + deltaFrames));
        updateClipTiming(clip.id, { startFrame: newStart });
      } else if (type === "trim-end") {
        const newEnd = Math.max(clip.startFrame + 10, clip.endFrame + deltaFrames);
        updateClipTiming(clip.id, { endFrame: newEnd });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div className="flex flex-col h-full bg-studio-panel select-none">
      {/* Timeline Controls & Tools Bar */}
      <div className="h-10 border-b border-studio-border px-3 flex items-center justify-between bg-studio-surface/70">
        {/* Editing Tools & Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTool("pointer")}
            className={`px-2.5 py-1 text-xs rounded font-medium flex items-center gap-1.5 transition ${
              activeTool === "pointer"
                ? "bg-studio-cyan text-black shadow-glow-sm"
                : "text-studio-secondary hover:bg-studio-surface hover:text-studio-text"
            }`}
            title="Selection Tool (V)"
          >
            <span>↖</span> Selection
          </button>
          <button
            onClick={() => setActiveTool("blade")}
            className={`px-2.5 py-1 text-xs rounded font-medium flex items-center gap-1.5 transition ${
              activeTool === "blade"
                ? "bg-studio-red text-white shadow-glow-red"
                : "text-studio-secondary hover:bg-studio-surface hover:text-studio-text"
            }`}
            title="Razor Blade Tool (C) - Click clip to slice"
          >
            <span>✂</span> Razor Blade
          </button>

          <div className="h-4 w-px bg-studio-border mx-1" />

          {/* Undo / Redo */}
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1 rounded text-studio-secondary hover:text-studio-text disabled:opacity-30 transition"
            title="Undo (Ctrl+Z)"
          >
            ↩
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1 rounded text-studio-secondary hover:text-studio-text disabled:opacity-30 transition"
            title="Redo (Ctrl+Y)"
          >
            ↪
          </button>

          <div className="h-4 w-px bg-studio-border mx-1" />

          <button
            onClick={() => {
              if (selectedClipId) splitClipAtPlayhead(selectedClipId);
            }}
            disabled={!selectedClipId}
            className="px-2 py-1 text-xs rounded text-studio-secondary hover:bg-studio-surface hover:text-studio-text disabled:opacity-30 transition flex items-center gap-1"
            title="Split Clip at Playhead (Ctrl+B)"
          >
            <span>⚡</span> Split
          </button>
          <button
            onClick={() => {
              if (selectedClipId) rippleDeleteClip(selectedClipId);
            }}
            disabled={!selectedClipId}
            className="px-2 py-1 text-xs rounded text-studio-secondary hover:bg-studio-yellow/20 hover:text-studio-yellow disabled:opacity-30 transition flex items-center gap-1"
            title="Ripple Delete & Close Gap (Shift+Delete)"
          >
            <span>⏩</span> Ripple Delete
          </button>
          <button
            onClick={() => {
              if (selectedClipId) removeClip(selectedClipId);
            }}
            disabled={!selectedClipId}
            className="px-2 py-1 text-xs rounded text-studio-secondary hover:bg-studio-red/20 hover:text-studio-red disabled:opacity-30 transition flex items-center gap-1"
            title="Delete Selected Clip (Delete)"
          >
            <span>🗑</span> Delete
          </button>
          <button
            onClick={() => addMarker(currentFrame)}
            className="px-2 py-1 text-xs rounded text-studio-secondary hover:bg-studio-surface hover:text-studio-cyan transition flex items-center gap-1"
            title="Add Marker at Playhead (M)"
          >
            <span>📍</span> Marker
          </button>
        </div>

        {/* Playhead Timecode Display */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-studio-cyan bg-studio-bg px-3 py-1 rounded border border-studio-border shadow-inner">
            {formatTimecode(currentFrame)}
          </span>
          <span className="text-[11px] font-mono text-studio-muted">
            Frame: {currentFrame} / {totalFrames}
          </span>
        </div>

        {/* Zoom, Snap & Track Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => addTrack("video")}
            className="px-2 py-1 text-xs rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-cyan transition"
            title="Add Video Track"
          >
            + Video
          </button>
          <button
            onClick={() => addTrack("audio")}
            className="px-2 py-1 text-xs rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-green transition"
            title="Add Audio Track"
          >
            + Audio
          </button>
          <button
            onClick={() => setIsSnapping(!isSnapping)}
            className={`px-2 py-1 text-xs rounded transition flex items-center gap-1 ${
              isSnapping ? "bg-studio-cyan/20 text-studio-cyan border border-studio-cyan/40" : "text-studio-muted"
            }`}
            title="Toggle Snapping (S)"
          >
            <span>🧲</span> Snap
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-studio-muted font-mono">Zoom</span>
            <input
              type="range"
              min="0.5"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-20 h-1 accent-studio-cyan bg-studio-surface rounded"
            />
            <span className="text-[10px] font-mono text-studio-cyan w-8">{zoom.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Main Tracks & Timeline Grid Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* Track Headers (Left sidebar) */}
        <div className="w-52 flex-shrink-0 border-r border-studio-border bg-studio-panel flex flex-col pt-7 overflow-y-auto">
          {tracks.map((track) => (
            <div
              key={track.id}
              className="h-16 border-b border-studio-border/70 px-3 py-1.5 flex flex-col justify-between bg-studio-surface/40 hover:bg-studio-surface/60 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-studio-text flex items-center gap-1.5 truncate">
                  <span>{track.type === "video" ? "🎬" : "🎵"}</span>
                  <span className="truncate">{track.name}</span>
                </span>
                <button
                  onClick={() => removeTrack(track.id)}
                  className="text-[10px] text-studio-muted hover:text-studio-red"
                  title="Remove Track"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const updated = tracks.map((t) => (t.id === track.id ? { ...t, muted: !t.muted } : t));
                      // sync
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                      track.muted ? "bg-studio-red text-white" : "bg-studio-bg text-studio-muted hover:text-studio-text"
                    }`}
                  >
                    M
                  </button>
                  <button
                    onClick={() => {
                      const updated = tracks.map((t) => (t.id === track.id ? { ...t, solo: !t.solo } : t));
                      // sync
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                      track.solo ? "bg-studio-yellow text-black" : "bg-studio-bg text-studio-muted hover:text-studio-text"
                    }`}
                  >
                    S
                  </button>
                  <button
                    onClick={() => {
                      const updated = tracks.map((t) => (t.id === track.id ? { ...t, locked: !t.locked } : t));
                      // sync
                    }}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition ${
                      track.locked ? "bg-studio-purple text-white" : "bg-studio-bg text-studio-muted hover:text-studio-text"
                    }`}
                  >
                    🔒
                  </button>
                </div>
                <span className="text-[10px] font-mono text-studio-muted">{track.clips.length} clips</span>
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Tracks Lanes & Ruler */}
        <div
          ref={timelineContainerRef}
          onMouseDown={handleTimelineMouseDown}
          className="flex-1 overflow-x-auto overflow-y-auto relative bg-studio-bg cursor-pointer"
        >
          <div
            style={{ width: `${totalFrames * pixelsPerFrame}px` }}
            className="h-full relative flex flex-col min-h-full"
          >
            {/* Time Ruler with Markers */}
            <div className="h-7 border-b border-studio-border bg-studio-surface/90 relative flex items-end sticky top-0 z-20 shadow-sm">
              {/* Ruler Ticks */}
              {Array.from({ length: Math.ceil(totalFrames / 15) }).map((_, idx) => {
                const f = idx * 15;
                const isMajor = f % 30 === 0;
                return (
                  <div
                    key={f}
                    style={{ left: `${f * pixelsPerFrame}px` }}
                    className="absolute bottom-0 flex flex-col items-start pointer-events-none"
                  >
                    {isMajor && (
                      <span className="text-[9px] font-mono text-studio-secondary ml-1 mb-1">
                        {formatTimecode(f)}
                      </span>
                    )}
                    <div className={`w-px ${isMajor ? "h-3 bg-studio-muted" : "h-1.5 bg-studio-border"}`} />
                  </div>
                );
              })}

              {/* Markers */}
              {markers.map((m) => (
                <div
                  key={m.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentFrame(m.frame);
                  }}
                  style={{ left: `${m.frame * pixelsPerFrame}px`, backgroundColor: m.color }}
                  className="absolute top-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold text-black cursor-pointer shadow-sm z-30 transform -translate-x-1/2 flex items-center gap-1"
                  title={`${m.label} (Click to jump)`}
                >
                  <span>📍</span> {m.label}
                </div>
              ))}
            </div>

            {/* Track Lanes */}
            {tracks.map((track) => (
              <div
                key={track.id}
                className="h-16 border-b border-studio-border/40 relative bg-studio-surface/10 hover:bg-studio-surface/20 transition"
              >
                {track.clips.map((clip) => {
                  const clipLeft = clip.startFrame * pixelsPerFrame;
                  const clipWidth = (clip.endFrame - clip.startFrame) * pixelsPerFrame;
                  const isSelected = selectedClipId === clip.id;

                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => handleClipClick(e, clip)}
                      onMouseDown={(e) => startClipDrag(e, clip, "move")}
                      style={{
                        left: `${clipLeft}px`,
                        width: `${clipWidth}px`,
                        backgroundColor: clip.color || "#00d2ff",
                      }}
                      className={`group absolute top-1.5 bottom-1.5 rounded-md px-2 py-1 flex flex-col justify-between overflow-hidden shadow-md cursor-grab active:cursor-grabbing transition ${
                        isSelected
                          ? "ring-2 ring-white shadow-glow-sm z-10 brightness-110"
                          : "opacity-90 hover:opacity-100"
                      }`}
                    >
                      {/* Left Trim Handle */}
                      <div
                        onMouseDown={(e) => startClipDrag(e, clip, "trim-start")}
                        className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/40 hover:bg-white cursor-ew-resize opacity-0 group-hover:opacity-100 transition"
                        title="Drag to trim start"
                      />

                      <div className="flex items-center justify-between text-black font-semibold text-xs truncate">
                        <span className="truncate">{clip.name}</span>
                        <span className="text-[10px] font-mono opacity-80">
                          {((clip.endFrame - clip.startFrame) / fps).toFixed(1)}s
                        </span>
                      </div>

                      {/* Text content preview if text clip */}
                      {clip.textContent && (
                        <span className="text-[10px] text-black/70 italic truncate">
                          "{clip.textContent}"
                        </span>
                      )}

                      {/* Waveform visual for audio */}
                      {track.type === "audio" && (
                        <div className="flex items-end gap-0.5 h-3 opacity-60">
                          {Array.from({ length: 28 }).map((_, i) => (
                            <div
                              key={i}
                              style={{ height: `${20 + (i % 6) * 15}%` }}
                              className="w-1 bg-black rounded-t"
                            />
                          ))}
                        </div>
                      )}

                      {/* Right Trim Handle */}
                      <div
                        onMouseDown={(e) => startClipDrag(e, clip, "trim-end")}
                        className="absolute right-0 top-0 bottom-0 w-2.5 bg-black/40 hover:bg-white cursor-ew-resize opacity-0 group-hover:opacity-100 transition"
                        title="Drag to trim end"
                      />
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Red Playhead Line */}
            <div
              style={{ left: `${currentFrame * pixelsPerFrame}px` }}
              className="absolute top-0 bottom-0 w-0.5 bg-studio-red z-30 pointer-events-none shadow-glow-red"
            >
              <div className="w-3 h-3 bg-studio-red -ml-1.5 -top-1.5 rotate-45 absolute rounded-sm" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
