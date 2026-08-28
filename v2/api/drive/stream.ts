import type { VercelRequest, VercelResponse } from "@vercel/node";

// Rate limiting map: IP -> array of timestamps
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 60;

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

const VALID_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{20,80}$/;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Rate Limiting
  const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "anonymous";
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Rate limit exceeded. Please slow down." });
  }

  const { id } = req.query;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing 'id' query parameter for Google Drive file" });
  }

  const trimmedId = id.trim();

  // Strict SSRF / Path Injection Guard: Enforce valid Google Drive File ID syntax
  if (!VALID_FILE_ID_REGEX.test(trimmedId)) {
    return res.status(400).json({ error: "Invalid Google Drive file ID format" });
  }

  const driveUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(trimmedId)}`;

  const headers: Record<string, string> = {
    "User-Agent": "CryptArtistStudio/2.0 (+https://cryptartist.com)",
  };

  if (req.headers.range) {
    headers["Range"] = req.headers.range as string;
  }

  try {
    const driveResponse = await fetch(driveUrl, {
      headers,
      redirect: "follow",
    });

    if (!driveResponse.ok && driveResponse.status !== 206) {
      return res.status(driveResponse.status).json({
        error: `Google Drive returned status ${driveResponse.status}. Ensure file sharing is set to 'Anyone with the link'.`,
      });
    }

    res.status(driveResponse.status);

    // Forward safe media headers
    const forwardHeaders = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "cache-control",
    ];

    forwardHeaders.forEach((h) => {
      const val = driveResponse.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    if (driveResponse.body) {
      const reader = driveResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      return res.end();
    } else {
      return res.end();
    }
  } catch (err: any) {
    return res.status(500).json({ error: `Drive streaming failed: ${err.message}` });
  }
}
