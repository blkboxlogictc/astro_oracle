import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/lib/api';
import { AuthModal } from './AuthModal';

type CosmicEvent = {
  id: string;
  event_type: string;
  event_name: string;
  event_date: string;
  description: string | null;
  scientific_description: string | null;
  affected_signs: string[] | null;
  visibility_info: string | null;
  is_past: boolean;
};

const EVENT_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string; label: string }> = {
  full_moon:        { icon: '🌕', color: 'text-blue-200',   bg: 'bg-blue-950/40',   border: 'border-blue-800/30',   label: 'Full Moon' },
  new_moon:         { icon: '🌑', color: 'text-indigo-200', bg: 'bg-indigo-950/40', border: 'border-indigo-800/30', label: 'New Moon' },
  retrograde_start: { icon: '℞',  color: 'text-amber-200',  bg: 'bg-amber-950/40',  border: 'border-amber-700/30',  label: 'Retrograde' },
  retrograde_end:   { icon: '↻',  color: 'text-green-200',  bg: 'bg-green-950/40',  border: 'border-green-800/30',  label: 'Direct Station' },
  eclipse:          { icon: '🌒', color: 'text-purple-200', bg: 'bg-purple-950/40', border: 'border-purple-700/30', label: 'Eclipse' },
  meteor_shower:    { icon: '☄️', color: 'text-violet-200', bg: 'bg-violet-950/40', border: 'border-violet-800/30', label: 'Meteor Shower' },
};
const DEFAULT_CONFIG = { icon: '✨', color: 'text-purple-200', bg: 'bg-purple-950/30', border: 'border-purple-800/20', label: 'Cosmic Event' };

function getConfig(type: string) {
  return EVENT_CONFIG[type] ?? DEFAULT_CONFIG;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getUTCHours(), m = d.getUTCMinutes();
  if (h === 0 && m === 0) return null;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} UTC`;
}

function daysFromNow(iso: string) {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days ago`;
  return `In ${diff} days`;
}

function EventCard({ event, index }: { event: CosmicEvent; index: number }) {
  const cfg = getConfig(event.event_type);
  const time = formatTime(event.event_date);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border} ${event.is_past ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-4">
        <div className="text-3xl shrink-0 mt-0.5">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          {/* Type label + relative time */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
            <span className="text-[10px] text-white/30">·</span>
            <span className={`text-[10px] font-medium ${event.is_past ? 'text-white/30' : 'text-white/50'}`}>
              {daysFromNow(event.event_date)}
            </span>
          </div>

          {/* Event name */}
          <h3 className="text-base font-semibold text-white/90 leading-snug mb-1">
            {event.event_name || event.description}
          </h3>

          {/* Date + time */}
          <div className="flex items-center gap-3 mb-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(event.event_date)}
            </span>
            {time && (
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {time}
              </span>
            )}
          </div>

          {/* Description */}
          {event.scientific_description && (
            <p className="text-sm text-white/55 leading-relaxed mb-3">
              {event.scientific_description}
            </p>
          )}
          {!event.scientific_description && event.description && (
            <p className="text-sm text-white/55 leading-relaxed mb-3">
              {event.description}
            </p>
          )}

          {/* Visibility */}
          {event.visibility_info && (
            <div className="flex items-center gap-1.5 text-xs text-green-300/70 bg-green-950/30 border border-green-800/20 rounded-lg px-3 py-1.5 w-fit">
              <span>🔭</span>
              <span>{event.visibility_info}</span>
            </div>
          )}

          {/* Affected signs */}
          {event.affected_signs && event.affected_signs.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Affects:</span>
              {event.affected_signs.map(sign => (
                <span key={sign} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50">
                  {sign}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function CosmicEvents() {
  const { user, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [events, setEvents] = useState<CosmicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    apiCall<CosmicEvent[]>('/events')
      .then(data => setEvents(data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  const upcoming = events.filter(e => !e.is_past);
  const recent   = events.filter(e => e.is_past);

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white relative overflow-hidden">
      {/* Starfield */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }, (_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 1.5 + 0.5,
              height: Math.random() * 1.5 + 0.5,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.4 + 0.1,
            }}
            animate={{ opacity: [null, Math.random() * 0.3 + 0.05, null] as any }}
            transition={{ duration: Math.random() * 4 + 3, repeat: Infinity, repeatType: 'mirror' }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 pb-16">
        {/* Header */}
        <div className="flex items-center gap-3 pt-8 pb-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setLocation('/')}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft size={14} />
          </motion.button>
          <div>
            <h1 className="text-lg font-semibold text-white/90 tracking-wide">Cosmic Events</h1>
            <p className="text-xs text-white/35 mt-0.5">Celestial happenings near you in time</p>
          </div>
        </div>

        {/* Not signed in */}
        {!authLoading && !user && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="text-5xl mb-4">✨</div>
            <h2 className="text-lg font-semibold text-white/80 mb-2">Sign in to see cosmic events</h2>
            <p className="text-sm text-white/40 mb-6">Track full moons, retrogrades, eclipses and more</p>
            <button
              onClick={() => setAuthOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-purple-700/50 hover:bg-purple-700/70 border border-purple-600/30 text-sm font-medium text-white transition-all"
            >
              Sign In
            </button>
          </motion.div>
        )}

        {/* Loading */}
        {user && loading && (
          <div className="flex flex-col items-center py-20 gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              className="text-3xl"
            >
              ✦
            </motion.div>
            <p className="text-sm text-white/30">Scanning the cosmos…</p>
          </div>
        )}

        {/* No events */}
        {user && !loading && events.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="text-4xl mb-3">🌌</div>
            <p className="text-white/50 text-sm">No events on the calendar yet.</p>
            <p className="text-white/25 text-xs mt-1">The cron job checks nightly — check back tomorrow.</p>
          </motion.div>
        )}

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 px-1">Upcoming</p>
            <div className="space-y-3">
              {upcoming.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
            </div>
          </section>
        )}

        {/* Recent past events */}
        {recent.length > 0 && (
          <section>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mb-3 px-1">Recent</p>
            <div className="space-y-3">
              {recent.map((e, i) => <EventCard key={e.id} event={e} index={upcoming.length + i} />)}
            </div>
          </section>
        )}
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
