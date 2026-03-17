// ============================================================================
// CryptArtist Studio - Multi-Provider Git Support
// Supports GitHub, GitLab, Gitea, Bitbucket
// ============================================================================

import { GitProvider } from "./gitIntegration";

export interface ProviderConfig {
  name: string;
  apiUrl: string;
  webUrl: string;
  oauthUrl?: string;
  icon: string;
  description: string;
}

export const PROVIDER_CONFIGS: Record<GitProvider, ProviderConfig> = {
  github: {
    name: "GitHub",
    apiUrl: "https://api.github.com",
    webUrl: "https://github.com",
    oauthUrl: "https://github.com/login/oauth/authorize",
    icon: "🐙",
    description: "GitHub - The world's leading software development platform",
  },
  gitlab: {
    name: "GitLab",
    apiUrl: "https://gitlab.com/api/v4",
    webUrl: "https://gitlab.com",
    oauthUrl: "https://gitlab.com/oauth/authorize",
    icon: "🦊",
    description: "GitLab - DevOps platform with built-in CI/CD",
  },
  gitea: {
    name: "Gitea",
    apiUrl: "https://gitea.io/api/v1",
    webUrl: "https://gitea.io",
    icon: "🍵",
    description: "Gitea - Lightweight self-hosted Git service",
  },
  bitbucket: {
    name: "Bitbucket",
    apiUrl: "https://api.bitbucket.org/2.0",
    webUrl: "https://bitbucket.org",
    oauthUrl: "https://bitbucket.org/site/oauth2/authorize",
    icon: "🪣",
    description: "Bitbucket - Git repository hosting for teams",
  },
};

export function getProviderConfig(provider: GitProvider): ProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

export function getProviderIcon(provider: GitProvider): string {
  return PROVIDER_CONFIGS[provider].icon;
}

export function getProviderName(provider: GitProvider): string {
  return PROVIDER_CONFIGS[provider].name;
}

// GitLab API functions
export async function getGitLabUser(token: string, apiUrl: string = PROVIDER_CONFIGS.gitlab.apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/user`, {
      headers: { "PRIVATE-TOKEN": token },
    });
    if (!response.ok) throw new Error("Failed to fetch GitLab user");
    return await response.json();
  } catch (err) {
    throw new Error(`GitLab user fetch error: ${err}`);
  }
}

export async function getGitLabRepositories(token: string, apiUrl: string = PROVIDER_CONFIGS.gitlab.apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/projects?per_page=100`, {
      headers: { "PRIVATE-TOKEN": token },
    });
    if (!response.ok) throw new Error("Failed to fetch GitLab repositories");
    return await response.json();
  } catch (err) {
    throw new Error(`GitLab repositories fetch error: ${err}`);
  }
}

// Bitbucket API functions
export async function getBitbucketUser(token: string) {
  try {
    const response = await fetch("https://api.bitbucket.org/2.0/user", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch Bitbucket user");
    return await response.json();
  } catch (err) {
    throw new Error(`Bitbucket user fetch error: ${err}`);
  }
}

export async function getBitbucketRepositories(token: string) {
  try {
    const response = await fetch("https://api.bitbucket.org/2.0/repositories?pagelen=100", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch Bitbucket repositories");
    return await response.json();
  } catch (err) {
    throw new Error(`Bitbucket repositories fetch error: ${err}`);
  }
}

// Gitea API functions
export async function getGiteaUser(token: string, apiUrl: string = PROVIDER_CONFIGS.gitea.apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/user`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch Gitea user");
    return await response.json();
  } catch (err) {
    throw new Error(`Gitea user fetch error: ${err}`);
  }
}

export async function getGiteaRepositories(token: string, apiUrl: string = PROVIDER_CONFIGS.gitea.apiUrl) {
  try {
    const response = await fetch(`${apiUrl}/user/repos`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch Gitea repositories");
    return await response.json();
  } catch (err) {
    throw new Error(`Gitea repositories fetch error: ${err}`);
  }
}
