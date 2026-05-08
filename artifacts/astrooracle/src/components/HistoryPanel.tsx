import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, Plus, Search, Edit3, Trash2, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Session {
  id: string;
  title: string;
  mode: 'science' | 'mystic';
  preview: string;
  time: string;
}

interface SessionGroup {
  group: string;
  items: Session[];
}

const SAMPLE_HISTORY: SessionGroup[] = [
  {
    group: 'Today',
    items: [
      { id: 's1', title: 'What does my Scorpio rising mean?', mode: 'mystic', preview: 'Your Scorpio rising shapes how others first perceive you…', time: '2:14 PM' },
      { id: 's2', title: 'How black holes warp spacetime', mode: 'science', preview: 'Imagine spacetime as a stretched fabric — mass creates curvature…', time: '11:02 AM' },
    ],
  },
  {
    group: 'Yesterday',
    items: [
      { id: 's3', title: 'Orion mythology across cultures', mode: 'mystic', preview: 'The hunter has had many names across civilizations…', time: '9:31 PM' },
      { id: 's4', title: 'Tonight\'s sky over Brooklyn', mode: 'science', preview: 'Jupiter rises in the east around 10 PM tonight…', time: '7:45 PM' },
    ],
  },
  {
    group: 'This Week',
    items: [
      { id: 's5', title: 'Eclipse cycles and the Saros series', mode: 'science', preview: 'A Saros is roughly 18 years, 11 days, and 8 hours…', time: 'Mon' },
      { id: 's6', title: 'Mercury retrograde — actually real?', mode: 'mystic', preview: 'Both things can be simultaneously true here…', time: 'Sun' },
    ],
  },
  {
    group: 'Earlier',
    items: [
      { id: 's7', title: "Saturn's hexagon storm", mode: 'science', preview: 'A persistent six-sided jet stream at the north pole…', time: 'Apr 28' },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onSelectSession?: (id: string) => void;
}

export function HistoryPanel({ open, onClose, onSelectSession }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setSearch('');
    }
  }, [open]);

  const filtered = search
    ? SAMPLE_HISTORY.map(g => ({
        ...g,
        items: g.items.filter(
          it =>
            it.title.toLowerCase().includes(search.toLowerCase()) ||
            it.preview.toLowerCase().includes(search.toLowerCase()),
        ),
      })).filter(g => g.items.length > 0)
    : SAMPLE_HISTORY;

  const handleSelect = (id: string) => {
    setActiveSession(id);
    onSelectSession?.(id);
    onClose();
  };

  const handleNew = () => {
    setActiveSession(null);
    onSelectSession?.('');
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-black/50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed left-0 right-0 bottom-0 z-40 flex flex-col"
            style={{
              top: 60,
              borderTopLeftRadius: 22,
              borderTopRightRadius: 22,
              background: 'rgba(10,10,15,0.96)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderTop: '1px solid rgba(168,85,247,0.25)',
              boxShadow: '0 -10px 60px rgba(107,33,168,0.25)',
            }}
          >
            {/* Drag handle */}
            <div className="w-9 h-1 rounded-full bg-white/20 mx-auto mt-2 mb-0 shrink-0" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <History size={14} className="text-purple-400/80" />
                <span className="font-serif text-base font-semibold text-white">Saved Chats</span>
              </div>
              <button
                onClick={onClose}
                className="text-white/50 hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>

            {/* New conversation */}
            <div className="px-4 pb-3 shrink-0">
              <button
                onClick={handleNew}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-white transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(107,33,168,0.6), rgba(30,64,175,0.55))',
                  border: '1px solid rgba(168,85,247,0.45)',
                  boxShadow: '0 0 18px rgba(107,33,168,0.25)',
                }}
              >
                <Plus size={13} /> New conversation
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3 shrink-0">
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'rgba(18,18,28,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <Search size={12} className="text-white/45 shrink-0" />
                <input
                  ref={inputRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations…"
                  className="flex-1 bg-transparent border-none outline-none text-white/85 text-xs placeholder:text-white/35"
                />
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-2 pb-8">
              {!user ? (
                <GuestEmpty />
              ) : filtered.length === 0 ? (
                <p className="text-center text-white/35 text-xs mt-8">No conversations found.</p>
              ) : (
                filtered.map(g => (
                  <div key={g.group} className="mt-3">
                    <p className="text-[9px] uppercase tracking-[1.6px] text-white/35 font-semibold px-2 mb-1.5">
                      {g.group}
                    </p>
                    {g.items.map(it => {
                      const isActive = activeSession === it.id;
                      const isRenaming = renaming === it.id;
                      return (
                        <div key={it.id} className="relative group">
                          <button
                            onClick={() => !isRenaming && handleSelect(it.id)}
                            className="w-full text-left px-3 py-2.5 rounded-xl transition-all my-0.5"
                            style={{
                              background: isActive ? 'rgba(107,33,168,0.3)' : 'transparent',
                              border: `1px solid ${isActive ? 'rgba(168,85,247,0.4)' : 'transparent'}`,
                            }}
                          >
                            <div className="flex items-center gap-2 pr-14">
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{
                                  background: it.mode === 'science' ? '#60a5fa' : '#f59e0b',
                                }}
                              />
                              {isRenaming ? (
                                <input
                                  autoFocus
                                  defaultValue={it.title}
                                  onBlur={() => setRenaming(null)}
                                  onKeyDown={e => e.key === 'Enter' && setRenaming(null)}
                                  className="flex-1 bg-black/40 border border-purple-500/50 text-white text-xs px-1.5 py-0.5 rounded outline-none"
                                  onClick={e => e.stopPropagation()}
                                />
                              ) : (
                                <span className="text-xs font-medium text-white/90 truncate flex-1">
                                  {it.title}
                                </span>
                              )}
                              <span className="text-[9px] text-white/35 shrink-0">{it.time}</span>
                            </div>
                            <p className="text-[10.5px] text-white/50 mt-0.5 ml-3.5 truncate">
                              {it.preview}
                            </p>
                          </button>

                          {/* Actions */}
                          <div className="absolute right-2 top-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={e => { e.stopPropagation(); setRenaming(it.id); }}
                              className="p-1 rounded bg-black/40 text-white/50 hover:text-white transition-colors"
                            >
                              <Edit3 size={10} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); setConfirmDel(it.id); }}
                              className="p-1 rounded bg-black/40 text-white/50 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={10} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Delete confirm overlay */}
            <AnimatePresence>
              {confirmDel && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center p-5 rounded-t-[22px]"
                  style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
                >
                  <div
                    className="w-full max-w-xs rounded-2xl p-5 text-center"
                    style={{
                      background: 'rgba(18,18,28,0.9)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <p className="text-sm font-semibold text-white mb-1.5">
                      Delete this conversation?
                    </p>
                    <p className="text-xs text-white/55 mb-4 leading-relaxed">
                      This cannot be undone — the AI will forget what you discussed.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmDel(null)}
                        className="flex-1 py-2 rounded-xl text-xs font-medium text-white border border-white/10 bg-white/8 hover:bg-white/12 transition-colors"
                      >
                        Keep
                      </button>
                      <button
                        onClick={() => setConfirmDel(null)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-white border border-red-400/50 bg-red-600/60 hover:bg-red-600/80 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function GuestEmpty() {
  return (
    <div className="px-5 py-10 text-center">
      <div
        className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
        style={{
          background: 'radial-gradient(circle at 30% 30%, rgba(168,85,247,0.5), rgba(76,29,149,0.6))',
          boxShadow: '0 0 30px rgba(168,85,247,0.35)',
          border: '1px solid rgba(168,85,247,0.35)',
        }}
      >
        <Lock size={20} className="text-white" />
      </div>
      <p className="font-serif text-lg text-white font-semibold mb-1.5">
        The cosmos remembers.
      </p>
      <p className="text-xs text-white/60 leading-relaxed">
        Sign in to save your conversations, pick up where you left off, and let the Oracle remember your chart.
      </p>
    </div>
  );
}
