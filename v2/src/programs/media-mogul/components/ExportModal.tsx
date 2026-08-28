import React, { useState } from "react";
import { useProject } from "../../../core/context/ProjectContext";
import { useStudioCore } from "../../../core/context/StudioCoreContext";
import { RenderExportSettings } from "../../../core/types/video.types";

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { tracks, projectSettings, exportProjectAsCryptArt } = useProject();
  const { videoEngine, fs } = useStudioCore();

  const [format, setFormat] = useState<"mp4" | "webm" | "wav" | "mp3">("webm");
  const [resolution, setResolution] = useState<"1080p" | "4k" | "720p" | "vertical" | "square">("1080p");
  const [fps, setFps] = useState<number>(30);
  const [bitrate, setBitrate] = useState<number>(12);
  const [preset, setPreset] = useState<"youtube" | "tiktok" | "instagram" | "custom">("youtube");
  const [exportRange, setExportRange] = useState<"entire" | "in-out">("entire");

  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);

  if (!isOpen) return null;

  const handleStartRender = async () => {
    setIsRendering(true);
    setRenderProgress(0);

    const exportSettings: RenderExportSettings = {
      format,
      resolution,
      fps,
      videoBitrateMbps: bitrate,
      audioBitrateKbps: 320,
      renderPreset: preset,
      exportRange,
    };

    try {
      const renderedBlob = await videoEngine.exportVideo(
        tracks,
        projectSettings,
        exportSettings,
        (progress) => setRenderProgress(progress)
      );

      const fileName = `${projectSettings.name.replace(/[^a-zA-Z0-9_-]/g, "_")}_Export.${format}`;
      await fs.saveFileToDisk(fileName, renderedBlob, `video/${format}`);

      alert(`🎉 Render complete! File "${fileName}" has been downloaded to your computer!`);
      onClose();
    } catch (e: any) {
      alert(`Render failed: ${e.message}`);
    } finally {
      setIsRendering(false);
      setRenderProgress(0);
    }
  };

  const handleExportCryptArt = async () => {
    await exportProjectAsCryptArt();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-studio-panel border border-studio-border rounded-2xl w-full max-w-xl shadow-elevated overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-studio-border flex items-center justify-between bg-studio-surface/60">
          <div className="flex items-center gap-2">
            <span className="text-xl">🚀</span>
            <h2 className="text-sm font-bold text-studio-text">Deliver & Export Master Video</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isRendering}
            className="text-studio-muted hover:text-studio-text p-1 rounded transition disabled:opacity-30"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <label className="font-semibold text-studio-secondary">Social Media Preset</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPreset("youtube");
                  setResolution("1080p");
                  setFps(30);
                  setBitrate(16);
                }}
                className={`py-2 px-3 rounded-lg border text-left font-medium transition ${
                  preset === "youtube"
                    ? "border-studio-cyan bg-studio-cyan/10 text-studio-cyan"
                    : "border-studio-border bg-studio-surface text-studio-text hover:bg-studio-elevated"
                }`}
              >
                <span className="block font-bold">YouTube 1080p</span>
                <span className="text-[10px] text-studio-muted">16:9 • 1920x1080 • 16Mbps</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreset("tiktok");
                  setResolution("vertical");
                  setFps(30);
                  setBitrate(12);
                }}
                className={`py-2 px-3 rounded-lg border text-left font-medium transition ${
                  preset === "tiktok"
                    ? "border-studio-purple bg-studio-purple/10 text-studio-purple"
                    : "border-studio-border bg-studio-surface text-studio-text hover:bg-studio-elevated"
                }`}
              >
                <span className="block font-bold">TikTok / Reels</span>
                <span className="text-[10px] text-studio-muted">9:16 Vertical • 1080x1920</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreset("instagram");
                  setResolution("square");
                  setFps(30);
                  setBitrate(10);
                }}
                className={`py-2 px-3 rounded-lg border text-left font-medium transition ${
                  preset === "instagram"
                    ? "border-studio-pink bg-studio-pink/10 text-studio-pink"
                    : "border-studio-border bg-studio-surface text-studio-text hover:bg-studio-elevated"
                }`}
              >
                <span className="block font-bold">Square 1:1</span>
                <span className="text-[10px] text-studio-muted">1:1 • 1080x1080</span>
              </button>
            </div>
          </div>

          {/* Export Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-studio-secondary block mb-1 font-semibold">Export Timeline Range</label>
              <select
                value={exportRange}
                onChange={(e) => setExportRange(e.target.value as any)}
                className="w-full bg-studio-bg border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
              >
                <option value="entire">Entire Active Timeline</option>
                <option value="in-out">In / Out Range Only</option>
              </select>
            </div>
            <div>
              <label className="text-studio-secondary block mb-1 font-semibold">Video Bitrate</label>
              <select
                value={bitrate}
                onChange={(e) => setBitrate(parseInt(e.target.value, 10))}
                className="w-full bg-studio-bg border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
              >
                <option value="8">8 Mbps (Standard)</option>
                <option value="12">12 Mbps (High Quality)</option>
                <option value="20">20 Mbps (Master Pro)</option>
              </select>
            </div>
          </div>

          {/* Render Progress Bar */}
          {isRendering && (
            <div className="space-y-1.5 bg-studio-surface p-3 rounded-xl border border-studio-border">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-studio-cyan flex items-center gap-1.5">
                  <span className="animate-spin">⚙️</span> Rendering Video Frames...
                </span>
                <span className="font-mono text-studio-cyan">{renderProgress}%</span>
              </div>
              <div className="w-full h-2 bg-studio-bg rounded-full overflow-hidden">
                <div
                  style={{ width: `${renderProgress}%` }}
                  className="h-full bg-gradient-to-r from-studio-cyan via-studio-purple to-studio-pink transition-all duration-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-studio-border bg-studio-surface/50 flex items-center justify-between">
          <button
            type="button"
            onClick={handleExportCryptArt}
            disabled={isRendering}
            className="px-3 py-2 bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-text rounded-lg text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40"
          >
            <span>💾</span> Save .cryptart Project Backup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isRendering}
              className="px-3 py-2 text-studio-secondary hover:text-studio-text text-xs transition disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleStartRender}
              disabled={isRendering}
              className="px-5 py-2 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-xs rounded-lg transition shadow-glow-sm flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{isRendering ? "Rendering..." : "⚡ Start Video Render"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
