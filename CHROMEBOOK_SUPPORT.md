# CryptArtist Studio - Chromebook Support Guide

## Overview

CryptArtist Studio now has full support for Chromebooks, including Chrome OS, Linux containers, and Android containers. VibeCodeWorker is fully optimized for Chromebook hardware with touch controls, keyboard shortcuts, and offline functionality.

## Features

### Core Chromebook Support
- **Chrome OS Detection**: Automatic detection of Chrome OS environment
- **Responsive UI**: Adapts to small, medium, and large screens
- **Tablet Mode**: Detects and adapts to convertible Chromebook tablet mode
- **Keyboard Shortcuts**: Chromebook-optimized keyboard shortcuts (Search key, etc.)
- **Touchpad Support**: Two-finger scroll, gesture detection
- **Stylus Support**: Detects stylus/pen input on compatible Chromebooks

### File System Access
- **File System Access API**: Direct access to Downloads, Documents, and custom folders
- **IndexedDB Storage**: Offline file storage with sync
- **Cloud Sync**: Integration with Chrome OS cloud storage
- **Persistent Storage**: Request persistent storage quota
- **File Handles**: Persistent file handles for quick access

### Offline Support
- **Service Worker**: Full offline functionality with caching
- **Background Sync**: Sync files and git operations when online
- **Periodic Sync**: Automatic periodic syncing
- **Push Notifications**: Notification support for sync events
- **PWA Installation**: Install as standalone app

### VibeCodeWorker Features
- **File Explorer**: Browse Downloads, Documents, or any accessible folder
- **Code Editor**: Lightweight textarea-based editor (no Monaco overhead)
- **Git Integration**: Clone, commit, push, pull with GitHub/GitLab support
- **Storage Indicator**: Real-time storage quota display
- **Keyboard Shortcuts**: Ctrl+O (open), Ctrl+S (save), Ctrl+P (search), Ctrl+Shift+G (clone)
- **Offline Editing**: Edit files offline, sync when online
- **Linux Container**: Support for Chrome OS Linux container development

### Linux Container Support
- **Crostini Integration**: Access to Linux container file system
- **Development Tools**: Full development environment in Linux container
- **Terminal Access**: Command-line access through Linux container
- **Package Management**: Install development tools via apt/pacman

### Android Container Support
- **Android File Access**: Access to Android container storage
- **App Integration**: Share files with Android apps
- **Android Development**: Develop Android apps on Chromebook

## File Structure

### Core Utilities
- `v1/src/utils/chromebookDetection.ts` - Chrome OS detection and environment info
- `v1/src/utils/chromebookFileSystem.ts` - File system access and storage APIs
- `v1/src/utils/chromebookInit.ts` - Initialization and setup
- `v1/src/hooks/useChromebook.ts` - React hooks for Chromebook features

### Components
- `v1/src/components/ChromebookVibeCodeWorker.tsx` - Chromebook-optimized VibeCodeWorker
- `public/manifest.json` - PWA manifest for Chromebook installation
- `public/service-worker.js` - Service worker for offline support

## Usage

### Opening VibeCodeWorker on Chromebook

1. **Launch App**: Open CryptArtist Studio from Chrome App Launcher
2. **Navigate to VibeCodeWorker**: Click VibeCodeWorker in Suite Launcher
3. **Open Folder**: Click "📁 Open" to select a folder or "⬇️ Downloads" for Downloads folder
4. **Edit Files**: Click files in explorer to open and edit
5. **Save**: Use Ctrl+S or click "💾 Save" button

### File System Access

#### Accessing Downloads
```typescript
import { requestDownloadsAccess, listDirectory } from "../utils/chromebookFileSystem";

const handle = await requestDownloadsAccess();
const files = await listDirectory(handle);
```

#### Accessing Custom Folders
```typescript
import { requestFolderAccess } from "../utils/chromebookFileSystem";

const handle = await requestFolderAccess();
const files = await listDirectory(handle);
```

#### Reading/Writing Files
```typescript
import { readFileContent, writeFileContent } from "../utils/chromebookFileSystem";

const content = await readFileContent(fileHandle);
await writeFileContent(fileHandle, newContent);
```

### Offline Storage

#### Using IndexedDB
```typescript
import { 
  saveFileToIndexedDB, 
  getFileFromIndexedDB,
  listFilesFromIndexedDB 
} from "../utils/chromebookFileSystem";

// Save file
await saveFileToIndexedDB("/path/to/file.txt", content);

// Get file
const content = await getFileFromIndexedDB("/path/to/file.txt");

// List all files
const files = await listFilesFromIndexedDB();
```

#### Requesting Persistent Storage
```typescript
import { requestPersistentStorage, isPersistentStorageGranted } from "../utils/chromebookFileSystem";

const isPersistent = await requestPersistentStorage();
const isGranted = await isPersistentStorageGranted();
```

### Keyboard Shortcuts

#### VibeCodeWorker Shortcuts
- **Ctrl+O**: Open folder
- **Ctrl+S**: Save active file
- **Ctrl+P**: Search files
- **Ctrl+Shift+G**: Clone repository

#### Chrome OS Shortcuts
- **Search (Launcher)**: Open app launcher
- **Alt+Tab**: Task switcher
- **Ctrl+F5**: Screenshot
- **F11**: Fullscreen
- **Ctrl+Shift+I**: Developer tools

### Chromebook Detection

#### Detect Chromebook
```typescript
import { isChromebook, isChromeOS, detectChromebook } from "../utils/chromebookDetection";

if (isChromebook()) {
  console.log("Running on Chromebook");
}

const info = detectChromebook();
console.log(info.screenSize); // "small" | "medium" | "large"
console.log(info.isTabletMode); // boolean
console.log(info.hasLinuxContainer); // boolean
```

#### Check Feature Support
```typescript
import { supportsFeature } from "../utils/chromebookDetection";

if (supportsFeature("linux-container")) {
  // Access Linux container
}

if (supportsFeature("file-system-access")) {
  // Use File System Access API
}
```

### React Hooks

#### useChromebookDetection
```typescript
import { useChromebookDetection } from "../hooks/useChromebook";

const chromebookInfo = useChromebookDetection();
// Returns: { isChromebook, isChromeOS, screenSize, isTabletMode, ... }
```

#### useChromebookKeyboardShortcuts
```typescript
import { useChromebookKeyboardShortcuts } from "../hooks/useChromebook";

useChromebookKeyboardShortcuts({
  "CTRL+S": () => saveFile(),
  "CTRL+O": () => openFolder(),
});
```

#### useChromebookStorage
```typescript
import { useChromebookStorage } from "../hooks/useChromebook";

const { storageQuota, isPersistent } = useChromebookStorage();
// storageQuota: { usage, quota, percentage }
// isPersistent: boolean
```

#### useChromebookResponsive
```typescript
import { useChromebookResponsive } from "../hooks/useChromebook";

const { screenSize, isTabletMode, isSmall, isMedium, isLarge } = useChromebookResponsive();
```

## PWA Installation

### Install as App
1. Open CryptArtist Studio in Chrome
2. Click the "Install" button in the address bar
3. Select "Install" in the popup
4. App will be installed as standalone app

### Offline Usage
- App works offline after installation
- Files are cached for offline access
- Changes sync when online

### App Shortcuts
- **VibeCodeWorker**: Quick access to code editor
- **MediaMogul**: Quick access to media editor
- **GameStudio**: Quick access to game creator

## Service Worker

### Background Sync
```typescript
import { requestServiceWorkerUpdate } from "../utils/chromebookInit";

// Request sync
navigator.serviceWorker.ready.then(registration => {
  registration.sync.register("sync-files");
});
```

### Service Worker Messages
```typescript
// Listen for sync messages
navigator.serviceWorker.addEventListener("message", (event) => {
  if (event.data.type === "SYNC_FILES") {
    console.log("Files synced:", event.data.status);
  }
});
```

## Linux Container Integration

### Access Linux Files
```typescript
import { getChromebookStoragePath } from "../utils/chromebookDetection";

const linuxPath = getChromebookStoragePath("linux");
// Returns: /home/chronos/user/crostini/default/home
```

### Develop in Linux Container
1. Enable Linux container in Chrome OS settings
2. Open Terminal in Linux container
3. Clone repository or create project
4. Access files through CryptArtist Studio

## Performance Optimization

### For Small Screens (Phones/Tablets)
- Single-column layout
- Bottom navigation for panels
- Touch-optimized buttons
- Simplified UI

### For Large Screens (Desktops)
- Multi-column layout
- Side panels
- Keyboard-optimized
- Full feature set

### Storage Optimization
- IndexedDB for offline storage
- Service Worker caching
- Lazy loading of assets
- Compression for large files

## Troubleshooting

### File Access Issues
**Problem**: "Permission denied" when accessing files
**Solution**: 
1. Click "📁 Open" to request folder access
2. Grant permission in system dialog
3. Try again

### Storage Full
**Problem**: "Storage quota exceeded"
**Solution**:
1. Check storage indicator in header
2. Delete unnecessary files
3. Request persistent storage for more quota

### Offline Issues
**Problem**: Changes not syncing when online
**Solution**:
1. Check if service worker is registered (DevTools → Application)
2. Check if background sync is enabled
3. Manually trigger sync with Ctrl+Shift+S

### Linux Container Issues
**Problem**: Cannot access Linux files
**Solution**:
1. Enable Linux container in Chrome OS settings
2. Wait for container to initialize
3. Restart CryptArtist Studio

## Browser Support

### Chromebook Browsers
- **Chrome**: Full support (recommended)
- **Chromium**: Full support
- **Edge**: Full support
- **Firefox**: Limited support (no File System Access API)

### Chrome OS Versions
- **Chrome OS 69+**: Full support
- **Chrome OS 68**: Limited support (no Linux container)
- **Chrome OS 67**: Basic support

## API Reference

### Chromebook Detection
```typescript
detectChromebook(): ChromebookInfo
isChromebook(): boolean
isChromeOS(): boolean
hasLinuxContainer(): boolean
hasAndroidContainer(): boolean
getChromebookScreenSize(): "small" | "medium" | "large"
isChromebookTabletMode(): boolean
getChromebookStorageType(): "local" | "cloud" | "hybrid"
supportsFeature(feature: string): boolean
```

### File System
```typescript
requestDownloadsAccess(): Promise<FileSystemDirectoryHandle>
requestFolderAccess(): Promise<FileSystemDirectoryHandle>
requestFileAccess(): Promise<FileSystemFileHandle>
listDirectory(handle: FileSystemDirectoryHandle): Promise<ChromebookFile[]>
readFileContent(handle: FileSystemFileHandle): Promise<string>
writeFileContent(handle: FileSystemFileHandle, content: string): Promise<void>
createFile(dirHandle: FileSystemDirectoryHandle, fileName: string): Promise<FileSystemFileHandle>
deleteFile(dirHandle: FileSystemDirectoryHandle, fileName: string): Promise<void>
```

### Storage
```typescript
requestPersistentStorage(): Promise<boolean>
isPersistentStorageGranted(): Promise<boolean>
getStorageQuota(): Promise<{ usage, quota, percentage }>
saveFileToIndexedDB(path: string, content: string): Promise<void>
getFileFromIndexedDB(path: string): Promise<string | null>
listFilesFromIndexedDB(): Promise<string[]>
```

### Initialization
```typescript
initializeChromebookSupport(): Promise<void>
setupServiceWorkerMessaging(): void
requestServiceWorkerUpdate(): Promise<void>
isRunningAsPWA(): boolean
supportsAPI(api: string): boolean
```

## Future Enhancements

- [ ] Wacom stylus support for drawing
- [ ] Multi-window support
- [ ] Cloud sync with Google Drive
- [ ] Android app integration
- [ ] Bluetooth device support
- [ ] Camera/microphone access
- [ ] Geolocation support
- [ ] Advanced Linux container features
- [ ] Docker support
- [ ] Remote development (SSH)

## Contributing

To add Chromebook-specific features:

1. Add detection logic to `chromebookDetection.ts`
2. Create utility functions in `chromebookFileSystem.ts`
3. Add React hooks in `hooks/useChromebook.ts`
4. Update components to use new features
5. Test on actual Chromebook hardware
6. Update this documentation

## Support

For issues or feature requests related to Chromebook support, please refer to the CryptArtist Studio documentation or create an issue in the repository.

## Credits

Chromebook support implemented with:
- File System Access API (Chrome 86+)
- Service Workers (Chrome 40+)
- IndexedDB (Chrome 24+)
- Web Notifications (Chrome 22+)
- Background Sync (Chrome 49+)
