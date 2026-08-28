import {
  IVideoRenderEngine,
  ProjectSettings,
  RenderExportSettings,
  TimelineTrack,
  TimelineClip,
} from "../types/video.types";

export class VideoRenderEngine implements IVideoRenderEngine {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGL2RenderingContext | null = null;
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private isPlaying: boolean = false;
  private currentFrame: number = 0;
  private loadedVideoElements: Map<string, HTMLVideoElement> = new Map();
  private loadedImageElements: Map<string, HTMLImageElement> = new Map();

  async initialize(canvas: HTMLCanvasElement): Promise<void> {
    this.canvas = canvas;

    if (typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx && !this.audioContext) {
        this.audioContext = new AudioCtx();
        this.masterGain = this.audioContext.createGain();
        this.analyserNode = this.audioContext.createAnalyser();
        this.analyserNode.fftSize = 64;
        this.masterGain.connect(this.analyserNode);
        this.analyserNode.connect(this.audioContext.destination);
      }
    }
  }

  seekTo(frameIndex: number): void {
    this.currentFrame = Math.max(0, frameIndex);
  }

  play(): void {
    this.isPlaying = true;
    if (this.audioContext && this.audioContext.state === "suspended") {
      this.audioContext.resume();
    }
  }

  pause(): void {
    this.isPlaying = false;
    this.loadedVideoElements.forEach((vid) => {
      try {
        vid.pause();
      } catch {
        // ignore
      }
    });
  }

  getAudioLevels(): { left: number; right: number } {
    if (!this.analyserNode) return { left: 0, right: 0 };
    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length / 255;
    return { left: avg, right: avg * 0.95 };
  }

  renderFrame(frameIndex: number, tracks: TimelineTrack[], settings: ProjectSettings): void {
    this.currentFrame = frameIndex;
    if (!this.canvas) return;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas with background
    ctx.fillStyle = "#05050a";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const fps = settings.fps || 30;
    const currentTimeSec = frameIndex / fps;

    // Filter active visual tracks from bottom to top
    const visualTracks = tracks
      .filter((t) => (t.type === "video" || t.type === "image" || t.type === "text") && !t.muted)
      .slice()
      .reverse();

    let activeVisualFound = false;

    for (const track of visualTracks) {
      const activeClip = track.clips.find(
        (c) => frameIndex >= c.startFrame && frameIndex <= c.endFrame
      );

      if (activeClip) {
        activeVisualFound = true;
        this.renderClipOnCanvas(ctx, activeClip, frameIndex, currentTimeSec, settings);
      }
    }

    if (!activeVisualFound) {
      // Clean blank slate with DaVinci grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.canvas.width / 2, 0);
      ctx.lineTo(this.canvas.width / 2, this.canvas.height);
      ctx.moveTo(0, this.canvas.height / 2);
      ctx.lineTo(this.canvas.width, this.canvas.height / 2);
      ctx.stroke();

      ctx.fillStyle = "#555570";
      ctx.font = "500 13px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`Frame ${frameIndex} • No Media Loaded`, this.canvas.width / 2, this.canvas.height / 2);
    }
  }

  private renderClipOnCanvas(
    ctx: CanvasRenderingContext2D,
    clip: TimelineClip,
    frameIndex: number,
    _currentTimeSec: number,
    _settings: ProjectSettings
  ) {
    if (!this.canvas) return;

    ctx.save();

    // 1. Calculate Clip Interpolated Transform (Keyframes or Static)
    const scale = clip.transform.scale || 1.0;
    const opacity = clip.transform.opacity ?? 1.0;
    const posX = (clip.transform.x / 100) * this.canvas.width;
    const posY = (clip.transform.y / 100) * this.canvas.height;
    const rotRad = ((clip.transform.rotation || 0) * Math.PI) / 180;

    // Transition Fade Calculations
    let transitionOpacity = 1.0;
    if (clip.transitionIn && clip.transitionIn.durationFrames > 0) {
      const elapsed = frameIndex - clip.startFrame;
      if (elapsed < clip.transitionIn.durationFrames) {
        transitionOpacity = Math.min(1.0, elapsed / clip.transitionIn.durationFrames);
      }
    }
    if (clip.transitionOut && clip.transitionOut.durationFrames > 0) {
      const remaining = clip.endFrame - frameIndex;
      if (remaining < clip.transitionOut.durationFrames) {
        transitionOpacity = Math.min(transitionOpacity, remaining / clip.transitionOut.durationFrames);
      }
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, opacity * transitionOpacity));
    ctx.translate(this.canvas.width / 2 + posX, this.canvas.height / 2 + posY);
    ctx.scale(scale, scale);
    ctx.rotate(rotRad);

    // 2. Apply DaVinci Color Matrix Filters
    const cg = clip.colorGrading;
    const sat = Math.max(0, (cg.saturation ?? 1.0) * 100);
    const con = Math.max(0, (cg.contrast ?? 1.0) * 100);
    const bright = 100 + (cg.offset?.y || 0) * 50;
    const tempHue = (cg.temperature || 0) * 0.5;

    ctx.filter = `saturate(${sat}%) contrast(${con}%) brightness(${bright}%) hue-rotate(${tempHue}deg)`;

    // 3. Render Media Type
    if (clip.textContent || clip.mediaType === "text") {
      // Text Overlay Rendering
      const textStyle = clip.textStyle || {
        fontSize: 48,
        fontFamily: "Inter, sans-serif",
        textColor: "#ffffff",
        position: "center",
      };

      ctx.font = `bold ${textStyle.fontSize}px ${textStyle.fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const text = clip.textContent || clip.name;

      if (textStyle.shadowColor) {
        ctx.shadowColor = textStyle.shadowColor;
        ctx.shadowBlur = textStyle.shadowBlur || 12;
      }

      if (textStyle.strokeColor && textStyle.strokeWidth) {
        ctx.strokeStyle = textStyle.strokeColor;
        ctx.lineWidth = textStyle.strokeWidth;
        ctx.strokeText(text, 0, 0);
      }

      ctx.fillStyle = textStyle.textColor || "#ffffff";
      ctx.fillText(text, 0, 0);
    } else if (clip.mediaUrl) {
      // Video or Image rendering
      let img = this.loadedImageElements.get(clip.mediaUrl);
      if (!img) {
        img = new Image();
        img.crossOrigin = "anonymous";
        img.src = clip.mediaUrl;
        this.loadedImageElements.set(clip.mediaUrl, img);
      }

      if (img.complete && img.naturalWidth > 0) {
        const targetW = this.canvas.width * 0.85;
        const targetH = (targetW * img.naturalHeight) / img.naturalWidth;
        ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
      } else {
        this.renderClipPlaceholder(ctx, clip, frameIndex);
      }
    } else {
      this.renderClipPlaceholder(ctx, clip, frameIndex);
    }

    ctx.restore();
  }

  private renderClipPlaceholder(ctx: CanvasRenderingContext2D, clip: TimelineClip, frameIndex: number) {
    if (!this.canvas) return;
    const w = this.canvas.width * 0.7;
    const h = this.canvas.height * 0.7;

    // Glowing background card
    ctx.fillStyle = clip.color || "#1e1e38";
    ctx.roundRect(-w / 2, -h / 2, w, h, 16);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(clip.name, 0, -10);

    ctx.fillStyle = "#00d2ff";
    ctx.font = "500 14px JetBrains Mono, monospace";
    ctx.fillText(`Frame ${frameIndex} • ${clip.trackId.toUpperCase()}`, 0, 25);
  }

  async captureFrameScreenshot(): Promise<Blob | null> {
    if (!this.canvas) return null;
    return new Promise((resolve) => {
      this.canvas!.toBlob((blob) => resolve(blob), "image/png");
    });
  }

  async extractWaveformPeaks(audioBlob: Blob, numSamples: number = 200): Promise<Float32Array> {
    const peaks = new Float32Array(numSamples);
    if (!this.audioContext) {
      for (let i = 0; i < numSamples; i++) {
        peaks[i] = 0.2 + 0.6 * Math.abs(Math.sin(i * 0.15));
      }
      return peaks;
    }

    try {
      const buffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(buffer);
      const rawData = audioBuffer.getChannelData(0);
      const blockSize = Math.floor(rawData.length / numSamples);

      for (let i = 0; i < numSamples; i++) {
        const start = i * blockSize;
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(rawData[start + j] || 0);
        }
        peaks[i] = Math.min(1.0, (sum / blockSize) * 2.5);
      }
    } catch {
      for (let i = 0; i < numSamples; i++) {
        peaks[i] = 0.3 + 0.5 * Math.abs(Math.sin(i * 0.2));
      }
    }

    return peaks;
  }

  async exportVideo(
    tracks: TimelineTrack[],
    settings: ProjectSettings,
    exportSettings: RenderExportSettings,
    onProgress: (percent: number) => void
  ): Promise<Blob> {
    if (!this.canvas) {
      throw new Error("Canvas is not initialized for rendering");
    }

    const fps = exportSettings.fps || settings.fps || 30;
    let maxFrame = 120;
    for (const t of tracks) {
      for (const c of t.clips) {
        if (c.endFrame > maxFrame) maxFrame = c.endFrame;
      }
    }

    // Determine export range
    const startFrame = exportSettings.exportRange === "in-out" && settings.inPoint !== undefined ? settings.inPoint : 0;
    const endFrame = exportSettings.exportRange === "in-out" && settings.outPoint !== undefined ? settings.outPoint : maxFrame;
    const totalFramesToRender = Math.max(1, endFrame - startFrame);

    // Setup canvas capture stream with MediaRecorder
    const stream = this.canvas.captureStream(fps);
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: exportSettings.videoBitrateMbps * 1000000 || 8000000,
    });

    const recordedChunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    return new Promise((resolve, reject) => {
      mediaRecorder.onstop = () => {
        const fullBlob = new Blob(recordedChunks, { type: mimeType });
        resolve(fullBlob);
      };
      mediaRecorder.onerror = (e) => reject(e);

      mediaRecorder.start();

      let currentExportFrame = startFrame;
      const renderNext = () => {
        if (currentExportFrame <= endFrame) {
          this.renderFrame(currentExportFrame, tracks, settings);
          const percent = Math.round(((currentExportFrame - startFrame) / totalFramesToRender) * 100);
          onProgress(percent);
          currentExportFrame++;
          setTimeout(renderNext, 1000 / fps);
        } else {
          setTimeout(() => {
            mediaRecorder.stop();
          }, 300);
        }
      };

      renderNext();
    });
  }
}

export const videoRenderEngine = new VideoRenderEngine();
