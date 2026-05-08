import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useAppMode } from '@/context/AppContext';
import { SettingsPanel } from '@/components/SettingsPanel';

// Hidden on immersive screens that manage their own top bars
const HIDDEN_ON = ['/sky'];

export function MinimalTopBar() {
  const [location] = useLocation();
  const { mode, setMode } = useAppMode();

  if (HIDDEN_ON.includes(location)) return null;

  const isScience = mode === 'science';

  return (
    <div
      className="fixed left-0 right-0 z-40 flex items-center justify-between px-4"
      style={{
        top: 0,
        paddingTop: 'max(12px, env(safe-area-inset-top))',
        paddingBottom: 8,
      }}
    >
      {/* Science / Mystic toggle */}
      <motion.button
        onClick={() => setMode(isScience ? 'mystic' : 'science')}
        whileTap={{ scale: 0.93 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-white transition-all duration-500"
        style={{
          background: 'rgba(18,18,28,0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: `1px solid ${isScience ? 'rgba(59,130,246,0.30)' : 'rgba(245,158,11,0.30)'}`,
          boxShadow: isScience
            ? '0 0 14px rgba(59,130,246,0.18)'
            : '0 0 14px rgba(245,158,11,0.18)',
        }}
      >
        <span
          className="transition-opacity duration-300"
          style={{ opacity: isScience ? 1 : 0.4 }}
        >
          🔭<span className="hidden sm:inline"> Science</span>
        </span>
        <span className="w-px h-3.5 bg-white/20" />
        <span
          className="transition-opacity duration-300"
          style={{ opacity: !isScience ? 1 : 0.4 }}
        >
          ✨<span className="hidden sm:inline"> Mystic</span>
        </span>
      </motion.button>

      {/* Avatar / Settings trigger */}
      <SettingsPanel avatarMode />
    </div>
  );
}
