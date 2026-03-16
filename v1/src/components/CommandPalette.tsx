import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { logger } from "../utils/logger";

interface Project {
  id: string;
  name: string;
  path: string;
  program: string;
  time: number;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Project[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const recentProjects: Project[] = JSON.parse(localStorage.getItem("cryptartist_recent_projects") || "[]");

  const fuse = new Fuse(recentProjects, {
    keys: ["name"],
    threshold: 0.4,
  });

  const search = useCallback((q: string) => {
    if (!q.trim()) {
      setResults(recentProjects.slice(0, 10));
      return;
    }

    // Dual-mode logic: Numeric vs Alpha
    if (/^\d+$/.test(q)) {
      // Numeric mode: filter by ID
      const filtered = recentProjects.filter(p => p.id.includes(q));
      setResults(filtered);
    } else {
      // Alpha mode: fuzzy search by name
      const fuzzyResults = fuse.search(q).map(r => r.item);
      setResults(fuzzyResults);
    }
    setSelectedIndex(0);
  }, [recentProjects, fuse]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setResults(recentProjects.slice(0, 10));
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    search(query);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        openProject(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const openProject = (project: Project) => {
    logger.action("CommandPalette", `Opening project: ${project.name}`);
    // Navigation logic depends on how workspaces are handled globally
    // For now, we navigate to the program and hope it picks up the last project or similar
    // Ideally we'd use ws.openWorkspace here if we had access to the workspace context
    navigate(`/${project.program}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 animate-fade-in bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-studio-panel border border-studio-border rounded-xl shadow-2xl shadow-black/50 overflow-hidden flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 gap-3 border-b border-studio-border">
          <span className="text-studio-muted text-lg">{"\u{1F50D}"}</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name or ID (Ctrl+K)..."
            className="flex-1 bg-transparent border-none outline-none text-studio-text text-lg placeholder:text-studio-muted"
          />
          <kbd className="kbd text-[10px] items-center gap-1 opacity-50 flex">
            <span>ESC</span>
          </kbd>
        </div>

        <div className="flex-1 overflow-y-auto max-h-[60vh] scrollbar-thin">
          {results.length > 0 ? (
            <div className="p-2 flex flex-col gap-1">
              {results.map((project, idx) => (
                <button
                  key={`${project.id}-${idx}`}
                  onClick={() => openProject(project)}
                  className={`flex flex-col p-3 rounded-lg text-left transition-colors ${
                    idx === selectedIndex ? "bg-studio-cyan/20 border border-studio-cyan/30" : "hover:bg-studio-surface"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-studio-text">{project.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-studio-panel text-studio-muted uppercase font-mono">
                      {project.program}
                    </span>
                  </div>
                  <div className="text-[10px] text-studio-muted truncate font-mono mt-1 opacity-60">
                    ID: {project.id}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-studio-muted">
              <div className="text-3xl mb-2 opacity-30">{"\u{1F50D}"}</div>
              <p className="text-sm">No projects matched your search</p>
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-studio-border bg-studio-surface/50 flex items-center justify-between text-[10px] text-studio-muted">
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><kbd className="kbd text-[8px] animate-pulse">{"\u2191\u2193"}</kbd> to navigate</span>
            <span className="flex items-center gap-1"><kbd className="kbd text-[8px] animate-pulse">ENTER</kbd> to open</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-studio-cyan">Tip:</span> Use numeric input for ID search
          </div>
        </div>
      </div>
    </div>
  );
}
