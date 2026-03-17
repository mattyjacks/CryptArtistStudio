// ============================================================================
// CryptArtist Studio - Cross-Program Tab Manager
// Allows opening multiple programs simultaneously with tab switching on
// desktop and mobile
// ============================================================================

import { createContext, useContext } from "react";
import type { CryptArtProgram } from "./cryptart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgramTab {
  /** Unique ID for this tab */
  id: string;
  /** Which program this tab is for */
  program: CryptArtProgram;
  /** Display name for the tab */
  displayName: string;
  /** Workspace ID within the program */
  workspaceId: string | null;
  /** Whether this tab has unsaved changes */
  dirty: boolean;
  /** When this tab was opened */
  openedAt: number;
  /** Icon/emoji for the program */
  icon: string;
}

export interface ProgramTabState {
  /** All currently open program tabs */
  tabs: ProgramTab[];
  /** The currently active (focused) tab ID */
  activeTabId: string | null;
  /** Maximum number of tabs that can be open at once */
  maxTabs: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface ProgramTabActions {
  /** Open a new program tab */
  openTab: (program: CryptArtProgram, displayName: string, workspaceId?: string | null) => string;
  /** Close a program tab by ID */
  closeTab: (tabId: string) => void;
  /** Switch to a different tab */
  setActiveTab: (tabId: string) => void;
  /** Mark a tab as dirty (has unsaved changes) */
  markTabDirty: (tabId: string) => void;
  /** Mark a tab as clean (saved) */
  markTabClean: (tabId: string) => void;
  /** Update tab display name */
  updateTabName: (tabId: string, displayName: string) => void;
  /** Get all tabs for a specific program */
  getTabsForProgram: (program: CryptArtProgram) => ProgramTab[];
  /** Get active tab */
  getActiveTab: () => ProgramTab | null;
  /** Close all tabs for a program */
  closeAllTabsForProgram: (program: CryptArtProgram) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const ProgramTabContext = createContext<(ProgramTabState & ProgramTabActions) | null>(null);

export function useProgramTabs() {
  const context = useContext(ProgramTabContext);
  if (!context) {
    throw new Error("useProgramTabs must be used within ProgramTabProvider");
  }
  return context;
}

// ---------------------------------------------------------------------------
// Helper to get program icon
// ---------------------------------------------------------------------------

export function getProgramIcon(program: CryptArtProgram): string {
  const icons: Record<CryptArtProgram, string> = {
    "media-mogul": "🎬",
    "vibecode-worker": "👩‍💻",
    "demo-recorder": "🎥",
    "valley-net": "👧",
    "game-studio": "🎮",
    "commander": "🐱",
    "donate-personal-seconds": "🖥️",
    "clone-tool": "📦",
    "dictate-pic": "🍗",
    "luck-factory": "🍀",
    "tax-info-bot": "🚕",
    "settings": "⚙️",
  };
  return icons[program] || "📱";
}
