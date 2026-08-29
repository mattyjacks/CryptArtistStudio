// ============================================================================
// CryptArtist Studio v2 - Authentication & Access Control Context
// ============================================================================

import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRole, RolePermissions, ROLE_PERMISSIONS, AuthResult, AuthContextValue } from "../types/auth.types";
import { browserStorageDriver } from "../drivers/web/BrowserStorageDriver";
import { encryptSecret, decryptSecret } from "../security/security";
import { aiEngine } from "../engine/AIEngine";

const STORAGE_KEYS = {
  AUTH_ROLE: "auth_user_role",
  AUTH_PASS: "auth_session_pass",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>("guest");
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [targetProgramName, setTargetProgramName] = useState<string | undefined>(undefined);

  // Restore session from encrypted local storage on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedRole = (await browserStorageDriver.getItem(STORAGE_KEYS.AUTH_ROLE, "guest")) as UserRole;
        const encPass = await browserStorageDriver.getItem(STORAGE_KEYS.AUTH_PASS, "");
        const rawPass = await decryptSecret(encPass);

        if (rawPass && (storedRole === "admin" || storedRole === "media-mogul")) {
          setRole(storedRole);
          // Sync with AIEngine password vault
          await aiEngine.unlockPasswordVault(rawPass);
        }
      } catch (err) {
        console.warn("[Auth] Session restoration fallback to guest", err);
      }
    }
    restoreSession();
  }, []);

  const login = async (password: string): Promise<AuthResult> => {
    if (!password || !password.trim()) {
      return { success: false, message: "Please enter a valid password." };
    }

    const trimmed = password.trim();

    try {
      // 1. Try serverless backend verification endpoint
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: trimmed }),
      });

      if (response.ok) {
        const data = await response.json();
        const detectedRole: UserRole = data.role === "admin" ? "admin" : "media-mogul";
        setRole(detectedRole);

        // Store encrypted session
        const encPass = await encryptSecret(trimmed);
        await browserStorageDriver.setItem(STORAGE_KEYS.AUTH_ROLE, detectedRole);
        await browserStorageDriver.setItem(STORAGE_KEYS.AUTH_PASS, encPass);

        // Sync with AIEngine password vault
        await aiEngine.unlockPasswordVault(trimmed);

        return {
          success: true,
          role: detectedRole,
          message: data.message || `Logged in successfully as ${detectedRole}.`,
        };
      } else {
        const err = await response.json().catch(() => ({}));
        // If HTTP 401, invalid password
        if (response.status === 401) {
          return { success: false, message: err.error || "Incorrect access password." };
        }
      }
    } catch {
      // Offline / standalone dev mode client-side evaluation fallback
    }

    // 2. Client-side Environment Variable evaluation (for offline / client-only dev)
    const envAdminPass = (import.meta as any).env?.VITE_ADMIN_PASSWORD || "admin2026";
    const legacyMasterPass = "cryptartist2026";
    const envMogulPass = (import.meta as any).env?.VITE_MEDIA_MOGUL_PASSWORD || "mogul2026";

    let localRole: UserRole | null = null;
    if (trimmed === envAdminPass || trimmed === legacyMasterPass) {
      localRole = "admin";
    } else if (trimmed === envMogulPass || trimmed === "mediamogul") {
      localRole = "media-mogul";
    }

    if (localRole) {
      setRole(localRole);
      const encPass = await encryptSecret(trimmed);
      await browserStorageDriver.setItem(STORAGE_KEYS.AUTH_ROLE, localRole);
      await browserStorageDriver.setItem(STORAGE_KEYS.AUTH_PASS, encPass);
      await aiEngine.unlockPasswordVault(trimmed);

      return {
        success: true,
        role: localRole,
        message: `Unlocked with ${localRole === "admin" ? "Admin (Full Suite)" : "Media Mogul"} access!`,
      };
    }

    return {
      success: false,
      message: "Invalid password. Please check your assigned password or contact administrator.",
    };
  };

  const logout = async () => {
    setRole("guest");
    await browserStorageDriver.setItem(STORAGE_KEYS.AUTH_ROLE, "guest");
    await browserStorageDriver.removeItem(STORAGE_KEYS.AUTH_PASS);
    aiEngine.lockPasswordVault();
  };

  const openAuthModal = (progName?: string) => {
    setTargetProgramName(progName);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setTargetProgramName(undefined);
  };

  const checkProgramAccess = (programId: string): boolean => {
    if (role === "admin") return true;
    if (programId === "media-mogul") return true;
    return false;
  };

  const roleDisplayName =
    role === "admin"
      ? "👑 Admin"
      : role === "media-mogul"
      ? "📺 Media Mogul User"
      : "👤 Guest";

  const permissions = ROLE_PERMISSIONS[role];
  const isAuthenticated = role === "admin" || role === "media-mogul";

  const value: AuthContextValue = {
    role,
    isAuthenticated,
    roleDisplayName,
    permissions,
    isAuthModalOpen,
    targetProgramName,
    login,
    logout,
    openAuthModal,
    closeAuthModal,
    checkProgramAccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
