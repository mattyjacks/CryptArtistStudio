// ============================================================================
// CryptArtist Studio v2 - Role-Based Access Control (RBAC) & Auth Types
// ============================================================================

export type UserRole = "admin" | "media-mogul" | "guest";

export interface RolePermissions {
  /** Can access all 15 suite programs and upcoming tools */
  canAccessAllPrograms: boolean;
  /** Can access Media Mogul video editor and creative suite */
  canAccessMediaMogul: boolean;
  /** Can access VibeCodeWorker in-browser code editor */
  canAccessVibeCode: boolean;
  /** Can access ValleyNet autonomous agent */
  canAccessValleyNet: boolean;
  /** Can access DemoRecorder screen/stream recorder */
  canAccessDemoRecorder: boolean;
  /** Can access Master command dashboard & telemetry */
  canAccessMasterDashboard: boolean;
  /** Can use server-side AI environment keys (OpenAI / OpenRouter) */
  canUseServerAIVault: boolean;
  /** Can configure global studio settings and clear caches */
  canManageSettings: boolean;
  /** Can access utility programs (Tax Bot, Clone Tool, Luck Factory, etc.) */
  canAccessUtilityTools: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
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
  "media-mogul": {
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
  guest: {
    canAccessAllPrograms: false,
    canAccessMediaMogul: true, // Guests can test Media Mogul with BYOK
    canAccessVibeCode: false,
    canAccessValleyNet: false,
    canAccessDemoRecorder: false,
    canAccessMasterDashboard: false,
    canUseServerAIVault: false,
    canManageSettings: true,
    canAccessUtilityTools: false,
  },
};

export interface AuthSession {
  role: UserRole;
  isAuthenticated: boolean;
  roleDisplayName: string;
  unlockedAt?: number;
}

export interface AuthResult {
  success: boolean;
  role?: UserRole;
  message?: string;
}

export interface AuthContextValue {
  role: UserRole;
  isAuthenticated: boolean;
  roleDisplayName: string;
  permissions: RolePermissions;
  isAuthModalOpen: boolean;
  targetProgramName?: string;
  login: (password: string) => Promise<AuthResult>;
  logout: () => void;
  openAuthModal: (targetProgram?: string) => void;
  closeAuthModal: () => void;
  checkProgramAccess: (programId: string) => boolean;
}
