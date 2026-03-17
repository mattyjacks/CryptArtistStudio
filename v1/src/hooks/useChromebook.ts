import { useEffect, useState, useCallback } from "react";
import {
  detectChromebook,
  isChromebook,
  isChromeOS,
  hasLinuxContainer,
  getChromebookScreenSize,
  isChromebookTabletMode,
  onTabletModeChange,
  onScreenSizeChange,
  CHROMEBOOK_SHORTCUTS,
  supportsFeature,
} from "../utils/chromebookDetection";

export function useChromebookDetection() {
  const [chromebookInfo, setChromebookInfo] = useState(detectChromebook());

  useEffect(() => {
    const unsubscribeTablet = onTabletModeChange(() => {
      setChromebookInfo(detectChromebook());
    });

    const unsubscribeScreen = onScreenSizeChange(() => {
      setChromebookInfo(detectChromebook());
    });

    return () => {
      unsubscribeTablet();
      unsubscribeScreen();
    };
  }, []);

  return chromebookInfo;
}

export function useChromebookKeyboardShortcuts(
  shortcuts: Record<string, () => void>
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const isAlt = e.altKey;

      // Build shortcut string
      let shortcutStr = "";
      if (isCtrl) shortcutStr += "Ctrl+";
      if (isShift) shortcutStr += "Shift+";
      if (isAlt) shortcutStr += "Alt+";
      shortcutStr += e.key.toUpperCase();

      // Check if this shortcut is registered
      if (shortcuts[shortcutStr]) {
        e.preventDefault();
        shortcuts[shortcutStr]();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export function useChromebookTouchpad() {
  const [lastTouchpadEvent, setLastTouchpadEvent] = useState<TouchEvent | null>(null);

  const handleTouchpadScroll = useCallback((e: WheelEvent) => {
    // Chromebook touchpad scroll detection
    if (e.deltaX !== 0 || e.deltaY !== 0) {
      // Touchpad event detected
    }
  }, []);

  const handleTouchpadGesture = useCallback((e: any) => {
    // Chromebook touchpad gesture detection (two-finger scroll, pinch, etc.)
  }, []);

  useEffect(() => {
    window.addEventListener("wheel", handleTouchpadScroll, { passive: true });
    window.addEventListener("gesturechange", handleTouchpadGesture, {
      passive: true,
    } as any);

    return () => {
      window.removeEventListener("wheel", handleTouchpadScroll);
      window.removeEventListener("gesturechange", handleTouchpadGesture);
    };
  }, [handleTouchpadScroll, handleTouchpadGesture]);

  return { lastTouchpadEvent };
}

export function useChromebookStorage() {
  const [storageQuota, setStorageQuota] = useState({
    usage: 0,
    quota: 0,
    percentage: 0,
  });

  const [isPersistent, setIsPersistent] = useState(false);

  useEffect(() => {
    const checkStorage = async () => {
      if (navigator.storage?.estimate) {
        const estimate = await navigator.storage.estimate();
        setStorageQuota({
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          percentage: estimate.quota ? (estimate.usage || 0) / estimate.quota : 0,
        });
      }

      if (navigator.storage?.persisted) {
        const persisted = await navigator.storage.persisted();
        setIsPersistent(persisted);
      }
    };

    checkStorage();
    const interval = setInterval(checkStorage, 5000);
    return () => clearInterval(interval);
  }, []);

  return { storageQuota, isPersistent };
}

export function useChromebookFeatures() {
  const [features, setFeatures] = useState({
    linuxContainer: false,
    androidContainer: false,
    stylus: false,
    offline: false,
    cloudSync: false,
    fileSystemAccess: false,
    webUSB: false,
    webSerial: false,
  });

  useEffect(() => {
    setFeatures({
      linuxContainer: supportsFeature("linux-container"),
      androidContainer: supportsFeature("android-container"),
      stylus: supportsFeature("stylus"),
      offline: supportsFeature("offline"),
      cloudSync: supportsFeature("cloud-sync"),
      fileSystemAccess: supportsFeature("file-system-access"),
      webUSB: supportsFeature("web-usb"),
      webSerial: supportsFeature("web-serial"),
    });
  }, []);

  return features;
}

export function useChromebookResponsive() {
  const [screenSize, setScreenSize] = useState(getChromebookScreenSize());
  const [isTabletMode, setIsTabletMode] = useState(isChromebookTabletMode());

  useEffect(() => {
    const unsubscribeScreen = onScreenSizeChange((size) => {
      setScreenSize(size);
    });

    const unsubscribeTablet = onTabletModeChange((tablet) => {
      setIsTabletMode(tablet);
    });

    return () => {
      unsubscribeScreen();
      unsubscribeTablet();
    };
  }, []);

  return {
    screenSize,
    isTabletMode,
    isSmall: screenSize === "small",
    isMedium: screenSize === "medium",
    isLarge: screenSize === "large",
  };
}
