import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion } from 'framer-motion';
import { apiCall } from '@/lib/api';

interface Props { open: boolean; onClose: () => void; reason?: string; }

export function PremiumModal({ open, onClose, reason }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    setLoading(true); setError('');
    try {
      const { url } = await apiCall<{ url: string }>('/stripe/create-checkout-session', {
        method: 'POST',
        body: JSON.stringify({
          successUrl: `${window.location.origin}/?upgraded=1`,
          cancelUrl: window.location.href,
        }),
      });
      window.location.href = url;
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[#0d0d1f] border border-amber-600/30 text-white max-w-sm rounded-2xl shadow-[0_0_60px_rgba(217,119,6,0.2)]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-400/80">
            ✨ AstroOracle Premium
          </DialogTitle>
        </DialogHeader>
        {reason && <p className="text-center text-white/60 text-sm -mt-2">{reason}</p>}
        <div className="space-y-2 my-2">
          {[
            '🔮 Personalized daily horoscopes',
            '💫 Synastry compatibility readings',
            '⚡ Real-time transit alerts',
            '📡 Push + email cosmic notifications',
          ].map((f) => <p key={f} className="text-sm text-white/80">{f}</p>)}
        </div>
        <div className="text-center my-2">
          <span className="text-3xl font-bold text-amber-300">$7.99</span>
          <span className="text-white/50 text-sm">/month</span>
        </div>
        {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleUpgrade} disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-amber-600/80 to-amber-500/80 hover:from-amber-600 hover:to-amber-500 border border-amber-500/30 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(217,119,6,0.3)]">
          {loading ? 'Redirecting...' : 'Upgrade Now'}
        </motion.button>
        <button onClick={onClose} className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors">Maybe later</button>
      </DialogContent>
    </Dialog>
  );
}
