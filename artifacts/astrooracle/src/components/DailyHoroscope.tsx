import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/lib/api';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Star } from 'lucide-react';
import { Starfield } from '@/components/Starfield';

interface HoroscopeContent { overview: string; love: string; career: string; wellness: string; cosmicAdvice: string; }
interface HoroscopeRecord { date: string; sun_sign: string; content: HoroscopeContent; is_personalized: boolean; }

const SECTIONS = [
  { key: 'overview', label: '✦ Overview', color: 'text-purple-300' },
  { key: 'love', label: '♡ Love', color: 'text-pink-300' },
  { key: 'career', label: '◈ Career', color: 'text-amber-300' },
  { key: 'wellness', label: '◎ Wellness', color: 'text-green-300' },
];

export default function DailyHoroscope() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [horoscope, setHoroscope] = useState<HoroscopeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    apiCall<HoroscopeRecord>('/horoscope/today')
      .then(setHoroscope)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="relative min-h-[100dvh] w-full text-white overflow-hidden font-sans">
      <Starfield mode="mystic" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgb(120_53_15_/_0.18),_transparent_55%)]" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-transparent via-background/60 to-background" />
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Chat
        </button>
        {loading && (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}</div>
        )}
        {error && <p className="text-center py-12 text-white/50">{error}</p>}
        {horoscope && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="text-center mb-8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
                {horoscope.sun_sign}
              </h1>
              {horoscope.is_personalized && (
                <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-600/30 text-amber-300/80">
                  <Star size={8} /> Personalized
                </span>
              )}
            </div>
            {SECTIONS.map(({ key, label, color }, idx) => (
              <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }}
                className="rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 p-5">
                <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color}`}>{label}</p>
                <p className="text-white/80 text-sm leading-relaxed">{horoscope.content[key as keyof HoroscopeContent]}</p>
              </motion.div>
            ))}
            {horoscope.content.cosmicAdvice && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="rounded-2xl bg-purple-950/30 backdrop-blur-xl border border-purple-700/30 p-5 text-center shadow-[0_0_30px_rgba(107,33,168,0.15)]">
                <p className="text-xs text-purple-400/70 uppercase tracking-widest mb-2">✦ Cosmic Advice</p>
                <p className="text-white/90 font-serif italic text-base leading-relaxed">"{horoscope.content.cosmicAdvice}"</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
