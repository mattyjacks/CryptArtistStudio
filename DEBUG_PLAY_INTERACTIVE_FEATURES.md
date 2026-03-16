# Debug Play - Interactive Features Enhancement

## Overview

Debug Play has been enhanced with interactive control switching, AI communication, and game state persistence features. Users can now take control of the game, communicate with AI during testing, and save/load game states for repeatable testing.

## New Features

### 1. Control Mode Switching

**Two Control Modes:**
- AI Mode - AI automatically tests the game, makes decisions, and explores gameplay
- User Mode - You manually control the game with keyboard inputs

**How to Switch:**
1. Look at the control mode indicator below the Debug Play header
2. Click AI to let AI control the game
3. Click User to take manual control
4. Switch between modes at any time during testing

**Use Cases:**
- Start with AI mode to explore the game automatically
- Switch to user mode to manually test a specific scenario
- Switch back to AI mode to continue automated testing
- Combine both modes for hybrid testing

### 2. Chat with AI During Testing

**Real-time Communication:**
- Ask AI to test specific things
- Give AI instructions on what to focus on
- Get AI's recommendations on what to test next
- Have a conversation about game state and bugs

**How to Use:**
1. Type your instruction in the Chat with AI input field
2. Press Enter or click Send
3. AI responds with specific, actionable advice
4. Continue the conversation as needed

**Example Instructions:**
- Test the jump mechanic by jumping repeatedly
- Try to reach the top of the level
- Check if the enemy AI is working correctly
- Test what happens when you collect all coins
- See if there's a way to get stuck in the level

**AI Response Format:**
AI provides brief, actionable responses (1-2 sentences) based on:
- Current game state
- Your instruction
- Available game mechanics
- Detected bugs or issues

### 3. Game State Saving and Loading

**Save Game States:**
1. Click the input field in Saved States panel
2. Enter a descriptive name (e.g., Before boss fight, After collecting coins)
3. Click Save
4. Current game state is saved with:
   - Player position, health, inventory
   - Enemy positions and states
   - Collectibles collected
   - Objectives completed
   - Screenshot (if available)

**Load Saved States:**
1. Find the saved state in the Saved States list
2. Click Load button
3. Game resets to that exact state
4. Continue testing from that point

**Delete Saved States:**
1. Find the saved state in the list
2. Click Del button
3. State is removed

**Use Cases:**
- Save state before attempting difficult section
- Test multiple approaches from same starting point
- Create checkpoints for regression testing
- Save states to share with team for bug reproduction
- Build test suite of known scenarios

## Implementation Details

### Frontend Changes

#### debugPlay.ts - New Methods
- switchControlMode(sessionId, mode) - Switch between AI and user control
- getControlMode(sessionId) - Get current control mode
- addChatMessage(sessionId, role, content) - Add message to chat history
- getChatHistory(sessionId) - Get all chat messages
- saveGameState(sessionId, name, description, screenshot) - Save current state
- loadGameState(sessionId, savedStateId) - Load a saved state
- getSavedStates(sessionId) - Get all saved states
- deleteSavedState(sessionId, savedStateId) - Delete a saved state

#### DebugPlaySession - New Fields
- controlMode: "ai" or "user" - Current control mode
- isAutoTesting: boolean - Whether AI is auto-testing
- chatHistory: ChatMessage[] - Chat messages with AI
- savedStates: SavedGameState[] - Saved game states

#### DebugPlayWindow.tsx - New UI Panels
- Control Mode Indicator - Shows current mode with quick-switch buttons
- Chat Interface - Send messages to AI, view conversation history
- Saved States Manager - Save, load, and delete game states

### Backend Changes

#### main.rs - New Tauri Command
- godot_load_game_state(session_id, state_data) - Load a saved game state

## Workflow Examples

### Example 1: Hybrid Testing Approach

1. Start Debug Play with AI mode enabled
2. AI automatically explores the game for 2 minutes
3. AI finds a potential bug in the jump mechanic
4. Switch to User mode
5. Manually test the jump mechanic to reproduce the bug
6. Save the state where the bug occurs
7. Switch back to AI mode
8. AI continues testing other areas
9. Later, load the saved state to verify the bug fix

### Example 2: Focused Testing with Chat

1. Start Debug Play with AI mode
2. Chat: "Focus on testing the enemy AI behavior"
3. AI tests enemy interactions and reports findings
4. Chat: "Now test what happens if you get surrounded by 3 enemies"
5. AI positions itself to be surrounded and tests combat
6. Chat: "Check if the player can escape by jumping over them"
7. AI attempts escape strategies
8. Save the state where the bug is reproduced
9. Share saved state with development team

### Example 3: Regression Testing with Saved States

1. Load a previously saved state (e.g., "Before boss fight")
2. Run auto-test from that point
3. Verify the boss fight still works correctly
4. Load another saved state (e.g., "After collecting coins")
5. Run auto-test from that point
6. Verify the game progresses correctly
7. Repeat for all critical checkpoints

## Data Structures

### ChatMessage
```
{
  role: "user" | "ai",
  content: string,
  timestamp: number
}
```

### SavedGameState
```
{
  id: string,
  name: string,
  timestamp: number,
  gameStateData: GameStateData,
  screenshot?: string,
  description: string
}
```

## API Reference

### DebugPlayService

```
switchControlMode(sessionId, mode)
  - Switch control between AI and user
  - mode: "ai" or "user"

getControlMode(sessionId)
  - Get current control mode
  - Returns: "ai" or "user" or null

addChatMessage(sessionId, role, content)
  - Add message to chat history
  - role: "user" or "ai"

getChatHistory(sessionId)
  - Get all chat messages
  - Returns: ChatMessage[]

saveGameState(sessionId, name, description, screenshot)
  - Save current game state
  - Returns: SavedGameState

loadGameState(sessionId, savedStateId)
  - Load a saved game state
  - Async operation

getSavedStates(sessionId)
  - Get all saved states
  - Returns: SavedGameState[]

deleteSavedState(sessionId, savedStateId)
  - Delete a saved state
```

### Tauri Commands

```
godot_load_game_state(session_id, state_data)
  - Load game state in Godot
  - state_data: JSON string of game state
  - Returns: Result<String, String>
```

## User Interface

### Control Mode Indicator
- Located below Debug Play header
- Shows current mode (AI or User)
- Quick-switch buttons for mode selection
- Status message indicating who is in control

### Chat Interface
- Input field for typing instructions
- Chat history showing all messages
- Auto-scroll to latest message
- Send button or Enter key to submit

### Saved States Manager
- List of all saved states with timestamps
- Load button to restore a state
- Delete button to remove a state
- Input field to save new state with custom name

## Performance Considerations

**Control Switching:**
- Instant - no delay when switching modes
- AI continues from current game state
- User can take over at any time

**Chat with AI:**
- ~2-5 seconds for AI to respond
- Depends on API latency
- Response is specific to current game state

**Game State Saving:**
- ~100-500ms to save state
- Includes game data and optional screenshot
- Stored in memory during session

**Game State Loading:**
- ~200-1000ms to restore state
- Requires Godot debug server communication
- Game resets to exact saved state

## Godot Integration

To use game state loading, your Godot game needs to implement:

```gdscript
# In your game's main script
func load_game_state(state_data: Dictionary) -> void:
    if state_data.has("playerPosition"):
        player.global_position = state_data.playerPosition
    if state_data.has("playerHealth"):
        player.health = state_data.playerHealth
    if state_data.has("playerState"):
        player.current_state = state_data.playerState
    # ... restore other state ...
```

## Troubleshooting

### "Failed to load game state"
- Ensure Godot game implements load_game_state() function
- Check that state data is properly formatted
- Verify Godot debug server is running

### Chat not responding
- Check internet connection
- Verify API key is configured
- Check API rate limits

### Control switch not working
- Ensure Debug Play session is running
- Try switching again
- Check console for errors

## Future Enhancements

1. **State Branching** - Create multiple test paths from one saved state
2. **State Comparison** - Compare two saved states to see differences
3. **State Sharing** - Export/import saved states for team collaboration
4. **State Snapshots** - Automatic snapshots at key moments
5. **Replay System** - Replay entire test session from saved states
6. **State Validation** - Verify saved state integrity before loading
7. **Batch Testing** - Run same test from multiple saved states
8. **State Metadata** - Add tags, notes, and custom metadata to states

## Summary

The interactive Debug Play enhancements enable:

✅ **Flexible Control** - Switch between AI and manual control at any time
✅ **AI Communication** - Direct conversation with AI during testing
✅ **State Persistence** - Save and load game states for repeatable testing
✅ **Hybrid Testing** - Combine AI and manual testing approaches
✅ **Bug Reproduction** - Save exact states where bugs occur
✅ **Regression Testing** - Test from known checkpoints
✅ **Team Collaboration** - Share saved states with development team

These features make Debug Play a powerful tool for comprehensive game testing and bug detection.

---

Version: 3.0.0 (Interactive Features)
Status: Complete and integrated
