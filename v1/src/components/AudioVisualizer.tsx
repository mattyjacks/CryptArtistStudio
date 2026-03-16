import { useEffect, useRef } from 'react';

export default function AudioVisualizer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let audioCtx: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let animationId: number;
    let active = false;

    // We simulate a base idle animation if mic isn't authorized or is silent
    let time = 0;

    const renderFrame = () => {
      if (active && analyser) {
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        let bass = 0;
        let mid = 0;
        let treble = 0;

        // Splitting frequencies (Bass often correlates with system output/beats,
        // Treble often correlates with voice/mic high freq)
        for (let i = 0; i < 10; i++) bass += dataArray[i];
        for (let i = 10; i < 50; i++) mid += dataArray[i];
        for (let i = 50; i < 100; i++) treble += dataArray[i];

        bass = bass / 10;
        mid = mid / 40;
        treble = treble / 50;

        document.documentElement.style.setProperty('--audio-bass', String(bass / 255));
        document.documentElement.style.setProperty('--audio-mid', String(mid / 255));
        document.documentElement.style.setProperty('--audio-treble', String(treble / 255));
        // Skull grows with input audio (treble/voice), brightens with output audio (bass/system)
        document.documentElement.style.setProperty('--skull-scale', String(1 + (treble / 255) * 0.8));
        document.documentElement.style.setProperty('--skull-brightness', String(1 + (bass / 255) * 1.2));
      } else {
        // Idle animation
        time += 0.01;
        document.documentElement.style.setProperty('--audio-bass', String((Math.sin(time) + 1) * 0.1));
        document.documentElement.style.setProperty('--audio-mid', String((Math.cos(time * 1.5) + 1) * 0.1));
        document.documentElement.style.setProperty('--audio-treble', String((Math.sin(time * 2) + 1) * 0.1));
        document.documentElement.style.setProperty('--skull-scale', String(1 + (Math.sin(time * 0.5) + 1) * 0.1));
        document.documentElement.style.setProperty('--skull-brightness', String(1 + (Math.cos(time * 0.3) + 1) * 0.1));
      }

      animationId = requestAnimationFrame(renderFrame);
    };

    renderFrame();

    const initAudio = async () => {
      try {
        // Capturing the mic also inherently captures the room sound (speakers),
        // effectively reacting to both vocal input and system audio bleeding into the room.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        microphone = audioCtx.createMediaStreamSource(stream);
        microphone.connect(analyser);
        active = true;
      } catch (err) {
        console.warn('Audio capture denied or failed - falling back to idle animation.', err);
      }
    };

    initAudio();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioCtx) audioCtx.close();
      document.documentElement.style.setProperty('--audio-bass', '0');
      document.documentElement.style.setProperty('--audio-mid', '0');
      document.documentElement.style.setProperty('--audio-treble', '0');
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 pointer-events-none overflow-hidden perspective-1000 flex items-center justify-center z-0">
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-3d { transform-style: preserve-3d; }
        
        .logo-layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.05s ease-out, opacity 0.05s ease-out;
          will-change: transform, opacity, filter;
        }
        
        /* Bass typically reacts heavily to lower rumbles / game audio */
        .logo-1 {
          transform: 
            translateZ(calc(var(--audio-bass, 0) * 200px - 100px))
            rotateX(calc(var(--audio-mid, 0) * 15deg))
            rotateY(calc(var(--audio-treble, 0) * 15deg))
            scale(calc(1 + var(--audio-bass, 0) * 0.4));
          opacity: calc(0.02 + var(--audio-bass, 0) * 0.06);
          filter: blur(calc((1 - var(--audio-bass, 1)) * 5px));
        }

        /* Mid-range for more rhythmic pulse - gets bigger with input audio */
        .logo-2 {
          transform: 
            translateZ(calc(var(--audio-mid, 0) * 100px - 300px))
            rotateX(calc(var(--audio-treble, 0) * -20deg))
            rotateY(calc(var(--audio-bass, 0) * -20deg))
            scale(calc(1.5 + var(--audio-mid, 0) * 0.5) * var(--skull-scale, 1));
          opacity: calc((0.01 + var(--audio-mid, 0) * 0.03) * var(--skull-brightness, 1));
          filter: blur(15px) brightness(var(--skull-brightness, 1));
        }
        
        /* Treble reacts tightly to voice/crisp sounds - gets brighter with output audio */
        .logo-3 {
          transform: 
            translateZ(calc(var(--audio-treble, 0) * 250px - 50px))
            rotateZ(calc(var(--audio-bass, 0) * 45deg))
            scale(calc(0.7 + var(--audio-treble, 0) * 0.6) * var(--skull-scale, 1));
          opacity: calc((0.02 + var(--audio-treble, 0) * 0.08) * var(--skull-brightness, 1));
          filter: drop-shadow(0 0 calc(var(--audio-treble, 0) * 30px) rgba(0,210,255,0.7)) brightness(var(--skull-brightness, 1));
        }
        
        .floating-particles {
           position: absolute;
           inset: 0;
           background-image: 
            radial-gradient(circle at 20% 80%, rgba(0, 210, 255, calc(var(--audio-treble, 0) * 0.15)) 0%, transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(255, 59, 59, calc(var(--audio-bass, 0) * 0.12)) 0%, transparent 40%),
            radial-gradient(circle at 50% 50%, rgba(123, 47, 247, calc(var(--audio-mid, 0) * 0.1)) 0%, transparent 60%);
        }
      `}</style>
      
      <div className="absolute inset-0 transform-3d">
        <div className="floating-particles" />
        <div className="logo-layer logo-2">
            {/* Improvement 503: Performance Lazy Loading */}
          <img loading="lazy" decoding="async" src="/logo.png" alt="" className="w-full max-w-[1200px] object-contain select-none" />
        </div>
        <div className="logo-layer logo-3">
            {/* Improvement 505: Performance Lazy Loading */}
           <img loading="lazy" decoding="async" src="/logo.png" alt="" className="w-full max-w-[500px] object-contain select-none" />
        </div>
      </div>
    </div>
  );
}
