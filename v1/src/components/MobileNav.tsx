import { Link, useLocation } from "react-router-dom";

// ---------------------------------------------------------------------------
// Mobile & tablet bottom navigation bar
// Scrollable on phones, shows all items on tablets
// ---------------------------------------------------------------------------

const navItems = [
  { path: "/", label: "Home", icon: "\u{1F480}\u{1F3A8}" },
  { path: "/media-mogul", label: "Media", icon: "\u{1F4FA}" },
  { path: "/vibecode-worker", label: "Code", icon: "\u{1F469}\u{1F3FB}\u200D\u{1F4BB}" },
  { path: "/demo-recorder", label: "Record", icon: "\u{1F3A5}" },
  { path: "/valley-net", label: "AI Agent", icon: "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F" },
  { path: "/game-studio", label: "Games", icon: "\u{1F3AE}" },
  { path: "/commander", label: "CLI", icon: "\u{1F431}" },
  { path: "/settings", label: "Settings", icon: "\u2699\uFE0F" },
];

export default function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-studio-panel/95 backdrop-blur-md border-t border-studio-border safe-area-bottom"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-center overflow-x-auto scrollbar-none">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-lg transition-colors touch-target flex-shrink-0 ${
                isActive
                  ? "text-studio-cyan bg-studio-cyan/10"
                  : "text-studio-muted active:text-studio-text"
              }`}
              style={{ minWidth: "calc(100% / 5)", maxWidth: "80px" }}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="text-[8px] xs:text-[9px] font-semibold leading-tight">{item.label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-studio-cyan" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
