import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { apiCall } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface Props { open: boolean; onComplete: () => void; allowClose?: boolean; }
interface GeoResult { display_name: string; lat: string; lon: string; }

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1923 }, (_, i) => CURRENT_YEAR - i);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export function OnboardingFlow({ open, onComplete, allowClose = false }: Props) {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [birthHour, setBirthHour] = useState('');
  const [birthMinute, setBirthMinute] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [selectedGeo, setSelectedGeo] = useState<GeoResult | null>(null);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [geocoding, setGeocoding] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const birthDate = birthYear && birthMonth && birthDay
    ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
    : '';
  const birthTime = birthHour !== '' && birthMinute !== ''
    ? `${birthHour.padStart(2, '0')}:${birthMinute.padStart(2, '0')}`
    : '';

  const searchLocation = async () => {
    if (!locationQuery.trim()) return;
    setGeocoding(true); setGeoResults([]); setSelectedGeo(null);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationQuery)}&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      setGeoResults(await res.json());
    } catch { setError('Location search failed — try again'); }
    finally { setGeocoding(false); }
  };

  const handleSubmit = async () => {
    if (!birthDate) { setError('Birth date is required'); return; }
    if (!selectedGeo) { setError('Select a birth location'); return; }
    setSubmitting(true); setError('');
    try {
      await apiCall('/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify({
          birth_date: birthDate,
          birth_time: birthTime || undefined,
          birth_latitude: parseFloat(selectedGeo.lat),
          birth_longitude: parseFloat(selectedGeo.lon),
          birth_location: selectedGeo.display_name,
          birth_timezone: timezone,
        }),
      });
      await refreshProfile();
      onComplete();
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally { setSubmitting(false); }
  };

  const selectClass = "bg-white/5 border border-white/10 rounded-xl px-2 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 [color-scheme:dark] w-full text-center";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && allowClose) onComplete(); }}>
      <DialogContent
        className="bg-[#0d0d1f] border border-purple-800/30 text-white max-w-sm rounded-2xl shadow-[0_0_60px_rgba(107,33,168,0.3)]"
        onInteractOutside={(e) => { if (!allowClose) e.preventDefault(); }}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            Your Cosmic Profile
          </DialogTitle>
          <p className="text-center text-white/50 text-sm">
            {step === 0 ? 'When were you born?' : 'Where were you born?'}
          </p>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Birth Date *</label>
                <div className="grid grid-cols-3 gap-2">
                  <select value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} className={selectClass}>
                    <option value="" disabled>Month</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={String(i + 1)}>{m}</option>
                    ))}
                  </select>
                  <select value={birthDay} onChange={(e) => setBirthDay(e.target.value)} className={selectClass}>
                    <option value="" disabled>Day</option>
                    {DAYS.map((d) => (
                      <option key={d} value={String(d)}>{d}</option>
                    ))}
                  </select>
                  <select value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={selectClass}>
                    <option value="" disabled>Year</option>
                    {YEARS.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Birth Time <span className="text-white/30">(optional — improves accuracy)</span></label>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min={0} max={23} placeholder="HH"
                    value={birthHour} onChange={(e) => setBirthHour(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 [color-scheme:dark] text-center"
                  />
                  <span className="text-white/50 text-lg font-bold shrink-0">:</span>
                  <input
                    type="number" min={0} max={59} placeholder="MM"
                    value={birthMinute} onChange={(e) => setBirthMinute(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 [color-scheme:dark] text-center"
                  />
                </div>
              </div>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={() => { if (!birthDate) { setError('Birth date is required'); return; } setError(''); setStep(1); }}
                className="w-full py-3 bg-purple-700/60 hover:bg-purple-700/80 border border-purple-600/30 rounded-xl text-sm font-medium text-white transition-all">
                Continue →
              </motion.button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3 mt-2">
              <div>
                <label className="text-xs text-white/50 mb-1.5 block">Birth City *</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. New York, NY" value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchLocation()}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50" />
                  <button onClick={searchLocation} disabled={geocoding}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-xs disabled:opacity-50">
                    {geocoding ? '...' : 'Search'}
                  </button>
                </div>
                {geoResults.length > 0 && (
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
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
              <p className="text-xs text-white/30">Timezone: {timezone}</p>
              {error && <p className="text-red-400 text-xs text-center">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setStep(0)} className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all">← Back</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={submitting || !selectedGeo}
                  className="flex-1 py-3 bg-purple-700/60 hover:bg-purple-700/80 border border-purple-600/30 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50">
                  {submitting ? 'Calculating...' : '✨ Reveal My Chart'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
