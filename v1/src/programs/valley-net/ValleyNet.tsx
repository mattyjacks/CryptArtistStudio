import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { serializeCryptArt, parseCryptArt, createCryptArtFile } from "../../utils/cryptart";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";

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

      const prompt = `You are ValleyNet, an autonomous AI agent inside CryptArtist Studio. You are inspired by OpenClaw.

Your enabled skills: ${enabledSkillsList || "None"}
Your connected integrations: ${connectedIntgs || "None"}

When the user gives you a task:
1. Analyze what skills and integrations would be needed
2. Plan the steps to accomplish the task
3. Execute or explain each step clearly
4. Report the results

If a required skill is not enabled or integration not connected, explain what the user needs to enable.
Be proactive, thorough, and provide actionable results. Use markdown formatting.

User task: ${userMsg.content}`;

      const reply = await invoke<string>("ai_chat", { prompt });
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
      const fallbackContent = `I couldn't connect to the AI backend: ${errMsg}\n\nTo enable AI responses:\n1. Go back to the Suite Launcher\n2. Open Settings (gear icon)\n3. Enter your OpenAI API key\n\nOnce configured, I'll be able to process your tasks using the enabled skills and integrations.`;
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

  const handleSaveProject = async () => {
    try {
      const projectData = {
        skills, integrations, taskHistory,
        messages: messages.slice(-50), // Save last 50 messages
      };
      const cryptArt = createCryptArtFile("valley-net", "ValleyNet Session", projectData);
      const json = serializeCryptArt(cryptArt);
      const savePath = await saveDialog({
        defaultPath: "valleynet-session.CryptArt",
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
      });
      if (savePath) {
        await invoke("write_text_file", { path: savePath, contents: json });
      }
    } catch (err) {
      console.error("Save project failed:", err);
    }
  };

  const handleOpenProject = async () => {
    try {
      const selected = await openDialog({
        filters: [{ name: "CryptArtist Art", extensions: ["CryptArt"] }],
        multiple: false,
      });
      if (selected && typeof selected === "string") {
        const json = await invoke<string>("read_text_file", { path: selected });
        const project = parseCryptArt(json);
        if (project.program !== "valley-net") return;
        const data = project.data as any;
        if (data.skills) setSkills(data.skills);
        if (data.integrations) setIntegrations(data.integrations);
        if (data.taskHistory) setTaskHistory(data.taskHistory);
        if (data.messages) setMessages(data.messages);
        toast.success("Project loaded successfully");
      }
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
    <div className="flex flex-col h-screen w-screen bg-studio-bg overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-4 gap-3">
        <button
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
        <button onClick={handleOpenProject} className="btn text-[10px] py-1 px-3">
          Open .CryptArt
        </button>
        <button onClick={handleSaveProject} className="btn text-[10px] py-1 px-3">
          Save .CryptArt
        </button>
        <button
          onClick={() => setShowBrowser(!showBrowser)}
          className={`btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors ${showBrowser ? "bg-studio-hover" : ""}`}
          title="Toggle Browser Pane"
        >
          {"\u{1F310}"} Browser
        </button>
      </header>

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
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`ai-message ${msg.role === "user" ? "ai-message-user" : "ai-message-assistant"}`}
                >
                  <div className="text-[10px] font-semibold text-studio-muted mb-1">
                    {msg.role === "user" ? "You" : "\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F ValleyNet"}
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="status-bar">
        <span>{"\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F"} ValleyNet v0.1.0</span>
        <div className="flex items-center gap-3">
          <span>{skills.filter((s) => s.enabled).length}/{skills.length} skills</span>
          <span>|</span>
          <span>{integrations.filter((i) => i.connected).length} connected</span>
          <span>|</span>
          <span>{taskHistory.length} tasks</span>
          <span>|</span>
          <span>Inspired by OpenClaw</span>
        </div>
      </footer>
    </div>
  );
}
