import React, { useState } from "react";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
  expanded?: boolean;
}

interface AndroidFileExplorerProps {
  fileTree: FileNode[];
  onFileSelect: (node: FileNode) => void;
  onToggleDirectory: (node: FileNode) => void;
  activeFilePath: string | null;
}

export function AndroidFileExplorer({
  fileTree,
  onFileSelect,
  onToggleDirectory,
  activeFilePath,
}: AndroidFileExplorerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const renderTree = (nodes: FileNode[], depth = 0): JSX.Element[] => {
    return nodes
      .filter((node) =>
        !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .map((node) => (
        <div key={node.path}>
          <button
            onClick={() => {
              if (node.type === "directory") {
                onToggleDirectory(node);
              } else {
                onFileSelect(node);
              }
            }}
            className={`w-full text-left px-3 py-2 flex items-center gap-2 active:bg-studio-hover rounded transition-colors ${
              activeFilePath === node.path
                ? "bg-studio-hover text-studio-text"
                : "text-studio-secondary"
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <span className="text-[14px] flex-shrink-0">
              {node.type === "directory"
                ? node.expanded
                  ? "📂"
                  : "📁"
                : "📄"}
            </span>
            <span className="truncate flex-1 text-[12px]">{node.name}</span>
          </button>
          {node.type === "directory" && node.expanded && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      ));
  };

  return (
    <div className="flex flex-col h-full bg-studio-panel">
      <div className="p-2 border-b border-studio-border">
        <input
          type="text"
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input w-full text-[12px] py-1.5 px-2"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {fileTree.length > 0 ? (
          renderTree(fileTree)
        ) : (
          <div className="flex items-center justify-center h-full text-[12px] text-studio-muted">
            No files
          </div>
        )}
      </div>
    </div>
  );
}
