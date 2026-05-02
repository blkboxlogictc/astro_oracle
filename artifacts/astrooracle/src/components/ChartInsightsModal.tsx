import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

// ── Sign metadata ─────────────────────────────────────────────────────────────
const SIGNS: Record<string, {
  symbol: string; element: string; modality: string; ruler: string;
  elementColor: string; traits: string[];
}> = {
  Aries:       { symbol: '♈', element: 'Fire',  modality: 'Cardinal', ruler: 'Mars',    elementColor: 'text-red-300',    traits: ['Bold', 'Pioneering', 'Energetic', 'Direct'] },
  Taurus:      { symbol: '♉', element: 'Earth', modality: 'Fixed',    ruler: 'Venus',   elementColor: 'text-green-300',  traits: ['Steadfast', 'Sensual', 'Patient', 'Reliable'] },
  Gemini:      { symbol: '♊', element: 'Air',   modality: 'Mutable',  ruler: 'Mercury', elementColor: 'text-yellow-300', traits: ['Curious', 'Versatile', 'Quick-witted', 'Social'] },
  Cancer:      { symbol: '♋', element: 'Water', modality: 'Cardinal', ruler: 'Moon',    elementColor: 'text-blue-300',   traits: ['Nurturing', 'Intuitive', 'Protective', 'Empathic'] },
  Leo:         { symbol: '♌', element: 'Fire',  modality: 'Fixed',    ruler: 'Sun',     elementColor: 'text-red-300',    traits: ['Generous', 'Creative', 'Dramatic', 'Warm'] },
  Virgo:       { symbol: '♍', element: 'Earth', modality: 'Mutable',  ruler: 'Mercury', elementColor: 'text-green-300',  traits: ['Analytical', 'Precise', 'Helpful', 'Discerning'] },
  Libra:       { symbol: '♎', element: 'Air',   modality: 'Cardinal', ruler: 'Venus',   elementColor: 'text-yellow-300', traits: ['Harmonious', 'Fair', 'Diplomatic', 'Aesthetic'] },
  Scorpio:     { symbol: '♏', element: 'Water', modality: 'Fixed',    ruler: 'Pluto',   elementColor: 'text-blue-300',   traits: ['Intense', 'Perceptive', 'Transformative', 'Magnetic'] },
  Sagittarius: { symbol: '♐', element: 'Fire',  modality: 'Mutable',  ruler: 'Jupiter', elementColor: 'text-red-300',    traits: ['Adventurous', 'Philosophical', 'Optimistic', 'Free'] },
  Capricorn:   { symbol: '♑', element: 'Earth', modality: 'Cardinal', ruler: 'Saturn',  elementColor: 'text-green-300',  traits: ['Disciplined', 'Ambitious', 'Pragmatic', 'Enduring'] },
  Aquarius:    { symbol: '♒', element: 'Air',   modality: 'Fixed',    ruler: 'Uranus',  elementColor: 'text-yellow-300', traits: ['Innovative', 'Independent', 'Visionary', 'Eccentric'] },
  Pisces:      { symbol: '♓', element: 'Water', modality: 'Mutable',  ruler: 'Neptune', elementColor: 'text-blue-300',   traits: ['Compassionate', 'Imaginative', 'Mystical', 'Empathic'] },
};

// ── Placement descriptions ────────────────────────────────────────────────────
const SUN_DESC: Record<string, string> = {
  Aries:       'Your core identity is forged in courage and initiative. You shine when you lead, act first, and blaze trails others are still debating.',
  Taurus:      'Your essence is grounded in patience and beauty. You shine through quiet reliability, a deep appreciation of the physical world, and unshakeable steadiness.',
  Gemini:      'Your identity lives in curiosity and connection. You shine when communicating, exploring ideas, and moving fluidly between worlds and people.',
  Cancer:      'Your core is built on emotional depth and the need to belong. You shine when nurturing, creating sanctuary, and trusting your powerful instincts.',
  Leo:         'Your identity radiates warmth, creativity, and the courage to be seen. You shine brightest when you lead with your whole heart and let others bask in your generosity.',
  Virgo:       'Your essence is shaped by a desire to improve and to serve. You shine through precision, practical wisdom, and the quiet power of making things work beautifully.',
  Libra:       'Your identity centers on harmony, beauty, and justice. You shine in relationship — as a diplomat, creator, and keeper of what is fair and true.',
  Scorpio:     'Your core runs deep — built on the courage to face what others avoid. You shine in moments of radical honesty, profound transformation, and rebirth.',
  Sagittarius: 'Your identity is built on the search for meaning and truth. You shine when exploring — literally or philosophically — always chasing the next horizon.',
  Capricorn:   'Your essence is forged through discipline and the long view. You shine by building what matters, earning trust through action, and achieving the improbable.',
  Aquarius:    'Your identity is shaped by your relationship with the future and humanity. You shine when you innovate, challenge comfortable norms, and champion collective progress.',
  Pisces:      'Your essence flows between worlds — the visible and the unseen. You shine through creative imagination, spiritual depth, and boundless empathy for all living things.',
};

const MOON_DESC: Record<string, string> = {
  Aries:       'Your emotional instincts are immediate and fierce — you feel first, process later. You need the freedom to act on your feelings without delay or second-guessing.',
  Taurus:      'Your inner world is built on stability and the senses. You process feelings slowly and deeply, finding peace through beauty, routine, and physical comfort.',
  Gemini:      'Your emotional world is animated by curiosity — you process feelings by talking, writing, and turning them over in your restless, intelligent mind.',
  Cancer:      'Your emotional nature is exceptionally deep and tied to memory and belonging. You feel everything intensely and need a safe haven where your sensitivity is honored.',
  Leo:         'Your emotional needs center on recognition and loyal connection. You give warmth abundantly and need your creativity and generosity seen and appreciated in return.',
  Virgo:       'Your inner world is ordered through analysis. You process emotion by making sense of it — sorting, examining, and finding the practical meaning behind every feeling.',
  Libra:       'Your emotional wellbeing depends on harmony and connection. You are deeply unsettled by conflict and instinctively seek to restore balance in all your relationships.',
  Scorpio:     'Your emotional life runs at volcanic depth — you feel with rare intensity and rarely forget what you experience. You need emotional truth, and nothing less satisfies.',
  Sagittarius: 'Your inner world is adventurous and optimistic. You process emotion through philosophy, humor, and movement — and feel caged by intensity without room to breathe.',
  Capricorn:   'Your emotional nature is private and restrained. You feel deeply but rarely show it without trust. Security comes through achievement and things built to last.',
  Aquarius:    'Your inner world is rational before emotional — you experience feelings as something to observe and understand. You need intellectual connection alongside emotional warmth.',
  Pisces:      'Your emotional world is boundless — you absorb the feelings around you like water absorbs color. You need solitude to return to yourself and replenish your deep empathy.',
};

const RISING_DESC: Record<string, string> = {
  Aries:       'You enter any space with direct, confident energy that others register immediately. People sense your drive and decisiveness before you have said a word.',
  Taurus:      'You project calm steadiness and a quiet magnetic quality. Others sense your reliability instantly — your presence makes people feel settled and at ease.',
  Gemini:      'You come across as bright, curious, and immediately engaging. People are drawn to your wit and feel energized by your quick, animated intelligence.',
  Cancer:      'You radiate warmth and approachability in a way that makes people feel safe almost instantly. There is something protective and deeply welcoming about how you meet the world.',
  Leo:         'Your presence fills a room — warm, expressive, and impossible to miss. Your confidence draws people in rather than shutting them out, and people remember you.',
  Virgo:       'You project quiet competence and attentiveness. People instinctively turn to you when something needs to be done carefully, understood precisely, or handled with care.',
  Libra:       'You carry an effortless grace that makes everyone feel welcomed. Others see you as refined and genuinely interested in them — a natural diplomat with an elegant touch.',
  Scorpio:     'You project intensity and depth that is impossible to ignore. Others sense there is far more beneath the surface — and they are right. Your presence is magnetic.',
  Sagittarius: 'You come across as enthusiastic and larger than life — always heading toward something exciting. Your optimism is contagious and your sense of adventure draws people in.',
  Capricorn:   'You project quiet authority and composure. Others sense your capability and seriousness from the start, and tend to trust your judgment before you have said much.',
  Aquarius:    'You project originality and a cool self-possession that makes people curious. Others sense you operate by your own logic — and they are intrigued by your unusual energy.',
  Pisces:      'You radiate a dreamy, gentle quality that comforts without effort. People are drawn to confide in you and seek your creative imagination and quiet, compassionate depth.',
};

// ── Sub-components ────────────────────────────────────────────────────────────
function PlacementCard({
  glyph, label, sign, description, delay,
}: {
  glyph: string; label: string; sign: string; description: string; delay: number;
}) {
  const data = SIGNS[sign];
  if (!data) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="rounded-2xl bg-white/3 border border-white/8 p-4"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-white/30 text-xs font-medium uppercase tracking-widest">{glyph} {label}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{data.symbol}</span>
            <span className="text-lg font-bold text-white/90">{sign}</span>
          </div>
        </div>
        {/* Meta badges */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] font-semibold ${data.elementColor}`}>{data.element}</span>
          <span className="text-[10px] text-white/30">{data.modality} · {data.ruler}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-white/60 leading-relaxed mb-3">{description}</p>

      {/* Trait pills */}
      <div className="flex flex-wrap gap-1.5">
        {data.traits.map(t => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/45">
            {t}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
interface ChartInsightsModalProps {
  open: boolean;
  onClose: () => void;
  displayName: string;
  initials: string;
  sunSign: string | null;
  moonSign: string | null;
  risingSign: string | null;
}

export function ChartInsightsModal({
  open, onClose, displayName, initials, sunSign, moonSign, risingSign,
}: ChartInsightsModalProps) {
  const capitalize = (s: string | null) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : null;

  const sun    = capitalize(sunSign);
  const moon   = capitalize(moonSign);
  const rising = capitalize(risingSign);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] z-50 max-w-md mx-auto flex flex-col bg-[#0d0b28] border border-purple-900/40 rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full bg-purple-900/60 border border-purple-700/40 flex items-center justify-center text-sm font-bold text-purple-200 shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/90 truncate">{displayName}</p>
                <p className="text-xs text-white/35 mt-0.5">Natal Chart Overview</p>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

              {/* Explainer blurb */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
                className="text-xs text-white/35 leading-relaxed px-1 pb-1"
              >
                Your three core placements form the foundation of your astrological profile. Each is calculated from your exact birth date, time, and location.
              </motion.p>

              {/* Sun sign */}
              {sun && (
                <PlacementCard
                  glyph="☀" label="Sun Sign" sign={sun}
                  description={SUN_DESC[sun] ?? `The Sun in ${sun} shapes your core identity, the essence of who you are and how you express yourself in the world.`}
                  delay={0.1}
                />
              )}

              {/* Moon sign */}
              {moon && (
                <PlacementCard
                  glyph="☽" label="Moon Sign" sign={moon}
                  description={MOON_DESC[moon] ?? `The Moon in ${moon} reveals your emotional nature, your instincts, and the inner world you carry beneath the surface.`}
                  delay={0.18}
                />
              )}

              {/* Rising sign */}
              {rising && (
                <PlacementCard
                  glyph="↑" label="Rising Sign" sign={rising}
                  description={RISING_DESC[rising] ?? `Your ${rising} rising shapes the persona you project — the first impression you make and the lens through which you experience new situations.`}
                  delay={0.26}
                />
              )}

              {/* Incomplete chart nudge */}
              {(!sun || !moon || !rising) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-xl bg-purple-900/20 border border-purple-700/20 px-4 py-3 text-xs text-white/40 text-center"
                >
                  {!sun
                    ? 'Complete your birth chart to unlock all three placements.'
                    : 'Your birth time is needed to calculate your Rising sign precisely.'}
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
