import { useState, useEffect, useRef } from "react";
import { toast } from "../utils/toast";
import TerminalExecutor from "../utils/terminalExecutor";
import { AISafetyLevel } from "../utils/terminalSafety";

interface TerminalCommandPanelProps {
  projectPath: string | null;
  onCommandExecuted?: (result: any) => void;
}

export default function TerminalCommandPanel({
  projectPath,
  onCommandExecuted,
}: TerminalCommandPanelProps) {
  const [executor, setExecutor] = useState<TerminalExecutor | null>(null);
  const [command, setCommand] = useState("");
  const [safetyLevel, setSafetyLevel] = useState<AISafetyLevel>("balanced");
  const [executing, setExecuting] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showMemory, setShowMemory] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [allowList, setAllowList] = useState<string[]>([]);
  const [denyList, setDenyList] = useState<string[]>([]);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [memorySummary, setMemorySummary] = useState<any>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Initialize executor
  useEffect(() => {
    const exec = new TerminalExecutor({
      safetyLevel,
      enableMemory: true,
      enableSystemPrompt: true,
      approvalCallback: async (cmd, reason) => {
        return confirm(`Approve command?\n\n${cmd}\n\nReason: ${reason}`);
      },
    });

    exec.initialize().then(() => {
      setExecutor(exec);
      setSystemPrompt(exec.getSystemPrompt());
      setAllowList(exec.getValidatorConfig().allowList);
      setDenyList(exec.getValidatorConfig().denyList);
      setMemorySummary(exec.getMemorySummary());
    });

    return () => {
      exec.cleanup();
    };
  }, []);

  // Update executor safety level
  useEffect(() => {
    if (executor) {
      executor.setSafetyLevel(safetyLevel);
    }
  }, [safetyLevel, executor]);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleExecuteCommand = async () => {
    if (!command.trim() || !executor) {
      toast.error("Enter a command");
      return;
    }

    setExecuting(true);
    const result = await executor.executeCommand({
      command,
      cwd: projectPath || undefined,
    });

    setOutput((prev) => [
      ...prev,
      `$ ${command}`,
      result.success ? result.output : `Error: ${result.error}`,
      `Duration: ${result.duration}ms`,
      "",
    ]);

    if (result.success) {
      toast.success("Command executed");
    } else {
      toast.error(`Command failed: ${result.error}`);
    }

    if (onCommandExecuted) {
      onCommandExecuted(result);
    }

    setCommand("");
    setExecuting(false);
  };

  const handleAddToAllowList = () => {
    if (!command.trim() || !executor) return;
    const baseCmd = command.split(/\s+/)[0];
    executor.allowCommand(baseCmd);
    setAllowList(executor.getValidatorConfig().allowList);
    toast.success(`Added "${baseCmd}" to allow list`);
  };

  const handleAddToDenyList = () => {
    if (!command.trim() || !executor) return;
    const baseCmd = command.split(/\s+/)[0];
    executor.denyCommand(baseCmd);
    setDenyList(executor.getValidatorConfig().denyList);
    toast.success(`Added "${baseCmd}" to deny list`);
  };

  const handleSavePrompt = async () => {
    if (!executor) return;
    executor.setSystemPrompt(systemPrompt);
    await executor.saveAll();
    toast.success("System prompt saved");
  };

  const handleResetPrompt = () => {
    if (!executor) return;
    executor.setSystemPrompt(
      "You are VibeCodeWorker, an AI-powered code development assistant integrated with CryptArtist Studio."
    );
    setSystemPrompt(executor.getSystemPrompt());
    toast.info("System prompt reset to default");
  };

  return (
    <div className="flex flex-col h-full bg-studio-bg">
      {/* Command Input */}
      <div className="flex-shrink-0 border-b border-studio-border p-3 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleExecuteCommand()}
            placeholder="Enter terminal command..."
            className="input flex-1 text-[12px]"
            disabled={executing}
          />
          <button
            onClick={handleExecuteCommand}
            disabled={executing}
            className="btn btn-cyan text-[11px] px-3 py-1"
          >
            {executing ? "Running..." : "Execute"}
          </button>
        </div>

        {/* Safety Level Selector */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-studio-secondary">Safety:</label>
          <select
            value={safetyLevel}
            onChange={(e) => setSafetyLevel(e.target.value as AISafetyLevel)}
            className="bg-studio-panel text-[10px] text-studio-text border border-studio-border rounded px-2 py-1 outline-none"
          >
            <option value="unrestricted">Unrestricted</option>
            <option value="permissive">Permissive</option>
            <option value="balanced">Balanced</option>
            <option value="strict">Strict</option>
            <option value="paranoid">Paranoid</option>
          </select>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn btn-ghost text-[10px] px-2 py-1"
            title="Settings"
          >
            ⚙️
          </button>
          <button
            onClick={() => setShowMemory(!showMemory)}
            className="btn btn-ghost text-[10px] px-2 py-1"
            title="Memory"
          >
            💾
          </button>
          <button
            onClick={() => setShowPrompt(!showPrompt)}
            className="btn btn-ghost text-[10px] px-2 py-1"
            title="System Prompt"
          >
            📝
          </button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-1">
          <button
            onClick={handleAddToAllowList}
            className="btn text-[9px] px-2 py-0.5 bg-green-900/30 text-green-300 hover:bg-green-900/50"
            title="Add command to allow list"
          >
            ✓ Allow
          </button>
          <button
            onClick={handleAddToDenyList}
            className="btn text-[9px] px-2 py-0.5 bg-red-900/30 text-red-300 hover:bg-red-900/50"
            title="Add command to deny list"
          >
            ✗ Deny
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="flex-shrink-0 border-b border-studio-border p-3 bg-studio-panel space-y-2 max-h-48 overflow-y-auto">
          <h3 className="text-[11px] font-semibold text-studio-text">Allow List</h3>
          <div className="flex flex-wrap gap-1">
            {allowList.map((cmd) => (
              <span
                key={cmd}
                className="text-[9px] bg-green-900/30 text-green-300 px-2 py-1 rounded flex items-center gap-1"
              >
                {cmd}
                <button
                  onClick={() => {
                    if (executor) {
                      executor.updateValidatorConfig({
                        allowList: allowList.filter((c) => c !== cmd),
                      });
                      setAllowList(allowList.filter((c) => c !== cmd));
                    }
                  }}
                  className="text-[8px] hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <h3 className="text-[11px] font-semibold text-studio-text mt-2">Deny List</h3>
          <div className="flex flex-wrap gap-1">
            {denyList.map((cmd) => (
              <span
                key={cmd}
                className="text-[9px] bg-red-900/30 text-red-300 px-2 py-1 rounded flex items-center gap-1"
              >
                {cmd}
                <button
                  onClick={() => {
                    if (executor) {
                      executor.updateValidatorConfig({
                        denyList: denyList.filter((c) => c !== cmd),
                      });
                      setDenyList(denyList.filter((c) => c !== cmd));
                    }
                  }}
                  className="text-[8px] hover:text-green-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Memory Panel */}
      {showMemory && memorySummary && (
        <div className="flex-shrink-0 border-b border-studio-border p-3 bg-studio-panel space-y-2">
          <h3 className="text-[11px] font-semibold text-studio-text">Memory Summary</h3>
          <div className="text-[9px] text-studio-secondary space-y-1">
            <div>Total Entries: {memorySummary.totalEntries}</div>
            <div>Success Rate: {memorySummary.successRate.toFixed(1)}%</div>
            <div>Recent Commands: {memorySummary.recentCommands.join(", ")}</div>
          </div>
        </div>
      )}

      {/* System Prompt Panel */}
      {showPrompt && (
        <div className="flex-shrink-0 border-b border-studio-border p-3 bg-studio-panel space-y-2 max-h-48 overflow-y-auto">
          <div className="flex justify-between items-center">
            <h3 className="text-[11px] font-semibold text-studio-text">System Prompt</h3>
            <div className="flex gap-1">
              <button
                onClick={handleSavePrompt}
                className="btn text-[9px] px-2 py-0.5 bg-blue-900/30 text-blue-300"
              >
                Save
              </button>
              <button
                onClick={handleResetPrompt}
                className="btn text-[9px] px-2 py-0.5 bg-yellow-900/30 text-yellow-300"
              >
                Reset
              </button>
            </div>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            className="w-full h-24 bg-studio-bg text-[9px] text-studio-text border border-studio-border rounded p-2 font-mono resize-none"
            placeholder="Enter system prompt..."
          />
        </div>
      )}

      {/* Output */}
      <div
        ref={outputRef}
        className="flex-1 overflow-y-auto bg-studio-bg border-t border-studio-border p-3 font-mono text-[10px] text-studio-secondary space-y-0"
      >
        {output.length === 0 ? (
          <div className="text-studio-muted">Ready to execute commands...</div>
        ) : (
          output.map((line, i) => (
            <div key={i} className={line.startsWith("$") ? "text-studio-cyan" : line.startsWith("Error") ? "text-studio-red" : ""}>
              {line}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
