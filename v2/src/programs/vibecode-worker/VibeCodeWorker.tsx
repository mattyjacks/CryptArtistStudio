import React, { useState } from "react";
import { Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { useAI } from "../../core/context/AIContext";
import { AIChatMessage } from "../../core/types/ai.types";

export const VibeCodeWorker: React.FC = () => {
  const { engine } = useAI();
  const [code, setCode] = useState<string>(
    `// ============================================================================\n// VibeCodeWorker v2 - In-Browser AI Coding Workspace\n// ============================================================================\n\nexport function createCreativeEffect(canvas: HTMLCanvasElement) {\n  const ctx = canvas.getContext('2d');\n  if (!ctx) return;\n  \n  ctx.fillStyle = '#08080f';\n  ctx.fillRect(0, 0, canvas.width, canvas.height);\n  console.log('✨ CryptArtist VibeCodeWorker initialized');\n}\n`
  );
  const [activeFile, setActiveFile] = useState<string>("main.ts");
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello! I am your Vibe-Coding assistant. Ask me to write, refactor, or explain code for your project.",
      timestamp: Date.now(),
    },
  ]);
  const [promptInput, setPromptInput] = useState<string>("");
  const [isThinking, setIsThinking] = useState<boolean>(false);

  const handleSendPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim() || isThinking) return;

    const userMsg: AIChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: promptInput.trim(),
      timestamp: Date.now(),
    };

    const newMsgs = [...chatMessages, userMsg];
    setChatMessages(newMsgs);
    setPromptInput("");
    setIsThinking(true);

    try {
      const promptWithCode = `Current file (${activeFile}):\n\`\`\`typescript\n${code}\n\`\`\`\n\nUser request: ${userMsg.content}`;
      const response = await engine.chat([
        { id: "sys", role: "system", content: "You are a master software engineer and vibe coder.", timestamp: Date.now() },
        { id: "u", role: "user", content: promptWithCode, timestamp: Date.now() },
      ]);

      setChatMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          role: "assistant",
          content: response.content,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: `⚠️ Error: ${err.message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg text-studio-text overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-studio-border bg-studio-panel px-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-2.5 py-1 text-xs rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-secondary hover:text-studio-cyan transition"
          >
            ← Back to Suite
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">👩🏻‍💻</span>
            <span className="font-bold text-sm bg-gradient-to-r from-studio-cyan to-studio-blue bg-clip-text text-transparent">
              VibeCodeWorker [VCW]
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-cyan/20 text-studio-cyan font-bold">
              v2 Web
            </span>
          </div>
        </div>
      </header>

      {/* Main Code & AI Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: File Explorer */}
        <div className="w-56 border-r border-studio-border bg-studio-panel/70 flex flex-col p-3">
          <span className="text-xs font-bold text-studio-secondary uppercase tracking-wider mb-2">
            Explorer
          </span>
          <div className="space-y-1 text-xs">
            {["main.ts", "shader.frag", "renderer.ts", "types.ts"].map((file) => (
              <button
                key={file}
                onClick={() => setActiveFile(file)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition ${
                  activeFile === file
                    ? "bg-studio-surface text-studio-cyan font-semibold"
                    : "text-studio-secondary hover:text-studio-text hover:bg-studio-surface/40"
                }`}
              >
                <span>📄</span> {file}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Monaco Editor */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
          <div className="h-9 border-b border-studio-border bg-studio-surface/40 px-3 flex items-center justify-between text-xs">
            <span className="font-mono text-studio-cyan font-semibold">{activeFile}</span>
            <span className="text-[10px] text-studio-muted font-mono">TypeScript / Monaco</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              theme="vs-dark"
              language="typescript"
              value={code}
              onChange={(val) => setCode(val || "")}
              options={{
                fontSize: 13,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontFamily: "JetBrains Mono, monospace",
              }}
            />
          </div>
        </div>

        {/* Right: AI Coding Copilot */}
        <div className="w-80 border-l border-studio-border bg-studio-panel flex flex-col overflow-hidden">
          <div className="p-3 border-b border-studio-border bg-studio-surface/60">
            <h3 className="text-xs font-bold text-studio-text flex items-center gap-1.5">
              <span>🤖</span> AI Vibe-Coding Copilot
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`p-2.5 rounded-xl ${
                  msg.role === "user"
                    ? "bg-studio-cyan/20 text-white ml-4 border border-studio-cyan/30"
                    : "bg-studio-surface text-studio-text mr-4 border border-studio-border"
                }`}
              >
                <div className="text-[10px] font-bold opacity-60 mb-1">
                  {msg.role === "user" ? "You" : "AI Copilot"}
                </div>
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
            {isThinking && (
              <div className="p-2.5 bg-studio-surface text-studio-secondary rounded-xl text-xs animate-pulse">
                Thinking and coding...
              </div>
            )}
          </div>

          <form onSubmit={handleSendPrompt} className="p-3 border-t border-studio-border flex gap-2">
            <input
              type="text"
              placeholder="Ask AI to write code..."
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="flex-1 bg-studio-bg border border-studio-border rounded-lg px-2.5 py-1.5 text-xs text-studio-text focus:outline-none focus:border-studio-cyan"
            />
            <button
              type="submit"
              disabled={isThinking}
              className="px-3 py-1.5 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-xs rounded-lg transition disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VibeCodeWorker;
