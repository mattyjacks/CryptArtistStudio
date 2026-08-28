import { IPlatformAdapter, PlatformCapabilities, PlatformRuntime } from "../../types/platform.types";

export class BrowserPlatformAdapter implements IPlatformAdapter {
  getRuntime(): PlatformRuntime {
    if (typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__) {
      return "tauri";
    }
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return "pwa";
    }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      return "mobile-web";
    }
    return "web";
  }

  getCapabilities(): PlatformCapabilities {
    const isBrowser = typeof window !== "undefined";
    return {
      hasFileSystemAccess: isBrowser && "showDirectoryPicker" in window,
      hasOPFS: isBrowser && "storage" in navigator && "getDirectory" in navigator.storage,
      hasWebCodecs: isBrowser && "VideoDecoder" in window && "VideoEncoder" in window,
      hasWebGL2: isBrowser && !!document.createElement("canvas").getContext("webgl2"),
      hasWebGPU: isBrowser && "gpu" in navigator,
      hasWebAudio: isBrowser && ("AudioContext" in window || "webkitAudioContext" in window),
      hasScreenCapture: isBrowser && "mediaDevices" in navigator && "getDisplayMedia" in navigator.mediaDevices,
      hasSharedArrayBuffer: typeof SharedArrayBuffer !== "undefined",
      hasServiceWorker: isBrowser && "serviceWorker" in navigator,
    };
  }

  isDesktop(): boolean {
    return this.getRuntime() === "tauri" || !this.isMobile();
  }

  isWeb(): boolean {
    return this.getRuntime() === "web" || this.getRuntime() === "pwa";
  }

  isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  getPlatformInfo() {
    return {
      os: navigator.userAgent.includes("Windows")
        ? "Windows"
        : navigator.userAgent.includes("Mac")
        ? "macOS"
        : navigator.userAgent.includes("Linux")
        ? "Linux"
        : "Unknown OS",
      browser: navigator.userAgent.includes("Chrome")
        ? "Chrome"
        : navigator.userAgent.includes("Firefox")
        ? "Firefox"
        : navigator.userAgent.includes("Safari")
        ? "Safari"
        : "Browser",
      userAgent: navigator.userAgent,
      cores: navigator.hardwareConcurrency || 4,
      memoryGB: (navigator as any).deviceMemory || 8,
    };
  }
}

export const platformAdapter = new BrowserPlatformAdapter();
