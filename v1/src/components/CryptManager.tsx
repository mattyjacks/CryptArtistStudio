// ============================================================================
// CryptManager - Main UI for opening, browsing, and managing .Crypt files
// Reads .Crypt ZIP archives, displays folder contents, allows extracting
// .CryptArt files into workspaces, and shows unknown components gracefully.
// ============================================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  CRYPT_COMPONENTS,
  KNOWN_FOLDERS,
  parseManifest,
  formatBytes,
  formatDuration,
  getCryptAge,
  getFileTypeIcon,
  getCompressionRatio,
  countCryptArtFiles,
  DEFAULT_MUMMY_RUNNER,
  type CryptManifest,
  type CryptFolderName,
  type MummyRunnerConfig,
} from "../utils/crypt";
import { parseCryptArt } from "../utils/cryptart";
import { useWorkspace, programRoute } from "../utils/workspace";
import { logger } from "../utils/logger";
import { toast } from "../utils/toast";
import CryptSaveDialog from "./CryptSaveDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ZipEntry {
  name: string;
  size: number;
  compressed_size: number;
  is_dir: boolean;
}

interface FolderSummary {
  folder: CryptFolderName | string;
  displayName: string;
  emoji: string;
  description: string;
  entries: ZipEntry[];
  totalSize: number;
  isUnknown: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CryptManager() {
  const navigate = useNavigate();
  const ws = useWorkspace();

  const [cryptPath, setCryptPath] = useState<string | null>(null);
  const [manifest, setManifest] = useState<CryptManifest | null>(null);
  const [allEntries, setAllEntries] = useState<ZipEntry[]>([]);
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAwakenConfirm, setShowAwakenConfirm] = useState(false);
  const [mummyStartTime, setMummyStartTime] = useState<number | null>(null);
  const [mummyElapsed, setMummyElapsed] = useState("");

  // Mummy runner state
  const [mummyAwake, setMummyAwake] = useState(false);
  const [mummyRestarts, setMummyRestarts] = useState(0);
  const [mummyPaused, setMummyPaused] = useState(false);
  const [mummyStatus, setMummyStatus] = useState<string>("");
  const mummyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mummyAbortRef = useRef(false);
  const mummyConsecutiveRef = useRef(0);

  // Check for pending .Crypt from file association on mount
  useEffect(() => {
    const pending = sessionStorage.getItem("cryptartist_pending_crypt");
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (data.filePath) {
          sessionStorage.removeItem("cryptartist_pending_crypt");
          loadCrypt(data.filePath);
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Load a .Crypt file
  const loadCrypt = useCallback(async (path: string) => {
    setLoading(true);
    try {
      // Read manifest
      const manifestJson = await invoke<string>("open_crypt", { path });
      const parsed = parseManifest(manifestJson);
      setManifest(parsed);
      setCryptPath(path);

      // List all entries
      const entriesJson = await invoke<string>("list_crypt_contents", { path });
      const entries: ZipEntry[] = JSON.parse(entriesJson);
      setAllEntries(entries);

      // Build folder summaries
      const folderMap = new Map<string, ZipEntry[]>();
      for (const entry of entries) {
        if (entry.name === "Memorial.txt") continue;
        const topFolder = entry.name.split("/")[0];
        if (!topFolder) continue;
        if (!folderMap.has(topFolder)) folderMap.set(topFolder, []);
        // Don't include the folder entry itself
        if (!entry.is_dir || entry.name.split("/").filter(Boolean).length > 1) {
          folderMap.get(topFolder)!.push(entry);
        }
      }

      const summaries: FolderSummary[] = [];
      for (const [folderName, folderEntries] of folderMap) {
        const knownComp = CRYPT_COMPONENTS.find((c) => c.folder === folderName);
        const isUnknown = !KNOWN_FOLDERS.includes(folderName as CryptFolderName);
        summaries.push({
          folder: folderName,
          displayName: knownComp?.displayName || folderName,
          emoji: knownComp?.emoji || "\uD83D\uDCC1",
          description: knownComp?.description || (isUnknown ? "Unknown component (from a newer version)" : ""),
          entries: folderEntries,
          totalSize: folderEntries.reduce((sum, e) => sum + e.size, 0),
          isUnknown,
        });
      }

      // Sort: known folders first (in CRYPT_COMPONENTS order), then unknown
      summaries.sort((a, b) => {
        const aIdx = CRYPT_COMPONENTS.findIndex((c) => c.folder === a.folder);
        const bIdx = CRYPT_COMPONENTS.findIndex((c) => c.folder === b.folder);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.folder.localeCompare(b.folder);
      });

      setFolders(summaries);
      logger.action("CryptManager", `Loaded .Crypt: "${parsed.name}" with ${entries.length} entries`);

      // Store in recent crypts
      try {
        const recent = JSON.parse(localStorage.getItem("cryptartist_recent_crypts") || "[]");
        const updated = [{ path, name: parsed.name, time: Date.now() }, ...recent.filter((r: { path: string }) => r.path !== path)].slice(0, 10);
        localStorage.setItem("cryptartist_recent_crypts", JSON.stringify(updated));
      } catch {
        // Ignore localStorage errors
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("CryptManager", `Failed to load .Crypt: ${msg}`);
      toast.error(`Failed to open .Crypt: ${msg}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Open file dialog to select .Crypt
  const handleOpenCrypt = useCallback(async () => {
    const selected = await openDialog({
      filters: [{ name: "CryptArtist Crypt", extensions: ["Crypt", "crypt"] }],
      multiple: false,
    });
    if (selected && typeof selected === "string") {
      loadCrypt(selected);
    }
  }, [loadCrypt]);

  // Extract a .CryptArt file and open it in a workspace
  const handleExtractCryptArt = useCallback(async (entryPath: string) => {
    if (!cryptPath) return;
    setExtracting(entryPath);
    try {
      const content = await invoke<string>("extract_from_crypt", {
        cryptPath,
        entryPath,
      });
      const project = parseCryptArt(content);
      ws.openWorkspace(project, null);
      toast.success(`Opened "${project.name || entryPath.split("/").pop()}" from Crypt`);
      navigate(programRoute(project.program));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to extract: ${msg}`);
    } finally {
      setExtracting(null);
    }
  }, [cryptPath, ws, navigate]);

  // Open ALL .CryptArt files from Skeleton/ into workspaces
  const handleOpenAllSkeletonFiles = useCallback(async () => {
    if (!cryptPath) return;
    const skeletonFolder = folders.find((f) => f.folder === "Skeleton");
    if (!skeletonFolder) {
      toast.error("No Skeleton/ folder found in this .Crypt");
      return;
    }

    const cryptArtEntries = skeletonFolder.entries.filter(
      (e) => !e.is_dir && /\.cryptart$/i.test(e.name)
    );

    if (cryptArtEntries.length === 0) {
      toast.error("No .CryptArt files found in Skeleton/");
      return;
    }

    // Limit to 69 (workspace max)
    const toOpen = cryptArtEntries.slice(0, 69);
    let openedCount = 0;
    let firstProgram: string | null = null;

    setLoading(true);
    for (const entry of toOpen) {
      try {
        const content = await invoke<string>("extract_from_crypt", {
          cryptPath,
          entryPath: entry.name,
        });
        const project = parseCryptArt(content);
        ws.openWorkspace(project, null);
        openedCount++;
        if (!firstProgram) firstProgram = project.program;
      } catch (err) {
        logger.warn("CryptManager", `Failed to open ${entry.name}: ${err}`);
      }
    }
    setLoading(false);

    if (openedCount > 0) {
      toast.success(`Opened ${openedCount} project${openedCount !== 1 ? "s" : ""} from Crypt`);
      if (firstProgram) navigate(programRoute(firstProgram));
    } else {
      toast.error("Failed to open any projects from Crypt");
    }
  }, [cryptPath, folders, ws, navigate]);

  // -------------------------------------------------------------------------
  // Mummy Runner - resilient auto-restart loop for ValleyNet
  // -------------------------------------------------------------------------

  const getMummyConfig = useCallback(async (): Promise<MummyRunnerConfig> => {
    if (!cryptPath) return { ...DEFAULT_MUMMY_RUNNER };
    try {
      const json = await invoke<string>("extract_from_crypt", {
        cryptPath,
        entryPath: "Pyramid/Mummy.json",
      });
      const parsed = JSON.parse(json);
      return parsed.mummyMode || { ...DEFAULT_MUMMY_RUNNER };
    } catch {
      return { ...DEFAULT_MUMMY_RUNNER };
    }
  }, [cryptPath]);

  const awakenMummy = useCallback(async () => {
    if (!cryptPath || mummyAwake) return;

    const config = await getMummyConfig();
    const program = config.program || "valley-net";

    setMummyAwake(true);
    setMummyPaused(false);
    setMummyRestarts(0);
    setMummyStartTime(Date.now());
    setMummyStatus(`Awakening... launching ${program}`);
    mummyAbortRef.current = false;
    mummyConsecutiveRef.current = 0;

    logger.action("CryptManager", `Mummy awakened - program: ${program}, autoRestart: ${config.autoRestart}`);
    toast.success("The Mummy has awakened!");

    // Extract all Skeleton/ .CryptArt files and open them
    const skeletonFolder = folders.find((f) => f.folder === "Skeleton");
    if (skeletonFolder) {
      const cryptArtEntries = skeletonFolder.entries.filter(
        (e) => !e.is_dir && /\.cryptart$/i.test(e.name)
      );
      for (const entry of cryptArtEntries.slice(0, 69)) {
        if (mummyAbortRef.current) break;
        try {
          const content = await invoke<string>("extract_from_crypt", {
            cryptPath,
            entryPath: entry.name,
          });
          const project = parseCryptArt(content);
          ws.openWorkspace(project, null);
        } catch (err) {
          logger.warn("CryptManager", `Mummy: failed to open ${entry.name}: ${err}`);
        }
      }
    }

    // Navigate to the target program
    navigate(programRoute(program));
    setMummyStatus(`Running ${program} - the Mummy watches over this Crypt`);

    // Set up health-check interval for resilient auto-restart
    if (config.autoRestart) {
      const healthCheck = () => {
        if (mummyAbortRef.current) {
          if (mummyTimerRef.current) clearInterval(mummyTimerRef.current);
          return;
        }

        // Check if the program route is still active by seeing if workspaces exist
        // If all workspaces got closed/errored, re-open the Skeleton files
        try {
          const activeWorkspaces = ws.workspaces || [];
          const hasActiveWork = activeWorkspaces.length > 0;

          if (!hasActiveWork && !mummyAbortRef.current) {
            mummyConsecutiveRef.current++;
            const consecutiveCount = mummyConsecutiveRef.current;

            if (consecutiveCount > (config.maxConsecutiveRestarts || 10)) {
              // Pause to avoid runaway restarts
              setMummyPaused(true);
              setMummyStatus(
                `Mummy paused after ${consecutiveCount} restarts. Will resume in ${((config.pauseDurationMs || 30000) / 1000).toFixed(0)}s...`
              );
              logger.warn("CryptManager", `Mummy paused after ${consecutiveCount} consecutive restarts`);

              if (mummyTimerRef.current) clearInterval(mummyTimerRef.current);

              // Resume after pause
              setTimeout(() => {
                if (mummyAbortRef.current) return;
                mummyConsecutiveRef.current = 0;
                setMummyPaused(false);
                setMummyStatus(`Mummy resuming after pause...`);
                // Re-navigate
                navigate(programRoute(program));
                // Re-start health check
                mummyTimerRef.current = setInterval(healthCheck, config.healthCheckMs || 5000);
              }, config.pauseDurationMs || 30000);
              return;
            }

            // Restart after delay
            setMummyRestarts((prev) => prev + 1);
            setMummyStatus(
              `Restarting ${program} (attempt ${consecutiveCount})...`
            );
            logger.action("CryptManager", `Mummy restarting ${program} (attempt ${consecutiveCount})`);

            setTimeout(() => {
              if (mummyAbortRef.current) return;
              navigate(programRoute(program));
              setMummyStatus(`Running ${program} - the Mummy watches over this Crypt`);
            }, config.restartDelayMs || 3000);
          } else if (hasActiveWork) {
            // Reset consecutive counter on successful health check
            mummyConsecutiveRef.current = 0;
          }
        } catch (err) {
          logger.warn("CryptManager", `Mummy health check error: ${err}`);
        }
      };

      mummyTimerRef.current = setInterval(healthCheck, config.healthCheckMs || 5000);
    }
  }, [cryptPath, mummyAwake, folders, ws, navigate, getMummyConfig]);

  const silenceMummy = useCallback(() => {
    mummyAbortRef.current = true;
    if (mummyTimerRef.current) {
      clearInterval(mummyTimerRef.current);
      mummyTimerRef.current = null;
    }
    setMummyAwake(false);
    setMummyPaused(false);
    setMummyStatus("");
    setMummyRestarts(0);
    setMummyStartTime(null);
    mummyConsecutiveRef.current = 0;
    logger.action("CryptManager", "Mummy silenced");
    toast.success("The Mummy has been silenced.");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mummyAbortRef.current = true;
      if (mummyTimerRef.current) {
        clearInterval(mummyTimerRef.current);
        mummyTimerRef.current = null;
      }
    };
  }, []);

  // Mummy elapsed time ticker
  useEffect(() => {
    if (!mummyAwake || !mummyStartTime) { setMummyElapsed(""); return; }
    const tick = setInterval(() => {
      setMummyElapsed(formatDuration(Date.now() - mummyStartTime));
    }, 1000);
    return () => clearInterval(tick);
  }, [mummyAwake, mummyStartTime]);

  // Total size
  const totalSize = allEntries.reduce((sum, e) => sum + e.size, 0);
  const totalCompressed = allEntries.reduce((sum, e) => sum + e.compressed_size, 0);
  const unknownCount = folders.filter((f) => f.isUnknown).length;
  const hasPyramid = folders.some((f) => f.folder === "Pyramid" && f.entries.length > 0);
  const totalProjects = countCryptArtFiles(allEntries);
  const nonEmptyFolders = folders.filter((f) => f.entries.length > 0).length;

  // Filter entries by search query
  const filteredFolders = searchQuery.trim()
    ? folders.map((f) => ({
        ...f,
        entries: f.entries.filter((e) =>
          e.name.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((f) => f.entries.length > 0)
    : folders;

  // Keyboard shortcut: Ctrl+Shift+M to awaken/silence
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        if (mummyAwake) silenceMummy();
        else if (hasPyramid && manifest) setShowAwakenConfirm(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mummyAwake, silenceMummy, hasPyramid, manifest]);

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg text-studio-text overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-studio-border bg-gradient-to-r from-purple-900/20 to-indigo-900/20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">&#x26B0;&#xFE0F;</span>
          <div>
            <h1 className="text-xl font-bold">
              {manifest ? manifest.name : "Crypt Manager"}
            </h1>
            {manifest && (
              <p className="text-sm text-studio-text-muted">
                v{manifest.version} by {manifest.author || "Unknown"} - {formatBytes(totalSize)}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="px-3 py-1.5 text-sm rounded border border-studio-border text-studio-text hover:bg-studio-surface transition-colors"
          >
            Back to Launcher
          </button>
          <button
            type="button"
            onClick={handleOpenCrypt}
            className="px-3 py-1.5 text-sm rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Open .Crypt
          </button>
          {manifest && (
            <>
              {hasPyramid && !mummyAwake && (
                <button
                  type="button"
                  onClick={() => setShowAwakenConfirm(true)}
                  disabled={loading}
                  title="Ctrl+Shift+M"
                  className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 animate-pulse hover:animate-none"
                >
                  <span>&#x1F9CC;</span> Awaken the Mummy
                </button>
              )}
              {mummyAwake && (
                <button
                  type="button"
                  onClick={silenceMummy}
                  title="Ctrl+Shift+M"
                  className="px-4 py-1.5 text-sm rounded bg-red-600 hover:bg-red-500 text-white font-bold transition-colors flex items-center gap-1.5"
                >
                  <span>&#x1F6D1;</span> Silence the Mummy
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenAllSkeletonFiles}
                disabled={loading}
                className="px-3 py-1.5 text-sm rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Opening..." : "Open All Projects"}
              </button>
              <button
                type="button"
                onClick={() => setShowSaveDialog(true)}
                className="px-3 py-1.5 text-sm rounded bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
              >
                Save Crypt
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {!manifest ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <span className="text-6xl opacity-30">&#x26B0;&#xFE0F;</span>
          <p className="text-lg text-studio-text-muted">No .Crypt file loaded</p>
          <p className="text-sm text-studio-text-muted">
            Open a .Crypt file or double-click one in File Explorer
          </p>
          <button
            type="button"
            onClick={handleOpenCrypt}
            className="px-6 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-medium transition-colors"
          >
            Open .Crypt File
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Mummy Status Banner */}
          {mummyAwake && (
            <div className={`border rounded-lg p-4 flex items-center gap-4 ${
              mummyPaused
                ? "bg-red-900/20 border-red-500/30"
                : "bg-amber-900/20 border-amber-500/30"
            }`}>
              <span className="text-3xl">{mummyPaused ? "\u23F8\uFE0F" : "\uD83E\uDDCC"}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-200">
                    {mummyPaused ? "Mummy Paused" : "Mummy Active"}
                  </span>
                  {mummyRestarts > 0 && (
                    <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">
                      {mummyRestarts} restart{mummyRestarts !== 1 ? "s" : ""}
                    </span>
                  )}
                  <span className="text-[10px] bg-green-500/30 text-green-300 px-1.5 py-0.5 rounded animate-pulse">
                    FOREVER MODE
                  </span>
                  {mummyElapsed && (
                    <span className="text-[10px] bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded">
                      {mummyElapsed}
                    </span>
                  )}
                </div>
                <p className="text-xs text-studio-text-muted mt-0.5">
                  {mummyStatus}
                </p>
              </div>
              <button
                type="button"
                onClick={silenceMummy}
                className="px-3 py-1 text-xs rounded bg-red-600/50 hover:bg-red-500 text-white transition-colors"
              >
                Silence
              </button>
            </div>
          )}

          {/* Manifest Info */}
          <div className="bg-studio-surface border border-studio-border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-studio-text-muted uppercase tracking-wide mb-2">
              Memorial.txt
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-studio-text-muted">Version:</span>{" "}
                <span className="text-studio-text">{manifest.version}</span>
              </div>
              <div>
                <span className="text-studio-text-muted">Author:</span>{" "}
                <span className="text-studio-text">{manifest.author || "Unknown"}</span>
              </div>
              <div>
                <span className="text-studio-text-muted">Created:</span>{" "}
                <span className="text-studio-text">
                  {new Date(manifest.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-studio-text-muted">Format:</span>{" "}
                <span className="text-studio-text">$crypt v{manifest.$crypt}</span>
              </div>
            </div>
            {manifest.description && (
              <p className="mt-2 text-sm text-studio-text-muted">{manifest.description}</p>
            )}
            {manifest.tags && manifest.tags.length > 0 && (
              <div className="mt-2 flex gap-1 flex-wrap">
                {manifest.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <div className="bg-studio-surface border border-studio-border rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-purple-400">{totalProjects}</div>
              <div className="text-[10px] text-studio-text-muted uppercase">Projects</div>
            </div>
            <div className="bg-studio-surface border border-studio-border rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-cyan-400">{nonEmptyFolders}</div>
              <div className="text-[10px] text-studio-text-muted uppercase">Folders</div>
            </div>
            <div className="bg-studio-surface border border-studio-border rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-green-400">{allEntries.length}</div>
              <div className="text-[10px] text-studio-text-muted uppercase">Entries</div>
            </div>
            <div className="bg-studio-surface border border-studio-border rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-amber-400">{formatBytes(totalSize)}</div>
              <div className="text-[10px] text-studio-text-muted uppercase">Total Size</div>
            </div>
            <div className="bg-studio-surface border border-studio-border rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-indigo-400">{getCompressionRatio(totalSize, totalCompressed)}</div>
              <div className="text-[10px] text-studio-text-muted uppercase">Compressed</div>
            </div>
            <div className="bg-studio-surface border border-studio-border rounded-lg px-3 py-2 text-center">
              <div className="text-lg font-bold text-rose-400">{manifest ? getCryptAge(manifest) : "N/A"}</div>
              <div className="text-[10px] text-studio-text-muted uppercase">Age</div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files and folders..."
              className="w-full px-4 py-2 pl-9 bg-studio-surface border border-studio-border rounded-lg text-sm text-studio-text placeholder:text-studio-text-muted focus:outline-none focus:border-purple-500 transition-colors"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-studio-text-muted text-sm">
              &#x1F50D;
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-studio-text-muted hover:text-studio-text text-xs"
              >
                &#x2715;
              </button>
            )}
          </div>

          {/* Unknown Components Warning */}
          {unknownCount > 0 && (
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3 flex items-start gap-3">
              <span className="text-xl">&#x26A0;&#xFE0F;</span>
              <div>
                <p className="text-sm font-medium text-amber-300">
                  {unknownCount} unknown component{unknownCount !== 1 ? "s" : ""} detected
                </p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  This .Crypt contains components from a newer version of CryptArtist Studio.
                  You can still browse and extract files from them.
                </p>
              </div>
            </div>
          )}

          {/* Folder Grid */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-studio-text-muted">
              {searchQuery ? `${filteredFolders.length} matching` : `${folders.length} folders`}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setExpandedFolder(null)}
                className="text-xs text-studio-text-muted hover:text-studio-text transition-colors"
              >
                Collapse All
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {filteredFolders.map((folder) => (
              <div
                key={folder.folder}
                className={`bg-studio-surface border rounded-lg overflow-hidden transition-colors ${
                  folder.isUnknown
                    ? "border-amber-500/30"
                    : "border-studio-border"
                }`}
              >
                {/* Folder Header */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedFolder(
                      expandedFolder === folder.folder ? null : folder.folder
                    )
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-studio-bg/50 transition-colors text-left"
                >
                  <span className="text-xl">{folder.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{folder.displayName}</span>
                      <span className="text-xs text-studio-text-muted">
                        ({folder.folder}/)
                      </span>
                      {folder.isUnknown && (
                        <span className="text-[10px] bg-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded">
                          Unknown
                        </span>
                      )}
                      {folder.folder === "Pyramid" && folder.entries.length > 0 && (
                        <span className="text-[10px] bg-amber-600/30 text-amber-200 px-1.5 py-0.5 rounded">
                          &#x1F9CC; Mummy Inside
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-studio-text-muted truncate">
                      {folder.folder === "Pyramid" && folder.entries.length > 0
                        ? "Self-running bootstrap - downloads CryptArtist & opens this .Crypt"
                        : `${folder.entries.length} file${folder.entries.length !== 1 ? "s" : ""} - ${formatBytes(folder.totalSize)}`}
                    </p>
                  </div>
                  <span className="text-studio-text-muted text-sm">
                    {expandedFolder === folder.folder ? "\u25BC" : "\u25B6"}
                  </span>
                </button>

                {/* Folder Contents */}
                {expandedFolder === folder.folder && (
                  <div className="border-t border-studio-border bg-studio-bg/30 max-h-[300px] overflow-y-auto">
                    {folder.entries.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-studio-text-muted italic">
                        Empty folder
                      </p>
                    ) : (
                      folder.entries.map((entry) => {
                        const fileName = entry.name.split("/").pop() || entry.name;
                        const isCryptArt = /\.cryptart$/i.test(fileName);
                        return (
                          <div
                            key={entry.name}
                            className="flex items-center gap-2 px-4 py-1.5 hover:bg-studio-surface/50 text-sm"
                          >
                            <span className="text-studio-text-muted text-xs">
                              {entry.is_dir ? "\uD83D\uDCC1" : getFileTypeIcon(entry.name.split("/").pop() || "")}
                            </span>
                            <span className="flex-1 truncate text-studio-text">
                              {fileName}
                            </span>
                            <span className="text-xs text-studio-text-muted">
                              {formatBytes(entry.size)}
                            </span>
                            {isCryptArt && (
                              <button
                                type="button"
                                onClick={() => handleExtractCryptArt(entry.name)}
                                disabled={extracting === entry.name}
                                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                              >
                                {extracting === entry.name ? "Opening..." : "Open"}
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awaken Confirmation Dialog */}
      {showAwakenConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-studio-surface border border-amber-500/40 rounded-xl shadow-2xl w-[420px] p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">&#x1F9CC;</span>
              <div>
                <h3 className="text-lg font-bold text-amber-200">Awaken the Mummy?</h3>
                <p className="text-sm text-studio-text-muted">This will run ValleyNet in forever mode</p>
              </div>
            </div>
            <div className="bg-amber-900/20 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300/80 space-y-1">
              <p>The Mummy will:</p>
              <p>- Open all .CryptArt files from Skeleton/</p>
              <p>- Navigate to ValleyNet</p>
              <p>- Auto-restart on errors (runs forever)</p>
              <p>- Use Ctrl+Shift+M to silence later</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAwakenConfirm(false)}
                className="px-4 py-1.5 text-sm rounded border border-studio-border text-studio-text hover:bg-studio-bg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setShowAwakenConfirm(false); awakenMummy(); }}
                className="px-4 py-1.5 text-sm rounded bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors"
              >
                Awaken
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Dialog */}
      <CryptSaveDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        cryptName={manifest?.name || "My Project"}
        cryptDescription={manifest?.description || ""}
        cryptAuthor={manifest?.author || ""}
        existingPath={cryptPath}
      />
    </div>
  );
}
