// ============================================================================
// WorkspaceProvider - React state provider for the multi-workspace system
// ============================================================================

import { useState, useCallback, useMemo, type ReactNode } from "react";
import type { CryptArtFile, CryptArtProgram } from "../utils/cryptart";
import {
  WorkspaceContext,
  INITIAL_WORKSPACE_STATE,
  generateWorkspaceId,
  generateGroupId,
  getWorkspaceColor,
  getDisplayName,
  type Workspace,
  type WorkspaceState,
  type WorkspaceGroup,
  type SharedResource,
  type WorkspaceContextType,
} from "../utils/workspace";

interface Props {
  children: ReactNode;
}

export default function WorkspaceProvider({ children }: Props) {
  const [state, setState] = useState<WorkspaceState>(INITIAL_WORKSPACE_STATE);

  // -------------------------------------------------------------------------
  // Workspace CRUD
  // -------------------------------------------------------------------------

  const openWorkspace = useCallback(
    (project: CryptArtFile, filePath: string | null): string => {
      const id = generateWorkspaceId();
      setState((prev) => {
        // Enforce max limit
        if (prev.workspaces.length >= prev.maxWorkspaces) {
          console.warn("[Workspace] Max workspaces reached:", prev.maxWorkspaces);
          return prev;
        }
        const ws: Workspace = {
          id,
          project,
          filePath,
          program: project.program,
          displayName: getDisplayName(project, filePath),
          dirty: false,
          openedAt: Date.now(),
          linkedWorkspaces: [],
          color: getWorkspaceColor(prev.workspaces.length),
        };
        return {
          ...prev,
          workspaces: [...prev.workspaces, ws],
          activeWorkspaceId: id,
        };
      });
      return id;
    },
    []
  );

  const closeWorkspace = useCallback((id: string) => {
    setState((prev) => {
      const filtered = prev.workspaces.filter((w) => w.id !== id);
      // Also remove from any groups
      const groups = prev.groups
        .map((g) => ({
          ...g,
          workspaceIds: g.workspaceIds.filter((wid) => wid !== id),
          sharedResources: g.sharedResources.filter(
            (r) => r.sourceWorkspaceId !== id && !r.targetWorkspaceIds.includes(id)
          ),
        }))
        .filter((g) => g.workspaceIds.length > 0);

      let activeId = prev.activeWorkspaceId;
      if (activeId === id) {
        // Switch to the nearest workspace
        const closedIdx = prev.workspaces.findIndex((w) => w.id === id);
        activeId =
          filtered[Math.min(closedIdx, filtered.length - 1)]?.id ?? null;
      }
      return { ...prev, workspaces: filtered, groups, activeWorkspaceId: activeId };
    });
  }, []);

  const setActiveWorkspace = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeWorkspaceId: id }));
  }, []);

  const markDirty = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.map((w) =>
        w.id === id ? { ...w, dirty: true } : w
      ),
    }));
  }, []);

  const markClean = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.map((w) =>
        w.id === id ? { ...w, dirty: false } : w
      ),
    }));
  }, []);

  const updateProject = useCallback((id: string, project: CryptArtFile) => {
    setState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.map((w) =>
        w.id === id
          ? { ...w, project, displayName: getDisplayName(project, w.filePath) }
          : w
      ),
    }));
  }, []);

  const updateFilePath = useCallback((id: string, filePath: string) => {
    setState((prev) => ({
      ...prev,
      workspaces: prev.workspaces.map((w) =>
        w.id === id
          ? { ...w, filePath, displayName: getDisplayName(w.project, filePath) }
          : w
      ),
    }));
  }, []);

  const reorderWorkspaces = useCallback((fromIndex: number, toIndex: number) => {
    setState((prev) => {
      const arr = [...prev.workspaces];
      const [moved] = arr.splice(fromIndex, 1);
      if (!moved) return prev;
      arr.splice(toIndex, 0, moved);
      return { ...prev, workspaces: arr };
    });
  }, []);

  const closeAllForProgram = useCallback((program: CryptArtProgram) => {
    setState((prev) => {
      const idsToRemove = new Set(
        prev.workspaces.filter((w) => w.program === program).map((w) => w.id)
      );
      const filtered = prev.workspaces.filter((w) => !idsToRemove.has(w.id));
      const groups = prev.groups
        .map((g) => ({
          ...g,
          workspaceIds: g.workspaceIds.filter((id) => !idsToRemove.has(id)),
        }))
        .filter((g) => g.workspaceIds.length > 0);
      const activeId = idsToRemove.has(prev.activeWorkspaceId ?? "")
        ? filtered[0]?.id ?? null
        : prev.activeWorkspaceId;
      return { ...prev, workspaces: filtered, groups, activeWorkspaceId: activeId };
    });
  }, []);

  const duplicateWorkspace = useCallback(
    (id: string): string | null => {
      const ws = state.workspaces.find((w) => w.id === id);
      if (!ws) return null;
      const deepCopy = JSON.parse(JSON.stringify(ws.project)) as CryptArtFile;
      deepCopy.name = (deepCopy.name || "Untitled") + " (Copy)";
      return openWorkspace(deepCopy, null);
    },
    [state.workspaces, openWorkspace]
  );

  // -------------------------------------------------------------------------
  // Group / Resource Sharing
  // -------------------------------------------------------------------------

  const createGroup = useCallback((name: string, workspaceIds: string[]): string => {
    const id = generateGroupId();
    setState((prev) => {
      const group: WorkspaceGroup = {
        id,
        name,
        workspaceIds,
        sharedResources: [],
        createdAt: Date.now(),
      };
      // Link workspaces to each other
      const linked = new Set(workspaceIds);
      const workspaces = prev.workspaces.map((w) => {
        if (linked.has(w.id)) {
          return {
            ...w,
            linkedWorkspaces: [...new Set([...w.linkedWorkspaces, ...workspaceIds.filter((wid) => wid !== w.id)])],
          };
        }
        return w;
      });
      return { ...prev, groups: [...prev.groups, group], workspaces };
    });
    return id;
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    setState((prev) => {
      const group = prev.groups.find((g) => g.id === groupId);
      if (!group) return prev;
      const memberIds = new Set(group.workspaceIds);
      // Unlink workspaces
      const workspaces = prev.workspaces.map((w) => {
        if (memberIds.has(w.id)) {
          return {
            ...w,
            linkedWorkspaces: w.linkedWorkspaces.filter(
              (lid) => !memberIds.has(lid)
            ),
          };
        }
        return w;
      });
      return {
        ...prev,
        groups: prev.groups.filter((g) => g.id !== groupId),
        workspaces,
      };
    });
  }, []);

  const addToGroup = useCallback((groupId: string, workspaceId: string) => {
    setState((prev) => {
      const groups = prev.groups.map((g) => {
        if (g.id === groupId && !g.workspaceIds.includes(workspaceId)) {
          return { ...g, workspaceIds: [...g.workspaceIds, workspaceId] };
        }
        return g;
      });
      const group = groups.find((g) => g.id === groupId);
      const memberIds = group ? new Set(group.workspaceIds) : new Set<string>();
      const workspaces = prev.workspaces.map((w) => {
        if (w.id === workspaceId) {
          return {
            ...w,
            linkedWorkspaces: [...new Set([...w.linkedWorkspaces, ...Array.from(memberIds).filter((id) => id !== w.id)])],
          };
        }
        if (memberIds.has(w.id)) {
          return {
            ...w,
            linkedWorkspaces: [...new Set([...w.linkedWorkspaces, workspaceId])],
          };
        }
        return w;
      });
      return { ...prev, groups, workspaces };
    });
  }, []);

  const removeFromGroup = useCallback((groupId: string, workspaceId: string) => {
    setState((prev) => {
      const groups = prev.groups
        .map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              workspaceIds: g.workspaceIds.filter((id) => id !== workspaceId),
              sharedResources: g.sharedResources.filter(
                (r) =>
                  r.sourceWorkspaceId !== workspaceId &&
                  !r.targetWorkspaceIds.includes(workspaceId)
              ),
            };
          }
          return g;
        })
        .filter((g) => g.workspaceIds.length > 0);

      const workspaces = prev.workspaces.map((w) => {
        if (w.id === workspaceId) {
          const group = prev.groups.find((g) => g.id === groupId);
          const memberIds = new Set(group?.workspaceIds || []);
          return {
            ...w,
            linkedWorkspaces: w.linkedWorkspaces.filter((lid) => !memberIds.has(lid)),
          };
        }
        return w;
      });
      return { ...prev, groups, workspaces };
    });
  }, []);

  const shareResource = useCallback(
    (groupId: string, resource: Omit<SharedResource, "lastSynced">) => {
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((g) => {
          if (g.id === groupId) {
            return {
              ...g,
              sharedResources: [
                ...g.sharedResources,
                { ...resource, lastSynced: Date.now() },
              ],
            };
          }
          return g;
        }),
      }));
    },
    []
  );

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  const getWorkspacesForProgram = useCallback(
    (program: CryptArtProgram): Workspace[] => {
      return state.workspaces.filter((w) => w.program === program);
    },
    [state.workspaces]
  );

  const getActiveWorkspace = useCallback((): Workspace | null => {
    if (!state.activeWorkspaceId) return null;
    return state.workspaces.find((w) => w.id === state.activeWorkspaceId) ?? null;
  }, [state.workspaces, state.activeWorkspaceId]);

  const getWorkspace = useCallback(
    (id: string): Workspace | null => {
      return state.workspaces.find((w) => w.id === id) ?? null;
    },
    [state.workspaces]
  );

  const getGroupForWorkspace = useCallback(
    (workspaceId: string): WorkspaceGroup | null => {
      return state.groups.find((g) => g.workspaceIds.includes(workspaceId)) ?? null;
    },
    [state.groups]
  );

  const getSharedResources = useCallback(
    (workspaceId: string): SharedResource[] => {
      const group = state.groups.find((g) => g.workspaceIds.includes(workspaceId));
      if (!group) return [];
      return group.sharedResources.filter(
        (r) =>
          r.sourceWorkspaceId === workspaceId ||
          r.targetWorkspaceIds.includes(workspaceId)
      );
    },
    [state.groups]
  );

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value = useMemo<WorkspaceContextType>(
    () => ({
      ...state,
      openWorkspace,
      closeWorkspace,
      setActiveWorkspace,
      markDirty,
      markClean,
      updateProject,
      updateFilePath,
      createGroup,
      removeGroup,
      addToGroup,
      removeFromGroup,
      shareResource,
      getWorkspacesForProgram,
      getActiveWorkspace,
      getWorkspace,
      getGroupForWorkspace,
      getSharedResources,
      reorderWorkspaces,
      closeAllForProgram,
      duplicateWorkspace,
    }),
    [
      state,
      openWorkspace,
      closeWorkspace,
      setActiveWorkspace,
      markDirty,
      markClean,
      updateProject,
      updateFilePath,
      createGroup,
      removeGroup,
      addToGroup,
      removeFromGroup,
      shareResource,
      getWorkspacesForProgram,
      getActiveWorkspace,
      getWorkspace,
      getGroupForWorkspace,
      getSharedResources,
      reorderWorkspaces,
      closeAllForProgram,
      duplicateWorkspace,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
