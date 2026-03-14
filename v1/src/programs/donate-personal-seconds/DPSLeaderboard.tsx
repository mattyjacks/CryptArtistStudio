/* Wave2: type=button applied */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { secureRandomHex } from "../../utils/security";

// Flawed initial tracking system placeholder
interface LeaderboardEntry {
  id: string;
  name: string;
  seconds: number;
  cpu: string;
  gpu: string;
}

export default function DPSLeaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    // Generate some fake initial data for the flawed tracking system
    const fakeData: LeaderboardEntry[] = [
      { id: secureRandomHex(6), name: "MattJ", seconds: 1482020, cpu: "AMD Ryzen 9 7950X", gpu: "RTX 4090" },
      { id: secureRandomHex(6), name: "VibeCoder99", seconds: 820104, cpu: "Intel i9-14900K", gpu: "RTX 4080" },
      { id: secureRandomHex(6), name: "AnonNode_x7", seconds: 530400, cpu: "Apple M3 Max", gpu: "M3 Max 40-core" },
      { id: secureRandomHex(6), name: "CryptoPunk", seconds: 310200, cpu: "AMD Ryzen 7 7800X3D", gpu: "RX 7900 XTX" },
      { id: secureRandomHex(6), name: "GigaChadRender", seconds: 125000, cpu: "Intel i7-13700K", gpu: "RTX 3090" },
      { id: secureRandomHex(6), name: "Anonymous", seconds: 48000, cpu: "Unknown", gpu: "Unknown" },
    ];
    setEntries(fakeData);
  }, []);

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hrs = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hrs}h`;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="flex flex-col h-screen bg-studio-bg text-studio-text">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-studio-panel border-b border-studio-border shrink-0">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/")} className="btn-ghost text-studio-muted hover:text-studio-text text-sm">{"\u2190"} Launcher</button>
          <span className="text-lg">{"\u{1F3C6}"}</span>
          <span className="text-sm font-bold bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            Global Compute Leaderboard
          </span>
        </div>
        <button type="button" onClick={() => navigate("/donate-personal-seconds")} className="btn btn-cyan text-[10px] px-3 py-1">
          {"\u{1F5E1}\uFE0F"} Donate Now
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10 animate-slide-up">
            <h1 className="text-4xl font-extrabold mb-3 bg-gradient-to-r from-orange-400 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
              Top Donors
            </h1>
            <p className="text-studio-secondary text-sm max-w-xl mx-auto">
              This leaderboard tracks the total personal seconds donated by peers around the world to the CryptArtist Studio distributed compute network.
            </p>
            <p className="text-[10px] text-studio-muted mt-2 italic">
              Note: The current tracking system relies on self-reported uptime and is highly experimental.
            </p>
          </div>

          <div className="bg-studio-surface border border-studio-border rounded-xl overflow-hidden shadow-2xl animate-fade-in stagger-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-studio-panel border-b border-studio-border text-[11px] uppercase tracking-wider text-studio-muted">
                  <th className="px-4 py-3 w-16 text-center">Rank</th>
                  <th className="px-4 py-3">Peer Name</th>
                  <th className="px-4 py-3">Total Time Donated</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Hardware (CPU / GPU)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr key={entry.id} className="border-b border-studio-border/50 hover:bg-studio-panel/50 transition-colors">
                    <td className="px-4 py-4 text-center">
                      {idx === 0 ? <span className="text-2xl" title="1st Place">🥇</span> : 
                       idx === 1 ? <span className="text-2xl" title="2nd Place">🥈</span> : 
                       idx === 2 ? <span className="text-2xl" title="3rd Place">🥉</span> : 
                       <span className="text-studio-secondary font-mono text-sm">#{idx + 1}</span>}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-sm text-studio-text flex items-center gap-2">
                        {entry.name}
                        {idx === 0 && <span className="badge badge-cyan text-[8px]">Network Leader</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-mono text-orange-400 font-bold">
                        {formatTime(entry.seconds)}
                      </div>
                      <div className="text-[9px] text-studio-muted">{entry.seconds.toLocaleString()} seconds</div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="text-[11px] text-studio-secondary truncate max-w-[200px]" title={entry.cpu}>{entry.cpu}</div>
                      <div className="text-[11px] text-studio-muted truncate max-w-[200px]" title={entry.gpu}>{entry.gpu}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
