// ============================================================================
// CryptArtist Studio - Debug Play Service
// Manages headless Godot execution, screenshot capture, and AI-driven testing
// ============================================================================

import { invoke } from "@tauri-apps/api/core";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "ai";
  content: string;
  timestamp: number;
}

export interface SavedGameState {
  id: string;
  name: string;
  timestamp: number;
  gameStateData: GameStateData;
  screenshot?: string;
  description: string;
}

export interface DebugPlaySession {
  id: string;
  projectPath: string;
  scenePath: string;
  startTime: number;
  isRunning: boolean;
  screenshotCount: number;
  testLog: DebugPlayLog[];
  currentGameState: GameState;
  aiDecisions: AIDecision[];
  // Control mode
  controlMode: "ai" | "user";
  isAutoTesting: boolean;
  // Chat history
  chatHistory: ChatMessage[];
  // Saved states
  savedStates: SavedGameState[];
  // Improvement 1: Test metrics
  totalInputsSent: number;
  bugsDetected: string[];
  performanceMetrics: { fps: number; memoryUsage: number; cpuUsage: number };
  // Improvement 2: Test configuration
  testDuration: number;
  maxIterations: number;
  focusAreas: string[];
  // Improvement 3: Session metadata
  sessionName: string;
  sessionDescription: string;
  tags: string[];
  // Improvement 4: Test coverage
  testedFeatures: Set<string>;
  untestableFeatures: Set<string>;
  // Improvement 5: Bug severity tracking
  bugSeverity: Map<string, "critical" | "high" | "medium" | "low">;
  // Improvement 6: Regression tracking
  regressionTests: Array<{ name: string; passed: boolean; timestamp: number }>;
  // Improvement 7: AI confidence scores
  aiConfidenceScores: number[];
  // Improvement 8: Test timeline
  eventTimeline: Array<{ timestamp: number; event: string; data?: any }>;
  // Improvement 9: Breakpoints
  breakpoints: Array<{ condition: string; enabled: boolean }>;
  // Improvement 10: Test filters
  activeFilters: { severity?: string; feature?: string; status?: string };
}

export interface GameStateData {
  // Player info
  playerPosition?: { x: number; y: number; z?: number };
  playerHealth?: number;
  playerMaxHealth?: number;
  playerVelocity?: { x: number; y: number; z?: number };
  playerState?: string; // "idle", "running", "jumping", "attacking", etc.
  playerInventory?: string[];
  playerScore?: number;

  // World state
  enemies?: Array<{
    name: string;
    position: { x: number; y: number; z?: number };
    health?: number;
    state?: string;
  }>;
  collectibles?: Array<{
    name: string;
    position: { x: number; y: number; z?: number };
    collected?: boolean;
  }>;
  hazards?: Array<{
    name: string;
    position: { x: number; y: number; z?: number };
    type?: string;
  }>;

  // Game state
  level?: number;
  levelName?: string;
  time?: number;
  isGameOver?: boolean;
  isPaused?: boolean;
  objectives?: string[];
  completedObjectives?: string[];

  // Camera info
  cameraPosition?: { x: number; y: number; z?: number };
  cameraZoom?: number;

  // Custom data
  customData?: Record<string, unknown>;
}

export interface GameState {
  screenshot?: string; // base64 encoded PNG (optional)
  timestamp: number;
  resolution: { width: number; height: number };
  description: string; // AI-generated description
  data?: GameStateData; // Structured game state data
}

export interface AIDecision {
  timestamp: number;
  observation: string;
  action: string;
  reasoning: string;
  success: boolean;
  screenshot?: string;
}

export interface DebugPlayLog {
  timestamp: number;
  type: "info" | "warning" | "error" | "ai-action" | "screenshot";
  message: string;
  data?: unknown;
}

export interface GameTestResult {
  sessionId: string;
  duration: number;
  screenshotsAnalyzed: number;
  bugsFound: string[];
  codesFixed: string[];
  testsPassed: number;
  testsFailed: number;
  aiDecisions: AIDecision[];
}

// ---------------------------------------------------------------------------
// Debug Play Service
// ---------------------------------------------------------------------------

export class DebugPlayService {
  private sessions: Map<string, DebugPlaySession> = new Map();
  private currentSessionId: string | null = null;

  /**
   * Start a new debug play session
   */
  async startSession(projectPath: string, scenePath: string): Promise<DebugPlaySession> {
    const sessionId = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: DebugPlaySession = {
      id: sessionId,
      projectPath,
      scenePath,
      startTime: Date.now(),
      isRunning: true,
      screenshotCount: 0,
      testLog: [
        {
          timestamp: Date.now(),
          type: "info",
          message: `Debug Play session started for ${scenePath}`,
        },
      ],
      currentGameState: {
        screenshot: "",
        timestamp: Date.now(),
        resolution: { width: 1920, height: 1080 },
        description: "Initializing...",
      },
      aiDecisions: [],
      controlMode: "ai",
      isAutoTesting: false,
      chatHistory: [],
      savedStates: [],
      // Improvements 1-10 initialization
      totalInputsSent: 0,
      bugsDetected: [],
      performanceMetrics: { fps: 60, memoryUsage: 0, cpuUsage: 0 },
      testDuration: 300000,
      maxIterations: 50,
      focusAreas: [],
      sessionName: `Debug Play - ${new Date().toLocaleTimeString()}`,
      sessionDescription: "",
      tags: [],
      testedFeatures: new Set(),
      untestableFeatures: new Set(),
      bugSeverity: new Map(),
      regressionTests: [],
      aiConfidenceScores: [],
      eventTimeline: [],
      breakpoints: [],
      activeFilters: {},
    };

    this.sessions.set(sessionId, session);
    this.currentSessionId = sessionId;

    logger.info("DebugPlayService", `Session started: ${sessionId}`);

    // Launch headless Godot
    try {
      await invoke("godot_run_headless", {
        projectPath,
        scenePath,
        sessionId,
      });
      this.addLog(sessionId, "info", "Godot headless instance launched");
    } catch (err) {
      this.addLog(sessionId, "error", `Failed to launch Godot: ${err}`);
      throw err;
    }

    return session;
  }

  /**
   * Stop a debug play session
   */
  async stopSession(sessionId: string): Promise<GameTestResult> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    session.isRunning = false;
    this.addLog(sessionId, "info", "Debug Play session stopped");

    try {
      await invoke("godot_stop_headless", { sessionId });
    } catch (err) {
      logger.error("DebugPlayService", `Failed to stop Godot: ${err}`);
    }

    const result = this.generateTestResult(session);
    return result;
  }

  /**
   * Capture a screenshot from the running game
   */
  async captureScreenshot(sessionId: string): Promise<GameState> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (!session.isRunning) throw new Error("Session is not running");

    try {
      const result = await invoke<{ screenshot: string; width: number; height: number }>(
        "godot_capture_screenshot",
        { sessionId }
      );

      const gameState: GameState = {
        screenshot: result.screenshot,
        timestamp: Date.now(),
        resolution: { width: result.width, height: result.height },
        description: "Screenshot captured",
      };

      session.currentGameState = gameState;
      session.screenshotCount++;
      this.addLog(sessionId, "screenshot", `Screenshot #${session.screenshotCount} captured`);

      return gameState;
    } catch (err) {
      this.addLog(sessionId, "error", `Failed to capture screenshot: ${err}`);
      throw err;
    }
  }

  /**
   * Get game state data from the running game (without screenshot)
   */
  async getGameState(sessionId: string): Promise<GameState> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (!session.isRunning) throw new Error("Session is not running");

    try {
      const stateData = await invoke<Record<string, unknown>>(
        "godot_get_game_state",
        { sessionId }
      );

      const gameState: GameState = {
        timestamp: Date.now(),
        resolution: { width: 1920, height: 1080 },
        description: "Game state data retrieved",
        data: stateData as any,
      };

      session.currentGameState = gameState;
      this.addLog(sessionId, "info", "Game state data retrieved");

      return gameState;
    } catch (err) {
      this.addLog(sessionId, "error", `Failed to get game state: ${err}`);
      throw err;
    }
  }

  /**
   * Capture both screenshot and game state data
   */
  async captureFullState(sessionId: string): Promise<GameState> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (!session.isRunning) throw new Error("Session is not running");

    try {
      const [screenshotResult, stateData] = await Promise.all([
        invoke<{ screenshot: string; width: number; height: number }>(
          "godot_capture_screenshot",
          { sessionId }
        ),
        invoke<Record<string, unknown>>(
          "godot_get_game_state",
          { sessionId }
        ),
      ]);

      const gameState: GameState = {
        screenshot: screenshotResult.screenshot,
        timestamp: Date.now(),
        resolution: { width: screenshotResult.width, height: screenshotResult.height },
        description: "Full game state captured",
        data: stateData as any,
      };

      session.currentGameState = gameState;
      session.screenshotCount++;
      this.addLog(sessionId, "screenshot", `Full state #${session.screenshotCount} captured (screenshot + data)`);

      return gameState;
    } catch (err) {
      this.addLog(sessionId, "error", `Failed to capture full state: ${err}`);
      throw err;
    }
  }

  /**
   * Send input to the running game
   */
  async sendInput(sessionId: string, input: GameInput): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);
    if (!session.isRunning) throw new Error("Session is not running");

    try {
      await invoke("godot_send_input", {
        sessionId,
        input: JSON.stringify(input),
      });
      this.addLog(sessionId, "info", `Input sent: ${input.action}`);
    } catch (err) {
      this.addLog(sessionId, "error", `Failed to send input: ${err}`);
      throw err;
    }
  }

  /**
   * Get current session
   */
  getSession(sessionId: string): DebugPlaySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get current active session
   */
  getCurrentSession(): DebugPlaySession | undefined {
    return this.currentSessionId ? this.sessions.get(this.currentSessionId) : undefined;
  }

  /**
   * Add a log entry to the session
   */
  private addLog(sessionId: string, type: DebugPlayLog["type"], message: string, data?: unknown): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.testLog.push({
      timestamp: Date.now(),
      type,
      message,
      data,
    });
  }

  /**
   * Add an AI decision to the session
   */
  addAIDecision(sessionId: string, decision: AIDecision): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.aiDecisions.push(decision);
    this.addLog(
      sessionId,
      "ai-action",
      `AI Action: ${decision.action}`,
      { reasoning: decision.reasoning }
    );
  }

  /**
   * Switch control mode between AI and user
   */
  switchControlMode(sessionId: string, mode: "ai" | "user"): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.controlMode = mode;
    this.addLog(
      sessionId,
      "info",
      `Control switched to ${mode.toUpperCase()}`
    );
  }

  /**
   * Get current control mode
   */
  getControlMode(sessionId: string): "ai" | "user" | null {
    const session = this.sessions.get(sessionId);
    return session ? session.controlMode : null;
  }

  /**
   * Add chat message to session
   */
  addChatMessage(sessionId: string, role: "user" | "ai", content: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.chatHistory.push({
      role,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Get chat history
   */
  getChatHistory(sessionId: string): ChatMessage[] {
    const session = this.sessions.get(sessionId);
    return session ? session.chatHistory : [];
  }

  /**
   * Save current game state for repeatable testing
   */
  saveGameState(
    sessionId: string,
    name: string,
    description: string,
    screenshot?: string
  ): SavedGameState {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const savedState: SavedGameState = {
      id: `state-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      timestamp: Date.now(),
      gameStateData: session.currentGameState.data || {},
      screenshot,
      description,
    };

    session.savedStates.push(savedState);
    this.addLog(
      sessionId,
      "info",
      `Game state saved: "${name}"`
    );

    return savedState;
  }

  /**
   * Load a saved game state
   */
  async loadGameState(sessionId: string, savedStateId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const savedState = session.savedStates.find((s) => s.id === savedStateId);
    if (!savedState) throw new Error(`Saved state not found: ${savedStateId}`);

    try {
      await invoke("godot_load_game_state", {
        sessionId,
        stateData: JSON.stringify(savedState.gameStateData),
      });

      this.addLog(
        sessionId,
        "info",
        `Game state loaded: "${savedState.name}"`
      );
    } catch (err) {
      this.addLog(
        sessionId,
        "error",
        `Failed to load game state: ${err}`
      );
      throw err;
    }
  }

  /**
   * Get all saved states for a session
   */
  getSavedStates(sessionId: string): SavedGameState[] {
    const session = this.sessions.get(sessionId);
    return session ? session.savedStates : [];
  }

  /**
   * Delete a saved game state
   */
  deleteSavedState(sessionId: string, savedStateId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const index = session.savedStates.findIndex((s) => s.id === savedStateId);
    if (index >= 0) {
      const deleted = session.savedStates.splice(index, 1)[0];
      this.addLog(
        sessionId,
        "info",
        `Game state deleted: "${deleted.name}"`
      );
    }
  }

  /**
   * Improvement 11: Set test focus areas
   */
  setFocusAreas(sessionId: string, areas: string[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.focusAreas = areas;
    this.addLog(sessionId, "info", `Focus areas set: ${areas.join(", ")}`);
  }

  /**
   * Improvement 12: Track tested features
   */
  markFeatureTested(sessionId: string, feature: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.testedFeatures.add(feature);
  }

  /**
   * Improvement 13: Track untestable features
   */
  markFeatureUntestable(sessionId: string, feature: string, reason: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.untestableFeatures.add(feature);
    this.addLog(sessionId, "warning", `Feature untestable: ${feature} - ${reason}`);
  }

  /**
   * Improvement 14: Set bug severity
   */
  setBugSeverity(sessionId: string, bugName: string, severity: "critical" | "high" | "medium" | "low"): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.bugSeverity.set(bugName, severity);
  }

  /**
   * Improvement 15: Add regression test
   */
  addRegressionTest(sessionId: string, testName: string, passed: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.regressionTests.push({
      name: testName,
      passed,
      timestamp: Date.now(),
    });
  }

  /**
   * Improvement 16: Record AI confidence score
   */
  recordAIConfidence(sessionId: string, score: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.aiConfidenceScores.push(Math.max(0, Math.min(1, score)));
  }

  /**
   * Improvement 17: Add event to timeline
   */
  addTimelineEvent(sessionId: string, event: string, data?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.eventTimeline.push({
      timestamp: Date.now(),
      event,
      data,
    });
  }

  /**
   * Improvement 18: Add breakpoint
   */
  addBreakpoint(sessionId: string, condition: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.breakpoints.push({ condition, enabled: true });
    this.addLog(sessionId, "info", `Breakpoint added: ${condition}`);
  }

  /**
   * Improvement 19: Get test coverage percentage
   */
  getTestCoverage(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    const total = session.testedFeatures.size + session.untestableFeatures.size;
    return total === 0 ? 0 : (session.testedFeatures.size / total) * 100;
  }

  /**
   * Improvement 20: Get average AI confidence
   */
  getAverageAIConfidence(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session || session.aiConfidenceScores.length === 0) return 0;
    const sum = session.aiConfidenceScores.reduce((a, b) => a + b, 0);
    return sum / session.aiConfidenceScores.length;
  }

  /**
   * Improvement 21: Update performance metrics
   */
  updatePerformanceMetrics(sessionId: string, fps: number, memoryUsage: number, cpuUsage: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.performanceMetrics = { fps, memoryUsage, cpuUsage };
  }

  /**
   * Improvement 22: Detect performance issues
   */
  detectPerformanceIssues(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    const issues: string[] = [];
    if (session.performanceMetrics.fps < 30) issues.push("Low FPS detected");
    if (session.performanceMetrics.memoryUsage > 80) issues.push("High memory usage");
    if (session.performanceMetrics.cpuUsage > 90) issues.push("High CPU usage");
    return issues;
  }

  /**
   * Improvement 23: Get session duration
   */
  getSessionDuration(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    return Date.now() - session.startTime;
  }

  /**
   * Improvement 24: Get inputs per second
   */
  getInputsPerSecond(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    const duration = (Date.now() - session.startTime) / 1000;
    return duration === 0 ? 0 : session.totalInputsSent / duration;
  }

  /**
   * Improvement 25: Get bug detection rate
   */
  getBugDetectionRate(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session || session.totalInputsSent === 0) return 0;
    return (session.bugsDetected.length / session.totalInputsSent) * 100;
  }

  /**
   * Improvement 26: Export session data
   */
  exportSessionData(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return "";
    return JSON.stringify({
      id: session.id,
      duration: this.getSessionDuration(sessionId),
      bugsFound: session.bugsDetected.length,
      inputsSent: session.totalInputsSent,
      coverage: this.getTestCoverage(sessionId),
      aiConfidence: this.getAverageAIConfidence(sessionId),
      regressionTests: session.regressionTests,
      timeline: session.eventTimeline,
    }, null, 2);
  }

  /**
   * Improvement 27: Generate test report
   */
  generateTestReport(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return "";
    const duration = this.getSessionDuration(sessionId);
    const coverage = this.getTestCoverage(sessionId);
    const confidence = this.getAverageAIConfidence(sessionId);
    const regressionPass = session.regressionTests.filter(t => t.passed).length;
    
    return `
Debug Play Test Report
======================
Session: ${session.sessionName}
Duration: ${(duration / 1000).toFixed(2)}s
Bugs Found: ${session.bugsDetected.length}
Inputs Sent: ${session.totalInputsSent}
Test Coverage: ${coverage.toFixed(1)}%
AI Confidence: ${(confidence * 100).toFixed(1)}%
Regression Tests: ${regressionPass}/${session.regressionTests.length} passed
Features Tested: ${session.testedFeatures.size}
Untestable Features: ${session.untestableFeatures.size}
    `.trim();
  }

  /**
   * Improvement 28: Filter bugs by severity
   */
  getBugsBySeverity(sessionId: string, severity: "critical" | "high" | "medium" | "low"): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return Array.from(session.bugSeverity.entries())
      .filter(([_, sev]) => sev === severity)
      .map(([bug]) => bug);
  }

  /**
   * Improvement 29: Get critical bugs count
   */
  getCriticalBugsCount(sessionId: string): number {
    return this.getBugsBySeverity(sessionId, "critical").length;
  }

  /**
   * Improvement 30: Check if session has critical bugs
   */
  hasCriticalBugs(sessionId: string): boolean {
    return this.getCriticalBugsCount(sessionId) > 0;
  }

  /**
   * Improvement 31: Set session name and description
   */
  setSessionMetadata(sessionId: string, name: string, description: string, tags: string[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.sessionName = name;
    session.sessionDescription = description;
    session.tags = tags;
  }

  /**
   * Improvement 32: Get session metadata
   */
  getSessionMetadata(sessionId: string): { name: string; description: string; tags: string[] } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return {
      name: session.sessionName,
      description: session.sessionDescription,
      tags: session.tags,
    };
  }

  /**
   * Improvement 33: Apply filters to test log
   */
  filterTestLog(sessionId: string, filters: { type?: string; severity?: string }): DebugPlayLog[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.testLog.filter(log => {
      if (filters.type && log.type !== filters.type) return false;
      return true;
    });
  }

  /**
   * Improvement 34: Get test statistics
   */
  getTestStatistics(sessionId: string): {
    totalLogs: number;
    infoLogs: number;
    warningLogs: number;
    errorLogs: number;
    aiActionLogs: number;
  } {
    const session = this.sessions.get(sessionId);
    if (!session) return { totalLogs: 0, infoLogs: 0, warningLogs: 0, errorLogs: 0, aiActionLogs: 0 };
    
    return {
      totalLogs: session.testLog.length,
      infoLogs: session.testLog.filter(l => l.type === "info").length,
      warningLogs: session.testLog.filter(l => l.type === "warning").length,
      errorLogs: session.testLog.filter(l => l.type === "error").length,
      aiActionLogs: session.testLog.filter(l => l.type === "ai-action").length,
    };
  }

  /**
   * Improvement 35: Compare two sessions
   */
  compareSessions(sessionId1: string, sessionId2: string): {
    session1Bugs: number;
    session2Bugs: number;
    bugDifference: number;
    session1Coverage: number;
    session2Coverage: number;
    coverageDifference: number;
  } | null {
    const session1 = this.sessions.get(sessionId1);
    const session2 = this.sessions.get(sessionId2);
    if (!session1 || !session2) return null;

    const bugs1 = session1.bugsDetected.length;
    const bugs2 = session2.bugsDetected.length;
    const coverage1 = this.getTestCoverage(sessionId1);
    const coverage2 = this.getTestCoverage(sessionId2);

    return {
      session1Bugs: bugs1,
      session2Bugs: bugs2,
      bugDifference: bugs2 - bugs1,
      session1Coverage: coverage1,
      session2Coverage: coverage2,
      coverageDifference: coverage2 - coverage1,
    };
  }

  /**
   * Improvement 36: Enable/disable breakpoint
   */
  toggleBreakpoint(sessionId: string, index: number): void {
    const session = this.sessions.get(sessionId);
    if (!session || !session.breakpoints[index]) return;
    session.breakpoints[index].enabled = !session.breakpoints[index].enabled;
  }

  /**
   * Improvement 37: Get enabled breakpoints
   */
  getEnabledBreakpoints(sessionId: string): Array<{ condition: string; enabled: boolean }> {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.breakpoints.filter(b => b.enabled);
  }

  /**
   * Improvement 38: Clear all breakpoints
   */
  clearBreakpoints(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.breakpoints = [];
    this.addLog(sessionId, "info", "All breakpoints cleared");
  }

  /**
   * Improvement 39: Get regression test pass rate
   */
  getRegressionPassRate(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session || session.regressionTests.length === 0) return 0;
    const passed = session.regressionTests.filter(t => t.passed).length;
    return (passed / session.regressionTests.length) * 100;
  }

  /**
   * Improvement 40: Get most recent bugs
   */
  getMostRecentBugs(sessionId: string, count: number = 5): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.bugsDetected.slice(-count);
  }

  /**
   * Improvement 41: Batch add bugs
   */
  addBugs(sessionId: string, bugs: string[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    bugs.forEach(bug => session.bugsDetected.push(bug));
  }

  /**
   * Improvement 42: Get unique bugs
   */
  getUniqueBugs(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return Array.from(new Set(session.bugsDetected));
  }

  /**
   * Improvement 43: Get bug frequency
   */
  getBugFrequency(sessionId: string): Map<string, number> {
    const session = this.sessions.get(sessionId);
    if (!session) return new Map();
    const frequency = new Map<string, number>();
    session.bugsDetected.forEach(bug => {
      frequency.set(bug, (frequency.get(bug) || 0) + 1);
    });
    return frequency;
  }

  /**
   * Improvement 44: Get most common bug
   */
  getMostCommonBug(sessionId: string): string | null {
    const frequency = this.getBugFrequency(sessionId);
    if (frequency.size === 0) return null;
    let maxBug = null;
    let maxCount = 0;
    frequency.forEach((count, bug) => {
      if (count > maxCount) {
        maxCount = count;
        maxBug = bug;
      }
    });
    return maxBug;
  }

  /**
   * Improvement 45: Increment input counter
   */
  incrementInputCount(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.totalInputsSent++;
  }

  /**
   * Improvement 46: Get test efficiency score
   */
  getTestEfficiencyScore(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session || session.totalInputsSent === 0) return 0;
    const coverage = this.getTestCoverage(sessionId);
    const bugRate = this.getBugDetectionRate(sessionId);
    const confidence = this.getAverageAIConfidence(sessionId);
    return (coverage * 0.4 + bugRate * 0.3 + confidence * 100 * 0.3) / 100;
  }

  /**
   * Improvement 47: Get session health status
   */
  getSessionHealth(sessionId: string): "healthy" | "warning" | "critical" {
    const issues = this.detectPerformanceIssues(sessionId);
    const hasCritical = this.hasCriticalBugs(sessionId);
    if (hasCritical || issues.length > 2) return "critical";
    if (issues.length > 0) return "warning";
    return "healthy";
  }

  /**
   * Improvement 48: Get test progress percentage
   */
  getTestProgress(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    const elapsed = Date.now() - session.startTime;
    const progress = Math.min(100, (elapsed / session.testDuration) * 100);
    return progress;
  }

  /**
   * Improvement 49: Estimate remaining time
   */
  getEstimatedRemainingTime(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session) return 0;
    const elapsed = Date.now() - session.startTime;
    const remaining = Math.max(0, session.testDuration - elapsed);
    return remaining;
  }

  /**
   * Improvement 50: Get comprehensive session summary
   */
  getSessionSummary(sessionId: string): {
    sessionId: string;
    name: string;
    duration: number;
    progress: number;
    bugsFound: number;
    uniqueBugs: number;
    coverage: number;
    aiConfidence: number;
    health: string;
    efficiency: number;
    regressionPassRate: number;
    criticalBugs: number;
    inputsPerSecond: number;
    performanceIssues: string[];
  } | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.id,
      name: session.sessionName,
      duration: this.getSessionDuration(sessionId),
      progress: this.getTestProgress(sessionId),
      bugsFound: session.bugsDetected.length,
      uniqueBugs: this.getUniqueBugs(sessionId).length,
      coverage: this.getTestCoverage(sessionId),
      aiConfidence: this.getAverageAIConfidence(sessionId),
      health: this.getSessionHealth(sessionId),
      efficiency: this.getTestEfficiencyScore(sessionId),
      regressionPassRate: this.getRegressionPassRate(sessionId),
      criticalBugs: this.getCriticalBugsCount(sessionId),
      inputsPerSecond: this.getInputsPerSecond(sessionId),
      performanceIssues: this.detectPerformanceIssues(sessionId),
    };
  }

  /**
   * Generate test result from session
   */
  private generateTestResult(session: DebugPlaySession): GameTestResult {
    const duration = Date.now() - session.startTime;
    const bugsFound = session.testLog
      .filter((log) => log.type === "error")
      .map((log) => log.message);
    const codesFixed = session.aiDecisions
      .filter((d) => d.success)
      .map((d) => d.action);

    return {
      sessionId: session.id,
      duration,
      screenshotsAnalyzed: session.screenshotCount,
      bugsFound,
      codesFixed,
      testsPassed: session.aiDecisions.filter((d) => d.success).length,
      testsFailed: session.aiDecisions.filter((d) => !d.success).length,
      aiDecisions: session.aiDecisions,
    };
  }

  /**
   * Clear all sessions
   */
  clearSessions(): void {
    this.sessions.clear();
    this.currentSessionId = null;
  }
}

// ---------------------------------------------------------------------------
// Game Input Types
// ---------------------------------------------------------------------------

export interface GameInput {
  action: string;
  value?: number | boolean;
  duration?: number; // milliseconds
}

export const COMMON_GAME_INPUTS = {
  // Movement
  moveUp: { action: "ui_up" },
  moveDown: { action: "ui_down" },
  moveLeft: { action: "ui_left" },
  moveRight: { action: "ui_right" },

  // Actions
  jump: { action: "ui_accept" },
  attack: { action: "ui_select" },
  interact: { action: "ui_focus_next" },
  pause: { action: "ui_cancel" },

  // Menu
  confirm: { action: "ui_accept" },
  back: { action: "ui_cancel" },
  nextTab: { action: "ui_right" },
  prevTab: { action: "ui_left" },
};

// Singleton instance
export const debugPlayService = new DebugPlayService();
