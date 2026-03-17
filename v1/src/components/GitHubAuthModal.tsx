import React, { useState } from "react";
import { useDeviceType } from "../utils/platform";
import {
  saveGitToken,
  getGitHubUser,
  getUserRepositories,
  type GitHubUser,
  type GitHubRepo,
} from "../utils/gitIntegration";
import { toast } from "../utils/toast";

interface GitHubAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated?: (user: GitHubUser, repos: GitHubRepo[]) => void;
}

export function GitHubAuthModal({ isOpen, onClose, onAuthenticated }: GitHubAuthModalProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);

  const handleAuthenticate = async () => {
    if (!token.trim()) {
      toast.error("Please enter a GitHub token");
      return;
    }

    try {
      setLoading(true);
      const [userData, repoData] = await Promise.all([
        getGitHubUser(token),
        getUserRepositories(token),
      ]);
      
      setUser(userData);
      setRepos(repoData);
      saveGitToken("github", token);
      
      toast.success(`Authenticated as ${userData.login}`);
      onAuthenticated?.(userData, repoData);
      
      // Auto-close after successful auth
      setTimeout(() => {
        setToken("");
        setUser(null);
        setRepos([]);
        onClose();
      }, 1500);
    } catch (err) {
      toast.error(`Authentication failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className={`bg-studio-panel border border-studio-border rounded-xl shadow-2xl ${
          isMobile ? "w-[90vw] max-w-sm" : "w-[450px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-studio-border">
          <h2 className="text-[13px] font-bold text-studio-text flex items-center gap-2">
            <span>🐙</span> GitHub Authentication
          </h2>
          <button
            onClick={onClose}
            className="text-studio-muted hover:text-studio-text transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {!user ? (
            <>
              <p className="text-[11px] text-studio-secondary">
                Create a personal access token on GitHub to authenticate VibeCodeWorker.
              </p>
              
              <div className="bg-studio-surface border border-studio-border rounded p-2">
                <p className="text-[10px] text-studio-muted mb-2">
                  <strong>Steps:</strong>
                </p>
                <ol className="text-[10px] text-studio-muted space-y-1 list-decimal list-inside">
                  <li>Go to GitHub Settings → Developer settings → Personal access tokens</li>
                  <li>Click "Generate new token"</li>
                  <li>Select scopes: repo, gist, user</li>
                  <li>Copy the token and paste it below</li>
                </ol>
              </div>

              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="input w-full text-[11px] py-2 font-mono"
                disabled={loading}
              />

              <div className="flex gap-2">
                <button
                  onClick={handleAuthenticate}
                  disabled={loading || !token.trim()}
                  className="btn btn-cyan flex-1 text-[11px] py-2"
                >
                  {loading ? "Authenticating..." : "Authenticate"}
                </button>
                <button
                  onClick={onClose}
                  className="btn flex-1 text-[11px] py-2"
                >
                  Cancel
                </button>
              </div>

              <p className="text-[9px] text-studio-muted text-center">
                Your token is stored locally and never sent to our servers.
              </p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 p-2 bg-studio-surface rounded border border-studio-border">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="text-[11px] font-bold text-studio-text">{user.name}</p>
                  <p className="text-[10px] text-studio-secondary">@{user.login}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-studio-muted mb-2">
                  Repositories ({repos.length})
                </p>
                <div className="max-h-[200px] overflow-y-auto space-y-1">
                  {repos.slice(0, 10).map((repo) => (
                    <div
                      key={repo.id}
                      className="p-2 bg-studio-surface rounded border border-studio-border hover:border-studio-cyan transition-colors cursor-pointer"
                    >
                      <p className="text-[10px] font-bold text-studio-text truncate">
                        {repo.name}
                      </p>
                      <p className="text-[9px] text-studio-muted truncate">
                        {repo.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[8px] text-studio-muted">
                        {repo.language && <span>📝 {repo.language}</span>}
                        <span>⭐ {repo.stars}</span>
                      </div>
                    </div>
                  ))}
                  {repos.length > 10 && (
                    <p className="text-[9px] text-studio-muted text-center py-1">
                      +{repos.length - 10} more repositories
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={onClose}
                className="btn btn-cyan w-full text-[11px] py-2"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
