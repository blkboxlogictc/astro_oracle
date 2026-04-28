/**
 * AstroOracle — Quantum Physics & Quantum Cosmology Knowledge Base Builder
 * =========================================================================
 * Builds 50 documents across 6 categories:
 *   1. Foundational Quantum Mechanics  (15 docs) — Wikipedia primary
 *   2. Quantum Interpretations          (8 docs)  — Wikipedia + SEP
 *   3. Quantum Field Theory & Particles (7 docs)  — Wikipedia primary
 *   4. Quantum Cosmology & Gravity     (10 docs)  — Wikipedia + CORE API
 *   5. Quantum Technology               (5 docs)  — Wikipedia primary
 *   6. Mystic Bridge Documents          (5 docs)  — Wikipedia + SEP
 *
 * Sources (in priority order):
 *   Primary:    Wikipedia REST API (CC BY-SA 4.0)
 *   Secondary:  Stanford Encyclopedia of Philosophy (freely accessible)
 *   Tertiary:   CORE Academic API (abstracts, fair use)
 *
 * Run: node build-quantum-knowledge.js
 * Then: node load-to-supabase.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'knowledge-base', 'quantum_physics');

let built = 0;
let failed = 0;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function saveDoc(doc) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, `${doc.id}.json`), JSON.stringify(doc, null, 2));
}

function makeDoc({ id, type, title, tags, summary, scientific, metadata = {}, related_topics = [], sources = [], license = 'CC BY-SA 4.0' }) {
  return {
    id,
    pillar: 'quantum_physics',
    type,
    title,
    tags: ['quantum', 'physics', 'science', ...tags],
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

async function fetchSEP(slug) {
  const url = `https://plato.stanford.edu/entries/${slug}/`;
  const res = await fetch(url, { headers: { 'User-Agent': 'AstroOracle-KnowledgeBuilder/1.0' } });
  if (!res.ok) throw new Error(`SEP ${res.status} for "${slug}"`);
  const html = await res.text();
  // Extract preamble section — the intro before the first numbered section
  const preamble = html.match(/<div id="preamble"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '';
  // Strip HTML tags
  const text = preamble.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return text.slice(0, 3000);
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

// ── Generic Wikipedia-based document builder ──────────────────────────────────

async function buildWikiDoc({ id, type, title, wikiTitle, wikiTitleFallback, tags, related_topics = [], extraContent = '' }) {
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

  const doc = makeDoc({
    id: `quantum-${id}`,
    type,
    title,
    tags,
    summary: extract.slice(0, 300),
    scientific: fullText.slice(0, 4000),
    related_topics,
    sources: [url].filter(Boolean),
  });
  saveDoc(doc);
  built++;
  log(`  ✓ ${title}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: Foundational Quantum Mechanics (15 documents)
// ─────────────────────────────────────────────────────────────────────────────

async function buildFoundational() {
  log('\n══ SECTION 1: Foundational Quantum Mechanics (15 docs) ══');
  const docs = [
    {
      id: 'overview', type: 'quantum_concept', title: 'Quantum Mechanics — Overview',
      wikiTitle: 'Quantum mechanics',
      tags: ['quantum mechanics', 'overview', 'wave function', 'probability', 'subatomic'],
      related_topics: ['cosmology-observable-universe', 'cosmology-big-bang'],
    },
    {
      id: 'wave-particle-duality', type: 'quantum_concept', title: 'Wave–Particle Duality',
      wikiTitle: 'Wave–particle duality',
      tags: ['wave-particle duality', 'light', 'photon', 'electron', 'double-slit'],
      related_topics: ['quantum-photoelectric-effect'],
    },
    {
      id: 'double-slit-experiment', type: 'quantum_concept', title: 'The Double-Slit Experiment',
      wikiTitle: 'Double-slit experiment',
      tags: ['double-slit', 'interference', 'wave-particle duality', 'quantum measurement', 'observer'],
      related_topics: ['quantum-wave-particle-duality', 'quantum-observer-effect'],
    },
    {
      id: 'uncertainty-principle', type: 'quantum_concept', title: 'Heisenberg Uncertainty Principle',
      wikiTitle: 'Uncertainty principle',
      tags: ['uncertainty principle', 'Heisenberg', 'position', 'momentum', 'measurement limit'],
      related_topics: ['quantum-overview', 'quantum-wave-function'],
    },
    {
      id: 'superposition', type: 'quantum_concept', title: 'Quantum Superposition',
      wikiTitle: 'Quantum superposition',
      tags: ['superposition', 'quantum states', 'interference', 'wave function'],
      related_topics: ['quantum-schrodingers-cat', 'quantum-wave-function', 'quantum-decoherence'],
    },
    {
      id: 'entanglement', type: 'quantum_concept', title: 'Quantum Entanglement',
      wikiTitle: 'Quantum entanglement',
      tags: ['entanglement', 'EPR paradox', 'Bell theorem', 'nonlocality', 'quantum correlation', 'cosmology'],
      related_topics: ['quantum-teleportation', 'quantum-entanglement-cosmic-connection', 'spirituality-cosmic-energy'],
    },
    {
      id: 'schrodingers-cat', type: 'quantum_concept', title: "Schrödinger's Cat",
      wikiTitle: "Schrödinger's cat",
      tags: ["Schrödinger's cat", 'thought experiment', 'superposition', 'measurement', 'macroscopic quantum'],
      related_topics: ['quantum-superposition', 'quantum-measurement-problem', 'quantum-decoherence'],
    },
    {
      id: 'tunneling', type: 'quantum_concept', title: 'Quantum Tunneling',
      wikiTitle: 'Quantum tunnelling',
      tags: ['tunneling', 'barrier penetration', 'nuclear fusion', 'radioactive decay', 'stars'],
      related_topics: ['quantum-nuclear-fusion', 'cosmology-stellar-evolution'],
    },
    {
      id: 'wave-function', type: 'quantum_concept', title: 'Wave Function & Wave Function Collapse',
      wikiTitle: 'Wave function collapse',
      tags: ['wave function', 'collapse', 'measurement', 'probability amplitude', 'observer'],
      related_topics: ['quantum-overview', 'quantum-superposition', 'quantum-measurement-problem'],
    },
    {
      id: 'spin', type: 'quantum_concept', title: 'Quantum Spin',
      wikiTitle: 'Spin (physics)',
      tags: ['spin', 'fermion', 'boson', 'angular momentum', 'magnetic moment', 'Pauli'],
      related_topics: ['quantum-pauli-exclusion', 'quantum-standard-model'],
    },
    {
      id: 'pauli-exclusion', type: 'quantum_concept', title: 'Pauli Exclusion Principle',
      wikiTitle: 'Pauli exclusion principle',
      tags: ['Pauli exclusion', 'fermion', 'electron', 'neutron star', 'white dwarf', 'orbital'],
      related_topics: ['cosmology-neutron-stars', 'cosmology-white-dwarf', 'quantum-spin'],
    },
    {
      id: 'decoherence', type: 'quantum_concept', title: 'Quantum Decoherence',
      wikiTitle: 'Quantum decoherence',
      tags: ['decoherence', 'classical limit', 'environment', 'measurement', 'macroscopic', 'philosophy'],
      related_topics: ['quantum-wave-function', 'quantum-many-worlds', 'quantum-measurement-problem'],
    },
    {
      id: 'planck-constant', type: 'quantum_concept', title: "Planck's Constant & Quantization",
      wikiTitle: "Planck constant",
      tags: ['Planck constant', 'quantization', 'energy levels', 'blackbody radiation', 'Max Planck'],
      related_topics: ['quantum-photoelectric-effect', 'quantum-overview'],
    },
    {
      id: 'photoelectric-effect', type: 'quantum_concept', title: 'The Photoelectric Effect',
      wikiTitle: 'Photoelectric effect',
      tags: ['photoelectric effect', 'Einstein', 'photon', 'light quanta', 'Nobel Prize'],
      related_topics: ['quantum-wave-particle-duality', 'quantum-planck-constant'],
    },
    {
      id: 'zero-point-energy', type: 'quantum_concept', title: 'Zero-Point Energy',
      wikiTitle: 'Zero-point energy',
      tags: ['zero-point energy', 'quantum vacuum', 'ground state', 'Casimir effect', 'vacuum fluctuations'],
      related_topics: ['quantum-vacuum-energy-mystic', 'cosmology-dark-energy', 'spirituality-cosmic-energy'],
    },
  ];

  for (const d of docs) { try { await buildWikiDoc(d); } catch (e) { log(`  ✗ ${d.title}: ${e.message}`); failed++; } await sleep(300); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: Quantum Interpretations (8 documents) — Wikipedia + SEP
// ─────────────────────────────────────────────────────────────────────────────

async function buildInterpretations() {
  log('\n══ SECTION 2: Quantum Interpretations (8 docs) ══');

  const interpDocs = [
    { id: 'copenhagen', title: 'Copenhagen Interpretation', wiki: 'Copenhagen interpretation', sep: 'qm-copenhagen', tags: ['Copenhagen', 'Bohr', 'Heisenberg', 'measurement', 'philosophy'] },
    { id: 'many-worlds', title: 'Many-Worlds Interpretation', wiki: 'Many-worlds interpretation', sep: 'qm-manyworlds', tags: ['many-worlds', 'Everett', 'branching', 'multiverse', 'philosophy'] },
    { id: 'pilot-wave', title: 'Pilot Wave Theory (de Broglie–Bohm)', wiki: 'De Broglie–Bohm theory', sep: 'bohm-mech', tags: ['pilot wave', 'Bohm', 'de Broglie', 'hidden variables', 'determinism'] },
    { id: 'qbism', title: 'QBism (Quantum Bayesianism)', wiki: 'QBism', sep: null, tags: ['QBism', 'Bayesian', 'subjective', 'agent', 'philosophy'] },
    { id: 'relational-qm', title: 'Relational Quantum Mechanics', wiki: 'Relational quantum mechanics', sep: null, tags: ['relational', 'Rovelli', 'observer-dependent', 'relations', 'philosophy'] },
    { id: 'consistent-histories', title: 'Consistent Histories Interpretation', wiki: 'Consistent histories', sep: null, tags: ['consistent histories', 'Griffiths', 'frameworks', 'decoherence', 'philosophy'] },
    { id: 'objective-collapse', title: 'Objective Collapse Theories', wiki: 'Objective-collapse theory', sep: null, tags: ['objective collapse', 'GRW', 'spontaneous collapse', 'Penrose', 'wavefunction'] },
    { id: 'measurement-problem', title: 'The Quantum Measurement Problem', wiki: 'Measurement problem', sep: null, tags: ['measurement problem', 'observer', 'collapse', 'philosophy', 'consciousness'] },
  ];

  for (const d of interpDocs) {
    try {
      const { extract, url } = await fetchWikipedia(d.wiki).catch(() => ({ extract: '', url: '' }));
      let scientific = extract;

      if (d.sep) {
        try {
          const sepText = await fetchSEP(d.sep);
          if (sepText.length > 200) scientific = scientific + '\n\n[Stanford Encyclopedia of Philosophy]\n' + sepText;
        } catch (e) { log(`  ↳ SEP unavailable for ${d.id}: ${e.message}`); }
        await sleep(500);
      }

      const doc = makeDoc({
        id: `quantum-${d.id}`,
        type: 'quantum_interpretation',
        title: d.title,
        tags: ['philosophy', ...d.tags],
        summary: extract.slice(0, 300),
        scientific: scientific.slice(0, 4000),
        related_topics: ['quantum-measurement-problem', 'quantum-decoherence', 'quantum-overview'],
        sources: [url, d.sep ? `https://plato.stanford.edu/entries/${d.sep}/` : ''].filter(Boolean),
        license: 'CC BY-SA 4.0 (Wikipedia); freely accessible (Stanford Encyclopedia of Philosophy)',
      });
      saveDoc(doc);
      built++;
      log(`  ✓ ${d.title}`);
    } catch (e) { log(`  ✗ ${d.title}: ${e.message}`); failed++; }
    await sleep(300);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3: Quantum Field Theory & Particle Physics (7 documents)
// ─────────────────────────────────────────────────────────────────────────────

async function buildParticlePhysics() {
  log('\n══ SECTION 3: Quantum Field Theory & Particles (7 docs) ══');
  const docs = [
    { id: 'qft', title: 'Quantum Field Theory', wikiTitle: 'Quantum field theory', tags: ['QFT', 'fields', 'virtual particles', 'quantum', 'standard model'], related_topics: ['quantum-standard-model', 'quantum-higgs-boson'] },
    { id: 'standard-model', title: 'Standard Model of Particle Physics', wikiTitle: 'Standard Model', tags: ['Standard Model', 'quarks', 'leptons', 'bosons', 'fundamental forces', 'standard model', 'particles'], related_topics: ['quantum-qft', 'quantum-higgs-boson', 'quantum-quarks-leptons'] },
    { id: 'quarks-leptons', title: 'Quarks and Leptons', wikiTitle: 'Quark', tags: ['quarks', 'leptons', 'fermion', 'hadron', 'proton', 'neutron', 'particles'], related_topics: ['quantum-standard-model', 'quantum-qft'] },
    { id: 'higgs-boson', title: 'Higgs Boson and the Higgs Field', wikiTitle: 'Higgs boson', tags: ['Higgs boson', 'Higgs field', 'mass', 'LHC', 'CERN', 'God particle', 'standard model'], related_topics: ['quantum-standard-model', 'quantum-qft'] },
    { id: 'virtual-particles', title: 'Virtual Particles and Vacuum Fluctuations', wikiTitle: 'Virtual particle', tags: ['virtual particles', 'vacuum fluctuations', 'Casimir effect', 'Feynman diagrams', 'QFT'], related_topics: ['quantum-zero-point-energy', 'quantum-hawking-radiation'] },
    { id: 'antimatter', title: 'Antimatter', wikiTitle: 'Antimatter', tags: ['antimatter', 'antiparticle', 'positron', 'annihilation', 'matter-antimatter asymmetry', 'cosmology'], related_topics: ['cosmology-big-bang', 'quantum-standard-model'] },
    { id: 'qed', title: 'Quantum Electrodynamics (QED)', wikiTitle: 'Quantum electrodynamics', tags: ['QED', 'quantum electrodynamics', 'Feynman', 'photon', 'electrons', 'electromagnetism'], related_topics: ['quantum-qft', 'quantum-standard-model'] },
  ];
  for (const d of docs) { try { await buildWikiDoc(d); } catch (e) { log(`  ✗ ${d.title}: ${e.message}`); failed++; } await sleep(300); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4: Quantum Cosmology & Gravity (10 documents) — Wikipedia + CORE
// ─────────────────────────────────────────────────────────────────────────────

async function buildQuantumCosmology() {
  log('\n══ SECTION 4: Quantum Cosmology & Gravity (10 docs) ══');

  const coreQueries = {
    'quantum-gravity-overview': 'quantum gravity overview',
    'loop-quantum-gravity': 'loop quantum gravity',
    'string-theory': 'string theory cosmology',
    'hawking-radiation': 'Hawking radiation black holes',
    'information-paradox': 'black hole information paradox',
    'holographic-principle': 'holographic principle cosmology',
  };

  const docs = [
    { id: 'quantum-gravity-overview', title: 'Quantum Gravity', wikiTitle: 'Quantum gravity', tags: ['quantum gravity', 'graviton', 'spacetime foam', 'Planck scale', 'cosmology'], related_topics: ['cosmology-big-bang', 'quantum-loop-quantum-gravity', 'quantum-string-theory'] },
    { id: 'loop-quantum-gravity', title: 'Loop Quantum Gravity', wikiTitle: 'Loop quantum gravity', tags: ['loop quantum gravity', 'LQG', 'spin networks', 'spacetime', 'Planck scale', 'cosmology'], related_topics: ['quantum-quantum-gravity-overview', 'cosmology-big-bang'] },
    { id: 'string-theory', title: 'String Theory and M-Theory', wikiTitle: 'String theory', tags: ['string theory', 'M-theory', 'extra dimensions', 'branes', 'theory of everything', 'cosmology'], related_topics: ['quantum-quantum-gravity-overview', 'quantum-multiverse'] },
    { id: 'quantum-origin-universe', title: 'The Quantum Origin of the Universe', wikiTitle: 'Quantum cosmology', tags: ['quantum cosmology', 'wave function of universe', 'Planck epoch', 'Big Bang', 'cosmology', 'universe'], related_topics: ['cosmology-big-bang', 'quantum-hawking-radiation', 'quantum-cosmic-inflation'] },
    { id: 'hawking-radiation', title: 'Hawking Radiation', wikiTitle: 'Hawking radiation', tags: ['Hawking radiation', 'black hole evaporation', 'virtual particles', 'Stephen Hawking', 'information paradox', 'cosmology'], related_topics: ['cosmology-black-hole', 'quantum-information-paradox', 'constellation-cygnus'] },
    { id: 'black-holes-quantum', title: 'Black Holes and Quantum Mechanics', wikiTitle: 'Black hole thermodynamics', tags: ['black holes', 'quantum mechanics', 'thermodynamics', 'entropy', 'Bekenstein', 'cosmology'], related_topics: ['cosmology-black-hole', 'quantum-hawking-radiation', 'quantum-holographic-principle'] },
    { id: 'information-paradox', title: 'Black Hole Information Paradox', wikiTitle: 'Black hole information paradox', tags: ['information paradox', 'Hawking', 'unitarity', 'entropy', 'firewall', 'cosmology'], related_topics: ['quantum-hawking-radiation', 'quantum-holographic-principle', 'cosmology-black-hole'] },
    { id: 'holographic-principle', title: 'The Holographic Principle', wikiTitle: 'Holographic principle', tags: ['holographic principle', 'entropy', 'AdS/CFT', 'Bekenstein', 'black holes', 'cosmology'], related_topics: ['quantum-information-paradox', 'quantum-string-theory', 'cosmology-black-hole'] },
    { id: 'quantum-fluctuations-cosmic', title: 'Quantum Fluctuations and Cosmic Structure', wikiTitle: 'Quantum fluctuation', tags: ['quantum fluctuations', 'cosmic structure', 'inflation', 'CMB', 'large-scale structure', 'cosmology', 'universe'], related_topics: ['cosmology-big-bang', 'cosmology-observable-universe', 'quantum-cosmic-inflation'] },
    { id: 'cosmic-inflation', title: 'Cosmic Inflation', wikiTitle: 'Inflation (cosmology)', tags: ['inflation', 'cosmic inflation', 'inflationary universe', 'horizon problem', 'flatness problem', 'cosmology', 'universe'], related_topics: ['cosmology-big-bang', 'quantum-quantum-origin-universe', 'quantum-multiverse'] },
  ];

  for (const d of docs) {
    try {
      const { extract, url } = await fetchWikipedia(d.wikiTitle);
      let scientific = extract;

      // Enrich with CORE API abstracts for research-heavy topics
      if (coreQueries[d.id]) {
        try {
          const papers = await fetchCORE(coreQueries[d.id], 2);
          if (papers.length) {
            const paperText = papers.map(p => {
              const year = p.publishedDate ? new Date(p.publishedDate).getFullYear() : '';
              return `[Research: ${p.title ?? 'Untitled'}${year ? ` (${year})` : ''}]\n${(p.abstract ?? '').slice(0, 400)}`;
            }).join('\n\n');
            scientific = scientific + '\n\n' + paperText;
          }
          await sleep(400);
        } catch (e) { log(`  ↳ CORE unavailable: ${e.message}`); }
      }

      const doc = makeDoc({
        id: `quantum-${d.id}`,
        type: 'quantum_cosmology',
        title: d.title,
        tags: d.tags,
        summary: extract.slice(0, 300),
        scientific: scientific.slice(0, 4000),
        related_topics: d.related_topics,
        sources: [url].filter(Boolean),
        license: 'CC BY-SA 4.0 (Wikipedia); abstracts via CORE API (fair use)',
      });
      saveDoc(doc);
      built++;
      log(`  ✓ ${d.title}`);
    } catch (e) { log(`  ✗ ${d.title}: ${e.message}`); failed++; }
    await sleep(300);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5: Quantum Technology & Applications (5 documents)
// ─────────────────────────────────────────────────────────────────────────────

async function buildQuantumTech() {
  log('\n══ SECTION 5: Quantum Technology (5 docs) ══');
  const docs = [
    { id: 'quantum-computing', title: 'Quantum Computing', wikiTitle: 'Quantum computing', tags: ['quantum computing', 'qubit', 'superposition', 'quantum advantage', 'technology', 'quantum computing'] },
    { id: 'quantum-cryptography', title: 'Quantum Cryptography', wikiTitle: 'Quantum cryptography', tags: ['quantum cryptography', 'QKD', 'quantum key distribution', 'security', 'technology'] },
    { id: 'quantum-teleportation', title: 'Quantum Teleportation', wikiTitle: 'Quantum teleportation', tags: ['quantum teleportation', 'entanglement', 'information transfer', 'no-cloning', 'technology'] },
    { id: 'quantum-sensors', title: 'Quantum Sensors and Metrology', wikiTitle: 'Quantum sensing', wikiTitleFallback: 'Quantum metrology', tags: ['quantum sensors', 'metrology', 'precision measurement', 'atomic clock', 'technology'] },
    { id: 'quantum-internet', title: 'The Quantum Internet', wikiTitle: 'Quantum network', wikiTitleFallback: 'Quantum key distribution', tags: ['quantum internet', 'quantum network', 'entanglement', 'communication', 'technology', 'future'] },
  ];
  for (const d of docs) { try { await buildWikiDoc(d); } catch (e) { log(`  ✗ ${d.title}: ${e.message}`); failed++; } await sleep(300); }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6: Mystic Bridge Documents (5 documents) — Wikipedia + SEP
// These connect quantum science to our mystic/spirituality audience
// ─────────────────────────────────────────────────────────────────────────────

async function buildMysticBridges() {
  log('\n══ SECTION 6: Mystic Bridge Documents (5 docs) ══');

  const bridges = [
    {
      id: 'quantum-consciousness-mystic',
      title: 'Quantum Consciousness',
      wikiTitle: 'Orchestrated objective reduction',
      wikiTitleFallback: 'Quantum mind',
      sepSlug: null,
      tags: ['consciousness', 'Penrose', 'Hameroff', 'Orch-OR', 'microtubules', 'philosophy', 'spirituality', 'mystic'],
      extra: 'Quantum consciousness theories (such as Penrose-Hameroff Orchestrated Objective Reduction) propose that quantum processes in microtubules within neurons may give rise to conscious experience. This remains highly controversial in mainstream physics and neuroscience — most physicists consider it speculative. However, it represents the most scientifically grounded attempt to link quantum mechanics to the mind, and is frequently cited in discussions of consciousness, free will, and the nature of subjective experience.',
      related_topics: ['quantum-observer-effect-mystic', 'quantum-many-worlds', 'spirituality-cosmic-energy'],
    },
    {
      id: 'observer-effect-mystic',
      title: 'The Observer Effect and Reality',
      wikiTitle: 'Observer effect (physics)',
      sepSlug: null,
      tags: ['observer effect', 'measurement', 'consciousness', 'reality', 'philosophy', 'spirituality', 'mystic'],
      extra: 'In quantum mechanics, the "observer" is not a conscious mind — it is any physical interaction that causes decoherence or measurement. A camera, detector, or atom can be an "observer." The popular spiritual interpretation that "consciousness creates reality" or that human observation collapses the wave function is not supported by mainstream physics. However, the genuine weirdness of quantum measurement — that observing a system changes it — has legitimately inspired philosophical reflection on the relationship between mind and matter, and between subject and object.',
      related_topics: ['quantum-wave-function', 'quantum-decoherence', 'quantum-quantum-consciousness-mystic'],
    },
    {
      id: 'entanglement-cosmic-connection',
      title: 'Quantum Entanglement and Cosmic Connection',
      wikiTitle: 'Quantum entanglement',
      sepSlug: 'qt-entangle',
      tags: ['entanglement', 'nonlocality', 'cosmic connection', 'universal oneness', 'spirituality', 'mystic', 'philosophy'],
      extra: 'Quantum entanglement — the non-local correlation between particles regardless of distance — has captured widespread spiritual imagination as evidence of universal interconnectedness. In reality, entanglement does not allow faster-than-light communication and cannot be used to transmit information instantaneously. However, the genuine non-local character of quantum correlations (confirmed by Bell test experiments) does suggest that reality is more deeply interconnected at a fundamental level than classical physics assumed — a fact that resonates with many spiritual traditions that emphasize the unity of all things.',
      related_topics: ['quantum-entanglement', 'spirituality-cosmic-energy', 'quantum-quantum-consciousness-mystic'],
    },
    {
      id: 'vacuum-energy-mystic',
      title: 'Zero-Point Energy and the Quantum Vacuum',
      wikiTitle: 'Vacuum energy',
      sepSlug: null,
      tags: ['zero-point energy', 'quantum vacuum', 'dark energy', 'vacuum fluctuations', 'spirituality', 'mystic'],
      extra: 'The quantum vacuum is not empty — it seethes with virtual particles and zero-point energy, a baseline energy that cannot be removed even at absolute zero. This vacuum energy is real and measurable (the Casimir effect demonstrates it). In spiritual and new-age contexts, "zero point energy" is often claimed as a source of free energy or as evidence of an underlying cosmic field of consciousness. These claims are not supported by physics — vacuum energy cannot be harvested as usable power with known technology. The real physics, however, is genuinely mysterious: vacuum energy is implicated in the cosmological constant problem and may relate to dark energy.',
      related_topics: ['quantum-zero-point-energy', 'cosmology-dark-energy', 'spirituality-cosmic-energy'],
    },
    {
      id: 'multiverse-parallel-realities',
      title: 'The Multiverse and Parallel Realities',
      wikiTitle: 'Multiverse',
      sepSlug: 'qm-manyworlds',
      tags: ['multiverse', 'parallel universes', 'many-worlds', 'eternal inflation', 'string landscape', 'spirituality', 'mystic', 'cosmology'],
      extra: 'The multiverse is not one idea — it is several distinct scientific proposals: the Many-Worlds Interpretation (quantum branching), the Inflationary Multiverse (bubble universes from eternal inflation), and the String Theory Landscape (different vacua with different physical laws). None of these have been directly observed, but all emerge from mainstream physics. In spiritual and metaphysical traditions, the idea of parallel realities and alternate selves has deep roots. Interestingly, the scientific multiverse ideas arose independently from physics rather than from spirituality — yet they converge on similar imagery of branching, infinite, interconnected realities.',
      related_topics: ['quantum-many-worlds', 'quantum-cosmic-inflation', 'quantum-string-theory', 'cosmology-observable-universe'],
    },
  ];

  for (const b of bridges) {
    try {
      const { extract, url } = await fetchWikipedia(b.wikiTitle).catch(async () => {
        if (b.wikiTitleFallback) return fetchWikipedia(b.wikiTitleFallback);
        return { extract: b.title, url: '' };
      });

      let scientific = extract;

      if (b.sepSlug) {
        try {
          const sepText = await fetchSEP(b.sepSlug);
          if (sepText.length > 200) scientific = scientific + '\n\n[Stanford Encyclopedia of Philosophy]\n' + sepText;
          await sleep(500);
        } catch (e) { log(`  ↳ SEP unavailable: ${e.message}`); }
      }

      scientific = scientific + '\n\n' + b.extra;

      const doc = makeDoc({
        id: `quantum-${b.id}`,
        type: 'mystic_bridge',
        title: b.title,
        tags: b.tags,
        summary: extract.slice(0, 300),
        scientific: scientific.slice(0, 4000),
        related_topics: b.related_topics,
        sources: [url, b.sepSlug ? `https://plato.stanford.edu/entries/${b.sepSlug}/` : ''].filter(Boolean),
        license: 'CC BY-SA 4.0 (Wikipedia); freely accessible (Stanford Encyclopedia of Philosophy)',
      });
      saveDoc(doc);
      built++;
      log(`  ✓ ${b.title}`);
    } catch (e) { log(`  ✗ ${b.title}: ${e.message}`); failed++; }
    await sleep(300);
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  log('══════════════════════════════════════════════════════');
  log('  AstroOracle — Quantum Physics KB Builder           ');
  log('  Target: 50 documents across 6 categories           ');
  log('══════════════════════════════════════════════════════\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  await buildFoundational();
  await buildInterpretations();
  await buildParticlePhysics();
  await buildQuantumCosmology();
  await buildQuantumTech();
  await buildMysticBridges();

  log('\n══════════════════════════════════════════════════════');
  log(`  BUILD COMPLETE`);
  log(`  ✓ Built:  ${built} documents`);
  log(`  ✗ Failed: ${failed} documents`);
  log(`  Output:   output/knowledge-base/quantum_physics/`);
  log(`\n  Next step: add 'quantum_physics' to loadAllDocuments()`);
  log(`  Then run:  node load-to-supabase.js`);
  log('══════════════════════════════════════════════════════\n');
}

main().catch(err => { console.error(err); process.exit(1); });
