// ---------------------------------------------------------------------------
// Lightweight toast notification system (no dependencies)
// ---------------------------------------------------------------------------

import { shouldThrottleToast, truncateToastMessage } from "./security";

export type ToastType = "success" | "error" | "info" | "warning";
export type ToastPosition = "top-right" | "top-left" | "bottom-right" | "bottom-left"; // Imp 84

const MAX_TOAST_QUEUE = 10; // Vuln 39: Limit concurrent toasts

// Imp 85: Toast history for debugging
const MAX_TOAST_HISTORY = 50;
let toastHistory: { message: string; type: ToastType; time: number }[] = [];

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  persistent?: boolean; // Imp 86: Persistent toast (no auto-dismiss)
  action?: { label: string; onClick: () => void }; // Imp 87: Action button
}

let container: HTMLDivElement | null = null;
let currentPosition: ToastPosition = "top-right"; // Imp 84

function positionCSS(pos: ToastPosition): string {
  switch (pos) {
    case "top-left": return "position:fixed;top:16px;left:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:360px;";
    case "bottom-right": return "position:fixed;bottom:16px;right:16px;z-index:99999;display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none;max-width:360px;";
    case "bottom-left": return "position:fixed;bottom:16px;left:16px;z-index:99999;display:flex;flex-direction:column-reverse;gap:8px;pointer-events:none;max-width:360px;";
    default: return "position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:360px;";
  }
}

function getContainer(): HTMLDivElement {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.id = "cryptartist-toast-container";
  // Imp 88: ARIA live region for screen readers
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-atomic", "false");
  container.style.cssText = positionCSS(currentPosition);
  document.body.appendChild(container);
  return container;
}

const COLORS: Record<ToastType, { bg: string; border: string; text: string }> = {
  success: { bg: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.4)", text: "#10b981" },
  error: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.4)", text: "#ef4444" },
  info: { bg: "rgba(0,210,255,0.12)", border: "rgba(0,210,255,0.3)", text: "#00d2ff" },
  warning: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.4)", text: "#f59e0b" },
};

const ICONS: Record<ToastType, string> = {
  success: "\u2705",
  error: "\u274C",
  info: "\u{1F4A1}",
  warning: "\u26A0\uFE0F",
};

export function showToast(opts: ToastOptions): void {
  // Vuln 59: Rate limit toasts
  if (shouldThrottleToast()) return;
  const { message: rawMessage, type = "info", duration = 3500 } = opts;
  // Vuln 38: Truncate long messages
  const message = truncateToastMessage(rawMessage);
  const c = getContainer();
  // Vuln 39: Limit toast queue size
  if (c.children.length >= MAX_TOAST_QUEUE) {
    c.removeChild(c.children[0]);
  }
  const colors = COLORS[type];

  // Imp 85: Track toast history
  toastHistory.push({ message, type, time: Date.now() });
  if (toastHistory.length > MAX_TOAST_HISTORY) toastHistory.shift();

  const el = document.createElement("div");
  el.style.cssText = `
    background:${colors.bg};
    border:1px solid ${colors.border};
    color:${colors.text};
    padding:10px 16px;
    border-radius:8px;
    font-size:12px;
    font-weight:500;
    font-family:inherit;
    backdrop-filter:blur(12px);
    box-shadow:0 4px 20px rgba(0,0,0,0.3);
    pointer-events:auto;
    cursor:pointer;
    animation:slideIn 0.25s ease-out;
    display:flex;
    align-items:center;
    gap:8px;
    max-width:100%;
    word-break:break-word;
    position:relative;
    overflow:hidden;
  `;
  // Imp 88: ARIA attributes on individual toast
  el.setAttribute("role", "alert");
  const iconSpan = document.createElement("span");
  iconSpan.style.cssText = "font-size:14px;flex-shrink:0";
  iconSpan.textContent = ICONS[type];
  const msgSpan = document.createElement("span");
  msgSpan.style.cssText = "flex:1";
  msgSpan.textContent = message;
  el.appendChild(iconSpan);
  el.appendChild(msgSpan);

  // Imp 87: Action button
  if (opts.action) {
    const actionBtn = document.createElement("button");
    actionBtn.textContent = opts.action.label;
    actionBtn.style.cssText = `font-size:10px;padding:2px 8px;border-radius:4px;border:1px solid ${colors.border};background:transparent;color:${colors.text};cursor:pointer;flex-shrink:0;font-weight:bold;`;
    const handler = opts.action.onClick;
    actionBtn.onclick = (e) => { e.stopPropagation(); handler(); removeToast(el); };
    el.appendChild(actionBtn);
  }

  // Imp 89: Close button
  const closeBtn = document.createElement("span");
  closeBtn.textContent = "\u2715";
  closeBtn.style.cssText = "font-size:10px;opacity:0.5;cursor:pointer;flex-shrink:0;padding:0 2px;";
  closeBtn.onclick = (e) => { e.stopPropagation(); removeToast(el); };
  el.appendChild(closeBtn);

  el.onclick = () => removeToast(el);

  // Imp 90: Progress bar for non-persistent toasts
  if (!opts.persistent) {
    const progressBar = document.createElement("div");
    progressBar.style.cssText = `position:absolute;bottom:0;left:0;height:2px;background:${colors.text};opacity:0.4;width:100%;transform-origin:left;animation:toastProgress ${duration}ms linear forwards;`;
    el.appendChild(progressBar);
  }

  c.appendChild(el);

  // Add animation keyframes if not already present
  if (!document.getElementById("toast-keyframes")) {
    const style = document.createElement("style");
    style.id = "toast-keyframes";
    style.textContent = `
      @keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
      @keyframes slideOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(40px); } }
      @keyframes toastProgress { from { transform:scaleX(1); } to { transform:scaleX(0); } }
    `;
    document.head.appendChild(style);
  }

  // Imp 86: Skip auto-dismiss for persistent toasts
  if (!opts.persistent) {
    setTimeout(() => removeToast(el), duration);
  }
}

function removeToast(el: HTMLDivElement) {
  el.style.animation = "slideOut 0.2s ease-in forwards";
  setTimeout(() => {
    el.remove();
  }, 200);
}

// Convenience wrappers
export const toast = {
  success: (message: string, duration?: number) => showToast({ message, type: "success", duration }),
  error: (message: string, duration?: number) => showToast({ message, type: "error", duration }),
  info: (message: string, duration?: number) => showToast({ message, type: "info", duration }),
  warning: (message: string, duration?: number) => showToast({ message, type: "warning", duration }),
  // Imp 91: Toast with action button
  action: (message: string, actionLabel: string, onClick: () => void, type: ToastType = "info") =>
    showToast({ message, type, action: { label: actionLabel, onClick } }),
  // Imp 92: Persistent toast
  persistent: (message: string, type: ToastType = "info") =>
    showToast({ message, type, persistent: true }),
  // Imp 93: Set toast position
  setPosition: (pos: ToastPosition) => {
    currentPosition = pos;
    if (container && document.body.contains(container)) {
      container.style.cssText = positionCSS(pos);
    }
  },
  // Imp 94: Get toast history
  getHistory: () => [...toastHistory],
  // Imp 95: Clear all toasts
  clearAll: () => {
    const c = document.getElementById("cryptartist-toast-container");
    if (c) c.innerHTML = "";
  },
};
