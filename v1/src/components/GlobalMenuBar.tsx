/* Wave2: type=button applied */
// ---------------------------------------------------------------------------
// CryptArtist Studio - Global Menu Bar
// Top-bar menu: File, Edit, Selection, View, Go, Run, Terminal, Help, MattyJacks.com
// Mobile-compatible with hamburger menu
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { logger } from "../utils/logger";

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
  href?: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

export default function GlobalMenuBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpenMenu(null); setMobileOpen(false); }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  const closeAll = useCallback(() => { setOpenMenu(null); setMobileOpen(false); }, []);

  const handleAction = useCallback((item: MenuItem) => {
    if (item.disabled) return;
    if (item.href) window.open(item.href, "_blank", "noopener,noreferrer");
    else if (item.action) item.action();
    closeAll();
  }, [closeAll]);

  const menus: MenuGroup[] = [
    {
      label: "File",
      items: [
        { label: "New Project", shortcut: "Ctrl+N", action: () => navigate("/") },
        { label: "Open .CryptArt...", shortcut: "Ctrl+O" },
        { separator: true, label: "" },
        { label: "Save", shortcut: "Ctrl+S" },
        { label: "Save As...", shortcut: "Ctrl+Shift+S" },
        { separator: true, label: "" },
        { label: "Import Audio ZIP...", action: () => document.dispatchEvent(new CustomEvent("cryptartist:import-audio-zip")) },
        { label: "Export Project..." },
        { separator: true, label: "" },
        { label: "Settings", shortcut: "Ctrl+,", action: () => navigate("/settings") },
        { separator: true, label: "" },
        { label: "Exit", shortcut: "Alt+F4" },
      ],
    },
    {
      label: "Edit",
      items: [
        { label: "Undo", shortcut: "Ctrl+Z", action: () => document.execCommand("undo") },
        { label: "Redo", shortcut: "Ctrl+Shift+Z", action: () => document.execCommand("redo") },
        { separator: true, label: "" },
        { label: "Cut", shortcut: "Ctrl+X", action: () => document.execCommand("cut") },
        { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
        { label: "Paste", shortcut: "Ctrl+V", action: () => document.execCommand("paste") },
        { label: "Delete", shortcut: "Del" },
        { separator: true, label: "" },
        { label: "Select All", shortcut: "Ctrl+A", action: () => document.execCommand("selectAll") },
        { separator: true, label: "" },
        { label: "Find...", shortcut: "Ctrl+F" },
        { label: "Find and Replace...", shortcut: "Ctrl+H" },
      ],
    },
    {
      label: "Selection",
      items: [
        { label: "Select All", shortcut: "Ctrl+A", action: () => document.execCommand("selectAll") },
        { label: "Expand Selection", shortcut: "Shift+Alt+Right" },
        { label: "Shrink Selection", shortcut: "Shift+Alt+Left" },
        { separator: true, label: "" },
        { label: "Copy Line Up", shortcut: "Shift+Alt+Up" },
        { label: "Copy Line Down", shortcut: "Shift+Alt+Down" },
        { label: "Move Line Up", shortcut: "Alt+Up" },
        { label: "Move Line Down", shortcut: "Alt+Down" },
      ],
    },
    {
      label: "View",
      items: [
        { label: "🗺️ Suite Launcher [SLr]", shortcut: "Ctrl+Home", action: () => navigate("/") },
        { separator: true, label: "" },
        { label: "Toggle Full Screen", shortcut: "F11", action: () => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        }},
        { label: "Zoom In", shortcut: "Ctrl++" },
        { label: "Zoom Out", shortcut: "Ctrl+-" },
        { label: "Reset Zoom", shortcut: "Ctrl+0" },
        { separator: true, label: "" },
        { label: "Toggle Sidebar", shortcut: "Ctrl+B" },
        { label: "Toggle Status Bar" },
      ],
    },
    {
      label: "Go",
      items: [
        { label: "🗺️ Suite Launcher [SLr]", shortcut: "Home", action: () => navigate("/") },
        { separator: true, label: "" },
        { label: "Media Mogul", shortcut: "Ctrl+1", action: () => navigate("/media-mogul") },
        { label: "VibeCodeWorker", shortcut: "Ctrl+2", action: () => navigate("/vibecode-worker") },
        { label: "DemoRecorder", shortcut: "Ctrl+3", action: () => navigate("/demo-recorder") },
        { label: "ValleyNet", shortcut: "Ctrl+4", action: () => navigate("/valley-net") },
        { label: "GameStudio", shortcut: "Ctrl+5", action: () => navigate("/game-studio") },
        { label: "CryptArt Commander", shortcut: "Ctrl+6", action: () => navigate("/commander") },
        { label: "DonatePersonalSeconds", shortcut: "Ctrl+7", action: () => navigate("/donate-personal-seconds") },
        { label: "Clone Tool", shortcut: "Ctrl+8", action: () => navigate("/clone-tool") },
        { label: "Luck Factory", action: () => navigate("/luck-factory") },
        { label: "DictatePic", action: () => navigate("/dictate-pic") },
        { label: "Settings", shortcut: "Ctrl+9", action: () => navigate("/settings") },
      ],
    },
    {
      label: "Run",
      items: [
        { label: "Run Current Task", shortcut: "F5" },
        { label: "Run Without Debugging", shortcut: "Ctrl+F5" },
        { separator: true, label: "" },
        { label: "Start Recording", action: () => navigate("/demo-recorder") },
        { label: "Start AI Agent", action: () => navigate("/valley-net") },
        { label: "Build Installer...", action: () => navigate("/clone-tool") },
      ],
    },
    {
      label: "Terminal",
      items: [
        { label: "Open Commander", shortcut: "Ctrl+`", action: () => navigate("/commander") },
        { separator: true, label: "" },
        { label: "Run Command..." },
        { label: "Run Script..." },
        { label: "Clear Terminal" },
      ],
    },
    {
      label: "Help",
      items: [
        { label: "Welcome", action: () => navigate("/") },
        { label: "Documentation", href: "https://mattyjacks.com" },
        { label: "Release Notes" },
        { separator: true, label: "" },
        { label: "Report Issue", href: "https://github.com/mattyjacks/CryptArtistStudio/issues" },
        { label: "View on GitHub", href: "https://github.com/mattyjacks/CryptArtistStudio" },
        { separator: true, label: "" },
        { label: "Privacy Policy", action: () => navigate("/privacy") },
        { label: "Terms of Use", action: () => navigate("/terms") },
        { separator: true, label: "" },
        { label: "About CryptArtist Studio", action: () => navigate("/settings") },
      ],
    },
    {
      label: "MattyJacks.com",
      items: [
        { label: "Visit MattyJacks.com", href: "https://mattyjacks.com" },
        { label: "GiveGigs.com", href: "https://givegigs.com" },
        { label: "SiteFari.com", href: "https://sitefari.com" },
        { separator: true, label: "" },
        { label: "GitHub", href: "https://github.com/mattyjacks" },
      ],
    },
  ];

  const renderDropdown = (items: MenuItem[]) => (
    <div className="absolute top-7 left-0 z-[200] min-w-[220px] py-1 bg-studio-panel border border-studio-border rounded-lg shadow-xl shadow-black/30 animate-fade-in">
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="h-px bg-studio-border mx-2 my-1" />
        ) : (
          <button
            key={i}
            onClick={() => handleAction(item)}
            disabled={item.disabled}
            className="w-full flex items-center justify-between px-3 py-1 text-[11px] text-studio-secondary hover:bg-studio-cyan/10 hover:text-studio-text disabled:opacity-40 disabled:cursor-default transition-colors"
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-[9px] text-studio-muted ml-4 font-mono">{item.shortcut}</span>
            )}
            {item.href && (
              <span className="text-[9px] text-studio-muted ml-2">{"\u2197"}</span>
            )}
          </button>
        )
      )}
    </div>
  );

  return (
    <nav ref={menuBarRef} className="shrink-0 z-[100]" aria-label="Main menu">
      {/* Desktop Menu Bar */}
      <div className="hidden sm:flex items-center h-7 bg-studio-panel border-b border-studio-border px-1 select-none">
        <button type="button"
          onClick={() => navigate("/")}
          className="px-2 h-full flex items-center text-[11px] hover:bg-studio-surface transition-colors rounded-sm"
          title="CryptArtist Studio"
        >
          {"\u{1F3A8}"}
        </button>

        {menus.map((menu) => (
          <div key={menu.label} className="relative">
            <button type="button"
              onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)}
              onMouseEnter={() => { if (openMenu) setOpenMenu(menu.label); }}
              className={`px-2.5 h-7 text-[11px] transition-colors rounded-sm whitespace-nowrap ${
                openMenu === menu.label
                  ? "bg-studio-cyan/10 text-studio-cyan"
                  : "text-studio-secondary hover:bg-studio-surface hover:text-studio-text"
              } ${menu.label === "MattyJacks.com" ? "text-cyan-400 font-semibold" : ""}`}
            >
              {menu.label}
            </button>
            {openMenu === menu.label && renderDropdown(menu.items)}
          </div>
        ))}

        {/* Right side: current path */}
        <div className="ml-auto text-[9px] text-studio-muted px-2 font-mono truncate max-w-[200px]">
          {location.pathname === "/" ? "Home" : location.pathname.replace("/", "")}
        </div>
      </div>

      {/* Mobile Menu Bar */}
      <div className="flex sm:hidden items-center h-10 bg-studio-panel border-b border-studio-border px-2 select-none">
        <button type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="px-2 py-1 text-lg hover:bg-studio-surface rounded transition-colors"
        >
          {mobileOpen ? "\u2715" : "\u2630"}
        </button>
        <span className="ml-2 text-[11px] font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          CryptArtist Studio
        </span>
        <div className="ml-auto text-[9px] text-studio-muted font-mono">
          {location.pathname === "/" ? "Home" : location.pathname.replace("/", "")}
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="sm:hidden fixed inset-x-0 top-10 bottom-0 z-[200] bg-studio-bg/95 backdrop-blur-md overflow-y-auto animate-fade-in">
          <div className="p-3 space-y-2">
            {menus.map((menu) => (
              <div key={menu.label}>
                <div className="text-[10px] font-bold text-studio-cyan uppercase tracking-wider px-2 py-1">
                  {menu.label}
                </div>
                {menu.items.filter((item) => !item.separator).map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleAction(item)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[12px] text-studio-secondary hover:bg-studio-surface rounded-lg transition-colors"
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="text-[9px] text-studio-muted font-mono">{item.shortcut}</span>}
                    {item.href && <span className="text-[9px] text-studio-muted">{"\u2197"}</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
