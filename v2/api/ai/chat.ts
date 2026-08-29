import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

// Rate limiting map: IP -> array of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 45; // Max 45 requests/min

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    rateLimitMap.set(ip, validTimestamps);
    return true;
  }

  validTimestamps.push(now);
  rateLimitMap.set(ip, validTimestamps);
  return false;
}

// Timing safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Fake comparison to mitigate timing leaks
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

// Password-gated server proxy for OpenAI and OpenRouter
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Rate Limiting Check
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "anonymous";
  if (isRateLimited(clientIp)) {
    return res.status(429).json({
      error: "Rate limit exceeded (45 req/min). Please slow down.",
    });
  }

  const { password, messages, model, temperature, stream, testAuth } = req.body || {};

  if (!password || typeof password !== "string") {
    return res.status(401).json({
      authorized: false,
      error: "Password required to access server environment variables.",
    });
  }

  // Admin & Media Mogul Passwords from environment variables
  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    process.env.STUDIO_ADMIN_PASSWORD ||
    process.env.STUDIO_MASTER_PASSWORD ||
    "admin2026";

  const mediaMogulPassword =
    process.env.MEDIA_MOGUL_PASSWORD ||
    process.env.STUDIO_MEDIA_MOGUL_PASSWORD ||
    "mogul2026";

  const userPasswordsRaw = process.env.STUDIO_USER_PASSWORDS || "{}";
  let userPasswordsMap: Record<string, string> = {};
  try {
    userPasswordsMap = JSON.parse(userPasswordsRaw);
  } catch {
    // ignore
  }

  const trimmedPass = password.trim();
  let userRole: "admin" | "media-mogul" | null = null;

  if (timingSafeEqual(adminPassword, trimmedPass)) {
    userRole = "admin";
  } else if (timingSafeEqual(mediaMogulPassword, trimmedPass)) {
    userRole = "media-mogul";
  } else {
    for (const [key, roleVal] of Object.entries(userPasswordsMap)) {
      if (timingSafeEqual(key, trimmedPass)) {
        userRole = roleVal === "admin" ? "admin" : "media-mogul";
        break;
      }
    }
  }

  if (!userRole) {
    return res.status(401).json({
      authorized: false,
      error: "Invalid access password. Please check your assigned password or supply your own OpenAI/OpenRouter key in Settings.",
    });
  }

  if (testAuth) {
    return res.status(200).json({
      authorized: true,
      role: userRole,
      roleDisplayName: userRole === "admin" ? "👑 Admin" : "📺 Media Mogul User",
      message: `Password verified with ${userRole} permissions.`,
    });
  }

  // Input Validation
  const rawModel = typeof model === "string" ? model.trim() : "openai/gpt-4o-mini";
  if (!/^[a-zA-Z0-9_\-.:/]{2,120}$/.test(rawModel)) {
    return res.status(400).json({ error: "Invalid AI model identifier" });
  }

  const clampedTemp = typeof temperature === "number" ? Math.max(0, Math.min(2, temperature)) : 0.7;

  // Validate and sanitize messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages array cannot be empty" });
  }

  const sanitizedMessages = messages.slice(-25).map((m: any) => ({
    role: ["system", "user", "assistant"].includes(m.role) ? m.role : "user",
    content: typeof m.content === "string" ? m.content.substring(0, 16000) : "",
  }));

  const openaiKey = process.env.OPENAI_API_KEY || "";
  const openrouterKey = process.env.OPENROUTER_KEY || process.env.OPENROUTER_API_KEY || "";

  if (!openaiKey && !openrouterKey) {
    return res.status(500).json({
      error: "Server environment keys (OPENAI_API_KEY / OPENROUTER_KEY) are not configured on Vercel.",
    });
  }

  const targetModel = rawModel;
  const useOpenRouter = openrouterKey && (targetModel.includes("/") || !openaiKey);

  try {
    if (useOpenRouter) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://cryptartist.com",
          "X-Title": "CryptArtist Studio v2",
        },
        body: JSON.stringify({
          model: targetModel,
          messages: sanitizedMessages,
          temperature: clampedTemp,
          stream: !!stream,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: `OpenRouter API error: ${err}` });
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        return res.end();
      } else {
        const data = await response.json();
        return res.status(200).json(data);
      }
    } else {
      // Direct OpenAI
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: targetModel.replace("openai/", ""),
          messages: sanitizedMessages,
          temperature: clampedTemp,
          stream: !!stream,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        return res.status(response.status).json({ error: `OpenAI API error: ${err}` });
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        const reader = response.body?.getReader();
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        return res.end();
      } else {
        const data = await response.json();
        return res.status(200).json(data);
      }
    }
  } catch (err: any) {
    return res.status(500).json({ error: `Internal Server Error: ${err.message}` });
  }
}
