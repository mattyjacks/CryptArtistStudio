// ============================================================================
// CryptArtist Studio - Cross-Program Interoperability Event Bus
// Enables pub/sub communication between all programs in the suite.
// Programs can emit events and subscribe to events from other programs.
// ============================================================================

import { logger } from "./logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type InteropProgram =
  | "media-mogul"
  | "vibecode-worker"
  | "demo-recorder"
  | "valley-net"
  | "game-studio"
  | "commander"
  | "settings"
  | "suite-launcher"
  | "donate-personal-seconds"
  | "clone-tool"
  | "dictate-pic"
  | "luck-factory"
  | "system";

export type InteropEventType =
  // Media events
  | "media:exported"
  | "media:imported"
  | "media:thumbnail-generated"
  | "media:audio-generated"
  | "media:image-generated"
  // Code events
  | "code:file-saved"
  | "code:file-opened"
  | "code:snippet-created"
  | "code:project-opened"
  // Game events
  | "game:asset-imported"
  | "game:script-generated"
  | "game:scene-created"
  | "game:project-exported"
  | "game:clone-started"
  | "game:clone-finished"
  // Recording events
  | "recording:started"
  | "recording:stopped"
  | "recording:exported"
  | "recording:screenshot-taken"
  // Agent events
  | "agent:task-started"
  | "agent:task-completed"
  | "agent:task-failed"
  | "agent:skill-invoked"
  // AI events
  | "ai:response-received"
  | "ai:model-changed"
  | "ai:key-updated"
  // Workspace events
  | "workspace:opened"
  | "workspace:closed"
  | "workspace:switched"
  | "workspace:saved"
  // System events
  | "system:theme-changed"
  | "system:settings-updated"
  | "system:error"
  | "system:notification"
  // Pipeline events
  | "pipeline:step-completed"
  | "pipeline:finished"
  | "pipeline:failed"
  // Image editing events (DictatePic)
  | "image:edited"
  | "image:generated"
  | "image:inpainted"
  | "image:upscaled"
  | "image:style-transferred"
  // Luck events
  | "luck:seed-generated"
  | "luck:mode-changed"
  // Clone/build events
  | "build:started"
  | "build:completed"
  | "build:failed"
  // Donation events
  | "donation:session-started"
  | "donation:session-stopped"
  | "donation:task-posted"
  | "donation:task-claimed"
  // Clipboard events
  | "clipboard:copied"
  | "clipboard:pasted"
  // Navigation events
  | "nav:program-switched"
  | "nav:requested";

export interface InteropEvent<T = unknown> {
  /** Unique event ID */
  id: string;
  /** Event type */
  type: InteropEventType;
  /** Source program that emitted the event */
  source: InteropProgram;
  /** Target program(s) - null means broadcast to all */
  target: InteropProgram | InteropProgram[] | null;
  /** Event payload data */
  data: T;
  /** Timestamp */
  timestamp: number;
  /** Optional correlation ID for request-response patterns */
  correlationId?: string;
}

export type InteropHandler<T = unknown> = (event: InteropEvent<T>) => void;

interface Subscription {
  id: string;
  eventType: InteropEventType | "*";
  handler: InteropHandler;
  source?: InteropProgram;
  target?: InteropProgram;
}

// ---------------------------------------------------------------------------
// Event Bus Singleton
// ---------------------------------------------------------------------------

class InteropBus {
  private subscriptions: Subscription[] = [];
  private eventHistory: InteropEvent[] = [];
  private maxHistory = 200;
  private eventCounter = 0;

  /**
   * Subscribe to events.
   * @param eventType - Event type to listen for, or "*" for all events
   * @param handler - Callback function
   * @param options - Optional filters for source/target program
   * @returns Unsubscribe function
   */
  on<T = unknown>(
    eventType: InteropEventType | "*",
    handler: InteropHandler<T>,
    options?: { source?: InteropProgram; target?: InteropProgram }
  ): () => void {
    const sub: Subscription = {
      id: `sub-${++this.eventCounter}-${Date.now()}`,
      eventType,
      handler: handler as InteropHandler,
      source: options?.source,
      target: options?.target,
    };
    this.subscriptions.push(sub);

    // Return unsubscribe function
    return () => {
      this.subscriptions = this.subscriptions.filter((s) => s.id !== sub.id);
    };
  }

  /**
   * Subscribe to an event type only once.
   */
  once<T = unknown>(
    eventType: InteropEventType,
    handler: InteropHandler<T>,
    options?: { source?: InteropProgram; target?: InteropProgram }
  ): () => void {
    const unsub = this.on<T>(eventType, (event) => {
      handler(event);
      unsub();
    }, options);
    return unsub;
  }

  /**
   * Emit an event to the bus.
   */
  emit<T = unknown>(
    type: InteropEventType,
    source: InteropProgram,
    data: T,
    options?: { target?: InteropProgram | InteropProgram[] | null; correlationId?: string }
  ): string {
    const event: InteropEvent<T> = {
      id: `evt-${++this.eventCounter}-${Date.now()}`,
      type,
      source,
      target: options?.target ?? null,
      data,
      timestamp: Date.now(),
      correlationId: options?.correlationId,
    };

    // Store in history
    this.eventHistory.push(event as InteropEvent);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistory);
    }

    logger.action("InteropBus", `${source} -> ${type}: ${JSON.stringify(data).slice(0, 80)}`);

    // Dispatch to matching subscribers
    for (const sub of this.subscriptions) {
      // Check event type match
      if (sub.eventType !== "*" && sub.eventType !== type) continue;

      // Check source filter
      if (sub.source && sub.source !== source) continue;

      // Check target filter
      if (sub.target) {
        const targets = Array.isArray(event.target) ? event.target : event.target ? [event.target] : [];
        if (targets.length > 0 && !targets.includes(sub.target)) continue;
      }

      try {
        sub.handler(event as InteropEvent);
      } catch (err) {
        logger.error("InteropBus", `Handler error for ${type}: ${err}`);
      }
    }

    return event.id;
  }

  /**
   * Request-response pattern: emit and wait for a correlated response.
   */
  request<TReq = unknown, TRes = unknown>(
    type: InteropEventType,
    source: InteropProgram,
    data: TReq,
    responseType: InteropEventType,
    target?: InteropProgram,
    timeoutMs = 10000
  ): Promise<InteropEvent<TRes>> {
    return new Promise((resolve, reject) => {
      const correlationId = `req-${++this.eventCounter}-${Date.now()}`;

      const timer = setTimeout(() => {
        unsub();
        reject(new Error(`InteropBus request timeout: ${type} -> ${responseType}`));
      }, timeoutMs);

      const unsub = this.on<TRes>(responseType, (event) => {
        if (event.correlationId === correlationId) {
          clearTimeout(timer);
          unsub();
          resolve(event);
        }
      });

      this.emit(type, source, data, { target, correlationId });
    });
  }

  /**
   * Get event history, optionally filtered.
   */
  getHistory(filter?: {
    type?: InteropEventType;
    source?: InteropProgram;
    limit?: number;
  }): InteropEvent[] {
    let history = [...this.eventHistory];
    if (filter?.type) history = history.filter((e) => e.type === filter.type);
    if (filter?.source) history = history.filter((e) => e.source === filter.source);
    if (filter?.limit) history = history.slice(-filter.limit);
    return history;
  }

  /**
   * Clear all subscriptions (useful for cleanup).
   */
  clearAll(): void {
    this.subscriptions = [];
  }

  /**
   * Get subscriber count for debugging.
   */
  getSubscriberCount(): number {
    return this.subscriptions.length;
  }
}

// Global singleton
export const interopBus = new InteropBus();

// ---------------------------------------------------------------------------
// React Hook for easy subscription in components
// ---------------------------------------------------------------------------

import { useEffect, useCallback } from "react";

/**
 * React hook to subscribe to interop events.
 * Automatically unsubscribes on unmount.
 *
 * @example
 * useInterop("media:exported", (event) => {
 *   console.log("Media exported from", event.source, event.data);
 * }, { target: "game-studio" });
 */
export function useInterop<T = unknown>(
  eventType: InteropEventType | "*",
  handler: InteropHandler<T>,
  options?: { source?: InteropProgram; target?: InteropProgram }
): void {
  useEffect(() => {
    return interopBus.on<T>(eventType, handler, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventType, options?.source, options?.target]);
}

/**
 * React hook to get an emit function bound to a specific program.
 *
 * @example
 * const emit = useInteropEmit("media-mogul");
 * emit("media:exported", { path: "/path/to/file.png", type: "image" });
 */
export function useInteropEmit(source: InteropProgram) {
  return useCallback(
    <T = unknown>(
      type: InteropEventType,
      data: T,
      options?: { target?: InteropProgram | InteropProgram[] | null; correlationId?: string }
    ) => interopBus.emit(type, source, data, options),
    [source]
  );
}
