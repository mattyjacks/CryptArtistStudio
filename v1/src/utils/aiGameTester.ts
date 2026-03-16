// ============================================================================
// CryptArtist Studio - AI Game Tester Service
// Uses GPT-4 mini to analyze game screenshots and make intelligent decisions
// ============================================================================

import { chatWithAI } from "./openrouter";
import { logger } from "./logger";
import { AIDecision, GameInput, COMMON_GAME_INPUTS, DebugPlayService } from "./debugPlay";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameAnalysis {
  gameState: string;
  objectsDetected: string[];
  playerStatus: string;
  hazardsDetected: string[];
  objectives: string[];
  nextAction: GameInput;
  reasoning: string;
  confidence: number;
  shouldContinue: boolean;
  bugsDetected: string[];
}

export interface CodeFix {
  filePath: string;
  lineNumber: number;
  originalCode: string;
  fixedCode: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// AI Game Tester Service
// ---------------------------------------------------------------------------

export class AIGameTester {
  private sessionId: string;
  private debugPlayService: DebugPlayService;
  private analysisHistory: GameAnalysis[] = [];
  private maxIterations: number = 50;
  private iterationCount: number = 0;
  private testStartTime: number = 0;
  private maxTestDuration: number = 5 * 60 * 1000; // 5 minutes

  constructor(sessionId: string, debugPlayService: DebugPlayService) {
    this.sessionId = sessionId;
    this.debugPlayService = debugPlayService;
    this.testStartTime = Date.now();
  }

  /**
   * Run automated game testing with AI
   */
  async runAutoTest(): Promise<AIDecision[]> {
    const decisions: AIDecision[] = [];
    this.iterationCount = 0;

    logger.info("AIGameTester", `Starting auto test for session ${this.sessionId}`);

    while (
      this.iterationCount < this.maxIterations &&
      Date.now() - this.testStartTime < this.maxTestDuration
    ) {
      try {
        // Capture screenshot
        const gameState = await this.debugPlayService.captureScreenshot(this.sessionId);

        // Analyze with AI
        const analysis = await this.analyzeGameState(gameState.screenshot);
        this.analysisHistory.push(analysis);

        // Check for bugs
        if (analysis.bugsDetected.length > 0) {
          logger.warn("AIGameTester", `Bugs detected: ${analysis.bugsDetected.join(", ")}`);
        }

        // Send input based on AI decision
        const decision: AIDecision = {
          timestamp: Date.now(),
          observation: analysis.gameState,
          action: analysis.nextAction.action,
          reasoning: analysis.reasoning,
          success: true,
          screenshot: gameState.screenshot,
        };

        await this.debugPlayService.sendInput(this.sessionId, analysis.nextAction);
        this.debugPlayService.addAIDecision(this.sessionId, decision);
        decisions.push(decision);

        // Wait a bit for game to respond
        await this.delay(500);

        // Check if we should continue
        if (!analysis.shouldContinue) {
          logger.info("AIGameTester", "Game test completed - objective achieved or unwinnable state");
          break;
        }

        this.iterationCount++;
      } catch (err) {
        logger.error("AIGameTester", `Error during test iteration: ${err}`);
        break;
      }
    }

    logger.info("AIGameTester", `Auto test completed after ${this.iterationCount} iterations`);
    return decisions;
  }

  /**
   * Analyze game state from screenshot or game state data using AI
   */
  async analyzeGameState(screenshotBase64?: string, gameStateData?: any): Promise<GameAnalysis> {
    try {
      let context = "";
      if (screenshotBase64) {
        context = `\n\nScreenshot (base64): ${screenshotBase64.substring(0, 100)}...`;
      }
      if (gameStateData) {
        context += `\n\nGame State Data:\n${JSON.stringify(gameStateData, null, 2)}`;
      }

      const prompt = `You are an expert game tester and AI. Analyze this game state and provide a detailed analysis.

IMPORTANT: Respond with ONLY valid JSON, no markdown, no extra text.

Analyze the game state and return a JSON object with this exact structure:
{
  "gameState": "brief description of current game state",
  "objectsDetected": ["list", "of", "visible", "objects"],
  "playerStatus": "description of player character status (position, health, state)",
  "hazardsDetected": ["list", "of", "dangers", "or", "obstacles"],
  "objectives": ["what", "the", "player", "should", "do", "next"],
  "nextAction": {
    "action": "one of: ui_up, ui_down, ui_left, ui_right, ui_accept, ui_select, ui_focus_next, ui_cancel",
    "duration": 100
  },
  "reasoning": "explain why you chose this action",
  "confidence": 0.85,
  "shouldContinue": true,
  "bugsDetected": ["any", "bugs", "or", "issues", "found"]
}
${context}

Respond with ONLY the JSON object.`;

      const response = await chatWithAI(prompt, { action: "game-dev" });

      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const analysis = JSON.parse(jsonMatch[0]) as GameAnalysis;
      return analysis;
    } catch (err) {
      logger.error("AIGameTester", `Failed to analyze game state: ${err}`);
      // Return safe default
      return {
        gameState: "Unable to analyze",
        objectsDetected: [],
        playerStatus: "Unknown",
        hazardsDetected: [],
        objectives: ["Continue testing"],
        nextAction: COMMON_GAME_INPUTS.moveRight,
        reasoning: "Default action due to analysis failure",
        confidence: 0.1,
        shouldContinue: true,
        bugsDetected: [],
      };
    }
  }

  /**
   * Analyze bugs and suggest code fixes
   */
  async suggestCodeFixes(
    bugsDetected: string[],
    codeContext: string,
    filePath: string
  ): Promise<CodeFix[]> {
    if (bugsDetected.length === 0) return [];

    try {
      const prompt = `You are a senior game developer. Analyze these bugs detected during game testing and suggest code fixes.

Bugs detected:
${bugsDetected.map((b) => `- ${b}`).join("\n")}

Current code (${filePath}):
\`\`\`gdscript
${codeContext}
\`\`\`

For each bug, provide a fix in this JSON format:
[
  {
    "filePath": "${filePath}",
    "lineNumber": 10,
    "originalCode": "var speed = 100",
    "fixedCode": "var speed = 200",
    "explanation": "Increased speed to match game balance"
  }
]

Respond with ONLY the JSON array.`;

      const response = await chatWithAI(prompt, { action: "coding-planner" });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const fixes = JSON.parse(jsonMatch[0]) as CodeFix[];
      return fixes;
    } catch (err) {
      logger.error("AIGameTester", `Failed to suggest code fixes: ${err}`);
      return [];
    }
  }

  /**
   * Generate test report
   */
  generateTestReport(): string {
    const duration = Date.now() - this.testStartTime;
    const durationSeconds = Math.round(duration / 1000);

    let report = `# Game Test Report\n\n`;
    report += `**Duration**: ${durationSeconds}s\n`;
    report += `**Iterations**: ${this.iterationCount}\n`;
    report += `**Screenshots Analyzed**: ${this.analysisHistory.length}\n\n`;

    // Summary of findings
    const allBugs = new Set<string>();
    this.analysisHistory.forEach((analysis) => {
      analysis.bugsDetected.forEach((bug) => allBugs.add(bug));
    });

    if (allBugs.size > 0) {
      report += `## Bugs Found\n`;
      allBugs.forEach((bug) => {
        report += `- ${bug}\n`;
      });
      report += "\n";
    }

    // Game states encountered
    report += `## Game States Encountered\n`;
    const uniqueStates = new Set(this.analysisHistory.map((a) => a.gameState));
    uniqueStates.forEach((state) => {
      report += `- ${state}\n`;
    });

    // Actions taken
    report += `\n## Actions Taken\n`;
    const actionCounts = new Map<string, number>();
    this.analysisHistory.forEach((analysis) => {
      const action = analysis.nextAction.action;
      actionCounts.set(action, (actionCounts.get(action) || 0) + 1);
    });
    actionCounts.forEach((count, action) => {
      report += `- ${action}: ${count} times\n`;
    });

    return report;
  }

  /**
   * Get analysis history
   */
  getAnalysisHistory(): GameAnalysis[] {
    return this.analysisHistory;
  }

  /**
   * Utility: delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Create and run a game tester for a session
 */
export async function createAndRunGameTester(
  sessionId: string,
  debugPlayService: DebugPlayService
): Promise<{ tester: AIGameTester; decisions: AIDecision[] }> {
  const tester = new AIGameTester(sessionId, debugPlayService);
  const decisions = await tester.runAutoTest();
  return { tester, decisions };
}
