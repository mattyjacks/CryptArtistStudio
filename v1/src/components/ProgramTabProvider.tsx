import React, { useState, useCallback, ReactNode } from "react";
import {
  ProgramTabContext,
  ProgramTabState,
  ProgramTabActions,
  ProgramTab,
  getProgramIcon,
} from "../utils/programTabs";
import type { CryptArtProgram } from "../utils/cryptart";

interface ProgramTabProviderProps {
  children: ReactNode;
  maxTabs?: number;
}

export function ProgramTabProvider({ children, maxTabs = 20 }: ProgramTabProviderProps) {
  const [state, setState] = useState<ProgramTabState>({
    tabs: [],
    activeTabId: null,
    maxTabs,
  });

  const openTab = useCallback(
    (program: CryptArtProgram, displayName: string, workspaceId: string | null = null): string => {
      const tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newTab: ProgramTab = {
        id: tabId,
        program,
        displayName,
        workspaceId,
        dirty: false,
        openedAt: Date.now(),
        icon: getProgramIcon(program),
      };

      setState((prev) => {
        const updated = [...prev.tabs, newTab];
        // Keep only the most recent maxTabs
        if (updated.length > prev.maxTabs) {
          updated.shift();
        }
        return {
          ...prev,
          tabs: updated,
          activeTabId: tabId,
        };
      });

      return tabId;
    },
    []
  );

  const closeTab = useCallback((tabId: string) => {
    setState((prev) => {
      const updated = prev.tabs.filter((t) => t.id !== tabId);
      let newActiveId = prev.activeTabId;

      // If we closed the active tab, switch to another one
      if (newActiveId === tabId) {
        newActiveId = updated.length > 0 ? updated[updated.length - 1].id : null;
      }

      return {
        ...prev,
        tabs: updated,
        activeTabId: newActiveId,
      };
    });
  }, []);

  const setActiveTab = useCallback((tabId: string) => {
    setState((prev) => ({
      ...prev,
      activeTabId: tabId,
    }));
  }, []);

  const markTabDirty = useCallback((tabId: string) => {
    setState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, dirty: true } : t)),
    }));
  }, []);

  const markTabClean = useCallback((tabId: string) => {
    setState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, dirty: false } : t)),
    }));
  }, []);

  const updateTabName = useCallback((tabId: string, displayName: string) => {
    setState((prev) => ({
      ...prev,
      tabs: prev.tabs.map((t) => (t.id === tabId ? { ...t, displayName } : t)),
    }));
  }, []);

  const getTabsForProgram = useCallback(
    (program: CryptArtProgram): ProgramTab[] => {
      return state.tabs.filter((t) => t.program === program);
    },
    [state.tabs]
  );

  const getActiveTab = useCallback((): ProgramTab | null => {
    if (!state.activeTabId) return null;
    return state.tabs.find((t) => t.id === state.activeTabId) || null;
  }, [state.tabs, state.activeTabId]);

  const closeAllTabsForProgram = useCallback((program: CryptArtProgram) => {
    setState((prev) => {
      const updated = prev.tabs.filter((t) => t.program !== program);
      let newActiveId = prev.activeTabId;

      // If the active tab was for this program, switch to another
      if (prev.activeTabId && !updated.find((t) => t.id === prev.activeTabId)) {
        newActiveId = updated.length > 0 ? updated[updated.length - 1].id : null;
      }

      return {
        ...prev,
        tabs: updated,
        activeTabId: newActiveId,
      };
    });
  }, []);

  const value = {
    ...state,
    openTab,
    closeTab,
    setActiveTab,
    markTabDirty,
    markTabClean,
    updateTabName,
    getTabsForProgram,
    getActiveTab,
    closeAllTabsForProgram,
  };

  return (
    <ProgramTabContext.Provider value={value}>
      {children}
    </ProgramTabContext.Provider>
  );
}
