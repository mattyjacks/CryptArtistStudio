import React, { useState } from "react";
import { useDeviceType } from "../utils/platform";
import {
  saveGitToken,
  getGitToken,
  type GitProvider,
} from "../utils/gitIntegration";
import {
  getGitLabUser,
  getBitbucketUser,
  getGiteaUser,
  getProviderConfig,
  getProviderIcon,
} from "../utils/gitProviders";
import { toast } from "../utils/toast";

interface MultiProviderGitAuthProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated?: (provider: GitProvider, token: string) => void;
}

export function MultiProviderGitAuth({
  isOpen,
  onClose,
  onAuthenticated,
}: MultiProviderGitAuthProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";

  const [selectedProvider, setSelectedProvider] = useState<GitProvider>("github");
  const [token, setToken] = useState("");
  const [customApiUrl, setCustomApiUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [authenticated, setAuthenticated] = useState<GitProvider | null>(null);

  const handleAuthenticate = async () => {
    if (!token.trim()) {
      toast.error("Please enter a token");
      return;
    }

    try {
      setLoading(true);

      // Verify token with provider
      switch (selectedProvider) {
        case "gitlab":
          await getGitLabUser(token, customApiUrl || undefined);
          break;
        case "bitbucket":
          await getBitbucketUser(token);
          break;
        case "gitea":
          await getGiteaUser(token, customApiUrl || undefined);
          break;
        case "github":
        default:
          // GitHub verification is handled by GitHubAuthModal
          break;
      }

      saveGitToken(selectedProvider, token);
      setAuthenticated(selectedProvider);
      toast.success(`Authenticated with ${selectedProvider}`);
      onAuthenticated?.(selectedProvider, token);

      setTimeout(() => {
        setToken("");
        setCustomApiUrl("");
        setAuthenticated(null);
        onClose();
      }, 1500);
    } catch (err) {
      toast.error(`Authentication failed: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const config = getProviderConfig(selectedProvider);
  const providers: GitProvider[] = ["github", "gitlab", "gitea", "bitbucket"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`bg-studio-panel border border-studio-border rounded-xl shadow-2xl ${
          isMobile ? "w-[90vw] max-w-sm" : "w-[500px]"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-studio-border">
          <h2 className="text-[13px] font-bold text-studio-text">
            Git Provider Authentication
          </h2>
          <button
            onClick={onClose}
            className="text-studio-muted hover:text-studio-text transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Provider Selection */}
          <div>
            <p className="text-[11px] font-bold text-studio-muted mb-2">
              SELECT PROVIDER
            </p>
            <div className="grid grid-cols-2 gap-2">
              {providers.map((provider) => (
                <button
                  key={provider}
                  onClick={() => {
                    setSelectedProvider(provider);
                    setToken("");
                    setCustomApiUrl("");
                  }}
                  className={`p-2 rounded border transition-colors text-[10px] font-bold ${
                    selectedProvider === provider
                      ? "bg-studio-cyan/20 border-studio-cyan text-studio-cyan"
                      : "bg-studio-surface border-studio-border text-studio-secondary hover:border-studio-cyan"
                  }`}
                >
                  <span className="text-[16px] block mb-1">
                    {getProviderIcon(provider)}
                  </span>
                  {provider.charAt(0).toUpperCase() + provider.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Info */}
          <div className="bg-studio-surface border border-studio-border rounded p-3">
            <p className="text-[10px] text-studio-secondary">
              <strong>{config.name}</strong>
            </p>
            <p className="text-[9px] text-studio-muted mt-1">
              {config.description}
            </p>
          </div>

          {/* Custom API URL (for self-hosted) */}
          {(selectedProvider === "gitea" || selectedProvider === "gitlab") && (
            <div>
              <label className="text-[10px] font-bold text-studio-muted block mb-1">
                API URL (optional for self-hosted)
              </label>
              <input
                type="text"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                placeholder={config.apiUrl}
                className="input w-full text-[10px] py-1.5"
                disabled={loading}
              />
            </div>
          )}

          {/* Token Input */}
          <div>
            <label className="text-[10px] font-bold text-studio-muted block mb-1">
              Access Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAuthenticate()}
              placeholder={`${selectedProvider} token...`}
              className="input w-full text-[10px] py-1.5 font-mono"
              disabled={loading}
            />
            <p className="text-[9px] text-studio-muted mt-1">
              Create a token in your {config.name} settings with repo access
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleAuthenticate}
              disabled={loading || !token.trim()}
              className="btn btn-cyan flex-1 text-[11px] py-2"
            >
              {loading ? "Authenticating..." : "Authenticate"}
            </button>
            <button onClick={onClose} className="btn flex-1 text-[11px] py-2">
              Cancel
            </button>
          </div>

          {/* Security Note */}
          <p className="text-[9px] text-studio-muted text-center">
            Your token is stored locally and never sent to our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
