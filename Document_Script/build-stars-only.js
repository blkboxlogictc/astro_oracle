/**
 * Fast star document builder — reads existing hyg-named-stars.json
 * and generates individual star documents without re-fetching Wikipedia.
 *
 * Run: npm run build-stars
 * Then: npm run load   (to upload the new star documents to Supabase)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'knowledge-base');

const CONSTELLATIONS = [
  { name: 'Andromeda', abbr: 'And' }, { name: 'Antlia', abbr: 'Ant' },
  { name: 'Apus', abbr: 'Aps' }, { name: 'Aquarius', abbr: 'Aqr' },
  { name: 'Aquila', abbr: 'Aql' }, { name: 'Ara', abbr: 'Ara' },
  { name: 'Aries', abbr: 'Ari' }, { name: 'Auriga', abbr: 'Aur' },
  { name: 'Boötes', abbr: 'Boo' }, { name: 'Caelum', abbr: 'Cae' },
  { name: 'Camelopardalis', abbr: 'Cam' }, { name: 'Cancer', abbr: 'Cnc' },
  { name: 'Canes Venatici', abbr: 'CVn' }, { name: 'Canis Major', abbr: 'CMa' },
  { name: 'Canis Minor', abbr: 'CMi' }, { name: 'Capricornus', abbr: 'Cap' },
  { name: 'Carina', abbr: 'Car' }, { name: 'Cassiopeia', abbr: 'Cas' },
  { name: 'Centaurus', abbr: 'Cen' }, { name: 'Cepheus', abbr: 'Cep' },
  { name: 'Cetus', abbr: 'Cet' }, { name: 'Chamaeleon', abbr: 'Cha' },
  { name: 'Circinus', abbr: 'Cir' }, { name: 'Columba', abbr: 'Col' },
  { name: 'Coma Berenices', abbr: 'Com' }, { name: 'Corona Australis', abbr: 'CrA' },
  { name: 'Corona Borealis', abbr: 'CrB' }, { name: 'Corvus', abbr: 'Crv' },
  { name: 'Crater', abbr: 'Crt' }, { name: 'Crux', abbr: 'Cru' },
  { name: 'Cygnus', abbr: 'Cyg' }, { name: 'Delphinus', abbr: 'Del' },
  { name: 'Dorado', abbr: 'Dor' }, { name: 'Draco', abbr: 'Dra' },
  { name: 'Equuleus', abbr: 'Equ' }, { name: 'Eridanus', abbr: 'Eri' },
  { name: 'Fornax', abbr: 'For' }, { name: 'Gemini', abbr: 'Gem' },
  { name: 'Grus', abbr: 'Gru' }, { name: 'Hercules', abbr: 'Her' },
  { name: 'Horologium', abbr: 'Hor' }, { name: 'Hydra', abbr: 'Hya' },
  { name: 'Hydrus', abbr: 'Hyi' }, { name: 'Indus', abbr: 'Ind' },
  { name: 'Lacerta', abbr: 'Lac' }, { name: 'Leo', abbr: 'Leo' },
  { name: 'Leo Minor', abbr: 'LMi' }, { name: 'Lepus', abbr: 'Lep' },
  { name: 'Libra', abbr: 'Lib' }, { name: 'Lupus', abbr: 'Lup' },
  { name: 'Lynx', abbr: 'Lyn' }, { name: 'Lyra', abbr: 'Lyr' },
  { name: 'Mensa', abbr: 'Men' }, { name: 'Microscopium', abbr: 'Mic' },
  { name: 'Monoceros', abbr: 'Mon' }, { name: 'Musca', abbr: 'Mus' },
  { name: 'Norma', abbr: 'Nor' }, { name: 'Octans', abbr: 'Oct' },
  { name: 'Ophiuchus', abbr: 'Oph' }, { name: 'Orion', abbr: 'Ori' },
  { name: 'Pavo', abbr: 'Pav' }, { name: 'Pegasus', abbr: 'Peg' },
  { name: 'Perseus', abbr: 'Per' }, { name: 'Phoenix', abbr: 'Phe' },
  { name: 'Pictor', abbr: 'Pic' }, { name: 'Pisces', abbr: 'Psc' },
  { name: 'Piscis Austrinus', abbr: 'PsA' }, { name: 'Puppis', abbr: 'Pup' },
  { name: 'Pyxis', abbr: 'Pyx' }, { name: 'Reticulum', abbr: 'Ret' },
  { name: 'Sagitta', abbr: 'Sge' }, { name: 'Sagittarius', abbr: 'Sgr' },
  { name: 'Scorpius', abbr: 'Sco' }, { name: 'Sculptor', abbr: 'Scl' },
  { name: 'Scutum', abbr: 'Sct' }, { name: 'Serpens', abbr: 'Ser' },
  { name: 'Sextans', abbr: 'Sex' }, { name: 'Taurus', abbr: 'Tau' },
  { name: 'Telescopium', abbr: 'Tel' }, { name: 'Triangulum', abbr: 'Tri' },
  { name: 'Triangulum Australe', abbr: 'TrA' }, { name: 'Tucana', abbr: 'Tuc' },
  { name: 'Ursa Major', abbr: 'UMa' }, { name: 'Ursa Minor', abbr: 'UMi' },
  { name: 'Vela', abbr: 'Vel' }, { name: 'Virgo', abbr: 'Vir' },
  { name: 'Volans', abbr: 'Vol' }, { name: 'Vulpecula', abbr: 'Vul' },
];

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
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

const starsFile = path.join(OUTPUT_DIR, 'stars', 'hyg-named-stars.json');
if (!fs.existsSync(starsFile)) {
  console.error('hyg-named-stars.json not found. Run npm run build first to fetch HYG data.');
  process.exit(1);
}

const allStars = JSON.parse(fs.readFileSync(starsFile, 'utf-8'));
const starsDir = path.join(OUTPUT_DIR, 'stars', 'individual');
fs.mkdirSync(starsDir, { recursive: true });

allStars.forEach(star => {
  const doc = buildStarDocument(star);
  fs.writeFileSync(
    path.join(starsDir, `${slugify(star.name)}.json`),
    JSON.stringify(doc, null, 2)
  );
});

console.log(`✓ Generated ${allStars.length} individual star documents → output/knowledge-base/stars/individual/`);
console.log('Next: run npm run load to upload them to Supabase.');
