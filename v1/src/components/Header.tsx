/* Wave2: type=button applied */
import { useState, useRef, useEffect } from "react";
import type { Workspace } from "../App";

interface HeaderProps {
  workspace: Workspace;
  setWorkspace: (ws: Workspace) => void;
  onOpenSettings: () => void;
}

const workspaces: { id: Workspace; label: string; icon: string }[] = [
  { id: "edit", label: "Edit", icon: "✂️" },
  { id: "node-mode", label: "Node Mode", icon: "🔗" },
  { id: "color", label: "Color", icon: "🎨" },
  { id: "audio", label: "Audio", icon: "🎵" },
  { id: "ai", label: "AI Studio", icon: "🤖" },
  { id: "deliver", label: "Deliver", icon: "📦" },
];

export default function Header({ workspace, setWorkspace, onOpenSettings }: HeaderProps) {
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfile(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 min-w-[180px]">
        <span className="text-xl leading-none" role="img" aria-label="CryptArtist logo">
          💀🎨
        </span>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">
            CryptArtist
          </span>
          <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">
            Studio
          </span>
        </div>
      </div>

      {/* Workspace Tabs */}
      <nav className="flex items-center justify-center flex-1 gap-1">
        {workspaces.map((ws) => (
          <button
            key={ws.id}
            onClick={() => setWorkspace(ws.id)}
            className={`
              flex items-center gap-[6px] px-4 py-[6px] rounded-md text-[11px] font-semibold
              tracking-wide uppercase transition-all duration-150
              ${
                workspace === ws.id
                  ? "bg-studio-elevated text-studio-text border border-studio-border-bright shadow-md"
                  : "text-studio-secondary hover:text-studio-text hover:bg-studio-surface border border-transparent"
              }
            `}
          >
            <span className="text-sm">{ws.icon}</span>
            {ws.label}
          </button>
        ))}
      </nav>

      {/* Right Actions */}
      <div className="flex items-center gap-2 px-4 min-w-[180px] justify-end">
        <button type="button"
          onClick={onOpenSettings}
          className="btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors"
          title="Settings"
        >
          ⚙️
        </button>
        <div className="relative" ref={notifRef}>
          <button type="button" 
            onClick={() => setShowNotifs(!showNotifs)}
            className={`btn-ghost rounded-md px-2 py-1 text-sm hover:bg-studio-hover transition-colors ${showNotifs ? "bg-studio-hover" : ""}`} 
            title="Notifications"
          >
            🔔
          </button>
          
          {showNotifs && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-studio-surface border border-studio-border shadow-xl rounded-md z-50 p-2 animate-fade-in">
              <h4 className="text-[11px] font-semibold mb-2 px-1 text-studio-text border-b border-studio-border pb-1">Notifications</h4>
              <div className="flex flex-col gap-1">
                <div className="p-2 hover:bg-studio-hover rounded cursor-pointer transition-colors">
                  <div className="text-[10px] text-studio-cyan font-semibold">Render Complete</div>
                  <div className="text-[9px] text-studio-muted mt-1">"Interview_Main.mp4" finished rendering in 42s.</div>
                </div>
                <div className="p-2 hover:bg-studio-hover rounded cursor-pointer transition-colors">
                  <div className="text-[10px] text-studio-yellow font-semibold">Cloud Sync Defaulted</div>
                  <div className="text-[9px] text-studio-muted mt-1">Sign in to sync your project to the cloud.</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button type="button" 
            onClick={() => setShowProfile(!showProfile)}
            className="w-7 h-7 rounded-full bg-gradient-to-br from-studio-accent to-studio-purple flex items-center justify-center text-[11px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            C
          </button>
          
          {showProfile && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-studio-surface border border-studio-border shadow-xl rounded-md z-50 py-1 animate-fade-in">
              <div className="px-3 py-2 border-b border-studio-border">
                <div className="text-[11px] font-semibold text-studio-text">CryptArtist</div>
                <div className="text-[9px] text-studio-muted">Pro Subscription</div>
              </div>
              <div className="py-1">
            {/* Improvement 507: A11y & Microinteraction */}
                <button className="transition-transform active:scale-95 w-full text-left px-3 py-1.5 text-[10px] hover:bg-studio-hover transition-colors">Account Settings</button>
            {/* Improvement 508: A11y & Microinteraction */}
                <button className="transition-transform active:scale-95 w-full text-left px-3 py-1.5 text-[10px] hover:bg-studio-hover transition-colors">Manage Cloud Storage</button>
            {/* Improvement 509: A11y & Microinteraction */}
                <button className="transition-transform active:scale-95 w-full text-left px-3 py-1.5 text-[10px] hover:bg-studio-hover transition-colors text-studio-red">Sign Out</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
