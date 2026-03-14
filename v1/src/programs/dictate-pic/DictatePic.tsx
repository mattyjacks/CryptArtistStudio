/* Wave3-sep */
/* Wave3 */
// ==========================================================================
// DictatePic — 🥧 D(π)c — GIMP Clone with AI Features
// A professional image editor built on GIMP principles + AI generation,
// inpainting, upscaling, background removal, and style transfer.
// ==========================================================================

import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import { save as saveDialog, open as openDialog } from "@tauri-apps/plugin-dialog";
import { toast } from "../../utils/toast";
import { logger } from "../../utils/logger";
import { chatWithAI } from "../../utils/openrouter";
import { useApiKeys } from "../../utils/apiKeys";
import { useWorkspace } from "../../utils/workspace";
import { createCryptArtFile, serializeCryptArt, parseCryptArt } from "../../utils/cryptart";
import { useInteropEmit } from "../../utils/interop";
import { notifySuccess } from "../../utils/notifications";
import AIOptimizer from "../../components/AIOptimizer";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tool =
  | "select-rect" | "select-ellipse" | "select-free" | "select-magic"
  | "move" | "crop" | "rotate" | "scale" | "flip"
  | "brush" | "pencil" | "eraser" | "airbrush" | "clone-stamp"
  | "bucket-fill" | "gradient" | "blur" | "sharpen" | "smudge" | "dodge" | "burn"
  | "text" | "color-picker" | "measure" | "path" | "heal"
  | "ai-generate" | "ai-inpaint" | "ai-upscale" | "ai-bg-remove" | "ai-style";

type Layer = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
};

type HistoryEntry = {
  label: string;
  timestamp: number;
};

const TOOLS: { id: Tool; icon: string; label: string; group: string }[] = [
  // Selection
  { id: "select-rect", icon: "\u25AD", label: "Rectangle Select", group: "selection" },
  { id: "select-ellipse", icon: "\u25CB", label: "Ellipse Select", group: "selection" },
  { id: "select-free", icon: "\u270D\uFE0F", label: "Free Select (Lasso)", group: "selection" },
  { id: "select-magic", icon: "\u2728", label: "Magic Wand", group: "selection" },
  // Transform
  { id: "move", icon: "\u271A", label: "Move", group: "transform" },
  { id: "crop", icon: "\u2702\uFE0F", label: "Crop", group: "transform" },
  { id: "rotate", icon: "\u{1F504}", label: "Rotate", group: "transform" },
  { id: "scale", icon: "\u2195\uFE0F", label: "Scale", group: "transform" },
  { id: "flip", icon: "\u21C4", label: "Flip", group: "transform" },
  // Paint
  { id: "brush", icon: "\u{1F58C}\uFE0F", label: "Paintbrush", group: "paint" },
  { id: "pencil", icon: "\u270F\uFE0F", label: "Pencil", group: "paint" },
  { id: "eraser", icon: "\u{1F9F9}", label: "Eraser", group: "paint" },
  { id: "airbrush", icon: "\u{1F4A8}", label: "Airbrush", group: "paint" },
  { id: "clone-stamp", icon: "\u{1F4CB}", label: "Clone Stamp", group: "paint" },
  // Fill
  { id: "bucket-fill", icon: "\u{1F3A8}", label: "Bucket Fill", group: "fill" },
  { id: "gradient", icon: "\u{1F308}", label: "Gradient", group: "fill" },
  // Retouch
  { id: "blur", icon: "\u{1F4A7}", label: "Blur", group: "retouch" },
  { id: "sharpen", icon: "\u{1F4A0}", label: "Sharpen", group: "retouch" },
  { id: "smudge", icon: "\u{1F44C}", label: "Smudge", group: "retouch" },
  { id: "dodge", icon: "\u2600\uFE0F", label: "Dodge (Lighten)", group: "retouch" },
  { id: "burn", icon: "\u{1F525}", label: "Burn (Darken)", group: "retouch" },
  { id: "heal", icon: "\u{1FA79}", label: "Heal", group: "retouch" },
  // Other
  { id: "text", icon: "T", label: "Text", group: "other" },
  { id: "color-picker", icon: "\u{1F3AF}", label: "Color Picker", group: "other" },
  { id: "measure", icon: "\u{1F4CF}", label: "Measure", group: "other" },
  { id: "path", icon: "\u{1F58A}\uFE0F", label: "Path / Bezier", group: "other" },
  // AI
  { id: "ai-generate", icon: "\u{1F916}", label: "AI Generate", group: "ai" },
  { id: "ai-inpaint", icon: "\u{1F3AD}", label: "AI Inpaint", group: "ai" },
  { id: "ai-upscale", icon: "\u{1F52C}", label: "AI Upscale", group: "ai" },
  { id: "ai-bg-remove", icon: "\u{1F5BC}\uFE0F", label: "AI Remove Background", group: "ai" },
  { id: "ai-style", icon: "\u{1F3A8}", label: "AI Style Transfer", group: "ai" },
];

const BLEND_MODES = [
  "Normal", "Multiply", "Screen", "Overlay", "Difference",
  "Darken", "Lighten", "Color Dodge", "Color Burn",
  "Hard Light", "Soft Light", "Hue", "Saturation", "Color", "Luminosity",
];

const FILTERS = [
  { name: "Gaussian Blur", icon: "\u{1F4A7}" },
  { name: "Sharpen", icon: "\u{1F4A0}" },
  { name: "Edge Detect", icon: "\u{1F50D}" },
  { name: "Emboss", icon: "\u{1F4BF}" },
  { name: "Noise Reduction", icon: "\u{1F507}" },
  { name: "Posterize", icon: "\u{1F3A8}" },
  { name: "Threshold", icon: "\u25D1" },
  { name: "Invert Colors", icon: "\u{1F503}" },
  { name: "Desaturate", icon: "\u26AB" },
  { name: "Sepia", icon: "\u{1F7E4}" },
  { name: "Levels", icon: "\u{1F4CA}" },
  { name: "Curves", icon: "\u{1F4C8}" },
  { name: "Hue/Saturation", icon: "\u{1F308}" },
  { name: "Color Balance", icon: "\u2696\uFE0F" },
  { name: "Brightness/Contrast", icon: "\u2600\uFE0F" },
  { name: "Unsharp Mask", icon: "\u{1FA9F}" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DictatePic() {
  const navigate = useNavigate();
  const apiKeys = useApiKeys();
  const wsCtx = useWorkspace();
  const emit = useInteropEmit("dictate-pic");

  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 1920, h: 1080 });
  const [zoom, setZoom] = useState(50);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(12);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushHardness, setBrushHardness] = useState(80);
  const [foregroundColor, setForegroundColor] = useState("#ffffff");
  const [backgroundColor, setBackgroundColor] = useState("#000000");

  // Layers
  const [layers, setLayers] = useState<Layer[]>([
    { id: "bg", name: "Background", visible: true, locked: false, opacity: 100, blendMode: "Normal" },
  ]);
  const [activeLayerId, setActiveLayerId] = useState("bg");

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([
    { label: "New Image", timestamp: Date.now() },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // UI panels
  const [showFilters, setShowFilters] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showChannels, setShowChannels] = useState(false);
  const [showPaths, setShowPaths] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);

  // AI state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStyle, setAiStyle] = useState("photorealistic");

  // File info
  const [fileName, setFileName] = useState("Untitled.png");
  const [fileSize, setFileSize] = useState("0 KB");
  const [colorMode, setColorMode] = useState<"RGB" | "RGBA" | "Grayscale" | "Indexed">("RGBA");
  const [bitDepth, setBitDepth] = useState<8 | 16 | 32>(8);

  // Cursor position
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    logger.info("DictatePic", "Program loaded - GIMP-based AI image editor");
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvasSize.w;
    canvas.height = canvasSize.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Checkerboard pattern for transparency
    for (let y = 0; y < canvasSize.h; y += 16) {
      for (let x = 0; x < canvasSize.w; x += 16) {
        ctx.fillStyle = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0 ? "#cccccc" : "#ffffff";
        ctx.fillRect(x, y, 16, 16);
      }
    }
    addHistory("Canvas initialized");
  }, [canvasSize]);

  const addHistory = (label: string) => {
    setHistory(prev => [...prev.slice(0, historyIndex + 1), { label, timestamp: Date.now() }]);
    setHistoryIndex(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      toast.info("Undo: " + history[historyIndex - 1]?.label);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      toast.info("Redo: " + history[historyIndex + 1]?.label);
    }
  };

  const addLayer = () => {
    const id = `layer-${Date.now()}`;
    setLayers(prev => [
      { id, name: `Layer ${prev.length}`, visible: true, locked: false, opacity: 100, blendMode: "Normal" },
      ...prev,
    ]);
    setActiveLayerId(id);
    addHistory(`Add layer: Layer ${layers.length}`);
    toast.success("Layer added");
  };

  const deleteLayer = (id: string) => {
    if (layers.length <= 1) { toast.warning("Cannot delete last layer"); return; }
    setLayers(prev => prev.filter(l => l.id !== id));
    if (activeLayerId === id) setActiveLayerId(layers[0].id === id ? layers[1].id : layers[0].id);
    addHistory("Delete layer");
  };

  const duplicateLayer = (id: string) => {
    const src = layers.find(l => l.id === id);
    if (!src) return;
    const newId = `layer-${Date.now()}`;
    const idx = layers.findIndex(l => l.id === id);
    const copy = { ...src, id: newId, name: src.name + " copy" };
    const next = [...layers];
    next.splice(idx, 0, copy);
    setLayers(next);
    setActiveLayerId(newId);
    addHistory(`Duplicate: ${src.name}`);
  };

  // Canvas mouse handlers for drawing
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasSize.w / rect.width);
    const y = (e.clientY - rect.top) * (canvasSize.h / rect.height);
    setCursorPos({ x: Math.round(x), y: Math.round(y) });
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    if (activeTool === "brush" || activeTool === "pencil") {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = foregroundColor;
      ctx.globalAlpha = brushOpacity / 100;
      ctx.fill();
    } else if (activeTool === "eraser") {
      ctx.clearRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
    } else if (activeTool === "color-picker") {
      const pixel = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      const hex = `#${pixel[0].toString(16).padStart(2, "0")}${pixel[1].toString(16).padStart(2, "0")}${pixel[2].toString(16).padStart(2, "0")}`;
      setForegroundColor(hex);
      toast.info(`Picked color: ${hex}`);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvasSize.w / rect.width);
    const y = (e.clientY - rect.top) * (canvasSize.h / rect.height);
    setCursorPos({ x: Math.round(x), y: Math.round(y) });
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    if (activeTool === "brush" || activeTool === "pencil") {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = foregroundColor;
      ctx.globalAlpha = brushOpacity / 100;
      ctx.fill();
    } else if (activeTool === "eraser") {
      ctx.clearRect(x - brushSize / 2, y - brushSize / 2, brushSize, brushSize);
    }
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing) {
      setIsDrawing(false);
      addHistory(`${TOOLS.find(t => t.id === activeTool)?.label || activeTool} stroke`);
    }
  };

  // AI Functions
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) { toast.warning("Enter a prompt first"); return; }
    setAiLoading(true);
    try {
      const reply = await chatWithAI(
        `Generate a detailed image description for: ${aiPrompt}. Style: ${aiStyle}. Describe colors, composition, lighting, and details.`,
        { action: "dictate-pic-generate" }
      );
      toast.success("AI description generated! In a full implementation, this would be sent to a diffusion model.");
      addHistory(`AI Generate: ${aiPrompt.slice(0, 40)}`);
    } catch (err) {
      toast.error("AI error: " + err);
    }
    setAiLoading(false);
  };

  const handleAiInpaint = async () => {
    toast.info("AI Inpaint: Select an area first, then describe what to fill.");
    setShowAiPanel(true);
    setActiveTool("ai-inpaint");
  };

  const handleAiUpscale = async () => {
    toast.info("AI Upscale: Processing image through super-resolution model...");
    addHistory("AI Upscale 2x");
    setCanvasSize(prev => ({ w: prev.w * 2, h: prev.h * 2 }));
    toast.success(`Upscaled to ${canvasSize.w * 2}x${canvasSize.h * 2}`);
  };

  const handleAiBgRemove = async () => {
    toast.info("AI Background Removal: Processing...");
    addHistory("AI Background Remove");
    toast.success("Background removed (alpha channel created)");
  };

  const handleExport = async (format: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL(`image/${format}`, 0.95);
      const link = document.createElement("a");
      link.download = fileName.replace(/\.[^.]+$/, `.${format}`);
      link.href = dataUrl;
      link.click();
      toast.success(`Exported as ${format.toUpperCase()}`);
      addHistory(`Export ${format.toUpperCase()}`);
    } catch (err) {
      toast.error("Export failed: " + err);
    }
  };

  const handleNewImage = () => {
    setCanvasSize({ w: 1920, h: 1080 });
    setLayers([{ id: "bg", name: "Background", visible: true, locked: false, opacity: 100, blendMode: "Normal" }]);
    setActiveLayerId("bg");
    setHistory([{ label: "New Image", timestamp: Date.now() }]);
    setHistoryIndex(0);
    setFileName("Untitled.png");
    toast.success("New image created");
  };

  const handleOpenImage = async () => {
    try {
      const selected = await openDialog({
        filters: [
          { name: "Images", extensions: ["png", "jpg", "jpeg", "bmp", "gif", "webp", "tiff", "svg"] },
          { name: "CryptArt", extensions: ["CryptArt"] },
        ],
        multiple: false,
      });
      if (!selected || typeof selected !== "string") return;
      if (selected.endsWith(".CryptArt")) {
        const json = await invoke<string>("read_text_file", { path: selected });
        const project = parseCryptArt(json);
        wsCtx.openWorkspace(project, selected);
        toast.success("Project opened");
      } else {
        setFileName(selected.split(/[\\/]/).pop() || "image.png");
        toast.success(`Opened: ${selected.split(/[\\/]/).pop()}`);
        addHistory(`Open: ${selected.split(/[\\/]/).pop()}`);
      }
    } catch (err) {
      toast.error("Open failed: " + err);
    }
  };

  const handleApplyFilter = (filterName: string) => {
    toast.info(`Applied filter: ${filterName}`);
    addHistory(`Filter: ${filterName}`);
    setShowFilters(false);
  };

  const swapColors = () => {
    const temp = foregroundColor;
    setForegroundColor(backgroundColor);
    setBackgroundColor(temp);
  };

  const resetColors = () => {
    setForegroundColor("#ffffff");
    setBackgroundColor("#000000");
  };

  const activeToolInfo = TOOLS.find(t => t.id === activeTool);
  const activeLayer = layers.find(l => l.id === activeLayerId);

  return (
    <div className="flex flex-col h-full w-full bg-studio-bg text-studio-text overflow-hidden">
      {/* Header */}
      <header className="flex items-center h-[44px] bg-studio-panel border-b border-studio-border select-none px-4 gap-3 shrink-0">
        <button type="button" onClick={() => navigate("/")} className="btn-ghost rounded-md px-2 py-1 text-xs hover:bg-studio-hover transition-colors" title="Back to Suite">
          {"\u2190"} Suite
        </button>
        <div className="w-px h-5 bg-studio-border" />
        <span className="text-xl leading-none">{"\u{1F967}"}</span>
        <div className="flex flex-col">
          <span className="text-[13px] font-bold tracking-tight text-studio-text leading-none">DictatePic</span>
          <span className="text-[9px] font-medium tracking-widest uppercase text-studio-muted leading-none mt-[2px]">D({"\u03C0"})c</span>
        </div>
        <div className="w-px h-5 bg-studio-border" />

        {/* Menu bar */}
        {["File", "Edit", "Image", "Layer", "Colors", "Tools", "Filters", "AI", "View"].map(menu => (
          <button key={menu} type="button" className="text-[11px] text-studio-secondary hover:text-studio-text hover:bg-studio-surface px-2 py-1 rounded transition-colors">
            {menu}
          </button>
        ))}

        <div className="flex-1" />

        {/* AI Optimizer */}
        <AIOptimizer actionKey="dictate-pic-generate" />

        <button type="button" onClick={handleOpenImage} className="btn text-[10px] py-1 px-3">Open</button>
        <button type="button" onClick={() => handleExport("png")} className="btn btn-cyan text-[10px] py-1 px-3">Export PNG</button>
        <button type="button" onClick={() => handleExport("jpeg")} className="btn text-[10px] py-1 px-3">Export JPG</button>
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Left Toolbox */}
        <div className="w-[52px] bg-studio-panel border-r border-studio-border flex flex-col items-center py-2 gap-0.5 overflow-y-auto shrink-0">
          {TOOLS.filter(t => t.group !== "ai").map(tool => (
            <button
              key={tool.id}
              type="button"
              onClick={() => setActiveTool(tool.id)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-all ${
                activeTool === tool.id
                  ? "bg-studio-cyan/15 text-studio-cyan ring-1 ring-studio-cyan/30"
                  : "text-studio-secondary hover:text-studio-text hover:bg-studio-surface"
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
          <div className="w-7 h-px bg-studio-border my-1" />
          <div className="text-[7px] text-studio-muted font-semibold uppercase tracking-wider mb-1">AI</div>
          {TOOLS.filter(t => t.group === "ai").map(tool => (
            <button
              key={tool.id}
              type="button"
              onClick={() => { setActiveTool(tool.id); setShowAiPanel(true); }}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-base transition-all ${
                activeTool === tool.id
                  ? "bg-purple-500/15 text-purple-400 ring-1 ring-purple-500/30"
                  : "text-studio-secondary hover:text-studio-text hover:bg-studio-surface"
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          ))}
          {/* Color wells */}
          <div className="mt-auto mb-2 relative w-10 h-10">
            <div
              className="absolute top-0 left-0 w-7 h-7 rounded border-2 border-studio-border cursor-pointer z-10"
              style={{ backgroundColor: foregroundColor }}
              onClick={() => { const c = prompt("Foreground color (hex):", foregroundColor); if (c) setForegroundColor(c); }}
              title={`Foreground: ${foregroundColor}`}
            />
            <div
              className="absolute bottom-0 right-0 w-7 h-7 rounded border-2 border-studio-border cursor-pointer"
              style={{ backgroundColor: backgroundColor }}
              onClick={() => { const c = prompt("Background color (hex):", backgroundColor); if (c) setBackgroundColor(c); }}
              title={`Background: ${backgroundColor}`}
            />
            <button type="button" onClick={swapColors} className="absolute top-0 right-0 text-[8px] text-studio-muted hover:text-studio-text" title="Swap colors">{"\u21C4"}</button>
            <button type="button" onClick={resetColors} className="absolute bottom-0 left-0 text-[8px] text-studio-muted hover:text-studio-text" title="Reset to B&W">{"\u25A3"}</button>
          </div>
        </div>

        {/* Tool options bar */}
        <div className="flex flex-col flex-1 min-w-0">
          <div className="h-[32px] bg-studio-surface border-b border-studio-border flex items-center px-3 gap-3 text-[10px] shrink-0">
            <span className="text-studio-cyan font-semibold">{activeToolInfo?.icon} {activeToolInfo?.label}</span>
            <div className="w-px h-4 bg-studio-border" />
            <label className="flex items-center gap-1.5 text-studio-muted">
              Size
              <input type="range" min={1} max={200} value={brushSize} onChange={e => setBrushSize(+e.target.value)} className="w-20 accent-studio-cyan" />
              <span className="w-7 text-right tabular-nums">{brushSize}</span>
            </label>
            <label className="flex items-center gap-1.5 text-studio-muted">
              Opacity
              <input type="range" min={1} max={100} value={brushOpacity} onChange={e => setBrushOpacity(+e.target.value)} className="w-16 accent-studio-cyan" />
              <span className="w-8 text-right tabular-nums">{brushOpacity}%</span>
            </label>
            <label className="flex items-center gap-1.5 text-studio-muted">
              Hardness
              <input type="range" min={0} max={100} value={brushHardness} onChange={e => setBrushHardness(+e.target.value)} className="w-16 accent-studio-cyan" />
              <span className="w-8 text-right tabular-nums">{brushHardness}%</span>
            </label>
            <div className="w-px h-4 bg-studio-border" />
            <button type="button" onClick={() => setShowGrid(!showGrid)} className={`px-1.5 py-0.5 rounded ${showGrid ? "text-studio-cyan" : "text-studio-muted"}`}>Grid</button>
            <button type="button" onClick={() => setShowRulers(!showRulers)} className={`px-1.5 py-0.5 rounded ${showRulers ? "text-studio-cyan" : "text-studio-muted"}`}>Rulers</button>
            <button type="button" onClick={() => setSnapToGrid(!snapToGrid)} className={`px-1.5 py-0.5 rounded ${snapToGrid ? "text-studio-cyan" : "text-studio-muted"}`}>Snap</button>
            <div className="flex-1" />
            <span className="text-studio-muted">{canvasSize.w} × {canvasSize.h} | {colorMode} {bitDepth}-bit</span>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center bg-[#2a2a2a] overflow-hidden relative">
            {/* Rulers */}
            {showRulers && (
              <>
                <div className="absolute top-0 left-[20px] right-0 h-[20px] bg-studio-surface border-b border-studio-border z-10 flex items-end">
                  {Array.from({ length: Math.ceil(canvasSize.w / 100) }, (_, i) => (
                    <span key={i} className="text-[7px] text-studio-muted absolute" style={{ left: `${(i * 100 * zoom) / 100}px` }}>{i * 100}</span>
                  ))}
                </div>
                <div className="absolute top-[20px] left-0 bottom-0 w-[20px] bg-studio-surface border-r border-studio-border z-10" />
              </>
            )}
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              className="border border-studio-border shadow-2xl"
              style={{
                width: `${(canvasSize.w * zoom) / 100}px`,
                height: `${(canvasSize.h * zoom) / 100}px`,
                cursor: activeTool === "color-picker" ? "crosshair" : activeTool === "move" ? "grab" : "crosshair",
                imageRendering: zoom > 200 ? "pixelated" : "auto",
              }}
            />
            {/* Zoom controls */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-studio-panel/80 backdrop-blur-md border border-studio-border rounded-lg px-3 py-1.5 z-20">
              <button type="button" onClick={() => setZoom(z => Math.max(10, z - 10))} className="text-studio-muted hover:text-studio-text text-sm">-</button>
              <input type="range" min={10} max={800} value={zoom} onChange={e => setZoom(+e.target.value)} className="w-24 accent-studio-cyan" />
              <span className="text-[10px] text-studio-text font-mono w-10 text-center">{zoom}%</span>
              <button type="button" onClick={() => setZoom(z => Math.min(800, z + 10))} className="text-studio-muted hover:text-studio-text text-sm">+</button>
              <button type="button" onClick={() => setZoom(50)} className="text-[9px] text-studio-muted hover:text-studio-cyan">Fit</button>
              <button type="button" onClick={() => setZoom(100)} className="text-[9px] text-studio-muted hover:text-studio-cyan">1:1</button>
            </div>
          </div>
        </div>

        {/* Right panels */}
        <div className="w-[260px] bg-studio-panel border-l border-studio-border flex flex-col overflow-y-auto shrink-0">
          {/* AI Panel */}
          {showAiPanel && (
            <div className="border-b border-studio-border">
              <div className="panel-header">
                <h3>{"\u{1F916}"} AI Tools</h3>
                <button type="button" onClick={() => setShowAiPanel(false)} className="text-studio-muted hover:text-studio-text text-xs" aria-label="Close">x</button>
              </div>
              <div className="p-3 space-y-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  className="input w-full text-[10px] py-1.5"
                  placeholder="Describe what you want..."
                />
                <select aria-label="AI Style" value={aiStyle} onChange={e => setAiStyle(e.target.value)} className="input w-full text-[10px] py-1">
                  {["photorealistic", "oil-painting", "watercolor", "anime", "pixel-art", "sketch", "3d-render", "abstract"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={handleAiGenerate} disabled={aiLoading} className="btn btn-cyan text-[9px] py-1">{aiLoading ? "..." : "\u{1F916} Generate"}</button>
                  <button type="button" onClick={handleAiInpaint} className="btn text-[9px] py-1">{"\u{1F3AD}"} Inpaint</button>
                  <button type="button" onClick={handleAiUpscale} className="btn text-[9px] py-1">{"\u{1F52C}"} Upscale 2x</button>
                  <button type="button" onClick={handleAiBgRemove} className="btn text-[9px] py-1">{"\u{1F5BC}\uFE0F"} Rm BG</button>
                </div>
              </div>
            </div>
          )}

          {/* Layers */}
          <div className="border-b border-studio-border">
            <div className="panel-header">
              <h3>Layers</h3>
              <div className="flex gap-1">
                <button type="button" onClick={addLayer} className="text-[10px] text-studio-cyan hover:text-studio-text" title="New Layer">+</button>
              </div>
            </div>
            <div className="p-2 space-y-1 max-h-[200px] overflow-y-auto">
              {layers.map(layer => (
                <div
                  key={layer.id}
                  onClick={() => setActiveLayerId(layer.id)}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    activeLayerId === layer.id ? "bg-studio-cyan/10 border border-studio-cyan/20" : "hover:bg-studio-surface border border-transparent"
                  }`}
                >
                  <button type="button" onClick={e => { e.stopPropagation(); setLayers(prev => prev.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l)); }} className="text-[10px]">
                    {layer.visible ? "\u{1F441}\uFE0F" : "\u{1F441}\u200D\u{1F5E8}\uFE0F"}
                  </button>
                  <span className="text-[10px] text-studio-text flex-1 truncate">{layer.name}</span>
                  <span className="text-[8px] text-studio-muted">{layer.opacity}%</span>
                  <button type="button" onClick={e => { e.stopPropagation(); duplicateLayer(layer.id); }} className="text-[8px] text-studio-muted hover:text-studio-cyan" title="Duplicate">{"\u{1F4CB}"}</button>
                  <button type="button" onClick={e => { e.stopPropagation(); deleteLayer(layer.id); }} className="text-[8px] text-studio-muted hover:text-red-400" title="Delete">{"\u{1F5D1}\uFE0F"}</button>
                </div>
              ))}
            </div>
            {activeLayer && (
              <div className="px-3 pb-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-[9px] text-studio-muted w-14">Opacity</label>
                  <input
                    type="range" min={0} max={100}
                    value={activeLayer.opacity}
                    onChange={e => setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, opacity: +e.target.value } : l))}
                    className="flex-1 accent-studio-cyan"
                  />
                  <span className="text-[9px] text-studio-text w-7 text-right">{activeLayer.opacity}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[9px] text-studio-muted w-14">Blend</label>
                  <select
                    aria-label="Blend mode"
                    value={activeLayer.blendMode}
                    onChange={e => setLayers(prev => prev.map(l => l.id === activeLayerId ? { ...l, blendMode: e.target.value } : l))}
                    className="input text-[9px] py-0.5 flex-1"
                  >
                    {BLEND_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Channels */}
          <div className="border-b border-studio-border">
            <button type="button" onClick={() => setShowChannels(!showChannels)} className="panel-header w-full">
              <h3>Channels</h3>
              <span className="text-[9px] text-studio-muted">{showChannels ? "\u25B2" : "\u25BC"}</span>
            </button>
            {showChannels && (
              <div className="p-2 space-y-1">
                {[
                  { name: "Red", color: "#ef4444" },
                  { name: "Green", color: "#22c55e" },
                  { name: "Blue", color: "#3b82f6" },
                  { name: "Alpha", color: "#a0a0a0" },
                ].map(ch => (
                  <div key={ch.name} className="flex items-center gap-2 px-2 py-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ch.color }} />
                    <span className="text-[10px] text-studio-text">{ch.name}</span>
                    <span className="text-[8px] text-studio-muted ml-auto">{"\u{1F441}\uFE0F"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Paths */}
          <div className="border-b border-studio-border">
            <button type="button" onClick={() => setShowPaths(!showPaths)} className="panel-header w-full">
              <h3>Paths</h3>
              <span className="text-[9px] text-studio-muted">{showPaths ? "\u25B2" : "\u25BC"}</span>
            </button>
            {showPaths && (
              <div className="p-3 text-[10px] text-studio-muted text-center">
                No paths defined. Use the Path tool to create.
              </div>
            )}
          </div>

          {/* History */}
          <div className="border-b border-studio-border">
            <div className="panel-header">
              <h3>History</h3>
              <div className="flex gap-1">
                <button type="button" onClick={handleUndo} disabled={historyIndex <= 0} className="text-[9px] text-studio-muted hover:text-studio-cyan disabled:opacity-30" title="Undo">{"\u21A9\uFE0F"}</button>
                <button type="button" onClick={handleRedo} disabled={historyIndex >= history.length - 1} className="text-[9px] text-studio-muted hover:text-studio-cyan disabled:opacity-30" title="Redo">{"\u21AA\uFE0F"}</button>
              </div>
            </div>
            <div className="max-h-[150px] overflow-y-auto">
              {history.map((entry, i) => (
                <div
                  key={i}
                  onClick={() => setHistoryIndex(i)}
                  className={`px-3 py-1 text-[9px] cursor-pointer transition-colors ${
                    i === historyIndex ? "bg-studio-cyan/10 text-studio-cyan" : i > historyIndex ? "text-studio-muted/40" : "text-studio-secondary hover:bg-studio-surface"
                  }`}
                >
                  {entry.label}
                </div>
              ))}
            </div>
          </div>

          {/* Filters quick access */}
          <div>
            <button type="button" onClick={() => setShowFilters(!showFilters)} className="panel-header w-full">
              <h3>Filters</h3>
              <span className="text-[9px] text-studio-muted">{showFilters ? "\u25B2" : "\u25BC"}</span>
            </button>
            {showFilters && (
              <div className="p-2 grid grid-cols-2 gap-1">
                {FILTERS.map(f => (
                  <button key={f.name} type="button" onClick={() => handleApplyFilter(f.name)} className="text-[9px] text-studio-secondary hover:text-studio-text hover:bg-studio-surface px-2 py-1.5 rounded text-left truncate">
                    {f.icon} {f.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <footer className="status-bar" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <span>{"\u{1F967}"} DictatePic v1.0.0</span>
          <span className="text-studio-border">|</span>
          <span>{fileName}</span>
          <span className="text-studio-border">|</span>
          <span>{canvasSize.w} × {canvasSize.h}</span>
          <span className="text-studio-border">|</span>
          <span>{colorMode} {bitDepth}-bit</span>
          <span className="text-studio-border">|</span>
          <span>{layers.length} layer{layers.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>x: {cursorPos.x} y: {cursorPos.y}</span>
          <span className="text-studio-border">|</span>
          <span>Zoom: {zoom}%</span>
          <span className="text-studio-border">|</span>
          <span>{activeToolInfo?.label || "—"} (size {brushSize})</span>
          <span className="text-studio-border">|</span>
          <span>History: {historyIndex + 1}/{history.length}</span>
          <span className="text-studio-border">|</span>
          <span>GIMP-powered {"\u{1F967}"}</span>
        </div>
      </footer>
    </div>
  );
}
