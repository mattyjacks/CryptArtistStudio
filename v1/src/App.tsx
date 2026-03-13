import { useState, useEffect, Component, type ReactNode } from "react";
import { Routes, Route, useLocation, Link } from "react-router-dom";
import SuiteLauncher from "./components/SuiteLauncher";
import MediaMogul from "./programs/media-mogul/MediaMogul";
import VibeCodeWorker from "./programs/vibecode-worker/VibeCodeWorker";
import DemoRecorder from "./programs/demo-recorder/DemoRecorder";
import ValleyNet from "./programs/valley-net/ValleyNet";
import GameStudio from "./programs/game-studio/GameStudio";
import Commander from "./programs/commander/Commander";
import Settings from "./programs/settings/Settings";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import TermsAcceptanceModal from "./components/TermsAcceptanceModal";
import MobileNav from "./components/MobileNav";
import { useIsMobileViewport } from "./utils/platform";
import { logger } from "./utils/logger";

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
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.hash = "/";
              window.location.reload();
            }}
            className="btn btn-cyan px-6 py-2"
          >
            Return to Suite Launcher
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
        {"\u2190"} Back to Suite Launcher
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
  useDocumentTitle();

  useEffect(() => {
    const accepted = localStorage.getItem(TERMS_ACCEPTED_KEY);
    setTermsAccepted(accepted === "true");
  }, []);

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
      <div className={isMobileView ? "pb-14" : ""}>
        <Routes>
          <Route path="/" element={<SuiteLauncher />} />
          <Route path="/media-mogul" element={<MediaMogul />} />
          <Route path="/vibecode-worker" element={<VibeCodeWorker />} />
          <Route path="/demo-recorder" element={<DemoRecorder />} />
          <Route path="/valley-net" element={<ValleyNet />} />
          <Route path="/game-studio" element={<GameStudio />} />
          <Route path="/commander" element={<Commander />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {isMobileView && <MobileNav />}
    </ErrorBoundary>
  );
}
