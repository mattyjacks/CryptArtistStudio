// ============================================================================
// CryptArtist Studio v2 - Platform & Capability Types
// ============================================================================

export type PlatformRuntime = "web" | "tauri" | "pwa" | "mobile-web";

export interface PlatformCapabilities {
  /** File System Access API (showDirectoryPicker) */
  hasFileSystemAccess: boolean;
  /** Origin Private File System */
  hasOPFS: boolean;
  /** Hardware accelerated WebCodecs (VideoDecoder/VideoEncoder) */
  hasWebCodecs: boolean;
  /** WebGL2 3D / Shader pipeline */
  hasWebGL2: boolean;
  /** WebGPU high-performance pipeline */
  hasWebGPU: boolean;
  /** Web Audio API */
  hasWebAudio: boolean;
  /** Screen & window capture (getDisplayMedia) */
  hasScreenCapture: boolean;
  /** SharedArrayBuffer & Cross-Origin Isolation */
  hasSharedArrayBuffer: boolean;
  /** Offline Service Worker */
  hasServiceWorker: boolean;
}

export interface IPlatformAdapter {
  getRuntime(): PlatformRuntime;
  getCapabilities(): PlatformCapabilities;
  isDesktop(): boolean;
  isWeb(): boolean;
  isMobile(): boolean;
  getPlatformInfo(): {
    os: string;
    browser: string;
    userAgent: string;
    cores: number;
    memoryGB?: number;
  };
}
