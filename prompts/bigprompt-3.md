# BigPrompt 3 - .Crypt File Format (CryptArtist Crypt)

## Overview

Implement a new `.Crypt` file format for CryptArtist Studio that serves as a **collection container** for multiple `.CryptArt` files with metadata, versioning, and organizational structure. A `.Crypt` file is fundamentally a ZIP archive with a specific internal directory structure and manifest.

**Format Name:** `.Crypt` (CryptArtist Crypt)  
**Base Format:** ZIP (compatible with standard ZIP tools)  
**Primary Use Case:** Bundle multiple `.CryptArt` projects, assets, and metadata into a single distributable file

---

## File Structure

### Root Level (inside the .Crypt ZIP)

```
MyProject.Crypt (ZIP archive)
├── Memorial.txt          (Manifest file - metadata, versioning, credits)
├── Skeleton/               (Central folder of .CryptArt files)
├── Grave/                (Shared assets folder - images, audio, fonts, etc.)
├── Urn/                  (Backup/archive folder - previous versions, exports)
├── Epitaph/              (Documentation folder - README, guides, license)
├── Vault/                (Encrypted secrets - API keys, credentials)
├── Catacombs/            (Nested .Crypt files - sub-projects)
├── Reliquary/            (Curated collections - favorites, templates)
├── Soul/                 (AI prompts and outputs used in this crypt)
├── LastWords/            (Log files - build, operations, errors, activity)
└── Pyramid/              (Self-running bootstrap: Mummy agent + Curse traces)
```

### Terminology Mapping

| File/Folder | Purpose | Content |
|-------------|---------|---------|
| **Memorial.txt** | Manifest & metadata | Version, author, created date, description, tags, license |
| **Skeleton/** | Main project files | Collection of `.CryptArt` files (the "body" of the crypt) |
| **Grave/** | Shared assets | Images, audio, fonts, brushes, textures, color palettes |
| **Urn/** | Backups & history | Previous versions, exports, snapshots, archives |
| **Epitaph/** | Documentation | README.md, CHANGELOG.md, LICENSE, guides, credits |
| **Vault/** | Secrets (optional) | Encrypted API keys, credentials, sensitive config |
| **Catacombs/** | Nested projects | Sub-collections of `.Crypt` files (hierarchical organization) |
| **Reliquary/** | Curated selections | Favorites, templates, presets, recommended files |
| **Soul/** | AI prompts & outputs | Prompts used, AI responses, context, training data |
| **LastWords/** | Log files | Build logs, operation logs, error logs, activity history |
| **Pyramid/** | Self-running bootstrap | Mummy scripts (Mummy.bat, Mummy.ps1, Mummy.sh), config (Mummy.json), Curse/ templates |

---

## Memorial.txt Specification

The manifest file is a JSON document that describes the `.Crypt` archive.

```json
{
  "$crypt": 1,
  "version": "1.0.0",
  "name": "My Project Collection",
  "description": "A curated collection of media and design projects",
  "author": "MattyJacks",
  "createdAt": "2026-03-14T10:00:00Z",
  "updatedAt": "2026-03-14T10:00:00Z",
  "appVersion": "1.69.420",
  "license": "CC-BY-4.0",
  "tags": ["design", "media", "collection"],
  "metadata": {
    "totalProjects": 5,
    "totalAssets": 42,
    "cryptVersion": "1.0.0",
    "compressionLevel": 6,
    "encrypted": false
  },
  "contents": {
    "skeleton": {
      "description": "Main project files",
      "count": 5,
      "programs": ["media-mogul", "vibecode-worker", "game-studio"]
    },
    "grave": {
      "description": "Shared assets",
      "count": 42,
      "types": ["image", "audio", "font", "brush"]
    },
    "urn": {
      "description": "Backups and versions",
      "count": 3,
      "versions": ["1.0.0", "0.9.5", "0.9.0"]
    },
    "epitaph": {
      "description": "Documentation",
      "files": ["README.md", "CHANGELOG.md", "LICENSE"]
    },
    "vault": {
      "description": "Encrypted secrets",
      "encrypted": false,
      "count": 0
    },
    "catacombs": {
      "description": "Nested projects",
      "count": 0,
      "nested": []
    },
    "reliquary": {
      "description": "Curated collections",
      "count": 2,
      "collections": ["favorites", "templates"]
    },
    "soul": {
      "description": "AI prompts and outputs",
      "count": 12,
      "providers": ["openai", "anthropic"]
    },
    "lastWords": {
      "description": "Log files",
      "files": ["build.log", "operations.log", "errors.log", "activity.log"]
    }
  },
  "compatibility": {
    "minAppVersion": "1.69.420",
    "platforms": ["windows", "macos", "linux"]
  }
}
```

---

## Implementation Plan

### Phase 1: Core Format Definition (Week 1)

**Files to Create:**
- `v1/src/utils/crypt.ts` - Core `.Crypt` file format utilities
  - `CryptFile` interface (mirrors `CryptArtFile` structure)
  - `CryptManifest` interface (Memorial.txt schema)
  - `parseCrypt()` - Read and validate `.Crypt` files
  - `createCrypt()` - Create new `.Crypt` archives
  - `addToCrypt()` - Add files to existing `.Crypt`
  - `extractFromCrypt()` - Extract files from `.Crypt`
  - ZIP validation and integrity checking

**Files to Update:**
- `v1/src-tauri/tauri.conf.json` - Add `.crypt` file association
- `v1/src/utils/constants.ts` - Add `.crypt` file icon and MIME type
- `v1/src/utils/formatters.ts` - Add `.crypt` language/format mapping

### Phase 2: Tauri Backend Commands (Week 1-2)

**New Tauri Commands:**
- `create_crypt` - Create new `.Crypt` file with manifest
- `open_crypt` - Open and extract `.Crypt` file
- `add_to_crypt` - Add `.CryptArt` files to `.Crypt`
- `remove_from_crypt` - Remove files from `.Crypt`
- `list_crypt_contents` - List all files in `.Crypt`
- `validate_crypt` - Validate `.Crypt` integrity
- `export_crypt` - Export `.Crypt` to distributable format
- `import_crypt` - Import `.Crypt` into workspace

**Rust Implementation:**
- Use `zip` crate for ZIP operations
- Implement manifest parsing/serialization
- Add integrity checking (CRC32 validation)
- Support nested `.Crypt` files (Catacombs)

### Phase 3: Frontend UI Components (Week 2-3)

**New Components:**
- `CryptManager.tsx` - Main UI for managing `.Crypt` files
- `CryptCreator.tsx` - Wizard for creating new `.Crypt` archives
- `CryptBrowser.tsx` - File browser for `.Crypt` contents
- `CryptImporter.tsx` - Import dialog for opening `.Crypt` files

**Integration Points:**
- Suite Launcher: Add "Create Crypt" and "Open Crypt" buttons
- Settings: Add `.Crypt` management section
- File Association: Handle `.crypt` double-click (open in CryptManager)

### Phase 4: Workspace Integration (Week 3)

**Workspace Enhancements:**
- Add `cryptId` to `Workspace` type
- Support opening entire `.Crypt` as a workspace group
- Bulk import `.CryptArt` files from Skeleton/
- Bulk export workspace to `.Crypt`

**Cross-Program Support:**
- All 11 programs can contribute to `.Crypt` creation
- Interop events for `.Crypt` operations
- Clipboard support for `.Crypt` metadata

### Phase 5: Advanced Features (Week 4+)

**Optional Features:**
- **Vault Encryption:** AES-256 encryption for sensitive files in Vault/
- **Digital Signatures:** Sign `.Crypt` files for distribution verification
- **Compression Profiles:** Different compression levels for different use cases
- **Catacombs Nesting:** Support `.Crypt` files inside `.Crypt` files (hierarchical)
- **Reliquary Curation:** Star/favorite files, create themed collections
- **Version Control:** Track changes, branching, merging
- **Cloud Sync:** Upload/download `.Crypt` files to cloud storage
- **Sharing:** Generate shareable links with expiration, password protection

---

## File Format Details

### Skeleton/ Structure

```
Skeleton/
├── project-1.CryptArt
├── project-2.CryptArt
├── project-3.CryptArt
├── subfolder/
│   ├── nested-project.CryptArt
│   └── another-project.CryptArt
└── .index.json (optional - quick lookup)
```

### Grave/ Structure

```
Grave/
├── images/
│   ├── background.png
│   ├── texture.jpg
│   └── icon.svg
├── audio/
│   ├── bgm.mp3
│   └── sfx.wav
├── fonts/
│   ├── roboto.ttf
│   └── noto-sans.otf
├── brushes/
│   └── custom-brushes.json
└── palettes/
    └── color-schemes.json
```

### Urn/ Structure

```
Urn/
├── v1.0.0/
│   ├── snapshot.json
│   └── projects/
│       ├── project-1.CryptArt
│       └── project-2.CryptArt
├── v0.9.5/
│   ├── snapshot.json
│   └── projects/
│       └── project-1.CryptArt
└── exports/
    ├── final-render.mp4
    └── web-export.html
```

### Epitaph/ Structure

```
Epitaph/
├── README.md
├── CHANGELOG.md
├── LICENSE
├── CONTRIBUTING.md
└── docs/
    ├── getting-started.md
    ├── advanced-usage.md
    └── api-reference.md
```

### Soul/ Structure

```
Soul/
├── prompts/
│   ├── image-generation-prompts.txt
│   ├── code-generation-prompts.txt
│   ├── text-prompts.txt
│   └── custom-prompts.json
├── outputs/
│   ├── ai-responses.json
│   ├── generated-images.json
│   ├── generated-code.json
│   └── generated-text.json
├── context/
│   ├── conversation-history.json
│   └── training-data.json
└── metadata.json
```

### LastWords/ Structure

```
LastWords/
├── build.log
├── operations.log
├── errors.log
├── activity.log
└── archives/
    ├── build-2026-03-14.log
    ├── operations-2026-03-14.log
    └── errors-2026-03-14.log
```

### Pyramid/ Structure

```
Pyramid/
├── Mummy.bat             (Windows double-click launcher - calls Mummy.ps1)
├── Mummy.ps1             (PowerShell bootstrap - downloads CryptArtist, launches .Crypt)
├── Mummy.sh              (Linux/macOS bash bootstrap)
├── Mummy.json            (Configuration - download URL, curse settings, preconfigs)
└── Curse/                (Curse templates - .txt files left on host after running)
```

**The Mummy** is a self-running AI agent/bootstrap script embedded in the .Crypt file. It allows the .Crypt to be fully self-contained - all you need is the .Crypt file on a new computer:

1. User has only a `.Crypt` file on a fresh computer with no CryptArtist Studio
2. They rename `.Crypt` to `.zip` (or use any ZIP extractor) and open it
3. They navigate to `Pyramid/` and double-click `Mummy.bat` (Windows) or run `Mummy.sh` (Linux/macOS)
4. The Mummy detects the OS and checks if CryptArtist Studio is installed
5. If not found, it downloads CryptArtist Studio from https://github.com/mattyjacks/CryptArtistStudio/tree/main/download
6. Installs/extracts the app, then launches it with this `.Crypt` file
7. Optionally leaves a "Curse" `.txt` file on the host computer
8. Default program: **ValleyNet** - the Mummy opens ValleyNet automatically

### "Awaken the Mummy" - Resilient Auto-Run Mode

When a `.Crypt` contains a populated `Pyramid/` folder, the CryptManager shows an **"Awaken the Mummy"** button. Clicking it:

1. Extracts all `.CryptArt` files from `Skeleton/` and opens them as workspaces
2. Navigates to the **ValleyNet** program (configurable via `mummyMode.program`)
3. Starts a **resilient health-check loop** that monitors workspace state
4. If all workspaces close or error out, the Mummy **automatically restarts** after a configurable delay
5. Runs **forever** without hanging the system (all async, non-blocking intervals)
6. After too many consecutive restarts, **pauses** briefly to prevent runaway loops
7. A **"Silence the Mummy"** button stops the loop at any time

**Safety Design (no system hangs):**
- Uses `setInterval` with configurable `healthCheckMs` (default: 5s) - not a tight loop
- Restart uses `setTimeout` with `restartDelayMs` (default: 3s) - never synchronous
- After `maxConsecutiveRestarts` (default: 10), pauses for `pauseDurationMs` (default: 30s)
- Consecutive counter resets on successful health check (workspaces active)
- `useRef` for abort flag - silencing is instant, no lingering timers
- `useEffect` cleanup on unmount prevents leaked intervals
- All error handling uses try/catch, errors are logged but never crash the runner

**MummyRunnerConfig (in Mummy.json):**
```json
{
  "mummyMode": {
    "program": "valley-net",
    "autoRestart": true,
    "restartDelayMs": 3000,
    "maxConsecutiveRestarts": 10,
    "pauseDurationMs": 30000,
    "healthCheckMs": 5000
  }
}
```

**Mummy.json Configuration:**
```json
{
  "downloadUrl": "https://github.com/mattyjacks/CryptArtistStudio/tree/main/download",
  "version": "latest",
  "autoLaunch": true,
  "preconfigs": {
    "theme": "dark-purple",
    "defaultProgram": "media-mogul",
    "settings": {}
  },
  "curse": {
    "enabled": true,
    "message": "This computer has been blessed by the Crypt \"MyProject\" by Matt. The Mummy has risen.",
    "location": "desktop",
    "filename": "CryptArtist_Curse_MyProject",
    "askFirst": true
  }
}
```

**Curses** are trace files (`.txt`) left on the host computer after the Mummy runs. Like an ancient Egyptian curse that haunts whoever opens the tomb:

- **Timestamp** of when the .Crypt was opened
- **Name and author** of the .Crypt
- **Custom message** from the creator (optional)
- **System fingerprint** (OS, hostname, username)
- The curse can be **benign** (just a fun message) or **functional** (a reminder, watermark, license notice)
- Curse files are placed on the user's **Desktop** by default
- The user is **ALWAYS asked permission** before a curse is placed (`askFirst: true`)
- Curse location options: `"desktop"`, `"documents"`, `"temp"`

**Example Curse file (`CryptArtist_Curse_MyProject.txt`):**
```
================================================================================
  CRYPTARTIST CURSE
================================================================================

  You have opened a CryptArtist Crypt.
  The Mummy has risen and left this mark.

  This computer has been blessed by the Crypt "MyProject" by Matt.
  The Mummy has risen.

  -------------------------------------------------------
  Crypt opened:    2026-03-14 06:30:00
  Computer:        DESKTOP-ABC123
  User:            Matt
  OS:              Microsoft Windows 11 Pro
  -------------------------------------------------------

  This file is harmless. It was placed by the Pyramid/Mummy
  bootstrap agent inside a .Crypt file. You may delete it.

  Learn more: https://github.com/mattyjacks/CryptArtistStudio

================================================================================
```

---

## Crypt-Related Terminology (13 Total)

**Original (4):**
1. **Memorial.txt** - Manifest/metadata (records the memory of the crypt)
2. **Skeleton/** - Main project files (the "body" of the crypt)
3. **Grave/** - Shared assets (the "burial ground")
4. **Urn/** - Backups/versions (vessels for ashes/history)

**New (9):**
5. **Epitaph/** - Documentation (inscriptions on the tomb)
6. **Vault/** - Encrypted secrets (secure chamber)
7. **Catacombs/** - Nested projects (underground passages of crypts)
8. **Reliquary/** - Curated collections (sacred container for relics)
9. **Soul/** - AI prompts & outputs (the spirit of the work)
10. **LastWords/** - Log files (the final record of all that happened)
11. **Pyramid/** - Self-running bootstrap (the tomb that activates itself)
12. **Mummy** - The guardian agent script that awakens and downloads CryptArtist Studio
13. **Curse** - A trace file (.txt) left on the host computer after the Mummy runs

---

## Multi-Window Workspace Features

### Overview

When a `.Crypt` file is opened from Windows Explorer, CryptArtist Studio presents a **multi-window workspace** where each `.CryptArt` file in the Skeleton/ folder is opened in its own window. This allows users to work on multiple projects simultaneously with full workspace management.

### Key Features

#### 1. Increased Workspace Limit (69 Windows)

- **Previous limit:** 20 workspaces
- **New limit:** 69 workspaces (nice number 😎)
- Update `WorkspaceProvider.tsx` to support up to 69 concurrent windows
- Each window is a full instance of CryptArtist Studio with independent state

#### 2. Opening .Crypt Files

**Behavior:**
- User double-clicks a `.Crypt` file in Windows Explorer
- App launches and reads the Skeleton/ folder
- Opens up to 69 `.CryptArt` files from Skeleton/ (or all if fewer than 69)
- Each file opens in a separate window
- WorkspaceBar shows all open windows with tabs
- User can switch between windows via tabs or Alt+Tab

**Implementation:**
- Update `fileAssociation.ts` to detect `.crypt` files
- New `CryptManager.tsx` component to handle bulk opening
- Modify `WorkspaceProvider` to support 69 concurrent workspaces
- Each window gets a unique `windowId` for tracking

#### 3. Taskbar Context Menu (Windows)

**Right-click app icon in taskbar:**
- "New Normal Window" - Opens a fresh Suite Launcher
- "New Secret Window" - Opens an incognito/private mode window (no history, no cache)
- "Open Recent Crypt" - Quick access to recently opened `.Crypt` files
- List of currently open windows (up to 9 shown, "More..." if >9)

**Implementation:**
- Use Tauri's `tauri::window::WindowBuilder` for creating new windows
- Add Tauri command `create_window` with `mode: "normal" | "secret"`
- Implement secret mode: disable history, disable cache, clear on close
- Store recent `.Crypt` files in localStorage

#### 4. Suite Launcher Opens New Windows

**Behavior:**
- Every program launched from Suite Launcher opens in a **new window**
- This includes Settings, all 11 programs, and utilities
- Each window is independent with its own state
- Users can have multiple instances of the same program open

**Implementation:**
- Modify `SuiteLauncher.tsx` to use `window.open()` or Tauri window creation
- Each program route opens via `tauri::window::WindowBuilder`
- Pass program ID as query parameter or window label
- Update all program components to load from window context

#### 5. Window Management

**Features:**
- WorkspaceBar shows all open windows as tabs
- Right-click tab for context menu: Close, Close Others, Close All
- Drag tabs to reorder
- Double-click tab to focus window
- Keyboard shortcuts:
  - `Ctrl+N` - New normal window
  - `Ctrl+Shift+N` - New secret window
  - `Ctrl+W` - Close current window
  - `Ctrl+Tab` - Next window
  - `Ctrl+Shift+Tab` - Previous window
  - `Alt+1` through `Alt+9` - Jump to window 1-9

#### 6. Secret Window Mode

**Features:**
- No history tracking
- No localStorage persistence (session-only)
- No cache storage
- Incognito-style operation
- Cleared on close
- Visual indicator (different title bar color, e.g., dark purple)
- Cannot save projects to disk (in-memory only)

**Implementation:**
- New `useSecretMode()` hook
- Disable localStorage writes
- Use sessionStorage instead
- Clear sessionStorage on window close
- Add CSS class for visual styling

### .Crypt Save Dialog

When saving a `.Crypt` file, a popup window presents checkboxes for each component using fun anatomical terms:

**Save Dialog Options:**

| Term | Component | Description |
|------|-----------|-------------|
| **Bones** 🦴 | Skeleton/ | The skeletal structure - all .CryptArt project files |
| **Flesh** 🧬 | Grave/ | The body - shared assets (images, audio, fonts, brushes) |
| **Ashes** 🔥 | Urn/ | The remains - backups, versions, exports, history |
| **Brain** 🧠 | Soul/ | The mind - AI prompts, outputs, context, training data |
| **Epitaph** 📜 | Epitaph/ | The inscription - documentation, README, CHANGELOG, LICENSE |
| **Vault** 🔐 | Vault/ | The treasure - encrypted secrets, API keys, credentials |
| **Catacombs** 🏛️ | Catacombs/ | The chambers - nested .Crypt files, sub-projects |
| **Reliquary** 💎 | Reliquary/ | The relics - curated collections, favorites, templates |
| **LastWords** 📝 | LastWords/ | The record - all logs (build, operations, errors, activity) |

**Dialog Behavior:**
- All checkboxes checked by default
- User can uncheck components they don't want to save
- "Save All" button - saves all checked components
- "Save Selected" button - saves only checked components
- "Cancel" button - abort save
- Shows file size estimate for each component
- Shows total .Crypt file size estimate

**Implementation:**
- New `CryptSaveDialog.tsx` component
- Modal popup on save action
- Checkboxes for each component
- Real-time size calculation
- Confirmation before overwriting existing .Crypt

**Example Dialog:**
```
┌─────────────────────────────────────────┐
│  Save CryptArtist Crypt                 │
├─────────────────────────────────────────┤
│                                         │
│ Select components to save:              │
│                                         │
│ ☑ Bones 🦴 (Skeleton/)        [2.3 MB]   │
│ ☑ Flesh 🧬 (Grave/)         [1.8 MB]   │
│ ☑ Ashes 🔥 (Urn/)           [0.9 MB]   │
│ ☑ Brain 🧠 (Soul/)          [0.4 MB]   │
│ ☑ Epitaph 📜 (Epitaph/)     [0.2 MB]   │
│ ☑ Vault 🔐 (Vault/)         [0.1 MB]   │
│ ☐ Catacombs 🏛️ (Catacombs/) [0.0 MB]   │
│ ☑ Reliquary 💎 (Reliquary/) [0.3 MB]   │
│ ☑ LastWords 📝 (LastWords/) [0.05 MB]  │
│                                         │
│ Total Size: 6.15 MB                     │
│                                         │
│ [Cancel]  [Save Selected]  [Save All]   │
└─────────────────────────────────────────┘
```

### File Structure Changes

**New Tauri Commands:**
- `create_window(mode: "normal" | "secret", program?: string)` - Create new window
- `close_window(windowId: string)` - Close specific window
- `list_windows()` - Get all open windows
- `get_recent_crypts()` - Get recently opened .Crypt files
- `add_recent_crypt(path: string)` - Add to recent list

**New Frontend Components:**
- `WindowManager.tsx` - Manages window lifecycle
- `SecretModeProvider.tsx` - Context for secret mode state
- `TaskbarMenu.tsx` - Taskbar context menu (Windows-specific)

**Updated Components:**
- `App.tsx` - Add window context and secret mode provider
- `SuiteLauncher.tsx` - Open programs in new windows
- `WorkspaceBar.tsx` - Show all windows as tabs
- `WorkspaceProvider.tsx` - Support 69 workspaces instead of 20

---

## Integration with Existing Features

### File Association (.crypt)

Update `tauri.conf.json`:
```json
"fileAssociations": [
  {
    "ext": ["Crypt", "crypt"],
    "mimeType": "application/x-cryptartist-crypt",
    "description": "CryptArtist Crypt Collection",
    "role": "Editor"
  }
]
```

### Keyboard Shortcuts

Add to `useGlobalShortcuts()`:
- `Ctrl+Shift+C` - Create new Crypt
- `Ctrl+Shift+O` - Open Crypt

### Interop Events

New interop event types:
- `crypt:created` - New `.Crypt` file created
- `crypt:opened` - `.Crypt` file opened
- `crypt:exported` - Workspace exported to `.Crypt`
- `crypt:imported` - `.Crypt` imported to workspace

---

## Testing Strategy

### Unit Tests
- Manifest parsing/validation
- ZIP integrity checking
- File extraction/insertion
- Nested `.Crypt` handling

### Integration Tests
- Create `.Crypt` from multiple programs
- Import `.Crypt` into workspace
- Export workspace to `.Crypt`
- Verify file associations work

### Manual Testing
- Double-click `.crypt` file in File Explorer
- Create `.Crypt` with all 11 programs
- Verify all folders are created correctly
- Test nested `.Crypt` files (Catacombs)

---

## Success Criteria

- ✅ `.Crypt` files can be created, opened, and validated
- ✅ All 9 folders are properly structured
- ✅ Memorial.txt manifest is accurate and complete
- ✅ File association works on Windows, macOS, Linux
- ✅ Workspace can import/export to `.Crypt`
- ✅ Nested `.Crypt` files work (Catacombs)
- ✅ Documentation complete (Epitaph/ support)
- ✅ All 11 programs can contribute to `.Crypt` creation

---

## Timeline Estimate

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Core Format | 1 week | Pending |
| Phase 2: Backend Commands | 1-2 weeks | Pending |
| Phase 3: Frontend UI | 2-3 weeks | Pending |
| Phase 4: Workspace Integration | 1 week | Pending |
| Phase 5: Advanced Features | 2+ weeks | Pending |
| **Total** | **7-9 weeks** | **Pending** |

---

## Related Prompts

- **Prompt 44:** `.CryptArt` file association (open from File Explorer)
- **Prompt 45 (this):** `.Crypt` file format (collection container)
- **Prompt 46 (future):** Cloud sync for `.Crypt` files
- **Prompt 47 (future):** Sharing and distribution of `.Crypt` files

---

## Notes

- `.Crypt` is **not** a replacement for `.CryptArt` - it's a **container** for multiple `.CryptArt` files
- All folders are optional except `Skeleton/` and `Memorial.txt`
- The format is forward-compatible - future versions can add new folders
- `.Crypt` files can be opened with any standard ZIP tool for inspection
- Nested `.Crypt` files (Catacombs) enable hierarchical project organization

---

## Key Design Decisions

- Outer `.Crypt` is a ZIP for distribution/archiving
- Internal folders (not ZIP files) for easy navigation in file explorer
- Memorial.txt is JSON manifest with version, author, description, tags, license
- All 9 folders are optional except Skeleton/ and Memorial.txt
- **Forward-compatible: future versions can add new folders without breaking older versions**

### Forward Compatibility & Future-Proof Design

**Goal:** Users should **never** need to upgrade the `.Crypt` file format. New features are added without breaking old files.

**Design Principles:**

1. **Ignore Unknown Components**
   - If a newer `.Crypt` file has folders the app doesn't recognize, ignore them
   - Example: If v2.0 adds a "Skeleton/" folder, v1.0 just skips it
   - No errors, no warnings, just silently ignore

2. **Additive-Only Changes**
   - New folders/fields are always optional
   - Never remove or rename existing folders
   - Never change the meaning of existing fields
   - Never make optional fields required

3. **Version Tolerance in Memorial.txt**
   - `$crypt: 1` - Format version (only increment if breaking change)
   - `version: "1.0.0"` - Crypt content version (can change freely)
   - `appVersion: "1.69.420"` - App that created it (informational only)
   - App reads `$crypt` version and handles accordingly:
     - If `$crypt === 1`, use v1 parser
     - If `$crypt > 1`, warn user but try v1 parser anyway
     - If `$crypt < 1`, error (but this won't happen)

4. **Extensible Manifest**
   - Memorial.txt uses JSON, which is extensible
   - New fields added to `metadata`, `contents`, `compatibility` don't break old parsers
   - Old parsers just ignore unknown fields
   - Example: v2.0 adds `"aiModel": "gpt-4"` → v1.0 ignores it

5. **Unknown Folder Handling**
   - When opening a `.Crypt`, scan all folders
   - For each folder, check if app knows how to handle it
   - If unknown, add to "Other Components" section in UI
   - User can still access/extract unknown folders via file explorer
   - No data loss, no errors

6. **Graceful Degradation**
   - Missing optional components don't break anything
   - Incomplete `.Crypt` files still work
   - Example: `.Crypt` with only Skeleton/ and Memorial.txt is valid
   - Example: `.Crypt` missing Soul/ just means no AI prompts (not an error)

7. **No Migration Scripts**
   - Never need to "upgrade" or "migrate" `.Crypt` files
   - v1.0 files work in v2.0, v3.0, v10.0
   - No conversion tools, no batch upgrades, no data loss

**Example: Future Additions Without Breaking Changes**

v1.0 `.Crypt` structure:
```
MyProject.Crypt
├── Memorial.txt
├── Skeleton/
├── Grave/
├── Urn/
├── Epitaph/
├── Vault/
├── Catacombs/
├── Reliquary/
├── Soul/
└── LastWords/
```

v2.0 adds new optional folders (v1.0 app just ignores them):
```
MyProject.Crypt
├── Memorial.txt (now has new optional fields)
├── Skeleton/
├── Grave/
├── Urn/
├── Epitaph/
├── Vault/
├── Catacombs/
├── Reliquary/
├── Soul/
├── LastWords/
├── Skeleton/        ← NEW (v1.0 ignores)
├── Marrow/          ← NEW (v1.0 ignores)
└── Phylactery/      ← NEW (v1.0 ignores)
```

v1.0 app opens v2.0 `.Crypt`:
- Reads Memorial.txt, ignores unknown fields
- Opens all known folders (Skeleton/, Grave/, etc.)
- Shows "Other Components: 3" in UI
- User can still access Skeleton/, Marrow/, Phylactery/ via file explorer
- No errors, no warnings, no data loss

**Implementation:**

```typescript
// v1.0 parser
async function parseCrypt(zipPath: string): Promise<CryptFile> {
  const zip = await openZip(zipPath);
  const manifest = JSON.parse(await zip.readText("Memorial.txt"));
  
  // Version tolerance
  if (manifest.$crypt > 1) {
    logger.warn("crypt", `Future format version ${manifest.$crypt}, attempting v1 parser`);
  }
  
  // Load known components
  const crypt: CryptFile = {
    manifest,
    skeleton: await loadFolder(zip, "Skeleton/"),
    grave: await loadFolder(zip, "Grave/"),
    urn: await loadFolder(zip, "Urn/"),
    epitaph: await loadFolder(zip, "Epitaph/"),
    vault: await loadFolder(zip, "Vault/"),
    catacombs: await loadFolder(zip, "Catacombs/"),
    reliquary: await loadFolder(zip, "Reliquary/"),
    soul: await loadFolder(zip, "Soul/"),
    lastWords: await loadFolder(zip, "LastWords/"),
    unknownComponents: [], // Collect unknown folders
  };
  
  // Scan for unknown components
  const knownFolders = ["Skeleton", "Grave", "Urn", "Epitaph", "Vault", "Catacombs", "Reliquary", "Soul", "LastWords"];
  for (const entry of zip.entries()) {
    const folderName = entry.name.split("/")[0];
    if (folderName && !knownFolders.includes(folderName) && folderName !== "Memorial.txt") {
      crypt.unknownComponents.push(folderName);
    }
  }
  
  return crypt;
}
```

**UI Handling:**

- Show "Other Components" section if `unknownComponents.length > 0`
- List unknown components with "Extract" button
- Message: "This .Crypt contains components from a newer version of CryptArtist Studio. You can still access them via file explorer."
- No errors, no blocking

**Result:**

- `.Crypt` files created in v1.0 work forever in v2.0, v3.0, v100.0
- New features added without breaking old files
- Users never need to upgrade or migrate files
- Maximum forward compatibility, zero data loss
- `.Crypt` files can be opened with any standard ZIP tool for inspection
- Nested `.Crypt` files (Catacombs) enable hierarchical project organization

---

## Best Practices

### Creating .Crypt Files
- Always include a meaningful **name** and **author** in the manifest
- Use **tags** for categorization - they help with search and organization
- Keep Skeleton/ focused - one project per .CryptArt file, not one monolith
- Use **Grave/** for shared assets to avoid duplicating media across .CryptArt files
- Include a **README** in Epitaph/ so others understand the project
- Set a **version** (semver recommended) and update it on each save

### Mummy / Pyramid Best Practices
- Always set `askFirst: true` for curses - respect the user's computer
- Keep curse messages **informative and friendly**, not alarming
- Test Mummy scripts on a clean VM before distributing
- The Mummy logs to `Mummy.log` in the Pyramid/ folder - check it for debugging
- Set reasonable `restartDelayMs` (3s+) to avoid rapid restart loops
- If distributing a .Crypt publicly, ensure `downloadUrl` points to a stable release

### Performance
- `.Crypt` files use Deflate compression by default - good balance of speed and size
- Mummy bootstrap scripts (.bat/.sh) are stored with STORED compression for direct extraction
- Keep individual .CryptArt files under 100MB for fast extraction
- The health-check interval (5s default) is intentionally slow to minimize CPU usage
- The maximum workspace limit of 69 exists to prevent memory exhaustion

---

## Security Considerations

1. **Curse files are always opt-in** - the user is asked before any file is written to their system
2. **Curse location is restricted** - only Desktop, Documents, or Temp (no arbitrary paths)
3. **Curse filenames are sanitized** - no path traversal characters allowed
4. **Vault/ folder** is intended for encrypted secrets - current implementation stores them as-is, future versions will add AES-256 encryption
5. **Mummy scripts execute with user permission** - the user must manually run Mummy.bat or Mummy.sh
6. **Download URLs are validated** - only GitHub releases are auto-downloaded
7. **Path traversal is blocked** in `extract_from_crypt` - entries with `..` or leading slashes are rejected
8. **Temp files are cleaned up** on write failure to prevent orphaned data
9. **ZIP archives are validated** before operations - corrupt archives fail early with clear messages
10. **No arbitrary code execution** - Mummy scripts only download and launch the known CryptArtist Studio binary

---

## Troubleshooting

### "Memorial.txt contains invalid JSON"
- The .Crypt's manifest is corrupted. Open the .Crypt as a ZIP and inspect Memorial.txt manually.
- Re-save the .Crypt from CryptManager to regenerate a valid manifest.

### "This file does not appear to be a valid .Crypt"
- The file may not be a ZIP archive, or it may be corrupted.
- Verify the file has a `.Crypt` extension and can be opened with a standard ZIP tool.

### Mummy download fails
- Check `Pyramid/Mummy.log` for error details.
- Verify network connectivity - the Mummy needs to reach `api.github.com`.
- If behind a proxy, the Mummy's PowerShell script may need proxy configuration.
- Manually download from `https://github.com/mattyjacks/CryptArtistStudio/tree/main/download`.

### "Awaken the Mummy" button not appearing
- The Pyramid/ folder must contain at least one file (Mummy.bat, Mummy.json, etc.)
- Use the Save Dialog and check the "Mummy" component to populate Pyramid/.

### Mummy keeps restarting
- Check the health-check logic: if all workspaces close, the Mummy restarts.
- After 10 consecutive restarts, it pauses for 30 seconds automatically.
- Use "Silence the Mummy" (or Ctrl+Shift+M) to stop it.

### Save dialog shows 0 B for all components
- No `folderContents` were passed to the save dialog. Ensure the CryptManager is properly loading entry data.

---

## FAQ

**Q: Can I rename a .Crypt file?**
A: Yes. The filename is independent of the internal manifest name. Rename freely.

**Q: Can I open a .Crypt with WinRAR / 7-Zip?**
A: Yes. A .Crypt is a standard ZIP archive. Rename to `.zip` if needed, or configure your ZIP tool to open `.Crypt` files directly.

**Q: What happens if I add unknown folders to a .Crypt?**
A: CryptArtist Studio will display them with an "Unknown" badge and let you browse their contents. They are preserved on re-save.

**Q: Is there a size limit for .Crypt files?**
A: The soft limit is 4 GB (defined as `MAX_CRYPT_SIZE_BYTES`). This is a practical limit based on ZIP format constraints.

**Q: Can the Mummy run without internet?**
A: If CryptArtist Studio is already installed, yes. The Mummy only needs internet to download the app on first run.

**Q: How do I disable the Curse?**
A: In the Save Dialog, uncheck "Leave a Curse" under Mummy Curse Settings. Or set `curse.enabled: false` in Mummy.json.

**Q: Can I nest .Crypt files inside .Crypt files?**
A: Yes! That's what the Catacombs/ folder is for. Nested .Crypt files are fully supported.

---

## Keyboard Shortcuts (CryptManager)

| Shortcut | Action |
|----------|--------|
| **Ctrl+Shift+M** | Awaken / Silence the Mummy |

---

## File Size Limits & Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CRYPT_FORMAT_VERSION` | 1 | Format version (never changes) |
| `MAX_CRYPT_NAME_LENGTH` | 128 | Maximum characters in crypt name |
| `MAX_DESCRIPTION_LENGTH` | 2048 | Maximum characters in description |
| `MAX_ENTRIES_PER_FOLDER` | 10,000 | Maximum entries in a single folder |
| `MAX_CRYPT_SIZE_BYTES` | 4 GB | Maximum total archive size |
| `CRYPT_MIME_TYPE` | `application/x-cryptartist-crypt` | MIME type for .Crypt files |

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_FORMAT` | File is not a valid ZIP archive |
| `MISSING_MEMORIAL` | No Memorial.txt found in archive |
| `MISSING_SKELETON` | No Skeleton/ folder (warning, not fatal) |
| `INVALID_MANIFEST` | Memorial.txt contains invalid JSON |
| `CORRUPT_ARCHIVE` | ZIP archive is damaged |
| `SIZE_EXCEEDED` | File exceeds MAX_CRYPT_SIZE_BYTES |
| `NAME_TOO_LONG` | Crypt name exceeds MAX_CRYPT_NAME_LENGTH |
| `WRITE_FAILED` | Could not write to disk |
| `READ_FAILED` | Could not read file |
| `ENTRY_NOT_FOUND` | Requested entry does not exist in archive |
