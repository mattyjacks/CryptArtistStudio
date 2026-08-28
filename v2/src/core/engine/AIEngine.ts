import {
  AIChatMessage,
  AIChatOptions,
  AIChatResponse,
  ApiKeyConfig,
  AutoEditPlan,
  CaptionSegment,
  IAIEngine,
} from "../types/ai.types";
import { browserStorageDriver } from "../drivers/web/BrowserStorageDriver";
import {
  encryptSecret,
  decryptSecret,
  validateModelId,
  validateAPIKeyFormat,
} from "../security/security";

const STORAGE_KEYS = {
  OPENAI_KEY: "keys_openai",
  OPENROUTER_KEY: "keys_openrouter",
  ANTHROPIC_KEY: "keys_anthropic",
  GOOGLE_KEY: "keys_google",
  PEXELS_KEY: "keys_pexels",
  ELEVENLABS_KEY: "keys_elevenlabs",
  SUPABASE_URL: "keys_supabase_url",
  SUPABASE_KEY: "keys_supabase_key",
  DEFAULT_MODEL: "keys_default_model",
  VAULT_PASSWORD: "vault_session_password",
};

export class AIEngine implements IAIEngine {
  private keys: ApiKeyConfig = {
    openaiKey: "",
    openrouterKey: "",
    anthropicKey: "",
    googleKey: "",
    pexelsKey: "",
    elevenlabsKey: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    defaultModel: "openai/gpt-4o-mini",
  };

  private vaultPassword: string = "";
  private isVaultActive: boolean = false;
  private initialized: boolean = false;

  constructor() {
    this.loadKeys();
  }

  async loadKeys(): Promise<void> {
    const encOpenai = await browserStorageDriver.getItem(STORAGE_KEYS.OPENAI_KEY, "");
    const encOpenrouter = await browserStorageDriver.getItem(STORAGE_KEYS.OPENROUTER_KEY, "");
    const encAnthropic = await browserStorageDriver.getItem(STORAGE_KEYS.ANTHROPIC_KEY, "");
    const encGoogle = await browserStorageDriver.getItem(STORAGE_KEYS.GOOGLE_KEY, "");
    const encPexels = await browserStorageDriver.getItem(STORAGE_KEYS.PEXELS_KEY, "");
    const encElevenlabs = await browserStorageDriver.getItem(STORAGE_KEYS.ELEVENLABS_KEY, "");
    const encVault = await browserStorageDriver.getItem(STORAGE_KEYS.VAULT_PASSWORD, "");

    this.keys.openaiKey = await decryptSecret(encOpenai);
    this.keys.openrouterKey = await decryptSecret(encOpenrouter);
    this.keys.anthropicKey = await decryptSecret(encAnthropic);
    this.keys.googleKey = await decryptSecret(encGoogle);
    this.keys.pexelsKey = await decryptSecret(encPexels);
    this.keys.elevenlabsKey = await decryptSecret(encElevenlabs);
    this.keys.supabaseUrl = await browserStorageDriver.getItem(STORAGE_KEYS.SUPABASE_URL, "");
    this.keys.supabaseAnonKey = await browserStorageDriver.getItem(STORAGE_KEYS.SUPABASE_KEY, "");
    this.keys.defaultModel = await browserStorageDriver.getItem(STORAGE_KEYS.DEFAULT_MODEL, "openai/gpt-4o-mini");

    this.vaultPassword = await decryptSecret(encVault);
    this.isVaultActive = !!this.vaultPassword;
    this.initialized = true;
  }

  async saveKey(keyName: keyof ApiKeyConfig, value: string): Promise<void> {
    this.keys[keyName] = value;
    const storageMap: Record<keyof ApiKeyConfig, string> = {
      openaiKey: STORAGE_KEYS.OPENAI_KEY,
      openrouterKey: STORAGE_KEYS.OPENROUTER_KEY,
      anthropicKey: STORAGE_KEYS.ANTHROPIC_KEY,
      googleKey: STORAGE_KEYS.GOOGLE_KEY,
      pexelsKey: STORAGE_KEYS.PEXELS_KEY,
      elevenlabsKey: STORAGE_KEYS.ELEVENLABS_KEY,
      supabaseUrl: STORAGE_KEYS.SUPABASE_URL,
      supabaseAnonKey: STORAGE_KEYS.SUPABASE_KEY,
      defaultModel: STORAGE_KEYS.DEFAULT_MODEL,
    };

    // Encrypt sensitive secrets before persisting to browser storage
    const isSensitive = [
      "openaiKey",
      "openrouterKey",
      "anthropicKey",
      "googleKey",
      "pexelsKey",
      "elevenlabsKey",
    ].includes(keyName);

    const valueToStore = isSensitive ? await encryptSecret(value) : value;
    await browserStorageDriver.setItem(storageMap[keyName], valueToStore);
  }

  getKeys(): ApiKeyConfig {
    return { ...this.keys };
  }

  getAuthStatus() {
    const hasBYOK = !!(this.keys.openrouterKey || this.keys.openaiKey);
    return {
      isConfigured: hasBYOK || this.isVaultActive,
      hasBYOK,
      isPasswordVaultActive: this.isVaultActive,
      activeProvider: (this.keys.openrouterKey ? "openrouter" : "openai") as any,
      activeModel: this.keys.defaultModel || "openai/gpt-4o-mini",
    };
  }

  async unlockPasswordVault(password: string): Promise<{ success: boolean; message?: string }> {
    if (!password.trim()) {
      return { success: false, message: "Please enter a password" };
    }

    try {
      // Test the password against the Vercel API endpoint
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: password.trim(),
          testAuth: true,
        }),
      });

      const data = await response.json();
      if (response.ok && data.authorized) {
        this.vaultPassword = password.trim();
        this.isVaultActive = true;
        await browserStorageDriver.setItem(STORAGE_KEYS.VAULT_PASSWORD, this.vaultPassword);
        return { success: true, message: "Password Vault unlocked successfully! Server environment keys active." };
      } else {
        return { success: false, message: data.error || "Incorrect access password." };
      }
    } catch {
      // If offline or local dev without server running, accept client-stored password
      this.vaultPassword = password.trim();
      this.isVaultActive = true;
      await browserStorageDriver.setItem(STORAGE_KEYS.VAULT_PASSWORD, this.vaultPassword);
      return { success: true, message: "Password saved locally for server requests." };
    }
  }

  lockPasswordVault(): void {
    this.vaultPassword = "";
    this.isVaultActive = false;
    browserStorageDriver.removeItem(STORAGE_KEYS.VAULT_PASSWORD);
  }

  async chat(messages: AIChatMessage[], options?: AIChatOptions): Promise<AIChatResponse> {
    let fullText = "";
    const res = await this.chatStream(
      messages,
      (chunk) => {
        fullText += chunk;
      },
      options
    );
    return { ...res, content: fullText };
  }

  async chatStream(
    messages: AIChatMessage[],
    onChunk: (chunk: string) => void,
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    const model = options?.model || this.keys.defaultModel || "openai/gpt-4o-mini";

    // 1. If Password Vault is active, route through Vercel server proxy
    if (this.isVaultActive && this.vaultPassword) {
      try {
        const response = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            password: this.vaultPassword,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            model,
            temperature: options?.temperature ?? 0.7,
            stream: true,
          }),
          signal: options?.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || `Server AI error: HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body stream");

        const decoder = new TextDecoder();
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          // Parse SSE data chunks
          const lines = text.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.replace("data: ", "").trim();
              if (dataStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(dataStr);
                const delta = parsed.choices?.[0]?.delta?.content || "";
                if (delta) {
                  full += delta;
                  onChunk(delta);
                }
              } catch {
                // Raw text chunk
                full += dataStr;
                onChunk(dataStr);
              }
            }
          }
        }

        return { content: full, model };
      } catch (vaultErr: any) {
        console.warn("[AIEngine] Vault proxy error, attempting BYOK fallback:", vaultErr);
        if (!this.keys.openrouterKey && !this.keys.openaiKey) {
          throw vaultErr;
        }
      }
    }

    // 2. Direct Client BYOK (OpenRouter or OpenAI)
    if (this.keys.openrouterKey) {
      return this.streamOpenRouter(messages, onChunk, options);
    } else if (this.keys.openaiKey) {
      return this.streamOpenAI(messages, onChunk, options);
    } else {
      throw new Error("No AI API Key or Password Vault configured. Please open Settings to set your OpenAI/OpenRouter key or unlock with a password.");
    }
  }

  private async streamOpenRouter(
    messages: AIChatMessage[],
    onChunk: (chunk: string) => void,
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    const model = options?.model || this.keys.defaultModel || "openai/gpt-4o-mini";
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.keys.openrouterKey}`,
        "HTTP-Referer": "https://cryptartist.com",
        "X-Title": "CryptArtist Studio v2",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenRouter error: HTTP ${response.status}`);
    }

    return this.readStreamResponse(response, onChunk, model);
  }

  private async streamOpenAI(
    messages: AIChatMessage[],
    onChunk: (chunk: string) => void,
    options?: AIChatOptions
  ): Promise<AIChatResponse> {
    const model = options?.model || "gpt-4o-mini";
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.keys.openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options?.temperature ?? 0.7,
        stream: true,
      }),
      signal: options?.signal,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI error: HTTP ${response.status}`);
    }

    return this.readStreamResponse(response, onChunk, model);
  }

  private async readStreamResponse(
    response: Response,
    onChunk: (chunk: string) => void,
    model: string
  ): Promise<AIChatResponse> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response stream");

    const decoder = new TextDecoder();
    let full = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      const lines = text.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const jsonStr = line.replace("data: ", "").trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) {
              full += delta;
              onChunk(delta);
            }
          } catch {
            // ignore malformed line
          }
        }
      }
    }

    return { content: full, model };
  }

  async generateAutoEditPlan(scriptOrTopic: string, targetDurationSec: number = 60): Promise<AutoEditPlan> {
    const prompt = `You are a professional video director and editor for DaVinci Resolve and CapCut.
Given the following script or topic:
"${scriptOrTopic}"

Target Duration: ${targetDurationSec} seconds.

Generate a comprehensive Auto-Edit plan in valid JSON matching this exact structure:
{
  "title": "Short Title",
  "topic": "${scriptOrTopic.substring(0, 80)}",
  "targetDurationSeconds": ${targetDurationSec},
  "fullNarrationScript": "Full voiceover script text...",
  "suggestedBgmGenre": "Upbeat Electronic / Cinematic Ambient / Lo-Fi",
  "shots": [
    {
      "id": "shot_1",
      "timecode": "00:00:00:00",
      "durationSeconds": 5,
      "shotType": "title",
      "description": "Opening title card with animated text",
      "suggestedPexelsQuery": "technology glowing neon",
      "narrationScript": "Welcome to...",
      "applied": true
    },
    {
      "id": "shot_2",
      "timecode": "00:00:05:00",
      "durationSeconds": 8,
      "shotType": "b-roll",
      "description": "Fast paced b-roll of urban city",
      "suggestedPexelsQuery": "city timelapse night",
      "narrationScript": "In today's fast moving world...",
      "applied": true
    }
  ]
}

Return ONLY the raw JSON object, without markdown formatting or code fences.`;

    const res = await this.chat([
      {
        id: "sys",
        role: "system",
        content: "You are a professional video editor JSON generator.",
        timestamp: Date.now(),
      },
      {
        id: "u1",
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      },
    ]);

    try {
      const cleanJson = res.content.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson) as AutoEditPlan;
    } catch {
      // Fallback mock plan if API returns text
      return {
        title: "Auto-Edit Project",
        topic: scriptOrTopic,
        targetDurationSeconds: targetDurationSec,
        fullNarrationScript: scriptOrTopic,
        suggestedBgmGenre: "Cinematic Ambient",
        shots: [
          {
            id: "shot_1",
            timecode: "00:00:00:00",
            durationSeconds: 5,
            shotType: "title",
            description: "Opening scene",
            suggestedPexelsQuery: "abstract background",
            narrationScript: scriptOrTopic.substring(0, 100),
            applied: true,
          },
          {
            id: "shot_2",
            timecode: "00:00:05:00",
            durationSeconds: 10,
            shotType: "b-roll",
            description: "Main content b-roll",
            suggestedPexelsQuery: "creative studio",
            narrationScript: scriptOrTopic.substring(100, 250),
            applied: true,
          },
        ],
      };
    }
  }

  async generateVoiceover(text: string, voice: string = "alloy"): Promise<ArrayBuffer> {
    if (this.keys.openaiKey) {
      const resp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.keys.openaiKey}`,
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice,
        }),
      });

      if (!resp.ok) {
        throw new Error(`OpenAI TTS Error: HTTP ${resp.status}`);
      }

      return await resp.arrayBuffer();
    }

    throw new Error("TTS requires an OpenAI API key or unlocked Password Vault.");
  }

  async generateCaptions(_audioBlob: Blob): Promise<CaptionSegment[]> {
    // Generate timed caption mock segments for speech
    return [
      { id: "cap_1", startSeconds: 0, endSeconds: 4, text: "Welcome to CryptArtist Studio v2." },
      { id: "cap_2", startSeconds: 4, endSeconds: 8, text: "The browser-native creative powerhouse." },
      { id: "cap_3", startSeconds: 8, endSeconds: 15, text: "Editing at the speed of thought." },
    ];
  }

  async searchPexelsStock(query: string, type: "video" | "image" = "video") {
    const key = this.keys.pexelsKey || "";
    if (!key) {
      // Return curated sample items
      return [
        {
          id: "px_1",
          title: `${query} Cinematic Clip 1`,
          thumbnailUrl: "https://images.pexels.com/photos/3052361/pexels-photo-3052361.jpeg?auto=compress&cs=tinysrgb&w=400",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          duration: 15,
          width: 1920,
          height: 1080,
          author: "Pexels Creator",
        },
        {
          id: "px_2",
          title: `${query} Ambient B-Roll`,
          thumbnailUrl: "https://images.pexels.com/photos/2478248/pexels-photo-2478248.jpeg?auto=compress&cs=tinysrgb&w=400",
          videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
          duration: 12,
          width: 1920,
          height: 1080,
          author: "Studio Artist",
        },
      ];
    }

    try {
      const url =
        type === "video"
          ? `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=12`
          : `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12`;

      const resp = await fetch(url, {
        headers: { Authorization: key },
      });

      if (!resp.ok) return [];

      const data = await resp.json();
      if (type === "video") {
        return (data.videos || []).map((v: any) => ({
          id: `px_vid_${v.id}`,
          title: `Video by ${v.user?.name || "Pexels"}`,
          thumbnailUrl: v.image,
          videoUrl: v.video_files?.[0]?.link,
          duration: v.duration,
          width: v.width,
          height: v.height,
          author: v.user?.name || "Pexels",
        }));
      } else {
        return (data.photos || []).map((p: any) => ({
          id: `px_img_${p.id}`,
          title: p.alt || `Photo by ${p.photographer}`,
          thumbnailUrl: p.src?.medium,
          imageUrl: p.src?.large2x || p.src?.original,
          width: p.width,
          height: p.height,
          author: p.photographer,
        }));
      }
    } catch {
      return [];
    }
  }
}

export const aiEngine = new AIEngine();
