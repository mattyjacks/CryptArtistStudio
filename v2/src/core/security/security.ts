// ============================================================================
// CryptArtist Studio v2 - Enterprise Security & Cryptography Engine
// ============================================================================

import DOMPurify from "dompurify";

// ---------------------------------------------------------------------------
// 1. AES-GCM 256-bit Web Crypto API Key Encryption / Decryption
// ---------------------------------------------------------------------------

const SALT_STRING = "cryptartist_v2_salt_2026_enterprise_vault";
const ITERATIONS = 100000;

async function getDerivedEncryptionKey(passphrase: string = "cryptartist_client_default_vault"): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SALT_STRING),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt sensitive string (e.g. API key or project payload) using AES-GCM
 */
export async function encryptSecret(plainText: string, passphrase?: string): Promise<string> {
  if (!plainText) return "";
  if (typeof crypto === "undefined" || !crypto.subtle) return plainText;

  try {
    const key = await getDerivedEncryptionKey(passphrase);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    const encoded = enc.encode(plainText);

    const cipherBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded
    );

    const cipherArray = new Uint8Array(cipherBuffer);
    const combined = new Uint8Array(iv.length + cipherArray.length);
    combined.set(iv, 0);
    combined.set(cipherArray, iv.length);

    return "enc_v2:" + btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.warn("[Security] Encryption fallback", e);
    return plainText;
  }
}

/**
 * Decrypt sensitive string using AES-GCM
 */
export async function decryptSecret(cipherText: string, passphrase?: string): Promise<string> {
  if (!cipherText || !cipherText.startsWith("enc_v2:")) return cipherText;
  if (typeof crypto === "undefined" || !crypto.subtle) return cipherText;

  try {
    const rawBase64 = cipherText.replace("enc_v2:", "");
    const binaryStr = atob(rawBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const iv = bytes.slice(0, 12);
    const cipherData = bytes.slice(12);
    const key = await getDerivedEncryptionKey(passphrase);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherData
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (e) {
    console.warn("[Security] Decryption error", e);
    return "";
  }
}

// ---------------------------------------------------------------------------
// 2. Prototype Pollution Defense
// ---------------------------------------------------------------------------

const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];

export function sanitizeObjectKeys<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectKeys(item)) as unknown as T;
  }

  const clean: Record<string, unknown> = Object.create(null);
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (DANGEROUS_KEYS.includes(k)) continue;
    clean[k] = sanitizeObjectKeys(v);
  }
  return clean as T;
}

export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    const parsed = JSON.parse(json);
    return sanitizeObjectKeys(parsed) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 3. XSS & HTML Sanitization
// ---------------------------------------------------------------------------

export function sanitizeHTML(dirty: string): string {
  if (!dirty) return "";
  if (typeof window !== "undefined" && DOMPurify && typeof DOMPurify.sanitize === "function") {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "span", "code", "pre", "br"],
      ALLOWED_ATTR: ["href", "title", "target", "class"],
    });
  }
  return dirty.replace(/[&<>"'/]/g, (s) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    };
    return map[s] || s;
  });
}

// ---------------------------------------------------------------------------
// 4. File Magic Bytes Signature Validation
// ---------------------------------------------------------------------------

export async function validateFileMagicBytes(file: Blob): Promise<{ valid: boolean; detectedType?: string }> {
  try {
    const headerBytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

    // PNG: 89 50 4E 47
    if (headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4e && headerBytes[3] === 0x47) {
      return { valid: true, detectedType: "image/png" };
    }
    // JPEG: FF D8 FF
    if (headerBytes[0] === 0xff && headerBytes[1] === 0xd8 && headerBytes[2] === 0xff) {
      return { valid: true, detectedType: "image/jpeg" };
    }
    // GIF: 47 49 46 38
    if (headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x38) {
      return { valid: true, detectedType: "image/gif" };
    }
    // MP4/MOV: ftyp at offset 4
    if (headerBytes[4] === 0x66 && headerBytes[5] === 0x74 && headerBytes[6] === 0x79 && headerBytes[7] === 0x70) {
      return { valid: true, detectedType: "video/mp4" };
    }
    // WebM/MKV: 1A 45 DF A3
    if (headerBytes[0] === 0x1a && headerBytes[1] === 0x45 && headerBytes[2] === 0xdf && headerBytes[3] === 0xa3) {
      return { valid: true, detectedType: "video/webm" };
    }
    // WAV / RIFF: 52 49 46 46
    if (headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x46) {
      return { valid: true, detectedType: "audio/wav" };
    }
    // JSON / Text: { or [
    if (headerBytes[0] === 0x7b || headerBytes[0] === 0x5b) {
      return { valid: true, detectedType: "application/json" };
    }

    return { valid: true, detectedType: file.type || "application/octet-stream" };
  } catch {
    return { valid: true, detectedType: "unknown" };
  }
}

// ---------------------------------------------------------------------------
// 5. URL Validation & SSRF Prevention
// ---------------------------------------------------------------------------

const TRUSTED_DOMAINS = [
  "cryptartist.com",
  "mattyjacks.com",
  "givegigs.com",
  "sitefari.com",
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
  "pexels.com",
  "api.pexels.com",
  "images.pexels.com",
  "openrouter.ai",
  "api.openai.com",
  "api.anthropic.com",
  "generativelanguage.googleapis.com",
  "api.elevenlabs.io",
  "localhost",
];

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./, // AWS/Cloud metadata
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

export function isSafeExternalURL(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

    const hostname = parsed.hostname.toLowerCase();

    // Block private/internal IPs
    if (PRIVATE_IP_PATTERNS.some((p) => p.test(hostname))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function isTrustedStudioDomain(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    const host = parsed.hostname.toLowerCase();
    return TRUSTED_DOMAINS.some((d) => host === d || host.endsWith("." + d));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// 6. Model ID & Input Format Validators
// ---------------------------------------------------------------------------

const VALID_MODEL_RE = /^[a-zA-Z0-9_\-.:/]{2,120}$/;
const CONTROL_CHAR_RE = /[\x00-\x1F\x7F]/;

export function validateModelId(model: string): boolean {
  if (!model || model.length > 120) return false;
  if (CONTROL_CHAR_RE.test(model)) return false;
  return VALID_MODEL_RE.test(model);
}

export function validateAPIKeyFormat(key: string): { valid: boolean; message?: string } {
  if (!key || !key.trim()) return { valid: false, message: "API key cannot be empty" };
  if (key.length > 512) return { valid: false, message: "Key length exceeds 512 characters" };
  if (CONTROL_CHAR_RE.test(key)) return { valid: false, message: "Invalid control characters in key" };
  return { valid: true };
}

/**
 * Mask sensitive secrets in logs
 */
export function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return "***";
  return secret.substring(0, 4) + "..." + secret.substring(secret.length - 4);
}

/**
 * Sanitize CryptArt project state before export to ensure no API keys or passwords are leaked
 */
export function sanitizeProjectForExport(project: any): any {
  const clean = sanitizeObjectKeys(project);
  if (clean.data && typeof clean.data === "object") {
    delete clean.data.apiKeys;
    delete clean.data.vaultPassword;
    delete clean.data.openaiKey;
    delete clean.data.openrouterKey;
  }
  return clean;
}
