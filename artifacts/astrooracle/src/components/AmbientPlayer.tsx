import { useRef, useState, useCallback } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AudioRefs = {
  ctx: AudioContext;
  master: GainNode;
  oscs: OscillatorNode[];
};

export function AmbientPlayer() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<AudioRefs | null>(null);

  const start = useCallback(() => {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    // Warm lowpass + slight presence boost
    const lpFilter = ctx.createBiquadFilter();
    lpFilter.type = "lowpass";
    lpFilter.frequency.value = 800;
    lpFilter.Q.value = 0.4;
    lpFilter.connect(master);

    // Slow filter sweep LFO
    const sweepLFO = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepLFO.frequency.value = 0.04;
    sweepGain.gain.value = 150;
    sweepLFO.connect(sweepGain);
    sweepGain.connect(lpFilter.frequency);
    sweepLFO.start();

    // Three harmonically rich oscillators: A1 + A2 (detuned) + E3
    const specs = [
      { freq: 55.0,   gain: 0.30 }, // A1 — deep foundation
      { freq: 110.22, gain: 0.38 }, // A2 (slight detune for beating)
      { freq: 165.0,  gain: 0.14 }, // E3 — perfect fifth, adds warmth
      { freq: 220.0,  gain: 0.08 }, // A3 — high harmonic shimmer
    ];

    const oscs: OscillatorNode[] = [];
    for (const s of specs) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = s.freq;
      gain.gain.value = s.gain;
      osc.connect(gain);
      gain.connect(lpFilter);
      osc.start();
      oscs.push(osc);
    }

    // Volume tremolo LFO
    const tremoloLFO  = ctx.createOscillator();
    const tremoloGain = ctx.createGain();
    tremoloLFO.frequency.value = 0.07;
    tremoloGain.gain.value = 0.018;
    tremoloLFO.connect(tremoloGain);
    tremoloGain.connect(master.gain);
    tremoloLFO.start();

    // Fade in over ~2 seconds
    master.gain.setTargetAtTime(0.14, ctx.currentTime, 1.8);

    audioRef.current = { ctx, master, oscs };
    setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    // Fade out then release
    a.master.gain.setTargetAtTime(0, a.ctx.currentTime, 1.2);
    setTimeout(() => {
      try { a.oscs.forEach(o => o.stop()); a.ctx.close(); } catch { /* already closed */ }
      audioRef.current = null;
    }, 5000);
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (playing) stop(); else start();
  }, [playing, start, stop]);

  return (
    <motion.button
      onClick={toggle}
      whileTap={{ scale: 0.88 }}
      title={playing ? "Stop ambient sound" : "Play cosmic ambient sound"}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md border transition-all duration-500",
        playing
          ? "bg-purple-500/20 border-purple-400/40 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.35)]"
          : "bg-card/40 border-white/10 text-white/45 hover:text-white/75 hover:bg-card/60"
      )}
    >
      {playing ? <Volume2 size={14} /> : <VolumeX size={14} />}
    </motion.button>
  );
}
