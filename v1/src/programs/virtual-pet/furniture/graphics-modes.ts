// ============================================================================
// Virtual Pet Room - Graphics Mode Configuration & GPU Detection
// ============================================================================

import * as THREE from "three";
import type { GraphicsMode } from "./room-types";

const SETTINGS_KEY = "cryptartist_pet_graphics_mode";

// Renderer configuration per graphics mode
export interface GraphicsConfig {
  shadowMapEnabled: boolean;
  shadowMapType: THREE.ShadowMapType;
  shadowMapSize: number;
  antialias: boolean;
  pixelRatioMax: number;
  toneMapping: THREE.ToneMapping;
  toneMappingExposure: number;
  // For "epic" mode - would need a post-processing pass for raytracing-like effects
  useSSAO: boolean;
  useBloom: boolean;
  useReflections: boolean;
}

export const GRAPHICS_CONFIGS: Record<GraphicsMode, GraphicsConfig> = {
  wireframe: {
    shadowMapEnabled: false,
    shadowMapType: THREE.BasicShadowMap,
    shadowMapSize: 256,
    antialias: false,
    pixelRatioMax: 1,
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 1,
    useSSAO: false,
    useBloom: false,
    useReflections: false,
  },
  basic: {
    shadowMapEnabled: false,
    shadowMapType: THREE.BasicShadowMap,
    shadowMapSize: 256,
    antialias: true,
    pixelRatioMax: 1.5,
    toneMapping: THREE.NoToneMapping,
    toneMappingExposure: 1,
    useSSAO: false,
    useBloom: false,
    useReflections: false,
  },
  okay: {
    shadowMapEnabled: true,
    shadowMapType: THREE.BasicShadowMap,
    shadowMapSize: 512,
    antialias: true,
    pixelRatioMax: 1.5,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.0,
    useSSAO: false,
    useBloom: false,
    useReflections: false,
  },
  good: {
    shadowMapEnabled: true,
    shadowMapType: THREE.PCFShadowMap,
    shadowMapSize: 1024,
    antialias: true,
    pixelRatioMax: 2,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.0,
    useSSAO: false,
    useBloom: false,
    useReflections: false,
  },
  great: {
    shadowMapEnabled: true,
    shadowMapType: THREE.PCFSoftShadowMap,
    shadowMapSize: 2048,
    antialias: true,
    pixelRatioMax: 2,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.1,
    useSSAO: true,
    useBloom: true,
    useReflections: false,
  },
  epic: {
    shadowMapEnabled: true,
    shadowMapType: THREE.PCFSoftShadowMap,
    shadowMapSize: 4096,
    antialias: true,
    pixelRatioMax: 2,
    toneMapping: THREE.ACESFilmicToneMapping,
    toneMappingExposure: 1.2,
    useSSAO: true,
    useBloom: true,
    useReflections: true,
  },
};

// Detect GPU capability and return recommended graphics mode
export function detectGraphicsMode(): GraphicsMode {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return "basic";

    const debugExt = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugExt
      ? gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL)
      : "";
    const rendererLower = (renderer as string).toLowerCase();

    // Check if mobile
    const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

    // Check for known high-end GPUs
    const isHighEnd =
      /rtx\s*(30|40|50)/i.test(rendererLower) ||
      /radeon\s*rx\s*(6[89]|7[0-9])/i.test(rendererLower) ||
      /apple\s*m[2-9]/i.test(rendererLower) ||
      /arc\s*a[57]/i.test(rendererLower);

    const isMidRange =
      /rtx\s*(20)/i.test(rendererLower) ||
      /gtx\s*(1[06-9])/i.test(rendererLower) ||
      /radeon\s*rx\s*(5[5-9]|6[0-7])/i.test(rendererLower) ||
      /apple\s*m1/i.test(rendererLower) ||
      /intel\s*iris\s*xe/i.test(rendererLower);

    const isLowEnd =
      /intel\s*(hd|uhd)\s*(4|5|6)/i.test(rendererLower) ||
      /mali/i.test(rendererLower) ||
      /adreno\s*(5|6[0-2])/i.test(rendererLower) ||
      /powervr/i.test(rendererLower);

    // Check max texture size as a proxy for GPU power
    const maxTexSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;

    canvas.remove();

    if (isMobile) {
      if (isHighEnd) return "good";
      if (isLowEnd || maxTexSize < 4096) return "basic";
      return "good"; // Default for mobile
    }

    // Desktop
    if (isHighEnd && maxTexSize >= 16384) return "epic";
    if (isHighEnd) return "great";
    if (isMidRange) return "great"; // Default for desktop
    if (isLowEnd) return "okay";

    // Unknown desktop GPU - default to great
    return "great";
  } catch {
    return "good";
  }
}

// Load saved graphics mode or auto-detect
export function loadGraphicsMode(): GraphicsMode {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved && saved in GRAPHICS_CONFIGS) {
      return saved as GraphicsMode;
    }
  } catch { /* ignore */ }
  return detectGraphicsMode();
}

// Save graphics mode to localStorage
export function saveGraphicsMode(mode: GraphicsMode): void {
  try {
    localStorage.setItem(SETTINGS_KEY, mode);
  } catch { /* quota exceeded */ }
}

// Apply graphics config to a renderer
export function applyGraphicsConfig(
  renderer: THREE.WebGLRenderer,
  mode: GraphicsMode,
): void {
  const config = GRAPHICS_CONFIGS[mode];
  renderer.shadowMap.enabled = config.shadowMapEnabled;
  renderer.shadowMap.type = config.shadowMapType;
  renderer.toneMapping = config.toneMapping;
  renderer.toneMappingExposure = config.toneMappingExposure;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.pixelRatioMax));
}
