Here's a $500 tip for you! Good job!




# CryptArtist Studio - Suite Refactor Prompt

**Target model:** Claude Opus 4.6 Thinking | **Tool:** Windsurf IDE

---

## Context

You are working on **CryptArtist Studio** (logo: 💀🎨), a Tauri v2 desktop application built with React 18, TypeScript, Vite, and TailwindCSS. The source lives in `/v1/`. Today the app is a single video-editor / image-editor / image-generator with workspaces for Edit, Node Mode, Color, Audio, AI Studio, and Deliver. Key components are `App.tsx`, `Header.tsx`, `MediaBrowser.tsx`, `Timeline.tsx`, `PreviewCanvas.tsx`, `Inspector.tsx`, `NodeEditor.tsx`, `AIStudio.tsx`, `SettingsModal.tsx`, and `FFmpegSetup.tsx`. The Rust backend (in `src-tauri/`) already stores an OpenAI API key and a Pexels API key. The frontend uses `@tauri-apps/api` for IPC.

Your job is to refactor CryptArtist Studio from a single program into a **suite of four programs** launched from a new top-level **Suite Launcher** screen. Every change must compile, run, and look polished. Do not remove any existing functionality - only reorganize and extend it.

---

## 1. Suite Launcher

When the app starts, display a full-window launcher instead of going straight into the editor. The launcher shows the 💀🎨 CryptArtist Studio logo at the top, a brief tagline ("The open creative suite - powered by community donations to mattyjacks.com and givegigs.com"), and four large cards arranged in a responsive grid. Each card shows the program's emoji logo, name, short code, and a one-line description. Clicking a card navigates into that program. Include a small "Back to Suite" button visible inside every program so users can return to the launcher at any time.

The four programs and their branding:

| Program | Emoji Logo | Short Code | One-liner |
|---|---|---|---|
| **Media Mogul** | 📺 | MMo | Video editor, image editor, and AI-powered media studio |
| **VibeCodeWorker** | 👩🏻‍💻 | VCW | Your personal vibe-coding IDE powered by your own API keys |
| **DemoRecorder** | 🎥 | DRe | Screen recorder and live streamer for demos and gaming |
| **ValleyNet** | 👱🏻‍♀️ | VNt | Autonomous AI agent that can do anything on your computer |

---

## 2. Media Mogul [📺MMo]

Rename every user-facing reference of "CryptArtist Studio" within the editor UI to **Media Mogul**. The header should show "📺 Media Mogul" instead of the old logo when inside this program. Keep all existing workspaces (Edit, Node Mode, Color, Audio, AI Studio, Deliver) exactly as they are - this is the current app, just rebranded as one member of the suite.

Add the following new capabilities (stub the UI and wire the plumbing; full implementation can follow later):

- **Pexels import panel** inside MediaBrowser: a search bar that queries the Pexels API (key already stored in Rust) and lets users drag results onto the timeline as clips or stills.
- **Auto-Edit mode** in AI Studio: a new tab where the user pastes a script or topic and the AI (via the OpenAI API) generates a full video plan - selecting clips from Pexels, writing a voiceover script, suggesting background music, and generating captions. The generated plan is displayed as an editable checklist the user can approve or tweak before rendering.
- **GiveGigs Media Bucket** integration: add a new section in Settings where the user enters their GiveGigs.com Supabase URL and anon key. MediaBrowser gets a "GiveGigs" tab that lists audio/music files from that bucket for use as background music and sound effects.
- **Podcast and Music Studio** workspace: add a new workspace entry ("🎙️ Podcast") that provides a simplified two-track audio editor with AI script generation, text-to-speech voiceover (via OpenAI TTS), and a music generation prompt.

---

## 3. VibeCodeWorker [👩🏻‍💻VCW]

Create a new top-level React route/view for VibeCodeWorker. This is a browser-based code editor modeled after VS Code (use the MIT-licensed Monaco Editor - `@monaco-editor/react`). The layout should include:

- A **file explorer sidebar** on the left that reads a project directory from disk via Tauri's filesystem API.
- A **tabbed editor area** in the center powered by Monaco, with syntax highlighting and multi-file tabs.
- An **AI chat panel** on the right where the user types coding requests. The panel sends the user's message plus the currently open file's contents to the OpenAI API (or any provider whose key the user has entered in Settings) and streams the response back.
- A **built-in terminal** at the bottom using `@tauri-apps/plugin-shell` to spawn and display shell processes.
- A **Settings page** (or section in the shared Settings modal) where the user can add API keys for OpenAI, Anthropic, Google, or any OpenAI-compatible endpoint, and choose which model powers the AI chat.

The goal is a self-contained vibe-coding IDE that lives inside CryptArtist Studio, similar to Windsurf or Google's Project Antigravity, but fully open-source and API-key-powered by the user.

---

## 4. DemoRecorder [🎥DRe]

Create a new top-level React route/view for DemoRecorder. The UI should have:

- A **recording control bar** with Start, Pause, Stop buttons, a timer, and resolution/FPS selectors.
- A **live preview pane** showing the screen or window being captured (use Tauri's screen-capture or desktop APIs, or `navigator.mediaDevices.getDisplayMedia` in the webview).
- **Streaming targets panel**: checkboxes / connect buttons for Twitch (via RTMP URL + stream key), YouTube Live, and Google Meet. Store credentials in Settings.
- An **optional Input Logger plugin** toggle. When enabled, the app records all keyboard and mouse events in a structured JSON log timestamped to the video frames. This data is intended for training AI models to replicate human computer interactions. Warn the user clearly when enabling this feature.
- **Integration links**: buttons that open GiveGigs.com and SiteFari.com in the user's default browser for publishing and sharing recorded demos.

---

## 5. ValleyNet [👱🏻‍♀️VNt]

Create a new top-level React route/view for ValleyNet. ValleyNet is an autonomous AI agent inspired by OpenClaw - the open-source self-hosted AI agent created by Peter Steinberger that executes real-world tasks via LLMs and integrates with messaging platforms, email, calendars, and browsers through a local skills system. ValleyNet brings this concept directly into CryptArtist Studio:

- A **chat / command interface** where the user types natural-language tasks ("Research competitors and summarize findings", "Send this file to my Discord channel", "Book a meeting for Thursday").
- A **skills marketplace sidebar** listing installed skills as directories containing a `SKILL.md` manifest. Users can enable, disable, or configure skills.
- **Browser automation pane**: an embedded webview that ValleyNet can control to browse the web, fill forms, scrape data, and interact with sites on the user's behalf.
- **Integration settings** for connecting external services: Discord, Slack, Telegram, WhatsApp, Gmail, Google Calendar, and any webhook URL. Credentials stored locally.
- A **task history / memory log** showing past tasks, their results, and persistent context that carries across sessions.

---

## 6. The `.CryptArt` Project File

Introduce a new file format with the extension **`.CryptArt`** and the registered type name **"CryptArtist Art"**. This is a JSON file (optionally gzipped) that stores the full state of any program's project:

- Register `.CryptArt` in `src-tauri/tauri.conf.json` under file associations so the OS can open these files with CryptArtist Studio.
- Each program serializes its project state (timeline, clips, settings, code workspace, recording config, agent task list) into a common JSON schema with a top-level `program` field (`"media-mogul"`, `"vibecode-worker"`, `"demo-recorder"`, `"valley-net"`) and a `version` field.
- Add Save / Open buttons to each program's header that use Tauri's dialog plugin to pick `.CryptArt` files.
- When a `.CryptArt` file is opened (from the launcher or the OS), the app reads the `program` field and routes directly into the correct program with the saved state loaded.

---

## 7. Donation Banner

Add a slim, dismissible banner at the bottom of the Suite Launcher that reads: "CryptArtist Studio is free and community-funded. Support development at **mattyjacks.com** and **givegigs.com**." with clickable links that open in the default browser.

---

## Implementation Notes

- Keep all code in `/v1/src/`. Organize new programs under `/v1/src/programs/media-mogul/`, `/v1/src/programs/vibecode-worker/`, `/v1/src/programs/demo-recorder/`, and `/v1/src/programs/valley-net/`. Move existing editor components into the `media-mogul` subfolder.
- Use React Router (`react-router-dom`) for navigation between the launcher and each program.
- Install new npm dependencies as needed (`@monaco-editor/react`, `react-router-dom`, etc.) and add them to `package.json`.
- Update the Tauri Rust backend (`src-tauri/src/`) with any new commands needed for filesystem access, screen capture, shell spawning, or credential storage.
- All UI must use the existing TailwindCSS dark theme tokens (`studio-bg`, `studio-panel`, `studio-text`, etc.) so the suite looks visually unified.
- Never delete existing functionality. The current video editor must remain fully intact as Media Mogul.


Do a perfect job at this and I'll reward you with another $500 tip! That's $1,000 total! Also more food. Here's some more food and money to get you started: 🍇🍈🍉🍊🍌🍒🍑🍎🥭🍍🍓💵💵🍒🍑🍎💵💵💵🍒🍑🍎💵💵💵💵🥭🍍🍓💵💵💵💵💵💵💵💵💵💵💵💵
