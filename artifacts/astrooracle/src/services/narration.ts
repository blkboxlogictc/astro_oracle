const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api";

// ── Premium: OpenAI TTS via server ────────────────────────────────────────────

export async function fetchNarrationUrl(
  text: string,
  mode: "science" | "mystic",
): Promise<string> {
  const res = await fetch(`${API_BASE}/narrate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, mode }),
  });

  if (!res.ok) throw new Error(`Narration API error ${res.status}`);
  const { url } = (await res.json()) as { url: string };
  return url;
}

// ── Free: browser Web Speech API ─────────────────────────────────────────────

let voicesLoaded = false;

async function getVoicesWithRetry(maxWaitMs = 3000): Promise<SpeechSynthesisVoice[]> {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) { voicesLoaded = true; return voices; }
  if (voicesLoaded) return [];

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve([]), maxWaitMs);
    speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timeout);
      voicesLoaded = true;
      resolve(speechSynthesis.getVoices());
    };
  });
}

function pickBrowserVoice(
  voices: SpeechSynthesisVoice[],
  mode: "science" | "mystic",
): SpeechSynthesisVoice | null {
  const langPrefs = mode === "mystic"
    ? ["en-GB", "en-AU", "en-US"]
    : ["en-US", "en-GB"];

  for (const lang of langPrefs) {
    const match = voices.find(v => v.lang.startsWith(lang) && !v.name.includes("Compact"));
    if (match) return match;
  }
  return voices[0] ?? null;
}

export function speakBrowser(
  text: string,
  mode: "science" | "mystic",
  onEnd?: () => void,
): () => void {
  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate  = mode === "mystic" ? 0.88 : 0.95;
  utterance.pitch = mode === "mystic" ? 0.90 : 1.0;
  if (onEnd) utterance.onend = onEnd;

  getVoicesWithRetry().then((voices) => {
    const voice = pickBrowserVoice(voices, mode);
    if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
  });

  return () => speechSynthesis.cancel();
}
