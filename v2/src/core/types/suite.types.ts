// ============================================================================
// CryptArtist Studio v2 - Suite Registry & Interop Types
// ============================================================================

export interface SuiteProgramManifest {
  id: string;
  name: string;
  shortCode: string;
  emoji: string;
  route: string;
  description: string;
  category: "creative" | "development" | "automation" | "gaming" | "utilities" | "community" | "settings";
  gradient: string;
  accentColor: string;
  borderHover: string;
  version: string;
  isFlagship?: boolean;
  tags: string[];
}

export type SuiteEventName =
  | "project:saved"
  | "project:loaded"
  | "asset:imported"
  | "ai:key-updated"
  | "vault:unlocked"
  | "vault:locked"
  | "media:selected"
  | "timeline:seek";

export interface ISuiteEventBus {
  emit<T = unknown>(event: SuiteEventName, payload: T): void;
  on<T = unknown>(event: SuiteEventName, handler: (payload: T) => void): () => void;
  off<T = unknown>(event: SuiteEventName, handler: (payload: T) => void): void;
}
