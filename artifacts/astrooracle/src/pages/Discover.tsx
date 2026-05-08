import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Camera, Telescope, Calendar, Moon, Star, Sparkles, Lock, Crown, Globe } from 'lucide-react';
import { useAppMode } from '@/context/AppContext';
import { useAuth } from '@/hooks/useAuth';
import { Starfield } from '@/components/Starfield';

const EXPLORE_OBJECTS = [
  { id: 'saturn',      name: 'Saturn',      cat: 'Planet',           color: ['#fde68a', '#7c2d12'] },
  { id: 'orion-nebula', name: 'Orion Nebula', cat: 'Nebula',          color: ['#f472b6', '#4c1d95'] },
  { id: 'sgr-a',       name: 'Sgr A*',      cat: 'Black Hole',       color: ['#fbbf24', '#0c0a18'] },
  { id: 'andromeda',   name: 'Andromeda',   cat: 'Galaxy',           color: ['#a78bfa', '#1e3a8a'] },
];

interface CardProps {
  title: string;
  caption: string;
  tint: string;
  icon: React.ReactNode;
  onClick?: () => void;
  locked?: boolean;
  tall?: boolean;
}

function Card({ title, caption, tint, icon, onClick, locked, tall }: CardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="text-left rounded-2xl p-3 relative flex flex-col justify-between overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${tint}, rgba(18,18,28,0.7))`,
        border: '1px solid rgba(255,255,255,0.08)',
        minHeight: tall ? 110 : 85,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div>{icon}</div>
      <div>
        <p className="font-serif text-sm text-white font-semibold mt-1.5">{title}</p>
        <p className="text-[10.5px] text-white/60 mt-0.5">{caption}</p>
      </div>
      {locked && (
        <span
          className="absolute top-2 right-2 p-1 rounded-full text-amber-400"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <Lock size={9} />
        </span>
      )}
    </motion.button>
  );
}

export default function Discover() {
  const [, navigate] = useLocation();
  const { mode } = useAppMode();
  const { user, profile } = useAuth();
  const isPremium = false; // wire to real subscription check when available

  const today = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric' }).format(new Date());

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden font-sans text-white">
      <Starfield mode={mode} />

      {/* Overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: mode === 'mystic'
            ? 'radial-gradient(ellipse at top, rgba(120,53,15,0.18), transparent 55%)'
            : 'radial-gradient(ellipse at top, rgba(88,28,135,0.22), transparent 55%)',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-background/60 to-background" />

      {/* Scrollable content (pt accounts for MinimalTopBar ~52px) */}
      <div className="relative z-10 overflow-y-auto h-[100dvh] pb-28" style={{ paddingTop: 52 }}>

        {/* Hero */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-[9.5px] uppercase tracking-[1.8px] text-purple-400 font-semibold mb-1">
            Today · {today}
          </p>
          <h1 className="font-serif text-3xl font-bold text-white mb-1">Your cosmos</h1>
          <p className="text-sm text-white/60">
            A snapshot of the sky, the day, and the journeys waiting.
          </p>
        </div>

        {/* 2-column card grid */}
        <div className="grid grid-cols-2 gap-2 px-3 pb-3">
          <Card
            title="Sky tonight"
            caption="Tap to explore"
            tint="rgba(30,64,175,0.40)"
            icon={<Moon size={18} className="text-blue-200" />}
            tall
            onClick={() => navigate('/sky')}
          />
          <Card
            title={mode === 'mystic' ? 'Daily Horoscope' : 'Cosmic Weather'}
            caption="Mercury squares Mars"
            tint="rgba(120,53,15,0.40)"
            icon={<Star size={18} className="text-amber-200" />}
            tall
            onClick={() => navigate('/horoscope')}
          />
          <Card
            title="Weekly Forecast"
            caption={isPremium ? 'Read →' : 'Premium'}
            tint="rgba(76,29,149,0.4)"
            icon={<Calendar size={16} className="text-purple-200" />}
            locked={!isPremium}
            onClick={() => navigate('/weekly')}
          />
          <Card
            title="AR Sky Gazer"
            caption="Step outside"
            tint="rgba(30,64,175,0.35)"
            icon={<Camera size={16} className="text-blue-200" />}
            onClick={() => navigate('/sky')}
          />
          <Card
            title="Synastry"
            caption={isPremium ? 'Match your chart' : 'Premium'}
            tint="rgba(190,18,60,0.28)"
            icon={<Sparkles size={16} className="text-pink-200" />}
            locked={!isPremium}
            onClick={() => navigate('/compatibility')}
          />
          <Card
            title="Explore Mode"
            caption="Walk the cosmos"
            tint="rgba(245,158,11,0.28)"
            icon={<Telescope size={16} className="text-amber-200" />}
            onClick={() => navigate('/explore')}
          />
        </div>

        {/* Events shortcut */}
        <div className="px-3 pb-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/events')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all"
            style={{
              background: 'rgba(18,18,28,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Globe size={16} className="text-purple-300 shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">Cosmic Events</p>
              <p className="text-[10.5px] text-white/50">Full moons, retrogrades, meteor showers</p>
            </div>
            <span className="ml-auto text-white/30 text-xs">›</span>
          </motion.button>
        </div>

        {/* Explore deck */}
        <div className="px-3">
          <p className="text-[10px] uppercase tracking-[1.4px] text-white/45 font-semibold mb-2.5 px-1">
            Begin a journey
          </p>
          <div className="flex gap-2.5 overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory' }}>
            {EXPLORE_OBJECTS.map(o => (
              <motion.button
                key={o.id}
                whileTap={{ scale: 0.96 }}
                onClick={() => navigate('/explore')}
                className="flex-shrink-0 w-32 rounded-2xl p-2.5 text-left"
                style={{
                  background: 'rgba(18,18,28,0.55)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  scrollSnapAlign: 'start',
                }}
              >
                <div
                  className="w-full rounded-xl mb-2"
                  style={{
                    aspectRatio: '1.2 / 1',
                    background: `radial-gradient(circle at 35% 40%, ${o.color[0]}, ${o.color[1]} 80%)`,
                  }}
                />
                <p className="text-[9px] text-purple-400 uppercase tracking-[1px] mb-0.5">{o.cat}</p>
                <p className="font-serif text-[13px] text-white font-semibold">{o.name}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Premium upsell if free */}
        {!isPremium && user && (
          <div className="px-3 pt-4">
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: 'rgba(18,18,28,0.5)',
                border: '1px solid rgba(251,191,36,0.2)',
              }}
            >
              <Crown size={16} className="text-amber-400 shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-white font-semibold">Unlock Premium Alerts</p>
                <p className="text-[10px] text-white/50">
                  Daily horoscope, weekly forecast, synastry
                </p>
              </div>
              <button
                className="text-[11px] font-semibold text-[#0a0a0f] px-3 py-1.5 rounded-full shrink-0"
                style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
              >
                Upgrade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
