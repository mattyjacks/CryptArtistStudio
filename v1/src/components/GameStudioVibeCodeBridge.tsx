import { useState, useCallback, useEffect } from "react";
import { useInteropEmit, useInterop } from "../utils/interop";
import { toast } from "../utils/toast";

interface GameStudioFile {
  path: string;
  name: string;
  content: string;
  language: string;
  dirty: boolean;
}

interface GameStudioVibeCodeBridgeProps {
  projectPath: string | null;
  openTabs: GameStudioFile[];
  activeTabPath: string | null;
  onFileOpen: (path: string, content: string) => void;
  onFileSave: (path: string, content: string) => void;
  onFileClose: (path: string) => void;
  onTabSwitch: (path: string) => void;
}

export default function GameStudioVibeCodeBridge({
  projectPath,
  openTabs,
  activeTabPath,
  onFileOpen,
  onFileSave,
  onFileClose,
  onTabSwitch,
}: GameStudioVibeCodeBridgeProps) {
  const emit = useInteropEmit("game-studio");
  const [vibeCodeReady, setVibeCodeReady] = useState(false);

  useEffect(() => {
    if (!projectPath) return;
    setVibeCodeReady(true);
  }, [projectPath]);

  useInterop("code:file-opened", (event) => {
    const data = event.data as { path?: string; content?: string; language?: string };
    if (data?.path && data?.content) {
      onFileOpen(data.path, data.content);
      toast.info(`Opened ${data.path.split(/[\\/]/).pop()} in VibeCodeWorker`);
    }
  }, { target: "game-studio", source: "vibecode-worker" });

  useInterop("code:file-saved", (event) => {
    const data = event.data as { path?: string; content?: string };
    if (data?.path && data?.content) {
      onFileSave(data.path, data.content);
      toast.success(`Saved via VibeCodeWorker`);
    }
  }, { target: "game-studio", source: "vibecode-worker" });

  useInterop("code:snippet-created", (event) => {
    const data = event.data as { path?: string };
    if (data?.path) {
      onFileClose(data.path);
    }
  }, { target: "game-studio", source: "vibecode-worker" });

  const syncOpenTabs = useCallback(() => {
    if (!vibeCodeReady) return;

    emit("code:project-opened", {
      projectPath,
      tabs: openTabs.map(tab => ({
        path: tab.path,
        name: tab.name,
        language: tab.language,
        dirty: tab.dirty,
      })),
      activeTab: activeTabPath,
    }, { target: "vibecode-worker" });
  }, [vibeCodeReady, openTabs, activeTabPath, emit, projectPath]);

  useEffect(() => {
    syncOpenTabs();
  }, [syncOpenTabs]);

  const openInVibeCode = useCallback((filePath: string) => {
    emit("code:file-opened", {
      path: filePath,
      projectPath,
    }, { target: "vibecode-worker" });
  }, [projectPath, emit]);

  const saveInVibeCode = useCallback((filePath: string, content: string) => {
    emit("code:file-saved", {
      path: filePath,
      content,
      projectPath,
    }, { target: "vibecode-worker" });
  }, [projectPath, emit]);

  const closeInVibeCode = useCallback((filePath: string) => {
    emit("code:snippet-created", {
      path: filePath,
    }, { target: "vibecode-worker" });
  }, [emit]);

  return {
    vibeCodeReady,
    openInVibeCode,
    saveInVibeCode,
    closeInVibeCode,
    syncOpenTabs,
  };
}
