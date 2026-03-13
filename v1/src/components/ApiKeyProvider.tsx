// ============================================================================
// CryptArtist Studio - API Key Provider
// Loads all API keys from the Rust backend once at app startup and provides
// them via React context to all programs. Eliminates redundant per-program
// invoke("get_api_key") calls.
// ============================================================================

import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  ApiKeyContext,
  defaultApiKeyState,
  loadAllKeys,
  saveKey,
  type ApiKeyName,
  type ApiKeyState,
} from "../utils/apiKeys";
import { useInterop } from "../utils/interop";

interface ApiKeyProviderProps {
  children: ReactNode;
}

export function ApiKeyProvider({ children }: ApiKeyProviderProps) {
  const [state, setState] = useState<ApiKeyState>(defaultApiKeyState);

  // Load all keys on mount
  useEffect(() => {
    setState((prev) => ({ ...prev, loading: true }));
    loadAllKeys()
      .then((keys) => {
        setState((prev) => ({
          ...prev,
          ...keys,
          loaded: true,
          loading: false,
        }));
      })
      .catch(() => {
        setState((prev) => ({ ...prev, loaded: true, loading: false }));
      });
  }, []);

  // Listen for key updates from Settings or other programs
  useInterop("ai:key-updated", () => {
    // Reload all keys when any key is updated
    loadAllKeys().then((keys) => {
      setState((prev) => ({ ...prev, ...keys }));
    });
  });

  const refreshKeys = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const keys = await loadAllKeys();
    setState((prev) => ({ ...prev, ...keys, loading: false }));
  }, []);

  const setKey = useCallback(async (keyName: ApiKeyName, value: string) => {
    await saveKey(keyName, value);
    // Update local state immediately
    const fieldMap: Record<ApiKeyName, keyof ApiKeyState> = {
      openai: "openaiKey",
      openrouter: "openrouterKey",
      pexels: "pexelsKey",
      supabase: "supabaseKey",
      elevenlabs: "elevenlabsKey",
    };
    const field = fieldMap[keyName];
    if (field) {
      setState((prev) => ({ ...prev, [field]: value }));
    }
  }, []);

  const hasKey = useCallback(
    (keyName: ApiKeyName): boolean => {
      const fieldMap: Record<ApiKeyName, keyof ApiKeyState> = {
        openai: "openaiKey",
        openrouter: "openrouterKey",
        pexels: "pexelsKey",
        supabase: "supabaseKey",
        elevenlabs: "elevenlabsKey",
      };
      const field = fieldMap[keyName];
      return !!state[field];
    },
    [state]
  );

  const getKeyStatus = useCallback((): Record<ApiKeyName, boolean> => {
    return {
      openai: !!state.openaiKey,
      openrouter: !!state.openrouterKey,
      pexels: !!state.pexelsKey,
      supabase: !!state.supabaseKey,
      elevenlabs: !!state.elevenlabsKey,
    };
  }, [state]);

  return (
    <ApiKeyContext.Provider
      value={{
        ...state,
        refreshKeys,
        setKey,
        hasKey,
        getKeyStatus,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
}
