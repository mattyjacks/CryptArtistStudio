import React, { useState, useRef } from "react";
import { VirtualFileEntry } from "../../../core/types/filesystem.types";
import { useStudioCore } from "../../../core/context/StudioCoreContext";
import { useProject } from "../../../core/context/ProjectContext";
import { useAI } from "../../../core/context/AIContext";

export interface MediaBrowserProps {
  onOpenDriveModal?: () => void;
  onOpenFolderModal?: () => void;
}

export const MediaBrowser: React.FC<MediaBrowserProps> = () => {
  const { fs, drive } = useStudioCore();
  const { addClipToTrack, currentFrame } = useProject();
  const { engine } = useAI();

  const [activeTab, setActiveTab] = useState<"bin" | "local-folder" | "google-drive" | "pexels">("bin");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [previewingItemId, setPreviewingItemId] = useState<string | null>(null);

  // Local folder state
  const mountedDir = fs.getMountedDirectory();
  const [folderFiles, setFolderFiles] = useState<VirtualFileEntry[]>([]);
  const [isScanningFolder, setIsScanningFolder] = useState(false);

  // Google Drive state
  const [driveUrlInput, setDriveUrlInput] = useState("");
  const [isResolvingDrive, setIsResolvingDrive] = useState(false);
  const [driveAssets, setDriveAssets] = useState<VirtualFileEntry[]>([]);

  // Pexels Stock state
  const [pexelsQuery, setPexelsQuery] = useState("cinematic city");
  const [pexelsResults, setPexelsResults] = useState<any[]>([]);
  const [isSearchingPexels, setIsSearchingPexels] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial media items
  const [binMedia, setBinMedia] = useState<VirtualFileEntry[]>([
    {
      id: "bin_1",
      name: "Studio_Host_A-Roll.mp4",
      path: "/media/Studio_Host_A-Roll.mp4",
      sizeBytes: 14200000,
      lastModified: Date.now(),
      mediaType: "video",
      mimeType: "video/mp4",
      extension: "mp4",
      duration: 15,
      source: "imported",
    },
    {
      id: "bin_2",
      name: "Cinematic City B-Roll.mp4",
      path: "/media/Cinematic City B-Roll.mp4",
      sizeBytes: 9800000,
      lastModified: Date.now(),
      mediaType: "video",
      mimeType: "video/mp4",
      extension: "mp4",
      duration: 10,
      source: "imported",
    },
    {
      id: "bin_3",
      name: "Product_Demo_Walkthrough.mp4",
      path: "/media/Product_Demo_Walkthrough.mp4",
      sizeBytes: 18400000,
      lastModified: Date.now(),
      mediaType: "video",
      mimeType: "video/mp4",
      extension: "mp4",
      duration: 20,
      source: "imported",
    },
    {
      id: "bin_4",
      name: "Host_Voiceover.wav",
      path: "/audio/Host_Voiceover.wav",
      sizeBytes: 4200000,
      lastModified: Date.now(),
      mediaType: "audio",
      mimeType: "audio/wav",
      extension: "wav",
      duration: 15,
      source: "imported",
    },
    {
      id: "bin_5",
      name: "Synthwave_Ambient_Beat.mp3",
      path: "/audio/Synthwave_Ambient_Beat.mp3",
      sizeBytes: 3100000,
      lastModified: Date.now(),
      mediaType: "audio",
      mimeType: "audio/mp3",
      extension: "mp3",
      duration: 30,
      source: "imported",
    },
  ]);

  // Handle direct file upload from desktop
  const handleFilesUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newEntries: VirtualFileEntry[] = [];
    Array.from(files).forEach((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isVid = ["mp4", "mov", "webm", "mkv"].includes(ext);
      const isAud = ["mp3", "wav", "aac", "ogg", "flac"].includes(ext);
      const isImg = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);

      const mediaType = isVid ? "video" : isAud ? "audio" : isImg ? "image" : "unknown";
      const objectUrl = URL.createObjectURL(file);

      newEntries.push({
        id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: file.name,
        path: file.name,
        sizeBytes: file.size,
        lastModified: file.lastModified,
        mediaType: mediaType as any,
        mimeType: file.type || "application/octet-stream",
        extension: ext,
        objectUrl,
        thumbnailUrl: isImg ? objectUrl : undefined,
        duration: isVid ? 10 : isAud ? 15 : undefined,
        source: "imported",
      });
    });

    setBinMedia((prev) => [...newEntries, ...prev]);
  };

  // Mount local computer folder
  const handleMountFolder = async () => {
    try {
      setIsScanningFolder(true);
      const info = await fs.mountLocalDirectory();
      if (info) {
        const files = await fs.listDirectoryFiles();
        setFolderFiles(files);
        setActiveTab("local-folder");
      }
    } catch (e: any) {
      alert(`Could not mount folder: ${e.message}`);
    } finally {
      setIsScanningFolder(false);
    }
  };

  // Resolve Google Drive link
  const handleAddDriveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driveUrlInput.trim()) return;

    try {
      setIsResolvingDrive(true);
      const metadata = await drive.resolveDriveLink(driveUrlInput.trim());
      const virtualEntry: VirtualFileEntry = {
        id: `gdrive_${metadata.id}`,
        name: metadata.name,
        path: `gdrive://${metadata.id}`,
        sizeBytes: metadata.sizeBytes || 0,
        lastModified: Date.now(),
        mediaType: "video",
        mimeType: metadata.mimeType,
        extension: "mp4",
        objectUrl: metadata.directStreamUrl,
        thumbnailUrl: metadata.thumbnailLink,
        duration: 15,
        source: "google-drive",
      };

      setDriveAssets((prev) => [virtualEntry, ...prev]);
      setBinMedia((prev) => [virtualEntry, ...prev]);
      setDriveUrlInput("");
      alert(`✅ Added Google Drive media: ${metadata.name}`);
    } catch (e: any) {
      alert(`Failed to add Google Drive link: ${e.message}`);
    } finally {
      setIsResolvingDrive(false);
    }
  };

  // Search Pexels stock
  const handleSearchPexels = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pexelsQuery.trim()) return;
    setIsSearchingPexels(true);
    try {
      const results = await engine.searchPexelsStock(pexelsQuery, "video");
      setPexelsResults(results);
    } catch {
      // ignore
    } finally {
      setIsSearchingPexels(false);
    }
  };

  // Add media directly onto timeline
  const handleAddToTimeline = (item: VirtualFileEntry | any) => {
    const isAudio = item.mediaType === "audio";
    const trackId = isAudio ? "a1" : "v2";
    const durationFrames = (item.duration || 5) * 30;

    const newClip = {
      id: `clip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      trackId,
      name: item.name || item.title || "Clip",
      mediaId: item.id,
      mediaType: isAudio ? ("audio" as const) : ("video" as const),
      mediaUrl: item.objectUrl || item.videoUrl || item.imageUrl,
      thumbnailUrl: item.thumbnailUrl,
      startFrame: currentFrame,
      endFrame: currentFrame + durationFrames,
      sourceStartFrame: 0,
      sourceEndFrame: durationFrames,
      speed: 1.0,
      color: isAudio ? "#4ade80" : "#00d2ff",
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" as const },
      colorGrading: {
        lift: { r: 0, g: 0, b: 0, y: 0 },
        gamma: { r: 0, g: 0, b: 0, y: 0 },
        gain: { r: 0, g: 0, b: 0, y: 0 },
        offset: { r: 0, g: 0, b: 0, y: 0 },
        saturation: 1.0,
        contrast: 1.0,
        temperature: 0,
        tint: 0,
        highlights: 0,
        shadows: 0,
        chromaKeyEnabled: false,
        chromaColor: "#00ff00",
        chromaSimilarity: 0.4,
        chromaSmoothness: 0.1,
      },
      volume: 100,
      pan: 0,
    };

    addClipToTrack(trackId, newClip);
  };

  const renderItemList = (items: VirtualFileEntry[]) => {
    const filtered = items.filter((it) => {
      const matchSearch = it.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = filterType === "all" || it.mediaType === filterType;
      return matchSearch && matchType;
    });

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-studio-muted">
          <span className="text-3xl mb-2">📁</span>
          <p className="text-xs">No media found in this category.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-2 p-2 max-h-[420px] overflow-y-auto">
        {filtered.map((item) => {
          const isPreviewing = previewingItemId === item.id;
          return (
            <div
              key={item.id}
              className="group relative flex flex-col bg-studio-surface/80 hover:bg-studio-elevated border border-studio-border hover:border-studio-cyan/50 rounded-lg p-2 transition select-none"
            >
              <div
                onClick={() => handleAddToTimeline(item)}
                className="w-full aspect-video bg-studio-bg rounded flex items-center justify-center overflow-hidden relative mb-1.5 cursor-pointer"
              >
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl opacity-60">
                    {item.mediaType === "video" ? "🎬" : item.mediaType === "audio" ? "🎵" : "🖼️"}
                  </span>
                )}
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/70 text-studio-cyan">
                  {item.duration ? `${item.duration}s` : item.extension.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-studio-text font-medium truncate flex-1" title={item.name}>
                  {item.name}
                </p>
                <button
                  onClick={() => setPreviewingItemId(isPreviewing ? null : item.id)}
                  className="text-[10px] text-studio-muted hover:text-studio-cyan ml-1"
                  title="Preview audio/video"
                >
                  {isPreviewing ? "⏹" : "▶"}
                </button>
              </div>

              <div className="flex items-center justify-between mt-1 text-[10px] text-studio-muted">
                <span className="capitalize">{item.source.replace("-", " ")}</span>
                <button
                  onClick={() => handleAddToTimeline(item)}
                  className="text-studio-cyan hover:underline font-semibold"
                >
                  + Add
                </button>
              </div>

              {/* In-bin Audio preview player */}
              {isPreviewing && item.objectUrl && (
                <div className="mt-1.5 pt-1.5 border-t border-studio-border">
                  <audio src={item.objectUrl} autoPlay controls className="w-full h-6" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleFilesUpload(e.dataTransfer.files);
      }}
      className="flex flex-col h-full bg-studio-panel border-r border-studio-border"
    >
      {/* Header & Tabs */}
      <div className="p-3 border-b border-studio-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-studio-text flex items-center gap-2">
            <span>📺</span> Media Library
          </h2>
          <div className="flex items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/*,audio/*,image/*"
              onChange={(e) => handleFilesUpload(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2 py-1 text-xs rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-text transition flex items-center gap-1"
              title="Import files from computer"
            >
              <span>+</span> Import
            </button>
            <button
              onClick={handleMountFolder}
              className="px-2.5 py-1 text-xs rounded bg-studio-surface hover:bg-studio-cyan/20 hover:text-studio-cyan border border-studio-border hover:border-studio-cyan/40 transition flex items-center gap-1"
              title="Mount a folder on your computer"
            >
              <span>📂</span> Mount PC Folder
            </button>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1 p-1 bg-studio-bg rounded-lg text-xs">
          <button
            onClick={() => setActiveTab("bin")}
            className={`flex-1 py-1.5 rounded-md font-medium transition ${
              activeTab === "bin"
                ? "bg-studio-surface text-studio-cyan shadow-sm"
                : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            Project Bin ({binMedia.length})
          </button>
          <button
            onClick={() => setActiveTab("local-folder")}
            className={`flex-1 py-1.5 rounded-md font-medium transition ${
              activeTab === "local-folder"
                ? "bg-studio-surface text-studio-cyan shadow-sm"
                : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            PC Folder
          </button>
          <button
            onClick={() => setActiveTab("google-drive")}
            className={`flex-1 py-1.5 rounded-md font-medium transition ${
              activeTab === "google-drive"
                ? "bg-studio-surface text-studio-cyan shadow-sm"
                : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            Drive Links
          </button>
          <button
            onClick={() => {
              setActiveTab("pexels");
              if (pexelsResults.length === 0) handleSearchPexels();
            }}
            className={`flex-1 py-1.5 rounded-md font-medium transition ${
              activeTab === "pexels"
                ? "bg-studio-surface text-studio-cyan shadow-sm"
                : "text-studio-secondary hover:text-studio-text"
            }`}
          >
            Stock
          </button>
        </div>

        {/* Search & Filter bar */}
        <div className="flex items-center gap-2 mt-2.5">
          <input
            type="text"
            placeholder="Search media..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-studio-bg border border-studio-border rounded px-2.5 py-1 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-secondary focus:outline-none focus:border-studio-cyan"
          >
            <option value="all">All ({binMedia.length})</option>
            <option value="video">Video ({binMedia.filter((m) => m.mediaType === "video").length})</option>
            <option value="audio">Audio ({binMedia.filter((m) => m.mediaType === "audio").length})</option>
            <option value="image">Image ({binMedia.filter((m) => m.mediaType === "image").length})</option>
          </select>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === "bin" && renderItemList(binMedia)}

        {/* Local PC Folder */}
        {activeTab === "local-folder" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-2.5 bg-studio-surface/50 border-b border-studio-border flex items-center justify-between text-xs">
              <span className="text-studio-secondary truncate">
                {mountedDir ? `📁 ${mountedDir.name} (${folderFiles.length} files)` : "No PC folder mounted"}
              </span>
              <button
                onClick={handleMountFolder}
                className="text-studio-cyan hover:underline ml-2"
              >
                {mountedDir ? "Change Folder" : "Select PC Folder"}
              </button>
            </div>
            {isScanningFolder ? (
              <div className="p-8 text-center text-xs text-studio-secondary">Scanning folder files...</div>
            ) : folderFiles.length > 0 ? (
              renderItemList(folderFiles)
            ) : (
              <div className="p-8 text-center text-xs text-studio-muted flex flex-col items-center">
                <span className="text-3xl mb-2">📁</span>
                <p>Click "Select PC Folder" to mount any directory on your computer directly into Media Mogul!</p>
              </div>
            )}
          </div>
        )}

        {/* Google Drive Tab */}
        {activeTab === "google-drive" && (
          <div className="flex-1 flex flex-col overflow-hidden p-3">
            <form onSubmit={handleAddDriveLink} className="space-y-2 mb-3">
              <label className="text-xs font-semibold text-studio-text block">
                Paste Google Drive Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/.../view"
                  value={driveUrlInput}
                  onChange={(e) => setDriveUrlInput(e.target.value)}
                  className="flex-1 bg-studio-bg border border-studio-border rounded px-2.5 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                />
                <button
                  type="submit"
                  disabled={isResolvingDrive}
                  className="px-3 py-1.5 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-semibold text-xs rounded transition disabled:opacity-50"
                >
                  {isResolvingDrive ? "Adding..." : "Add to Library"}
                </button>
              </div>
              <p className="text-[11px] text-studio-muted">
                Make sure the Drive file permission is set to "Anyone with the link can view".
              </p>
            </form>

            <div className="flex-1 overflow-y-auto">
              <h3 className="text-xs font-semibold text-studio-secondary mb-2">Drive Assets ({driveAssets.length})</h3>
              {driveAssets.length > 0 ? (
                renderItemList(driveAssets)
              ) : (
                <div className="p-6 text-center text-xs text-studio-muted">
                  No Google Drive files imported yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pexels Stock */}
        {activeTab === "pexels" && (
          <div className="flex-1 flex flex-col overflow-hidden p-3">
            <form onSubmit={handleSearchPexels} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Search stock videos..."
                value={pexelsQuery}
                onChange={(e) => setPexelsQuery(e.target.value)}
                className="flex-1 bg-studio-bg border border-studio-border rounded px-2.5 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
              />
              <button
                type="submit"
                disabled={isSearchingPexels}
                className="px-3 py-1.5 bg-studio-purple hover:bg-studio-purple/80 text-white font-semibold text-xs rounded transition"
              >
                Search
              </button>
            </form>

            <div className="flex-1 overflow-y-auto">
              {isSearchingPexels ? (
                <div className="p-8 text-center text-xs text-studio-secondary">Searching Pexels video library...</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {pexelsResults.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleAddToTimeline(item)}
                      className="group relative flex flex-col bg-studio-surface/80 hover:bg-studio-elevated border border-studio-border hover:border-studio-purple/50 rounded-lg p-2 transition cursor-pointer"
                    >
                      <div className="w-full aspect-video bg-studio-bg rounded overflow-hidden relative mb-1.5">
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-black/70 text-studio-purple">
                          {item.duration || 10}s
                        </span>
                      </div>
                      <p className="text-xs text-studio-text font-medium truncate">{item.title}</p>
                      <span className="text-[10px] text-studio-purple group-hover:underline mt-1">+ Add to Timeline</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaBrowser;
