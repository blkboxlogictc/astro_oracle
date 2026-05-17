import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { BRIGHT_STARS } from '@/data/brightStars';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, X, Compass, Camera, MapPin, Lock,
  Send, Mic, Map, ArrowRight, Star,
} from 'lucide-react';
import { useAppMode } from '@/context/AppContext';

// ── Sky projection ─────────────────────────────────────────────────────────────
// Full-sphere 2D projection. camAz = compass heading (0–360, N=0 clockwise).
// camAlt = altitude camera is pointing at (-90 nadir … 0 horizon … 90 zenith).

const FOV_AZ  = 75;
const FOV_ALT = 55;

interface Projected {
  x: number;
  y: number;
  opacity: number;
  visible: boolean;
}

function project(
  objAz: number, objAlt: number,
  camAz: number, camAlt: number,
): Projected {
  const dAz  = ((objAz - camAz + 540) % 360) - 180; // –180…+180
  const dAlt = objAlt - camAlt;
  const hHalf = FOV_AZ  / 2;
  const vHalf = FOV_ALT / 2;

  if (Math.abs(dAz) > hHalf + 20 || Math.abs(dAlt) > vHalf + 20) {
    return { x: 0, y: 0, opacity: 0, visible: false };
  }

  const x = 50 + (dAz  / hHalf) * 50;
  const y = 50 - (dAlt / vHalf) * 50;
  const fadeAz  = Math.max(0, 1 - Math.abs(dAz)  / hHalf);
  const fadeAlt = Math.max(0, 1 - Math.abs(dAlt) / vHalf);
  const opacity = fadeAz * fadeAlt;

  return { x, y, opacity, visible: opacity > 0.05 };
}

// ── Astronomical math ─────────────────────────────────────────────────────────

function getGMST(date: Date): number {
  const jd  = date.getTime() / 86400000 + 2440587.5;
  const T   = (jd - 2451545.0) / 36525;
  let gmst  = 6.697374558 + 2400.0513369 * T + 0.0000258622 * T * T;
  gmst     += (date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600) * 1.00273790935;
  return ((gmst % 24) + 24) % 24;
}

function raDecToAltAz(
  ra: number, dec: number,
  lat: number, lng: number,
  date: Date,
): { alt: number; az: number } {
  const lst    = ((getGMST(date) + lng / 15) % 24 + 24) % 24;
  const ha     = ((lst - ra) * 15 + 360) % 360;
  const haR    = ha  * (Math.PI / 180);
  const dR     = dec * (Math.PI / 180);
  const lR     = lat * (Math.PI / 180);
  const sinAlt = Math.sin(dR) * Math.sin(lR) + Math.cos(dR) * Math.cos(lR) * Math.cos(haR);
  const altR   = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
  const alt    = altR * (180 / Math.PI);
  const cosAlt = Math.cos(altR);
  if (cosAlt < 1e-9) return { alt, az: 0 };
  const cosAz  = (Math.sin(dR) - Math.sin(lR) * sinAlt) / (Math.cos(lR) * cosAlt);
  let az       = Math.acos(Math.max(-1, Math.min(1, cosAz))) * (180 / Math.PI);
  if (Math.sin(haR) > 0) az = 360 - az;
  return { alt, az };
}

const SPECT_COLOR: Record<string, string> = {
  O: '#9bb0ff', B: '#aabfff', A: '#cad7ff',
  F: '#f8f7ff', G: '#fff4ea', K: '#ffd2a1', M: '#ffad51',
};
function spectralColor(spect: string): string {
  return SPECT_COLOR[spect[0]?.toUpperCase() ?? 'A'] ?? '#ffffff';
}

// ── Constellation data ────────────────────────────────────────────────────────
interface Constellation {
  id: string;
  name: string;
  myth: string;
  az: number;
  alt: number;
  mag: number;
  spanAz: number;
  spanAlt: number;
  stars: [number, number][];
  lines: [number, number][];
}

const CONSTELLATIONS: Constellation[] = [
  {
    id: 'orion', name: 'Orion', myth: 'The Hunter',
    az: 142, alt: 38, mag: 0.5, spanAz: 20, spanAlt: 24,
    stars: [[0.18,0.30],[0.22,0.36],[0.26,0.32],[0.20,0.46],[0.30,0.50],[0.25,0.58],[0.18,0.62]],
    lines: [[0,1],[1,2],[1,3],[3,4],[3,5],[5,6]],
  },
  {
    id: 'ursa-major', name: 'Ursa Major', myth: 'The Great Bear',
    az: 8, alt: 65, mag: 1.8, spanAz: 30, spanAlt: 16,
    stars: [[0.10,0.45],[0.24,0.38],[0.39,0.32],[0.52,0.42],[0.62,0.30],[0.76,0.45],[0.90,0.55]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]],
  },
  {
    id: 'cassiopeia', name: 'Cassiopeia', myth: 'The Queen',
    az: 50, alt: 72, mag: 2.1, spanAz: 24, spanAlt: 10,
    stars: [[0.05,0.65],[0.25,0.30],[0.50,0.60],[0.75,0.20],[0.95,0.55]],
    lines: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    id: 'lyra', name: 'Lyra', myth: 'The Lyre · Vega',
    az: 280, alt: 28, mag: 0.0, spanAz: 8, spanAlt: 10,
    stars: [[0.50,0.10],[0.25,0.65],[0.75,0.65],[0.35,0.90],[0.65,0.90]],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,4]],
  },
  {
    id: 'scorpius', name: 'Scorpius', myth: 'The Scorpion',
    az: 200, alt: 22, mag: 1.0, spanAz: 14, spanAlt: 28,
    stars: [[0.50,0.10],[0.45,0.28],[0.50,0.42],[0.40,0.55],[0.48,0.68],[0.55,0.80],[0.65,0.88]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6]],
  },
  {
    id: 'leo', name: 'Leo', myth: 'The Lion',
    az: 330, alt: 45, mag: 1.4, spanAz: 22, spanAlt: 18,
    stars: [[0.20,0.35],[0.35,0.20],[0.55,0.15],[0.70,0.30],[0.85,0.55],[0.60,0.75],[0.30,0.80]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,0]],
  },
  {
    id: 'cygnus', name: 'Cygnus', myth: 'The Swan · Northern Cross',
    az: 95, alt: 55, mag: 1.3, spanAz: 18, spanAlt: 20,
    stars: [[0.50,0.10],[0.50,0.40],[0.50,0.70],[0.50,0.95],[0.15,0.40],[0.85,0.40]],
    lines: [[0,1],[1,2],[2,3],[4,1],[1,5]],
  },
];

interface Planet { name: string; az: number; alt: number; color: string; size: number }

const PLANETS: Planet[] = [
  { name: 'Jupiter', az: 85,  alt: 42, color: '#fde68a', size: 1.3 },
  { name: 'Venus',   az: 248, alt: 14, color: '#e0e7ff', size: 1.5 },
  { name: 'Mars',    az: 312, alt: 33, color: '#fca5a5', size: 1.0 },
  { name: 'Saturn',  az: 188, alt: 50, color: '#d4a464', size: 1.1 },
];

type Layer = 'lines' | 'names' | 'planets';

function toChatWith(question: string, navigate: (p: string) => void) {
  sessionStorage.setItem('chatPrefill', question);
  navigate('/');
}

function starCoords(c: Constellation): { az: number; alt: number }[] {
  return c.stars.map(([rx, ry]) => ({
    az:  c.az  + (rx - 0.5) * c.spanAz,
    alt: c.alt + (0.5 - ry) * c.spanAlt,
  }));
}

// ── Permission flow ───────────────────────────────────────────────────────────
const PERM_STEPS = [
  { icon: '✨', title: 'Step into the night sky', body: "Point your phone anywhere — up, sideways, even down — and we'll show what's there across the full celestial sphere.", perm: null },
  { icon: <Camera size={26} />, title: 'Camera overlay', body: 'Your camera shows the live sky while constellations are layered on top. Nothing is recorded or stored.', perm: 'Camera' },
  { icon: <Compass size={26} />, title: 'Full 3D orientation', body: 'We read azimuth, tilt, and roll so the sky matches exactly where your phone is aimed — including pointing at the ground.', perm: 'Motion & orientation' },
  { icon: <MapPin size={26} />, title: 'Your sky, your spot', body: 'Approximate location so the stars visible from your latitude appear correctly.', perm: 'Location' },
];

function PermissionFlow({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [step, setStep] = useState(0);
  const s = PERM_STEPS[step];
  const isLast = step === PERM_STEPS.length - 1;

  const handleNext = async () => {
    if (step === 2) {
      try {
        const doe = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
        if (typeof doe.requestPermission === 'function') {
          await doe.requestPermission();
        }
      } catch { /* denied or unsupported */ }
    }
    if (step === 3 && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 6000 });
    }
    isLast ? onDone() : setStep(s => s + 1);
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center p-5 z-50"
      style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(20px)' }}
    >
      <motion.div key={step} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xs text-center">
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10.5px] text-purple-300/90 mb-6"
            style={{ background: 'rgba(107,33,168,0.18)', border: '1px solid rgba(168,85,247,0.3)' }}>
            <Lock size={10} /> Asks for {s.perm}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button onClick={handleNext} className="w-full py-3 rounded-full text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: '1px solid rgba(168,85,247,0.5)', boxShadow: '0 0 24px rgba(168,85,247,0.4)' }}>
            {step === 0 ? 'Begin →' : isLast ? 'Allow & start' : 'Allow & continue'}
          </button>
          <button onClick={onCancel} className="text-xs text-white/50 py-2 hover:text-white/70 transition-colors">Maybe later</button>
        </div>
        <div className="flex justify-center gap-1.5 mt-5">
          {PERM_STEPS.map((_, i) => (
            <span key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === step ? 18 : 5, background: i === step ? '#a855f7' : 'rgba(255,255,255,0.2)' }} />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ── Real star canvas ──────────────────────────────────────────────────────────
function StarCanvas({
  camAz, camAlt, observerLat, observerLng,
}: {
  camAz: number; camAlt: number; observerLat: number; observerLng: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nowRef    = useRef(new Date());

  useEffect(() => {
    const id = setInterval(() => { nowRef.current = new Date(); }, 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w   = canvas.clientWidth;
    const h   = canvas.clientHeight;
    canvas.width  = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const now = nowRef.current;

    for (const [ra, dec, mag, spect] of BRIGHT_STARS) {
      const { alt, az } = raDecToAltAz(ra, dec, observerLat, observerLng, now);
      if (alt < -8) continue;

      const proj = project(az, alt, camAz, camAlt);
      if (!proj.visible) continue;

      const px  = (proj.x / 100) * w;
      const py  = (proj.y / 100) * h;
      const r   = Math.max(0.7, (3.6 - mag) * 0.95);
      const col = spectralColor(spect);
      const alpha = proj.opacity * Math.max(0.3, Math.min(1, (alt + 8) / 15));

      if (mag < 1.5) {
        const grad = ctx.createRadialGradient(px, py, r * 0.5, px, py, r * 4);
        grad.addColorStop(0, col + '55');
        grad.addColorStop(1, col + '00');
        ctx.beginPath();
        ctx.arc(px, py, r * 4, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.globalAlpha = alpha * 0.6;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [camAz, camAlt, observerLat, observerLng]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

// ── Background star field (faint fill) ───────────────────────────────────────
function SimStars({ camAlt }: { camAlt: number }) {
  const stars = useRef(
    Array.from({ length: 120 }, (_, i) => ({
      x: ((i * 137.508) % 100),
      y: ((i * 97.32)  % 80),
      r: 0.08 + ((i * 31) % 10) * 0.032,
      dur: 2 + ((i * 7) % 50) / 10,
    }))
  ).current;

  const shiftY = (camAlt / 90) * 15;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
      <g transform={`translate(0,${shiftY})`}>
        {stars.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="rgba(220,230,255,0.85)">
            <animate attributeName="opacity" values="0.35;1;0.35" dur={`${s.dur}s`} repeatCount="indefinite" />
          </circle>
        ))}
      </g>
    </svg>
  );
}

// ── Sky viewport ──────────────────────────────────────────────────────────────
function CameraSky({
  camAz, camAlt, observerLat, observerLng, mode, layer, onTap,
}: {
  camAz: number; camAlt: number;
  observerLat: number; observerLng: number;
  mode: 'science' | 'mystic';
  layer: Layer;
  onTap: (c: Constellation) => void;
}) {
  const colorMain = mode === 'mystic' ? '#fde68a' : '#bfdbfe';
  const colorLine = mode === 'mystic' ? 'rgba(251,191,36,0.6)' : 'rgba(96,165,250,0.6)';

  const projectedConstellations = useMemo(() => {
    return CONSTELLATIONS.map(c => {
      const coords = starCoords(c);
      const pStars = coords.map(sc => project(sc.az, sc.alt, camAz, camAlt));
      const pCenter = project(c.az, c.alt, camAz, camAlt);
      const anyVisible = pStars.some(p => p.visible) || pCenter.visible;
      return { c, pStars, pCenter, anyVisible };
    });
  }, [camAz, camAlt]);

  const projectedPlanets = useMemo(() => {
    return PLANETS.map(p => ({ p, pos: project(p.az, p.alt, camAz, camAlt) }));
  }, [camAz, camAlt]);

  const horizonY = 50 + (camAlt / (FOV_ALT / 2)) * 50;
  const showHorizon = horizonY > 2 && horizonY < 98;
  const lookingUnderground = camAlt < -15;

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        background: lookingUnderground
          ? 'linear-gradient(180deg, #0a0a12 0%, #0d0805 100%)'
          : `radial-gradient(ellipse at 50% 110%, rgba(30,30,60,0.6), #050510 70%),
             linear-gradient(180deg, #0c0a25 0%, #0a0a18 50%, #050507 100%)`,
      }}
    >
      {!lookingUnderground && (
        <div className="absolute left-0 right-0 bottom-0"
          style={{ height: '32%', background: 'linear-gradient(0deg, rgba(245,158,11,0.14), transparent)' }} />
      )}

      {lookingUnderground && (
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(120,60,10,0.12), transparent 70%)' }} />
      )}

      <StarCanvas camAz={camAz} camAlt={camAlt} observerLat={observerLat} observerLng={observerLng} />
      <SimStars camAlt={camAlt} />

      {showHorizon && (
        <div className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: `${horizonY}%`,
            height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.35) 30%, rgba(245,158,11,0.35) 70%, transparent)',
          }} />
      )}

      {lookingUnderground && (
        <div className="absolute left-0 right-0 flex justify-center pointer-events-none" style={{ top: '20%' }}>
          <span className="text-[10px] text-amber-400/60 tracking-widest uppercase font-medium">
            ↓ Through the Earth
          </span>
        </div>
      )}

      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">

        {layer !== 'planets' && projectedConstellations.map(({ c, pStars, pCenter, anyVisible }) => {
          if (!anyVisible) return null;
          const groupOpacity = Math.max(...pStars.map(p => p.opacity), pCenter.opacity);

          return (
            <g key={c.id} style={{ opacity: groupOpacity, cursor: 'pointer' }} onClick={() => onTap(c)}>
              {layer === 'lines' && c.lines.map(([a, b], i) => {
                const pa = pStars[a], pb = pStars[b];
                if (!pa || !pb || (!pa.visible && !pb.visible)) return null;
                return (
                  <line key={i}
                    x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
                    stroke={colorLine} strokeWidth="0.22" strokeDasharray="0.7 0.5"
                    strokeLinecap="round"
                  />
                );
              })}

              {pStars.map((p, i) => !p.visible ? null : (
                <circle key={i} cx={p.x} cy={p.y}
                  r={i === 0 ? 0.72 : 0.42}
                  fill={colorMain}
                  style={{ opacity: p.opacity }}
                >
                  <animate attributeName="opacity" values={`${p.opacity * 0.6};${p.opacity};${p.opacity * 0.6}`}
                    dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
                </circle>
              ))}

              {pCenter.visible && (
                <text
                  x={pCenter.x + 1.2} y={pCenter.y - 1.2}
                  fill={colorMain} fontSize="2.2"
                  fontFamily="'Cormorant Garamond', Georgia, serif"
                  style={{ opacity: pCenter.opacity }}
                >
                  {c.name}
                </text>
              )}
            </g>
          );
        })}

        {layer === 'planets' && projectedPlanets.map(({ p, pos }) => {
          if (!pos.visible) return null;
          return (
            <g key={p.name} style={{ opacity: pos.opacity }}>
              <circle cx={pos.x} cy={pos.y} r={p.size * 3.5} fill={p.color} opacity="0.08" />
              <circle cx={pos.x} cy={pos.y} r={p.size * 2}   fill={p.color} opacity="0.15" />
              <circle cx={pos.x} cy={pos.y} r={p.size} fill={p.color}>
                <animate attributeName="opacity"
                  values={`${pos.opacity * 0.7};${pos.opacity};${pos.opacity * 0.7}`}
                  dur="3s" repeatCount="indefinite" />
              </circle>
              <text x={pos.x + p.size + 0.8} y={pos.y - p.size + 0.5}
                fill={p.color} fontSize="2.1" fontFamily="sans-serif" style={{ opacity: pos.opacity }}>
                {p.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'repeating-linear-gradient(0deg, transparent 0 3px, rgba(255,255,255,0.008) 3px 4px)' }} />

      <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 w-16 h-16 pointer-events-none">
        <svg viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="22" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" fill="none" />
          <circle cx="32" cy="32" r="2"  fill="rgba(255,255,255,0.35)" />
          <line x1="32" y1="6"  x2="32" y2="14" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          <line x1="32" y1="50" x2="32" y2="58" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          <line x1="6"  y1="32" x2="14" y2="32" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
          <line x1="50" y1="32" x2="58" y2="32" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
        </svg>
      </div>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-shrink-0 px-2.5 py-1.5 rounded-xl min-w-[60px]"
      style={{ background: 'rgba(18,18,28,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="text-[8px] uppercase tracking-[1px] text-white/45">{label}</p>
      <p className="font-mono text-xs text-white font-medium mt-0.5">{value}</p>
    </div>
  );
}

// ── Constellation sheet ───────────────────────────────────────────────────────
function ConstellationSheet({
  c, mode, onClose, onAsk,
}: {
  c: Constellation; mode: 'science' | 'mystic';
  onClose: () => void; onAsk: (q: string) => void;
}) {
  const [text, setText] = useState('');
  const colorAccent = mode === 'mystic' ? '#fde68a' : '#bfdbfe';

  const scienceText = `${c.name} spans roughly ${c.spanAz}° × ${c.spanAlt}° of sky, centred at azimuth ${c.az}°, altitude ${c.alt}°. Brightest star: magnitude ${c.mag}.`;
  const mysticText  = `${c.name} — ${c.myth}. It currently arcs ${c.alt}° above your horizon, carrying the energy of ${c.myth.split('·')[0].trim()}.`;

  const chips = mode === 'mystic'
    ? [`What myth lives in ${c.name}?`, `What does ${c.name} mean for me tonight?`, `Tell me a story about ${c.myth}`]
    : [`Brightest stars in ${c.name}`, `How far is the main star in ${c.name}?`, `Best time to see ${c.name}`];

  const handleSend = () => { const q = text.trim(); if (q) onAsk(q); };

  return (
    <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className="absolute left-0 right-0 bottom-0 z-40">
      <div className="rounded-t-[22px]"
        style={{
          background: 'rgba(10,10,15,0.94)', backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
          boxShadow: '0 -10px 60px rgba(107,33,168,0.30)',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        }}>
        <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mt-2 mb-1.5" />

        <div className="flex items-start justify-between px-4 py-2">
          <div>
            <p className="text-[9.5px] uppercase tracking-[1.6px] font-semibold mb-1" style={{ color: colorAccent }}>
              {mode === 'mystic' ? 'Mystic' : 'Science'} · visible now
            </p>
            <h3 className="font-serif text-[22px] text-white font-semibold">{c.name}</h3>
            <p className="text-xs text-white/50">{c.myth}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-white mt-1"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <X size={14} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          <Stat label="Altitude"  value={`${c.alt}°`} />
          <Stat label="Azimuth"   value={`${c.az}°`}  />
          <Stat label="Brightest" value={`mag ${c.mag}`} />
          <Stat label="Span"      value={`${c.spanAz}°`} />
        </div>

        <div className="px-4 pb-3">
          <div className="p-3 rounded-2xl"
            style={{ background: 'rgba(76,29,149,0.20)', border: '1px solid rgba(107,33,168,0.30)', boxShadow: '0 0 20px rgba(107,33,168,0.18)' }}>
            <span className="text-[9px] font-bold text-purple-400/85 uppercase tracking-[1.4px] block mb-1">✦ AstroOracle</span>
            <p className="text-[12.5px] text-white/90 leading-relaxed">
              {mode === 'mystic' ? mysticText : scienceText}
            </p>
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {chips.map(q => (
            <button key={q} onClick={() => onAsk(q)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs text-white/85 active:scale-95 transition-transform"
              style={{ background: 'rgba(18,18,28,0.6)', border: '1px solid rgba(255,255,255,0.10)' }}>
              {q}
            </button>
          ))}
        </div>

        <div className="relative px-4">
          <input value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder={`Ask about ${c.name}…`}
            className="w-full py-3 pl-4 pr-20 rounded-full text-[12.5px] text-white outline-none"
            style={{ background: 'rgba(18,18,28,0.6)', border: '1px solid rgba(255,255,255,0.20)' }} />
          <div className="absolute right-7 top-1/2 -translate-y-1/2 flex gap-1.5">
            <button className="w-8 h-8 rounded-full flex items-center justify-center text-white/55"
              style={{ border: '1px solid rgba(255,255,255,0.15)' }}>
              <Mic size={12} />
            </button>
            <button onClick={handleSend}
              className="w-8 h-8 rounded-full flex items-center justify-center text-white"
              style={{
                background: text.trim() ? (mode === 'mystic' ? 'rgba(120,53,15,0.85)' : 'rgba(30,64,175,0.85)') : 'rgba(30,30,40,0.5)',
                border: '1px solid rgba(255,255,255,0.2)',
                opacity: text.trim() ? 1 : 0.45,
              }}>
              <Send size={12} />
            </button>
          </div>
        </div>

        <div className="flex justify-between px-4 pt-3">
          <button
            onClick={() => onAsk(mode === 'mystic'
              ? `Tell me everything about ${c.name} — ${c.myth}`
              : `Give me a full scientific overview of the ${c.name} constellation`)}
            className="flex items-center gap-1.5 text-xs text-purple-400/85 active:opacity-70">
            Continue in full chat <ArrowRight size={11} />
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
  const [granted, setGranted]             = useState(false);
  const [camAz,   setCamAz]               = useState(140);
  const [camAlt,  setCamAlt]              = useState(42);
  const [selected, setSelected]           = useState<Constellation | null>(null);
  const [layer,    setLayer]              = useState<Layer>('lines');
  const [locationLabel, setLocationLabel] = useState('Your location');
  const [observerLat,   setObserverLat]   = useState(40.0);
  const [observerLng,   setObserverLng]   = useState(-75.0);

  const liveOrientation = useRef(false);

  // Smoothed orientation stored in refs — never triggers re-renders directly.
  // The RAF loop below reads these and pushes to state at ≤60fps.
  const smoothedAz  = useRef(140);
  const smoothedAlt = useRef(42);
  const rafRef      = useRef<number | null>(null);
  const COMP_ALPHA  = 0.85; // 85% old + 15% new per sensor event → smooth with ~1-2 frame lag
  const sensorInitialized = useRef(false); // snap on first reading instead of filtering from default

  const handleAsk = useCallback((q: string) => toChatWith(q, navigate), [navigate]);

  // ── Device orientation — writes to refs only, never calls setState ───────────
  useEffect(() => {
    if (!granted) return;

    const onOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null) return;

      // iOS:     webkitCompassHeading is a calibrated magnetic compass bearing (always correct)
      // Android: alpha is only meaningful when e.absolute === true (deviceorientationabsolute event)
      //          Non-absolute alpha resets to 0° on each page load — useless for compass direction
      const wkh = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
      const rawAz: number | null =
        typeof wkh === 'number' ? wkh :
        (e.absolute === true && e.alpha !== null) ? (360 - e.alpha) % 360 :
        null;

      const rawAlt = Math.max(-90, Math.min(90, e.beta - 90));

      if (!sensorInitialized.current) {
        // Cold start: snap directly to first real reading so there's no filter lag on mount/remount
        if (rawAz !== null) smoothedAz.current = rawAz;
        smoothedAlt.current = rawAlt;
        sensorInitialized.current = true;
        liveOrientation.current = true;
        return;
      }

      liveOrientation.current = true;

      if (rawAz !== null) {
        let azDiff = rawAz - smoothedAz.current;
        if (azDiff >  180) azDiff -= 360;
        if (azDiff < -180) azDiff += 360;
        smoothedAz.current = ((smoothedAz.current + azDiff * (1 - COMP_ALPHA)) + 360) % 360;
      }
      smoothedAlt.current = smoothedAlt.current * COMP_ALPHA + rawAlt * (1 - COMP_ALPHA);
    };

    const setup = () => {
      const doe = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof doe.requestPermission === 'function') {
        doe.requestPermission()
          .then(r => {
            if (r === 'granted') {
              window.addEventListener('deviceorientation',         onOrientation, true);
              window.addEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
            }
          })
          .catch(() => {});
      } else {
        window.addEventListener('deviceorientation',         onOrientation, true);
        window.addEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
      }
    };

    setup();

    // Fallback: animate refs (not state) until real sensor data arrives
    let t = 0;
    const fallback = setInterval(() => {
      if (liveOrientation.current) return;
      t += 0.012;
      smoothedAz.current  = (smoothedAz.current + 0.35) % 360;
      smoothedAlt.current = 30 + Math.sin(t) * 22;
    }, 60);

    return () => {
      clearInterval(fallback);
      window.removeEventListener('deviceorientation',         onOrientation, true);
      window.removeEventListener('deviceorientationabsolute', onOrientation as EventListener, true);
    };
  }, [granted]);

  // ── RAF render loop — reads smoothed refs, updates React state at ≤60fps ─────
  useEffect(() => {
    if (!granted) return;
    const tick = () => {
      setCamAz(smoothedAz.current);
      setCamAlt(smoothedAlt.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [granted]);

  // ── Geolocation ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!granted || !('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        setObserverLat(pos.coords.latitude);
        setObserverLng(pos.coords.longitude);
        const lat = Math.abs(pos.coords.latitude).toFixed(1);
        const lng = Math.abs(pos.coords.longitude).toFixed(1);
        setLocationLabel(`${lat}°${pos.coords.latitude >= 0 ? 'N' : 'S'} ${lng}°${pos.coords.longitude >= 0 ? 'E' : 'W'}`);
      },
      () => {},
      { timeout: 8000, maximumAge: 300000 },
    );
  }, [granted]);

  if (!granted) {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f]">
        <PermissionFlow onDone={() => setGranted(true)} onCancel={() => navigate('/')} />
      </div>
    );
  }

  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const compassLabel = compass[Math.round(camAz / 45) % 8];
  const altLabel = camAlt > 75 ? 'Zenith' : camAlt < -75 ? 'Nadir' : `${camAlt > 0 ? '+' : ''}${Math.round(camAlt)}°`;

  return (
    <div className="fixed inset-0 overflow-hidden">
      <CameraSky camAz={camAz} camAlt={camAlt} observerLat={observerLat} observerLng={observerLng} mode={mode} layer={layer} onTap={setSelected} />

      <div className="absolute left-3 right-3 flex justify-between items-center z-10"
        style={{ top: 'max(12px, env(safe-area-inset-top))' }}>
        <button onClick={() => navigate('/')}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
          style={{ background: 'rgba(18,18,28,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <ChevronLeft size={14} />
        </button>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(18,18,28,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <Camera size={11} className="text-purple-400" />
          <span className="text-xs text-white font-semibold">Sky Gazer</span>
          {liveOrientation.current && (
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" title="Live orientation" />
          )}
        </div>

        <div className="px-2.5 py-1.5 rounded-full text-[10px] font-medium"
          style={{
            background: 'rgba(18,18,28,0.5)', backdropFilter: 'blur(10px)',
            border: `1px solid ${mode === 'mystic' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`,
            color: mode === 'mystic' ? '#fde68a' : '#bfdbfe',
          }}>
          {mode === 'mystic' ? '✨ Mystic' : '🔭 Science'}
        </div>
      </div>

      <div className="absolute left-3 right-3 z-5 flex justify-between gap-2" style={{ top: 70 }}>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: 'rgba(18,18,28,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <Compass size={11} className="text-purple-400" />
          <span className="font-mono text-[10px] text-white/85">{compassLabel} {Math.round(camAz)}°</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: 'rgba(18,18,28,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <span className="text-[10px] text-purple-400">↕</span>
          <span className="font-mono text-[10px] text-white/85">{altLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
          style={{ background: 'rgba(18,18,28,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <MapPin size={11} className="text-purple-400" />
          <span className="font-mono text-[10px] text-white/85">{locationLabel}</span>
        </div>
      </div>

      {!selected && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute left-0 right-0 flex justify-center z-5 pointer-events-none"
          style={{ bottom: 110 }}>
          <div className="px-3.5 py-2 rounded-full"
            style={{ background: 'rgba(18,18,28,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}>
            <span className="text-xs text-white/85">
              {layer === 'planets' ? '✦ Point anywhere to find planets' : '✦ Tap a constellation · tilt to explore the sphere'}
            </span>
          </div>
        </motion.div>
      )}

      <div className="absolute left-3 right-3 flex items-center justify-between z-10"
        style={{ bottom: 'max(24px, calc(env(safe-area-inset-bottom) + 16px))' }}>
        <div className="flex rounded-full p-1 gap-0.5"
          style={{ background: 'rgba(18,18,28,0.55)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}>
          {(['lines', 'names', 'planets'] as const).map(l => (
            <button key={l} onClick={() => setLayer(l)}
              className="px-3 py-1.5 rounded-full text-[10.5px] font-medium transition-all capitalize"
              style={{
                background: layer === l ? 'rgba(168,85,247,0.5)' : 'transparent',
                color: layer === l ? '#fff' : 'rgba(255,255,255,0.6)',
              }}>
              {l}
            </button>
          ))}
        </div>
        <button className="w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{ background: 'rgba(18,18,28,0.5)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}>
          <Map size={14} />
        </button>
      </div>

      <AnimatePresence>
        {selected && (
          <ConstellationSheet key={selected.id} c={selected} mode={mode}
            onClose={() => setSelected(null)}
            onAsk={q => { setSelected(null); handleAsk(q); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
