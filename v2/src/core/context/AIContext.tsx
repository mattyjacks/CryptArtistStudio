import React, { createContext, useContext, useEffect, useState } from "react";
import { aiEngine, AIEngine } from "../engine/AIEngine";
import { ApiKeyConfig } from "../types/ai.types";

export interface AIContextValue {
  engine: AIEngine;
  keys: ApiKeyConfig;
  isConfigured: boolean;
  isPasswordVaultActive: boolean;
  activeModel: string;
  updateKey: (keyName: keyof ApiKeyConfig, value: string) => Promise<void>;
  unlockVault: (password: string) => Promise<{ success: boolean; message?: string }>;
  lockVault: () => void;
  refresh: () => Promise<void>;
}

const AIContext = createContext<AIContextValue | null>(null);

export const AIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keys, setKeys] = useState<ApiKeyConfig>(aiEngine.getKeys());
  const [isPasswordVaultActive, setIsPasswordVaultActive] = useState<boolean>(false);
  const [activeModel, setActiveModel] = useState<string>("openai/gpt-4o-mini");

  const refreshState = async () => {
    await aiEngine.loadKeys();
    setKeys(aiEngine.getKeys());
    const status = aiEngine.getAuthStatus();
    setIsPasswordVaultActive(status.isPasswordVaultActive);
    setActiveModel(status.activeModel);
  };

  useEffect(() => {
    refreshState();
  }, []);

  const updateKey = async (keyName: keyof ApiKeyConfig, value: string) => {
    await aiEngine.saveKey(keyName, value);
    await refreshState();
  };

  const unlockVault = async (password: string) => {
    const res = await aiEngine.unlockPasswordVault(password);
    if (res.success) {
      await refreshState();
    }
    return res;
  };

  const lockVault = () => {
    aiEngine.lockPasswordVault();
    refreshState();
  };

  const value: AIContextValue = {
    engine: aiEngine,
    keys,
    isConfigured: !!(keys.openrouterKey || keys.openaiKey || isPasswordVaultActive),
    isPasswordVaultActive,
    activeModel,
    updateKey,
    unlockVault,
    lockVault,
    refresh: refreshState,
  };

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
};

export function useAI(): AIContextValue {
  const ctx = useContext(AIContext);
  if (!ctx) throw new Error("useAI must be used within AIProvider");
  return ctx;
}
