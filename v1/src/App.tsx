/* Wave2: type=button applied */
import { useState, useEffect, Component, type ReactNode } from "react";
import { Routes, Route, useLocation, useNavigate, Link } from "react-router-dom";
import SuiteLauncher from "./components/SuiteLauncher";
import MediaMogul from "./programs/media-mogul/MediaMogul";
import VibeCodeWorker from "./programs/vibecode-worker/VibeCodeWorker";
import DemoRecorder from "./programs/demo-recorder/DemoRecorder";
import ValleyNet from "./programs/valley-net/ValleyNet";
import GameStudio from "./programs/game-studio/GameStudio";
import Commander from "./programs/commander/Commander";
import Settings from "./programs/settings/Settings";
import DonatePersonalSeconds from "./programs/donate-personal-seconds/DonatePersonalSeconds";
import DPSLeaderboard from "./programs/donate-personal-seconds/DPSLeaderboard";
import CloneTool from "./programs/clone-tool/CloneTool";
import LuckFactory from "./programs/luck-factory/LuckFactory";
import DictatePic from "./programs/dictate-pic/DictatePic";
import CryptManager from "./components/CryptManager";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import TermsAcceptanceModal from "./components/TermsAcceptanceModal";
import MobileNav from "./components/MobileNav";
import WorkspaceProvider from "./components/WorkspaceProvider";
import WorkspaceBar from "./components/WorkspaceBar";
import GlobalMenuBar from "./components/GlobalMenuBar";
import { ApiKeyProvider } from "./components/ApiKeyProvider";
import { useIsMobileViewport, useDeviceType } from "./utils/platform";
import { logger } from "./utils/logger";
import { applyTheme } from "./utils/themes";
import { initializePlatform } from "./utils/cross-platform";
import { initializeSecurityHardening, initializeSecurityHardeningV2 } from "./utils/security";
import { checkFileAssociation, listenForFileOpen } from "./utils/fileAssociation";

// ---------------------------------------------------------------------------
// Types (kept for backward compatibility with existing components)
// ---------------------------------------------------------------------------

export type Workspace = "edit" | "node-mode" | "color" | "audio" | "ai" | "deliver";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  imageUrl?: string;
}

// ---------------------------------------------------------------------------
// Improvement 44: Error Boundary
// ---------------------------------------------------------------------------

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error("ErrorBoundary", `${error.message} | ${info.componentStack?.slice(0, 200)}`);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen w-screen bg-studio-bg text-studio-text">
          <span className="text-6xl mb-4">{"\u{1F480}"}</span>
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-studio-secondary mb-4 max-w-md text-center">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <button type="button"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = "/";
              window.location.reload();
            }}
            className="btn btn-cyan px-6 py-2"
          >
            Return to Suite Launcher [SLr]
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Improvement 42: 404 Not Found Page
// ---------------------------------------------------------------------------

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-studio-bg text-studio-text animate-fade-in">
      <span className="text-7xl mb-4 opacity-40">{"\u{1F50D}"}</span>
      <h1 className="text-4xl font-bold mb-2 gradient-text">404</h1>
      <p className="text-sm text-studio-secondary mb-6">This page doesn't exist in the suite.</p>
      <Link to="/" className="btn btn-cyan px-6 py-2 text-sm">
        {"\u2190"} Back to Suite Launcher [SLr]
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Improvement 41: Loading Splash Screen
// ---------------------------------------------------------------------------

function LoadingSplash() {
  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-studio-bg">
      <span className="text-5xl mb-3 animate-bounce-in">{"\u{1F480}\u{1F3A8}"}</span>
      <h1 className="text-lg font-bold text-studio-text mb-2 animate-fade-in">CryptArtist Studio</h1>
      <div className="w-32 h-1 bg-studio-surface rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-studio-cyan to-studio-purple rounded-full animate-shimmer" style={{ width: "60%" }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Improvement 45: Document Title Hook
// ---------------------------------------------------------------------------

const routeTitles: Record<string, string> = {
  "/": "CryptArtist Studio",
  "/media-mogul": "Media Mogul - CryptArtist Studio",
  "/vibecode-worker": "VibeCodeWorker - CryptArtist Studio",
  "/demo-recorder": "DemoRecorder - CryptArtist Studio",
  "/valley-net": "ValleyNet - CryptArtist Studio",
  "/game-studio": "GameStudio - CryptArtist Studio",
  "/commander": "CryptArt Commander - CryptArtist Studio",
  "/settings": "Settings - CryptArtist Studio",
  "/donate-personal-seconds": "DonatePersonalSeconds - CryptArtist Studio",
  "/dps-leaderboard": "DPS Leaderboard - CryptArtist Studio",
  "/clone-tool": "Clone Tool - CryptArtist Studio",
  "/luck-factory": "Luck Factory - CryptArtist Studio",
  "/dictate-pic": "DictatePic - CryptArtist Studio",
  "/crypt-manager": "Crypt Manager - CryptArtist Studio",
  "/privacy": "Privacy Policy - CryptArtist Studio",
  "/terms": "Terms of Use - CryptArtist Studio",
};

function useDocumentTitle() {
  const location = useLocation();
  useEffect(() => {
    document.title = routeTitles[location.pathname] || "CryptArtist Studio";
  }, [location.pathname]);
}

// ---------------------------------------------------------------------------
// App - Suite Router
// ---------------------------------------------------------------------------

const TERMS_ACCEPTED_KEY = "cryptartist_terms_accepted";

export default function App() {
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const isMobileView = useIsMobileViewport();
  const deviceType = useDeviceType();
  const showBottomNav = deviceType === "mobile" || deviceType === "tablet";
  const navigate = useNavigate();
  useDocumentTitle();

  useEffect(() => {
    const accepted = localStorage.getItem(TERMS_ACCEPTED_KEY);
    setTermsAccepted(accepted === "true");
    // Initialize active theme, platform, and security hardening on startup
    applyTheme();
    initializePlatform();
    initializeSecurityHardening();
    initializeSecurityHardeningV2();
  }, []);

  // File Association: Check for .CryptArt files passed via OS file explorer
  useEffect(() => {
    if (!termsAccepted) return;
    // Check for files passed as CLI args on cold start
    checkFileAssociation(navigate);
    // Listen for files opened while the app is already running (macOS)
    const cleanup = listenForFileOpen(navigate);
    return () => { cleanup.then((fn) => fn()); };
  }, [termsAccepted, navigate]);

  const handleAcceptTerms = () => {
    localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
    setTermsAccepted(true);
    logger.action("App", "Terms accepted");
  };

  // Improvement 41: Show splash while loading
  if (termsAccepted === null) return <LoadingSplash />;

  // Show acceptance modal if not yet accepted
  if (!termsAccepted) {
    return <TermsAcceptanceModal onAccept={handleAcceptTerms} />;
  }

  return (
    <ErrorBoundary>
      <WorkspaceProvider>
        <ApiKeyProvider>
          <div className="flex flex-col h-screen w-screen overflow-hidden">
            <a href="#main-content" className="skip-to-content">Skip to content</a>
            <GlobalMenuBar />
            <WorkspaceBar />
            <div id="main-content" className={`flex-1 overflow-hidden relative ${showBottomNav ? "pb-14" : ""}`}>
              <Routes>
                <Route path="/" element={<SuiteLauncher />} />
                <Route path="/media-mogul" element={<MediaMogul />} />
                <Route path="/vibecode-worker" element={<VibeCodeWorker />} />
                <Route path="/demo-recorder" element={<DemoRecorder />} />
                <Route path="/valley-net" element={<ValleyNet />} />
                <Route path="/game-studio" element={<GameStudio />} />
                <Route path="/commander" element={<Commander />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/donate-personal-seconds" element={<DonatePersonalSeconds />} />
                <Route path="/dps-leaderboard" element={<DPSLeaderboard />} />
                <Route path="/clone-tool" element={<CloneTool />} />
                <Route path="/luck-factory" element={<LuckFactory />} />
                <Route path="/dictate-pic" element={<DictatePic />} />
                <Route path="/crypt-manager" element={<CryptManager />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfUse />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
            {showBottomNav && <MobileNav />}
          </div>
        </ApiKeyProvider>
      </WorkspaceProvider>
    </ErrorBoundary>
  );
}
