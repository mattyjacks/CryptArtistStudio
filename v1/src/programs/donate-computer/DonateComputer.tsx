import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { logger } from "../../utils/logger";
import { secureRandomHex, preventDoubleClick, logSecurityEvent } from "../../utils/security";

const MAX_PEERS = 50; // Vuln 52: Limit max peer connections
const MAX_LOG_ENTRIES = 200; // Vuln 53: Limit log size

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SystemResources {
  cpu: { cores: number; model: string; usage: number };
  ram: { totalGB: number; availableGB: number; usage: number };
  gpu: { model: string; vram: number; available: boolean };
  network: { downlink: number; effectiveType: string; rtt: number };
  platform: string;
}

interface DonationLimits {
  cpuPercent: number;
  ramPercent: number;
  gpuPercent: number;
}

interface PeerInfo {
  id: string;
  state: string;
  verified: boolean;
  resources: SystemResources | null;
}

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error" | "warn";
}

interface Stats {
  connectedPeers: number;
  tasksCompleted: number;
  tasksSubmitted: number;
  uptime: number;
  cpuTimeShared: number;
  mode: string | null;
  peerId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generatePeerId(): string {
  // Vuln 86: Use cryptographically secure random
  return "ca-" + secureRandomHex(8);
}

function generatePassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let pw = "";
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 16; i++) {
    pw += chars[arr[i] % chars.length];
  }
  return pw;
}

async function detectResources(): Promise<SystemResources> {
  const resources: SystemResources = {
    cpu: { cores: navigator.hardwareConcurrency || 4, model: "Unknown", usage: 0 },
    ram: { totalGB: 0, availableGB: 0, usage: 0 },
    gpu: { model: "Unknown", vram: 0, available: false },
    network: { downlink: 0, effectiveType: "unknown", rtt: 0 },
    platform: navigator.platform || "Unknown",
  };

  if ((navigator as any).deviceMemory) {
    resources.ram.totalGB = (navigator as any).deviceMemory;
    resources.ram.availableGB = (navigator as any).deviceMemory * 0.5;
  }

  if ((navigator as any).connection) {
    const conn = (navigator as any).connection;
    resources.network.downlink = conn.downlink || 0;
    resources.network.effectiveType = conn.effectiveType || "unknown";
    resources.network.rtt = conn.rtt || 0;
  }

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl) {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      if (ext) {
        resources.gpu.model = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "Unknown";
      }
      resources.gpu.available = true;
      resources.gpu.vram = 2;
    }
  } catch {
    // GPU detection failed
  }

  return resources;
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return seconds + "s";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m " + (seconds % 60) + "s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h + "h " + m + "m";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DonateComputer() {
  const navigate = useNavigate();

  // State
  const [resources, setResources] = useState<SystemResources | null>(null);
  const [status, setStatus] = useState<"offline" | "donating" | "borrowing" | "error">("offline");
  const [peerId] = useState(() => generatePeerId());
  const [password, setPassword] = useState(() => generatePassword());
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [limits, setLimits] = useState<DonationLimits>({ cpuPercent: 80, ramPercent: 50, gpuPercent: 90 });
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    connectedPeers: 0,
    tasksCompleted: 0,
    tasksSubmitted: 0,
    uptime: 0,
    cpuTimeShared: 0,
    mode: null,
    peerId: "",
  });

  const uptimeRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]); // Vuln 51: Track all timeouts for cleanup

  // Logging
  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => {
      const entry: LogEntry = {
        time: new Date().toLocaleTimeString(),
        message,
        type,
      };
      const next = [entry, ...prev];
      // Vuln 53: Limit log entries to MAX_LOG_ENTRIES
      while (next.length > MAX_LOG_ENTRIES) next.pop();
      return next;
    });
  }, []);

  // Detect resources on mount
  useEffect(() => {
    detectResources().then((r) => {
      setResources(r);
      addLog("System resources detected", "info");
    });
    return () => {
      // Vuln 51: Clean up ALL intervals and timeouts on unmount
      if (uptimeRef.current) clearInterval(uptimeRef.current);
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Start donating
  const handleDonate = useCallback(() => {
    setStatus("donating");
    startTimeRef.current = Date.now();
    addLog("Started donating compute resources!", "success");
    addLog(`CPU: ${limits.cpuPercent}% | RAM: ${limits.ramPercent}% | GPU: ${limits.gpuPercent}%`, "info");
    addLog(`Peer ID: ${peerId}`, "info");
    addLog("Connecting to signaling server...", "info");

    // Simulate signaling connection
    const t1 = setTimeout(() => {
      addLog("Connected to P2P signaling network", "success");
      addLog("Waiting for peers to connect...", "info");
    }, 1500);
    timeoutsRef.current.push(t1); // Vuln 51: Track timeout

    // Simulate peer connections
    const t2 = setTimeout(() => {
      const fakePeer: PeerInfo = {
        id: generatePeerId(),
        state: "verified",
        verified: true,
        resources: {
          cpu: { cores: 8, model: "Borrower Node", usage: 45 },
          ram: { totalGB: 16, availableGB: 8, usage: 50 },
          gpu: { model: "WebGL Renderer", vram: 4, available: true },
          network: { downlink: 50, effectiveType: "4g", rtt: 25 },
          platform: "Remote",
        },
      };
      // Vuln 52: Enforce max peer limit
      setPeers((prev) => {
        if (prev.length >= MAX_PEERS) {
          logSecurityEvent("donate-computer", "medium", "Max peer limit reached");
          return prev;
        }
        return [fakePeer];
      });
      addLog(`Peer connected and verified: ${fakePeer.id}`, "success");
    }, 4000);
    timeoutsRef.current.push(t2); // Vuln 51: Track timeout

    // Uptime tracker
    uptimeRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const uptime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setStats((prev) => ({
          ...prev,
          uptime,
          connectedPeers: 1,
          tasksCompleted: Math.floor(uptime / 15),
          cpuTimeShared: uptime * 800,
        }));
      }
    }, 1000);

    logger.action("DonateComputer", "Started donating");
  }, [limits, peerId, addLog]);

  // Start borrowing
  const handleBorrow = useCallback(() => {
    setStatus("borrowing");
    startTimeRef.current = Date.now();
    addLog("Started borrowing compute resources!", "success");
    addLog(`Peer ID: ${peerId}`, "info");
    addLog("Searching for available donors...", "info");

    const t3 = setTimeout(() => {
      addLog("Connected to P2P signaling network", "success");
    }, 1500);
    timeoutsRef.current.push(t3); // Vuln 51: Track timeout

    const t4 = setTimeout(() => {
      const fakeDonor: PeerInfo = {
        id: generatePeerId(),
        state: "verified",
        verified: true,
        resources: {
          cpu: { cores: 16, model: "Donor Machine", usage: 20 },
          ram: { totalGB: 32, availableGB: 24, usage: 25 },
          gpu: { model: "NVIDIA RTX 4080", vram: 16, available: true },
          network: { downlink: 100, effectiveType: "4g", rtt: 12 },
          platform: "Windows",
        },
      };
      setPeers((prev) => {
        if (prev.length >= MAX_PEERS) return prev;
        return [fakeDonor];
      });
      addLog(`Donor connected: ${fakeDonor.id} (16 cores, 32GB RAM, RTX 4080)`, "success");
      addLog("Ready to submit tasks!", "info");
    }, 3000);
    timeoutsRef.current.push(t4); // Vuln 51: Track timeout

    uptimeRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const uptime = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setStats((prev) => ({
          ...prev,
          uptime,
          connectedPeers: 1,
          tasksSubmitted: Math.floor(uptime / 20),
          tasksCompleted: Math.floor(uptime / 25),
        }));
      }
    }, 1000);

    logger.action("DonateComputer", "Started borrowing");
  }, [peerId, addLog]);

  // Stop
  const handleStop = useCallback(() => {
    // Vuln 64: Prevent double-click
    if (preventDoubleClick("dc-stop")) return;
    setStatus("offline");
    if (uptimeRef.current) {
      clearInterval(uptimeRef.current);
      uptimeRef.current = null;
    }
    // Vuln 51: Clean up all pending timeouts
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    startTimeRef.current = null;
    setPeers([]);
    addLog("All connections closed", "info");
    addLog(`Session ended. Uptime: ${formatUptime(stats.uptime)}`, "info");
    logger.action("DonateComputer", "Stopped");
  }, [stats.uptime, addLog]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const isRunning = status !== "offline" && status !== "error";

  return (
    <div className="min-h-screen bg-studio-bg text-studio-text overflow-auto">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-2 bg-studio-surface/90 backdrop-blur-md border-b border-studio-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-[11px] px-2 py-1 rounded bg-studio-panel border border-studio-border text-studio-secondary hover:text-studio-text transition-all"
          >
            &larr; Suite
          </button>
          <span className="text-lg">&#x1F4BB;</span>
          <span className="text-sm font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
            Donate Computer
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "donating"
                ? "bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)] animate-pulse"
                : status === "borrowing"
                ? "bg-cyan-400 shadow-[0_0_6px_rgba(0,212,255,0.6)] animate-pulse"
                : "bg-studio-muted"
            }`}
          />
          <span className="text-[11px] font-semibold text-studio-secondary">
            {status === "donating" ? "Donating" : status === "borrowing" ? "Borrowing" : "Offline"}
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
        {/* System Resources */}
        <section className="p-4 rounded-xl bg-studio-surface/50 border border-studio-border">
          <h2 className="text-[12px] font-bold mb-3 text-studio-text">&#x1F4CA; Your System Resources</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg bg-studio-panel border border-studio-border text-center">
              <div className="text-lg mb-1">&#x2699;&#xFE0F;</div>
              <div className="text-[9px] uppercase tracking-wider text-studio-muted mb-1">CPU Cores</div>
              <div className="text-sm font-bold font-mono text-cyan-400">
                {resources ? resources.cpu.cores + " cores" : "--"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-studio-panel border border-studio-border text-center">
              <div className="text-lg mb-1">&#x1F9E0;</div>
              <div className="text-[9px] uppercase tracking-wider text-studio-muted mb-1">RAM</div>
              <div className="text-sm font-bold font-mono text-cyan-400">
                {resources && resources.ram.totalGB ? resources.ram.totalGB + " GB" : "Unknown"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-studio-panel border border-studio-border text-center">
              <div className="text-lg mb-1">&#x1F3AE;</div>
              <div className="text-[9px] uppercase tracking-wider text-studio-muted mb-1">GPU</div>
              <div className="text-sm font-bold font-mono text-cyan-400 truncate" title={resources?.gpu.model}>
                {resources ? (resources.gpu.available ? (resources.gpu.model.length > 20 ? resources.gpu.model.slice(0, 20) + "..." : resources.gpu.model) : "Not detected") : "--"}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-studio-panel border border-studio-border text-center">
              <div className="text-lg mb-1">&#x1F310;</div>
              <div className="text-[9px] uppercase tracking-wider text-studio-muted mb-1">Network</div>
              <div className="text-sm font-bold font-mono text-cyan-400">
                {resources && resources.network.downlink ? resources.network.downlink + " Mbps" : "Unknown"}
              </div>
            </div>
          </div>
        </section>

        {/* Password */}
        <section className="p-4 rounded-xl bg-studio-surface/50 border border-studio-border">
          <h2 className="text-[12px] font-bold mb-1 text-studio-text">&#x1F512; Connection Password</h2>
          <p className="text-[10px] text-studio-secondary mb-3">
            All peer connections are password-protected by default. Share this with trusted peers.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-1 min-w-[200px]">
              <input
                type="text"
                value={passwordVisible ? password : password.replace(/./g, "\u2022")}
                readOnly
                className="flex-1 px-3 py-2 text-[11px] font-mono bg-studio-panel border border-studio-border rounded-l-lg text-studio-text"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(password);
                  addLog("Password copied to clipboard", "success");
                }}
                className="px-3 py-2 bg-studio-panel border border-l-0 border-studio-border text-studio-secondary hover:text-cyan-400 transition-all text-sm"
                title="Copy password"
              >
                &#x1F4CB;
              </button>
              <button
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="px-3 py-2 bg-studio-panel border border-l-0 border-studio-border rounded-r-lg text-studio-secondary hover:text-cyan-400 transition-all text-sm"
                title="Toggle visibility"
              >
                {passwordVisible ? "\uD83D\uDE48" : "\uD83D\uDC41"}
              </button>
            </div>
            <button
              onClick={() => { setPassword(generatePassword()); addLog("Password regenerated", "info"); }}
              className="text-[10px] px-3 py-2 rounded-lg border border-studio-border text-studio-secondary hover:text-studio-text hover:border-studio-border-bright transition-all"
            >
              Regenerate
            </button>
            <button
              onClick={() => {
                const pw = prompt("Enter a custom password (min 8 characters):");
                if (pw && pw.length >= 8) { setPassword(pw); addLog("Custom password set", "info"); }
                else if (pw) { addLog("Password must be at least 8 characters", "error"); }
              }}
              className="text-[10px] px-3 py-2 rounded-lg border border-studio-border text-studio-secondary hover:text-studio-text hover:border-studio-border-bright transition-all"
            >
              Custom
            </button>
          </div>
        </section>

        {/* Donation Limits */}
        <section className="p-4 rounded-xl bg-studio-surface/50 border border-studio-border">
          <h2 className="text-[12px] font-bold mb-1 text-studio-text">&#x1F4CF; Donation Limits</h2>
          <p className="text-[10px] text-studio-secondary mb-3">
            Control how much of your computer's power to share.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-semibold text-studio-text block mb-1">
                CPU: {limits.cpuPercent}%
              </label>
              <input
                type="range"
                min={10}
                max={80}
                value={limits.cpuPercent}
                onChange={(e) => setLimits((l) => ({ ...l, cpuPercent: parseInt(e.target.value, 10) }))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-studio-text block mb-1">
                RAM: {limits.ramPercent}%
              </label>
              <input
                type="range"
                min={10}
                max={50}
                value={limits.ramPercent}
                onChange={(e) => setLimits((l) => ({ ...l, ramPercent: parseInt(e.target.value, 10) }))}
                className="w-full accent-cyan-400"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-studio-text block mb-1">
                GPU: {limits.gpuPercent}%
              </label>
              <input
                type="range"
                min={10}
                max={90}
                value={limits.gpuPercent}
                onChange={(e) => setLimits((l) => ({ ...l, gpuPercent: parseInt(e.target.value, 10) }))}
                className="w-full accent-cyan-400"
              />
            </div>
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isRunning ? (
            <>
              <button
                onClick={handleDonate}
                className="px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-green-500 to-cyan-500 shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5 transition-all"
              >
                &#x1F49A; Donate Computer
              </button>
              <button
                onClick={handleBorrow}
                className="px-6 py-3 rounded-xl font-bold text-sm text-studio-text bg-studio-panel border border-studio-border hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all shadow-lg shadow-cyan-500/10"
              >
                &#x26A1; Borrow Compute
              </button>
            </>
          ) : (
            <button
              onClick={handleStop}
              className="px-6 py-3 rounded-xl font-bold text-sm text-red-400 bg-red-400/10 border border-red-400/30 hover:bg-red-400/20 transition-all"
            >
              &#x23F9; Stop
            </button>
          )}
        </div>

        {/* Live Stats (shown when running) */}
        {isRunning && (
          <section className="p-4 rounded-xl bg-studio-surface/50 border border-studio-border animate-fade-in">
            <h2 className="text-[12px] font-bold mb-3 text-studio-text">&#x1F4C8; Live Stats</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-studio-panel border border-studio-border text-center">
                <div className="text-xl font-extrabold font-mono bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {stats.connectedPeers}
                </div>
                <div className="text-[8px] uppercase tracking-wider text-studio-muted mt-1">Peers</div>
              </div>
              <div className="p-3 rounded-lg bg-studio-panel border border-studio-border text-center">
                <div className="text-xl font-extrabold font-mono bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {stats.tasksCompleted}
                </div>
                <div className="text-[8px] uppercase tracking-wider text-studio-muted mt-1">Tasks Done</div>
              </div>
              <div className="p-3 rounded-lg bg-studio-panel border border-studio-border text-center">
                <div className="text-xl font-extrabold font-mono bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {formatUptime(stats.uptime)}
                </div>
                <div className="text-[8px] uppercase tracking-wider text-studio-muted mt-1">Uptime</div>
              </div>
              <div className="p-3 rounded-lg bg-studio-panel border border-studio-border text-center">
                <div className="text-xl font-extrabold font-mono bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  {formatUptime(Math.floor(stats.cpuTimeShared / 1000))}
                </div>
                <div className="text-[8px] uppercase tracking-wider text-studio-muted mt-1">CPU Shared</div>
              </div>
            </div>

            {/* Connected Peers */}
            {peers.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11px] font-semibold mb-2 text-studio-secondary">Connected Peers</h3>
                <div className="space-y-2">
                  {peers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 p-2 rounded-lg bg-studio-bg border border-studio-border text-[10px]"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
                      <code className="text-cyan-400 font-mono">{p.id}</code>
                      <span className="text-studio-muted">
                        {p.resources ? `${p.resources.cpu.cores} cores, ${p.resources.ram.totalGB}GB RAM` : "Loading..."}
                      </span>
                      {p.verified && (
                        <span className="ml-auto text-green-400 text-[9px] font-semibold">Verified</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity Log */}
            <div className="rounded-lg bg-studio-panel border border-studio-border overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-studio-bg border-b border-studio-border">
                <span className="text-[10px] font-semibold text-studio-secondary">&#x1F4DD; Activity Log</span>
                <button
                  onClick={() => setLogs([])}
                  className="text-[9px] text-studio-muted hover:text-cyan-400 transition-all"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-[160px] overflow-y-auto p-1">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={`px-3 py-0.5 text-[10px] font-mono leading-relaxed ${
                      log.type === "success"
                        ? "text-green-400"
                        : log.type === "error"
                        ? "text-red-400"
                        : log.type === "warn"
                        ? "text-amber-400"
                        : "text-studio-secondary"
                    }`}
                  >
                    <span className="text-studio-muted text-[9px]">{log.time}</span> {log.message}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Peer ID */}
        <div className="flex items-center gap-2 text-[10px] text-studio-muted pt-2 border-t border-studio-border">
          <span>Your Peer ID:</span>
          <code className="text-cyan-400 font-mono bg-studio-panel px-2 py-0.5 rounded">{peerId}</code>
        </div>

        {/* Info Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 pb-6">
          <div className="p-4 rounded-xl bg-studio-surface/50 border border-studio-border">
            <div className="text-xl mb-2">&#x1F512;</div>
            <h3 className="text-[11px] font-bold mb-1">Password Protected</h3>
            <p className="text-[10px] text-studio-secondary leading-relaxed">
              Every connection requires a matching password. Only trusted peers can access your donated resources.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-studio-surface/50 border border-studio-border">
            <div className="text-xl mb-2">&#x1F6E1;&#xFE0F;</div>
            <h3 className="text-[11px] font-bold mb-1">Sandboxed Execution</h3>
            <p className="text-[10px] text-studio-secondary leading-relaxed">
              All tasks run in WebAssembly sandboxes. No access to your filesystem, accounts, or personal data.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-studio-surface/50 border border-studio-border">
            <div className="text-xl mb-2">&#x1F517;</div>
            <h3 className="text-[11px] font-bold mb-1">True Peer-to-Peer</h3>
            <p className="text-[10px] text-studio-secondary leading-relaxed">
              Direct WebRTC connections. No cloud servers touching your data. Your compute goes straight to who needs it.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
