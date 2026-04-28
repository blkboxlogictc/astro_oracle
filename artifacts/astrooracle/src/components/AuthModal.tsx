import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

interface AuthModalProps { open: boolean; onClose: () => void; }
type AuthTab = 'magic' | 'google' | 'password';

function GoogleIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} xmlns="http://www.w3.org/2000/svg" style={{ display: 'inline', flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

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

  const TAB_LABELS: Record<AuthTab, React.ReactNode> = {
    magic: <span className="flex items-center justify-center gap-1">✉️ Magic Link</span>,
    google: <span className="flex items-center justify-center gap-1"><GoogleIcon size={12} /> Google</span>,
    password: <span className="flex items-center justify-center gap-1">🔒 Password</span>,
  };

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
              <GoogleIcon size={18} /> {loading ? 'Redirecting...' : 'Continue with Google'}
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
