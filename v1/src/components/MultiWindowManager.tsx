import { useState, useCallback } from "react";
import { useMultiWindow } from "../utils/multiWindow";
import { toast } from "../utils/toast";

interface MultiWindowManagerProps {
  onWindowCreated?: (windowId: string) => void;
  onWindowClosed?: (windowId: string) => void;
}

export default function MultiWindowManager({
  onWindowCreated,
  onWindowClosed,
}: MultiWindowManagerProps) {
  const {
    windows,
    loading,
    error,
    createWindow,
    closeWindow,
    canCreate,
    getMaxWindows,
    windowCount,
  } = useMultiWindow();

  const [newWindowTitle, setNewWindowTitle] = useState("");
  const [newWindowProgram, setNewWindowProgram] = useState("media-mogul");
  const [maxWindows, setMaxWindows] = useState(10);

  // Load max windows on mount
  const handleLoadMaxWindows = useCallback(async () => {
    const max = await getMaxWindows();
    setMaxWindows(max);
  }, [getMaxWindows]);

  // Create new window
  const handleCreateWindow = useCallback(async () => {
    if (!newWindowTitle.trim()) {
      toast.error("Enter a window title");
      return;
    }

    const canCreateMore = await canCreate();
    if (!canCreateMore) {
      toast.error(`Maximum ${maxWindows} windows open. Close one to open another.`);
      return;
    }

    try {
      const windowId = await createWindow({
        title: newWindowTitle,
        program: newWindowProgram as any,
        width: 1440,
        height: 900,
      });

      toast.success(`Created window: ${newWindowTitle}`);
      setNewWindowTitle("");

      if (onWindowCreated) {
        onWindowCreated(windowId);
      }
    } catch (err) {
      toast.error(`Failed to create window: ${err}`);
    }
  }, [newWindowTitle, newWindowProgram, createWindow, canCreate, maxWindows, onWindowCreated]);

  // Close window
  const handleCloseWindow = useCallback(
    async (windowId: string) => {
      try {
        await closeWindow(windowId);
        toast.info("Window closed");

        if (onWindowClosed) {
          onWindowClosed(windowId);
        }
      } catch (err) {
        toast.error(`Failed to close window: ${err}`);
      }
    },
    [closeWindow, onWindowClosed]
  );

  if (loading) {
    return (
      <div className="p-4 text-center text-studio-muted">
        Loading windows...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-studio-bg">
      {/* Error Display */}
      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 p-3 text-[11px] rounded m-2">
          {error}
        </div>
      )}

      {/* Create Window Section */}
      <div className="flex-shrink-0 border-b border-studio-border p-3 space-y-2">
        <h3 className="text-[12px] font-semibold text-studio-text">Create New Window</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newWindowTitle}
            onChange={(e) => setNewWindowTitle(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleCreateWindow()}
            placeholder="Window title..."
            className="input flex-1 text-[11px]"
          />
          <select
            value={newWindowProgram}
            onChange={(e) => setNewWindowProgram(e.target.value)}
            className="bg-studio-panel text-[11px] text-studio-text border border-studio-border rounded px-2 py-1 outline-none"
          >
            <option value="media-mogul">Media Mogul</option>
            <option value="vibecode-worker">VibeCodeWorker</option>
            <option value="game-studio">GameStudio</option>
            <option value="valley-net">ValleyNet</option>
            <option value="demo-recorder">Demo Recorder</option>
          </select>
          <button
            onClick={handleCreateWindow}
            className="btn btn-cyan text-[11px] px-3 py-1"
          >
            + New
          </button>
        </div>
        <div className="text-[10px] text-studio-secondary">
          Windows: {windowCount} / {maxWindows}
        </div>
      </div>

      {/* Windows List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {windows.length === 0 ? (
          <div className="text-center text-studio-muted text-[11px] py-8">
            No windows open. Create one to get started.
          </div>
        ) : (
          windows.map((window) => (
            <div
              key={window.id}
              className="bg-studio-panel border border-studio-border rounded p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-studio-text">
                    {window.title}
                  </div>
                  <div className="text-[9px] text-studio-secondary">
                    {window.program}
                  </div>
                </div>
                <button
                  onClick={() => handleCloseWindow(window.id)}
                  className="btn btn-ghost text-[10px] px-2 py-1 text-studio-red hover:bg-red-900/30"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[9px] text-studio-secondary">
                <div>Size: {Math.round(window.width)} × {Math.round(window.height)}</div>
                <div>Pos: {Math.round(window.x)}, {Math.round(window.y)}</div>
                <div>
                  Status:{" "}
                  <span className={window.focused ? "text-studio-cyan" : "text-studio-muted"}>
                    {window.focused ? "Focused" : "Unfocused"}
                  </span>
                </div>
                <div>
                  {window.minimized ? (
                    <span className="text-studio-yellow">Minimized</span>
                  ) : (
                    <span className="text-studio-green">Visible</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info Footer */}
      <div className="flex-shrink-0 border-t border-studio-border p-3 text-[9px] text-studio-muted space-y-1">
        <div>✓ Multiple windows supported</div>
        <div>✓ Max {maxWindows} windows simultaneously</div>
        <div>✓ Window state auto-tracked</div>
        <div>✓ IPC communication enabled</div>
      </div>
    </div>
  );
}
