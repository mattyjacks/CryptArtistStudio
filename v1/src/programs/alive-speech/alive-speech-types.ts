// ============================================================================
// Alive Speech [ASp] - Types, Constants & Configuration
// ============================================================================

// Imp 1: Centralized type definitions for type safety across modules
export interface ChatMessage {
  id: string; // Imp 2: Unique message IDs for keying and reference
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  interrupted?: boolean;
  spokenText?: string;
  failed?: boolean; // Imp 3: Track failed messages for retry
  retryCount?: number; // Vuln 1: Limit retry attempts
  tokenEstimate?: number; // Imp 4: Token usage tracking
}

// Imp 5: Pet settings with validation schema
export interface PetSettings {
  petName: string;
  primaryColor: string;
  ttsProvider: TTSProvider;
  sttProvider: STTProvider;
  speechSpeed: number; // Imp 6: Speech speed control (0.5 - 2.0)
  volume: number; // Imp 7: Volume control (0 - 1)
  autoScroll: boolean; // Imp 8: Auto-scroll toggle
  showTimestamps: boolean; // Imp 9: Message timestamp display
  reducedMotion: boolean; // Imp 10: Accessibility - reduce motion
  fontSize: "sm" | "base" | "lg"; // Imp 11: Font size control
  notificationSounds: boolean; // Imp 12: UI sound effects toggle
  conversationId: string; // Imp 13: Current conversation identifier
  streak: number; // Imp 14: Days talked to pet streak counter
  lastTalkDate: string; // Imp 14 cont: For streak tracking
  totalMessages: number; // Imp 15: Lifetime message counter
  achievementsUnlocked: string[]; // Imp 16: Achievement system
}

export type TTSProvider = "auto" | "elevenlabs" | "openai";
export type STTProvider = "auto" | "whisper" | "elevenlabs";

// Imp 17: Conversation history with metadata
export interface ConversationSession {
  id: string;
  startedAt: number;
  lastMessageAt: number;
  messageCount: number;
  preview: string; // first user message as preview
}

// Imp 18: Achievement definitions
export interface Achievement {
  id: string;
  name: string;
  description: string;
  emoji: string;
  condition: (stats: { totalMessages: number; streak: number; sessionsCount: number }) => boolean;
}

// Imp 19: Quick reply suggestions
export interface QuickReply {
  text: string;
  emoji: string;
  category: "greeting" | "question" | "play" | "care";
}

// Imp 20: Audio device info
export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ELEVENLABS_VOICE_ID = "exsUS4vynmxd379XN4yO";
export const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
export const OPENAI_TTS_VOICE = "nova" as const;
export const OPENAI_TTS_MODEL = "tts-1" as const;
export const OPENAI_WHISPER_MODEL = "whisper-1" as const;

// Vuln 2: Strict limits to prevent resource exhaustion
export const MAX_MESSAGE_LENGTH = 2000;
export const MAX_CONVERSATION_MESSAGES = 200;
export const MAX_CONTEXT_MESSAGES = 12;
export const MAX_PET_NAME_LENGTH = 30;
export const MAX_AUDIO_DURATION_MS = 30_000;
export const MAX_AUDIO_BLOB_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_TTS_TEXT_LENGTH = 4000;
export const MAX_LOCALSTORAGE_SIZE = 2 * 1024 * 1024; // 2MB per key
export const MAX_RETRY_ATTEMPTS = 3;
export const MAX_CONCURRENT_AUDIO = 1;

// Vuln 3: Rate limit constants
export const RATE_LIMIT_MESSAGES_PER_MIN = 15;
export const RATE_LIMIT_TTS_PER_MIN = 10;
export const RATE_LIMIT_STT_PER_MIN = 10;
export const RATE_LIMIT_SETTINGS_PER_MIN = 20;

// Imp 21: Audio monitoring constants
export const SILENCE_THRESHOLD_MS = 1200;
export const SPEECH_RMS_THRESHOLD = 0.015;
export const AUDIO_CHECK_INTERVAL_MS = 100;

// Vuln 4: API timeout constants
export const TTS_TIMEOUT_MS = 15_000;
export const STT_TIMEOUT_MS = 15_000;
export const AI_CHAT_TIMEOUT_MS = 30_000;

// Imp 22: Color hex validation regex
export const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

// Imp 23: Default settings with safe values
export const DEFAULT_SETTINGS: PetSettings = {
  petName: "Valley Net",
  primaryColor: "#ff69b4",
  ttsProvider: "auto",
  sttProvider: "auto",
  speechSpeed: 1.05,
  volume: 0.85,
  autoScroll: true,
  showTimestamps: false,
  reducedMotion: false,
  fontSize: "base",
  notificationSounds: true,
  conversationId: "",
  streak: 0,
  lastTalkDate: "",
  totalMessages: 0,
  achievementsUnlocked: [],
};

// Imp 24: Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-word", name: "First Word", description: "Send your first message", emoji: "\uD83D\uDCAC", condition: (s) => s.totalMessages >= 1 },
  { id: "chatty", name: "Chatty Cat", description: "Send 50 messages", emoji: "\uD83D\uDDE3\uFE0F", condition: (s) => s.totalMessages >= 50 },
  { id: "bestie", name: "Best Friends", description: "Send 200 messages", emoji: "\u2764\uFE0F", condition: (s) => s.totalMessages >= 200 },
  { id: "streak-3", name: "3-Day Streak", description: "Talk 3 days in a row", emoji: "\uD83D\uDD25", condition: (s) => s.streak >= 3 },
  { id: "streak-7", name: "Weekly Regular", description: "Talk 7 days in a row", emoji: "\u2B50", condition: (s) => s.streak >= 7 },
  { id: "streak-30", name: "Monthly Devotion", description: "Talk 30 days in a row", emoji: "\uD83C\uDFC6", condition: (s) => s.streak >= 30 },
  { id: "sessions-10", name: "Frequent Visitor", description: "Start 10 conversations", emoji: "\uD83D\uDC3E", condition: (s) => s.sessionsCount >= 10 },
  { id: "marathon", name: "Marathon Talker", description: "Send 500 messages", emoji: "\uD83C\uDFC5", condition: (s) => s.totalMessages >= 500 },
];

// Imp 25: Quick reply suggestions
export const QUICK_REPLIES: QuickReply[] = [
  { text: "Hey there, cutie!", emoji: "\uD83D\uDC4B", category: "greeting" },
  { text: "How are you feeling?", emoji: "\uD83D\uDE3A", category: "greeting" },
  { text: "Are you hungry?", emoji: "\uD83C\uDF5C", category: "care" },
  { text: "Want to play?", emoji: "\uD83C\uDFBE", category: "play" },
  { text: "Tell me a joke!", emoji: "\uD83D\uDE39", category: "play" },
  { text: "Help me with coding", emoji: "\uD83D\uDCBB", category: "question" },
  { text: "What's the weather like?", emoji: "\u2600\uFE0F", category: "question" },
  { text: "I love you!", emoji: "\u2764\uFE0F", category: "greeting" },
  { text: "Good night!", emoji: "\uD83C\uDF19", category: "greeting" },
  { text: "Let me pet you", emoji: "\uD83D\uDC31", category: "care" },
];

// Imp 26: Font size class map
export const FONT_SIZE_CLASSES: Record<string, string> = {
  sm: "text-xs",
  base: "text-sm",
  lg: "text-base",
};

// Imp 27: Time-of-day greeting variants
export function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Night owl";
}
