// ===========================================================================
// Improvement 302: Shared OpenRouter Utility Module
// Centralized OpenRouter helpers for all CryptArtist Studio programs
// ===========================================================================

import { invoke } from "@tauri-apps/api/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OpenRouterModel {
  id: string;
  name: string;
  provider: string;
  contextLength?: number;
  pricing?: { prompt: string; completion: string };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OpenRouterResponse {
  content: string;
  model: string;
  tokensUsed: { prompt: number; completion: number; total: number };
}

// ---------------------------------------------------------------------------
// Default Model
// ---------------------------------------------------------------------------

export function getDefaultModel(): string {
  return localStorage.getItem("cryptartist_openrouter_model") || "openai/gpt-4o";
}

export function setDefaultModel(model: string): void {
  localStorage.setItem("cryptartist_openrouter_model", model);
}

// ---------------------------------------------------------------------------
// Chat with OpenRouter (with OpenAI fallback)
// ---------------------------------------------------------------------------

export async function chatWithAI(
  prompt: string,
  options?: { model?: string; useOpenRouterOnly?: boolean }
): Promise<string> {
  const model = options?.model || getDefaultModel();

  // Try OpenRouter first
  try {
    const reply = await invoke<string>("openrouter_chat", { prompt, model });
    return reply;
  } catch (orErr) {
    if (options?.useOpenRouterOnly) {
      throw orErr;
    }
    // Fall back to OpenAI direct
    try {
      const reply = await invoke<string>("ai_chat", { prompt });
      return reply;
    } catch (oaErr) {
      throw new Error(
        `OpenRouter: ${orErr}\nOpenAI: ${oaErr}\n\nConfigure API keys in Settings.`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// List Models
// ---------------------------------------------------------------------------

export async function listModels(): Promise<OpenRouterModel[]> {
  try {
    const raw = await invoke<string>("openrouter_list_models");
    const parsed = JSON.parse(raw);
    return (parsed.data || []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: (m.name as string) || (m.id as string),
      provider: ((m.id as string) || "").split("/")[0],
      contextLength: m.context_length as number | undefined,
      pricing: m.pricing as { prompt: string; completion: string } | undefined,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Check if OpenRouter is configured
// ---------------------------------------------------------------------------

export async function isOpenRouterConfigured(): Promise<boolean> {
  try {
    const key = await invoke<string>("get_openrouter_key");
    return key.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Check if OpenAI is configured
// ---------------------------------------------------------------------------

export async function isOpenAIConfigured(): Promise<boolean> {
  try {
    const key = await invoke<string>("get_api_key");
    return key.length > 0;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Get AI status summary
// ---------------------------------------------------------------------------

export async function getAIStatus(): Promise<{
  openai: boolean;
  openrouter: boolean;
  pexels: boolean;
  defaultModel: string;
}> {
  const [openai, openrouter, pexels] = await Promise.all([
    isOpenAIConfigured(),
    isOpenRouterConfigured(),
    invoke<string>("get_pexels_key").then((k) => k.length > 0).catch(() => false),
  ]);
  return { openai, openrouter, pexels, defaultModel: getDefaultModel() };
}

// ---------------------------------------------------------------------------
// Popular Models (static list for offline use)
// ---------------------------------------------------------------------------

export const POPULAR_MODELS: OpenRouterModel[] = [
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "openai/o1", name: "o1", provider: "OpenAI" },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", provider: "Anthropic" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5", provider: "Google" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", provider: "Google" },
  { id: "meta-llama/llama-3.1-405b-instruct", name: "Llama 3.1 405B", provider: "Meta" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", provider: "Meta" },
  { id: "mistralai/mistral-large", name: "Mistral Large", provider: "Mistral" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", provider: "DeepSeek" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek" },
  { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B", provider: "Qwen" },
  { id: "cohere/command-r-plus", name: "Command R+", provider: "Cohere" },
];

// ---------------------------------------------------------------------------
// Estimate token count (rough, 1 token ~ 4 chars)
// ---------------------------------------------------------------------------

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ---------------------------------------------------------------------------
// Estimate cost (rough, based on GPT-4o pricing)
// ---------------------------------------------------------------------------

export function estimateCost(promptTokens: number, completionTokens: number): number {
  return promptTokens * 0.0000025 + completionTokens * 0.00001;
}

// ---------------------------------------------------------------------------
// Format model name for display
// ---------------------------------------------------------------------------

export function formatModelName(modelId: string): string {
  const parts = modelId.split("/");
  return parts.length > 1 ? parts[1] : modelId;
}

export function formatProviderName(modelId: string): string {
  const parts = modelId.split("/");
  if (parts.length < 2) return modelId;
  const providerMap: Record<string, string> = {
    openai: "OpenAI", anthropic: "Anthropic", google: "Google",
    "meta-llama": "Meta", mistralai: "Mistral", deepseek: "DeepSeek",
    qwen: "Qwen", cohere: "Cohere",
  };
  return providerMap[parts[0]] || parts[0];
}
