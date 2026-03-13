// ============================================================================
// CryptArtist Studio - Cross-Program Clipboard
// Enables transferring media, code snippets, files, and other data between
// programs. Works alongside the system clipboard but adds rich metadata
// about the source program, content type, and transfer context.
// ============================================================================

import { interopBus } from "./interop";
import type { InteropProgram } from "./interop";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ClipboardContentType =
  | "text"
  | "code"
  | "image"
  | "audio"
  | "video"
  | "file-path"
  | "file-paths"
  | "media-asset"
  | "gdscript"
  | "scene-tree"
  | "ai-prompt"
  | "ai-response"
  | "recording"
  | "sprite"
  | "texture"
  | "project-data"
  | "terminal-output"
  | "custom";

export interface ClipboardEntry {
  /** Unique ID for this clipboard entry */
  id: string;
  /** Content type for routing to the right program */
  contentType: ClipboardContentType;
  /** The actual data (string, object, or base64 for binary) */
  data: unknown;
  /** Human-readable label for the clipboard history UI */
  label: string;
  /** Source program that copied this data */
  source: InteropProgram;
  /** MIME type if applicable */
  mimeType?: string;
  /** File path on disk if applicable */
  filePath?: string;
  /** Additional metadata */
  meta?: Record<string, unknown>;
  /** When this was copied */
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Cross-Program Clipboard Manager
// ---------------------------------------------------------------------------

class CrossClipboard {
  private history: ClipboardEntry[] = [];
  private maxHistory = 50;
  private counter = 0;

  /**
   * Copy data to the cross-program clipboard.
   */
  copy(
    contentType: ClipboardContentType,
    data: unknown,
    label: string,
    source: InteropProgram,
    options?: { mimeType?: string; filePath?: string; meta?: Record<string, unknown> }
  ): string {
    const entry: ClipboardEntry = {
      id: `clip-${++this.counter}-${Date.now()}`,
      contentType,
      data,
      label,
      source,
      mimeType: options?.mimeType,
      filePath: options?.filePath,
      meta: options?.meta,
      timestamp: Date.now(),
    };

    this.history.unshift(entry);
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(0, this.maxHistory);
    }

    logger.action("CrossClipboard", `Copied ${contentType} from ${source}: ${label}`);

    // Broadcast to all programs
    interopBus.emit("clipboard:copied", source, {
      entryId: entry.id,
      contentType,
      label,
      source,
    });

    return entry.id;
  }

  /**
   * Get the most recent clipboard entry, optionally filtered by type.
   */
  peek(contentType?: ClipboardContentType): ClipboardEntry | null {
    if (contentType) {
      return this.history.find((e) => e.contentType === contentType) ?? null;
    }
    return this.history[0] ?? null;
  }

  /**
   * Paste (consume) the most recent entry, optionally filtered.
   * Does not remove from history.
   */
  paste(target: InteropProgram, contentType?: ClipboardContentType): ClipboardEntry | null {
    const entry = this.peek(contentType);
    if (entry) {
      logger.action("CrossClipboard", `Pasted ${entry.contentType} to ${target}: ${entry.label}`);
      interopBus.emit("clipboard:pasted", target, {
        entryId: entry.id,
        contentType: entry.contentType,
        label: entry.label,
        source: entry.source,
        target,
      });
    }
    return entry;
  }

  /**
   * Get clipboard history.
   */
  getHistory(filter?: { contentType?: ClipboardContentType; source?: InteropProgram; limit?: number }): ClipboardEntry[] {
    let items = [...this.history];
    if (filter?.contentType) items = items.filter((e) => e.contentType === filter.contentType);
    if (filter?.source) items = items.filter((e) => e.source === filter.source);
    if (filter?.limit) items = items.slice(0, filter.limit);
    return items;
  }

  /**
   * Get a specific entry by ID.
   */
  getById(id: string): ClipboardEntry | null {
    return this.history.find((e) => e.id === id) ?? null;
  }

  /**
   * Clear clipboard history.
   */
  clear(): void {
    this.history = [];
    logger.action("CrossClipboard", "Clipboard cleared");
  }

  /**
   * Get content types available in clipboard (for paste menu).
   */
  getAvailableTypes(): ClipboardContentType[] {
    return [...new Set(this.history.map((e) => e.contentType))];
  }

  /**
   * Check if clipboard has content compatible with a program.
   */
  hasContentFor(program: InteropProgram): boolean {
    const typeMap: Record<string, ClipboardContentType[]> = {
      "media-mogul": ["image", "audio", "video", "media-asset", "sprite", "texture", "file-path"],
      "vibecode-worker": ["code", "text", "gdscript", "ai-response", "terminal-output", "file-path"],
      "game-studio": ["gdscript", "scene-tree", "sprite", "texture", "code", "image", "media-asset", "file-path"],
      "valley-net": ["text", "ai-prompt", "ai-response", "code", "terminal-output"],
      "demo-recorder": ["recording", "video", "audio", "file-path"],
      "commander": ["text", "code", "terminal-output", "file-path"],
    };
    const acceptedTypes = typeMap[program] ?? [];
    return this.history.some((e) => acceptedTypes.includes(e.contentType));
  }
}

// Global singleton
export const crossClipboard = new CrossClipboard();

// ---------------------------------------------------------------------------
// React Hook
// ---------------------------------------------------------------------------

import { useCallback } from "react";

/**
 * React hook for cross-program clipboard operations bound to a program.
 *
 * @example
 * const clip = useCrossClipboard("media-mogul");
 * clip.copy("image", imageData, "Exported sprite");
 * const entry = clip.paste("code"); // paste code content
 */
export function useCrossClipboard(program: InteropProgram) {
  const copyFn = useCallback(
    (contentType: ClipboardContentType, data: unknown, label: string, options?: { mimeType?: string; filePath?: string; meta?: Record<string, unknown> }) =>
      crossClipboard.copy(contentType, data, label, program, options),
    [program]
  );

  const pasteFn = useCallback(
    (contentType?: ClipboardContentType) => crossClipboard.paste(program, contentType),
    [program]
  );

  const peekFn = useCallback(
    (contentType?: ClipboardContentType) => crossClipboard.peek(contentType),
    []
  );

  const hasContentFn = useCallback(
    () => crossClipboard.hasContentFor(program),
    [program]
  );

  return {
    copy: copyFn,
    paste: pasteFn,
    peek: peekFn,
    hasContent: hasContentFn,
    getHistory: crossClipboard.getHistory.bind(crossClipboard),
    getAvailableTypes: crossClipboard.getAvailableTypes.bind(crossClipboard),
    clear: crossClipboard.clear.bind(crossClipboard),
  };
}
