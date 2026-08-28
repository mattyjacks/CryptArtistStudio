import React, { useRef } from "react";
import { useProject } from "../../../core/context/ProjectContext";
import { ColorWheelVal } from "../../../core/types/video.types";

const LUT_PRESETS = [
  { id: "none", name: "None (Rec.709 Standard)", category: "standard" },
  { id: "teal_orange", name: "Teal & Orange Blockbuster", category: "cinema" },
  { id: "kodak_2383", name: "Kodak 2383 Film Print", category: "film" },
  { id: "fuji_3513", name: "Fuji 3513 Emerald Print", category: "film" },
  { id: "film_noir", name: "Film Noir B&W High Contrast", category: "classic" },
  { id: "vintage_70s", name: "Vintage 1970s Warm Sun", category: "retro" },
  { id: "bleach_bypass", name: "Bleach Bypass Gritty War", category: "cinema" },
  { id: "cyberpunk", name: "Cyberpunk Neon Blue/Pink", category: "stylized" },
];

export const ColorGrading: React.FC = () => {
  const { selectedClip, updateSelectedClipColorGrading } = useProject();

  if (!selectedClip) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-studio-muted bg-studio-panel">
        <span className="text-4xl mb-3">🎨</span>
        <h3 className="text-sm font-semibold text-studio-text mb-1">DaVinci Color Studio</h3>
        <p className="text-xs max-w-sm">
          Select any video or image clip on the timeline to grade Lift/Gamma/Gain color wheels, apply LUTs, and adjust contrast.
        </p>
      </div>
    );
  }

  const cg = selectedClip.colorGrading;

  const handleWheelDrag = (
    e: React.MouseEvent<HTMLDivElement>,
    wheelName: "lift" | "gamma" | "gain" | "offset",
    currentVal: ColorWheelVal
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const maxRadius = rect.width / 2;

    const updateFromMouse = (moveE: MouseEvent) => {
      const dx = moveE.clientX - centerX;
      const dy = moveE.clientY - centerY;
      const r = Math.max(-1, Math.min(1, dx / maxRadius));
      const b = Math.max(-1, Math.min(1, dy / maxRadius));

      updateSelectedClipColorGrading({
        [wheelName]: { ...currentVal, r, b },
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", updateFromMouse);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", updateFromMouse);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleAutoColorBalance = () => {
    updateSelectedClipColorGrading({
      saturation: 1.15,
      contrast: 1.1,
      temperature: 4,
      tint: -2,
      lift: { r: -0.05, g: 0, b: 0.05, y: -0.05 },
      gamma: { r: 0.02, g: 0.02, b: -0.02, y: 0.05 },
      gain: { r: 0.08, g: 0.04, b: -0.06, y: 0.1 },
    });
  };

  const handleResetGrading = () => {
    updateSelectedClipColorGrading({
      lift: { r: 0, g: 0, b: 0, y: 0 },
      gamma: { r: 0, g: 0, b: 0, y: 0 },
      gain: { r: 0, g: 0, b: 0, y: 0 },
      offset: { r: 0, g: 0, b: 0, y: 0 },
      saturation: 1.0,
      contrast: 1.0,
      temperature: 0,
      tint: 0,
      activeLut: "none",
      chromaKeyEnabled: false,
    });
  };

  return (
    <div className="flex flex-col h-full bg-studio-panel p-4 overflow-y-auto select-none">
      <div className="flex items-center justify-between border-b border-studio-border pb-3 mb-4">
        <div>
          <h2 className="text-sm font-bold text-studio-text flex items-center gap-2">
            <span>🎨</span> DaVinci Color Grading Wheels & LUTs
          </h2>
          <p className="text-xs text-studio-muted">
            Grading clip: <strong className="text-studio-cyan">{selectedClip.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoColorBalance}
            className="px-3 py-1 bg-studio-surface hover:bg-studio-cyan/20 border border-studio-border hover:border-studio-cyan/40 text-studio-cyan rounded-lg text-xs font-semibold transition flex items-center gap-1"
            title="Auto-balance contrast and white point"
          >
            <span>🪄</span> Auto Color Balance
          </button>
          <button
            onClick={handleResetGrading}
            className="px-2.5 py-1 bg-studio-surface hover:bg-studio-red/20 text-studio-secondary hover:text-studio-red rounded-lg text-xs transition"
          >
            Reset
          </button>

          <div className="h-4 w-px bg-studio-border mx-1" />

          {/* LUT Selector */}
          <span className="text-xs text-studio-secondary font-medium">3D LUT:</span>
          <select
            value={cg.activeLut || "none"}
            onChange={(e) => updateSelectedClipColorGrading({ activeLut: e.target.value })}
            className="bg-studio-surface border border-studio-border rounded px-2.5 py-1 text-xs text-studio-cyan focus:outline-none focus:border-studio-cyan"
          >
            {LUT_PRESETS.map((lut) => (
              <option key={lut.id} value={lut.id}>
                {lut.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3-Way Color Wheels (Lift, Gamma, Gain, Offset) with interactive dragging */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {/* Lift (Shadows) */}
        <div className="flex flex-col items-center bg-studio-surface/60 border border-studio-border rounded-xl p-3">
          <span className="text-xs font-bold text-studio-text mb-2">LIFT (Shadows)</span>
          <div
            onMouseDown={(e) => handleWheelDrag(e, "lift", cg.lift)}
            className="w-28 h-28 rounded-full border border-studio-border relative bg-studio-bg flex items-center justify-center shadow-inner cursor-crosshair"
          >
            <div
              style={{
                transform: `translate(${(cg.lift.r || 0) * 45}px, ${(cg.lift.b || 0) * 45}px)`,
              }}
              className="w-4 h-4 rounded-full bg-studio-cyan shadow-glow-sm pointer-events-none"
            />
          </div>
          <div className="w-full mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-studio-muted">
              <span>Master Y</span>
              <span className="font-mono text-studio-cyan">{((cg.lift.y || 0) * 100).toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={cg.lift.y || 0}
              onChange={(e) =>
                updateSelectedClipColorGrading({
                  lift: { ...cg.lift, y: parseFloat(e.target.value) },
                })
              }
              className="w-full h-1 accent-studio-cyan bg-studio-bg rounded"
            />
          </div>
        </div>

        {/* Gamma (Midtones) */}
        <div className="flex flex-col items-center bg-studio-surface/60 border border-studio-border rounded-xl p-3">
          <span className="text-xs font-bold text-studio-text mb-2">GAMMA (Midtones)</span>
          <div
            onMouseDown={(e) => handleWheelDrag(e, "gamma", cg.gamma)}
            className="w-28 h-28 rounded-full border border-studio-border relative bg-studio-bg flex items-center justify-center shadow-inner cursor-crosshair"
          >
            <div
              style={{
                transform: `translate(${(cg.gamma.r || 0) * 45}px, ${(cg.gamma.b || 0) * 45}px)`,
              }}
              className="w-4 h-4 rounded-full bg-studio-purple shadow-glow-purple pointer-events-none"
            />
          </div>
          <div className="w-full mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-studio-muted">
              <span>Master Y</span>
              <span className="font-mono text-studio-purple">{((cg.gamma.y || 0) * 100).toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={cg.gamma.y || 0}
              onChange={(e) =>
                updateSelectedClipColorGrading({
                  gamma: { ...cg.gamma, y: parseFloat(e.target.value) },
                })
              }
              className="w-full h-1 accent-studio-purple bg-studio-bg rounded"
            />
          </div>
        </div>

        {/* Gain (Highlights) */}
        <div className="flex flex-col items-center bg-studio-surface/60 border border-studio-border rounded-xl p-3">
          <span className="text-xs font-bold text-studio-text mb-2">GAIN (Highlights)</span>
          <div
            onMouseDown={(e) => handleWheelDrag(e, "gain", cg.gain)}
            className="w-28 h-28 rounded-full border border-studio-border relative bg-studio-bg flex items-center justify-center shadow-inner cursor-crosshair"
          >
            <div
              style={{
                transform: `translate(${(cg.gain.r || 0) * 45}px, ${(cg.gain.b || 0) * 45}px)`,
              }}
              className="w-4 h-4 rounded-full bg-studio-yellow shadow-sm pointer-events-none"
            />
          </div>
          <div className="w-full mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-studio-muted">
              <span>Master Y</span>
              <span className="font-mono text-studio-yellow">{((cg.gain.y || 0) * 100).toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={cg.gain.y || 0}
              onChange={(e) =>
                updateSelectedClipColorGrading({
                  gain: { ...cg.gain, y: parseFloat(e.target.value) },
                })
              }
              className="w-full h-1 accent-studio-yellow bg-studio-bg rounded"
            />
          </div>
        </div>

        {/* Offset (Exposure) */}
        <div className="flex flex-col items-center bg-studio-surface/60 border border-studio-border rounded-xl p-3">
          <span className="text-xs font-bold text-studio-text mb-2">OFFSET (Exposure)</span>
          <div
            onMouseDown={(e) => handleWheelDrag(e, "offset", cg.offset)}
            className="w-28 h-28 rounded-full border border-studio-border relative bg-studio-bg flex items-center justify-center shadow-inner cursor-crosshair"
          >
            <div
              style={{
                transform: `translate(${(cg.offset.r || 0) * 45}px, ${(cg.offset.b || 0) * 45}px)`,
              }}
              className="w-4 h-4 rounded-full bg-white shadow-sm pointer-events-none"
            />
          </div>
          <div className="w-full mt-3 space-y-1">
            <div className="flex justify-between text-[10px] text-studio-muted">
              <span>Master Y</span>
              <span className="font-mono text-white">{((cg.offset.y || 0) * 100).toFixed(0)}</span>
            </div>
            <input
              type="range"
              min="-1.0"
              max="1.0"
              step="0.05"
              value={cg.offset.y || 0}
              onChange={(e) =>
                updateSelectedClipColorGrading({
                  offset: { ...cg.offset, y: parseFloat(e.target.value) },
                })
              }
              className="w-full h-1 accent-white bg-studio-bg rounded"
            />
          </div>
        </div>
      </div>

      {/* Primary Adjustment Sliders */}
      <div className="grid grid-cols-2 gap-4 bg-studio-surface/30 border border-studio-border rounded-xl p-4 mb-4">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-studio-secondary">Saturation</span>
            <span className="font-mono text-studio-cyan">{((cg.saturation ?? 1.0) * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.05"
            value={cg.saturation ?? 1.0}
            onChange={(e) => updateSelectedClipColorGrading({ saturation: parseFloat(e.target.value) })}
            className="w-full h-1 accent-studio-cyan bg-studio-bg rounded"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-studio-secondary">Contrast</span>
            <span className="font-mono text-studio-cyan">{((cg.contrast ?? 1.0) * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={cg.contrast ?? 1.0}
            onChange={(e) => updateSelectedClipColorGrading({ contrast: parseFloat(e.target.value) })}
            className="w-full h-1 accent-studio-cyan bg-studio-bg rounded"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-studio-secondary">Color Temperature (Warm / Cool)</span>
            <span className="font-mono text-studio-cyan">{cg.temperature || 0}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={cg.temperature || 0}
            onChange={(e) => updateSelectedClipColorGrading({ temperature: parseInt(e.target.value, 10) })}
            className="w-full h-1 accent-studio-orange bg-studio-bg rounded"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-studio-secondary">Tint (Green / Magenta)</span>
            <span className="font-mono text-studio-cyan">{cg.tint || 0}</span>
          </div>
          <input
            type="range"
            min="-100"
            max="100"
            step="1"
            value={cg.tint || 0}
            onChange={(e) => updateSelectedClipColorGrading({ tint: parseInt(e.target.value, 10) })}
            className="w-full h-1 accent-studio-pink bg-studio-bg rounded"
          />
        </div>
      </div>

      {/* Chroma Key / Green Screen Section */}
      <div className="bg-studio-surface/30 border border-studio-border rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="chromaToggle"
            checked={cg.chromaKeyEnabled || false}
            onChange={(e) => updateSelectedClipColorGrading({ chromaKeyEnabled: e.target.checked })}
            className="w-4 h-4 accent-studio-green rounded"
          />
          <div>
            <label htmlFor="chromaToggle" className="text-xs font-bold text-studio-text cursor-pointer">
              Chroma Key (Green Screen Removal)
            </label>
            <p className="text-[11px] text-studio-muted">
              Removes background key color and creates alpha transparency.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-studio-secondary">Key Color:</span>
          <input
            type="color"
            value={cg.chromaColor || "#00ff00"}
            onChange={(e) => updateSelectedClipColorGrading({ chromaColor: e.target.value })}
            className="w-8 h-8 rounded border border-studio-border cursor-pointer bg-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default ColorGrading;
