/* Wave2: select-aria */
/* Wave2: type=button applied */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";
import { safeGetRaw, safeSetRaw, safeGetRawJSON, safeStorageUsage } from "../../utils/storage";
import {
  AI_ACTIONS,
  AI_MODES,
  getActionModel,
  getActionMode,
  getDefaultModel,
  getDefaultMode,
  setActionModel,
  setActionMode,
  setDefaultModel,
  setDefaultMode,
  type AIActionKey,
} from "../../utils/openrouter";
import ThemeManager from "../../components/ThemeManager";
import PluginManager from "../../components/PluginManager";
import ModManager from "../../components/ModManager";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApiKeyEntry {
  id: string;
  label: string;
  icon: string;
  description: string;
  placeholder: string;
  getCmd: string;
  setCmd: string;
  setParam: string;
}

// ---------------------------------------------------------------------------
// API Key Definitions
// ---------------------------------------------------------------------------

const API_KEYS: ApiKeyEntry[] = [
  {
    id: "openai",
    label: "OpenAI API Key",
    icon: "\u{1F9E0}",
    description: "Powers AI chat, image generation, TTS, and scene analysis in Media Mogul, VibeCodeWorker, ValleyNet, and GameStudio.",
    placeholder: "sk-...",
    getCmd: "get_api_key",
    setCmd: "save_api_key",
    setParam: "key",
  },
  {
    id: "openrouter",
    label: "OpenRouter API Key",
    icon: "\u{1F310}",
    description: "Access every AI model on OpenRouter (GPT-4o, Claude, Gemini, Llama, Mistral, and 200+ more) from any CryptArtist program.",
    placeholder: "sk-or-v1-...",
    getCmd: "get_openrouter_key",
    setCmd: "save_openrouter_key",
    setParam: "key",
  },
  {
    id: "pexels",
    label: "Pexels API Key",
    icon: "\u{1F4F7}",
    description: "Search and import free stock photos and videos in Media Mogul.",
    placeholder: "Your Pexels API key...",
    getCmd: "get_pexels_key",
    setCmd: "save_pexels_key",
    setParam: "key",
  },
  {
    id: "elevenlabs",
    label: "ElevenLabs API Key",
    icon: "\u{1F50A}",
    description: "Powers Media Mogul voice generation, speech-to-text transcription, and sound effects generation.",
    placeholder: "sk_...",
    getCmd: "get_elevenlabs_key",
    setCmd: "save_elevenlabs_key",
    setParam: "key",
  },
];

// ---------------------------------------------------------------------------
// OpenRouter Popular Models
// ---------------------------------------------------------------------------

const OPENROUTER_MODELS = [
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
// Settings Sections
// ---------------------------------------------------------------------------

type SettingsSection = "api-keys" | "openrouter" | "appearance" | "themes" | "plugins" | "mods" | "shortcuts" | "data" | "about";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Settings() {
  const navigate = useNavigate();

  // Section
  const [activeSection, setActiveSection] = useState<SettingsSection>("api-keys");

  // API key values (live state)
  const [keyValues, setKeyValues] = useState<Record<string, string>>({});
  const [keyVisibility, setKeyVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);

  // OpenRouter
  const [orDefaultModel, setOrDefaultModel] = useState(() => getDefaultModel());
  const [orDefaultMode, setOrDefaultMode] = useState(() => getDefaultMode());
  const [actionModels, setActionModels] = useState<Record<AIActionKey, string>>(() => {
    return AI_ACTIONS.reduce((acc, action) => {
      acc[action.id] = getActionModel(action.id);
      return acc;
    }, {} as Record<AIActionKey, string>);
  });
  const [actionModes, setActionModes] = useState<Record<AIActionKey, "cheap" | "fast" | "good" | "smart" | "lucky">>(() => {
    return AI_ACTIONS.reduce((acc, action) => {
      acc[action.id] = getActionMode(action.id);
      return acc;
    }, {} as Record<AIActionKey, "cheap" | "fast" | "good" | "smart" | "lucky">);
  });
  const [orTestResult, setOrTestResult] = useState<string | null>(null);
  const [orTesting, setOrTesting] = useState(false);

  // Import/Export
  const [exportCount, setExportCount] = useState(() => {
    const c = safeGetRaw("cryptartist_key_export_count");
    return c ? parseInt(c, 10) : 0;
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Appearance
  const [accentColor, setAccentColor] = useState(() => safeGetRaw("cryptartist_accent", "cyan"));
  const [fontFamily, setFontFamily] = useState(() => safeGetRaw("cryptartist_font_family", "JetBrains Mono"));
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => safeGetRaw("cryptartist_notifications") !== "false");

  // Improvement 305: Data management
  const [storageUsage, setStorageUsage] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Improvement 371: Settings profiles
  const [profileName, setProfileName] = useState("");
  const [savedProfiles, setSavedProfiles] = useState<string[]>(() => {
    return safeGetRawJSON<string[]>("cryptartist_settings_profiles_list", []);
  });
  // Improvement 372: Auto-backup
  const [autoBackup, setAutoBackup] = useState(() => safeGetRaw("cryptartist_auto_backup") === "true");
  // Improvement 373: Theme preview
  const [themePreview, setThemePreview] = useState<string | null>(null);

  // Improvement 306: Calculate localStorage usage
  useEffect(() => {
    setStorageUsage(safeStorageUsage());
  }, [activeSection]);

  // Load all keys on mount
  useEffect(() => {
    API_KEYS.forEach((entry) => {
      invoke<string>(entry.getCmd)
        .then((val) => setKeyValues((prev) => ({ ...prev, [entry.id]: val })))
        .catch(() => {});
    });
    // Also load GiveGigs config
    invoke<[string, string]>("get_givegigs_config")
      .then(([url, key]) => setKeyValues((prev) => ({ ...prev, givegigs_url: url, givegigs_key: key })))
      .catch(() => {});
  }, []);

  // Save a single key
  const saveKey = async (entry: ApiKeyEntry) => {
    const value = keyValues[entry.id] || "";
    setSaving(entry.id);
    try {
      await invoke(entry.setCmd, { [entry.setParam]: value });
      toast.success(`${entry.label} saved!`);
      logger.action("Settings", `Saved ${entry.label}`);
    } catch (err) {
      toast.error(`Failed to save: ${err}`);
    }
    setSaving(null);
  };

  // Export all keys
  const handleExport = async () => {
    try {
      const json = await invoke<string>("export_all_api_keys");
      const newCount = exportCount + 1;
      setExportCount(newCount);
      safeSetRaw("cryptartist_key_export_count", String(newCount));
      const filename = `Forbidden-Secrets-of-CryptArtist-Keys-${newCount}.txt`;
      const blob = new Blob([json], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported to ${filename}`);
      logger.action("Settings", `Exported keys to ${filename}`);
    } catch (err) {
      toast.error(`Export failed: ${err}`);
    }
  };

  // Import keys
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const result = await invoke<string>("import_all_api_keys", { jsonStr: text });
      toast.success(result);
      logger.action("Settings", `Imported keys from ${file.name}`);
      // Reload all keys
      API_KEYS.forEach((entry) => {
        invoke<string>(entry.getCmd)
          .then((val) => setKeyValues((prev) => ({ ...prev, [entry.id]: val })))
          .catch(() => {});
      });
    } catch (err) {
      toast.error(`Import failed: ${err}`);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Test OpenRouter
  const testOpenRouter = async () => {
    setOrTesting(true);
    setOrTestResult(null);
    try {
      const reply = await invoke<string>("openrouter_chat", {
        prompt: "Say hello in exactly 5 words. Be creative.",
        model: orDefaultModel,
      });
      setOrTestResult(reply);
      toast.success("OpenRouter connection successful!");
    } catch (err) {
      setOrTestResult(`Error: ${err}`);
      toast.error(`Test failed: ${err}`);
    }
    setOrTesting(false);
  };

  // Save OpenRouter default model
  useEffect(() => {
    setDefaultModel(orDefaultModel);
  }, [orDefaultModel]);

  // Save default AI mode
  useEffect(() => {
    setDefaultMode(orDefaultMode);
  }, [orDefaultMode]);

  const sections: { id: SettingsSection; label: string; icon: string }[] = [
    { id: "api-keys", label: "API Keys", icon: "\u{1F511}" },
    { id: "openrouter", label: "OpenRouter", icon: "\u{1F310}" },
    { id: "appearance", label: "Appearance", icon: "\u{1F3A8}" },
    { id: "themes", label: "Themes", icon: "\u{1F308}" },
    { id: "plugins", label: "Plugins", icon: "\u{1F9E9}" },
    { id: "mods", label: "Mods", icon: "\u{1F680}" },
    { id: "shortcuts", label: "Shortcuts", icon: "\u2328\uFE0F" },
    { id: "data", label: "Data & Storage", icon: "\u{1F4BE}" },
    { id: "about", label: "About", icon: "\u{2139}\uFE0F" },
  ];

  const accentOptions = [
    { id: "cyan", color: "#00d2ff", label: "Cyan" },
    { id: "red", color: "#ff3b3b", label: "Red" },
    { id: "green", color: "#22c55e", label: "Green" },
    { id: "purple", color: "#7b2ff7", label: "Purple" },
    { id: "pink", color: "#ec4899", label: "Pink" },
    { id: "orange", color: "#f97316", label: "Orange" },
    { id: "yellow", color: "#eab308", label: "Yellow" },
    { id: "teal", color: "#14b8a6", label: "Teal" },
  ];

  return (
    <div className="flex flex-col h-screen bg-studio-bg text-studio-text">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-studio-panel border-b border-studio-border shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/")} className="btn-ghost text-studio-muted hover:text-studio-text text-sm">{"\u2190"} Back</button>
          <span className="text-lg font-bold">{"\u2699\uFE0F"} Settings</span>
          <span className="badge text-[8px]">Set</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={handleExport} className="btn text-[10px] px-3 py-1">{"\u{1F4E4}"} Export Keys</button>
          <label className="btn text-[10px] px-3 py-1 cursor-pointer">
            {"\u{1F4E5}"} Import Keys
            <input ref={fileInputRef} type="file" accept=".txt,.json" className="hidden" onChange={handleImport} />
          </label>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-studio-panel border-r border-studio-border flex flex-col py-2 shrink-0">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`text-left px-4 py-2.5 text-[12px] transition-colors ${
                activeSection === s.id
                  ? "bg-studio-cyan/10 text-studio-cyan border-r-2 border-studio-cyan"
                  : "text-studio-secondary hover:text-studio-text hover:bg-studio-hover"
              }`}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {/* API Keys Section */}
          {activeSection === "api-keys" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold mb-1">{"\u{1F511}"} API Keys</h2>
              <p className="text-[11px] text-studio-muted mb-6">
                Manage your API keys for all CryptArtist Studio integrations. Keys are stored securely in the Rust backend and never leave your machine.
              </p>

              <div className="flex flex-col gap-4">
                {API_KEYS.map((entry) => (
                  <div key={entry.id} className="p-4 rounded-xl bg-studio-surface border border-studio-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{entry.icon}</span>
                      <span className="text-[13px] font-semibold text-studio-text">{entry.label}</span>
                      {keyValues[entry.id] && <span className="text-[8px] text-studio-green font-semibold">{"\u2713"} SET</span>}
                    </div>
                    <p className="text-[10px] text-studio-muted mb-3">{entry.description}</p>
                    <div className="flex gap-2">
                      <input
                        type={keyVisibility[entry.id] ? "text" : "password"}
                        value={keyValues[entry.id] || ""}
                        onChange={(e) => setKeyValues((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                        className="input text-[11px] flex-1 py-1.5 font-mono"
                        placeholder={entry.placeholder}
                      />
                      <button type="button"
                        onClick={() => setKeyVisibility((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}
                        className="btn-ghost text-studio-muted hover:text-studio-text text-[10px] px-2"
                        title="Toggle visibility"
                      >
                        {keyVisibility[entry.id] ? "\u{1F441}" : "\u{1F441}\u200D\u{1F5E8}"}
                      </button>
                      <button type="button"
                        onClick={() => saveKey(entry)}
                        className="btn btn-cyan text-[10px] px-3 py-1"
                        disabled={saving === entry.id}
                      >
                        {saving === entry.id ? "..." : "Save"}
                      </button>
                    </div>
                  </div>
                ))}

                {/* GiveGigs Config */}
                <div className="p-4 rounded-xl bg-studio-surface border border-studio-border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{"\u{1F49C}"}</span>
                    <span className="text-[13px] font-semibold text-studio-text">GiveGigs Integration</span>
                  </div>
                  <p className="text-[10px] text-studio-muted mb-3">Connect to GiveGigs.com for donation and community features.</p>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={keyValues.givegigs_url || ""}
                      onChange={(e) => setKeyValues((prev) => ({ ...prev, givegigs_url: e.target.value }))}
                      className="input text-[11px] py-1.5 font-mono"
                      placeholder="GiveGigs URL..."
                    />
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={keyValues.givegigs_key || ""}
                        onChange={(e) => setKeyValues((prev) => ({ ...prev, givegigs_key: e.target.value }))}
                        className="input text-[11px] flex-1 py-1.5 font-mono"
                        placeholder="GiveGigs API key..."
                      />
                      <button type="button"
                        onClick={async () => {
                          try {
                            await invoke("save_givegigs_config", { url: keyValues.givegigs_url || "", key: keyValues.givegigs_key || "" });
                            toast.success("GiveGigs config saved!");
                          } catch (err) { toast.error(`Failed: ${err}`); }
                        }}
                        className="btn btn-cyan text-[10px] px-3 py-1"
                      >Save</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Import/Export info */}
              <div className="mt-6 p-4 rounded-xl bg-studio-bg border border-studio-border">
                <h3 className="text-[12px] font-semibold text-studio-text mb-2">{"\u{1F4C1}"} Forbidden Secrets File</h3>
                <p className="text-[10px] text-studio-muted mb-2">
                  Export all your API keys to a <code className="inline-code">Forbidden-Secrets-of-CryptArtist-Keys-{exportCount + 1}.txt</code> file.
                  Import them on another machine or after a fresh install.
                </p>
                <p className="text-[9px] text-red-400">
                  {"\u26A0\uFE0F"} WARNING: This file contains your secret API keys. Do NOT share it with anyone or commit it to version control!
                </p>
              </div>
            </div>
          )}

          {/* OpenRouter Section */}
          {activeSection === "openrouter" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold mb-1">{"\u{1F310}"} OpenRouter Integration</h2>
              <p className="text-[11px] text-studio-muted mb-6">
                OpenRouter gives you access to 200+ AI models through a single API key. Use any model from OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, and more
                - all from within CryptArtist Studio programs.
              </p>

              {/* Default model */}
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="text-[12px] font-semibold text-studio-text mb-2">Default Model</div>
                <select aria-label="Select option"
                  value={orDefaultModel}
                  onChange={(e) => setOrDefaultModel(e.target.value)}
                  className="input text-[11px] py-1.5 w-full"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>{m.provider} - {m.name}</option>
                  ))}
                </select>
                <p className="text-[9px] text-studio-muted mt-2">
                  Global default for all AI features. Recommended: GPT-5 Mini for balanced speed and cost.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="text-[12px] font-semibold text-studio-text mb-2">Default AI Mode</div>
                <select aria-label="Select option"
                  value={orDefaultMode}
                  onChange={(e) => setOrDefaultMode(e.target.value as "cheap" | "fast" | "good" | "smart" | "lucky")}
                  className="input text-[11px] py-1.5 w-full"
                >
                  {AI_MODES.map((m) => (
                    <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                  ))}
                </select>
                <p className="text-[9px] text-studio-muted mt-2">
                  💳 Cheap: lowest token cost. ⚡ Fast: fastest completion. 🦄 Good: positive, clever, funny tone. 🧠 Smart: intelligent and precise default. 🍀 Lucky: Deterministic RNG via LuckFactory.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="text-[12px] font-semibold text-studio-text mb-2">Per-Action AI Defaults</div>
                <p className="text-[9px] text-studio-muted mb-3">
                  Configure model and mode per action. Any unset action falls back to global defaults above.
                </p>
                <div className="flex flex-col gap-2">
                  {AI_ACTIONS.map((action) => (
                    <div key={action.id} className="p-2.5 rounded-lg bg-studio-bg border border-studio-border">
                      <div className="text-[10px] text-studio-text mb-2">{action.label}</div>
                      <div className="grid grid-cols-2 gap-2">
                        <select aria-label="Select option"
                          value={actionModels[action.id]}
                          onChange={(e) => {
                            const model = e.target.value;
                            setActionModels((prev) => ({ ...prev, [action.id]: model }));
                            setActionModel(action.id, model);
                          }}
                          className="input text-[10px] py-1"
                        >
                          {OPENROUTER_MODELS.map((m) => (
                            <option key={m.id} value={m.id}>{m.provider} - {m.name}</option>
                          ))}
                        </select>
                        <select
                          value={actionModes[action.id]}
                          onChange={(e) => {
                            const mode = e.target.value as "cheap" | "fast" | "good" | "smart" | "lucky";
                            setActionModes((prev) => ({ ...prev, [action.id]: mode }));
                            setActionMode(action.id, mode);
                          }}
                          className="input text-[10px] py-1"
                        >
                          {AI_MODES.map((m) => (
                            <option key={m.id} value={m.id}>{m.icon} {m.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Test connection */}
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="text-[12px] font-semibold text-studio-text mb-2">Test Connection</div>
                <div className="flex gap-2 items-center">
                  <button
                    onClick={testOpenRouter}
                    className="btn btn-cyan text-[10px] px-4 py-1.5"
                    disabled={orTesting}
                  >
                    {orTesting ? "Testing..." : "\u{1F50C} Test OpenRouter"}
                  </button>
                  <span className="text-[10px] text-studio-muted">using {orDefaultModel}</span>
                </div>
                {orTestResult && (
                  <div className={`mt-3 p-3 rounded text-[10px] ${
                    orTestResult.startsWith("Error") ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-studio-cyan/10 text-studio-text border border-studio-cyan/20"
                  }`}>
                    <span className="font-semibold">Response:</span> {orTestResult}
                  </div>
                )}
              </div>

              {/* Model catalog */}
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border">
                <div className="text-[12px] font-semibold text-studio-text mb-3">Popular Models</div>
                <div className="grid grid-cols-2 gap-2">
                  {OPENROUTER_MODELS.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-lg text-[10px] cursor-pointer transition-colors ${
                        orDefaultModel === m.id
                          ? "bg-studio-cyan/10 border border-studio-cyan/30 text-studio-cyan"
                          : "bg-studio-bg border border-studio-border hover:border-studio-cyan/20 text-studio-text"
                      }`}
                      onClick={() => setOrDefaultModel(m.id)}
                    >
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-[8px] text-studio-muted mt-0.5">{m.provider} - {m.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Appearance Section */}
          {activeSection === "appearance" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold mb-1">{"\u{1F3A8}"} Appearance</h2>
              <p className="text-[11px] text-studio-muted mb-6">Customize the look and feel of CryptArtist Studio.</p>

              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border">
                <div className="text-[12px] font-semibold text-studio-text mb-3">Accent Color</div>
                <div className="flex gap-3 flex-wrap">
                  {accentOptions.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setAccentColor(opt.id); safeSetRaw("cryptartist_accent", opt.id); }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        accentColor === opt.id ? "ring-2 ring-offset-2 ring-offset-studio-surface" : "opacity-70 hover:opacity-100"
                      }`}
                      style={accentColor === opt.id ? { boxShadow: `0 0 0 2px ${opt.color}` } : {}}
                    >
                      <div className="w-8 h-8 rounded-full" style={{ background: opt.color }} />
                      <span className="text-[8px] text-studio-muted">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Themes Section */}
          {activeSection === "themes" && <ThemeManager />}

          {/* Plugins Section */}
          {activeSection === "plugins" && <PluginManager />}

          {/* Mods Section */}
          {activeSection === "mods" && <ModManager />}

          {/* Improvement 303: Shortcuts Section */}
          {activeSection === "shortcuts" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold mb-1">{"\u2328\uFE0F"} Keyboard Shortcuts</h2>
              <p className="text-[11px] text-studio-muted mb-6">Quick reference for all global keyboard shortcuts.</p>
              <div className="flex flex-col gap-1">
                {[
                  { keys: "1-7", desc: "Quick-launch programs from Suite Launcher [SLr]" },
                  { keys: "Ctrl+S", desc: "Save current project" },
                  { keys: "Ctrl+Z", desc: "Undo" },
                  { keys: "Ctrl+Shift+Z", desc: "Redo" },
                  { keys: "Ctrl+F", desc: "Find / Search" },
                  { keys: "Ctrl+H", desc: "Find & Replace" },
                  { keys: "Ctrl+Shift+P", desc: "Command Palette (VibeCodeWorker)" },
                  { keys: "Ctrl+G", desc: "Go to Line (VibeCodeWorker)" },
                  { keys: "Ctrl+,", desc: "Open Settings" },
                  { keys: "?", desc: "Show keyboard shortcuts overlay (Launcher)" },
                  { keys: "R", desc: "Recent projects (Launcher)" },
                  { keys: "Ctrl+Shift+/", desc: "Toggle shortcut help (VibeCodeWorker)" },
                  { keys: "Esc", desc: "Close modal / overlay" },
                  { keys: "Enter", desc: "Send message / execute command" },
                  { keys: "Up/Down", desc: "Navigate command history (Commander)" },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-studio-surface border border-studio-border">
                    <span className="text-[11px] text-studio-text">{s.desc}</span>
                    <kbd className="kbd text-[10px]">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Improvement 304-310: Data & Storage Section */}
          {activeSection === "data" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold mb-1">{"\u{1F4BE}"} Data & Storage</h2>
              <p className="text-[11px] text-studio-muted mb-6">Manage your local data, storage, and preferences.</p>

              {/* Storage usage */}
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="text-[12px] font-semibold text-studio-text mb-2">Local Storage Usage</div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex-1 h-2 bg-studio-bg rounded-full overflow-hidden">
                    <div className="h-full bg-studio-cyan rounded-full transition-all" style={{ width: `${Math.min(100, (storageUsage / 5242880) * 100)}%` }} />
                  </div>
                  <span className="text-[10px] text-studio-muted">{(storageUsage / 1024).toFixed(1)} KB / 5 MB</span>
                </div>
                <div className="text-[9px] text-studio-muted">CryptArtist Studio stores preferences, scripts, favorites, and session data in your browser's localStorage.</div>
              </div>

              {/* Notifications */}
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-semibold text-studio-text">Toast Notifications</div>
                    <div className="text-[9px] text-studio-muted mt-1">Show popup notifications for saves, errors, and AI responses.</div>
                  </div>
                  <button
                    onClick={() => { const v = !notificationsEnabled; setNotificationsEnabled(v); safeSetRaw("cryptartist_notifications", String(v)); }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${notificationsEnabled ? "bg-studio-cyan" : "bg-studio-border"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${notificationsEnabled ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Font family */}
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="text-[12px] font-semibold text-studio-text mb-2">Editor Font Family</div>
                <select
                  value={fontFamily}
                  onChange={(e) => { setFontFamily(e.target.value); safeSetRaw("cryptartist_font_family", e.target.value); }}
                  className="input text-[11px] py-1.5 w-full"
                >
                  {["JetBrains Mono", "Fira Code", "Source Code Pro", "Cascadia Code", "Consolas", "Monaco", "Menlo", "monospace"].map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <div className="mt-2 p-2 rounded bg-studio-bg border border-studio-border">
                  <pre className="text-[11px]" style={{ fontFamily }}>{"const hello = 'CryptArtist Studio'; // preview"}</pre>
                </div>
              </div>

              {/* Improvement 371: Settings profiles */}
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="text-[12px] font-semibold text-studio-text mb-2">Settings Profiles</div>
                <div className="text-[9px] text-studio-muted mb-3">Save and restore your entire settings configuration.</div>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="input text-[10px] py-1 flex-1"
                    placeholder="Profile name..."
                  />
                  <button
                    onClick={() => {
                      if (!profileName.trim()) return;
                      const profile: Record<string, string> = {};
                      try {
                        for (let i = 0; i < localStorage.length; i++) {
                          const k = localStorage.key(i);
                          if (k?.startsWith("cryptartist")) profile[k] = safeGetRaw(k);
                        }
                      } catch { /* ignore iteration errors */ }
                      safeSetRaw(`cryptartist_profile_${profileName.trim()}`, JSON.stringify(profile));
                      const list = [...savedProfiles.filter(p => p !== profileName.trim()), profileName.trim()];
                      setSavedProfiles(list);
                      safeSetRaw("cryptartist_settings_profiles_list", JSON.stringify(list));
                      setProfileName("");
                      toast.success(`Profile "${profileName.trim()}" saved`);
                    }}
                    className="btn btn-cyan text-[9px] py-1 px-3"
                  >Save</button>
                </div>
                {savedProfiles.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {savedProfiles.map((p) => (
                      <div key={p} className="flex items-center gap-2 p-2 rounded bg-studio-bg border border-studio-border">
                        <span className="text-[10px] text-studio-text flex-1">{p}</span>
                        <button
                          onClick={() => {
                            try {
                              const data = JSON.parse(safeGetRaw(`cryptartist_profile_${p}`, "{}"));
                              Object.entries(data).forEach(([k, v]) => safeSetRaw(k, v as string));
                              toast.success(`Profile "${p}" loaded - reload to apply`);
                            } catch { toast.error("Failed to load profile"); }
                          }}
                          className="btn text-[8px] py-0.5 px-2"
                        >Load</button>
                        <button
                          onClick={() => {
                            try { localStorage.removeItem(`cryptartist_profile_${p}`); } catch { /* ignore */ }
                            const list = savedProfiles.filter(x => x !== p);
                            setSavedProfiles(list);
                            safeSetRaw("cryptartist_settings_profiles_list", JSON.stringify(list));
                            toast.success(`Profile "${p}" deleted`);
                          }}
                          className="btn text-[8px] py-0.5 px-2 text-red-400 border-red-500/30"
                        >Delete</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Improvement 372: Auto-backup toggle */}
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-semibold text-studio-text">Auto-Backup Settings</div>
                    <div className="text-[9px] text-studio-muted mt-1">Automatically save a backup profile every 30 minutes.</div>
                  </div>
                  <button
                    onClick={() => { const v = !autoBackup; setAutoBackup(v); safeSetRaw("cryptartist_auto_backup", String(v)); }}
                    className={`w-10 h-5 rounded-full transition-colors relative ${autoBackup ? "bg-studio-cyan" : "bg-studio-border"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${autoBackup ? "left-5" : "left-0.5"}`} />
                  </button>
                </div>
              </div>

              {/* Clear data */}
              <div className="p-4 rounded-xl bg-studio-surface border border-red-500/20 mb-4">
                <div className="text-[12px] font-semibold text-red-400 mb-2">{"\u26A0\uFE0F"} Danger Zone</div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-studio-text">Clear Command History</div>
                      <div className="text-[9px] text-studio-muted">Remove all Commander command history and scripts</div>
                    </div>
                    <button
                      onClick={() => { try { localStorage.removeItem("cryptartist_commander_scripts"); } catch { /* ignore */ } toast.success("Commander data cleared"); }}
                      className="btn text-[9px] px-3 py-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >Clear</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-studio-text">Clear Favorites & Launch Counts</div>
                      <div className="text-[9px] text-studio-muted">Reset program favorites and launch statistics</div>
                    </div>
                    <button
                      onClick={() => { try { localStorage.removeItem("cryptartist_favorites"); localStorage.removeItem("cryptartist_launch_counts"); } catch { /* ignore */ } toast.success("Launcher data cleared"); }}
                      className="btn text-[9px] px-3 py-1 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >Clear</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-studio-text">Reset All Settings</div>
                      <div className="text-[9px] text-studio-muted">Remove ALL CryptArtist data from localStorage (does not affect API keys)</div>
                    </div>
                    {!showResetConfirm ? (
                      <button onClick={() => setShowResetConfirm(true)} className="btn text-[9px] px-3 py-1 border-red-500/30 text-red-400 hover:bg-red-500/10">Reset All</button>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const keys: string[] = [];
                            try {
                              for (let i = 0; i < localStorage.length; i++) {
                                const k = localStorage.key(i);
                                if (k?.startsWith("cryptartist")) keys.push(k);
                              }
                              keys.forEach((k) => localStorage.removeItem(k));
                            } catch { /* ignore storage errors */ }
                            toast.success(`Cleared ${keys.length} items`);
                            setShowResetConfirm(false);
                          }}
                          className="btn text-[9px] px-3 py-1 bg-red-500/20 border-red-500/30 text-red-400"
                        >Confirm</button>
                        <button onClick={() => setShowResetConfirm(false)} className="btn text-[9px] px-3 py-1">Cancel</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* About Section */}
          {activeSection === "about" && (
            <div className="max-w-2xl">
              <h2 className="text-lg font-bold mb-1">{"\u{2139}\uFE0F"} About CryptArtist Studio</h2>
              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mt-4">
                <div className="flex flex-col gap-3 text-[11px]">
                  <div><span className="text-studio-muted">Version:</span> <span className="text-studio-text">0.1.0</span></div>
                  <div><span className="text-studio-muted">Author:</span> <span className="text-studio-text">Matt</span></div>
                  <div><span className="text-studio-muted">Website:</span> <a href="https://mattyjacks.com" target="_blank" rel="noreferrer" className="text-studio-cyan hover:underline">mattyjacks.com</a></div>
                  <div><span className="text-studio-muted">Donate:</span> <a href="https://givegigs.com" target="_blank" rel="noreferrer" className="text-studio-cyan hover:underline">givegigs.com</a></div>
                  <div><span className="text-studio-muted">Contact:</span> <a href="mailto:Matt@MattyJacks.com" className="text-studio-cyan hover:underline">Matt@MattyJacks.com</a></div>
                  <div><span className="text-studio-muted">GitHub:</span> <a href="https://github.com/mattyjacks/CryptArtistStudio" target="_blank" rel="noreferrer" className="text-studio-cyan hover:underline">github.com/mattyjacks/CryptArtistStudio</a></div>
                  <div><span className="text-studio-muted">Location:</span> <span className="text-studio-text">New Hampshire, USA</span></div>
                </div>
                <div className="mt-4 text-[10px] text-studio-muted">
                  CryptArtist Studio is free and open source. Support development at{" "}
                  <a href="https://mattyjacks.com" target="_blank" rel="noreferrer" className="text-studio-cyan hover:underline">mattyjacks.com</a>{" "}
                  and <a href="https://givegigs.com" target="_blank" rel="noreferrer" className="text-studio-cyan hover:underline">givegigs.com</a>.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-studio-surface border border-studio-border mt-4">
                <div className="text-[12px] font-semibold text-studio-text mb-2">Programs</div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 rounded bg-studio-bg border border-studio-border">{"\u{1F4FA}"} Media Mogul - Video/Image Editor</div>
                  <div className="p-2 rounded bg-studio-bg border border-studio-border">{"\u{1F469}\u{1F3FB}\u200D\u{1F4BB}"} VibeCodeWorker - AI Code IDE</div>
                  <div className="p-2 rounded bg-studio-bg border border-studio-border">{"\u{1F3A5}"} DemoRecorder - Screen Recorder</div>
                  <div className="p-2 rounded bg-studio-bg border border-studio-border">{"\u{1F471}\u{1F3FB}\u200D\u2640\uFE0F"} ValleyNet - AI Agent</div>
                  <div className="p-2 rounded bg-studio-bg border border-studio-border">{"\u{1F3AE}"} GameStudio - Game Dev</div>
                  <div className="p-2 rounded bg-studio-bg border border-studio-border">{"\u{1F431}"} CryptArt Commander - API/CLI</div>
                  <div className="p-2 rounded bg-studio-bg border border-studio-border">{"\u2699\uFE0F"} Settings - Configuration</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Status Bar */}
      <footer className="status-bar" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span>{"\u2699\uFE0F"} Settings v0.1.0</span>
          <span>|</span>
          <span>{API_KEYS.filter((k) => keyValues[k.id]).length}/{API_KEYS.length} keys configured</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Default OR model: {orDefaultModel.split("/").pop()}</span>
          <span>|</span>
          <span>Mode: {orDefaultMode}</span>
          <span>|</span>
          <span>{exportCount} exports</span>
          <span>|</span>
          <span>Accent: {accentColor}</span>
        </div>
      </footer>
    </div>
  );
}
