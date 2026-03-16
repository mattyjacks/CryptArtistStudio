import { useEffect, useState } from "react";
import { backgroundProcessManager } from "../utils/backgroundProcess";
import { toast } from "../utils/toast";

interface SystemTrayManagerProps {
  onMinimize?: () => void;
  onRestore?: () => void;
  onQuit?: () => void;
}

export default function SystemTrayManager({
  onMinimize,
  onRestore,
  onQuit,
}: SystemTrayManagerProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHealthy, setIsHealthy] = useState(true);

  useEffect(() => {
    backgroundProcessManager.initialize();

    // Subscribe to state changes
    const unsubscribe = backgroundProcessManager.subscribe((state) => {
      setIsMinimized(state.isMinimized);
      setIsHealthy(state.errorCount < 5);
    });

    return () => {
      unsubscribe();
      backgroundProcessManager.cleanup();
    };
  }, []);

  const handleMinimizeToTray = async () => {
    try {
      await backgroundProcessManager.minimizeToTray();
      setIsMinimized(true);
      toast.info("CryptArtist Studio minimized to system tray");
      onMinimize?.();
    } catch (error) {
      toast.error(`Failed to minimize: ${error}`);
    }
  };

  const handleRestoreFromTray = async () => {
    try {
      await backgroundProcessManager.restoreFromTray();
      setIsMinimized(false);
      toast.success("CryptArtist Studio restored");
      onRestore?.();
    } catch (error) {
      toast.error(`Failed to restore: ${error}`);
    }
  };

  const handleQuit = async () => {
    try {
      await backgroundProcessManager.quitApp();
      onQuit?.();
    } catch (error) {
      toast.error(`Failed to quit: ${error}`);
    }
  };

  return (
    <div className="hidden">
      {/* System Tray Manager - Hidden Component */}
      {/* Handles background process lifecycle */}
      <button
        onClick={handleMinimizeToTray}
        className="hidden"
        title="Minimize to system tray"
      >
        Minimize
      </button>
      <button
        onClick={handleRestoreFromTray}
        className="hidden"
        title="Restore from system tray"
      >
        Restore
      </button>
      <button
        onClick={handleQuit}
        className="hidden"
        title="Quit application"
      >
        Quit
      </button>
    </div>
  );
}
