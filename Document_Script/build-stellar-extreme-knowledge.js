/**
 * AstroOracle — Stellar Physics & Extreme Universe Knowledge Base Builder
 * =========================================================================
 * Builds 53 documents across two new pillars:
 *
 *   PILLAR: stellar (30 docs)
 *     1. Stellar Lifecycle        (12 docs) — Wikipedia primary
 *     2. The Sun                   (6 docs) — Wikipedia primary
 *     3. Solar System              (12 docs) — Wikipedia primary
 *
 *   PILLAR: extreme_universe (20 docs)
 *     4. Extreme Objects           (7 docs) — Wikipedia + CORE API
 *     5. Explosive Events          (6 docs) — Wikipedia + CORE API
 *     6. Active Galaxies           (4 docs) — Wikipedia primary
 *     7. Cosmic Rays               (3 docs) — Wikipedia primary
 *
 *   Bridge Docs                    (3 docs) — Wikipedia + synthesised
 *     "We Are Stardust"           → stellar pillar
 *     "Scale of the Universe"     → stellar pillar
 *     "The Fate of Stars"         → extreme_universe pillar
 *
 * Sources:
 *   Primary:   Wikipedia REST API (CC BY-SA 4.0)
 *   Secondary: CORE Academic API abstracts (fair use)
 *
 * Run: node build-stellar-extreme-knowledge.js
 * Then: node load-to-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STELLAR_DIR = path.join(__dirname, 'output', 'knowledge-base', 'stellar');
const EXTREME_DIR = path.join(__dirname, 'output', 'knowledge-base', 'extreme_universe');

let built = 0;
let failed = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function saveDoc(doc, dir) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${doc.id}.json`), JSON.stringify(doc, null, 2));
}

function makeStellarDoc({ id, type, title, tags, summary, scientific, metadata = {}, related_topics = [], sources = [], license = 'CC BY-SA 4.0' }) {
  return {
    id,
    pillar: 'stellar',
    type,
    title,
    tags: ['stellar', 'astronomy', 'science', ...tags],
    summary,
    content: { scientific },
    metadata,
    related_topics,
    sources,
    content_license: license,
    generated_at: new Date().toISOString(),
  };
}

function makeExtremeDoc({ id, type, title, tags, summary, scientific, metadata = {}, related_topics = [], sources = [], license = 'CC BY-SA 4.0' }) {
  return {
    id,
    pillar: 'extreme_universe',
    type,
    title,
    tags: ['extreme', 'astrophysics', 'science', ...tags],
    summary,
    content: { scientific },
    metadata,
    related_topics,
    sources,
    content_license: license,
    generated_at: new Date().toISOString(),
  };
}

// ── Source fetchers ────────────────────────────────────────────────────────────

async function fetchWikipedia(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'AstroOracle-KnowledgeBuilder/1.0' } });
  if (!res.ok) throw new Error(`Wikipedia ${res.status} for "${title}"`);
  const data = await res.json();
  return { extract: data.extract ?? '', url: data.content_urls?.desktop?.page ?? '' };
}

async function fetchWikiFull(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&explaintext=true&exsectionformat=plain&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': 'AstroOracle-KnowledgeBuilder/1.0' } });
  if (!res.ok) throw new Error(`Wikipedia full ${res.status}`);
  const data = await res.json();
  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  return page?.extract ?? '';
}

async function fetchCORE(query, maxResults = 3) {
  if (!process.env.CORE_API_KEY) return [];
  const url = new URL('https://api.core.ac.uk/v3/search/works');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(maxResults));
  url.searchParams.set('sort', 'publishedDate:desc');
  const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${process.env.CORE_API_KEY}` } });
  if (!res.ok) return [];
  const json = await res.json();
  return json.results ?? [];
}

async function withFallback(label, primaryFn, fallbackFn) {
  try { return await primaryFn(); }
  catch (e) {
    log(`  ↳ Primary failed (${e.message}), trying fallback`);
    if (fallbackFn) {
      try { return await fallbackFn(); }
      catch (e2) { throw new Error(`Both sources failed: ${e2.message}`); }
    }
    throw e;
  }
}

// ── Generic builders ──────────────────────────────────────────────────────────

async function buildStellarWikiDoc({ id, type, title, wikiTitle, wikiTitleFallback, tags, related_topics = [], extraContent = '' }) {
  const { extract, url } = await withFallback(
    title,
    () => fetchWikipedia(wikiTitle),
    wikiTitleFallback ? () => fetchWikipedia(wikiTitleFallback) : null,
  );

  let fullText = extract;
  if (fullText.length < 500) {
    try {
      const full = await fetchWikiFull(wikiTitle);
      fullText = full.slice(0, 4000);
    } catch { /* keep summary */ }
  }
  if (extraContent) fullText = fullText + '\n\n' + extraContent;

  const doc = makeStellarDoc({
    id: `stellar-${id}`,
    type,
    title,
    tags,
    summary: extract.slice(0, 300),
    scientific: fullText.slice(0, 4000),
    related_topics,
    sources: [url].filter(Boolean),
  });
  saveDoc(doc, STELLAR_DIR);
  built++;
  log(`  ✓ [stellar] ${title}`);
}

async function buildExtremeWikiDoc({ id, type, title, wikiTitle, wikiTitleFallback, tags, related_topics = [], useCORE = false, coreQuery = '' }) {
  const { extract, url } = await withFallback(
    title,
    () => fetchWikipedia(wikiTitle),
    wikiTitleFallback ? () => fetchWikipedia(wikiTitleFallback) : null,
  );

  let fullText = extract;
  if (fullText.length < 500) {
    try {
      const full = await fetchWikiFull(wikiTitle);
      fullText = full.slice(0, 4000);
    } catch { /* keep summary */ }
  }

  const sources = [url].filter(Boolean);

  if (useCORE && coreQuery) {
    try {
      const papers = await fetchCORE(`${coreQuery} astrophysics`, 2);
      if (papers.length) {
        const abstracts = papers
          .filter(p => p.abstract)
          .map(p => `[Research: ${p.title ?? 'Study'}] ${p.abstract?.slice(0, 300)}`)
          .join('\n\n');
        if (abstracts) fullText = fullText + '\n\n' + abstracts;
        papers.forEach(p => { if (p.doi) sources.push(`https://doi.org/${p.doi}`); });
      }
    } catch { /* skip CORE on error */ }
  }

  const doc = makeExtremeDoc({
    id: `extreme-${id}`,
    type,
    title,
    tags,
    summary: extract.slice(0, 300),
    scientific: fullText.slice(0, 4500),
    related_topics,
    sources,
  });
  saveDoc(doc, EXTREME_DIR);
  built++;
  log(`  ✓ [extreme_universe] ${title}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Stellar Lifecycle (12 docs)
// ─────────────────────────────────────────────────────────────────────────────

async function buildStellarLifecycle() {
  log('\n══ SECTION 1: Stellar Lifecycle (12 docs) ══');
  const docs = [
    {
      id: 'stellar-evolution-overview', type: 'stellar_concept', title: 'Stellar Evolution',
      wikiTitle: 'Stellar evolution',
      tags: ['stellar evolution', 'star life cycle', 'birth', 'death', 'main sequence'],
      related_topics: ['stellar-main-sequence', 'stellar-protostar', 'stellar-nucleosynthesis'],
    },
    {
      id: 'protostar', type: 'stellar_concept', title: 'Protostars — Where Stars Are Born',
      wikiTitle: 'Protostar',
      tags: ['protostar', 'star formation', 'nebula', 'accretion disk', 'molecular cloud'],
      related_topics: ['stellar-t-tauri', 'stellar-stellar-evolution-overview'],
    },
    {
      id: 't-tauri', type: 'stellar_concept', title: 'T Tauri Stars',
      wikiTitle: 'T Tauri star',
      tags: ['T Tauri', 'young stellar object', 'pre-main sequence', 'solar formation', 'variable star'],
      related_topics: ['stellar-protostar', 'stellar-main-sequence'],
    },
    {
      id: 'main-sequence', type: 'stellar_concept', title: 'Main Sequence Stars',
      wikiTitle: 'Main sequence',
      tags: ['main sequence', 'hydrogen burning', 'stellar classification', 'Hertzsprung-Russell', 'spectral type'],
      related_topics: ['stellar-stellar-evolution-overview', 'stellar-red-giant', 'stellar-nucleosynthesis'],
    },
    {
      id: 'red-giant', type: 'stellar_concept', title: 'Red Giants',
      wikiTitle: 'Red giant',
      tags: ['red giant', 'stellar expansion', 'helium burning', 'giant branch', 'stellar death'],
      related_topics: ['stellar-main-sequence', 'stellar-agb', 'stellar-planetary-nebula'],
    },
    {
      id: 'agb', type: 'stellar_concept', title: 'Asymptotic Giant Branch Stars',
      wikiTitle: 'Asymptotic giant branch',
      tags: ['AGB', 'asymptotic giant branch', 'carbon star', 'thermal pulse', 'heavy elements'],
      related_topics: ['stellar-red-giant', 'stellar-planetary-nebula', 'stellar-nucleosynthesis'],
    },
    {
      id: 'planetary-nebula', type: 'stellar_concept', title: 'Planetary Nebulae',
      wikiTitle: 'Planetary nebula',
      tags: ['planetary nebula', 'stellar remnant', 'shell ejection', 'white dwarf precursor', 'interstellar medium'],
      related_topics: ['stellar-agb', 'stellar-white-dwarf', 'stellar-nucleosynthesis'],
    },
    {
      id: 'white-dwarf', type: 'stellar_concept', title: 'White Dwarf Stars',
      wikiTitle: 'White dwarf',
      tags: ['white dwarf', 'stellar remnant', 'electron degeneracy', 'carbon-oxygen core', 'Chandrasekhar limit'],
      related_topics: ['stellar-chandrasekhar-limit', 'stellar-planetary-nebula', 'extreme-type-ia-supernova'],
    },
    {
      id: 'chandrasekhar-limit', type: 'stellar_concept', title: 'The Chandrasekhar Limit',
      wikiTitle: 'Chandrasekhar limit',
      tags: ['Chandrasekhar limit', 'white dwarf mass', 'electron degeneracy pressure', 'Subrahmanyan Chandrasekhar'],
      related_topics: ['stellar-white-dwarf', 'extreme-type-ia-supernova'],
    },
    {
      id: 'horizontal-branch', type: 'stellar_concept', title: 'Horizontal Branch Stars',
      wikiTitle: 'Horizontal branch',
      tags: ['horizontal branch', 'helium core burning', 'RR Lyrae', 'globular cluster', 'stellar phase'],
      related_topics: ['stellar-red-giant', 'stellar-agb', 'stellar-main-sequence'],
    },
    {
      id: 'nucleosynthesis', type: 'stellar_concept', title: 'Stellar Nucleosynthesis',
      wikiTitle: 'Stellar nucleosynthesis',
      tags: ['nucleosynthesis', 'heavy elements', 'carbon', 'oxygen', 'fusion', 'element formation', 'r-process'],
      related_topics: ['stellar-main-sequence', 'stellar-agb', 'extreme-kilonova', 'stellar-we-are-stardust'],
    },
    {
      id: 'stellar-classification', type: 'stellar_concept', title: 'Stellar Classification',
      wikiTitle: 'Stellar classification',
      tags: ['spectral type', 'OBAFGKM', 'Harvard classification', 'temperature', 'color', 'luminosity class'],
      related_topics: ['stellar-main-sequence', 'stellar-hertzsprung-russell'],
    },
  ];

  for (const doc of docs) {
    try { await buildStellarWikiDoc(doc); }
    catch (e) { log(`  ✗ ${doc.title}: ${e.message}`); failed++; }
    await sleep(300);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: The Sun (6 docs)
// ─────────────────────────────────────────────────────────────────────────────

async function buildSun() {
  log('\n══ SECTION 2: The Sun (6 docs) ══');
  const docs = [
    {
      id: 'sun-overview', type: 'stellar_concept', title: 'The Sun — Our Star',
      wikiTitle: 'Sun',
      tags: ['Sun', 'solar', 'G-type star', 'main sequence', 'photosphere', 'heliosphere'],
      related_topics: ['stellar-solar-wind', 'stellar-solar-corona', 'stellar-solar-flare'],
    },
    {
      id: 'solar-corona', type: 'stellar_concept', title: 'Solar Corona',
      wikiTitle: 'Corona',
      wikiTitleFallback: 'Solar corona',
      tags: ['solar corona', 'plasma', 'coronal heating', 'X-ray', 'solar wind source'],
      related_topics: ['stellar-sun-overview', 'stellar-solar-wind', 'stellar-solar-flare'],
    },
    {
      id: 'solar-wind', type: 'stellar_concept', title: 'Solar Wind',
      wikiTitle: 'Solar wind',
      tags: ['solar wind', 'charged particles', 'heliosphere', 'aurora', 'space weather', 'magnetosphere'],
      related_topics: ['stellar-sun-overview', 'stellar-solar-corona', 'stellar-solar-flare'],
    },
    {
      id: 'solar-flare', type: 'stellar_concept', title: 'Solar Flares and Coronal Mass Ejections',
      wikiTitle: 'Solar flare',
      tags: ['solar flare', 'CME', 'coronal mass ejection', 'space weather', 'radiation', 'geomagnetic storm'],
      related_topics: ['stellar-solar-wind', 'stellar-sunspot', 'stellar-solar-corona'],
    },
    {
      id: 'sunspot', type: 'stellar_concept', title: 'Sunspots',
      wikiTitle: 'Sunspot',
      tags: ['sunspot', 'magnetic field', 'solar cycle', 'photosphere', 'solar activity'],
      related_topics: ['stellar-solar-flare', 'stellar-solar-cycle'],
    },
    {
      id: 'solar-cycle', type: 'stellar_concept', title: 'The Solar Cycle',
      wikiTitle: 'Solar cycle',
      tags: ['solar cycle', '11-year cycle', 'solar maximum', 'solar minimum', 'sunspot cycle', 'activity cycle'],
      related_topics: ['stellar-sunspot', 'stellar-solar-flare', 'stellar-solar-wind'],
    },
  ];

  for (const doc of docs) {
    try { await buildStellarWikiDoc(doc); }
    catch (e) { log(`  ✗ ${doc.title}: ${e.message}`); failed++; }
    await sleep(300);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Solar System (12 docs)
// ─────────────────────────────────────────────────────────────────────────────

async function buildSolarSystem() {
  log('\n══ SECTION 3: Solar System (12 docs) ══');
  const docs = [
    {
      id: 'solar-system-overview', type: 'stellar_concept', title: 'The Solar System',
      wikiTitle: 'Solar System',
      tags: ['solar system', 'planets', 'orbits', 'heliocentric', 'formation', 'planetary system'],
      related_topics: ['stellar-sun-overview', 'stellar-asteroid-belt', 'stellar-kuiper-belt'],
    },
    {
      id: 'mercury', type: 'stellar_concept', title: 'Mercury — The Innermost Planet',
      wikiTitle: 'Mercury (planet)',
      tags: ['Mercury', 'innermost planet', 'rocky planet', 'cratered', 'extreme temperature', 'no atmosphere'],
      related_topics: ['stellar-solar-system-overview', 'stellar-venus'],
    },
    {
      id: 'venus', type: 'stellar_concept', title: 'Venus — The Hottest Planet',
      wikiTitle: 'Venus',
      tags: ['Venus', 'greenhouse effect', 'rocky planet', 'hottest planet', 'thick atmosphere', 'runaway greenhouse'],
      related_topics: ['stellar-mercury', 'stellar-earth', 'stellar-solar-system-overview'],
    },
    {
      id: 'earth', type: 'stellar_concept', title: 'Earth — The Blue Planet',
      wikiTitle: 'Earth',
      tags: ['Earth', 'blue planet', 'habitable zone', 'life', 'ocean', 'atmosphere', 'biosphere'],
      related_topics: ['stellar-venus', 'stellar-mars', 'stellar-solar-system-overview'],
    },
    {
      id: 'mars', type: 'stellar_concept', title: 'Mars — The Red Planet',
      wikiTitle: 'Mars',
      tags: ['Mars', 'red planet', 'iron oxide', 'thin atmosphere', 'Olympus Mons', 'Valles Marineris', 'terraforming'],
      related_topics: ['stellar-earth', 'stellar-asteroid-belt', 'stellar-solar-system-overview'],
    },
    {
      id: 'jupiter', type: 'stellar_concept', title: 'Jupiter — The Giant Planet',
      wikiTitle: 'Jupiter',
      tags: ['Jupiter', 'gas giant', 'Great Red Spot', 'Galilean moons', 'magnetic field', 'largest planet'],
      related_topics: ['stellar-saturn', 'stellar-solar-system-overview', 'stellar-asteroid-belt'],
    },
    {
      id: 'saturn', type: 'stellar_concept', title: 'Saturn and Its Rings',
      wikiTitle: 'Saturn',
      tags: ['Saturn', 'rings', 'gas giant', 'Titan', 'Cassini Division', 'ring system', 'low density'],
      related_topics: ['stellar-jupiter', 'stellar-uranus', 'stellar-solar-system-overview'],
    },
    {
      id: 'uranus', type: 'stellar_concept', title: 'Uranus — The Ice Giant',
      wikiTitle: 'Uranus',
      tags: ['Uranus', 'ice giant', 'tilted axis', 'methane', 'blue-green', 'rings', 'moons'],
      related_topics: ['stellar-saturn', 'stellar-neptune', 'stellar-solar-system-overview'],
    },
    {
      id: 'neptune', type: 'stellar_concept', title: 'Neptune — The Windy Planet',
      wikiTitle: 'Neptune',
      tags: ['Neptune', 'ice giant', 'Great Dark Spot', 'Triton', 'fastest winds', 'outer solar system'],
      related_topics: ['stellar-uranus', 'stellar-kuiper-belt', 'stellar-solar-system-overview'],
    },
    {
      id: 'asteroid-belt', type: 'stellar_concept', title: 'The Asteroid Belt',
      wikiTitle: 'Asteroid belt',
      tags: ['asteroid belt', 'asteroids', 'Ceres', 'rocky bodies', 'inner solar system', 'planetary formation'],
      related_topics: ['stellar-mars', 'stellar-jupiter', 'stellar-solar-system-overview'],
    },
    {
      id: 'kuiper-belt', type: 'stellar_concept', title: 'The Kuiper Belt',
      wikiTitle: 'Kuiper belt',
      tags: ['Kuiper belt', 'Pluto', 'TNOs', 'trans-Neptunian objects', 'comets', 'outer solar system', 'icy bodies'],
      related_topics: ['stellar-neptune', 'stellar-oort-cloud', 'stellar-solar-system-overview'],
    },
    {
      id: 'oort-cloud', type: 'stellar_concept', title: 'The Oort Cloud',
      wikiTitle: 'Oort cloud',
      tags: ['Oort cloud', 'long-period comets', 'solar system boundary', 'Hills cloud', 'cometary reservoir'],
      related_topics: ['stellar-kuiper-belt', 'stellar-solar-system-overview'],
    },
  ];

  for (const doc of docs) {
    try { await buildStellarWikiDoc(doc); }
    catch (e) { log(`  ✗ ${doc.title}: ${e.message}`); failed++; }
    await sleep(300);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Extreme Objects (7 docs) — extreme_universe pillar
// ─────────────────────────────────────────────────────────────────────────────

async function buildExtremeObjects() {
  log('\n══ SECTION 4: Extreme Objects (7 docs) ══');
  const docs = [
    {
      id: 'black-hole', type: 'extreme_object', title: 'Black Holes',
      wikiTitle: 'Black hole',
      tags: ['black hole', 'event horizon', 'singularity', 'Schwarzschild radius', 'gravitational collapse', 'spacetime'],
      related_topics: ['extreme-hawking-radiation', 'extreme-neutron-star', 'quantum-general-relativity'],
      useCORE: true, coreQuery: 'black hole event horizon observational astrophysics',
    },
    {
      id: 'neutron-star', type: 'extreme_object', title: 'Neutron Stars',
      wikiTitle: 'Neutron star',
      tags: ['neutron star', 'neutron degeneracy', 'supernova remnant', 'dense object', 'nuclear matter'],
      related_topics: ['extreme-pulsar', 'extreme-magnetar', 'extreme-black-hole'],
      useCORE: true, coreQuery: 'neutron star structure equation of state',
    },
    {
      id: 'pulsar', type: 'extreme_object', title: 'Pulsars — Cosmic Lighthouses',
      wikiTitle: 'Pulsar',
      tags: ['pulsar', 'rotating neutron star', 'radio pulsar', 'millisecond pulsar', 'timing', 'lighthouse model'],
      related_topics: ['extreme-neutron-star', 'extreme-magnetar'],
      useCORE: true, coreQuery: 'pulsar timing precision astrophysics',
    },
    {
      id: 'magnetar', type: 'extreme_object', title: 'Magnetars — The Strongest Magnets in the Universe',
      wikiTitle: 'Magnetar',
      tags: ['magnetar', 'soft gamma repeater', 'anomalous X-ray pulsar', 'extreme magnetic field', 'neutron star variant'],
      related_topics: ['extreme-neutron-star', 'extreme-pulsar', 'extreme-gamma-ray-burst'],
      useCORE: false,
    },
    {
      id: 'quasar', type: 'extreme_object', title: 'Quasars — Brightest Objects in the Universe',
      wikiTitle: 'Quasar',
      tags: ['quasar', 'active galactic nucleus', 'supermassive black hole', 'redshift', 'luminosity', 'quasi-stellar'],
      related_topics: ['extreme-agn', 'extreme-blazar', 'extreme-black-hole'],
      useCORE: true, coreQuery: 'quasar host galaxy supermassive black hole',
    },
    {
      id: 'hawking-radiation', type: 'extreme_object', title: 'Hawking Radiation',
      wikiTitle: 'Hawking radiation',
      tags: ['Hawking radiation', 'black hole evaporation', 'virtual particles', 'Stephen Hawking', 'information paradox', 'quantum gravity'],
      related_topics: ['extreme-black-hole', 'quantum-overview', 'quantum-black-hole-information'],
      useCORE: true, coreQuery: 'Hawking radiation black hole information paradox quantum',
    },
    {
      id: 'strange-star', type: 'extreme_object', title: 'Strange Stars and Exotic Compact Objects',
      wikiTitle: 'Strange star',
      wikiTitleFallback: 'Quark star',
      tags: ['strange star', 'quark star', 'exotic matter', 'strange quark matter', 'compact object'],
      related_topics: ['extreme-neutron-star', 'extreme-pulsar'],
      useCORE: false,
    },
  ];

  for (const doc of docs) {
    try { await buildExtremeWikiDoc(doc); }
    catch (e) { log(`  ✗ ${doc.title}: ${e.message}`); failed++; }
    await sleep(400);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Explosive Events (6 docs)
// ─────────────────────────────────────────────────────────────────────────────

async function buildExplosiveEvents() {
  log('\n══ SECTION 5: Explosive Events (6 docs) ══');
  const docs = [
    {
      id: 'supernova', type: 'extreme_event', title: 'Supernovae',
      wikiTitle: 'Supernova',
      tags: ['supernova', 'stellar explosion', 'core collapse', 'shockwave', 'element dispersal', 'heavy elements'],
      related_topics: ['stellar-nucleosynthesis', 'extreme-neutron-star', 'extreme-black-hole', 'extreme-type-ia-supernova'],
      useCORE: true, coreQuery: 'core collapse supernova stellar evolution nucleosynthesis',
    },
    {
      id: 'type-ia-supernova', type: 'extreme_event', title: 'Type Ia Supernovae — Standard Candles',
      wikiTitle: 'Type Ia supernova',
      tags: ['Type Ia supernova', 'standard candle', 'white dwarf', 'thermonuclear explosion', 'cosmological distance', 'dark energy'],
      related_topics: ['stellar-white-dwarf', 'stellar-chandrasekhar-limit', 'extreme-supernova'],
      useCORE: true, coreQuery: 'Type Ia supernova cosmological distance measurement dark energy',
    },
    {
      id: 'gamma-ray-burst', type: 'extreme_event', title: 'Gamma-Ray Bursts',
      wikiTitle: 'Gamma-ray burst',
      tags: ['gamma-ray burst', 'GRB', 'brightest explosion', 'long GRB', 'short GRB', 'collapsar', 'afterglow'],
      related_topics: ['extreme-kilonova', 'extreme-magnetar', 'extreme-neutron-star'],
      useCORE: true, coreQuery: 'gamma-ray burst progenitor mechanism jet',
    },
    {
      id: 'kilonova', type: 'extreme_event', title: 'Kilonovae — Neutron Star Mergers',
      wikiTitle: 'Kilonova',
      tags: ['kilonova', 'neutron star merger', 'gravitational waves', 'r-process', 'gold', 'platinum', 'heavy elements'],
      related_topics: ['extreme-neutron-star', 'extreme-gamma-ray-burst', 'stellar-nucleosynthesis'],
      useCORE: true, coreQuery: 'kilonova neutron star merger r-process element synthesis',
    },
    {
      id: 'hypernova', type: 'extreme_event', title: 'Hypernovae',
      wikiTitle: 'Hypernova',
      wikiTitleFallback: 'Superluminous supernova',
      tags: ['hypernova', 'superluminous supernova', 'collapsar', 'magnetar engine', 'long gamma-ray burst', 'massive star'],
      related_topics: ['extreme-supernova', 'extreme-gamma-ray-burst', 'extreme-magnetar'],
      useCORE: false,
    },
    {
      id: 'tidal-disruption', type: 'extreme_event', title: 'Tidal Disruption Events',
      wikiTitle: 'Tidal disruption event',
      tags: ['tidal disruption', 'TDE', 'star-black hole encounter', 'spaghettification', 'accretion flare', 'galactic center'],
      related_topics: ['extreme-black-hole', 'extreme-quasar', 'extreme-agn'],
      useCORE: false,
    },
  ];

  for (const doc of docs) {
    try { await buildExtremeWikiDoc(doc); }
    catch (e) { log(`  ✗ ${doc.title}: ${e.message}`); failed++; }
    await sleep(400);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: Active Galaxies (4 docs)
// ─────────────────────────────────────────────────────────────────────────────

async function buildActiveGalaxies() {
  log('\n══ SECTION 6: Active Galaxies (4 docs) ══');
  const docs = [
    {
      id: 'agn', type: 'extreme_object', title: 'Active Galactic Nuclei',
      wikiTitle: 'Active galactic nucleus',
      tags: ['active galactic nucleus', 'AGN', 'supermassive black hole', 'accretion disk', 'relativistic jets', 'Seyfert'],
      related_topics: ['extreme-quasar', 'extreme-blazar', 'extreme-radio-galaxy', 'extreme-black-hole'],
      useCORE: false,
    },
    {
      id: 'blazar', type: 'extreme_object', title: 'Blazars',
      wikiTitle: 'Blazar',
      tags: ['blazar', 'BL Lac', 'flat-spectrum radio quasar', 'relativistic jet', 'variability', 'extreme brightness'],
      related_topics: ['extreme-agn', 'extreme-quasar', 'extreme-cosmic-rays'],
      useCORE: false,
    },
    {
      id: 'radio-galaxy', type: 'extreme_object', title: 'Radio Galaxies',
      wikiTitle: 'Radio galaxy',
      tags: ['radio galaxy', 'radio lobes', 'Fanaroff-Riley', 'Cygnus A', 'jet', 'AGN class'],
      related_topics: ['extreme-agn', 'extreme-blazar', 'extreme-cosmic-rays'],
      useCORE: false,
    },
    {
      id: 'seyfert', type: 'extreme_object', title: 'Seyfert Galaxies',
      wikiTitle: 'Seyfert galaxy',
      tags: ['Seyfert galaxy', 'type 1', 'type 2', 'AGN', 'narrow-line region', 'broad-line region', 'unification model'],
      related_topics: ['extreme-agn', 'extreme-quasar', 'extreme-black-hole'],
      useCORE: false,
    },
  ];

  for (const doc of docs) {
    try { await buildExtremeWikiDoc(doc); }
    catch (e) { log(`  ✗ ${doc.title}: ${e.message}`); failed++; }
    await sleep(300);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7: Cosmic Rays (3 docs)
// ─────────────────────────────────────────────────────────────────────────────

async function buildCosmicRays() {
  log('\n══ SECTION 7: Cosmic Rays (3 docs) ══');
  const docs = [
    {
      id: 'cosmic-rays', type: 'extreme_concept', title: 'Cosmic Rays',
      wikiTitle: 'Cosmic ray',
      tags: ['cosmic rays', 'high-energy particles', 'protons', 'iron nuclei', 'atmosphere', 'secondary showers'],
      related_topics: ['extreme-uhecr', 'extreme-blazar', 'extreme-supernova'],
      useCORE: false,
    },
    {
      id: 'uhecr', type: 'extreme_concept', title: 'Ultra-High-Energy Cosmic Rays',
      wikiTitle: 'Ultra-high-energy cosmic ray',
      tags: ['ultra-high-energy cosmic rays', 'UHECR', 'GZK limit', 'Auger Observatory', 'Oh-My-God particle', 'extreme energy'],
      related_topics: ['extreme-cosmic-rays', 'extreme-blazar', 'extreme-agn'],
      useCORE: true, coreQuery: 'ultra-high-energy cosmic ray source acceleration',
    },
    {
      id: 'cosmic-ray-sources', type: 'extreme_concept', title: 'Sources and Acceleration of Cosmic Rays',
      wikiTitle: 'Fermi acceleration',
      wikiTitleFallback: 'Diffusive shock acceleration',
      tags: ['Fermi acceleration', 'shock acceleration', 'cosmic ray origin', 'supernova shock', 'AGN jets'],
      related_topics: ['extreme-cosmic-rays', 'extreme-uhecr', 'extreme-supernova'],
      useCORE: false,
    },
  ];

  for (const doc of docs) {
    try { await buildExtremeWikiDoc(doc); }
    catch (e) { log(`  ✗ ${doc.title}: ${e.message}`); failed++; }
    await sleep(300);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bridge Documents (3 docs — synthesised)
// ─────────────────────────────────────────────────────────────────────────────

async function buildBridgeDocs() {
  log('\n══ Bridge Documents (3 docs) ══');

  // 1. We Are Stardust → stellar pillar
  try {
    const { extract: nucleoExtract, url: nucleoUrl } = await fetchWikipedia('Stellar nucleosynthesis');
    const { extract: bbExtract } = await fetchWikipedia('Big Bang nucleosynthesis');
    const scientific = [
      nucleoExtract,
      '\n\nThe phrase "we are stardust" is scientific fact: every atom of carbon in your body, every oxygen atom you breathe, every iron atom in your blood — all were forged inside stars that lived and died before our Sun was born.',
      '\n\nBig Bang nucleosynthesis created only hydrogen, helium, and traces of lithium in the first minutes after the Big Bang.',
      bbExtract ? '\n\n' + bbExtract.slice(0, 800) : '',
      '\n\nAll heavier elements — from carbon (essential for life) to uranium — were created in stellar interiors, supernova explosions, and neutron star mergers (kilonovae). When massive stars explode as supernovae, they scatter these elements across the galaxy, seeding future star systems. Our Sun formed from a molecular cloud enriched by generations of earlier stars.',
    ].join('');

    const doc = makeStellarDoc({
      id: 'stellar-we-are-stardust',
      type: 'bridge_concept',
      title: 'We Are Stardust — The Cosmic Origin of Atoms',
      tags: ['stardust', 'nucleosynthesis', 'atoms', 'cosmic origin', 'human connection', 'elements', 'cosmic cycle'],
      summary: 'Every atom in the human body was forged inside stars. Stellar nucleosynthesis explains how heavy elements are created in stellar interiors and scattered by supernova explosions.',
      scientific: scientific.slice(0, 4000),
      related_topics: ['stellar-nucleosynthesis', 'extreme-supernova', 'extreme-kilonova'],
      sources: [nucleoUrl].filter(Boolean),
      license: 'CC BY-SA 4.0',
    });
    saveDoc(doc, STELLAR_DIR);
    built++;
    log('  ✓ [stellar] We Are Stardust — The Cosmic Origin of Atoms');
  } catch (e) {
    log(`  ✗ We Are Stardust: ${e.message}`);
    failed++;
  }
  await sleep(400);

  // 2. Scale of the Universe → stellar pillar
  try {
    const { extract, url } = await fetchWikipedia('Observable universe');
    const { extract: lightYearExtract } = await fetchWikipedia('Light-year');
    const scientific = [
      'The universe spans scales almost incomprehensible to human intuition — from subatomic particles to galaxy superclusters spanning hundreds of millions of light-years.',
      '\n\n' + extract,
      '\n\nA light-year — the distance light travels in one year — equals about 9.46 trillion kilometres (5.88 trillion miles).',
      lightYearExtract ? '\n\n' + lightYearExtract.slice(0, 600) : '',
      '\n\nComparative scales:\n• Earth–Moon: 384,400 km (1.3 light-seconds)\n• Earth–Sun: 150 million km (8.3 light-minutes)\n• Nearest star (Proxima Centauri): 4.24 light-years\n• Milky Way diameter: ~100,000 light-years\n• Andromeda Galaxy: 2.537 million light-years\n• Observable universe radius: ~46.5 billion light-years',
    ].join('');

    const doc = makeStellarDoc({
      id: 'stellar-scale-of-universe',
      type: 'bridge_concept',
      title: 'Scale of the Universe',
      tags: ['cosmic scale', 'observable universe', 'light-year', 'distances', 'perspective', 'size comparison'],
      summary: 'The universe spans scales from subatomic particles to superclusters. Understanding cosmic scale requires grappling with distances measured in light-years and the finite speed of light.',
      scientific: scientific.slice(0, 4000),
      related_topics: ['stellar-solar-system-overview', 'extreme-quasar'],
      sources: [url].filter(Boolean),
    });
    saveDoc(doc, STELLAR_DIR);
    built++;
    log('  ✓ [stellar] Scale of the Universe');
  } catch (e) {
    log(`  ✗ Scale of Universe: ${e.message}`);
    failed++;
  }
  await sleep(400);

  // 3. The Fate of Stars → extreme_universe pillar
  try {
    const { extract: deathExtract, url } = await fetchWikipedia('Stellar evolution');
    const { extract: heatExtract } = await fetchWikipedia('Heat death of the universe');
    const scientific = [
      'Stars do not live forever. The fate of a star is determined primarily by its initial mass — the most fundamental parameter in stellar physics.',
      '\n\n' + deathExtract.slice(0, 800),
      '\n\nFate by mass:\n• Low-mass stars (< 0.5 M☉): Cool and fade as helium white dwarfs over tens of billions of years.\n• Sun-like stars (0.5–8 M☉): Expand into red giants, shed planetary nebulae, leave white dwarfs that eventually cool to black dwarfs.\n• Massive stars (8–20 M☉): Explode as core-collapse supernovae, leaving neutron stars.\n• Very massive stars (> 20 M☉): Collapse to black holes, sometimes after hypernova or direct collapse without a bright explosion.',
      '\n\nOn cosmic timescales far longer than the current age of the universe, all stars will die. White dwarfs will cool. Neutron stars will decay. Black holes will evaporate via Hawking radiation. In the truly long run, even protons may decay — leaving an almost featureless cosmos.',
      heatExtract ? '\n\n' + heatExtract.slice(0, 600) : '',
    ].join('');

    const doc = makeExtremeDoc({
      id: 'extreme-fate-of-stars',
      type: 'bridge_concept',
      title: 'The Fate of Stars',
      tags: ['stellar death', 'fate of stars', 'black dwarf', 'heat death', 'white dwarf', 'black hole evaporation', 'cosmic future'],
      summary: 'All stars die — their fate is determined by their mass. The long-term future of stellar remnants stretches across timescales that dwarf the current age of the universe.',
      scientific: scientific.slice(0, 4500),
      related_topics: ['stellar-white-dwarf', 'extreme-neutron-star', 'extreme-black-hole', 'extreme-hawking-radiation'],
      sources: [url].filter(Boolean),
    });
    saveDoc(doc, EXTREME_DIR);
    built++;
    log('  ✓ [extreme_universe] The Fate of Stars');
  } catch (e) {
    log(`  ✗ Fate of Stars: ${e.message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  log('═══════════════════════════════════════════════════════');
  log('  AstroOracle — Stellar & Extreme Universe KB Builder  ');
  log('  Target: 53 documents (30 stellar + 20 extreme + 3 bridge)');
  log('═══════════════════════════════════════════════════════\n');

  fs.mkdirSync(STELLAR_DIR, { recursive: true });
  fs.mkdirSync(EXTREME_DIR, { recursive: true });

  await buildStellarLifecycle();
  await buildSun();
  await buildSolarSystem();
  await buildExtremeObjects();
  await buildExplosiveEvents();
  await buildActiveGalaxies();
  await buildCosmicRays();
  await buildBridgeDocs();

  log('\n═══════════════════════════════════════════════════════');
  log('  BUILD COMPLETE');
  log(`  ✓ Built: ${built}`);
  log(`  ✗ Failed: ${failed}`);
  log('═══════════════════════════════════════════════════════');
  log('\nNext: node load-to-supabase.js (after updating pillars array)');
}

main().catch(err => {
  log(`\n✗ BUILD FAILED: ${err.message}`);
  console.error(err);
  process.exit(1);
});
