import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

// ---------------------------------------------------------------------------
// Platform detection - works on desktop and mobile Tauri targets
// ---------------------------------------------------------------------------

export interface PlatformInfo {
  os: string;
  arch: string;
  family: string;
  isMobile: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
}

const DEFAULT_PLATFORM: PlatformInfo = {
  os: "unknown",
  arch: "unknown",
  family: "unknown",
  isMobile: false,
  isDesktop: true,
  isTouchDevice: false,
};

let cachedPlatform: PlatformInfo | null = null;

export async function detectPlatform(): Promise<PlatformInfo> {
  if (cachedPlatform) return cachedPlatform;

  try {
    const info = await invoke<{
      os: string;
      arch: string;
      family: string;
      is_mobile: boolean;
      is_desktop: boolean;
    }>("get_platform_info");

    cachedPlatform = {
      os: info.os,
      arch: info.arch,
      family: info.family,
      isMobile: info.is_mobile || /android|iphone|ipad|ipod/i.test(navigator.userAgent),
      isDesktop: info.is_desktop && !/android|iphone|ipad|ipod/i.test(navigator.userAgent),
      isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    };
  } catch {
    // Fallback for web-only / dev mode
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
    cachedPlatform = {
      os: ua.includes("win") ? "windows" : ua.includes("mac") ? "macos" : ua.includes("linux") ? "linux" : ua.includes("android") ? "android" : ua.includes("iphone") || ua.includes("ipad") ? "ios" : "unknown",
      arch: "unknown",
      family: isMobile ? "mobile" : "desktop",
      isMobile,
      isDesktop: !isMobile,
      isTouchDevice: "ontouchstart" in window || navigator.maxTouchPoints > 0,
    };
  }

  return cachedPlatform;
}

// ---------------------------------------------------------------------------
// React hook for platform info
// ---------------------------------------------------------------------------

export function usePlatform(): PlatformInfo {
  const [platform, setPlatform] = useState<PlatformInfo>(DEFAULT_PLATFORM);

  useEffect(() => {
    detectPlatform().then(setPlatform);
  }, []);

  return platform;
}

// ---------------------------------------------------------------------------
// Responsive breakpoint helper
// ---------------------------------------------------------------------------

export function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isMobile;
}

// ---------------------------------------------------------------------------
// Feature availability checks
// ---------------------------------------------------------------------------

export function supportsScreenCapture(): boolean {
  return typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices !== "undefined" &&
    typeof navigator.mediaDevices.getDisplayMedia === "function";
}

export function supportsMediaRecorder(): boolean {
  return typeof MediaRecorder !== "undefined";
}

export function supportsFileSystem(): boolean {
  // Desktop Tauri always supports filesystem; mobile may not
  return true;
}
