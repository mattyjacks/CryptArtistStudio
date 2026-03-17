// ============================================================================
// CryptArtist Studio - Chromebook Detection & Environment
// Detects Chrome OS and adapts UI/UX for Chromebook hardware
// ============================================================================

export interface ChromebookInfo {
  isChromebook: boolean;
  isChromeOS: boolean;
  hasLinuxContainer: boolean;
  hasAndroidContainer: boolean;
  screenSize: "small" | "medium" | "large";
  hasKeyboard: boolean;
  hasTouchpad: boolean;
  hasStylus: boolean;
  isTabletMode: boolean;
  storageType: "local" | "cloud" | "hybrid";
  userAgent: string;
}

let cachedChromebookInfo: ChromebookInfo | null = null;

export function detectChromebook(): ChromebookInfo {
  if (cachedChromebookInfo) return cachedChromebookInfo;

  const ua = navigator.userAgent.toLowerCase();
  const isChromeOS = /cros|chromeos/.test(ua);
  const isChromebook = isChromeOS || /chrome/.test(ua);

  // Detect screen size
  const width = window.innerWidth;
  const screenSize: "small" | "medium" | "large" =
    width < 768 ? "small" : width < 1024 ? "medium" : "large";

  // Detect input capabilities
  const hasKeyboard = !/mobile|android|iphone|ipad/.test(ua) || isChromeOS;
  const hasTouchpad = isChromeOS || /touchpad/.test(ua);
  const hasStylus = /stylus|pen|wacom/.test(ua);

  // Detect tablet mode (for convertible Chromebooks)
  const isTabletMode =
    window.matchMedia("(orientation: portrait)").matches &&
    window.matchMedia("(max-width: 1024px)").matches;

  // Detect Linux container support (Chrome OS 69+)
  const hasLinuxContainer = isChromeOS && "cros" in window;

  // Detect Android container support
  const hasAndroidContainer = isChromeOS && "android" in window;

  // Detect storage type
  let storageType: "local" | "cloud" | "hybrid" = "local";
  if (isChromeOS) {
    // Chrome OS has both local and cloud storage
    storageType = "hybrid";
  }

  cachedChromebookInfo = {
    isChromebook,
    isChromeOS,
    hasLinuxContainer,
    hasAndroidContainer,
    screenSize,
    hasKeyboard,
    hasTouchpad,
    hasStylus,
    isTabletMode,
    storageType,
    userAgent: ua,
  };

  return cachedChromebookInfo;
}

export function isChromebook(): boolean {
  return detectChromebook().isChromebook;
}

export function isChromeOS(): boolean {
  return detectChromebook().isChromeOS;
}

export function hasLinuxContainer(): boolean {
  return detectChromebook().hasLinuxContainer;
}

export function hasAndroidContainer(): boolean {
  return detectChromebook().hasAndroidContainer;
}

export function getChromebookScreenSize(): "small" | "medium" | "large" {
  return detectChromebook().screenSize;
}

export function isChromebookTabletMode(): boolean {
  return detectChromebook().isTabletMode;
}

export function getChromebookStorageType(): "local" | "cloud" | "hybrid" {
  return detectChromebook().storageType;
}

// Chromebook-specific keyboard shortcuts
export const CHROMEBOOK_SHORTCUTS = {
  // Chrome OS specific
  SEARCH_KEY: "Meta",
  LAUNCHER: "Meta",
  OVERVIEW: "Meta+A",
  TASK_SWITCHER: "Alt+Tab",
  SCREENSHOT: "Ctrl+F5",
  FULLSCREEN: "F11",
  DEVELOPER_TOOLS: "Ctrl+Shift+I",

  // VibeCodeWorker specific
  SAVE: "Ctrl+S",
  OPEN_FOLDER: "Ctrl+O",
  CLONE_REPO: "Ctrl+Shift+G",
  COMMIT: "Ctrl+K",
  PUSH: "Ctrl+Shift+P",
  PULL: "Ctrl+Shift+L",
  TERMINAL: "Ctrl+`",
  SEARCH_FILES: "Ctrl+P",
  FIND_IN_FILE: "Ctrl+F",
  REPLACE: "Ctrl+H",
  GIT_STATUS: "Ctrl+Shift+S",
};

// Detect if running in Chrome OS Linux container
export function isRunningInLinuxContainer(): boolean {
  if (!isChromeOS()) return false;
  
  // Check for cros_onc environment variable or /etc/lsb-release-cros
  if (typeof window !== "undefined" && "cros" in window) {
    return true;
  }

  return false;
}

// Get Chrome OS version
export function getChromeOSVersion(): string | null {
  const ua = navigator.userAgent;
  const match = ua.match(/CrOS\s+\w+\s+([\d.]+)/);
  return match ? match[1] : null;
}

// Detect Chromebook model
export function getChromebookModel(): string | null {
  const ua = navigator.userAgent;
  const models = [
    "Pixelbook",
    "Pixel Slate",
    "Pixel 3a",
    "Pixel 4a",
    "Pixel 5a",
    "Pixel 6",
    "Pixel 6a",
    "Pixel 6 Pro",
    "Pixel 7",
    "Pixel 7 Pro",
    "Pixel 7a",
    "Pixel Fold",
    "Samsung Chromebook",
    "ASUS Chromebook",
    "Acer Chromebook",
    "HP Chromebook",
    "Lenovo Chromebook",
    "Dell Chromebook",
  ];

  for (const model of models) {
    if (ua.includes(model)) {
      return model;
    }
  }

  return null;
}

// Check if Chromebook supports specific features
export function supportsFeature(feature: string): boolean {
  const info = detectChromebook();

  switch (feature) {
    case "linux-container":
      return info.hasLinuxContainer;
    case "android-container":
      return info.hasAndroidContainer;
    case "stylus":
      return info.hasStylus;
    case "offline":
      return true; // All Chromebooks support offline mode
    case "cloud-sync":
      return info.isChromeOS;
    case "file-system-access":
      return "showOpenFilePicker" in window;
    case "web-usb":
      return "usb" in navigator;
    case "web-serial":
      return "serial" in navigator;
    default:
      return false;
  }
}

// Chromebook-specific storage paths
export const CHROMEBOOK_STORAGE_PATHS = {
  DOWNLOADS: "/home/chronos/user/Downloads",
  DOCUMENTS: "/home/chronos/user/Documents",
  PICTURES: "/home/chronos/user/Pictures",
  MUSIC: "/home/chronos/user/Music",
  VIDEOS: "/home/chronos/user/Videos",
  LINUX_HOME: "/home/chronos/user/crostini/default/home",
  ANDROID_STORAGE: "/home/chronos/user/android-data",
};

// Get appropriate storage path for Chromebook
export function getChromebookStoragePath(type: "downloads" | "documents" | "linux"): string {
  const info = detectChromebook();

  if (!info.isChromeOS) {
    return type === "downloads" ? "~/Downloads" : "~/Documents";
  }

  switch (type) {
    case "downloads":
      return CHROMEBOOK_STORAGE_PATHS.DOWNLOADS;
    case "documents":
      return CHROMEBOOK_STORAGE_PATHS.DOCUMENTS;
    case "linux":
      return info.hasLinuxContainer
        ? CHROMEBOOK_STORAGE_PATHS.LINUX_HOME
        : CHROMEBOOK_STORAGE_PATHS.DOWNLOADS;
    default:
      return CHROMEBOOK_STORAGE_PATHS.DOWNLOADS;
  }
}

// Initialize Chromebook-specific features
export function initializeChromebookFeatures(): void {
  const info = detectChromebook();

  if (!info.isChromebook) return;

  // Log Chromebook info for debugging
  console.log("[Chromebook] Detected Chrome OS environment:", {
    model: getChromebookModel(),
    version: getChromeOSVersion(),
    screenSize: info.screenSize,
    tabletMode: info.isTabletMode,
    linuxContainer: info.hasLinuxContainer,
    androidContainer: info.hasAndroidContainer,
  });

  // Set Chromebook-specific CSS classes
  document.documentElement.classList.add("chromebook");
  if (info.isChromeOS) document.documentElement.classList.add("chrome-os");
  if (info.isTabletMode) document.documentElement.classList.add("tablet-mode");
  if (info.hasLinuxContainer) document.documentElement.classList.add("has-linux");
  if (info.hasAndroidContainer) document.documentElement.classList.add("has-android");

  // Set viewport for Chromebook
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport) {
    viewport.setAttribute(
      "content",
      "width=device-width, initial-scale=1.0, viewport-fit=cover"
    );
  }

  // Add Chromebook-specific meta tags
  const chromeOSMeta = document.createElement("meta");
  chromeOSMeta.name = "chrome-os";
  chromeOSMeta.content = "true";
  document.head.appendChild(chromeOSMeta);
}

// Listen for tablet mode changes
export function onTabletModeChange(callback: (isTabletMode: boolean) => void): () => void {
  const mediaQuery = window.matchMedia("(orientation: portrait) and (max-width: 1024px)");

  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches);
  };

  mediaQuery.addEventListener("change", handler);

  return () => mediaQuery.removeEventListener("change", handler);
}

// Listen for screen size changes
export function onScreenSizeChange(callback: (size: "small" | "medium" | "large") => void): () => void {
  const handleResize = () => {
    const width = window.innerWidth;
    const size: "small" | "medium" | "large" =
      width < 768 ? "small" : width < 1024 ? "medium" : "large";
    callback(size);
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}
