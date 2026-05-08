import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, X, Compass, Camera, MapPin, Lock, Send, Mic, Map, ArrowRight, Star } from 'lucide-react';
import { useAppMode } from '@/context/AppContext';

// ── Constellation data ────────────────────────────────────────────────────────
interface Constellation {
  id: string;
  name: string;
  myth: string;
  az: number;
  alt: number;
  mag: number;
  stars: [number, number][];
  lines: [number, number][];
}

const CONSTELLATIONS: Constellation[] = [
  {
    id: 'orion', name: 'Orion', myth: 'The Hunter', az: 142, alt: 38, mag: 0.5,
    stars: [[0.18,0.30],[0.22,0.36],[0.26,0.32],[0.20,0.46],[0.30,0.50],[0.25,0.58],[0.18,0.62]],
    lines: [[0,1],[1,2],[1,3],[3,4],[3,5],[5,6]],
  },
  {
    id: 'ursa-major', name: 'Ursa Major', myth: 'The Great Bear', az: 8, alt: 65, mag: 1.8,
    stars: [[0.55,0.22],[0.62,0.25],[0.69,0.28],[0.74,0.34],[0.78,0.30],[0.82,0.36],[0.86,0.42]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]],
  },
  {
    id: 'cassiopeia', name: 'Cassiopeia', myth: 'The Queen', az: 50, alt: 72, mag: 2.1,
    stars: [[0.42,0.18],[0.48,0.22],[0.54,0.16],[0.60,0.22],[0.66,0.18]],
    lines: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    id: 'lyra', name: 'Lyra · Vega', myth: 'The Lyre', az: 280, alt: 28, mag: 0.0,
    stars: [[0.78,0.55],[0.82,0.62],[0.86,0.58],[0.83,0.66]],
    lines: [[0,1],[1,2],[1,3]],
  },
];

// ── Permission flow ───────────────────────────────────────────────────────────
const PERM_STEPS = [
  { icon: '✨', title: 'Step into the night sky', body: "Point your phone up and we'll show you what's there — constellations, planets, mythology, science. The Oracle is right beside you.", perm: null },
  { icon: <Camera size={26} />, title: 'See the sky through your camera', body: 'We use your camera to overlay constellations onto what you see. Nothing is recorded.', perm: 'Camera' },
  { icon: <Compass size={26} />, title: 'Know which way you\'re pointing', body: 'Compass and tilt let us match the right stars to where your phone is aimed.', perm: 'Motion & orientation' },
  { icon: <MapPin size={26} />, title: 'Find your sky', body: 'Approximate location — never exact — so the stars overhead match your spot on Earth.', perm: 'Location' },
];

function PermissionFlow({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const s = PERM_STEPS[step];
  const isLast = step === PERM_STEPS.length - 1;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-5 z-50"
      style={{ background: 'rgba(10,10,15,0.94)', backdropFilter: 'blur(20px)' }}
    >
      <motion.div
        key={step}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xs text-center"
      >
        {/* Icon */}
        <div
          className="w-20 h-20 mx-auto mb-5 rounded-full flex items-center justify-center text-3xl text-white"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(168,85,247,0.6), rgba(76,29,149,0.5))',
            border: '1px solid rgba(168,85,247,0.4)',
            boxShadow: '0 0 40px rgba(168,85,247,0.4)',
          }}
        >
          {s.icon}
        </div>

        <h2 className="font-serif text-[22px] text-white font-semibold mb-2.5">{s.title}</h2>
        <p className="text-sm text-white/70 leading-relaxed mb-6">{s.body}</p>

        {s.perm && (
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] text-purple-300/90 mb-6"
            style={{ background: 'rgba(107,33,168,0.18)', border: '1px solid rgba(168,85,247,0.3)' }}
          >
            <Lock size={10} /> Asks for {s.perm}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => isLast ? onDone() : setStep(step + 1)}
            className="w-full py-3 rounded-full text-sm font-semibold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
              border: '1px solid rgba(168,85,247,0.5)',
              boxShadow: '0 0 24px rgba(168,85,247,0.4)',
            }}
          >
            {step === 0 ? 'Begin →' : isLast ? 'Allow & start' : 'Allow & continue'}
          </button>
          <button
            onClick={onCancel}
            className="text-xs text-white/50 py-2 hover:text-white/70 transition-colors"
          >
            Maybe later
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mt-5">
          {PERM_STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === step ? 18 : 5,
                background: i === step ? '#a855f7' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Simulated star field ──────────────────────────────────────────────────────
function SimStars() {
  const stars = useRef(
    Array.from({ length: 80 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 70,
      r: Math.random() * 0.35 + 0.08,
      dur: 2 + Math.random() * 5,
    }))
  ).current;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="rgba(220,230,255,0.85)">
          <animate attributeName="opacity" values="0.4;1;0.4" dur={`${s.dur}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}

// ── Camera sky viewport ───────────────────────────────────────────────────────
function CameraSky({
  heading,
  mode,
  onTap,
}: {
  heading: number;
  mode: 'science' | 'mystic';
  onTap: (c: Constellation) => void;
}) {
  const colorMain = mode === 'mystic' ? '#fde68a' : '#bfdbfe';
  const colorLine = mode === 'mystic' ? 'rgba(251,191,36,0.55)' : 'rgba(96,165,250,0.55)';

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 50% 110%, rgba(30,30,60,0.6), #050510 70%),
                     linear-gradient(180deg, #0c0a25 0%, #0a0a18 50%, #050507 100%)`,
      }}
    >
      {/* City glow horizon */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          height: '32%',
          background: 'linear-gradient(0deg, rgba(245,158,11,0.16), rgba(245,158,11,0.04) 40%, transparent)',
        }}
      />

      <SimStars />

      {/* Constellation SVG */}
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
      >
        {CONSTELLATIONS.map(c => {
          const offset = ((c.az - heading + 540) % 360) - 180;
          if (Math.abs(offset) >= 90) return null;
          const tx = 50 + (offset / 90) * 50;
          const op = 1 - Math.abs(offset) / 90;

          return (
            <g
              key={c.id}
              style={{ opacity: op, cursor: 'pointer' }}
              transform={`translate(${tx - 50},0)`}
              onClick={() => onTap(c)}
            >
              {c.lines.map(([a, b], i) => (
                <line
                  key={i}
                  x1={c.stars[a][0] * 100} y1={c.stars[a][1] * 100}
                  x2={c.stars[b][0] * 100} y2={c.stars[b][1] * 100}
                  stroke={colorLine} strokeWidth="0.18" strokeDasharray="0.6 0.4"
                />
              ))}
              {c.stars.map((s, i) => (
                <circle key={i} cx={s[0] * 100} cy={s[1] * 100} r={i === 0 ? 0.7 : 0.45} fill={colorMain}>
                  <animate attributeName="opacity" values="0.6;1;0.6" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
                </circle>
              ))}
              <text
                x={c.stars[0][0] * 100 + 1.5}
                y={c.stars[0][1] * 100 - 1}
                fill={colorMain}
                fontSize="2"
                fontFamily="'Cormorant Garamond', serif"
              >
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Scanlines */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.012) 3px 4px)' }}
      />

      {/* Reticle */}
      <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none">
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="22" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" fill="none" />
          <circle cx="32" cy="32" r="2" fill="rgba(255,255,255,0.4)" />
          <line x1="32" y1="6" x2="32" y2="14" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="32" y1="50" x2="32" y2="58" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="6" y1="32" x2="14" y2="32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
          <line x1="50" y1="32" x2="58" y2="32" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
        </svg>
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex-shrink-0 px-2.5 py-1.5 rounded-xl min-w-[60px]"
      style={{ background: 'rgba(18,18,28,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="text-[8px] uppercase tracking-[1px] text-white/45">{label}</p>
      <p className="font-mono text-xs text-white font-medium mt-0.5">{value}</p>
    </div>
  );
}

// ── Constellation sheet ───────────────────────────────────────────────────────
function ConstellationSheet({
  c,
  mode,
  onClose,
  onOpenChat,
}: {
  c: Constellation;
  mode: 'science' | 'mystic';
  onClose: () => void;
  onOpenChat: () => void;
}) {
  const [text, setText] = useState('');
  const colorAccent = mode === 'mystic' ? '#fde68a' : '#bfdbfe';
  const scienceText = `${c.name} is at azimuth ${c.az}°, altitude ${c.alt}°. Brightest star magnitude ${c.mag}.`;
  const mysticText = `${c.name} — ${c.myth}. Tonight it sits ${c.alt}° above your horizon, holding a current of memory and intention.`;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="absolute left-0 right-0 bottom-0 z-40"
    >
      <div
        className="rounded-t-[22px] pb-4"
        style={{
          background: 'rgba(10,10,15,0.94)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          boxShadow: '0 -10px 60px rgba(107,33,168,0.30)',
        }}
      >
        {/* Handle */}
        <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mt-2 mb-1.5" />

        {/* Header row */}
        <div className="flex items-start justify-between px-4 py-2">
          <div>
            <p className="text-[9.5px] uppercase tracking-[1.6px] font-semibold mb-1" style={{ color: colorAccent }}>
              {mode === 'mystic' ? 'Mystic' : 'Science'} · in your sky now
            </p>
            <h3 className="font-serif text-[22px] text-white font-semibold">{c.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-white"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          <Stat label="Altitude" value={`${c.alt}°`} />
          <Stat label="Azimuth" value={`${c.az}°`} />
          <Stat label="Brightest" value={`mag ${c.mag}`} />
          <Stat label="Best until" value="3:14 AM" />
        </div>

        {/* AI response */}
        <div className="px-4 pb-3">
          <div
            className="p-3 rounded-2xl"
            style={{
              background: 'rgba(76,29,149,0.20)',
              border: '1px solid rgba(107,33,168,0.30)',
              boxShadow: '0 0 20px rgba(107,33,168,0.18)',
            }}
          >
            <span className="text-[9px] font-bold text-purple-400/85 uppercase tracking-[1.4px] block mb-1">
              ✦ AstroOracle
            </span>
            <p className="text-[12.5px] text-white/90 leading-relaxed">
              {mode === 'mystic' ? mysticText : scienceText}
            </p>
          </div>
        </div>

        {/* Suggestion chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {(mode === 'mystic'
            ? ['What myth lives here?', 'What does this mean tonight?', 'Tell me a story']
            : ['Brightest stars', 'Distance to brightest?', 'When can I see it?']
          ).map(q => (
            <button
              key={q}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs text-white/85 transition-colors"
              style={{
                background: 'rgba(18,18,28,0.6)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="relative px-4">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`Ask about ${c.name}…`}
            className="w-full py-3 pl-4 pr-20 rounded-full text-[12.5px] text-white outline-none"
            style={{
              background: 'rgba(18,18,28,0.6)',
              border: '1px solid rgba(255,255,255,0.20)',
            }}
          />
          <div className="absolute right-7 top-1/2 -translate-y-1/2 flex gap-1.5">
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/55"
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)' }}
            >
              <Mic size={12} />
            </button>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{
                background: mode === 'mystic' ? 'rgba(120,53,15,0.7)' : 'rgba(30,64,175,0.7)',
                border: '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <Send size={12} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between px-4 pt-3">
          <button
            onClick={onOpenChat}
            className="flex items-center gap-1.5 text-xs text-purple-400/85"
          >
            Continue full conversation <ArrowRight size={11} />
          </button>
          <button className="flex items-center gap-1 text-xs text-white/50">
            <Star size={10} /> Save
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main AR screen ────────────────────────────────────────────────────────────
export default function ARSkyGazer() {
  const [, navigate] = useLocation();
  const { mode } = useAppMode();
  const [granted, setGranted] = useState(false);
  const [heading, setHeading] = useState(140);
  const [selected, setSelected] = useState<Constellation | null>(null);
  const [layer, setLayer] = useState<'lines' | 'names' | 'planets'>('lines');

  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const compassLabel = compass[Math.round(heading / 45) % 8];

  // Auto-rotate heading so the sky feels alive
  useEffect(() => {
    if (!granted) return;
    const id = setInterval(() => setHeading(h => (h + 0.4) % 360), 60);
    return () => clearInterval(id);
  }, [granted]);

  if (!granted) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f]">
        <PermissionFlow onDone={() => setGranted(true)} onCancel={() => navigate('/')} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      <CameraSky heading={heading} mode={mode} onTap={setSelected} />

      {/* Top bar */}
      <div
        className="absolute left-3 right-3 flex justify-between items-center z-10"
        style={{ top: 'max(12px, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => navigate('/')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'rgba(18,18,28,0.45)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <ChevronLeft size={14} />
        </button>

        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(18,18,28,0.45)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <Camera size={11} className="text-purple-400" />
          <span className="text-xs text-white font-semibold">Sky Gazer</span>
        </div>

        {/* Mode indicator */}
        <div
          className="px-2.5 py-1.5 rounded-full text-[10px] font-medium"
          style={{
            background: 'rgba(18,18,28,0.45)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${mode === 'mystic' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
            color: mode === 'mystic' ? '#fde68a' : '#bfdbfe',
          }}
        >
          {mode === 'mystic' ? '✨' : '🔭'}
        </div>
      </div>

      {/* HUD row */}
      <div className="absolute left-3 right-3 z-5 flex justify-between" style={{ top: 72 }}>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: 'rgba(18,18,28,0.45)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <Compass size={11} className="text-purple-400" />
          <span className="font-mono text-[10px] text-white/85">{compassLabel} · {Math.round(heading)}°</span>
        </div>
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: 'rgba(18,18,28,0.45)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <MapPin size={11} className="text-purple-400" />
          <span className="font-mono text-[10px] text-white/85">Your location</span>
        </div>
      </div>

      {/* Tap hint */}
      {!selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute left-0 right-0 flex justify-center z-5 pointer-events-none"
          style={{ bottom: 110 }}
        >
          <div
            className="px-3.5 py-2 rounded-full"
            style={{ background: 'rgba(18,18,28,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <span className="text-xs text-white/85">✦ Tap any constellation to ask</span>
          </div>
        </motion.div>
      )}

      {/* Bottom controls */}
      <div className="absolute left-3 right-3 flex items-center justify-between z-10" style={{ bottom: 24 }}>
        <div
          className="flex rounded-full p-1 gap-0.5"
          style={{ background: 'rgba(18,18,28,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {(['lines', 'names', 'planets'] as const).map(l => (
            <button
              key={l}
              onClick={() => setLayer(l)}
              className="px-3 py-1.5 rounded-full text-[10.5px] font-medium transition-all capitalize"
              style={{
                background: layer === l ? 'rgba(168,85,247,0.5)' : 'transparent',
                color: layer === l ? '#fff' : 'rgba(255,255,255,0.65)',
                border: 'none',
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          className="w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{
            background: 'rgba(18,18,28,0.45)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <Map size={14} />
        </button>
      </div>

      {/* Constellation sheet */}
      <AnimatePresence>
        {selected && (
          <ConstellationSheet
            key={selected.id}
            c={selected}
            mode={mode}
            onClose={() => setSelected(null)}
            onOpenChat={() => { setSelected(null); navigate('/'); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
