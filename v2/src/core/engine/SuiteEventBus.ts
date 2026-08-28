import { ISuiteEventBus, SuiteEventName } from "../types/suite.types";

export class SuiteEventBus implements ISuiteEventBus {
  private handlers: Map<SuiteEventName, Set<(payload: any) => void>> = new Map();

  emit<T = unknown>(event: SuiteEventName, payload: T): void {
    const list = this.handlers.get(event);
    if (list) {
      list.forEach((fn) => {
        try {
          fn(payload);
        } catch (e) {
          console.error(`[EventBus] Error in handler for ${event}:`, e);
        }
      });
    }
  }

  on<T = unknown>(event: SuiteEventName, handler: (payload: T) => void): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: SuiteEventName, handler: (payload: T) => void): void {
    const list = this.handlers.get(event);
    if (list) {
      list.delete(handler);
    }
  }
}

export const suiteEventBus = new SuiteEventBus();
