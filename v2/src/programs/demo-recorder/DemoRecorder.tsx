import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useStudioCore } from "../../core/context/StudioCoreContext";

export const DemoRecorder: React.FC = () => {
  const { fs } = useStudioCore();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const handleStartCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 60 },
        audio: true,
      });

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
        if (timerRef.current) clearInterval(timerRef.current);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      alert(`Screen recording error: ${err.message}`);
    }
  };

  const handleStopCapture = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleDownload = async () => {
    if (!recordedBlob) return;
    await fs.saveFileToDisk(`Demo_Recording_${Date.now()}.webm`, recordedBlob, "video/webm");
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-studio-bg text-studio-text overflow-hidden">
      <header className="h-12 border-b border-studio-border bg-studio-panel px-3 flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="px-2.5 py-1 text-xs rounded bg-studio-surface hover:bg-studio-elevated border border-studio-border text-studio-secondary hover:text-studio-green transition"
          >
            ← Back to Suite
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎥</span>
            <span className="font-bold text-sm bg-gradient-to-r from-studio-green to-studio-cyan bg-clip-text text-transparent">
              DemoRecorder [DRe]
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-studio-green/20 text-studio-green font-bold">
              v2 Web
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-studio-red/20 border border-studio-red/40 text-studio-red font-mono text-xs animate-pulse">
              <span className="w-2 h-2 rounded-full bg-studio-red" />
              REC: {formatSeconds(recordDuration)}
            </div>
          )}
          {!isRecording ? (
            <button
              onClick={handleStartCapture}
              className="px-4 py-1.5 bg-studio-green hover:bg-studio-green/80 text-black font-bold text-xs rounded-lg transition shadow-glow-green"
            >
              ⏺ Start Screen Recording
            </button>
          ) : (
            <button
              onClick={handleStopCapture}
              className="px-4 py-1.5 bg-studio-red hover:bg-studio-red/80 text-white font-bold text-xs rounded-lg transition"
            >
              ⏹ Stop Recording
            </button>
          )}
        </div>
      </header>

      {/* Main Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black">
        <video
          ref={videoPreviewRef}
          className="max-w-4xl max-h-[70vh] rounded-xl border border-studio-border shadow-2xl bg-studio-surface"
          muted
        />

        {recordedBlob && !isRecording && (
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-6 py-2.5 bg-studio-cyan hover:bg-studio-cyan/80 text-black font-bold text-sm rounded-xl transition shadow-glow-sm flex items-center gap-2"
            >
              <span>💾</span> Download Recorded Demo (.webm)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoRecorder;
