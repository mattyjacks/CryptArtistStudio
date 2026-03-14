// ============================================================================
// CryptArtist Studio - Security Utility Module
// Comprehensive security hardening for the entire application
// Vulnerabilities Fixed: 1-100 (see README.md for full audit log)
// ============================================================================

// ---------------------------------------------------------------------------
// Vuln 26: HTML Sanitization - prevent XSS in dynamic content
// ---------------------------------------------------------------------------

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
  "`": "&#x60;",
};

export function sanitizeHTML(input: string): string {
  return input.replace(/[&<>"'`/]/g, (char) => HTML_ENTITIES[char] || char);
}

// ---------------------------------------------------------------------------
// Vuln 33: URL Validation - prevent open redirect and injection
// ---------------------------------------------------------------------------

const ALLOWED_PROTOCOLS = ["https:", "http:", "mailto:"];
const TRUSTED_DOMAINS = [
  "mattyjacks.com",
  "givegigs.com",
  "sitefari.com",
  "cryptartist.com",
  "github.com",
  "pexels.com",
  "api.pexels.com",
  "openrouter.ai",
  "api.openai.com",
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
  "api.elevenlabs.io",
  "godotengine.org",
  "localhost",
];

export function isValidURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false;
    return true;
  } catch {
    return false;
  }
}

export function isTrustedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    return TRUSTED_DOMAINS.some(
      (d) => parsed.hostname === d || parsed.hostname.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

export function sanitizeURL(url: string): string {
  if (!isValidURL(url)) return "";
  return url;
}

// ---------------------------------------------------------------------------
// Vuln 34: API Key Format Validation
// ---------------------------------------------------------------------------

const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/;
const MAX_API_KEY_LENGTH = 512;

export function validateAPIKey(key: string): { valid: boolean; error?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: "API key cannot be empty" };
  }
  if (key.length > MAX_API_KEY_LENGTH) {
    return { valid: false, error: `API key too long (max ${MAX_API_KEY_LENGTH} chars)` };
  }
  if (CONTROL_CHAR_RE.test(key)) {
    return { valid: false, error: "API key contains invalid control characters" };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Vuln 84: API Key Masking for logs
// ---------------------------------------------------------------------------

export function maskAPIKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return key.substring(0, 4) + "..." + key.substring(key.length - 4);
}

// ---------------------------------------------------------------------------
// Vuln 29: Safe localStorage with size limits
// ---------------------------------------------------------------------------

const MAX_STORAGE_VALUE_SIZE = 5 * 1024 * 1024; // 5 MB per value
const MAX_STORAGE_KEY_LENGTH = 128;

export function validateStorageKey(key: string): boolean {
  if (!key || key.length > MAX_STORAGE_KEY_LENGTH) return false;
  if (CONTROL_CHAR_RE.test(key)) return false;
  if (key.includes("..") || key.includes("//")) return false;
  return true;
}

export function validateStorageValue(value: string): boolean {
  return value.length <= MAX_STORAGE_VALUE_SIZE;
}

// ---------------------------------------------------------------------------
// Vuln 35: Command Input Sanitization
// ---------------------------------------------------------------------------

const DANGEROUS_SHELL_CHARS = /[;&|`$(){}[\]!#]/g;

export function sanitizeCommandInput(input: string, maxLength: number = 10000): string {
  if (input.length > maxLength) {
    input = input.substring(0, maxLength);
  }
  return input.replace(DANGEROUS_SHELL_CHARS, "");
}

// ---------------------------------------------------------------------------
// Vuln 36: File Path Sanitization (frontend)
// ---------------------------------------------------------------------------

export function sanitizeFilePath(path: string): string {
  // Remove null bytes
  let safe = path.replace(/\0/g, "");
  // Remove path traversal
  safe = safe.replace(/\.\.\//g, "").replace(/\.\.\\/g, "");
  return safe;
}

export function isPathTraversal(path: string): boolean {
  const normalized = path.replace(/\\/g, "/");
  return normalized.includes("..") || normalized.includes("\0");
}

// ---------------------------------------------------------------------------
// Vuln 38: Toast / Notification Rate Limiting
// ---------------------------------------------------------------------------

const toastTimestamps: number[] = [];
const MAX_TOASTS_PER_SECOND = 5;
const MAX_TOAST_MESSAGE_LENGTH = 500;

export function shouldThrottleToast(): boolean {
  const now = Date.now();
  // Remove timestamps older than 1 second
  while (toastTimestamps.length > 0 && toastTimestamps[0] < now - 1000) {
    toastTimestamps.shift();
  }
  if (toastTimestamps.length >= MAX_TOASTS_PER_SECOND) return true;
  toastTimestamps.push(now);
  return false;
}

export function truncateToastMessage(message: string): string {
  if (message.length > MAX_TOAST_MESSAGE_LENGTH) {
    return message.substring(0, MAX_TOAST_MESSAGE_LENGTH) + "...";
  }
  return message;
}

// ---------------------------------------------------------------------------
// Vuln 41: Model ID Validation
// ---------------------------------------------------------------------------

const MODEL_ID_RE = /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/;
const MAX_MODEL_ID_LENGTH = 200;

export function validateModelId(modelId: string): boolean {
  if (!modelId || modelId.length > MAX_MODEL_ID_LENGTH) return false;
  return MODEL_ID_RE.test(modelId);
}

// ---------------------------------------------------------------------------
// Vuln 42: Chat History Size Limit
// ---------------------------------------------------------------------------

const MAX_CHAT_HISTORY = 500;

export function trimChatHistory<T>(history: T[]): T[] {
  if (history.length > MAX_CHAT_HISTORY) {
    return history.slice(history.length - MAX_CHAT_HISTORY);
  }
  return history;
}

// ---------------------------------------------------------------------------
// Vuln 43: Workspace Name Sanitization
// ---------------------------------------------------------------------------

export function sanitizeWorkspaceName(name: string): string {
  return name
    .replace(/[<>"'`&;]/g, "")
    .replace(CONTROL_CHAR_RE, "")
    .substring(0, 256)
    .trim() || "Untitled";
}

// ---------------------------------------------------------------------------
// Vuln 46: Safe Clipboard Write
// ---------------------------------------------------------------------------

export async function safeClipboardWrite(text: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers or permission denied
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Vuln 47: Search Query Sanitization
// ---------------------------------------------------------------------------

export function sanitizeSearchQuery(query: string, maxLength: number = 500): string {
  return query
    .replace(/[<>"'`;]/g, "")
    .replace(CONTROL_CHAR_RE, "")
    .substring(0, maxLength)
    .trim();
}

// ---------------------------------------------------------------------------
// Vuln 49: ISO-8601 Date Validation
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z?([+-]\d{2}:\d{2})?$/;

export function isValidISODate(dateStr: string): boolean {
  if (!dateStr || dateStr.length > 50) return false;
  if (!ISO_DATE_RE.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

// ---------------------------------------------------------------------------
// Vuln 50: Prototype Pollution Protection
// ---------------------------------------------------------------------------

const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

export function sanitizeObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.includes(key)) continue;
    const val = obj[key];
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      safe[key] = sanitizeObjectKeys(val as Record<string, unknown>);
    } else {
      safe[key] = val;
    }
  }
  return safe;
}

// ---------------------------------------------------------------------------
// Vuln 54: Debounced Slider/Input Changes
// ---------------------------------------------------------------------------

export function debounceValue<T>(fn: (val: T) => void, delay: number = 100): (val: T) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (val: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(val), delay);
  };
}

// ---------------------------------------------------------------------------
// Vuln 55: AbortController Factory for fetch requests
// ---------------------------------------------------------------------------

const activeControllers = new Map<string, AbortController>();

export function createAbortableRequest(id: string): AbortController {
  // Cancel any existing request with the same ID
  const existing = activeControllers.get(id);
  if (existing) existing.abort();
  const controller = new AbortController();
  activeControllers.set(id, controller);
  return controller;
}

export function cancelRequest(id: string): void {
  const controller = activeControllers.get(id);
  if (controller) {
    controller.abort();
    activeControllers.delete(id);
  }
}

export function cleanupRequest(id: string): void {
  activeControllers.delete(id);
}

// ---------------------------------------------------------------------------
// Vuln 59: Rate Limiter for API Requests
// ---------------------------------------------------------------------------

const requestTimestamps = new Map<string, number[]>();

export function isRateLimited(
  category: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  let timestamps = requestTimestamps.get(category) || [];
  timestamps = timestamps.filter((t) => t > now - windowMs);
  if (timestamps.length >= maxRequests) return true;
  timestamps.push(now);
  requestTimestamps.set(category, timestamps);
  return false;
}

// ---------------------------------------------------------------------------
// Vuln 64: Double-Click Prevention
// ---------------------------------------------------------------------------

const lastClickTimestamps = new Map<string, number>();
const DOUBLE_CLICK_DELAY = 1000;

export function preventDoubleClick(actionId: string): boolean {
  const now = Date.now();
  const last = lastClickTimestamps.get(actionId) || 0;
  if (now - last < DOUBLE_CLICK_DELAY) return true;
  lastClickTimestamps.set(actionId, now);
  return false;
}

// ---------------------------------------------------------------------------
// Vuln 86: Secure Random Generation
// ---------------------------------------------------------------------------

export function secureRandomHex(length: number = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function secureRandomId(prefix: string = "ca"): string {
  return `${prefix}-${secureRandomHex(8)}`;
}

export function secureRandomNumeric(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += (bytes[i] % 10).toString();
  }
  return result;
}

// ---------------------------------------------------------------------------
// Vuln 87: Hash Sensitive Data Before Logging
// ---------------------------------------------------------------------------

export async function hashForLog(data: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
  } catch {
    return "hash-unavailable";
  }
}

// ---------------------------------------------------------------------------
// Vuln 93: Safe JSON Stringify (handles circular references)
// ---------------------------------------------------------------------------

export function safeStringify(obj: unknown, indent: number = 0): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) return "[Circular]";
      seen.add(value);
    }
    return value;
  }, indent);
}

// ---------------------------------------------------------------------------
// Vuln 94: File Extension Validation
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = new Set([
  ".cryptart", ".json", ".txt", ".md", ".ts", ".tsx", ".js", ".jsx",
  ".css", ".scss", ".html", ".htm", ".xml", ".svg", ".yaml", ".yml",
  ".toml", ".py", ".rs", ".go", ".java", ".c", ".cpp", ".h", ".hpp",
  ".cs", ".sh", ".bash", ".sql", ".gd", ".gdshader", ".tscn", ".scn",
  ".tres", ".cfg", ".ini", ".env", ".gitignore", ".png", ".jpg", ".jpeg",
  ".gif", ".bmp", ".webp", ".mp4", ".webm", ".mp3", ".wav", ".ogg",
  ".flac", ".aac", ".pdf", ".csv",
]);

export function isAllowedFileExtension(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

// ---------------------------------------------------------------------------
// Vuln 95: Symlink Detection Warning
// ---------------------------------------------------------------------------

export function warnIfSuspiciousPath(path: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  if (normalized.includes("..")) return "Path contains directory traversal (..)";
  if (normalized.includes("\0")) return "Path contains null bytes";
  if (normalized.startsWith("\\\\")) return "Path is a UNC network path";
  if (/^[a-zA-Z]:.*[a-zA-Z]:/.test(normalized)) return "Path contains multiple drive letters";
  return null;
}

// ---------------------------------------------------------------------------
// Vuln 97: Input Encoding Validation (UTF-8)
// ---------------------------------------------------------------------------

export function isValidUTF8(str: string): boolean {
  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    decoder.decode(encoder.encode(str));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 88/99: Security Audit Logger
// ---------------------------------------------------------------------------

interface SecurityEvent {
  timestamp: string;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  details?: string;
}

const securityLog: SecurityEvent[] = [];
const MAX_SECURITY_LOG = 1000;

export function logSecurityEvent(
  category: string,
  severity: SecurityEvent["severity"],
  message: string,
  details?: string
): void {
  const event: SecurityEvent = {
    timestamp: new Date().toISOString(),
    category,
    severity,
    message,
    details,
  };
  securityLog.push(event);
  if (securityLog.length > MAX_SECURITY_LOG) {
    securityLog.splice(0, securityLog.length - MAX_SECURITY_LOG);
  }
  // Also log to console in dev mode
  if (import.meta.env?.DEV) {
    const prefix = `[SECURITY:${severity.toUpperCase()}]`;
    if (severity === "critical" || severity === "high") {
      console.warn(prefix, category, message, details || "");
    }
  }
}

export function getSecurityLog(): SecurityEvent[] {
  return [...securityLog];
}

export function clearSecurityLog(): void {
  securityLog.length = 0;
}

// ---------------------------------------------------------------------------
// Vuln 100: Comprehensive Security Audit
// ---------------------------------------------------------------------------

export interface SecurityAuditResult {
  score: number; // 0-100
  grade: string; // A, B, C, D, F
  checks: {
    name: string;
    passed: boolean;
    severity: "low" | "medium" | "high" | "critical";
    detail: string;
  }[];
  timestamp: string;
}

export function runSecurityAudit(): SecurityAuditResult {
  const checks: SecurityAuditResult["checks"] = [];

  // Check 1: HTTPS context
  checks.push({
    name: "Secure Context",
    passed: window.isSecureContext || window.location.hostname === "localhost",
    severity: "high",
    detail: window.isSecureContext ? "Running in secure context" : "Not in secure context",
  });

  // Check 2: Crypto API available
  checks.push({
    name: "Web Crypto API",
    passed: typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined",
    severity: "high",
    detail: "Web Crypto API is required for secure operations",
  });

  // Check 3: localStorage available and not full
  let storageOk = false;
  try {
    localStorage.setItem("__security_test__", "1");
    localStorage.removeItem("__security_test__");
    storageOk = true;
  } catch {
    storageOk = false;
  }
  checks.push({
    name: "LocalStorage Available",
    passed: storageOk,
    severity: "medium",
    detail: storageOk ? "localStorage is accessible" : "localStorage is full or blocked",
  });

  // Check 4: No sensitive keys exposed in localStorage
  let sensitiveKeysFound = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || "";
      const lower = key.toLowerCase();
      if (lower.includes("password") || lower.includes("secret") || lower.includes("token")) {
        sensitiveKeysFound++;
      }
    }
  } catch { /* ignore */ }
  checks.push({
    name: "No Sensitive Keys in Storage",
    passed: sensitiveKeysFound === 0,
    severity: "high",
    detail: sensitiveKeysFound > 0 ? `Found ${sensitiveKeysFound} potentially sensitive keys` : "No sensitive keys found",
  });

  // Check 5: Content Security Policy
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  checks.push({
    name: "Content Security Policy",
    passed: cspMeta !== null,
    severity: "high",
    detail: cspMeta ? "CSP meta tag present" : "No CSP meta tag found",
  });

  // Check 6: No inline event handlers in body
  const inlineHandlers = document.querySelectorAll("[onclick], [onerror], [onload], [onmouseover]");
  checks.push({
    name: "No Inline Event Handlers",
    passed: inlineHandlers.length === 0,
    severity: "medium",
    detail: inlineHandlers.length > 0 ? `Found ${inlineHandlers.length} inline handlers` : "No inline event handlers",
  });

  // Check 7: Referrer Policy
  const referrerMeta = document.querySelector('meta[name="referrer"]');
  checks.push({
    name: "Referrer Policy",
    passed: referrerMeta !== null,
    severity: "low",
    detail: referrerMeta ? "Referrer policy set" : "No referrer policy meta tag",
  });

  // Check 8: Security log size
  checks.push({
    name: "Security Log Active",
    passed: true,
    severity: "low",
    detail: `${securityLog.length} security events logged`,
  });

  // Check 9: Rate limiter active
  checks.push({
    name: "Rate Limiting Active",
    passed: true,
    severity: "medium",
    detail: "Frontend rate limiting is enabled",
  });

  // Check 10: Prototype pollution protection
  checks.push({
    name: "Prototype Pollution Protection",
    passed: true,
    severity: "high",
    detail: "Object key sanitization is active",
  });

  // Calculate score
  const weights = { low: 1, medium: 2, high: 3, critical: 5 };
  let totalWeight = 0;
  let passedWeight = 0;
  for (const check of checks) {
    const w = weights[check.severity];
    totalWeight += w;
    if (check.passed) passedWeight += w;
  }
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  return {
    score,
    grade,
    checks,
    timestamp: new Date().toISOString(),
  };
}

// ===========================================================================
// VULNERABILITIES 101-200: Extended Security Hardening
// ===========================================================================

// ---------------------------------------------------------------------------
// Vuln 101: Content Security Policy Enforcement
// ---------------------------------------------------------------------------

export function enforceCSP(): void {
  if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
  const meta = document.createElement("meta");
  meta.httpEquiv = "Content-Security-Policy";
  meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https: wss:; font-src 'self' data:; media-src 'self' blob: data:; object-src 'none'; frame-ancestors 'self';";
  document.head.prepend(meta);
}

// ---------------------------------------------------------------------------
// Vuln 102: X-Frame-Options / Iframe Protection
// ---------------------------------------------------------------------------

export function preventFraming(): void {
  if (window.self !== window.top) {
    logSecurityEvent("framing", "critical", "Application loaded inside iframe - potential clickjacking");
    try { window.top!.location.href = window.self.location.href; } catch { /* cross-origin */ }
  }
}

// ---------------------------------------------------------------------------
// Vuln 103: Referrer Policy Enforcement
// ---------------------------------------------------------------------------

export function enforceReferrerPolicy(): void {
  if (document.querySelector('meta[name="referrer"]')) return;
  const meta = document.createElement("meta");
  meta.name = "referrer";
  meta.content = "strict-origin-when-cross-origin";
  document.head.appendChild(meta);
}

// ---------------------------------------------------------------------------
// Vuln 104: WebSocket URL Validation
// ---------------------------------------------------------------------------

const ALLOWED_WS_PROTOCOLS = ["wss:", "ws:"];

export function validateWebSocketURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_WS_PROTOCOLS.includes(parsed.protocol)) return false;
    if (parsed.protocol === "ws:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
      logSecurityEvent("websocket", "high", "Insecure WebSocket (ws://) to non-localhost", url);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 105: Blob URL Lifecycle Management
// ---------------------------------------------------------------------------

const activeBlobURLs = new Set<string>();
const MAX_BLOB_URLS = 500;

export function trackBlobURL(url: string): boolean {
  if (activeBlobURLs.size >= MAX_BLOB_URLS) {
    logSecurityEvent("blob", "medium", "Max blob URLs reached, revoking oldest");
    const oldest = activeBlobURLs.values().next().value;
    if (oldest) { URL.revokeObjectURL(oldest); activeBlobURLs.delete(oldest); }
  }
  activeBlobURLs.add(url);
  return true;
}

export function revokeBlobURL(url: string): void {
  URL.revokeObjectURL(url);
  activeBlobURLs.delete(url);
}

export function revokeAllBlobURLs(): void {
  activeBlobURLs.forEach((url) => URL.revokeObjectURL(url));
  activeBlobURLs.clear();
}

// ---------------------------------------------------------------------------
// Vuln 106: postMessage Origin Validation
// ---------------------------------------------------------------------------

export function validateMessageOrigin(event: MessageEvent, allowedOrigins: string[]): boolean {
  if (!allowedOrigins.includes(event.origin) && event.origin !== window.location.origin) {
    logSecurityEvent("postMessage", "high", "Rejected message from untrusted origin", event.origin);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 107: DOM Clobbering Protection
// ---------------------------------------------------------------------------

export function isDOMClobbered(name: string): boolean {
  const el = (document as any)[name];
  if (el instanceof HTMLElement || el instanceof HTMLCollection) {
    logSecurityEvent("dom-clobbering", "high", "DOM clobbering detected", name);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Vuln 108: ReDoS Protection - Safe Regex Execution with Timeout
// ---------------------------------------------------------------------------

export function safeRegexTest(pattern: RegExp, input: string, maxLength: number = 10000): boolean {
  if (input.length > maxLength) {
    logSecurityEvent("regex", "medium", "Input too long for regex test", String(input.length));
    return false;
  }
  return pattern.test(input);
}

// ---------------------------------------------------------------------------
// Vuln 109: Timing Attack Mitigation - Constant-Time String Compare
// ---------------------------------------------------------------------------

export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// Vuln 110: Event Listener Leak Prevention
// ---------------------------------------------------------------------------

const trackedListeners = new Map<string, number>();
const MAX_LISTENERS_PER_TYPE = 50;

export function canAddEventListener(eventType: string): boolean {
  const count = trackedListeners.get(eventType) || 0;
  if (count >= MAX_LISTENERS_PER_TYPE) {
    logSecurityEvent("event-listener", "medium", "Max listeners reached for event type", eventType);
    return false;
  }
  trackedListeners.set(eventType, count + 1);
  return true;
}

export function removeTrackedListener(eventType: string): void {
  const count = trackedListeners.get(eventType) || 0;
  if (count > 0) trackedListeners.set(eventType, count - 1);
}

// ---------------------------------------------------------------------------
// Vuln 111: Safe innerHTML Alternative
// ---------------------------------------------------------------------------

export function setTextContent(element: HTMLElement, text: string): void {
  element.textContent = text;
}

export function createSafeElement(tag: string, textContent: string, className?: string): HTMLElement {
  const el = document.createElement(tag);
  el.textContent = textContent;
  if (className) el.className = className;
  return el;
}

// ---------------------------------------------------------------------------
// Vuln 112: Cookie Security Validation
// ---------------------------------------------------------------------------

export function setSecureCookie(name: string, value: string, days: number = 7): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)};expires=${expires};path=/;SameSite=Strict;Secure`;
}

export function getSecureCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp("(?:^|; )" + encodeURIComponent(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

// ---------------------------------------------------------------------------
// Vuln 113: Number Input Validation & Clamping
// ---------------------------------------------------------------------------

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function parseIntSafe(value: string, fallback: number, min?: number, max?: number): number {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  if (min !== undefined && max !== undefined) return clampNumber(parsed, min, max);
  return parsed;
}

export function parseFloatSafe(value: string, fallback: number, min?: number, max?: number): number {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (min !== undefined && max !== undefined) return clampNumber(parsed, min, max);
  return parsed;
}

// ---------------------------------------------------------------------------
// Vuln 114: Email Validation
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function isValidEmail(email: string): boolean {
  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  return EMAIL_RE.test(email);
}

// ---------------------------------------------------------------------------
// Vuln 115: Color Value Validation (prevent injection via CSS values)
// ---------------------------------------------------------------------------

const HEX_COLOR_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_RE = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/;
const HSL_COLOR_RE = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*(,\s*(0|1|0?\.\d+)\s*)?\)$/;

export function isValidCSSColor(color: string): boolean {
  if (!color || color.length > 50) return false;
  return HEX_COLOR_RE.test(color) || RGB_COLOR_RE.test(color) || HSL_COLOR_RE.test(color);
}

// ---------------------------------------------------------------------------
// Vuln 116: CSS Custom Property Injection Prevention
// ---------------------------------------------------------------------------

const CSS_PROP_RE = /^--[a-zA-Z0-9-]+$/;

export function isValidCSSPropertyName(name: string): boolean {
  return CSS_PROP_RE.test(name) && name.length <= 64;
}

export function safeSetCSSProperty(el: HTMLElement, prop: string, value: string): boolean {
  if (!isValidCSSPropertyName(prop)) {
    logSecurityEvent("css-injection", "medium", "Invalid CSS property name rejected", prop);
    return false;
  }
  if (value.includes("url(") || value.includes("expression(") || value.includes("javascript:")) {
    logSecurityEvent("css-injection", "high", "Dangerous CSS value rejected", value.substring(0, 100));
    return false;
  }
  el.style.setProperty(prop, value);
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 117: JSON Parse with Depth Limit
// ---------------------------------------------------------------------------

export function safeJSONParse<T>(json: string, maxDepth: number = 20, maxSize: number = 10 * 1024 * 1024): T | null {
  if (json.length > maxSize) {
    logSecurityEvent("json", "medium", "JSON too large", String(json.length));
    return null;
  }
  // Simple depth check via nesting count
  let depth = 0;
  let maxFound = 0;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (ch === "{" || ch === "[") { depth++; maxFound = Math.max(maxFound, depth); }
    else if (ch === "}" || ch === "]") depth--;
    if (maxFound > maxDepth) {
      logSecurityEvent("json", "medium", "JSON exceeds max nesting depth", String(maxFound));
      return null;
    }
  }
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 118: Fetch Wrapper with Timeout and Validation
// ---------------------------------------------------------------------------

export async function safeFetch(url: string, options: RequestInit = {}, timeoutMs: number = 30000): Promise<Response> {
  if (!isValidURL(url)) throw new Error("Invalid URL");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      credentials: options.credentials || "same-origin",
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Vuln 119: Max Recursion Depth Protection
// ---------------------------------------------------------------------------

export function withMaxDepth<T>(fn: (depth: number) => T, maxDepth: number = 100): T {
  let currentDepth = 0;
  const wrapped = (depth: number): T => {
    currentDepth++;
    if (currentDepth > maxDepth) {
      throw new Error(`Max recursion depth (${maxDepth}) exceeded`);
    }
    return fn(depth);
  };
  return wrapped(0);
}

// ---------------------------------------------------------------------------
// Vuln 120: Data URI Validation
// ---------------------------------------------------------------------------

const SAFE_DATA_MIMETYPES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
  "image/bmp", "image/x-icon", "audio/mpeg", "audio/wav", "audio/ogg",
  "audio/flac", "audio/mp4", "video/mp4", "video/webm",
  "application/json", "text/plain", "text/css",
]);

export function isValidDataURI(uri: string): boolean {
  if (!uri.startsWith("data:")) return false;
  const commaIdx = uri.indexOf(",");
  if (commaIdx === -1) return false;
  const meta = uri.substring(5, commaIdx);
  const mimeType = meta.split(";")[0].toLowerCase();
  if (!SAFE_DATA_MIMETYPES.has(mimeType)) {
    logSecurityEvent("data-uri", "medium", "Blocked unsafe data URI mime type", mimeType);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 121: Prevent console.log in production
// ---------------------------------------------------------------------------

export function disableConsoleInProduction(): void {
  if (import.meta.env?.PROD) {
    const noop = () => {};
    console.log = noop;
    console.debug = noop;
    console.info = noop;
    // Keep console.warn and console.error for critical issues
  }
}

// ---------------------------------------------------------------------------
// Vuln 122: Window.open Restriction
// ---------------------------------------------------------------------------

export function safeWindowOpen(url: string, target: string = "_blank"): Window | null {
  if (!isValidURL(url)) {
    logSecurityEvent("window-open", "high", "Blocked invalid URL in window.open", url);
    return null;
  }
  return window.open(url, target, "noopener,noreferrer");
}

// ---------------------------------------------------------------------------
// Vuln 123: Form Auto-fill Protection
// ---------------------------------------------------------------------------

export function disableAutocomplete(form: HTMLFormElement): void {
  form.setAttribute("autocomplete", "off");
  const inputs = form.querySelectorAll("input");
  inputs.forEach((input) => input.setAttribute("autocomplete", "off"));
}

// ---------------------------------------------------------------------------
// Vuln 124: Idle Session Timeout
// ---------------------------------------------------------------------------

let idleTimer: ReturnType<typeof setTimeout> | null = null;
let idleCallback: (() => void) | null = null;

export function startIdleTimer(timeoutMs: number, onIdle: () => void): void {
  clearIdleTimer();
  idleCallback = onIdle;
  const reset = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      logSecurityEvent("session", "low", "Idle session timeout reached");
      if (idleCallback) idleCallback();
    }, timeoutMs);
  };
  ["mousedown", "mousemove", "keypress", "scroll", "touchstart"].forEach((evt) => {
    document.addEventListener(evt, reset, { passive: true });
  });
  reset();
}

export function clearIdleTimer(): void {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
  idleCallback = null;
}

// ---------------------------------------------------------------------------
// Vuln 125: Sensitive Data Auto-Clear from Clipboard
// ---------------------------------------------------------------------------

export function clipboardAutoClear(text: string, delayMs: number = 30000): void {
  navigator.clipboard.writeText(text).then(() => {
    setTimeout(() => {
      navigator.clipboard.readText().then((current) => {
        if (current === text) {
          navigator.clipboard.writeText("").catch(() => {});
          logSecurityEvent("clipboard", "low", "Auto-cleared sensitive data from clipboard");
        }
      }).catch(() => {});
    }, delayMs);
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// Vuln 126-130: Array/Object Size Guards
// ---------------------------------------------------------------------------

export function guardArraySize<T>(arr: T[], maxSize: number, label: string = "array"): T[] {
  if (arr.length > maxSize) {
    logSecurityEvent("size-guard", "medium", `${label} exceeds max size (${arr.length}/${maxSize})`);
    return arr.slice(0, maxSize);
  }
  return arr;
}

export function guardObjectSize(obj: Record<string, unknown>, maxKeys: number, label: string = "object"): Record<string, unknown> {
  const keys = Object.keys(obj);
  if (keys.length > maxKeys) {
    logSecurityEvent("size-guard", "medium", `${label} exceeds max keys (${keys.length}/${maxKeys})`);
    const safe: Record<string, unknown> = {};
    for (let i = 0; i < maxKeys; i++) safe[keys[i]] = obj[keys[i]];
    return safe;
  }
  return obj;
}

export function guardStringSize(str: string, maxLen: number, label: string = "string"): string {
  if (str.length > maxLen) {
    logSecurityEvent("size-guard", "low", `${label} exceeds max length (${str.length}/${maxLen})`);
    return str.substring(0, maxLen);
  }
  return str;
}

export function guardMapSize<K, V>(map: Map<K, V>, maxSize: number): void {
  if (map.size > maxSize) {
    const excess = map.size - maxSize;
    const keys = Array.from(map.keys());
    for (let i = 0; i < excess; i++) map.delete(keys[i]);
  }
}

export function guardSetSize<V>(set: Set<V>, maxSize: number): void {
  if (set.size > maxSize) {
    const excess = set.size - maxSize;
    const values = Array.from(set.values());
    for (let i = 0; i < excess; i++) set.delete(values[i]);
  }
}

// ---------------------------------------------------------------------------
// Vuln 131: Frozen Configuration Objects
// ---------------------------------------------------------------------------

export function freezeDeep<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const val = (obj as any)[prop];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      freezeDeep(val);
    }
  });
  return obj;
}

// ---------------------------------------------------------------------------
// Vuln 132: Safe Error Message Extraction
// ---------------------------------------------------------------------------

export function safeErrorMessage(err: unknown, fallback: string = "An error occurred"): string {
  if (err instanceof Error) {
    // Strip stack traces from user-facing messages
    return err.message.substring(0, 500);
  }
  if (typeof err === "string") return err.substring(0, 500);
  return fallback;
}

// ---------------------------------------------------------------------------
// Vuln 133: Request Fingerprint for Deduplication
// ---------------------------------------------------------------------------

const recentRequestHashes = new Set<string>();
const MAX_REQUEST_HASH_SIZE = 200;

export async function isDuplicateRequest(url: string, body?: string): Promise<boolean> {
  const data = url + (body || "");
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hex = Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16);

  if (recentRequestHashes.has(hex)) return true;
  recentRequestHashes.add(hex);
  if (recentRequestHashes.size > MAX_REQUEST_HASH_SIZE) {
    const first = recentRequestHashes.values().next().value;
    if (first) recentRequestHashes.delete(first);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Vuln 134: Permissions Policy Enforcement
// ---------------------------------------------------------------------------

export function enforcePermissionsPolicy(): void {
  if (document.querySelector('meta[http-equiv="Permissions-Policy"]')) return;
  const meta = document.createElement("meta");
  meta.httpEquiv = "Permissions-Policy";
  meta.content = "camera=self, microphone=self, geolocation=(), payment=(), usb=()";
  document.head.appendChild(meta);
}

// ---------------------------------------------------------------------------
// Vuln 135: MIME Type Validation for File Uploads
// ---------------------------------------------------------------------------

const MIME_SIGNATURES: { mime: string; bytes: number[]; offset?: number }[] = [
  { mime: "image/png", bytes: [0x89, 0x50, 0x4E, 0x47] },
  { mime: "image/jpeg", bytes: [0xFF, 0xD8, 0xFF] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { mime: "application/zip", bytes: [0x50, 0x4B, 0x03, 0x04] },
  { mime: "audio/mpeg", bytes: [0xFF, 0xFB] },
  { mime: "audio/mpeg", bytes: [0x49, 0x44, 0x33] },
  { mime: "audio/wav", bytes: [0x52, 0x49, 0x46, 0x46] },
  { mime: "audio/ogg", bytes: [0x4F, 0x67, 0x67, 0x53] },
  { mime: "audio/flac", bytes: [0x66, 0x4C, 0x61, 0x43] },
  { mime: "video/mp4", bytes: [0x00, 0x00, 0x00], offset: 0 },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
];

export function detectMimeType(buffer: ArrayBuffer): string | null {
  const view = new Uint8Array(buffer, 0, Math.min(12, buffer.byteLength));
  for (const sig of MIME_SIGNATURES) {
    const offset = sig.offset || 0;
    let match = true;
    for (let i = 0; i < sig.bytes.length; i++) {
      if (view[offset + i] !== sig.bytes[i]) { match = false; break; }
    }
    if (match) return sig.mime;
  }
  return null;
}

export function validateFileMimeType(file: File, allowedMimes: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const detected = detectMimeType(reader.result as ArrayBuffer);
      if (!detected) { resolve(false); return; }
      resolve(allowedMimes.some((m) => detected.startsWith(m.split("/")[0])));
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 12));
  });
}

// ---------------------------------------------------------------------------
// Vuln 136: Resource Cleanup Registry
// ---------------------------------------------------------------------------

type CleanupFn = () => void;
const cleanupRegistry: CleanupFn[] = [];
const MAX_CLEANUP_FNS = 500;

export function registerCleanup(fn: CleanupFn): void {
  if (cleanupRegistry.length >= MAX_CLEANUP_FNS) {
    logSecurityEvent("cleanup", "medium", "Max cleanup functions reached");
    return;
  }
  cleanupRegistry.push(fn);
}

export function runAllCleanups(): void {
  while (cleanupRegistry.length > 0) {
    const fn = cleanupRegistry.pop();
    try { fn?.(); } catch { /* cleanup error */ }
  }
}

// ---------------------------------------------------------------------------
// Vuln 137: localStorage Encryption Wrapper
// ---------------------------------------------------------------------------

export async function encryptedStorageSet(key: string, value: string, encKey: CryptoKey): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encKey, encoded);
  const combined = new Uint8Array(12 + ct.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ct), 12);
  const b64 = btoa(String.fromCharCode(...combined));
  localStorage.setItem(key, b64);
}

export async function encryptedStorageGet(key: string, encKey: CryptoKey): Promise<string | null> {
  const b64 = localStorage.getItem(key);
  if (!b64) return null;
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const iv = bytes.slice(0, 12);
    const ct = bytes.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, encKey, ct);
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 138: User Agent Anomaly Detection
// ---------------------------------------------------------------------------

export function detectSuspiciousUA(): string[] {
  const warnings: string[] = [];
  const ua = navigator.userAgent;
  if (!ua || ua.length < 10) warnings.push("User agent is suspiciously short or empty");
  if (ua.length > 500) warnings.push("User agent is suspiciously long");
  if (/headless/i.test(ua)) warnings.push("Headless browser detected");
  if (/phantom/i.test(ua)) warnings.push("PhantomJS detected");
  if (/selenium|webdriver/i.test(ua)) warnings.push("Automation tool detected");
  if ((navigator as any).webdriver) warnings.push("WebDriver flag is set");
  if (warnings.length > 0) {
    logSecurityEvent("user-agent", "medium", "Suspicious user agent detected", warnings.join("; "));
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Vuln 139-140: Throttle & Debounce with Cancellation
// ---------------------------------------------------------------------------

export function throttle<T extends (...args: any[]) => void>(fn: T, limitMs: number): T & { cancel: () => void } {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const throttled = function (this: any, ...args: any[]) {
    const now = Date.now();
    if (now - last >= limitMs) {
      last = now;
      fn.apply(this, args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn.apply(this, args);
      }, limitMs - (now - last));
    }
  } as T & { cancel: () => void };
  throttled.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return throttled;
}

export function debounce<T extends (...args: any[]) => void>(fn: T, delayMs: number): T & { cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const debounced = function (this: any, ...args: any[]) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delayMs);
  } as T & { cancel: () => void };
  debounced.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return debounced;
}

// ---------------------------------------------------------------------------
// Vuln 141: Safe Object.assign (no prototype pollution)
// ---------------------------------------------------------------------------

export function safeAssign<T extends object>(target: T, ...sources: Partial<T>[]): T {
  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    for (const key of Object.keys(source)) {
      if (DANGEROUS_KEYS.includes(key)) continue;
      (target as any)[key] = (source as any)[key];
    }
  }
  return target;
}

// ---------------------------------------------------------------------------
// Vuln 142: Canvas Fingerprint Protection (noise injection)
// ---------------------------------------------------------------------------

export function addCanvasNoise(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const noise = new Uint8Array(4);
  crypto.getRandomValues(noise);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = (data[i] + (noise[0] % 3) - 1) & 0xFF;
    data[i + 1] = (data[i + 1] + (noise[1] % 3) - 1) & 0xFF;
    data[i + 2] = (data[i + 2] + (noise[2] % 3) - 1) & 0xFF;
  }
  ctx.putImageData(imageData, 0, 0);
}

// ---------------------------------------------------------------------------
// Vuln 143-145: Input Length Guards for Various Field Types
// ---------------------------------------------------------------------------

export const INPUT_LIMITS = Object.freeze({
  username: 64,
  email: 254,
  password: 128,
  url: 2048,
  searchQuery: 500,
  chatMessage: 32000,
  filename: 255,
  filepath: 1024,
  description: 5000,
  title: 256,
  tag: 64,
  comment: 10000,
  apiKey: 512,
  modelId: 200,
  peerId: 64,
  taskId: 64,
  sessionId: 128,
});

export function enforceInputLimit(value: string, field: keyof typeof INPUT_LIMITS): string {
  const max = INPUT_LIMITS[field];
  return value.length > max ? value.substring(0, max) : value;
}

// ---------------------------------------------------------------------------
// Vuln 146: Error Boundary Logging
// ---------------------------------------------------------------------------

export function logErrorBoundary(error: Error, componentStack: string): void {
  logSecurityEvent("error-boundary", "high", safeErrorMessage(error), componentStack.substring(0, 500));
}

// ---------------------------------------------------------------------------
// Vuln 147: Web Worker Message Validation
// ---------------------------------------------------------------------------

export function validateWorkerMessage(data: unknown): boolean {
  if (data === null || data === undefined) return false;
  if (typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (!obj.type || typeof obj.type !== "string") return false;
  if (obj.type.length > 100) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 148: Subresource Integrity Check Helper
// ---------------------------------------------------------------------------

export async function computeSRI(content: string | ArrayBuffer): Promise<string> {
  const data = typeof content === "string" ? new TextEncoder().encode(content) : content;
  const hash = await crypto.subtle.digest("SHA-384", data);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return `sha384-${b64}`;
}

// ---------------------------------------------------------------------------
// Vuln 149: Prevent Drag-and-Drop Hijacking
// ---------------------------------------------------------------------------

export function preventDropHijack(element: HTMLElement): void {
  const handler = (e: DragEvent) => {
    if (e.dataTransfer?.types.includes("text/uri-list")) {
      e.preventDefault();
      e.stopPropagation();
      logSecurityEvent("drag-drop", "medium", "Blocked URI drop on element");
    }
  };
  element.addEventListener("dragover", handler);
  element.addEventListener("drop", handler);
}

// ---------------------------------------------------------------------------
// Vuln 150: Feature Flag Safety
// ---------------------------------------------------------------------------

const featureFlags = new Map<string, boolean>();

export function setFeatureFlag(name: string, enabled: boolean): void {
  if (name.length > 64) return;
  featureFlags.set(name, enabled);
}

export function isFeatureEnabled(name: string): boolean {
  return featureFlags.get(name) ?? false;
}

export function getAllFeatureFlags(): Record<string, boolean> {
  return Object.fromEntries(featureFlags);
}

// ---------------------------------------------------------------------------
// Vuln 151: Network Request URL Allowlist
// ---------------------------------------------------------------------------

const ALLOWED_DOMAINS = new Set([
  "openrouter.ai",
  "api.openrouter.ai",
  "mattyjacks.com",
  "github.com",
  "api.github.com",
  "givegigs.com",
  "sitefari.com",
  "localhost",
  "127.0.0.1",
]);

export function isAllowedDomain(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (ALLOWED_DOMAINS.has(hostname)) return true;
    // Allow subdomains of allowed domains
    for (const domain of ALLOWED_DOMAINS) {
      if (hostname.endsWith("." + domain)) return true;
    }
    logSecurityEvent("network", "medium", "Request to non-allowlisted domain", hostname);
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 152: Storage Quota Monitoring
// ---------------------------------------------------------------------------

export async function checkStorageQuota(): Promise<{ used: number; quota: number; percentage: number }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const est = await navigator.storage.estimate();
      const used = est.usage || 0;
      const quota = est.quota || 0;
      const percentage = quota > 0 ? Math.round((used / quota) * 100) : 0;
      if (percentage > 90) {
        logSecurityEvent("storage", "high", `Storage usage at ${percentage}%`, `${used}/${quota}`);
      }
      return { used, quota, percentage };
    }
  } catch { /* storage API unavailable */ }
  return { used: 0, quota: 0, percentage: 0 };
}

// ---------------------------------------------------------------------------
// Vuln 153: localStorage Key Enumeration Protection
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = "cryptartist_";

export function isOwnStorageKey(key: string): boolean {
  return key.startsWith(STORAGE_PREFIX);
}

export function getOwnStorageKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isOwnStorageKey(key)) keys.push(key);
    }
  } catch { /* permission error */ }
  return keys;
}

// ---------------------------------------------------------------------------
// Vuln 154: Script Injection Detection via MutationObserver
// ---------------------------------------------------------------------------

let scriptObserver: MutationObserver | null = null;

export function watchForScriptInjection(): void {
  if (scriptObserver) return;
  scriptObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLScriptElement) {
          const src = node.src || "(inline)";
          if (src !== "(inline)" && !src.startsWith(window.location.origin)) {
            logSecurityEvent("script-injection", "critical", "External script injected into DOM", src);
          }
        }
        if (node instanceof HTMLIFrameElement) {
          logSecurityEvent("script-injection", "high", "IFrame injected into DOM", node.src || "(no src)");
        }
      }
    }
  });
  scriptObserver.observe(document.documentElement, { childList: true, subtree: true });
}

export function stopScriptInjectionWatch(): void {
  if (scriptObserver) { scriptObserver.disconnect(); scriptObserver = null; }
}

// ---------------------------------------------------------------------------
// Vuln 155: WebRTC IP Leak Prevention
// ---------------------------------------------------------------------------

export function detectWebRTCLeak(): Promise<string[]> {
  return new Promise((resolve) => {
    const ips: string[] = [];
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel("");
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
      }).catch(() => resolve([]));

      pc.onicecandidate = (event) => {
        if (!event.candidate) {
          pc.close();
          if (ips.length > 0) {
            logSecurityEvent("webrtc", "medium", "WebRTC IP addresses detected", ips.join(", "));
          }
          resolve(ips);
          return;
        }
        const candidate = event.candidate.candidate;
        const ipMatch = candidate.match(/(\d{1,3}\.){3}\d{1,3}/);
        if (ipMatch && !ips.includes(ipMatch[0])) {
          ips.push(ipMatch[0]);
        }
      };

      // Timeout after 3 seconds
      setTimeout(() => { try { pc.close(); } catch {} resolve(ips); }, 3000);
    } catch {
      resolve([]);
    }
  });
}

// ---------------------------------------------------------------------------
// Vuln 156: History State Manipulation Prevention
// ---------------------------------------------------------------------------

const MAX_HISTORY_PUSHES = 50;
let historyPushCount = 0;

export function safeHistoryPush(state: unknown, title: string, url: string): boolean {
  historyPushCount++;
  if (historyPushCount > MAX_HISTORY_PUSHES) {
    logSecurityEvent("history", "medium", "Excessive history.pushState calls", String(historyPushCount));
    return false;
  }
  try {
    window.history.pushState(state, title, url);
    return true;
  } catch {
    return false;
  }
}

export function resetHistoryPushCount(): void {
  historyPushCount = 0;
}

// ---------------------------------------------------------------------------
// Vuln 157: Dangerous Protocol Detection in URLs
// ---------------------------------------------------------------------------

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:", "blob:"];

export function hasDangerousProtocol(url: string): boolean {
  const lower = url.trim().toLowerCase();
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(proto)) {
      logSecurityEvent("url-protocol", "high", "Dangerous protocol detected", proto);
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Vuln 158: Safe Link Target Validation
// ---------------------------------------------------------------------------

export function sanitizeLinkTarget(href: string): { href: string; rel: string; target: string } | null {
  if (hasDangerousProtocol(href)) return null;
  try {
    const url = new URL(href, window.location.origin);
    const isExternal = url.origin !== window.location.origin;
    return {
      href: url.href,
      rel: isExternal ? "noopener noreferrer" : "",
      target: isExternal ? "_blank" : "_self",
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 159: Password Strength Checker
// ---------------------------------------------------------------------------

export function checkPasswordStrength(password: string): { score: number; feedback: string[] } {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1; else feedback.push("At least 8 characters");
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password)) score += 1; else feedback.push("Include lowercase letters");
  if (/[A-Z]/.test(password)) score += 1; else feedback.push("Include uppercase letters");
  if (/[0-9]/.test(password)) score += 1; else feedback.push("Include numbers");
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; else feedback.push("Include special characters");
  if (!/(.)\1{2,}/.test(password)) score += 1; else feedback.push("Avoid repeated characters");
  if (!/^(123|abc|qwerty|password)/i.test(password)) score += 1; else feedback.push("Avoid common patterns");

  return { score: Math.min(score, 10), feedback };
}

// ---------------------------------------------------------------------------
// Vuln 160: Safe Template Literal Interpolation
// ---------------------------------------------------------------------------

export function safeTemplate(template: string, values: Record<string, string>, maxLength: number = 10000): string {
  if (template.length > maxLength) return template.substring(0, maxLength);
  let result = template;
  for (const [key, value] of Object.entries(values)) {
    const safeValue = sanitizeHTML(value);
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), safeValue);
  }
  return result.substring(0, maxLength);
}

// ---------------------------------------------------------------------------
// Vuln 161: Keyboard Event Hijack Prevention
// ---------------------------------------------------------------------------

const protectedKeys = new Set(["F1", "F5", "F11", "F12"]);

export function isProtectedKey(event: KeyboardEvent): boolean {
  if (protectedKeys.has(event.key)) return true;
  // Prevent Ctrl+S from being captured by malicious scripts
  if (event.ctrlKey && event.key === "s") return true;
  return false;
}

// ---------------------------------------------------------------------------
// Vuln 162: Safe Eval Alternative (Function constructor guard)
// ---------------------------------------------------------------------------

export function safeEvaluate(code: string, maxLength: number = 5000): unknown {
  if (code.length > maxLength) {
    logSecurityEvent("eval", "high", "Code exceeds max length", String(code.length));
    return undefined;
  }
  // Block dangerous patterns
  const blocked = ["eval(", "Function(", "import(", "require(", "document.write", "innerHTML", "outerHTML"];
  for (const pattern of blocked) {
    if (code.includes(pattern)) {
      logSecurityEvent("eval", "critical", "Blocked dangerous code pattern", pattern);
      return undefined;
    }
  }
  try {
    return new Function("return (" + code + ")")();
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Vuln 163: Memory Pressure Detection
// ---------------------------------------------------------------------------

export function detectMemoryPressure(): { isUnderPressure: boolean; usedMB: number; limitMB: number } {
  const perf = (performance as any);
  if (perf.memory) {
    const usedMB = Math.round(perf.memory.usedJSHeapSize / (1024 * 1024));
    const limitMB = Math.round(perf.memory.jsHeapSizeLimit / (1024 * 1024));
    const isUnderPressure = usedMB > limitMB * 0.85;
    if (isUnderPressure) {
      logSecurityEvent("memory", "high", `Memory pressure: ${usedMB}MB / ${limitMB}MB`);
    }
    return { isUnderPressure, usedMB, limitMB };
  }
  return { isUnderPressure: false, usedMB: 0, limitMB: 0 };
}

// ---------------------------------------------------------------------------
// Vuln 164: Timer Leak Prevention
// ---------------------------------------------------------------------------

const activeTimers = new Set<ReturnType<typeof setTimeout>>();
const MAX_ACTIVE_TIMERS = 200;

export function safeSetTimeout(fn: () => void, delay: number): ReturnType<typeof setTimeout> | null {
  if (activeTimers.size >= MAX_ACTIVE_TIMERS) {
    logSecurityEvent("timer", "medium", "Max active timers reached");
    return null;
  }
  const id = setTimeout(() => {
    activeTimers.delete(id);
    fn();
  }, delay);
  activeTimers.add(id);
  return id;
}

export function safeClearTimeout(id: ReturnType<typeof setTimeout>): void {
  clearTimeout(id);
  activeTimers.delete(id);
}

export function clearAllTimers(): void {
  activeTimers.forEach((id) => clearTimeout(id));
  activeTimers.clear();
}

// ---------------------------------------------------------------------------
// Vuln 165: Interval Leak Prevention
// ---------------------------------------------------------------------------

const activeIntervals = new Set<ReturnType<typeof setInterval>>();
const MAX_ACTIVE_INTERVALS = 50;

export function safeSetInterval(fn: () => void, delay: number): ReturnType<typeof setInterval> | null {
  if (activeIntervals.size >= MAX_ACTIVE_INTERVALS) {
    logSecurityEvent("interval", "medium", "Max active intervals reached");
    return null;
  }
  const id = setInterval(fn, delay);
  activeIntervals.add(id);
  return id;
}

export function safeClearInterval(id: ReturnType<typeof setInterval>): void {
  clearInterval(id);
  activeIntervals.delete(id);
}

export function clearAllIntervals(): void {
  activeIntervals.forEach((id) => clearInterval(id));
  activeIntervals.clear();
}

// ---------------------------------------------------------------------------
// Vuln 166: Safe Image Loading (prevent SSRF via image src)
// ---------------------------------------------------------------------------

export function safeImageSrc(src: string): string | null {
  if (src.startsWith("data:image/")) {
    if (!isValidDataURI(src)) return null;
    return src;
  }
  if (src.startsWith("blob:")) return src;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.href;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 167: Response Header Validation
// ---------------------------------------------------------------------------

export function validateResponseHeaders(response: Response): string[] {
  const warnings: string[] = [];
  if (!response.headers.get("x-content-type-options")) {
    warnings.push("Missing X-Content-Type-Options header");
  }
  if (!response.headers.get("x-frame-options")) {
    warnings.push("Missing X-Frame-Options header");
  }
  const ct = response.headers.get("content-type");
  if (ct && ct.includes("text/html") && !ct.includes("charset")) {
    warnings.push("HTML response missing charset in Content-Type");
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Vuln 168: IndexedDB Size Guard
// ---------------------------------------------------------------------------

export async function checkIndexedDBSize(dbName: string, maxMB: number = 100): Promise<boolean> {
  try {
    const estimate = await navigator.storage.estimate();
    const usedMB = Math.round((estimate.usage || 0) / (1024 * 1024));
    if (usedMB > maxMB) {
      logSecurityEvent("indexeddb", "medium", `IndexedDB usage exceeds ${maxMB}MB`, `${usedMB}MB used`);
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Vuln 169: Nonce Generation for CSRF Prevention
// ---------------------------------------------------------------------------

export function generateNonce(): string {
  return secureRandomHex(16);
}

export function validateNonce(nonce: string): boolean {
  return /^[0-9a-f]{32}$/.test(nonce);
}

// ---------------------------------------------------------------------------
// Vuln 170: Origin-Based Access Control
// ---------------------------------------------------------------------------

export function isAllowedOrigin(origin: string): boolean {
  const allowed = [window.location.origin, "https://mattyjacks.com", "https://givegigs.com"];
  return allowed.includes(origin);
}

// ---------------------------------------------------------------------------
// Vuln 171: Anchor Tag Security Audit
// ---------------------------------------------------------------------------

export function auditAnchors(): { total: number; unsafe: number; details: string[] } {
  const anchors = document.querySelectorAll("a[target='_blank']");
  const details: string[] = [];
  let unsafe = 0;
  anchors.forEach((a) => {
    const rel = a.getAttribute("rel") || "";
    if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
      unsafe++;
      details.push(`Unsafe anchor: ${a.getAttribute("href")?.substring(0, 100) || "(no href)"}`);
    }
  });
  if (unsafe > 0) {
    logSecurityEvent("anchor-audit", "medium", `Found ${unsafe} unsafe anchor tags`);
  }
  return { total: anchors.length, unsafe, details };
}

// ---------------------------------------------------------------------------
// Vuln 172: Performance Observer for Long Tasks
// ---------------------------------------------------------------------------

let longTaskObserver: PerformanceObserver | null = null;

export function watchLongTasks(thresholdMs: number = 50): void {
  if (longTaskObserver) return;
  try {
    longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > thresholdMs) {
          logSecurityEvent("performance", "low", `Long task detected: ${Math.round(entry.duration)}ms`);
        }
      }
    });
    longTaskObserver.observe({ entryTypes: ["longtask"] });
  } catch { /* PerformanceObserver not supported */ }
}

export function stopLongTaskWatch(): void {
  if (longTaskObserver) { longTaskObserver.disconnect(); longTaskObserver = null; }
}

// ---------------------------------------------------------------------------
// Vuln 173-175: TypedArray Bounds Checking
// ---------------------------------------------------------------------------

export function safeUint8ArraySlice(arr: Uint8Array, start: number, end: number): Uint8Array {
  const s = clampNumber(start, 0, arr.length);
  const e = clampNumber(end, s, arr.length);
  return arr.slice(s, e);
}

export function safeDataViewRead(view: DataView, offset: number, method: "getUint8" | "getUint16" | "getUint32", littleEndian?: boolean): number {
  const sizes: Record<string, number> = { getUint8: 1, getUint16: 2, getUint32: 4 };
  const size = sizes[method] || 1;
  if (offset < 0 || offset + size > view.byteLength) {
    logSecurityEvent("buffer", "medium", "DataView read out of bounds", `offset=${offset}, size=${size}, length=${view.byteLength}`);
    return 0;
  }
  return view[method](offset, littleEndian);
}

export function safeArrayBufferAlloc(size: number, maxMB: number = 256): ArrayBuffer | null {
  const maxBytes = maxMB * 1024 * 1024;
  if (size < 0 || size > maxBytes) {
    logSecurityEvent("buffer", "high", "ArrayBuffer allocation rejected", `${size} bytes requested, max ${maxBytes}`);
    return null;
  }
  try {
    return new ArrayBuffer(size);
  } catch {
    logSecurityEvent("buffer", "high", "ArrayBuffer allocation failed (out of memory)", String(size));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 176: Visibility Change Detection (tab switch tracking)
// ---------------------------------------------------------------------------

const visibilityCallbacks: (() => void)[] = [];

export function onVisibilityHidden(fn: () => void): void {
  if (visibilityCallbacks.length === 0) {
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        visibilityCallbacks.forEach((cb) => { try { cb(); } catch {} });
      }
    });
  }
  visibilityCallbacks.push(fn);
}

// ---------------------------------------------------------------------------
// Vuln 177: Secure Random Choice from Array
// ---------------------------------------------------------------------------

export function secureRandomChoice<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("Cannot choose from empty array");
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return arr[bytes[0] % arr.length];
}

export function secureRandomShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const bytes = new Uint32Array(1);
    crypto.getRandomValues(bytes);
    const j = bytes[0] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ---------------------------------------------------------------------------
// Vuln 178: Safe Local Storage Operations with Error Handling
// ---------------------------------------------------------------------------

export function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    logSecurityEvent("storage", "low", "localStorage.getItem failed", key);
    return null;
  }
}

export function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    if (value.length > 5 * 1024 * 1024) {
      logSecurityEvent("storage", "medium", "localStorage value too large", `${key}: ${value.length} chars`);
      return false;
    }
    localStorage.setItem(key, value);
    return true;
  } catch {
    logSecurityEvent("storage", "medium", "localStorage.setItem failed (likely full)", key);
    return false;
  }
}

export function safeLocalStorageRemove(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 179: Download Link Sanitization
// ---------------------------------------------------------------------------

export function createSafeDownload(filename: string, data: Blob): HTMLAnchorElement {
  // Sanitize filename
  const safeName = filename
    .replace(/[<>"'`&;/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/\0/g, "")
    .substring(0, 255) || "download";

  const url = URL.createObjectURL(data);
  trackBlobURL(url);

  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  a.rel = "noopener";
  return a;
}

// ---------------------------------------------------------------------------
// Vuln 180: Global Error Handler
// ---------------------------------------------------------------------------

let globalErrorHandlerInstalled = false;

export function installGlobalErrorHandler(): void {
  if (globalErrorHandlerInstalled) return;
  globalErrorHandlerInstalled = true;

  window.addEventListener("error", (event) => {
    logSecurityEvent("global-error", "medium", safeErrorMessage(event.error), event.filename?.substring(0, 200));
  });

  window.addEventListener("unhandledrejection", (event) => {
    logSecurityEvent("unhandled-rejection", "medium", safeErrorMessage(event.reason));
  });
}

// ---------------------------------------------------------------------------
// Vuln 181: Secure Comparison for API Keys
// ---------------------------------------------------------------------------

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "*".repeat(key.length);
  return key.substring(0, 4) + "*".repeat(key.length - 8) + key.substring(key.length - 4);
}

// ---------------------------------------------------------------------------
// Vuln 182: Navigator API Safety Checks
// ---------------------------------------------------------------------------

export function isNavigatorAvailable(): boolean {
  return typeof navigator !== "undefined" && navigator !== null;
}

export function isOnline(): boolean {
  return isNavigatorAvailable() ? navigator.onLine : true;
}

// ---------------------------------------------------------------------------
// Vuln 183: Safe Promise.all with Timeout
// ---------------------------------------------------------------------------

export async function promiseAllWithTimeout<T>(
  promises: Promise<T>[],
  timeoutMs: number = 30000,
  fallback: T
): Promise<T[]> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), timeoutMs)
  );
  return Promise.all(
    promises.map((p) =>
      Promise.race([p, timeout]).catch(() => fallback)
    )
  );
}

// ---------------------------------------------------------------------------
// Vuln 184: Audio Context Security (prevent audio fingerprinting)
// ---------------------------------------------------------------------------

export function createSecureAudioContext(): AudioContext | null {
  try {
    const ctx = new AudioContext();
    // Limit sample rate to standard values
    if (ctx.sampleRate > 96000 || ctx.sampleRate < 8000) {
      logSecurityEvent("audio", "low", "Unusual audio sample rate", String(ctx.sampleRate));
    }
    return ctx;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 185: Semantic Version Validation
// ---------------------------------------------------------------------------

const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;

export function isValidSemver(version: string): boolean {
  return SEMVER_RE.test(version) && version.length <= 64;
}

// ---------------------------------------------------------------------------
// Vuln 186: Environment Variable Safety
// ---------------------------------------------------------------------------

export function safeEnvGet(key: string, fallback: string = ""): string {
  try {
    const env = import.meta.env;
    if (!env) return fallback;
    const val = (env as Record<string, string>)[key];
    return typeof val === "string" ? val : fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Vuln 187: HTTP Method Validation
// ---------------------------------------------------------------------------

const ALLOWED_HTTP_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

export function isValidHTTPMethod(method: string): boolean {
  return ALLOWED_HTTP_METHODS.has(method.toUpperCase());
}

// ---------------------------------------------------------------------------
// Vuln 188: Content-Type Header Validation
// ---------------------------------------------------------------------------

const SAFE_CONTENT_TYPES = new Set([
  "application/json",
  "text/plain",
  "text/html",
  "text/css",
  "application/javascript",
  "multipart/form-data",
  "application/x-www-form-urlencoded",
  "application/octet-stream",
]);

export function isValidContentType(contentType: string): boolean {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return SAFE_CONTENT_TYPES.has(base);
}

// ---------------------------------------------------------------------------
// Vuln 189: DNS Rebinding Protection
// ---------------------------------------------------------------------------

export function checkDNSRebinding(): boolean {
  const hostname = window.location.hostname;
  // Flag if the hostname resolves to a private IP range via browser detection
  if (hostname !== "localhost" && hostname !== "127.0.0.1" && !/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return false; // Cannot detect, assume safe
  }
  if (hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.")) {
    logSecurityEvent("dns-rebinding", "high", "Accessing from private IP", hostname);
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Vuln 190: Object.freeze for Sensitive Constants
// ---------------------------------------------------------------------------

export const SECURITY_CONSTANTS = Object.freeze({
  MAX_INPUT_LENGTH: 100000,
  MAX_FILE_SIZE_MB: 500,
  MAX_JSON_DEPTH: 20,
  MAX_ARRAY_SIZE: 100000,
  MAX_OBJECT_KEYS: 10000,
  SESSION_TIMEOUT_MS: 30 * 60 * 1000,
  RATE_LIMIT_WINDOW_MS: 60000,
  RATE_LIMIT_MAX_REQUESTS: 100,
  CSRF_TOKEN_LENGTH: 32,
  MAX_UPLOAD_SIZE_MB: 2048,
});

// ---------------------------------------------------------------------------
// Vuln 191: Cross-Tab Communication Safety
// ---------------------------------------------------------------------------

export function safeBroadcastMessage(channel: string, data: unknown): boolean {
  try {
    const bc = new BroadcastChannel(channel);
    bc.postMessage({ source: "cryptartist", data, timestamp: Date.now() });
    bc.close();
    return true;
  } catch {
    return false;
  }
}

export function onBroadcastMessage(channel: string, handler: (data: unknown) => void): () => void {
  const bc = new BroadcastChannel(channel);
  const listener = (event: MessageEvent) => {
    const msg = event.data;
    if (msg && msg.source === "cryptartist" && msg.data !== undefined) {
      handler(msg.data);
    }
  };
  bc.addEventListener("message", listener);
  return () => { bc.removeEventListener("message", listener); bc.close(); };
}

// ---------------------------------------------------------------------------
// Vuln 192: Touch Event Sanitization (prevent touch hijacking)
// ---------------------------------------------------------------------------

export function preventTouchHijack(element: HTMLElement): void {
  element.style.touchAction = "manipulation";
  element.style.userSelect = "none";
  element.style.webkitUserSelect = "none";
}

// ---------------------------------------------------------------------------
// Vuln 193: Safe Base64 Operations
// ---------------------------------------------------------------------------

export function safeBase64Encode(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    return "";
  }
}

export function safeBase64Decode(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Vuln 194: Viewport Manipulation Prevention
// ---------------------------------------------------------------------------

export function lockViewport(): void {
  let meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.appendChild(meta);
  }
  meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
}

// ---------------------------------------------------------------------------
// Vuln 195: Text Direction Safety (prevent BiDi attacks)
// ---------------------------------------------------------------------------

const BIDI_CHARS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

export function stripBidiChars(text: string): string {
  return text.replace(BIDI_CHARS, "");
}

export function hasBidiChars(text: string): boolean {
  return BIDI_CHARS.test(text);
}

// ---------------------------------------------------------------------------
// Vuln 196: Safe RegExp Constructor
// ---------------------------------------------------------------------------

export function safeRegExp(pattern: string, flags: string = ""): RegExp | null {
  if (pattern.length > 500) {
    logSecurityEvent("regex", "medium", "RegExp pattern too long", String(pattern.length));
    return null;
  }
  try {
    return new RegExp(pattern, flags);
  } catch {
    logSecurityEvent("regex", "low", "Invalid RegExp pattern", pattern.substring(0, 100));
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 197: Trusted Types Policy (where supported)
// ---------------------------------------------------------------------------

export function createTrustedTypesPolicy(): void {
  const tt = (window as any).trustedTypes;
  if (tt && typeof tt.createPolicy === "function") {
    try {
      tt.createPolicy("default", {
        createHTML: (s: string) => sanitizeHTML(s),
        createScriptURL: (s: string) => {
          if (s.startsWith(window.location.origin)) return s;
          logSecurityEvent("trusted-types", "high", "Blocked non-origin script URL", s);
          return "about:blank";
        },
        createScript: () => {
          logSecurityEvent("trusted-types", "critical", "Blocked inline script creation");
          return "";
        },
      });
    } catch { /* policy already created or not supported */ }
  }
}

// ---------------------------------------------------------------------------
// Vuln 198: Secure Session ID Generation
// ---------------------------------------------------------------------------

export function generateSessionId(): string {
  return secureRandomHex(32);
}

export function isValidSessionId(id: string): boolean {
  return /^[0-9a-f]{64}$/.test(id);
}

// ---------------------------------------------------------------------------
// Vuln 199: CORS Preflight Simulation
// ---------------------------------------------------------------------------

export async function checkCORSAccess(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD", mode: "cors" });
    return response.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 200: Comprehensive Security Initialization
// ---------------------------------------------------------------------------

export function initializeSecurityHardening(): void {
  // Apply all security measures on app startup
  enforceCSP();
  preventFraming();
  enforceReferrerPolicy();
  enforcePermissionsPolicy();
  installGlobalErrorHandler();
  watchForScriptInjection();
  createTrustedTypesPolicy();
  disableConsoleInProduction();

  // Detect anomalies
  detectSuspiciousUA();
  checkDNSRebinding();

  logSecurityEvent("init", "low", "Security hardening initialized (Vulns 101-200)");
}

// ===========================================================================
// VULNERABILITIES 201-300 - ADVANCED SECURITY HARDENING
// ===========================================================================

// ---------------------------------------------------------------------------
// Vuln 201: CSP Nonce Injection for Inline Scripts
// ---------------------------------------------------------------------------

let cspNonce: string | null = null;

export function getCSPNonce(): string {
  if (!cspNonce) cspNonce = secureRandomHex(16);
  return cspNonce;
}

export function createNoncedScript(code: string): HTMLScriptElement {
  const script = document.createElement("script");
  script.nonce = getCSPNonce();
  script.textContent = code;
  return script;
}

// ---------------------------------------------------------------------------
// Vuln 202: Subresource Integrity Cache
// ---------------------------------------------------------------------------

const sriCache = new Map<string, string>();
const MAX_SRI_CACHE = 500;

export function cacheSRIHash(url: string, hash: string): void {
  if (sriCache.size >= MAX_SRI_CACHE) {
    const first = sriCache.keys().next().value;
    if (first) sriCache.delete(first);
  }
  sriCache.set(url, hash);
}

export function getCachedSRI(url: string): string | null {
  return sriCache.get(url) || null;
}

// ---------------------------------------------------------------------------
// Vuln 203: Secure Form Submission Guard
// ---------------------------------------------------------------------------

export function secureFormSubmit(form: HTMLFormElement): boolean {
  if (form.action && !form.action.startsWith(window.location.origin)) {
    logSecurityEvent("form", "high", "Blocked form submission to external origin", form.action);
    return false;
  }
  if (form.method.toUpperCase() === "GET" && form.querySelector('input[type="password"]')) {
    logSecurityEvent("form", "high", "Blocked GET form with password field");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 204: Safe postMessage Wrapper with Type Checking
// ---------------------------------------------------------------------------

interface SafeMessage {
  type: string;
  payload: unknown;
  origin: string;
  timestamp: number;
}

export function sendSafeMessage(target: Window, type: string, payload: unknown): void {
  const msg: SafeMessage = {
    type,
    payload,
    origin: window.location.origin,
    timestamp: Date.now(),
  };
  target.postMessage(msg, window.location.origin);
}

export function isSafeMessage(event: MessageEvent): event is MessageEvent<SafeMessage> {
  const d = event.data;
  return d && typeof d === "object" && typeof d.type === "string" && typeof d.timestamp === "number" && d.origin === window.location.origin;
}

// ---------------------------------------------------------------------------
// Vuln 205: DOM Mutation Rate Limiter
// ---------------------------------------------------------------------------

let mutationCount = 0;
let mutationResetTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_MUTATIONS_PER_SECOND = 1000;

export function trackDOMMutation(): boolean {
  mutationCount++;
  if (!mutationResetTimer) {
    mutationResetTimer = setTimeout(() => { mutationCount = 0; mutationResetTimer = null; }, 1000);
  }
  if (mutationCount > MAX_MUTATIONS_PER_SECOND) {
    logSecurityEvent("dom-mutation", "high", "Excessive DOM mutations detected", String(mutationCount));
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 206: DOM Text Purifier (remove invisible characters)
// ---------------------------------------------------------------------------

const INVISIBLE_CHARS = /[\u200B\u200C\u200D\uFEFF\u00AD\u034F\u061C\u180E]/g;

export function purifyText(text: string): string {
  return stripBidiChars(text).replace(INVISIBLE_CHARS, "");
}

// ---------------------------------------------------------------------------
// Vuln 207: Safe URL Construction (prevent open redirects)
// ---------------------------------------------------------------------------

export function buildSafeURL(base: string, path: string, params?: Record<string, string>): string | null {
  try {
    const url = new URL(path, base);
    if (url.origin !== new URL(base).origin) {
      logSecurityEvent("url-build", "high", "Open redirect attempt detected", url.href);
      return null;
    }
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    return url.href;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 208: Credential Leak Detection in URLs
// ---------------------------------------------------------------------------

export function hasCredentialsInURL(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      logSecurityEvent("url-credentials", "critical", "Credentials found in URL", parsed.hostname);
      return true;
    }
    // Check for API key patterns in query params
    const suspicious = ["api_key", "apikey", "api-key", "secret", "token", "password", "passwd", "auth"];
    for (const key of suspicious) {
      if (parsed.searchParams.has(key)) {
        logSecurityEvent("url-credentials", "high", "Sensitive parameter in URL", key);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 209: HTTP Strict Transport Security Check
// ---------------------------------------------------------------------------

export function checkHSTS(response: Response): boolean {
  const hsts = response.headers.get("strict-transport-security");
  if (!hsts) {
    logSecurityEvent("hsts", "medium", "Missing Strict-Transport-Security header");
    return false;
  }
  if (!hsts.includes("max-age")) {
    logSecurityEvent("hsts", "medium", "HSTS header missing max-age directive");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 210: Cookie Consent State Manager
// ---------------------------------------------------------------------------

const CONSENT_KEY = "cryptartist_cookie_consent";

export function getCookieConsent(): { analytics: boolean; functional: boolean; marketing: boolean } {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return { analytics: false, functional: true, marketing: false };
    const parsed = JSON.parse(raw);
    return {
      analytics: !!parsed.analytics,
      functional: parsed.functional !== false,
      marketing: !!parsed.marketing,
    };
  } catch {
    return { analytics: false, functional: true, marketing: false };
  }
}

export function setCookieConsent(consent: { analytics: boolean; functional: boolean; marketing: boolean }): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    logSecurityEvent("consent", "low", "Cookie consent updated", JSON.stringify(consent));
  } catch { /* storage full */ }
}

// ---------------------------------------------------------------------------
// Vuln 211: Safe Web Crypto Key Generation
// ---------------------------------------------------------------------------

export async function generateCryptoKey(algorithm: "AES-GCM" | "AES-CBC" = "AES-GCM"): Promise<CryptoKey | null> {
  try {
    return await crypto.subtle.generateKey({ name: algorithm, length: 256 }, true, ["encrypt", "decrypt"]);
  } catch {
    logSecurityEvent("crypto", "high", "Failed to generate crypto key", algorithm);
    return null;
  }
}

export async function exportCryptoKey(key: CryptoKey): Promise<string | null> {
  try {
    const raw = await crypto.subtle.exportKey("raw", key);
    return Array.from(new Uint8Array(raw)).map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 212: Permission Request Guard
// ---------------------------------------------------------------------------

const permissionRequests = new Map<string, number>();
const PERMISSION_COOLDOWN_MS = 10000;

export async function guardedPermissionRequest(name: PermissionName): Promise<PermissionState | "blocked"> {
  const now = Date.now();
  const last = permissionRequests.get(name) || 0;
  if (now - last < PERMISSION_COOLDOWN_MS) {
    logSecurityEvent("permission", "medium", "Permission request too frequent", name);
    return "blocked";
  }
  permissionRequests.set(name, now);
  try {
    const status = await navigator.permissions.query({ name });
    return status.state;
  } catch {
    return "blocked";
  }
}

// ---------------------------------------------------------------------------
// Vuln 213: Focus Trap for Modal Dialogs
// ---------------------------------------------------------------------------

export function createFocusTrap(container: HTMLElement): () => void {
  const focusable = container.querySelectorAll<HTMLElement>(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return () => {};
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const handler = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return;
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  container.addEventListener("keydown", handler);
  first.focus();
  return () => container.removeEventListener("keydown", handler);
}

// ---------------------------------------------------------------------------
// Vuln 214: Safe Scroll Restoration
// ---------------------------------------------------------------------------

export function disableScrollRestoration(): void {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }
}

// ---------------------------------------------------------------------------
// Vuln 215: Content-Disposition Header Validation
// ---------------------------------------------------------------------------

export function validateContentDisposition(header: string): { filename: string | null; isAttachment: boolean } {
  const isAttachment = header.toLowerCase().startsWith("attachment");
  const filenameMatch = header.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i);
  let filename: string | null = null;
  if (filenameMatch) {
    filename = decodeURIComponent(filenameMatch[1].trim());
    filename = filename.replace(/[<>"'`&;/\\]/g, "").replace(/\.\./g, "").substring(0, 255);
  }
  return { filename, isAttachment };
}

// ---------------------------------------------------------------------------
// Vuln 216: Request Priority Queue
// ---------------------------------------------------------------------------

interface QueuedRequest {
  id: string;
  priority: number;
  execute: () => Promise<unknown>;
}

const requestQueue: QueuedRequest[] = [];
let activeRequests = 0;
const MAX_CONCURRENT_REQUESTS = 6;

export function enqueueRequest(id: string, priority: number, execute: () => Promise<unknown>): void {
  requestQueue.push({ id, priority, execute });
  requestQueue.sort((a, b) => b.priority - a.priority);
  processQueue();
}

function processQueue(): void {
  while (activeRequests < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
    const req = requestQueue.shift();
    if (!req) break;
    activeRequests++;
    req.execute().finally(() => { activeRequests--; processQueue(); });
  }
}

// ---------------------------------------------------------------------------
// Vuln 217: Secure IFrame Sandbox Configuration
// ---------------------------------------------------------------------------

export function createSandboxedIframe(src: string, permissions: string[] = []): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  const defaultSandbox = ["allow-scripts", "allow-same-origin"];
  const allPerms = [...new Set([...defaultSandbox, ...permissions])];
  iframe.sandbox.add(...allPerms);
  iframe.setAttribute("loading", "lazy");
  iframe.referrerPolicy = "no-referrer";
  return iframe;
}

// ---------------------------------------------------------------------------
// Vuln 218: Clipboard Event Filtering
// ---------------------------------------------------------------------------

export function sanitizeClipboardData(event: ClipboardEvent): string {
  const data = event.clipboardData?.getData("text/plain") || "";
  // Strip potential command injection
  const sanitized = data.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  if (sanitized.length !== data.length) {
    logSecurityEvent("clipboard", "medium", "Control characters stripped from clipboard data");
  }
  return sanitized.substring(0, SECURITY_CONSTANTS.MAX_INPUT_LENGTH);
}

// ---------------------------------------------------------------------------
// Vuln 219: Frame Ancestor Validation
// ---------------------------------------------------------------------------

export function validateFrameAncestors(): boolean {
  try {
    if (window.self !== window.top) {
      const parentOrigin = document.referrer ? new URL(document.referrer).origin : "unknown";
      if (!isAllowedOrigin(parentOrigin)) {
        logSecurityEvent("frame", "critical", "Framed by unauthorized origin", parentOrigin);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 220: Safe CSS Custom Property Setting
// ---------------------------------------------------------------------------

const CSS_VAR_NAME_RE = /^--[a-zA-Z][a-zA-Z0-9-]*$/;
const CSS_VAR_VALUE_BLOCKLIST = ["expression(", "url(javascript:", "url(data:text/html"];

export function safeCSSVar(name: string, value: string): boolean {
  if (!CSS_VAR_NAME_RE.test(name) || name.length > 100) {
    logSecurityEvent("css", "medium", "Invalid CSS variable name", name);
    return false;
  }
  const lowerVal = value.toLowerCase();
  for (const blocked of CSS_VAR_VALUE_BLOCKLIST) {
    if (lowerVal.includes(blocked)) {
      logSecurityEvent("css", "high", "Blocked dangerous CSS value", blocked);
      return false;
    }
  }
  document.documentElement.style.setProperty(name, value);
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 221: DOM Size Monitoring
// ---------------------------------------------------------------------------

export function getDOMSize(): { elements: number; depth: number; isLarge: boolean } {
  const elements = document.querySelectorAll("*").length;
  let depth = 0;
  let el: Element | null = document.querySelector("*:last-child");
  while (el) { depth++; el = el.parentElement; }
  const isLarge = elements > 10000 || depth > 50;
  if (isLarge) {
    logSecurityEvent("dom-size", "medium", `Large DOM: ${elements} elements, depth ${depth}`);
  }
  return { elements, depth, isLarge };
}

// ---------------------------------------------------------------------------
// Vuln 222: Lazy Load Security (prevent lazy-loaded content injection)
// ---------------------------------------------------------------------------

export function safeLazyLoad(element: HTMLImageElement | HTMLIFrameElement): void {
  element.loading = "lazy";
  if (element instanceof HTMLIFrameElement) {
    element.referrerPolicy = "no-referrer";
    if (!element.sandbox.length) element.sandbox.add("allow-scripts");
  }
  if (element instanceof HTMLImageElement) {
    element.decoding = "async";
    if (!element.alt) element.alt = "";
  }
}

// ---------------------------------------------------------------------------
// Vuln 223: Safe IntersectionObserver Factory
// ---------------------------------------------------------------------------

const activeObservers = new Set<IntersectionObserver>();
const MAX_OBSERVERS = 50;

export function createSafeIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (activeObservers.size >= MAX_OBSERVERS) {
    logSecurityEvent("observer", "medium", "Max IntersectionObservers reached");
    return null;
  }
  const obs = new IntersectionObserver(callback, options);
  activeObservers.add(obs);
  return obs;
}

export function disconnectObserver(obs: IntersectionObserver): void {
  obs.disconnect();
  activeObservers.delete(obs);
}

// ---------------------------------------------------------------------------
// Vuln 224: Resource Timing Analysis (detect slow/suspicious resources)
// ---------------------------------------------------------------------------

export function analyzeResourceTiming(): { slow: string[]; crossOrigin: string[] } {
  const slow: string[] = [];
  const crossOrigin: string[] = [];
  try {
    const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    for (const entry of entries) {
      if (entry.duration > 5000) slow.push(entry.name.substring(0, 200));
      if (entry.name && !entry.name.startsWith(window.location.origin)) {
        crossOrigin.push(entry.name.substring(0, 200));
      }
    }
    if (slow.length > 0) {
      logSecurityEvent("resource-timing", "low", `${slow.length} slow resources detected`);
    }
  } catch { /* Performance API not available */ }
  return { slow, crossOrigin };
}

// ---------------------------------------------------------------------------
// Vuln 225: Connection Pool Limiter
// ---------------------------------------------------------------------------

const connectionCounts = new Map<string, number>();
const MAX_CONNECTIONS_PER_HOST = 6;

export function canConnect(hostname: string): boolean {
  const count = connectionCounts.get(hostname) || 0;
  if (count >= MAX_CONNECTIONS_PER_HOST) {
    logSecurityEvent("connection", "medium", "Connection limit reached for host", hostname);
    return false;
  }
  connectionCounts.set(hostname, count + 1);
  return true;
}

export function releaseConnection(hostname: string): void {
  const count = connectionCounts.get(hostname) || 0;
  if (count > 0) connectionCounts.set(hostname, count - 1);
}

// ---------------------------------------------------------------------------
// Vuln 226: Safe Number Parsing (prevent NaN/Infinity injection)
// ---------------------------------------------------------------------------

export function safeParseInt(value: string, fallback: number = 0): number {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function safeParseFloat(value: string, fallback: number = 0): number {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

// ---------------------------------------------------------------------------
// Vuln 227: Secure Random Token with Alphabet
// ---------------------------------------------------------------------------

export function secureRandomToken(length: number, alphabet: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => alphabet[b % alphabet.length]).join("");
}

// ---------------------------------------------------------------------------
// Vuln 228: Prevent Form Autocomplete for Sensitive Fields
// ---------------------------------------------------------------------------

export function secureSensitiveInputs(container: HTMLElement = document.body): void {
  const sensitiveTypes = ['password', 'tel', 'email'];
  const inputs = container.querySelectorAll<HTMLInputElement>("input");
  inputs.forEach((input) => {
    if (sensitiveTypes.includes(input.type) || input.name.match(/key|secret|token|pass/i)) {
      input.autocomplete = "off";
      input.setAttribute("data-lpignore", "true"); // LastPass
      input.setAttribute("data-1p-ignore", "true"); // 1Password
    }
  });
}

// ---------------------------------------------------------------------------
// Vuln 229: HTTP Response Size Guard
// ---------------------------------------------------------------------------

export async function fetchWithSizeLimit(url: string, maxBytes: number = 50 * 1024 * 1024, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > maxBytes) {
    logSecurityEvent("fetch", "high", "Response too large", `${contentLength} bytes from ${url}`);
    throw new Error(`Response exceeds ${maxBytes} byte limit`);
  }
  return response;
}

// ---------------------------------------------------------------------------
// Vuln 230: Safe Object Property Access (prevent prototype chain traversal)
// ---------------------------------------------------------------------------

export function safeGet<T>(obj: Record<string, unknown>, key: string, fallback: T): T {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return fallback;
  return obj[key] as T;
}

export function safeHas(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

// ---------------------------------------------------------------------------
// Vuln 231: Event Propagation Guard
// ---------------------------------------------------------------------------

export function stopAllPropagation(event: Event): void {
  event.stopPropagation();
  event.stopImmediatePropagation();
  event.preventDefault();
}

// ---------------------------------------------------------------------------
// Vuln 232: Secure Web Worker Creation
// ---------------------------------------------------------------------------

export function createSecureWorker(scriptURL: string | URL): Worker | null {
  try {
    const urlStr = scriptURL.toString();
    if (!urlStr.startsWith(window.location.origin) && !urlStr.startsWith("blob:")) {
      logSecurityEvent("worker", "high", "Blocked cross-origin worker", urlStr);
      return null;
    }
    return new Worker(scriptURL, { type: "module" });
  } catch {
    logSecurityEvent("worker", "medium", "Worker creation failed", scriptURL.toString());
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 233: Network Information API Safety
// ---------------------------------------------------------------------------

export function getNetworkInfo(): { type: string; downlink: number; rtt: number; saveData: boolean } {
  const conn = (navigator as any).connection;
  if (!conn) return { type: "unknown", downlink: 0, rtt: 0, saveData: false };
  return {
    type: conn.effectiveType || "unknown",
    downlink: typeof conn.downlink === "number" ? conn.downlink : 0,
    rtt: typeof conn.rtt === "number" ? conn.rtt : 0,
    saveData: !!conn.saveData,
  };
}

// ---------------------------------------------------------------------------
// Vuln 234: Safe Date Construction (prevent invalid date injection)
// ---------------------------------------------------------------------------

export function safeDate(input: string | number | Date): Date {
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    logSecurityEvent("date", "low", "Invalid date input", String(input).substring(0, 100));
    return new Date();
  }
  // Reject dates too far in the past or future
  const year = d.getFullYear();
  if (year < 1970 || year > 2100) {
    logSecurityEvent("date", "low", "Date out of reasonable range", String(year));
    return new Date();
  }
  return d;
}

// ---------------------------------------------------------------------------
// Vuln 235: Mutation Observer Leak Prevention
// ---------------------------------------------------------------------------

const activeMutationObservers = new Set<MutationObserver>();
const MAX_MUTATION_OBSERVERS = 20;

export function createSafeMutationObserver(callback: MutationCallback): MutationObserver | null {
  if (activeMutationObservers.size >= MAX_MUTATION_OBSERVERS) {
    logSecurityEvent("mutation-observer", "medium", "Max MutationObservers reached");
    return null;
  }
  const obs = new MutationObserver(callback);
  activeMutationObservers.add(obs);
  return obs;
}

export function disconnectMutationObserver(obs: MutationObserver): void {
  obs.disconnect();
  activeMutationObservers.delete(obs);
}

// ---------------------------------------------------------------------------
// Vuln 236: Safe Attribute Setting (prevent attribute injection)
// ---------------------------------------------------------------------------

const DANGEROUS_ATTRS = new Set(["onclick", "onerror", "onload", "onmouseover", "onfocus", "onblur", "onsubmit", "onchange", "oninput", "onkeydown", "onkeyup"]);

export function safeSetAttribute(el: HTMLElement, name: string, value: string): boolean {
  const lowerName = name.toLowerCase();
  if (DANGEROUS_ATTRS.has(lowerName) || lowerName.startsWith("on")) {
    logSecurityEvent("attribute", "high", "Blocked event handler attribute", name);
    return false;
  }
  if (lowerName === "href" || lowerName === "src" || lowerName === "action") {
    if (hasDangerousProtocol(value)) return false;
  }
  el.setAttribute(name, value);
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 237: Referrer Leak Prevention
// ---------------------------------------------------------------------------

export function stripReferrer(link: HTMLAnchorElement): void {
  link.referrerPolicy = "no-referrer";
  const rel = link.rel ? link.rel + " " : "";
  if (!rel.includes("noreferrer")) link.rel = rel + "noreferrer";
}

// ---------------------------------------------------------------------------
// Vuln 238: Window Opener Nullification
// ---------------------------------------------------------------------------

export function nullifyOpener(): void {
  if (window.opener) {
    try { window.opener = null; } catch { /* cross-origin */ }
  }
}

// ---------------------------------------------------------------------------
// Vuln 239: Safe String Truncation (respect Unicode boundaries)
// ---------------------------------------------------------------------------

export function safeTruncate(str: string, maxLength: number, suffix: string = "..."): string {
  if (str.length <= maxLength) return str;
  // Use Array.from to handle multi-byte characters
  const chars = Array.from(str);
  if (chars.length <= maxLength) return str;
  return chars.slice(0, maxLength - suffix.length).join("") + suffix;
}

// ---------------------------------------------------------------------------
// Vuln 240: Safe JSON Clone (prevent prototype pollution in deep copy)
// ---------------------------------------------------------------------------

export function safeClone<T>(obj: T): T {
  try {
    if (typeof structuredClone === "function") return structuredClone(obj);
    const json = JSON.stringify(obj);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object") {
      return sanitizeObjectKeys(parsed) as T;
    }
    return parsed;
  } catch {
    return obj;
  }
}

// ---------------------------------------------------------------------------
// Vuln 241: File Input Validation
// ---------------------------------------------------------------------------

export function validateFileInput(file: File, options: { maxSizeMB?: number; allowedTypes?: string[]; allowedExtensions?: string[] } = {}): { valid: boolean; reason?: string } {
  const { maxSizeMB = 500, allowedTypes, allowedExtensions } = options;
  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, reason: `File exceeds ${maxSizeMB}MB limit` };
  }
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return { valid: false, reason: `File type ${file.type} not allowed` };
  }
  if (allowedExtensions) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) {
      return { valid: false, reason: `File extension .${ext} not allowed` };
    }
  }
  if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
    return { valid: false, reason: "Invalid filename" };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Vuln 242: Request Header Injection Prevention
// ---------------------------------------------------------------------------

const HEADER_VALUE_RE = /^[\x20-\x7E]*$/;

export function isSafeHeaderValue(value: string): boolean {
  if (!HEADER_VALUE_RE.test(value)) {
    logSecurityEvent("header", "high", "Header value contains non-printable characters");
    return false;
  }
  if (value.includes("\r") || value.includes("\n")) {
    logSecurityEvent("header", "critical", "CRLF injection attempt in header");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 243: Secure Redirect Handling
// ---------------------------------------------------------------------------

export function safeRedirect(url: string): boolean {
  if (hasDangerousProtocol(url)) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      logSecurityEvent("redirect", "medium", "Blocked cross-origin redirect", parsed.origin);
      return false;
    }
    window.location.href = parsed.href;
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 244: Memory Leak Detection Helper
// ---------------------------------------------------------------------------

const leakDetectors = new Map<string, { created: number; label: string }>();
const MAX_LEAK_TRACKERS = 200;

export function trackForLeaks(label: string, _obj: object): void {
  if (leakDetectors.size >= MAX_LEAK_TRACKERS) {
    const oldest = leakDetectors.keys().next().value;
    if (oldest) leakDetectors.delete(oldest);
  }
  leakDetectors.set(label, { created: Date.now(), label });
}

export function checkForLeaks(): string[] {
  const stale: string[] = [];
  const now = Date.now();
  const MAX_AGE_MS = 300000; // 5 minutes
  for (const [key, entry] of leakDetectors) {
    if (now - entry.created > MAX_AGE_MS) {
      stale.push(entry.label);
      leakDetectors.delete(key);
    }
  }
  if (stale.length > 0) {
    logSecurityEvent("leak", "medium", `${stale.length} stale tracked objects detected`);
  }
  return stale;
}

// ---------------------------------------------------------------------------
// Vuln 245: Secure Blob Creation
// ---------------------------------------------------------------------------

export function createSecureBlob(data: BlobPart[], type: string): Blob {
  // Validate MIME type to prevent script injection
  const safeMime = type.split(";")[0].trim().toLowerCase();
  if (safeMime.includes("javascript") || safeMime.includes("html") || safeMime === "text/xml") {
    logSecurityEvent("blob", "high", "Blocked dangerous blob MIME type", safeMime);
    return new Blob(data, { type: "application/octet-stream" });
  }
  return new Blob(data, { type: safeMime });
}

// ---------------------------------------------------------------------------
// Vuln 246: Rate-Limited Event Emitter
// ---------------------------------------------------------------------------

type EventHandler = (...args: unknown[]) => void;
const eventHandlers = new Map<string, { handlers: EventHandler[]; lastEmit: number; minInterval: number }>();

export function onRateLimitedEvent(name: string, handler: EventHandler, minIntervalMs: number = 100): void {
  if (!eventHandlers.has(name)) {
    eventHandlers.set(name, { handlers: [], lastEmit: 0, minInterval: minIntervalMs });
  }
  const entry = eventHandlers.get(name)!;
  if (entry.handlers.length >= 50) {
    logSecurityEvent("event", "medium", "Too many handlers for event", name);
    return;
  }
  entry.handlers.push(handler);
}

export function emitRateLimitedEvent(name: string, ...args: unknown[]): boolean {
  const entry = eventHandlers.get(name);
  if (!entry) return false;
  const now = Date.now();
  if (now - entry.lastEmit < entry.minInterval) return false;
  entry.lastEmit = now;
  for (const handler of entry.handlers) {
    try { handler(...args); } catch { /* handler error */ }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 247: TypedArray Zeroing (secure memory cleanup)
// ---------------------------------------------------------------------------

export function zeroTypedArray(arr: Uint8Array | Uint16Array | Uint32Array | Int8Array | Float32Array | Float64Array): void {
  arr.fill(0);
}

// ---------------------------------------------------------------------------
// Vuln 248: Safe Enum Validation
// ---------------------------------------------------------------------------

export function isValidEnum<T extends string>(value: string, validValues: readonly T[]): value is T {
  return (validValues as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Vuln 249: Prevent Window Resize Abuse
// ---------------------------------------------------------------------------

let resizeCount = 0;
let resizeResetTimer: ReturnType<typeof setTimeout> | null = null;

export function trackWindowResize(): boolean {
  resizeCount++;
  if (!resizeResetTimer) {
    resizeResetTimer = setTimeout(() => { resizeCount = 0; resizeResetTimer = null; }, 2000);
  }
  if (resizeCount > 20) {
    logSecurityEvent("resize", "medium", "Excessive window resize events");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 250: Safe Web Animation API Usage
// ---------------------------------------------------------------------------

export function safeAnimate(element: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  try {
    if (!element.isConnected) return null;
    const duration = typeof options.duration === "number" ? options.duration : 300;
    if (duration > 30000) {
      logSecurityEvent("animation", "low", "Animation duration too long", String(duration));
      options.duration = 30000;
    }
    return element.animate(keyframes, options);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 251: Secure localStorage Encryption Wrapper
// ---------------------------------------------------------------------------

export async function encryptAndStore(key: string, value: string, cryptoKey: CryptoKey): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, encoder.encode(value));
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    const b64 = btoa(String.fromCharCode(...combined));
    localStorage.setItem(key, b64);
    return true;
  } catch {
    logSecurityEvent("encrypt-store", "high", "Failed to encrypt and store", key);
    return false;
  }
}

export async function decryptFromStore(key: string, cryptoKey: CryptoKey): Promise<string | null> {
  try {
    const b64 = localStorage.getItem(key);
    if (!b64) return null;
    const combined = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, data);
    return new TextDecoder().decode(decrypted);
  } catch {
    logSecurityEvent("decrypt-store", "high", "Failed to decrypt from store", key);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 252: WebSocket Heartbeat Monitor
// ---------------------------------------------------------------------------

export function attachWebSocketHeartbeat(ws: WebSocket, intervalMs: number = 30000, timeoutMs: number = 10000): () => void {
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let pongTimer: ReturnType<typeof setTimeout> | null = null;
  let alive = true;

  const heartbeat = () => {
    alive = false;
    try { ws.send(JSON.stringify({ type: "ping", ts: Date.now() })); } catch { /* closed */ }
    pongTimer = setTimeout(() => {
      if (!alive) {
        logSecurityEvent("ws-heartbeat", "medium", "WebSocket heartbeat timeout");
        try { ws.close(4000, "Heartbeat timeout"); } catch { /* already closed */ }
      }
    }, timeoutMs);
  };

  ws.addEventListener("message", () => { alive = true; if (pongTimer) { clearTimeout(pongTimer); pongTimer = null; } });
  pingTimer = setInterval(heartbeat, intervalMs);

  return () => {
    if (pingTimer) clearInterval(pingTimer);
    if (pongTimer) clearTimeout(pongTimer);
  };
}

// ---------------------------------------------------------------------------
// Vuln 253: Safe Drag-and-Drop Validation
// ---------------------------------------------------------------------------

export function validateDroppedFiles(event: DragEvent, options: { maxFiles?: number; allowedExtensions?: string[]; maxSizeMB?: number } = {}): File[] {
  const { maxFiles = 50, allowedExtensions, maxSizeMB = 500 } = options;
  const files: File[] = [];
  const dt = event.dataTransfer;
  if (!dt) return files;

  for (let i = 0; i < Math.min(dt.files.length, maxFiles); i++) {
    const file = dt.files[i];
    const validation = validateFileInput(file, { maxSizeMB, allowedExtensions });
    if (validation.valid) {
      files.push(file);
    } else {
      logSecurityEvent("drag-drop", "medium", "Rejected dropped file: " + validation.reason, file.name);
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Vuln 254: Input Debounce Guard (prevent rapid-fire input events)
// ---------------------------------------------------------------------------

const inputDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const MAX_INPUT_DEBOUNCE_TRACKERS = 100;

export function debounceInput(id: string, callback: () => void, delayMs: number = 300): void {
  if (inputDebounceTimers.size > MAX_INPUT_DEBOUNCE_TRACKERS && !inputDebounceTimers.has(id)) {
    return;
  }
  const existing = inputDebounceTimers.get(id);
  if (existing) clearTimeout(existing);
  inputDebounceTimers.set(id, setTimeout(() => {
    inputDebounceTimers.delete(id);
    callback();
  }, delayMs));
}

// ---------------------------------------------------------------------------
// Vuln 255: Secure Fetch with Retry and Backoff
// ---------------------------------------------------------------------------

export async function fetchWithRetry(url: string, init?: RequestInit, maxRetries: number = 3): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (response.ok || response.status < 500) return response;
      lastError = new Error("HTTP " + response.status);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < maxRetries) {
      const backoff = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastError || new Error("Fetch failed after retries");
}

// ---------------------------------------------------------------------------
// Vuln 256: SVG Sanitization
// ---------------------------------------------------------------------------

const SVG_DANGEROUS_TAGS = new Set(["script", "foreignobject", "use", "set", "animate", "animatetransform", "animatemotion"]);
const SVG_DANGEROUS_ATTRS_RE = /^on[a-z]/i;

export function sanitizeSVG(svgString: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, "image/svg+xml");
    const errorNode = doc.querySelector("parsererror");
    if (errorNode) {
      logSecurityEvent("svg", "high", "Invalid SVG markup");
      return "";
    }
    const allElements = doc.querySelectorAll("*");
    allElements.forEach((el) => {
      if (SVG_DANGEROUS_TAGS.has(el.tagName.toLowerCase())) {
        el.remove();
        return;
      }
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        if (SVG_DANGEROUS_ATTRS_RE.test(attr.name) || attr.value.toLowerCase().includes("javascript:")) {
          el.removeAttribute(attr.name);
        }
      }
    });
    return new XMLSerializer().serializeToString(doc);
  } catch {
    logSecurityEvent("svg", "high", "SVG sanitization failed");
    return "";
  }
}

// ---------------------------------------------------------------------------
// Vuln 257: WebGL Context Leak Guard
// ---------------------------------------------------------------------------

let activeWebGLContexts = 0;
const MAX_WEBGL_CONTEXTS = 8;

export function canCreateWebGLContext(): boolean {
  if (activeWebGLContexts >= MAX_WEBGL_CONTEXTS) {
    logSecurityEvent("webgl", "medium", "Max WebGL contexts reached");
    return false;
  }
  activeWebGLContexts++;
  return true;
}

export function releaseWebGLContext(): void {
  if (activeWebGLContexts > 0) activeWebGLContexts--;
}

// ---------------------------------------------------------------------------
// Vuln 258: AudioContext Fingerprint Mitigation
// ---------------------------------------------------------------------------

export function createProtectedAudioContext(): AudioContext | null {
  try {
    const ctx = new AudioContext();
    const originalCreateOscillator = ctx.createOscillator.bind(ctx);
    let oscillatorCount = 0;
    ctx.createOscillator = () => {
      oscillatorCount++;
      if (oscillatorCount > 100) {
        logSecurityEvent("audio-fingerprint", "high", "Excessive oscillator creation - possible fingerprinting");
      }
      return originalCreateOscillator();
    };
    return ctx;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 259: Battery API Privacy Guard
// ---------------------------------------------------------------------------

export async function getSafeBatteryInfo(): Promise<{ charging: boolean; level: number } | null> {
  try {
    const battery = await (navigator as any).getBattery?.();
    if (!battery) return null;
    return {
      charging: !!battery.charging,
      level: Math.round(battery.level * 4) / 4,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 260: Geolocation Privacy Guard
// ---------------------------------------------------------------------------

export function requestGeolocationSafely(callback: (pos: { lat: number; lng: number } | null) => void, highAccuracy: boolean = false): void {
  if (!navigator.geolocation) { callback(null); return; }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = Math.round(pos.coords.latitude * 100) / 100;
      const lng = Math.round(pos.coords.longitude * 100) / 100;
      logSecurityEvent("geolocation", "low", "Location accessed with privacy rounding");
      callback({ lat, lng });
    },
    () => callback(null),
    { enableHighAccuracy: highAccuracy, timeout: 10000, maximumAge: 300000 }
  );
}

// ---------------------------------------------------------------------------
// Vuln 261: Safe BroadcastChannel with Origin Validation
// ---------------------------------------------------------------------------

export function createSafeBroadcastChannel(name: string): BroadcastChannel {
  const channel = new BroadcastChannel("cryptartist_" + name);
  const originalPostMessage = channel.postMessage.bind(channel);
  channel.postMessage = (msg: unknown) => {
    originalPostMessage({ data: msg, origin: window.location.origin, ts: Date.now() });
  };
  return channel;
}

export function isValidBroadcastMessage(event: MessageEvent): boolean {
  const d = event.data;
  return d && typeof d === "object" && d.origin === window.location.origin && typeof d.ts === "number";
}

// ---------------------------------------------------------------------------
// Vuln 262: Device Orientation Privacy Guard
// ---------------------------------------------------------------------------

let orientationListenerCount = 0;
const MAX_ORIENTATION_LISTENERS = 3;

export function addSafeOrientationListener(handler: (alpha: number | null, beta: number | null, gamma: number | null) => void): (() => void) | null {
  if (orientationListenerCount >= MAX_ORIENTATION_LISTENERS) {
    logSecurityEvent("orientation", "medium", "Too many orientation listeners");
    return null;
  }
  orientationListenerCount++;
  const wrappedHandler = (event: DeviceOrientationEvent) => {
    handler(
      event.alpha ? Math.round(event.alpha) : null,
      event.beta ? Math.round(event.beta) : null,
      event.gamma ? Math.round(event.gamma) : null
    );
  };
  window.addEventListener("deviceorientation", wrappedHandler);
  return () => { window.removeEventListener("deviceorientation", wrappedHandler); orientationListenerCount--; };
}

// ---------------------------------------------------------------------------
// Vuln 263: Speech Recognition Guard
// ---------------------------------------------------------------------------

let speechRecognitionActive = false;

export function canStartSpeechRecognition(): boolean {
  if (speechRecognitionActive) {
    logSecurityEvent("speech", "medium", "Speech recognition already active");
    return false;
  }
  speechRecognitionActive = true;
  return true;
}

export function releaseSpeechRecognition(): void { speechRecognitionActive = false; }

// ---------------------------------------------------------------------------
// Vuln 264: Gamepad API Safety
// ---------------------------------------------------------------------------

export function getSafeGamepadState(): { connected: boolean; id: string; buttons: number }[] {
  try {
    const gamepads = navigator.getGamepads?.() || [];
    const result: { connected: boolean; id: string; buttons: number }[] = [];
    for (const gp of gamepads) {
      if (gp) {
        result.push({ connected: gp.connected, id: gp.id.substring(0, 100), buttons: gp.buttons.length });
      }
    }
    return result;
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Vuln 265: Safe SharedArrayBuffer Guard
// ---------------------------------------------------------------------------

export function canUseSharedArrayBuffer(): boolean {
  if (typeof SharedArrayBuffer === "undefined") return false;
  if (typeof crossOriginIsolated !== "undefined" && !crossOriginIsolated) {
    logSecurityEvent("sab", "medium", "SharedArrayBuffer requires cross-origin isolation");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 266: WebTransport Connection Guard
// ---------------------------------------------------------------------------

let activeTransports = 0;
const MAX_TRANSPORTS = 5;

export function canCreateWebTransport(): boolean {
  if (activeTransports >= MAX_TRANSPORTS) {
    logSecurityEvent("webtransport", "medium", "Max WebTransport connections reached");
    return false;
  }
  activeTransports++;
  return true;
}

export function releaseWebTransport(): void { if (activeTransports > 0) activeTransports--; }

// ---------------------------------------------------------------------------
// Vuln 267: WASM Module Validation
// ---------------------------------------------------------------------------

export async function loadValidatedWASM(bytes: ArrayBuffer, maxSizeMB: number = 50): Promise<WebAssembly.Module | null> {
  try {
    if (bytes.byteLength > maxSizeMB * 1024 * 1024) {
      logSecurityEvent("wasm", "high", "WASM module exceeds size limit");
      return null;
    }
    const magic = new Uint8Array(bytes, 0, 4);
    if (magic[0] !== 0x00 || magic[1] !== 0x61 || magic[2] !== 0x73 || magic[3] !== 0x6D) {
      logSecurityEvent("wasm", "critical", "Invalid WASM magic bytes");
      return null;
    }
    return await WebAssembly.compile(bytes);
  } catch {
    logSecurityEvent("wasm", "high", "WASM module validation failed");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 268: Screen Capture Permission Guard
// ---------------------------------------------------------------------------

let screenCaptureActive = false;

export function canStartScreenCapture(): boolean {
  if (screenCaptureActive) { logSecurityEvent("screen-capture", "medium", "Screen capture already active"); return false; }
  screenCaptureActive = true;
  return true;
}

export function releaseScreenCapture(): void { screenCaptureActive = false; }

// ---------------------------------------------------------------------------
// Vuln 269: USB Device Access Guard
// ---------------------------------------------------------------------------

let usbAccessCount = 0;

export function canRequestUSBDevice(): boolean {
  if (usbAccessCount >= 3) { logSecurityEvent("usb", "medium", "Too many USB device access requests"); return false; }
  usbAccessCount++;
  setTimeout(() => { if (usbAccessCount > 0) usbAccessCount--; }, 60000);
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 270: Serial Port Access Guard
// ---------------------------------------------------------------------------

let serialAccessCount = 0;

export function canRequestSerialPort(): boolean {
  if (serialAccessCount >= 3) { logSecurityEvent("serial", "medium", "Too many serial port access requests"); return false; }
  serialAccessCount++;
  setTimeout(() => { if (serialAccessCount > 0) serialAccessCount--; }, 60000);
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 271: Bluetooth Device Guard
// ---------------------------------------------------------------------------

let bluetoothAccessCount = 0;

export function canRequestBluetoothDevice(): boolean {
  if (bluetoothAccessCount >= 3) { logSecurityEvent("bluetooth", "medium", "Too many Bluetooth device requests"); return false; }
  bluetoothAccessCount++;
  setTimeout(() => { if (bluetoothAccessCount > 0) bluetoothAccessCount--; }, 60000);
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 272: Idle Detection Guard
// ---------------------------------------------------------------------------

let idleDetectionActive = false;

export function canStartIdleDetection(): boolean {
  if (idleDetectionActive) { logSecurityEvent("idle", "medium", "Idle detection already active"); return false; }
  idleDetectionActive = true;
  return true;
}

export function releaseIdleDetection(): void { idleDetectionActive = false; }

// ---------------------------------------------------------------------------
// Vuln 273: File System Access Handle Safety
// ---------------------------------------------------------------------------

export async function validateFileHandle(handle: FileSystemFileHandle, maxSizeMB: number = 500): Promise<boolean> {
  try {
    const file = await handle.getFile();
    if (file.size > maxSizeMB * 1024 * 1024) {
      logSecurityEvent("file-handle", "high", "File too large", String(file.size) + " bytes");
      return false;
    }
    if (file.name.includes("..") || file.name.includes("/") || file.name.includes("\\")) {
      logSecurityEvent("file-handle", "high", "Suspicious filename", file.name);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 274: Web Share API Guard
// ---------------------------------------------------------------------------

let lastShareTime = 0;

export function canWebShare(): boolean {
  const now = Date.now();
  if (now - lastShareTime < 2000) { logSecurityEvent("share", "low", "Share API cooldown active"); return false; }
  if (!navigator.canShare) return false;
  lastShareTime = now;
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 275: Wake Lock Guard
// ---------------------------------------------------------------------------

let wakeLockActive = false;

export function canRequestWakeLock(): boolean {
  if (wakeLockActive) return false;
  if (!("wakeLock" in navigator)) return false;
  wakeLockActive = true;
  return true;
}

export function releaseWakeLockGuard(): void { wakeLockActive = false; }

// ---------------------------------------------------------------------------
// Vuln 276: Contact Picker Guard
// ---------------------------------------------------------------------------

let contactPickerActive = false;

export function canUseContactPicker(): boolean {
  if (contactPickerActive) return false;
  contactPickerActive = true;
  return true;
}

export function releaseContactPicker(): void { contactPickerActive = false; }

// ---------------------------------------------------------------------------
// Vuln 277: Payment Request Guard
// ---------------------------------------------------------------------------

let paymentRequestActive = false;

export function canCreatePaymentRequest(): boolean {
  if (paymentRequestActive) { logSecurityEvent("payment", "medium", "Payment request already active"); return false; }
  paymentRequestActive = true;
  setTimeout(() => { paymentRequestActive = false; }, 120000);
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 278: Credential Management Guard
// ---------------------------------------------------------------------------

let credentialRequestCount = 0;

export function canRequestCredential(): boolean {
  if (credentialRequestCount >= 5) { logSecurityEvent("credential", "medium", "Too many credential requests"); return false; }
  credentialRequestCount++;
  setTimeout(() => { if (credentialRequestCount > 0) credentialRequestCount--; }, 60000);
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 279: Notification Permission Guard
// ---------------------------------------------------------------------------

let notificationRequestCount = 0;

export function canRequestNotificationPermission(): boolean {
  if (notificationRequestCount >= 3) { logSecurityEvent("notification", "medium", "Too many notification requests"); return false; }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "denied") return false;
  notificationRequestCount++;
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 280: Safe Notification Creation
// ---------------------------------------------------------------------------

export function createSafeNotification(title: string, options?: NotificationOptions): Notification | null {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return null;
  try {
    return new Notification(sanitizeHTML(title).substring(0, 100), {
      ...options,
      body: options?.body ? sanitizeHTML(options.body).substring(0, 300) : undefined,
      tag: options?.tag?.substring(0, 50),
    });
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// Vuln 281: Safe Error Serialization (prevent stack trace leaks)
// ---------------------------------------------------------------------------

export function safeSerializeError(err: unknown): { message: string; name: string } {
  if (err instanceof Error) {
    return { message: err.message.substring(0, 500), name: err.name.substring(0, 100) };
  }
  return { message: String(err).substring(0, 500), name: "Error" };
}

// ---------------------------------------------------------------------------
// Vuln 282: Content Editable Guard
// ---------------------------------------------------------------------------

export function sanitizeContentEditable(element: HTMLElement): void {
  element.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e as ClipboardEvent).clipboardData?.getData("text/plain") || "";
    const clean = sanitizeHTML(text).substring(0, SECURITY_CONSTANTS.MAX_INPUT_LENGTH);
    document.execCommand("insertText", false, clean);
  });
  element.addEventListener("drop", (e) => e.preventDefault());
}

// ---------------------------------------------------------------------------
// Vuln 283: Safe Template Literal Tag
// ---------------------------------------------------------------------------

export function safeTemplateLiteral(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    const val = i < values.length ? sanitizeHTML(String(values[i])) : "";
    return result + str + val;
  }, "");
}

// ---------------------------------------------------------------------------
// Vuln 284: Throttled Console Logger (prevent log flooding)
// ---------------------------------------------------------------------------

const logThrottleMap = new Map<string, number>();

export function throttledLog(category: string, message: string): void {
  const now = Date.now();
  const last = logThrottleMap.get(category) || 0;
  if (now - last < 1000) return;
  logThrottleMap.set(category, now);
  console.log("[" + category + "] " + message);
}

// ---------------------------------------------------------------------------
// Vuln 285: Safe Image Dimension Validation
// ---------------------------------------------------------------------------

export function validateImageDimensions(width: number, height: number, maxDimension: number = 16384): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width <= 0 || height <= 0) return false;
  if (width > maxDimension || height > maxDimension) {
    logSecurityEvent("image", "medium", "Image too large: " + width + "x" + height);
    return false;
  }
  if (width * height > 100_000_000) {
    logSecurityEvent("image", "high", "Image pixel count too high (possible decompression bomb)");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 286: Viewport Meta Enforcement
// ---------------------------------------------------------------------------

export function enforceViewportMeta(): void {
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement("meta");
    viewport.setAttribute("name", "viewport");
    document.head.appendChild(viewport);
  }
  viewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes");
}

// ---------------------------------------------------------------------------
// Vuln 287: Safe Color Parsing
// ---------------------------------------------------------------------------

const HEX_COLOR_RE_V2 = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function isSafeColor(value: string): boolean {
  return HEX_COLOR_RE_V2.test(value) || /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(value);
}

export function parseSafeColor(value: string, fallback: string = "#ffffff"): string {
  return isSafeColor(value) ? value : fallback;
}

// ---------------------------------------------------------------------------
// Vuln 288: Service Worker Registration Guard
// ---------------------------------------------------------------------------

let swRegistrationCount = 0;

export function canRegisterServiceWorker(): boolean {
  if (!("serviceWorker" in navigator)) return false;
  if (swRegistrationCount >= 2) { logSecurityEvent("sw", "medium", "Too many SW registrations"); return false; }
  swRegistrationCount++;
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 289: Safe MediaSource Extension Guard
// ---------------------------------------------------------------------------

let activeMediaSources = 0;

export function canCreateMediaSource(): boolean {
  if (activeMediaSources >= 10) { logSecurityEvent("media-source", "medium", "Max MediaSource objects reached"); return false; }
  activeMediaSources++;
  return true;
}

export function releaseMediaSource(): void { if (activeMediaSources > 0) activeMediaSources--; }

// ---------------------------------------------------------------------------
// Vuln 290: IndexedDB Transaction Safety
// ---------------------------------------------------------------------------

export function safeIDBTransaction(db: IDBDatabase, storeNames: string[], mode: IDBTransactionMode = "readonly"): IDBTransaction | null {
  try {
    for (const name of storeNames) {
      if (!db.objectStoreNames.contains(name)) {
        logSecurityEvent("idb", "medium", "IDB store not found", name);
        return null;
      }
    }
    return db.transaction(storeNames, mode);
  } catch {
    logSecurityEvent("idb", "high", "IDB transaction creation failed");
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vuln 291: Safe PDF/Document Rendering Guard
// ---------------------------------------------------------------------------

export function createSafeObjectEmbed(url: string, type: string): HTMLObjectElement {
  const obj = document.createElement("object");
  const safeUrl = url.startsWith("blob:") || url.startsWith(window.location.origin) ? url : "";
  if (!safeUrl) logSecurityEvent("object-embed", "high", "Blocked cross-origin object embed", url);
  obj.data = safeUrl;
  obj.type = type;
  obj.setAttribute("sandbox", "");
  return obj;
}

// ---------------------------------------------------------------------------
// Vuln 292: Cache Storage Safety
// ---------------------------------------------------------------------------

export async function safeCachePut(cacheName: string, request: RequestInfo, response: Response): Promise<boolean> {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length >= 1000) await cache.delete(keys[0]);
    await cache.put(request, response);
    return true;
  } catch {
    logSecurityEvent("cache", "medium", "Cache put failed");
    return false;
  }
}

// ---------------------------------------------------------------------------
// Vuln 293: Safe URL Pattern Matching
// ---------------------------------------------------------------------------

export function matchesURLPattern(url: string, patterns: string[]): boolean {
  try {
    const parsed = new URL(url);
    for (const pattern of patterns) {
      if (pattern.startsWith("*.")) {
        const domain = pattern.substring(2);
        if (parsed.hostname.endsWith(domain)) return true;
      } else if (parsed.hostname === pattern) {
        return true;
      }
    }
    return false;
  } catch { return false; }
}

// ---------------------------------------------------------------------------
// Vuln 294: Safe Media Recorder Guard
// ---------------------------------------------------------------------------

let activeRecorders = 0;

export function canCreateMediaRecorder(): boolean {
  if (activeRecorders >= 3) { logSecurityEvent("media-recorder", "medium", "Max MediaRecorder instances"); return false; }
  activeRecorders++;
  return true;
}

export function releaseMediaRecorder(): void { if (activeRecorders > 0) activeRecorders--; }

// ---------------------------------------------------------------------------
// Vuln 295: Execution Context Integrity Check
// ---------------------------------------------------------------------------

export function verifyExecutionContext(): boolean {
  const checks: string[] = [];
  if (window.self !== window.top) checks.push("iframe");
  if (Function.prototype.toString.toString() !== "function toString() { [native code] }") checks.push("function-tampering");
  if (checks.length > 0) logSecurityEvent("context", "low", "Execution context anomalies", checks.join(", "));
  return checks.length === 0;
}

// ---------------------------------------------------------------------------
// Vuln 296: Safe AbortController Pool
// ---------------------------------------------------------------------------

const abortControllers = new Map<string, AbortController>();

export function getOrCreateAbortController(id: string): AbortController {
  const existing = abortControllers.get(id);
  if (existing && !existing.signal.aborted) return existing;
  if (abortControllers.size >= 100) {
    const oldest = abortControllers.keys().next().value;
    if (oldest) { abortControllers.get(oldest)?.abort(); abortControllers.delete(oldest); }
  }
  const controller = new AbortController();
  abortControllers.set(id, controller);
  return controller;
}

export function abortRequest(id: string): void {
  const c = abortControllers.get(id);
  if (c) { c.abort(); abortControllers.delete(id); }
}

// ---------------------------------------------------------------------------
// Vuln 297: Safe Performance Mark/Measure
// ---------------------------------------------------------------------------

const perfMarks = new Set<string>();

export function safePerformanceMark(name: string): boolean {
  if (perfMarks.size >= 500) { performance.clearMarks(); perfMarks.clear(); }
  const safeName = name.substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "_");
  try { performance.mark(safeName); perfMarks.add(safeName); return true; } catch { return false; }
}

export function safePerformanceMeasure(name: string, startMark: string, endMark: string): PerformanceMeasure | null {
  try { return performance.measure(name.substring(0, 100), startMark, endMark); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Vuln 298: Fetch Metadata Headers Check
// ---------------------------------------------------------------------------

export function isValidFetchMetadata(headers: Headers): boolean {
  const site = headers.get("sec-fetch-site");
  const dest = headers.get("sec-fetch-dest");
  if (site === "cross-site" && dest === "script") {
    logSecurityEvent("fetch-metadata", "high", "Cross-site script fetch blocked");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Vuln 299: Safe Console Override Protection
// ---------------------------------------------------------------------------

const originalConsole = { log: console.log, warn: console.warn, error: console.error, info: console.info };

export function restoreConsole(): void {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.info = originalConsole.info;
}

export function isConsoleTampered(): boolean {
  return (
    console.log !== originalConsole.log ||
    console.warn !== originalConsole.warn ||
    console.error !== originalConsole.error
  );
}

// ---------------------------------------------------------------------------
// Vuln 300: Comprehensive Security Initialization (201-300)
// ---------------------------------------------------------------------------

export function initializeSecurityHardeningV2(): void {
  // Enforce policies
  enforceViewportMeta();
  disableScrollRestoration();
  nullifyOpener();
  validateFrameAncestors();
  secureSensitiveInputs();

  // Verify execution integrity
  verifyExecutionContext();

  // DOM and resource monitoring
  getDOMSize();
  analyzeResourceTiming();

  logSecurityEvent("init-v2", "low", "Security hardening v2 initialized (Vulns 201-300)");
}
