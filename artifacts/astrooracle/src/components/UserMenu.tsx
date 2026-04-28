import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AuthModal } from './AuthModal';
import { OnboardingFlow } from './OnboardingFlow';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { LogOut, Star, Calendar, Heart, User } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const { user, profile, loading, signOut } = useAuth();
  const [, navigate] = useLocation();
  const [authOpen, setAuthOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  if (loading) return <div className="w-24 h-8 rounded-full bg-white/5 animate-pulse" />;

  if (!user) return (
    <>
      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setAuthOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-700/30 border border-purple-600/30 backdrop-blur-md text-sm font-medium text-white/90 hover:bg-purple-700/50 transition-all">
        <User size={14} /> Sign In
      </motion.button>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );

  if (profile && !profile.onboarding_complete) return (
    <>
      <motion.button whileTap={{ scale: 0.93 }} onClick={() => setOnboardingOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-700/30 border border-amber-600/30 backdrop-blur-md text-sm font-medium text-amber-200 hover:bg-amber-700/50 transition-all">
        ✨ Set up profile
      </motion.button>
      <OnboardingFlow open={onboardingOpen} onComplete={() => setOnboardingOpen(false)} />
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button whileTap={{ scale: 0.93 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/40 border border-purple-500/30 backdrop-blur-md text-sm font-medium text-white/90 hover:bg-card/60 transition-all shadow-[0_0_14px_rgba(107,33,168,0.2)]">
          <Star size={13} className="text-amber-400" />
          {profile?.sun_sign ?? 'My Chart'}
        </motion.button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end"
        className="bg-[#0d0d1f] border border-purple-800/30 text-white rounded-2xl shadow-[0_0_30px_rgba(107,33,168,0.3)] min-w-[200px] p-1">
        {profile && (
          <div className="px-3 py-2 text-center">
            <p className="text-xs text-white/40 mb-0.5">{user.email}</p>
            <p className="text-xs text-purple-300/80">{profile.sun_sign} ☀ · {profile.moon_sign} ☽ · {profile.rising_sign} ↑</p>
          </div>
        )}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onClick={() => navigate('/horoscope')}
          className="rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/5 focus:bg-white/5 cursor-pointer gap-2">
          <Star size={14} className="text-amber-400" /> Daily Horoscope
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/weekly')}
          className="rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/5 focus:bg-white/5 cursor-pointer gap-2">
          <Calendar size={14} className="text-purple-400" /> Weekly Weather
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/compatibility')}
          className="rounded-xl text-sm text-white/80 hover:text-white hover:bg-white/5 focus:bg-white/5 cursor-pointer gap-2">
          <Heart size={14} className="text-pink-400" /> Compatibility
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem onClick={signOut}
          className="rounded-xl text-sm text-red-400/80 hover:text-red-400 hover:bg-red-900/10 focus:bg-red-900/10 cursor-pointer gap-2">
          <LogOut size={14} /> Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
