import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../core/context/AuthContext";
import { UserRole } from "../core/types/auth.types";

export interface RoleGateProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
  programName: string;
  programEmoji?: string;
  programShortCode?: string;
}

export const RoleGate: React.FC<RoleGateProps> = ({
  children,
  requiredRole = "admin",
  programName,
  programEmoji = "🔒",
  programShortCode,
}) => {
  const { role, login, roleDisplayName } = useAuth();
  const [passwordInput, setPasswordInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If user has admin role, full access granted to everything
  if (role === "admin") {
    return <>{children}</>;
  }

  // If required role is media-mogul and user has media-mogul, access granted
  if (requiredRole === "media-mogul" && role === "media-mogul") {
    return <>{children}</>;
  }

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await login(passwordInput.trim());
      if (!res.success) {
        setErrorMessage(res.message || "Invalid password.");
      } else if (requiredRole === "admin" && res.role !== "admin") {
        setErrorMessage("Password accepted for Media Mogul, but Admin password is required for this tool.");
      }
    } catch {
      setErrorMessage("Authentication failed. Please check password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg text-studio-text overflow-hidden select-none">
      {/* Top Header */}
      <header className="h-12 border-b border-studio-border bg-studio-panel px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-2.5 py-1 text-xs rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-secondary hover:text-studio-cyan transition"
          >
            ← Back to Suite
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">{programEmoji}</span>
            <span className="font-bold text-sm text-white">
              {programName} {programShortCode ? `[${programShortCode}]` : ""}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-full bg-studio-surface border border-studio-border text-studio-secondary">
            Current Access: <strong className="text-studio-text">{roleDisplayName}</strong>
          </span>
        </div>
      </header>

      {/* Access Gate Card */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-studio-surface border border-studio-border/60 flex items-center justify-center text-5xl shadow-elevated">
            {programEmoji}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-studio-purple text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-glow-purple flex items-center gap-1 border border-studio-purple/50">
            <span>👑</span> Admin Access
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white tracking-tight">
            Admin Access Required
          </h2>
          <p className="text-xs text-studio-secondary leading-relaxed">
            <span className="text-white font-semibold">{programName}</span> is reserved for users with the{" "}
            <span className="text-studio-purple font-bold">Admin Role</span>. Your current account level is{" "}
            <span className="text-studio-cyan font-bold">{roleDisplayName}</span>.
          </p>
        </div>

        {/* Password Upgrade Form */}
        <div className="w-full bg-studio-panel border border-studio-border rounded-2xl p-5 shadow-panel text-left space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-studio-text">
              🔑 Enter Admin Password to Unlock
            </span>
            <span className="text-[10px] font-mono text-studio-muted">
              ADMIN_PASSWORD env var
            </span>
          </div>

          <form onSubmit={handleUnlock} className="space-y-3">
            <input
              type="password"
              placeholder="Enter admin password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-studio-surface border border-studio-border rounded-xl px-3.5 py-2.5 text-xs text-studio-text focus:outline-none focus:border-studio-purple"
            />

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-studio-red/20 border border-studio-red/40 text-studio-red text-xs">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !passwordInput.trim()}
              className="w-full py-2.5 bg-studio-purple hover:bg-studio-purple/80 text-white font-bold text-xs rounded-xl transition shadow-glow-purple flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? "Verifying..." : "👑 Upgrade & Enter Program"}</span>
            </button>
          </form>
        </div>

        {/* Navigation Quick Links */}
        <div className="flex items-center gap-3 pt-2">
          <Link
            to="/web/mediamogul"
            className="px-5 py-2 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-xs rounded-xl transition shadow-glow-sm flex items-center gap-1.5"
          >
            <span>📺</span> Return to Media Mogul
          </Link>
          <Link
            to="/"
            className="px-4 py-2 bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-text font-semibold text-xs rounded-xl transition"
          >
            Suite Launcher
          </Link>
        </div>
      </main>
    </div>
  );
};

export default RoleGate;
