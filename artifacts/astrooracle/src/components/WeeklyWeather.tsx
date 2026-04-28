import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/lib/api';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';
import { Starfield } from '@/components/Starfield';

interface WeatherContent {
  headline: string; overview: string; themes: string[];
  keyEvents: { day: string; event: string; meaning: string }[];
  advice: string; bestDays: string[]; challengingDays: string[];
}
interface WeatherRecord { week_start: string; content: WeatherContent; }

export default function WeeklyWeather() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [weather, setWeather] = useState<WeatherRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) { navigate('/'); return; }
    apiCall<WeatherRecord>('/horoscope/weekly')
      .then(setWeather)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="relative min-h-[100dvh] w-full text-white overflow-hidden font-sans">
      <Starfield mode="mystic" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgb(88_28_135_/_0.22),_transparent_55%)]" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-transparent via-background/60 to-background" />
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Chat
        </button>
        {loading && (
          <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />)}</div>
        )}
        {error && <p className="text-center py-12 text-white/50">{error}</p>}
        {weather && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="text-center mb-8">
              <p className="text-white/40 text-xs uppercase tracking-widest mb-2">
                Week of {new Date(weather.week_start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 leading-tight">
                {weather.content.headline}
              </h1>
            </div>
            <div className="rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-purple-300">✦ Weekly Overview</p>
              <p className="text-white/80 text-sm leading-relaxed">{weather.content.overview}</p>
            </div>
            {weather.content.themes?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {weather.content.themes.map((t) => (
                  <span key={t} className="px-3 py-1 rounded-full bg-purple-900/30 border border-purple-700/30 text-xs text-purple-300">{t}</span>
                ))}
              </div>
            )}
            {weather.content.keyEvents?.length > 0 && (
              <div className="rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 p-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-amber-300">◈ Key Events</p>
                {weather.content.keyEvents.map((e, i) => (
                  <div key={i} className="border-l-2 border-purple-700/40 pl-3">
                    <p className="text-xs text-white/50 mb-0.5">{e.day} — <span className="text-amber-300/80">{e.event}</span></p>
                    <p className="text-sm text-white/75">{e.meaning}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {weather.content.bestDays?.length > 0 && (
                <div className="rounded-2xl bg-green-950/20 border border-green-700/20 p-4">
                  <p className="text-xs text-green-400/70 uppercase tracking-wider mb-2">Best Days</p>
                  <p className="text-sm text-white/80">{weather.content.bestDays.join(', ')}</p>
                </div>
              )}
              {weather.content.challengingDays?.length > 0 && (
                <div className="rounded-2xl bg-red-950/20 border border-red-700/20 p-4">
                  <p className="text-xs text-red-400/70 uppercase tracking-wider mb-2">Challenging Days</p>
                  <p className="text-sm text-white/80">{weather.content.challengingDays.join(', ')}</p>
                </div>
              )}
            </div>
            {weather.content.advice && (
              <div className="rounded-2xl bg-purple-950/30 backdrop-blur-xl border border-purple-700/30 p-5 text-center">
                <p className="text-xs text-purple-400/70 uppercase tracking-widest mb-2">✦ Cosmic Advice</p>
                <p className="text-white/90 font-serif italic text-base leading-relaxed">"{weather.content.advice}"</p>
              </div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
