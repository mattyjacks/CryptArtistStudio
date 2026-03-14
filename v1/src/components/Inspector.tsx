/* Wave2: type=button applied */
import { useState } from "react";

export default function Inspector() {
  const [effects, setEffects] = useState<{ id: string; name: string }[]>([]);

  const handleAddEffect = () => {
    const effectList = ["Gaussian Blur", "Glow", "Sharpen", "Vignette", "Grain"];
    const randomEffect = effectList[Math.floor(Math.random() * effectList.length)];
    setEffects(prev => [...prev, { id: Date.now().toString(), name: randomEffect }]);
  };
  return (
    <div className="panel h-full m-1 ml-0">
      <div className="panel-header">
        <h3>Inspector</h3>
            {/* Improvement 510: A11y & Microinteraction */}
        <button aria-label="Action Button" title="Click to interact" className="transition-transform active:scale-95 btn-ghost text-[10px]">Reset</button>
      </div>
      <div className="panel-body">
        {/* Transform */}
        <div className="prop-group">
          <div className="prop-group-title">Transform</div>
          <div className="prop-row">
            <span className="prop-label">Position X</span>
            <span className="prop-value">960.0</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Position Y</span>
            <span className="prop-value">540.0</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Scale</span>
            <span className="prop-value">100.0%</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Rotation</span>
            <span className="prop-value">0.0°</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Anchor X</span>
            <span className="prop-value">960.0</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Anchor Y</span>
            <span className="prop-value">540.0</span>
          </div>
        </div>

        {/* Opacity & Blend */}
        <div className="prop-group">
          <div className="prop-group-title">Compositing</div>
          <div className="prop-row">
            <span className="prop-label">Opacity</span>
            <span className="prop-value">100%</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Blend</span>
            <span className="prop-value">Normal</span>
          </div>
        </div>

        {/* Color */}
        <div className="prop-group">
          <div className="prop-group-title">Color Correction</div>
          <div className="prop-row">
            <span className="prop-label">Lift</span>
            <div className="flex gap-1">
              <span className="w-4 h-4 rounded-full bg-red-900/60 border border-studio-border" />
              <span className="w-4 h-4 rounded-full bg-green-900/60 border border-studio-border" />
              <span className="w-4 h-4 rounded-full bg-blue-900/60 border border-studio-border" />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">Gamma</span>
            <div className="flex gap-1">
              <span className="w-4 h-4 rounded-full bg-red-700/60 border border-studio-border" />
              <span className="w-4 h-4 rounded-full bg-green-700/60 border border-studio-border" />
              <span className="w-4 h-4 rounded-full bg-blue-700/60 border border-studio-border" />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">Gain</span>
            <div className="flex gap-1">
              <span className="w-4 h-4 rounded-full bg-red-500/60 border border-studio-border" />
              <span className="w-4 h-4 rounded-full bg-green-500/60 border border-studio-border" />
              <span className="w-4 h-4 rounded-full bg-blue-500/60 border border-studio-border" />
            </div>
          </div>
          <div className="prop-row">
            <span className="prop-label">Temp</span>
            <span className="prop-value">6500K</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Tint</span>
            <span className="prop-value">0</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Saturation</span>
            <span className="prop-value">100%</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Contrast</span>
            <span className="prop-value">1.000</span>
          </div>
        </div>

        {/* Speed */}
        <div className="prop-group">
          <div className="prop-group-title">Speed</div>
          <div className="prop-row">
            <span className="prop-label">Speed</span>
            <span className="prop-value">100%</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Reverse</span>
            <span className="prop-value">Off</span>
          </div>
        </div>

        {/* Effects */}
        <div className="prop-group">
          <div className="prop-group-title">Effects</div>
          
          {effects.length === 0 ? (
            <div className="text-[10px] text-studio-muted py-2 text-center">
              No effects applied
            </div>
          ) : (
            <div className="flex flex-col gap-[2px] mb-2">
              {effects.map(eff => (
                <div key={eff.id} className="flex items-center justify-between px-2 py-1 bg-studio-surface border border-studio-border rounded text-[10px]">
                  <span>{eff.name}</span>
                  <button type="button" 
                    onClick={() => setEffects(prev => prev.filter(e => e.id !== eff.id))}
                    className="text-studio-red hover:text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <button type="button" 
            onClick={handleAddEffect}
            className="btn w-full text-studio-cyan border-dashed border-studio-cyan/30 hover:bg-studio-cyan/5 text-[10px]"
          >
            + Add Effect
          </button>
        </div>

        {/* Metadata */}
        <div className="prop-group">
          <div className="prop-group-title">Clip Info</div>
          <div className="prop-row">
            <span className="prop-label">Name</span>
            <span className="text-[10px] text-studio-text truncate max-w-[120px]">Interview_Main.mp4</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Duration</span>
            <span className="text-[10px] font-mono text-studio-secondary">00:05:00</span>
          </div>
          <div className="prop-row">
            <span className="prop-label">Codec</span>
            <span className="text-[10px] font-mono text-studio-secondary">H.264</span>
          </div>
        </div>
      </div>
    </div>
  );
}
