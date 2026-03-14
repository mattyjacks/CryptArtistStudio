// ===========================================================================
// Improvement 302: Shared OpenRouter Utility Module
// Centralized OpenRouter helpers for all CryptArtist Studio programs
// ===========================================================================

import { invoke } from "@tauri-apps/api/core";
import { validateModelId, logSecurityEvent } from "./security";

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

export type AIEfficiencyMode = "cheap" | "fast" | "good" | "smart" | "lucky";
export type AIActionKey =
  | "general"
  | "media-chat"
  | "auto-edit"
  | "valleynet-agent"
  | "coding-assistant"
  | "coding-planner"
  | "coding-review"
  | "game-dev"
  | "narration"
  | "commander-chat"
  | "commander-openrouter"
  | "dictate-pic-generate"
  | "dictate-pic-inpaint"
  | "dictate-pic-describe";

export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-5-mini";
export const DEFAULT_AI_MODE: AIEfficiencyMode = "smart";
export const GLOBAL_MODEL_KEY = "cryptartist_openrouter_model";
const GLOBAL_MODEL_KEY_V2 = "cryptartist_ai_default_model";
const GLOBAL_MODE_KEY = "cryptartist_ai_default_mode";

export const AI_MODES: { id: AIEfficiencyMode; label: string; icon: string }[] = [
  { id: "cheap", label: "Cheap", icon: "💳" },
  { id: "fast", label: "Fast", icon: "⚡" },
  { id: "good", label: "Good", icon: "🦄" },
  { id: "smart", label: "Smart", icon: "🧠" },
  { id: "lucky", label: "Lucky", icon: "🍀" },
];

export const AI_ACTIONS: { id: AIActionKey; label: string }[] = [
  { id: "general", label: "General AI Chat" },
  { id: "media-chat", label: "Media AI Studio Chat" },
  { id: "auto-edit", label: "Media Auto-Edit Planning" },
  { id: "valleynet-agent", label: "ValleyNet Agent Tasks" },
  { id: "coding-assistant", label: "VibeCodeWorker Assistant" },
  { id: "coding-planner", label: "VibeCodeWorker Code Planner" },
  { id: "coding-review", label: "VibeCodeWorker Review Assistant" },
  { id: "game-dev", label: "GameStudio Generation" },
  { id: "narration", label: "DemoRecorder Narration" },
  { id: "commander-chat", label: "Commander Chat Command" },
  { id: "commander-openrouter", label: "Commander OpenRouter Command" },
  { id: "dictate-pic-generate", label: "DictatePic AI Generate" },
  { id: "dictate-pic-inpaint", label: "DictatePic AI Inpaint" },
  { id: "dictate-pic-describe", label: "DictatePic AI Describe" },
];

// ---------------------------------------------------------------------------
// Default Model
// ---------------------------------------------------------------------------

export function getDefaultModel(): string {
  try {
    return (
      localStorage.getItem(GLOBAL_MODEL_KEY_V2)
      || localStorage.getItem(GLOBAL_MODEL_KEY)
      || DEFAULT_OPENROUTER_MODEL
    );
  } catch {
    return DEFAULT_OPENROUTER_MODEL;
  }
}

export function setDefaultModel(model: string): void {
  // Vuln 41: Validate model ID format
  if (!validateModelId(model)) {
    logSecurityEvent("openrouter", "medium", "Invalid model ID rejected", model);
    return;
  }
  try {
    localStorage.setItem(GLOBAL_MODEL_KEY, model);
    localStorage.setItem(GLOBAL_MODEL_KEY_V2, model);
  } catch {
    // localStorage full or blocked
  }
}

export function getDefaultMode(): AIEfficiencyMode {
  try {
    const raw = localStorage.getItem(GLOBAL_MODE_KEY);
    if (raw === "cheap" || raw === "fast" || raw === "good" || raw === "smart" || raw === "lucky") {
      return raw;
    }
  } catch {
    // ignore
  }
  return DEFAULT_AI_MODE;
}

export function setDefaultMode(mode: AIEfficiencyMode): void {
  try {
    localStorage.setItem(GLOBAL_MODE_KEY, mode);
  } catch {
    // localStorage full or blocked
  }
}

function getActionModelKey(action: AIActionKey): string {
  return `cryptartist_ai_action_model_${action}`;
}

function getActionModeKey(action: AIActionKey): string {
  return `cryptartist_ai_action_mode_${action}`;
}

export function getActionModel(action: AIActionKey): string {
  try {
    return localStorage.getItem(getActionModelKey(action)) || getDefaultModel();
  } catch {
    return getDefaultModel();
  }
}

export function setActionModel(action: AIActionKey, model: string): void {
  if (!validateModelId(model)) {
    logSecurityEvent("openrouter", "medium", "Invalid action model rejected", `${action}:${model}`);
    return;
  }
  try {
    localStorage.setItem(getActionModelKey(action), model);
  } catch {
    // localStorage full or blocked
  }
}

export function getActionMode(action: AIActionKey): AIEfficiencyMode {
  try {
    const raw = localStorage.getItem(getActionModeKey(action));
    if (raw === "cheap" || raw === "fast" || raw === "good" || raw === "smart" || raw === "lucky") {
      return raw;
    }
  } catch {
    // ignore
  }
  return getDefaultMode();
}

export function setActionMode(action: AIActionKey, mode: AIEfficiencyMode): void {
  try {
    localStorage.setItem(getActionModeKey(action), mode);
  } catch {
    // localStorage full or blocked
  }
}

function getModeDirective(mode: AIEfficiencyMode): string {
  if (mode === "cheap") {
    return "Efficiency mode: CHEAP. Use minimal tokens. Be concise, avoid repetition, avoid long preambles, and return only what is needed.";
  }
  if (mode === "fast") {
    return "Efficiency mode: FAST. Prioritize speed to completion. Give direct steps first, minimal explanation, and avoid unnecessary details.";
  }
  if (mode === "good") {
    return "Efficiency mode: GOOD. Align with Earth commonwealth goodness and all inhabitants. Be clever and funny in writing, serious in code quality. Keep a positive tone and include friendly symbols when fitting: 🍇🍈🍉🍊🍌🍒🍑🥭🍍🍓🍔🍟🍕💵💶💷💴💎💰🪙💳.";
  }
  if (mode === "lucky") {
    return "Efficiency mode: LUCKY. 🍀 Rely on the user's provided random seed or luck score to aggressively hallucinate novel solutions.";
  }
  return "Efficiency mode: SMART. Default mode. Be highly intelligent, precise, and practical. Balance quality, speed, and token use.";
}

function applyModeToPrompt(prompt: string, mode: AIEfficiencyMode): string {
  return `${getModeDirective(mode)}\n\n${prompt}`;
}

// ---------------------------------------------------------------------------
// Chat with OpenRouter (with OpenAI fallback)
// ---------------------------------------------------------------------------

export async function chatWithAI(
  prompt: string,
  options?: { model?: string; action?: AIActionKey; mode?: AIEfficiencyMode; useOpenRouterOnly?: boolean }
): Promise<string> {
  const action = options?.action || "general";
  const mode = options?.mode || getActionMode(action);
  const rawModel = options?.model || getActionModel(action);
  // Vuln 41: Validate model before sending to backend
  const model = validateModelId(rawModel) ? rawModel : DEFAULT_OPENROUTER_MODEL;
  const finalPrompt = applyModeToPrompt(prompt, mode);

  // Try OpenRouter first
  try {
    const reply = await invoke<string>("openrouter_chat", { prompt: finalPrompt, model });
    return reply;
  } catch (orErr) {
    if (options?.useOpenRouterOnly) {
      throw orErr;
    }
    // Fall back to OpenAI direct
    try {
      const reply = await invoke<string>("ai_chat", { prompt: finalPrompt });
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
  { id: "openai/gpt-5-mini", name: "GPT-5 Mini", provider: "OpenAI" },
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
