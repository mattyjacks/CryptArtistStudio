import { Link, useLocation } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mobile-friendly bottom navigation bar - shown on small screens
// ---------------------------------------------------------------------------

const navItems = [
  { path: "/", label: "Home", icon: "\u{1F480}\u{1F3A8}" },
  { path: "/media-mogul", label: "Media", icon: "\u{1F4FA}" },
  { path: "/vibecode-worker", label: "Code", icon: "\u{1F469}\u{1F3FB}\u200D\u{1F4BB}" },
  { path: "/demo-recorder", label: "Record", icon: "\u{1F3A5}" },
  { path: "/valley-net", label: "AI Agent", icon: "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F" },
  { path: "/game-studio", label: "Games", icon: "\u{1F3AE}" },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-studio-panel border-t border-studio-border flex items-center justify-around py-1.5 px-2 md:hidden safe-area-bottom">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors min-w-[56px] ${
              isActive
                ? "text-studio-cyan bg-studio-cyan/10"
                : "text-studio-muted hover:text-studio-text"
            }`}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[9px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
