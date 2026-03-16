import { SystemMetrics } from "../utils/systemMonitor";

interface MasterDashboardProps {
  metrics: SystemMetrics;
}

export default function MasterDashboard({ metrics }: MasterDashboardProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      {/* CPU Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-xl p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-studio-text">CPU Usage</h2>
              <p className="text-sm text-studio-secondary">{metrics.cpu.cores} cores @ {metrics.cpu.frequency.toFixed(2)} GHz</p>
            </div>
            <div className="text-4xl font-bold text-blue-400">{metrics.cpu.usage.toFixed(1)}%</div>
          </div>
          <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300"
              style={{ width: `${metrics.cpu.usage}%` }}
            />
          </div>
          {metrics.cpu.temperature && (
            <div className="mt-3 text-sm text-studio-secondary">
              Temperature: <span className="text-blue-400 font-semibold">{metrics.cpu.temperature.toFixed(1)}°C</span>
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-studio-secondary uppercase tracking-wider mb-4">System Info</h3>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-studio-muted">Uptime</div>
              <div className="text-lg font-semibold text-purple-400">{formatUptime(metrics.uptime)}</div>
            </div>
            <div>
              <div className="text-xs text-studio-muted">Timestamp</div>
              <div className="text-sm text-studio-secondary">{new Date(metrics.timestamp).toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Section */}
      <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-studio-text">Memory</h2>
            <p className="text-sm text-studio-secondary">
              {formatBytes(metrics.memory.used * 1024 * 1024 * 1024)} / {formatBytes(metrics.memory.total * 1024 * 1024 * 1024)}
            </p>
          </div>
          <div className="text-4xl font-bold text-green-400">{metrics.memory.usage.toFixed(1)}%</div>
        </div>
        <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-300"
            style={{ width: `${metrics.memory.usage}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-studio-secondary mb-1">Used</div>
            <div className="text-lg font-semibold text-green-400">{metrics.memory.used.toFixed(2)} GB</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-studio-secondary mb-1">Available</div>
            <div className="text-lg font-semibold text-green-400">{metrics.memory.available.toFixed(2)} GB</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-studio-secondary mb-1">Total</div>
            <div className="text-lg font-semibold text-green-400">{metrics.memory.total.toFixed(2)} GB</div>
          </div>
        </div>
      </div>

      {/* Disk Section */}
      <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-500/30 rounded-xl p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-studio-text">Disk Storage</h2>
            <p className="text-sm text-studio-secondary">
              {formatBytes(metrics.disk.used * 1024 * 1024 * 1024)} / {formatBytes(metrics.disk.total * 1024 * 1024 * 1024)}
            </p>
          </div>
          <div className="text-4xl font-bold text-orange-400">{metrics.disk.usage.toFixed(1)}%</div>
        </div>
        <div className="w-full bg-black/40 rounded-full h-3 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-300"
            style={{ width: `${metrics.disk.usage}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-studio-secondary mb-1">Used</div>
            <div className="text-lg font-semibold text-orange-400">{metrics.disk.used.toFixed(2)} GB</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-studio-secondary mb-1">Available</div>
            <div className="text-lg font-semibold text-orange-400">{metrics.disk.available.toFixed(2)} GB</div>
          </div>
          <div className="bg-black/30 rounded-lg p-3">
            <div className="text-xs text-studio-secondary mb-1">Total</div>
            <div className="text-lg font-semibold text-orange-400">{metrics.disk.total.toFixed(2)} GB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
