import React, { useState } from "react";

interface AndroidVibeCodeWorkerLayoutProps {
  children: React.ReactNode;
}

export function AndroidVibeCodeWorkerLayout({
  children,
}: AndroidVibeCodeWorkerLayoutProps) {
  const [activePanel, setActivePanel] = useState<"editor" | "explorer" | "ai" | "terminal">("editor");

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden">
      {/* Main content area - shows active panel */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {children}
      </div>

      {/* Bottom navigation for mobile */}
      <div className="flex items-center h-[48px] bg-studio-panel border-t border-studio-border gap-0">
        <button
          onClick={() => setActivePanel("editor")}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            activePanel === "editor"
              ? "text-studio-cyan border-t-2 border-t-studio-cyan"
              : "text-studio-secondary"
          }`}
          title="Editor"
        >
          <span className="text-[18px]">📝</span>
          <span className="text-[9px] mt-0.5">Editor</span>
        </button>
        <button
          onClick={() => setActivePanel("explorer")}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            activePanel === "explorer"
              ? "text-studio-cyan border-t-2 border-t-studio-cyan"
              : "text-studio-secondary"
          }`}
          title="Files"
        >
          <span className="text-[18px]">📁</span>
          <span className="text-[9px] mt-0.5">Files</span>
        </button>
        <button
          onClick={() => setActivePanel("ai")}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            activePanel === "ai"
              ? "text-studio-cyan border-t-2 border-t-studio-cyan"
              : "text-studio-secondary"
          }`}
          title="AI"
        >
          <span className="text-[18px]">🤖</span>
          <span className="text-[9px] mt-0.5">AI</span>
        </button>
        <button
          onClick={() => setActivePanel("terminal")}
          className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
            activePanel === "terminal"
              ? "text-studio-cyan border-t-2 border-t-studio-cyan"
              : "text-studio-secondary"
          }`}
          title="Terminal"
        >
          <span className="text-[18px]">⌨️</span>
          <span className="text-[9px] mt-0.5">Term</span>
        </button>
      </div>

      {/* Store active panel in data attribute for CSS targeting */}
      <style>{`
        [data-active-panel="editor"] .vcw-editor { display: flex; }
        [data-active-panel="editor"] .vcw-explorer { display: none; }
        [data-active-panel="editor"] .vcw-ai { display: none; }
        [data-active-panel="editor"] .vcw-terminal { display: none; }
        
        [data-active-panel="explorer"] .vcw-editor { display: none; }
        [data-active-panel="explorer"] .vcw-explorer { display: flex; }
        [data-active-panel="explorer"] .vcw-ai { display: none; }
        [data-active-panel="explorer"] .vcw-terminal { display: none; }
        
        [data-active-panel="ai"] .vcw-editor { display: none; }
        [data-active-panel="ai"] .vcw-explorer { display: none; }
        [data-active-panel="ai"] .vcw-ai { display: flex; }
        [data-active-panel="ai"] .vcw-terminal { display: none; }
        
        [data-active-panel="terminal"] .vcw-editor { display: none; }
        [data-active-panel="terminal"] .vcw-explorer { display: none; }
        [data-active-panel="terminal"] .vcw-ai { display: none; }
        [data-active-panel="terminal"] .vcw-terminal { display: flex; }
      `}</style>
    </div>
  );
}
