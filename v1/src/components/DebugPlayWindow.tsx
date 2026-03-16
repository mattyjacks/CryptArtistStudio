// ============================================================================
// CryptArtist Studio - Debug Play Window Component
// Displays running game with AI testing controls and analysis
// ============================================================================

import { useState, useEffect, useRef } from "react";
import { DebugPlaySession, AIDecision, GameState, debugPlayService } from "../utils/debugPlay";
import { AIGameTester, GameAnalysis } from "../utils/aiGameTester";
import { chatWithAI } from "../utils/openrouter";
import { toast } from "../utils/toast";
import { logger } from "../utils/logger";

interface DebugPlayWindowProps {
  session: DebugPlaySession;
  onClose: () => void;
  onCodeFixRequired: (fixes: Array<{ filePath: string; code: string }>) => void;
}

export default function DebugPlayWindow({
  session,
  onClose,
  onCodeFixRequired,
}: DebugPlayWindowProps) {
  const [aiTester, setAiTester] = useState<AIGameTester | null>(null);
  const [isAutoTesting, setIsAutoTesting] = useState(false);
  const [currentGameState, setCurrentGameState] = useState<GameState | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<GameAnalysis[]>([]);
  const [aiDecisions, setAiDecisions] = useState<AIDecision[]>([]);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null);
  const [controlMode, setControlMode] = useState<"ai" | "user">(session.controlMode);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState(session.chatHistory);
  const [savedStates, setSavedStates] = useState(session.savedStates);
  const [saveStateName, setSaveStateName] = useState("");
  const gameCanvasRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize AI tester
  useEffect(() => {
    const tester = new AIGameTester(session.id, debugPlayService);
    setAiTester(tester);
    setTestLog(["Debug Play session initialized", "Ready to start auto-testing"]);
  }, [session.id]);

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [testLog]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  /**
   * Switch control mode between AI and user
   */
  const handleSwitchControl = (mode: "ai" | "user") => {
    setControlMode(mode);
    debugPlayService.switchControlMode(session.id, mode);
    setTestLog((prev) => [...prev, `Control switched to ${mode.toUpperCase()}`]);
    toast.success(`Control switched to ${mode.toUpperCase()}`);
  };

  /**
   * Send chat message to AI
   */
  const handleSendChat = async () => {
    if (!chatInput.trim() || !aiTester) return;

    const userMessage = chatInput;
    setChatInput("");
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMessage, timestamp: Date.now() },
    ]);
    debugPlayService.addChatMessage(session.id, "user", userMessage);

    try {
      setTestLog((prev) => [...prev, `User: ${userMessage}`]);

      // Send to AI for analysis and instruction
      const prompt = `You are a game testing AI assistant. The user is testing a game and has given you an instruction or question during Debug Play.

Current game state: ${currentGameState?.data ? JSON.stringify(currentGameState.data) : "No state data"}

User instruction: "${userMessage}"

Provide a brief response (1-2 sentences) on what action to take or what to test next. Be specific and actionable.`;

      const reply = await chatWithAI(prompt, { action: "game-dev" });

      setChatMessages((prev) => [
        ...prev,
        { role: "ai", content: reply, timestamp: Date.now() },
      ]);
      debugPlayService.addChatMessage(session.id, "ai", reply);
      setTestLog((prev) => [...prev, `AI: ${reply}`]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestLog((prev) => [...prev, `Chat error: ${msg}`]);
      toast.error(`Chat failed: ${msg}`);
    }
  };

  /**
   * Save current game state
   */
  const handleSaveGameState = () => {
    if (!saveStateName.trim()) {
      toast.error("Enter a name for the saved state");
      return;
    }

    try {
      const savedState = debugPlayService.saveGameState(
        session.id,
        saveStateName,
        `Saved at ${new Date().toLocaleTimeString()}`,
        currentGameState?.screenshot
      );
      setSavedStates((prev) => [...prev, savedState]);
      setSaveStateName("");
      setTestLog((prev) => [...prev, `Game state saved: "${saveStateName}"`]);
      toast.success(`Game state saved: "${saveStateName}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to save state: ${msg}`);
    }
  };

  /**
   * Load a saved game state
   */
  const handleLoadGameState = async (savedStateId: string) => {
    try {
      await debugPlayService.loadGameState(session.id, savedStateId);
      const savedState = savedStates.find((s) => s.id === savedStateId);
      setTestLog((prev) => [...prev, `Game state loaded: "${savedState?.name}"`]);
      toast.success(`Game state loaded: "${savedState?.name}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestLog((prev) => [...prev, `Failed to load state: ${msg}`]);
      toast.error(`Failed to load state: ${msg}`);
    }
  };

  /**
   * Delete a saved game state
   */
  const handleDeleteGameState = (savedStateId: string) => {
    debugPlayService.deleteSavedState(session.id, savedStateId);
    setSavedStates((prev) => prev.filter((s) => s.id !== savedStateId));
    toast.success("Game state deleted");
  };

  /**
   * Start automated AI testing
   */
  const handleStartAutoTest = async () => {
    if (!aiTester || isAutoTesting) return;

    setIsAutoTesting(true);
    setTestLog((prev) => [...prev, "Starting automated AI testing..."]);

    try {
      const decisions = await aiTester.runAutoTest();
      setAiDecisions(decisions);
      setAnalysisHistory(aiTester.getAnalysisHistory());
      setTestLog((prev) => [
        ...prev,
        `Auto test completed: ${decisions.length} decisions made`,
        `Test report:\n${aiTester.generateTestReport()}`,
      ]);
      toast.success("Auto test completed!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestLog((prev) => [...prev, `Error: ${msg}`]);
      toast.error(`Auto test failed: ${msg}`);
    } finally {
      setIsAutoTesting(false);
    }
  };

  /**
   * Capture screenshot manually
   */
  const handleCaptureScreenshot = async () => {
    try {
      const gameState = await debugPlayService.captureScreenshot(session.id);
      setCurrentGameState(gameState);
      setTestLog((prev) => [...prev, `Screenshot captured: ${gameState.timestamp}`]);
      toast.success("Screenshot captured");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestLog((prev) => [...prev, `Failed to capture: ${msg}`]);
      toast.error(`Failed to capture screenshot: ${msg}`);
    }
  };

  /**
   * Capture game state data only (no screenshot)
   */
  const handleCaptureGameState = async () => {
    try {
      const gameState = await debugPlayService.getGameState(session.id);
      setCurrentGameState(gameState);
      setTestLog((prev) => [...prev, `Game state data captured: ${gameState.timestamp}`]);
      toast.success("Game state captured");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestLog((prev) => [...prev, `Failed to capture game state: ${msg}`]);
      toast.error(`Failed to capture game state: ${msg}`);
    }
  };

  /**
   * Capture both screenshot and game state data
   */
  const handleCaptureFullState = async () => {
    try {
      const gameState = await debugPlayService.captureFullState(session.id);
      setCurrentGameState(gameState);
      setTestLog((prev) => [...prev, `Full state captured: ${gameState.timestamp}`]);
      toast.success("Full state captured");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestLog((prev) => [...prev, `Failed to capture full state: ${msg}`]);
      toast.error(`Failed to capture full state: ${msg}`);
    }
  };

  /**
   * Analyze current game state with AI (screenshot or data or both)
   */
  const handleAnalyzeScreenshot = async () => {
    if (!currentGameState || !aiTester) return;

    try {
      setTestLog((prev) => [...prev, "Analyzing game state with AI..."]);
      const analysis = await aiTester.analyzeGameState(
        currentGameState.screenshot,
        currentGameState.data
      );
      setAnalysisHistory((prev) => [...prev, analysis]);
      setTestLog((prev) => [
        ...prev,
        `Analysis complete: ${analysis.gameState}`,
        `Detected objects: ${analysis.objectsDetected.join(", ")}`,
        `Hazards: ${analysis.hazardsDetected.join(", ")}`,
        `Next action: ${analysis.nextAction.action}`,
      ]);
      toast.success("Game state analyzed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestLog((prev) => [...prev, `Analysis failed: ${msg}`]);
      toast.error(`Analysis failed: ${msg}`);
    }
  };

  /**
   * Send input to game
   */
  const handleSendInput = async (action: string) => {
    try {
      await debugPlayService.sendInput(session.id, { action });
      setTestLog((prev) => [...prev, `Input sent: ${action}`]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestLog((prev) => [...prev, `Failed to send input: ${msg}`]);
      toast.error(`Failed to send input: ${msg}`);
    }
  };

  /**
   * Stop debug session
   */
  const handleStopSession = async () => {
    try {
      const result = await debugPlayService.stopSession(session.id);
      setTestLog((prev) => [
        ...prev,
        `Session stopped`,
        `Bugs found: ${result.bugsFound.length}`,
        `Tests passed: ${result.testsPassed}`,
        `Tests failed: ${result.testsFailed}`,
      ]);
      toast.success("Debug session stopped");
      setTimeout(onClose, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to stop session: ${msg}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-studio-dark border border-studio-border rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-studio-darker border-b border-studio-border px-4 py-3 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-studio-green">Debug Play</h2>
            <p className="text-xs text-studio-border">{session.scenePath}</p>
          </div>
          <button
            onClick={onClose}
            className="text-studio-border hover:text-studio-red transition-colors text-xl"
          >
            ✕
          </button>
        </div>

        {/* Control Mode Indicator */}
        <div className="bg-studio-darker border-b border-studio-border px-4 py-2 flex justify-between items-center">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-studio-border">Control Mode:</span>
            <button
              onClick={() => handleSwitchControl("ai")}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                controlMode === "ai"
                  ? "bg-studio-green/40 text-studio-green font-bold"
                  : "bg-studio-border/20 text-studio-border hover:bg-studio-border/40"
              }`}
            >
              🤖 AI
            </button>
            <button
              onClick={() => handleSwitchControl("user")}
              className={`text-xs px-3 py-1 rounded transition-colors ${
                controlMode === "user"
                  ? "bg-studio-cyan/40 text-studio-cyan font-bold"
                  : "bg-studio-border/20 text-studio-border hover:bg-studio-border/40"
              }`}
            >
              👤 User
            </button>
          </div>
          <div className="text-xs text-studio-muted">
            {controlMode === "ai" ? "AI is controlling the game" : "You are controlling the game"}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden p-4">
          {/* Game Display */}
          <div className="flex-1 flex flex-col gap-2">
            <div
              ref={gameCanvasRef}
              className="flex-1 bg-black border border-studio-border rounded flex items-center justify-center overflow-hidden"
            >
              {currentGameState?.screenshot ? (
                <img
                  src={`data:image/png;base64,${currentGameState.screenshot}`}
                  alt="Game"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-studio-border text-center">
                  <p>No screenshot captured</p>
                  <p className="text-xs mt-2">Click "Capture Screenshot" to start</p>
                </div>
              )}
            </div>

            {/* Game Controls */}
            <div className="bg-studio-darker border border-studio-border rounded p-3 space-y-2">
              <div className="text-xs text-studio-border mb-2">Game Controls</div>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleSendInput("ui_up")}
                  className="bg-studio-border/20 hover:bg-studio-border/40 text-studio-green text-xs py-2 rounded transition-colors"
                >
                  ↑ Up
                </button>
                <button
                  onClick={() => handleSendInput("ui_down")}
                  className="bg-studio-border/20 hover:bg-studio-border/40 text-studio-green text-xs py-2 rounded transition-colors"
                >
                  ↓ Down
                </button>
                <button
                  onClick={() => handleSendInput("ui_left")}
                  className="bg-studio-border/20 hover:bg-studio-border/40 text-studio-green text-xs py-2 rounded transition-colors"
                >
                  ← Left
                </button>
                <button
                  onClick={() => handleSendInput("ui_right")}
                  className="bg-studio-border/20 hover:bg-studio-border/40 text-studio-green text-xs py-2 rounded transition-colors"
                >
                  → Right
                </button>
                <button
                  onClick={() => handleSendInput("ui_accept")}
                  className="bg-studio-border/20 hover:bg-studio-border/40 text-studio-green text-xs py-2 rounded transition-colors col-span-2"
                >
                  ✓ Accept/Jump
                </button>
                <button
                  onClick={() => handleSendInput("ui_select")}
                  className="bg-studio-border/20 hover:bg-studio-border/40 text-studio-green text-xs py-2 rounded transition-colors col-span-2"
                >
                  ⚔ Attack
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-studio-darker border border-studio-border rounded p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCaptureScreenshot}
                  disabled={!session.isRunning}
                  className="bg-studio-cyan/20 hover:bg-studio-cyan/40 disabled:opacity-50 text-studio-cyan text-xs py-2 rounded transition-colors font-bold"
                  title="Capture game screenshot only"
                >
                  📸 Screenshot
                </button>
                <button
                  onClick={handleCaptureGameState}
                  disabled={!session.isRunning}
                  className="bg-studio-blue/20 hover:bg-studio-blue/40 disabled:opacity-50 text-studio-blue text-xs py-2 rounded transition-colors font-bold"
                  title="Capture game state data (no screenshot)"
                >
                  📊 State Data
                </button>
                <button
                  onClick={handleCaptureFullState}
                  disabled={!session.isRunning}
                  className="bg-studio-purple/20 hover:bg-studio-purple/40 disabled:opacity-50 text-studio-purple text-xs py-2 rounded transition-colors font-bold col-span-2"
                  title="Capture both screenshot and state data"
                >
                  🎯 Full State
                </button>
              </div>
              <button
                onClick={handleAnalyzeScreenshot}
                disabled={!currentGameState}
                className="w-full bg-studio-yellow/20 hover:bg-studio-yellow/40 disabled:opacity-50 text-studio-yellow text-xs py-2 rounded transition-colors font-bold"
              >
                🤖 Analyze with AI
              </button>
              <button
                onClick={handleStartAutoTest}
                disabled={!session.isRunning || isAutoTesting}
                className="w-full bg-studio-green/20 hover:bg-studio-green/40 disabled:opacity-50 text-studio-green text-xs py-2 rounded transition-colors font-bold"
              >
                {isAutoTesting ? "⏳ Testing..." : "▶ Start Auto Test"}
              </button>
              <button
                onClick={handleStopSession}
                className="w-full bg-studio-red/20 hover:bg-studio-red/40 text-studio-red text-xs py-2 rounded transition-colors font-bold"
              >
                ⏹ Stop Debug Play
              </button>
            </div>
          </div>

          {/* Right Panel - Analysis & Log */}
          <div className="w-80 flex flex-col gap-4">
            {/* Game State Data Display */}
            {currentGameState?.data && (
              <div className="bg-studio-darker border border-studio-border rounded p-3 flex-1 overflow-hidden flex flex-col">
                <div className="text-xs text-studio-border font-bold mb-2">Game State Data</div>
                <div className="flex-1 overflow-y-auto text-xs space-y-1 font-mono">
                  {currentGameState.data.playerPosition && (
                    <div className="text-studio-cyan">
                      Player: ({currentGameState.data.playerPosition.x?.toFixed(1)}, {currentGameState.data.playerPosition.y?.toFixed(1)})
                    </div>
                  )}
                  {currentGameState.data.playerHealth !== undefined && (
                    <div className={currentGameState.data.playerHealth < 30 ? "text-studio-red" : "text-studio-green"}>
                      Health: {currentGameState.data.playerHealth}/{currentGameState.data.playerMaxHealth}
                    </div>
                  )}
                  {currentGameState.data.playerState && (
                    <div className="text-studio-yellow">
                      State: {currentGameState.data.playerState}
                    </div>
                  )}
                  {currentGameState.data.playerScore !== undefined && (
                    <div className="text-studio-cyan">
                      Score: {currentGameState.data.playerScore}
                    </div>
                  )}
                  {currentGameState.data.levelName && (
                    <div className="text-studio-border">
                      Level: {currentGameState.data.levelName}
                    </div>
                  )}
                  {currentGameState.data.enemies && currentGameState.data.enemies.length > 0 && (
                    <div className="text-studio-red">
                      Enemies: {currentGameState.data.enemies.length}
                    </div>
                  )}
                  {currentGameState.data.collectibles && currentGameState.data.collectibles.length > 0 && (
                    <div className="text-studio-yellow">
                      Collectibles: {currentGameState.data.collectibles.filter(c => !c.collected).length}/{currentGameState.data.collectibles.length}
                    </div>
                  )}
                  {currentGameState.data.objectives && currentGameState.data.objectives.length > 0 && (
                    <div className="text-studio-border text-[10px] mt-2">
                      <div className="text-studio-cyan font-bold">Objectives:</div>
                      {currentGameState.data.objectives.map((obj, i) => (
                        <div key={i} className="ml-2">
                          {currentGameState.data?.completedObjectives?.includes(obj) ? "✓" : "○"} {obj}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat Interface */}
            <div className="bg-studio-darker border border-studio-border rounded p-3 flex-1 overflow-hidden flex flex-col">
              <div className="text-xs text-studio-border font-bold mb-2">💬 Chat with AI</div>
              <div className="flex-1 overflow-y-auto text-xs space-y-2 mb-2">
                {chatMessages.length === 0 ? (
                  <div className="text-studio-muted text-center py-4">
                    <p>No messages yet</p>
                    <p className="text-[10px] mt-1">Ask AI to test specific things</p>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={msg.role === "user" ? "text-studio-cyan" : "text-studio-green"}>
                      <span className="font-bold">{msg.role === "user" ? "You" : "AI"}:</span>
                      <p className="ml-2 text-studio-border">{msg.content}</p>
                    </div>
                  ))
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Tell AI what to test..."
                  className="flex-1 bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-text placeholder-studio-muted outline-none focus:border-studio-cyan"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim()}
                  className="bg-studio-cyan/20 hover:bg-studio-cyan/40 disabled:opacity-50 text-studio-cyan text-xs px-2 py-1 rounded transition-colors font-bold"
                >
                  Send
                </button>
              </div>
            </div>

            {/* Saved Game States */}
            <div className="bg-studio-darker border border-studio-border rounded p-3 flex-1 overflow-hidden flex flex-col">
              <div className="text-xs text-studio-border font-bold mb-2">💾 Saved States</div>
              <div className="flex-1 overflow-y-auto text-xs space-y-1 mb-2">
                {savedStates.length === 0 ? (
                  <div className="text-studio-muted text-center py-4">
                    <p>No saved states</p>
                    <p className="text-[10px] mt-1">Save current state to repeat testing</p>
                  </div>
                ) : (
                  savedStates.map((state) => (
                    <div key={state.id} className="bg-studio-bg rounded p-2 flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-studio-cyan font-bold truncate">{state.name}</p>
                        <p className="text-studio-muted text-[10px]">
                          {new Date(state.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleLoadGameState(state.id)}
                          className="bg-studio-green/20 hover:bg-studio-green/40 text-studio-green text-[10px] px-1.5 py-0.5 rounded transition-colors"
                          title="Load this state"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => handleDeleteGameState(state.id)}
                          className="bg-studio-red/20 hover:bg-studio-red/40 text-studio-red text-[10px] px-1.5 py-0.5 rounded transition-colors"
                          title="Delete this state"
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={saveStateName}
                  onChange={(e) => setSaveStateName(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSaveGameState()}
                  placeholder="State name..."
                  className="flex-1 bg-studio-bg border border-studio-border rounded px-2 py-1 text-xs text-studio-text placeholder-studio-muted outline-none focus:border-studio-cyan"
                />
                <button
                  onClick={handleSaveGameState}
                  disabled={!saveStateName.trim()}
                  className="bg-studio-cyan/20 hover:bg-studio-cyan/40 disabled:opacity-50 text-studio-cyan text-xs px-2 py-1 rounded transition-colors font-bold"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Current Analysis */}
            {analysisHistory.length > 0 && (
              <div className="bg-studio-darker border border-studio-border rounded p-3 flex-1 overflow-hidden flex flex-col">
                <div className="text-xs text-studio-border font-bold mb-2">Current Analysis</div>
                <div className="flex-1 overflow-y-auto text-xs space-y-2">
                  {analysisHistory[analysisHistory.length - 1] && (
                    <>
                      <div>
                        <span className="text-studio-cyan">State:</span>
                        <p className="text-studio-border ml-2">
                          {analysisHistory[analysisHistory.length - 1].gameState}
                        </p>
                      </div>
                      <div>
                        <span className="text-studio-cyan">Objects:</span>
                        <p className="text-studio-border ml-2">
                          {analysisHistory[analysisHistory.length - 1].objectsDetected.join(", ")}
                        </p>
                      </div>
                      <div>
                        <span className="text-studio-cyan">Next Action:</span>
                        <p className="text-studio-green ml-2 font-bold">
                          {analysisHistory[analysisHistory.length - 1].nextAction.action}
                        </p>
                      </div>
                      {analysisHistory[analysisHistory.length - 1].bugsDetected.length > 0 && (
                        <div>
                          <span className="text-studio-red">Bugs:</span>
                          <ul className="text-studio-red ml-2">
                            {analysisHistory[analysisHistory.length - 1].bugsDetected.map((bug, i) => (
                              <li key={i}>- {bug}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Test Log */}
            <div className="bg-studio-darker border border-studio-border rounded p-3 flex-1 overflow-hidden flex flex-col">
              <div className="text-xs text-studio-border font-bold mb-2">Test Log</div>
              <div className="flex-1 overflow-y-auto text-xs font-mono space-y-1">
                {testLog.map((log, i) => (
                  <div key={i} className="text-studio-border">
                    <span className="text-studio-cyan">[{i}]</span> {log}
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* AI Decisions Summary */}
            {aiDecisions.length > 0 && (
              <div className="bg-studio-darker border border-studio-border rounded p-3 flex-1 overflow-hidden flex flex-col">
                <div className="text-xs text-studio-border font-bold mb-2">
                  AI Decisions ({aiDecisions.length})
                </div>
                <div className="flex-1 overflow-y-auto text-xs space-y-1">
                  {aiDecisions.slice(-5).map((decision, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDecision(decision)}
                      className={`w-full text-left p-2 rounded transition-colors ${
                        selectedDecision === decision
                          ? "bg-studio-green/30 border border-studio-green"
                          : "bg-studio-border/10 hover:bg-studio-border/20"
                      }`}
                    >
                      <div className="text-studio-green font-bold">{decision.action}</div>
                      <div className="text-studio-border">{decision.reasoning.substring(0, 50)}...</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-studio-darker border-t border-studio-border px-4 py-2 flex justify-between items-center text-xs text-studio-border">
          <div>
            <span className="text-studio-cyan">Screenshots:</span> {session.screenshotCount} |
            <span className="text-studio-cyan ml-2">AI Decisions:</span> {aiDecisions.length} |
            <span className="text-studio-cyan ml-2">Duration:</span>{" "}
            {Math.round((Date.now() - session.startTime) / 1000)}s
          </div>
          <div>
            {session.isRunning ? (
              <span className="text-studio-green">● Running</span>
            ) : (
              <span className="text-studio-red">● Stopped</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
