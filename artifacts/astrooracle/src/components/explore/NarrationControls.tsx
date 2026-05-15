import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { fetchNarrationUrl, speakBrowser } from '@/services/narration';

interface Props {
  text: string;
  mode: 'science' | 'mystic';
  isPremium: boolean;
  paused: boolean;
  autoPlay?: boolean;
}

type State = 'idle' | 'loading' | 'playing' | 'muted';

export function NarrationControls({ text, mode, isPremium, paused, autoPlay = true }: Props) {
  const [narState, setNarState] = useState<State>('idle');
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const textRef   = useRef('');

  // Stop everything on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      cancelRef.current?.();
    };
  }, []);

  // Pause/resume when parent pauses the scene
  useEffect(() => {
    if (paused) {
      audioRef.current?.pause();
      speechSynthesis.pause();
    } else {
      audioRef.current?.play().catch(() => {});
      speechSynthesis.resume();
    }
  }, [paused]);

  // Re-narrate when text changes
  useEffect(() => {
    if (!text || text === textRef.current) return;
    textRef.current = text;
    if (!autoPlay) return;
    startNarration(text);
  }, [text, autoPlay]);

  async function startNarration(t: string) {
    // Teardown previous
    audioRef.current?.pause();
    cancelRef.current?.();
    audioRef.current = null;
    cancelRef.current = null;

    if (isPremium) {
      setNarState('loading');
      try {
        const url = await fetchNarrationUrl(t, mode);
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setNarState('idle');
        audio.onerror = () => setNarState('idle');
        if (!paused) await audio.play();
        setNarState('playing');
      } catch {
        // Fall back to browser TTS if server fails
        cancelRef.current = speakBrowser(t, mode, () => setNarState('idle'));
        setNarState('playing');
      }
    } else {
      cancelRef.current = speakBrowser(t, mode, () => setNarState('idle'));
      setNarState('playing');
    }
  }

  function toggleMute() {
    if (narState === 'muted') {
      setNarState('idle');
      startNarration(textRef.current);
    } else {
      audioRef.current?.pause();
      cancelRef.current?.();
      speechSynthesis.cancel();
      setNarState('muted');
    }
  }

  const isMuted = narState === 'muted';
  const isLoading = narState === 'loading';

  return (
    <button
      onClick={toggleMute}
      aria-label={isMuted ? 'Unmute narration' : 'Mute narration'}
      className="w-8 h-8 rounded-full flex items-center justify-center text-white"
      style={{
        background: 'rgba(18,18,28,0.45)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.10)',
      }}
    >
      {isLoading
        ? <Loader2 size={13} className="animate-spin" />
        : isMuted
          ? <VolumeX size={13} />
          : <Volume2 size={13} />}
    </button>
  );
}
