// ============================================================================
// CryptArtist Studio - Multi-Workspace Manager
// Allows opening multiple .CryptArt files simultaneously, each in its own
// workspace, with support for combining and sharing resources between them.
// ============================================================================

import { createContext, useContext } from "react";
import type { CryptArtFile, CryptArtProgram } from "./cryptart";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Workspace {
  /** Unique runtime ID for this workspace instance */
  id: string;
  /** The parsed .CryptArt project file */
  project: CryptArtFile;
  /** Absolute file path on disk (null if unsaved / new) */
  filePath: string | null;
  /** Which program this workspace belongs to */
  program: CryptArtProgram;
  /** Human-readable display name */
  displayName: string;
  /** Whether the workspace has unsaved changes */
  dirty: boolean;
  /** Timestamp when this workspace was opened */
  openedAt: number;
  /** IDs of workspaces this one is sharing resources with */
  linkedWorkspaces: string[];
  /** Color tag for visual identification in the workspace bar */
  color: string;
}

export interface SharedResource {
  /** Type of resource being shared */
  type: "media" | "ai-context" | "settings" | "files" | "chat-history";
  /** Human-readable label */
  label: string;
  /** Source workspace ID */
  sourceWorkspaceId: string;
  /** Target workspace IDs receiving this resource */
  targetWorkspaceIds: string[];
  /** The actual resource data (opaque to the manager) */
  data: unknown;
  /** Timestamp of last sync */
  lastSynced: number;
}

export interface WorkspaceGroup {
  /** Unique ID for this group */
  id: string;
  /** Display name for the combined workspace group */
  name: string;
  /** IDs of workspaces in this group */
  workspaceIds: string[];
  /** Shared resources within this group */
  sharedResources: SharedResource[];
  /** When the group was created */
  createdAt: number;
}

export interface WorkspaceState {
  /** All currently open workspaces */
  workspaces: Workspace[];
  /** The currently active (focused) workspace ID */
  activeWorkspaceId: string | null;
  /** Workspace groups (combined workspaces) */
  groups: WorkspaceGroup[];
  /** Maximum number of workspaces that can be open at once */
  maxWorkspaces: number;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export interface WorkspaceActions {
  /** Open a new workspace from a .CryptArt file */
  openWorkspace: (project: CryptArtFile, filePath: string | null) => string;
  /** Close a workspace by ID */
  closeWorkspace: (id: string) => void;
  /** Switch to a different workspace */
  setActiveWorkspace: (id: string) => void;
  /** Mark a workspace as dirty (has unsaved changes) */
  markDirty: (id: string) => void;
  /** Mark a workspace as clean (saved) */
  markClean: (id: string) => void;
  /** Update the project data for a workspace */
  updateProject: (id: string, project: CryptArtFile) => void;
  /** Update the file path for a workspace (after Save As) */
  updateFilePath: (id: string, filePath: string) => void;
  /** Create a group of workspaces for resource sharing */
  createGroup: (name: string, workspaceIds: string[]) => string;
  /** Dissolve a workspace group */
  removeGroup: (groupId: string) => void;
  /** Add a workspace to an existing group */
  addToGroup: (groupId: string, workspaceId: string) => void;
  /** Remove a workspace from a group */
  removeFromGroup: (groupId: string, workspaceId: string) => void;
  /** Share a resource from one workspace to others within a group */
  shareResource: (groupId: string, resource: Omit<SharedResource, "lastSynced">) => void;
  /** Get all workspaces for a specific program */
  getWorkspacesForProgram: (program: CryptArtProgram) => Workspace[];
  /** Get the active workspace object */
  getActiveWorkspace: () => Workspace | null;
  /** Get a workspace by ID */
  getWorkspace: (id: string) => Workspace | null;
  /** Get the group a workspace belongs to */
  getGroupForWorkspace: (workspaceId: string) => WorkspaceGroup | null;
  /** Get shared resources available to a workspace */
  getSharedResources: (workspaceId: string) => SharedResource[];
  /** Reorder workspaces (for drag-drop in the tab bar) */
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void;
  /** Close all workspaces for a program */
  closeAllForProgram: (program: CryptArtProgram) => void;
  /** Duplicate a workspace */
  duplicateWorkspace: (id: string) => string | null;
}

export type WorkspaceContextType = WorkspaceState & WorkspaceActions;

// ---------------------------------------------------------------------------
// Palette colors for workspace visual identification
// ---------------------------------------------------------------------------

const WORKSPACE_COLORS = [
  "#00d4ff", // cyan
  "#a855f7", // purple
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#3b82f6", // blue
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
  "#6366f1", // indigo
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let workspaceCounter = 0;

export function generateWorkspaceId(): string {
  workspaceCounter += 1;
  return `ws_${Date.now()}_${workspaceCounter}`;
}

export function generateGroupId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getWorkspaceColor(index: number): string {
  return WORKSPACE_COLORS[index % WORKSPACE_COLORS.length];
}

export function getDisplayName(project: CryptArtFile, filePath: string | null): string {
  if (project.name) return project.name;
  if (filePath) {
    const parts = filePath.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1].replace(/\.CryptArt$/i, "");
  }
  return `Untitled ${project.program}`;
}

// Program ID to human-readable label
export const PROGRAM_LABELS: Record<string, string> = {
  "media-mogul": "Media Mogul",
  "vibecode-worker": "VibeCodeWorker",
  "demo-recorder": "DemoRecorder",
  "valley-net": "ValleyNet",
  "game-studio": "GameStudio",
};

export function programLabel(program: string): string {
  return PROGRAM_LABELS[program] || program;
}

// Program ID to route path
export function programRoute(program: string): string {
  return `/${program}`;
}

// ---------------------------------------------------------------------------
// Context (provided from WorkspaceProvider in App)
// ---------------------------------------------------------------------------

export const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

export function useWorkspace(): WorkspaceContextType {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

export const INITIAL_WORKSPACE_STATE: WorkspaceState = {
  workspaces: [],
  activeWorkspaceId: null,
  groups: [],
  maxWorkspaces: 20,
};
