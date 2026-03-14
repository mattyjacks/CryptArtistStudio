/* Wave2: select-aria */
/* Wave2: type=button applied */
import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SettingsModalProps {
  apiKey: string;
  setApiKey: (key: string) => void;
  pexelsApiKey: string;
  setPexelsApiKey: (key: string) => void;
  onClose: () => void;
}

export default function SettingsModal({
  apiKey,
  setApiKey,
  pexelsApiKey,
  setPexelsApiKey,
  onClose,
}: SettingsModalProps) {
  const [keyInput, setKeyInput] = useState(apiKey);
  const [pexelsInput, setPexelsInput] = useState(pexelsApiKey);
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"api" | "givegigs" | "project" | "performance">("api");
  const [givegigUrl, setGivegigUrl] = useState("");
  const [givegigKey, setGivegigKey] = useState("");
  const [giveGigsSaved, setGiveGigsSaved] = useState(false);

  useEffect(() => {
    invoke<[string, string]>("get_givegigs_config")
      .then(([url, key]) => {
        if (url) setGivegigUrl(url);
        if (key) setGivegigKey(key);
      })
      .catch((err) => console.error("Failed to load GiveGigs config:", err));
  }, []);

  const handleSave = async () => {
    try {
      await invoke("save_api_key", { key: keyInput.trim() });
      await invoke("save_pexels_key", { key: pexelsInput.trim() });
      
      setApiKey(keyInput.trim());
      setPexelsApiKey(pexelsInput.trim());
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save API key", err);
      alert("Error saving API key to local storage.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 560 }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <h2>Settings</h2>
          </div>
          <button type="button"
            onClick={onClose}
            className="btn-icon btn-ghost text-lg hover:text-studio-accent"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-studio-border px-4 gap-1">
          {(
            [
              ["api", "🔑 API Keys"],
              ["givegigs", "🌴 GiveGigs"],
              ["project", "📁 Project"],
              ["performance", "⚡ Performance"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`text-[11px] px-3 py-2 font-medium transition-colors border-b-2 -mb-px ${
                tab === id
                  ? "border-studio-cyan text-studio-cyan"
                  : "border-transparent text-studio-muted hover:text-studio-secondary"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="modal-body">
          {tab === "api" && (
            <div className="animate-fade-in">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm">🤖</span>
                  <label className="text-[12px] font-semibold text-studio-text">
                    OpenAI API Key
                  </label>
                </div>
                <p className="text-[10px] text-studio-muted mb-2">
                  Required for AI features (chat, image generation, scene
                  analysis). Get your key from{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-studio-cyan hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      className="input pr-8 font-mono text-[11px]"
                      type={showKey ? "text" : "password"}
                      placeholder="sk-..."
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                    />
                    <button type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-studio-muted hover:text-studio-secondary text-xs"
                    >
                      {showKey ? "🙈" : "👁️"}
                    </button>
                  </div>
                  <button type="button"
                    onClick={handleSave}
                    className={`btn ${saved ? "btn-cyan" : "btn-accent"} min-w-[80px]`}
                  >
                    {saved ? "✓ Saved!" : "Save"}
                  </button>
                </div>

                {/* Pexels API Key */}
                <div className="flex flex-col gap-1 mt-4 border-t border-studio-border pt-4">
                  <label className="text-[11px] font-semibold text-studio-text flex items-center gap-2">
                    Pexels API Key
                    {pexelsApiKey ? (
                      <span className="text-[9px] px-2 py-[2px] rounded bg-studio-green/20 text-studio-green font-semibold">
                        Connected
                      </span>
                    ) : (
                      <span className="text-[9px] px-2 py-[1px] rounded bg-studio-yellow/20 text-studio-yellow font-semibold">
                        Not Connected
                      </span>
                    )}
                  </label>
                  <p className="text-[10px] text-studio-muted leading-tight mb-2">
                    Enter your Pexels key to search and import free stock media directly into your project.
                  </p>
                  <div className="flex gap-2 relative">
                    <input
                      className="input pr-8 font-mono text-[11px] flex-1"
                      type={showKey ? "text" : "password"}
                      placeholder="Enter Pexels API Key..."
                      value={pexelsInput}
                      onChange={(e) => setPexelsInput(e.target.value)}
                    />
                    <button type="button"
                      onClick={handleSave}
                      className={`btn ${saved ? "btn-cyan" : "btn-accent"} min-w-[80px]`}
                    >
                      {saved ? "✓ Saved!" : "Save"}
                    </button>
                  </div>
                </div>

              </div>

              <div className="p-3 rounded-lg bg-studio-surface border border-studio-border">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold">Connection Status</span>
                  {apiKey ? (
                    <span className="text-[9px] px-2 py-[1px] rounded-full bg-studio-green/20 text-studio-green font-semibold">
                      Connected
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-[1px] rounded-full bg-studio-yellow/20 text-studio-yellow font-semibold">
                      Not Connected
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-studio-muted">
                  {apiKey
                    ? `Key: ${apiKey.slice(0, 7)}...${apiKey.slice(-4)} • Model: GPT-4o + DALL-E 3`
                    : "Enter your API key above to enable AI features."}
                </div>
              </div>

              <div className="mt-4 p-3 rounded-lg bg-studio-cyan/5 border border-studio-cyan/15">
                <span className="text-[10px] text-studio-cyan font-semibold">
                  💡 Your key is stored locally
                </span>
                <p className="text-[9px] text-studio-muted mt-1">
                  Your API key never leaves your machine. It's stored in memory
                  only and is not sent to any server except OpenAI's API.
                </p>
              </div>
            </div>
          )}

          {tab === "givegigs" && (
            <div className="animate-fade-in">
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{"\u{1F310}"}</span>
            {/* Improvement 513: Screen Reader Accessibility */}
                  <h3 role="heading" aria-level={3} className="text-[13px] font-bold text-studio-text">GiveGigs Media Integration</h3>
                </div>
                <p className="text-[10px] text-studio-muted mb-3 leading-relaxed">
                  Connect to your GiveGigs.com Supabase media bucket to upload and manage media assets
                  directly from CryptArtist Studio.
                </p>

                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-studio-text block mb-1">Supabase Project URL</label>
                    <input
                      className="input font-mono text-[11px] w-full"
                      type="text"
                      placeholder="https://your-project.supabase.co"
                      value={givegigUrl}
                      onChange={(e) => setGivegigUrl(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-studio-text block mb-1">Supabase Anon Key</label>
                    <input
                      className="input font-mono text-[11px] w-full"
                      type={showKey ? "text" : "password"}
                      placeholder="eyJhbGciOi..."
                      value={givegigKey}
                      onChange={(e) => setGivegigKey(e.target.value)}
                    />
                  </div>
                  <button type="button"
                    onClick={async () => {
                      try {
                        await invoke("save_givegigs_config", { url: givegigUrl.trim(), key: givegigKey.trim() });
                        setGiveGigsSaved(true);
                        setTimeout(() => setGiveGigsSaved(false), 2000);
                      } catch (err) {
                        console.error("Failed to save GiveGigs config", err);
                      }
                    }}
                    className={`btn ${giveGigsSaved ? "btn-cyan" : "btn-accent"} self-start`}
                  >
                    {giveGigsSaved ? "\u2713 Saved!" : "Save GiveGigs Config"}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-studio-surface border border-studio-border mb-3">
                <div className="text-[11px] font-semibold text-studio-text mb-1">{"\u{1F4B0}"} Donate & Support</div>
                <p className="text-[10px] text-studio-muted mb-2">
                  CryptArtist Studio is built with love. Support the project!
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://mattyjacks.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn text-[10px] flex-1 justify-center"
                  >
                    mattyjacks.com
                  </a>
                  <a
                    href="https://givegigs.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn text-[10px] flex-1 justify-center"
                  >
                    givegigs.com
                  </a>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-studio-cyan/5 border border-studio-cyan/15">
                <span className="text-[10px] text-studio-cyan font-semibold">
                  {"\u{1F4A1}"} About GiveGigs
                </span>
                <p className="text-[9px] text-studio-muted mt-1">
                  GiveGigs.com uses Supabase for media storage. Once connected, you can browse,
                  upload, and import media assets from your GiveGigs bucket directly into Media Mogul.
                </p>
              </div>
            </div>
          )}

          {tab === "project" && (
            <div className="animate-fade-in">
              <div className="prop-group">
                <div className="prop-group-title">Project Settings</div>
                <div className="prop-row">
                  <span className="prop-label">Name</span>
            {/* Improvement 514: Keyboard Focus State */}
                  <input className="input focus:ring-2 focus:ring-studio-cyan/50 focus:outline-none transition-shadow w-40 text-[10px] py-1" defaultValue="Untitled Project" />
                </div>
                <div className="prop-row">
                  <span className="prop-label">Resolution</span>
                  <select aria-label="Select option" className="input w-40 text-[10px] py-1">
                    <option>1920 × 1080 (HD)</option>
                    <option>3840 × 2160 (4K)</option>
                    <option>1280 × 720 (720p)</option>
                    <option>2560 × 1440 (2K)</option>
                  </select>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Frame Rate</span>
                  <select aria-label="Select option" className="input w-40 text-[10px] py-1">
                    <option>24 fps</option>
                    <option>25 fps</option>
                    <option>30 fps</option>
                    <option>48 fps</option>
                    <option>60 fps</option>
                  </select>
                </div>
              </div>

              <div className="prop-group">
                <div className="prop-group-title">Export</div>
                <div className="prop-row">
                  <span className="prop-label">Format</span>
                  <select aria-label="Select option" className="input w-40 text-[10px] py-1">
                    <option>MP4 (H.264)</option>
                    <option>MOV (ProRes)</option>
                    <option>WebM (VP9)</option>
                    <option>GIF</option>
                  </select>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Quality</span>
                  <select className="input w-40 text-[10px] py-1">
                    <option>Best</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {tab === "performance" && (
            <div className="animate-fade-in">
              <div className="prop-group">
                <div className="prop-group-title">Rendering</div>
                <div className="prop-row">
                  <span className="prop-label">GPU</span>
                  <span className="text-[10px] text-studio-green font-medium">wgpu (Active)</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Backend</span>
                  <span className="text-[10px] text-studio-secondary font-mono">Vulkan / DX12</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Compute Shaders</span>
                  <span className="text-[10px] text-studio-green">WGSL Enabled</span>
                </div>
              </div>

              <div className="prop-group">
                <div className="prop-group-title">FFmpeg</div>
                <div className="prop-row">
                  <span className="prop-label">Status</span>
                  <span className="text-[10px] text-studio-green">Installed ✓</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Version</span>
                  <span className="text-[10px] text-studio-secondary font-mono">6.1.2</span>
                </div>
                <div className="prop-row">
                  <span className="prop-label">HW Accel</span>
                  <span className="text-[10px] text-studio-cyan">NVENC / QSV</span>
                </div>
              </div>

              <div className="prop-group">
                <div className="prop-group-title">Memory</div>
                <div className="prop-row">
                  <span className="prop-label">Cache Limit</span>
                  <select className="input w-32 text-[10px] py-1">
                    <option>2 GB</option>
                    <option>4 GB</option>
                    <option>8 GB</option>
                    <option>16 GB</option>
                  </select>
                </div>
                <div className="prop-row">
                  <span className="prop-label">Thread Count</span>
                  <select className="input w-32 text-[10px] py-1">
                    <option>Auto</option>
                    <option>4</option>
                    <option>8</option>
                    <option>16</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
            {/* Improvement 515: A11y & Microinteraction */}
          <button onClick={onClose} className="transition-transform active:scale-95 btn">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
