import React from "react";
import { useProgramTabs } from "../utils/programTabs";
import { useDeviceType } from "../utils/platform";

export function ProgramTabBar() {
  const { tabs, activeTabId, closeTab, setActiveTab } = useProgramTabs();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";

  if (tabs.length === 0) return null;

  return (
    <div
      className={`flex items-center gap-1 bg-studio-panel border-b border-studio-border overflow-x-auto ${
        isMobile ? "h-[40px] px-2" : "h-[36px] px-3"
      }`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-t transition-colors whitespace-nowrap ${
            activeTabId === tab.id
              ? "bg-studio-bg text-studio-text border-b-2 border-b-studio-cyan"
              : "text-studio-secondary hover:bg-studio-hover"
          } ${isMobile ? "text-[10px]" : "text-[11px]"}`}
          title={tab.displayName}
        >
          <span className={isMobile ? "text-[12px]" : "text-[14px]"}>{tab.icon}</span>
          {!isMobile && <span className="truncate max-w-[120px]">{tab.displayName}</span>}
          {tab.dirty && <span className="text-studio-cyan text-[8px]">●</span>}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.id);
            }}
            className="text-[8px] text-studio-muted hover:text-studio-text ml-0.5"
            title="Close tab"
          >
            ✕
          </button>
        </button>
      ))}
    </div>
  );
}
