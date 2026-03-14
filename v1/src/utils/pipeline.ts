// ============================================================================
// CryptArtist Studio - Cross-Program Pipeline System
// Defines reusable workflows that chain operations across multiple programs.
// For example: MediaMogul exports sprite -> GameStudio imports as texture ->
// VibeCodeWorker generates animation code -> GameStudio creates scene.
// ============================================================================

import { interopBus } from "./interop";
import type { InteropProgram, InteropEventType } from "./interop";
import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineStepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface PipelineStep {
  /** Unique step ID */
  id: string;
  /** Human-readable step name */
  name: string;
  /** Which program handles this step */
  program: InteropProgram;
  /** Event to emit to trigger this step */
  triggerEvent: InteropEventType;
  /** Event to listen for to know this step completed */
  completionEvent: InteropEventType;
  /** Transform function to map previous step output to this step's input */
  inputTransform?: (prevOutput: unknown) => unknown;
  /** Timeout in ms (default 30000) */
  timeoutMs?: number;
  /** Whether this step can be skipped on failure */
  optional?: boolean;
  /** Current status */
  status: PipelineStepStatus;
  /** Step output data */
  output?: unknown;
  /** Error message if failed */
  error?: string;
}

export interface PipelineDefinition {
  /** Unique pipeline ID */
  id: string;
  /** Human-readable pipeline name */
  name: string;
  /** Description of what this pipeline does */
  description: string;
  /** Ordered steps */
  steps: Omit<PipelineStep, "status" | "output" | "error">[];
  /** Pipeline icon emoji */
  icon?: string;
  /** Tags for categorization */
  tags?: string[];
}

export type PipelineStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface PipelineRun {
  /** Run instance ID */
  runId: string;
  /** Pipeline definition ID */
  pipelineId: string;
  /** Pipeline name */
  name: string;
  /** Current status */
  status: PipelineStatus;
  /** Steps with runtime state */
  steps: PipelineStep[];
  /** Index of the currently executing step */
  currentStepIndex: number;
  /** Initial input data */
  input: unknown;
  /** Final output data */
  output?: unknown;
  /** When the run started */
  startedAt: number;
  /** When the run finished */
  finishedAt?: number;
  /** Error message if failed */
  error?: string;
}

// ---------------------------------------------------------------------------
// Built-in Pipeline Definitions
// ---------------------------------------------------------------------------

export const BUILTIN_PIPELINES: PipelineDefinition[] = [
  {
    id: "media-to-game-asset",
    name: "Media to Game Asset",
    description: "Export media from Media Mogul and import as a game asset in GameStudio",
    icon: "\u{1F3A8}\u2192\u{1F3AE}",
    tags: ["media", "game", "asset"],
    steps: [
      {
        id: "export-media",
        name: "Export from Media Mogul",
        program: "media-mogul",
        triggerEvent: "media:exported",
        completionEvent: "media:exported",
      },
      {
        id: "import-to-game",
        name: "Import to GameStudio",
        program: "game-studio",
        triggerEvent: "game:asset-imported",
        completionEvent: "game:asset-imported",
      },
    ],
  },
  {
    id: "ai-code-to-game",
    name: "AI Code to Game Script",
    description: "Generate code in VibeCodeWorker and apply it as a GDScript in GameStudio",
    icon: "\u{1F469}\u200D\u{1F4BB}\u2192\u{1F3AE}",
    tags: ["code", "game", "ai"],
    steps: [
      {
        id: "generate-code",
        name: "AI generates GDScript",
        program: "vibecode-worker",
        triggerEvent: "code:snippet-created",
        completionEvent: "code:snippet-created",
      },
      {
        id: "apply-to-game",
        name: "Apply script to GameStudio",
        program: "game-studio",
        triggerEvent: "game:script-generated",
        completionEvent: "game:script-generated",
      },
    ],
  },
  {
    id: "record-and-narrate",
    name: "Record and Narrate",
    description: "Record screen with DemoRecorder, then add AI narration via Media Mogul",
    icon: "\u{1F3A5}\u2192\u{1F4FA}",
    tags: ["record", "narrate", "media"],
    steps: [
      {
        id: "record-screen",
        name: "Record screen",
        program: "demo-recorder",
        triggerEvent: "recording:started",
        completionEvent: "recording:stopped",
      },
      {
        id: "export-recording",
        name: "Export recording",
        program: "demo-recorder",
        triggerEvent: "recording:exported",
        completionEvent: "recording:exported",
      },
      {
        id: "add-narration",
        name: "Add AI narration in Media Mogul",
        program: "media-mogul",
        triggerEvent: "media:imported",
        completionEvent: "media:audio-generated",
        optional: true,
      },
    ],
  },
  {
    id: "agent-full-stack",
    name: "Agent Full-Stack Build",
    description: "ValleyNet agent plans a feature, VibeCodeWorker writes code, GameStudio integrates",
    icon: "\u{1F916}\u2192\u{1F469}\u200D\u{1F4BB}\u2192\u{1F3AE}",
    tags: ["agent", "code", "game", "automation"],
    steps: [
      {
        id: "agent-plan",
        name: "Agent plans the feature",
        program: "valley-net",
        triggerEvent: "agent:task-started",
        completionEvent: "agent:task-completed",
      },
      {
        id: "write-code",
        name: "Generate code",
        program: "vibecode-worker",
        triggerEvent: "code:snippet-created",
        completionEvent: "code:file-saved",
      },
      {
        id: "integrate-game",
        name: "Integrate into game project",
        program: "game-studio",
        triggerEvent: "game:script-generated",
        completionEvent: "game:scene-created",
        optional: true,
      },
    ],
  },
  {
    id: "game-clone-pipeline",
    name: "Video Game Clone Pipeline",
    description: "Clone a game: research mechanics, generate emoji graphics, produce code, build Godot project",
    icon: "\u{1F3AE}\u2192\u{1F4A1}\u2192\u{1F680}",
    tags: ["clone", "game", "ai", "pipeline"],
    steps: [
      {
        id: "research",
        name: "Research game mechanics",
        program: "valley-net",
        triggerEvent: "agent:task-started",
        completionEvent: "agent:task-completed",
      },
      {
        id: "generate-assets",
        name: "Generate emoji/AI assets",
        program: "media-mogul",
        triggerEvent: "media:image-generated",
        completionEvent: "media:exported",
        optional: true,
      },
      {
        id: "generate-code",
        name: "Generate GDScript code",
        program: "vibecode-worker",
        triggerEvent: "code:snippet-created",
        completionEvent: "code:file-saved",
      },
      {
        id: "build-project",
        name: "Build Godot project",
        program: "game-studio",
        triggerEvent: "game:clone-started",
        completionEvent: "game:clone-finished",
      },
    ],
  },
  {
    id: "media-podcast-pipeline",
    name: "AI Podcast Pipeline",
    description: "Write script with AI, generate voiceover with ElevenLabs, add SFX, export final audio",
    icon: "\u{1F3D9}\u2192\u{1F399}\u2192\u{1F3B5}",
    tags: ["podcast", "audio", "ai", "elevenlabs"],
    steps: [
      {
        id: "write-script",
        name: "AI generates podcast script",
        program: "valley-net",
        triggerEvent: "agent:task-started",
        completionEvent: "agent:task-completed",
      },
      {
        id: "generate-voiceover",
        name: "ElevenLabs TTS voiceover",
        program: "media-mogul",
        triggerEvent: "media:audio-generated",
        completionEvent: "media:audio-generated",
      },
      {
        id: "add-sfx",
        name: "Generate sound effects",
        program: "media-mogul",
        triggerEvent: "media:audio-generated",
        completionEvent: "media:exported",
        optional: true,
      },
    ],
  },
  {
    id: "ai-image-edit-pipeline",
    name: "AI Image Edit Pipeline",
    description: "Generate an image with AI, edit in DictatePic, then import to Media Mogul or GameStudio",
    icon: "\u{1F916}\u2192\u{1F967}\u2192\u{1F3AE}",
    tags: ["image", "ai", "edit", "dictatepic"],
    steps: [
      {
        id: "ai-generate",
        name: "Generate base image with AI",
        program: "dictate-pic",
        triggerEvent: "image:generated",
        completionEvent: "image:generated",
      },
      {
        id: "edit-image",
        name: "Edit and refine in DictatePic",
        program: "dictate-pic",
        triggerEvent: "image:edited",
        completionEvent: "image:edited",
      },
      {
        id: "import-asset",
        name: "Import as game asset",
        program: "game-studio",
        triggerEvent: "game:asset-imported",
        completionEvent: "game:asset-imported",
        optional: true,
      },
    ],
  },
  {
    id: "build-and-deploy",
    name: "Build and Deploy",
    description: "Write code in VibeCodeWorker, test in GameStudio, then build installers with Clone Tool",
    icon: "\u{1F469}\u200D\u{1F4BB}\u2192\u{1F3AE}\u2192\u{1F4E6}",
    tags: ["build", "deploy", "clone", "installer"],
    steps: [
      {
        id: "write-code",
        name: "Write or generate code",
        program: "vibecode-worker",
        triggerEvent: "code:snippet-created",
        completionEvent: "code:file-saved",
      },
      {
        id: "test-game",
        name: "Test in GameStudio",
        program: "game-studio",
        triggerEvent: "game:scene-created",
        completionEvent: "game:project-exported",
        optional: true,
      },
      {
        id: "build-installer",
        name: "Build installers with Clone Tool",
        program: "clone-tool",
        triggerEvent: "build:started",
        completionEvent: "build:completed",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Pipeline Runner
// ---------------------------------------------------------------------------

class PipelineRunner {
  private runs: PipelineRun[] = [];
  private definitions: PipelineDefinition[] = [...BUILTIN_PIPELINES];
  private maxRuns = 20;
  private counter = 0;

  /**
   * Register a custom pipeline definition.
   */
  register(definition: PipelineDefinition): void {
    const existing = this.definitions.findIndex((d) => d.id === definition.id);
    if (existing >= 0) {
      this.definitions[existing] = definition;
    } else {
      this.definitions.push(definition);
    }
    logger.info("Pipeline", `Registered pipeline: ${definition.name}`);
  }

  /**
   * Get all registered pipeline definitions.
   */
  getDefinitions(): PipelineDefinition[] {
    return [...this.definitions];
  }

  /**
   * Get a pipeline definition by ID.
   */
  getDefinition(id: string): PipelineDefinition | null {
    return this.definitions.find((d) => d.id === id) ?? null;
  }

  /**
   * Start a pipeline run.
   */
  start(pipelineId: string, input?: unknown): PipelineRun | null {
    const definition = this.getDefinition(pipelineId);
    if (!definition) {
      logger.error("Pipeline", `Pipeline not found: ${pipelineId}`);
      return null;
    }

    const run: PipelineRun = {
      runId: `run-${++this.counter}-${Date.now()}`,
      pipelineId,
      name: definition.name,
      status: "running",
      steps: definition.steps.map((s) => ({
        ...s,
        status: "pending" as PipelineStepStatus,
      })),
      currentStepIndex: 0,
      input,
      startedAt: Date.now(),
    };

    this.runs.unshift(run);
    if (this.runs.length > this.maxRuns) {
      this.runs = this.runs.slice(0, this.maxRuns);
    }

    logger.action("Pipeline", `Started pipeline: ${definition.name} (${run.runId})`);

    interopBus.emit("pipeline:step-completed", "system", {
      runId: run.runId,
      pipelineId,
      stepIndex: -1,
      stepName: "Pipeline started",
      status: "running",
    });

    // Mark first step as running
    if (run.steps.length > 0) {
      run.steps[0].status = "running";
    }

    return run;
  }

  /**
   * Advance a pipeline run to the next step (called when a step completes).
   */
  advanceStep(runId: string, stepOutput?: unknown): PipelineRun | null {
    const run = this.runs.find((r) => r.runId === runId);
    if (!run || run.status !== "running") return null;

    const currentStep = run.steps[run.currentStepIndex];
    if (currentStep) {
      currentStep.status = "completed";
      currentStep.output = stepOutput;
    }

    interopBus.emit("pipeline:step-completed", "system", {
      runId,
      pipelineId: run.pipelineId,
      stepIndex: run.currentStepIndex,
      stepName: currentStep?.name,
      status: "completed",
    });

    // Move to next step
    run.currentStepIndex++;

    if (run.currentStepIndex >= run.steps.length) {
      // Pipeline complete
      run.status = "completed";
      run.output = stepOutput;
      run.finishedAt = Date.now();
      logger.action("Pipeline", `Pipeline completed: ${run.name} (${run.runId})`);
      interopBus.emit("pipeline:finished", "system", { runId, pipelineId: run.pipelineId, name: run.name });
    } else {
      // Start next step
      run.steps[run.currentStepIndex].status = "running";
    }

    return run;
  }

  /**
   * Fail a pipeline step.
   */
  failStep(runId: string, error: string): PipelineRun | null {
    const run = this.runs.find((r) => r.runId === runId);
    if (!run || run.status !== "running") return null;

    const currentStep = run.steps[run.currentStepIndex];
    if (currentStep) {
      currentStep.status = "failed";
      currentStep.error = error;

      if (currentStep.optional) {
        // Skip optional step and continue
        currentStep.status = "skipped";
        return this.advanceStep(runId);
      }
    }

    run.status = "failed";
    run.error = error;
    run.finishedAt = Date.now();
    logger.error("Pipeline", `Pipeline failed: ${run.name} - ${error}`);
    interopBus.emit("pipeline:failed", "system", { runId, pipelineId: run.pipelineId, name: run.name, error });

    return run;
  }

  /**
   * Cancel a running pipeline.
   */
  cancel(runId: string): void {
    const run = this.runs.find((r) => r.runId === runId);
    if (run && run.status === "running") {
      run.status = "cancelled";
      run.finishedAt = Date.now();
      const currentStep = run.steps[run.currentStepIndex];
      if (currentStep) currentStep.status = "skipped";
      logger.action("Pipeline", `Pipeline cancelled: ${run.name}`);
    }
  }

  /**
   * Get all pipeline runs.
   */
  getRuns(filter?: { status?: PipelineStatus; pipelineId?: string }): PipelineRun[] {
    let runs = [...this.runs];
    if (filter?.status) runs = runs.filter((r) => r.status === filter.status);
    if (filter?.pipelineId) runs = runs.filter((r) => r.pipelineId === filter.pipelineId);
    return runs;
  }

  /**
   * Get a specific run.
   */
  getRun(runId: string): PipelineRun | null {
    return this.runs.find((r) => r.runId === runId) ?? null;
  }
}

// Global singleton
export const pipelineRunner = new PipelineRunner();
