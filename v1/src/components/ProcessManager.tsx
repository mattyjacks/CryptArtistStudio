import { useState, useMemo } from "react";
import { ProcessInfo } from "../utils/systemMonitor";

interface ProcessManagerProps {
  processes: ProcessInfo[];
  onKill: (pid: number) => void;
  onSuspend: (pid: number) => void;
  onResume: (pid: number) => void;
}

type SortBy = "name" | "cpu" | "memory" | "pid";

export default function ProcessManager({
  processes,
  onKill,
  onSuspend,
  onResume,
}: ProcessManagerProps) {
  const [sortBy, setSortBy] = useState<SortBy>("cpu");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPid, setSelectedPid] = useState<number | null>(null);

  const filteredAndSorted = useMemo(() => {
    let filtered = processes.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pid.toString().includes(searchQuery)
    );

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "cpu":
          return b.cpu - a.cpu;
        case "memory":
          return b.memory - a.memory;
        case "pid":
          return a.pid - b.pid;
        default:
          return 0;
      }
    });
  }, [processes, sortBy, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-green-400";
      case "sleeping":
        return "text-blue-400";
      case "stopped":
        return "text-yellow-400";
      case "zombie":
        return "text-red-400";
      default:
        return "text-studio-secondary";
    }
  };

  return (
    <div className="p-6 overflow-hidden h-full flex flex-col">
      {/* Search and Sort */}
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search processes..."
          className="input flex-1 text-sm"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="bg-studio-panel text-sm text-studio-text border border-studio-border rounded px-3 py-2 outline-none"
        >
          <option value="cpu">Sort by CPU</option>
          <option value="memory">Sort by Memory</option>
          <option value="name">Sort by Name</option>
          <option value="pid">Sort by PID</option>
        </select>
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {filteredAndSorted.map((process) => (
            <div
              key={process.pid}
              onClick={() => setSelectedPid(selectedPid === process.pid ? null : process.pid)}
              className={`bg-black/30 border border-studio-border/30 rounded-lg p-4 cursor-pointer transition-all hover:border-studio-border/60 ${
                selectedPid === process.pid ? "border-studio-cyan/60 bg-studio-cyan/10" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-studio-text">{process.name}</h3>
                  <div className="text-xs text-studio-secondary mt-1">
                    PID: {process.pid} • {process.threads} threads • User: {process.user}
                  </div>
                </div>
                <div className={`text-sm font-semibold ${getStatusColor(process.status)}`}>
                  {process.status.toUpperCase()}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="bg-black/50 rounded p-2">
                  <div className="text-xs text-studio-secondary">CPU</div>
                  <div className="text-sm font-bold text-blue-400">{process.cpu.toFixed(1)}%</div>
                </div>
                <div className="bg-black/50 rounded p-2">
                  <div className="text-xs text-studio-secondary">Memory</div>
                  <div className="text-sm font-bold text-green-400">{process.memory.toFixed(1)} MB</div>
                </div>
                <div className="bg-black/50 rounded p-2">
                  <div className="text-xs text-studio-secondary">Mem %</div>
                  <div className="text-sm font-bold text-green-400">{process.memoryPercent.toFixed(1)}%</div>
                </div>
                <div className="bg-black/50 rounded p-2">
                  <div className="text-xs text-studio-secondary">Priority</div>
                  <div className="text-sm font-bold text-orange-400">{process.priority}</div>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-2 mb-3">
                <div>
                  <div className="text-xs text-studio-secondary mb-1">CPU Usage</div>
                  <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                      style={{ width: `${Math.min(process.cpu, 100)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-xs text-studio-secondary mb-1">Memory Usage</div>
                  <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400"
                      style={{ width: `${Math.min(process.memoryPercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              {selectedPid === process.pid && (
                <div className="flex gap-2 pt-3 border-t border-studio-border/30">
                  {process.status === "running" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSuspend(process.pid);
                      }}
                      className="btn text-xs px-3 py-1 bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50"
                    >
                      ⏸ Suspend
                    </button>
                  )}
                  {process.status === "sleeping" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResume(process.pid);
                      }}
                      className="btn text-xs px-3 py-1 bg-green-900/30 text-green-400 hover:bg-green-900/50"
                    >
                      ▶ Resume
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onKill(process.pid);
                    }}
                    className="btn text-xs px-3 py-1 bg-red-900/30 text-red-400 hover:bg-red-900/50 ml-auto"
                  >
                    ✕ Kill
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-studio-border/30 text-xs text-studio-secondary">
        Showing {filteredAndSorted.length} of {processes.length} processes
      </div>
    </div>
  );
}
