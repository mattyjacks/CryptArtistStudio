import React, { useState } from "react";
import { useAuth } from "../core/context/AuthContext";

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { role, roleDisplayName, login, logout, targetProgramName } = useAuth();
  const [passwordInput, setPasswordInput] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const res = await login(passwordInput.trim());
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Successfully unlocked as ${res.role === "admin" ? "👑 Admin" : "📺 Media Mogul User"}!`,
        });
        setPasswordInput("");
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        setFeedback({
          type: "error",
          text: res.message || "Invalid access password.",
        });
      }
    } catch {
      setFeedback({ type: "error", text: "Authentication failed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setFeedback({ type: "success", text: "Logged out. Switched to Guest mode." });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-studio-panel border border-studio-border rounded-2xl w-full max-w-md shadow-elevated overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-4 border-b border-studio-border bg-studio-surface/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <h2 className="text-sm font-bold text-studio-text">
              {targetProgramName ? `Unlock ${targetProgramName}` : "Role & Access Authentication"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-studio-muted hover:text-studio-text text-sm p-1 transition"
          >
            ✕
          </button>
        </div>

        {/* Current Role Card */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-studio-surface border border-studio-border rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono text-studio-muted tracking-wider block">
                Current Access Level
              </span>
              <strong className="text-sm text-studio-cyan font-bold">{roleDisplayName}</strong>
            </div>

            {role !== "guest" && (
              <button
                onClick={handleLogout}
                className="px-2.5 py-1 text-xs rounded-lg bg-studio-red/20 hover:bg-studio-red text-studio-red hover:text-white transition font-semibold"
              >
                Log Out / Lock
              </button>
            )}
          </div>

          {/* Access Levels Description */}
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-lg bg-studio-surface/50 border border-studio-border/60">
              <div className="font-bold text-studio-purple flex items-center gap-1.5 mb-1">
                <span>👑</span> Admin Role (Full Access)
              </div>
              <p className="text-[11px] text-studio-secondary leading-relaxed">
                Unlocks all 15 suite programs, VibeCode Monaco IDE, ValleyNet AI Agent, Master Dashboard, and server AI proxy. Configured via <code className="text-studio-purple font-mono">ADMIN_PASSWORD</code> env var.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-studio-surface/50 border border-studio-border/60">
              <div className="font-bold text-studio-cyan flex items-center gap-1.5 mb-1">
                <span>📺</span> Media Mogul User Role
              </div>
              <p className="text-[11px] text-studio-secondary leading-relaxed">
                Unlocks flagship Media Mogul video editor, 3-way color grading, audio mixer, teleprompter, and AI auto-edit features. Configured via <code className="text-studio-cyan font-mono">MEDIA_MOGUL_PASSWORD</code> env var.
              </p>
            </div>
          </div>

          {/* Password Input Form */}
          <form onSubmit={handleLogin} className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-bold text-studio-text block mb-1">
                Enter Assigned Password
              </label>
              <input
                type="password"
                placeholder="Enter Admin or Media Mogul password..."
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-studio-surface border border-studio-border rounded-xl p-2.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
              />
            </div>

            {feedback && (
              <div
                className={`p-2.5 rounded-lg text-xs ${
                  feedback.type === "success"
                    ? "bg-studio-green/20 border border-studio-green/30 text-studio-green"
                    : "bg-studio-red/20 border border-studio-red/30 text-studio-red"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !passwordInput.trim()}
              className="w-full py-2.5 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-xs rounded-xl transition shadow-glow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Authenticating..." : "🔓 Unlock Access"}</span>
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-studio-border bg-studio-surface/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-text font-semibold text-xs rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
