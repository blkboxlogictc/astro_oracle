import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import {
  X, Telescope, Play, Pause, Volume2, VolumeX,
  Compass, Crown, Lock, Check, Sparkles,
} from 'lucide-react';
import { useAppMode } from '@/context/AppContext';
import { usePremium } from '@/hooks/usePremium';

// ── Explore objects ───────────────────────────────────────────────────────────
interface ExploreObj {
  id: string;
  name: string;
  cat: string;
  desc: string;
  color: [string, string];
  free?: boolean;
}

const OBJECTS: ExploreObj[] = [
  { id: 'saturn',       name: 'Saturn',        cat: 'Planet',         desc: 'The ringed jewel — winds at 1,800 km/h, 146 moons.',   color: ['#fde68a', '#7c2d12'], free: true },
  { id: 'orion-nebula', name: 'Orion Nebula',  cat: 'Nebula',         desc: 'A stellar nursery 1,344 light-years away.',              color: ['#f472b6', '#4c1d95'] },
  { id: 'sgr-a',        name: 'Sgr A*',        cat: 'Black Hole',     desc: 'The supermassive centre of our galaxy.',                 color: ['#fbbf24', '#0c0a18'] },
  { id: 'andromeda',    name: 'Andromeda',     cat: 'Galaxy',         desc: 'Our nearest spiral neighbour.',                          color: ['#a78bfa', '#1e3a8a'] },
  { id: 'betelgeuse',   name: 'Betelgeuse',    cat: 'Red Supergiant', desc: 'A star nearing the end of its magnificent life.',        color: ['#f87171', '#7f1d1d'] },
  { id: 'jupiter',      name: 'Jupiter',       cat: 'Planet',         desc: 'The king of planets — a banded gas giant.',              color: ['#fde68a', '#92400e'] },
];

// ── Thumb gradient ────────────────────────────────────────────────────────────
function ObjectThumb({ obj }: { obj: ExploreObj }) {
  return (
    <div
      className="w-full rounded-xl relative overflow-hidden"
      style={{ aspectRatio: '2.4 / 1', background: `radial-gradient(circle at 35% 40%, ${obj.color[0]}, ${obj.color[1]} 80%)` }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(circle at 70% 60%, rgba(255,255,255,0.15), transparent 50%)' }}
      />
    </div>
  );
}

// ── Three.js Saturn ───────────────────────────────────────────────────────────
function SaturnScene({ paused }: { paused: boolean }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ raf: 0, paused });

  useEffect(() => { stateRef.current.paused = paused; }, [paused]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(45, w / h, 0.1, 2000);
    cam.position.set(0, 5, 22);
    cam.lookAt(0, 0, 0);

    const ren = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    ren.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    ren.setSize(w, h);
    mount.appendChild(ren.domElement);

    // Stars
    const starGeo = new THREE.BufferGeometry();
    const N = 1500;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const r = 600 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xfafaff, size: 1.3, sizeAttenuation: true, transparent: true, opacity: 0.9 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Nebula bg sphere
    const nebMat = new THREE.MeshBasicMaterial({ color: 0x4c1d95, side: THREE.BackSide, transparent: true, opacity: 0.18, depthWrite: false });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(500, 32, 32), nebMat));

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));
    const sun = new THREE.DirectionalLight(0xfff1c8, 1.4);
    sun.position.set(-30, 10, 20);
    scene.add(sun);

    // Saturn body texture (canvas-painted bands)
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 512;
    const ctx = cv.getContext('2d')!;
    const stripes = ['#8a5a2b','#a87338','#c89656','#e2b46d','#fbe4a5','#d4a464','#ad7c45','#efce9b','#c89656','#a87338','#7c4a25'];
    const segH = 512 / stripes.length;
    stripes.forEach((col, i) => {
      const grd = ctx.createLinearGradient(0, i * segH, 0, (i + 1) * segH);
      grd.addColorStop(0, col);
      grd.addColorStop(1, stripes[(i + 1) % stripes.length]);
      ctx.fillStyle = grd;
      ctx.fillRect(0, i * segH, 1024, segH + 1);
    });
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = `rgba(${Math.random() < 0.5 ? '40,20,5' : '255,235,200'},${0.04 + Math.random() * 0.05})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 1024, Math.random() * 512, 8 + Math.random() * 20, 1.2 + Math.random() * 1.5, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;

    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(4, 64, 64),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
    );
    planet.rotation.z = 0.42;
    scene.add(planet);

    // Ring texture
    const rCv = document.createElement('canvas'); rCv.width = 1024; rCv.height = 64;
    const rCtx = rCv.getContext('2d')!;
    for (let i = 0; i < 1024; i++) {
      const t = i / 1024;
      const noise = Math.sin(t * 80) * 0.5 + Math.sin(t * 320) * 0.3 + Math.cos(t * 41) * 0.2;
      let alpha = 0;
      if (t > 0.0 && t < 0.20) alpha = 0.15 + noise * 0.1;
      if (t > 0.22 && t < 0.55) alpha = 0.55 + noise * 0.25;
      if (t > 0.58 && t < 0.65) alpha = 0.05;
      if (t > 0.65 && t < 0.95) alpha = 0.7 + noise * 0.18;
      rCtx.fillStyle = `rgba(230,210,170,${Math.max(0, Math.min(1, alpha))})`;
      rCtx.fillRect(i, 0, 1, 64);
    }
    const ringTex = new THREE.CanvasTexture(rCv);
    const ringGeo = new THREE.RingGeometry(5.4, 9.5, 128, 8);
    const rPos = ringGeo.attributes.position;
    const rUv = ringGeo.attributes.uv;
    for (let i = 0; i < rPos.count; i++) {
      const rx = rPos.getX(i), ry = rPos.getY(i);
      const rr = Math.sqrt(rx * rx + ry * ry);
      rUv.setXY(i, (rr - 5.4) / (9.5 - 5.4), 1);
    }
    const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, side: THREE.DoubleSide, transparent: true, opacity: 0.9, alphaTest: 0.01 });
    const rings = new THREE.Mesh(ringGeo, ringMat);
    rings.rotation.x = Math.PI / 2;
    const tilt = new THREE.Group();
    tilt.add(rings);
    tilt.rotation.z = 0.42;
    scene.add(tilt);

    // Drag orbit
    let drag = false, lx = 0, ly = 0, th = 0, ph = 0.18;
    const onDown = (e: PointerEvent) => { drag = true; lx = e.clientX; ly = e.clientY; };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      th += (e.clientX - lx) * 0.005;
      ph = Math.max(-1, Math.min(1, ph + (e.clientY - ly) * 0.005));
      lx = e.clientX; ly = e.clientY;
    };
    const onUp = () => { drag = false; };
    ren.domElement.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const t0 = performance.now();
    const tick = () => {
      const elapsed = performance.now();
      const introT = Math.min(1, (elapsed - t0) / 2500);
      const ease = 1 - Math.pow(1 - introT, 3);
      const dist = 80 - 60 * ease;

      if (!drag && !stateRef.current.paused) th += 0.0015;

      cam.position.set(
        dist * Math.cos(ph) * Math.sin(th),
        dist * Math.sin(ph) + 1.5,
        dist * Math.cos(ph) * Math.cos(th)
      );
      cam.lookAt(0, 0, 0);

      if (!stateRef.current.paused) planet.rotation.y += 0.0008;
      stars.rotation.y += 0.00006;

      ren.render(scene, cam);
      stateRef.current.raf = requestAnimationFrame(tick);
    };
    tick();

    const ro = new ResizeObserver(() => {
      const ww = mount.clientWidth, hh = mount.clientHeight;
      cam.aspect = ww / hh; cam.updateProjectionMatrix();
      ren.setSize(ww, hh);
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(stateRef.current.raf);
      ro.disconnect();
      ren.domElement.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      ren.dispose();
      if (mount.contains(ren.domElement)) mount.removeChild(ren.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" style={{ cursor: 'grab' }} />;
}

// ── Premium gate ──────────────────────────────────────────────────────────────
function PremiumGate({ obj, onBack }: { obj: ExploreObj; onBack: () => void }) {
  const [phase, setPhase] = useState<'teaser' | 'wall'>('teaser');

  useEffect(() => {
    if (phase !== 'teaser') return;
    const id = setTimeout(() => setPhase('wall'), 4500);
    return () => clearTimeout(id);
  }, [phase]);

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <SaturnScene paused={phase === 'wall'} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }}
      />

      {phase === 'teaser' && (
        <>
          <button
            onClick={onBack}
            className="absolute top-4 left-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: 'rgba(18,18,28,0.45)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <X size={14} />
          </button>
          <div className="absolute left-0 right-0 bottom-6 text-center z-5 px-6 pointer-events-none">
            <p className="text-[9.5px] uppercase tracking-[1.8px] text-amber-400/85 mb-1">A glimpse of {obj.name}</p>
            <p className="font-serif italic text-sm text-white/85 leading-relaxed">
              "If you stood in the rings, you'd find ice and rock just inches apart, dancing in perfect orbit."
            </p>
          </div>
        </>
      )}

      <AnimatePresence>
        {phase === 'wall' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-end justify-center p-5"
            style={{ background: 'linear-gradient(0deg, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.7) 50%, transparent 80%)' }}
          >
            <div
              className="w-full rounded-[22px] p-5"
              style={{
                background: 'rgba(10,10,15,0.85)',
                border: '1px solid rgba(251,191,36,0.35)',
                boxShadow: '0 0 60px rgba(251,191,36,0.2)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9.5px] uppercase tracking-[1.8px] text-amber-400 font-semibold flex items-center gap-1.5">
                  <Crown size={11} /> Premium
                </p>
                <button onClick={onBack} className="text-white/50"><X size={14} /></button>
              </div>
              <h2 className="font-serif text-[22px] text-white font-semibold mb-1.5">Continue the journey</h2>
              <p className="text-xs text-white/70 mb-4 leading-relaxed">
                Fly through {obj.name}'s rings, ask the Oracle anything, and unlock every object in the cosmos.
              </p>
              <ul className="mb-4 space-y-1.5">
                {[
                  'Full 3D exploration of every object',
                  'AI narrator with knowledge-base depth',
                  'Personalised to your chart',
                  'Save journeys to your history',
                ].map(f => (
                  <li key={f} className="flex items-center gap-2 text-[11.5px] text-white/85">
                    <Check size={11} className="text-amber-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <button
                className="w-full py-3 rounded-full text-sm font-bold text-[#0a0a0f] mb-2"
                style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', boxShadow: '0 0 24px rgba(245,158,11,0.4)' }}
              >
                Upgrade · $4.99/mo
              </button>
              <button className="w-full py-2 text-xs text-white/50">Try one journey free</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Object view ───────────────────────────────────────────────────────────────
function ExploreObject({ obj, onExit }: { obj: ExploreObj; onExit: () => void }) {
  const { mode } = useAppMode();
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);

  const lines = mode === 'science'
    ? [
        `We're approaching ${obj.name} at about a thousand kilometres per second.`,
        `Notice the gap between the rings — that's the Cassini Division, swept clear by the moon Mimas.`,
        `These rings are mostly water ice. The largest particles are the size of houses.`,
      ]
    : [
        `${obj.name} keeps time. The Romans named it for the god of the harvest — the keeper of cycles.`,
        `In your chart, this is the planet of structure and patience. Tonight it teaches by example.`,
        `Even the rings know their place — each particle dancing in a specific orbit. There is order here.`,
      ];

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setLineIdx(i => (i + 1) % lines.length), 6500);
    return () => clearInterval(id);
  }, [paused, lines.length]);

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <SaturnScene paused={paused} />
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.6) 100%)' }}
      />

      {/* Top bar */}
      <div
        className="absolute left-3 right-3 flex justify-between items-center z-10"
        style={{ top: 'max(12px, env(safe-area-inset-top))' }}
      >
        <button
          onClick={onExit}
          className="w-8 h-8 rounded-full flex items-center justify-center text-white"
          style={{ background: 'rgba(18,18,28,0.45)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <X size={14} />
        </button>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: 'rgba(18,18,28,0.45)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          <Telescope size={11} className={mode === 'mystic' ? 'text-amber-400' : 'text-purple-400'} />
          <span className="text-xs text-white font-semibold">Exploring · {obj.name}</span>
        </div>
        <div className="w-8 h-8" /> {/* Spacer */}
      </div>

      {/* Right-side controls */}
      <div className="absolute right-3 top-1/3 z-10 flex flex-col gap-2">
        {[
          { icon: muted ? <VolumeX size={13} /> : <Volume2 size={13} />, onClick: () => setMuted(!muted) },
          { icon: paused ? <Play size={13} /> : <Pause size={13} />, onClick: () => setPaused(!paused) },
          { icon: <Compass size={13} />, onClick: () => {} },
        ].map((btn, i) => (
          <button
            key={i}
            onClick={btn.onClick}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white"
            style={{ background: 'rgba(18,18,28,0.45)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            {btn.icon}
          </button>
        ))}
      </div>

      {/* Subtitle narration */}
      <div
        className="absolute left-0 right-0 text-center px-7 pointer-events-none z-5 transition-all duration-300"
        style={{ bottom: chatOpen ? 220 : 90 }}
      >
        <motion.div key={lineIdx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
          <p className="text-[9.5px] uppercase tracking-[1.8px] text-purple-400/85 font-semibold mb-1">✦ Oracle · Now speaking</p>
          <p className="font-serif italic text-base text-white leading-relaxed" style={{ textShadow: '0 0 16px rgba(0,0,0,0.9)' }}>
            "{lines[lineIdx]}"
          </p>
        </motion.div>
      </div>

      {/* Bottom chat bar */}
      <div
        className="absolute left-3 right-3 z-10 transition-all duration-300"
        style={{ bottom: 16 }}
      >
        <AnimatePresence mode="wait">
          {chatOpen ? (
            <motion.div
              key="open"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="rounded-[22px] p-2.5 flex flex-col gap-2"
              style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <div
                className="p-3 rounded-xl text-[11.5px] text-white/85 leading-relaxed"
                style={{ background: 'rgba(76,29,149,0.20)', border: '1px solid rgba(107,33,168,0.30)' }}
              >
                {mode === 'science'
                  ? "Saturn's rings are surprisingly young — perhaps only 100 million years old."
                  : "Saturn's rings remind us that even what looks chaotic is held in deep order. Cycles upon cycles."}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  placeholder={`Ask about ${obj.name}…`}
                  className="flex-1 py-2.5 px-3.5 rounded-full text-xs text-white outline-none"
                  style={{ background: 'rgba(18,18,28,0.6)', border: '1px solid rgba(255,255,255,0.20)' }}
                />
                <button onClick={() => setChatOpen(false)} className="text-white/50"><X size={14} /></button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="closed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChatOpen(true)}
              className="w-full py-3 px-4 rounded-full text-left flex items-center justify-between text-[12.5px] text-white/70"
              style={{
                background: 'rgba(18,18,28,0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <span>Ask the Oracle about {obj.name}…</span>
              <Sparkles size={13} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Landing ───────────────────────────────────────────────────────────────────
function ExploreLanding({ onSelect, isPremium }: { onSelect: (o: ExploreObj) => void; isPremium: boolean }) {
  const [, navigate] = useLocation();
  const { mode } = useAppMode();

  return (
    <div className="relative h-full overflow-y-auto pb-28" style={{ paddingTop: 52 }}>
      {/* Hero */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-[9.5px] uppercase tracking-[1.8px] text-purple-400 font-semibold">
          {isPremium ? 'Explore Mode' : 'Premium · Explore Mode'}
        </p>
        <h1 className="font-serif text-[30px] font-bold text-white mt-1 mb-1.5 tracking-tight">
          Step inside the cosmos
        </h1>
        <p className="text-sm text-white/65 leading-relaxed">
          Pick any object — a planet, a nebula, a black hole — and the Oracle becomes your personal guide through it.
        </p>
      </div>

      {/* Saturn featured */}
      <div className="px-3 pb-4">
        <button
          onClick={() => onSelect(OBJECTS[0])}
          className="w-full rounded-[18px] overflow-hidden relative text-left border border-white/12"
          style={{
            height: 160,
            background: 'linear-gradient(135deg, rgba(245,158,11,0.20), rgba(76,29,149,0.45))',
            boxShadow: '0 0 40px rgba(245,158,11,0.18)',
          }}
        >
          {/* Saturn SVG teaser */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(circle at 80% 50%, rgba(245,158,11,0.45), transparent 55%)' }}
          />
          <svg viewBox="0 0 200 100" className="absolute right-0 top-0 h-full opacity-85">
            <defs>
              <radialGradient id="sg" cx="35%" cy="40%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="60%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#7c2d12" />
              </radialGradient>
            </defs>
            <ellipse cx="130" cy="55" rx="58" ry="10" stroke="rgba(253,230,138,0.5)" strokeWidth="1.5" fill="none" />
            <ellipse cx="130" cy="55" rx="48" ry="7" stroke="rgba(253,230,138,0.7)" strokeWidth="1" fill="none" />
            <circle cx="130" cy="50" r="28" fill="url(#sg)" />
          </svg>
          <div className="absolute left-4 bottom-4 right-4">
            <p className="text-[9px] uppercase tracking-[1.6px] text-amber-400 mb-1">Featured · 3D ready</p>
            <h3 className="font-serif text-[22px] text-white font-semibold mb-1">Saturn</h3>
            <p className="text-xs text-white/75">The ringed jewel — fly through the rings</p>
          </div>
          <span
            className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs text-white"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          >
            <Play size={9} /> Begin journey
          </span>
        </button>
      </div>

      {/* Grid */}
      <div className="px-4 mb-3">
        <p className="text-[10px] uppercase tracking-[1.4px] text-white/45 font-semibold">All destinations</p>
      </div>
      <div className="grid grid-cols-2 gap-2 px-3 pb-5">
        {OBJECTS.slice(1).map(o => (
          <button
            key={o.id}
            onClick={() => onSelect(o)}
            className="p-3 rounded-2xl text-left relative"
            style={{
              background: 'rgba(18,18,28,0.55)',
              border: '1px solid rgba(255,255,255,0.10)',
              minHeight: 110,
            }}
          >
            <ObjectThumb obj={o} />
            <p className="text-[9px] uppercase tracking-[1px] text-purple-400 mt-2">{o.cat}</p>
            <p className="font-serif text-[15px] text-white font-semibold mt-0.5">{o.name}</p>
            <p className="text-[10.5px] text-white/55 mt-0.5 leading-snug">{o.desc}</p>
            {!isPremium && !o.free && (
              <span
                className="absolute top-2.5 right-2.5 p-1 rounded-full text-amber-400"
                style={{ background: 'rgba(0,0,0,0.6)' }}
              >
                <Lock size={10} />
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Upsell */}
      {!isPremium && (
        <div className="px-3 pb-4">
          <div
            className="flex items-center gap-3 p-3.5 rounded-2xl"
            style={{ background: 'rgba(18,18,28,0.55)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <Crown size={18} className="text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-white font-semibold">Saturn is free for everyone</p>
              <p className="text-[10px] text-white/55">Unlock the rest with Premium</p>
            </div>
            <button
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#0a0a0f] shrink-0"
              style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
            >
              Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Public screen ─────────────────────────────────────────────────────────────
export default function Explore() {
  const { mode } = useAppMode();
  const { isPremium } = usePremium();
  const [selectedObj, setSelectedObj] = useState<ExploreObj | null>(null);

  const handleSelect = (o: ExploreObj) => setSelectedObj(o);

  if (selectedObj) {
    const needsGate = !isPremium && !selectedObj.free;
    return (
      <div className="fixed inset-0">
        {needsGate
          ? <PremiumGate obj={selectedObj} onBack={() => setSelectedObj(null)} />
          : <ExploreObject obj={selectedObj} onExit={() => setSelectedObj(null)} />
        }
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden font-sans text-white">
      {/* Background */}
      <div className="absolute inset-0" style={{ background: '#0a0a0f' }} />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: mode === 'mystic'
            ? 'radial-gradient(ellipse at top, rgba(120,53,15,0.18), transparent 55%)'
            : 'radial-gradient(ellipse at top, rgba(88,28,135,0.22), transparent 55%)',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-background/60 to-background" />

      <div className="relative z-10 h-[100dvh]">
        <ExploreLanding onSelect={handleSelect} isPremium={isPremium} />
      </div>
    </div>
  );
}
