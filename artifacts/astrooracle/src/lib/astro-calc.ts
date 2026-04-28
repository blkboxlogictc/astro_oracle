// ── Moon phase ─────────────────────────────────────────────────────────────

const KNOWN_NEW_MOON = new Date("2025-01-29T12:36:00Z");
const SYNODIC_MONTH  = 29.530588853;

export function getMoonPhase(date: Date = new Date()) {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON.getTime()) / 86_400_000;
  const fraction  = (((daysSince % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH) / SYNODIC_MONTH;
  const illumination = Math.round((0.5 - 0.5 * Math.cos(fraction * 2 * Math.PI)) * 100);

  const phases = [
    { max: 0.0625, phase: "New Moon",        emoji: "🌑" },
    { max: 0.1875, phase: "Waxing Crescent", emoji: "🌒" },
    { max: 0.3125, phase: "First Quarter",   emoji: "🌓" },
    { max: 0.4375, phase: "Waxing Gibbous",  emoji: "🌔" },
    { max: 0.5625, phase: "Full Moon",        emoji: "🌕" },
    { max: 0.6875, phase: "Waning Gibbous",  emoji: "🌖" },
    { max: 0.8125, phase: "Last Quarter",    emoji: "🌗" },
    { max: 0.9375, phase: "Waning Crescent", emoji: "🌘" },
    { max: 1.0,    phase: "New Moon",        emoji: "🌑" },
  ];

  const { phase, emoji } = phases.find(p => fraction < p.max)!;
  return { phase, emoji, illumination, fraction };
}

// ── Zodiac sign data ───────────────────────────────────────────────────────

export type ZodiacSign = {
  sign: string;
  symbol: string;
  dates: string;
  element: "Fire" | "Earth" | "Air" | "Water";
  modality: "Cardinal" | "Fixed" | "Mutable";
  ruler: string;
  stone: string;
  keyword: string;
  tagline: string;
  myth: string;
  elementColor: string;
};

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { sign: "Aries",       symbol: "♈", dates: "Mar 21–Apr 19", element: "Fire",  modality: "Cardinal", ruler: "Mars",    stone: "Diamond",   keyword: "I AM",      tagline: "The trailblazer who turns courage into creation",       myth: "The golden ram whose fleece Jason sought in the stars",             elementColor: "#ef4444" },
  { sign: "Taurus",      symbol: "♉", dates: "Apr 20–May 20", element: "Earth", modality: "Fixed",    ruler: "Venus",   stone: "Emerald",   keyword: "I HAVE",    tagline: "The builder whose patience shapes mountains into gardens", myth: "Zeus disguised as a bull to carry Europa across the sea",            elementColor: "#22c55e" },
  { sign: "Gemini",      symbol: "♊", dates: "May 21–Jun 20", element: "Air",   modality: "Mutable",  ruler: "Mercury", stone: "Agate",     keyword: "I THINK",   tagline: "The messenger who bridges worlds with words and wonder",   myth: "Twin brothers Castor and Pollux, sons of Zeus and a mortal",        elementColor: "#facc15" },
  { sign: "Cancer",      symbol: "♋", dates: "Jun 21–Jul 22", element: "Water", modality: "Cardinal", ruler: "Moon",    stone: "Moonstone", keyword: "I FEEL",    tagline: "The guardian whose heart holds the tides of memory",      myth: "The crab sent by Hera to distract Heracles — honored in the sky",   elementColor: "#60a5fa" },
  { sign: "Leo",         symbol: "♌", dates: "Jul 23–Aug 22", element: "Fire",  modality: "Fixed",    ruler: "Sun",     stone: "Peridot",   keyword: "I WILL",    tagline: "The sovereign who illuminates every room they enter",      myth: "The Nemean Lion, slain by Heracles as his first great labor",       elementColor: "#ef4444" },
  { sign: "Virgo",       symbol: "♍", dates: "Aug 23–Sep 22", element: "Earth", modality: "Mutable",  ruler: "Mercury", stone: "Sapphire",  keyword: "I ANALYZE", tagline: "The healer who finds the sacred in every small detail",   myth: "Demeter weeping for Persephone — the harvest and the void",         elementColor: "#22c55e" },
  { sign: "Libra",       symbol: "♎", dates: "Sep 23–Oct 22", element: "Air",   modality: "Cardinal", ruler: "Venus",   stone: "Opal",      keyword: "I BALANCE", tagline: "The diplomat who weighs truth on the scales of the soul",  myth: "Dike, goddess of justice, whose scales weigh mortal hearts",        elementColor: "#facc15" },
  { sign: "Scorpio",     symbol: "♏", dates: "Oct 23–Nov 21", element: "Water", modality: "Fixed",    ruler: "Pluto",   stone: "Topaz",     keyword: "I DESIRE",  tagline: "The alchemist who transforms shadow into gold",           myth: "The great scorpion sent by Gaia to defeat the mighty Orion",        elementColor: "#60a5fa" },
  { sign: "Sagittarius", symbol: "♐", dates: "Nov 22–Dec 21", element: "Fire",  modality: "Mutable",  ruler: "Jupiter", stone: "Turquoise", keyword: "I SEE",     tagline: "The philosopher whose arrow always aims at the horizon",   myth: "Chiron the wise centaur, teacher of heroes and healer of wounds",   elementColor: "#ef4444" },
  { sign: "Capricorn",   symbol: "♑", dates: "Dec 22–Jan 19", element: "Earth", modality: "Cardinal", ruler: "Saturn",  stone: "Garnet",    keyword: "I USE",     tagline: "The mountain-climber who turns vision into legacy",        myth: "Pan transformed into a sea-goat to escape Typhon — and survived",   elementColor: "#22c55e" },
  { sign: "Aquarius",    symbol: "♒", dates: "Jan 20–Feb 18", element: "Air",   modality: "Fixed",    ruler: "Uranus",  stone: "Amethyst",  keyword: "I KNOW",    tagline: "The visionary who pours wisdom to quench a thirsty world", myth: "Ganymede, the beautiful youth lifted by Zeus to serve the gods",    elementColor: "#facc15" },
  { sign: "Pisces",      symbol: "♓", dates: "Feb 19–Mar 20", element: "Water", modality: "Mutable",  ruler: "Neptune", stone: "Aquamarine",keyword: "I BELIEVE", tagline: "The mystic who swims between the dream and the divine",   myth: "Aphrodite and Eros, who leapt into the river as fish to escape Typhon", elementColor: "#60a5fa" },
];

export function getSunSign(date: Date): ZodiacSign {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return ZODIAC_SIGNS[0];
  if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return ZODIAC_SIGNS[1];
  if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return ZODIAC_SIGNS[2];
  if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return ZODIAC_SIGNS[3];
  if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return ZODIAC_SIGNS[4];
  if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return ZODIAC_SIGNS[5];
  if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return ZODIAC_SIGNS[6];
  if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return ZODIAC_SIGNS[7];
  if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return ZODIAC_SIGNS[8];
  if ((m === 12 && d >= 22) || (m === 1 && d <= 19))  return ZODIAC_SIGNS[9];
  if ((m === 1 && d >= 20)  || (m === 2 && d <= 18))  return ZODIAC_SIGNS[10];
  return ZODIAC_SIGNS[11];
}

// ── Tonight's visible constellations (approximate, Northern Hemisphere) ─────

const MONTHLY_SKY: Record<number, Array<{ name: string; highlight: string }>> = {
  1:  [{ name: "Orion",        highlight: "The Hunter blazes across the winter sky" },
       { name: "Taurus",       highlight: "The Pleiades cluster glitters at naked eye" },
       { name: "Gemini",       highlight: "Twin stars Castor & Pollux shine together" }],
  2:  [{ name: "Orion",        highlight: "Betelgeuse glows red in the south-west" },
       { name: "Canis Major",  highlight: "Sirius — brightest star — blazes in the south" },
       { name: "Leo",          highlight: "The Lion rises in the east after midnight" }],
  3:  [{ name: "Leo",          highlight: "Regulus marks the Lion's heart overhead" },
       { name: "Cancer",       highlight: "The Beehive Cluster (M44) awaits binoculars" },
       { name: "Virgo",        highlight: "Spica rises blue-white in the east" }],
  4:  [{ name: "Virgo",        highlight: "Spica at its best — a hot blue-white star" },
       { name: "Leo",          highlight: "Regulus and the sickle high in the south" },
       { name: "Boötes",       highlight: "Arcturus — 'the Bear Watcher' — rises" }],
  5:  [{ name: "Boötes",       highlight: "Arcturus blazes brilliant orange in the south" },
       { name: "Virgo",        highlight: "Galaxy season: M87, M84, M86 in reach" },
       { name: "Scorpius",     highlight: "Rising low in the south-east after midnight" }],
  6:  [{ name: "Scorpius",     highlight: "Antares burns ruddy red in the south" },
       { name: "Sagittarius",  highlight: "The galactic core glows along the horizon" },
       { name: "Hercules",     highlight: "Great Globular Cluster M13 is at its best" }],
  7:  [{ name: "Sagittarius",  highlight: "The Milky Way's heart blazes in the south" },
       { name: "Scorpius",     highlight: "Antares and the Scorpion dominate" },
       { name: "Cygnus",       highlight: "The Northern Cross flies overhead" }],
  8:  [{ name: "Cygnus",       highlight: "Deneb crowns the Summer Triangle overhead" },
       { name: "Aquila",       highlight: "Altair — the eagle's eye — blazes" },
       { name: "Sagittarius",  highlight: "Rich star clouds and nebulae reward binoculars" }],
  9:  [{ name: "Pegasus",      highlight: "The Great Square rises in the east" },
       { name: "Andromeda",    highlight: "The Andromeda Galaxy (M31) is faintly visible" },
       { name: "Capricornus",  highlight: "The Sea Goat crosses the southern sky" }],
  10: [{ name: "Andromeda",    highlight: "M31 is highest — 2.5 million light-years away" },
       { name: "Perseus",      highlight: "Algol the 'Demon Star' winks every 2.87 days" },
       { name: "Aries",        highlight: "The Ram — first sign of the zodiac — rises" }],
  11: [{ name: "Taurus",       highlight: "The Pleiades rise early — winter approaching" },
       { name: "Perseus",      highlight: "Perseids' parent — Perseus guards the Pleiades" },
       { name: "Cassiopeia",   highlight: "The 'W' queen blazes overhead in the Milky Way" }],
  12: [{ name: "Orion",        highlight: "The Hunter returns — the year completes" },
       { name: "Gemini",       highlight: "Geminid meteors peak mid-month" },
       { name: "Auriga",       highlight: "Capella — a yellow giant — blazes at zenith" }],
};

export function getTonightsConstellations(date: Date = new Date()) {
  return MONTHLY_SKY[date.getMonth() + 1] ?? MONTHLY_SKY[1];
}

// ── Share helper ───────────────────────────────────────────────────────────

export async function shareOrCopy(title: string, text: string): Promise<"shared" | "copied"> {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch { /* user cancelled or API unavailable */ }
  }
  await navigator.clipboard.writeText(text);
  return "copied";
}
