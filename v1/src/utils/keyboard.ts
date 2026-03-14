import { useEffect, useCallback } from "react";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Global keyboard shortcuts system
// ---------------------------------------------------------------------------

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey || !s.shift;
        const altMatch = s.alt ? e.altKey : !e.altKey || !s.alt;
        const keyMatch = e.key.toLowerCase() === s.key.toLowerCase();

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          // Don't fire shortcuts when typing in inputs
          const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
          if (tag === "input" || tag === "textarea" || tag === "select") {
            if (!s.ctrl && !s.meta) continue;
          }
          e.preventDefault();
          logger.action("keyboard", `Shortcut: ${s.description}`);
          s.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

// ---------------------------------------------------------------------------
// Common shortcuts for all programs
// ---------------------------------------------------------------------------

export function useGlobalShortcuts(navigate: (path: string) => void) {
  useKeyboardShortcuts([
    {
      key: "1",
      ctrl: true,
      action: () => navigate("/media-mogul"),
      description: "Open Media Mogul",
    },
    {
      key: "2",
      ctrl: true,
      action: () => navigate("/vibecode-worker"),
      description: "Open VibeCodeWorker",
    },
    {
      key: "3",
      ctrl: true,
      action: () => navigate("/demo-recorder"),
      description: "Open DemoRecorder",
    },
    {
      key: "4",
      ctrl: true,
      action: () => navigate("/valley-net"),
      description: "Open ValleyNet",
    },
    {
      key: "5",
      ctrl: true,
      action: () => navigate("/game-studio"),
      description: "Open GameStudio",
    },
    {
      key: "6",
      ctrl: true,
      action: () => navigate("/commander"),
      description: "Open CryptArt Commander",
    },
    {
      key: "7",
      ctrl: true,
      action: () => navigate("/donate-personal-seconds"),
      description: "Open DonatePersonalSeconds",
    },
    {
      key: "8",
      ctrl: true,
      action: () => navigate("/clone-tool"),
      description: "Open Clone Tool",
    },
    {
      key: "9",
      ctrl: true,
      action: () => navigate("/settings"),
      description: "Open Settings",
    },
    {
      key: "0",
      ctrl: true,
      action: () => navigate("/"),
      description: "Back to Suite Launcher [SLr]",
    },
  ]);
}
