import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

// ---------------------------------------------------------------------------
// Platform detection - works on desktop and mobile Tauri targets
// ---------------------------------------------------------------------------

export type DeviceType = "mobile" | "tablet" | "desktop";

export interface PlatformInfo {
  os: string;
  arch: string;
  family: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  deviceType: DeviceType;
}

const DEFAULT_PLATFORM: PlatformInfo = {
  os: "unknown",
  arch: "unknown",
  family: "unknown",
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  isTouchDevice: false,
  deviceType: "desktop",
};

function classifyDevice(width: number, isTouchDevice: boolean): DeviceType {
  if (width < 768) return "mobile";
  if (width < 1024 && isTouchDevice) return "tablet";
  if (width >= 768 && width < 1200 && isTouchDevice) return "tablet";
  return "desktop";
}

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

    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const ua = navigator.userAgent;
    const isTabletUA = /ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua));
    const isMobileUA = info.is_mobile || /android|iphone|ipod/i.test(ua);
    const dt = classifyDevice(window.innerWidth, touch);
    cachedPlatform = {
      os: info.os,
      arch: info.arch,
      family: info.family,
      isMobile: (isMobileUA && !isTabletUA) || dt === "mobile",
      isTablet: isTabletUA || dt === "tablet",
      isDesktop: info.is_desktop && !isMobileUA && !isTabletUA && dt === "desktop",
      isTouchDevice: touch,
      deviceType: dt,
    };
  } catch {
    // Fallback for web-only / dev mode
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isTabletUA = /ipad|tablet|playbook|silk/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua));
    const dt = classifyDevice(window.innerWidth, touch);
    cachedPlatform = {
      os: ua.includes("win") ? "windows" : ua.includes("mac") ? "macos" : ua.includes("linux") ? "linux" : ua.includes("android") ? "android" : ua.includes("iphone") || ua.includes("ipad") ? "ios" : "unknown",
      arch: "unknown",
      family: isMobile ? "mobile" : "desktop",
      isMobile: isMobile && !isTabletUA,
      isTablet: isTabletUA || dt === "tablet",
      isDesktop: !isMobile && !isTabletUA,
      isTouchDevice: touch,
      deviceType: dt,
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

// ---------------------------------------------------------------------------
// Tablet viewport hook
// ---------------------------------------------------------------------------

export function useIsTabletViewport(): boolean {
  const [isTablet, setIsTablet] = useState(
    window.innerWidth >= 768 && window.innerWidth < 1200
  );

  useEffect(() => {
    const handler = () => setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1200);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return isTablet;
}

// ---------------------------------------------------------------------------
// Device type hook (mobile / tablet / desktop) - reactive to resize
// ---------------------------------------------------------------------------

export function useDeviceType(): DeviceType {
  const [device, setDevice] = useState<DeviceType>(() => {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    return classifyDevice(window.innerWidth, touch);
  });

  useEffect(() => {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const handler = () => setDevice(classifyDevice(window.innerWidth, touch));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return device;
}

// ---------------------------------------------------------------------------
// Orientation hook
// ---------------------------------------------------------------------------

export function useOrientation(): "portrait" | "landscape" {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">(
    window.innerHeight > window.innerWidth ? "portrait" : "landscape"
  );

  useEffect(() => {
    const handler = () => {
      setOrientation(window.innerHeight > window.innerWidth ? "portrait" : "landscape");
    };
    window.addEventListener("resize", handler);
    window.addEventListener("orientationchange", handler);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("orientationchange", handler);
    };
  }, []);

  return orientation;
}
