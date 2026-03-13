// ---------------------------------------------------------------------------
// CryptArtist Studio - ZIP Audio Import System
// Bulk import audio files from ZIP archives
// Supports: mp3, wav, ogg, flac, aac, m4a, wma, opus, webm
// ---------------------------------------------------------------------------

import { logSecurityEvent } from "./security";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioFile {
  name: string;
  path: string;
  extension: string;
  size: number;
  data: Uint8Array;
  mimeType: string;
  blobUrl?: string;
}

export interface AudioImportResult {
  success: boolean;
  files: AudioFile[];
  skipped: string[];
  errors: string[];
  totalSize: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SUPPORTED_AUDIO_EXTENSIONS = new Set([
  "mp3", "wav", "ogg", "flac", "aac", "m4a", "wma", "opus", "webm",
  "aif", "aiff", "mid", "midi", "amr", "ape", "wv",
]);

const MIME_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  aac: "audio/aac",
  m4a: "audio/mp4",
  wma: "audio/x-ms-wma",
  opus: "audio/opus",
  webm: "audio/webm",
  aif: "audio/aiff",
  aiff: "audio/aiff",
  mid: "audio/midi",
  midi: "audio/midi",
  amr: "audio/amr",
  ape: "audio/x-ape",
  wv: "audio/x-wavpack",
};

const MAX_ZIP_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB max ZIP
const MAX_SINGLE_FILE_SIZE = 500 * 1024 * 1024; // 500 MB max single file
const MAX_FILES_PER_ZIP = 10000;
const MAX_FILENAME_LENGTH = 255;
const MAX_PATH_DEPTH = 20;

// ---------------------------------------------------------------------------
// ZIP parsing (minimal local file header parser)
// ---------------------------------------------------------------------------

interface ZipEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  offset: number;
  dataOffset: number;
}

function parseZipEntries(buffer: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buffer);
  const entries: ZipEntry[] = [];
  let offset = 0;

  while (offset < buffer.byteLength - 4 && entries.length < MAX_FILES_PER_ZIP) {
    const sig = view.getUint32(offset, true);

    // Local file header signature
    if (sig !== 0x04034b50) break;

    const compressionMethod = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const uncompressedSize = view.getUint32(offset + 22, true);
    const filenameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);

    const filenameBytes = new Uint8Array(buffer, offset + 30, filenameLength);
    const filename = new TextDecoder().decode(filenameBytes);

    const dataOffset = offset + 30 + filenameLength + extraLength;

    entries.push({
      filename,
      compressedSize,
      uncompressedSize,
      compressionMethod,
      offset,
      dataOffset,
    });

    offset = dataOffset + compressedSize;
  }

  return entries;
}

async function decompressEntry(buffer: ArrayBuffer, entry: ZipEntry): Promise<Uint8Array> {
  const compressedData = new Uint8Array(buffer, entry.dataOffset, entry.compressedSize);

  if (entry.compressionMethod === 0) {
    // Stored (no compression)
    return compressedData;
  }

  if (entry.compressionMethod === 8) {
    // Deflate
    const ds = new DecompressionStream("deflate-raw");
    const writer = ds.writable.getWriter();
    const reader = ds.readable.getReader();

    writer.write(compressedData);
    writer.close();

    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      totalLength += value.byteLength;
    }

    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const chunk of chunks) {
      result.set(chunk, pos);
      pos += chunk.byteLength;
    }
    return result;
  }

  throw new Error(`Unsupported compression method: ${entry.compressionMethod}`);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isAudioFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return SUPPORTED_AUDIO_EXTENSIONS.has(ext);
}

function getExtension(filename: string): string {
  return (filename.split(".").pop() || "").toLowerCase();
}

function sanitizeFilename(filename: string): string {
  // Remove path traversal
  let safe = filename.replace(/\.\.\//g, "").replace(/\.\.\\/g, "");
  // Remove null bytes
  safe = safe.replace(/\0/g, "");
  // Get just the filename (no directories)
  const parts = safe.split(/[/\\]/);
  safe = parts[parts.length - 1] || "unknown";
  // Truncate
  if (safe.length > MAX_FILENAME_LENGTH) {
    const ext = getExtension(safe);
    safe = safe.substring(0, MAX_FILENAME_LENGTH - ext.length - 1) + "." + ext;
  }
  return safe;
}

function validateZipEntry(entry: ZipEntry): string | null {
  // Check for zip bombs (compression ratio > 100x)
  if (entry.compressionMethod !== 0 && entry.uncompressedSize > entry.compressedSize * 100) {
    return `Suspicious compression ratio for ${entry.filename} (possible zip bomb)`;
  }
  // Check max file size
  if (entry.uncompressedSize > MAX_SINGLE_FILE_SIZE) {
    return `File too large: ${entry.filename} (${Math.round(entry.uncompressedSize / 1024 / 1024)}MB, max ${MAX_SINGLE_FILE_SIZE / 1024 / 1024}MB)`;
  }
  // Check path depth
  const depth = entry.filename.split(/[/\\]/).length;
  if (depth > MAX_PATH_DEPTH) {
    return `Path too deep: ${entry.filename}`;
  }
  // Check for path traversal
  if (entry.filename.includes("..")) {
    return `Path traversal detected: ${entry.filename}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function importAudioFromZip(file: File): Promise<AudioImportResult> {
  const result: AudioImportResult = {
    success: false,
    files: [],
    skipped: [],
    errors: [],
    totalSize: 0,
  };

  // Validate ZIP file
  if (file.size > MAX_ZIP_SIZE) {
    result.errors.push(`ZIP file too large: ${Math.round(file.size / 1024 / 1024)}MB (max ${MAX_ZIP_SIZE / 1024 / 1024}MB)`);
    logSecurityEvent("audio-zip", "high", "ZIP file exceeds size limit", String(file.size));
    return result;
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    result.errors.push("File must be a .zip archive");
    return result;
  }

  logger.action("AudioZIP", `Importing: ${file.name} (${Math.round(file.size / 1024)}KB)`);

  try {
    const buffer = await file.arrayBuffer();
    const entries = parseZipEntries(buffer);

    if (entries.length === 0) {
      result.errors.push("No files found in ZIP archive");
      return result;
    }

    if (entries.length > MAX_FILES_PER_ZIP) {
      result.errors.push(`Too many files in ZIP (${entries.length}, max ${MAX_FILES_PER_ZIP})`);
      logSecurityEvent("audio-zip", "medium", "ZIP contains too many files", String(entries.length));
      return result;
    }

    logger.action("AudioZIP", `Found ${entries.length} entries in ZIP`);

    for (const entry of entries) {
      // Skip directories
      if (entry.filename.endsWith("/") || entry.filename.endsWith("\\")) continue;

      // Skip non-audio files
      if (!isAudioFile(entry.filename)) {
        result.skipped.push(entry.filename);
        continue;
      }

      // Validate entry
      const validationError = validateZipEntry(entry);
      if (validationError) {
        result.errors.push(validationError);
        logSecurityEvent("audio-zip", "medium", validationError);
        continue;
      }

      try {
        const data = await decompressEntry(buffer, entry);
        const ext = getExtension(entry.filename);
        const safeName = sanitizeFilename(entry.filename);

        const audioFile: AudioFile = {
          name: safeName,
          path: entry.filename,
          extension: ext,
          size: data.byteLength,
          data,
          mimeType: MIME_TYPES[ext] || "audio/mpeg",
        };

        // Create blob URL for playback
        const blob = new Blob([data.buffer as ArrayBuffer], { type: audioFile.mimeType });
        audioFile.blobUrl = URL.createObjectURL(blob);

        result.files.push(audioFile);
        result.totalSize += data.byteLength;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push(`Failed to extract ${entry.filename}: ${msg}`);
      }
    }

    result.success = result.files.length > 0;
    logger.action("AudioZIP", `Import complete: ${result.files.length} audio files, ${result.skipped.length} skipped, ${result.errors.length} errors`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to parse ZIP: ${msg}`);
    logSecurityEvent("audio-zip", "high", "ZIP parsing failed", msg);
  }

  return result;
}

export function releaseAudioFiles(files: AudioFile[]): void {
  for (const f of files) {
    if (f.blobUrl) {
      URL.revokeObjectURL(f.blobUrl);
      f.blobUrl = undefined;
    }
  }
}

export function getSupportedExtensions(): string[] {
  return Array.from(SUPPORTED_AUDIO_EXTENSIONS);
}

export function isAudioExtension(ext: string): boolean {
  return SUPPORTED_AUDIO_EXTENSIONS.has(ext.toLowerCase().replace(".", ""));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
}
