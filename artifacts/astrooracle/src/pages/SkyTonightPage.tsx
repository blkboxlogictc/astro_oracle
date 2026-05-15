import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { getMoonPhase, getSunSign, getTonightsConstellations } from '@/lib/astro-calc';
import { useAppMode } from '@/context/AppContext';
import { Starfield } from '@/components/Starfield';

// ── Moon phase meanings ────────────────────────────────────────────────────────

const MOON_SCIENCE: Record<string, string> = {
  'New Moon':        'The Moon sits between Earth and Sun — its dark side faces us. Zero illumination means exceptional stargazing. Tidal forces are at their maximum due to Sun–Moon alignment.',
  'Waxing Crescent': 'A sliver of sunlit moon grows each night. Look west after sunset. The unlit portion may show Earthshine — sunlight reflected off Earth back onto the Moon.',
  'First Quarter':   'Exactly half the Moon is illuminated. The terminator line — where shadow meets light — throws craters and mountains into sharp relief through a telescope.',
  'Waxing Gibbous':  'Over half illuminated and brightening. Surface detail along the terminator is still crisp. The Moon rises in the afternoon and sets after midnight.',
  'Full Moon':       'Sun and Moon on opposite sides of Earth. The Moon rises at sunset and is above the horizon all night. Tidal bulges are strongest — coastlines see their highest tides.',
  'Waning Gibbous':  'Past full — the Moon rises later each night, now after sunset. The terminator moves to the other limb, revealing different terrain in sharp shadow.',
  'Last Quarter':    'Mirror of the First Quarter — the other half now lit. The Moon rises near midnight and is highest at dawn, a perfect morning-sky target.',
  'Waning Crescent': 'A thinning arc rising just before sunrise. Look east in the predawn hours. The approaching New Moon means dark skies return for deep-space observing.',
};

const MOON_MYSTIC: Record<string, string> = {
  'New Moon':        'A threshold moment — the sky holds its breath. Plant intentions as you would seeds. What you begin now carries the energy of the entire lunar cycle forward.',
  'Waxing Crescent': 'The first exhale of new energy. Take one concrete step toward what you set at the New Moon. Momentum gathers slowly — trust the process.',
  'First Quarter':   'A decision point. The Moon squares the Sun and tension is productive. Act on what you know. Doubt is just the shadow before the light commits.',
  'Waxing Gibbous':  'Refinement time. You can see where you are headed — adjust, polish, prepare. The fullness is coming. Hold your vision steady.',
  'Full Moon':       'Culmination. The Moon pours its full light onto what you have been building. Celebrate, release what no longer serves, and let the cycle's harvest show itself.',
  'Waning Gibbous':  'Gratitude and sharing. You have received — now give some of that wisdom back. Teach, express, distribute. The energy is generous.',
  'Last Quarter':    'Release and forgiveness. The Moon calls you to let go of what the cycle brought up but did not resolve. Space made now is space filled at the next New Moon.',
  'Waning Crescent': 'Rest and surrender. The dream state between cycles. Restore yourself. The cosmos is preparing a new beginning — you need only be empty enough to receive it.',
};

// ── Constellation mythology snippets ─────────────────────────────────────────

const CONSTELLATION_MYTHS: Record<string, { myth: string; science: string }> = {
  'Orion':       { myth: 'The great hunter of Greek mythology, placed in the sky by Zeus after Scorpius slew him. His belt — three stars in a perfect row — has guided navigators for millennia.', science: 'Home to the Orion Nebula (M42), a stellar nursery 1,344 light-years away actively forming new stars. Betelgeuse, its red supergiant shoulder, may explode as a supernova within the next 100,000 years.' },
  'Taurus':      { myth: 'Zeus himself disguised as a white bull to win the heart of Europa. The Pleiades within it are seven sisters transformed into stars to escape the hunter Orion.', science: 'Contains the Pleiades open cluster (410 light-years) and the Hyades, the nearest open cluster to Earth. Aldebaran, the red giant at its eye, is 65 light-years away.' },
  'Gemini':      { myth: 'The immortal twins Castor and Pollux — one mortal, one divine — chose to share eternity by spending alternate days in the heavens and the underworld.', science: 'Castor is actually a sextuple star system — six stars in gravitational partnership. The Geminid meteor shower radiates from this constellation each December.' },
  'Leo':         { myth: 'The Nemean Lion, whose impenetrable hide made it impossible to kill with any weapon. Heracles strangled it with bare hands as his first labor. Zeus set it among the stars as a monument to the feat.', science: 'Regulus, Leo\'s brightest star, is one of the fastest-spinning stars known — completing a rotation in about 15.9 hours. It sits almost exactly on the ecliptic.' },
  'Virgo':       { myth: 'Demeter, goddess of harvest, grieving for her daughter Persephone. The wheat sheaf she holds (marked by bright Spica) explains why her seasons brought both abundance and barrenness.', science: 'Spica is a binary system whose gravitational interaction allowed astronomers to calculate Earth\'s axial precession. The Virgo Cluster contains over 1,300 galaxies.' },
  'Scorpius':    { myth: 'The great scorpion sent by Gaia to slay Orion. Even in death they are kept apart — when Scorpius rises in the east, Orion sets in the west, forever fleeing.', science: 'Antares, its red heart, is a supergiant 700 times the diameter of the Sun. If placed at the center of our solar system, it would engulf Mars.' },
  'Sagittarius': { myth: 'Chiron, wisest of the centaurs, teacher of Achilles, Jason, and Asclepius. His arrow points directly toward the center of the Milky Way galaxy.', science: 'The galactic center lies in this direction — the densest region of stars in the night sky. The Sagittarius Star Cloud contains billions of stars too close together to resolve individually.' },
  'Canis Major': { myth: 'Laelaps, the magical dog who was fated to catch anything it hunted — placed in the stars when Zeus turned it and its quarry to stone to end an impossible paradox.', science: 'Home to Sirius, the brightest star in the night sky at −1.46 magnitude. It is only 8.6 light-years away — practically a neighbour on cosmic scales.' },
  'Boötes':      { myth: 'Arcas, son of Zeus and Callisto. He nearly slew his own mother (transformed into a bear) while hunting — Zeus placed them both in the sky as Ursa Major and Boötes.', science: 'Arcturus is the third-brightest star and the brightest in the northern sky — 37 light-years away, a red giant 25 times larger than the Sun.' },
  'Hercules':    { myth: 'The great hero Heracles, whose twelve labors demonstrated that divinity could be earned through strength and perseverance — a model for mortal aspiration.', science: 'Contains M13, the Great Hercules Globular Cluster — 300,000 stars packed into a sphere 145 light-years across, 22,000 light-years away.' },
  'Cygnus':      { myth: 'Zeus disguised as a swan to court Leda, giving rise to the legend of Castor and Pollux. Some traditions identify it with Orpheus, placed among the stars after his death.', science: 'Cygnus X-1 was the first black hole candidate ever identified. Deneb is one of the most luminous stars known — if placed where Vega is, it would cast shadows at night.' },
  'Aquila':      { myth: 'The eagle of Zeus, who carried Ganymede to Olympus to serve as cup-bearer to the gods — and who also delivered the thunderbolts of the king of gods.', science: 'Altair, its alpha star, rotates so rapidly (once per 9 hours) that it bulges noticeably at its equator — wider than it is tall by about 20%.' },
  'Pegasus':     { myth: 'The winged horse who sprang from the blood of Medusa when Perseus slew her. He bore the hero Bellerophon on his quest to kill the Chimera.', science: 'The Great Square of Pegasus is a giant near-empty asterism — each side spans about 15 degrees. 51 Pegasi within its bounds was the first Sun-like star found with an exoplanet.' },
  'Andromeda':   { myth: 'Princess of Ethiopia, chained as sacrifice to Poseidon\'s sea monster — freed by Perseus, who used Medusa\'s head to turn the beast to stone.', science: 'The Andromeda Galaxy (M31) is 2.537 million light-years away and the most distant object visible to the naked eye. It is on a collision course with the Milky Way, due to merge in ~4.5 billion years.' },
  'Perseus':     { myth: 'The great hero who slew Medusa, rescued Andromeda, and founded the city of Mycenae. His sandals, gifted by Hermes, let him fly above the reach of monsters.', science: 'Algol — "the Demon Star" — is an eclipsing binary that dims noticeably every 2.87 days as the larger, dimmer star passes in front. Ancient astronomers noticed its winking and thought it ominous.' },
  'Cassiopeia':  { myth: 'The vain queen of Ethiopia who boasted her beauty surpassed the sea nymphs. Poseidon set her in the sky, circling the pole so she hangs upside down as punishment half the year.', science: 'The W or M shape traces the arm of the Milky Way. Tycho Brahe\'s supernova of 1572 blazed here — he used it to prove the heavens could change, overthrowing centuries of Aristotelian belief.' },
  'Capricornus': { myth: 'Pan transformed himself into a goat-fish to escape the monster Typhon, diving into the Nile River. Zeus commemorated the clever escape by placing Pan\'s form among the stars.', science: 'One of the faintest of the zodiac constellations, with no stars brighter than magnitude 2.9. It is one of the oldest recognized constellations — depicted in Babylonian astronomical tablets from 1000 BCE.' },
  'Cancer':      { myth: 'A humble crab sent by Hera to distract Heracles during his battle with the Lernaean Hydra. Though the crab was crushed underfoot, Hera honored its loyalty with a place in the stars.', science: 'Home to the Beehive Cluster (M44) — an open cluster of over 1,000 stars visible to the naked eye in dark skies. The Sun will pass near it in about 1.5 million years.' },
  'Auriga':      { myth: 'Erichthonius, the legendary king of Athens who first tamed horses to pull a chariot — honoring the art of driving with a place among the eternal stars.', science: 'Capella is actually four stars in two binary pairs. It is the sixth-brightest star in the sky and the nearest giant star system to Earth, at just 43 light-years.' },
};

function getConstellationInfo(name: string) {
  return CONSTELLATION_MYTHS[name] ?? {
    myth: `${name} has been recognized since antiquity, woven into the myths and navigation of ancient peoples across the world.`,
    science: `${name} contains stars at varying distances forming a recognizable pattern that has guided observers for thousands of years.`,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SkyTonightPage() {
  const [, navigate] = useLocation();
  const { mode } = useAppMode();

  const now = new Date();
  const moon = getMoonPhase(now);
  const season = getSunSign(now);
  const constellations = getTonightsConstellations(now);
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const moonMeaning = mode === 'mystic' ? MOON_MYSTIC[moon.phase] : MOON_SCIENCE[moon.phase];

  function askOracle() {
    sessionStorage.setItem('chatPrefill', `Tell me about tonight's sky — the ${moon.phase} moon, ${season.sign} season, and what's visible tonight`);
    navigate('/');
  }

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden font-sans text-white">
      <Starfield mode={mode} />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: mode === 'mystic'
            ? 'radial-gradient(ellipse at top, rgba(30,64,175,0.22), transparent 55%)'
            : 'radial-gradient(ellipse at top, rgba(30,64,175,0.25), transparent 55%)',
        }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-background/60 to-background" />

      <div className="relative z-10 overflow-y-auto h-[100dvh] pb-28" style={{ paddingTop: 52 }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/discover')}
            className="w-8 h-8 flex items-center justify-center rounded-full text-white/50"
            style={{ background: 'rgba(18,18,28,0.5)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <ArrowLeft size={14} />
          </motion.button>
          <div>
            <p className="text-[9.5px] uppercase tracking-[1.8px] text-blue-400 font-semibold">Tonight's Sky</p>
            <p className="text-[11px] text-white/40">{dateLabel}</p>
          </div>
        </div>

        {/* ── Moon Phase ────────────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mx-3 mt-3 rounded-2xl p-5"
          style={{ background: 'rgba(18,18,28,0.55)', border: '1px solid rgba(59,130,246,0.20)' }}
        >
          <p className="text-[9.5px] uppercase tracking-[1.8px] text-blue-400/80 font-semibold mb-3">Moon Phase</p>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-6xl leading-none">{moon.emoji}</span>
            <div>
              <h2 className="font-serif text-2xl text-white font-semibold">{moon.phase}</h2>
              <p className="text-sm text-white/50 mt-0.5">{moon.illumination}% illuminated</p>
              {/* Illumination bar */}
              <div className="w-32 h-1 rounded-full bg-white/10 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${moon.illumination}%`, background: 'linear-gradient(90deg, #93c5fd, #bfdbfe)' }}
                />
              </div>
            </div>
          </div>
          <p className="text-sm text-white/65 leading-relaxed">{moonMeaning}</p>
        </motion.section>

        {/* ── Sun Sign Season ───────────────────────────── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mx-3 mt-3 rounded-2xl p-5"
          style={{ background: 'rgba(18,18,28,0.55)', border: '1px solid rgba(167,139,250,0.20)' }}
        >
          <p className="text-[9.5px] uppercase tracking-[1.8px] text-purple-400/80 font-semibold mb-3">Sun Sign Season</p>
          <div className="flex items-center gap-4 mb-3">
            <span className="text-5xl leading-none">{season.symbol}</span>
            <div>
              <h2 className="font-serif text-xl text-white font-semibold">{season.sign} Season</h2>
              <p className="text-xs text-white/45 mt-0.5">{season.dates}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Element', value: season.element },
              { label: 'Modality', value: season.modality },
              { label: 'Ruler', value: season.ruler },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-2.5 text-center"
                style={{ background: 'rgba(107,33,168,0.15)', border: '1px solid rgba(107,33,168,0.20)' }}
              >
                <p className="text-[9px] uppercase tracking-wider text-white/35 mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-white/85">{value}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-white/65 leading-relaxed italic font-serif mb-3">"{season.tagline}"</p>

          {mode === 'mystic' && (
            <div
              className="rounded-xl p-3 mt-1"
              style={{ background: 'rgba(107,33,168,0.12)', border: '1px solid rgba(167,139,250,0.15)' }}
            >
              <p className="text-[10px] uppercase tracking-wider text-purple-400/70 mb-1.5">Mythology</p>
              <p className="text-xs text-white/60 leading-relaxed">{season.myth}</p>
            </div>
          )}

          {mode === 'science' && (
            <div className="flex items-center gap-2 mt-2">
              <span
                className="px-2.5 py-1 rounded-full text-[10.5px] font-medium"
                style={{ background: 'rgba(107,33,168,0.20)', color: 'rgba(196,181,253,0.85)' }}
              >
                {season.keyword}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-[10.5px] font-medium"
                style={{ background: 'rgba(107,33,168,0.20)', color: 'rgba(196,181,253,0.85)' }}
              >
                Birthstone · {season.stone}
              </span>
            </div>
          )}
        </motion.section>

        {/* ── Tonight's Constellations ──────────────────── */}
        <div className="px-3 mt-4 mb-1">
          <p className="text-[10px] uppercase tracking-[1.4px] text-white/40 font-semibold px-1">Featured Tonight</p>
        </div>

        {constellations.map((c, i) => {
          const info = getConstellationInfo(c.name);
          return (
            <motion.section
              key={c.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.08 }}
              className="mx-3 mt-2 rounded-2xl p-5"
              style={{ background: 'rgba(18,18,28,0.55)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-[9.5px] uppercase tracking-[1.8px] text-blue-400/70 font-semibold">Constellation</p>
                  <h3 className="font-serif text-xl text-white font-semibold mt-0.5">{c.name}</h3>
                </div>
                <span className="text-blue-400/50 text-2xl leading-none mt-1">✦</span>
              </div>

              <div
                className="rounded-xl px-3 py-2.5 mb-3"
                style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.15)' }}
              >
                <p className="text-[10px] text-blue-300/70 uppercase tracking-wider mb-0.5">Visible tonight</p>
                <p className="text-sm text-white/75 leading-snug">{c.highlight}</p>
              </div>

              <p className="text-sm text-white/60 leading-relaxed">
                {mode === 'mystic' ? info.myth : info.science}
              </p>
            </motion.section>
          );
        })}

        {/* ── Ask Oracle ────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="px-3 mt-4"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={askOracle}
            className="w-full py-3.5 px-5 rounded-2xl flex items-center justify-between text-left"
            style={{
              background: 'radial-gradient(ellipse at left, rgba(107,33,168,0.30), rgba(18,18,28,0.55))',
              border: '1px solid rgba(167,139,250,0.25)',
              boxShadow: '0 0 30px rgba(107,33,168,0.15)',
            }}
          >
            <div>
              <p className="text-xs text-white font-semibold">Ask the Oracle about tonight</p>
              <p className="text-[10.5px] text-white/45 mt-0.5">Go deeper on the moon, the stars, and the season</p>
            </div>
            <Sparkles size={16} className="text-purple-400 shrink-0 ml-3" />
          </motion.button>
        </motion.div>

      </div>
    </div>
  );
}
