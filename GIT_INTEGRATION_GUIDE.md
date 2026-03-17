# VibeCodeWorker Git & GitHub Integration Guide

## Overview

VibeCodeWorker now supports full Git integration with GitHub, GitLab, Gitea, and Bitbucket on both desktop and mobile (Android/iOS) platforms. Users can clone repositories, manage branches, stage/commit changes, and push/pull from within the editor.

## Features

### Core Git Operations
- **Clone Repository**: Clone from any Git provider (HTTPS with token auth)
- **Branch Management**: Create, switch, delete, and list branches
- **File Staging**: Stage/unstage individual files or all changes
- **Commits**: Create commits with author name and email
- **Push/Pull**: Sync with remote repositories
- **Status Tracking**: Real-time git status (staged, unstaged, untracked files)
- **History**: View commit history with author and message
- **Stash**: Stash and apply changes
- **Merge/Rebase**: Merge and rebase branches

### Multi-Provider Support
- **GitHub**: Full API integration with OAuth token support
- **GitLab**: Self-hosted and cloud support with custom API URLs
- **Gitea**: Self-hosted Git service support
- **Bitbucket**: Cloud and self-hosted support

### Mobile Optimizations
- **Touch-Friendly UI**: Large buttons and proper spacing for mobile
- **Bottom Panel Navigation**: Switch between Editor/Files/Git/Terminal on mobile
- **Responsive Layout**: Adapts to small screens with single-column layout
- **Lightweight**: Uses native components instead of Monaco editor on mobile
- **Offline Support**: Works with local repositories without internet

### Desktop Features
- **3-Panel Layout**: File Explorer | Editor | Git Panel
- **Rich Git UI**: Tabbed interface for Status/Branches/Commit
- **Visual Indicators**: Shows branch status, file changes, commit counts
- **Keyboard Shortcuts**: Full keyboard support for git operations

## File Structure

### Core Utilities
- `v1/src/utils/gitIntegration.ts` - Main Git and GitHub API functions
- `v1/src/utils/gitProviders.ts` - Multi-provider support (GitLab, Gitea, Bitbucket)

### UI Components
- `v1/src/components/GitPanel.tsx` - Main Git UI with status/branches/commit tabs
- `v1/src/components/GitHubAuthModal.tsx` - GitHub authentication dialog
- `v1/src/components/MultiProviderGitAuth.tsx` - Multi-provider authentication

### Integration
- `v1/src/programs/vibecode-worker/VibeCodeWorkerAndroid.tsx` - Mobile and desktop implementation with Git support

## Usage

### Authentication

#### GitHub
1. Click "🐙 Auth" button in header
2. Go to GitHub Settings → Developer settings → Personal access tokens
3. Generate new token with `repo`, `gist`, `user` scopes
4. Paste token in modal
5. Token is stored locally in browser storage

#### GitLab/Gitea/Bitbucket
1. Click "🐙 Auth" button (or use MultiProviderGitAuth)
2. Select provider
3. For self-hosted: Enter custom API URL
4. Generate token in provider settings
5. Paste token and authenticate

### Cloning a Repository

**Mobile:**
1. Open VibeCodeWorker
2. Go to Files panel
3. Click "🐙 Clone" button
4. Enter repository URL (e.g., `https://github.com/user/repo.git`)
5. Click "Clone"

**Desktop:**
1. Click "🐙 Clone" button in header
2. Enter repository URL
3. Click "Clone"

### Git Workflow

**Mobile (Bottom Panel):**
- **Editor**: Edit files with syntax highlighting
- **Files**: Browse repository structure
- **Git**: Manage branches, stage files, commit, push/pull
- **Terminal**: Basic terminal with git-friendly commands

**Desktop (3-Panel):**
1. **Left Panel**: File explorer with search
2. **Center Panel**: Code editor with file tabs
3. **Right Panel**: Git status, branches, and commit interface

### Committing Changes

1. Go to Git panel
2. Click "Commit" tab
3. (Optional) Enter author name and email
4. Enter commit message
5. Click "Commit"
6. Click "↑ Push" to push to remote

### Branch Management

1. Go to Git panel
2. Click "Branches" tab
3. Enter new branch name and click "Create"
4. Click any branch to switch
5. Current branch is highlighted with "●"

### Viewing Status

1. Go to Git panel
2. Click "Status" tab
3. See staged, unstaged, and untracked files
4. Click "stage" or "unstage" on individual files
5. Click file name to open in editor

## API Reference

### Git Commands

```typescript
// Repository operations
await initRepository(path)
await cloneRepository(url, targetPath, token?)
await getRepositoryStatus(path)
await getRepositoryInfo(path)

// Branch operations
await getBranches(path)
await getCurrentBranch(path)
await createBranch(path, branchName)
await switchBranch(path, branchName)
await deleteBranch(path, branchName)

// File operations
await stageFile(path, filePath)
await stageAll(path)
await unstageFile(path, filePath)
await discardChanges(path, filePath?)

// Commit operations
await commit(path, message, author?, email?)
await getCommitHistory(path, maxCount?)

// Remote operations
await push(path, remote?, branch?)
await pull(path, remote?, branch?)
await fetch(path, remote?)
await getRemotes(path)
await addRemote(path, name, url)
await removeRemote(path, name)

// Stash operations
await stashChanges(path, message?)
await getStashList(path)
await applyStash(path, stashId)

// Merge/Rebase
await mergeBranch(path, branchName)
await rebaseBranch(path, branchName)
```

### GitHub API

```typescript
// User operations
await getGitHubUser(token)
await getUserRepositories(token)

// Repository operations
await getRepositoryPullRequests(token, owner, repo)
await getRepositoryIssues(token, owner, repo)

// Create operations
await createPullRequest(token, owner, repo, title, body, head, base?)
await createIssue(token, owner, repo, title, body)

// Token management
saveGitToken(provider, token)
getGitToken(provider)
clearGitToken(provider)
```

### Multi-Provider Support

```typescript
// GitLab
await getGitLabUser(token, apiUrl?)
await getGitLabRepositories(token, apiUrl?)

// Bitbucket
await getBitbucketUser(token)
await getBitbucketRepositories(token)

// Gitea
await getGiteaUser(token, apiUrl?)
await getGiteaRepositories(token, apiUrl?)

// Provider utilities
getProviderConfig(provider)
getProviderIcon(provider)
getProviderName(provider)
```

## Storage

Tokens are stored in browser localStorage with keys:
- `cryptartist_git_token_github`
- `cryptartist_git_token_gitlab`
- `cryptartist_git_token_gitea`
- `cryptartist_git_token_bitbucket`

Git configuration is stored in:
- `cryptartist_git_config` (JSON with provider, username, email, etc.)

## Security

- **Local Storage Only**: Tokens are never sent to CryptArtist servers
- **HTTPS Only**: All API calls use HTTPS
- **Token Scopes**: Users should create tokens with minimal required scopes
- **No Hardcoding**: OAuth credentials are not hardcoded in the app

## Rust Backend Integration

The following Tauri commands are required in `src-tauri/src/main.rs`:

```rust
#[tauri::command]
fn read_directory(path: String) -> Result<Vec<DirEntry>, String> { }

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> { }

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> { }

// Git commands
#[tauri::command]
fn git_init(path: String) -> Result<(), String> { }

#[tauri::command]
fn git_clone(url: String, path: String) -> Result<(), String> { }

#[tauri::command]
fn git_status(path: String) -> Result<GitStatus, String> { }

#[tauri::command]
fn git_branches(path: String) -> Result<Vec<GitBranch>, String> { }

#[tauri::command]
fn git_current_branch(path: String) -> Result<String, String> { }

#[tauri::command]
fn git_create_branch(path: String, branch_name: String) -> Result<(), String> { }

#[tauri::command]
fn git_checkout(path: String, branch: String) -> Result<(), String> { }

#[tauri::command]
fn git_add(path: String, file: String) -> Result<(), String> { }

#[tauri::command]
fn git_add_all(path: String) -> Result<(), String> { }

#[tauri::command]
fn git_reset(path: String, file: String) -> Result<(), String> { }

#[tauri::command]
fn git_commit(path: String, message: String, author: Option<String>, email: Option<String>) -> Result<String, String> { }

#[tauri::command]
fn git_push(path: String, remote: String, branch: Option<String>) -> Result<(), String> { }

#[tauri::command]
fn git_pull(path: String, remote: String, branch: Option<String>) -> Result<(), String> { }

#[tauri::command]
fn git_fetch(path: String, remote: String) -> Result<(), String> { }

#[tauri::command]
fn git_log(path: String, max_count: usize) -> Result<Vec<GitCommit>, String> { }

#[tauri::command]
fn git_remotes(path: String) -> Result<Vec<GitRemote>, String> { }

#[tauri::command]
fn git_add_remote(path: String, name: String, url: String) -> Result<(), String> { }

#[tauri::command]
fn git_remove_remote(path: String, name: String) -> Result<(), String> { }

#[tauri::command]
fn git_merge(path: String, branch: String) -> Result<(), String> { }

#[tauri::command]
fn git_rebase(path: String, branch: String) -> Result<(), String> { }

#[tauri::command]
fn git_discard(path: String, file: Option<String>) -> Result<(), String> { }

#[tauri::command]
fn git_stash(path: String, message: Option<String>) -> Result<(), String> { }

#[tauri::command]
fn git_stash_list(path: String) -> Result<Vec<String>, String> { }

#[tauri::command]
fn git_stash_apply(path: String, stash_id: String) -> Result<(), String> { }

#[tauri::command]
fn git_repo_info(path: String) -> Result<GitRepository, String> { }

#[tauri::command]
fn git_delete_branch(path: String, branch_name: String) -> Result<(), String> { }
```

## Troubleshooting

### Authentication Issues
- **Token not working**: Verify token has correct scopes (repo, gist, user)
- **Self-hosted GitLab/Gitea**: Make sure to enter correct API URL
- **Token expired**: Create a new token and re-authenticate

### Clone Issues
- **HTTPS vs SSH**: Use HTTPS URLs with token auth (SSH requires key setup)
- **Private repositories**: Token must have `repo` scope
- **Network errors**: Check internet connection and firewall

### Commit Issues
- **Author name/email**: Optional but recommended for proper git history
- **Large files**: Git has limits on file size (usually 100MB)
- **Binary files**: Git can track but not diff binary files

### Push/Pull Issues
- **Merge conflicts**: Resolve manually in editor, then commit
- **Permission denied**: Verify token has push access
- **Branch not found**: Create branch locally first before pushing

## Future Enhancements

- [ ] SSH key support for authentication
- [ ] Merge conflict resolution UI
- [ ] Diff viewer for file changes
- [ ] Pull request creation UI
- [ ] Issue tracker integration
- [ ] Git hooks support
- [ ] Submodule support
- [ ] Cherry-pick support
- [ ] Tag management
- [ ] Blame/history view

## Contributing

To add support for new Git providers:

1. Add provider to `GitProvider` type in `gitIntegration.ts`
2. Add provider config to `PROVIDER_CONFIGS` in `gitProviders.ts`
3. Implement API functions in `gitProviders.ts`
4. Update `MultiProviderGitAuth.tsx` to support new provider
5. Test authentication and basic operations

## Support

For issues or feature requests, please refer to the CryptArtist Studio documentation or create an issue in the repository.
