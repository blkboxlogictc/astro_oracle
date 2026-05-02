import { useState, useEffect, useCallback } from 'react';
import OneSignal from 'react-onesignal';
import { motion } from 'framer-motion';
import { Bell, BellOff, Crown, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotifPrefs = {
  email_notifications: boolean;
  push_notifications: boolean;
  daily_horoscope: boolean;
  weekly_weather: boolean;
  full_moon: boolean;
  new_moon: boolean;
  retrogrades: boolean;
  meteor_showers: boolean;
  personal_transits: boolean;
  notify_eclipses: boolean;
  notify_retrogrades: boolean;
  notify_lunations: boolean;
  notify_meteor_showers: boolean;
};

const DEFAULTS: NotifPrefs = {
  email_notifications: true,
  push_notifications: false,
  daily_horoscope: true,
  weekly_weather: true,
  full_moon: true,
  new_moon: true,
  retrogrades: true,
  meteor_showers: true,
  personal_transits: false,
  notify_eclipses: true,
  notify_retrogrades: true,
  notify_lunations: true,
  notify_meteor_showers: true,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5 px-1">{children}</p>
  );
}

function ToggleRow({
  icon, label, sublabel, enabled, loading, locked, lockedLabel, indented, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  enabled: boolean;
  loading?: boolean;
  locked?: boolean;
  lockedLabel?: string;
  indented?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading || locked}
      className={`w-full flex items-center justify-between py-2.5 rounded-xl hover:bg-white/5 transition-colors group disabled:cursor-not-allowed ${indented ? 'pl-7 pr-4' : 'px-4'}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={`shrink-0 transition-colors ${locked ? 'text-white/20' : 'text-white/50 group-hover:text-white/70'}`}>
          {locked ? <Lock size={13} /> : icon}
        </span>
        <div className="text-left min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-sm truncate transition-colors ${locked ? 'text-white/30' : 'text-white/80 group-hover:text-white'}`}>
              {label}
            </p>
            {locked && lockedLabel && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-900/40 border border-amber-700/30 text-amber-400/80 shrink-0 flex items-center gap-0.5">
                <Crown size={8} /> {lockedLabel}
              </span>
            )}
          </div>
          {sublabel && (
            <p className={`text-xs mt-0.5 truncate ${locked ? 'text-white/20' : 'text-white/35'}`}>{sublabel}</p>
          )}
        </div>
      </div>

      {loading ? (
        <Loader2 size={14} className="text-white/30 animate-spin shrink-0 ml-3" />
      ) : (
        <div className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 ml-3 ${locked ? 'bg-white/8' : enabled ? 'bg-purple-600' : 'bg-white/15'}`}>
          <div className={`absolute top-0.5 w-4 h-4 rounded-full shadow transition-all duration-300 ${locked ? 'bg-white/20 left-0.5' : enabled ? 'left-4 bg-white' : 'left-0.5 bg-white'}`} />
        </div>
      )}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface NotificationToggleProps {
  isPremium?: boolean;
}

export function NotificationToggle({ isPremium = false }: NotificationToggleProps) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULTS);
  const [loadingKeys, setLoadingKeys] = useState<Set<string>>(new Set());
  const [pushLoading, setPushLoading] = useState(false);
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied'>('default');

  // Load current preferences and permission state
  useEffect(() => {
    if (!user) return;
    apiCall<NotifPrefs>('/notifications/preferences')
      .then(p => setPrefs(prev => ({ ...prev, ...p })))
      .catch(() => {});

    if ('Notification' in window) {
      setPermissionState(Notification.permission as 'default' | 'granted' | 'denied');
    }
  }, [user]);

  const setLoading = (key: string, val: boolean) =>
    setLoadingKeys(prev => { const s = new Set(prev); val ? s.add(key) : s.delete(key); return s; });

  const savePref = useCallback(async (updates: Partial<NotifPrefs>) => {
    const key = Object.keys(updates)[0];
    setPrefs(prev => ({ ...prev, ...updates }));
    setLoading(key, true);
    try {
      await apiCall('/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      setPrefs(prev => ({ ...prev, ...Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, !v])) }));
    } finally {
      setLoading(key, false);
    }
  }, []);

  const handleTogglePush = async () => {
    if (pushLoading) return;

    // Disabling — just save the pref
    if (prefs.push_notifications) {
      await savePref({ push_notifications: false });
      return;
    }

    // Enabling — request browser permission first
    if (permissionState === 'denied') {
      alert('Push notifications are blocked in your browser. Please enable them in your browser settings, then try again.');
      return;
    }

    setPushLoading(true);
    try {
      const granted = await OneSignal.Notifications.requestPermission();
      if (!granted) return;

      setPermissionState('granted');

      // Link this subscriber to the Supabase user ID
      await OneSignal.login(user!.id);

      // Get the subscription ID and register it with our backend
      const subscriptionId = OneSignal.User?.PushSubscription?.id;
      if (subscriptionId) {
        await apiCall('/notifications/register-device', {
          method: 'POST',
          body: JSON.stringify({ playerId: subscriptionId }),
        });
      }

      setPrefs(prev => ({ ...prev, push_notifications: true }));
    } catch (err) {
      console.error('[OneSignal] Permission request failed:', err);
    } finally {
      setPushLoading(false);
    }
  };

  const toggleLunations = () => {
    const next = !prefs.full_moon;
    setPrefs(p => ({ ...p, full_moon: next, new_moon: next, notify_lunations: next }));
    apiCall('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ full_moon: next, new_moon: next, notify_lunations: next }),
    }).catch(() => setPrefs(p => ({ ...p, full_moon: !next, new_moon: !next, notify_lunations: !next })));
  };

  const toggleRetrogrades = () => {
    const next = !prefs.retrogrades;
    setPrefs(p => ({ ...p, retrogrades: next, notify_retrogrades: next }));
    apiCall('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ retrogrades: next, notify_retrogrades: next }),
    }).catch(() => setPrefs(p => ({ ...p, retrogrades: !next, notify_retrogrades: !next })));
  };

  const toggleMeteors = () => {
    const next = !prefs.meteor_showers;
    setPrefs(p => ({ ...p, meteor_showers: next, notify_meteor_showers: next }));
    apiCall('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ meteor_showers: next, notify_meteor_showers: next }),
    }).catch(() => setPrefs(p => ({ ...p, meteor_showers: !next, notify_meteor_showers: !next })));
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* ── Push Notifications ── */}
      <section>
        <SectionLabel>Push Notifications</SectionLabel>
        <div className="space-y-0.5">
          <ToggleRow
            icon={prefs.push_notifications ? <Bell size={14} /> : <BellOff size={14} />}
            label="Push Notifications"
            sublabel={
              permissionState === 'denied'
                ? 'Blocked in browser settings'
                : 'Cosmic alerts delivered to your browser'
            }
            enabled={prefs.push_notifications}
            loading={pushLoading}
            onClick={handleTogglePush}
          />

          {prefs.push_notifications && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pl-3 border-l border-white/8 ml-4 mt-1 space-y-0.5 overflow-hidden"
            >
              <ToggleRow
                icon={<span className="text-xs">⭐</span>}
                label="Daily Horoscope Nudge"
                sublabel="Morning push when your horoscope is ready"
                enabled={prefs.daily_horoscope}
                loading={loadingKeys.has('daily_horoscope')}
                locked={!isPremium}
                lockedLabel="Premium"
                indented
                onClick={() => isPremium && savePref({ daily_horoscope: !prefs.daily_horoscope })}
              />
              <ToggleRow
                icon={<span className="text-xs">🌌</span>}
                label="Weekly Cosmic Weather"
                sublabel="Monday morning forecast"
                enabled={prefs.weekly_weather}
                loading={loadingKeys.has('weekly_weather')}
                indented
                onClick={() => savePref({ weekly_weather: !prefs.weekly_weather })}
              />
              <ToggleRow
                icon={<span className="text-xs">🌕</span>}
                label="Full Moon Alerts"
                sublabel="Notification on the night of each full moon"
                enabled={prefs.full_moon}
                loading={loadingKeys.has('full_moon')}
                indented
                onClick={toggleLunations}
              />
              <ToggleRow
                icon={<span className="text-xs">🌑</span>}
                label="New Moon Alerts"
                sublabel="Set intentions at each new moon"
                enabled={prefs.new_moon}
                loading={loadingKeys.has('new_moon')}
                indented
                onClick={toggleLunations}
              />
              <ToggleRow
                icon={<span className="text-xs">℞</span>}
                label="Planet Retrogrades"
                sublabel="Station retrograde & direct alerts"
                enabled={prefs.retrogrades}
                loading={loadingKeys.has('retrogrades')}
                indented
                onClick={toggleRetrogrades}
              />
              <ToggleRow
                icon={<span className="text-xs">☄️</span>}
                label="Meteor Showers"
                sublabel="Peak viewing night reminders"
                enabled={prefs.meteor_showers}
                loading={loadingKeys.has('meteor_showers')}
                indented
                onClick={toggleMeteors}
              />
              <ToggleRow
                icon={<span className="text-xs">🔮</span>}
                label="Personal Transit Alerts"
                sublabel="When outer planets aspect your natal chart"
                enabled={prefs.personal_transits}
                loading={loadingKeys.has('personal_transits')}
                locked={!isPremium}
                lockedLabel="Premium"
                indented
                onClick={() => isPremium && savePref({ personal_transits: !prefs.personal_transits })}
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* ── Email Notifications ── */}
      <section>
        <SectionLabel>Email Notifications</SectionLabel>
        <div className="space-y-0.5">
          <ToggleRow
            icon={<Mail size={14} />}
            label="Email Notifications"
            sublabel="Master toggle for all email delivery"
            enabled={prefs.email_notifications}
            loading={loadingKeys.has('email_notifications')}
            onClick={() => savePref({ email_notifications: !prefs.email_notifications })}
          />
          {prefs.email_notifications && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pl-3 border-l border-white/8 ml-4 mt-1 space-y-0.5 overflow-hidden"
            >
              <ToggleRow
                icon={<span className="text-xs">⭐</span>}
                label="Daily Horoscope"
                sublabel="Sent each morning at 5 AM UTC"
                enabled={prefs.daily_horoscope}
                loading={loadingKeys.has('daily_horoscope')}
                locked={!isPremium}
                lockedLabel="Premium"
                indented
                onClick={() => isPremium && savePref({ daily_horoscope: !prefs.daily_horoscope })}
              />
              <ToggleRow
                icon={<span className="text-xs">🌌</span>}
                label="Weekly Cosmic Weather"
                sublabel="Sent every Monday morning"
                enabled={prefs.weekly_weather}
                loading={loadingKeys.has('weekly_weather')}
                indented
                onClick={() => savePref({ weekly_weather: !prefs.weekly_weather })}
              />
            </motion.div>
          )}
        </div>
      </section>

      {/* Premium upsell when locked features are visible */}
      {!isPremium && prefs.push_notifications && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl bg-amber-950/20 border border-amber-800/20 px-4 py-3 flex items-start gap-3"
        >
          <Crown size={14} className="text-amber-400/70 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-amber-200/70 font-medium">Unlock Premium Alerts</p>
            <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">
              Daily horoscope nudges and personal transit alerts are available on the Premium plan.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
