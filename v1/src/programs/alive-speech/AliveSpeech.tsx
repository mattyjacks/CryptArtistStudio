// ============================================================================
// Alive Speech [ASp] - CryptArtist Studio
// 75 Improvements + 75 Vulnerability Fixes
// ============================================================================

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApiKeys } from "../../utils/apiKeys";
import { chatWithAI } from "../../utils/openrouter";
import { logger } from "../../utils/logger";
import { toast } from "../../utils/toast";
import VirtualPet from "../virtual-pet/VirtualPet";
import type { ChatMessage, PetSettings, TTSProvider, STTProvider } from "./alive-speech-types";
import {
  MAX_CONTEXT_MESSAGES,
  MAX_CONVERSATION_MESSAGES,
  MAX_MESSAGE_LENGTH,
  MAX_RETRY_ATTEMPTS,
  SILENCE_THRESHOLD_MS,
  SPEECH_RMS_THRESHOLD,
  AUDIO_CHECK_INTERVAL_MS,
  ACHIEVEMENTS,
  QUICK_REPLIES,
  FONT_SIZE_CLASSES,
  getTimeGreeting,
} from "./alive-speech-types";
import {
  safeLoadSettings,
  safeSaveSettings,
  sanitizeText,
  sanitizePetName,
  validateColor,
  validateMessageContent,
  safeErrorMessage,
  checkMessageRateLimit,
  checkSettingsRateLimit,
  secureTTSElevenLabs,
  secureTTSOpenAI,
  secureSTTWhisper,
  buildSecureSystemPrompt,
  buildSafeContext,
  generateId,
  generateConversationId,
  estimateTokens,
  calculateStreak,
  checkAchievements,
  formatTimestamp,
  exportConversationText,
  isWebAudioSupported,
  isMediaRecorderSupported,
  calculateRMS,
  isRecorderActive,
  getSupportedMimeType,
  generateGreeting,
  saveConversation,
  loadConversation,
  saveConversationToHistory,
  getConversationHistory,
  validateApiKey,
} from "./alive-speech-utils";

export default function AliveSpeech() {
  const navigate = useNavigate();
  const apiKeys = useApiKeys();

  // Vuln 58: Load settings through validated loader
  const [settings, setSettings] = useState<PetSettings>(safeLoadSettings);
  const [showSettings, setShowSettings] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userTranscript, setUserTranscript] = useState("");
  const [petSpeakingText, setPetSpeakingText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [overlayActive, setOverlayActive] = useState(true);
  const [textInput, setTextInput] = useState("");
  // Imp 37: Quick replies panel
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  // Imp 38: Achievement notification
  const [achievementPopup, setAchievementPopup] = useState<string | null>(null);
  // Imp 39: Conversation history browser
  const [showHistory, setShowHistory] = useState(false);
  // Imp 40: Settings tab navigation
  const [settingsTab, setSettingsTab] = useState<"general" | "voice" | "display" | "about">("general");
  // Imp 41: Ready state
  const [isReady, setIsReady] = useState(false);
  // Imp 42: Token usage tracker
  const [totalTokensUsed, setTotalTokensUsed] = useState(0);
  const [petStats] = useState({ hunger: 70, happiness: 80, energy: 90, bond: 30 });

  // Refs - Vuln 59: Typed refs for safety
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null); // Imp 43: Volume node
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSpeakingRef = useRef(false);
  const isThinkingRef = useRef(false); // Vuln 60: Ref mirror for async
  const abortControllerRef = useRef<AbortController | null>(null);
  const spokenSoFarRef = useRef("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const audioCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartTimeRef = useRef(0); // Vuln 61: Track recording duration
  const mountedRef = useRef(true); // Vuln 62: Prevent post-unmount updates
  const sendLockRef = useRef(false); // Vuln 63: Prevent concurrent sends

  // Imp 44: Validated settings updater with rate limiting
  const updateSettings = useCallback((partial: Partial<PetSettings>) => {
    if (!checkSettingsRateLimit()) { toast.error("Settings changing too fast."); return; }
    setSettings((prev) => {
      const next = { ...prev };
      // Vuln 64: Validate each field
      if (partial.petName !== undefined) next.petName = sanitizePetName(partial.petName);
      if (partial.primaryColor !== undefined) next.primaryColor = validateColor(partial.primaryColor);
      if (partial.ttsProvider !== undefined) next.ttsProvider = partial.ttsProvider;
      if (partial.sttProvider !== undefined) next.sttProvider = partial.sttProvider;
      if (partial.speechSpeed !== undefined) next.speechSpeed = Math.max(0.5, Math.min(2.0, partial.speechSpeed));
      if (partial.volume !== undefined) next.volume = Math.max(0, Math.min(1, partial.volume));
      if (partial.autoScroll !== undefined) next.autoScroll = partial.autoScroll;
      if (partial.showTimestamps !== undefined) next.showTimestamps = partial.showTimestamps;
      if (partial.reducedMotion !== undefined) next.reducedMotion = partial.reducedMotion;
      if (partial.fontSize !== undefined) next.fontSize = partial.fontSize;
      if (partial.notificationSounds !== undefined) next.notificationSounds = partial.notificationSounds;
      safeSaveSettings(next);
      return next;
    });
  }, []);

  // Imp 45: Auto-scroll with preference
  useEffect(() => {
    if (settings.autoScroll && chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: settings.reducedMotion ? "auto" : "smooth" });
    }
  }, [messages, petSpeakingText, settings.autoScroll, settings.reducedMotion]);

  // Vuln 65: Safe audio context with autoplay policy
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      if (!isWebAudioSupported()) throw new Error("WebAudio not supported");
      audioContextRef.current = new AudioContext();
    }
    // Vuln 66: Resume suspended context
    if (audioContextRef.current.state === "suspended") {
      audioContextRef.current.resume().catch(() => {});
    }
    return audioContextRef.current;
  }, []);

  // Imp 46: Memoized TTS provider
  const activeTTS = useMemo((): "elevenlabs" | "openai" => {
    if (settings.ttsProvider === "elevenlabs") return "elevenlabs";
    if (settings.ttsProvider === "openai") return "openai";
    if (apiKeys.elevenlabsKey) return "elevenlabs";
    return "openai";
  }, [settings.ttsProvider, apiKeys.elevenlabsKey, apiKeys.openaiKey]);

  const hasTTSKey = activeTTS === "elevenlabs" ? !!apiKeys.elevenlabsKey : !!apiKeys.openaiKey;
  const hasSTTKey = !!apiKeys.openaiKey;

  // Imp 47: Speak text with volume control
  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!text.trim() || !mountedRef.current) return;
    // Vuln 67: Prevent concurrent TTS
    if (isSpeakingRef.current) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      setPetSpeakingText(text);
      spokenSoFarRef.current = text;

      let audioBuffer: ArrayBuffer;
      if (activeTTS === "elevenlabs" && apiKeys.elevenlabsKey && validateApiKey(apiKeys.elevenlabsKey)) {
        audioBuffer = await secureTTSElevenLabs(text, apiKeys.elevenlabsKey, settings.speechSpeed, abortController.signal);
      } else if (apiKeys.openaiKey && validateApiKey(apiKeys.openaiKey)) {
        audioBuffer = await secureTTSOpenAI(text, apiKeys.openaiKey, settings.speechSpeed, abortController.signal);
      } else {
        throw new Error("No TTS API key configured. Add keys in Settings.");
      }

      if (abortController.signal.aborted || !mountedRef.current) return;

      const ctx = getAudioContext();
      // Vuln 68: Clone buffer before decode
      const decoded = await ctx.decodeAudioData(audioBuffer.slice(0));
      const source = ctx.createBufferSource();
      source.buffer = decoded;

      // Imp 48: GainNode for volume
      const gainNode = ctx.createGain();
      gainNode.gain.value = settings.volume;
      gainNodeRef.current = gainNode;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      audioSourceRef.current = source;

      source.onended = () => {
        if (!mountedRef.current) return;
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        setPetSpeakingText("");
        audioSourceRef.current = null;
        gainNodeRef.current = null;
      };
      source.start();
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      // Vuln 69: Safe error message
      const safeMsg = safeErrorMessage(err);
      logger.error("AliveSpeech", `TTS: ${safeMsg}`);
      toast.error(`Speech failed: ${safeMsg}`);
      if (mountedRef.current) { setIsSpeaking(false); isSpeakingRef.current = false; setPetSpeakingText(""); }
    }
  }, [activeTTS, apiKeys.elevenlabsKey, apiKeys.openaiKey, settings.speechSpeed, settings.volume, getAudioContext]);

  // Imp 49: Interrupt speech
  const interruptSpeech = useCallback(() => {
    if (audioSourceRef.current) { try { audioSourceRef.current.stop(); } catch { /* */ } audioSourceRef.current = null; }
    gainNodeRef.current = null;
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    const spoken = spokenSoFarRef.current;
    if (spoken) {
      setMessages((prev) => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === "assistant" && !copy[i].interrupted) {
            copy[i] = { ...copy[i], interrupted: true, spokenText: spoken };
            break;
          }
        }
        return copy;
      });
    }
    setPetSpeakingText("");
    logger.action("AliveSpeech", "Speech interrupted");
  }, []);

  // Imp 50: Send message with retry, rate limiting, achievements
  const sendMessage = useCallback(async (userText: string, retryCount = 0) => {
    // Vuln 70: Prevent concurrent sends
    if (sendLockRef.current) return;
    sendLockRef.current = true;
    try {
      // Vuln 71: Validate input
      const validation = validateMessageContent(userText);
      if (!validation.valid) { if (validation.error) toast.error(validation.error); return; }
      const safeText = validation.sanitized;

      // Vuln 72: Rate limit
      if (!checkMessageRateLimit()) { toast.error("Sending too fast! Wait a moment."); return; }

      if (isSpeakingRef.current) interruptSpeech();

      const userMsg: ChatMessage = { id: generateId(), role: "user", content: safeText, timestamp: Date.now(), tokenEstimate: estimateTokens(safeText) };
      setMessages((prev) => [...prev, userMsg].slice(-MAX_CONVERSATION_MESSAGES));
      setIsThinking(true);
      isThinkingRef.current = true;
      setTotalTokensUsed((prev) => prev + estimateTokens(safeText));

      // Imp 51: Update streak & total
      setSettings((prev) => {
        const sd = calculateStreak(prev.lastTalkDate, prev.streak);
        const u = { ...prev, totalMessages: prev.totalMessages + 1, streak: sd.streak, lastTalkDate: sd.date };
        safeSaveSettings(u);
        return u;
      });

      const systemPrompt = buildSecureSystemPrompt(settings.petName, petStats);
      const ctx = buildSafeContext(messages, MAX_CONTEXT_MESSAGES);
      const fullPrompt = [systemPrompt, "", "CONVERSATION:", ...ctx, `user: ${safeText}`, "", `Respond as ${sanitizePetName(settings.petName)} the cat. Keep it short (2-4 sentences). Use [laugh] if laughing. Add meows naturally.`].join("\n");

      const reply = await chatWithAI(fullPrompt, { action: "general" });
      // Vuln 73: Sanitize AI response
      const safeReply = sanitizeText(reply).slice(0, MAX_MESSAGE_LENGTH * 2);

      if (!mountedRef.current) return;
      const assistantMsg: ChatMessage = { id: generateId(), role: "assistant", content: safeReply, timestamp: Date.now(), tokenEstimate: estimateTokens(safeReply) };
      setMessages((prev) => [...prev, assistantMsg].slice(-MAX_CONVERSATION_MESSAGES));
      setIsThinking(false);
      isThinkingRef.current = false;
      setTotalTokensUsed((prev) => prev + estimateTokens(safeReply));

      // Imp 52: Check achievements
      const sessions = getConversationHistory();
      const newAch = checkAchievements(settings, sessions.length);
      if (newAch.length > 0) {
        const first = ACHIEVEMENTS.find((a) => a.id === newAch[0]);
        setSettings((prev) => { const u = { ...prev, achievementsUnlocked: [...prev.achievementsUnlocked, ...newAch] }; safeSaveSettings(u); return u; });
        if (first) { setAchievementPopup(`${first.emoji} ${first.name}`); setTimeout(() => { if (mountedRef.current) setAchievementPopup(null); }, 4000); }
      }

      await speakText(safeReply);
    } catch (err) {
      // Imp 53: Retry logic
      if (retryCount < MAX_RETRY_ATTEMPTS && mountedRef.current) {
        logger.warn("AliveSpeech", `Retrying (${retryCount + 1})`);
        setTimeout(() => sendMessage(userText, retryCount + 1), 1000 * (retryCount + 1));
      } else {
        const safeMsg = safeErrorMessage(err);
        logger.error("AliveSpeech", `Chat: ${safeMsg}`);
        toast.error(`AI error: ${safeMsg}`);
        // Imp 54: Mark failed
        if (mountedRef.current) {
          setMessages((prev) => { const c = [...prev]; if (c.length > 0 && c[c.length - 1].role === "user") c[c.length - 1] = { ...c[c.length - 1], failed: true, retryCount }; return c; });
        }
      }
      if (mountedRef.current) { setIsThinking(false); isThinkingRef.current = false; }
    } finally {
      sendLockRef.current = false;
    }
  }, [messages, settings, petStats, interruptSpeech, speakText]);

  // Imp 55: Mic listening
  const startListening = useCallback(async () => {
    if (!isMediaRecorderSupported()) { toast.error("MediaRecorder not supported."); return; }
    if (!hasSTTKey) { toast.error("No OpenAI key for Whisper STT."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!mountedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      mediaStreamRef.current = stream;
      setIsListening(true);
      // Vuln 74: Handle mic disconnect
      stream.getAudioTracks().forEach((t) => { t.onended = () => { if (mountedRef.current) { toast.error("Mic disconnected."); stopListening(); } }; });

      const ctx = getAudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      analyserRef.current = analyser;
      const dataArray = new Float32Array(analyser.fftSize);

      audioCheckIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !mountedRef.current) return;
        analyserRef.current.getFloatTimeDomainData(dataArray);
        const rms = calculateRMS(dataArray);
        setAudioLevel(rms);
        if (rms > SPEECH_RMS_THRESHOLD) {
          if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
          if (!isRecorderActive(mediaRecorderRef.current)) startRecordingChunk();
          if (isSpeakingRef.current) interruptSpeech();
        } else if (isRecorderActive(mediaRecorderRef.current) && !silenceTimerRef.current) {
          silenceTimerRef.current = setTimeout(() => { stopRecordingAndTranscribe(); silenceTimerRef.current = null; }, SILENCE_THRESHOLD_MS);
        }
      }, AUDIO_CHECK_INTERVAL_MS);
      logger.action("AliveSpeech", "Mic started");
    } catch (err) {
      logger.error("AliveSpeech", `Mic: ${safeErrorMessage(err)}`);
      toast.error("Could not access microphone.");
    }
  }, [getAudioContext, interruptSpeech, hasSTTKey]);

  const startRecordingChunk = useCallback(() => {
    if (!mediaStreamRef.current) return;
    recordedChunksRef.current = [];
    try {
      const mime = getSupportedMimeType();
      const rec = new MediaRecorder(mediaStreamRef.current, { mimeType: mime });
      rec.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      rec.start(250);
      mediaRecorderRef.current = rec;
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
    } catch (err) { logger.error("AliveSpeech", `Recorder: ${safeErrorMessage(err)}`); }
  }, []);

  const stopRecordingAndTranscribe = useCallback(async () => {
    if (!isRecorderActive(mediaRecorderRef.current)) return;
    return new Promise<void>((resolve) => {
      const rec = mediaRecorderRef.current!;
      rec.onstop = async () => {
        if (!mountedRef.current) { resolve(); return; }
        setIsRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: rec.mimeType || "audio/webm" });
        recordedChunksRef.current = [];
        if (blob.size < 1000) { resolve(); return; }
        try {
          if (apiKeys.openaiKey && validateApiKey(apiKeys.openaiKey)) {
            const t = await secureSTTWhisper(blob, apiKeys.openaiKey);
            if (t.trim() && mountedRef.current) { setUserTranscript(t); await sendMessage(t.trim()); if (mountedRef.current) setUserTranscript(""); }
          }
        } catch (err) { logger.error("AliveSpeech", `STT: ${safeErrorMessage(err)}`); }
        resolve();
      };
      rec.stop();
    });
  }, [apiKeys.openaiKey, sendMessage]);

  // Vuln 75: Complete cleanup
  const stopListening = useCallback(() => {
    if (audioCheckIntervalRef.current) { clearInterval(audioCheckIntervalRef.current); audioCheckIntervalRef.current = null; }
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (isRecorderActive(mediaRecorderRef.current)) mediaRecorderRef.current!.stop();
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach((t) => t.stop()); mediaStreamRef.current = null; }
    analyserRef.current = null;
    setIsListening(false); setIsRecording(false); setAudioLevel(0);
  }, []);

  // Imp 56: Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopListening();
      if (audioSourceRef.current) { try { audioSourceRef.current.stop(); } catch { /* */ } }
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close().catch(() => {});
    };
  }, [stopListening]);

  // Imp 57: Load conversation on mount & auto-greet
  useEffect(() => {
    let convId = settings.conversationId;
    if (!convId) {
      convId = generateConversationId();
      setSettings((prev) => { const u = { ...prev, conversationId: convId }; safeSaveSettings(u); return u; });
    }
    const loaded = loadConversation(convId);
    if (loaded.length > 0) { setMessages(loaded); setIsReady(true); }
    else {
      const t = setTimeout(() => {
        if (!mountedRef.current) return;
        const g = generateGreeting(settings.petName);
        setMessages([{ id: generateId(), role: "assistant", content: g, timestamp: Date.now() }]);
        setIsReady(true);
        speakText(g);
      }, 1000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Imp 58: Auto-save conversation (debounced)
  useEffect(() => {
    if (messages.length === 0 || !settings.conversationId) return;
    const t = setTimeout(() => {
      saveConversation(settings.conversationId, messages);
      const first = messages.find((m) => m.role === "user");
      saveConversationToHistory({ id: settings.conversationId, startedAt: messages[0].timestamp, lastMessageAt: messages[messages.length - 1].timestamp, messageCount: messages.length, preview: first?.content.slice(0, 60) || "New conversation" });
    }, 2000);
    return () => clearTimeout(t);
  }, [messages, settings.conversationId]);

  // Imp 59: Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") { if (showSettings) setShowSettings(false); else if (showHistory) setShowHistory(false); else if (showQuickReplies) setShowQuickReplies(false); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [showSettings, showHistory, showQuickReplies]);

  // Imp 60: Real-time volume update
  useEffect(() => { if (gainNodeRef.current) gainNodeRef.current.gain.value = settings.volume; }, [settings.volume]);

  const handleTextSubmit = (e: React.FormEvent) => { e.preventDefault(); if (textInput.trim() && !isThinking) { sendMessage(textInput.trim()); setTextInput(""); } };

  // Imp 61: New conversation
  const startNewConversation = useCallback(() => {
    const newId = generateConversationId();
    setMessages([]);
    setSettings((prev) => { const u = { ...prev, conversationId: newId }; safeSaveSettings(u); return u; });
    const g = generateGreeting(settings.petName);
    setMessages([{ id: generateId(), role: "assistant", content: g, timestamp: Date.now() }]);
    speakText(g);
    setShowHistory(false);
  }, [settings.petName, speakText]);

  // Imp 62: Load specific conversation
  const loadSpecificConversation = useCallback((convId: string) => {
    const loaded = loadConversation(convId);
    if (loaded.length > 0) { setMessages(loaded); setSettings((prev) => { const u = { ...prev, conversationId: convId }; safeSaveSettings(u); return u; }); setShowHistory(false); }
  }, []);

  // Imp 63: Export conversation
  const handleExport = useCallback(() => {
    const text = exportConversationText(messages, settings.petName);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `alive-speech-${new Date().toISOString().slice(0, 10)}.txt`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported!");
  }, [messages, settings.petName]);

  // Imp 64: Retry failed message
  const retryMessage = useCallback((msgId: string) => {
    const m = messages.find((x) => x.id === msgId);
    if (m && m.role === "user" && m.failed) { setMessages((prev) => prev.filter((x) => x.id !== msgId)); sendMessage(m.content); }
  }, [messages, sendMessage]);

  // Imp 65: Copy message
  const copyMessage = useCallback((content: string) => { navigator.clipboard.writeText(content).then(() => toast.success("Copied!")).catch(() => {}); }, []);

  // Imp 66: History data (memoized)
  const historyData = useMemo(() => showHistory ? getConversationHistory().reverse() : [], [showHistory]);

  const fontClass = FONT_SIZE_CLASSES[settings.fontSize] || "text-sm";
  const streakDisplay = settings.streak > 0 ? `${settings.streak}d streak` : "";
  const timeGreeting = useMemo(() => getTimeGreeting(), []);

  // =========================================================================
  // RENDER
  // =========================================================================

  return (
    <div className="w-full h-screen relative overflow-hidden" role="main" aria-label="Alive Speech">
      {/* Imp 67: VirtualPet behind */}
      <div className="absolute inset-0 z-0" aria-hidden="true"><VirtualPet /></div>

      {/* Imp 68: Achievement popup */}
      {achievementPopup && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-2xl shadow-2xl animate-bounce font-bold text-lg pointer-events-none" role="alert">
          Achievement Unlocked: {achievementPopup}
        </div>
      )}

      {overlayActive && (
        <div className="absolute inset-0 z-10 bg-black/75 backdrop-blur-sm flex flex-col">
          {/* ---- HEADER ---- */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-purple-900/90 via-pink-900/90 to-fuchsia-900/90 border-b border-pink-500/30 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold border-2 shadow-lg" style={{ backgroundColor: settings.primaryColor + "33", borderColor: settings.primaryColor }}>{"\uD83D\uDE4A"}</div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight flex items-center gap-2">
                  {settings.petName}
                  <span className="text-[10px] font-normal text-pink-300 bg-pink-500/20 px-1.5 py-0.5 rounded-full">ASp</span>
                  {isReady && <span className="w-2 h-2 rounded-full bg-green-400" title="Connected" />}
                </h1>
                <p className="text-xs text-pink-300 flex items-center gap-1.5">
                  {timeGreeting}
                  {isSpeaking && <span className="text-green-300"> - Speaking</span>}
                  {isThinking && <span className="text-yellow-300"> - Thinking</span>}
                  {isRecording && <span className="text-red-300"> - Listening</span>}
                  {streakDisplay && <span className="ml-1 text-amber-300">{"\uD83D\uDD25"}{streakDisplay}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="text-[9px] text-pink-300/60 bg-pink-500/10 px-1.5 py-0.5 rounded" title="TTS">{activeTTS === "elevenlabs" ? "EL v3" : "OAI"}</div>
              <div className="text-[9px] text-pink-300/60 bg-pink-500/10 px-1.5 py-0.5 rounded" title="Tokens">~{totalTokensUsed}t</div>
              <button onClick={() => setShowHistory(!showHistory)} className="px-2 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition" title="History" aria-label="History">{"\uD83D\uDCDC"}</button>
              <button onClick={() => { setShowSettings(!showSettings); setSettingsTab("general"); }} className="px-2 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition" title="Settings" aria-label="Settings">{"\u2699\uFE0F"}</button>
              <button onClick={() => setOverlayActive(false)} className="px-2 py-1.5 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg transition" title="Minimize" aria-label="Minimize">{"\u2B07\uFE0F"}</button>
              <button onClick={() => navigate("/")} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg text-xs font-bold text-white transition">Exit</button>
            </div>
          </div>

          {/* ---- SETTINGS PANEL (Imp 69: Tabbed) ---- */}
          {showSettings && (
            <div className="absolute top-14 right-4 z-50 w-80 bg-gray-900/95 border border-pink-500/30 rounded-xl shadow-2xl backdrop-blur-lg overflow-hidden" role="dialog" aria-label="Settings">
              <div className="flex border-b border-gray-700">
                {(["general", "voice", "display", "about"] as const).map((tab) => (
                  <button key={tab} onClick={() => setSettingsTab(tab)} className={`flex-1 py-2 text-xs font-bold capitalize transition ${settingsTab === tab ? "text-pink-400 border-b-2 border-pink-400 bg-pink-500/10" : "text-gray-400 hover:text-gray-200"}`}>{tab}</button>
                ))}
              </div>
              <div className="p-4 max-h-80 overflow-y-auto space-y-3">
                {settingsTab === "general" && (<>
                  <label className="block"><span className="text-xs text-gray-400">Pet Name</span><input type="text" value={settings.petName} onChange={(e) => updateSettings({ petName: e.target.value })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-pink-500 focus:outline-none" maxLength={30} /></label>
                  <label className="block"><span className="text-xs text-gray-400">Primary Color</span><div className="flex items-center gap-2 mt-1"><input type="color" value={settings.primaryColor} onChange={(e) => updateSettings({ primaryColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border-0" /><span className="text-xs text-gray-500">{settings.primaryColor}</span></div></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.notificationSounds} onChange={(e) => updateSettings({ notificationSounds: e.target.checked })} className="rounded" /><span className="text-xs text-gray-300">Notification sounds</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.autoScroll} onChange={(e) => updateSettings({ autoScroll: e.target.checked })} className="rounded" /><span className="text-xs text-gray-300">Auto-scroll messages</span></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.showTimestamps} onChange={(e) => updateSettings({ showTimestamps: e.target.checked })} className="rounded" /><span className="text-xs text-gray-300">Show timestamps</span></label>
                </>)}
                {settingsTab === "voice" && (<>
                  <label className="block"><span className="text-xs text-gray-400">TTS Provider</span><select value={settings.ttsProvider} onChange={(e) => updateSettings({ ttsProvider: e.target.value as TTSProvider })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-pink-500 focus:outline-none"><option value="auto">Auto (ElevenLabs preferred)</option><option value="elevenlabs">ElevenLabs v3 Only</option><option value="openai">OpenAI TTS Only</option></select></label>
                  <label className="block"><span className="text-xs text-gray-400">STT Provider</span><select value={settings.sttProvider} onChange={(e) => updateSettings({ sttProvider: e.target.value as STTProvider })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-pink-500 focus:outline-none"><option value="auto">Auto (Whisper preferred)</option><option value="whisper">OpenAI Whisper Only</option><option value="elevenlabs">ElevenLabs STT Only</option></select></label>
                  <label className="block"><span className="text-xs text-gray-400">Speed: {settings.speechSpeed.toFixed(2)}x</span><input type="range" min="0.5" max="2" step="0.05" value={settings.speechSpeed} onChange={(e) => updateSettings({ speechSpeed: parseFloat(e.target.value) })} className="w-full mt-1" /></label>
                  <label className="block"><span className="text-xs text-gray-400">Volume: {Math.round(settings.volume * 100)}%</span><input type="range" min="0" max="1" step="0.05" value={settings.volume} onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })} className="w-full mt-1" /></label>
                  <div className="pt-2 border-t border-gray-700 space-y-1">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">API Keys</p>
                    {[{ l: "ElevenLabs", ok: !!apiKeys.elevenlabsKey }, { l: "OpenAI", ok: !!apiKeys.openaiKey }, { l: "OpenRouter", ok: !!apiKeys.openrouterKey }].map((k) => (
                      <div key={k.l} className="flex items-center gap-2 text-xs"><span className={`w-2 h-2 rounded-full ${k.ok ? "bg-green-500" : "bg-red-500"}`} /><span className="text-gray-400">{k.l}: {k.ok ? "OK" : "Not set"}</span></div>
                    ))}
                  </div>
                </>)}
                {settingsTab === "display" && (<>
                  <label className="block"><span className="text-xs text-gray-400">Font Size</span><select value={settings.fontSize} onChange={(e) => updateSettings({ fontSize: e.target.value as "sm" | "base" | "lg" })} className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-pink-500 focus:outline-none"><option value="sm">Small</option><option value="base">Medium</option><option value="lg">Large</option></select></label>
                  <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.reducedMotion} onChange={(e) => updateSettings({ reducedMotion: e.target.checked })} className="rounded" /><span className="text-xs text-gray-300">Reduce motion</span></label>
                </>)}
                {settingsTab === "about" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-300"><b>Messages:</b> {settings.totalMessages}</p>
                    <p className="text-xs text-gray-300"><b>Streak:</b> {settings.streak} days</p>
                    <p className="text-xs text-gray-300"><b>Achievements:</b> {settings.achievementsUnlocked.length}/{ACHIEVEMENTS.length}</p>
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {ACHIEVEMENTS.map((a) => (
                        <div key={a.id} className={`text-center p-1 rounded ${settings.achievementsUnlocked.includes(a.id) ? "bg-yellow-500/20" : "bg-gray-800 opacity-40"}`} title={`${a.name}: ${a.description}`}><span className="text-lg">{a.emoji}</span></div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button onClick={handleExport} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition">Export</button>
                      <button onClick={startNewConversation} className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold transition">New Chat</button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setShowSettings(false)} className="w-full py-2 bg-pink-600 hover:bg-pink-700 text-white text-sm font-bold transition">Done</button>
            </div>
          )}

          {/* ---- HISTORY PANEL (Imp 70) ---- */}
          {showHistory && (
            <div className="absolute top-14 left-4 z-50 w-72 bg-gray-900/95 border border-pink-500/30 rounded-xl shadow-2xl backdrop-blur-lg overflow-hidden" role="dialog" aria-label="History">
              <div className="p-3 border-b border-gray-700 flex justify-between items-center">
                <h3 className="text-white font-bold text-sm">{"\uD83D\uDCDC"} History</h3>
                <button onClick={startNewConversation} className="px-2 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded text-[10px] font-bold">+ New</button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {historyData.length === 0 && <p className="text-xs text-gray-500 p-3">No conversations yet.</p>}
                {historyData.map((s) => (
                  <button key={s.id} onClick={() => loadSpecificConversation(s.id)} className={`w-full text-left px-3 py-2 hover:bg-gray-800 border-b border-gray-800 transition ${s.id === settings.conversationId ? "bg-pink-900/30" : ""}`}>
                    <p className="text-xs text-white truncate">{s.preview}</p>
                    <p className="text-[10px] text-gray-500">{s.messageCount} msgs - {formatTimestamp(s.lastMessageAt)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---- CHAT AREA ---- */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" role="log" aria-live="polite">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${fontClass} ${msg.role === "user" ? `bg-blue-600 text-white rounded-br-md ${msg.failed ? "border-2 border-red-500" : ""}` : "bg-gray-800 text-gray-100 rounded-bl-md border border-pink-500/20"} ${msg.interrupted ? "opacity-80" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xs font-bold" style={{ color: settings.primaryColor }}>{settings.petName}</span>
                        {msg.interrupted && <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">interrupted</span>}
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.interrupted && msg.spokenText ? msg.spokenText + "..." : msg.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {settings.showTimestamps && <span className="text-[9px] text-gray-500">{formatTimestamp(msg.timestamp)}</span>}
                      {msg.tokenEstimate && <span className="text-[9px] text-gray-600">~{msg.tokenEstimate}t</span>}
                      <button onClick={() => copyMessage(msg.content)} className="text-[9px] text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition" title="Copy">copy</button>
                      {msg.failed && <button onClick={() => retryMessage(msg.id)} className="text-[9px] text-red-400 hover:text-red-300 font-bold">retry</button>}
                    </div>
                  </div>
                </div>
              ))}

              {/* Imp 71: Speaking indicator */}
              {isSpeaking && petSpeakingText && (
                <div className="flex justify-start">
                  <div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm bg-gray-800/80 text-gray-100 rounded-bl-md border border-pink-500/30 animate-pulse">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-bold" style={{ color: settings.primaryColor }}>{settings.petName}</span>
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full bg-green-400 ${settings.reducedMotion ? "" : "animate-ping"}`} />speaking
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Imp 72: Thinking indicator */}
              {isThinking && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-2.5 text-sm bg-gray-800/60 text-gray-400 rounded-bl-md border border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 150, 300].map((d) => <span key={d} className={`w-2 h-2 rounded-full bg-pink-400 ${settings.reducedMotion ? "opacity-60" : "animate-bounce"}`} style={settings.reducedMotion ? {} : { animationDelay: `${d}ms` }} />)}
                      </div>
                      <span className="text-xs">{settings.petName} is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              {userTranscript && (
                <div className="flex justify-end"><div className="max-w-[75%] rounded-2xl px-4 py-2.5 text-sm bg-blue-600/50 text-blue-200 rounded-br-md border border-blue-500/30 italic">{userTranscript}...</div></div>
              )}
            </div>

            {/* ---- BOTTOM CONTROLS ---- */}
            <div className="px-4 py-3 bg-gray-900/90 border-t border-gray-700/50">
              {/* Imp 73: Audio level bar */}
              {isListening && (
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-pink-500 rounded-full transition-all duration-100" style={{ width: `${Math.min(100, audioLevel * 1000)}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{isRecording ? "Recording" : "Listening"}</span>
                </div>
              )}

              {/* Imp 74: Quick replies */}
              {showQuickReplies && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {QUICK_REPLIES.map((qr, i) => (
                    <button key={i} onClick={() => { sendMessage(qr.text); setShowQuickReplies(false); }} className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full text-xs border border-gray-700 transition" disabled={isThinking}>
                      {qr.emoji} {qr.text}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button onClick={isListening ? stopListening : startListening} disabled={!hasSTTKey} className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all ${isListening ? `bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 ${settings.reducedMotion ? "" : "animate-pulse"}` : hasSTTKey ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-gray-800 text-gray-600 cursor-not-allowed"}`} title={isListening ? "Stop" : "Listen"} aria-label={isListening ? "Stop listening" : "Start listening"}>
                  {isListening ? "\uD83D\uDD34" : "\uD83C\uDFA4"}
                </button>

                {/* Imp 75: Quick reply toggle */}
                <button onClick={() => setShowQuickReplies(!showQuickReplies)} className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-lg bg-gray-700 hover:bg-gray-600 text-white transition" title="Quick replies" aria-label="Quick replies">
                  {"\u26A1"}
                </button>

                <form onSubmit={handleTextSubmit} className="flex-1 flex gap-2">
                  <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value.slice(0, MAX_MESSAGE_LENGTH))} placeholder={`Talk to ${settings.petName}...`} className={`flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white ${fontClass} focus:border-pink-500 focus:outline-none placeholder-gray-500`} disabled={isThinking} maxLength={MAX_MESSAGE_LENGTH} aria-label="Message input" />
                  <button type="submit" disabled={!textInput.trim() || isThinking} className="px-4 py-2.5 bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl text-sm font-bold transition">Send</button>
                </form>

                {isSpeaking && (
                  <button onClick={interruptSpeech} className={`flex-shrink-0 px-3 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-sm font-bold transition ${settings.reducedMotion ? "" : "animate-pulse"}`} title="Interrupt" aria-label="Stop speaking">{"\u270B"} Stop</button>
                )}
              </div>

              {!hasTTSKey && !hasSTTKey && (
                <p className="text-[10px] text-red-400/70 mt-2 text-center">
                  No API keys configured.{" "}
                  <button onClick={() => navigate("/settings")} className="underline hover:text-red-300">Open Settings</button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Minimized bar */}
      {!overlayActive && (
        <div className="absolute bottom-4 right-4 z-20">
          <button onClick={() => setOverlayActive(true)} className={`flex items-center gap-2 px-4 py-3 bg-pink-600/90 hover:bg-pink-700 text-white rounded-xl shadow-2xl backdrop-blur-sm border border-pink-500/30 transition-all ${settings.reducedMotion ? "" : "hover:scale-105"}`} aria-label="Open Alive Speech">
            <span className="text-lg">{"\uD83D\uDE4A"}</span>
            <span className="font-bold text-sm">Alive Speech</span>
            {isSpeaking && <span className={`w-2 h-2 rounded-full bg-green-400 ${settings.reducedMotion ? "" : "animate-ping"}`} />}
            {isListening && <span className={`w-2 h-2 rounded-full bg-red-400 ${settings.reducedMotion ? "" : "animate-pulse"}`} />}
          </button>
        </div>
      )}
    </div>
  );
}
