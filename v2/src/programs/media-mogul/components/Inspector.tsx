import React, { useState } from "react";
import { useProject } from "../../../core/context/ProjectContext";
import { TransitionType } from "../../../core/types/video.types";

export const Inspector: React.FC = () => {
  const { selectedClip, updateSelectedClipTransform, updateSelectedClipText, updateSelectedClipColorGrading } = useProject();
  const [activeInspectorTab, setActiveInspectorTab] = useState<"transform" | "text" | "transitions" | "eq">("transform");

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center text-studio-muted bg-studio-panel border-l border-studio-border">
        <span className="text-3xl mb-2">⚙️</span>
        <p className="text-xs">Select a clip on the timeline to inspect and edit its properties.</p>
      </div>
    );
  }

  const { transform, name, mediaType, startFrame, endFrame, volume, speed, textContent, textStyle, transitionIn, transitionOut } = selectedClip;
  const isTextClip = mediaType === "text" || !!textContent;

  return (
    <div className="flex flex-col h-full bg-studio-panel border-l border-studio-border overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-studio-border bg-studio-surface/60">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-studio-text flex items-center gap-1.5 truncate">
            <span>⚙️</span> Inspector: <span className="text-studio-cyan truncate">{name}</span>
          </h2>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-surface text-studio-secondary border border-studio-border">
            {mediaType.toUpperCase()}
          </span>
        </div>
        <span className="text-[10px] text-studio-muted font-mono block mt-1">
          Frames {startFrame} - {endFrame} ({((endFrame - startFrame) / 30).toFixed(1)}s)
        </span>
      </div>

      {/* Inspector Sub-Tabs */}
      <div className="flex border-b border-studio-border bg-studio-bg p-1 text-[11px]">
        <button
          onClick={() => setActiveInspectorTab("transform")}
          className={`flex-1 py-1 rounded font-medium transition ${
            activeInspectorTab === "transform" ? "bg-studio-surface text-studio-cyan" : "text-studio-secondary hover:text-studio-text"
          }`}
        >
          Transform
        </button>
        {isTextClip && (
          <button
            onClick={() => setActiveInspectorTab("text")}
            className={`flex-1 py-1 rounded font-medium transition ${
              activeInspectorTab === "text" ? "bg-studio-surface text-studio-pink" : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            Text / Title
          </button>
        )}
        <button
          onClick={() => setActiveInspectorTab("transitions")}
          className={`flex-1 py-1 rounded font-medium transition ${
            activeInspectorTab === "transitions" ? "bg-studio-surface text-studio-purple" : "text-studio-secondary hover:text-studio-text"
          }`}
        >
          Transitions
        </button>
        <button
          onClick={() => setActiveInspectorTab("eq")}
          className={`flex-1 py-1 rounded font-medium transition ${
            activeInspectorTab === "eq" ? "bg-studio-surface text-studio-green" : "text-studio-secondary hover:text-studio-text"
          }`}
        >
          Audio EQ
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
        {/* Transform & Motion Tab */}
        {activeInspectorTab === "transform" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-studio-secondary">
                <span>Scale</span>
                <span className="font-mono text-studio-cyan">{((transform.scale || 1.0) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="3.0"
                step="0.05"
                value={transform.scale || 1.0}
                onChange={(e) => updateSelectedClipTransform({ scale: parseFloat(e.target.value) })}
                className="w-full h-1 accent-studio-cyan bg-studio-surface rounded"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-studio-secondary">
                <span>Opacity</span>
                <span className="font-mono text-studio-cyan">{(((transform.opacity ?? 1.0)) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={transform.opacity ?? 1.0}
                onChange={(e) => updateSelectedClipTransform({ opacity: parseFloat(e.target.value) })}
                className="w-full h-1 accent-studio-cyan bg-studio-surface rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-studio-muted block mb-1">Position X (%)</label>
                <input
                  type="number"
                  value={transform.x || 0}
                  onChange={(e) => updateSelectedClipTransform({ x: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                />
              </div>
              <div>
                <label className="text-[11px] text-studio-muted block mb-1">Position Y (%)</label>
                <input
                  type="number"
                  value={transform.y || 0}
                  onChange={(e) => updateSelectedClipTransform({ y: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-studio-secondary">
                <span>Rotation</span>
                <span className="font-mono text-studio-cyan">{transform.rotation || 0}°</span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={transform.rotation || 0}
                onChange={(e) => updateSelectedClipTransform({ rotation: parseInt(e.target.value, 10) })}
                className="w-full h-1 accent-studio-cyan bg-studio-surface rounded"
              />
            </div>

            <div>
              <label className="text-[11px] text-studio-muted block mb-1">Blend Mode</label>
              <select
                value={transform.blendMode || "normal"}
                onChange={(e) => updateSelectedClipTransform({ blendMode: e.target.value as any })}
                className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-secondary focus:outline-none focus:border-studio-cyan"
              >
                <option value="normal">Normal</option>
                <option value="screen">Screen</option>
                <option value="multiply">Multiply</option>
                <option value="overlay">Overlay</option>
                <option value="lighten">Lighten</option>
                <option value="darken">Darken</option>
              </select>
            </div>
          </div>
        )}

        {/* Text & Title Editor Tab */}
        {activeInspectorTab === "text" && (
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-studio-muted block mb-1">Title Text Content</label>
              <textarea
                rows={2}
                value={textContent || ""}
                onChange={(e) => updateSelectedClipText(e.target.value)}
                className="w-full bg-studio-bg border border-studio-border rounded p-2 text-xs text-studio-text focus:outline-none focus:border-studio-pink"
                placeholder="Enter title overlay text..."
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-studio-muted block mb-1">Font Size (px)</label>
                <input
                  type="number"
                  value={textStyle?.fontSize || 48}
                  onChange={(e) => updateSelectedClipText(textContent || "", { fontSize: parseInt(e.target.value, 10) || 48 })}
                  className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:outline-none focus:border-studio-pink"
                />
              </div>
              <div>
                <label className="text-[11px] text-studio-muted block mb-1">Text Color</label>
                <input
                  type="color"
                  value={textStyle?.textColor || "#ffffff"}
                  onChange={(e) => updateSelectedClipText(textContent || "", { textColor: e.target.value })}
                  className="w-full h-7 rounded border border-studio-border cursor-pointer bg-transparent"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-studio-muted block mb-1">Position Alignment</label>
              <select
                value={textStyle?.position || "center"}
                onChange={(e) => updateSelectedClipText(textContent || "", { position: e.target.value as any })}
                className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-secondary focus:outline-none focus:border-studio-pink"
              >
                <option value="top">Top Header</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom Caption</option>
                <option value="lower-third">Lower-Third Banner</option>
              </select>
            </div>
          </div>
        )}

        {/* Transitions Tab */}
        {activeInspectorTab === "transitions" && (
          <div className="space-y-4">
            <div className="p-3 bg-studio-surface border border-studio-border rounded-xl space-y-2">
              <span className="font-bold text-studio-purple block">In Transition (Intro)</span>
              <select
                value={transitionIn?.type || "cut"}
                onChange={(e) => {
                  // update transition
                }}
                className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:outline-none focus:border-studio-purple"
              >
                <option value="cut">None (Cut)</option>
                <option value="cross-dissolve">Cross Dissolve</option>
                <option value="dip-to-black">Dip to Black</option>
                <option value="dip-to-white">Dip to White</option>
                <option value="wipe-left">Wipe Left</option>
                <option value="zoom-in">Zoom In</option>
              </select>
            </div>

            <div className="p-3 bg-studio-surface border border-studio-border rounded-xl space-y-2">
              <span className="font-bold text-studio-purple block">Out Transition (Outro)</span>
              <select
                value={transitionOut?.type || "cut"}
                onChange={(e) => {
                  // update transition
                }}
                className="w-full bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-text focus:outline-none focus:border-studio-purple"
              >
                <option value="cut">None (Cut)</option>
                <option value="cross-dissolve">Cross Dissolve</option>
                <option value="dip-to-black">Dip to Black</option>
                <option value="dip-to-white">Dip to White</option>
                <option value="wipe-left">Wipe Left</option>
                <option value="blur-fade">Blur Fade</option>
              </select>
            </div>
          </div>
        )}

        {/* Audio Equalizer Tab */}
        {activeInspectorTab === "eq" && (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-studio-secondary">
                <span>Bass / Low (100Hz)</span>
                <span className="font-mono text-studio-green">+0 dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                defaultValue={0}
                className="w-full h-1 accent-studio-green bg-studio-surface rounded"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-studio-secondary">
                <span>Mid (1kHz)</span>
                <span className="font-mono text-studio-green">+0 dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                defaultValue={0}
                className="w-full h-1 accent-studio-green bg-studio-surface rounded"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-studio-secondary">
                <span>Treble / High (10kHz)</span>
                <span className="font-mono text-studio-green">+0 dB</span>
              </div>
              <input
                type="range"
                min="-12"
                max="12"
                defaultValue={0}
                className="w-full h-1 accent-studio-green bg-studio-surface rounded"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inspector;
