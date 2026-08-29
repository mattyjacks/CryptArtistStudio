import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "crypto";

// Timing-safe string comparison to prevent timing leak attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to equalize execution timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { password } = req.body || {};

  if (!password || typeof password !== "string" || !password.trim()) {
    return res.status(400).json({
      authorized: false,
      error: "Password cannot be empty.",
    });
  }

  const trimmed = password.trim();

  // Environment Variable Passwords
  const adminPassword =
    process.env.ADMIN_PASSWORD ||
    process.env.STUDIO_ADMIN_PASSWORD ||
    process.env.STUDIO_MASTER_PASSWORD ||
    "admin2026";

  const mediaMogulPassword =
    process.env.MEDIA_MOGUL_PASSWORD ||
    process.env.STUDIO_MEDIA_MOGUL_PASSWORD ||
    "mogul2026";

  // Optional custom user passwords dictionary: { "user1_password": "media-mogul", "director_password": "admin" }
  let userPasswordsMap: Record<string, string> = {};
  try {
    const raw = process.env.STUDIO_USER_PASSWORDS || "{}";
    userPasswordsMap = JSON.parse(raw);
  } catch {
    userPasswordsMap = {};
  }

  // 1. Check Admin Password
  if (timingSafeEqual(adminPassword, trimmed)) {
    return res.status(200).json({
      authorized: true,
      role: "admin",
      roleDisplayName: "👑 Admin",
      message: "Admin authentication successful. Full suite access granted.",
      permissions: {
        canAccessAllPrograms: true,
        canAccessMediaMogul: true,
        canAccessVibeCode: true,
        canAccessValleyNet: true,
        canAccessDemoRecorder: true,
        canAccessMasterDashboard: true,
        canUseServerAIVault: true,
        canManageSettings: true,
        canAccessUtilityTools: true,
      },
    });
  }

  // 2. Check Media Mogul User Password
  if (timingSafeEqual(mediaMogulPassword, trimmed)) {
    return res.status(200).json({
      authorized: true,
      role: "media-mogul",
      roleDisplayName: "📺 Media Mogul User",
      message: "Media Mogul authentication successful. Creative video studio unlocked.",
      permissions: {
        canAccessAllPrograms: false,
        canAccessMediaMogul: true,
        canAccessVibeCode: false,
        canAccessValleyNet: false,
        canAccessDemoRecorder: false,
        canAccessMasterDashboard: false,
        canUseServerAIVault: true,
        canManageSettings: true,
        canAccessUtilityTools: false,
      },
    });
  }

  // 3. Check custom user mapping if configured
  for (const [key, roleVal] of Object.entries(userPasswordsMap)) {
    if (timingSafeEqual(key, trimmed)) {
      const assignedRole = roleVal === "admin" ? "admin" : "media-mogul";
      return res.status(200).json({
        authorized: true,
        role: assignedRole,
        roleDisplayName: assignedRole === "admin" ? "👑 Admin" : "📺 Media Mogul User",
        message: `Authentication successful for role: ${assignedRole}`,
        permissions: {
          canAccessAllPrograms: assignedRole === "admin",
          canAccessMediaMogul: true,
          canAccessVibeCode: assignedRole === "admin",
          canAccessValleyNet: assignedRole === "admin",
          canAccessDemoRecorder: assignedRole === "admin",
          canAccessMasterDashboard: assignedRole === "admin",
          canUseServerAIVault: true,
          canManageSettings: true,
          canAccessUtilityTools: assignedRole === "admin",
        },
      });
    }
  }

  // 4. Invalid Password
  return res.status(401).json({
    authorized: false,
    error: "Invalid access password. Please check your assigned password.",
  });
}
