import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, X, Share2, Check } from "lucide-react";
import { getMoonPhase, getSunSign, getTonightsConstellations, shareOrCopy } from "@/lib/astro-calc";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function useSkyData() {
  const now = new Date();
  return {
    moon:          getMoonPhase(now),
    season:        getSunSign(now),
    constellations: getTonightsConstellations(now),
    dateLabel:     now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
  };
}

export function SkyTonight() {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const sky = useSkyData();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleShare = async () => {
    const text = [
      `🌌 Tonight's Sky — ${sky.dateLabel}`,
      ``,
      `${sky.moon.emoji} Moon: ${sky.moon.phase} (${sky.moon.illumination}% illuminated)`,
      `${sky.season.symbol} Sun: ${sky.season.sign} season (${sky.season.element} ${sky.season.modality})`,
      ``,
      `✦ Featured Constellations:`,
      ...sky.constellations.map(c => `  • ${c.name}: ${c.highlight}`),
      ``,
      `— Shared via AstroOracle`,
    ].join("\n");

    const result = await shareOrCopy("Tonight's Sky", text);
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileTap={{ scale: 0.88 }}
        title="Your Sky Tonight"
        className={cn(
          "w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md border transition-all duration-500",
          open
            ? "bg-blue-500/20 border-blue-400/40 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.35)]"
            : "bg-card/40 border-white/10 text-white/45 hover:text-white/75 hover:bg-card/60"
        )}
      >
        <Moon size={14} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="absolute top-10 left-0 z-50 w-72 rounded-2xl bg-[hsl(240_20%_7%/0.92)] backdrop-blur-xl border border-white/10 shadow-[0_0_40px_rgba(59,130,246,0.15)] overflow-hidden"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
              <span className="text-[11px] font-bold text-blue-300/90 uppercase tracking-widest">Your Sky Tonight</span>
              <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white/70 transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Date */}
              <p className="text-[11px] text-white/40 font-medium tracking-wide">{sky.dateLabel}</p>

              {/* Moon phase */}
              <div className="flex items-center gap-3">
                <span className="text-3xl leading-none">{sky.moon.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-white/90">{sky.moon.phase}</p>
                  <p className="text-[11px] text-white/45">{sky.moon.illumination}% illuminated</p>
                </div>
              </div>

              {/* Zodiac season */}
              <div className="flex items-center gap-3">
                <span className="text-2xl leading-none">{sky.season.symbol}</span>
                <div>
                  <p className="text-sm font-semibold text-white/90">{sky.season.sign} Season</p>
                  <p className="text-[11px] text-white/45">{sky.season.element} · {sky.season.modality} · Ruled by {sky.season.ruler}</p>
                </div>
              </div>

              {/* Featured constellations */}
              <div>
                <p className="text-[10px] text-white/35 uppercase tracking-widest mb-2">Featured Tonight</p>
                <div className="space-y-2">
                  {sky.constellations.map(c => (
                    <div key={c.name} className="flex items-start gap-2">
                      <span className="text-blue-400/70 mt-0.5 text-xs leading-none">✦</span>
                      <div>
                        <span className="text-xs font-semibold text-white/85">{c.name}</span>
                        <p className="text-[11px] text-white/45 leading-snug">{c.highlight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300/80 text-xs font-medium hover:bg-blue-500/20 transition-colors"
              >
                {copied ? <Check size={13} /> : <Share2 size={13} />}
                {copied ? "Copied to clipboard!" : "Share Tonight's Sky"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
