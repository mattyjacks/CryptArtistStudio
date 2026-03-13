// ============================================================================
// CryptArtist Studio - Shared API Key Context
// Centralized API key management so keys are loaded once from the Rust backend
// and shared across all programs via React context. Eliminates redundant
// invoke("get_api_key") calls in every program's useEffect.
// ============================================================================

import { createContext, useContext } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logger } from "./logger";
import { interopBus } from "./interop";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKeyState {
  /** OpenAI / OpenAI-compatible API key */
  openaiKey: string;
  /** OpenRouter API key */
  openrouterKey: string;
  /** Pexels stock media API key */
  pexelsKey: string;
  /** Supabase / GiveGigs key */
  supabaseKey: string;
  /** ElevenLabs audio API key */
  elevenlabsKey: string;
  /** Whether keys have been loaded from backend */
  loaded: boolean;
  /** Loading state */
  loading: boolean;
}

export interface ApiKeyActions {
  /** Reload all keys from the Rust backend */
  refreshKeys: () => Promise<void>;
  /** Update a specific key (saves to backend and updates context) */
  setKey: (keyName: ApiKeyName, value: string) => Promise<void>;
  /** Check if a specific key is configured */
  hasKey: (keyName: ApiKeyName) => boolean;
  /** Get a summary of which keys are configured */
  getKeyStatus: () => Record<ApiKeyName, boolean>;
}

export type ApiKeyName = "openai" | "openrouter" | "pexels" | "supabase" | "elevenlabs";

export type ApiKeyContextType = ApiKeyState & ApiKeyActions;

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

export const defaultApiKeyState: ApiKeyState = {
  openaiKey: "",
  openrouterKey: "",
  pexelsKey: "",
  supabaseKey: "",
  elevenlabsKey: "",
  loaded: false,
  loading: false,
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const ApiKeyContext = createContext<ApiKeyContextType>({
  ...defaultApiKeyState,
  refreshKeys: async () => {},
  setKey: async () => {},
  hasKey: () => false,
  getKeyStatus: () => ({
    openai: false,
    openrouter: false,
    pexels: false,
    supabase: false,
    elevenlabs: false,
  }),
});

export function useApiKeys(): ApiKeyContextType {
  return useContext(ApiKeyContext);
}

// ---------------------------------------------------------------------------
// Backend key fetchers (used by the provider)
// ---------------------------------------------------------------------------

const KEY_COMMANDS: Record<ApiKeyName, { get: string; save: string; stateField: keyof ApiKeyState }> = {
  openai: { get: "get_api_key", save: "save_api_key", stateField: "openaiKey" },
  openrouter: { get: "get_openrouter_key", save: "save_openrouter_key", stateField: "openrouterKey" },
  pexels: { get: "get_pexels_key", save: "save_pexels_key", stateField: "pexelsKey" },
  supabase: { get: "get_supabase_key", save: "save_supabase_key", stateField: "supabaseKey" },
  elevenlabs: { get: "get_elevenlabs_key", save: "save_elevenlabs_key", stateField: "elevenlabsKey" },
};

export async function loadAllKeys(): Promise<Partial<ApiKeyState>> {
  const results: Partial<ApiKeyState> = {};

  const entries = Object.entries(KEY_COMMANDS) as [ApiKeyName, typeof KEY_COMMANDS[ApiKeyName]][];

  await Promise.allSettled(
    entries.map(async ([_name, cmd]) => {
      try {
        const key = await invoke<string>(cmd.get);
        if (key) {
          (results as Record<string, string>)[cmd.stateField] = key;
        }
      } catch {
        // Key not configured - that's fine
      }
    })
  );

  logger.info("ApiKeys", `Loaded keys: ${entries.map(([n]) => n).filter((n) => (results as Record<string, string>)[KEY_COMMANDS[n].stateField]).join(", ") || "none"}`);

  return results;
}

export async function saveKey(keyName: ApiKeyName, value: string): Promise<void> {
  const cmd = KEY_COMMANDS[keyName];
  if (!cmd) throw new Error(`Unknown key name: ${keyName}`);

  await invoke(cmd.save, { key: value });
  logger.action("ApiKeys", `Saved ${keyName} key`);

  // Notify other programs that a key was updated
  interopBus.emit("ai:key-updated", "settings", { keyName, hasValue: !!value });
}

export { KEY_COMMANDS };
