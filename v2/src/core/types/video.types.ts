// ============================================================================
// CryptArtist Studio v2 - CapCut & DaVinci Video Engine Types
// ============================================================================

export type TrackType = "video" | "audio" | "image" | "text" | "fx";

export type TransitionType =
  | "cut"
  | "cross-dissolve"
  | "dip-to-black"
  | "dip-to-white"
  | "wipe-left"
  | "wipe-right"
  | "slide-up"
  | "zoom-in"
  | "blur-fade";

export interface ColorWheelVal {
  r: number; // -1.0 to +1.0 (default 0)
  g: number; // -1.0 to +1.0 (default 0)
  b: number; // -1.0 to +1.0 (default 0)
  y: number; // Master luminance -1.0 to +1.0 (default 0)
}

export interface ColorGradingParams {
  lift: ColorWheelVal;   // Shadows
  gamma: ColorWheelVal;  // Midtones
  gain: ColorWheelVal;   // Highlights
  offset: ColorWheelVal; // Global exposure
  saturation: number;    // 0.0 to 2.0 (default 1.0)
  contrast: number;      // 0.5 to 2.0 (default 1.0)
  temperature: number;   // -100 to +100 (default 0)
  tint: number;          // -100 to +100 (default 0)
  highlights: number;    // -100 to +100 (default 0)
  shadows: number;       // -100 to +100 (default 0)
  activeLut?: string;    // Name or URL of active 3D/1D LUT
  chromaKeyEnabled: boolean;
  chromaColor: string;   // e.g. '#00ff00'
  chromaSimilarity: number; // 0.0 to 1.0
  chromaSmoothness: number; // 0.0 to 1.0
}

export interface KeyframePoint {
  frame: number;
  value: number;
  easing?: "linear" | "ease-in" | "ease-out" | "ease-in-out";
}

export interface ClipTransform {
  x: number; // Pixels or percentage offset
  y: number;
  scale: number; // 0.1 to 5.0 (default 1.0)
  rotation: number; // Degrees 0 to 360
  opacity: number; // 0.0 to 1.0 (default 1.0)
  blendMode: "normal" | "screen" | "multiply" | "overlay" | "darken" | "lighten";
  keyframes?: {
    scale?: KeyframePoint[];
    opacity?: KeyframePoint[];
    x?: KeyframePoint[];
    y?: KeyframePoint[];
  };
}

export interface TextStyleParams {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  backgroundColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  position: "top" | "center" | "bottom" | "lower-third";
  animation?: "none" | "fade" | "typewriter" | "slide-up";
}

export interface TimelineClip {
  id: string;
  trackId: string;
  name: string;
  mediaId: string;
  mediaType: "video" | "audio" | "image" | "text";
  mediaUrl?: string;
  thumbnailUrl?: string;
  startFrame: number;
  endFrame: number;
  sourceStartFrame: number;
  sourceEndFrame: number;
  speed: number; // 0.25 to 8.0 (default 1.0)
  color: string; // Timeline UI chip color
  transform: ClipTransform;
  colorGrading: ColorGradingParams;
  volume: number; // 0 to 200% (default 100)
  pan: number; // -100 to +100 (default 0)
  eq?: {
    low: number; // -12dB to +12dB
    mid: number;
    high: number;
  };
  transitionIn?: { type: TransitionType; durationFrames: number };
  transitionOut?: { type: TransitionType; durationFrames: number };
  textContent?: string;
  textStyle?: TextStyleParams;
  audioPeaks?: Float32Array;
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  muted: boolean;
  locked: boolean;
  solo: boolean;
  volume: number; // 0 to 100
  pan: number; // -100 to +100
  clips: TimelineClip[];
  height?: number;
}

export interface TimelineMarker {
  id: string;
  frame: number;
  label: string;
  color: string;
  comment?: string;
}

export interface ProjectSettings {
  name: string;
  fps: number; // e.g. 24, 30, 60
  width: number; // e.g. 1920
  height: number; // e.g. 1080
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:3" | "21:9";
  sampleRate: number; // e.g. 48000
  inPoint?: number;
  outPoint?: number;
  notes?: string;
}

export interface RenderExportSettings {
  format: "mp4" | "webm" | "gif" | "wav" | "mp3";
  resolution: "1080p" | "4k" | "720p" | "vertical" | "square";
  fps: number;
  videoBitrateMbps: number;
  audioBitrateKbps: number;
  renderPreset: "youtube" | "tiktok" | "instagram" | "podcast" | "custom";
  exportRange: "entire" | "in-out";
}

export interface IVideoRenderEngine {
  /** Initialize WebGL2 canvas and Web Audio */
  initialize(canvas: HTMLCanvasElement): Promise<void>;
  /** Render specific frame at time with text overlays, transforms, shaders */
  renderFrame(frameIndex: number, tracks: TimelineTrack[], settings: ProjectSettings): void;
  /** Seek timeline */
  seekTo(frameIndex: number): void;
  /** Start playback */
  play(): void;
  /** Pause playback */
  pause(): void;
  /** Export video render via canvas recording + audio mixing */
  exportVideo(
    tracks: TimelineTrack[],
    settings: ProjectSettings,
    exportSettings: RenderExportSettings,
    onProgress: (percent: number) => void
  ): Promise<Blob>;
  /** Capture current frame as image blob */
  captureFrameScreenshot(): Promise<Blob | null>;
  /** Extract audio waveform peaks from file */
  extractWaveformPeaks(audioBlob: Blob, numSamples?: number): Promise<Float32Array>;
}
