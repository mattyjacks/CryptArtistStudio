









# CryptArtist Studio - AI Conversation Prompts (March 2026)

## Initial Project Setup
**Prompt 0:**
> In a new folder /v1/ make the following program: CryptArtist Studio.
> 
> It is also integrated with OpenAI API and the user can enter their own API keys. Come up with cool features on your own.
> 
> System Role & Context:
> You are an elite, Principal Systems Engineer specializing in high-performance, cross-platform media applications. We are building "CryptArtist Studio," a professional-grade video, audio, image, and GIF editing suite designed to compete with DaVinci Resolve. The application will be distributed via Cryptartist.com.
> 
> Technology Stack:
> 
> Frontend: Tauri, React, TypeScript, Tailwind CSS. (Optimized for heavy DOM manipulation like complex timelines).
> 
> Backend: Rust (handling file I/O, OS interactions, state management).
> 
> Media Engine: FFmpeg & FFprobe (handled via Rust).
> 
> Graphics/Rendering: wgpu (Rust wrapper for Vulkan/Metal/DirectX) + WGSL for compute shaders.
> 
> Core Architectural Directives:
> 
> Zero-Bloat Installation: The initial app download must be lightweight. Write a Rust initialization module that, upon first run, detects the user's OS (Windows, Mac, Linux), downloads the appropriate FFmpeg/FFprobe binaries asynchronously, verifies their integrity, and stores them in the local AppData/user directory.
> 
> State Management: The Rust backend holds the "source of truth" for the project state (timeline data, media pool, node graphs). The React frontend is strictly a view layer that communicates with Rust via Tauri commands and listens to state emissions.
> 
> High-Performance Rendering: FFmpeg handles decoding frames to memory. wgpu takes those frames, processes effects (color grading, transitions, etc.) via Compute Shaders, and passes the final rendered buffer to a canvas/WebGL context in the Tauri frontend.
> 
> DaVinci Clone Mechanics: The architecture must support a layered track timeline (Interval Trees) and a node-based compositing pipeline (Directed Acyclic Graph) for advanced visual effects.
> 
> Immediate Output Required - Step 1:
> Please acknowledge these constraints and then provide the comprehensive boilerplate commands and directory structure required to initialize this specific Tauri + Rust + React project. Follow this with the exact Rust code (main.rs and an ffmpeg_installer.rs module) needed to execute the OS-aware FFmpeg auto-download on the first launch. Ensure the code includes robust error handling and progress reporting back to the Tauri frontend.
> 
> Do a perfect job at this, and make software that everyone loves, and I will reward you with more food.
> 
> 🥬🍓🍉🍔🍪🍯🍔🍔
> 
> Here is some food because I love you. <3


## Security and Branding Setup
**Prompt 1:**
> run npm audit on the packages and fix all vulnerabilities.
> "💀🎨" is the logo of cryptartist.com
> Also let people create images using the openai api, and talk to chatgpt in a chat window to create those images or alternatively just submit the image prompt.

## Initial Fixes and Naming
**Prompt 2:**
> Fix everything!

**Prompt 3:**
> Don't call it Fusion editor, that may be copyrighted, called it Node Mode

## Build and Execution
**Prompt 4:**
> Now how do I run it as an .exe or something?

**Prompt 5:**
> run it for me

**Prompt 6:**
> Done. Compile it now.

**Prompt 7:**
> Run npm run tauri build one last time!

## UI/UX Integration and Debugging
**Prompt 8:**
> None of it works! I can switch between the tabs but the buttons don't do anything.

**Prompt 9:**
> Integrate every single upcoming feature. Now.

## Advanced Features & CLI
**Prompt 10:**
> Make it be able to be commanded and for projects to be edited through the command line, for integration with AI tools like antigravity for helping test it

**Prompt 11:**
> Let the user browse pexels.com for images and videos, and add them to the project automatically, with support for multiple file sizes for videos at the same time, in a way that makes it better

**Prompt 12:**
> Now make an AI studio mode where the user can generate a video using prompts, and it will be automatically edited together from pexels.com videos, and put on the project. It can also have captions, and audio generated from OpenAI API.

## Repository Maintenance
**Prompt 13:**
> add the node modules to .gitignore

**Prompt 14:**
> Add every single prompt I gave you to @[prompts/all-prompts.md]starting before the prompts already on there, also organize them properly.

---

Prompt Builder Prompt on 3/13/2026




Look in /v1/ and make me a 1,200 word prompt for using with Windsurf (a vibe coding tool) Claude Opus 4.6 Thinking model, and return the prompt as /prompts/bigprompt-2.md a new MarkDown file.

I want to make the following changes to this repository.

When you start CryptArtist Studio, you are presented with a suite of programs. The first one is Media Mogul [📺MMo] (The new name for the Video Editor / Image Generator / Image Editor tool that currently exists in the repository), and VibeCodeWorker [👩🏻‍💻VCW] (One of the new programs), DemoRecorder [🎥DRe] (which is another new program), and ValleyNet [👱🏻‍♀️VNt]


The logos for each of them are the emojis and the words. The logo for CryptArtist is the two emojis 💀🎨 together.


Here are what the new programs do:

  Media Mogul = is the existing program, which is a video editor and image editor and image generator, which can also import from pexels.com using the API, and can also 

automatically edit videos + provide voiceovers + provide music (using a connection to a GiveGigs.com supabase media bucket) + provide captions + make scripts for videos and music and podcasts + make podcasts + make new music + insert videos and images from pexels = all using the OpenAI API.

  VibeCodeWorker = A full suite of tools for vibecoding, made to be a clone of windsurf or google antigravity, made using the vscode open source version as the base software, where you can input your own API keys to power it.


  DemoRecorder = A screen recorder that can also stream to twitch and google meet and youtube, made for showing off demos of software, and also gaming clips. It also has a keylogging and mouselogging mode that can be enabled with an optional plugin. This is so that we can train AIs to do computer work. This also links to GiveGigs.com and SiteFari.com which are two other sites I own.


  ValleyNet =  an AI that can do anything, similar to OpenClaw (browse the web for information about OpenClaw and add it here)


All of these will be powered by donations to mattyjacks.com and givegigs.com


There will be a new filetype that is basically a project file for each of the programs, called "example.CryptArt" with .CryptArt being the file extension, and the title of the file extension being "CryptArtist Art"

Do a perfect job at this and I'll reward you with a $500 tip! Also more food. Here's some food and money to get you started: 🍇🍈🍉🍊🍌🍒🍑🍎🥭🍍🍓💵💵💵💵💵💵💵💵💵💵💵💵

I love you!

You are an expert prompt writer.

















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

















make it all actually work, bro. It doesn't work yet.

Spend millions of context tokens on this, AI. Use maximum context.











add a privacy policy and terms of use, fully complying with New Hampshire, USA, law.

Add links to them on install and on every time you run the program.

The email contact for the website is Matt@MattyJacks.com

We also encourage people to go to MattyJacks.com/Contact


We use vercel, cloudflare, cloudflare turnstile, the openAI api, google analytics, vercel observability tools, and our own analytics suite. We are linked with givegigs.com and mattyjacks.com. All donations are given free-of-pressure and of people's own will, and are not allowed to be charged back.

---

## Mobile, API, CLI, and 35+ Improvements (Prompt 18 - March 13, 2026)

make it work on android and ios, too.

Make it all work better. Use the maximum context.

Make every single improvement you can, also make it all workable through an API or the Command Line.

In addition to the improvements you're thinking of, add 35 more improvements.

Add every prompt I've given you to prompts/all-prompts.md and continue adding my prompts to this file, for documentation for all.

---

## GameStudio - Media Mogul + VibeCodeWorker + Godot Integration (Prompt 19 - March 13, 2026)

Make    CryptArtist Media Mogul    able to be combined with    CryptArtist VibeCodeWorker    (making multiple windows of it able to be combined) and also the latest version of    Godot

To be able to make videogames automatically.


Spend maximum context on this.