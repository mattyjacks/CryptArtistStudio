// ============================================================================
// CryptArtist Studio v2 - FileSystem Abstraction Types
// ============================================================================

export type FileMediaType = "video" | "audio" | "image" | "gif" | "cryptart" | "code" | "document" | "unknown";

export interface VirtualFileEntry {
  id: string;
  name: string;
  path: string;
  sizeBytes: number;
  lastModified: number;
  mediaType: FileMediaType;
  mimeType: string;
  extension: string;
  /** Browser object URL or blob link */
  objectUrl?: string;
  /** Thumbnail image preview data/url */
  thumbnailUrl?: string;
  /** Duration in seconds if media */
  duration?: number;
  /** Width & height if visual */
  width?: number;
  height?: number;
  /** Source tag: 'local-folder' | 'google-drive' | 'pexels' | 'imported' | 'opfs' */
  source: "local-folder" | "google-drive" | "pexels" | "givegigs" | "imported" | "opfs";
  /** Underlying browser handle if available */
  fileHandle?: FileSystemFileHandle;
}

export interface DirectoryHandleInfo {
  name: string;
  path?: string;
  fileCount: number;
  mountedAt: number;
  handle?: FileSystemDirectoryHandle;
}

export interface IFileSystemDriver {
  /** Prompt user to select a folder on their PC to mount */
  mountLocalDirectory(): Promise<DirectoryHandleInfo | null>;
  /** Get current mounted directory info */
  getMountedDirectory(): DirectoryHandleInfo | null;
  /** Unmount current directory */
  unmountDirectory(): Promise<void>;
  /** List media files in mounted directory */
  listDirectoryFiles(subPath?: string): Promise<VirtualFileEntry[]>;
  /** Read file content as Blob */
  readFileAsBlob(fileEntry: VirtualFileEntry): Promise<Blob>;
  /** Read file content as ArrayBuffer */
  readFileAsArrayBuffer(fileEntry: VirtualFileEntry): Promise<ArrayBuffer>;
  /** Read file content as Text */
  readFileAsText(fileEntry: VirtualFileEntry): Promise<string>;
  /** Create or retrieve OPFS cached media blob */
  cacheInOPFS(key: string, blob: Blob): Promise<string>;
  /** Get cached URL from OPFS */
  getOPFSCachedUrl(key: string): Promise<string | null>;
  /** Save file to user's computer via browser download / file picker */
  saveFileToDisk(fileName: string, content: Blob | string | ArrayBuffer, mimeType?: string): Promise<boolean>;
}
