import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import SuiteLauncher, { SUITE_PROGRAMS } from "./components/SuiteLauncher";
import MediaMogul from "./programs/media-mogul/MediaMogul";
import VibeCodeWorker from "./programs/vibecode-worker/VibeCodeWorker";
import DemoRecorder from "./programs/demo-recorder/DemoRecorder";
import ValleyNet from "./programs/valley-net/ValleyNet";
import SuitePlaceholder from "./programs/placeholders/SuitePlaceholder";
import SettingsModal from "./components/SettingsModal";

export default function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className="h-screen w-screen bg-studio-bg text-studio-text flex flex-col overflow-hidden font-sans">
      <Routes>
        {/* Flagship Media Mogul Web URL routes */}
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

        {/* Programs */}
        <Route path="/vibecode-worker" element={<VibeCodeWorker />} />
        <Route path="/demo-recorder" element={<DemoRecorder />} />
        <Route path="/valley-net" element={<ValleyNet />} />

        {/* Placeholders for all remaining /v1/ suite tools */}
        {SUITE_PROGRAMS.filter(
          (p) =>
            !["media-mogul", "vibecode-worker", "demo-recorder", "valley-net"].includes(p.id)
        ).map((prog) => (
          <Route
            key={prog.id}
            path={prog.route}
            element={
              <SuitePlaceholder
                id={prog.id}
                name={prog.name}
                shortCode={prog.shortCode}
                emoji={prog.emoji}
                description={prog.description}
                accentColor={prog.accentColor}
                gradient={prog.gradient}
              />
            }
          />
        ))}

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/web/mediamogul" replace />} />
      </Routes>

      {/* Global Settings & Password Vault Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
