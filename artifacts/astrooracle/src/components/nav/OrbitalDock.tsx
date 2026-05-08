import { useState } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { Sparkles, Camera, Telescope, Compass, History, X } from 'lucide-react';

const ITEMS = [
  { id: '/',         icon: Sparkles,  label: 'Chat',     angle: -90  },
  { id: '/sky',      icon: Camera,    label: 'Sky',      angle: -135 },
  { id: '/explore',  icon: Telescope, label: 'Explore',  angle: -45  },
  { id: '/discover', icon: Compass,   label: 'Discover', angle: -180 },
  { id: 'history',   icon: History,   label: 'History',  angle: 0,   isAction: true },
];

const ORBITAL_RADIUS = 86;

// Routes where the orbital dock is hidden (full-immersion screens)
const HIDDEN_ON = ['/sky'];

export function OrbitalDock() {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();

  if (HIDDEN_ON.includes(location)) return null;

  const handleItem = (item: typeof ITEMS[0]) => {
    if (item.isAction) {
      if (location !== '/') navigate('/');
      setTimeout(() => window.dispatchEvent(new CustomEvent('open-history')), 150);
    } else {
      navigate(item.id);
    }
    setOpen(false);
  };

  return (
    // Anchor div for absolute satellite positioning
    <div className="fixed bottom-5 right-4 z-50" style={{ width: 56, height: 56 }}>
      {/* Satellites */}
      {ITEMS.map((item, i) => {
        const rad = (item.angle * Math.PI) / 180;
        const x = Math.cos(rad) * ORBITAL_RADIUS;
        const y = Math.sin(rad) * ORBITAL_RADIUS;
        const isActive = !item.isAction && location === item.id;

        return (
          <motion.button
            key={item.id}
            onClick={() => handleItem(item)}
            title={item.label}
            aria-label={item.label}
            initial={false}
            animate={
              open
                ? { x, y, scale: 1, opacity: 1 }
                : { x: 0, y: 0, scale: 0.5, opacity: 0 }
            }
            transition={{
              type: 'spring',
              stiffness: 280,
              damping: 22,
              delay: open ? i * 0.03 : 0,
            }}
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.15)',
              background: isActive ? 'rgba(107,33,168,0.7)' : 'rgba(18,18,28,0.85)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              color: '#fff',
              boxShadow: isActive
                ? '0 0 20px rgba(168,85,247,0.5)'
                : '0 0 16px rgba(107,33,168,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              pointerEvents: open ? 'auto' : 'none',
            }}
          >
            <item.icon size={18} />
          </motion.button>
        );
      })}

      {/* Backdrop scrim — closes dock when clicking outside */}
      {open && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* FAB trigger */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.9 }}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          background: 'radial-gradient(circle at 30% 30%, #a78bfa, #6b21a8 70%)',
          color: '#fff',
          boxShadow: '0 0 30px rgba(168,85,247,0.5), 0 8px 24px rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.28 }}>
          {open ? <X size={22} /> : <Compass size={22} />}
        </motion.div>
      </motion.button>
    </div>
  );
}
