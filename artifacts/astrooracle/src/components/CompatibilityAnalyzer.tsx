import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Heart } from 'lucide-react';
import { Starfield } from '@/components/Starfield';
import { PremiumModal } from './PremiumModal';

interface Reading {
  id: string;
  reading: {
    headline: string; overallScore: number; overallSummary: string;
    strengths: string[]; challenges: string[];
    loveAndRomance: string; communication: string; longTermPotential: string;
    cosmicVerdict: string;
  };
}
interface GeoResult { display_name: string; lat: string; lon: string; }

export default function CompatibilityAnalyzer() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerBirthDate, setPartnerBirthDate] = useState('');
  const [partnerBirthTime, setPartnerBirthTime] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [selectedGeo, setSelectedGeo] = useState<GeoResult | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<Reading | null>(null);
  const [error, setError] = useState('');

  const searchLocation = async () => {
    if (!locationQuery.trim()) return;
    setGeocoding(true); setGeoResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      setGeoResults(await res.json());
    } catch { setError('Location search failed'); }
    finally { setGeocoding(false); }
  };

  const handleAnalyze = async () => {
    if (!partnerBirthDate || !selectedGeo) { setError('Partner birth date and location are required'); return; }
    setAnalyzing(true); setError('');
    try {
      const data = await apiCall<Reading>('/compatibility/analyze', {
        method: 'POST',
        body: JSON.stringify({
          partnerName: partnerName || undefined,
          partnerBirthDate,
          partnerBirthTime: partnerBirthTime || undefined,
          partnerBirthLatitude: parseFloat(selectedGeo.lat),
          partnerBirthLongitude: parseFloat(selectedGeo.lon),
          partnerBirthTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          partnerBirthLocation: selectedGeo.display_name,
        }),
      });
      setResult(data);
    } catch (err: any) {
      if (err.message?.includes('premium')) { setPremiumOpen(true); }
      else { setError(err.message ?? 'Analysis failed'); }
    } finally { setAnalyzing(false); }
  };

  const resetForm = () => {
    setResult(null); setPartnerName(''); setPartnerBirthDate('');
    setPartnerBirthTime(''); setSelectedGeo(null); setLocationQuery('');
  };

  if (!user) return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-white">
      <div className="text-center">
        <p className="text-white/50 mb-4">Sign in to use compatibility analysis</p>
        <button onClick={() => navigate('/')} className="text-purple-400 hover:text-purple-300">← Return to chat</button>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-[100dvh] w-full text-white overflow-hidden font-sans">
      <Starfield mode="mystic" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgb(120_20_80_/_0.18),_transparent_55%)]" />
      <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-b from-transparent via-background/60 to-background" />
      <main className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors mb-6 text-sm">
          <ArrowLeft size={16} /> Back to Chat
        </button>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70 mb-2">♡ Compatibility</h1>
          <p className="text-white/50 text-sm">Enter your partner's birth details for a synastry reading</p>
        </div>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 p-5 space-y-3">
                <input type="text" placeholder="Partner's name (optional)" value={partnerName} onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50" />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Birth Date *</label>
                    <input type="date" value={partnerBirthDate} onChange={(e) => setPartnerBirthDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Birth Time</label>
                    <input type="time" value={partnerBirthTime} onChange={(e) => setPartnerBirthTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 [color-scheme:dark]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1.5 block">Birth Location *</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" placeholder="City, Country" value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50" />
                    <button onClick={searchLocation} disabled={geocoding}
                      className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white text-xs disabled:opacity-50">
                      {geocoding ? '...' : 'Search'}
                    </button>
                  </div>
                  {geoResults.length > 0 && (
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {geoResults.map((r, i) => (
                        <button key={i} onClick={() => { setSelectedGeo(r); setGeoResults([]); setLocationQuery(r.display_name.split(',')[0]); }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs bg-white/5 text-white/70 hover:bg-white/10 transition-all">
                          {r.display_name}
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedGeo && <p className="text-xs text-purple-300/80 mt-1">✓ {selectedGeo.display_name.split(',').slice(0, 3).join(',')}</p>}
                </div>
              </div>
              {error && <p className="text-red-400 text-sm text-center">{error}</p>}
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleAnalyze} disabled={analyzing || !partnerBirthDate || !selectedGeo}
                className="w-full py-4 bg-gradient-to-r from-pink-800/60 to-purple-800/60 hover:from-pink-700/70 hover:to-purple-700/70 border border-pink-700/30 rounded-2xl text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <Heart size={16} /> {analyzing ? 'Calculating compatibility...' : 'Analyze Compatibility'}
              </motion.button>
              <p className="text-center text-xs text-white/30">Premium feature — requires active subscription</p>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="text-center rounded-2xl bg-card/30 backdrop-blur-xl border border-pink-700/20 p-6">
                <p className="text-xs text-pink-400/70 uppercase tracking-widest mb-2">Compatibility Score</p>
                <div className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-pink-300 to-purple-300 mb-1">{result.reading.overallScore}</div>
                <p className="text-white/50 text-xs">/ 100</p>
                <h2 className="text-lg font-serif text-white/90 mt-3">{result.reading.headline}</h2>
              </div>
              <div className="rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 text-purple-300">✦ Overview</p>
                <p className="text-white/80 text-sm leading-relaxed">{result.reading.overallSummary}</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-2xl bg-green-950/20 border border-green-700/20 p-4">
                  <p className="text-xs text-green-400/70 uppercase tracking-wider mb-2">Strengths</p>
                  {result.reading.strengths.map((s, i) => <p key={i} className="text-sm text-white/80 flex gap-2"><span className="text-green-400">✓</span>{s}</p>)}
                </div>
                <div className="rounded-2xl bg-amber-950/20 border border-amber-700/20 p-4">
                  <p className="text-xs text-amber-400/70 uppercase tracking-wider mb-2">Growth Areas</p>
                  {result.reading.challenges.map((c, i) => <p key={i} className="text-sm text-white/80 flex gap-2"><span className="text-amber-400">◈</span>{c}</p>)}
                </div>
              </div>
              {[
                { label: '♡ Love & Romance', value: result.reading.loveAndRomance, color: 'text-pink-300' },
                { label: '◎ Communication', value: result.reading.communication, color: 'text-blue-300' },
                { label: '◈ Long-term Potential', value: result.reading.longTermPotential, color: 'text-amber-300' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-2xl bg-card/30 backdrop-blur-xl border border-white/10 p-5">
                  <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${color}`}>{label}</p>
                  <p className="text-white/80 text-sm leading-relaxed">{value}</p>
                </div>
              ))}
              <div className="rounded-2xl bg-purple-950/30 backdrop-blur-xl border border-purple-700/30 p-5 text-center">
                <p className="text-xs text-purple-400/70 uppercase tracking-widest mb-2">✦ Cosmic Verdict</p>
                <p className="text-white/90 font-serif italic text-base leading-relaxed">"{result.reading.cosmicVerdict}"</p>
              </div>
              <button onClick={resetForm} className="w-full py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 hover:text-white transition-all">
                Analyze Another Compatibility
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} reason="Compatibility analysis requires AstroOracle Premium" />
    </div>
  );
}
