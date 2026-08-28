import {
  DirectoryHandleInfo,
  FileMediaType,
  IFileSystemDriver,
  VirtualFileEntry,
} from "../../types/filesystem.types";

const MEDIA_EXTENSIONS: Record<string, { type: FileMediaType; mime: string }> = {
  // Video
  mp4: { type: "video", mime: "video/mp4" },
  mov: { type: "video", mime: "video/quicktime" },
  webm: { type: "video", mime: "video/webm" },
  mkv: { type: "video", mime: "video/x-matroska" },
  avi: { type: "video", mime: "video/x-msvideo" },
  // Audio
  mp3: { type: "audio", mime: "audio/mpeg" },
  wav: { type: "audio", mime: "audio/wav" },
  ogg: { type: "audio", mime: "audio/ogg" },
  aac: { type: "audio", mime: "audio/aac" },
  m4a: { type: "audio", mime: "audio/mp4" },
  flac: { type: "audio", mime: "audio/flac" },
  // Image
  png: { type: "image", mime: "image/png" },
  jpg: { type: "image", mime: "image/jpeg" },
  jpeg: { type: "image", mime: "image/jpeg" },
  webp: { type: "image", mime: "image/webp" },
  svg: { type: "image", mime: "image/svg+xml" },
  gif: { type: "gif", mime: "image/gif" },
  // Project
  cryptart: { type: "cryptart", mime: "application/json" },
  json: { type: "code", mime: "application/json" },
  ts: { type: "code", mime: "text/typescript" },
  tsx: { type: "code", mime: "text/tsx" },
  js: { type: "code", mime: "text/javascript" },
  html: { type: "code", mime: "text/html" },
  css: { type: "code", mime: "text/css" },
  md: { type: "document", mime: "text/markdown" },
};

export class BrowserFileSystemDriver implements IFileSystemDriver {
  private currentDirHandle: FileSystemDirectoryHandle | null = null;
  private directoryInfo: DirectoryHandleInfo | null = null;
  private opfsRoot: FileSystemDirectoryHandle | null = null;
  private memoryFiles: Map<string, VirtualFileEntry> = new Map();

  constructor() {
    this.initOPFS();
  }

  private async initOPFS() {
    if (typeof navigator !== "undefined" && "storage" in navigator && "getDirectory" in navigator.storage) {
      try {
        this.opfsRoot = await navigator.storage.getDirectory();
      } catch (e) {
        console.warn("[FileSystemDriver] OPFS unavailable", e);
      }
    }
  }

  async mountLocalDirectory(): Promise<DirectoryHandleInfo | null> {
    if (typeof window === "undefined" || !("showDirectoryPicker" in window)) {
      throw new Error("File System Access API is not supported in this browser. Please use Chrome, Edge, or Opera.");
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });

      this.currentDirHandle = handle;
      let count = 0;
      for await (const _entry of (handle as any).values()) {
        count++;
      }

      this.directoryInfo = {
        name: handle.name,
        path: `/${handle.name}`,
        fileCount: count,
        mountedAt: Date.now(),
        handle,
      };

      return this.directoryInfo;
    } catch (e: any) {
      if (e.name === "AbortError") {
        return null; // User cancelled
      }
      throw e;
    }
  }

  getMountedDirectory(): DirectoryHandleInfo | null {
    return this.directoryInfo;
  }

  async unmountDirectory(): Promise<void> {
    this.currentDirHandle = null;
    this.directoryInfo = null;
    this.memoryFiles.clear();
  }

  async listDirectoryFiles(subPath?: string): Promise<VirtualFileEntry[]> {
    if (!this.currentDirHandle) {
      return Array.from(this.memoryFiles.values());
    }

    const results: VirtualFileEntry[] = [];
    await this.scanDirectoryHandle(this.currentDirHandle, subPath || "", results);
    return results;
  }

  private async scanDirectoryHandle(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    out: VirtualFileEntry[]
  ): Promise<void> {
    for await (const entry of (dirHandle as any).values()) {
      if (entry.kind === "file") {
        const file = await entry.getFile();
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const meta = MEDIA_EXTENSIONS[ext] || { type: "unknown" as FileMediaType, mime: file.type || "application/octet-stream" };

        const entryPath = currentPath ? `${currentPath}/${file.name}` : file.name;
        const objectUrl = URL.createObjectURL(file);

        const virtualEntry: VirtualFileEntry = {
          id: `file_${entryPath}_${file.lastModified}`,
          name: file.name,
          path: entryPath,
          sizeBytes: file.size,
          lastModified: file.lastModified,
          mediaType: meta.type,
          mimeType: meta.mime,
          extension: ext,
          objectUrl,
          thumbnailUrl: meta.type === "image" || meta.type === "gif" ? objectUrl : undefined,
          source: "local-folder",
          fileHandle: entry,
        };

        this.memoryFiles.set(virtualEntry.id, virtualEntry);
        out.push(virtualEntry);
      } else if (entry.kind === "directory") {
        const nextSubPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        await this.scanDirectoryHandle(entry, nextSubPath, out);
      }
    }
  }

  async readFileAsBlob(fileEntry: VirtualFileEntry): Promise<Blob> {
    if (fileEntry.fileHandle) {
      return await fileEntry.fileHandle.getFile();
    }
    if (fileEntry.objectUrl) {
      const resp = await fetch(fileEntry.objectUrl);
      return await resp.blob();
    }
    throw new Error(`Cannot read file: ${fileEntry.name}`);
  }

  async readFileAsArrayBuffer(fileEntry: VirtualFileEntry): Promise<ArrayBuffer> {
    const blob = await this.readFileAsBlob(fileEntry);
    return await blob.arrayBuffer();
  }

  async readFileAsText(fileEntry: VirtualFileEntry): Promise<string> {
    const blob = await this.readFileAsBlob(fileEntry);
    return await blob.text();
  }

  async cacheInOPFS(key: string, blob: Blob): Promise<string> {
    if (!this.opfsRoot) {
      // Fallback to object URL
      return URL.createObjectURL(blob);
    }

    try {
      const sanitizedKey = key.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileHandle = await this.opfsRoot.getFileHandle(sanitizedKey, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(blob);
      await writable.close();
      const file = await fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch (e) {
      console.warn("[FileSystemDriver] OPFS cache failed, falling back to blob URL", e);
      return URL.createObjectURL(blob);
    }
  }

  async getOPFSCachedUrl(key: string): Promise<string | null> {
    if (!this.opfsRoot) return null;
    try {
      const sanitizedKey = key.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileHandle = await this.opfsRoot.getFileHandle(sanitizedKey);
      const file = await fileHandle.getFile();
      return URL.createObjectURL(file);
    } catch {
      return null;
    }
  }

  async saveFileToDisk(
    fileName: string,
    content: Blob | string | ArrayBuffer,
    mimeType: string = "application/octet-stream"
  ): Promise<boolean> {
    const blob =
      content instanceof Blob
        ? content
        : typeof content === "string"
        ? new Blob([content], { type: mimeType })
        : new Blob([content], { type: mimeType });

    // Try modern File System Access API save picker first
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        const ext = fileName.split(".").pop() || "";
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [
            {
              description: "CryptArtist Project / Media",
              accept: { [mimeType]: [`.${ext}`] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return true;
      } catch (e: any) {
        if (e.name === "AbortError") return false;
      }
    }

    // Fallback to HTML5 link download
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);

    return true;
  }
}

export const browserFileSystemDriver = new BrowserFileSystemDriver();
