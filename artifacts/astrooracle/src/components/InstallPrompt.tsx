import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto rounded-2xl bg-[#0d0d1f] border border-purple-800/30 p-4 shadow-[0_0_40px_rgba(107,33,168,0.3)] flex items-center gap-3"
        >
          <img src="/icon-512.png" alt="AstroOracle" className="w-10 h-10 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Install AstroOracle</p>
            <p className="text-xs text-white/50">Add to your home screen for the full cosmic experience</p>
          </div>
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 bg-purple-700/60 hover:bg-purple-700/80 border border-purple-600/30 rounded-xl text-xs font-medium text-white transition-all flex items-center gap-1.5 shrink-0"
          >
            <Download size={12} /> Install
          </button>
          <button onClick={() => setShow(false)} className="text-white/40 hover:text-white/70 transition-colors shrink-0">
            <X size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
