import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Share2, Check, ChevronRight } from "lucide-react";
import { getSunSign, getMoonPhase, shareOrCopy, type ZodiacSign } from "@/lib/astro-calc";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ELEMENT_STYLES: Record<string, { border: string; bg: string; glow: string; text: string }> = {
  Fire:  { border: "border-red-500/30",    bg: "bg-red-500/8",    glow: "shadow-[0_0_30px_rgba(239,68,68,0.15)]",    text: "text-red-400"    },
  Earth: { border: "border-green-500/30",  bg: "bg-green-500/8",  glow: "shadow-[0_0_30px_rgba(34,197,94,0.15)]",    text: "text-green-400"  },
  Air:   { border: "border-yellow-400/30", bg: "bg-yellow-400/8", glow: "shadow-[0_0_30px_rgba(250,204,21,0.15)]",   text: "text-yellow-400" },
  Water: { border: "border-blue-400/30",   bg: "bg-blue-400/8",   glow: "shadow-[0_0_30px_rgba(96,165,250,0.15)]",   text: "text-blue-400"   },
};

function ProfileCard({ sign, moon, onShare, copied }: {
  sign: ZodiacSign;
  moon: ReturnType<typeof getMoonPhase>;
  onShare: () => void;
  copied: boolean;
}) {
  const style = ELEMENT_STYLES[sign.element];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className={cn(
        "rounded-2xl border p-6 text-center space-y-4",
        style.border, style.bg, style.glow,
        "bg-[hsl(240_20%_7%/0.6)] backdrop-blur-sm"
      )}
    >
      {/* Symbol */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-6xl leading-none">{sign.symbol}</span>
        <h3 className={cn("text-2xl font-serif font-bold mt-1", style.text)}>{sign.sign}</h3>
        <p className="text-xs text-white/40 tracking-wide">{sign.dates}</p>
      </div>

      {/* Keyword */}
      <p className={cn("text-sm font-bold uppercase tracking-[0.2em]", style.text)}>{sign.keyword}</p>

      {/* Tagline */}
      <p className="text-sm text-white/70 italic font-serif leading-relaxed px-2">
        "{sign.tagline}"
      </p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        {[
          { label: "Element",  value: sign.element   },
          { label: "Quality",  value: sign.modality  },
          { label: "Ruler",    value: sign.ruler      },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-white/5 border border-white/8 py-2 px-1">
            <p className="text-[9px] text-white/35 uppercase tracking-widest mb-0.5">{label}</p>
            <p className="text-xs font-semibold text-white/80">{value}</p>
          </div>
        ))}
      </div>

      {/* Stone + moon */}
      <div className="flex items-center justify-center gap-4 text-xs text-white/50 pt-1">
        <span>✦ Stone: <span className="text-white/70">{sign.stone}</span></span>
        <span className="w-px h-3 bg-white/20" />
        <span>{moon.emoji} {moon.phase}</span>
      </div>

      {/* Myth snippet */}
      <p className="text-[11px] text-white/35 italic leading-relaxed border-t border-white/8 pt-3">
        {sign.myth}
      </p>

      {/* Share */}
      <button
        onClick={onShare}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all",
          style.border,
          "hover:bg-white/5 text-white/60 hover:text-white/90"
        )}
      >
        {copied ? <Check size={13} /> : <Share2 size={13} />}
        {copied ? "Copied to clipboard!" : "Share My Cosmic Profile"}
      </button>
    </motion.div>
  );
}

export function CosmicProfile() {
  const [open, setOpen]       = useState(false);
  const [birthDate, setBirthDate] = useState("");
  const [profile, setProfile] = useState<{ sign: ZodiacSign; moon: ReturnType<typeof getMoonPhase> } | null>(null);
  const [copied, setCopied]   = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on backdrop click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current === e.target) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const generate = () => {
    if (!birthDate) return;
    const date = new Date(birthDate + "T12:00:00"); // noon to avoid TZ issues
    if (isNaN(date.getTime())) return;
    setProfile({ sign: getSunSign(date), moon: getMoonPhase() });
  };

  const handleShare = async () => {
    if (!profile) return;
    const { sign, moon } = profile;
    const text = [
      `✦ My Cosmic Profile ✦`,
      ``,
      `${sign.symbol} ${sign.sign} Sun (${sign.dates})`,
      `${moon.emoji} Moon: ${moon.phase}`,
      ``,
      `Element: ${sign.element} | Quality: ${sign.modality} | Ruled by ${sign.ruler}`,
      `Birthstone: ${sign.stone}`,
      ``,
      `"${sign.tagline}"`,
      ``,
      `Myth: ${sign.myth}`,
      ``,
      `— Discovered with AstroOracle`,
    ].join("\n");

    const result = await shareOrCopy("My Cosmic Profile", text);
    if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const reset = () => { setProfile(null); setBirthDate(""); };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.88 }}
        title="Discover Your Cosmic Profile"
        className="w-8 h-8 flex items-center justify-center rounded-full backdrop-blur-md border border-amber-500/25 bg-card/40 text-amber-400/60 hover:text-amber-400 hover:bg-card/60 transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.12)]"
      >
        <Sparkles size={14} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="relative w-full max-w-sm max-h-[90dvh] overflow-y-auto rounded-3xl bg-[hsl(240_20%_6%/0.97)] backdrop-blur-xl border border-white/10 shadow-[0_0_60px_rgba(107,33,168,0.2)]"
            >
              {/* Close */}
              <button
                onClick={() => { setOpen(false); reset(); }}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white/80 transition-colors"
              >
                <X size={15} />
              </button>

              <div className="p-6 space-y-5">
                {/* Title */}
                <div className="text-center">
                  <h2 className="text-xl font-serif font-bold text-white/90">Your Cosmic Profile</h2>
                  <p className="text-xs text-white/40 mt-1">Enter your birth date to reveal your celestial blueprint</p>
                </div>

                {!profile ? (
                  /* Input form */
                  <div className="space-y-3">
                    <input
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full bg-white/5 border border-white/15 rounded-xl py-3 px-4 text-white/85 text-sm focus:outline-none focus:border-amber-500/40 focus:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all [color-scheme:dark]"
                    />
                    <button
                      onClick={generate}
                      disabled={!birthDate}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Sparkles size={15} />
                      Reveal My Cosmic Blueprint
                      <ChevronRight size={15} />
                    </button>
                  </div>
                ) : (
                  /* Profile card */
                  <div className="space-y-3">
                    <ProfileCard sign={profile.sign} moon={profile.moon} onShare={handleShare} copied={copied} />
                    <button
                      onClick={reset}
                      className="w-full py-2 text-xs text-white/35 hover:text-white/60 transition-colors"
                    >
                      Try another date
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
