# VibeCodeWorker Terminal Command System

## Overview

VibeCodeWorker now includes a comprehensive terminal command execution system with AI safety levels, configurable allow/deny lists, Windsurf-style system prompts, and an auto-updating memory system that persists to `.txt` files.

**Status:** ✅ COMPLETE - Build passing, all systems integrated

---

## Architecture

### Core Components

#### 1. Terminal Safety Validator (`src/utils/terminalSafety.ts`)
- Validates commands against safety rules
- Implements 5 safety levels: unrestricted, permissive, balanced, strict, paranoid
- Maintains allow/deny lists
- Detects dangerous command patterns
- Customizable rules system

#### 2. Terminal Memory System (`src/utils/terminalMemory.ts`)
- Auto-updating memory with .txt file persistence
- Records commands, errors, successes, and notes
- Searchable memory entries with tags
- Configurable auto-save intervals
- Memory summaries and analytics

#### 3. System Prompt Manager (`src/utils/terminalSystemPrompt.ts`)
- Windsurf-style system prompt configuration
- File-based persistence
- Auto-reload from file changes
- Context-aware prompt generation
- Default professional prompt included

#### 4. Terminal Executor (`src/utils/terminalExecutor.ts`)
- Integrates all three systems
- Handles command execution with approval workflow
- Maintains command history
- Provides unified API for all operations

#### 5. Terminal Command Panel (`src/components/TerminalCommandPanel.tsx`)
- React UI component for terminal interaction
- Safety level selector
- Allow/deny list management
- Memory viewer
- System prompt editor

---

## Safety Levels

### Unrestricted
- No restrictions on command execution
- No approval required
- Max command length: 10,000 characters
- Timeout: 300 seconds
- Use case: Local development, trusted environments

### Permissive
- Blocks only the most dangerous patterns (rm -rf, mkfs, dd, fork bombs)
- No approval required
- Max command length: 5,000 characters
- Timeout: 120 seconds
- Use case: Development with basic safeguards

### Balanced (Default)
- Blocks dangerous patterns (destructive, privilege escalation)
- Requires approval for unknown commands
- Max command length: 2,000 characters
- Timeout: 60 seconds
- Use case: Standard development workflow

### Strict
- Blocks most system-level commands
- Requires approval for all non-whitelisted commands
- Max command length: 1,000 characters
- Timeout: 30 seconds
- Use case: Shared systems, production environments

### Paranoid
- Blocks almost all potentially dangerous commands
- Requires approval for everything
- Max command length: 500 characters
- Timeout: 10 seconds
- Use case: High-security environments, untrusted systems

---

## Allow/Deny Lists

### Allow List
Commands that are always permitted (with safety checks):
- File operations: `ls`, `dir`, `pwd`, `cd`, `find`, `grep`
- Package managers: `npm`, `yarn`, `pnpm`
- Version control: `git`
- Development tools: `node`, `python`, `tsc`, `cargo`, `go`, `rustc`, `javac`, `dotnet`, `make`, `cmake`, `gcc`, `clang`
- Editors: `nvim`, `vim`, `nano`, `code`, `subl`, `atom`

### Deny List
Commands that are never permitted:
- Configurable per project
- Persisted to configuration
- Easy to add/remove via UI

### Custom Rules
- Pattern-based matching (string or regex)
- Per-rule safety level requirements
- Custom reason messages

---

## System Prompt Configuration

### Default Prompt
Professional AI assistant prompt that covers:
- Role and responsibilities
- Code quality guidelines
- Terminal command best practices
- Safety and security considerations
- Error handling expectations

### Customization
- Edit directly in UI
- Save to `.vibecode-system-prompt.txt`
- Auto-reload from file changes
- Reset to default anytime
- Context-aware prompt generation

### Example Custom Prompt
```
You are VibeCodeWorker, an AI code assistant for the CryptArtist Studio.

Your expertise:
- Full-stack web development (React, Node.js, TypeScript)
- Game development with Godot and GDScript
- DevOps and infrastructure
- AI/ML integration

When executing terminal commands:
1. Always explain what you're doing
2. Check results carefully
3. Handle errors gracefully
4. Log important operations
5. Ask for help when uncertain

Safety first: Never execute commands without understanding their impact.
```

---

## Memory System

### Features
- **Auto-Recording:** Commands, errors, successes automatically logged
- **Searchable:** Find past commands and results
- **Tagged:** Organize entries with custom tags
- **Persistent:** Saved to `.vibecode-memory.txt`
- **Auto-Update:** Configurable save intervals (default 30s)
- **Analytics:** Success rates, command frequency, patterns

### Memory Entry Types
- **command:** Raw command execution
- **error:** Failed command or error message
- **success:** Successful command execution
- **note:** Manual notes and observations
- **context:** Project context and environment info

### Memory File Format
```
# VibeCodeWorker Terminal Memory
# Generated: 2026-03-16T14:56:00.000Z
# Total Entries: 42

## [SUCCESS] 2026-03-16T14:55:30.000Z
ID: mem-1710604530000-abc123def
Tags: build, npm, success

Command: npm run build
Output: ✓ built in 3.32s
Error: None
Duration: 3320ms

Metadata:
  command: npm run build
  success: true
  duration: 3320
  exitCode: 0

---

## [ERROR] 2026-03-16T14:54:15.000Z
ID: mem-1710604455000-xyz789uvw
Tags: test, failed

Command: npm test
Output: 
Error: Test suite failed
Duration: 5420ms

Metadata:
  command: npm test
  success: false
  duration: 5420
  exitCode: 1

---
```

### Memory Configuration
```typescript
{
  enabled: true,
  autoUpdate: true,
  maxEntries: 1000,
  filePath: ".vibecode-memory.txt",
  updateInterval: 30000,  // 30 seconds
  categories: ["commands", "errors", "successes", "context", "notes"]
}
```

---

## Usage Examples

### Basic Command Execution
```typescript
const executor = new TerminalExecutor({
  safetyLevel: "balanced",
  enableMemory: true,
  enableSystemPrompt: true,
});

await executor.initialize();

const result = await executor.executeCommand({
  command: "npm run build",
  cwd: "/path/to/project",
});

console.log(result.output);
```

### With Approval Callback
```typescript
const executor = new TerminalExecutor({
  safetyLevel: "strict",
  approvalCallback: async (command, reason) => {
    return confirm(`Approve: ${command}\nReason: ${reason}`);
  },
});
```

### Managing Allow/Deny Lists
```typescript
// Add to allow list
executor.allowCommand("npm");
executor.allowCommand("git");

// Add to deny list
executor.denyCommand("rm");
executor.denyCommand("sudo");

// Get current configuration
const config = executor.getValidatorConfig();
console.log(config.allowList);
console.log(config.denyList);
```

### Working with Memory
```typescript
// Record a command
executor.recordCommand("npm install", true, "installed packages", null, 5000);

// Search memory
const results = executor.searchMemory("npm");

// Get summary
const summary = executor.getMemorySummary();
console.log(`Success rate: ${summary.successRate}%`);
console.log(`Recent commands: ${summary.recentCommands.join(", ")}`);
```

### System Prompt Management
```typescript
// Get current prompt
const prompt = executor.getSystemPrompt();

// Set custom prompt
executor.setSystemPrompt("You are a specialized AI for DevOps tasks...");

// Save to file
await executor.saveAll();
```

---

## Configuration Files

### `.vibecode-system-prompt.txt`
Contains the system prompt for the AI assistant. Automatically loaded and watched for changes.

### `.vibecode-memory.txt`
Contains all recorded commands, errors, and notes. Auto-updated at configured intervals.

### `.vibecode-config.json` (Optional)
```json
{
  "safetyLevel": "balanced",
  "enableMemory": true,
  "enableSystemPrompt": true,
  "memoryFilePath": ".vibecode-memory.txt",
  "promptFilePath": ".vibecode-system-prompt.txt",
  "allowList": ["npm", "yarn", "git", "node"],
  "denyList": ["rm", "sudo", "chmod"],
  "autoApprove": false,
  "memoryAutoUpdate": true,
  "memoryUpdateInterval": 30000
}
```

---

## UI Components

### Terminal Command Panel
- Command input with syntax highlighting
- Safety level selector
- Quick allow/deny buttons
- Settings panel for list management
- Memory viewer with statistics
- System prompt editor
- Real-time output display

### Features
- ✅ Execute commands with validation
- ✅ View command history
- ✅ Manage allow/deny lists
- ✅ Edit system prompt
- ✅ View memory summary
- ✅ Search memory entries
- ✅ Configure safety levels
- ✅ Approval workflow

---

## Integration with VibeCodeWorker

### Adding to VibeCodeWorker
```typescript
import TerminalCommandPanel from "../../components/TerminalCommandPanel";

// In your component
<TerminalCommandPanel
  projectPath={projectPath}
  onCommandExecuted={(result) => {
    console.log("Command executed:", result);
  }}
/>
```

### Interop Events
- `code:command-executed` - Command executed successfully
- `code:command-failed` - Command execution failed
- `code:memory-updated` - Memory system updated
- `code:prompt-changed` - System prompt changed

---

## Safety Considerations

### Best Practices
1. Start with "balanced" safety level
2. Use allow lists for trusted commands
3. Use deny lists for dangerous operations
4. Review memory regularly
5. Keep system prompt updated
6. Enable approval for unknown commands
7. Monitor command history

### Dangerous Patterns Blocked
- **Destructive:** `rm -rf`, `del /s`, `mkfs`, `format`
- **Privilege Escalation:** `sudo`, `chmod 777`, `chown`
- **System Control:** `shutdown`, `reboot`, `halt`, `kill`, `pkill`
- **Code Injection:** `curl | sh`, `wget | sh`
- **Fork Bombs:** `:() { :|:& };:`

---

## Performance

### Memory Usage
- Minimal overhead for command execution
- Memory entries stored efficiently
- Auto-cleanup of old entries (configurable)
- File I/O optimized with batching

### Command Execution
- Timeout protection (configurable per level)
- Non-blocking execution
- Streaming output support
- Error recovery

### File I/O
- Async file operations
- Batched writes (30s default interval)
- Automatic cleanup on shutdown
- Efficient parsing and serialization

---

## Troubleshooting

### Command Not Executing
1. Check safety level restrictions
2. Verify command is in allow list or not in deny list
3. Check command length limit
4. Verify approval was granted

### Memory Not Saving
1. Check file path is writable
2. Verify auto-update is enabled
3. Check disk space
4. Review error logs

### System Prompt Not Loading
1. Verify file exists and is readable
2. Check file path configuration
3. Review auto-load setting
4. Check for file encoding issues

---

## Future Enhancements

1. **Command Templates**
   - Pre-configured command templates
   - Variable substitution
   - Conditional execution

2. **Advanced Analytics**
   - Command frequency analysis
   - Error pattern detection
   - Performance tracking
   - Trend analysis

3. **Collaborative Features**
   - Shared allow/deny lists
   - Team memory sharing
   - Audit logging
   - Access control

4. **Integration**
   - GitHub Actions integration
   - CI/CD pipeline support
   - Slack notifications
   - Webhook support

5. **AI Enhancements**
   - Command suggestions
   - Error diagnosis
   - Automatic fixes
   - Learning from patterns

---

## Build Status

```
✓ Build successful
✓ 284 modules transformed
✓ TypeScript compilation passed
✓ Vite bundling completed
✓ No critical errors
✓ Terminal command system active
```

---

## File Structure

```
src/
├── utils/
│   ├── terminalSafety.ts          (Safety validation)
│   ├── terminalMemory.ts          (Memory system)
│   ├── terminalSystemPrompt.ts    (System prompt)
│   └── terminalExecutor.ts        (Main executor)
└── components/
    └── TerminalCommandPanel.tsx   (UI component)

Project Root/
├── .vibecode-system-prompt.txt    (System prompt file)
├── .vibecode-memory.txt           (Memory file)
└── .vibecode-config.json          (Optional config)
```

---

## Summary

VibeCodeWorker now has a professional-grade terminal command execution system with:

✅ **5 Safety Levels** - From unrestricted to paranoid
✅ **Allow/Deny Lists** - Easy command management
✅ **System Prompts** - Windsurf-style configuration
✅ **Auto-Updating Memory** - Persistent .txt file storage
✅ **Rich UI** - Full-featured command panel
✅ **Approval Workflow** - User confirmation for risky commands
✅ **Analytics** - Success rates, command history, patterns
✅ **File Persistence** - All data saved to .txt files
✅ **Configurable** - Everything is customizable
✅ **Production Ready** - Tested and optimized

You can now execute terminal commands in VibeCodeWorker with full control over safety, memory, and AI behavior.
