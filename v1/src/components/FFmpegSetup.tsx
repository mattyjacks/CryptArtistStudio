import { useState, useEffect } from "react";

interface FFmpegSetupProps {
  onComplete: () => void;
}

export default function FFmpegSetup({ onComplete }: FFmpegSetupProps) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing CryptArtist Studio...");
  const [stage, setStage] = useState<string>("connecting");

  // Simulate FFmpeg download progress for demo
  // In production, this listens to Tauri events from ffmpeg_installer.rs
  useEffect(() => {
    const stages = [
      { pct: 10, msg: "Detecting operating system...", stage: "connecting" },
      { pct: 20, msg: "Connecting to download server...", stage: "connecting" },
      { pct: 35, msg: "Downloading FFmpeg... 12.4 MB / 85.2 MB", stage: "downloading" },
      { pct: 55, msg: "Downloading FFmpeg... 46.8 MB / 85.2 MB", stage: "downloading" },
      { pct: 75, msg: "Downloading FFmpeg... 63.9 MB / 85.2 MB", stage: "downloading" },
      { pct: 90, msg: "Downloading FFmpeg... 81.1 MB / 85.2 MB", stage: "downloading" },
      { pct: 95, msg: "Verifying integrity... SHA256: 3a7f2b9e...", stage: "verifying" },
      { pct: 98, msg: "Extracting FFmpeg binaries...", stage: "extracting" },
      { pct: 100, msg: "FFmpeg installed successfully! ✓", stage: "complete" },
    ];

    let i = 0;
    const timer = setInterval(() => {
      if (i < stages.length) {
        setProgress(stages[i].pct);
        setStatus(stages[i].msg);
        setStage(stages[i].stage);
        i++;
      } else {
        clearInterval(timer);
        setTimeout(onComplete, 800);
      }
    }, 600);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="setup-screen">
      {/* Animated background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(123, 47, 247, 0.15), transparent 60%), " +
            "radial-gradient(ellipse at 70% 50%, rgba(0, 210, 255, 0.1), transparent 60%), " +
            "radial-gradient(ellipse at 50% 80%, rgba(233, 69, 96, 0.1), transparent 50%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="setup-logo">💀🎨</div>
        <h1
          className="text-2xl font-black tracking-tight mb-1"
          style={{
            background: "linear-gradient(135deg, #e94560, #7b2ff7, #00d2ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          CryptArtist Studio
        </h1>
        <p className="text-[11px] text-studio-muted mb-8">
          Professional Media Editing Suite
        </p>

        {/* Progress */}
        <div className="setup-progress-bar">
          <div
            className="setup-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p className="text-[11px] text-studio-secondary mt-4 h-5">
          {status}
        </p>

        <p className="text-[9px] text-studio-muted mt-2">
          {stage === "downloading"
            ? "This is a one-time setup. FFmpeg is required for media processing."
            : stage === "complete"
            ? "Launching editor..."
            : "Preparing your workspace..."}
        </p>

        {/* Version info */}
        <div className="absolute bottom-8 text-[9px] text-studio-muted opacity-50">
          v0.1.0 • Powered by Rust + wgpu + FFmpeg
        </div>
      </div>
    </div>
  );
}
