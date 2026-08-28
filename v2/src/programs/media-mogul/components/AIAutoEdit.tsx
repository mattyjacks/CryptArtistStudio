import React, { useState } from "react";
import { useAI } from "../../../core/context/AIContext";
import { useProject } from "../../../core/context/ProjectContext";
import { AutoEditPlan } from "../../../core/types/ai.types";

export const AIAutoEdit: React.FC = () => {
  const { engine, isConfigured, isPasswordVaultActive } = useAI();
  const { addClipToTrack, addMarker } = useProject();

  const [promptTopic, setPromptTopic] = useState("A 30-second fast-paced teaser for CryptArtist Studio v2 with cyber aesthetics");
  const [stylePreset, setStylePreset] = useState("cinematic");
  const [targetDurationSec, setTargetDurationSec] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState<AutoEditPlan | null>(null);

  // Auto-Captions state
  const [captionInput, setCaptionInput] = useState("Welcome to CryptArtist Studio v2. The most powerful browser native creative suite.");
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);

  // TTS Voiceover state
  const [ttsScript, setTtsScript] = useState("Experience the next evolution of in-browser video editing with Media Mogul.");
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Generate Script & Auto-Edit Plan
  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptTopic.trim()) return;

    setIsGenerating(true);
    try {
      const generatedPlan = await engine.generateAutoEditPlan(
        `${promptTopic} (Style: ${stylePreset})`,
        targetDurationSec
      );
      setPlan(generatedPlan);
    } catch (e: any) {
      alert(`Auto-Edit generation failed: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Apply Auto-Edit Plan directly to Timeline Tracks
  const handleApplyToTimeline = () => {
    if (!plan) return;

    let currentFrameCursor = 0;

    plan.shots.forEach((shot, index) => {
      const durationFrames = (shot.durationSeconds || 5) * 30;
      const startFrame = currentFrameCursor;
      const endFrame = startFrame + durationFrames;

      // Add visual clip
      addClipToTrack("v1", {
        id: `clip_ai_shot_${index}_${Date.now()}`,
        trackId: "v1",
        name: `Shot ${index + 1}: ${shot.description.substring(0, 24)}...`,
        mediaId: `m_ai_${index}`,
        mediaType: "video",
        startFrame,
        endFrame,
        sourceStartFrame: 0,
        sourceEndFrame: durationFrames,
        speed: 1.0,
        color: index % 2 === 0 ? "#7b2ff7" : "#00d2ff",
        transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
        colorGrading: {
          lift: { r: 0, g: 0, b: 0, y: 0 },
          gamma: { r: 0, g: 0, b: 0, y: 0 },
          gain: { r: 0, g: 0, b: 0, y: 0 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
          saturation: 1.1,
          contrast: 1.05,
          temperature: 0,
          tint: 0,
          highlights: 0,
          shadows: 0,
          chromaKeyEnabled: false,
          chromaColor: "#00ff00",
          chromaSimilarity: 0.4,
          chromaSmoothness: 0.1,
        },
        volume: 100,
        pan: 0,
      });

      // Add speech/text clip overlay
      if (shot.narrationScript) {
        addClipToTrack("v3", {
          id: `clip_ai_text_${index}_${Date.now()}`,
          trackId: "v3",
          name: `Subtitle ${index + 1}`,
          mediaId: `m_text_${index}`,
          mediaType: "text",
          textContent: shot.narrationScript,
          textStyle: {
            fontSize: 36,
            fontFamily: "Inter, sans-serif",
            textColor: "#ffffff",
            strokeColor: "#000000",
            strokeWidth: 3,
            position: "bottom",
            shadowColor: "rgba(0,0,0,0.8)",
            shadowBlur: 10,
          },
          startFrame,
          endFrame,
          sourceStartFrame: 0,
          sourceEndFrame: durationFrames,
          speed: 1.0,
          color: "#ec4899",
          transform: { x: 0, y: 35, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
          colorGrading: {
            lift: { r: 0, g: 0, b: 0, y: 0 },
            gamma: { r: 0, g: 0, b: 0, y: 0 },
            gain: { r: 0, g: 0, b: 0, y: 0 },
            offset: { r: 0, g: 0, b: 0, y: 0 },
            saturation: 1.0,
            contrast: 1.0,
            temperature: 0,
            tint: 0,
            highlights: 0,
            shadows: 0,
            chromaKeyEnabled: false,
            chromaColor: "#00ff00",
            chromaSimilarity: 0.4,
            chromaSmoothness: 0.1,
          },
          volume: 100,
          pan: 0,
        });
      }

      // Add scene marker
      addMarker(startFrame, `Shot ${index + 1}`);

      currentFrameCursor = endFrame;
    });

    alert("✨ Auto-Edit plan assembled onto Video and Subtitle tracks with markers!");
  };

  // Browser SpeechSynthesis Voiceover Preview
  const handlePreviewTTS = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(ttsScript);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Add TTS Audio clip onto timeline
  const handleAddTTSToTimeline = () => {
    addClipToTrack("a1", {
      id: `clip_tts_${Date.now()}`,
      trackId: "a1",
      name: "AI_Voiceover_Generated.wav",
      mediaId: "m_tts_gen",
      mediaType: "audio",
      startFrame: 0,
      endFrame: 180,
      sourceStartFrame: 0,
      sourceEndFrame: 180,
      speed: 1.0,
      color: "#4ade80",
      transform: { x: 0, y: 0, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
      colorGrading: {
        lift: { r: 0, g: 0, b: 0, y: 0 },
        gamma: { r: 0, g: 0, b: 0, y: 0 },
        gain: { r: 0, g: 0, b: 0, y: 0 },
        offset: { r: 0, g: 0, b: 0, y: 0 },
        saturation: 1.0,
        contrast: 1.0,
        temperature: 0,
        tint: 0,
        highlights: 0,
        shadows: 0,
        chromaKeyEnabled: false,
        chromaColor: "#00ff00",
        chromaSimilarity: 0.4,
        chromaSmoothness: 0.1,
      },
      volume: 95,
      pan: 0,
    });
    alert("🎙️ AI Voiceover placed onto Audio Track 1!");
  };

  // Generate Timestamped Subtitles
  const handleGenerateCaptions = () => {
    setIsGeneratingCaptions(true);
    const words = captionInput.split(" ");
    const chunkSize = 4;
    let cursor = 0;

    for (let i = 0; i < words.length; i += chunkSize) {
      const phrase = words.slice(i, i + chunkSize).join(" ");
      const startFrame = cursor;
      const endFrame = startFrame + 45; // 1.5s per chunk

      addClipToTrack("v3", {
        id: `clip_cap_${i}_${Date.now()}`,
        trackId: "v3",
        name: `Caption ${Math.floor(i / chunkSize) + 1}`,
        mediaId: `m_cap_${i}`,
        mediaType: "text",
        textContent: phrase,
        textStyle: {
          fontSize: 34,
          fontFamily: "Inter, sans-serif",
          textColor: "#00d2ff",
          strokeColor: "#000000",
          strokeWidth: 3,
          position: "bottom",
          shadowColor: "rgba(0,0,0,0.9)",
          shadowBlur: 12,
        },
        startFrame,
        endFrame,
        sourceStartFrame: 0,
        sourceEndFrame: 45,
        speed: 1.0,
        color: "#ec4899",
        transform: { x: 0, y: 38, scale: 1.0, rotation: 0, opacity: 1.0, blendMode: "normal" },
        colorGrading: {
          lift: { r: 0, g: 0, b: 0, y: 0 },
          gamma: { r: 0, g: 0, b: 0, y: 0 },
          gain: { r: 0, g: 0, b: 0, y: 0 },
          offset: { r: 0, g: 0, b: 0, y: 0 },
          saturation: 1.0,
          contrast: 1.0,
          temperature: 0,
          tint: 0,
          highlights: 0,
          shadows: 0,
          chromaKeyEnabled: false,
          chromaColor: "#00ff00",
          chromaSimilarity: 0.4,
          chromaSmoothness: 0.1,
        },
        volume: 100,
        pan: 0,
      });

      cursor = endFrame + 5;
    }

    setIsGeneratingCaptions(false);
    alert("💬 Auto-Captions populated on Track v3!");
  };

  return (
    <div className="flex flex-col h-full bg-studio-panel p-4 overflow-y-auto">
      <div className="border-b border-studio-border pb-3 mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-studio-text flex items-center gap-2">
            <span>🤖</span> Media Mogul AI Studio
          </h2>
          <p className="text-xs text-studio-muted">
            Script-to-Video generation, AI text-to-speech voiceovers, and auto-caption alignment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-mono px-2 py-0.5 rounded border ${
              isConfigured
                ? "bg-studio-green/10 text-studio-green border-studio-green/30"
                : "bg-studio-yellow/10 text-studio-yellow border-studio-yellow/30"
            }`}
          >
            {isConfigured
              ? `AI Vault: ${isPasswordVaultActive ? "Password Unlocked" : "BYOK Key Active"}`
              : "AI: Enter Key or Password in Settings"}
          </span>
        </div>
      </div>

      {/* Main AI Feature Panels */}
      <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto flex-1">
        {/* Left Column: Script-to-Video Generator */}
        <div className="space-y-4">
          <div className="bg-studio-surface/60 border border-studio-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-studio-cyan flex items-center gap-1.5">
              <span>🪄</span> Script-to-Video Auto-Editor
            </h3>
            <form onSubmit={handleGeneratePlan} className="space-y-3">
              <div>
                <label className="text-[11px] text-studio-secondary block mb-1">
                  Video Concept & Topic Prompt
                </label>
                <textarea
                  rows={3}
                  value={promptTopic}
                  onChange={(e) => setPromptTopic(e.target.value)}
                  className="w-full bg-studio-bg border border-studio-border rounded-lg p-2.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                  placeholder="Describe your video idea..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-studio-secondary block mb-1">Visual Style</label>
                  <select
                    value={stylePreset}
                    onChange={(e) => setStylePreset(e.target.value)}
                    className="w-full bg-studio-bg border border-studio-border rounded px-2.5 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                  >
                    <option value="cinematic">Cinematic & Dramatic</option>
                    <option value="tech-promo">Fast Tech Promo</option>
                    <option value="vlog">Casual YouTube Vlog</option>
                    <option value="retro-synth">Retro Synthwave 80s</option>
                    <option value="documentary">Documentary Story</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-studio-secondary block mb-1">Duration</label>
                  <select
                    value={targetDurationSec}
                    onChange={(e) => setTargetDurationSec(parseInt(e.target.value, 10))}
                    className="w-full bg-studio-bg border border-studio-border rounded px-2.5 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
                  >
                    <option value="15">15 Seconds (Shorts/TikTok)</option>
                    <option value="30">30 Seconds (Commercial)</option>
                    <option value="60">60 Seconds (Trailer)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-2 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-xs rounded-lg transition shadow-glow-sm flex items-center justify-center gap-1.5"
              >
                <span>{isGenerating ? "⚡ Generating AI Scenes..." : "✨ Generate Auto-Edit Plan"}</span>
              </button>
            </form>

            {/* Generated Plan Overview */}
            {plan && (
              <div className="border-t border-studio-border pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-studio-text">{plan.title}</span>
                  <span className="text-[10px] font-mono text-studio-cyan">{plan.targetDurationSeconds}s total</span>
                </div>
                <div className="max-h-44 overflow-y-auto space-y-1.5 text-xs pr-1">
                  {plan.shots.map((sc, i) => (
                    <div key={i} className="p-2 rounded bg-studio-bg border border-studio-border space-y-0.5">
                      <div className="flex justify-between text-[11px] font-semibold text-studio-secondary">
                        <span>Shot {i + 1} ({sc.durationSeconds}s)</span>
                        <span className="text-studio-purple">{sc.shotType}</span>
                      </div>
                      <p className="text-[11px] text-studio-text">{sc.description}</p>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleApplyToTimeline}
                  className="w-full py-1.5 bg-studio-purple hover:bg-studio-purple/80 text-white font-bold text-xs rounded-lg transition shadow-glow-purple flex items-center justify-center gap-1.5 mt-2"
                >
                  <span>🎬</span> Assemble to Timeline Tracks
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Voiceover & Auto-Captions */}
        <div className="space-y-4">
          {/* AI Voiceover Generator */}
          <div className="bg-studio-surface/60 border border-studio-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-studio-green flex items-center gap-1.5">
              <span>🎙️</span> AI Voiceover (Text-to-Speech)
            </h3>
            <div className="space-y-2">
              <label className="text-[11px] text-studio-secondary block">Narration Script</label>
              <textarea
                rows={3}
                value={ttsScript}
                onChange={(e) => setTtsScript(e.target.value)}
                className="w-full bg-studio-bg border border-studio-border rounded-lg p-2 text-xs text-studio-text focus:outline-none focus:border-studio-green"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-studio-bg border border-studio-border rounded px-2.5 py-1.5 text-xs text-studio-secondary"
              >
                <option value="alloy">Alloy (Neutral & Clear)</option>
                <option value="echo">Echo (Warm & Authoritative)</option>
                <option value="fable">Fable (Expressive Storyteller)</option>
                <option value="onyx">Onyx (Deep & Cinematic)</option>
                <option value="nova">Nova (Bright & Energetic)</option>
              </select>
              <button
                onClick={handlePreviewTTS}
                className="px-3 py-1.5 bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-text rounded text-xs transition"
              >
                {isSpeaking ? "⏹ Stop" : "▶ Preview"}
              </button>
              <button
                onClick={handleAddTTSToTimeline}
                className="flex-1 py-1.5 bg-studio-green hover:bg-studio-green/80 text-black font-bold text-xs rounded transition shadow-glow-green"
              >
                + Add Audio to A1
              </button>
            </div>
          </div>

          {/* AI Auto-Captions Subtitles */}
          <div className="bg-studio-surface/60 border border-studio-border rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-studio-pink flex items-center gap-1.5">
              <span>💬</span> AI Auto-Captions (Subtitles)
            </h3>
            <div className="space-y-2">
              <label className="text-[11px] text-studio-secondary block">Caption Transcript Text</label>
              <textarea
                rows={3}
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                className="w-full bg-studio-bg border border-studio-border rounded-lg p-2 text-xs text-studio-text focus:outline-none focus:border-studio-pink"
              />
            </div>
            <button
              onClick={handleGenerateCaptions}
              disabled={isGeneratingCaptions}
              className="w-full py-2 bg-studio-pink hover:bg-studio-pink/80 text-white font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5"
            >
              <span>💬</span> Generate Aligned Subtitle Clips on v3
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAutoEdit;
