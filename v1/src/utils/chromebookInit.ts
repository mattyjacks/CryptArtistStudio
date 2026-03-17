// ============================================================================
// CryptArtist Studio - Chromebook Initialization
// Sets up Chromebook-specific features on app startup
// ============================================================================

import {
  initializeChromebookFeatures,
  isChromeOS,
  hasLinuxContainer,
  detectChromebook,
} from "./chromebookDetection";
import {
  initializeIndexedDB,
  requestPersistentStorage,
} from "./chromebookFileSystem";
import { logger } from "./logger";

export async function initializeChromebookSupport(): Promise<void> {
  // Check if running on Chromebook
  const chromebookInfo = detectChromebook();

  if (!chromebookInfo.isChromebook) {
    logger.info("Chromebook", "Not running on Chromebook");
    return;
  }

  logger.info("Chromebook", "Initializing Chromebook support");

  try {
    // Initialize Chromebook-specific features
    initializeChromebookFeatures();

    // Initialize IndexedDB for offline storage
    await initializeIndexedDB();
    logger.info("Chromebook", "IndexedDB initialized");

    // Request persistent storage
    const isPersistent = await requestPersistentStorage();
    if (isPersistent) {
      logger.info("Chromebook", "Persistent storage granted");
    } else {
      logger.warn("Chromebook", "Persistent storage not granted");
    }

    // Register service worker for offline support
    if ("serviceWorker" in navigator) {
      try {
        const registration = await navigator.serviceWorker.register("/service-worker.js", {
          scope: "/",
        });
        logger.info("Chromebook", "Service worker registered");

        // Listen for service worker updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                logger.info("Chromebook", "Service worker update available");
                // Notify user about update
                window.dispatchEvent(
                  new CustomEvent("sw-update-available", {
                    detail: { registration },
                  })
                );
              }
            });
          }
        });
      } catch (err) {
        logger.error("Chromebook", `Service worker registration failed: ${err}`);
      }
    }

    // Set up periodic background sync if available
    if ("serviceWorker" in navigator && "sync" in (navigator.serviceWorker as any).ready) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ("sync" in registration) {
          await (registration as any).sync.register("sync-files-periodic");
          logger.info("Chromebook", "Periodic sync registered");
        }
      } catch (err) {
        logger.warn("Chromebook", `Periodic sync registration failed: ${err}`);
      }
    }

    // Listen for online/offline events
    window.addEventListener("online", () => {
      logger.info("Chromebook", "Back online");
      window.dispatchEvent(new CustomEvent("chromebook-online"));
    });

    window.addEventListener("offline", () => {
      logger.warn("Chromebook", "Offline");
      window.dispatchEvent(new CustomEvent("chromebook-offline"));
    });

    // Set up keyboard shortcuts for Chromebook
    setupChromebookKeyboardShortcuts();

    // Log Chromebook capabilities
    logChromebookCapabilities(chromebookInfo);
  } catch (err) {
    logger.error("Chromebook", `Initialization failed: ${err}`);
  }
}

function setupChromebookKeyboardShortcuts(): void {
  // Chromebook-specific keyboard shortcuts are handled by useChromebookKeyboardShortcuts hook
  // This function can be extended for global shortcuts
  logger.info("Chromebook", "Keyboard shortcuts configured");
}

function logChromebookCapabilities(chromebookInfo: any): void {
  const capabilities = {
    "Chrome OS": chromebookInfo.isChromeOS,
    "Linux Container": chromebookInfo.hasLinuxContainer,
    "Android Container": chromebookInfo.hasAndroidContainer,
    "Stylus Support": chromebookInfo.hasStylus,
    "Tablet Mode": chromebookInfo.isTabletMode,
    "Screen Size": chromebookInfo.screenSize,
    "Storage Type": chromebookInfo.storageType,
  };

  logger.info("Chromebook", JSON.stringify(capabilities));
}

// Handle service worker messages
export function setupServiceWorkerMessaging(): void {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    const { type, status } = event.data;

    if (type === "SYNC_FILES") {
      logger.info("Chromebook", `File sync status: ${status}`);
      window.dispatchEvent(
        new CustomEvent("chromebook-file-sync", { detail: { status } })
      );
    } else if (type === "SYNC_GIT") {
      logger.info("Chromebook", `Git sync status: ${status}`);
      window.dispatchEvent(
        new CustomEvent("chromebook-git-sync", { detail: { status } })
      );
    }
  });
}

// Request service worker update
export async function requestServiceWorkerUpdate(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    logger.info("Chromebook", "Service worker update checked");
  } catch (err) {
    logger.error("Chromebook", `Service worker update failed: ${err}`);
  }
}

// Unregister service worker (for cleanup)
export async function unregisterServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const registration of registrations) {
      await registration.unregister();
    }
    logger.info("Chromebook", "Service worker unregistered");
  } catch (err) {
    logger.error("Chromebook", `Service worker unregistration failed: ${err}`);
  }
}

// Check if app is running as PWA
export function isRunningAsPWA(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

// Request full screen for Chromebook
export async function requestFullScreen(): Promise<void> {
  try {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
      await (document.documentElement as any).webkitRequestFullscreen();
    }
  } catch (err) {
    logger.warn("Chromebook", `Full screen request failed: ${err}`);
  }
}

// Exit full screen
export async function exitFullScreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if ((document as any).webkitFullscreenElement) {
      await (document as any).webkitExitFullscreen();
    }
  } catch (err) {
    logger.warn("Chromebook", `Exit full screen failed: ${err}`);
  }
}

// Check if Chromebook supports specific API
export function supportsAPI(api: string): boolean {
  switch (api) {
    case "file-system-access":
      return "showOpenFilePicker" in window;
    case "web-usb":
      return "usb" in navigator;
    case "web-serial":
      return "serial" in navigator;
    case "web-bluetooth":
      return "bluetooth" in navigator;
    case "service-worker":
      return "serviceWorker" in navigator;
    case "indexed-db":
      return "indexedDB" in window;
    case "cache-api":
      return "caches" in window;
    case "notification":
      return "Notification" in window;
    case "vibration":
      return "vibrate" in navigator;
    case "device-orientation":
      return "DeviceOrientationEvent" in window;
    case "device-motion":
      return "DeviceMotionEvent" in window;
    default:
      return false;
  }
}

// Log supported APIs
export function logSupportedAPIs(): void {
  const apis = [
    "file-system-access",
    "web-usb",
    "web-serial",
    "web-bluetooth",
    "service-worker",
    "indexed-db",
    "cache-api",
    "notification",
    "vibration",
    "device-orientation",
    "device-motion",
  ];

  const supported = apis.filter((api) => supportsAPI(api));
  logger.info("Chromebook", JSON.stringify(supported));
}
