import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings, Volume2, VolumeX, Bell, BellOff, LogOut, User,
  Star, ChevronDown, Sparkles, Shield, FileText, Edit3, Crown,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/lib/api';
import { AuthModal } from './AuthModal';
import { OnboardingFlow } from './OnboardingFlow';
import { PremiumModal } from './PremiumModal';

// ── Ambient sound hook (extracted from AmbientPlayer) ─────────────────────────
type AudioRefs = { ctx: AudioContext; master: GainNode; oscs: OscillatorNode[] };

function useAmbientSound() {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<AudioRefs | null>(null);

  const start = useCallback(() => {
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 800; lp.Q.value = 0.4;
    lp.connect(master);
    const sweepLFO = ctx.createOscillator();
    const sweepGain = ctx.createGain();
    sweepLFO.frequency.value = 0.04; sweepGain.gain.value = 150;
    sweepLFO.connect(sweepGain); sweepGain.connect(lp.frequency); sweepLFO.start();
    const specs = [
      { freq: 55.0, gain: 0.30 }, { freq: 110.22, gain: 0.38 },
      { freq: 165.0, gain: 0.14 }, { freq: 220.0, gain: 0.08 },
    ];
    const oscs: OscillatorNode[] = [];
    for (const s of specs) {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.type = 'sine'; osc.frequency.value = s.freq; g.gain.value = s.gain;
      osc.connect(g); g.connect(lp); osc.start(); oscs.push(osc);
    }
    const tLFO = ctx.createOscillator(); const tGain = ctx.createGain();
    tLFO.frequency.value = 0.07; tGain.gain.value = 0.018;
    tLFO.connect(tGain); tGain.connect(master.gain); tLFO.start();
    master.gain.setTargetAtTime(0.14, ctx.currentTime, 1.8);
    audioRef.current = { ctx, master, oscs }; setPlaying(true);
  }, []);

  const stop = useCallback(() => {
    const a = audioRef.current; if (!a) return;
    a.master.gain.setTargetAtTime(0, a.ctx.currentTime, 1.2);
    setTimeout(() => {
      try { a.oscs.forEach(o => o.stop()); a.ctx.close(); } catch { }
      audioRef.current = null;
    }, 5000);
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => { if (playing) stop(); else start(); }, [playing, start, stop]);
  return { playing, toggle };
}

// ── Collapsible legal section ─────────────────────────────────────────────────
function LegalSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-white/8 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors">
        <span className="flex items-center gap-2">{icon}{title}</span>
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-xs text-white/50 leading-relaxed space-y-2 border-t border-white/8">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────
function ToggleRow({ icon, label, sublabel, enabled, loading, onClick }: {
  icon: React.ReactNode; label: string; sublabel?: string;
  enabled: boolean; loading?: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} disabled={loading}
      className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-colors disabled:opacity-50 group">
      <div className="flex items-center gap-3">
        <span className="text-white/50 group-hover:text-white/70 transition-colors">{icon}</span>
        <div className="text-left">
          <p className="text-sm text-white/80 group-hover:text-white transition-colors">{label}</p>
          {sublabel && <p className="text-xs text-white/35 mt-0.5">{sublabel}</p>}
        </div>
      </div>
      {/* Toggle pill */}
      <div className={`relative w-10 h-5 rounded-full transition-colors duration-300 shrink-0 ${enabled ? 'bg-purple-600' : 'bg-white/15'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${enabled ? 'left-5' : 'left-0.5'}`} />
      </div>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export function SettingsPanel() {
  const { user, profile, signOut } = useAuth();
  const { playing: soundOn, toggle: toggleSound } = useAmbientSound();
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    apiCall<{ push_notifications: boolean }>('/notifications/preferences')
      .then(p => setPushEnabled(p.push_notifications))
      .catch(() => {});
  }, [user]);

  const handleToggleAlerts = async () => {
    if (pushLoading) return;
    if (pushEnabled) {
      // Disable
      setPushLoading(true);
      try {
        await apiCall('/notifications/preferences', {
          method: 'PUT',
          body: JSON.stringify({ push_notifications: false }),
        });
        setPushEnabled(false);
      } catch { } finally { setPushLoading(false); }
      return;
    }
    // Enable — request OneSignal permission
    setPushLoading(true);
    try {
      const deferred = (window as any).OneSignalDeferred as any[] | undefined;
      if (!deferred) return;
      await new Promise<void>((resolve, reject) => {
        deferred.push(async (OneSignal: any) => {
          try {
            await OneSignal.Notifications.requestPermission();
            const playerId: string | undefined = OneSignal.User?.PushSubscription?.id;
            if (playerId) {
              await apiCall('/notifications/register-device', {
                method: 'POST',
                body: JSON.stringify({ playerId }),
              });
              setPushEnabled(true);
            }
            resolve();
          } catch (e) { reject(e); }
        });
      });
    } catch { } finally { setPushLoading(false); }
  };

  const initials = profile?.display_name
    ? profile.display_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? '✦';

  return (
    <>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.88 }}
            title="Settings"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-card/40 border border-white/10 backdrop-blur-md text-white/45 hover:text-white/75 hover:bg-card/60 transition-all duration-300"
          >
            <Settings size={14} />
          </motion.button>
        </SheetTrigger>

        <SheetContent
          side="left"
          className="w-[300px] sm:w-[340px] bg-[#0a0a1a] border-r border-purple-900/40 p-0 flex flex-col overflow-hidden"
        >
          <SheetTitle className="sr-only">Settings</SheetTitle>

          {/* Header */}
          <div className="px-5 pt-6 pb-4 border-b border-white/8 shrink-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-purple-400 text-xs">✦</span>
              <h2 className="text-sm font-semibold text-white/90 tracking-wide uppercase">Settings</h2>
            </div>
            <p className="text-xs text-white/35">AstroOracle · {user ? user.email : 'Not signed in'}</p>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

            {/* ── Account ── */}
            {user && profile?.onboarding_complete && (
              <section>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">Account</p>
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
                  <div className="w-10 h-10 rounded-full bg-purple-900/60 border border-purple-700/40 flex items-center justify-center text-sm font-bold text-purple-200 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-white/90 font-medium truncate">{profile?.display_name ?? 'Cosmic Seeker'}</p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {profile?.sun_sign && `☀ ${profile.sun_sign}`}
                      {profile?.moon_sign && ` · ☽ ${profile.moon_sign}`}
                      {profile?.rising_sign && ` · ↑ ${profile.rising_sign}`}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* ── Profile ── */}
            {user && (
              <section>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">Profile</p>
                <button
                  onClick={() => { setSheetOpen(false); setTimeout(() => setOnboardingOpen(true), 150); }}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl hover:bg-white/5 transition-colors group">
                  <div className="flex items-center gap-3">
                    <Edit3 size={14} className="text-white/50 group-hover:text-white/70 transition-colors" />
                    <div className="text-left">
                      <p className="text-sm text-white/80 group-hover:text-white transition-colors">Edit Natal Chart</p>
                      <p className="text-xs text-white/35 mt-0.5">Update birth date, time & location</p>
                    </div>
                  </div>
                  <span className="text-white/20 group-hover:text-white/40 text-xs">›</span>
                </button>
              </section>
            )}

            {/* ── App Preferences ── */}
            <section>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">Preferences</p>
              <div className="space-y-0.5">
                <ToggleRow
                  icon={soundOn ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  label="Ambient Sound"
                  sublabel="Cosmic drone while you explore"
                  enabled={soundOn}
                  onClick={toggleSound}
                />
                {user && (
                  <ToggleRow
                    icon={pushEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                    label="Cosmic Alerts"
                    sublabel="Push notifications for celestial events"
                    enabled={pushEnabled}
                    loading={pushLoading}
                    onClick={handleToggleAlerts}
                  />
                )}
              </div>
            </section>

            {/* ── Subscription ── */}
            {user && (
              <section>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">Subscription</p>
                <div className="px-4 py-3 rounded-xl bg-white/3 border border-white/8">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Crown size={13} className="text-amber-400/70" />
                      <span className="text-sm text-white/70">Current plan</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/50">Free</span>
                  </div>
                  <button
                    onClick={() => { setSheetOpen(false); setTimeout(() => setPremiumOpen(true), 150); }}
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-amber-700/40 to-purple-700/40 hover:from-amber-700/60 hover:to-purple-700/60 border border-amber-600/25 text-xs font-semibold text-amber-200 transition-all flex items-center justify-center gap-1.5">
                    <Sparkles size={12} /> Upgrade to Premium
                  </button>
                  <p className="text-[10px] text-white/25 text-center mt-2">Synastry readings · personalized forecasts</p>
                </div>
              </section>
            )}

            {/* ── Legal ── */}
            <section>
              <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2 px-1">Legal</p>
              <div className="space-y-2">
                <LegalSection title="Terms of Service" icon={<FileText size={13} />}>
                  <p className="pt-2">AstroOracle provides AI-powered astronomy and astrology content for entertainment and educational purposes. Cosmic readings are not a substitute for professional advice of any kind.</p>
                  <p>By using AstroOracle you agree to use the service lawfully and not attempt to misuse, reverse-engineer, or disrupt any part of the platform.</p>
                  <p>Premium subscriptions are billed through Stripe and renew automatically. You may cancel at any time via your account portal. Refunds are handled on a case-by-case basis.</p>
                  <p>We reserve the right to update these terms at any time. Continued use of the service constitutes acceptance of any changes.</p>
                  <p>Contact: <span className="text-purple-300/70">support@astrooracle.space</span></p>
                </LegalSection>
                <LegalSection title="Privacy Policy" icon={<Shield size={13} />}>
                  <p className="pt-2"><strong className="text-white/60">What we collect:</strong> Email address, birth date, time, and location — used solely to calculate and personalize your natal chart and cosmic forecasts.</p>
                  <p><strong className="text-white/60">What we never do:</strong> We do not sell, rent, or share your personal data with third parties for advertising or commercial purposes. Ever.</p>
                  <p><strong className="text-white/60">Third-party services:</strong> AI responses are processed through Anthropic and OpenAI APIs under their respective privacy policies. Payments are handled by Stripe. Push notifications use OneSignal.</p>
                  <p><strong className="text-white/60">Data security:</strong> All data is stored securely via Supabase with industry-standard encryption at rest and in transit.</p>
                  <p><strong className="text-white/60">Your rights:</strong> You may request full deletion of your account and data at any time by emailing <span className="text-purple-300/70">support@astrooracle.space</span>.</p>
                  <p><strong className="text-white/60">Push notifications:</strong> Optional. You can disable them at any time from this Settings panel.</p>
                </LegalSection>
              </div>
            </section>

            {/* ── Sign In / Sign Out ── */}
            <section className="pb-2">
              {user ? (
                <button
                  onClick={() => { setSheetOpen(false); signOut(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-900/10 transition-colors group">
                  <LogOut size={14} />
                  <span className="text-sm">Sign Out</span>
                </button>
              ) : (
                <div className="px-4 py-4 rounded-xl bg-white/3 border border-white/8 text-center">
                  <p className="text-xs text-white/40 mb-3">Sign in to access your cosmic profile, horoscopes, and more.</p>
                  <button
                    onClick={() => { setSheetOpen(false); setTimeout(() => setAuthOpen(true), 150); }}
                    className="w-full py-2.5 rounded-xl bg-purple-700/40 hover:bg-purple-700/60 border border-purple-600/30 text-sm font-medium text-white transition-all flex items-center justify-center gap-2">
                    <User size={14} /> Sign In
                  </button>
                </div>
              )}
            </section>

          </div>

          {/* Footer version */}
          <div className="px-5 py-3 border-t border-white/8 shrink-0">
            <p className="text-[10px] text-white/20 text-center">AstroOracle v3.0 · Where science meets the stars</p>
          </div>
        </SheetContent>
      </Sheet>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <OnboardingFlow open={onboardingOpen} onComplete={() => setOnboardingOpen(false)} allowClose />
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} reason="Unlock synastry readings and personalized daily forecasts" />
    </>
  );
}
