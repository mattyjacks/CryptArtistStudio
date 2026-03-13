// ============================================================================
// WorkspaceBar - Global tab bar showing all open .CryptArt workspaces
// Supports switching, closing, combining, and resource sharing controls.
// ============================================================================

import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspace, programLabel, programRoute } from "../utils/workspace";
import { toast } from "../utils/toast";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WorkspaceTab({
  ws,
  isActive,
  onActivate,
  onClose,
  onContextMenu,
}: {
  ws: { id: string; displayName: string; program: string; dirty: boolean; color: string; linkedWorkspaces: string[] };
  isActive: boolean;
  onActivate: () => void;
  onClose: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onActivate}
      onContextMenu={onContextMenu}
      className={`group flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-t-lg border border-b-0 transition-all whitespace-nowrap max-w-[200px] ${
        isActive
          ? "bg-studio-panel border-studio-border text-studio-text"
          : "bg-studio-bg/50 border-transparent text-studio-secondary hover:bg-studio-hover hover:text-studio-text"
      }`}
      title={`${ws.displayName} (${programLabel(ws.program)})${ws.dirty ? " - unsaved" : ""}${ws.linkedWorkspaces.length > 0 ? " - linked" : ""}`}
    >
      {/* Color dot */}
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: ws.color }}
      />
      {/* Link indicator */}
      {ws.linkedWorkspaces.length > 0 && (
        <span className="text-[8px] opacity-60">{"\u{1F517}"}</span>
      )}
      {/* Name */}
      <span className="truncate">{ws.displayName}</span>
      {/* Dirty indicator */}
      {ws.dirty && <span className="text-studio-cyan text-[8px]">{"\u25CF"}</span>}
      {/* Program badge */}
      <span className="text-[8px] px-1 py-0.5 rounded bg-studio-surface text-studio-muted flex-shrink-0">
        {programLabel(ws.program).slice(0, 3)}
      </span>
      {/* Close button */}
      <span
        onClick={onClose}
        className="ml-0.5 text-[10px] opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:text-red-400 transition-opacity flex-shrink-0 cursor-pointer"
        role="button"
        tabIndex={-1}
      >
        {"\u2715"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Context Menu
// ---------------------------------------------------------------------------

interface ContextMenuState {
  x: number;
  y: number;
  workspaceId: string;
}

function ContextMenu({
  menu,
  onClose,
  onAction,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onAction: (action: string) => void;
}) {
  const items = [
    { id: "duplicate", label: "\u{1F4CB} Duplicate Workspace" },
    { id: "close", label: "\u2715 Close" },
    { id: "close-others", label: "Close Others" },
    { id: "close-program", label: "Close All Same Program" },
    { id: "divider1", label: "" },
    { id: "combine", label: "\u{1F517} Combine with..." },
    { id: "share-media", label: "\u{1F3AC} Share Media Pool" },
    { id: "share-ai", label: "\u{1F916} Share AI Context" },
    { id: "share-settings", label: "\u2699\uFE0F Share Settings" },
  ];

  return (
    <>
      <div className="fixed inset-0 z-[998]" onClick={onClose} />
      <div
        className="fixed z-[999] bg-studio-panel border border-studio-border rounded-lg shadow-xl py-1 min-w-[200px]"
        style={{ left: menu.x, top: menu.y }}
      >
        {items.map((item) =>
          item.id.startsWith("divider") ? (
            <div key={item.id} className="border-t border-studio-border my-1" />
          ) : (
            <button
              key={item.id}
              onClick={() => onAction(item.id)}
              className="w-full text-left px-3 py-1.5 text-[11px] text-studio-text hover:bg-studio-hover transition-colors"
            >
              {item.label}
            </button>
          )
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Combine Dialog
// ---------------------------------------------------------------------------

function CombineDialog({
  sourceId,
  onClose,
}: {
  sourceId: string;
  onClose: () => void;
}) {
  const { workspaces, createGroup, getGroupForWorkspace } = useWorkspace();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [groupName, setGroupName] = useState("Combined Workspace");
  const others = workspaces.filter((w) => w.id !== sourceId);
  const existingGroup = getGroupForWorkspace(sourceId);

  const handleCombine = () => {
    if (selected.size === 0) return;
    const ids = [sourceId, ...Array.from(selected)];
    createGroup(groupName, ids);
    toast.success(`Created workspace group "${groupName}" with ${ids.length} workspaces`);
    onClose();
  };

  if (existingGroup) {
    return (
      <>
        <div className="fixed inset-0 z-[997] bg-black/50" onClick={onClose} />
        <div className="fixed z-[998] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-studio-panel border border-studio-border rounded-xl p-6 w-[400px] shadow-2xl">
          <h3 className="text-sm font-bold text-studio-text mb-2">Already in a Group</h3>
          <p className="text-[11px] text-studio-secondary mb-4">
            This workspace is already part of "{existingGroup.name}" with {existingGroup.workspaceIds.length} workspaces.
          </p>
          <button onClick={onClose} className="btn btn-cyan text-[11px] px-4 py-1.5">OK</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[997] bg-black/50" onClick={onClose} />
      <div className="fixed z-[998] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-studio-panel border border-studio-border rounded-xl p-6 w-[440px] shadow-2xl">
        <h3 className="text-sm font-bold text-studio-text mb-1">{"\u{1F517}"} Combine Workspaces</h3>
        <p className="text-[10px] text-studio-secondary mb-4">
          Select workspaces to combine into a group for sharing resources.
        </p>

        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="input text-[11px] py-1.5 w-full mb-3"
          placeholder="Group name..."
        />

        <div className="max-h-[200px] overflow-y-auto border border-studio-border rounded-lg mb-4">
          {others.length === 0 ? (
            <div className="p-4 text-[11px] text-studio-muted text-center">
              No other workspaces open. Open more .CryptArt files first.
            </div>
          ) : (
            others.map((w) => (
              <label
                key={w.id}
                className="flex items-center gap-2.5 px-3 py-2 hover:bg-studio-hover transition-colors cursor-pointer border-b border-studio-border last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selected.has(w.id)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(w.id)) next.delete(w.id);
                    else next.add(w.id);
                    setSelected(next);
                  }}
                  className="rounded"
                />
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: w.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-studio-text truncate">{w.displayName}</div>
                  <div className="text-[9px] text-studio-muted">{programLabel(w.program)}</div>
                </div>
              </label>
            ))
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn text-[11px] px-4 py-1.5">
            Cancel
          </button>
          <button
            onClick={handleCombine}
            disabled={selected.size === 0}
            className="btn btn-cyan text-[11px] px-4 py-1.5 disabled:opacity-40"
          >
            Combine {selected.size > 0 ? `(${selected.size + 1})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main WorkspaceBar
// ---------------------------------------------------------------------------

export default function WorkspaceBar() {
  const navigate = useNavigate();
  const {
    workspaces,
    activeWorkspaceId,
    groups,
    setActiveWorkspace,
    closeWorkspace,
    duplicateWorkspace,
    closeAllForProgram,
    shareResource,
    getGroupForWorkspace,
  } = useWorkspace();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [combineSource, setCombineSource] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Don't render if no workspaces are open
  if (workspaces.length === 0) return null;

  const handleActivate = (ws: { id: string; program: string }) => {
    setActiveWorkspace(ws.id);
    navigate(programRoute(ws.program));
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    closeWorkspace(id);
    // If no workspaces left, go to launcher
    if (workspaces.length <= 1) {
      navigate("/");
    }
  };

  const handleContextMenu = (e: React.MouseEvent, workspaceId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, workspaceId });
  };

  const handleContextAction = (action: string) => {
    if (!contextMenu) return;
    const wsId = contextMenu.workspaceId;
    const ws = workspaces.find((w) => w.id === wsId);

    switch (action) {
      case "close":
        closeWorkspace(wsId);
        if (workspaces.length <= 1) navigate("/");
        break;
      case "close-others":
        workspaces.filter((w) => w.id !== wsId).forEach((w) => closeWorkspace(w.id));
        break;
      case "close-program":
        if (ws) closeAllForProgram(ws.program);
        break;
      case "duplicate":
        duplicateWorkspace(wsId);
        toast.success("Workspace duplicated");
        break;
      case "combine":
        setCombineSource(wsId);
        break;
      case "share-media": {
        const group = getGroupForWorkspace(wsId);
        if (!group) {
          toast.warning("Join a group first (right-click > Combine with...)");
        } else {
          shareResource(group.id, {
            type: "media",
            label: `Media from ${ws?.displayName}`,
            sourceWorkspaceId: wsId,
            targetWorkspaceIds: group.workspaceIds.filter((id) => id !== wsId),
            data: ws?.project.data,
          });
          toast.success("Media pool shared with group");
        }
        break;
      }
      case "share-ai": {
        const grp = getGroupForWorkspace(wsId);
        if (!grp) {
          toast.warning("Join a group first");
        } else {
          shareResource(grp.id, {
            type: "ai-context",
            label: `AI context from ${ws?.displayName}`,
            sourceWorkspaceId: wsId,
            targetWorkspaceIds: grp.workspaceIds.filter((id) => id !== wsId),
            data: { messages: (ws?.project.data as Record<string, unknown>)?.chatMessages || (ws?.project.data as Record<string, unknown>)?.messages },
          });
          toast.success("AI context shared with group");
        }
        break;
      }
      case "share-settings": {
        const sgrp = getGroupForWorkspace(wsId);
        if (!sgrp) {
          toast.warning("Join a group first");
        } else {
          shareResource(sgrp.id, {
            type: "settings",
            label: `Settings from ${ws?.displayName}`,
            sourceWorkspaceId: wsId,
            targetWorkspaceIds: sgrp.workspaceIds.filter((id) => id !== wsId),
            data: { model: (ws?.project.data as Record<string, unknown>)?.model, aiProvider: (ws?.project.data as Record<string, unknown>)?.aiProvider },
          });
          toast.success("Settings shared with group");
        }
        break;
      }
    }
    setContextMenu(null);
  };

  // Group indicators
  const groupColors = new Map<string, string>();
  groups.forEach((g, i) => {
    const c = ["#00d4ff33", "#a855f733", "#22c55e33", "#f59e0b33", "#ef444433"][i % 5];
    g.workspaceIds.forEach((id) => groupColors.set(id, c));
  });

  return (
    <>
      <div className="flex items-center bg-studio-bg border-b border-studio-border select-none">
        {/* Workspace tabs - scrollable */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-end gap-0.5 overflow-x-auto scrollbar-none px-1 pt-1"
        >
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              style={groupColors.has(ws.id) ? { backgroundColor: groupColors.get(ws.id) } : undefined}
              className="rounded-t-lg"
            >
              <WorkspaceTab
                ws={ws}
                isActive={ws.id === activeWorkspaceId}
                onActivate={() => handleActivate(ws)}
                onClose={(e) => handleClose(e, ws.id)}
                onContextMenu={(e) => handleContextMenu(e, ws.id)}
              />
            </div>
          ))}
        </div>

        {/* Workspace count + groups badge */}
        <div className="flex items-center gap-2 px-2 flex-shrink-0">
          {groups.length > 0 && (
            <span className="text-[9px] text-studio-cyan px-1.5 py-0.5 rounded-full bg-studio-cyan/10 border border-studio-cyan/20">
              {groups.length} group{groups.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="text-[9px] text-studio-muted">
            {workspaces.length}/{20}
          </span>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onAction={handleContextAction}
        />
      )}

      {/* Combine dialog */}
      {combineSource && (
        <CombineDialog
          sourceId={combineSource}
          onClose={() => setCombineSource(null)}
        />
      )}
    </>
  );
}
