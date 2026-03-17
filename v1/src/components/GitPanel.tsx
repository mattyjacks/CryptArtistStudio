import React, { useState, useEffect } from "react";
import { useDeviceType } from "../utils/platform";
import {
  getRepositoryStatus,
  getCurrentBranch,
  getBranches,
  stageFile,
  unstageFile,
  commit,
  push,
  pull,
  createBranch,
  switchBranch,
  type GitStatus,
  type GitBranch,
} from "../utils/gitIntegration";
import { toast } from "../utils/toast";

interface GitPanelProps {
  repositoryPath: string | null;
  onStatusChange?: (status: GitStatus) => void;
}

export function GitPanel({ repositoryPath, onStatusChange }: GitPanelProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";

  const [status, setStatus] = useState<GitStatus | null>(null);
  const [branches, setBranches] = useState<GitBranch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [activeTab, setActiveTab] = useState<"status" | "branches" | "commit">("status");

  useEffect(() => {
    if (!repositoryPath) return;
    refreshStatus();
  }, [repositoryPath]);

  const refreshStatus = async () => {
    if (!repositoryPath) return;
    try {
      setLoading(true);
      const [newStatus, branch, branchList] = await Promise.all([
        getRepositoryStatus(repositoryPath),
        getCurrentBranch(repositoryPath),
        getBranches(repositoryPath),
      ]);
      setStatus(newStatus);
      setCurrentBranch(branch);
      setBranches(branchList);
      onStatusChange?.(newStatus);
    } catch (err) {
      console.error("Failed to refresh git status:", err);
      toast.error("Failed to refresh git status");
    } finally {
      setLoading(false);
    }
  };

  const handleStageFile = async (filePath: string) => {
    if (!repositoryPath) return;
    try {
      await stageFile(repositoryPath, filePath);
      await refreshStatus();
      toast.success(`Staged: ${filePath}`);
    } catch (err) {
      toast.error(`Failed to stage file: ${err}`);
    }
  };

  const handleUnstageFile = async (filePath: string) => {
    if (!repositoryPath) return;
    try {
      await unstageFile(repositoryPath, filePath);
      await refreshStatus();
      toast.success(`Unstaged: ${filePath}`);
    } catch (err) {
      toast.error(`Failed to unstage file: ${err}`);
    }
  };

  const handleCommit = async () => {
    if (!repositoryPath || !commitMessage.trim()) {
      toast.error("Please enter a commit message");
      return;
    }
    try {
      setLoading(true);
      await commit(repositoryPath, commitMessage, authorName || undefined, authorEmail || undefined);
      setCommitMessage("");
      await refreshStatus();
      toast.success("Commit created");
    } catch (err) {
      toast.error(`Failed to commit: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!repositoryPath) return;
    try {
      setLoading(true);
      await push(repositoryPath, "origin", currentBranch);
      await refreshStatus();
      toast.success("Pushed to origin");
    } catch (err) {
      toast.error(`Failed to push: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!repositoryPath) return;
    try {
      setLoading(true);
      await pull(repositoryPath, "origin", currentBranch);
      await refreshStatus();
      toast.success("Pulled from origin");
    } catch (err) {
      toast.error(`Failed to pull: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!repositoryPath || !newBranchName.trim()) {
      toast.error("Please enter a branch name");
      return;
    }
    try {
      setLoading(true);
      await createBranch(repositoryPath, newBranchName);
      setNewBranchName("");
      await refreshStatus();
      toast.success(`Created branch: ${newBranchName}`);
    } catch (err) {
      toast.error(`Failed to create branch: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchBranch = async (branchName: string) => {
    if (!repositoryPath) return;
    try {
      setLoading(true);
      await switchBranch(repositoryPath, branchName);
      setShowBranchMenu(false);
      await refreshStatus();
      toast.success(`Switched to ${branchName}`);
    } catch (err) {
      toast.error(`Failed to switch branch: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (!repositoryPath) {
    return (
      <div className={`flex items-center justify-center ${isMobile ? "h-32" : "h-48"} text-center`}>
        <div>
          <p className="text-[12px] text-studio-muted mb-2">No repository open</p>
          <p className="text-[10px] text-studio-muted">Open a git repository to see status</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col bg-studio-panel border border-studio-border rounded-lg overflow-hidden ${isMobile ? "h-full" : "h-96"}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-studio-border bg-studio-surface">
        <div className="flex items-center gap-2">
          <span className="text-[14px]">🌿</span>
          <span className="text-[11px] font-bold text-studio-text">{currentBranch}</span>
        </div>
        <button
          onClick={refreshStatus}
          disabled={loading}
          className="text-[10px] text-studio-muted hover:text-studio-text transition-colors"
          title="Refresh status"
        >
          {loading ? "⟳" : "↻"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-studio-border bg-studio-panel">
        {(["status", "branches", "commit"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-2 py-1 text-[10px] rounded transition-colors ${
              activeTab === tab
                ? "bg-studio-cyan/20 text-studio-cyan"
                : "text-studio-secondary hover:bg-studio-hover"
            }`}
          >
            {tab === "status" ? "Status" : tab === "branches" ? "Branches" : "Commit"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Status Tab */}
        {activeTab === "status" && status && (
          <div className="p-3 space-y-3">
            <div>
              <div className="text-[10px] font-bold text-studio-muted mb-1">STAGED ({status.staged.length})</div>
              <div className="space-y-1">
                {status.staged.length === 0 ? (
                  <p className="text-[10px] text-studio-muted italic">No staged files</p>
                ) : (
                  status.staged.map((file) => (
                    <div key={file} className="flex items-center justify-between text-[10px] p-1 rounded hover:bg-studio-hover group">
                      <span className="text-studio-green truncate">✓ {file}</span>
                      <button
                        onClick={() => handleUnstageFile(file)}
                        className="text-[8px] text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        unstage
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-studio-border pt-2">
              <div className="text-[10px] font-bold text-studio-muted mb-1">UNSTAGED ({status.unstaged.length})</div>
              <div className="space-y-1">
                {status.unstaged.length === 0 ? (
                  <p className="text-[10px] text-studio-muted italic">No unstaged files</p>
                ) : (
                  status.unstaged.map((file) => (
                    <div key={file} className="flex items-center justify-between text-[10px] p-1 rounded hover:bg-studio-hover group">
                      <span className="text-studio-yellow truncate">~ {file}</span>
                      <button
                        onClick={() => handleStageFile(file)}
                        className="text-[8px] text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        stage
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {status.untracked.length > 0 && (
              <div className="border-t border-studio-border pt-2">
                <div className="text-[10px] font-bold text-studio-muted mb-1">UNTRACKED ({status.untracked.length})</div>
                <div className="space-y-1">
                  {status.untracked.map((file) => (
                    <div key={file} className="flex items-center justify-between text-[10px] p-1 rounded hover:bg-studio-hover group">
                      <span className="text-studio-muted truncate">? {file}</span>
                      <button
                        onClick={() => handleStageFile(file)}
                        className="text-[8px] text-studio-muted opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        stage
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Branches Tab */}
        {activeTab === "branches" && (
          <div className="p-3 space-y-2">
            <div className="flex gap-1">
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                placeholder="New branch name..."
                className="input flex-1 text-[10px] py-1"
              />
              <button
                onClick={handleCreateBranch}
                disabled={loading}
                className="btn btn-cyan text-[9px] py-1 px-2"
              >
                Create
              </button>
            </div>

            <div className="space-y-1">
              {branches.map((branch) => (
                <button
                  key={branch.name}
                  onClick={() => handleSwitchBranch(branch.name)}
                  disabled={loading}
                  className={`w-full text-left px-2 py-1 rounded text-[10px] transition-colors ${
                    branch.isCurrent
                      ? "bg-studio-cyan/20 text-studio-cyan font-bold"
                      : "text-studio-secondary hover:bg-studio-hover"
                  }`}
                >
                  {branch.isCurrent ? "● " : "○ "}
                  {branch.name}
                  {branch.isRemote && <span className="text-[8px] text-studio-muted ml-1">(remote)</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Commit Tab */}
        {activeTab === "commit" && (
          <div className="p-3 space-y-2">
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Author name (optional)"
              className="input w-full text-[10px] py-1"
            />
            <input
              type="email"
              value={authorEmail}
              onChange={(e) => setAuthorEmail(e.target.value)}
              placeholder="Author email (optional)"
              className="input w-full text-[10px] py-1"
            />
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Commit message..."
              className="input w-full text-[10px] py-1 resize-none h-20"
            />
            <div className="flex gap-1">
              <button
                onClick={handleCommit}
                disabled={loading || !commitMessage.trim()}
                className="btn btn-cyan flex-1 text-[10px] py-1"
              >
                Commit
              </button>
              <button
                onClick={handlePush}
                disabled={loading}
                className="btn text-[10px] py-1 px-2"
                title="Push to origin"
              >
                ↑ Push
              </button>
              <button
                onClick={handlePull}
                disabled={loading}
                className="btn text-[10px] py-1 px-2"
                title="Pull from origin"
              >
                ↓ Pull
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
