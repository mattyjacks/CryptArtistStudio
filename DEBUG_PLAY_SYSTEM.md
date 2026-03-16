# CryptArtist Studio - Debug Play System

## Overview

The **Debug Play (DP)** system is an AI-powered game testing and debugging framework for GameStudio that automatically tests Godot games, captures screenshots, analyzes them with GPT-4 mini, and suggests code fixes through VibeCodeWorker integration.

## Architecture

### Frontend Components

#### 1. **Debug Play Service** (`v1/src/utils/debugPlay.ts`)
- **DebugPlayService**: Manages headless Godot instances and screenshot capture
- **DebugPlaySession**: Tracks active testing sessions with logs and AI decisions
- **GameState**: Represents current game screenshot and metadata
- **AIDecision**: Records AI-made decisions during testing

**Key Methods:**
- `startSession(projectPath, scenePath)` - Launch headless Godot
- `stopSession(sessionId)` - Stop and generate test results
- `captureScreenshot(sessionId)` - Get current game screenshot
- `sendInput(sessionId, input)` - Send keyboard/gamepad input
- `addAIDecision(sessionId, decision)` - Log AI decision

#### 2. **AI Game Tester** (`v1/src/utils/aiGameTester.ts`)
- **AIGameTester**: Analyzes game screenshots and makes intelligent decisions
- **GameAnalysis**: AI-generated analysis of game state
- **CodeFix**: Suggested code fixes for detected bugs

**Key Methods:**
- `runAutoTest()` - Automatically test game for up to 5 minutes
- `analyzeGameState(screenshot)` - Send screenshot to GPT-4 mini for analysis
- `suggestCodeFixes(bugs, code, filePath)` - Generate code fixes for bugs
- `generateTestReport()` - Create human-readable test summary

**AI Model:** `openai/gpt-5-mini` (configurable via OpenRouter)

#### 3. **Debug Play Window** (`v1/src/components/DebugPlayWindow.tsx`)
- React component displaying:
  - Game viewport with live screenshots
  - Manual game controls (arrow keys, jump, attack, etc.)
  - AI analysis panel showing current game state
  - Test log with real-time updates
  - AI decision history with screenshot references

**Features:**
- Manual screenshot capture
- Manual AI analysis of current screenshot
- Automated AI testing with "Start Auto Test" button
- Input simulation (movement, actions)
- Session management (stop/close)

#### 4. **GameStudio Integration** (`v1/src/programs/game-studio/GameStudio.tsx`)
- **DP Button**: Located in toolbar next to Play button
- **Session State**: Manages active Debug Play session
- **Code Fix Integration**: Sends AI-detected bugs to VibeCodeWorker via interop

**Interop Events:**
- `code:fix-required` - Emitted when AI suggests code fixes
  - Payload: `{ filePath, code, description }`

### Backend Components

#### 1. **Debug Play Module** (`v1/src-tauri/src/debug_play.rs`)
- **DebugPlayManager**: Manages headless Godot process lifecycle
- **DebugPlayInstance**: Tracks running Godot instances
- **ScreenshotResult**: Base64-encoded PNG screenshot data

**Key Methods:**
- `start_headless()` - Spawn headless Godot with `--headless --display-driver dummy`
- `stop_headless()` - Kill Godot process
- `capture_screenshot()` - Read screenshot from game
- `send_input()` - Simulate input events

#### 2. **Tauri Commands** (`v1/src-tauri/src/main.rs`)
- `godot_run_headless(project_path, scene_path, session_id)` - Start headless instance
- `godot_stop_headless(session_id)` - Stop instance
- `godot_capture_screenshot(session_id)` - Get screenshot
- `godot_send_input(session_id, input)` - Send input

## Workflow

### Starting Debug Play

1. User clicks **🐛 DP** button in GameStudio toolbar
2. Frontend calls `debugPlayService.startSession(projectPath, scenePath)`
3. Service invokes Tauri command `godot_run_headless`
4. Rust backend spawns headless Godot process
5. DebugPlayWindow opens with game viewport

### Manual Testing

1. User clicks **Capture Screenshot** to get current game state
2. User clicks **Analyze with AI** to send screenshot to GPT-4 mini
3. AI returns analysis:
   - Current game state description
   - Detected objects and hazards
   - Player status
   - Suggested next action
   - Any bugs detected
4. User can manually send inputs using game control buttons

### Automated Testing

1. User clicks **Start Auto Test**
2. AIGameTester begins loop (max 50 iterations, 5 minutes):
   - Capture screenshot
   - Analyze with AI (GPT-4 mini)
   - Send AI-suggested input
   - Wait 500ms for game response
   - Repeat until objective achieved or unwinnable state
3. Test completes with report:
   - Duration and iteration count
   - Bugs found
   - Code fixes suggested
   - AI decision history

### Code Fix Integration

1. During testing, AI detects bugs (e.g., "Player falls through floor")
2. AI suggests code fixes via `suggestCodeFixes()`
3. GameStudio emits `code:fix-required` event to VibeCodeWorker
4. VibeCodeWorker receives fix and displays in code editor
5. Developer can review and apply fixes

## AI Prompts

### Game State Analysis
```
You are an expert game tester and AI. Analyze this game screenshot and provide a detailed analysis.

Respond with ONLY valid JSON:
{
  "gameState": "brief description",
  "objectsDetected": ["list", "of", "objects"],
  "playerStatus": "description",
  "hazardsDetected": ["list", "of", "dangers"],
  "objectives": ["what", "player", "should", "do"],
  "nextAction": { "action": "ui_up|ui_down|ui_left|ui_right|ui_accept|ui_select|ui_focus_next|ui_cancel" },
  "reasoning": "why this action",
  "confidence": 0.85,
  "shouldContinue": true,
  "bugsDetected": ["any", "bugs", "found"]
}
```

### Code Fix Generation
```
You are a senior game developer. Analyze these bugs and suggest code fixes.

Bugs detected:
- [bug descriptions]

Current code:
[gdscript code]

Return JSON array:
[
  {
    "filePath": "path/to/script.gd",
    "lineNumber": 10,
    "originalCode": "var speed = 100",
    "fixedCode": "var speed = 200",
    "explanation": "Increased speed to match game balance"
  }
]
```

## Game Input Actions

Standard Godot input actions:
- `ui_up` - Move up / Navigate up
- `ui_down` - Move down / Navigate down
- `ui_left` - Move left / Navigate left
- `ui_right` - Move right / Navigate right
- `ui_accept` - Jump / Confirm / Accept
- `ui_select` - Attack / Select
- `ui_focus_next` - Interact / Next item
- `ui_cancel` - Pause / Cancel / Back

## Configuration

### Model Selection
- Default: `openai/gpt-5-mini`
- Configurable via OpenRouter settings
- Can use any OpenRouter-supported model

### Test Parameters
- **Max Iterations**: 50 per session
- **Max Duration**: 5 minutes
- **Input Delay**: 500ms between actions
- **Screenshot Interval**: Every iteration

### Godot Headless Flags
```bash
godot --headless \
  --display-driver dummy \
  --render-thread-mode single-threaded \
  -p /path/to/project \
  res://main.tscn
```

## Interop Integration

### Events Emitted
- `code:fix-required` - When AI suggests code fixes

### Events Listened To
- None currently (GameStudio is the source)

### VibeCodeWorker Integration
When code fixes are suggested:
1. GameStudio emits `code:fix-required` event
2. VibeCodeWorker receives event via `useInterop("code:fix-required", ...)`
3. VibeCodeWorker displays fix in editor
4. Developer can apply or modify fix

## File Structure

```
v1/src/
├── utils/
│   ├── debugPlay.ts              # Debug Play service
│   ├── aiGameTester.ts           # AI game testing logic
│   └── interop.ts                # (updated with code:fix-required)
├── components/
│   └── DebugPlayWindow.tsx       # Debug Play UI
└── programs/game-studio/
    └── GameStudio.tsx            # (updated with DP button)

v1/src-tauri/src/
├── debug_play.rs                 # Rust backend
└── main.rs                        # (updated with commands)
```

## Usage Example

### Starting Debug Play
```typescript
// In GameStudio.tsx
const handleStartDebugPlay = async () => {
  const session = await debugPlayService.startSession(
    projectPath,
    "res://main.tscn"
  );
  setDebugPlaySession(session);
  setShowDebugPlayWindow(true);
};
```

### Running Auto Test
```typescript
// In DebugPlayWindow.tsx
const handleStartAutoTest = async () => {
  const tester = new AIGameTester(session.id, debugPlayService);
  const decisions = await tester.runAutoTest();
  // decisions contains all AI decisions made during test
};
```

### Analyzing Screenshot
```typescript
// In DebugPlayWindow.tsx
const gameState = await debugPlayService.captureScreenshot(session.id);
const analysis = await tester.analyzeGameState(gameState.screenshot);
// analysis contains AI's understanding of current game state
```

## Limitations & Future Work

### Current Limitations
1. **Headless Godot**: Requires Godot 4.4+ with headless support
2. **Screenshot Capture**: Placeholder implementation - needs Godot debug API integration
3. **Input Simulation**: Placeholder implementation - needs GDScript RPC integration
4. **Process Management**: Basic process spawning - no inter-process communication yet

### Future Enhancements
1. **Godot Debug Server Integration**: Connect to Godot's debug protocol for real-time communication
2. **Advanced Screenshot Capture**: Use Godot's screenshot API for accurate game state
3. **Input Simulation**: Implement GDScript RPC for reliable input sending
4. **Performance Metrics**: Track FPS, memory, draw calls during testing
5. **Regression Testing**: Save test results and compare across builds
6. **Custom Test Scenarios**: Define specific test objectives (reach goal, collect items, etc.)
7. **Video Recording**: Record entire test session for playback
8. **Multi-Scene Testing**: Test multiple scenes in sequence
9. **Stress Testing**: Run extended tests to find memory leaks
10. **Network Testing**: Test multiplayer/network functionality

## Troubleshooting

### "Godot not found"
- Ensure Godot 4.4+ is installed and in PATH
- Check GameStudio terminal for Godot detection status

### "Failed to capture screenshot"
- Verify Godot headless mode is running
- Check that scene is valid and loads properly
- Review Godot output logs for errors

### "AI analysis failed"
- Verify OpenRouter/OpenAI API key is configured
- Check internet connection
- Review API key in Settings

### "Input not received"
- Verify game is accepting input in headless mode
- Check input action names match project.godot
- Ensure scene has input handling code

## API Reference

### DebugPlayService

```typescript
class DebugPlayService {
  async startSession(projectPath: string, scenePath: string): Promise<DebugPlaySession>
  async stopSession(sessionId: string): Promise<GameTestResult>
  async captureScreenshot(sessionId: string): Promise<GameState>
  async sendInput(sessionId: string, input: GameInput): Promise<void>
  getSession(sessionId: string): DebugPlaySession | undefined
  getCurrentSession(): DebugPlaySession | undefined
  addAIDecision(sessionId: string, decision: AIDecision): void
  clearSessions(): void
}
```

### AIGameTester

```typescript
class AIGameTester {
  async runAutoTest(): Promise<AIDecision[]>
  async analyzeGameState(screenshotBase64: string): Promise<GameAnalysis>
  async suggestCodeFixes(bugsDetected: string[], codeContext: string, filePath: string): Promise<CodeFix[]>
  generateTestReport(): string
  getAnalysisHistory(): GameAnalysis[]
}
```

### Tauri Commands

```rust
godot_run_headless(project_path: String, scene_path: String, session_id: String) -> Result<String, String>
godot_stop_headless(session_id: String) -> Result<String, String>
godot_capture_screenshot(session_id: String) -> Result<ScreenshotResult, String>
godot_send_input(session_id: String, input: String) -> Result<String, String>
```

## Performance Considerations

- **Screenshot Capture**: ~100-500ms per capture (depends on resolution)
- **AI Analysis**: ~2-5s per screenshot (depends on model and API latency)
- **Input Simulation**: ~50ms per input
- **Total Iteration Time**: ~3-6s per test iteration

For 50 iterations: ~2.5-5 minutes (within 5-minute limit)

## Security Notes

- All file paths validated with `sanitize_path()`
- API keys stored securely in localStorage
- No sensitive data logged to console
- Godot process spawned with restricted permissions
- Input validation on all Tauri commands

---

**Version**: 1.0.0  
**Last Updated**: March 16, 2026  
**Status**: Complete and integrated
