// ============================================================================
// CryptArtist Studio v2 - AI Engine & Vault Types
// ============================================================================

export type AIProvider = "openrouter" | "openai" | "anthropic" | "google" | "local-webgpu";

export interface AIModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  isVisionCapable?: boolean;
  isReasoningCapable?: boolean;
}

export interface AIChatMessage {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: number;
  imageUrl?: string;
  tokensUsed?: number;
}

export interface AIChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  mode?: "smart" | "fast" | "cheap" | "creative";
  signal?: AbortSignal;
}

export interface AIChatResponse {
  content: string;
  model: string;
  tokensUsed?: { prompt: number; completion: number; total: number };
}

export interface AutoEditPlanItem {
  id: string;
  timecode: string;
  durationSeconds: number;
  shotType: "b-roll" | "speaker" | "graphic" | "title" | "music-cue";
  description: string;
  suggestedPexelsQuery?: string;
  narrationScript?: string;
  selectedAssetId?: string;
  applied: boolean;
}

export interface AutoEditPlan {
  title: string;
  topic: string;
  targetDurationSeconds: number;
  fullNarrationScript: string;
  suggestedBgmGenre: string;
  shots: AutoEditPlanItem[];
}

export interface CaptionSegment {
  id: string;
  startSeconds: number;
  endSeconds: number;
  text: string;
  confidence?: number;
}

export interface ApiKeyConfig {
  openaiKey: string;
  openrouterKey: string;
  anthropicKey: string;
  googleKey: string;
  pexelsKey: string;
  elevenlabsKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  defaultModel: string;
}

export interface IAIEngine {
  /** Check if user has active keys configured or password vault unlocked */
  getAuthStatus(): {
    isConfigured: boolean;
    hasBYOK: boolean;
    isPasswordVaultActive: boolean;
    activeProvider: AIProvider;
    activeModel: string;
  };
  /** Unlock server-side environment variables using personal assigned password */
  unlockPasswordVault(password: string): Promise<{ success: boolean; message?: string }>;
  /** Lock / revoke password vault */
  lockPasswordVault(): void;
  /** Send chat prompt with streaming chunks */
  chatStream(
    messages: AIChatMessage[],
    onChunk: (chunk: string) => void,
    options?: AIChatOptions
  ): Promise<AIChatResponse>;
  /** Send single chat prompt */
  chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<AIChatResponse>;
  /** Generate full video auto-edit plan from topic or script */
  generateAutoEditPlan(scriptOrTopic: string, targetDurationSec?: number): Promise<AutoEditPlan>;
  /** Generate text-to-speech audio */
  generateVoiceover(text: string, voice?: string): Promise<ArrayBuffer>;
  /** Transcribe audio to caption segments */
  generateCaptions(audioBlob: Blob): Promise<CaptionSegment[]>;
  /** Search Pexels stock video/images */
  searchPexelsStock(query: string, type?: "video" | "image"): Promise<Array<{
    id: string;
    title: string;
    thumbnailUrl: string;
    videoUrl?: string;
    imageUrl?: string;
    duration?: number;
    width: number;
    height: number;
    author: string;
  }>>;
}
