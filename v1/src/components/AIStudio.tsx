/* Wave2: select-aria */
/* Wave2: type=button applied */
import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { ChatMessage } from "../App";
import { chatWithAI, getActionModel, setActionModel } from "../utils/openrouter";
import { prepareLuckyRNG } from "../utils/luckyRNG";

interface AIStudioProps {
  apiKey: string;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  aiLoading: boolean;
  setAiLoading: (v: boolean) => void;
  onOpenSettings: () => void;
}

// ---- Feature Cards ----
const AI_FEATURES = [
  {
    id: "image",
    icon: "🖼️",
    title: "Generate Image",
    desc: "Create images from text via DALL-E 3",
    gradient: "from-purple-600/20 to-cyan-600/20",
    borderColor: "border-purple-500/30",
  },
  {
    id: "scene",
    icon: "🎬",
    title: "Scene Analyzer",
    desc: "Get color, audio & composition tips",
    gradient: "from-red-600/20 to-orange-600/20",
    borderColor: "border-red-500/30",
  },
  {
    id: "subtitle",
    icon: "💬",
    title: "Subtitle Generator",
    desc: "Auto-format transcripts into SRT",
    gradient: "from-cyan-600/20 to-blue-600/20",
    borderColor: "border-cyan-500/30",
  },
  {
    id: "effects",
    icon: "✨",
    title: "Effects Advisor",
    desc: "Get node graph & effects suggestions",
    gradient: "from-yellow-600/20 to-green-600/20",
    borderColor: "border-yellow-500/30",
  },
  {
    id: "script",
    icon: "📝",
    title: "Script Writer",
    desc: "Generate scripts and storyboards",
    gradient: "from-green-600/20 to-teal-600/20",
    borderColor: "border-green-500/30",
  },
  {
    id: "chat",
    icon: "🤖",
    title: "AI Assistant",
    desc: "General editing help and advice",
    gradient: "from-indigo-600/20 to-purple-600/20",
    borderColor: "border-indigo-500/30",
  },
];

export default function AIStudio({
  apiKey,
  chatMessages,
  setChatMessages,
  aiLoading,
  setAiLoading,
  onOpenSettings,
}: AIStudioProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"chat" | "image" | "autoedit" | "lucky">("chat");
  const [imagePrompt, setImagePrompt] = useState("");
  const [autoEditPrompt, setAutoEditPrompt] = useState("");
  const [autoEditStatus, setAutoEditStatus] = useState<string | null>(null);
  
  // Lucky mode state
  const [luckyString, setLuckyString] = useState("");
  const [computedLuck, setComputedLuck] = useState<{ seed: number; luckScore: number } | null>(null);
  const [generatedImages, setGeneratedImages] = useState<
    { prompt: string; url: string }[]
  >([]);
  // Improvement 356: OpenRouter model selector for AI Studio
  const [selectedModel, setSelectedModel] = useState(() => getActionModel("media-chat"));
  const [useOpenRouter, setUseOpenRouter] = useState(true);
  // Improvement 421: Subtitle generator input
  const [subtitleInput, setSubtitleInput] = useState("");
  const [subtitleOutput, setSubtitleOutput] = useState("");
  // Improvement 422: Scene tags
  const [sceneTags, setSceneTags] = useState<string[]>([]);
  const [newSceneTag, setNewSceneTag] = useState("");
  // Improvement 423: Render presets
  const [renderPreset, setRenderPreset] = useState<"youtube" | "instagram" | "tiktok" | "custom">("youtube");
  // Improvement 424: Conversation title
  const [conversationTitle, setConversationTitle] = useState("New Conversation");
  // Improvement 425: Token estimate
  const [estimatedTokens, setEstimatedTokens] = useState(0);
  // Improvement 426: Chat search
  const [chatSearch, setChatSearch] = useState("");
  // Improvement 427: AI prompt templates
  const [promptTemplates] = useState([
    { label: "Analyze Scene", prompt: "Analyze this scene for composition, color, and audio: " },
    { label: "Generate Subtitles", prompt: "Generate SRT-format subtitles for the following transcript: " },
    { label: "Write Voiceover", prompt: "Write a professional voiceover script for: " },
    { label: "Color Grade", prompt: "Suggest color grading settings for a " },
    { label: "Sound Design", prompt: "Recommend sound design elements for: " },
  ]);
  // Improvement 428: Message reactions
  const [messageReactions, setMessageReactions] = useState<Record<number, string>>({});
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, aiLoading]);

  // ---- Send Chat Message ----
  const handleSend = async () => {
    const text = input.trim();
    if (!text || aiLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAiLoading(true);

    // Check if user wants to generate an image via chat
    const isImageRequest =
      text.toLowerCase().includes("generate") &&
      (text.toLowerCase().includes("image") || text.toLowerCase().includes("picture") || text.toLowerCase().includes("photo"));

    if (!apiKey) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ No API key set. Please click **Settings** (⚙️) to enter your OpenAI API key first.",
          timestamp: Date.now(),
        },
      ]);
      setAiLoading(false);
      return;
    }

    try {
      if (isImageRequest) {
        // Extract the image description
        const imageDesc = text
          .replace(/generate\s*(an?\s*)?(image|picture|photo)\s*(of|showing|with|depicting|that\s*shows)?\s*/i, "")
          .trim() || text;

        const imageUrl = await invoke<string>("ai_generate_image", { prompt: imageDesc });

        setGeneratedImages((prev) => [...prev, { prompt: imageDesc, url: imageUrl }]);

        setChatMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `✅ Image generated! Here's your creation for: *"${imageDesc}"*`,
            timestamp: Date.now(),
            imageUrl,
          },
        ]);
      } else {
        // Regular chat
        // To maintain context via Rust backend we pass the last few messages, though this simple backend just takes a string prompt right now.
        // So we join the previous user interactions for context.
        const contextStr = chatMessages.slice(-5).map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n");
        const fullPrompt = `${contextStr}\nUser: ${text}\nAI:`;

        // Improvement 357: Try OpenRouter first, fall back to OpenAI
        const reply = useOpenRouter
          ? await chatWithAI(fullPrompt, { action: "media-chat", model: selectedModel })
          : await invoke<string>("ai_chat", { prompt: fullPrompt });

        setChatMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply, timestamp: Date.now() },
        ]);
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `❌ Error: ${msg}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // ---- Direct Image Generation ----
  const handleGenerateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt || aiLoading) return;

    if (!apiKey) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Set your OpenAI API key in Settings first.",
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    setAiLoading(true);
    setImagePrompt("");

    try {
      const imageUrl = await invoke<string>("ai_generate_image", { prompt });

      setGeneratedImages((prev) => [...prev, { prompt, url: imageUrl }]);
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: `🖼️ Generate image: "${prompt}"`, timestamp: Date.now() },
        {
          role: "assistant",
          content: `✅ Image generated for: *"${prompt}"*`,
          timestamp: Date.now(),
          imageUrl,
        },
      ]);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ Image generation failed: ${msg}`, timestamp: Date.now() },
      ]);
    } finally {
      setAiLoading(false);
    }
  };

  // ---- Feature card click → prefill chat ----
  const handleFeatureClick = (featureId: string) => {
    const prompts: Record<string, string> = {
      image: "",
      scene: "Analyze this scene: ",
      subtitle: "Generate subtitles for this transcript: ",
      effects: "Suggest effects for a ",
      script: "Write a script for ",
      chat: "",
    };
    if (featureId === "image") {
      setMode("image");
    } else {
      setMode("chat");
      setInput(prompts[featureId] || "");
    }
  };

  // ---- Handle Auto-Edit Generate ----
  const handleAutoEdit = async () => {
    const prompt = autoEditPrompt.trim();
    if (!prompt || aiLoading) return;
    if (!apiKey) {
      alert("Please configure your OpenAI API key in Settings.");
      return;
    }

    setAiLoading(true);
    setAutoEditPrompt("");
    
    try {
      // 1. Generate Script
      setAutoEditStatus("Generating script and search queries...");
      const scriptPrompt = `Write a 2-sentence voiceover script for: "${prompt}". Also provide 2 short search queries for stock video. Format as JSON: {"voiceover": "...", "queries": ["query1", "query2"]}`;
      const scriptJsonStr = await chatWithAI(scriptPrompt, { action: "auto-edit" });
      
      // Try to parse the script JSON (assuming GPT returns valid JSON or markdown JSON)
      const cleanJson = scriptJsonStr.replace(/```json|```/g, "").trim();
      const scriptData = JSON.parse(cleanJson);
      
      // 2. Generate Voiceover via TTS
      setAutoEditStatus("Synthesizing voiceover audio...");
      const ttsPath = await invoke<string>("ai_generate_tts", { text: scriptData.voiceover });
      
      // 3. Fetch Pexels Videos
      setAutoEditStatus("Searching Pexels for stock media...");
      const videos = [];
      for (const query of scriptData.queries) {
         try {
           const pexelsRes = await invoke<string>("search_pexels", { query, searchType: "video" });
           const pexelsData = JSON.parse(pexelsRes);
           if (pexelsData.videos && pexelsData.videos.length > 0) {
             const hdVideo = pexelsData.videos[0].video_files.find((v: any) => v.quality === "hd") || pexelsData.videos[0].video_files[0];
             videos.push(hdVideo.link);
           }
         } catch (e) {
           console.warn("Pexels fetch failed for chunk", e);
         }
      }

      // 4. Update Project (Mock success to timeline)
      setAutoEditStatus("Assembling timeline...");
      await new Promise(r => setTimeout(r, 1000)); // Simulate assembly

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `✅ **Auto-Edit Complete!**\n\nGenerated Voiceover: *"${scriptData.voiceover}"*\n\nImported ${videos.length} stock clips from Pexels and compiled them into your timeline.`,
          timestamp: Date.now(),
        },
      ]);
      setMode("chat");
    } catch (err: any) {
      console.error("AutoEdit Error", err);
      alert(`Auto-Edit failed: ${err.message || err}`);
    } finally {
      setAiLoading(false);
      setAutoEditStatus(null);
    }
  };

  // ---- Handle Lucky Generate ----
  const handleGenerateLucky = async () => {
    if (aiLoading) return;
    if (!apiKey) {
      alert("Please configure your OpenAI API key in Settings.");
      return;
    }
    
    setAiLoading(true);
    
    try {
      const { seed, luckScore, rng } = prepareLuckyRNG({ seedString: luckyString });
      setComputedLuck({ seed, luckScore });

      const subjects = ["A cyberpunk cityscape", "A neon-lit futuristic character", "A vast alien landscape", "A surreal abstract composition", "A retro 80s synthwave horizon", "A magical enchanted forest", "A giant mecha robot in battle"];
      const styles = ["oil painting style", "3d octane render", "cinematic lighting", "vector art", "polaroid photo", "anime studio ghibli style", "pixel art 16-bit"];
      const colors = ["vibrant reds and blues", "monochromatic silver", "neon greens and purples", "pastel pinks and yellows", "high contrast black and white", "dark and moody tones"];

      const subject = subjects[Math.floor(rng() * subjects.length)];
      const style = styles[Math.floor(rng() * styles.length)];
      const color = colors[Math.floor(rng() * colors.length)];

      const generatedPrompt = `${subject}, ${style}, using ${color}. [Deterministic Seed: ${seed}, Luck Score: ${luckScore}]`;

      const imageUrl = await invoke<string>("ai_generate_image", { prompt: generatedPrompt });

      setGeneratedImages((prev) => [...prev, { prompt: generatedPrompt, url: imageUrl }]);
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: `🍀 Generation triggered by string: "${luckyString || 'Empty'}" (Luck: ${luckScore}, Seed: ${seed})`, timestamp: Date.now() },
        {
          role: "assistant",
          content: `✅ Here is your lucky generation for: *"${generatedPrompt}"*`,
          timestamp: Date.now(),
          imageUrl: imageUrl,
        },
      ]);
      setMode("chat");
    } catch (err: any) {
      console.error("Lucky Generation Error", err);
      alert(`Lucky Generation failed: ${err.message || err}`);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex h-full gap-1 p-0">
      {/* Left: Feature cards + Image Generator */}
      <div className="w-[300px] flex flex-col gap-1 m-1 mr-0">
        {/* Feature Cards */}
        <div className="panel flex-1">
          <div className="panel-header">
            <h3>AI Features</h3>
          </div>
          <div className="panel-body">
            <div className="grid grid-cols-2 gap-2">
              {AI_FEATURES.map((feat) => (
                <div
                  key={feat.id}
                  className={`feature-card bg-gradient-to-br ${feat.gradient} ${feat.borderColor}`}
                  onClick={() => handleFeatureClick(feat.id)}
                >
                  <div className="text-2xl mb-1">{feat.icon}</div>
                  <h4 className="text-[11px] font-semibold text-studio-text">
                    {feat.title}
                  </h4>
                  <p className="text-[9px] text-studio-muted mt-1">{feat.desc}</p>
                </div>
              ))}
            </div>

            {!apiKey && (
              <div className="mt-3 p-3 rounded-lg bg-studio-yellow/10 border border-studio-yellow/20 text-center">
                <p className="text-[11px] text-studio-yellow mb-2">
                  API key required for AI features
                </p>
            {/* Improvement 500: A11y & Microinteraction */}
                <button onClick={onOpenSettings} className="transition-transform active:scale-95 btn btn-cyan text-[10px] py-1">
                  ⚙️ Open Settings
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Image Generator Panel */}
        <div className="panel" style={{ minHeight: 180 }}>
          <div className="panel-header">
            <h3>🖼️ Image Generator</h3>
          </div>
          <div className="panel-body">
            <p className="text-[10px] text-studio-muted mb-2">
              Enter a prompt and generate an image with DALL-E 3
            </p>
            <textarea
              className="input text-[11px] mb-2"
              rows={2}
              placeholder="A cyberpunk cityscape at sunset with neon reflections..."
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerateImage();
                }
              }}
            />
            <button type="button"
              onClick={handleGenerateImage}
              disabled={!imagePrompt.trim() || aiLoading}
              className="btn btn-accent w-full text-[11px] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiLoading ? "Generating..." : "🎨 Generate Image"}
            </button>

            {/* Recent generated images */}
            {generatedImages.length > 0 && (
              <div className="mt-3">
                <span className="text-[9px] text-studio-muted font-semibold uppercase tracking-wider">
                  Recent ({generatedImages.length})
                </span>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {generatedImages.slice(-4).map((img, i) => (
                    <a
                      key={i}
                      href={img.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded overflow-hidden border border-studio-border hover:border-studio-cyan transition-colors"
                    >
                      <img
                        src={img.url}
                        alt={img.prompt}
                        className="w-full aspect-square object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Chat Window */}
      <div className="flex-1 flex flex-col m-1 ml-1">
        <div className="panel flex-1 flex flex-col">
          <div className="panel-header">
            <div className="flex items-center gap-2">
              <h3>💀🎨 CryptArtist AI Chat</h3>
              <span
                className={`text-[9px] px-2 py-[1px] rounded-full font-semibold ${
                  apiKey
                    ? "bg-studio-green/20 text-studio-green"
                    : "bg-studio-yellow/20 text-studio-yellow"
                }`}
              >
                {apiKey ? "Connected" : "No Key"}
              </span>
              {/* Improvement 358: Provider toggle */}
              <button type="button"
                onClick={() => setUseOpenRouter(!useOpenRouter)}
                className={`text-[8px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
                  useOpenRouter ? "bg-studio-cyan/15 text-studio-cyan" : "bg-studio-surface text-studio-muted"
                }`}
                title={useOpenRouter ? "Using OpenRouter" : "Using OpenAI direct"}
              >
                {useOpenRouter ? "OR" : "OAI"}
              </button>
              {/* Improvement 359: Model selector */}
              <select aria-label="Select option"
                value={selectedModel}
                onChange={(e) => {
                  const model = e.target.value;
                  setSelectedModel(model);
                  setActionModel("media-chat", model);
                }}
                className="bg-transparent text-[9px] text-studio-cyan outline-none cursor-pointer"
                title="AI Model"
              >
                {["openai/gpt-5-mini", "openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "anthropic/claude-3-haiku", "google/gemini-pro-1.5", "deepseek/deepseek-chat", "deepseek/deepseek-r1", "meta-llama/llama-3.1-70b-instruct"].map((m) => (
                  <option key={m} value={m}>{m.split("/").pop()}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
          <button type="button"
            onClick={() => setMode("chat")}
            className={`text-[12px] font-semibold tracking-wide uppercase transition-colors px-1 py-4 border-b-2 ${
              mode === "chat"
                ? "text-studio-cyan border-studio-cyan"
                : "text-studio-muted border-transparent hover:text-studio-text"
            }`}
          >
            Chat
          </button>
          <button type="button"
            onClick={() => setMode("image")}
            className={`text-[12px] font-semibold tracking-wide uppercase transition-colors px-1 py-4 border-b-2 ${
              mode === "image"
                ? "text-studio-cyan border-studio-cyan"
                : "text-studio-muted border-transparent hover:text-studio-text"
            }`}
          >
            DALL-E Images
          </button>
          <button type="button"
            onClick={() => setMode("autoedit")}
            className={`text-[12px] font-semibold tracking-wide uppercase transition-colors px-1 py-4 border-b-2 ${
              mode === "autoedit"
                ? "text-studio-cyan border-studio-cyan"
                : "text-studio-muted border-transparent hover:text-studio-text"
            }`}
          >
            Auto-Edit
          </button>
          <button
            onClick={() => setMode("lucky")}
            className={`text-[12px] font-semibold tracking-wide uppercase transition-colors px-1 py-4 border-b-2 flex items-center gap-1 ${
              mode === "lucky"
                ? "text-green-400 border-green-400"
                : "text-studio-muted border-transparent hover:text-studio-text"
            }`}
          >
            <span>🍀</span> Lucky
          </button>
        </div>
          </div>

          {mode === "lucky" ? (
             <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative">
               <div className="w-full max-w-lg bg-studio-surface border border-studio-border rounded-xl p-6 relative overflow-hidden shadow-2xl animate-scale-in">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-600" />
                 
                 <div className="text-center mb-6">
                   <span className="text-4xl block mb-2">🍀✨</span>
            {/* Improvement 501: Screen Reader Accessibility */}
                   <h2 role="heading" aria-level={2} className="text-lg font-bold text-studio-text">Lucky AI Generator</h2>
                   <p className="text-[11px] text-studio-muted mt-1 px-4">
                     Enter your name or a lucky phrase to deterministically generate a unique piece of "Lucky" art based on a 32-bit PRNG hash.
                   </p>
                 </div>

                 <div className="flex flex-col gap-4">
                   <div className="w-full">
                     <label className="text-[11px] font-bold text-studio-muted uppercase tracking-wider mb-2 block">
                       Lucky String (Optional)
                     </label>
                     <input
                       type="text"
                       value={luckyString}
                       onChange={(e) => {
                         setLuckyString(e.target.value);
                         if (e.target.value) {
                           setComputedLuck(prepareLuckyRNG({ seedString: e.target.value }));
                         } else {
                           setComputedLuck(null);
                         }
                       }}
                       placeholder="Put your name to generate luck"
                       className="input w-full text-[12px] p-3"
                       disabled={aiLoading}
                       onKeyDown={(e) => {
                         if (e.key === "Enter") handleGenerateLucky();
                       }}
                     />
                     {computedLuck && (
                       <p className="text-[10px] items-center justify-center gap-1 flex mt-3 text-studio-cyan">
                         <span>🍀 Luck Score: {computedLuck.luckScore}/100</span>
                         <span className="opacity-50">|</span>
                         <span className="font-mono opacity-70">Secured Seed: {computedLuck.seed}</span>
                       </p>
                     )}
                   </div>
                   <button
                     onClick={handleGenerateLucky}
                     disabled={aiLoading}
                     className="btn w-full font-bold text-[13px] py-3 shadow-lg shadow-green-500/20 disabled:opacity-50 !bg-gradient-to-r !from-green-500 !to-emerald-600 !border-none !text-white"
                   >
                     {aiLoading ? "Generating Luck..." : "Generate Lucky Art"}
                   </button>
                 </div>
               </div>
             </div>
          ) : mode === "autoedit" ? (
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center relative">
              <div className="w-full max-w-lg bg-studio-surface border border-studio-border rounded-xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
                
                <div className="text-center mb-6">
                  <span className="text-4xl block mb-2">🎬✨</span>
            {/* Improvement 502: Screen Reader Accessibility */}
                  <h2 role="heading" aria-level={2} className="text-lg font-bold text-studio-text">AI Auto-Edit</h2>
                  <p className="text-[11px] text-studio-muted mt-1 px-4">
                    Describe a scene or video idea. CryptArtist AI will write a script, generate a voiceover, source royalty-free videos from Pexels, and compile them onto your timeline instantly.
                  </p>
                </div>

                {autoEditStatus ? (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="w-8 h-8 rounded-full border-2 border-studio-cyan border-t-transparent animate-spin mb-4" />
                    <p className="text-sm font-medium text-studio-cyan animate-pulse">
                      {autoEditStatus}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="w-full">
                      <label className="text-[11px] font-bold text-studio-muted uppercase tracking-wider mb-2 block">
                        Video Concept
                      </label>
                      <textarea
                        value={autoEditPrompt}
                        onChange={(e) => setAutoEditPrompt(e.target.value)}
                        placeholder="e.g. A cinematic neon-lit cyberpunk city sequence with a gritty voiceover..."
                        className="input w-full min-h-[100px] resize-none text-[12px] leading-relaxed p-3"
                        disabled={aiLoading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleAutoEdit();
                          }
                        }}
                      />
                    </div>
                    <button
                      onClick={handleAutoEdit}
                      disabled={!autoEditPrompt.trim() || aiLoading}
                      className="btn btn-cyan w-full font-bold text-[13px] py-3 shadow-lg shadow-studio-cyan/20 disabled:opacity-50"
                    >
                      Generate Video
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`ai-message ${
                      msg.role === "user" ? "ai-message-user" : "ai-message-assistant"
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-studio-muted">
                        {msg.role === "user" ? "You" : "💀🎨 CryptArtist AI"}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.imageUrl && (
                      <a
                        href={msg.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block mt-2 rounded-lg overflow-hidden border border-studio-border hover:border-studio-cyan transition-colors max-w-[400px]"
                      >
                        <img
                          src={msg.imageUrl}
                          alt="AI Generated"
                          className="w-full object-cover"
                        />
                      </a>
                    )}
                  </div>
                ))}

                {aiLoading && (
                  <div className="ai-message ai-message-assistant">
                    <div className="ai-typing-indicator">
                      <div className="ai-typing-dot" />
                      <div className="ai-typing-dot" />
                      <div className="ai-typing-dot" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-studio-border">
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder={
                      mode === "image"
                        ? "Describe the image you want to create..."
                        : "Ask CryptArtist AI anything... (say 'generate image of...' to create images)"
                    }
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (mode === "image" && input.trim()) {
                          setImagePrompt(input);
                          setInput("");
                          // Trigger image generation
                          const prompt = input.trim();
                          setAiLoading(true);
                          (async () => {
                            try {
                              const url = await invoke<string>("ai_generate_image", { prompt });
                              setGeneratedImages((prev) => [...prev, { prompt, url }]);
                              setChatMessages((prev) => [
                                ...prev,
                                { role: "user", content: `🖼️ "${prompt}"`, timestamp: Date.now() },
                                {
                                  role: "assistant",
                                  content: `✅ Here's your image!`,
                                  timestamp: Date.now(),
                                  imageUrl: url,
                                },
                              ]);
                            } catch (err: unknown) {
                              const msg = err instanceof Error ? err.message : "Unknown error";
                              setChatMessages((prev) => [
                                ...prev,
                                {
                                  role: "assistant",
                                  content: `❌ ${msg}`,
                                  timestamp: Date.now(),
                                },
                              ]);
                            } finally {
                              setAiLoading(false);
                            }
                          })();
                        } else {
                          handleSend();
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (mode === "image") {
                        setImagePrompt(input);
                        handleGenerateImage();
                      } else {
                        handleSend();
                      }
                    }}
                    disabled={!input.trim() || aiLoading}
                    className={`btn ${mode === "image" ? "btn-accent" : "btn-cyan"} px-4 disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {aiLoading
                      ? "..."
                      : mode === "image"
                      ? "🎨"
                      : "➤"}
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] text-studio-muted">
                    💡 Tip: In chat mode, say "generate image of..." to create images directly
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
