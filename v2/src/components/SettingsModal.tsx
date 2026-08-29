import React, { useState } from "react";
import { useAI } from "../core/context/AIContext";
import { useStudioCore } from "../core/context/StudioCoreContext";
import { useAuth } from "../core/context/AuthContext";

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { keys, updateKey, isPasswordVaultActive } = useAI();
  const { role, roleDisplayName, permissions, login, logout } = useAuth();
  const { storage } = useStudioCore();

  const [activeTab, setActiveTab] = useState<"ai" | "vault" | "storage">("vault");
  const [passwordInput, setPasswordInput] = useState("");
  const [vaultMessage, setVaultMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!isOpen) return null;

  const handleUnlockVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUnlocking(true);
    setVaultMessage(null);
    try {
      const res = await login(passwordInput.trim());
      if (res.success) {
        setVaultMessage({
          type: "success",
          text: `Authenticated as ${res.role === "admin" ? "👑 Admin" : "📺 Media Mogul User"}! Server environment keys active.`,
        });
        setPasswordInput("");
      } else {
        setVaultMessage({ type: "error", text: res.message || "Invalid password." });
      }
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLockVault = async () => {
    await logout();
    setVaultMessage({ type: "success", text: "Logged out to Guest mode. Password Vault locked." });
  };

  const handleClearCache = async () => {
    if (confirm("Are you sure you want to clear local storage cache?")) {
      await storage.clear();
      alert("Local cache cleared. Reloading page...");
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-studio-panel border border-studio-border rounded-2xl w-full max-w-xl shadow-elevated overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-studio-border bg-studio-surface/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚙️</span>
            <h2 className="text-sm font-bold text-studio-text">CryptArtist Studio v2 Settings</h2>
          </div>
          <button onClick={onClose} className="text-studio-muted hover:text-studio-text text-sm p-1">
            ✕
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-studio-border bg-studio-bg px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab("vault")}
            className={`py-2 px-3 border-b-2 font-medium transition ${
              activeTab === "vault"
                ? "border-studio-purple text-studio-purple"
                : "border-transparent text-studio-secondary hover:text-studio-text"
            }`}
          >
            🔑 Password Vault (Server Keys)
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className={`py-2 px-3 border-b-2 font-medium transition ${
              activeTab === "ai"
                ? "border-studio-cyan text-studio-cyan"
                : "border-transparent text-studio-secondary hover:text-studio-text"
            }`}
          >
            🤖 Bring Your Own Keys (BYOK)
          </button>
          <button
            onClick={() => setActiveTab("storage")}
            className={`py-2 px-3 border-b-2 font-medium transition ${
              activeTab === "storage"
                ? "border-studio-yellow text-studio-yellow"
                : "border-transparent text-studio-secondary hover:text-studio-text"
            }`}
          >
            💾 Local Storage & Cache
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Password Vault Tab */}
          {activeTab === "vault" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-gradient-to-r from-studio-purple/20 to-studio-cyan/20 border border-studio-purple/30 rounded-xl">
                <h3 className="text-xs font-bold text-white mb-1 flex items-center gap-1.5">
                  <span>🔐</span> Multi-Level Role & Password-Gated Vault
                </h3>
                <p className="text-studio-secondary leading-relaxed">
                  Enter your assigned user or admin password. This grants access based on your level: <strong className="text-studio-purple">Admin</strong> (all 15 programs + developer suite + server keys) or <strong className="text-studio-cyan">Media Mogul User</strong> (video editor + auto-edit studio).
                </p>
              </div>

              {/* Current Role Card */}
              <div className="p-3.5 bg-studio-surface border border-studio-border rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono text-studio-muted tracking-wider block">
                    Active Access Role
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <strong className="text-sm text-studio-cyan font-bold">{roleDisplayName}</strong>
                    {role === "admin" && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-purple/20 text-studio-purple font-bold border border-studio-purple/40">
                        Full Suite Privileges
                      </span>
                    )}
                    {role === "media-mogul" && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-cyan/20 text-studio-cyan font-bold border border-studio-cyan/40">
                        Media Mogul Studio
                      </span>
                    )}
                  </div>
                </div>

                {role !== "guest" ? (
                  <button
                    onClick={handleLockVault}
                    className="px-3 py-1.5 bg-studio-red/20 hover:bg-studio-red text-studio-red hover:text-white rounded-lg transition font-medium text-xs"
                  >
                    Lock / Log Out
                  </button>
                ) : (
                  <span className="text-xs text-studio-muted">Guest / Unlocked with BYOK</span>
                )}
              </div>

              {/* Permission Checklist */}
              <div className="p-3 bg-studio-surface/50 border border-studio-border rounded-xl space-y-1.5 text-[11px]">
                <span className="font-bold text-studio-text block mb-1 text-xs">Active Role Capabilities:</span>
                <div className="grid grid-cols-2 gap-1.5 text-studio-secondary">
                  <div className="flex items-center gap-1.5">
                    <span>{permissions.canAccessMediaMogul ? "✅" : "❌"}</span> Media Mogul Video Studio
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{permissions.canUseServerAIVault ? "✅" : "❌"}</span> Server AI Environment Vault
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{permissions.canAccessVibeCode ? "✅" : "🔒"}</span> VibeCode Monaco IDE
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{permissions.canAccessValleyNet ? "✅" : "🔒"}</span> ValleyNet AI Agent
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{permissions.canAccessMasterDashboard ? "✅" : "🔒"}</span> Master Command Dashboard
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>{permissions.canAccessAllPrograms ? "✅" : "🔒"}</span> All 15 Suite Programs
                  </div>
                </div>
              </div>

              <form onSubmit={handleUnlockVault} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-studio-text block mb-1">
                    {role === "guest" ? "Enter Assigned Password" : "Switch Access Password"}
                  </label>
                  <input
                    type="password"
                    placeholder="Enter Admin or Media Mogul password..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-studio-surface border border-studio-border rounded-lg p-2.5 text-xs text-studio-text focus:outline-none focus:border-studio-purple"
                  />
                </div>

                {vaultMessage && (
                  <div
                    className={`p-2.5 rounded-lg text-xs ${
                      vaultMessage.type === "success"
                        ? "bg-studio-green/20 text-studio-green border border-studio-green/30"
                        : "bg-studio-red/20 text-studio-red border border-studio-red/30"
                    }`}
                  >
                    {vaultMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isUnlocking}
                  className="w-full py-2.5 bg-studio-purple hover:bg-studio-purple/80 text-white font-bold rounded-lg transition shadow-glow-purple flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <span>{isUnlocking ? "Verifying..." : "🔓 Unlock Role & Vault"}</span>
                </button>
              </form>
            </div>
          )}

          {/* BYOK Tab */}
          {activeTab === "ai" && (
            <div className="space-y-3">
              <p className="text-studio-muted">
                Keys are securely stored strictly inside your browser's local storage and are never uploaded.
              </p>

              <div>
                <label className="text-xs font-bold text-studio-text block mb-1">OpenRouter API Key</label>
                <input
                  type="password"
                  placeholder="sk-or-v1-..."
                  value={keys.openrouterKey}
                  onChange={(e) => updateKey("openrouterKey", e.target.value)}
                  className="w-full bg-studio-surface border border-studio-border rounded-lg p-2 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-studio-text block mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  placeholder="sk-proj-..."
                  value={keys.openaiKey}
                  onChange={(e) => updateKey("openaiKey", e.target.value)}
                  className="w-full bg-studio-surface border border-studio-border rounded-lg p-2 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-studio-text block mb-1">Pexels API Key (Stock Media)</label>
                <input
                  type="password"
                  placeholder="Enter Pexels key..."
                  value={keys.pexelsKey}
                  onChange={(e) => updateKey("pexelsKey", e.target.value)}
                  className="w-full bg-studio-surface border border-studio-border rounded-lg p-2 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-studio-text block mb-1">Default AI Model</label>
                <input
                  type="text"
                  placeholder="openai/gpt-4o-mini"
                  value={keys.defaultModel}
                  onChange={(e) => updateKey("defaultModel", e.target.value)}
                  className="w-full bg-studio-surface border border-studio-border rounded-lg p-2 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                />
              </div>
            </div>
          )}

          {/* Local Storage & Cache Tab */}
          {activeTab === "storage" && (
            <div className="space-y-4">
              <div className="p-3 bg-studio-surface border border-studio-border rounded-xl">
                <span className="font-bold text-studio-text block mb-1">Origin Private File System (OPFS)</span>
                <p className="text-[11px] text-studio-muted">
                  Media Mogul v2 caches high-resolution video streams in OPFS and IndexedDB for instantaneous timeline playback.
                </p>
              </div>

              <button
                onClick={handleClearCache}
                className="w-full py-2 bg-studio-red/20 hover:bg-studio-red text-studio-red hover:text-white font-bold rounded-lg transition"
              >
                Clear All Local Cache & Reset
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-studio-border bg-studio-surface/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-xs rounded-lg transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
