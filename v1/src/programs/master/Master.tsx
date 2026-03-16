import { useState, useEffect, useRef } from "react";
import { systemMonitor, SystemMetrics, ProcessInfo } from "../../utils/systemMonitor";
import { toast } from "../../utils/toast";
import MasterDashboard from "../../components/MasterDashboard";
import ProcessManager from "../../components/ProcessManager";
import PerformanceGraphs from "../../components/PerformanceGraphs";

type MasterTab = "dashboard" | "processes" | "performance" | "network";

export default function Master() {
  const [activeTab, setActiveTab] = useState<MasterTab>("dashboard");
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const metricsHistoryRef = useRef<SystemMetrics[]>([]);

  // Initialize system monitor
  useEffect(() => {
    systemMonitor
      .initialize()
      .then(async () => {
        setLoading(false);
        const initialMetrics = systemMonitor.getMetrics();
        if (initialMetrics) {
          setMetrics(initialMetrics);
          metricsHistoryRef.current = [initialMetrics];
        }
        await loadProcesses();
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });

    // Subscribe to metrics updates
    const unsubscribe = systemMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
      metricsHistoryRef.current.push(newMetrics);
      // Keep only last 60 seconds of data
      if (metricsHistoryRef.current.length > 60) {
        metricsHistoryRef.current.shift();
      }
    });

    return () => {
      unsubscribe();
      systemMonitor.stopAutoUpdate();
    };
  }, []);

  // Load processes periodically
  useEffect(() => {
    const interval = setInterval(loadProcesses, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadProcesses = async () => {
    try {
      const procs = await systemMonitor.getProcesses();
      setProcesses(procs);
    } catch (err) {
      console.error("Failed to load processes:", err);
    }
  };

  const handleKillProcess = async (pid: number) => {
    try {
      await systemMonitor.killProcess(pid);
      toast.success("Process terminated");
      await loadProcesses();
    } catch (err) {
      toast.error(`Failed to kill process: ${err}`);
    }
  };

  const handleSuspendProcess = async (pid: number) => {
    try {
      await systemMonitor.suspendProcess(pid);
      toast.info("Process suspended");
      await loadProcesses();
    } catch (err) {
      toast.error(`Failed to suspend process: ${err}`);
    }
  };

  const handleResumeProcess = async (pid: number) => {
    try {
      await systemMonitor.resumeProcess(pid);
      toast.info("Process resumed");
      await loadProcesses();
    } catch (err) {
      toast.error(`Failed to resume process: ${err}`);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">👨🏼‍🦳</div>
          <p className="text-studio-text text-xl font-semibold">Master</p>
          <p className="text-studio-secondary text-sm mt-2">Initializing system monitor...</p>
          <div className="mt-6 flex justify-center gap-2">
            <div className="w-2 h-2 bg-studio-cyan rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-studio-cyan rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-studio-cyan rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-studio-red text-xl font-semibold">Error</p>
          <p className="text-studio-secondary text-sm mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-black/40 backdrop-blur-md border-b border-studio-border/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-4xl">👨🏼‍🦳</div>
            <div>
              <h1 className="text-2xl font-bold text-studio-text">Master</h1>
              <p className="text-xs text-studio-secondary">Advanced System Monitor & Task Manager</p>
            </div>
          </div>
          {metrics && (
            <div className="flex gap-6 text-sm">
              <div className="text-center">
                <div className="text-studio-cyan font-bold text-lg">{metrics.cpu.usage.toFixed(1)}%</div>
                <div className="text-studio-secondary text-xs">CPU</div>
              </div>
              <div className="text-center">
                <div className="text-studio-cyan font-bold text-lg">{metrics.memory.usage.toFixed(1)}%</div>
                <div className="text-studio-secondary text-xs">Memory</div>
              </div>
              <div className="text-center">
                <div className="text-studio-cyan font-bold text-lg">{metrics.disk.usage.toFixed(1)}%</div>
                <div className="text-studio-secondary text-xs">Disk</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex-shrink-0 bg-black/20 border-b border-studio-border/30 px-6">
        <div className="flex gap-1">
          {(["dashboard", "processes", "performance", "network"] as MasterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                activeTab === tab
                  ? "border-studio-cyan text-studio-cyan"
                  : "border-transparent text-studio-secondary hover:text-studio-text"
              }`}
            >
              {tab === "dashboard" && "📊 Dashboard"}
              {tab === "processes" && "⚙️ Processes"}
              {tab === "performance" && "📈 Performance"}
              {tab === "network" && "🌐 Network"}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "dashboard" && metrics && <MasterDashboard metrics={metrics} />}
        {activeTab === "processes" && (
          <ProcessManager
            processes={processes}
            onKill={handleKillProcess}
            onSuspend={handleSuspendProcess}
            onResume={handleResumeProcess}
          />
        )}
        {activeTab === "performance" && <PerformanceGraphs history={metricsHistoryRef.current} />}
        {activeTab === "network" && metrics && (
          <div className="p-6 overflow-y-auto h-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/30 border border-studio-border/30 rounded-lg p-4">
                <div className="text-studio-secondary text-xs uppercase tracking-wider mb-2">Bytes In</div>
                <div className="text-3xl font-bold text-studio-cyan">
                  {(metrics.network.bytesIn / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <div className="bg-black/30 border border-studio-border/30 rounded-lg p-4">
                <div className="text-studio-secondary text-xs uppercase tracking-wider mb-2">Bytes Out</div>
                <div className="text-3xl font-bold text-studio-cyan">
                  {(metrics.network.bytesOut / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
              <div className="bg-black/30 border border-studio-border/30 rounded-lg p-4">
                <div className="text-studio-secondary text-xs uppercase tracking-wider mb-2">Packets In</div>
                <div className="text-3xl font-bold text-studio-green">
                  {metrics.network.packetsIn.toLocaleString()}
                </div>
              </div>
              <div className="bg-black/30 border border-studio-border/30 rounded-lg p-4">
                <div className="text-studio-secondary text-xs uppercase tracking-wider mb-2">Packets Out</div>
                <div className="text-3xl font-bold text-studio-green">
                  {metrics.network.packetsOut.toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
