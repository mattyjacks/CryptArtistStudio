import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SuiteLauncher, { SUITE_PROGRAMS } from "./components/SuiteLauncher";
import MediaMogul from "./programs/media-mogul/MediaMogul";
import VibeCodeWorker from "./programs/vibecode-worker/VibeCodeWorker";
import DemoRecorder from "./programs/demo-recorder/DemoRecorder";
import ValleyNet from "./programs/valley-net/ValleyNet";
import SuitePlaceholder from "./programs/placeholders/SuitePlaceholder";
import SettingsModal from "./components/SettingsModal";
import RoleGate from "./components/RoleGate";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./core/context/AuthContext";

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { isAuthModalOpen, closeAuthModal } = useAuth();

  return (
    <div className="h-screen w-screen bg-studio-bg text-studio-text flex flex-col overflow-hidden font-sans">
      <Routes>
        {/* Flagship Media Mogul Web URL routes (Accessible by Media Mogul & Admin roles) */}
        <Route
          path="/web/mediamogul/*"
          element={<MediaMogul onOpenSettings={() => setIsSettingsOpen(true)} />}
        />
        <Route
          path="/media-mogul/*"
          element={<MediaMogul onOpenSettings={() => setIsSettingsOpen(true)} />}
        />

        {/* Suite Launcher Home */}
        <Route
          path="/"
          element={<SuiteLauncher onOpenSettings={() => setIsSettingsOpen(true)} />}
        />
        <Route
          path="/web/suite"
          element={<SuiteLauncher onOpenSettings={() => setIsSettingsOpen(true)} />}
        />

        {/* Admin-Protected Programs */}
        <Route
          path="/vibecode-worker"
          element={
            <RoleGate requiredRole="admin" programName="VibeCodeWorker" programEmoji="👩🏻‍💻" programShortCode="VCW">
              <VibeCodeWorker />
            </RoleGate>
          }
        />
        <Route
          path="/demo-recorder"
          element={
            <RoleGate requiredRole="admin" programName="DemoRecorder" programEmoji="🎥" programShortCode="DRe">
              <DemoRecorder />
            </RoleGate>
          }
        />
        <Route
          path="/valley-net"
          element={
            <RoleGate requiredRole="admin" programName="ValleyNet" programEmoji="👱🏻‍♀️" programShortCode="VNt">
              <ValleyNet />
            </RoleGate>
          }
        />

        {/* Placeholders for remaining suite tools (Admin Role Gated) */}
        {SUITE_PROGRAMS.filter(
          (p) =>
            !["media-mogul", "vibecode-worker", "demo-recorder", "valley-net"].includes(p.id)
        ).map((prog) => (
          <Route
            key={prog.id}
            path={prog.route}
            element={
              <RoleGate
                requiredRole="admin"
                programName={prog.name}
                programEmoji={prog.emoji}
                programShortCode={prog.shortCode}
              >
                <SuitePlaceholder
                  id={prog.id}
                  name={prog.name}
                  shortCode={prog.shortCode}
                  emoji={prog.emoji}
                  description={prog.description}
                  accentColor={prog.accentColor}
                  gradient={prog.gradient}
                />
              </RoleGate>
            }
          />
        ))}

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/web/mediamogul" replace />} />
      </Routes>

      {/* Global Settings & Password Vault Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Quick Role & Access Auth Modal */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </div>
  );
}

