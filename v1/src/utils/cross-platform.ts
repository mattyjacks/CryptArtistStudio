// ---------------------------------------------------------------------------
// CryptArtist Studio - Cross-Platform Configuration
// Support for Android, iOS, Ubuntu Linux, macOS, Windows
// Adaptive UI, platform-specific features, and capability detection
// ---------------------------------------------------------------------------

import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlatformOS = "windows" | "macos" | "linux" | "android" | "ios" | "unknown";
export type PlatformArch = "x86_64" | "aarch64" | "armv7" | "i686" | "unknown";

export interface PlatformCapabilities {
  hasFileSystem: boolean;
  hasGPU: boolean;
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasScreenCapture: boolean;
  hasNotifications: boolean;
  hasClipboard: boolean;
  hasDragDrop: boolean;
  hasTouchScreen: boolean;
  hasKeyboard: boolean;
  hasMouse: boolean;
  hasGamepad: boolean;
  hasWebRTC: boolean;
  hasCrypto: boolean;
  hasWASM: boolean;
  hasServiceWorker: boolean;
  hasLocalStorage: boolean;
  hasIndexedDB: boolean;
  maxStorageGB: number;
}

export interface PlatformUIConfig {
  useMobileNav: boolean;
  useCompactUI: boolean;
  useLargeTouch: boolean;
  menuPosition: "top" | "bottom";
  defaultFontSize: number;
  minTouchTarget: number;
  safeAreaTop: number;
  safeAreaBottom: number;
  safeAreaLeft: number;
  safeAreaRight: number;
  statusBarHeight: number;
  navBarHeight: number;
  useNativeScrolling: boolean;
  useHapticFeedback: boolean;
  usePullToRefresh: boolean;
  prefersDarkMode: boolean;
  prefersReducedMotion: boolean;
  prefersHighContrast: boolean;
}

export interface PlatformBuildConfig {
  os: PlatformOS;
  targets: string[];
  bundleId: string;
  icon: string;
  installer: string;
  permissions: string[];
  minOSVersion: string;
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

export function detectOS(): PlatformOS {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "linux";
  if (/Mac/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua)) return "macos";
  if (/Win/i.test(ua)) return "windows";
  return "unknown";
}

export function detectArch(): PlatformArch {
  const ua = navigator.userAgent;
  if (/aarch64|arm64/i.test(ua)) return "aarch64";
  if (/armv7|arm/i.test(ua)) return "armv7";
  if (/x86_64|amd64|x64/i.test(ua)) return "x86_64";
  if (/i[3-6]86|x86/i.test(ua)) return "i686";
  return "unknown";
}

export async function detectCapabilities(): Promise<PlatformCapabilities> {
  const caps: PlatformCapabilities = {
    hasFileSystem: true,
    hasGPU: false,
    hasCamera: false,
    hasMicrophone: false,
    hasScreenCapture: false,
    hasNotifications: false,
    hasClipboard: false,
    hasDragDrop: true,
    hasTouchScreen: false,
    hasKeyboard: true,
    hasMouse: true,
    hasGamepad: false,
    hasWebRTC: false,
    hasCrypto: false,
    hasWASM: false,
    hasServiceWorker: false,
    hasLocalStorage: false,
    hasIndexedDB: false,
    maxStorageGB: 0,
  };

  // Touch
  caps.hasTouchScreen = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // GPU
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    caps.hasGPU = !!gl;
  } catch { /* no GPU */ }

  // Camera & Mic
  if (navigator.mediaDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      caps.hasCamera = devices.some((d) => d.kind === "videoinput");
      caps.hasMicrophone = devices.some((d) => d.kind === "audioinput");
    } catch { /* permission denied or not available */ }
    caps.hasScreenCapture = typeof navigator.mediaDevices.getDisplayMedia === "function";
  }

  // Notifications
  caps.hasNotifications = "Notification" in window;

  // Clipboard
  caps.hasClipboard = !!navigator.clipboard;

  // WebRTC
  caps.hasWebRTC = typeof RTCPeerConnection !== "undefined";

  // Crypto
  caps.hasCrypto = typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined";

  // WASM
  caps.hasWASM = typeof WebAssembly !== "undefined";

  // Service Worker
  caps.hasServiceWorker = "serviceWorker" in navigator;

  // Storage
  try {
    localStorage.setItem("__test__", "1");
    localStorage.removeItem("__test__");
    caps.hasLocalStorage = true;
  } catch { caps.hasLocalStorage = false; }

  caps.hasIndexedDB = typeof indexedDB !== "undefined";

  // Gamepad
  caps.hasGamepad = "getGamepads" in navigator;

  // Storage estimate
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      caps.maxStorageGB = Math.round((est.quota || 0) / (1024 * 1024 * 1024) * 10) / 10;
    }
  } catch { /* storage estimate failed */ }

  // Mobile: no drag-drop, may not have mouse/keyboard
  const os = detectOS();
  if (os === "android" || os === "ios") {
    caps.hasDragDrop = false;
    caps.hasMouse = false;
    caps.hasKeyboard = false; // virtual only
  }

  return caps;
}

// ---------------------------------------------------------------------------
// UI Configuration per platform
// ---------------------------------------------------------------------------

export function getUIConfig(os: PlatformOS): PlatformUIConfig {
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const prefersHighContrast = window.matchMedia?.("(prefers-contrast: high)").matches ?? false;

  const base: PlatformUIConfig = {
    useMobileNav: false,
    useCompactUI: false,
    useLargeTouch: false,
    menuPosition: "top",
    defaultFontSize: 13,
    minTouchTarget: 44,
    safeAreaTop: 0,
    safeAreaBottom: 0,
    safeAreaLeft: 0,
    safeAreaRight: 0,
    statusBarHeight: 0,
    navBarHeight: 28,
    useNativeScrolling: false,
    useHapticFeedback: false,
    usePullToRefresh: false,
    prefersDarkMode: prefersDark,
    prefersReducedMotion,
    prefersHighContrast,
  };

  switch (os) {
    case "android":
      return {
        ...base,
        useMobileNav: true,
        useCompactUI: true,
        useLargeTouch: true,
        menuPosition: "bottom",
        defaultFontSize: 14,
        minTouchTarget: 48,
        safeAreaTop: 24,
        safeAreaBottom: 48,
        statusBarHeight: 24,
        navBarHeight: 56,
        useNativeScrolling: true,
        usePullToRefresh: true,
      };

    case "ios":
      return {
        ...base,
        useMobileNav: true,
        useCompactUI: true,
        useLargeTouch: true,
        menuPosition: "bottom",
        defaultFontSize: 15,
        minTouchTarget: 44,
        safeAreaTop: 47,
        safeAreaBottom: 34,
        statusBarHeight: 47,
        navBarHeight: 49,
        useNativeScrolling: true,
        useHapticFeedback: true,
        usePullToRefresh: true,
      };

    case "linux":
      return {
        ...base,
        navBarHeight: 28,
        defaultFontSize: 13,
      };

    case "macos":
      return {
        ...base,
        navBarHeight: 28,
        defaultFontSize: 13,
        safeAreaTop: 28,
      };

    case "windows":
      return {
        ...base,
        navBarHeight: 30,
        defaultFontSize: 13,
      };

    default:
      return base;
  }
}

// ---------------------------------------------------------------------------
// Build configurations per platform
// ---------------------------------------------------------------------------

export const PLATFORM_BUILD_CONFIGS: Record<PlatformOS, PlatformBuildConfig> = {
  windows: {
    os: "windows",
    targets: ["nsis", "msi"],
    bundleId: "com.mattyjacks.cryptartist",
    icon: "icons/icon.ico",
    installer: ".exe / .msi",
    permissions: ["filesystem", "clipboard", "notification", "dialog"],
    minOSVersion: "Windows 10 (1803)",
  },
  macos: {
    os: "macos",
    targets: ["dmg", "app"],
    bundleId: "com.mattyjacks.cryptartist",
    icon: "icons/icon.icns",
    installer: ".dmg / .app",
    permissions: ["filesystem", "clipboard", "notification", "dialog", "camera", "microphone"],
    minOSVersion: "macOS 10.15 (Catalina)",
  },
  linux: {
    os: "linux",
    targets: ["deb", "appimage", "rpm"],
    bundleId: "com.mattyjacks.cryptartist",
    icon: "icons/128x128.png",
    installer: ".deb / .AppImage / .rpm",
    permissions: ["filesystem", "clipboard", "notification", "dialog"],
    minOSVersion: "Ubuntu 20.04 / Fedora 33",
  },
  android: {
    os: "android",
    targets: ["apk", "aab"],
    bundleId: "com.mattyjacks.cryptartist",
    icon: "icons/android/ic_launcher.png",
    installer: ".apk / .aab",
    permissions: [
      "android.permission.INTERNET",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.VIBRATE",
    ],
    minOSVersion: "Android 8.0 (API 26)",
  },
  ios: {
    os: "ios",
    targets: ["ipa"],
    bundleId: "com.mattyjacks.cryptartist",
    icon: "icons/ios/AppIcon.appiconset",
    installer: ".ipa (via TestFlight / App Store)",
    permissions: [
      "NSCameraUsageDescription",
      "NSMicrophoneUsageDescription",
      "NSPhotoLibraryUsageDescription",
      "NSDocumentsFolderUsageDescription",
    ],
    minOSVersion: "iOS 14.0",
  },
  unknown: {
    os: "unknown",
    targets: [],
    bundleId: "com.mattyjacks.cryptartist",
    icon: "icons/128x128.png",
    installer: "N/A",
    permissions: [],
    minOSVersion: "N/A",
  },
};

// ---------------------------------------------------------------------------
// Safe area CSS injection for mobile
// ---------------------------------------------------------------------------

export function applySafeAreaInsets(os: PlatformOS): void {
  const config = getUIConfig(os);
  const root = document.documentElement;

  root.style.setProperty("--safe-area-top", `${config.safeAreaTop}px`);
  root.style.setProperty("--safe-area-bottom", `${config.safeAreaBottom}px`);
  root.style.setProperty("--safe-area-left", `${config.safeAreaLeft}px`);
  root.style.setProperty("--safe-area-right", `${config.safeAreaRight}px`);
  root.style.setProperty("--status-bar-height", `${config.statusBarHeight}px`);
  root.style.setProperty("--nav-bar-height", `${config.navBarHeight}px`);
  root.style.setProperty("--min-touch-target", `${config.minTouchTarget}px`);

  // Apply env() safe-area-inset for modern browsers
  root.style.setProperty("--safe-top", "env(safe-area-inset-top, 0px)");
  root.style.setProperty("--safe-bottom", "env(safe-area-inset-bottom, 0px)");
  root.style.setProperty("--safe-left", "env(safe-area-inset-left, 0px)");
  root.style.setProperty("--safe-right", "env(safe-area-inset-right, 0px)");

  // Set viewport classes
  if (config.useMobileNav) root.classList.add("mobile-nav");
  else root.classList.remove("mobile-nav");

  if (config.useCompactUI) root.classList.add("compact-ui");
  else root.classList.remove("compact-ui");

  if (config.useLargeTouch) root.classList.add("large-touch");
  else root.classList.remove("large-touch");

  if (config.prefersReducedMotion) root.classList.add("no-animations");
  else root.classList.remove("no-animations");

  logger.action("Platform", `Applied safe areas for ${os}: top=${config.safeAreaTop} bottom=${config.safeAreaBottom}`);
}

// ---------------------------------------------------------------------------
// Platform-aware keyboard shortcut labels
// ---------------------------------------------------------------------------

export function shortcutLabel(key: string, os?: PlatformOS): string {
  const platform = os || detectOS();
  const isMac = platform === "macos" || platform === "ios";

  return key
    .replace(/Ctrl\+/g, isMac ? "\u2318" : "Ctrl+")
    .replace(/Alt\+/g, isMac ? "\u2325" : "Alt+")
    .replace(/Shift\+/g, isMac ? "\u21E7" : "Shift+")
    .replace(/Meta\+/g, isMac ? "\u2318" : "Win+");
}

// ---------------------------------------------------------------------------
// Initialize platform on startup
// ---------------------------------------------------------------------------

export function initializePlatform(): void {
  const os = detectOS();
  applySafeAreaInsets(os);

  // Add platform class to root
  document.documentElement.classList.add(`platform-${os}`);
  document.documentElement.dataset.platform = os;

  // Viewport meta for mobile
  if (os === "android" || os === "ios") {
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "viewport");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no, maximum-scale=1.0");
  }

  logger.action("Platform", `Initialized: ${os} / ${detectArch()}`);
}
