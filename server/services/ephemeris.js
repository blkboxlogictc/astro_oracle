/**
 * AstroOracle V3 — Ephemeris Service
 *
 * Engine priority:
 *   1. swisseph (native C addon) — Linux/Render, full precision (~1 arcsecond)
 *   2. Simplified mean longitude  — Windows dev fallback (~1-3° accuracy)
 *
 * The fallback is accurate enough for dev work and horoscope-level readings.
 * Retrograde detection requires swisseph (speed data) — returns [] on fallback.
 */

import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

let swe = null;
try {
  swe = _require('swisseph');
  // Use built-in Moshier ephemeris — no external data files required,
  // accurate to ~1 arcsecond for dates within ±3000 years of J2000.
  console.log('[Ephemeris] Swiss Ephemeris loaded ✓');
} catch {
  console.log('[Ephemeris] swisseph unavailable — using mean longitude fallback (dev mode)');
}

// ── Constants ──────────────────────────────────────────────────────────────────

const SIGNS = [
  'Aries','Taurus','Gemini','Cancer','Leo','Virgo',
  'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces',
];

const ELEMENT = {
  Aries:'fire',  Taurus:'earth', Gemini:'air',    Cancer:'water',
  Leo:'fire',    Virgo:'earth',  Libra:'air',     Scorpio:'water',
  Sagittarius:'fire', Capricorn:'earth', Aquarius:'air', Pisces:'water',
};

const MODALITY = {
  Aries:'cardinal', Taurus:'fixed',   Gemini:'mutable',  Cancer:'cardinal',
  Leo:'fixed',      Virgo:'mutable',  Libra:'cardinal',  Scorpio:'fixed',
  Sagittarius:'mutable', Capricorn:'cardinal', Aquarius:'fixed', Pisces:'mutable',
};

// Numeric planet IDs — match swisseph SE_* constants (0=Sun … 9=Pluto)
const PLANET_IDS = {
  sun:0, moon:1, mercury:2, venus:3, mars:4,
  jupiter:5, saturn:6, uranus:7, neptune:8, pluto:9,
};

const MAJOR_ASPECTS = [
  { name:'conjunction',  angle:0,   orb:8, harmony: 0.7  },
  { name:'sextile',      angle:60,  orb:6, harmony: 0.8  },
  { name:'square',       angle:90,  orb:8, harmony:-0.6  },
  { name:'trine',        angle:120, orb:8, harmony: 1.0  },
  { name:'opposition',   angle:180, orb:8, harmony:-0.4  },
  { name:'quincunx',     angle:150, orb:3, harmony:-0.3  },
];

const TRANSIT_THEMES = {
  conjunction:'activation', sextile:'opportunity', square:'challenge',
  trine:'ease', opposition:'confrontation', quincunx:'adjustment',
};

// Annual meteor shower peak dates (month/day UTC approximate)
const METEOR_SHOWERS = [
  { name:'Quadrantids',     month:1,  day:3,  rate:'60-100/hr', constellation:'Boötes'    },
  { name:'Lyrids',          month:4,  day:22, rate:'15-20/hr',  constellation:'Lyra'       },
  { name:'Eta Aquariids',   month:5,  day:5,  rate:'40-85/hr',  constellation:'Aquarius'   },
  { name:'Delta Aquariids', month:7,  day:28, rate:'15-20/hr',  constellation:'Aquarius'   },
  { name:'Perseids',        month:8,  day:12, rate:'50-100/hr', constellation:'Perseus'    },
  { name:'Orionids',        month:10, day:21, rate:'10-20/hr',  constellation:'Orion'      },
  { name:'Leonids',         month:11, day:17, rate:'10-15/hr',  constellation:'Leo'        },
  { name:'Geminids',        month:12, day:13, rate:'120+/hr',   constellation:'Gemini'     },
  { name:'Ursids',          month:12, day:22, rate:'5-10/hr',   constellation:'Ursa Minor' },
];

// ── Math helpers ───────────────────────────────────────────────────────────────

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }
function norm(d)  { return ((d % 360) + 360) % 360; }

function angularDiff(a, b) {
  const d = Math.abs(a - b);
  return d > 180 ? 360 - d : d;
}

function longitudeToSign(lon) {
  const n = norm(lon);
  return { sign: SIGNS[Math.floor(n / 30)], degree: parseFloat((n % 30).toFixed(2)) };
}

// ── Julian Day ─────────────────────────────────────────────────────────────────

function dateToJD(date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  if (swe) return swe.swe_julday(y, m, d, h, 1 /* SE_GREG_CAL */);

  // Manual JD (Meeus Ch.7)
  const a  = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5)
    + 365 * yy + Math.floor(yy / 4)
    - Math.floor(yy / 100) + Math.floor(yy / 400)
    - 32045 + (h - 12) / 24;
}

function jdToDate(jd) {
  // Meeus Ch.7 reverse
  const z     = Math.floor(jd + 0.5);
  const f     = jd + 0.5 - z;
  const alpha = Math.floor((z - 1867216.25) / 36524.25);
  const a     = z + 1 + alpha - Math.floor(alpha / 4);
  const b     = a + 1524;
  const c     = Math.floor((b - 122.1) / 365.25);
  const d     = Math.floor(365.25 * c);
  const e     = Math.floor((b - d) / 30.6001);
  const day   = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year  = month > 2 ? c - 4716 : c - 4715;
  const hFrac = f * 24;
  return new Date(Date.UTC(year, month - 1, day, Math.floor(hFrac), Math.round((hFrac % 1) * 60)));
}

/**
 * Converts a local birth date/time + IANA timezone name to a UTC Date.
 * Uses the Intl.DateTimeFormat "shadow date" technique — no external library needed.
 */
function localToUTC(dateStr, timeStr, timezone) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const parts  = (timeStr ?? '12:00').split(':');
  const hour   = parseInt(parts[0] ?? '12', 10);
  const minute = parseInt(parts[1] ?? '0',  10);

  try {
    // Step 1: treat local time as UTC to get a reference timestamp
    const approxMs = Date.UTC(year, month - 1, day, hour, minute);

    // Step 2: format that UTC value in the target timezone to measure the offset
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', hour12: false,
    });
    const p = fmt.formatToParts(new Date(approxMs))
      .reduce((acc, x) => { acc[x.type] = x.value; return acc; }, {});

    const tzMs = Date.UTC(
      parseInt(p.year,  10),
      parseInt(p.month, 10) - 1,
      parseInt(p.day,   10),
      parseInt(p.hour,  10) % 24, // guard against "24" midnight edge-case
      parseInt(p.minute,10)
    );

    // actual UTC = 2 * approxMs − tzMs
    return new Date(2 * approxMs - tzMs);
  } catch {
    // Unknown/invalid timezone — treat local as UTC
    return new Date(Date.UTC(year, month - 1, day, hour, minute));
  }
}

// ── Planet position ────────────────────────────────────────────────────────────

function getPlanetPosition(jd, planetKey) {
  if (swe) {
    // SEFLG_SPEED (256) | SEFLG_MOSEPH (4) = 260
    const result = swe.swe_calc_ut(jd, PLANET_IDS[planetKey], 260);
    if (result.error) throw new Error(`swe_calc_ut(${planetKey}): ${result.error}`);
    const { sign, degree } = longitudeToSign(result.longitude);
    return {
      longitude:  result.longitude,
      sign,
      degree,
      retrograde: result.longitudeSpeed < 0,
      speed:      result.longitudeSpeed,
    };
  }
  return getPlanetFallback(jd, planetKey);
}

// Mean longitude orbital elements (Meeus, degrees, T = Julian centuries from J2000.0)
const MEAN_ELEMENTS = {
  sun:     { L0: 280.46646, L1: 36000.76983  },
  moon:    { L0: 218.31644, L1: 481267.88119 },
  mercury: { L0: 252.25084, L1: 149474.07078 },
  venus:   { L0: 181.97973, L1:  58519.21191 },
  mars:    { L0: 355.43299, L1:  19141.69628 },
  jupiter: { L0:  34.35151, L1:   3036.30268 },
  saturn:  { L0:  50.07744, L1:   1223.50943 },
  uranus:  { L0: 314.05500, L1:    428.46600 },
  neptune: { L0: 304.34866, L1:    218.46515 },
  pluto:   { L0: 238.92881, L1:    145.20780 },
};

function getPlanetFallback(jd, planetKey) {
  const T   = (jd - 2451545.0) / 36525;
  const e   = MEAN_ELEMENTS[planetKey];
  const lon = e ? norm(e.L0 + e.L1 * T) : 0;
  const { sign, degree } = longitudeToSign(lon);
  return { longitude: lon, sign, degree, retrograde: false, speed: 0 };
}

// ── House calculation ──────────────────────────────────────────────────────────

function calculateHouses(jd, latitude, longitude) {
  if (swe) {
    const h = swe.swe_houses(jd, latitude, longitude, 'P'); // Placidus
    if (!h.error) {
      return { cusps: h.house.slice(1, 13), ascendant: h.ascendant, mc: h.mc };
    }
  }
  return equalHousesFallback(jd, latitude, longitude);
}

function equalHousesFallback(jd, latitude, longitude) {
  const T    = (jd - 2451545.0) / 36525;
  const GMST = norm(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T);
  const RAMC = norm(GMST + longitude);
  const obl  = 23.439 - 0.013 * T;

  const ramcR = toRad(RAMC);
  const oblR  = toRad(obl);
  const latR  = toRad(latitude);

  const x = Math.cos(ramcR);
  const y = -Math.sin(ramcR) * Math.sin(oblR) - Math.tan(latR) * Math.cos(oblR);
  let asc = toDeg(Math.atan2(x, y));
  if (y < 0) asc += 180;
  asc = norm(asc);

  const mc = norm(toDeg(Math.atan2(Math.sin(ramcR), Math.cos(ramcR) * Math.cos(oblR))));

  return {
    cusps:     Array.from({ length: 12 }, (_, i) => norm(asc + i * 30)),
    ascendant: asc,
    mc,
  };
}

function getHouse(longitude, cusps) {
  const lon = norm(longitude);
  for (let i = 0; i < 12; i++) {
    const start = norm(cusps[i]);
    const end   = norm(cusps[(i + 1) % 12]);
    if (start < end ? (lon >= start && lon < end) : (lon >= start || lon < end)) return i + 1;
  }
  return 1;
}

// ── Aspects ────────────────────────────────────────────────────────────────────

function findAspects(positions) {
  const aspects = [];
  const keys = Object.keys(positions).filter(k => positions[k]?.longitude != null);
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      const diff = angularDiff(positions[keys[i]].longitude, positions[keys[j]].longitude);
      for (const asp of MAJOR_ASPECTS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          aspects.push({ planet1: keys[i], planet2: keys[j], aspect: asp.name, orb: +orb.toFixed(2) });
        }
      }
    }
  }
  return aspects;
}

// ── Chart helpers ──────────────────────────────────────────────────────────────

function getDominant(planets) {
  const el = { fire:0, earth:0, air:0, water:0 };
  const mo = { cardinal:0, fixed:0, mutable:0 };
  Object.values(planets).forEach(p => {
    if (p?.sign) { el[ELEMENT[p.sign]]++; mo[MODALITY[p.sign]]++; }
  });
  const top = obj => Object.entries(obj).sort((a, b) => b[1] - a[1])[0][0];
  return { dominantElement: top(el), dominantModality: top(mo) };
}

function getChartShape(positions) {
  const lons = Object.values(positions)
    .filter(p => p?.longitude != null)
    .map(p => norm(p.longitude))
    .sort((a, b) => a - b);
  if (lons.length < 7) return 'Unknown';
  const gaps     = lons.map((l, i) => norm(lons[(i + 1) % lons.length] - l));
  const maxGap   = Math.max(...gaps);
  const wideGaps = gaps.filter(g => g > 45).length;
  if (maxGap <= 120) return 'Bundle';
  if (maxGap <= 180) return wideGaps <= 1 ? 'Bowl' : 'Bucket';
  if (maxGap <= 240) return 'Locomotive';
  if (wideGaps >= 5)  return 'Splash';
  if (wideGaps === 3) return 'Splay';
  return 'Seesaw';
}

// ── 1. calculateNatalChart ─────────────────────────────────────────────────────

export async function calculateNatalChart(birthDate, birthTime, birthLat, birthLon, birthTimezone) {
  const utcDate = localToUTC(birthDate, birthTime, birthTimezone);
  const jd      = dateToJD(utcDate);

  const rawPos = {};
  for (const key of Object.keys(PLANET_IDS)) {
    rawPos[key] = getPlanetPosition(jd, key);
  }

  const { cusps, ascendant, mc } = calculateHouses(jd, birthLat, birthLon);

  const planets = {};
  for (const key of Object.keys(PLANET_IDS)) {
    const p = rawPos[key];
    planets[key] = {
      sign:       p.sign,
      degree:     p.degree,
      house:      getHouse(p.longitude, cusps),
      retrograde: p.retrograde,
      longitude:  p.longitude,
    };
  }

  const ascSign = longitudeToSign(ascendant);
  const mcSign  = longitudeToSign(mc);
  const { dominantElement, dominantModality } = getDominant(planets);

  return {
    ...planets,
    ascendant:        { sign: ascSign.sign, degree: ascSign.degree, longitude: ascendant },
    midheaven:        { sign: mcSign.sign,  degree: mcSign.degree,  longitude: mc        },
    houses:           cusps.map((cusp, i) => ({ house: i + 1, ...longitudeToSign(cusp), cusp: +cusp.toFixed(2) })),
    aspects:          findAspects(rawPos),
    dominantElement,
    dominantModality,
    chartShape:       getChartShape(rawPos),
  };
}

// ── 2. getCurrentPlanetaryPositions ───────────────────────────────────────────

export async function getCurrentPlanetaryPositions(date = new Date()) {
  const jd = dateToJD(date instanceof Date ? date : new Date(date));
  const positions = {};
  for (const key of Object.keys(PLANET_IDS)) {
    positions[key] = getPlanetPosition(jd, key);
  }
  return positions;
}

// ── 3. calculateTransits ──────────────────────────────────────────────────────

export async function calculateTransits(natalChart, currentDate = new Date()) {
  const current = await getCurrentPlanetaryPositions(currentDate);
  const transits = [];

  const transitPlanets = Object.keys(PLANET_IDS);
  const natalPoints    = ['sun','moon','mercury','venus','mars','jupiter','saturn','ascendant','midheaven'];
  const outerPlanets   = ['jupiter','saturn','uranus','neptune','pluto'];
  const personalPoints = ['sun','moon','mercury','venus','mars','ascendant','midheaven'];

  for (const tKey of transitPlanets) {
    const tPos = current[tKey];
    if (!tPos) continue;

    for (const nKey of natalPoints) {
      const nPos = natalChart[nKey];
      if (!nPos?.longitude) continue;

      const diff = angularDiff(tPos.longitude, nPos.longitude);
      for (const asp of MAJOR_ASPECTS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          let intensity = 4;
          if (outerPlanets.includes(tKey))    intensity += 3;
          if (personalPoints.includes(nKey))  intensity += 2;
          if (asp.name === 'conjunction' || asp.name === 'opposition') intensity += 1;
          intensity = Math.min(10, intensity);

          transits.push({
            transitPlanet: tKey,
            natalPlanet:   nKey,
            aspect:        asp.name,
            orb:           +orb.toFixed(2),
            applying:      tPos.speed > 0
              ? norm(tPos.longitude) < norm(nPos.longitude)
              : norm(tPos.longitude) > norm(nPos.longitude),
            intensity,
            theme: `${capitalize(tKey)} ${asp.name} natal ${nKey} — ${TRANSIT_THEMES[asp.name]}`,
          });
        }
      }
    }
  }

  return transits.sort((a, b) => b.intensity - a.intensity);
}

// ── 4. calculateSynastry ──────────────────────────────────────────────────────

const SYNASTRY_PAIRS = {
  'sun-moon':15,  'moon-sun':15,
  'venus-mars':12,'mars-venus':12,
  'sun-venus':10, 'venus-sun':10,
  'moon-moon':10,
  'sun-sun':8,    'moon-venus':8, 'venus-moon':8,
  'mercury-mercury':6,
  'venus-jupiter':7,'jupiter-venus':7,
};

function scoreCategory(chart1, chart2, from, to) {
  let score = 50;
  for (const p1 of from) {
    const pos1 = chart1[p1];
    if (!pos1?.longitude) continue;
    for (const p2 of to) {
      const pos2 = chart2[p2];
      if (!pos2?.longitude) continue;
      const diff = angularDiff(pos1.longitude, pos2.longitude);
      for (const asp of MAJOR_ASPECTS) {
        if (Math.abs(diff - asp.angle) <= asp.orb) score += asp.harmony * 18;
      }
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

function describeScore(score) {
  if (score >= 75) return { score, description: 'Highly compatible' };
  if (score >= 55) return { score, description: 'Generally harmonious' };
  if (score >= 40) return { score, description: 'Dynamic with tension' };
  return            { score, description: 'Challenging but growth-inducing' };
}

export async function calculateSynastry(natalChart1, natalChart2) {
  const planets     = ['sun','moon','mercury','venus','mars','jupiter','saturn'];
  const crossAspects = [];
  let rawScore = 0;
  let maxScore = 0;

  for (const p1 of planets) {
    const pos1 = natalChart1[p1];
    if (!pos1?.longitude) continue;
    for (const p2 of planets) {
      const pos2 = natalChart2[p2];
      if (!pos2?.longitude) continue;
      const pairKey = [p1, p2].sort().join('-');
      const weight  = SYNASTRY_PAIRS[`${p1}-${p2}`] ?? SYNASTRY_PAIRS[pairKey] ?? 3;
      maxScore     += weight;
      const diff    = angularDiff(pos1.longitude, pos2.longitude);
      for (const asp of MAJOR_ASPECTS) {
        const orb = Math.abs(diff - asp.angle);
        if (orb <= asp.orb) {
          rawScore += weight * asp.harmony * (1 - orb / asp.orb);
          crossAspects.push({
            person1Planet: p1, person2Planet: p2,
            aspect: asp.name, orb: +orb.toFixed(2),
            harmony: asp.harmony, significance: weight,
          });
        }
      }
    }
  }

  crossAspects.sort((a, b) =>
    b.significance * Math.abs(b.harmony) - a.significance * Math.abs(a.harmony)
  );

  const overallScore = Math.max(0, Math.min(100,
    Math.round(50 + (rawScore / Math.max(maxScore, 1)) * 50)
  ));

  const sign1 = natalChart1.sun?.sign ?? 'Unknown';
  const sign2 = natalChart2.sun?.sign ?? 'Unknown';
  const level = overallScore >= 70 ? 'strong' : overallScore >= 50 ? 'flowing' : 'complex';

  return {
    overallScore,
    sunMoonCompatibility: describeScore(scoreCategory(natalChart1, natalChart2, ['sun'],     ['moon'])),
    venusCompatibility:   describeScore(scoreCategory(natalChart1, natalChart2, ['venus'],   ['venus','mars','sun'])),
    marsCompatibility:    describeScore(scoreCategory(natalChart1, natalChart2, ['mars'],    ['venus','mars'])),
    communicationScore:   describeScore(scoreCategory(natalChart1, natalChart2, ['mercury'], ['mercury','sun'])),
    emotionalScore:       describeScore(scoreCategory(natalChart1, natalChart2, ['moon'],    ['moon','venus'])),
    aspects:        crossAspects,
    strengthAreas:  crossAspects.filter(a => a.harmony > 0).slice(0, 3)
      .map(a => `${capitalize(a.person1Planet)} ${a.aspect} ${capitalize(a.person2Planet)}`),
    challengeAreas: crossAspects.filter(a => a.harmony < 0).slice(0, 3)
      .map(a => `${capitalize(a.person1Planet)} ${a.aspect} ${capitalize(a.person2Planet)}`),
    summary: `A ${level} connection between ${sign1} and ${sign2}. ` +
      `${crossAspects.filter(a => a.harmony > 0).length} harmonious aspects and ` +
      `${crossAspects.filter(a => a.harmony < 0).length} challenging aspects shape this relationship.`,
  };
}

// ── 5. getUpcomingCosmicEvents ────────────────────────────────────────────────

// Jan 6 2000 18:14 UTC — a known new moon reference point
const REF_NEW_MOON_JD = 2451550.259722;
const SYNODIC_MONTH   = 29.530589;

export async function getUpcomingCosmicEvents(daysAhead = 30) {
  const now     = new Date();
  const endDate = new Date(now.getTime() + daysAhead * 86400000);
  const events  = [
    ...findLunations(now, endDate),
    ...findRetrogradeStations(now, endDate),
    ...findMeteorShowers(now, endDate),
  ];
  return events.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
}

function findLunations(startDate, endDate) {
  const events  = [];
  const startJD = dateToJD(startDate);
  const endJD   = dateToJD(endDate);

  let nmJD = REF_NEW_MOON_JD +
    Math.floor((startJD - REF_NEW_MOON_JD) / SYNODIC_MONTH) * SYNODIC_MONTH;

  while (nmJD <= endJD + SYNODIC_MONTH) {
    const fmJD = nmJD + SYNODIC_MONTH / 2;

    if (nmJD >= startJD && nmJD <= endJD) {
      const sun = getPlanetPosition(nmJD, 'sun');
      const { sign } = longitudeToSign(sun.longitude);
      events.push({
        event_type: 'new_moon',
        event_name: `New Moon in ${sign}`,
        event_date: jdToDate(nmJD).toISOString(),
        description: `New Moon in ${sign} — a time for new intentions and fresh beginnings`,
        scientific_description: `The Moon passes between Earth and Sun (conjunction). Illumination: 0%. Moon at ${sign} ${sun.degree}°.`,
        affected_signs: getAffectedSigns(sign),
        visibility_info: 'Not visible — Moon is between Earth and Sun',
      });
    }

    if (fmJD >= startJD && fmJD <= endJD) {
      const sun      = getPlanetPosition(fmJD, 'sun');
      const moonSign = SIGNS[(SIGNS.indexOf(sun.sign) + 6) % 12];
      events.push({
        event_type: 'full_moon',
        event_name: `Full Moon in ${moonSign}`,
        event_date: jdToDate(fmJD).toISOString(),
        description: `Full Moon in ${moonSign} — culmination, release, and emotional clarity`,
        scientific_description: `Earth is between Moon and Sun (opposition). Moon fully illuminated. Moon in ${moonSign}, Sun in ${sun.sign}.`,
        affected_signs: getAffectedSigns(moonSign),
        visibility_info: 'Visible all night — rises at sunset, sets at sunrise',
      });
    }

    nmJD += SYNODIC_MONTH;
  }
  return events;
}

function findRetrogradeStations(startDate, endDate) {
  if (!swe) return []; // requires speed data — unavailable in fallback mode

  const events  = [];
  const planets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  const startJD = dateToJD(startDate);
  const endJD   = dateToJD(endDate);

  for (const planet of planets) {
    let prevSpeed = null;
    for (let jd = startJD - 1; jd <= endJD + 1; jd += 1) {
      const pos = getPlanetPosition(jd, planet);
      if (prevSpeed !== null && pos.speed !== 0) {
        const d = jdToDate(jd);
        if (prevSpeed > 0 && pos.speed < 0 && d >= startDate && d <= endDate) {
          events.push(makeRetrogradeEvent('retrograde_start', planet, pos, d));
        } else if (prevSpeed < 0 && pos.speed > 0 && d >= startDate && d <= endDate) {
          events.push(makeRetrogradeEvent('retrograde_end', planet, pos, d));
        }
      }
      prevSpeed = pos.speed;
    }
  }
  return events;
}

function makeRetrogradeEvent(type, planet, pos, date) {
  const isRetro = type === 'retrograde_start';
  return {
    event_type: type,
    event_name: `${capitalize(planet)} ${isRetro ? 'goes retrograde' : 'goes direct'}`,
    event_date: date.toISOString(),
    description: isRetro
      ? `${capitalize(planet)} stations retrograde in ${pos.sign} — time for review and reassessment`
      : `${capitalize(planet)} stations direct in ${pos.sign} — forward momentum resumes`,
    scientific_description: isRetro
      ? `${capitalize(planet)} appears to reverse direction as Earth's orbital speed creates an optical illusion of backward motion.`
      : `${capitalize(planet)} resumes its apparent direct (forward) motion across the sky.`,
    affected_signs: getPlanetRuledSigns(planet),
    visibility_info: getVisibilityNote(planet),
  };
}

function findMeteorShowers(startDate, endDate) {
  const events = [];
  for (let year = startDate.getUTCFullYear(); year <= endDate.getUTCFullYear(); year++) {
    for (const s of METEOR_SHOWERS) {
      const peak = new Date(Date.UTC(year, s.month - 1, s.day));
      if (peak >= startDate && peak <= endDate) {
        events.push({
          event_type: 'meteor_shower',
          event_name: `${s.name} Meteor Shower`,
          event_date: peak.toISOString(),
          description: `The ${s.name} peaks tonight — up to ${s.rate} under dark skies`,
          scientific_description: `Earth passes through cometary debris. Meteors radiate from ${s.constellation} and burn up 70-120km above Earth's surface.`,
          affected_signs: [],
          visibility_info: `Best after midnight, facing ${s.constellation}. Up to ${s.rate} under dark skies.`,
        });
      }
    }
  }
  return events;
}

// ── 6. getPlanetRetrogrades ───────────────────────────────────────────────────

export async function getPlanetRetrogrades(year) {
  if (!swe) return []; // requires speed data from swisseph

  const retrogrades = [];
  const planets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto'];
  const startJD = dateToJD(new Date(Date.UTC(year, 0, 1)));
  const endJD   = dateToJD(new Date(Date.UTC(year, 11, 31)));

  for (const planet of planets) {
    let prevSpeed  = null;
    let retroStart = null;
    let retroSign  = null;

    for (let jd = startJD; jd <= endJD; jd += 1) {
      const pos = getPlanetPosition(jd, planet);
      if (prevSpeed !== null) {
        if (prevSpeed > 0 && pos.speed < 0) {
          retroStart = jdToDate(jd);
          retroSign  = pos.sign;
        } else if (prevSpeed < 0 && pos.speed > 0 && retroStart) {
          retrogrades.push({
            planet,
            sign:       retroSign,
            start_date: retroStart.toISOString().split('T')[0],
            end_date:   jdToDate(jd).toISOString().split('T')[0],
          });
          retroStart = null;
        }
      }
      prevSpeed = pos.speed;
    }
  }

  return retrogrades;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function getAffectedSigns(sign) {
  const i = SIGNS.indexOf(sign);
  if (i === -1) return [];
  return [sign, SIGNS[(i + 6) % 12], SIGNS[(i + 3) % 12], SIGNS[(i + 9) % 12]];
}

function getPlanetRuledSigns(planet) {
  return ({
    mercury:['Gemini','Virgo'],       venus:  ['Taurus','Libra'],
    mars:   ['Aries','Scorpio'],      jupiter:['Sagittarius','Pisces'],
    saturn: ['Capricorn','Aquarius'], uranus: ['Aquarius'],
    neptune:['Pisces'],               pluto:  ['Scorpio'],
  })[planet] ?? [];
}

function getVisibilityNote(planet) {
  return ({
    mercury:'Visible near the horizon just before sunrise or after sunset',
    venus:  'Brilliant "morning star" or "evening star" near the horizon',
    mars:   'Visible as a reddish point of light in the night sky',
    jupiter:'One of the brightest objects in the night sky',
    saturn: 'Visible to the naked eye as a pale yellowish star',
    uranus: 'Barely visible to the naked eye under very dark skies',
    neptune:'Requires binoculars or a telescope to observe',
    pluto:  'Requires a large telescope to observe',
  })[planet] ?? '';
}
