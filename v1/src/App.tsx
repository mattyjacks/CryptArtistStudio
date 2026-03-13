import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import SuiteLauncher from "./components/SuiteLauncher";
import MediaMogul from "./programs/media-mogul/MediaMogul";
import VibeCodeWorker from "./programs/vibecode-worker/VibeCodeWorker";
import DemoRecorder from "./programs/demo-recorder/DemoRecorder";
import ValleyNet from "./programs/valley-net/ValleyNet";
import GameStudio from "./programs/game-studio/GameStudio";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import TermsAcceptanceModal from "./components/TermsAcceptanceModal";
import MobileNav from "./components/MobileNav";
import { useIsMobileViewport } from "./utils/platform";

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
// App - Suite Router
// ---------------------------------------------------------------------------

const TERMS_ACCEPTED_KEY = "cryptartist_terms_accepted";

export default function App() {
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const isMobileView = useIsMobileViewport();

  useEffect(() => {
    const accepted = localStorage.getItem(TERMS_ACCEPTED_KEY);
    setTermsAccepted(accepted === "true");
  }, []);

  const handleAcceptTerms = () => {
    localStorage.setItem(TERMS_ACCEPTED_KEY, "true");
    setTermsAccepted(true);
  };

  // Still loading
  if (termsAccepted === null) return null;

  // Show acceptance modal if not yet accepted
  if (!termsAccepted) {
    return <TermsAcceptanceModal onAccept={handleAcceptTerms} />;
  }

  return (
    <>
      <div className={isMobileView ? "pb-14" : ""}>
        <Routes>
          <Route path="/" element={<SuiteLauncher />} />
          <Route path="/media-mogul" element={<MediaMogul />} />
          <Route path="/vibecode-worker" element={<VibeCodeWorker />} />
          <Route path="/demo-recorder" element={<DemoRecorder />} />
          <Route path="/valley-net" element={<ValleyNet />} />
          <Route path="/game-studio" element={<GameStudio />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
        </Routes>
      </div>
      {isMobileView && <MobileNav />}
    </>
  );
}
