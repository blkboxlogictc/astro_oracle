/**
 * AstroOracle — Mystic Knowledge Base Builder
 * =============================================
 * Builds three new knowledge pillars for the mystic/astrology mode:
 *   - astrology  (zodiac signs, houses, planets, aspects, topics)
 *   - mythology  (Greek myths, cross-cultural star lore)
 *   - spirituality (moon phases, crystals, sacred geometry, etc.)
 *
 * Run: npm run build-mystic
 * Then: npm run load   (to upload to Supabase)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'knowledge-base');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function fetchWikipedia(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'AstroOracle-KnowledgeBuilder/1.0 (astroracle-app)' },
  });
  if (!res.ok) throw new Error(`Wikipedia ${res.status} for "${title}"`);
  return res.json();
}

async function fetchWikipediaWithFallback(primaryTitle, fallbackTitle) {
  try {
    return await fetchWikipedia(primaryTitle);
  } catch {
    log(`  ↳ Fallback: trying "${fallbackTitle}"`);
    return await fetchWikipedia(fallbackTitle);
  }
}

function saveDoc(pillar, doc) {
  const dir = path.join(OUTPUT_DIR, pillar);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${doc.id}.json`), JSON.stringify(doc, null, 2));
}

function makeDoc({ id, pillar, type, title, tags, summary, scientific, metadata = {}, related_topics = [], sources = [] }) {
  return {
    id,
    pillar,
    type,
    title,
    tags,
    summary,
    content: { scientific },
    metadata,
    related_topics,
    sources,
    content_license: 'CC BY-SA 4.0',
    generated_at: new Date().toISOString(),
  };
}

// ─── PILLAR 1: ASTROLOGY ──────────────────────────────────────────────────────

const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', dates: 'March 21 – April 19', element: 'Fire', modality: 'Cardinal', ruler: 'Mars', wikiTitle: 'Aries (astrology)' },
  { name: 'Taurus', symbol: '♉', dates: 'April 20 – May 20', element: 'Earth', modality: 'Fixed', ruler: 'Venus', wikiTitle: 'Taurus (astrology)' },
  { name: 'Gemini', symbol: '♊', dates: 'May 21 – June 20', element: 'Air', modality: 'Mutable', ruler: 'Mercury', wikiTitle: 'Gemini (astrology)' },
  { name: 'Cancer', symbol: '♋', dates: 'June 21 – July 22', element: 'Water', modality: 'Cardinal', ruler: 'Moon', wikiTitle: 'Cancer (astrology)' },
  { name: 'Leo', symbol: '♌', dates: 'July 23 – August 22', element: 'Fire', modality: 'Fixed', ruler: 'Sun', wikiTitle: 'Leo (astrology)' },
  { name: 'Virgo', symbol: '♍', dates: 'August 23 – September 22', element: 'Earth', modality: 'Mutable', ruler: 'Mercury', wikiTitle: 'Virgo (astrology)' },
  { name: 'Libra', symbol: '♎', dates: 'September 23 – October 22', element: 'Air', modality: 'Cardinal', ruler: 'Venus', wikiTitle: 'Libra (astrology)' },
  { name: 'Scorpio', symbol: '♏', dates: 'October 23 – November 21', element: 'Water', modality: 'Fixed', ruler: 'Pluto/Mars', wikiTitle: 'Scorpio (astrology)' },
  { name: 'Sagittarius', symbol: '♐', dates: 'November 22 – December 21', element: 'Fire', modality: 'Mutable', ruler: 'Jupiter', wikiTitle: 'Sagittarius (astrology)' },
  { name: 'Capricorn', symbol: '♑', dates: 'December 22 – January 19', element: 'Earth', modality: 'Cardinal', ruler: 'Saturn', wikiTitle: 'Capricorn (astrology)' },
  { name: 'Aquarius', symbol: '♒', dates: 'January 20 – February 18', element: 'Air', modality: 'Fixed', ruler: 'Uranus/Saturn', wikiTitle: 'Aquarius (astrology)' },
  { name: 'Pisces', symbol: '♓', dates: 'February 19 – March 20', element: 'Water', modality: 'Mutable', ruler: 'Neptune/Jupiter', wikiTitle: 'Pisces (astrology)' },
];

const ASTROLOGICAL_HOUSES = [
  { number: 1, name: 'House of Self', keywords: 'identity, appearance, first impressions, the Ascendant', naturalSign: 'Aries', naturalRuler: 'Mars' },
  { number: 2, name: 'House of Possessions', keywords: 'money, values, material security, self-worth', naturalSign: 'Taurus', naturalRuler: 'Venus' },
  { number: 3, name: 'House of Communication', keywords: 'siblings, short trips, learning, writing, local community', naturalSign: 'Gemini', naturalRuler: 'Mercury' },
  { number: 4, name: 'House of Home', keywords: 'family, roots, ancestry, the IC, private life', naturalSign: 'Cancer', naturalRuler: 'Moon' },
  { number: 5, name: 'House of Pleasure', keywords: 'creativity, romance, children, play, self-expression', naturalSign: 'Leo', naturalRuler: 'Sun' },
  { number: 6, name: 'House of Health', keywords: 'daily routines, service, health, work environment', naturalSign: 'Virgo', naturalRuler: 'Mercury' },
  { number: 7, name: 'House of Partnerships', keywords: 'marriage, contracts, open enemies, the Descendant', naturalSign: 'Libra', naturalRuler: 'Venus' },
  { number: 8, name: 'House of Transformation', keywords: 'death, rebirth, shared resources, sexuality, the occult', naturalSign: 'Scorpio', naturalRuler: 'Pluto' },
  { number: 9, name: 'House of Philosophy', keywords: 'higher education, travel, religion, law, beliefs', naturalSign: 'Sagittarius', naturalRuler: 'Jupiter' },
  { number: 10, name: 'House of Career', keywords: 'public life, career, reputation, the Midheaven (MC)', naturalSign: 'Capricorn', naturalRuler: 'Saturn' },
  { number: 11, name: 'House of Friends', keywords: 'friendships, groups, hopes, social causes, technology', naturalSign: 'Aquarius', naturalRuler: 'Uranus' },
  { number: 12, name: 'House of the Unconscious', keywords: 'hidden matters, karma, spiritual retreats, self-undoing', naturalSign: 'Pisces', naturalRuler: 'Neptune' },
];

const ASTRO_PLANETS = [
  { name: 'Sun in Astrology', slug: 'astrology-sun', title: 'The Sun in Astrology', tags: ['sun', 'astrology', 'planets', 'solar', 'ego', 'identity'], summary: 'In astrology the Sun represents ego, identity, vitality, and conscious self-expression. It spends approximately one month in each zodiac sign.', scientific: 'In astrology, the Sun is the central luminary representing the core self, ego, and conscious identity. It governs vitality, willpower, and creative life force. The Sun sign — determined by which zodiac sign the Sun occupied at birth — is the most commonly known placement in a natal chart. It spends approximately 30 days in each of the 12 zodiac signs. The Sun rules Leo and is associated with the 5th house. It symbolizes the father, authority, and the hero\'s journey in mythological traditions.' },
  { name: 'Moon in Astrology', slug: 'astrology-moon', title: 'The Moon in Astrology', tags: ['moon', 'astrology', 'planets', 'emotions', 'intuition'], summary: 'In astrology the Moon governs emotions, instincts, subconscious patterns, and the mother archetype. It changes zodiac signs roughly every 2.5 days.', scientific: 'In astrology, the Moon is the fastest-moving luminary, changing signs approximately every 2.5 days. It governs emotions, instincts, memory, habit, and the subconscious mind. The Moon sign in a natal chart reveals how a person processes feelings and experiences emotional security. It rules Cancer and is associated with the 4th house. The Moon is linked to the mother, nurturing, and cyclical rhythms — its phases are central to moon phase astrology and ritual timing.' },
  { name: 'Mercury in Astrology', slug: 'astrology-mercury', title: 'Mercury in Astrology', tags: ['mercury', 'astrology', 'planets', 'communication', 'intellect'], summary: 'Mercury governs communication, logic, travel, and information processing in astrology. Mercury retrograde is one of the most widely discussed astrological events.', scientific: 'Mercury is the planet of communication, intellect, and information in astrology. It governs how we think, speak, write, and process data. Mercury co-rules both Gemini (Air, communication) and Virgo (Earth, analysis). In a natal chart, Mercury\'s sign and house placement describe mental style and communicative tendencies. Mercury retrograde — occurring roughly three times per year for about three weeks — is associated in astrological tradition with miscommunications, technology glitches, and revisiting past matters.' },
  { name: 'Venus in Astrology', slug: 'astrology-venus', title: 'Venus in Astrology', tags: ['venus', 'astrology', 'planets', 'love', 'beauty', 'values'], summary: 'Venus rules love, beauty, pleasure, and relationships in astrology. It governs what we find attractive and how we express affection.', scientific: 'Venus is the planet of love, beauty, harmony, and values in astrology. It governs attraction, romantic partnerships, aesthetics, and financial attitudes. Venus rules both Taurus (sensual pleasure, material security) and Libra (balance, partnership). In a natal chart, Venus placement reveals relationship style, what one finds beautiful, and how one expresses love. Venus retrograde, occurring every 18 months, is associated with revisiting past relationships and reassessing values.' },
  { name: 'Mars in Astrology', slug: 'astrology-mars', title: 'Mars in Astrology', tags: ['mars', 'astrology', 'planets', 'action', 'drive', 'passion'], summary: 'Mars governs drive, ambition, aggression, and physical energy in astrology. It is the planet of action and desire.', scientific: 'Mars is the planet of action, drive, desire, and assertiveness in astrology. It governs how we pursue goals, express anger, and channel physical energy. Mars is the traditional ruler of Aries and the co-ruler (with Pluto) of Scorpio. In a natal chart, Mars placement indicates fighting style, sexual drive, and areas of ambition. Mars cycles through the zodiac in about two years and goes retrograde roughly every 26 months.' },
  { name: 'Jupiter in Astrology', slug: 'astrology-jupiter', title: 'Jupiter in Astrology', tags: ['jupiter', 'astrology', 'planets', 'expansion', 'luck', 'abundance'], summary: 'Jupiter is the planet of expansion, luck, wisdom, and abundance. It spends about one year in each zodiac sign.', scientific: 'Jupiter is the largest planet and in astrology represents expansion, abundance, philosophy, and good fortune. It rules Sagittarius and is the traditional co-ruler of Pisces. Jupiter transits each zodiac sign for approximately one year, completing a full cycle in about 12 years. In a natal chart it reveals where growth, optimism, and opportunity flow most naturally. Jupiter return — when Jupiter returns to its natal position around age 12, 24, 36 — is seen as a marker of new growth cycles.' },
  { name: 'Saturn in Astrology', slug: 'astrology-saturn', title: 'Saturn in Astrology', tags: ['saturn', 'astrology', 'planets', 'karma', 'discipline', 'lessons'], summary: 'Saturn is the planet of karma, discipline, and life lessons. The Saturn return at age 29 is one of the most significant astrological milestones.', scientific: 'Saturn is the planet of structure, discipline, karma, and limitation in astrology. It rules Capricorn and is the traditional co-ruler of Aquarius. Saturn\'s cycle takes approximately 29.5 years, making the Saturn return (ages 28–30, 58–60, 88–90) a major life milestone in astrological tradition. In a natal chart, Saturn\'s placement reveals karmic lessons, areas requiring hard work, and where one must build resilience. Saturn is associated with the archetype of the wise elder, time, and earned achievement.' },
  { name: 'Uranus in Astrology', slug: 'astrology-uranus', title: 'Uranus in Astrology', tags: ['uranus', 'astrology', 'planets', 'revolution', 'innovation', 'change'], summary: 'Uranus governs sudden change, revolution, technology, and awakening. It spends about 7 years in each sign and rules Aquarius.', scientific: 'Uranus is the planet of sudden change, rebellion, innovation, and awakening in astrology. Discovered in 1781, it rules Aquarius and is associated with modernity, technology, humanitarianism, and disruption of the status quo. Uranus spends approximately 7 years in each zodiac sign, making generational shifts. The Uranus opposition (around age 42) corresponds to the classic midlife re-evaluation. In a natal chart it shows where unconventional energy and breakthrough potential are strongest.' },
  { name: 'Neptune in Astrology', slug: 'astrology-neptune', title: 'Neptune in Astrology', tags: ['neptune', 'astrology', 'planets', 'dreams', 'spirituality', 'illusion'], summary: 'Neptune rules dreams, illusions, spirituality, and the collective unconscious. It spends about 14 years in each zodiac sign and rules Pisces.', scientific: 'Neptune is the planet of dreams, illusions, spirituality, and collective consciousness in astrology. Discovered in 1846, it rules Pisces and governs mysticism, compassion, deception, art, and transcendence. Neptune spends approximately 14 years in each sign, creating generation-wide themes. In a natal chart, Neptune\'s placement reveals where one is idealistic or prone to illusion, and where spiritual gifts may manifest. Neptune dissolves boundaries — for better or worse — in the areas it touches.' },
  { name: 'Pluto in Astrology', slug: 'astrology-pluto', title: 'Pluto in Astrology', tags: ['pluto', 'astrology', 'planets', 'transformation', 'power', 'rebirth'], summary: 'Pluto governs transformation, power, death, and rebirth. Though reclassified as a dwarf planet, it remains a major force in astrology.', scientific: 'Pluto is the planet of transformation, power, death, and rebirth in astrology. Discovered in 1930 and reclassified as a dwarf planet in 2006, it remains a major outer planet in astrological tradition. Pluto rules Scorpio and governs the underworld, shadow self, sexuality, obsession, and profound change. It spends 12–30 years in each sign (its orbit is elliptical), creating deep generational shifts. Pluto\'s transit to a natal planet is seen as one of the most intense and transformative influences possible.' },
];

const ASTRO_ASPECTS = [
  { name: 'Conjunction', degrees: 0, orb: 8, nature: 'Neutral (intensifying)', description: 'Two planets in the same position, merging their energies. The most powerful aspect — the planets\' themes blend intensely, for good or ill depending on the planets involved.' },
  { name: 'Opposition', degrees: 180, orb: 8, nature: 'Challenging (polarizing)', description: 'Planets directly across the zodiac wheel, creating tension and awareness. Represents polarities seeking balance — relationships often act as mirrors for these energies.' },
  { name: 'Trine', degrees: 120, orb: 8, nature: 'Harmonious (flowing)', description: 'Planets 120 degrees apart, sharing the same element (Fire, Earth, Air, or Water). Considered the most harmonious aspect, representing natural talents and ease.' },
  { name: 'Square', degrees: 90, orb: 7, nature: 'Challenging (dynamic)', description: 'Planets 90 degrees apart, in signs of the same modality (Cardinal, Fixed, or Mutable). Creates friction and challenge that drives growth and achievement through effort.' },
  { name: 'Sextile', degrees: 60, orb: 5, nature: 'Harmonious (opportunistic)', description: 'Planets 60 degrees apart, linking complementary elements. A gentler harmony than the trine — representing opportunities that require some effort to activate.' },
];

const ASTRO_TOPICS = [
  {
    id: 'astrology-western', title: 'Western Astrology', pillar: 'astrology', type: 'topic',
    tags: ['western astrology', 'astrology', 'zodiac', 'natal chart', 'tropical astrology'],
    summary: 'Western astrology is a divinatory tradition originating in ancient Babylon and Greece, based on the tropical zodiac and the positions of celestial bodies at the time of birth.',
    scientific: 'Western astrology is the dominant astrological tradition in Europe and the Americas. It is based on the tropical zodiac, which is tied to the seasons rather than the fixed stars — the zodiac begins with 0° Aries at the spring equinox. Originating in ancient Mesopotamia and developed by Greek and Hellenistic astronomers, it was systematized by Claudius Ptolemy in his 2nd-century work Tetrabiblos. Western astrology uses ten planets (plus asteroids and points), twelve zodiac signs, and twelve houses to interpret a natal chart.',
  },
  {
    id: 'astrology-vedic', title: 'Vedic Astrology (Jyotish)', pillar: 'astrology', type: 'topic',
    tags: ['vedic astrology', 'jyotish', 'sidereal astrology', 'india', 'nakshatras'],
    summary: 'Vedic astrology, or Jyotish, is the ancient Hindu astrological system based on the sidereal zodiac and is one of the oldest living astrological traditions in the world.',
    scientific: 'Jyotish (Sanskrit: "science of light") is the traditional Hindu astrological system dating back at least 5,000 years. Unlike Western astrology\'s tropical zodiac, Vedic astrology uses the sidereal zodiac aligned with fixed stars — creating an approximately 23-degree difference (the ayanamsha). Core concepts include the nine celestial bodies (navagrahas), twenty-seven or twenty-eight lunar mansions (nakshatras), the ascendant (lagna), and planetary periods (dashas). Vedic astrology is deeply integrated with Hindu religion, medicine (Ayurveda), and philosophy.',
  },
  {
    id: 'astrology-rising-sign', title: 'Rising Sign (Ascendant)', pillar: 'astrology', type: 'topic',
    tags: ['rising sign', 'ascendant', 'natal chart', 'first house', 'astrology'],
    summary: 'The rising sign or Ascendant is the zodiac sign that was on the eastern horizon at the exact moment of birth. It shapes outward appearance, first impressions, and the lens through which one experiences life.',
    scientific: 'The Ascendant (ASC), or rising sign, is one of the three most important points in a natal chart alongside the Sun and Moon. It is calculated using the exact time and location of birth. The Ascendant changes signs approximately every two hours as the Earth rotates. It governs the first house cusp, physical appearance, mannerisms, and how others perceive a person. The rising sign is the "mask" or social persona — the energy one projects before people know them well. In Vedic astrology the rising sign (lagna) is considered even more important than the Sun sign.',
  },
  {
    id: 'astrology-birth-chart', title: 'Birth Chart (Natal Chart)', pillar: 'astrology', type: 'topic',
    tags: ['birth chart', 'natal chart', 'astrology', 'horoscope', 'planets', 'houses'],
    summary: 'A birth chart is a map of the sky at the exact moment of a person\'s birth, showing the positions of the Sun, Moon, planets, and astrological points across the twelve zodiac signs and houses.',
    scientific: 'A natal chart (birth chart or horoscope) is a 360-degree map of the solar system as seen from Earth at the precise moment and location of birth. It is divided into twelve houses representing life domains, overlaid with twelve zodiac signs. Each planet occupies a sign and a house, and forms angular relationships (aspects) with other planets. Key chart points include the Ascendant, Midheaven (MC), IC, and Descendant. Interpreting a natal chart involves synthesizing hundreds of factors to understand personality, life themes, strengths, and challenges.',
  },
  {
    id: 'astrology-moon-sign', title: 'Moon Sign', pillar: 'astrology', type: 'topic',
    tags: ['moon sign', 'emotional nature', 'astrology', 'natal chart', 'subconscious'],
    summary: 'The Moon sign describes emotional nature, instinctive reactions, and subconscious patterns. It is the zodiac sign occupied by the Moon at the time of birth.',
    scientific: 'The Moon sign is determined by which zodiac sign the Moon occupied at the exact time of birth. Because the Moon changes signs every 2.5 days, the birth time must be known to calculate it accurately. In astrological interpretation, the Moon sign reveals the emotional inner world, habitual responses, deepest needs, and the relationship with the mother. While the Sun sign represents the conscious self, the Moon sign represents the unconscious self. Together with the rising sign, the Sun–Moon–Ascendant "trinity" forms the core of personality in most astrological schools.',
  },
  {
    id: 'astrology-mercury-retrograde', title: 'Mercury Retrograde', pillar: 'astrology', type: 'topic',
    tags: ['mercury retrograde', 'retrograde', 'communication', 'astrology', 'planets'],
    summary: 'Mercury retrograde occurs roughly three times a year when Mercury appears to move backward in the sky. In astrology it is associated with communication delays, technology issues, and revisiting the past.',
    scientific: 'Mercury retrograde is an optical illusion that occurs when Mercury appears to reverse course in the sky due to the relative orbital speeds of Earth and Mercury. It happens about three times per year for roughly 21 days each time. In astrological tradition, Mercury retrograde is associated with miscommunications, travel disruptions, technology failures, and revisiting unresolved matters from the past. Astrologers recommend caution with contracts, major decisions, and new starts during this period, and suggest using the time for revision, reflection, and reconnection.',
  },
  {
    id: 'astrology-saturn-return', title: 'Saturn Return', pillar: 'astrology', type: 'topic',
    tags: ['saturn return', 'saturn', 'astrology', 'life transitions', 'karma', 'coming of age'],
    summary: 'The Saturn return occurs when Saturn completes its 29.5-year orbit and returns to the exact position it occupied at birth — a major astrological milestone marking adulthood, responsibility, and life restructuring.',
    scientific: 'A Saturn return occurs approximately every 29.5 years when transiting Saturn conjuncts natal Saturn. The first return (ages 27–30) is widely recognized as a rite of passage into true adulthood — a period of reckoning with one\'s choices, life structure, and long-term direction. The second return (ages 57–60) prompts reflection on legacy and later-life purpose. Saturn returns often coincide with major life changes: career shifts, relationship endings or commitments, and identity restructuring. The process can feel challenging but is considered deeply productive in astrological tradition.',
  },
  {
    id: 'astrology-venus-retrograde', title: 'Venus Retrograde', pillar: 'astrology', type: 'topic',
    tags: ['venus retrograde', 'venus', 'retrograde', 'love', 'relationships', 'values'],
    summary: 'Venus retrograde occurs every 18 months for about 40 days. It is associated with revisiting past relationships, reassessing values, and reconsidering what we truly desire.',
    scientific: 'Venus retrograde occurs every 19–20 months for approximately 40–43 days. Of all the planets, Venus is retrograde the least often (about 7% of the time). When Venus goes retrograde it is astronomically closest to Earth and appears as the "Evening Star" transitioning to the "Morning Star." In astrological tradition, Venus retrograde is associated with revisiting past lovers and unresolved relationship matters, reassessing personal values and finances, and reconsidering what brings genuine pleasure. Major new romantic commitments or aesthetic overhauls are often advised against during this period.',
  },
];

// ─── PILLAR 2: MYTHOLOGY ──────────────────────────────────────────────────────

const MYTHOLOGY_TOPICS = [
  {
    wikiTitle: 'Orion (mythology)',
    id: 'myth-orion', pillar: 'mythology', type: 'myth',
    title: 'Orion — The Hunter of Greek Mythology',
    tags: ['orion', 'greek mythology', 'constellation myth', 'hunter', 'artemis', 'zeus'],
    related: ['constellation-orion'],
  },
  {
    wikiTitle: 'Ursa Major in mythology',
    fallback: 'Callisto (mythology)',
    id: 'myth-callisto-ursa-major', pillar: 'mythology', type: 'myth',
    title: 'Callisto and Ursa Major — The Great Bear',
    tags: ['callisto', 'ursa major', 'great bear', 'greek mythology', 'zeus', 'artemis'],
    related: ['constellation-ursa-major'],
  },
  {
    wikiTitle: 'Cassiopeia (mythology)',
    id: 'myth-cassiopeia', pillar: 'mythology', type: 'myth',
    title: 'Cassiopeia — The Vain Queen of Ethiopia',
    tags: ['cassiopeia', 'greek mythology', 'constellation myth', 'queen', 'perseus', 'andromeda'],
    related: ['constellation-cassiopeia'],
  },
  {
    wikiTitle: 'Perseus (mythology)',
    id: 'myth-perseus', pillar: 'mythology', type: 'myth',
    title: 'Perseus — The Hero Who Slew Medusa',
    tags: ['perseus', 'greek mythology', 'hero', 'medusa', 'andromeda', 'constellation'],
    related: ['constellation-perseus'],
  },
  {
    wikiTitle: 'Andromeda (mythology)',
    id: 'myth-andromeda', pillar: 'mythology', type: 'myth',
    title: 'Andromeda — The Chained Princess',
    tags: ['andromeda', 'greek mythology', 'princess', 'cetus', 'perseus', 'constellation'],
    related: ['constellation-andromeda'],
  },
  {
    wikiTitle: 'Scorpius (constellation)',
    id: 'myth-scorpius-orion', pillar: 'mythology', type: 'myth',
    title: 'Scorpius and Orion — Eternal Rivals in the Sky',
    tags: ['scorpius', 'orion', 'greek mythology', 'constellation myth', 'artemis', 'zeus'],
    related: ['constellation-scorpius', 'constellation-orion'],
  },
  {
    wikiTitle: 'Leo (constellation)',
    id: 'myth-leo-nemean-lion', pillar: 'mythology', type: 'myth',
    title: 'Leo — The Nemean Lion and Heracles',
    tags: ['leo', 'heracles', 'hercules', 'nemean lion', 'greek mythology', 'twelve labors'],
    related: ['constellation-leo'],
  },
  {
    wikiTitle: 'Taurus (constellation)',
    id: 'myth-taurus-zeus-pleiades', pillar: 'mythology', type: 'myth',
    title: 'Taurus — Zeus, Europa, and the Pleiades',
    tags: ['taurus', 'zeus', 'europa', 'pleiades', 'greek mythology', 'constellation'],
    related: ['constellation-taurus'],
  },
  {
    wikiTitle: 'Aquarius (constellation)',
    id: 'myth-aquarius-ganymede', pillar: 'mythology', type: 'myth',
    title: 'Aquarius — Ganymede, the Water Bearer',
    tags: ['aquarius', 'ganymede', 'zeus', 'water bearer', 'greek mythology', 'constellation'],
    related: ['constellation-aquarius'],
  },
  {
    wikiTitle: 'Cygnus (constellation)',
    id: 'myth-cygnus-swan', pillar: 'mythology', type: 'myth',
    title: 'Cygnus — The Swan, Zeus, and Orpheus',
    tags: ['cygnus', 'swan', 'zeus', 'orpheus', 'phaethon', 'greek mythology'],
    related: ['constellation-cygnus'],
  },
  {
    wikiTitle: 'Virgo (constellation)',
    id: 'myth-virgo-demeter', pillar: 'mythology', type: 'myth',
    title: 'Virgo — Demeter, Persephone, and the Harvest',
    tags: ['virgo', 'demeter', 'persephone', 'harvest', 'greek mythology', 'constellation'],
    related: ['constellation-virgo'],
  },
  {
    wikiTitle: 'Pleiades in folklore and literature',
    id: 'myth-pleiades', pillar: 'mythology', type: 'myth',
    title: 'The Pleiades — Seven Sisters Across World Cultures',
    tags: ['pleiades', 'seven sisters', 'greek mythology', 'indigenous astronomy', 'atlas', 'taurus'],
    related: ['constellation-taurus'],
  },
  {
    wikiTitle: 'Babylonian astronomy',
    id: 'myth-babylonian-astronomy', pillar: 'mythology', type: 'culture',
    title: 'Babylonian Astronomy — Origins of the Zodiac',
    tags: ['babylonian', 'mesopotamia', 'zodiac', 'ancient astronomy', 'astrology history'],
    related: [],
  },
  {
    wikiTitle: 'Egyptian astronomy',
    id: 'myth-egyptian-astronomy', pillar: 'mythology', type: 'culture',
    title: 'Egyptian Astronomy — Osiris, Sopdet, and the Stars',
    tags: ['egyptian', 'osiris', 'sopdet', 'sirius', 'pyramid', 'ancient astronomy'],
    related: ['star-sirius'],
  },
  {
    wikiTitle: 'Chinese astronomy',
    id: 'myth-chinese-astronomy', pillar: 'mythology', type: 'culture',
    title: 'Chinese Astronomy and Star Lore',
    tags: ['chinese astronomy', 'star lore', 'tanabata', 'weaver girl', 'cowherd', 'eastern astrology'],
    related: [],
  },
  {
    wikiTitle: 'Polynesian astronomy',
    id: 'myth-polynesian-navigation', pillar: 'mythology', type: 'culture',
    title: 'Polynesian Star Navigation',
    tags: ['polynesian', 'navigation', 'wayfinding', 'stars', 'pacific', 'celestial navigation'],
    related: [],
  },
  {
    wikiTitle: 'Aboriginal Australian astronomy',
    id: 'myth-aboriginal-astronomy', pillar: 'mythology', type: 'culture',
    title: 'Aboriginal Australian Astronomy',
    tags: ['aboriginal', 'australian', 'dark constellation', 'emu in the sky', 'indigenous astronomy'],
    related: [],
  },
  {
    wikiTitle: 'Norse cosmology',
    id: 'myth-norse-cosmology', pillar: 'mythology', type: 'myth',
    title: 'Norse Cosmology — Yggdrasil and the Nine Worlds',
    tags: ['norse', 'yggdrasil', 'odin', 'nine worlds', 'asgard', 'norse mythology', 'cosmos'],
    related: [],
  },
  {
    wikiTitle: 'Heracles',
    id: 'myth-heracles', pillar: 'mythology', type: 'myth',
    title: 'Heracles — The Twelve Labors and the Stars',
    tags: ['heracles', 'hercules', 'twelve labors', 'greek mythology', 'constellation hercules'],
    related: ['constellation-hercules'],
  },
  {
    wikiTitle: 'Zodiac',
    id: 'myth-zodiac-origins', pillar: 'mythology', type: 'culture',
    title: 'The Zodiac — Origins and History',
    tags: ['zodiac', 'history', 'babylonian', 'greek', 'ecliptic', 'astrology history'],
    related: [],
  },
];

// ─── PILLAR 3: SPIRITUALITY ───────────────────────────────────────────────────

const SPIRITUALITY_TOPICS_WIKI = [
  {
    wikiTitle: 'Mercury retrograde',
    id: 'spirit-mercury-retrograde-effects', pillar: 'spirituality', type: 'practice',
    title: 'Mercury Retrograde — Spiritual Meaning and Practices',
    tags: ['mercury retrograde', 'spirituality', 'communication', 'reflection', 'ritual'],
    related: ['astrology-mercury-retrograde'],
  },
  {
    wikiTitle: 'Full moon',
    id: 'spirit-full-moon', pillar: 'spirituality', type: 'lunar',
    title: 'Full Moon — Spiritual Significance and Rituals',
    tags: ['full moon', 'lunar cycle', 'ritual', 'release', 'manifestation', 'moon magic'],
    related: ['spirit-moon-phases'],
  },
  {
    wikiTitle: 'New moon',
    id: 'spirit-new-moon', pillar: 'spirituality', type: 'lunar',
    title: 'New Moon — Setting Intentions and New Beginnings',
    tags: ['new moon', 'intentions', 'lunar cycle', 'ritual', 'beginnings', 'moon magic'],
    related: ['spirit-moon-phases'],
  },
  {
    wikiTitle: 'Crystal healing',
    id: 'spirit-crystal-healing', pillar: 'spirituality', type: 'practice',
    title: 'Crystal Healing and Cosmic Stones',
    tags: ['crystal healing', 'crystals', 'gemstones', 'energy healing', 'chakra', 'amethyst'],
    related: [],
  },
  {
    wikiTitle: 'Sacred geometry',
    id: 'spirit-sacred-geometry', pillar: 'spirituality', type: 'concept',
    title: 'Sacred Geometry — The Mathematical Language of the Cosmos',
    tags: ['sacred geometry', 'fibonacci', 'golden ratio', 'flower of life', 'metatrons cube'],
    related: [],
  },
  {
    wikiTitle: 'Starseed',
    id: 'spirit-starseeds', pillar: 'spirituality', type: 'concept',
    title: 'Starseeds — Souls from Other Star Systems',
    tags: ['starseeds', 'pleiadian', 'sirian', 'arcturian', 'new age', 'spiritual awakening'],
    related: [],
  },
  {
    wikiTitle: 'Age of Aquarius',
    id: 'spirit-age-of-aquarius', pillar: 'spirituality', type: 'concept',
    title: 'The Age of Aquarius — A New Cosmic Era',
    tags: ['age of aquarius', 'precession', 'great year', 'new age', 'aquarius', 'cosmic cycle'],
    related: ['astrology-aquarius'],
  },
  {
    wikiTitle: 'Astral projection',
    id: 'spirit-astral-projection', pillar: 'spirituality', type: 'practice',
    title: 'Astral Projection and the Cosmic Soul Journey',
    tags: ['astral projection', 'out of body', 'astral travel', 'soul', 'consciousness', 'spiritual'],
    related: [],
  },
  {
    wikiTitle: 'Chakra',
    id: 'spirit-chakras', pillar: 'spirituality', type: 'concept',
    title: 'Chakras — The Energy Centers of the Body',
    tags: ['chakras', 'energy centers', 'kundalini', 'crown chakra', 'third eye', 'ayurveda'],
    related: [],
  },
  {
    wikiTitle: 'Law of attraction',
    id: 'spirit-manifestation', pillar: 'spirituality', type: 'practice',
    title: 'Manifestation and the Law of Attraction',
    tags: ['manifestation', 'law of attraction', 'intention', 'visualization', 'abundance', 'new thought'],
    related: [],
  },
  {
    wikiTitle: 'Cosmic consciousness',
    id: 'spirit-cosmic-consciousness', pillar: 'spirituality', type: 'concept',
    title: 'Cosmic Consciousness — Oneness with the Universe',
    tags: ['cosmic consciousness', 'unity', 'mysticism', 'enlightenment', 'universal mind'],
    related: [],
  },
  {
    wikiTitle: 'Numerology',
    id: 'spirit-numerology', pillar: 'spirituality', type: 'practice',
    title: 'Numerology — The Mystical Meaning of Numbers',
    tags: ['numerology', 'life path number', 'pythagoras', 'sacred numbers', 'divination'],
    related: [],
  },
  {
    wikiTitle: 'Tarot',
    id: 'spirit-tarot', pillar: 'spirituality', type: 'practice',
    title: 'Tarot — Archetypes of the Cosmic Journey',
    tags: ['tarot', 'major arcana', 'divination', 'archetypes', 'rider-waite', 'cosmic symbolism'],
    related: [],
  },
];

const SPIRITUALITY_STRUCTURED = [
  {
    id: 'spirit-moon-phases', pillar: 'spirituality', type: 'lunar',
    title: 'The Eight Moon Phases — Meanings and Rituals',
    tags: ['moon phases', 'lunar cycle', 'ritual', 'waxing', 'waning', 'gibbous', 'crescent'],
    summary: 'The eight phases of the Moon carry distinct energetic meanings in spiritual tradition — from the New Moon\'s new beginnings to the Full Moon\'s illumination and the Waning Moon\'s release.',
    scientific: `The eight moon phases form a complete lunation cycle of approximately 29.5 days:

1. **New Moon** (0°): Dark sky, unseen Moon. Themes: new beginnings, seed planting, intentions.
2. **Waxing Crescent** (45–90°): Sliver of light. Themes: growth, hope, taking first steps.
3. **First Quarter** (90°): Half illuminated. Themes: decisions, action, overcoming obstacles.
4. **Waxing Gibbous** (135°): Nearly full. Themes: refinement, adjustment, building momentum.
5. **Full Moon** (180°): Complete illumination. Themes: culmination, clarity, release, emotional peak.
6. **Waning Gibbous** (225°): After peak. Themes: gratitude, sharing, distribution of harvest.
7. **Last Quarter** (270°): Half dark. Themes: release, forgiveness, letting go.
8. **Waning Crescent** (315°): Final sliver. Themes: surrender, rest, preparation for renewal.

Many spiritual traditions align ritual timing with these phases — planting intentions at the New Moon and releasing what no longer serves at the Full or Waning Moon.`,
    related: ['spirit-full-moon', 'spirit-new-moon'],
    sources: ['https://en.wikipedia.org/wiki/Lunar_phase'],
  },
  {
    id: 'spirit-zodiac-elements', pillar: 'spirituality', type: 'concept',
    title: 'The Four Elements in Astrology and Spirituality',
    tags: ['elements', 'fire', 'earth', 'air', 'water', 'astrology', 'spirituality', 'personality'],
    summary: 'The four classical elements — Fire, Earth, Air, and Water — form the foundational temperament system in both astrology and many spiritual traditions, each governing three zodiac signs.',
    scientific: `The four classical elements are a cornerstone of both Western astrology and many esoteric traditions:

**Fire Signs** (Aries, Leo, Sagittarius): Energy, passion, inspiration, leadership. Fire people are dynamic, enthusiastic, and action-oriented. They are motivated by vision and can be impulsive.

**Earth Signs** (Taurus, Virgo, Capricorn): Stability, practicality, material world, persistence. Earth people are grounded, reliable, and sensory. They build lasting structures and value security.

**Air Signs** (Gemini, Libra, Aquarius): Intellect, communication, ideas, social connection. Air people are curious, adaptable, and conceptual. They live in the realm of thought and relationship.

**Water Signs** (Cancer, Scorpio, Pisces): Emotion, intuition, depth, empathy. Water people feel deeply, perceive subtly, and are attuned to the unseen emotional undercurrents in any situation.

In spiritual practice, balancing the elements within oneself — working on underdeveloped qualities — is considered a path to wholeness.`,
    related: [],
    sources: ['https://en.wikipedia.org/wiki/Classical_element'],
  },
  {
    id: 'spirit-moon-water', pillar: 'spirituality', type: 'practice',
    title: 'Moon Water — Lunar-Charged Water Ritual',
    tags: ['moon water', 'full moon ritual', 'lunar magic', 'cleansing', 'intention', 'water magic'],
    summary: 'Moon water is water left under moonlight to absorb lunar energy, used in spiritual practices for cleansing, intention setting, and ritual work.',
    scientific: `Moon water is a widely practiced spiritual ritual in which water is placed outside (or on a windowsill) under the light of the Moon — most powerfully during a Full Moon — to absorb its energy. The resulting "charged" water is used in various spiritual contexts:

- **Cleansing**: Adding moon water to baths, washing ritual tools, or cleaning altars.
- **Intention work**: Drinking moon water while holding an intention, or watering plants with it to nurture growth.
- **Beauty rituals**: Using it in skincare or hair care for its symbolic connection to intuition and cycles.
- **Offerings**: Leaving moon water on altars as an offering to lunar deities (Artemis, Selene, Hecate, Isis).

The practice connects to ancient lunar traditions in which water — already associated with emotion, the unconscious, and the feminine — is amplified by moonlight. Full Moon water is considered most potent for release rituals; New Moon water for new beginnings.`,
    related: ['spirit-full-moon', 'spirit-new-moon'],
    sources: ['https://en.wikipedia.org/wiki/Moon_water'],
  },
];

// ─── Wikipedia Fetcher ────────────────────────────────────────────────────────

async function fetchAndBuildDoc(topic) {
  const wikiData = topic.fallback
    ? await fetchWikipediaWithFallback(topic.wikiTitle, topic.fallback)
    : await fetchWikipedia(topic.wikiTitle);

  const summary = wikiData.extract
    ? wikiData.extract.split('. ').slice(0, 3).join('. ') + '.'
    : topic.title;
  const scientific = wikiData.extract || summary;

  return makeDoc({
    id: topic.id,
    pillar: topic.pillar,
    type: topic.type,
    title: topic.title,
    tags: topic.tags,
    summary: summary.slice(0, 400),
    scientific: scientific.slice(0, 3000),
    related_topics: topic.related || [],
    sources: [wikiData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic.wikiTitle)}`],
  });
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

async function buildMysticKnowledge() {
  log('═══════════════════════════════════════════════════');
  log('  AstroOracle → Mystic Knowledge Base Builder     ');
  log('═══════════════════════════════════════════════════\n');

  let total = 0;
  let errors = 0;

  // ── 1. Zodiac signs (Wikipedia) ───────────────────────────────────────────

  log(`\n── Astrology: Zodiac Signs (${ZODIAC_SIGNS.length} docs) ──`);
  for (const sign of ZODIAC_SIGNS) {
    try {
      const wikiData = await fetchWikipedia(sign.wikiTitle);
      const extract = wikiData.extract || '';
      const summary = `${sign.name} (${sign.symbol}) is the ${sign.element} ${sign.modality} sign of the zodiac, ruled by ${sign.ruler}, spanning ${sign.dates}.`;
      const scientific = `${sign.name} is the ${sign.element} ${sign.modality} sign of the zodiac. ${sign.name} spans ${sign.dates} in the tropical calendar and is ruled by ${sign.ruler}. ${extract.slice(0, 2000)}`;

      const doc = makeDoc({
        id: `astrology-${slugify(sign.name)}`,
        pillar: 'astrology',
        type: 'zodiac-sign',
        title: `${sign.name} — ${sign.element} ${sign.modality} Sign`,
        tags: [sign.name.toLowerCase(), 'zodiac', 'astrology', sign.element.toLowerCase(), sign.modality.toLowerCase(), `ruled by ${sign.ruler.toLowerCase()}`],
        summary,
        scientific,
        metadata: {
          symbol: sign.symbol,
          dates: sign.dates,
          element: sign.element,
          modality: sign.modality,
          ruling_planet: sign.ruler,
        },
        related_topics: [],
        sources: [wikiData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(sign.wikiTitle)}`],
      });

      saveDoc('astrology', doc);
      log(`  ✓ ${sign.name}`);
      total++;
      await sleep(400);
    } catch (err) {
      log(`  ✗ ${sign.name}: ${err.message}`);
      errors++;
    }
  }

  // ── 2. Astrological houses (structured data — no Wikipedia needed) ─────────

  log(`\n── Astrology: Houses (${ASTROLOGICAL_HOUSES.length} docs) ──`);
  for (const house of ASTROLOGICAL_HOUSES) {
    const doc = makeDoc({
      id: `astrology-house-${house.number}`,
      pillar: 'astrology',
      type: 'house',
      title: `The ${house.number === 1 ? '1st' : house.number === 2 ? '2nd' : house.number === 3 ? '3rd' : `${house.number}th`} House — ${house.name}`,
      tags: [`${house.number}th house`, 'astrological houses', 'natal chart', 'astrology', house.naturalSign.toLowerCase(), house.naturalRuler.toLowerCase()],
      summary: `The ${house.number === 1 ? '1st' : house.number === 2 ? '2nd' : house.number === 3 ? '3rd' : `${house.number}th`} house governs ${house.keywords}. Its natural sign is ${house.naturalSign}, ruled by ${house.naturalRuler}.`,
      scientific: `The ${house.number === 1 ? '1st' : house.number === 2 ? '2nd' : house.number === 3 ? '3rd' : `${house.number}th`} house of the astrological chart is known as the ${house.name}. It governs ${house.keywords}. The natural sign of this house is ${house.naturalSign} and its natural planetary ruler is ${house.naturalRuler}. When planets transit through or occupy this house in a natal chart, they color the themes of this life area with their specific energy. The house system divides the natal chart into twelve sections, each representing a different domain of lived experience — from identity and values to career and spirituality.`,
      metadata: {
        house_number: house.number,
        name: house.name,
        natural_sign: house.naturalSign,
        natural_ruler: house.naturalRuler,
      },
      related_topics: [`astrology-${slugify(house.naturalSign)}`],
      sources: ['https://en.wikipedia.org/wiki/Astrological_house'],
    });

    saveDoc('astrology', doc);
    log(`  ✓ House ${house.number}: ${house.name}`);
    total++;
  }

  // ── 3. Planets in astrology (structured data) ─────────────────────────────

  log(`\n── Astrology: Planets (${ASTRO_PLANETS.length} docs) ──`);
  for (const planet of ASTRO_PLANETS) {
    const doc = makeDoc({
      id: planet.slug,
      pillar: 'astrology',
      type: 'planet',
      title: planet.title,
      tags: planet.tags,
      summary: planet.summary,
      scientific: planet.scientific,
      sources: [`https://en.wikipedia.org/wiki/Planets_in_astrology`],
    });
    saveDoc('astrology', doc);
    log(`  ✓ ${planet.title}`);
    total++;
  }

  // ── 4. Astrological aspects ───────────────────────────────────────────────

  log(`\n── Astrology: Aspects (${ASTRO_ASPECTS.length} docs) ──`);
  for (const aspect of ASTRO_ASPECTS) {
    const doc = makeDoc({
      id: `astrology-aspect-${slugify(aspect.name)}`,
      pillar: 'astrology',
      type: 'aspect',
      title: `${aspect.name} — ${aspect.degrees}° Aspect`,
      tags: [aspect.name.toLowerCase(), 'astrological aspects', 'natal chart', 'astrology', aspect.nature.toLowerCase()],
      summary: `The ${aspect.name} is a ${aspect.degrees}° aspect (orb: ${aspect.orb}°) considered ${aspect.nature} in astrology.`,
      scientific: `The ${aspect.name} is formed when two planets are ${aspect.degrees} degrees apart in the zodiac, with an accepted orb of approximately ${aspect.orb} degrees. It is considered ${aspect.nature}. ${aspect.description} Aspects are calculated between all planets, angles, and significant points in the natal chart and are central to chart interpretation.`,
      metadata: { degrees: aspect.degrees, orb: aspect.orb, nature: aspect.nature },
      sources: ['https://en.wikipedia.org/wiki/Astrological_aspect'],
    });
    saveDoc('astrology', doc);
    log(`  ✓ ${aspect.name}`);
    total++;
  }

  // ── 5. Astrology miscellaneous topics ─────────────────────────────────────

  log(`\n── Astrology: Topics (${ASTRO_TOPICS.length} docs) ──`);
  for (const topic of ASTRO_TOPICS) {
    const doc = {
      id: topic.id,
      pillar: topic.pillar,
      type: topic.type,
      title: topic.title,
      tags: topic.tags,
      summary: topic.summary,
      content: { scientific: topic.scientific },
      metadata: {},
      related_topics: [],
      sources: [`https://en.wikipedia.org/wiki/${encodeURIComponent(topic.title.replace(/ /g, '_'))}`],
      content_license: 'CC BY-SA 4.0',
      generated_at: new Date().toISOString(),
    };
    saveDoc('astrology', doc);
    log(`  ✓ ${topic.title}`);
    total++;
  }

  // ── 6. Mythology (Wikipedia) ──────────────────────────────────────────────

  log(`\n── Mythology: Topics (${MYTHOLOGY_TOPICS.length} docs) ──`);
  for (const topic of MYTHOLOGY_TOPICS) {
    try {
      const doc = await fetchAndBuildDoc(topic);
      saveDoc('mythology', doc);
      log(`  ✓ ${topic.title}`);
      total++;
      await sleep(400);
    } catch (err) {
      log(`  ✗ ${topic.title}: ${err.message}`);
      errors++;
    }
  }

  // ── 7. Spirituality — Wikipedia topics ───────────────────────────────────

  log(`\n── Spirituality: Wikipedia Topics (${SPIRITUALITY_TOPICS_WIKI.length} docs) ──`);
  for (const topic of SPIRITUALITY_TOPICS_WIKI) {
    try {
      const doc = await fetchAndBuildDoc(topic);
      saveDoc('spirituality', doc);
      log(`  ✓ ${topic.title}`);
      total++;
      await sleep(400);
    } catch (err) {
      log(`  ✗ ${topic.title}: ${err.message}`);
      errors++;
    }
  }

  // ── 8. Spirituality — structured topics ──────────────────────────────────

  log(`\n── Spirituality: Structured Topics (${SPIRITUALITY_STRUCTURED.length} docs) ──`);
  for (const topic of SPIRITUALITY_STRUCTURED) {
    const doc = {
      id: topic.id,
      pillar: topic.pillar,
      type: topic.type,
      title: topic.title,
      tags: topic.tags,
      summary: topic.summary,
      content: { scientific: topic.scientific },
      metadata: {},
      related_topics: topic.related,
      sources: topic.sources,
      content_license: 'CC BY-SA 4.0',
      generated_at: new Date().toISOString(),
    };
    saveDoc('spirituality', doc);
    log(`  ✓ ${topic.title}`);
    total++;
  }

  // ── Summary ───────────────────────────────────────────────────────────────

  log('\n═══════════════════════════════════════════════════');
  log(`  BUILD COMPLETE`);
  log(`  ✓ Generated: ${total} documents`);
  log(`  ✗ Errors:    ${errors}`);
  log('═══════════════════════════════════════════════════\n');
  log('Next: run  npm run load  to upload to Supabase.');
}

buildMysticKnowledge().catch(err => {
  console.error('\n✗ BUILD FAILED:', err);
  process.exit(1);
});
