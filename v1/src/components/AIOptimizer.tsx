import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  AIActionKey,
  AIEfficiencyMode,
  AI_MODES,
  getActionMode,
  setActionMode,
} from "../utils/openrouter";

interface Props {
  actionKey: AIActionKey;
  className?: string;
  onModeChange?: (newMode: AIEfficiencyMode) => void;
}

export default function AIOptimizer({ actionKey, className = "", onModeChange }: Props) {
  const navigate = useNavigate();
  const [currentMode, setCurrentMode] = useState<AIEfficiencyMode>("smart");

  useEffect(() => {
    setCurrentMode(getActionMode(actionKey));
  }, [actionKey]);

  const handleSelectMode = (mode: AIEfficiencyMode) => {
    if (mode === "lucky") {
      const hasRunLuckFactory = localStorage.getItem("cryptartist_has_run_luck_factory");
      if (!hasRunLuckFactory) {
        // First time running lucky: open LuckFactory program
        navigate("/luck-factory");
        return; // Don't set mode yet until they finish LuckFactory
      }
    }

    // Normal mode switch
    setActionMode(actionKey, mode);
    setCurrentMode(mode);
    if (onModeChange) onModeChange(mode);
  };

  return (
    <div className={`flex items-center gap-1 bg-studio-surface border border-studio-border p-1 rounded-lg shadow-sm ${className}`}>
      {AI_MODES.map((modeConfig) => (
        <button
          key={modeConfig.id}
          onClick={() => handleSelectMode(modeConfig.id as AIEfficiencyMode)}
          title={`Optimize AI for ${modeConfig.label}`}
          className={`
            w-8 h-8 rounded-md flex items-center justify-center text-sm transition-all
            ${currentMode === modeConfig.id ? "bg-studio-cyan/20 border border-studio-cyan/50 text-studio-cyan translate-y-[-1px] shadow-sm" : "text-studio-secondary hover:bg-studio-panel hover:text-studio-text"}
          `}
        >
          {modeConfig.icon}
        </button>
      ))}
    </div>
  );
}
