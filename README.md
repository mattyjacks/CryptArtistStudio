<div align="center">

# CryptArtist Studio

### The Open Creative Suite - Powered by Community

**Website:** [mattyjacks.com](https://mattyjacks.com) | **GitHub:** [github.com/mattyjacks/CryptArtistStudio](https://github.com/mattyjacks/CryptArtistStudio) | **Contact:** [Matt@MattyJacks.com](mailto:Matt@MattyJacks.com)

---

**CryptArtist Studio** is a free, open-source, professional-grade creative suite built with
Tauri v2, React 18, TypeScript, and Rust. It bundles eight powerful programs into a single
desktop application: a video/image editor, a vibe-coding IDE, a screen recorder, an
autonomous AI agent, an integrated game development studio, a terminal-based command center,
a P2P compute-sharing tool, and a full settings hub.

The project is community-funded through donations at
[mattyjacks.com](https://mattyjacks.com) and [givegigs.com](https://givegigs.com).

</div>

---

## Table of Contents

- [Overview](#overview)
- [Programs in the Suite](#programs-in-the-suite)
  - [Media Mogul](#media-mogul--mmo)
  - [VibeCodeWorker](#vibecodeworker--vcw)
  - [DemoRecorder](#demorecorder--dre)
  - [ValleyNet](#valleynet--vnt)
  - [GameStudio](#gamestudio--gst)
  - [CryptArt Commander](#cryptart-commander--cac)
  - [Donate Computer](#donate-computer--dco)
  - [Settings](#settings--set)
- [Workspace Management](#workspace-management)
  - [Multi-File Workspaces](#multi-file-workspaces)
  - [Workspace Groups and Resource Sharing](#workspace-groups-and-resource-sharing)
- [The .CryptArt File Format](#the-cryptart-file-format)
  - [Format Overview](#format-overview)
  - [Required Fields](#required-fields)
  - [Recommended Fields](#recommended-fields)
  - [Optional Fields](#optional-fields)
  - [Meta Object](#meta-object)
  - [Backward Compatibility](#backward-compatibility)
  - [Example Files](#example-files)
- [Technology Stack](#technology-stack)
  - [Frontend](#frontend)
  - [Backend (Rust)](#backend-rust)
  - [Media Engine](#media-engine)
  - [Build System](#build-system)
- [Project Architecture](#project-architecture)
  - [Directory Structure](#directory-structure)
  - [Frontend Architecture](#frontend-architecture)
  - [Backend Architecture](#backend-architecture)
  - [State Management](#state-management)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Development Mode](#development-mode)
  - [Building for Production](#building-for-production)
  - [Platform Support](#platform-support)
- [CLI Reference](#cli-reference)
  - [Global Commands](#global-commands)
  - [Project Management](#project-management-commands)
  - [Media Commands](#media-commands)
  - [AI Commands](#ai-commands)
  - [File System Commands](#file-system-commands)
  - [Server Commands](#server-commands)
  - [System Commands](#system-commands)
- [REST API Reference](#rest-api-reference)
  - [Starting the Server](#starting-the-server)
  - [Endpoints](#endpoints)
  - [Authentication](#authentication)
- [Configuration](#configuration)
  - [API Keys](#api-keys)
  - [FFmpeg Setup](#ffmpeg-setup)
  - [Godot Integration](#godot-integration)
  - [Tauri Configuration](#tauri-configuration)
- [Logging System](#logging-system)
  - [Log Files](#log-files)
  - [Log Levels](#log-levels)
  - [Frontend Logging](#frontend-logging)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [OpenRouter Multi-Model AI Integration](#openrouter-multi-model-ai-integration)
  - [Supported Providers](#supported-providers)
  - [Model Selection](#model-selection)
  - [Fallback Behavior](#fallback-behavior)
- [Security Hardening](#security-hardening)
  - [Overview of 100 Vulnerability Fixes](#overview-of-100-vulnerability-fixes)
  - [Security Utility Module](#security-utility-module)
  - [Content Security Policy](#content-security-policy)
  - [REST API Security Headers](#rest-api-security-headers)
  - [Input Validation Summary](#input-validation-summary)
- [CryptArtist Studio Website](#cryptartist-studio-website)
  - [Website Pages](#website-pages)
  - [Website Technology](#website-technology)
- [Privacy Policy and Terms of Use](#privacy-policy-and-terms-of-use)
- [Contributing](#contributing)
  - [Development Workflow](#development-workflow)
  - [Code Style](#code-style)
  - [Pull Requests](#pull-requests)
- [Troubleshooting](#troubleshooting)
- [Performance Optimization](#performance-optimization)
- [Prompt History](#prompt-history)
- [Related Projects and Links](#related-projects-and-links)
- [License](#license)
- [Credits](#credits)

---

## Overview

CryptArtist Studio started as a DaVinci Resolve competitor - a professional video editor
with AI integration. It has since evolved into a full creative suite with five distinct
programs, all sharing a unified dark theme, a common project file format (`.CryptArt`),
and deep AI integration powered by the user's own API keys.

### Key Highlights

- **Eight Programs in One** - Video editing, code editing, screen recording, AI agent,
  game development, terminal commander, P2P compute sharing, and a settings hub all
  in a single ~15 MB download.
- **Security Hardened** - 100 vulnerability fixes across frontend and backend,
  including CSP, input validation, rate limiting, XSS prevention, and audit logging.
- **AI-Powered Everything** - Every program integrates with OpenAI, Anthropic, Google,
  or any OpenAI-compatible API endpoint. Users bring their own keys.
- **The .CryptArt File Format** - A permanently future-proof JSON project file that
  will never need a format upgrade. Any `.CryptArt` file ever created will always be
  readable by any version of the app.
- **Cross-Platform** - Runs on Windows, macOS, and Linux via Tauri. Mobile support
  (Android/iOS) is in progress.
- **Full CLI and REST API** - Every feature is accessible from the command line or via
  HTTP API, enabling integration with other AI tools and automation pipelines.
- **Comprehensive Logging** - Three rolling log files track everything: a session log,
  a recent log (last 1,000 lines), and a full history log.
- **Community-Funded** - No subscriptions, no ads. Supported by donations at
  [mattyjacks.com](https://mattyjacks.com) and [givegigs.com](https://givegigs.com).
- **Open Source** - MIT licensed. Fork it, extend it, make it yours.

### Philosophy

CryptArtist Studio is built on the belief that creative tools should be:

1. **Free** - No paywalls, no feature gates, no "pro" tiers.
2. **Open** - MIT licensed, fully auditable, community-driven.
3. **Permanent** - File formats that never break, software that respects your work.
4. **AI-Native** - AI is not bolted on; it is woven into every workflow.
5. **User-Controlled** - Your API keys, your data, your machine. No cloud dependency.

---

## Programs in the Suite

When you launch CryptArtist Studio, you are greeted by the **Suite Launcher** - a
full-window launcher displaying the CryptArtist logo and eight program cards.
Each card shows the program's emoji logo, name, short code, and a one-line description.
The launcher includes search and filter, favorites, category sorting, grid/list views,
a rotating tips carousel, keyboard shortcuts overlay, system status indicators, and
an AI readiness indicator.

| # | Program | Emoji | Code | Shortcut | Description |
|---|---|---|---|---|---|
| 1 | **Media Mogul** | TV | MMo | `1` | Video editor, image editor, and AI-powered media studio |
| 2 | **VibeCodeWorker** | Technologist | VCW | `2` | Your personal vibe-coding IDE powered by your own API keys |
| 3 | **DemoRecorder** | Camera | DRe | `3` | Screen recorder and live streamer for demos and gaming |
| 4 | **ValleyNet** | Person | VNt | `4` | Autonomous AI agent that can do anything on your computer |
| 5 | **GameStudio** | Game Controller | GSt | `5` | Combined media + code + Godot engine for game development |
| 6 | **CryptArt Commander** | Cat | CAC | `6` | Terminal-based command center for API and CLI control |
| 7 | **Donate Computer** | Computer | DCo | `7` | P2P compute resource sharing for distributed tasks |
| 8 | **Settings** | Gear | Set | `8` | API key management, OpenRouter, appearance, and data |

The Suite Launcher also displays a donation banner encouraging users to support
development at [mattyjacks.com](https://mattyjacks.com) and
[givegigs.com](https://givegigs.com).

#### Suite Launcher Features

- **Search and Filter** - Type to search programs by name, code, description, or tags
- **Category Filter** - Filter by category tags (all, video, code, ai, media, game, tools)
- **Sort Options** - Sort by default, A-Z, most used, or favorites first
- **Grid/List View** - Toggle between card grid and compact list layouts
- **Favorites** - Star programs for quick access; persisted in localStorage
- **Launch Count Tracking** - Tracks how many times each program is launched
- **Time-Based Greeting** - Dynamic greeting based on time of day
- **Rotating Tips** - 14 tips rotate every 8 seconds with usage hints
- **Keyboard Shortcuts Overlay** - Press `?` to see all shortcuts
- **Recent Projects Panel** - Press `R` to see recently opened `.CryptArt` files
- **Quick Actions Dropdown** - Access recent projects, shortcuts, cache clear, and GitHub
- **System Status** - Shows FFmpeg, Godot, and AI (OpenRouter/OpenAI) status
- **Open .CryptArt Files** - Multi-file open dialog that creates workspaces
- **Accent Color** - Configurable accent color theme
- **Uptime Display** - Shows session uptime in the status bar

---

### Media Mogul - MMo

**Media Mogul** is the flagship program of CryptArtist Studio. It is a professional-grade
video editor, image editor, and AI-powered media production studio.

#### Workspaces

Media Mogul is organized into six workspaces, each accessible from the header tabs:

| Workspace | Description |
|---|---|
| **Edit** | Timeline-based video editing with multi-track support |
| **Node Mode** | Node-based compositing pipeline for advanced visual effects |
| **Color** | Color grading and correction tools |
| **Audio** | Audio editing, mixing, and waveform visualization |
| **AI Studio** | AI-powered video generation, voiceover, captioning, and scripting |
| **Deliver** | Export settings, format selection, and render queue |

#### Features

- **Multi-Track Timeline** - Drag-and-drop clips onto a layered timeline with
  snap-to-grid, trimming, splitting, and ripple editing.
- **Node-Based Compositing** - A directed acyclic graph (DAG) editor for chaining
  visual effects, color corrections, and transformations.
- **AI Studio Mode** - Generate complete videos from a text prompt:
  - AI selects stock footage from Pexels
  - AI writes voiceover scripts
  - AI generates captions and subtitles
  - AI suggests background music from GiveGigs media bucket
  - AI creates podcast scripts and music compositions
- **Pexels Integration** - Search and import photos and videos from Pexels directly
  into your project. Multiple resolution options for video.
- **GiveGigs Media Bucket** - Connect to a GiveGigs.com Supabase bucket for royalty-free
  music, sound effects, and media assets.
- **Image Generation** - Generate images using the OpenAI API (DALL-E) with custom
  prompts or AI-assisted prompt refinement.
- **FFmpeg-Powered** - All encoding, decoding, and transcoding is handled by FFmpeg,
  which is automatically downloaded on first run.
- **Export Options** - Export to MP4, WebM, GIF, PNG sequence, and more with
  configurable resolution, bitrate, and codec settings.

#### .CryptArt Data Payload (Media Mogul)

When Media Mogul saves a `.CryptArt` file, the `data` object contains:

```json
{
  "workspace": "edit",
  "timeline": { ... },
  "mediaPool": [ ... ],
  "nodeGraph": { ... },
  "colorGrade": { ... },
  "exportSettings": { ... }
}
```

---

### VibeCodeWorker - VCW

**VibeCodeWorker** is a full-featured vibe-coding IDE built into CryptArtist Studio.
It is modeled after VS Code and Windsurf, using the MIT-licensed Monaco Editor as its
code editing engine. Users power the AI with their own API keys.

#### Layout

The VibeCodeWorker window is divided into four main areas:

| Area | Position | Description |
|---|---|---|
| **File Explorer** | Left sidebar (200px) | Tree view of the project directory |
| **Editor** | Center | Monaco Editor with syntax highlighting, minimap, bracket colorization |
| **Bottom Panel** | Below editor (200px) | Tabbed panel with 5 sub-panels |
| **AI Chat** | Right sidebar (300px) | AI assistant with context-aware code help |

#### Bottom Panel Tabs

| Tab | Description |
|---|---|
| **Terminal** | Built-in terminal with basic commands (clear, pwd, help) |
| **Problems** | Auto-scanning lint diagnostics that run on every file change |
| **Testing** | AI-powered + pattern-based test runner with auto-test on save |
| **Web Audit** | Lighthouse-style website quality analysis (Performance, Accessibility, SEO, Best Practices) |
| **Search** | Cross-file search and replace with regex and case-sensitivity toggles |

#### Testing Panel

The Testing panel provides two modes of analysis:

**AI-Powered Testing** (requires API key):
- Analyzes the current file for potential bugs, edge cases, and coverage gaps
- Checks for: null safety, error handling, boundary conditions, type safety,
  security issues, race conditions
- Returns 5-15 individual test checks with pass/fail/warning status

**Pattern-Based Testing** (no API key required):
- Detects test files (`.test.`, `.spec.`, `_test.`, `test_` patterns)
- Counts assertions (`expect()`, `assert()`)
- Flags TypeScript `any` usage
- Flags empty catch blocks

**Auto-Test on Save**:
- Toggle the "Auto-test on save" checkbox
- Every file save automatically triggers a test run
- Status bar shows "Auto-test ON" when enabled

#### Web Audit Panel

The Web Audit panel provides Google Lighthouse-style website analysis:

**AI-Powered Audit** (requires API key):
- Scores from 0-100 for: Performance, Accessibility, Best Practices, SEO
- 15-25 individual checks covering:
  - Page load optimizations
  - Image alt tags and semantic HTML
  - ARIA roles and keyboard navigation
  - Meta tags, viewport, HTTPS
  - CSP headers, font loading
  - Mobile responsiveness
  - Heading hierarchy, link text, form labels

**Pattern-Based Audit** (no API key required):
- Checks HTML files for viewport meta, title tag, lang attribute, image alt attributes

Color-coded score display:
- Green (90+): Excellent
- Yellow (50-89): Needs improvement
- Red (0-49): Poor

#### Problem Scanner

The Problems panel automatically scans all open files for:

| Check | Severity | Description |
|---|---|---|
| `console.log()` | Warning | Console.log statements left in non-test code |
| `TODO/FIXME/HACK/XXX` | Info | Task comments that need attention |
| Lines > 200 chars | Warning | Excessively long lines |
| `debugger` | Error | Debugger statements left in code |
| Empty catch blocks | Warning | Error swallowing without handling |

#### Supported Languages

Monaco Editor provides syntax highlighting for:

TypeScript, JavaScript, Python, Rust, JSON, Markdown, HTML, CSS, SCSS, TOML,
YAML, Shell/Bash, SQL, Go, Java, C, C++, XML, SVG, and plaintext.

#### AI Assistant

The AI chat panel supports multiple providers:

| Provider | Models |
|---|---|
| **OpenAI** | gpt-4o, gpt-4-turbo, gpt-3.5-turbo, etc. |
| **Anthropic** | Claude models |
| **Google** | Gemini models |
| **Custom** | Any OpenAI-compatible endpoint |

The AI assistant automatically includes the currently open file as context (up to 8,000
characters) when answering questions.

#### .CryptArt Data Payload (VibeCodeWorker)

```json
{
  "rootPath": "/path/to/project",
  "openFiles": [
    { "path": "/path/to/file.ts", "name": "file.ts" }
  ],
  "activeFile": "/path/to/file.ts",
  "aiProvider": "openai",
  "model": "gpt-4o"
}
```

---

### DemoRecorder - DRe

**DemoRecorder** is a screen recording and live streaming tool designed for software
demos, gaming clips, and content creation.

#### Features

- **Screen Recording** - Record your entire screen or a specific window with
  configurable resolution and frame rate.
- **Recording Controls** - Start, Pause, Stop buttons with a live timer display.
- **Resolution Presets** - 720p, 1080p, 1440p, 4K, or custom resolution.
- **FPS Options** - 24, 30, 60, or 120 frames per second.
- **Live Streaming** - Stream to Twitch, YouTube Live, or Google Meet using
  RTMP URL and stream key.
- **Input Logger Plugin** - Optional plugin that records keyboard and mouse events
  in a structured JSON log, timestamped to video frames. Designed for training AI
  models to replicate human computer interactions.
  **Warning:** This feature logs all keystrokes. A clear warning is shown when enabling.
- **Integration Links** - Quick links to GiveGigs.com and SiteFari.com for publishing
  and sharing recorded demos.

#### Streaming Targets

| Platform | Connection Method |
|---|---|
| **Twitch** | RTMP URL + Stream Key |
| **YouTube Live** | RTMP URL + Stream Key |
| **Google Meet** | Meeting URL + Credentials |

#### .CryptArt Data Payload (DemoRecorder)

```json
{
  "resolution": "1920x1080",
  "fps": 60,
  "format": "mp4",
  "streamTargets": [ ... ],
  "inputLoggerEnabled": false,
  "recordings": [ ... ]
}
```

---

### ValleyNet - VNt

**ValleyNet** is an autonomous AI agent inspired by OpenClaw - the open-source
self-hosted AI agent that executes real-world tasks via LLMs. ValleyNet brings
this concept directly into CryptArtist Studio.

#### Features

- **Natural Language Task Execution** - Type tasks in plain English:
  "Research competitors and summarize findings",
  "Send this file to my Discord channel",
  "Book a meeting for Thursday".
- **Skills Marketplace** - Browse, install, and manage agent skills. Each skill
  is a directory containing a `SKILL.md` manifest file.
- **Browser Automation** - An embedded webview that ValleyNet can control to
  browse the web, fill forms, scrape data, and interact with sites.
- **Service Integrations** - Connect to Discord, Slack, Telegram, WhatsApp,
  Gmail, Google Calendar, and any webhook URL.
- **Task Memory** - Persistent context that carries across sessions, with a
  full task history and memory log.

#### Supported Integrations

| Service | Connection Method |
|---|---|
| **Discord** | Bot token or webhook URL |
| **Slack** | Bot token or webhook URL |
| **Telegram** | Bot token |
| **WhatsApp** | WhatsApp Business API |
| **Gmail** | OAuth2 or app password |
| **Google Calendar** | OAuth2 |
| **Custom Webhook** | Any HTTP endpoint |

#### .CryptArt Data Payload (ValleyNet)

```json
{
  "skills": [ ... ],
  "taskHistory": [ ... ],
  "memory": { ... },
  "integrations": { ... },
  "browserState": { ... }
}
```

---

### GameStudio - GSt

**GameStudio** is the newest program in the suite. It combines the capabilities of
Media Mogul and VibeCodeWorker with Godot Engine integration to enable AI-powered
game development.

#### Features

- **Three-Panel Layout** - Asset editor (Media Mogul), code editor (VibeCodeWorker),
  and Godot Engine side by side in a configurable layout.
- **Godot Integration** - Automatically detects or downloads the Godot engine.
  Launch, manage, and interact with Godot projects from within CryptArtist Studio.
- **AI Game Generation** - Describe a game concept in natural language and the AI
  will generate GDScript code, scene files, and asset suggestions.
- **Project Templates** - Start from pre-built templates for 2D platformers,
  top-down RPGs, puzzle games, and more.
- **Asset Pipeline** - Use Media Mogul's AI image generation to create sprites,
  textures, and UI elements, then import them directly into Godot.

#### Layout Modes

| Mode | Description |
|---|---|
| **Split** | Media + Code side by side (50/50) |
| **Code Focus** | Full-width code editor with asset sidebar |
| **Media Focus** | Full-width media editor with code sidebar |
| **Godot Focus** | Full-width Godot viewport with toolbars |

#### .CryptArt Data Payload (GameStudio)

```json
{
  "godotProjectPath": "/path/to/project.godot",
  "layout": "split",
  "mediaState": { ... },
  "codeState": { ... },
  "godotState": { ... },
  "aiConversation": [ ... ]
}
```

---

### CryptArt Commander - CAC

**CryptArt Commander** (CAC) is a terminal-based command center that provides full
control over CryptArtist Studio through a command-line interface, REST API integration,
and scripting capabilities. It is designed for power users, automation, and AI agent
integration.

#### Terminal Interface

The Commander presents a full-screen terminal with a command prompt, scrollable output
history, and syntax-highlighted results. It includes tab completion, command aliases,
environment variables, and arrow-key history navigation.

#### Built-In Commands

| Command | Description |
|---|---|
| `help` | Show all available commands |
| `clear` | Clear the terminal output |
| `version` | Show CryptArtist Studio and Commander version |
| `sysinfo` | Display system information (OS, arch, FFmpeg, Godot) |
| `health` | Run a health check on the application |
| `keys status` | Check which API keys are configured |
| `keys export` | Export all API keys to JSON |
| `ffmpeg status` | Check if FFmpeg is installed |
| `ffmpeg install` | Install FFmpeg automatically |
| `godot detect` | Detect Godot engine installation |
| `ls <path>` | List directory contents with sizes |
| `cat <path>` | Read and display a file's contents |
| `write <path> <content>` | Write content to a file |
| `chat <prompt>` | Send a prompt to OpenAI |
| `or <prompt>` | Send a prompt to OpenRouter (200+ models) |
| `or models` | List available OpenRouter models |
| `pexels <query>` | Search Pexels for stock media |
| `generate <prompt>` | Generate an AI image via DALL-E |
| `tts <text>` | Convert text to speech |
| `project` | Show current project state |
| `programs` | List all programs in the suite |
| `run <script>` | Execute a saved script |
| `scripts` | List saved scripts |
| `api` | Show REST API reference |
| `echo <text>` | Echo text to the terminal |
| `time` | Display current time |
| `date` | Display current date and time |
| `history` | Show command history |
| `alias <name>=<cmd>` | Create a command alias |
| `aliases` | List all command aliases |
| `uptime` | Show session uptime |
| `whoami` | Show user information |
| `open <program>` | Navigate to a program by name or ID |
| `env` | Show environment variables |
| `env set <key> <value>` | Set an environment variable |
| `bench <cmd>` | Benchmark a command's execution time |
| `count` | Show total commands run across all sessions |
| `grep <pattern> <path>` | Search for a pattern in a file |
| `head <n> <path>` | Show the first N lines of a file |
| `tail <n> <path>` | Show the last N lines of a file |
| `wc <path>` | Word, line, and character count |
| `sort <path>` | Sort lines of a file alphabetically |
| `uniq <path>` | Show unique lines of a file |
| `calc <expr>` | Evaluate a math expression |
| `pwd` | Print working directory |
| `touch <path>` | Create an empty file |
| `export-history` | Export command history to a file |

#### Tab Completion

Press `Tab` to autocomplete commands and aliases. When multiple matches exist,
suggestion pills are displayed below the input. Press `Tab` again to cycle through
suggestions.

#### Command Aliases

Create shortcuts for frequently used commands:

```bash
alias ll=ls .
alias st=keys status
alias hc=health
alias v=version
```

Default aliases: `ll` (ls .), `st` (keys status), `hc` (health), `v` (version).
Aliases are persisted to localStorage across sessions.

#### Script Editor

The Commander includes a built-in script editor for creating, saving, and running
multi-command scripts:

- **Create scripts** with the visual editor
- **Run scripts** that execute each line as a command sequentially
- **Default scripts**: `hello-world` and `system-check` are provided out of the box
- **Languages**: Shell (command sequences), JavaScript, Python

#### REST API Reference Tab

A built-in API reference tab displays all 18+ REST API endpoints with their HTTP
methods, paths, descriptions, and parameters. This serves as an interactive
documentation panel for developers integrating with CryptArtist Studio.

#### Security Limits

- Maximum command input length: 10,000 characters
- Maximum display history: 200 entries
- Maximum command history: 500 entries
- Maximum script content: 50,000 characters
- Maximum environment variables: 100
- Maximum aliases: 50
- File paths are sanitized before passing to backend

#### .CryptArt Data Payload (Commander)

```json
{
  "commandHistory": [ ... ],
  "scripts": [ ... ],
  "aliases": { "ll": "ls .", "st": "keys status" },
  "envVars": { "USER": "Matt", "SHELL": "cac" }
}
```

---

### Donate Computer - DCo

**Donate Computer** is a P2P compute resource sharing tool that allows users to donate
their idle CPU, RAM, and GPU resources to help other CryptArtist Studio users run
computationally intensive tasks like AI inference, video rendering, and image generation.

#### How It Works

1. **Detect** - The system detects your available CPU cores, RAM, GPU, and network speed
2. **Configure** - Set donation limits (what percentage of each resource to share)
3. **Connect** - Connect to the P2P signaling network with a unique peer ID
4. **Share** - Your idle resources are made available to verified borrowers
5. **Borrow** - Request compute resources from available donors in the network

#### System Resource Detection

The component automatically detects:

| Resource | Detection Method |
|---|---|
| **CPU Cores** | `navigator.hardwareConcurrency` |
| **RAM** | `navigator.deviceMemory` API |
| **GPU** | WebGL2/WebGL `WEBGL_debug_renderer_info` extension |
| **Network** | `navigator.connection` API (downlink, RTT, effectiveType) |
| **Platform** | `navigator.platform` |

#### Donation Limits

Users can configure how much of each resource to share via sliders:

| Resource | Default | Range |
|---|---|---|
| **CPU** | 80% | 0-100% |
| **RAM** | 50% | 0-100% |
| **GPU** | 90% | 0-100% |

#### Features

- **Password Protection** - Cryptographically secure 16-character passwords for peer verification
- **Peer Verification** - Peers must be verified before resource sharing begins
- **Live Statistics** - Connected peers, tasks completed, uptime, CPU time shared
- **Activity Log** - Timestamped log of all events (connections, tasks, errors)
- **Peer Information** - Detailed info about connected peers and their resources
- **Start/Stop Controls** - Simple buttons to start donating or borrowing
- **Secure Random IDs** - Peer IDs generated using `crypto.getRandomValues()`

#### Security Features

- Maximum 50 peer connections (Vuln 52)
- Maximum 200 log entries to prevent memory leaks (Vuln 53)
- All timeouts tracked and cleaned up on unmount (Vuln 51)
- Cryptographically secure peer ID generation (Vuln 86)
- Double-click prevention on stop button (Vuln 64)

#### .CryptArt Data Payload (Donate Computer)

```json
{
  "peerId": "ca-a1b2c3d4e5f6g7h8",
  "mode": "donating",
  "limits": { "cpuPercent": 80, "ramPercent": 50, "gpuPercent": 90 },
  "stats": { "uptime": 3600, "tasksCompleted": 42, "cpuTimeShared": 2880000 }
}
```

---

### Settings - Set

**Settings** is the centralized configuration hub for CryptArtist Studio. It manages
all API keys, AI model selection, appearance preferences, data management, and
keyboard shortcuts.

#### Sidebar Navigation

| Section | Description |
|---|---|
| **API Keys** | Manage OpenAI, Pexels, and GiveGigs API keys |
| **OpenRouter** | Configure OpenRouter API key and default model |
| **Appearance** | Theme accent color, font family, font size |
| **Keyboard Shortcuts** | View all global keyboard shortcuts |
| **Data & Storage** | localStorage usage, clear data, reset settings |
| **About** | Version info, credits, and links |

#### API Key Management

All API keys are stored securely in the Rust backend state, never in frontend
localStorage. The Settings panel provides:

- **OpenAI Key** - For AI chat, image generation, TTS, and AI Studio
- **OpenRouter Key** - For access to 200+ AI models
- **Pexels Key** - For stock photo and video search
- **GiveGigs Config** - For media asset library access

Keys are masked in the UI (showing only the first 8 characters) and can be
toggled visible.

#### OpenRouter Configuration

- **Model Selector** - Choose from 15 popular models across providers:
  - OpenAI: GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1 Preview, o1 Mini
  - Anthropic: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
  - Google: Gemini Pro 1.5, Gemini Flash 1.5
  - Meta: Llama 3.1 405B, Llama 3.1 70B
  - Mistral: Mixtral 8x22B, Mistral Large
  - Perplexity: Llama 3.1 Sonar 70B
- **Connection Test** - Verify OpenRouter key works with a live API call
- **Live Status** - Shows connected model and provider in the panel footer

#### Import/Export API Keys

Export all API keys to a `Forbidden-Secrets-of-CryptArtist-Keys-N.txt` file:

- File numbers auto-increment (1, 2, 3, ...)
- JSON format with all keys
- Warning header about sensitive data
- Import reads JSON and updates all keys in the backend

#### Data & Storage

- **localStorage Usage** - Visual display of storage used by CryptArtist
- **Per-Key Info** - See which localStorage keys exist and their sizes
- **Clear Specific Data** - Clear favorites, recent projects, launch counts, etc.
- **Danger Zone** - Reset all data, clear all localStorage, reset accent color

---

## Workspace Management

CryptArtist Studio supports opening multiple `.CryptArt` files simultaneously through
a workspace management system. This enables multi-project workflows, resource sharing
between projects, and side-by-side editing.

### Multi-File Workspaces

- **Open Multiple Files** - Use the "Open .CryptArt Files..." button in the Suite
  Launcher to open a multi-file dialog. Each file creates a separate workspace.
- **Workspace Bar** - A global tab bar appears above the main content area, showing
  all open workspaces with their names and program icons.
- **Switch Workspaces** - Click a tab to switch between open workspaces. The active
  workspace's project data loads into the appropriate program.
- **Context Menu** - Right-click a workspace tab for options: combine, share resources,
  duplicate, and close.
- **Maximum Workspaces** - Up to 20 workspaces can be open simultaneously.

### Workspace Groups and Resource Sharing

Workspaces can be combined into groups for resource sharing:

| Shared Resource | Description |
|---|---|
| **Media** | Share media pools between projects |
| **AI Context** | Share AI conversation context and history |
| **Settings** | Share configuration settings |
| **Files** | Share file references |
| **Chat History** | Share chat conversation history |

Groups are created by right-clicking a workspace tab and selecting "Combine".
Within a group, each member can selectively share resources with other members.

### Integration with Programs

All programs use the workspace system:

- **Mount/Switch** - Programs load active workspace data when mounted or when the
  active workspace changes
- **Multi-File Open** - Programs can open files into new workspaces via the dialog
- **Save Integration** - Programs call `updateProject()`, `updateFilePath()`, and
  `markClean()` on the workspace context when saving

### Architecture

| File | Purpose |
|---|---|
| `src/utils/workspace.ts` | Types, context, and helper functions |
| `src/components/WorkspaceProvider.tsx` | React state provider with CRUD and group logic |
| `src/components/WorkspaceBar.tsx` | Global tab bar UI with context menu |

---

## The .CryptArt File Format

The `.CryptArt` file format is the universal project file for all CryptArtist Studio
programs. It is a JSON file with the extension `.CryptArt` and the registered MIME type
`application/x-cryptartist-art`. The OS file type description is "CryptArtist Art".

### Design Goals

The `.CryptArt` format was designed with one overriding goal: **it must never need a
base format upgrade**. The envelope schema is stable forever. Any `.CryptArt` file ever
created will always be readable by any version of CryptArtist Studio.

1. **Permanent Envelope** - The envelope schema (`$cryptart`, `program`, `data`) never changes.
2. **Universal Readability** - Any `.CryptArt` file from any version is always parseable.
3. **Additive Only** - New fields and capabilities are added without breaking old files.
4. **Self-Identifying** - The `$cryptart` magic key identifies the file and its envelope version.
5. **Open Program IDs** - Any string is a valid program ID. No closed union types.
6. **Rich Metadata** - Optional metadata for author, description, tags, thumbnails, and more.
7. **Extensible** - The `extensions` section allows future plugin data.
8. **Auditable** - The `history` array tracks edit actions with timestamps.

### Compatibility Contract

| Rule | Description |
|---|---|
| **Readers MUST** | Ignore unknown top-level keys |
| **Readers MUST NOT** | Fail if optional keys are missing |
| **Writers MUST** | Always include the 3 required keys |
| **Writers SHOULD** | Preserve unknown keys when re-saving a file |

### Required Fields

These are the only three fields that **MUST** exist in every `.CryptArt` file:

| Field | Type | Description |
|---|---|---|
| `$cryptart` | `1` (number) | Magic key. Identifies the file AND its envelope version. Always `1`. |
| `program` | `string` | Free-form string identifying which program created the file. |
| `data` | `object` | Program-specific payload. Opaque to the envelope. |

### Recommended Fields

Written by default when creating a new file, but not required for parsing:

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Human-readable project name |
| `createdAt` | `string` | ISO-8601 creation timestamp |
| `updatedAt` | `string` | ISO-8601 last-save timestamp |
| `appVersion` | `string` | Version of CryptArtist Studio that wrote the file |

### Optional Fields

All optional fields are designed so that omitting them has no effect on functionality.
They exist for richer workflows:

#### Identity and Sync

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID for deduplication and cloud sync |
| `parentId` | `string` | UUID of the parent file (for forks/branches) |
| `source` | `string` | Origin URL or file path |

#### Meta Object

The `meta` field is an object with the following optional properties:

| Field | Type | Description |
|---|---|---|
| `meta.author` | `string` | Author name |
| `meta.email` | `string` | Contact email |
| `meta.organization` | `string` | Organization name |
| `meta.website` | `string` | Website URL (default: `https://mattyjacks.com`) |
| `meta.repository` | `string` | Source code repository URL |
| `meta.description` | `string` | Project description |
| `meta.readme` | `string` | Inline readme or path to readme file |
| `meta.tags` | `string[]` | Categorization tags |
| `meta.keywords` | `string[]` | Search keywords |
| `meta.category` | `string` | Project category |
| `meta.license` | `string` | License identifier (e.g., "MIT") |
| `meta.copyright` | `string` | Copyright notice |
| `meta.rating` | `string` | Content rating |
| `meta.thumbnail` | `string` | Thumbnail image URL or base64 |
| `meta.preview` | `string` | Preview image URL or base64 |
| `meta.icon` | `string` | Custom icon URL or base64 |
| `meta.color` | `string` | Accent color for UI (hex) |
| `meta.collaborators` | `string[]` | List of collaborator names/emails |
| `meta.fileCount` | `number` | Number of files in the project |
| `meta.duration` | `number` | Duration in seconds (for time-based projects) |
| `meta.resolution` | `string` | Resolution string (e.g., "1920x1080") |
| `meta.language` | `string` | Primary programming language |
| `meta.locale` | `string` | Content locale (e.g., "en-US") |

The `meta` object also accepts any additional key-value pairs via an open index
signature, so custom metadata is always preserved.

#### Project Structure

| Field | Type | Description |
|---|---|---|
| `dependencies` | `array` | Array of `{ name, version?, type? }` dependency objects |
| `environment` | `object` | `{ os?, arch?, runtime?, runtimeVersion? }` |

#### Integrity

| Field | Type | Description |
|---|---|---|
| `checksum` | `string` | SHA-256 hash of the `data` section |
| `encryption` | `string` | Encryption algorithm used, if any |
| `compression` | `string` | Compression algorithm used, if any |

#### Compatibility

| Field | Type | Description |
|---|---|---|
| `minAppVersion` | `string` | Minimum app version required to read this file |
| `maxAppVersion` | `string` | Maximum app version known to work |
| `compatibility` | `string[]` | Array of compatible reader identifiers |

#### Audit Trail

| Field | Type | Description |
|---|---|---|
| `history` | `array` | Array of `{ timestamp, action, detail?, user? }` entries |

#### Extensibility

| Field | Type | Description |
|---|---|---|
| `extensions` | `object` | `Record<string, unknown>` for plugin data |
| `plugins` | `string[]` | Array of plugin identifiers used |
| `schemas` | `object` | Map of data key to JSON Schema URL for validation |

#### Export and Sharing

| Field | Type | Description |
|---|---|---|
| `exportedAt` | `string` | ISO-8601 timestamp of last export |
| `exportedBy` | `string` | Who or what exported the file |
| `exportFormat` | `string` | Target format of export |
| `shareUrl` | `string` | Public sharing URL |

### Backward Compatibility

The parser handles all historical `.CryptArt` file versions:

1. **Pre-v1 files** (no `$cryptart` key) are auto-upgraded in memory on parse.
2. The old `version` field is silently migrated to `appVersion`.
3. Missing `data` defaults to `{}`.
4. Unknown keys are preserved on re-save, never discarded.
5. The `program` field was originally a closed union type; it is now an open string.

### Known Program IDs

| Program ID | Program Name |
|---|---|
| `media-mogul` | Media Mogul |
| `vibecode-worker` | VibeCodeWorker |
| `demo-recorder` | DemoRecorder |
| `valley-net` | ValleyNet |
| `game-studio` | GameStudio |

Any string is valid as a program ID. Third-party programs can use their own IDs
(e.g., `my-custom-tool`) without any changes to the format.

### Example: Minimal .CryptArt File

```json
{
  "$cryptart": 1,
  "program": "media-mogul",
  "data": {}
}
```

### Example: Full .CryptArt File

```json
{
  "$cryptart": 1,
  "program": "vibecode-worker",
  "name": "My Web App",
  "createdAt": "2026-03-13T17:00:00.000Z",
  "updatedAt": "2026-03-13T18:30:00.000Z",
  "appVersion": "0.1.0",
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "meta": {
    "author": "Matt",
    "email": "Matt@MattyJacks.com",
    "website": "https://mattyjacks.com",
    "description": "A full-stack web application",
    "tags": ["typescript", "react", "tauri"],
    "license": "MIT",
    "category": "web-development",
    "language": "typescript"
  },
  "environment": {
    "os": "windows",
    "arch": "x86_64",
    "runtime": "tauri",
    "runtimeVersion": "2.2.0"
  },
  "history": [
    {
      "timestamp": "2026-03-13T17:00:00.000Z",
      "action": "created",
      "user": "Matt"
    },
    {
      "timestamp": "2026-03-13T18:30:00.000Z",
      "action": "saved",
      "detail": "Added authentication module"
    }
  ],
  "data": {
    "rootPath": "/home/matt/projects/webapp",
    "openFiles": [
      { "path": "/home/matt/projects/webapp/src/App.tsx", "name": "App.tsx" }
    ],
    "activeFile": "/home/matt/projects/webapp/src/App.tsx",
    "aiProvider": "openai",
    "model": "gpt-4o"
  }
}
```

### Example: Legacy Pre-v1 File (Still Readable)

```json
{
  "program": "media-mogul",
  "version": "0.1.0",
  "name": "Old Project",
  "createdAt": "2026-03-01T12:00:00.000Z",
  "updatedAt": "2026-03-01T12:00:00.000Z",
  "data": {}
}
```

This file has no `$cryptart` key. The parser will:
1. Add `$cryptart: 1` in memory
2. Migrate `version` to `appVersion`
3. Return a valid `CryptArtFile` object

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3.x | UI component framework |
| **TypeScript** | 5.7.x | Type-safe JavaScript |
| **Vite** | 6.0.x | Build tool and dev server |
| **TailwindCSS** | 3.4.x | Utility-first CSS framework |
| **React Router** | 7.13.x | Client-side routing between programs |
| **Monaco Editor** | 4.7.x | Code editor engine (VS Code core) |
| **Tauri API** | 2.2.x | IPC bridge to Rust backend |
| **Tauri Dialog Plugin** | 2.6.x | Native file open/save dialogs |
| **Tauri Shell Plugin** | 2.2.x | Shell command execution |

### Backend (Rust)

| Crate | Version | Purpose |
|---|---|---|
| **tauri** | 2.x | Desktop application framework |
| **serde** | 1.x | Serialization/deserialization |
| **serde_json** | 1.x | JSON parsing and generation |
| **tokio** | 1.x | Async runtime |
| **reqwest** | 0.12.x | HTTP client for API calls |
| **clap** | 4.6.x | CLI argument parsing |
| **tiny_http** | 0.12.x | Lightweight HTTP server for REST API |
| **sha2** | 0.10.x | SHA-256 hashing (FFmpeg verification) |
| **dirs** | 5.x | OS-specific directory paths |
| **zip** | 2.x | Archive extraction (FFmpeg download) |
| **chrono** | 0.4.x | Date/time handling |
| **uuid** | 1.x | UUID generation |
| **base64** | 0.22.x | Base64 encoding/decoding |
| **futures-util** | 0.3.x | Async stream utilities |

### Media Engine

| Tool | Purpose |
|---|---|
| **FFmpeg** | Video/audio encoding, decoding, transcoding, and processing |
| **FFprobe** | Media file analysis and metadata extraction |
| **Godot Engine** | Game engine integration (GameStudio program) |

FFmpeg and FFprobe are automatically downloaded on first run. The installer detects
the user's operating system and architecture, downloads the appropriate binaries,
verifies their SHA-256 checksums, and stores them in the local AppData directory.

### Build System

| Tool | Purpose |
|---|---|
| **Vite** | Frontend bundling and hot module replacement |
| **tsc** | TypeScript type checking |
| **Cargo** | Rust compilation and dependency management |
| **Tauri CLI** | Application packaging and distribution |
| **PostCSS** | CSS processing pipeline |
| **Autoprefixer** | CSS vendor prefix automation |

---

## Project Architecture

### Directory Structure

```
CryptArtistStudio/
|
|-- README.md                              # This file
|-- .gitignore                             # Git ignore rules
|
|-- prompts/                               # Documentation of all AI prompts used
|   |-- all-prompts.md                     # Complete prompt history
|   |-- bigprompt-2.md                     # Suite refactor mega-prompt
|
|-- v1/                                    # Main application source
    |
    |-- package.json                       # Node.js dependencies and scripts
    |-- tsconfig.json                      # TypeScript configuration
    |-- vite.config.ts                     # Vite build configuration
    |-- tailwind.config.js                 # TailwindCSS theme and plugins
    |-- postcss.config.js                  # PostCSS pipeline
    |-- index.html                         # HTML entry point
    |
    |-- src/                               # Frontend source code
    |   |
    |   |-- main.tsx                       # React entry point + logger init
    |   |-- App.tsx                        # Root component + router
    |   |-- index.css                      # Global styles + TailwindCSS
    |   |-- vite-env.d.ts                  # Vite type declarations
    |   |
    |   |-- components/                    # Shared UI components
    |   |   |-- AIStudio.tsx               # AI-powered video generation
    |   |   |-- ErrorBoundary.tsx          # React error boundary
    |   |   |-- FFmpegSetup.tsx            # FFmpeg download progress UI
    |   |   |-- Header.tsx                 # Media Mogul header with workspace tabs
    |   |   |-- Inspector.tsx              # Property inspector panel
    |   |   |-- LoadingSpinner.tsx         # Loading animation component
    |   |   |-- MediaBrowser.tsx           # Media pool + Pexels integration
    |   |   |-- MobileNav.tsx              # Mobile-responsive navigation
    |   |   |-- NodeEditor.tsx             # Node-based compositing editor
    |   |   |-- PreviewCanvas.tsx          # Video preview viewport
    |   |   |-- SettingsModal.tsx          # Global settings with API keys
    |   |   |-- SuiteLauncher.tsx          # Main launcher with program cards
    |   |   |-- TermsAcceptanceModal.tsx   # Privacy policy + terms acceptance
    |   |   |-- Timeline.tsx               # Multi-track video timeline
    |   |   |-- WorkspaceBar.tsx           # Workspace tab bar with context menu
    |   |   |-- WorkspaceProvider.tsx      # Workspace state management provider
    |   |
    |   |-- programs/                      # Individual program views
    |   |   |-- media-mogul/
    |   |   |   |-- MediaMogul.tsx         # Media Mogul main component
    |   |   |-- vibecode-worker/
    |   |   |   |-- VibeCodeWorker.tsx     # VibeCodeWorker IDE component
    |   |   |-- demo-recorder/
    |   |   |   |-- DemoRecorder.tsx       # DemoRecorder main component
    |   |   |-- valley-net/
    |   |   |   |-- ValleyNet.tsx          # ValleyNet AI agent component
    |   |   |-- game-studio/
    |   |   |   |-- GameStudio.tsx         # GameStudio main component
    |   |   |-- commander/
    |   |   |   |-- Commander.tsx          # CryptArt Commander terminal
    |   |   |-- donate-computer/
    |   |   |   |-- DonateComputer.tsx     # P2P compute resource sharing
    |   |   |-- settings/
    |   |       |-- Settings.tsx           # Settings hub with API keys
    |   |
    |   |-- pages/                         # Static pages
    |   |   |-- PrivacyPolicy.tsx          # Privacy policy page
    |   |   |-- TermsOfUse.tsx             # Terms of use page
    |   |
    |   |-- utils/                         # Utility modules
    |       |-- constants.ts               # Shared constants and type definitions
    |       |-- cryptart.ts                # .CryptArt file format (permanent schema)
    |       |-- debounce.ts                # Debounce utility
    |       |-- formatters.ts              # Number/date/size formatting
    |       |-- hooks.ts                   # Shared React hooks library
    |       |-- keyboard.ts                # Global keyboard shortcuts
    |       |-- logger.ts                  # Frontend logging (sends to Rust)
    |       |-- openrouter.ts              # OpenRouter multi-model AI utility
    |       |-- platform.ts                # Platform detection + mobile viewport
    |       |-- security.ts                # Security helpers (30+ functions)
    |       |-- storage.ts                 # LocalStorage wrapper (validated)
    |       |-- toast.ts                   # Toast notification system (rate-limited)
    |       |-- workspace.ts               # Workspace types, context, helpers
    |
    |-- src-tauri/                          # Rust backend
        |
        |-- Cargo.toml                     # Rust dependencies
        |-- tauri.conf.json                # Tauri window/bundle configuration
        |-- build.rs                       # Tauri build script
        |
        |-- src/
        |   |-- main.rs                    # Entry point: CLI, Tauri commands, REST API
        |   |-- state.rs                   # Application state management
        |   |-- ai_integration.rs          # OpenAI API integration
        |   |-- ffmpeg_installer.rs        # FFmpeg auto-download + verification
        |   |-- logger.rs                  # Logging system (3 log files)
        |
        |-- icons/                         # Application icons for all platforms
            |-- 32x32.png
            |-- 128x128.png
            |-- 128x128@2x.png
            |-- icon.icns                  # macOS icon
            |-- icon.ico                   # Windows icon
|
|-- website/                              # Companion marketing website
    |-- A1/                               # Version 1 of the website
        |-- index.html                    # Landing page
        |-- programs.html                 # Program details page
        |-- about.html                    # About / philosophy page
        |-- docs.html                     # Documentation page
        |-- download.html                 # Download page
        |-- contact.html                  # Contact page
        |-- privacy.html                  # Privacy policy page
        |-- terms.html                    # Terms of use page
        |-- donate-computer.html          # P2P resource sharing page
        |-- style.css                     # Full dark theme stylesheet
        |-- script.js                     # Navigation, animations, interactions
        |-- donate-computer.js            # Donate Computer UI controller
        |-- donate-computer-api.js        # P2P resource sharing API
```

### Frontend Architecture

The frontend follows a clean layered architecture:

```
main.tsx                    # Entry point - initializes logger, renders App
  |
  App.tsx                   # Router setup + terms acceptance gate
    |
    |-- SuiteLauncher       # "/" - Program selection grid
    |-- MediaMogul          # "/media-mogul" - Video/image editor
    |-- VibeCodeWorker      # "/vibecode-worker" - Code IDE
    |-- DemoRecorder        # "/demo-recorder" - Screen recorder
    |-- ValleyNet           # "/valley-net" - AI agent
    |-- GameStudio          # "/game-studio" - Game development
    |-- PrivacyPolicy       # "/privacy" - Privacy policy
    |-- TermsOfUse          # "/terms" - Terms of use
```

Each program is a self-contained React component that manages its own state.
Programs communicate with the Rust backend exclusively through Tauri's `invoke()`
IPC mechanism.

### Backend Architecture

The Rust backend (`main.rs`) is organized into three execution modes:

1. **GUI Mode** (default) - Starts the Tauri application with all registered commands.
2. **CLI Mode** - Parses command-line arguments via Clap and executes headless.
3. **Server Mode** - Starts a REST API server on a configurable port.

#### Rust Source Files

| File | Lines | Purpose |
|---|---|---|
| `main.rs` | ~1,400 | CLI parsing, Tauri commands, REST API server |
| `state.rs` | ~300 | Application state: API keys, FFmpeg paths, project data |
| `ai_integration.rs` | ~160 | OpenAI API chat completion wrapper |
| `ffmpeg_installer.rs` | ~220 | OS-aware FFmpeg download, extraction, verification |
| `logger.rs` | ~280 | Thread-safe logging with 3 rolling files |

#### Tauri Commands (IPC)

The backend exposes the following Tauri commands to the frontend via `invoke()`:

##### FFmpeg Commands

| Command | Parameters | Returns | Description |
|---|---|---|---|
| `check_ffmpeg_installed` | none | `bool` | Check if FFmpeg binary exists and is executable |
| `install_ffmpeg` | none | `string` | Download, verify, and install FFmpeg; returns install path |

##### AI Commands

| Command | Parameters | Returns | Description |
|---|---|---|---|
| `ai_chat` | `{ message: string }` | `string` | Send a chat completion request to OpenAI |
| `ai_generate_image` | `{ prompt: string }` | `string` | Generate an image via DALL-E; returns URL |
| `openrouter_chat` | `{ message: string, model: string }` | `string` | Chat via OpenRouter with model selection |
| `openrouter_list_models` | none | `string` | List available OpenRouter models (JSON) |

##### API Key Commands

| Command | Parameters | Returns | Description |
|---|---|---|---|
| `get_api_key` | none | `string` | Retrieve the stored OpenAI API key |
| `set_api_key` | `{ key: string }` | `()` | Store an OpenAI API key (validated, max 512 chars) |
| `get_pexels_key` | none | `string` | Retrieve the stored Pexels API key |
| `set_pexels_key` | `{ key: string }` | `()` | Store a Pexels API key |
| `get_openrouter_key` | none | `string` | Retrieve the stored OpenRouter API key |
| `save_openrouter_key` | `{ key: string }` | `()` | Store an OpenRouter API key |
| `export_all_api_keys` | none | `string` | Export all keys as JSON string |
| `import_all_api_keys` | `{ json: string }` | `()` | Import keys from JSON (max 10 MB) |

##### Filesystem Commands

| Command | Parameters | Returns | Description |
|---|---|---|---|
| `read_directory` | `{ path: string }` | `DirEntry[]` | List directory with name, path, is_dir, size |
| `read_text_file` | `{ path: string }` | `string` | Read file contents (max 50 MB) |
| `write_text_file` | `{ path, content: string }` | `()` | Write content to file (max 100 MB, path sanitized) |

##### GiveGigs Commands

| Command | Parameters | Returns | Description |
|---|---|---|---|
| `set_givegigs_config` | `{ url, key, bucket: string }` | `()` | Configure GiveGigs Supabase connection |
| `get_givegigs_config` | none | `GiveGigsConfig` | Retrieve stored GiveGigs configuration |
| `list_givegigs_media` | `{ folder: string }` | `string` | List media files from GiveGigs bucket |

##### Godot Commands

| Command | Parameters | Returns | Description |
|---|---|---|---|
| `godot_detect` | none | `{ found: bool }` | Auto-detect Godot engine installation |
| `install_godot` | none | `string` | Download and install Godot engine |
| `launch_godot` | `{ path: string }` | `()` | Launch Godot with a project file (path sanitized) |
| `get_godot_path` | none | `string` | Get the configured Godot binary path |

##### Platform and System Commands

| Command | Parameters | Returns | Description |
|---|---|---|---|
| `get_platform_info` | none | `PlatformInfo` | OS, arch, home dir, available memory |
| `health_check` | none | `HealthStatus` | Application health: FFmpeg, Godot, API keys |

##### Logging Commands

| Command | Parameters | Returns | Description |
|---|---|---|---|
| `log_from_frontend` | `{ level, message: string }` | `()` | Forward frontend log to Rust logger |
| `get_log_session` | none | `string[]` | Get last 100 lines (session log) |
| `get_log_recent` | none | `string[]` | Get last 1,000 lines (recent log) |
| `get_log_paths` | none | `LogPaths` | Get absolute paths to all 3 log files |

### State Management

The Rust backend holds the **source of truth** for all application state. The React
frontend is strictly a view layer that:

1. Calls Tauri commands to read/write state
2. Manages UI-only state (tab selection, panel visibility, etc.) locally
3. Uses `localStorage` for lightweight persistence (theme, terms accepted, etc.)

State is stored in a thread-safe `AppState` struct protected by `Mutex` locks,
accessible from any Tauri command or CLI operation.

### UI Theme System

CryptArtist Studio uses a unified dark theme across all programs. The theme is
defined through TailwindCSS custom colors and CSS custom properties.

#### TailwindCSS Color Tokens

| Token | Hex Value | Usage |
|---|---|---|
| `studio-bg` | `#0a0a0f` | Main application background |
| `studio-panel` | `#12121a` | Panel and sidebar backgrounds |
| `studio-surface` | `#1a1a2e` | Elevated surface elements |
| `studio-border` | `#2a2a3e` | Borders and dividers |
| `studio-hover` | `#2a2a4e` | Hover state backgrounds |
| `studio-text` | `#e0e0e8` | Primary text color |
| `studio-muted` | `#6b6b80` | Muted/disabled text |
| `studio-secondary` | `#9090a8` | Secondary text |
| `studio-cyan` | `#00d4ff` | Accent color (links, active states) |
| `studio-green` | `#00ff88` | Success states, positive indicators |

#### Extended Color Palette

| Token | Usage |
|---|---|
| `info` | Informational badges and alerts |
| `success` | Success states and confirmations |
| `danger` | Error states and destructive actions |
| `warning` | Warning indicators |
| `pink` | Special highlights |
| `teal` | Secondary accent |
| `indigo` | Tertiary accent |
| `lime` | Positive metrics |
| `rose` | Critical alerts |
| `sky` | Informational highlights |
| `amber` | Caution indicators |
| `emerald` | Connected/online states |
| `violet` | Creative/AI features |
| `fuchsia` | Special features |

#### CSS Utility Classes

The global stylesheet (`index.css`) provides custom utility classes beyond Tailwind:

| Class | Description |
|---|---|
| `.glass-card` | Frosted glass effect with backdrop-blur |
| `.gradient-border` | Animated gradient border effect |
| `.text-gradient-cyan` | Cyan-to-blue gradient text |
| `.text-gradient-warm` | Orange-to-pink gradient text |
| `.glow-cyan` | Cyan box-shadow glow effect |
| `.glow-green` | Green box-shadow glow effect |
| `.glow-purple` | Purple box-shadow glow effect |
| `.glow-red` | Red box-shadow glow effect |
| `.skeleton` | Shimmer loading placeholder animation |
| `.pulse-ring` | Animated border pulse for active states |
| `.provider-badge` | AI provider indicator badge |
| `.model-selector` | AI model dropdown styling |
| `.ai-panel` | AI feature panel layout |
| `.ai-streaming` | Streaming response indicator |
| `.token-bar` | Token usage progress bar |
| `.truncate-2` | 2-line text truncation with ellipsis |
| `.truncate-3` | 3-line text truncation with ellipsis |

#### Animation Keyframes

| Animation | Duration | Description |
|---|---|---|
| `fade-in` | 300ms | Opacity 0 to 1 |
| `scale-in` | 300ms | Scale from 0.9 to 1 with fade |
| `slide-in` | 400ms | Slide from below with fade |
| `bounce-in` | 500ms | Bounce scale effect |
| `spin-slow` | 3s | Slow continuous rotation |
| `typing` | 1s | Typing cursor blink |
| `float` | 3s | Gentle floating up/down |
| `shake` | 300ms | Horizontal shake |
| `wiggle` | 400ms | Rotation wiggle |
| `gradient-shift` | 4s | Background gradient animation |
| `expand` | 300ms | Height 0 to auto |
| `collapse` | 300ms | Height auto to 0 |
| `pop` | 200ms | Quick scale pop |

### Shared Hooks Library

The `src/utils/hooks.ts` module provides reusable React hooks used across programs:

| Hook | Description |
|---|---|
| `useLocalStorage(key, initial)` | Persist state to localStorage with validation |
| `useDebounce(value, delay)` | Debounce a rapidly changing value |
| `useInterval(callback, delay)` | Safe interval with automatic cleanup |
| `useTimeout(callback, delay)` | Safe timeout with automatic cleanup |
| `useToggle(initial)` | Boolean toggle with on/off/toggle functions |
| `useClickOutside(ref, handler)` | Detect clicks outside a referenced element |
| `useKeyPress(key)` | Detect when a specific key is pressed |
| `useMediaQuery(query)` | Responsive media query matching |
| `usePrevious(value)` | Track the previous value of a variable |
| `useClipboard()` | Copy text to clipboard with status |
| `useDocumentTitle(title)` | Set the browser document title |
| `useCounter(initial)` | Increment/decrement/reset counter |
| `useWindowSize()` | Track window dimensions on resize |
| `useHover(ref)` | Track hover state on an element |
| `useAsync(asyncFn)` | Execute async functions with loading/error state |
| `useThrottle(value, limit)` | Throttle a rapidly changing value |
| `useScrollPosition()` | Track scroll position of the window |

### Shared Constants Library

The `src/utils/constants.ts` module centralizes all magic strings and numbers:

| Category | Examples |
|---|---|
| **APP Metadata** | Name, version, identifier, website, contact |
| **Program IDs** | `media-mogul`, `vibecode-worker`, `demo-recorder`, etc. |
| **Routes** | `/media-mogul`, `/vibecode-worker`, `/settings`, etc. |
| **localStorage Keys** | `cryptartist_favorites`, `cryptartist_theme`, etc. |
| **API Providers** | OpenAI, Anthropic, Google, OpenRouter, Custom |
| **AI Models** | 15 popular model IDs with display names |
| **Editor Defaults** | Font size, tab size, theme, word wrap, minimap |
| **Media Formats** | MP4, WebM, GIF, PNG, JPEG, WAV, MP3 |
| **Resolution Presets** | 720p, 1080p, 1440p, 4K with dimensions |
| **Keyboard Shortcuts** | All global and per-program shortcuts |
| **Accent Colors** | 12 selectable accent colors with hex values |
| **File Type Icons** | Emoji icons for 20+ file extensions |
| **Timing Constants** | Toast duration, debounce delay, auto-save interval |
| **Size Limits** | Max file size, max storage, max history entries |

### Development Statistics

CryptArtist Studio was built over 33 AI-assisted development sessions. Here is a
summary of the project's scope:

| Metric | Count |
|---|---|
| **Total Prompts** | 33+ |
| **Programs in Suite** | 8 |
| **Tauri Commands** | 30+ |
| **CLI Commands** | 20+ |
| **REST API Endpoints** | 18+ |
| **Commander Built-In Commands** | 40+ |
| **UI/UX Improvements** | 370+ |
| **Security Vulnerability Fixes** | 100 |
| **Security Helper Functions** | 30+ |
| **React Hooks (shared)** | 17 |
| **OpenRouter Models** | 15 popular (200+ available) |
| **Website Pages** | 9 |
| **Log Files** | 3 (session, recent, full history) |
| **Supported Languages (Editor)** | 20+ |
| **.CryptArt Optional Fields** | 30+ |
| **CSS Utility Classes** | 50+ |
| **Animation Keyframes** | 13 |
| **TailwindCSS Color Tokens** | 24+ |
| **Keyboard Shortcuts** | 16+ |
| **Frontend Source Files** | 35+ |
| **Rust Source Files** | 5 |
| **README Lines** | 2,800+ |

#### Technology Breakdown

| Language | Approximate Lines | Files |
|---|---|---|
| **TypeScript/TSX** | ~25,000 | ~35 |
| **Rust** | ~2,400 | 5 |
| **CSS** | ~3,000 | 2 |
| **HTML** | ~6,000 | 10 |
| **JavaScript** | ~1,500 | 3 |
| **JSON** | ~500 | 5 |
| **Markdown** | ~3,500 | 3 |
| **Total** | ~42,000 | ~63 |

---

## Getting Started

### Prerequisites

Before building CryptArtist Studio, ensure you have the following installed:

| Requirement | Version | Download |
|---|---|---|
| **Node.js** | 18.x or later | [nodejs.org](https://nodejs.org/) |
| **npm** | 9.x or later | Included with Node.js |
| **Rust** | 1.70 or later | [rustup.rs](https://rustup.rs/) |
| **Tauri CLI** | 2.x | `npm install -g @tauri-apps/cli` |

**Platform-specific requirements:**

- **Windows:** Microsoft Visual Studio C++ Build Tools, WebView2 (included in Windows 10/11)
- **macOS:** Xcode Command Line Tools (`xcode-select --install`)
- **Linux:** `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, `librsvg2-dev`, `patchelf`

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/mattyjacks/CryptArtistStudio.git
cd CryptArtistStudio

# 2. Install frontend dependencies
cd v1
npm install

# 3. Verify Rust toolchain
rustup update
cargo --version
```

### Development Mode

```bash
# Start the development server with hot reload
cd v1
npm run tauri dev
```

This command:
1. Starts the Vite dev server on `http://localhost:1420`
2. Compiles the Rust backend
3. Opens the Tauri application window
4. Enables hot module replacement for frontend changes

### Building for Production

```bash
# Build the optimized release binary
cd v1
npm run tauri build
```

The compiled application will be in:
- **Windows:** `v1/src-tauri/target/release/cryptartist-studio.exe`
- **macOS:** `v1/src-tauri/target/release/bundle/macos/CryptArtist Studio.app`
- **Linux:** `v1/src-tauri/target/release/bundle/appimage/cryptartist-studio.AppImage`

### Type Checking

```bash
# TypeScript type check (frontend)
cd v1
npx tsc --noEmit

# Rust check (backend)
cd v1/src-tauri
cargo check
```

### Platform Support

| Platform | Status | Notes |
|---|---|---|
| **Windows 10/11** | Supported | Primary development platform |
| **macOS 12+** | Supported | Intel and Apple Silicon |
| **Linux (Ubuntu 22+)** | Supported | AppImage and .deb bundles |
| **Android** | In Progress | Tauri mobile support |
| **iOS** | In Progress | Tauri mobile support |

---

## CLI Reference

CryptArtist Studio includes a full command-line interface powered by Clap. Every
feature available in the GUI can also be accessed from the terminal.

### Usage

```bash
# Run the GUI (default)
cryptartist-studio

# Run a CLI command
cryptartist-studio <command> [options]
```

### Global Commands

#### `new` - Create a new project

```bash
cryptartist-studio new --path ./my-project

# Creates a new project directory with default structure
```

| Flag | Description |
|---|---|
| `--path <PATH>` | Directory path for the new project |

#### `info` - Show project information

```bash
cryptartist-studio info --path ./my-project

# Displays project metadata, media files, timeline info
```

| Flag | Description |
|---|---|
| `--path <PATH>` | Path to the project directory |

### Project Management Commands

#### `cryptart create` - Create a .CryptArt file

```bash
cryptartist-studio cryptart create \
  --program vibecode-worker \
  --name "My Project" \
  --path ./project.CryptArt
```

| Flag | Description |
|---|---|
| `--program <ID>` | Program identifier (e.g., `media-mogul`, `vibecode-worker`) |
| `--name <NAME>` | Human-readable project name |
| `--path <PATH>` | Output file path |

The created file includes `$cryptart: 1`, `appVersion`, and a default `meta` object
with `website: "https://mattyjacks.com"`.

Unknown program IDs are allowed with a warning - the format is open and extensible.

#### `cryptart inspect` - Inspect a .CryptArt file

```bash
cryptartist-studio cryptart inspect --path ./project.CryptArt
```

Example output:

```
Format:     .CryptArt v1
Program:    vibecode-worker
App Ver:    0.1.0
Name:       My Project
Created:    2026-03-13T17:00:00.000Z
Updated:    2026-03-13T18:30:00.000Z
Website:    https://mattyjacks.com
Data keys:  ["rootPath", "openFiles", "activeFile"]
```

The inspect command handles both old (pre-v1) and new format files, displaying
all available fields including `meta`, `extensions`, and `history` when present.

### Media Commands

#### `add-media` - Add media to a project

```bash
cryptartist-studio add-media \
  --project ./project \
  --file ./video.mp4
```

| Flag | Description |
|---|---|
| `--project <PATH>` | Project directory |
| `--file <PATH>` | Media file to add |

#### `pexels` - Search Pexels for media

```bash
cryptartist-studio pexels --query "ocean sunset" --type photos --count 5
```

| Flag | Description |
|---|---|
| `--query <TEXT>` | Search query |
| `--type <TYPE>` | `photos` or `videos` |
| `--count <N>` | Number of results (default: 10) |

#### `export` - Export a project

```bash
cryptartist-studio export \
  --project ./project \
  --format mp4 \
  --output ./output.mp4
```

| Flag | Description |
|---|---|
| `--project <PATH>` | Project directory |
| `--format <FMT>` | Output format (mp4, webm, gif, png) |
| `--output <PATH>` | Output file path |

### AI Commands

#### `chat` - Send a message to the AI

```bash
cryptartist-studio chat --message "Write a Python script that sorts a list"
```

| Flag | Description |
|---|---|
| `--message <TEXT>` | Message to send to the AI |

### File System Commands

#### `read-file` - Read a file's contents

```bash
cryptartist-studio read-file --path ./src/App.tsx
```

#### `write-file` - Write content to a file

```bash
cryptartist-studio write-file --path ./output.txt --content "Hello, world!"
```

#### `ls` - List directory contents

```bash
cryptartist-studio ls --path ./src
```

### Server Commands

#### `serve` - Start the REST API server

```bash
cryptartist-studio serve --port 8080 --api-key my-secret-key
```

| Flag | Description |
|---|---|
| `--port <PORT>` | Port number (default: 8080) |
| `--api-key <KEY>` | Optional API key for authentication |

### System Commands

#### `sysinfo` - Display system information

```bash
cryptartist-studio sysinfo
```

Outputs: OS, architecture, FFmpeg status, Godot status, log paths, and version info.

#### `list-programs` - List available programs

```bash
cryptartist-studio list-programs
```

Outputs the five programs with their IDs, names, and descriptions.

---

## REST API Reference

CryptArtist Studio includes a built-in REST API server powered by `tiny_http`.
This enables integration with external tools, automation scripts, and AI agents.

### Starting the Server

```bash
# Start with default settings
cryptartist-studio serve

# Start with custom port and API key
cryptartist-studio serve --port 3000 --api-key my-secret-key
```

### Authentication

If an `--api-key` is specified, all requests must include the `X-API-Key` header:

```bash
curl -H "X-API-Key: my-secret-key" http://localhost:8080/health
```

Requests without a valid API key will receive a `401 Unauthorized` response.

### Endpoints

#### Health Check

```
GET /health
```

Returns `{"status": "ok"}` if the server is running.

#### AI Chat

```
POST /ai/chat
Content-Type: application/json

{
  "message": "Explain async/await in Rust"
}
```

Returns the AI response as a JSON object with a `reply` field.

#### File Operations

```
GET /files/read?path=/path/to/file.txt
```

Returns the file contents as plain text.

```
POST /files/write
Content-Type: application/json

{
  "path": "/path/to/file.txt",
  "content": "Hello, world!"
}
```

#### Directory Listing

```
GET /files/list?path=/path/to/directory
```

Returns a JSON array of directory entries with name, path, is_dir, and size.

#### Pexels Search

```
GET /pexels/search?query=ocean+sunset&type=photos&count=5
```

Returns Pexels API search results.

#### Project Management

```
POST /project/new
Content-Type: application/json

{
  "path": "/path/to/project"
}
```

```
GET /project/info?path=/path/to/project
```

#### System Information

```
GET /sysinfo
```

Returns system information as JSON.

#### Export

```
POST /export
Content-Type: application/json

{
  "project": "/path/to/project",
  "format": "mp4",
  "output": "/path/to/output.mp4"
}
```

### CORS

All API responses include the following headers:

```
Access-Control-Allow-Origin: *
Content-Type: application/json
```

### Response Format

All endpoints return JSON responses. Error responses include a `message` field:

```json
{
  "error": "Not Found",
  "message": "The requested endpoint does not exist"
}
```

---

## Configuration

### API Keys

CryptArtist Studio supports multiple AI providers. API keys are stored securely
in the Rust backend state (never in frontend localStorage):

| Provider | Setting | Used By |
|---|---|---|
| **OpenAI** | Settings > API Keys > OpenAI Key | AI Chat, Image Generation, AI Studio |
| **Pexels** | Settings > API Keys > Pexels Key | Media Browser, Pexels Search |
| **Anthropic** | VibeCodeWorker Settings | VCW AI Assistant |
| **Google** | VibeCodeWorker Settings | VCW AI Assistant |
| **Custom** | VibeCodeWorker Settings | Any OpenAI-compatible endpoint |

#### Setting Keys via CLI

```bash
# Set OpenAI key (stored in app state)
cryptartist-studio serve --api-key my-key
```

#### Setting Keys via REST API

```bash
curl -X POST http://localhost:8080/settings/api-key \
  -H "Content-Type: application/json" \
  -d '{"key": "sk-..."}'
```

### FFmpeg Setup

FFmpeg is required for video/audio processing in Media Mogul. On first launch,
CryptArtist Studio will:

1. Detect the user's OS and architecture
2. Download the appropriate FFmpeg and FFprobe binaries
3. Verify SHA-256 checksums
4. Store binaries in the local AppData directory:
   - **Windows:** `%LOCALAPPDATA%\CryptArtist Studio\ffmpeg\`
   - **macOS:** `~/Library/Application Support/CryptArtist Studio/ffmpeg/`
   - **Linux:** `~/.local/share/CryptArtist Studio/ffmpeg/`

If FFmpeg is already installed system-wide, CryptArtist Studio will detect and
use it automatically.

### Godot Integration

GameStudio requires the Godot Engine. CryptArtist Studio can:

1. **Auto-detect** an existing Godot installation
2. **Download** Godot automatically (similar to FFmpeg setup)
3. **Launch** Godot with project files from within the app

Configure the Godot path in Settings or let the auto-detection handle it.

### Tauri Configuration

The Tauri configuration lives in `v1/src-tauri/tauri.conf.json`:

```json
{
  "productName": "CryptArtist Studio",
  "version": "0.1.0",
  "identifier": "com.cryptartist.studio",
  "app": {
    "windows": [{
      "title": "CryptArtist Studio",
      "width": 1440,
      "height": 900,
      "minWidth": 360,
      "minHeight": 480
    }]
  },
  "bundle": {
    "fileAssociations": [{
      "ext": ["CryptArt"],
      "mimeType": "application/x-cryptartist-art",
      "description": "CryptArtist Art"
    }]
  }
}
```

---

## Logging System

CryptArtist Studio includes a comprehensive logging system that captures events
from the Rust backend, Tauri commands, REST API, CLI, and frontend.

### Log Files

Three log files are maintained simultaneously:

| File | Description | Location |
|---|---|---|
| `cryptartist-session.txt` | Last 100 lines since current run | `{AppData}/CryptArtist Studio/logs/` |
| `cryptartist-recent.txt` | Rolling last 1,000 lines | `{AppData}/CryptArtist Studio/logs/` |
| `cryptartist-full-history.txt` | Append-only full history | `{AppData}/CryptArtist Studio/logs/` |

**AppData locations by platform:**
- **Windows:** `%LOCALAPPDATA%\CryptArtist Studio\logs\`
- **macOS:** `~/Library/Application Support/CryptArtist Studio/logs\`
- **Linux:** `~/.local/share/CryptArtist Studio/logs/`

### Log Levels

| Level | Prefix | Description |
|---|---|---|
| **Debug** | `[DEBUG]` | Verbose diagnostic information |
| **Info** | `[INFO]` | General operational events |
| **Warn** | `[WARN]` | Potential issues that don't prevent operation |
| **Error** | `[ERROR]` | Errors that need attention |
| **Command** | `[CMD]` | Tauri command invocations |
| **CLI** | `[CLI]` | CLI command executions |
| **API** | `[API]` | REST API request/response cycle |
| **Frontend** | `[FE]` | Frontend events forwarded from TypeScript |

### Log Format

Each log line follows this format:

```
2026-03-13T17:05:23.456Z [INFO] [source] message
```

### Frontend Logging

The frontend logging system (`src/utils/logger.ts`) automatically captures:

- All `console.error()` and `console.warn()` calls
- Unhandled JavaScript errors
- Unhandled promise rejections
- Program launches and navigation events
- Keyboard shortcut activations
- User actions (terms acceptance, settings changes, etc.)

Frontend logs are forwarded to the Rust backend via the `log_from_frontend`
Tauri command and written to the same three log files.

### Reading Logs via Tauri Commands

```typescript
// Get the last 100 lines (session log)
const session = await invoke<string[]>("get_log_session");

// Get the last 1,000 lines (recent log)
const recent = await invoke<string[]>("get_log_recent");

// Get the file paths of all log files
const paths = await invoke("get_log_paths");
```

---

## Keyboard Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| `Ctrl+S` / `Cmd+S` | Save current file | VibeCodeWorker, GameStudio |
| `Ctrl+O` / `Cmd+O` | Open file/folder | All programs |
| `Ctrl+N` / `Cmd+N` | New project | All programs |
| `Ctrl+Z` / `Cmd+Z` | Undo | Editor, Timeline |
| `Ctrl+Shift+Z` / `Cmd+Shift+Z` | Redo | Editor, Timeline |
| `Ctrl+F` / `Cmd+F` | Find in file | VibeCodeWorker |
| `Ctrl+Shift+F` / `Cmd+Shift+F` | Find in project | VibeCodeWorker |
| `Ctrl+P` / `Cmd+P` | Quick file open | VibeCodeWorker |
| `Space` | Play/Pause | Media Mogul, DemoRecorder |
| `Escape` | Back to Suite Launcher | All programs |

Keyboard shortcuts are logged automatically for debugging and analytics purposes.

#### Additional Keyboard Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| `1` - `8` | Quick-launch program by number | Suite Launcher |
| `?` | Show keyboard shortcuts overlay | Suite Launcher |
| `R` | Show recent projects panel | Suite Launcher |
| `Ctrl+Shift+P` / `Cmd+Shift+P` | Command palette | VibeCodeWorker |
| `Tab` | Autocomplete command | CryptArt Commander |
| `Up Arrow` / `Down Arrow` | Navigate command history | CryptArt Commander |

---

## OpenRouter Multi-Model AI Integration

CryptArtist Studio integrates with [OpenRouter](https://openrouter.ai/) to provide
access to 200+ AI models from multiple providers through a single API key. OpenRouter
is deeply integrated into every program that uses AI.

### Supported Providers

| Provider | Models Available | Example Model IDs |
|---|---|---|
| **OpenAI** | GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1 | `openai/gpt-4o`, `openai/gpt-4o-mini` |
| **Anthropic** | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku | `anthropic/claude-3.5-sonnet`, `anthropic/claude-3-opus` |
| **Google** | Gemini Pro 1.5, Gemini Flash 1.5 | `google/gemini-pro-1.5`, `google/gemini-flash-1.5` |
| **Meta** | Llama 3.1 405B, Llama 3.1 70B | `meta-llama/llama-3.1-405b-instruct` |
| **Mistral** | Mixtral 8x22B, Mistral Large | `mistralai/mixtral-8x22b-instruct` |
| **Perplexity** | Llama 3.1 Sonar 70B | `perplexity/llama-3.1-sonar-huge-128k-online` |

### Model Selection

The default model is stored in localStorage and can be changed from:

- **Settings** > OpenRouter section (global default)
- **ValleyNet** config toolbar (per-session override)
- **VibeCodeWorker** AI settings panel
- **GameStudio** AI Generator panel header
- **DemoRecorder** AI Tools panel header
- **CryptArt Commander** via `or models` command

### Fallback Behavior

The shared OpenRouter utility (`src/utils/openrouter.ts`) implements a two-tier
fallback strategy:

```
1. Try OpenRouter first (if key is configured)
   - Send request to https://openrouter.ai/api/v1/chat/completions
   - Include HTTP-Referer and X-Title headers for ranking
2. If OpenRouter fails or is not configured:
   - Fall back to direct OpenAI API (if OpenAI key is configured)
3. If both fail:
   - Return error to the user
```

### Rust Backend Integration

The Rust backend exposes these OpenRouter commands:

| Command | Description |
|---|---|
| `save_openrouter_key` | Store the OpenRouter API key |
| `get_openrouter_key` | Retrieve the stored key |
| `openrouter_chat` | Send a chat completion request to OpenRouter |
| `openrouter_list_models` | List available models from OpenRouter |

The `openrouter_chat` command includes:
- Model ID validation (must match `provider/model-name` format)
- Bearer token authentication
- HTTP-Referer header set to `https://mattyjacks.com`
- X-Title header set to `CryptArtist Studio`
- 30-second request timeout
- Response size limiting

### Frontend Utility Module

The `src/utils/openrouter.ts` module provides:

```typescript
chatWithAI(prompt, options?)    // OpenRouter-first with OpenAI fallback
listModels()                    // List available models
isOpenRouterConfigured()        // Check if key is set
isOpenAIConfigured()            // Check if OpenAI key is set
getAIStatus()                   // Get full AI readiness status
getDefaultModel()               // Get stored default model
setDefaultModel(model)          // Set default model (validated)
```

---

## Security Hardening

CryptArtist Studio has undergone comprehensive security hardening with 100 vulnerability
fixes across the Rust backend and TypeScript frontend. The fixes are organized into
four batches covering all major vulnerability categories.

### Overview of 100 Vulnerability Fixes

#### BATCH A (Vulns 1-25): Rust Backend

| # | Category | Fix Description |
|---|---|---|
| 1-3 | **API Key Validation** | Max 512 chars, printable ASCII only, reject empty keys |
| 4-5 | **URL Validation** | Trusted domain whitelist, HTTPS enforcement for external calls |
| 6-7 | **Prompt Validation** | Max 32,000 chars, UTF-8 validation |
| 8-9 | **File Size Limits** | 50 MB read limit, 100 MB write limit |
| 10-11 | **Search Validation** | Search type enum validation, query length limits |
| 12-13 | **HTTP Timeouts** | 30-second timeout on all outbound HTTP requests |
| 14-15 | **Path Sanitization** | Extended sanitization for Godot project paths |
| 16-17 | **Template Validation** | Godot template parameters sanitized |
| 18-19 | **Log Limits** | Log message truncated to 2,000 chars, level validated |
| 20-21 | **Import Limits** | Key import JSON limited to 10 MB |
| 22-24 | **REST API CORS** | OPTIONS preflight handler, Content-Type validation |
| 25 | **Security Headers** | X-Content-Type-Options, X-Frame-Options on all responses |

#### BATCH B (Vulns 26-50): Frontend XSS, Sanitization, CSP

| # | Category | Fix Description |
|---|---|---|
| 26-27 | **CSP** | Content Security Policy meta tag in index.html |
| 28-29 | **localStorage** | Key format validation, value size limits (5 MB) |
| 30-31 | **Preferences** | Schema validation for theme, fontSize, autoSave, etc. |
| 32-33 | **Recent Projects** | Path and name sanitization, character limits |
| 34-36 | **Command Input** | Length limits, file path sanitization |
| 37-39 | **Toast System** | Rate limiting, message truncation, queue size limits |
| 40-41 | **Model Validation** | Model ID format validation (`provider/model`) |
| 42-44 | **URL Validation** | Trusted domain whitelist in frontend |
| 45-47 | **Search Sanitization** | Search query length limits, character filtering |
| 48-50 | **Prototype Pollution** | `sanitizeObjectKeys()` on parsed JSON, ISO date validation |

#### BATCH C (Vulns 51-75): Memory Leaks, Race Conditions, Resource Limits

| # | Category | Fix Description |
|---|---|---|
| 51-53 | **Timeout Cleanup** | Track all `setTimeout`/`setInterval`, clean up on unmount |
| 52-54 | **Peer Limits** | Max 50 peer connections in Donate Computer |
| 55-57 | **Log Limits** | Max 200 log entries in activity logs |
| 58-60 | **History Limits** | Max 200 display entries, 500 command history entries |
| 61-63 | **Input Limits** | Max 10,000 char command input, 50,000 char scripts |
| 64-66 | **Double-Click** | `preventDoubleClick()` guard on destructive actions |
| 67-69 | **Script Limits** | Max script content size, env var count limits |
| 70-72 | **Alias Limits** | Max 50 command aliases |
| 73-75 | **Search Limits** | Search query sanitization in Suite Launcher |

#### BATCH D (Vulns 76-100): Hardening, Crypto, Audit Logging

| # | Category | Fix Description |
|---|---|---|
| 76-78 | **Security Headers** | X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| 79-81 | **Referrer Policy** | `strict-origin-when-cross-origin` meta tag |
| 82-84 | **Cache Control** | `no-store` for sensitive API responses |
| 85-87 | **Secure Random** | `crypto.getRandomValues()` for all IDs and tokens |
| 88-90 | **Audit Logger** | `logSecurityEvent()` for all security-relevant events |
| 91-93 | **Safe JSON** | `safeJsonStringify()` with circular reference handling |
| 94-96 | **File Extensions** | Allowlist validation for uploaded/opened files |
| 97-98 | **Suspicious Paths** | Warning on paths containing `..`, `~`, or null bytes |
| 99-100 | **UTF-8 Validation** | Input string validation before processing |

### Security Utility Module

The `src/utils/security.ts` module provides 30+ security helper functions:

#### Sanitization Functions

| Function | Description |
|---|---|
| `sanitizeHtml(input)` | Strip all HTML tags from a string |
| `sanitizeFilePath(path)` | Remove path traversal sequences and dangerous characters |
| `sanitizeSearchQuery(query, maxLen)` | Limit length, strip control characters |
| `sanitizeWorkspaceName(name)` | Alphanumeric + spaces/hyphens only, max 100 chars |
| `sanitizeObjectKeys(obj)` | Remove `__proto__`, `constructor`, `prototype` keys |
| `truncateToastMessage(msg)` | Truncate to 500 chars for toast display |

#### Validation Functions

| Function | Description |
|---|---|
| `validateUrl(url)` | Check against trusted domain whitelist |
| `validateApiKey(key)` | Max 512 chars, printable ASCII, non-empty |
| `validateModelId(model)` | Must match `provider/model-name` pattern |
| `validateStorageKey(key)` | Alphanumeric + underscores/hyphens/dots only |
| `validateStorageValue(value)` | Max 5 MB string length |
| `isValidISODate(dateStr)` | ISO-8601 format check |
| `validateFileExtension(filename, allowed)` | Extension allowlist check |
| `isSuspiciousPath(path)` | Detect `..`, `~`, null bytes |
| `isValidUtf8(str)` | Check for null bytes and control characters |

#### Rate Limiting and Throttling

| Function | Description |
|---|---|
| `shouldThrottleToast()` | Rate limit toasts to 1 per 500ms |
| `createApiRateLimiter(interval)` | Create a rate limiter for API calls |
| `preventDoubleClick(id, cooldown)` | Prevent duplicate button clicks |
| `createDebouncedValue(delay)` | Debounce rapidly changing values |

#### Security Utilities

| Function | Description |
|---|---|
| `secureRandomHex(bytes)` | Cryptographically secure hex string |
| `maskApiKey(key)` | Show first 8 chars, mask the rest with asterisks |
| `hashForLog(sensitive)` | SHA-256 hash for safe logging of sensitive data |
| `safeJsonStringify(obj, indent)` | JSON stringify with circular reference handling |
| `createAbortableRequest(timeout)` | AbortController with automatic timeout |
| `logSecurityEvent(source, severity, message, detail?)` | Audit log entry |
| `runSecurityAudit()` | Run all security checks and return a report |

### Content Security Policy

The frontend `index.html` includes a strict Content Security Policy:

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
connect-src 'self' https://openrouter.ai https://api.openai.com
            https://api.pexels.com https://ipc.localhost
            http://ipc.localhost tauri:;
img-src 'self' data: blob: https:;
media-src 'self' blob: data:;
object-src 'none';
base-uri 'self';
form-action 'self';
```

This policy:
- Blocks all external scripts and inline `eval()`
- Restricts network connections to known API endpoints and Tauri IPC
- Prevents object/embed injection
- Limits form submissions to same-origin
- Allows images from any HTTPS source (for Pexels integration)

### REST API Security Headers

All REST API responses include these security headers:

| Header | Value | Purpose |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Enable XSS filter |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer info |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restrict APIs |
| `Cache-Control` | `no-store` | Prevent caching of sensitive data |
| `Access-Control-Allow-Origin` | `*` | CORS support |
| `Content-Type` | `application/json` | Explicit content type |

### Input Validation Summary

| Input | Max Length | Validation |
|---|---|---|
| API keys | 512 chars | Printable ASCII only |
| Prompts | 32,000 chars | UTF-8, non-empty |
| File reads | 50 MB | Size check before read |
| File writes | 100 MB | Size check before write |
| Request bodies | 10 MB | Size check before parse |
| Search queries | 200 chars | Alphanumeric + basic punctuation |
| Model IDs | 200 chars | `provider/model-name` format |
| Log messages | 2,000 chars | Truncated on write |
| Storage keys | 200 chars | Alphanumeric + underscores |
| Storage values | 5 MB | Size check before write |
| Command input | 10,000 chars | Length check |
| Toast messages | 500 chars | Truncated on display |
| Workspace names | 100 chars | Alphanumeric + spaces/hyphens |
| Recent project names | 256 chars | HTML-unsafe chars stripped |

---

## CryptArtist Studio Website

CryptArtist Studio has a companion marketing website located in the `website/A1/`
directory. The website is a static HTML/CSS/JS site designed for deployment on
Cloudflare Pages or any static hosting provider.

### Website Pages

| Page | File | Description |
|---|---|---|
| **Home** | `index.html` | Landing page with hero, program cards, features, tech stack, CTA |
| **Programs** | `programs.html` | Detailed breakdown of all programs with feature lists |
| **About** | `about.html` | Philosophy, development timeline, tech stack tables |
| **Documentation** | `docs.html` | .CryptArt format spec, CLI reference, REST API, FAQ |
| **Download** | `download.html` | Platform download cards, build-from-source guide |
| **Contact** | `contact.html` | Contact form, email, social links |
| **Privacy** | `privacy.html` | Full privacy policy (NH law compliant) |
| **Terms** | `terms.html` | Full terms of use (NH law compliant) |
| **Donate Computer** | `donate-computer.html` | P2P resource sharing page with live demo |

### Website Technology

| Technology | Purpose |
|---|---|
| **HTML5** | Semantic markup with ARIA roles |
| **CSS3** | Custom properties, grid, flexbox, animations |
| **Vanilla JavaScript** | Navigation, scroll animations, accordions, counters |
| **Google Fonts** | Inter font family |
| **Responsive Design** | Mobile-first with breakpoints at 768px, 1024px, 1200px |

The website uses a dark theme consistent with the desktop application, featuring:
- CSS custom properties for color tokens
- Gradient text effects and glow animations
- Intersection Observer for scroll-triggered animations
- Accordion components for FAQ sections
- Counter animations for statistics
- Mobile hamburger menu with smooth transitions

### Donate Computer Web API

The website includes a standalone P2P resource sharing API (`donate-computer-api.js`)
that can be used independently of the desktop application:

```javascript
const api = new DonateComputerAPI({ password: "my-password" });

// Start donating resources
api.startDonating({ cpuPercent: 80, ramPercent: 50, gpuPercent: 90 });

// Or start borrowing resources
api.startBorrowing();

// Submit a task to the network
api.submitTask({ type: "ai-inference", payload: { prompt: "..." } });

// Listen for events
api.on("peer-connected", (peer) => console.log("New peer:", peer));
api.on("task-completed", (result) => console.log("Result:", result));
```

---

## Privacy Policy and Terms of Use

CryptArtist Studio includes a built-in Privacy Policy and Terms of Use, fully
compliant with New Hampshire, USA law.

### Terms Acceptance

On first launch (and after clearing local storage), users must accept the Terms
of Use and Privacy Policy before using the application. The acceptance modal
includes links to the full policy pages.

### Privacy Highlights

- **No data collection without consent** - CryptArtist Studio does not phone home.
- **API keys are stored locally** - Keys never leave the user's machine except
  when making API calls to the configured providers.
- **Log files are local only** - All logging is to local files only.
- **No telemetry** - No usage tracking, no analytics beacons.
- **Open source** - The full source code is available for audit.

### Third-Party Services

CryptArtist Studio integrates with these third-party services (only when the user
opts in by providing API keys):

| Service | Purpose | Data Sent |
|---|---|---|
| **OpenAI API** | AI chat, image generation, TTS | User prompts, code context |
| **Pexels API** | Stock photo/video search | Search queries |
| **GiveGigs.com** | Media asset library | Supabase auth credentials |
| **Cloudflare** | Website hosting (mattyjacks.com) | Standard web requests |
| **Cloudflare Turnstile** | Bot protection | Browser fingerprint |

### Contact

- **Email:** [Matt@MattyJacks.com](mailto:Matt@MattyJacks.com)
- **Contact Page:** [MattyJacks.com/Contact](https://mattyjacks.com/Contact)

### Legal Pages

The full Privacy Policy and Terms of Use are accessible within the application
at `/privacy` and `/terms` respectively, and are also available at:

- [mattyjacks.com/privacy](https://mattyjacks.com/privacy)
- [mattyjacks.com/terms](https://mattyjacks.com/terms)

---

## Contributing

CryptArtist Studio is open source and welcomes contributions from anyone. Whether
you are fixing a typo, adding a feature, or suggesting an improvement, your help
is valued.

### Development Workflow

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/CryptArtistStudio.git
   ```
3. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/my-new-feature
   ```
4. **Make your changes** and test them:
   ```bash
   cd v1
   npx tsc --noEmit          # TypeScript check
   cd src-tauri && cargo check # Rust check
   ```
5. **Commit** with a descriptive message:
   ```bash
   git commit -m "Add: description of your change"
   ```
6. **Push** to your fork and open a **Pull Request** against `main`.

### Code Style

#### TypeScript / React

- Use functional components with hooks (no class components).
- Use TypeScript strict mode - avoid `any` types.
- Follow the existing TailwindCSS dark theme tokens (`studio-bg`, `studio-panel`,
  `studio-text`, `studio-border`, `studio-hover`, `studio-muted`, `studio-secondary`,
  `studio-cyan`, `studio-green`).
- Keep components self-contained - each program is a single file or small folder.
- Use `invoke()` for all backend communication, never direct HTTP from frontend.
- Do not add comments or documentation unless specifically relevant.

#### Rust

- Follow standard Rust formatting (`cargo fmt`).
- Use `Result<T, String>` for Tauri command return types.
- Use `Mutex` for shared state access.
- Log all significant operations using the logger module.
- Keep CLI commands headless - no GUI dependencies.

#### General

- Never remove existing functionality without explicit permission.
- Maintain backward compatibility for the `.CryptArt` file format.
- Keep the three required `.CryptArt` fields (`$cryptart`, `program`, `data`) sacred.
- Test on Windows at minimum; cross-platform testing is appreciated.
- Do not use em dashes or en dashes in code - use hyphens instead.

### Pull Requests

When submitting a pull request:

1. **Describe what you changed** and why.
2. **Reference any related issues** using `#issue-number`.
3. **Confirm builds pass** - both `tsc --noEmit` and `cargo check`.
4. **Keep changes focused** - one feature or fix per PR.
5. **Screenshots welcome** for UI changes.

### Reporting Issues

Open an issue on GitHub with:

- **Steps to reproduce** the problem
- **Expected behavior** vs. actual behavior
- **Platform and version** information
- **Screenshots or logs** if applicable

### Feature Requests

Feature requests are welcome! Please open an issue with the tag `enhancement` and
describe:

- What the feature does
- Why it would be useful
- How it might be implemented (optional)

---

## Troubleshooting

### Common Issues

#### Application Won't Start

| Symptom | Cause | Solution |
|---|---|---|
| White screen on launch | WebView2 not installed | Install WebView2 Runtime from Microsoft |
| Crash on startup (Windows) | Missing VC++ redistributable | Install Visual C++ Redistributable 2022 |
| Crash on startup (Linux) | Missing webkit2gtk | `sudo apt install libwebkit2gtk-4.1-dev` |
| "Port already in use" | REST API server conflict | Change the port with `--port` flag |
| Blank window (macOS) | Gatekeeper blocking | Right-click > Open, or allow in System Settings |

#### FFmpeg Issues

| Symptom | Cause | Solution |
|---|---|---|
| "FFmpeg not found" | Not installed | Click "Install FFmpeg" in Media Mogul or Settings |
| Download fails | Network/firewall blocking | Download manually from ffmpeg.org and place in AppData |
| Checksum mismatch | Corrupted download | Delete the ffmpeg directory and re-download |
| Encoding fails | Outdated FFmpeg | Update to the latest version |

#### API Key Issues

| Symptom | Cause | Solution |
|---|---|---|
| "No API key configured" | Key not set | Go to Settings > API Keys and enter your key |
| "Invalid API key" | Incorrect key format | Check that the key starts with `sk-` (OpenAI) |
| "Rate limited" | Too many requests | Wait a moment and try again, or upgrade your API plan |
| OpenRouter fails | Key not configured | Set the OpenRouter key in Settings > OpenRouter |
| Fallback not working | Neither key set | Configure at least one of OpenAI or OpenRouter |

#### Godot Issues

| Symptom | Cause | Solution |
|---|---|---|
| "Godot not detected" | Not installed | Install from godotengine.org or use auto-download |
| "Invalid Godot path" | Wrong version | CryptArtist Studio requires Godot 4.x |
| Project creation fails | Invalid path characters | Use only alphanumeric characters in project names |
| Export fails | Missing export templates | Install Godot export templates for your target platform |

#### Build Issues

| Symptom | Cause | Solution |
|---|---|---|
| `tsc` errors | Type errors | Run `npx tsc --noEmit` and fix reported errors |
| `cargo check` errors | Rust compilation errors | Check Rust version (`rustup update`) |
| Vite build fails | Dependency issues | Delete `node_modules` and run `npm install` |
| Tauri build fails | Missing platform deps | Install platform-specific prerequisites (see Getting Started) |

### Debug Mode

Enable verbose logging by checking the log files:

```bash
# Windows
type "%LOCALAPPDATA%\CryptArtist Studio\logs\cryptartist-session.txt"

# macOS
cat ~/Library/Application\ Support/CryptArtist\ Studio/logs/cryptartist-session.txt

# Linux
cat ~/.local/share/CryptArtist\ Studio/logs/cryptartist-session.txt
```

Use CryptArt Commander to check system status:

```
health          # Application health check
sysinfo         # Full system information
keys status     # API key configuration
ffmpeg status   # FFmpeg installation
godot detect    # Godot detection
```

### Getting Help

1. Check the [FAQ](#faq) section below
2. Search [GitHub Issues](https://github.com/mattyjacks/CryptArtistStudio/issues)
3. Open a new issue with reproduction steps
4. Email [Matt@MattyJacks.com](mailto:Matt@MattyJacks.com)

---

## Performance Optimization

### Frontend Performance

CryptArtist Studio is designed for smooth performance even on lower-end hardware:

| Optimization | Implementation |
|---|---|
| **React.memo** | Heavy components are memoized to prevent unnecessary re-renders |
| **useCallback/useMemo** | Expensive computations and callbacks are memoized |
| **Lazy Loading** | Programs are loaded on-demand when navigated to |
| **Debouncing** | Search, resize, and input handlers are debounced |
| **Virtual Scrolling** | Long lists (command history, logs) use windowed rendering |
| **CSS Containment** | Layout-heavy components use CSS `contain` property |
| **Reduced Motion** | Animations respect `prefers-reduced-motion` media query |
| **Font Preloading** | Google Fonts are preconnected for faster loading |

### Backend Performance

| Optimization | Implementation |
|---|---|
| **Async I/O** | All file and network operations use Tokio async runtime |
| **Connection Pooling** | HTTP client reuses connections via `reqwest::Client` |
| **Request Timeouts** | All outbound requests have 30-second timeouts |
| **Streaming Responses** | Large responses are streamed rather than buffered |
| **Thread-Safe State** | `Mutex`-protected state with minimal lock contention |
| **Lazy Initialization** | FFmpeg, Godot, and log paths are resolved on first use |

### Memory Management

| Strategy | Implementation |
|---|---|
| **Log Rotation** | Session log capped at 100 lines, recent at 1,000 |
| **History Limits** | Command history: 500 entries, display: 200 entries |
| **Toast Queue** | Maximum 10 concurrent toast notifications |
| **Peer Limits** | Maximum 50 P2P connections in Donate Computer |
| **Activity Logs** | Maximum 200 log entries per component |
| **Timeout Cleanup** | All `setTimeout`/`setInterval` cleaned up on unmount |
| **Storage Limits** | localStorage values capped at 5 MB each |

### Recommended System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| **CPU** | Dual-core 2.0 GHz | Quad-core 3.0 GHz+ |
| **RAM** | 4 GB | 8 GB+ |
| **Storage** | 200 MB (app + FFmpeg) | 1 GB+ (with media files) |
| **Display** | 1280x720 | 1920x1080+ |
| **GPU** | Not required | WebGL-capable for Donate Computer GPU detection |
| **Network** | Optional | Required for AI features and Pexels integration |

---

## Prompt History

CryptArtist Studio was built through a series of AI-assisted development sessions.
Below is the complete history of every prompt used to develop the application. The
full text of each prompt is preserved in `prompts/all-prompts.md`.

This history serves as both documentation and a case study in AI-assisted
("vibe coding") software development.

### Prompt 0 - Initial Project Setup

> In a new folder /v1/ make the following program: CryptArtist Studio.
> It is also integrated with OpenAI API and the user can enter their own API keys.
> Come up with cool features on your own.

**Result:** Created the initial Tauri + React + TypeScript project with the full
technology stack, FFmpeg auto-installer, OpenAI integration, and the foundational
architecture.

### Prompt 1 - Security and Branding

> Run npm audit on the packages and fix all vulnerabilities. "skull+art" is the logo
> of cryptartist.com. Also let people create images using the OpenAI API.

**Result:** Fixed npm vulnerabilities, established branding, added image generation.

### Prompt 2 - Initial Fixes

> Fix everything!

**Result:** Resolved initial bugs and integration issues.

### Prompt 3 - Naming Fix

> Don't call it Fusion Editor, that may be copyrighted, call it Node Mode.

**Result:** Renamed the node-based editor from "Fusion Editor" to "Node Mode" to
avoid trademark issues.

### Prompt 4 - Build Instructions

> Now how do I run it as an .exe or something?

**Result:** Added build instructions and packaging configuration.

### Prompt 5 - Running the App

> Run it for me.

**Result:** Started the development server and verified the app runs.

### Prompt 6 - Compilation

> Done. Compile it now.

**Result:** Compiled the application for distribution.

### Prompt 7 - Final Build

> Run npm run tauri build one last time!

**Result:** Created the final production build.

### Prompt 8 - UI/UX Debugging

> None of it works! I can switch between the tabs but the buttons don't do anything.

**Result:** Fixed all non-functional UI buttons and integrated them with the backend.

### Prompt 9 - Feature Integration

> Integrate every single upcoming feature. Now.

**Result:** Connected all planned features to working implementations.

### Prompt 10 - CLI and AI Integration

> Make it be able to be commanded and for projects to be edited through the command
> line, for integration with AI tools like Antigravity for helping test it.

**Result:** Added the full CLI powered by Clap with commands for project management,
file operations, AI chat, and system information.

### Prompt 11 - Pexels Integration

> Let the user browse pexels.com for images and videos, and add them to the project
> automatically, with support for multiple file sizes for videos at the same time.

**Result:** Added Pexels API integration with search, browse, and import functionality
in the Media Browser component.

### Prompt 12 - AI Studio Mode

> Now make an AI studio mode where the user can generate a video using prompts, and
> it will be automatically edited together from pexels.com videos, and put on the
> project. It can also have captions, and audio generated from OpenAI API.

**Result:** Created the AI Studio workspace with automated video generation pipeline:
script writing, Pexels footage selection, voiceover generation, caption creation,
and auto-editing.

### Prompt 13 - Git Cleanup

> Add the node modules to .gitignore.

**Result:** Added `node_modules/` to `.gitignore`.

### Prompt 14 - Prompt Documentation

> Add every single prompt I gave you to prompts/all-prompts.md starting before the
> prompts already on there, also organize them properly.

**Result:** Created the `prompts/all-prompts.md` file with all historical prompts
organized chronologically.

### Prompt 15 - Prompt Builder

> Look in /v1/ and make me a 1,200 word prompt for using with Windsurf Claude Opus
> 4.6 Thinking model, and return the prompt as /prompts/bigprompt-2.md.

**Result:** Generated a comprehensive 1,200-word prompt document (`bigprompt-2.md`)
that described the full suite refactor plan including all five programs, the
`.CryptArt` file format, and implementation guidelines.

### Prompt 16 - Suite Refactor Execution

> (The bigprompt-2.md mega-prompt - executed in full)

**Result:** Transformed CryptArtist Studio from a single video editor into a full
suite of five programs with the Suite Launcher, React Router navigation, and all
program shells implemented:
- Media Mogul (renamed from main editor)
- VibeCodeWorker (new - Monaco-based IDE)
- DemoRecorder (new - screen recorder)
- ValleyNet (new - AI agent)
- `.CryptArt` file format with save/open

### Prompt 17 - Making It Work + Legal

> Make it all actually work, bro. It doesn't work yet. Also add a privacy policy and
> terms of use, fully complying with New Hampshire, USA, law.

**Result:** Fixed all broken functionality across all five programs. Added a complete
Privacy Policy and Terms of Use with first-launch acceptance modal. Integrated
legal compliance for New Hampshire, USA jurisdiction.

### Prompt 18 - Mobile, API, CLI, and 35+ Improvements

> Make it work on Android and iOS, too. Make it all work better. Make every single
> improvement you can, also make it all workable through an API or the Command Line.
> In addition to the improvements you're thinking of, add 35 more improvements.

**Result:** Added mobile platform support configuration, REST API server, enhanced
CLI, and 35+ improvements across all programs including: error boundaries, loading
spinners, toast notifications, debounce utilities, format helpers, platform
detection, local storage persistence, mobile navigation, and keyboard shortcuts.

### Prompt 19 - GameStudio

> Make CryptArtist Media Mogul able to be combined with CryptArtist VibeCodeWorker
> and also the latest version of Godot, to be able to make videogames automatically.

**Result:** Created GameStudio - a new program combining Media Mogul, VibeCodeWorker,
and Godot Engine integration for AI-powered game development. Added Godot auto-
detection, download, and launch capabilities to the Rust backend.

### Prompt 20 - Automatic Logging System

> Add automatic logging to every single thing, making a constant "last 1000 lines"
> log file, and also a constant "every line ever" log file, and a "last 100 lines
> since last run" as .txt files with better names.

**Result:** Implemented a comprehensive three-file logging system:
- `cryptartist-session.txt` (last 100 lines per session)
- `cryptartist-recent.txt` (rolling 1,000 lines)
- `cryptartist-full-history.txt` (append-only complete history)

Added Rust logger module, frontend logger utility, and integrated logging into
every Tauri command, REST API endpoint, CLI command, and frontend component.

### Prompt 21 - Future-Proof .CryptArt File Format

> Make the .JSON files better organized for .CryptArt files. Use best practices, and
> ensure maximum compatibility across all current, past, and future .CryptArt files.
> Make it so I never need to upgrade the base of the .CryptArt files so it can live
> forever.

**Result:** Redesigned the `.CryptArt` format with a permanent envelope schema:
- `$cryptart: 1` magic key for self-identification
- Open program IDs (any string, not a closed union)
- Optional rich metadata, extensions, and history
- Backward compatibility with all old files
- Forward compatibility via index signatures
- Updated both TypeScript and Rust implementations

### Prompt 22 - VibeCodeWorker Feature Complete + JSON Expansion

> Add more features to VibeCodeWorker, make it fully feature complete and include
> automatic program testing and website testing like Google Antigravity has. Add more
> fields to the JSON, including everything you can think of, but make it so that
> not-including-everything it still works.

**Result:** Added five new features to VibeCodeWorker:
- **Testing Panel** - AI-powered + pattern-based test runner with auto-test on save
- **Web Audit Panel** - Lighthouse-style website quality analysis with 4 scores
- **Problems Panel** - Auto-scanning lint diagnostics
- **Search Panel** - Cross-file search and replace with regex
- **Tabbed Bottom Panel** - Unified 5-tab bottom panel replacing terminal-only view

Expanded `.CryptArt` JSON with 30+ new optional fields covering identity, metadata,
project structure, integrity, compatibility, extensibility, and export/sharing.

### Prompt 23 - Comprehensive README + Prompt Archive

> Make a 2,000 line README.md in multiple steps, including everything possible about
> the program. The program is open source. Add every prompt so far, including this
> one, to prompts/all-prompts.md.

**Result:** The initial 2,000-line README covering all five original programs, the
`.CryptArt` file format, technology stack, project architecture, installation guide,
CLI reference, REST API reference, configuration, logging, keyboard shortcuts,
privacy policy, contributing guidelines, and the complete prompt history.

### Prompt 24 - 100 UI/UX Improvements (Wave 1)

> Implement 100 new improvements across the entire CryptArtist Studio suite.

**Result:** Added 100 improvements (1-100) across all programs:
- Global CSS: gradient text, glass cards, skeleton loading, badges, kbd styling, tags,
  animated borders, progress rings, code blocks, new animations
- Tailwind config: extended color palette, new animation keyframes
- SuiteLauncher: search/filter, keyboard shortcuts (1-7), version badges, last-opened
  indicator, staggered animation, system status, clock, enhanced footer
- App.tsx: loading splash screen, 404 route, document title per route, error boundary
- VibeCodeWorker: file type icons, breadcrumb nav, editor controls, close-all tabs,
  welcome tab, keyboard shortcut help, enhanced status bar
- MediaMogul: keyboard shortcut bar, project duration, workspace transitions, quick
  export, undo/redo buttons, zoom controls, aspect ratio, volume slider
- DemoRecorder: countdown timer, recording time limit, audio level meter, screenshot
  button, quality presets, file size estimate, webcam overlay, hotkey hints
- ValleyNet: agent autonomy level, clear chat, quick task templates, agent personality,
  export conversation, connection status, message timestamps
- GameStudio: game genre selector, scene count, build target selector, play test button,
  asset counter, GDScript snippet library

### Prompt 25 - CryptArtist Studio Website

> Make me a full website about CryptArtist Studio, including links and stuff.

**Result:** Created the companion website in `website/A1/` with 8 HTML pages:
- `index.html` - Landing page with hero, program cards, feature highlights, tech stack
- `programs.html` - Detailed program breakdowns with feature lists
- `about.html` - Philosophy, story timeline, tech stack tables
- `docs.html` - .CryptArt format spec, CLI reference, REST API reference
- `download.html` - Platform download cards, build-from-source guide
- `contact.html` - Contact info, form, related site links
- `privacy.html` - Full privacy policy (NH law compliant)
- `terms.html` - Full terms of use (NH law compliant)
- `style.css` - Complete dark theme with gradients, animations, responsive design
- `script.js` - Navigation, scroll animations, accordion, counter animations

### Prompt 26 - 100 UI/UX Improvements (Wave 2)

> Implement improvements 101-200 across the entire CryptArtist Studio suite.

**Result:** Added 100 more improvements (101-200):
- Global CSS: toast notifications, dropdown menus, avatar components, switch toggles,
  breadcrumbs, glow effects, hover lift, spotlight effect, context menus, scrollbars,
  resize handles, FAB, notification dots, accordion sections
- Tailwind config: 8 new semantic colors, extended spacing, z-index scale, glow shadows,
  new animations (float, shake, wiggle, gradient-shift, expand, collapse, pop)
- SuiteLauncher: favorites system, recent projects panel, launch counter, uptime,
  quick actions dropdown, rotating tips carousel, keyboard shortcuts overlay
- VibeCodeWorker: git branch detection, cursor position, encoding selector, line ending
  toggle, auto-save toggle, command palette (Ctrl+Shift+P) with 20+ commands
- MediaMogul: timeline markers, render queue, clip counter, effects panel, media bin
  categories, color scopes, waveform toggle, proxy editing, project notes, auto-backup
- DemoRecorder: annotation tools, watermark toggle, multi-monitor, recording schedule,
  mouse highlight, click sound, auto-stop on silence, recording tags
- ValleyNet: workflow builder, scheduled tasks, agent memory system, token usage
  tracking, conversation bookmarks, agent plugins, streaming toggle, safe mode
- GameStudio: scene graph hierarchy, asset pipeline status, debug overlay, physics debug,
  resolution selector, performance stats, node inspector, VCS status
- Shared hooks library: useLocalStorage, useDebounce, useInterval, useToggle, etc.

### Prompt 27 - 100 UI/UX Improvements (Wave 3)

> Implement improvements 201-300 across the entire CryptArtist Studio suite.

**Result:** Added 100 more improvements (201-300):
- Global CSS: stepper/wizard, chip/tag input, timeline ruler, split pane dividers,
  color swatch palette, popover, styled range slider, inline editable label,
  mini calendar, vertical tabs, circular progress, drag handles, alert banners
- SuiteLauncher: category filter, What's New modal, sort options, grid/list view toggle,
  time-based greeting, suite health check, system info modal
- VibeCodeWorker: split editor, diff viewer, code snippets library, editor bookmarks,
  go-to-line dialog, file templates, indent detection, symbol outline, sticky scroll
- MediaMogul: color wheel grading, LUT browser, audio mixer, subtitle editor,
  transition library, keyframe editor, motion tracking, stabilization, HDR mode
- DemoRecorder: region selection, zoom during recording, crop tool, GIF preview,
  auto-chapter markers, recording profiles, picture-in-picture, frame rate monitor
- ValleyNet: agent chains, knowledge base, RAG context toggle, tool use log,
  conversation templates, agent personas, multi-model support, cost tracking
- GameStudio: tilemap editor, particle system preview, shader editor, profiler panel,
  input mapping editor
- Shared constants and types library

### Prompt 28 - CryptArt Commander + Settings + OpenRouter

> Add CryptArt Commander and Settings programs. Integrate OpenRouter API deeply
> into every program.

**Result:** Created two new programs:
- **CryptArt Commander** - Terminal emulator with 27+ built-in commands, script editor,
  REST API reference tab, command history, arrow key navigation, and OpenRouter
  integration via `or <prompt>` command
- **Settings** - Full settings hub with API Keys, OpenRouter, Appearance, and About
  sections. Import/export keys to `Forbidden-Secrets-of-CryptArtist-Keys-N.txt`
- **Rust Backend** - Added `openrouter_key` to AppState, new Tauri commands for
  OpenRouter chat, model listing, key import/export
- **Deep OpenRouter Integration** - All AI programs try OpenRouter first, fall back to
  OpenAI. 15 popular models across 6 providers.

### Prompt 29 - Deep Suite Enhancement (70 Improvements)

> Make more improvements across the entire CryptArtist Studio suite. Focus on deeper
> OpenRouter integration, new features, and UI polish.

**Result:** Added improvements 301-370:
- Shared OpenRouter utility module (`src/utils/openrouter.ts`)
- Settings: keyboard shortcuts section, data & storage management, danger zone
- Commander: tab completion, command aliases, 10+ new commands (uptime, whoami, open,
  env, bench, count, grep, head, tail), timestamps, enhanced status bar
- SuiteLauncher: AI status indicator, quick Settings link, updated What's New,
  system info with AI status, new tips, updated shortcuts for 7 programs
- ValleyNet: model picker, provider toggle, response format selector, system prompt
  editor, token budget selector
- VibeCodeWorker: OpenRouter provider dropdown, model selector
- GameStudio: model selector, provider badge, clear AI chat
- DemoRecorder: AI Tools panel with narration script generator and TTS
- AIStudio/MediaMogul: OpenRouter chat, provider toggle, model selector
- Global CSS: AI provider badges, model selector, AI panel components, streaming
  indicator, token usage bar, glow effects, gradient text, pulse ring, skeleton loading

### Prompt 30 - Donate Computer Feature

> Add a donate computer page to the website and a donate computer component to the
> desktop app for P2P resource sharing.

**Result:** Created the Donate Computer feature:
- Desktop: `DonateComputer.tsx` with system resource detection, peer management,
  donation limits, live statistics, activity log, and secure random peer IDs
- Website: `donate-computer.html` page with control panel, live stats, and FAQ
- Website: `donate-computer-api.js` P2P resource sharing API with WebRTC
- Updated navigation across all website pages
- Added Donate Computer to App.tsx routes and SuiteLauncher program grid

### Prompt 31 - Multi-File Workspace Management

> Support opening multiple .CryptArt files simultaneously with workspace management.

**Result:** Implemented workspace management system:
- `WorkspaceProvider.tsx` - React state provider with CRUD and group logic
- `WorkspaceBar.tsx` - Global tab bar UI with context menu
- `workspace.ts` - Types, context, and helper functions
- All 5 original programs integrated with `useWorkspace()` hook
- Resource sharing between workspaces (media, AI context, settings, files, chat history)
- Maximum 20 simultaneous workspaces

### Prompt 32 - Fix 100 Vulnerabilities

> Fix 100 more vulnerabilities. Add all these prompts to the all-prompts file.
> Update README.md with every single thing.

**Result:** Comprehensive security hardening:
- Created `security.ts` utility module with 30+ helper functions
- BATCH A (1-25): Rust backend - API key validation, URL validation, write size limits,
  path sanitization, HTTP timeouts, CORS preflight, security headers
- BATCH B (26-50): Frontend - CSP, localStorage validation, toast rate limiting,
  model ID validation, prototype pollution protection, ISO date validation
- BATCH C (51-75): Memory leaks - timeout cleanup, peer limits, history limits,
  input limits, double-click prevention, search sanitization
- BATCH D (76-100): Hardening - security headers, secure random, audit logging,
  safe JSON, file extension validation, UTF-8 validation

### Prompt 33 - README 700+ Line Update

> Update README.md with at least 700 more lines, in multiple steps. As always,
> prompts/all-prompts.md should be updated with this prompt.

**Result:** This update. Added 700+ lines to README.md covering:
- CryptArt Commander program documentation (40+ commands, aliases, scripts)
- Donate Computer program documentation (P2P resource sharing)
- Settings program documentation (API keys, OpenRouter, appearance)
- Workspace Management system
- OpenRouter Multi-Model AI Integration
- Security Hardening documentation (100 vulnerability fixes, security utility API)
- CryptArtist Studio Website documentation
- Extended Prompt History (Prompts 24-33)
- Troubleshooting guide with common issues tables
- Performance Optimization guide
- Extended FAQ
- Updated directory structure

---

## Related Projects and Links

### Official Links

| Link | Description |
|---|---|
| [github.com/mattyjacks/CryptArtistStudio](https://github.com/mattyjacks/CryptArtistStudio) | Source code repository |
| [mattyjacks.com](https://mattyjacks.com) | Developer website and donations |
| [givegigs.com](https://givegigs.com) | Community donation platform |
| [mattyjacks.com/Contact](https://mattyjacks.com/Contact) | Contact page |
| [cryptartist.com](https://cryptartist.com) | CryptArtist community |

### Technology Links

| Link | Description |
|---|---|
| [tauri.app](https://tauri.app/) | Tauri desktop framework |
| [react.dev](https://react.dev/) | React UI library |
| [typescriptlang.org](https://www.typescriptlang.org/) | TypeScript language |
| [tailwindcss.com](https://tailwindcss.com/) | TailwindCSS framework |
| [ffmpeg.org](https://ffmpeg.org/) | FFmpeg media tools |
| [godotengine.org](https://godotengine.org/) | Godot game engine |
| [microsoft.github.io/monaco-editor](https://microsoft.github.io/monaco-editor/) | Monaco Editor |
| [pexels.com](https://www.pexels.com/) | Free stock photos and videos |

### Related Platforms

| Link | Description |
|---|---|
| [sitefari.com](https://sitefari.com) | Demo sharing platform |
| [givegigs.com](https://givegigs.com) | Media asset library and donations |

### Inspiration

| Project | Influence |
|---|---|
| **DaVinci Resolve** | Professional video editing paradigm |
| **VS Code** | Code editor UX and Monaco Editor |
| **Windsurf** | AI-powered vibe-coding workflow |
| **Google Antigravity** | AI coding and automated testing |
| **Google Lighthouse** | Website quality auditing |
| **OpenClaw** | Autonomous AI agent architecture |
| **OBS Studio** | Screen recording and streaming |
| **Godot Engine** | Open-source game development |

---

## Roadmap

### v0.2.0 (Planned)

- [ ] Full Godot project scaffolding and scene editor integration
- [ ] Real FFmpeg timeline rendering pipeline
- [ ] Twitch/YouTube RTMP streaming in DemoRecorder
- [ ] ValleyNet browser automation via embedded webview
- [ ] Skills marketplace for ValleyNet
- [ ] Plugin system for extending programs
- [ ] Undo/redo history for all editors
- [ ] Multi-window support (detachable panels)

### v0.3.0 (Planned)

- [ ] Android and iOS builds via Tauri mobile
- [ ] Cloud sync for `.CryptArt` projects
- [ ] Collaborative editing (multiplayer)
- [ ] Git integration in VibeCodeWorker
- [ ] Debugger and breakpoints in VibeCodeWorker
- [ ] Audio waveform visualization in Media Mogul
- [ ] Real-time video preview with wgpu rendering
- [ ] Marketplace for sharing `.CryptArt` templates

### v1.0.0 (Vision)

- [ ] Feature parity with DaVinci Resolve for video editing
- [ ] Feature parity with VS Code for code editing
- [ ] Full game development pipeline with Godot
- [ ] Autonomous AI agent capable of complex multi-step tasks
- [ ] Professional screen recording with hardware encoding
- [ ] Published on major app stores
- [ ] Comprehensive documentation site
- [ ] Active community of contributors

---

## FAQ

### Is CryptArtist Studio really free?

Yes. CryptArtist Studio is MIT licensed and completely free to use, modify, and
distribute. There are no paid tiers, no subscriptions, and no feature gates.
Development is supported by voluntary donations at [mattyjacks.com](https://mattyjacks.com)
and [givegigs.com](https://givegigs.com).

### Do I need an API key to use it?

No. CryptArtist Studio works without any API keys. However, AI-powered features
(chat, image generation, testing, web audit) require an API key from a supported
provider (OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint).

### What is a .CryptArt file?

A `.CryptArt` file is a JSON project file that stores the complete state of any
program in CryptArtist Studio. It uses a permanently stable envelope format that
will never need a version upgrade. See [The .CryptArt File Format](#the-cryptart-file-format)
for full details.

### Can I use my own AI provider?

Yes. VibeCodeWorker supports any OpenAI-compatible API endpoint. Enter your custom
base URL and API key in the settings panel, and select "Custom" as the provider.

### Does it work on mobile?

Mobile support (Android and iOS) is in progress via Tauri's mobile capabilities.
The UI is designed to be responsive, with a mobile navigation component and
appropriate viewport handling.

### Can I extend it with plugins?

A plugin system is planned for v0.3.0. In the meantime, the `.CryptArt` format's
`extensions` and `plugins` fields are already defined and ready for use.

### How do I report a bug?

Open an issue on [GitHub](https://github.com/mattyjacks/CryptArtistStudio/issues)
with steps to reproduce, expected vs. actual behavior, and your platform info.

### What is OpenRouter and why should I use it?

[OpenRouter](https://openrouter.ai/) is an API gateway that provides access to 200+
AI models from OpenAI, Anthropic, Google, Meta, Mistral, and more through a single
API key. With OpenRouter, you can switch between GPT-4o, Claude 3.5 Sonnet, Gemini
Pro, Llama 3.1, and other models without managing separate API keys for each provider.
CryptArtist Studio tries OpenRouter first and falls back to direct OpenAI if
OpenRouter is not configured.

### What is CryptArt Commander?

CryptArt Commander is a built-in terminal program that lets you control CryptArtist
Studio through text commands. It supports 40+ commands, tab completion, command aliases,
scripting, and direct integration with OpenRouter and OpenAI. It is useful for
automation, batch operations, and AI agent integration.

### What does Donate Computer do?

Donate Computer enables peer-to-peer compute resource sharing. You can donate idle
CPU, RAM, and GPU resources to help other CryptArtist Studio users run tasks like
AI inference, video rendering, and image generation. Alternatively, you can borrow
resources from the network to speed up your own workloads. All connections use
cryptographically secure peer IDs and password verification.

### How secure is CryptArtist Studio?

CryptArtist Studio has undergone comprehensive security hardening with 100
vulnerability fixes covering input validation, XSS prevention, Content Security
Policy, rate limiting, memory leak prevention, prototype pollution protection,
secure random generation, and audit logging. See the
[Security Hardening](#security-hardening) section for the complete list of fixes.

### Can I open multiple projects at once?

Yes. CryptArtist Studio supports opening up to 20 `.CryptArt` files simultaneously
through its workspace management system. Workspaces appear as tabs in a global bar
and can be combined into groups for resource sharing. See
[Workspace Management](#workspace-management) for details.

### How do I export and import API keys?

Go to Settings > API Keys and click "Export All Keys". This saves all your configured
API keys (OpenAI, OpenRouter, Pexels, GiveGigs) to a JSON file named
`Forbidden-Secrets-of-CryptArtist-Keys-N.txt` (auto-incrementing number). To import,
click "Import Keys" and select a previously exported file.

### What AI models are available?

Through OpenRouter, CryptArtist Studio supports 200+ models including:
- **OpenAI**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, o1
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Google**: Gemini Pro 1.5, Gemini Flash 1.5
- **Meta**: Llama 3.1 405B, Llama 3.1 70B
- **Mistral**: Mixtral 8x22B, Mistral Large
- **Perplexity**: Llama 3.1 Sonar 70B

Direct OpenAI access is also supported for users who prefer not to use OpenRouter.

### How many programs are in the suite?

Eight programs: Media Mogul (video/image editor), VibeCodeWorker (code IDE),
DemoRecorder (screen recorder), ValleyNet (AI agent), GameStudio (game development),
CryptArt Commander (terminal), Donate Computer (P2P sharing), and Settings (config hub).

### Where are log files stored?

Log files are stored in the platform-specific application data directory:
- **Windows**: `%LOCALAPPDATA%\CryptArtist Studio\logs\`
- **macOS**: `~/Library/Application Support/CryptArtist Studio/logs/`
- **Linux**: `~/.local/share/CryptArtist Studio/logs/`

Three files are maintained: `cryptartist-session.txt` (100 lines), `cryptartist-recent.txt`
(1,000 lines), and `cryptartist-full-history.txt` (unlimited).

### How was CryptArtist Studio built?

CryptArtist Studio was built through 33+ AI-assisted "vibe coding" sessions using
Windsurf IDE with Claude models. The complete prompt history (every single prompt
and its result) is preserved in `prompts/all-prompts.md`. The full README documents
every aspect of the application across 2,700+ lines. This project serves as a case
study in AI-assisted software development.

---

## License

CryptArtist Studio is released under the **MIT License**.

```
MIT License

Copyright (c) 2026 Matt - MattyJacks.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Credits

### Creator

**Matt** - [MattyJacks.com](https://mattyjacks.com) | [Matt@MattyJacks.com](mailto:Matt@MattyJacks.com)

### Built With AI

CryptArtist Studio was developed through AI-assisted "vibe coding" sessions using
Windsurf IDE with Claude models. The complete prompt history is preserved in
`prompts/all-prompts.md` as a case study in AI-assisted software development.

### Special Thanks

- The **Tauri** team for the incredible desktop framework
- The **Monaco Editor** team at Microsoft for the open-source editor engine
- **OpenRouter** for the unified AI model gateway
- **Pexels** for the free stock media API
- **FFmpeg** maintainers for the indispensable media tools
- **Godot Engine** community for the open-source game engine
- The **Windsurf** team for the AI-powered IDE used to build this project
- Everyone who donates at [mattyjacks.com](https://mattyjacks.com) and
  [givegigs.com](https://givegigs.com)

---

<div align="center">

**CryptArtist Studio** - The Open Creative Suite

Made with love by [Matt](https://mattyjacks.com)

[GitHub](https://github.com/mattyjacks/CryptArtistStudio) |
[Website](https://mattyjacks.com) |
[Donate](https://givegigs.com) |
[Contact](https://mattyjacks.com/Contact)

---

*This README is approximately 3,200 lines long and documents every aspect of
CryptArtist Studio. It was last updated as part of Prompt 33 in the development history.*

</div>
