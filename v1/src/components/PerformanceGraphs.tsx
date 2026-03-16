import { SystemMetrics } from "../utils/systemMonitor";

interface PerformanceGraphsProps {
  history: SystemMetrics[];
}

export default function PerformanceGraphs({ history }: PerformanceGraphsProps) {
  const renderGraph = (data: number[], color: string, label: string) => {
    if (data.length === 0) return null;

    const max = Math.max(...data, 100);
    const width = 100 / Math.max(data.length, 1);
    const points = data.map((value, i) => {
      const height = (value / max) * 100;
      return (
        <div
          key={i}
          className={`flex-1 ${color} rounded-t-sm transition-all duration-200`}
          style={{
            height: `${height}%`,
            minHeight: "2px",
            opacity: 0.7 + (i / data.length) * 0.3,
          }}
          title={`${value.toFixed(1)}%`}
        />
      );
    });

    return (
      <div className="bg-black/30 border border-studio-border/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-studio-text mb-3">{label}</h3>
        <div className="flex items-end gap-1 h-32 bg-black/50 rounded p-2">
          {points}
        </div>
        <div className="mt-2 text-xs text-studio-secondary">
          Current: <span className="font-semibold">{data[data.length - 1]?.toFixed(1) || 0}%</span>
          {" | "}
          Avg: <span className="font-semibold">{(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)}%</span>
          {" | "}
          Max: <span className="font-semibold">{Math.max(...data).toFixed(1)}%</span>
        </div>
      </div>
    );
  };

  const cpuData = history.map(m => m.cpu.usage);
  const memoryData = history.map(m => m.memory.usage);
  const diskData = history.map(m => m.disk.usage);

  return (
    <div className="p-6 overflow-y-auto h-full space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {renderGraph(cpuData, "bg-blue-500", "CPU Usage (Last 60s)")}
        {renderGraph(memoryData, "bg-green-500", "Memory Usage (Last 60s)")}
        {renderGraph(diskData, "bg-orange-500", "Disk Usage (Last 60s)")}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-studio-secondary uppercase tracking-wider mb-4">CPU Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-studio-secondary">Current</span>
              <span className="text-blue-400 font-semibold">{cpuData[cpuData.length - 1]?.toFixed(1) || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Average</span>
              <span className="text-blue-400 font-semibold">
                {(cpuData.reduce((a, b) => a + b, 0) / cpuData.length).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Peak</span>
              <span className="text-blue-400 font-semibold">{Math.max(...cpuData).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Low</span>
              <span className="text-blue-400 font-semibold">{Math.min(...cpuData).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-studio-secondary uppercase tracking-wider mb-4">Memory Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-studio-secondary">Current</span>
              <span className="text-green-400 font-semibold">{memoryData[memoryData.length - 1]?.toFixed(1) || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Average</span>
              <span className="text-green-400 font-semibold">
                {(memoryData.reduce((a, b) => a + b, 0) / memoryData.length).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Peak</span>
              <span className="text-green-400 font-semibold">{Math.max(...memoryData).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Low</span>
              <span className="text-green-400 font-semibold">{Math.min(...memoryData).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 border border-orange-500/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-studio-secondary uppercase tracking-wider mb-4">Disk Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-studio-secondary">Current</span>
              <span className="text-orange-400 font-semibold">{diskData[diskData.length - 1]?.toFixed(1) || 0}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Average</span>
              <span className="text-orange-400 font-semibold">
                {(diskData.reduce((a, b) => a + b, 0) / diskData.length).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Peak</span>
              <span className="text-orange-400 font-semibold">{Math.max(...diskData).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-studio-secondary">Low</span>
              <span className="text-orange-400 font-semibold">{Math.min(...diskData).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
