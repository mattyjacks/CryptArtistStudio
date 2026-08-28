import {
  GoogleDriveFileMetadata,
  IGoogleDriveService,
} from "../types/drive.types";
import { VirtualFileEntry } from "../types/filesystem.types";

export class GoogleDriveEngine implements IGoogleDriveService {
  isGoogleDriveUrl(url: string): boolean {
    if (!url || typeof url !== "string") return false;
    return (
      url.includes("drive.google.com") ||
      url.includes("docs.google.com") ||
      url.includes("drive.usercontent.google.com")
    );
  }

  extractFileId(url: string): string | null {
    if (!url) return null;

    // Format: /file/d/FILE_ID/...
    const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

    // Format: id=FILE_ID
    const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

    // Format: /open?id=FILE_ID
    const openMatch = url.match(/\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch && openMatch[1]) return openMatch[1];

    // Format: /uc?id=FILE_ID
    const ucMatch = url.match(/\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/);
    if (ucMatch && ucMatch[1]) return ucMatch[1];

    // If string itself looks like a naked Google Drive file ID (28-44 chars alphanumeric)
    if (/^[a-zA-Z0-9_-]{25,50}$/.test(url.trim())) {
      return url.trim();
    }

    return null;
  }

  async resolveDriveLink(shareUrl: string): Promise<GoogleDriveFileMetadata> {
    const fileId = this.extractFileId(shareUrl);
    if (!fileId) {
      throw new Error("Invalid Google Drive share link: could not extract File ID");
    }

    // Determine streaming URL: use server proxy /api/drive/stream if on web/Vercel or direct UC link
    const proxyStreamUrl = `/api/drive/stream?id=${encodeURIComponent(fileId)}`;
    const directUcUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;

    return {
      id: fileId,
      name: `Drive_Asset_${fileId.substring(0, 8)}.mp4`,
      mimeType: "video/mp4",
      thumbnailLink: `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
      webContentLink: directUcUrl,
      directStreamUrl: proxyStreamUrl,
    };
  }

  async fetchDriveMediaBlob(
    fileId: string,
    onProgress?: (percent: number) => void
  ): Promise<Blob> {
    const streamUrl = `/api/drive/stream?id=${encodeURIComponent(fileId)}`;

    try {
      const response = await fetch(streamUrl);
      if (!response.ok) {
        // Fallback to direct UC link
        const directResp = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
        if (!directResp.ok) {
          throw new Error(`Failed to fetch Drive asset: HTTP ${response.status}`);
        }
        return await directResp.blob();
      }

      const contentLength = response.headers.get("content-length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (!response.body || total === 0) {
        return await response.blob();
      }

      const reader = response.body.getReader();
      let received = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (onProgress && total > 0) {
            onProgress(Math.round((received / total) * 100));
          }
        }
      }

      const allChunks = new Uint8Array(received);
      let position = 0;
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }

      const mime = response.headers.get("content-type") || "video/mp4";
      return new Blob([allChunks], { type: mime });
    } catch (e: any) {
      throw new Error(`Google Drive download error: ${e.message}`);
    }
  }

  convertMetadataToVirtualFile(
    metadata: GoogleDriveFileMetadata,
    blobUrl?: string
  ): VirtualFileEntry {
    const isAudio = metadata.mimeType.startsWith("audio/");
    const isImage = metadata.mimeType.startsWith("image/");
    const isVideo = metadata.mimeType.startsWith("video/") || (!isAudio && !isImage);

    const mediaType = isVideo ? "video" : isAudio ? "audio" : isImage ? "image" : "video";

    return {
      id: `gdrive_${metadata.id}`,
      name: metadata.name,
      path: `gdrive://${metadata.id}`,
      sizeBytes: metadata.sizeBytes || 0,
      lastModified: Date.now(),
      mediaType,
      mimeType: metadata.mimeType,
      extension: isVideo ? "mp4" : isAudio ? "mp3" : "png",
      objectUrl: blobUrl || metadata.directStreamUrl,
      thumbnailUrl: metadata.thumbnailLink,
      source: "google-drive",
    };
  }
}

export const googleDriveEngine = new GoogleDriveEngine();
