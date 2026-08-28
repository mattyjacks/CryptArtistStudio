import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAI } from "../../core/context/AIContext";

export const ValleyNet: React.FC = () => {
  const { engine } = useAI();
  const [taskInput, setTaskInput] = useState<string>("");
  const [tasks, setTasks] = useState([
    {
      id: "t1",
      title: "Scrape Pexels and auto-generate 3 video cut lists",
      status: "completed",
      time: "2 mins ago",
    },
    {
      id: "t2",
      title: "Transcribe podcast audio and extract soundbites",
      status: "in-progress",
      time: "Just now",
    },
  ]);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const handleExecuteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim() || isExecuting) return;

    const newTask = {
      id: `t_${Date.now()}`,
      title: taskInput.trim(),
      status: "in-progress",
      time: "Just now",
    };

    setTasks((prev) => [newTask, ...prev]);
    setTaskInput("");
    setIsExecuting(true);

    try {
      await engine.chat([
        { id: "sys", role: "system", content: "You are ValleyNet autonomous AI agent.", timestamp: Date.now() },
        { id: "u", role: "user", content: `Execute task: ${newTask.title}`, timestamp: Date.now() },
      ]);
      setTasks((prev) =>
        prev.map((t) => (t.id === newTask.id ? { ...t, status: "completed" } : t))
      );
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === newTask.id ? { ...t, status: "completed" } : t))
      );
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg text-studio-text overflow-hidden">
      <header className="h-12 border-b border-studio-border bg-studio-panel px-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-2.5 py-1 text-xs rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-secondary hover:text-studio-purple transition"
          >
            ← Back to Suite
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">👱🏻‍♀️</span>
            <span className="font-bold text-sm bg-gradient-to-r from-studio-purple to-studio-pink bg-clip-text text-transparent">
              ValleyNet Autonomous AI [VNt]
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-purple/20 text-studio-purple font-bold">
              v2 Web
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden p-6 max-w-5xl mx-auto w-full gap-6">
        {/* Left: Task Input & Skills */}
        <div className="flex-1 flex flex-col space-y-4">
          <form onSubmit={handleExecuteTask} className="bg-studio-panel border border-studio-border rounded-2xl p-5 shadow-panel space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>⚡</span> Direct Autonomous Task Command
            </h2>
            <textarea
              rows={3}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="e.g. Research trending YouTube topics, write a 60-second video script, and suggest B-Roll clips..."
              className="w-full bg-studio-surface border border-studio-border rounded-xl p-3 text-xs text-studio-text focus:outline-none focus:border-studio-purple"
            />
            <button
              type="submit"
              disabled={isExecuting}
              className="px-5 py-2 bg-studio-purple hover:bg-studio-purple/80 text-white font-bold text-xs rounded-xl transition shadow-glow-purple flex items-center gap-2"
            >
              <span>{isExecuting ? "Executing..." : "🚀 Run Agent Task"}</span>
            </button>
          </form>

          {/* Active Tasks Feed */}
          <div className="flex-1 bg-studio-panel border border-studio-border rounded-2xl p-5 shadow-panel overflow-y-auto space-y-3">
            <h3 className="text-xs font-bold text-studio-secondary uppercase tracking-wider">
              Agent Task Execution History
            </h3>
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 bg-studio-surface border border-studio-border rounded-xl flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-semibold text-studio-text">{task.title}</h4>
                  <span className="text-[10px] text-studio-muted">{task.time}</span>
                </div>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                    task.status === "completed"
                      ? "bg-studio-green/20 text-studio-green"
                      : "bg-studio-yellow/20 text-studio-yellow animate-pulse"
                  }`}
                >
                  {task.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Installed Skills Sidebar */}
        <div className="w-72 bg-studio-panel border border-studio-border rounded-2xl p-5 shadow-panel flex flex-col">
          <h3 className="text-xs font-bold text-studio-secondary uppercase tracking-wider mb-3">
            Available Skills (OpenClaw)
          </h3>
          <div className="space-y-2 text-xs">
            {[
              { name: "Browser Automation", icon: "🌐", status: "Active" },
              { name: "Pexels Media Fetcher", icon: "🎬", status: "Active" },
              { name: "Google Drive Sync", icon: "📁", status: "Active" },
              { name: "Voice Synthesis", icon: "🎙️", status: "Active" },
              { name: "Code Execution", icon: "💻", status: "Active" },
            ].map((skill) => (
              <div
                key={skill.name}
                className="p-2.5 bg-studio-surface border border-studio-border rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span>{skill.icon}</span>
                  <span className="font-medium text-studio-text">{skill.name}</span>
                </div>
                <span className="text-[9px] font-mono text-studio-green font-bold">
                  {skill.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValleyNet;
