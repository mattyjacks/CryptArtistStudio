/* Wave2: type=button applied */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "../../utils/toast";

export default function LuckFactory() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"intro" | "input" | "meditation" | "result">("intro");
  const [luckString, setLuckString] = useState("");
  const [baseLuck, setBaseLuck] = useState(0);
  const [presetLuck, setPresetLuck] = useState(69);
  const [finalLuck, setFinalLuck] = useState(0);
  const [meditationProgress, setMeditationProgress] = useState(0);

  const affirmations = [
    "Centering the mind...",
    "Aligning the cosmic probability vectors...",
    "Breathing in fortune, exhaling uncertainty...",
    "Tuning into the universal frequency of 777...",
    "Manifesting serendipitous outcomes...",
    "Randomness is just math we don't understand yet...",
    "Locking in the deterministic seed...",
  ];

  // Simple string hasher for 0-999
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };

  const handleGenerate = () => {
    if (!luckString.trim()) {
      toast.error("Please provide a string to anchor your luck.");
      return;
    }
    setStep("meditation");
    setMeditationProgress(0);

    // Calculate luck
    const rawVal = hashString(luckString);
    const calculatedBase = rawVal % 1000;
    setBaseLuck(calculatedBase);

    let preset = 69;
    if (calculatedBase >= 900) preset = 777;
    else if (calculatedBase >= 500) preset = 420;
    setPresetLuck(preset);

    const calculatedFinal = (calculatedBase + preset) % 1000;
    setFinalLuck(calculatedFinal);

    // Save globally
    localStorage.setItem("cryptartist_has_run_luck_factory", "true");
    localStorage.setItem("cryptartist_lucky_string", luckString);
    localStorage.setItem("cryptartist_lucky_seed", calculatedFinal.toString());
  };

  useEffect(() => {
    if (step === "meditation") {
      const interval = setInterval(() => {
        setMeditationProgress((prev) => {
          if (prev >= affirmations.length - 1) {
            clearInterval(interval);
            setTimeout(() => setStep("result"), 1000);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [step, affirmations.length]);

  return (
    <div className="flex flex-col h-screen bg-studio-bg overflow-hidden text-studio-text">
      <div className="w-full h-12 flex items-center px-4 border-b border-studio-border bg-studio-surface">
        <h2 className="text-sm font-bold text-emerald-400">Luck Factory [🍀Lck]</h2>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-4xl mx-auto w-full text-center">
        {step === "intro" && (
          <div className="animate-fade-in space-y-6">
            <h1 className="text-6xl mb-4">{"\u{1F340}"}</h1>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
              Welcome to the Luck Factory
            </h2>
            <p className="text-studio-secondary max-w-lg mx-auto leading-relaxed">
              You've chosen to optimize the AI with <strong>Luck</strong>. 
              Before we can proceed, we must anchor your workspace to a deterministic timeline. 
              By providing an intention, we generate a unique cryptographic luck signature.
            </p>
            <button type="button" 
              onClick={() => setStep("input")}
              className="mt-8 btn bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 px-8 py-3 rounded-full text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
            >
              Initialize Luck Sequence
            </button>
          </div>
        )}

        {step === "input" && (
          <div className="animate-slide-up w-full max-w-md space-y-6">
            <h2 className="text-2xl font-bold text-emerald-400 mb-2">Anchor Your Intention</h2>
            <p className="text-sm text-studio-secondary mb-6">
              Enter any string. It can be your name, a wish, a mantra, or a string of emojis. 
              This will mathematically seed all "Lucky" AI operations in the suite.
            </p>
            <input 
              type="text" 
              value={luckString}
              onChange={(e) => setLuckString(e.target.value)}
              className="input w-full p-4 text-center text-xl bg-studio-surface border border-emerald-500/30 focus:border-emerald-500 rounded-xl"
              placeholder="e.g. 'To the moon 🚀'"
              autoFocus
            />
            <button type="button" 
              onClick={handleGenerate}
              className="btn bg-emerald-500 text-white w-full py-4 rounded-xl text-lg font-bold hover:bg-emerald-600 transition-colors shadow-lg"
            >
              Generate Luck Score
            </button>
          </div>
        )}

        {step === "meditation" && (
          <div className="animate-fade-in space-y-8 flex flex-col items-center">
            <div className="w-24 h-24 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin"></div>
            <h3 className="text-2xl text-emerald-400 font-medium h-12">
              {affirmations[meditationProgress]}
            </h3>
            <p className="text-studio-muted text-sm italic">Focus on your intention...</p>
          </div>
        )}

        {step === "result" && (
          <div className="animate-scale-in space-y-8 w-full max-w-2xl bg-studio-surface/50 border border-emerald-500/30 p-10 rounded-2xl relative overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.1)]">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400"></div>
            
            <h2 className="text-3xl font-bold text-white mb-8">Luck Signature Established</h2>
            
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="p-4 bg-studio-bg rounded-xl border border-studio-border">
                <div className="text-xs text-studio-muted uppercase tracking-wider mb-2">Base Score</div>
                <div className="text-4xl font-mono text-white">{baseLuck}</div>
              </div>
              <div className="p-4 bg-studio-bg rounded-xl border border-studio-border">
                <div className="text-xs text-studio-muted uppercase tracking-wider mb-2">Threshold Preset</div>
                <div className="text-4xl font-mono text-emerald-400">{presetLuck}</div>
              </div>
              <div className="p-4 bg-studio-bg rounded-xl border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2">Final Seed</div>
                <div className="text-4xl font-mono text-white font-bold">{finalLuck}</div>
              </div>
            </div>

            <div className="p-4 bg-emerald-500/10 rounded-lg text-emerald-400 text-sm mt-8 border border-emerald-500/20">
              <span className="font-bold">Your intention:</span> "{luckString}"
            </div>

            <button type="button" 
              onClick={() => navigate("/")}
              className="mt-8 btn bg-emerald-500 text-white px-8 py-3 rounded-full hover:bg-emerald-600 transition-colors w-full"
            >
              Return to Suite
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
