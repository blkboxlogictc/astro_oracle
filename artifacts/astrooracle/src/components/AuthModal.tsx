import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

interface AuthModalProps { open: boolean; onClose: () => void; }
type AuthTab = 'magic' | 'google' | 'password';

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<AuthTab>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const reset = () => { setEmail(''); setPassword(''); setMessage(''); setError(''); setLoading(false); };

  const handleMagicLink = async () => {
    if (!email.trim()) { setError('Enter your email address'); return; }
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setLoading(false);
    error ? setError(error.message) : setMessage('Check your email for the magic link ✨');
  };

  const handleGoogle = async () => {
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
    if (error) { setError(error.message); setLoading(false); }
  };

  const handlePassword = async () => {
    if (!email.trim() || !password.trim()) { setError('Enter your email and password'); return; }
    setLoading(true); setError('');
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); }
    else if (isSignUp) { setMessage('Account created! Check your email to confirm.'); }
    else { reset(); onClose(); }
  };

  const TAB_LABELS: Record<AuthTab, string> = { magic: '✉️ Magic Link', google: '🔵 Google', password: '🔒 Password' };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="bg-[#0d0d1f] border border-purple-800/30 text-white max-w-sm rounded-2xl shadow-[0_0_60px_rgba(107,33,168,0.3)]">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-serif text-transparent bg-clip-text bg-gradient-to-b from-white to-white/70">
            Welcome to AstroOracle
          </DialogTitle>
          <p className="text-center text-white/50 text-sm">Sign in to unlock your cosmic profile</p>
        </DialogHeader>

        <div className="flex gap-1 p-1 bg-white/5 rounded-xl mt-2">
          {(['magic', 'google', 'password'] as AuthTab[]).map((t) => (
            <button key={t} onClick={() => { setTab(t); reset(); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'bg-purple-700/60 text-white' : 'text-white/40 hover:text-white/70'}`}>
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="mt-2 space-y-3">
          {(tab === 'magic' || tab === 'password') && (
            <input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (tab === 'magic' ? handleMagicLink() : handlePassword())}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50" />
          )}
          {tab === 'password' && (
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePassword()}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50" />
          )}
          {tab === 'magic' && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleMagicLink} disabled={loading}
              className="w-full py-3 bg-purple-700/60 hover:bg-purple-700/80 border border-purple-600/30 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <Mail size={15} /> {loading ? 'Sending...' : 'Send Magic Link'}
            </motion.button>
          )}
          {tab === 'google' && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleGoogle} disabled={loading}
              className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              <span className="text-base">🔵</span> {loading ? 'Redirecting...' : 'Continue with Google'}
            </motion.button>
          )}
          {tab === 'password' && (
            <>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handlePassword} disabled={loading}
                className="w-full py-3 bg-purple-700/60 hover:bg-purple-700/80 border border-purple-600/30 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50">
                {loading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
              </motion.button>
              <button onClick={() => setIsSignUp(!isSignUp)} className="w-full text-center text-xs text-white/40 hover:text-white/70 transition-colors">
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </>
          )}
          {message && <p className="text-center text-sm text-purple-300">{message}</p>}
          {error && <p className="text-center text-sm text-red-400">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
