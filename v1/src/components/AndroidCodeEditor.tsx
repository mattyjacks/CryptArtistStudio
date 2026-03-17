import React, { useRef, useEffect } from "react";

interface AndroidCodeEditorProps {
  content: string;
  language: string;
  onChange: (content: string) => void;
  fontSize: number;
  wordWrap: "on" | "off";
  readOnly?: boolean;
}

export function AndroidCodeEditor({
  content,
  language,
  onChange,
  fontSize,
  wordWrap,
  readOnly = false,
}: AndroidCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-studio-surface">
      <div className="flex items-center justify-between px-3 py-2 border-b border-studio-border bg-studio-panel text-[11px]">
        <span className="text-studio-secondary">{language}</span>
        <span className="text-studio-muted">{fontSize}px</span>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="flex-1 bg-studio-surface text-studio-text font-mono p-3 outline-none resize-none"
        style={{
          fontSize: `${fontSize}px`,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          whiteSpace: wordWrap === "on" ? "pre-wrap" : "pre",
          overflowWrap: wordWrap === "on" ? "break-word" : "normal",
          lineHeight: "1.6",
          color: "inherit",
          WebkitUserSelect: "text",
          userSelect: "text",
        }}
        spellCheck="false"
      />
    </div>
  );
}
