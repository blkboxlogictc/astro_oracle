/**
 * AstroOracle Knowledge Base Builder
 * ====================================
 * Pulls data from:
 *   1. Wikipedia API (constellation articles, cosmology topics)
 *   2. HYG Star Database on GitHub (accurate star data)
 *
 * Outputs structured RAG documents as JSON files ready to
 * load into Supabase or any vector database.
 *
 * Run: node build-knowledge-base.js
 * Output: ./output/knowledge-base/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { gunzipSync } from 'zlib';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'knowledge-base');
const LOG_FILE = path.join(__dirname, 'output', 'build-log.txt');

// ─── All 88 IAU Official Constellations ───────────────────────────────────────
const CONSTELLATIONS = [
  // Zodiac
  { name: 'Andromeda', abbr: 'And', family: 'Perseus', hemisphere: 'N' },
  { name: 'Antlia', abbr: 'Ant', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Apus', abbr: 'Aps', family: 'Bayer', hemisphere: 'S' },
  { name: 'Aquarius', abbr: 'Aqr', family: 'Zodiac', hemisphere: 'S', zodiac: true },
  { name: 'Aquila', abbr: 'Aql', family: 'Hercules', hemisphere: 'N' },
  { name: 'Ara', abbr: 'Ara', family: 'Hercules', hemisphere: 'S' },
  { name: 'Aries', abbr: 'Ari', family: 'Zodiac', hemisphere: 'N', zodiac: true },
  { name: 'Auriga', abbr: 'Aur', family: 'Perseus', hemisphere: 'N' },
  { name: 'Boötes', abbr: 'Boo', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Caelum', abbr: 'Cae', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Camelopardalis', abbr: 'Cam', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Cancer', abbr: 'Cnc', family: 'Zodiac', hemisphere: 'N', zodiac: true },
  { name: 'Canes Venatici', abbr: 'CVn', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Canis Major', abbr: 'CMa', family: 'Orion', hemisphere: 'S' },
  { name: 'Canis Minor', abbr: 'CMi', family: 'Orion', hemisphere: 'N' },
  { name: 'Capricornus', abbr: 'Cap', family: 'Zodiac', hemisphere: 'S', zodiac: true },
  { name: 'Carina', abbr: 'Car', family: 'Heavenly Waters', hemisphere: 'S' },
  { name: 'Cassiopeia', abbr: 'Cas', family: 'Perseus', hemisphere: 'N' },
  { name: 'Centaurus', abbr: 'Cen', family: 'Hercules', hemisphere: 'S' },
  { name: 'Cepheus', abbr: 'Cep', family: 'Perseus', hemisphere: 'N' },
  { name: 'Cetus', abbr: 'Cet', family: 'Perseus', hemisphere: 'S' },
  { name: 'Chamaeleon', abbr: 'Cha', family: 'Bayer', hemisphere: 'S' },
  { name: 'Circinus', abbr: 'Cir', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Columba', abbr: 'Col', family: 'Heavenly Waters', hemisphere: 'S' },
  { name: 'Coma Berenices', abbr: 'Com', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Corona Australis', abbr: 'CrA', family: 'Hercules', hemisphere: 'S' },
  { name: 'Corona Borealis', abbr: 'CrB', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Corvus', abbr: 'Crv', family: 'Hercules', hemisphere: 'S' },
  { name: 'Crater', abbr: 'Crt', family: 'Hercules', hemisphere: 'S' },
  { name: 'Crux', abbr: 'Cru', family: 'Hercules', hemisphere: 'S' },
  { name: 'Cygnus', abbr: 'Cyg', family: 'Perseus', hemisphere: 'N' },
  { name: 'Delphinus', abbr: 'Del', family: 'Heavenly Waters', hemisphere: 'N' },
  { name: 'Dorado', abbr: 'Dor', family: 'Bayer', hemisphere: 'S' },
  { name: 'Draco', abbr: 'Dra', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Equuleus', abbr: 'Equ', family: 'Heavenly Waters', hemisphere: 'N' },
  { name: 'Eridanus', abbr: 'Eri', family: 'Heavenly Waters', hemisphere: 'S' },
  { name: 'Fornax', abbr: 'For', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Gemini', abbr: 'Gem', family: 'Zodiac', hemisphere: 'N', zodiac: true },
  { name: 'Grus', abbr: 'Gru', family: 'Bayer', hemisphere: 'S' },
  { name: 'Hercules', abbr: 'Her', family: 'Hercules', hemisphere: 'N' },
  { name: 'Horologium', abbr: 'Hor', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Hydra', abbr: 'Hya', family: 'Hercules', hemisphere: 'S' },
  { name: 'Hydrus', abbr: 'Hyi', family: 'Bayer', hemisphere: 'S' },
  { name: 'Indus', abbr: 'Ind', family: 'Bayer', hemisphere: 'S' },
  { name: 'Lacerta', abbr: 'Lac', family: 'Perseus', hemisphere: 'N' },
  { name: 'Leo', abbr: 'Leo', family: 'Zodiac', hemisphere: 'N', zodiac: true },
  { name: 'Leo Minor', abbr: 'LMi', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Lepus', abbr: 'Lep', family: 'Orion', hemisphere: 'S' },
  { name: 'Libra', abbr: 'Lib', family: 'Zodiac', hemisphere: 'S', zodiac: true },
  { name: 'Lupus', abbr: 'Lup', family: 'Hercules', hemisphere: 'S' },
  { name: 'Lynx', abbr: 'Lyn', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Lyra', abbr: 'Lyr', family: 'Perseus', hemisphere: 'N' },
  { name: 'Mensa', abbr: 'Men', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Microscopium', abbr: 'Mic', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Monoceros', abbr: 'Mon', family: 'Orion', hemisphere: 'N' },
  { name: 'Musca', abbr: 'Mus', family: 'Bayer', hemisphere: 'S' },
  { name: 'Norma', abbr: 'Nor', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Octans', abbr: 'Oct', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Ophiuchus', abbr: 'Oph', family: 'Hercules', hemisphere: 'N' },
  { name: 'Orion', abbr: 'Ori', family: 'Orion', hemisphere: 'N' },
  { name: 'Pavo', abbr: 'Pav', family: 'Bayer', hemisphere: 'S' },
  { name: 'Pegasus', abbr: 'Peg', family: 'Perseus', hemisphere: 'N' },
  { name: 'Perseus', abbr: 'Per', family: 'Perseus', hemisphere: 'N' },
  { name: 'Phoenix', abbr: 'Phe', family: 'Bayer', hemisphere: 'S' },
  { name: 'Pictor', abbr: 'Pic', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Pisces', abbr: 'Psc', family: 'Zodiac', hemisphere: 'N', zodiac: true },
  { name: 'Piscis Austrinus', abbr: 'PsA', family: 'Heavenly Waters', hemisphere: 'S' },
  { name: 'Puppis', abbr: 'Pup', family: 'Heavenly Waters', hemisphere: 'S' },
  { name: 'Pyxis', abbr: 'Pyx', family: 'Heavenly Waters', hemisphere: 'S' },
  { name: 'Reticulum', abbr: 'Ret', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Sagitta', abbr: 'Sge', family: 'Hercules', hemisphere: 'N' },
  { name: 'Sagittarius', abbr: 'Sgr', family: 'Zodiac', hemisphere: 'S', zodiac: true },
  { name: 'Scorpius', abbr: 'Sco', family: 'Zodiac', hemisphere: 'S', zodiac: true },
  { name: 'Sculptor', abbr: 'Scl', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Scutum', abbr: 'Sct', family: 'Hercules', hemisphere: 'S' },
  { name: 'Serpens', abbr: 'Ser', family: 'Hercules', hemisphere: 'N' },
  { name: 'Sextans', abbr: 'Sex', family: 'Hercules', hemisphere: 'S' },
  { name: 'Taurus', abbr: 'Tau', family: 'Zodiac', hemisphere: 'N', zodiac: true },
  { name: 'Telescopium', abbr: 'Tel', family: 'Lacaille', hemisphere: 'S' },
  { name: 'Triangulum', abbr: 'Tri', family: 'Perseus', hemisphere: 'N' },
  { name: 'Triangulum Australe', abbr: 'TrA', family: 'Bayer', hemisphere: 'S' },
  { name: 'Tucana', abbr: 'Tuc', family: 'Bayer', hemisphere: 'S' },
  { name: 'Ursa Major', abbr: 'UMa', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Ursa Minor', abbr: 'UMi', family: 'Ursa Major', hemisphere: 'N' },
  { name: 'Vela', abbr: 'Vel', family: 'Heavenly Waters', hemisphere: 'S' },
  { name: 'Virgo', abbr: 'Vir', family: 'Zodiac', hemisphere: 'N', zodiac: true },
  { name: 'Volans', abbr: 'Vol', family: 'Bayer', hemisphere: 'S' },
  { name: 'Vulpecula', abbr: 'Vul', family: 'Hercules', hemisphere: 'N' },
];

// Cosmology topics to pull from Wikipedia
const COSMOLOGY_TOPICS = [
  'Big Bang',
  'Dark matter',
  'Dark energy',
  'Black hole',
  'Neutron star',
  'Supernova',
  'Milky Way',
  'Galaxy',
  'Exoplanet',
  'Cosmic microwave background',
  'Expansion of the universe',
  'Multiverse',
  'String theory',
  'Gravitational wave',
  'Nebula',
  'Pulsar',
  'Quasar',
  'White dwarf',
  'Magnetar',
  'Observable universe',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function cleanWikiText(text) {
  if (!text) return '';
  return text
    .replace(/\{\{[^}]*\}\}/g, '')         // remove templates
    .replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, '$2') // [[link|text]] → text
    .replace(/'{2,3}/g, '')                 // remove bold/italic markers
    .replace(/==+[^=]+=+/g, '')            // remove section headers
    .replace(/\[\d+\]/g, '')               // remove citation markers
    .replace(/\n{3,}/g, '\n\n')            // normalize whitespace
    .replace(/<[^>]+>/g, '')               // strip HTML tags
    .trim();
}

// ─── Wikipedia API Fetcher ────────────────────────────────────────────────────

async function fetchWikipediaArticle(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AstroOracle-KB-Builder/1.0 (educational project)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      title: data.title,
      summary: data.extract || '',
      pageUrl: data.content_urls?.desktop?.page || '',
      thumbnail: data.thumbnail?.source || null,
    };
  } catch (err) {
    log(`  ⚠ Wikipedia fetch failed for "${title}": ${err.message}`);
    return null;
  }
}

async function fetchWikipediaFullText(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=false&explaintext=true&format=json&origin=*`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AstroOracle-KB-Builder/1.0 (educational project)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    return cleanWikiText(page.extract || '').slice(0, 4000); // cap at 4000 chars per doc
  } catch (err) {
    log(`  ⚠ Wikipedia full text failed for "${title}": ${err.message}`);
    return null;
  }
}

// ─── HYG Star Database Fetcher ────────────────────────────────────────────────
// Raw CSV (gzipped) from the HYG database on Codeberg (astronexus/hyg)
// Contains every named star with spectral type, magnitude, distance

async function fetchHYGStarData() {
  const url = 'https://codeberg.org/astronexus/hyg/media/branch/main/data/hyg/CURRENT/hyg_v42.csv.gz';
  log('Fetching HYG star database from Codeberg...');
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'AstroOracle-KB-Builder/1.0 (educational project)' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const text = gunzipSync(buffer).toString('utf8');
    const lines = text.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const stars = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      if (cols.length < headers.length) continue;
      const row = {};
      headers.forEach((h, idx) => row[h] = (cols[idx] || '').trim().replace(/^"|"$/g, ''));

      // Only keep named stars
      if (!row.proper) continue;

      stars.push({
        id: row.id,
        name: row.proper,
        constellation: row.con,
        magnitude: parseFloat(row.mag) || null,
        distance_ly: row.dist ? (parseFloat(row.dist) * 3.26156).toFixed(1) : null,
        spectralType: row.spect || null,
        ra: row.ra,
        dec: row.dec,
        colorIndex: row.ci || null,
      });
    }
    log(`  ✓ Loaded ${stars.length} named stars from HYG database`);
    return stars;
  } catch (err) {
    log(`  ✗ HYG fetch failed: ${err.message}`);
    return [];
  }
}

// ─── Document Builders ────────────────────────────────────────────────────────

function buildConstellationDocument(constellation, wikiSummary, wikiFullText, relatedStars) {
  const isZodiac = constellation.zodiac || false;

  const tags = [
    'constellation',
    constellation.name.toLowerCase(),
    constellation.abbr.toLowerCase(),
    constellation.family.toLowerCase(),
    constellation.hemisphere === 'N' ? 'northern hemisphere' : 'southern hemisphere',
  ];
  if (isZodiac) tags.push('zodiac', 'astrology');

  const starsText = relatedStars.length > 0
    ? relatedStars.map(s =>
        `${s.name}: magnitude ${s.magnitude}, distance ${s.distance_ly} light-years, spectral type ${s.spectralType || 'unknown'}`
      ).join('\n')
    : 'No named stars in database for this constellation.';

  return {
    id: `constellation-${slugify(constellation.name)}`,
    pillar: 'constellations',
    type: 'constellation',
    title: `${constellation.name} (${constellation.abbr})`,
    tags,
    metadata: {
      iau_abbreviation: constellation.abbr,
      constellation_family: constellation.family,
      hemisphere: constellation.hemisphere === 'N' ? 'Northern' : 'Southern',
      is_zodiac: isZodiac,
      named_stars_count: relatedStars.length,
    },
    summary: wikiSummary?.summary || `${constellation.name} is one of the 88 modern constellations recognized by the International Astronomical Union.`,
    content: {
      scientific: wikiFullText || wikiSummary?.summary || '',
      named_stars: starsText,
    },
    related_topics: [
      isZodiac ? `astrology-${slugify(constellation.name)}` : null,
      `constellation-family-${slugify(constellation.family)}`,
      'cosmology-milky-way',
    ].filter(Boolean),
    sources: [
      wikiSummary?.pageUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(constellation.name)}`,
      'https://github.com/astronexus/HYG-Database',
      'https://www.iau.org/public/themes/constellations/',
    ],
    generated_at: new Date().toISOString(),
    content_license: 'Wikipedia content CC BY-SA 4.0 | HYG Database CC BY-SA 2.5',
  };
}

function buildCosmologyDocument(topic, wikiSummary, wikiFullText) {
  const tags = [
    'cosmology',
    'astrophysics',
    topic.toLowerCase(),
    'science',
  ];

  return {
    id: `cosmology-${slugify(topic)}`,
    pillar: 'cosmology',
    type: 'cosmology_topic',
    title: topic,
    tags,
    metadata: {
      wikipedia_title: wikiSummary?.title || topic,
      has_full_text: !!wikiFullText,
    },
    summary: wikiSummary?.summary || `${topic} is a significant concept in modern cosmology and astrophysics.`,
    content: {
      scientific: wikiFullText || wikiSummary?.summary || '',
    },
    related_topics: [],
    sources: [
      wikiSummary?.pageUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`,
    ],
    generated_at: new Date().toISOString(),
    content_license: 'Wikipedia content CC BY-SA 4.0',
  };
}

function buildStarDocument(star) {
  const conFull = CONSTELLATIONS.find(
    c => c.abbr.toLowerCase() === star.constellation?.toLowerCase()
  )?.name || star.constellation?.toUpperCase() || 'Unknown';

  const conAbbr = star.constellation?.toUpperCase() || '';

  const details = [
    star.magnitude !== null ? `Visual magnitude: ${star.magnitude}.` : null,
    star.distance_ly ? `Distance: approximately ${star.distance_ly} light-years from Earth.` : null,
    star.spectralType ? `Spectral type: ${star.spectralType}.` : null,
    star.colorIndex ? `Color index (B-V): ${star.colorIndex}.` : null,
    star.ra && star.dec ? `Coordinates: RA ${star.ra}h, Dec ${star.dec}°.` : null,
  ].filter(Boolean).join(' ');

  const summaryParts = [
    `${star.name} is a named star in the constellation ${conFull} (${conAbbr}).`,
    star.magnitude !== null ? `Apparent magnitude: ${star.magnitude}.` : null,
    star.distance_ly ? `Distance: ${star.distance_ly} light-years.` : null,
    star.spectralType ? `Spectral type: ${star.spectralType}.` : null,
  ].filter(Boolean);

  const tags = ['star', 'named star', star.name.toLowerCase()];
  if (conFull) tags.push(conFull.toLowerCase());
  if (conAbbr) tags.push(conAbbr.toLowerCase());
  if (star.spectralType) tags.push(`spectral class ${star.spectralType[0].toLowerCase()}`);

  return {
    id: `star-${slugify(star.name)}`,
    pillar: 'stars',
    type: 'star',
    title: star.name,
    tags,
    summary: summaryParts.join(' '),
    content: {
      scientific: `${star.name} is a named star located in the constellation ${conFull} (${conAbbr}). ${details}`,
    },
    metadata: {
      constellation_abbr: conAbbr,
      constellation_name: conFull,
      magnitude: star.magnitude,
      distance_ly: star.distance_ly ? parseFloat(star.distance_ly) : null,
      spectral_type: star.spectralType || null,
      color_index: star.colorIndex ? parseFloat(star.colorIndex) : null,
      ra: star.ra ? parseFloat(star.ra) : null,
      dec: star.dec ? parseFloat(star.dec) : null,
      hyg_id: star.id,
    },
    related_topics: [`constellation-${slugify(conFull)}`],
    sources: ['https://codeberg.org/astronexus/hyg'],
    generated_at: new Date().toISOString(),
    content_license: 'HYG Database CC BY-SA 2.5',
  };
}

// ─── Main Build Process ───────────────────────────────────────────────────────

async function buildKnowledgeBase() {
  // Setup output directories
  const dirs = [
    OUTPUT_DIR,
    path.join(OUTPUT_DIR, 'constellations'),
    path.join(OUTPUT_DIR, 'cosmology'),
    path.join(OUTPUT_DIR, 'stars'),
    path.join(OUTPUT_DIR, 'stars', 'individual'),
  ];
  dirs.forEach(d => fs.mkdirSync(d, { recursive: true }));
  fs.writeFileSync(LOG_FILE, '');

  log('═══════════════════════════════════════');
  log('  AstroOracle Knowledge Base Builder   ');
  log('═══════════════════════════════════════');

  // ── Step 1: Fetch HYG star data ──────────────────────────────────────────
  log('\n[1/3] Fetching HYG Star Database...');
  const allStars = await fetchHYGStarData();

  // Save full star index
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'stars', 'hyg-named-stars.json'),
    JSON.stringify(allStars, null, 2)
  );
  log(`  ✓ Saved ${allStars.length} named stars to stars/hyg-named-stars.json`);

  // Build individual star documents
  const starsDir = path.join(OUTPUT_DIR, 'stars', 'individual');
  allStars.forEach(star => {
    const doc = buildStarDocument(star);
    fs.writeFileSync(
      path.join(starsDir, `${slugify(star.name)}.json`),
      JSON.stringify(doc, null, 2)
    );
  });
  log(`  ✓ Saved ${allStars.length} individual star documents to stars/individual/`);

  // Group stars by constellation abbreviation for quick lookup
  const starsByConstellation = {};
  allStars.forEach(star => {
    const con = (star.constellation || '').trim().toLowerCase();
    if (!starsByConstellation[con]) starsByConstellation[con] = [];
    starsByConstellation[con].push(star);
  });

  // ── Step 2: Build constellation documents ────────────────────────────────
  log(`\n[2/3] Building ${CONSTELLATIONS.length} constellation documents...`);
  const constellationIndex = [];

  for (let i = 0; i < CONSTELLATIONS.length; i++) {
    const con = CONSTELLATIONS[i];
    log(`  [${i + 1}/${CONSTELLATIONS.length}] ${con.name}...`);

    // Fetch Wikipedia data
    const wikiSummary = await fetchWikipediaArticle(`${con.name} (constellation)`);
    await sleep(300); // be respectful to Wikipedia's API
    const wikiFullText = await fetchWikipediaFullText(`${con.name} (constellation)`);
    await sleep(300);

    // Get named stars for this constellation
    const abbr = con.abbr.toLowerCase();
    const relatedStars = (starsByConstellation[abbr] || [])
      .sort((a, b) => (a.magnitude || 99) - (b.magnitude || 99)) // brightest first
      .slice(0, 10); // top 10 brightest named stars

    // Build document
    const doc = buildConstellationDocument(con, wikiSummary, wikiFullText, relatedStars);

    // Save individual file
    const filename = `${slugify(con.name)}.json`;
    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'constellations', filename),
      JSON.stringify(doc, null, 2)
    );

    constellationIndex.push({
      id: doc.id,
      name: con.name,
      abbr: con.abbr,
      family: con.family,
      hemisphere: con.hemisphere,
      is_zodiac: doc.metadata.is_zodiac,
      file: `constellations/${filename}`,
    });

    await sleep(200);
  }

  // Save constellation index
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'constellations', '_index.json'),
    JSON.stringify(constellationIndex, null, 2)
  );
  log(`  ✓ Constellation documents complete`);

  // ── Step 3: Build cosmology documents ───────────────────────────────────
  log(`\n[3/3] Building ${COSMOLOGY_TOPICS.length} cosmology documents...`);
  const cosmologyIndex = [];

  for (let i = 0; i < COSMOLOGY_TOPICS.length; i++) {
    const topic = COSMOLOGY_TOPICS[i];
    log(`  [${i + 1}/${COSMOLOGY_TOPICS.length}] ${topic}...`);

    const wikiSummary = await fetchWikipediaArticle(topic);
    await sleep(300);
    const wikiFullText = await fetchWikipediaFullText(topic);
    await sleep(300);

    const doc = buildCosmologyDocument(topic, wikiSummary, wikiFullText);
    const filename = `${slugify(topic)}.json`;

    fs.writeFileSync(
      path.join(OUTPUT_DIR, 'cosmology', filename),
      JSON.stringify(doc, null, 2)
    );

    cosmologyIndex.push({
      id: doc.id,
      title: topic,
      file: `cosmology/${filename}`,
    });

    await sleep(200);
  }

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'cosmology', '_index.json'),
    JSON.stringify(cosmologyIndex, null, 2)
  );
  log(`  ✓ Cosmology documents complete`);

  // ── Final summary ────────────────────────────────────────────────────────
  const totalDocs = constellationIndex.length + cosmologyIndex.length + allStars.length;
  const summary = {
    built_at: new Date().toISOString(),
    total_documents: totalDocs,
    constellations: constellationIndex.length,
    cosmology_topics: cosmologyIndex.length,
    named_stars: allStars.length,
    sources: [
      'Wikipedia API (CC BY-SA 4.0)',
      'HYG Star Database v3.7 (CC BY-SA 2.5)',
      'IAU Constellation List',
    ],
    output_directory: OUTPUT_DIR,
  };

  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'build-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  log('\n═══════════════════════════════════════');
  log(`  ✓ BUILD COMPLETE`);
  log(`  Total documents: ${totalDocs}`);
  log(`  Named stars indexed: ${allStars.length}`);
  log(`  Output: ${OUTPUT_DIR}`);
  log('═══════════════════════════════════════\n');
  log('Next step: run load-to-supabase.js to upload to your vector database.');
}

buildKnowledgeBase().catch(err => {
  log(`\n✗ BUILD FAILED: ${err.message}`);
  console.error(err);
  process.exit(1);
});
