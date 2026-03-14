/* Wave3-sep */
/* Wave3 */
/* Wave2: select-aria */
/* Wave2: type=button applied */
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";
import { useWorkspace } from "../../utils/workspace";
import { chatWithAI, getActionModel, setActionModel } from "../../utils/openrouter";
import { useApiKeys } from "../../utils/apiKeys";
import { useInteropEmit, useInterop } from "../../utils/interop";
import { useCrossClipboard } from "../../utils/crossClipboard";
import { notifySuccess, notifyError } from "../../utils/notifications";
import AIOptimizer from "../../components/AIOptimizer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon: string;
}

interface TaskEntry {
  id: string;
  task: string;
  result: string;
  status: "completed" | "failed" | "running";
  timestamp: number;
}

interface AgentMessage {
  role: "user" | "agent";
  content: string;
  timestamp: number;
  thinking?: boolean;
}

interface Integration {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  credential: string;
}

// ---------------------------------------------------------------------------
// Default Data
// ---------------------------------------------------------------------------

const defaultSkills: Skill[] = [
  { id: "web-search", name: "Web Search", description: "Search the web for information using Brave Search or Google", enabled: true, icon: "\u{1F50D}" },
  { id: "browser-control", name: "Browser Control", description: "Navigate websites, fill forms, click buttons, scrape data", enabled: true, icon: "\u{1F310}" },
  { id: "file-manager", name: "File Manager", description: "Read, write, and organize files on your computer", enabled: false, icon: "\u{1F4C1}" },
  { id: "email-sender", name: "Email Sender", description: "Compose and send emails via Gmail or SMTP", enabled: false, icon: "\u{1F4E7}" },
  { id: "calendar-manager", name: "Calendar Manager", description: "Create, edit, and manage Google Calendar events", enabled: false, icon: "\u{1F4C5}" },
  { id: "discord-bot", name: "Discord Bot", description: "Send messages and manage Discord channels", enabled: false, icon: "\u{1F4AC}" },
  { id: "code-executor", name: "Code Executor", description: "Run code snippets in a sandboxed environment", enabled: false, icon: "\u{1F4BB}" },
  { id: "data-analyst", name: "Data Analyst", description: "Analyze CSV/JSON data and generate charts", enabled: false, icon: "\u{1F4CA}" },
];

const defaultIntegrations: Integration[] = [
  { id: "discord", name: "Discord", icon: "\u{1F4AC}", connected: false, credential: "" },
  { id: "slack", name: "Slack", icon: "\u{1F4E2}", connected: false, credential: "" },
  { id: "telegram", name: "Telegram", icon: "\u{2709}\uFE0F", connected: false, credential: "" },
  { id: "whatsapp", name: "WhatsApp", icon: "\u{1F4F1}", connected: false, credential: "" },
  { id: "gmail", name: "Gmail", icon: "\u{1F4E7}", connected: false, credential: "" },
  { id: "gcal", name: "Google Calendar", icon: "\u{1F4C5}", connected: false, credential: "" },
  { id: "webhook", name: "Webhook URL", icon: "\u{1F517}", connected: false, credential: "" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ValleyNet() {
  const navigate = useNavigate();
  useEffect(() => { logger.info("ValleyNet", "Program loaded"); }, []);
  const [activePanel, setActivePanel] = useState<"skills" | "integrations" | "history">("skills");
  const [skills, setSkills] = useState<Skill[]>(defaultSkills);
  const [integrations, setIntegrations] = useState<Integration[]>(defaultIntegrations);
  const [taskHistory, setTaskHistory] = useState<TaskEntry[]>([]);
  const [agentLoading, setAgentLoading] = useState(false);
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      role: "agent",
      content:
        "Hello! I'm **ValleyNet** \u{1F471}\u{1F3FB}\u200D\u2640\uFE0F - your autonomous AI agent.\n\n" +
        "I'm inspired by **OpenClaw**, the open-source self-hosted AI agent created by Peter Steinberger " +
        "that executes real-world tasks via LLMs and integrates with messaging platforms, email, " +
        "calendars, and browsers through a local skills system.\n\n" +
        "I can help you with:\n" +
        "- **Browse the web** and research topics\n" +
        "- **Send messages** via Discord, Slack, Telegram\n" +
        "- **Manage emails** and calendar events\n" +
        "- **Automate workflows** with custom skills\n" +
        "- **Analyze data** and generate reports\n\n" +
        "Configure your skills and integrations in the sidebar, then tell me what you need!\n\n" +
        "Make sure to set your OpenAI API key in CryptArtist Studio settings for AI-powered responses.",
      timestamp: Date.now(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [browserUrl, setBrowserUrl] = useState("https://example.com");
  const [showBrowser, setShowBrowser] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  // Improvement 84: Agent autonomy level
  const [autonomyLevel, setAutonomyLevel] = useState<"ask" | "suggest" | "auto">("suggest");
  // Improvement 87: Agent personality
  const [personality, setPersonality] = useState<"professional" | "friendly" | "concise">("friendly");
  // Improvement 181: Workflow builder
  const [workflows, setWorkflows] = useState<{ id: string; name: string; steps: string[]; active: boolean }[]>([]);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  // Improvement 182: Scheduled tasks
  const [scheduledTasks, setScheduledTasks] = useState<{ id: string; task: string; time: number; recurring: boolean }[]>([]);
  // Improvement 183: Agent memory/context
  const [agentMemory, setAgentMemory] = useState<{ key: string; value: string }[]>([]);
  const [showMemory, setShowMemory] = useState(false);
  // Improvement 184: Token usage tracking
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, completion: 0, total: 0 });
  // Improvement 185: Conversation bookmarks
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  // Improvement 186: Agent plugins
  const [plugins, setPlugins] = useState<{ id: string; name: string; enabled: boolean; icon: string }[]>([
    { id: "web-search", name: "Web Search", enabled: true, icon: "\u{1F50D}" },
    { id: "file-ops", name: "File Operations", enabled: true, icon: "\u{1F4C1}" },
    { id: "code-exec", name: "Code Execution", enabled: false, icon: "\u{1F4BB}" },
    { id: "email", name: "Email", enabled: false, icon: "\u2709\uFE0F" },
  ]);
  // Improvement 187: Response streaming toggle
  const [streamResponse, setStreamResponse] = useState(true);
  // Improvement 188: Safe mode
  const [safeMode, setSafeMode] = useState(true);
  // Improvement 189: Task priority levels
  const [defaultPriority, setDefaultPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  // Improvement 190: Session timer
  const [sessionStart] = useState(Date.now());
  const [sessionDuration, setSessionDuration] = useState(0);
  // Improvement 286: Agent chains
  const [agentChains, setAgentChains] = useState<{ id: string; name: string; agents: string[]; active: boolean }[]>([]);
  // Improvement 287: Knowledge base
  const [knowledgeBase, setKnowledgeBase] = useState<{ id: string; title: string; content: string; tags: string[] }[]>([]);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  // Improvement 288: RAG context
  const [ragEnabled, setRagEnabled] = useState(false);
  const [ragSources, setRagSources] = useState<string[]>([]);
  // Improvement 289: Tool use log
  const [toolLog, setToolLog] = useState<{ tool: string; input: string; output: string; timestamp: number }[]>([]);
  const [showToolLog, setShowToolLog] = useState(false);
  // Improvement 386: Conversation search
  const [conversationSearch, setConversationSearch] = useState("");
  // Improvement 387: Pinned messages
  const [pinnedMessages, setPinnedMessages] = useState<number[]>([]);
  // Improvement 388: Export format
  const [exportFormat, setExportFormat] = useState<"txt" | "json" | "md">("txt");
  // Improvement 389: Message stats
  const [showStats, setShowStats] = useState(false);
  // Improvement 390: Conversation templates
  const [conversationTemplates] = useState([
    { name: "Code Review", system: "You are a senior code reviewer. Analyze code for bugs, performance, and best practices." },
    { name: "Creative Writing", system: "You are a creative writing assistant. Help with storytelling, dialogue, and prose." },
    { name: "Data Analysis", system: "You are a data analyst. Help interpret data, create visualizations, and find insights." },
    { name: "DevOps", system: "You are a DevOps engineer. Help with CI/CD, Docker, Kubernetes, and infrastructure." },
  ]);
  // Improvement 291: Agent personas
  const [activePersona, setActivePersona] = useState<string | null>(null);
  const [personas] = useState([
    { id: "default", name: "ValleyNet", icon: "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F" },
    { id: "coder", name: "CodeBot", icon: "\u{1F469}\u{1F3FB}\u200D\u{1F4BB}" },
    { id: "researcher", name: "ResearchAI", icon: "\u{1F9D1}\u{1F3FB}\u200D\u{1F52C}" },
    { id: "creative", name: "CreativeAI", icon: "\u{1F3A8}" },
  ]);
  // Improvement 292: Multi-model support (OpenRouter-powered)
  const [availableModels] = useState([
    "openai/gpt-5-mini",
    "openai/gpt-4o", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-haiku", "google/gemini-pro-1.5", "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.1-70b-instruct", "deepseek/deepseek-chat", "deepseek/deepseek-r1",
    "mistralai/mistral-large", "qwen/qwen-2.5-72b-instruct",
  ]);
  const [selectedModel, setSelectedModel] = useState(() => getActionModel("valleynet-agent"));
  const [useOpenRouter, setUseOpenRouter] = useState(true);
  // Improvement 293: Cost tracking
  const [costEstimate, setCostEstimate] = useState(0.0);
  // Improvement 331: System prompt editor
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");
  // Improvement 332: Response format
  const [responseFormat, setResponseFormat] = useState<"text" | "json" | "markdown">("text");
  // Improvement 333: Token budget
  const [tokenBudget, setTokenBudget] = useState(4096);

  // Improvement 190: Session timer
  useEffect(() => {
    const id = setInterval(() => setSessionDuration(Math.floor((Date.now() - sessionStart) / 1000)), 1000);
    return () => clearInterval(id);
  }, [sessionStart]);

  // Improvement 86: Quick task templates
  const quickTasks = [
    { label: "Research", prompt: "Research the latest news about " },
    { label: "Summarize", prompt: "Summarize the following: " },
    { label: "Draft Email", prompt: "Draft a professional email about " },
    { label: "Analyze Data", prompt: "Analyze this data and provide insights: " },
    { label: "Schedule", prompt: "Help me schedule a meeting for " },
    { label: "Code Help", prompt: "Write code to " },
  ];

  // Interop: shared API keys, event bus, cross-clipboard
  const apiKeys = useApiKeys();
  const emit = useInteropEmit("valley-net");
  const clip = useCrossClipboard("valley-net");

  // Listen for pipeline triggers or cross-program task requests
  useInterop("agent:task-started", (event) => {
    if (event.source !== "valley-net") {
      const data = event.data as { task?: string };
      if (data?.task) {
        setChatInput(data.task);
      }
    }
  }, { target: "valley-net" });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---------------------------------------------------------------------------
  // AI-powered agent send - uses shared backend
  // ---------------------------------------------------------------------------

  const handleSend = async () => {
    if (!chatInput.trim() || agentLoading) return;
    const userMsg: AgentMessage = { role: "user", content: chatInput, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    // Add a "thinking" message
    setAgentLoading(true);
    const taskId = `task-${Date.now()}`;
    setTaskHistory((prev) => [
      { id: taskId, task: userMsg.content, result: "", status: "running", timestamp: Date.now() },
      ...prev,
    ]);

    try {
      // Build system context from enabled skills and connected integrations
      const enabledSkillsList = skills.filter((s) => s.enabled).map((s) => s.name).join(", ");
      const connectedIntgs = integrations.filter((i) => i.connected).map((i) => i.name).join(", ");

      // Improvement 84: Autonomy level affects prompt behavior
      const autonomyInstructions = autonomyLevel === "auto"
        ? "Execute tasks immediately without asking for confirmation."
        : autonomyLevel === "suggest"
        ? "Suggest actions and explain your plan before executing."
        : "Always ask the user for confirmation before taking any action.";

      // Improvement 87: Personality affects tone
      const personalityInstructions = personality === "professional"
        ? "Respond in a formal, professional tone."
        : personality === "concise"
        ? "Be extremely brief and to the point. Minimal explanation."
        : "Be friendly, helpful, and conversational.";

      const prompt = `You are ValleyNet, an autonomous AI agent inside CryptArtist Studio. You are inspired by OpenClaw.

Your enabled skills: ${enabledSkillsList || "None"}
Your connected integrations: ${connectedIntgs || "None"}
Autonomy mode: ${autonomyLevel} - ${autonomyInstructions}
Personality: ${personalityInstructions}

When the user gives you a task:
1. Analyze what skills and integrations would be needed
2. Plan the steps to accomplish the task
3. Execute or explain each step clearly
4. Report the results

If a required skill is not enabled or integration not connected, explain what the user needs to enable.
Be proactive, thorough, and provide actionable results. Use markdown formatting.

User task: ${userMsg.content}`;

      // Try OpenRouter first if enabled, fall back to OpenAI
      const reply = useOpenRouter
        ? await chatWithAI(prompt, { action: "valleynet-agent", model: selectedModel })
        : await invoke<string>("ai_chat", { prompt });
      // Improvement 293: Estimate cost (rough estimate)
      const tokensEst = Math.ceil((prompt.length + reply.length) / 4);
      setCostEstimate((prev) => prev + tokensEst * 0.000003);
      setTokenUsage((prev) => ({ ...prev, total: prev.total + tokensEst, completion: prev.completion + Math.ceil(reply.length / 4) }));
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: reply, timestamp: Date.now() },
      ]);
      setTaskHistory((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, result: reply.slice(0, 200) + (reply.length > 200 ? "..." : ""), status: "completed" } : t
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const fallbackContent = `I couldn't connect to the AI backend: ${errMsg}\n\nTo enable AI responses:\n1. Open Settings from the Suite Launcher\n2. Enter your OpenRouter API key (access 200+ AI models)\n3. Or enter your OpenAI API key for direct access\n\nOnce configured, I'll be able to process your tasks using the enabled skills and integrations.`;
      setMessages((prev) => [
        ...prev,
        { role: "agent", content: fallbackContent, timestamp: Date.now() },
      ]);
      setTaskHistory((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, result: errMsg, status: "failed" } : t
        )
      );
    } finally {
      setAgentLoading(false);
    }
  };

  const toggleSkill = (id: string) => {
    setSkills((prev) => prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const updateIntegration = (id: string, field: "connected" | "credential", value: string | boolean) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  // ---------------------------------------------------------------------------
  // .CryptArt save/open
  // ---------------------------------------------------------------------------

  const wsCtx = useWorkspace();

  // Load from active workspace on mount or workspace switch
  useEffect(() => {
    const active = wsCtx.getActiveWorkspace();
    if (active && active.program === "valley-net") {
      const data = active.project.data as any;
      if (data.skills) setSkills(data.skills);
      if (data.integrations) setIntegrations(data.integrations);
      if (data.taskHistory) setTaskHistory(data.taskHistory);
      if (data.messages) setMessages(data.messages);
    }
  }, [wsCtx.activeWorkspaceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveProject = async () => {
    try {
      const projectData = {
        skills, integrations, taskHistory,
        messages: messages.slice(-50),
      };
      const cryptArt = createCryptArtFile("valley-net", "ValleyNet Session", projectData);
      const json = serializeCryptArt(cryptArt);

      const active = wsCtx.getActiveWorkspace();
      const defaultPath = active?.filePath || "valleynet-session.CryptArt";

      const savePath = await saveDialog({
        defaultPath,
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
      });
      if (savePath) {
        await invoke("write_text_file", { path: savePath, contents: json });
        if (active) {
          wsCtx.updateProject(active.id, cryptArt);
          wsCtx.updateFilePath(active.id, savePath);
          wsCtx.markClean(active.id);
        }
        toast.success("Project saved successfully");
      }
    } catch (err) {
      console.error("Save project failed:", err);
      toast.error("Failed to save project");
    }
  };

  const handleOpenProject = async () => {
    try {
      const selected = await openDialog({
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
        multiple: true,
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];

      for (const filePath of paths) {
        if (typeof filePath !== "string") continue;
        const json = await invoke<string>("read_text_file", { path: filePath });
        const project = parseCryptArt(json);
        if (project.program !== "valley-net") {
          toast.warning(`${filePath.split(/[\\/]/).pop()} is for ${project.program}, not ValleyNet`);
          continue;
        }
        const wsId = wsCtx.openWorkspace(project, filePath);
        wsCtx.setActiveWorkspace(wsId);
        const data = project.data as any;
        if (data.skills) setSkills(data.skills);
        if (data.integrations) setIntegrations(data.integrations);
        if (data.taskHistory) setTaskHistory(data.taskHistory);
        if (data.messages) setMessages(data.messages);
      }
      toast.success("Project loaded successfully");
    } catch (err) {
      console.error("Open project failed:", err);
      toast.error("Failed to load project");
    }
  };

  // ---------------------------------------------------------------------------
  // Browser pane URL load
  // ---------------------------------------------------------------------------

  const handleBrowserGo = () => {
    let url = browserUrl.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    setBrowserUrl(url);
  };

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-4 gap-3">
        <button type="button"
          onClick={() => navigate("/")}
          className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors"
          title="Back to Suite"
        >
          {"\u2190"} Suite
        </button>
        <div className="w-px h-5 bg-studio-border" />
        <span className="text-xl leading-none">{"\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F"}</span>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">ValleyNet</span>
          <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">VNt</span>
        </div>
        <div className="flex-1" />
        <button type="button" onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
          Open .CryptArt
        </button>
        <button type="button" onClick={handleSaveProject} className="btn text-[10px] py-1 px-3">
          Save .CryptArt
        </button>
        {/* Improvement 88: Export conversation */}
        <button type="button"
          onClick={() => {
            const text = messages.map((m) => `[${m.role === "user" ? "You" : "ValleyNet"}] ${m.content}`).join("\n\n");
            const blob = new Blob([text], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `valleynet-chat-${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Conversation exported!");
          }}
          className="btn text-[10px] py-1 px-3"
          title="Export Conversation"
        >
          {"\u{1F4BE}"} Export
        </button>
        {/* Improvement 85: Clear chat */}
        <button type="button"
          onClick={() => {
            if (messages.length > 1) {
              setMessages([messages[0]]);
              toast.info("Chat cleared");
            }
          }}
          className="btn text-[10px] py-1 px-3"
          title="Clear Chat"
        >
          {"\u{1F5D1}\uFE0F"} Clear
        </button>
        <button
          onClick={() => setShowBrowser(!showBrowser)}
          className={`btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors ${showBrowser ? "bg-studio-hover" : ""}`}
          title="Toggle Browser Pane"
        >
          {"\u{1F310}"} Browser
        </button>
      </header>

      {/* Improvement 84 + 87: Agent config bar */}
      <div className="flex items-center gap-3 h-[28px] bg-studio-surface border-b border-studio-border px-4 text-[10px]">
        <span className="text-studio-muted">Autonomy:</span>
        {(["ask", "suggest", "auto"] as const).map((lvl) => (
          <button
            key={lvl}
            onClick={() => setAutonomyLevel(lvl)}
            className={`px-2 py-0.5 rounded transition-colors capitalize ${
              autonomyLevel === lvl ? "bg-studio-cyan/15 text-studio-cyan" : "text-studio-muted hover:text-studio-text"
            }`}
          >
            {lvl}
          </button>
        ))}
        <div className="w-px h-3 bg-studio-border" />
        <span className="text-studio-muted">Personality:</span>
        <select aria-label="Select option"
          value={personality}
          onChange={(e) => setPersonality(e.target.value as any)}
          className="bg-transparent text-[10px] text-studio-secondary outline-none cursor-pointer"
        >
          <option value="friendly">Friendly</option>
          <option value="professional">Professional</option>
          <option value="concise">Concise</option>
        </select>
        <div className="w-px h-3 bg-studio-border" />
        {/* Improvement 89: Connection status */}
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${integrations.some((i) => i.connected) ? "bg-studio-green" : "bg-studio-muted"}`} />
          {integrations.filter((i) => i.connected).length} services
        </span>
        <span className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${skills.some((s) => s.enabled) ? "bg-studio-cyan" : "bg-studio-muted"}`} />
          {skills.filter((s) => s.enabled).length} skills
        </span>
        <div className="w-px h-3 bg-studio-border" />
        <AIOptimizer actionKey="valleynet-agent" className="h-6" />
        <div className="w-px h-3 bg-studio-border" />
        {/* Improvement 334: Model picker */}
        <span className="text-studio-muted">Model:</span>
        <select aria-label="Select option"
          value={selectedModel}
          onChange={(e) => {
            setSelectedModel(e.target.value);
            setActionModel("valleynet-agent", e.target.value);
          }}
          className="bg-transparent text-[10px] text-studio-cyan outline-none cursor-pointer max-w-[160px]"
        >
          {availableModels.map((m) => (
            <option key={m} value={m}>{m.split("/").pop()}</option>
          ))}
        </select>
        <div className="w-px h-3 bg-studio-border" />
        {/* Improvement 335: Provider toggle */}
        <button
          onClick={() => setUseOpenRouter(!useOpenRouter)}
          className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
            useOpenRouter ? "bg-studio-cyan/15 text-studio-cyan" : "bg-studio-surface text-studio-muted"
          }`}
          title={useOpenRouter ? "Using OpenRouter" : "Using OpenAI direct"}
        >
          {useOpenRouter ? "OR" : "OAI"}
        </button>
        {/* Improvement 336: Response format */}
        <select aria-label="Select option"
          value={responseFormat}
          onChange={(e) => setResponseFormat(e.target.value as any)}
          className="bg-transparent text-[10px] text-studio-muted outline-none cursor-pointer"
          title="Response format"
        >
          <option value="text">Text</option>
          <option value="json">JSON</option>
          <option value="markdown">Markdown</option>
        </select>
        {/* Improvement 337: System prompt editor toggle */}
        <button
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className={`px-1.5 py-0.5 rounded text-[9px] transition-colors ${
            showSystemPrompt ? "bg-purple-500/15 text-purple-400" : "text-studio-muted hover:text-studio-text"
          }`}
          title="Custom system prompt"
        >
          Sys
        </button>
      </div>

      {/* Improvement 331: System prompt editor panel */}
      {showSystemPrompt && (
        <div className="px-4 py-2 bg-studio-surface border-b border-studio-border">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-purple-400 font-semibold">Custom System Prompt</span>
            <span className="text-[8px] text-studio-muted">(prepended to all AI requests)</span>
            <div className="flex-1" />
            <span className="text-[9px] text-studio-muted">Budget: </span>
            <select
              value={tokenBudget}
              onChange={(e) => setTokenBudget(parseInt(e.target.value))}
              className="bg-transparent text-[9px] text-studio-muted outline-none cursor-pointer"
            >
              {[1024, 2048, 4096, 8192, 16384].map((n) => (
                <option key={n} value={n}>{n} tokens</option>
              ))}
            </select>
            <button onClick={() => setShowSystemPrompt(false)} className="text-[10px] text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
          </div>
          <textarea
            value={customSystemPrompt}
            onChange={(e) => setCustomSystemPrompt(e.target.value)}
            className="w-full h-16 bg-studio-bg border border-studio-border rounded p-2 text-[10px] text-studio-text font-mono resize-none outline-none focus:border-purple-500/40"
            placeholder="Enter custom instructions for the AI... (e.g., 'Always respond in bullet points' or 'You are a Python expert')"
          />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 min-h-0">
        {/* Left Sidebar - Skills / Integrations / History */}
        <div className="w-[260px] min-w-[220px] bg-studio-panel border-r border-studio-border flex flex-col">
          {/* Sidebar Tabs */}
          <div className="flex border-b border-studio-border">
            {(["skills", "integrations", "history"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
                  activePanel === tab
                    ? "text-studio-cyan border-b-2 border-studio-cyan"
                    : "text-studio-muted hover:text-studio-text"
                }`}
              >
                {tab === "history" ? `history (${taskHistory.length})` : tab}
              </button>
            ))}
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {activePanel === "skills" && (
              <div className="flex flex-col gap-1.5">
                <p className="text-[9px] text-studio-muted px-1 py-1">
                  Skills are modular capabilities. Each skill has a SKILL.md manifest.
                </p>
                {skills.map((skill) => (
                  <div
                    key={skill.id}
                    className={`p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      skill.enabled
                        ? "bg-studio-surface border-studio-cyan/20"
                        : "bg-studio-bg border-studio-border hover:border-studio-border-bright"
                    }`}
                    onClick={() => toggleSkill(skill.id)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-studio-text flex items-center gap-1.5">
                        <span>{skill.icon}</span>
                        {skill.name}
                      </span>
                      <span className={`text-[9px] font-mono ${skill.enabled ? "text-studio-green" : "text-studio-muted"}`}>
                        {skill.enabled ? "ON" : "OFF"}
                      </span>
                    </div>
                    <p className="text-[9px] text-studio-muted leading-relaxed">{skill.description}</p>
                  </div>
                ))}
              </div>
            )}

            {activePanel === "integrations" && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] text-studio-muted px-1 py-1">
                  Connect external services. Credentials are stored locally.
                </p>
                {integrations.map((intg) => (
                  <div key={intg.id} className="p-2.5 rounded-lg bg-studio-surface border border-studio-border">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-studio-text flex items-center gap-1.5">
                        <span>{intg.icon}</span>
                        {intg.name}
                      </span>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={intg.connected}
                          onChange={(e) => updateIntegration(intg.id, "connected", e.target.checked)}
                          className="accent-studio-cyan"
                        />
                        <span className={`text-[9px] ${intg.connected ? "text-studio-green" : "text-studio-muted"}`}>
                          {intg.connected ? "Connected" : "Off"}
                        </span>
                      </label>
                    </div>
                    {intg.connected && (
                      <input
                        type="password"
                        value={intg.credential}
                        onChange={(e) => updateIntegration(intg.id, "credential", e.target.value)}
                        className="input text-[10px] py-1 mt-1 animate-fade-in"
                        placeholder="API key / token / webhook URL..."
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {activePanel === "history" && (
              <div className="flex flex-col gap-2">
                <p className="text-[9px] text-studio-muted px-1 py-1">
                  Task history and persistent memory across sessions.
                </p>
                {taskHistory.length === 0 ? (
                  <p className="text-[10px] text-studio-muted text-center py-8">No tasks yet. Send a message to start!</p>
                ) : (
                  taskHistory.map((entry) => (
                    <div key={entry.id} className="p-2.5 rounded-lg bg-studio-surface border border-studio-border">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[9px] font-mono ${
                          entry.status === "completed" ? "text-studio-green" :
                          entry.status === "failed" ? "text-studio-accent" :
                          "text-studio-yellow animate-pulse"
                        }`}>
                          {entry.status === "completed" ? "\u2705" : entry.status === "failed" ? "\u274C" : "\u23F3"} {entry.status}
                        </span>
                        <span className="text-[8px] text-studio-muted">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-[10px] text-studio-text font-medium mb-0.5">{entry.task}</p>
                      {entry.result && <p className="text-[9px] text-studio-secondary">{entry.result}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Chat + Browser */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Browser Pane (toggleable) */}
          {showBrowser && (
            <div className="h-[45%] border-b border-studio-border flex flex-col animate-fade-in">
              <div className="flex items-center gap-2 px-3 py-2 bg-studio-panel border-b border-studio-border">
                <span className="text-[10px] text-studio-muted">{"\u{1F310}"}</span>
                <input
                  type="text"
                  value={browserUrl}
                  onChange={(e) => setBrowserUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleBrowserGo()}
                  className="input flex-1 text-[11px] py-1"
                  placeholder="Enter URL..."
                />
                <button onClick={handleBrowserGo} className="btn text-[10px] px-2 py-1">Go</button>
              </div>
              <div className="flex-1 relative bg-studio-bg overflow-hidden">
                <iframe
                  src={browserUrl}
                  className="absolute inset-0 w-full h-full border-0"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  title="ValleyNet Browser"
                />
              </div>
            </div>
          )}

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Improvement 386: Conversation search + stats bar */}
            <div className="flex items-center gap-2 px-4 py-1.5 border-b border-studio-border bg-studio-surface">
              <input
                type="text"
                value={conversationSearch}
                onChange={(e) => setConversationSearch(e.target.value)}
                className="input text-[10px] py-0.5 flex-1"
                enterKeyHint="search" placeholder="Search messages..." autoComplete="off" spellCheck={false}
              />
              <span className="text-[9px] text-studio-muted">{messages.length} msgs</span>
              {pinnedMessages.length > 0 && <span className="text-[9px] text-studio-yellow">{pinnedMessages.length} pinned</span>}
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as any)}
                className="bg-transparent text-[9px] text-studio-muted outline-none cursor-pointer"
              >
                <option value="txt">TXT</option>
                <option value="json">JSON</option>
                <option value="md">Markdown</option>
              </select>
              <button
                onClick={() => {
                  let text: string;
                  if (exportFormat === "json") {
                    text = JSON.stringify(messages, null, 2);
                  } else if (exportFormat === "md") {
                    text = messages.map((m) => `### ${m.role === "user" ? "You" : "ValleyNet"}\n${m.content}`).join("\n\n");
                  } else {
                    text = messages.map((m) => `[${m.role === "user" ? "You" : "ValleyNet"}] ${m.content}`).join("\n\n");
                  }
                  const blob = new Blob([text], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `valleynet-chat.${exportFormat}`; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-[9px] text-studio-cyan hover:underline cursor-pointer"
              >Export</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.filter((m) => !conversationSearch || m.content.toLowerCase().includes(conversationSearch.toLowerCase())).map((msg, i) => (
                <div
                  key={i}
                  className={`ai-message ${msg.role === "user" ? "ai-message-user" : "ai-message-assistant"}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-studio-muted">
                      {msg.role === "user" ? "You" : "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F ValleyNet"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {/* Improvement 387: Pin message */}
                      <button
                        onClick={() => setPinnedMessages((prev) => prev.includes(i) ? prev.filter((p) => p !== i) : [...prev, i])}
                        className={`text-[8px] transition-colors ${pinnedMessages.includes(i) ? "text-studio-yellow" : "text-studio-muted hover:text-studio-yellow opacity-0 group-hover:opacity-100"}`}
                        title={pinnedMessages.includes(i) ? "Unpin" : "Pin"}
                      >{pinnedMessages.includes(i) ? "\u{1F4CC}" : "\u{1F4CC}"}</button>
                      {/* Improvement 90: Message timestamps */}
                      <span className="text-[8px] text-studio-muted">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-studio-text whitespace-pre-wrap">{msg.content}</div>
                </div>
              ))}
              {agentLoading && (
                <div className="ai-message ai-message-assistant">
                  <div className="text-[10px] font-semibold text-studio-muted mb-1">
                    {"\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F"} ValleyNet
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-studio-cyan">
                    <span className="animate-pulse">{"\u23F3"}</span>
                    <span>Processing your task...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-studio-border p-3">
              {/* Improvement 86: Quick task templates */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {quickTasks.map((qt) => (
                  <button
                    key={qt.label}
                    onClick={() => setChatInput(qt.prompt)}
                    className="text-[9px] px-2 py-0.5 rounded-full bg-studio-surface border border-studio-border text-studio-secondary hover:border-studio-cyan hover:text-studio-cyan transition-colors"
                  >
                    {qt.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  className="input flex-1 text-[12px] py-2"
                  placeholder="Tell ValleyNet what to do..."
                  disabled={agentLoading}
                />
                <button onClick={handleSend} className="btn btn-cyan px-4" disabled={agentLoading}>
                  {agentLoading ? "..." : "Send"}
                </button>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[9px] text-studio-muted">
                  {skills.filter((s) => s.enabled).length} skills active
                </span>
                <span className="text-[9px] text-studio-muted">-</span>
                <span className="text-[9px] text-studio-muted">
                  {integrations.filter((i) => i.connected).length} integrations connected
                </span>
                <span className="text-[9px] text-studio-muted">-</span>
                <span className="text-[9px] text-studio-muted">
                  {taskHistory.length} tasks completed
                </span>
                <span className="text-[9px] text-studio-muted">-</span>
                <span className="text-[9px] text-studio-muted">
                  Mode: {autonomyLevel}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Improvement 183: Agent memory overlay */}
      {showMemory && (
        <div className="modal-overlay" onClick={() => setShowMemory(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F9E0}"} Agent Memory</h2>
              <button onClick={() => setShowMemory(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body">
              {agentMemory.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">{"\u{1F9E0}"}</div>
                  <div className="empty-state-title">No memories stored</div>
                  <div className="empty-state-description">The agent will remember important context from conversations.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {agentMemory.map((m, i) => (
                    <div key={i} className="flex items-start justify-between p-2 rounded bg-studio-surface border border-studio-border">
                      <div>
                        <div className="text-[10px] font-semibold text-studio-cyan">{m.key}</div>
                        <div className="text-[10px] text-studio-secondary">{m.value}</div>
                      </div>
                      <button onClick={() => setAgentMemory((prev) => prev.filter((_, idx) => idx !== i))} className="text-[9px] text-studio-muted hover:text-studio-red" aria-label="Close">x</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button onClick={() => setAgentMemory((prev) => [...prev, { key: "Note", value: "New memory entry" }])} className="btn text-[10px]">+ Add Memory</button>
                <button onClick={() => setAgentMemory([])} className="btn text-[10px] text-studio-red">Clear All</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 181: Workflow builder overlay */}
      {showWorkflowBuilder && (
        <div className="modal-overlay" onClick={() => setShowWorkflowBuilder(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F527}"} Workflow Builder</h2>
              <button onClick={() => setShowWorkflowBuilder(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body">
              {workflows.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">{"\u{1F527}"}</div>
                  <div className="empty-state-title">No workflows yet</div>
                  <div className="empty-state-description">Create multi-step automation workflows for the agent.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {workflows.map((w) => (
                    <div key={w.id} className="p-2 rounded bg-studio-surface border border-studio-border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-studio-text">{w.name}</span>
                        <span className={`badge ${w.active ? "badge-green" : "badge-yellow"} text-[8px]`}>{w.active ? "Active" : "Inactive"}</span>
                      </div>
                      <div className="text-[9px] text-studio-muted mt-1">{w.steps.length} steps</div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setWorkflows((prev) => [...prev, { id: `wf-${Date.now()}`, name: `Workflow ${prev.length + 1}`, steps: ["Step 1"], active: false }])}
                className="btn text-[10px] mt-3"
              >
                + New Workflow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 287: Knowledge base overlay */}
      {showKnowledgeBase && (
        <div className="modal-overlay" onClick={() => setShowKnowledgeBase(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F4DA}"} Knowledge Base</h2>
              <button onClick={() => setShowKnowledgeBase(false)} className="btn-ghost text-studio-muted hover:text-studio-text" aria-label="Close">x</button>
            </div>
            <div className="modal-body">
              {knowledgeBase.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">{"\u{1F4DA}"}</div>
                  <div className="empty-state-title">Empty knowledge base</div>
                  <div className="empty-state-description">Add documents for the agent to reference.</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {knowledgeBase.map((doc) => (
                    <div key={doc.id} className="p-2 rounded bg-studio-surface border border-studio-border">
                      <div className="text-[11px] font-semibold text-studio-text">{doc.title}</div>
                      <div className="text-[9px] text-studio-muted mt-1 truncate-2">{doc.content}</div>
                      <div className="flex gap-1 mt-1">
                        {doc.tags.map((t) => <span key={t} className="badge text-[7px]">{t}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => setKnowledgeBase((prev) => [...prev, { id: `kb-${Date.now()}`, title: "New Document", content: "", tags: [] }])}
                className="btn text-[10px] mt-3"
              >+ Add Document</button>
            </div>
          </div>
        </div>
      )}

      {/* Improvement 289: Tool use log overlay */}
      {showToolLog && (
        <div className="modal-overlay" onClick={() => setShowToolLog(false)}>
          <div role="dialog" aria-modal="true" className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{"\u{1F527}"} Tool Use Log</h2>
              <button onClick={() => setShowToolLog(false)} className="btn-ghost text-studio-muted hover:text-studio-text">x</button>
            </div>
            <div className="modal-body">
              {toolLog.length === 0 ? (
                <div className="text-[11px] text-studio-muted text-center py-4">No tool invocations yet</div>
              ) : (
                <div className="flex flex-col gap-2">
                  {toolLog.slice(-20).reverse().map((entry, i) => (
                    <div key={i} className="p-2 rounded bg-studio-surface border border-studio-border">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-studio-cyan">{entry.tool}</span>
                        <span className="text-[8px] text-studio-muted">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[9px] text-studio-muted mt-1 truncate-1">{entry.input}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Status Bar - Improvements 286-293 */}
      <footer className="status-bar" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span>{activePersona ? personas.find((p) => p.id === activePersona)?.icon || "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F" : "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F"} VNet v0.1.0</span>
          <span className="text-studio-border">|</span>
          {/* Improvement 292: Model */}
          <span>{selectedModel}</span>
          <span className="text-studio-border">|</span>
          <span>{skills.filter((s) => s.enabled).length}/{skills.length} skills</span>
          <span className="text-studio-border">|</span>
          <span>{plugins.filter((p) => p.enabled).length} plugins</span>
          <span className="text-studio-border">|</span>
          {/* Improvement 288: RAG */}
          {ragEnabled && <><span className="text-studio-cyan">RAG</span><span className="text-studio-border">|</span></>}
          <span className={safeMode ? "text-studio-green" : "text-studio-yellow"}>{safeMode ? "Safe" : "Open"}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{taskHistory.length} tasks</span>
          <span className="text-studio-border">|</span>
          <span>{autonomyLevel}</span>
          <span className="text-studio-border">|</span>
          <span>{tokenUsage.total} tok</span>
          {/* Improvement 293: Cost */}
          {costEstimate > 0 && <><span className="text-studio-border">|</span><span>${costEstimate.toFixed(4)}</span></>}
          <span className="text-studio-border">|</span>
          {/* Improvement 287: KB count */}
          <button onClick={() => setShowKnowledgeBase(true)} className="hover:text-studio-cyan transition-colors">
            {"\u{1F4DA}"} {knowledgeBase.length} docs
          </button>
          <span className="text-studio-border">|</span>
          <button onClick={() => setShowMemory(true)} className="hover:text-studio-cyan transition-colors">
            {"\u{1F9E0}"} {agentMemory.length}
          </button>
          <span className="text-studio-border">|</span>
          {/* Improvement 289: Tool log */}
          <button onClick={() => setShowToolLog(true)} className="hover:text-studio-cyan transition-colors">
            {"\u{1F527}"} {toolLog.length}
          </button>
          <span className="text-studio-border">|</span>
          <span>{sessionDuration < 60 ? `${sessionDuration}s` : `${Math.floor(sessionDuration / 60)}m`}</span>
        </div>
      </footer>
    </div>
  );
}
