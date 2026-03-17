// ============================================================================
// CryptArtist Studio - Chromebook File System Access
// Handles file operations on Chrome OS (Downloads, Documents, Linux container)
// ============================================================================

import { isChromeOS, hasLinuxContainer, getChromebookStoragePath } from "./chromebookDetection";

export interface ChromebookFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
  handle?: FileSystemFileHandle;
}

export interface ChromebookDirectory {
  name: string;
  path: string;
  type: "directory";
  handle?: FileSystemDirectoryHandle;
}

// File System Access API support
export async function requestDownloadsAccess(): Promise<FileSystemDirectoryHandle | null> {
  if (!("showDirectoryPicker" in window)) {
    console.warn("File System Access API not supported");
    return null;
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      id: "cryptartist-downloads",
      mode: "readwrite",
      startIn: "downloads",
    });
    return handle;
  } catch (err) {
    console.error("Failed to request Downloads access:", err);
    return null;
  }
}

export async function requestFolderAccess(): Promise<FileSystemDirectoryHandle | null> {
  if (!("showDirectoryPicker" in window)) {
    console.warn("File System Access API not supported");
    return null;
  }

  try {
    const handle = await (window as any).showDirectoryPicker({
      id: "cryptartist-folder",
      mode: "readwrite",
    });
    return handle;
  } catch (err) {
    console.error("Failed to request folder access:", err);
    return null;
  }
}

export async function requestFileAccess(): Promise<FileSystemFileHandle | null> {
  if (!("showOpenFilePicker" in window)) {
    console.warn("File System Access API not supported");
    return null;
  }

  try {
    const handles = await (window as any).showOpenFilePicker({
      multiple: false,
    });
    return handles[0] || null;
  } catch (err) {
    console.error("Failed to request file access:", err);
    return null;
  }
}

export async function requestMultipleFilesAccess(): Promise<FileSystemFileHandle[]> {
  if (!("showOpenFilePicker" in window)) {
    console.warn("File System Access API not supported");
    return [];
  }

  try {
    return await (window as any).showOpenFilePicker({
      multiple: true,
    });
  } catch (err) {
    console.error("Failed to request multiple files access:", err);
    return [];
  }
}

// Read file content
export async function readFileContent(handle: FileSystemFileHandle): Promise<string> {
  try {
    const file = await handle.getFile();
    return await file.text();
  } catch (err) {
    throw new Error(`Failed to read file: ${err}`);
  }
}

// Write file content
export async function writeFileContent(
  handle: FileSystemFileHandle,
  content: string
): Promise<void> {
  try {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  } catch (err) {
    throw new Error(`Failed to write file: ${err}`);
  }
}

// List directory contents
export async function listDirectory(
  handle: FileSystemDirectoryHandle
): Promise<ChromebookFile[]> {
  const files: ChromebookFile[] = [];

  try {
    for await (const entry of (handle as any).entries()) {
      const [name, entryHandle] = entry;
      const isDirectory = entryHandle.kind === "directory";

      files.push({
        name,
        path: `${handle.name}/${name}`,
        type: isDirectory ? "directory" : "file",
        size: 0,
        modified: Date.now(),
        handle: entryHandle,
      });
    }
  } catch (err) {
    console.error("Failed to list directory:", err);
  }

  return files;
}

// Get file from directory
export async function getFileFromDirectory(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<FileSystemFileHandle | null> {
  try {
    return await dirHandle.getFileHandle(fileName);
  } catch (err) {
    console.error(`File not found: ${fileName}`, err);
    return null;
  }
}

// Get subdirectory from directory
export async function getSubdirectory(
  dirHandle: FileSystemDirectoryHandle,
  dirName: string
): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await dirHandle.getDirectoryHandle(dirName);
  } catch (err) {
    console.error(`Directory not found: ${dirName}`, err);
    return null;
  }
}

// Create file in directory
export async function createFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string,
  content: string = ""
): Promise<FileSystemFileHandle> {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
    if (content) {
      await writeFileContent(fileHandle, content);
    }
    return fileHandle;
  } catch (err) {
    throw new Error(`Failed to create file: ${err}`);
  }
}

// Create directory
export async function createDirectory(
  dirHandle: FileSystemDirectoryHandle,
  dirName: string
): Promise<FileSystemDirectoryHandle> {
  try {
    return await dirHandle.getDirectoryHandle(dirName, { create: true });
  } catch (err) {
    throw new Error(`Failed to create directory: ${err}`);
  }
}

// Delete file
export async function deleteFile(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<void> {
  try {
    await dirHandle.removeEntry(fileName);
  } catch (err) {
    throw new Error(`Failed to delete file: ${err}`);
  }
}

// Delete directory (recursively)
export async function deleteDirectory(
  dirHandle: FileSystemDirectoryHandle,
  dirName: string,
  recursive: boolean = true
): Promise<void> {
  try {
    await dirHandle.removeEntry(dirName, { recursive });
  } catch (err) {
    throw new Error(`Failed to delete directory: ${err}`);
  }
}

// Persistent storage for Chromebook
export async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    return false;
  }

  try {
    const persisted = await navigator.storage.persist();
    return persisted;
  } catch (err) {
    console.error("Failed to request persistent storage:", err);
    return false;
  }
}

export async function isPersistentStorageGranted(): Promise<boolean> {
  if (!navigator.storage?.persisted) {
    return false;
  }

  try {
    return await navigator.storage.persisted();
  } catch (err) {
    console.error("Failed to check persistent storage:", err);
    return false;
  }
}

// Get storage quota for Chromebook
export async function getStorageQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
}> {
  if (!navigator.storage?.estimate) {
    return { usage: 0, quota: 0, percentage: 0 };
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      usage: estimate.usage || 0,
      quota: estimate.quota || 0,
      percentage: estimate.quota ? (estimate.usage || 0) / estimate.quota : 0,
    };
  } catch (err) {
    console.error("Failed to get storage quota:", err);
    return { usage: 0, quota: 0, percentage: 0 };
  }
}

// IndexedDB for offline storage on Chromebook
const DB_NAME = "CryptArtistStudio";
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

export async function initializeIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create object stores
      if (!database.objectStoreNames.contains("files")) {
        database.createObjectStore("files", { keyPath: "path" });
      }
      if (!database.objectStoreNames.contains("projects")) {
        database.createObjectStore("projects", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("cache")) {
        database.createObjectStore("cache", { keyPath: "key" });
      }
    };
  });
}

export async function saveFileToIndexedDB(
  path: string,
  content: string,
  metadata?: Record<string, any>
): Promise<void> {
  if (!db) await initializeIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");

    const file = {
      path,
      content,
      metadata,
      timestamp: Date.now(),
    };

    const request = store.put(file);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function getFileFromIndexedDB(path: string): Promise<string | null> {
  if (!db) await initializeIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const request = store.get(path);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const file = request.result;
      resolve(file ? file.content : null);
    };
  });
}

export async function deleteFileFromIndexedDB(path: string): Promise<void> {
  if (!db) await initializeIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(["files"], "readwrite");
    const store = transaction.objectStore("files");
    const request = store.delete(path);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

export async function listFilesFromIndexedDB(): Promise<string[]> {
  if (!db) await initializeIndexedDB();

  return new Promise((resolve, reject) => {
    const transaction = db!.transaction(["files"], "readonly");
    const store = transaction.objectStore("files");
    const request = store.getAllKeys();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as string[]) || []);
  });
}

// Cloud sync for Chromebook (using Chrome Sync API if available)
export async function syncWithChromebookCloud(
  files: Array<{ path: string; content: string }>
): Promise<void> {
  if (!isChromeOS()) {
    console.warn("Cloud sync only available on Chrome OS");
    return;
  }

  // This would integrate with Chrome's built-in cloud sync
  // For now, we'll use IndexedDB as a fallback
  for (const file of files) {
    await saveFileToIndexedDB(file.path, file.content);
  }
}

// Export/import project for Chromebook
export async function exportProjectAsZip(
  files: Array<{ path: string; content: string }>
): Promise<Blob> {
  // This would use a zip library to create a zip file
  // For now, return a JSON blob
  const json = JSON.stringify(files, null, 2);
  return new Blob([json], { type: "application/json" });
}

export async function downloadFile(blob: Blob, fileName: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
