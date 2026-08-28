// ============================================================================
// CryptArtist Studio v2 - Google Drive & Cloud Import Types
// ============================================================================

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
  thumbnailLink?: string;
  webContentLink?: string;
  createdTime?: string;
  directStreamUrl: string;
}

export interface IGoogleDriveService {
  /** Check if a given string or URL is a valid Google Drive share link */
  isGoogleDriveUrl(url: string): boolean;
  /** Extract file ID from various Google Drive URL formats */
  extractFileId(url: string): string | null;
  /** Resolve public or shareable Drive link into direct media stream metadata */
  resolveDriveLink(shareUrl: string): Promise<GoogleDriveFileMetadata>;
  /** Fetch media file as Blob through streaming proxy */
  fetchDriveMediaBlob(fileId: string, onProgress?: (percent: number) => void): Promise<Blob>;
}
