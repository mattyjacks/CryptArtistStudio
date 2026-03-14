// ============================================================================
// CryptArtist Studio - File Association Handler
// Opens .CryptArt files from the OS file explorer (double-click) and routes
// to the correct program with the file data loaded.
//
// Supported platforms:
//   - Windows: File path passed as CLI arg -> backend stores it -> frontend polls
//   - macOS:   NSOpenFile event -> Tauri RunEvent::Opened -> event emitted to frontend
//   - Linux:   File path passed as CLI arg (same as Windows)
//
// Flow:
//   1. On app startup, frontend calls `get_file_to_open` to check for pending files
//   2. If files found, reads each file, parses as .CryptArt, routes to program
//   3. Clears pending files after processing
//   4. Also listens for `cryptart-file-open` event for files opened while running
// ============================================================================

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { parseCryptArt, routeForProgram } from "./cryptart";
import { logger } from "./logger";
import { toast } from "./toast";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FileOpenResult {
  filePath: string;
  program: string;
  route: string;
  name: string;
  data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Core: Read and parse a .CryptArt file from disk
// ---------------------------------------------------------------------------

async function readAndParseCryptArtFile(filePath: string): Promise<FileOpenResult | null> {
  try {
    logger.info("file-association", `Reading .CryptArt file: ${filePath}`);
    const content = await invoke<string>("read_text_file", { path: filePath });
    const parsed = parseCryptArt(content);
    const route = routeForProgram(parsed.program);

    logger.info(
      "file-association",
      `Parsed .CryptArt: program=${parsed.program}, name=${parsed.name || "unnamed"}`
    );

    return {
      filePath,
      program: parsed.program,
      route,
      name: parsed.name || "Untitled",
      data: parsed.data,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("file-association", `Failed to open .CryptArt file: ${msg}`);
    toast.error(`Failed to open file: ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Startup check: Poll backend for any .CryptArt files passed via CLI args
// ---------------------------------------------------------------------------

export async function checkFileAssociation(
  navigate: (path: string) => void
): Promise<FileOpenResult[]> {
  try {
    const pendingFiles = await invoke<string[]>("get_file_to_open");
    if (!pendingFiles || pendingFiles.length === 0) return [];

    logger.info("file-association", `Found ${pendingFiles.length} pending .CryptArt file(s)`);

    const results: FileOpenResult[] = [];

    for (const filePath of pendingFiles) {
      const result = await readAndParseCryptArtFile(filePath);
      if (result) {
        results.push(result);
      }
    }

    // Clear the pending files in the backend
    await invoke("clear_file_to_open");

    // Navigate to the first file's program
    if (results.length > 0) {
      const first = results[0];
      logger.action("file-association", `Navigating to ${first.route} for "${first.name}"`);
      toast.success(`Opened "${first.name}" in ${first.program}`);
      navigate(first.route);
    }

    return results;
  } catch (err) {
    // Silently fail if backend commands aren't available (e.g., browser dev mode)
    logger.warn("file-association", `checkFileAssociation failed: ${err}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Live listener: Handle files opened while the app is already running
// (macOS NSOpenFile, or future deep-link events)
// ---------------------------------------------------------------------------

export async function listenForFileOpen(
  navigate: (path: string) => void
): Promise<() => void> {
  try {
    const unlisten = await listen<string[]>("cryptart-file-open", async (event) => {
      const paths = event.payload;
      if (!paths || paths.length === 0) return;

      logger.info("file-association", `Received file-open event with ${paths.length} file(s)`);

      for (const filePath of paths) {
        const result = await readAndParseCryptArtFile(filePath);
        if (result) {
          logger.action("file-association", `Navigating to ${result.route} for "${result.name}"`);
          toast.success(`Opened "${result.name}" in ${result.program}`);
          navigate(result.route);
          // Only navigate to the first file for now
          break;
        }
      }

      // Clear pending files
      try {
        await invoke("clear_file_to_open");
      } catch {
        // Ignore clear failures
      }
    });

    logger.info("file-association", "Listening for cryptart-file-open events");
    return unlisten;
  } catch {
    // Silently fail in browser dev mode
    return () => {};
  }
}
