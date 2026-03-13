// ---------------------------------------------------------------------------
// Lightweight toast notification system (no dependencies)
// ---------------------------------------------------------------------------

export type ToastType = "success" | "error" | "info" | "warning";

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

let container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (container && document.body.contains(container)) return container;
  container = document.createElement("div");
  container.id = "cryptartist-toast-container";
  container.style.cssText =
    "position:fixed;top:16px;right:16px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none;max-width:360px;";
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
  const { message, type = "info", duration = 3500 } = opts;
  const c = getContainer();
  const colors = COLORS[type];

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
  `;
  el.innerHTML = `<span style="font-size:14px;flex-shrink:0">${ICONS[type]}</span><span>${message}</span>`;
  el.onclick = () => removeToast(el);

  c.appendChild(el);

  // Add animation keyframes if not already present
  if (!document.getElementById("toast-keyframes")) {
    const style = document.createElement("style");
    style.id = "toast-keyframes";
    style.textContent = `
      @keyframes slideIn { from { opacity:0; transform:translateX(40px); } to { opacity:1; transform:translateX(0); } }
      @keyframes slideOut { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(40px); } }
    `;
    document.head.appendChild(style);
  }

  setTimeout(() => removeToast(el), duration);
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
};
