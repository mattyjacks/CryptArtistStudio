// ============================================================================
// CryptArtist Studio - Git Integration
// Supports GitHub, GitLab, Gitea, Bitbucket with OAuth and SSH/HTTPS
// ============================================================================

import { invoke } from "@tauri-apps/api/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GitProvider = "github" | "gitlab" | "gitea" | "bitbucket";

export interface GitConfig {
  provider: GitProvider;
  token?: string;
  username?: string;
  email?: string;
  sshKey?: string;
  apiUrl?: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  isDirty: boolean;
}

export interface GitCommit {
  hash: string;
  author: string;
  message: string;
  date: string;
  files: string[];
}

export interface GitBranch {
  name: string;
  isLocal: boolean;
  isRemote: boolean;
  isCurrent: boolean;
  lastCommit: string;
}

export interface GitRemote {
  name: string;
  url: string;
  type: "fetch" | "push";
}

export interface GitRepository {
  path: string;
  name: string;
  remotes: GitRemote[];
  branches: GitBranch[];
  currentBranch: string;
  status: GitStatus;
}

// ---------------------------------------------------------------------------
// Git Commands
// ---------------------------------------------------------------------------

export async function initRepository(path: string): Promise<void> {
  await invoke("git_init", { path });
}

export async function cloneRepository(
  url: string,
  targetPath: string,
  token?: string
): Promise<void> {
  const authUrl = token ? url.replace("https://", `https://${token}@`) : url;
  await invoke("git_clone", { url: authUrl, path: targetPath });
}

export async function getRepositoryStatus(path: string): Promise<GitStatus> {
  return await invoke("git_status", { path });
}

export async function getRepositoryInfo(path: string): Promise<GitRepository> {
  return await invoke("git_repo_info", { path });
}

export async function getBranches(path: string): Promise<GitBranch[]> {
  return await invoke("git_branches", { path });
}

export async function getCurrentBranch(path: string): Promise<string> {
  return await invoke("git_current_branch", { path });
}

export async function createBranch(path: string, branchName: string): Promise<void> {
  await invoke("git_create_branch", { path, branch_name: branchName });
}

export async function switchBranch(path: string, branchName: string): Promise<void> {
  await invoke("git_checkout", { path, branch: branchName });
}

export async function deleteBranch(path: string, branchName: string): Promise<void> {
  await invoke("git_delete_branch", { path, branch_name: branchName });
}

export async function stageFile(path: string, filePath: string): Promise<void> {
  await invoke("git_add", { path, file: filePath });
}

export async function stageAll(path: string): Promise<void> {
  await invoke("git_add_all", { path });
}

export async function unstageFile(path: string, filePath: string): Promise<void> {
  await invoke("git_reset", { path, file: filePath });
}

export async function commit(
  path: string,
  message: string,
  author?: string,
  email?: string
): Promise<string> {
  return await invoke("git_commit", { path, message, author, email });
}

export async function push(
  path: string,
  remote: string = "origin",
  branch?: string
): Promise<void> {
  await invoke("git_push", { path, remote, branch });
}

export async function pull(
  path: string,
  remote: string = "origin",
  branch?: string
): Promise<void> {
  await invoke("git_pull", { path, remote, branch });
}

export async function fetch(path: string, remote: string = "origin"): Promise<void> {
  await invoke("git_fetch", { path, remote });
}

export async function getCommitHistory(
  path: string,
  maxCount: number = 50
): Promise<GitCommit[]> {
  return await invoke("git_log", { path, max_count: maxCount });
}

export async function getRemotes(path: string): Promise<GitRemote[]> {
  return await invoke("git_remotes", { path });
}

export async function addRemote(
  path: string,
  name: string,
  url: string
): Promise<void> {
  await invoke("git_add_remote", { path, name, url });
}

export async function removeRemote(path: string, name: string): Promise<void> {
  await invoke("git_remove_remote", { path, name });
}

export async function mergeBranch(
  path: string,
  branchName: string
): Promise<void> {
  await invoke("git_merge", { path, branch: branchName });
}

export async function rebaseBranch(
  path: string,
  branchName: string
): Promise<void> {
  await invoke("git_rebase", { path, branch: branchName });
}

export async function discardChanges(path: string, filePath?: string): Promise<void> {
  await invoke("git_discard", { path, file: filePath });
}

export async function stashChanges(path: string, message?: string): Promise<void> {
  await invoke("git_stash", { path, message });
}

export async function getStashList(path: string): Promise<string[]> {
  return await invoke("git_stash_list", { path });
}

export async function applyStash(path: string, stashId: string): Promise<void> {
  await invoke("git_stash_apply", { path, stash_id: stashId });
}

// ---------------------------------------------------------------------------
// GitHub API Integration
// ---------------------------------------------------------------------------

export interface GitHubUser {
  login: string;
  id: number;
  name: string;
  email: string;
  avatar_url: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  url: string;
  html_url: string;
  owner: { login: string };
  private: boolean;
  fork: boolean;
  stars: number;
  language: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  user: { login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string;
  state: "open" | "closed";
  user: { login: string };
  created_at: string;
  updated_at: string;
  html_url: string;
}

const GITHUB_API = "https://api.github.com";
const GITHUB_OAUTH_CLIENT_ID = "Ov23liXXXXXXXXXXXXXX"; // Set via env var

// Helper for GitHub API calls
async function fetchGitHub(url: string, options?: any): Promise<any> {
  const response = await fetch(url, options);
  return response;
}

export async function getGitHubUser(token: string): Promise<GitHubUser> {
  try {
    const response = await fetchGitHub(`${GITHUB_API}/user`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch GitHub user");
    return await response.json();
  } catch (err) {
    throw new Error(`GitHub user fetch error: ${err}`);
  }
}

export async function getUserRepositories(token: string): Promise<GitHubRepo[]> {
  try {
    const response = await fetchGitHub(`${GITHUB_API}/user/repos?per_page=100`, {
      headers: { Authorization: `token ${token}` },
    });
    if (!response.ok) throw new Error("Failed to fetch repositories");
    return await response.json();
  } catch (err) {
    throw new Error(`GitHub repositories fetch error: ${err}`);
  }
}

export async function getRepositoryPullRequests(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubPullRequest[]> {
  try {
    const response = await fetchGitHub(
      `${GITHUB_API}/repos/${owner}/${repo}/pulls?state=all&per_page=50`,
      { headers: { Authorization: `token ${token}` } }
    );
    if (!response.ok) throw new Error("Failed to fetch pull requests");
    return await response.json();
  } catch (err) {
    throw new Error(`GitHub pull requests fetch error: ${err}`);
  }
}

export async function getRepositoryIssues(
  token: string,
  owner: string,
  repo: string
): Promise<GitHubIssue[]> {
  try {
    const response = await fetchGitHub(
      `${GITHUB_API}/repos/${owner}/${repo}/issues?state=all&per_page=50`,
      { headers: { Authorization: `token ${token}` } }
    );
    if (!response.ok) throw new Error("Failed to fetch issues");
    return await response.json();
  } catch (err) {
    throw new Error(`GitHub issues fetch error: ${err}`);
  }
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string,
  head: string,
  base: string = "main"
): Promise<GitHubPullRequest> {
  try {
    const response = await fetchGitHub(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, head, base }),
    });
    if (!response.ok) throw new Error("Failed to create pull request");
    return await response.json();
  } catch (err) {
    throw new Error(`GitHub PR creation error: ${err}`);
  }
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body: string
): Promise<GitHubIssue> {
  try {
    const response = await fetchGitHub(`${GITHUB_API}/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body }),
    });
    if (!response.ok) throw new Error("Failed to create issue");
    return await response.json();
  } catch (err) {
    throw new Error(`GitHub issue creation error: ${err}`);
  }
}

// ---------------------------------------------------------------------------
// OAuth Token Management
// ---------------------------------------------------------------------------

const GIT_TOKEN_KEY = "cryptartist_git_token";
const GIT_CONFIG_KEY = "cryptartist_git_config";

export function saveGitToken(provider: GitProvider, token: string): void {
  localStorage.setItem(`${GIT_TOKEN_KEY}_${provider}`, token);
}

export function getGitToken(provider: GitProvider): string | null {
  return localStorage.getItem(`${GIT_TOKEN_KEY}_${provider}`);
}

export function clearGitToken(provider: GitProvider): void {
  localStorage.removeItem(`${GIT_TOKEN_KEY}_${provider}`);
}

export function saveGitConfig(config: GitConfig): void {
  localStorage.setItem(GIT_CONFIG_KEY, JSON.stringify(config));
}

export function getGitConfig(): GitConfig | null {
  const stored = localStorage.getItem(GIT_CONFIG_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function clearGitConfig(): void {
  localStorage.removeItem(GIT_CONFIG_KEY);
}
