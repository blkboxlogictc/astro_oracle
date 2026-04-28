import { tool } from '@langchain/core/tools';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { z } from 'zod';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Topic guard ────────────────────────────────────────────────────────────────
const ON_TOPIC_KEYWORDS = [
  'star', 'stars', 'stellar', 'galaxy', 'galaxies', 'nebula', 'nebulae',
  'cosmos', 'cosmic', 'universe', 'space', 'planet', 'planets',
  'solar', 'moon', 'lunar', 'sun', 'solar system', 'orbit', 'comet', 'asteroid',
  'black hole', 'neutron star', 'supernova', 'pulsar', 'quasar', 'dark matter',
  'dark energy', 'big bang', 'telescope', 'nasa', 'esa', 'spacecraft', 'satellite',
  'constellation', 'constellations', 'astrophysics', 'astronomy', 'cosmology',
  'quantum', 'quanta', 'photon', 'electron', 'particle', 'wave function',
  'entanglement', 'superposition', 'uncertainty', 'planck', 'relativity',
  'spacetime', 'wormhole', 'multiverse', 'string theory', 'higgs', 'boson',
  'fermion', 'hadron', 'neutrino', 'antimatter', 'radiation', 'electromagnetic',
  'astrology', 'astrological', 'zodiac', 'horoscope', 'birth chart', 'natal chart',
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
  'ascendant', 'rising sign', 'retrograde', 'transit', 'aspect', 'conjunction',
  'eclipse', 'equinox', 'solstice', 'celestial', 'ephemeris',
  'myth', 'mythology', 'mythological', 'greek', 'roman', 'norse', 'egyptian',
  'sumerian', 'vedic', 'deity', 'god', 'goddess', 'titan', 'olympus',
  'sacred', 'spiritual', 'astral', 'divine', 'cosmic energy',
  'chakra', 'karma', 'meditation', 'consciousness', 'metaphysical',
];

export function isOnTopic(question) {
  const lower = question.toLowerCase();
  return ON_TOPIC_KEYWORDS.some(kw => lower.includes(kw));
}

const OFF_TOPIC_RESPONSE =
  "I'm AstroOracle — your guide to astronomy, cosmology, astrology, quantum physics, and cosmic mythology. " +
  "I'm not able to help with that topic, but I'd love to explore the stars or your cosmic profile with you!";

function extractMainSubject(question) {
  return question
    .replace(/^(what|who|where|when|how|why|can you|could you|tell me|explain|describe|i want to know|do you know)\s+(about|is|are|was|were|the|a|an)?\s*/i, '')
    .replace(/[?.!]+$/, '')
    .trim() || question;
}

// ── Tool 1: Supabase RAG ───────────────────────────────────────────────────────
export const searchKnowledgeBaseTool = tool(
  async ({ query }) => {
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
    });
    const embedding = embeddingRes.data[0].embedding;

    const { data, error } = await supabase.rpc('search_knowledge_base', {
      query_embedding: embedding,
      match_threshold: 0.60,
      match_count: 5,
    });

    if (error) return `Knowledge base error: ${error.message}`;
    if (!data?.length) return 'No relevant knowledge found in the local database.';

    return data
      .map(r => {
        const fullText = r.content?.text
          ? r.content.text.slice(0, 3000)
          : r.content
          ? Object.values(r.content).filter(Boolean).join(' ').slice(0, 3000)
          : r.summary ?? '';
        return `[${r.title}] (similarity: ${(r.similarity * 100).toFixed(0)}%)\n${fullText}`;
      })
      .join('\n\n---\n\n');
  },
  {
    name: 'search_knowledge_base',
    description:
      "Search AstroOracle's curated knowledge base (astronomy, astrophysics, cosmology, " +
      'astrology, zodiac, mythology, cosmic spirituality, quantum physics). ' +
      'Use this first before searching the web.',
    schema: z.object({
      query: z.string().describe('The search query — a concept, term, or question'),
    }),
  }
);

// ── Tool 2: Tavily live web search ─────────────────────────────────────────────
export const searchWebTool = tool(
  async ({ question }) => {
    if (!isOnTopic(question)) return OFF_TOPIC_RESPONSE;

    const query = extractMainSubject(question);
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: 5,
        include_answer: false,
      }),
    });

    if (!res.ok) return `Web search error: ${res.status} ${res.statusText}`;

    const json = await res.json();
    const results = json.results ?? [];
    if (!results.length) return 'No live web results found.';

    return results
      .map(r => `[${r.title ?? 'Web Result'}]\nURL: ${r.url ?? ''}\n${r.content ?? ''}`)
      .join('\n\n---\n\n');
  },
  {
    name: 'search_web',
    description:
      'Search the live web for current information about astronomy, cosmology, astrophysics, ' +
      'astrology, quantum physics, space news, or cosmic mythology.',
    schema: z.object({
      question: z.string().describe("The user's original question or topic to search for"),
    }),
  }
);

// ── Tool 3: CORE academic research ────────────────────────────────────────────
export const searchResearchPapersTool = tool(
  async ({ topic }) => {
    if (!isOnTopic(topic)) return OFF_TOPIC_RESPONSE;

    const subject = extractMainSubject(topic);
    const currentYear = new Date().getFullYear();
    const yearFilter = currentYear - 5;

    const url = new URL('https://api.core.ac.uk/v3/search/works');
    url.searchParams.set(
      'q',
      `${subject} astronomy OR astrophysics OR cosmology OR "quantum physics" OR astrology OR mythology`
    );
    url.searchParams.set('limit', '4');
    url.searchParams.set('sort', 'publishedDate:desc');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${process.env.CORE_API_KEY}` },
    });

    if (!res.ok) return `CORE API error: ${res.status} ${res.statusText}`;
    const json = await res.json();

    if (!json.results?.length) return 'No academic papers found.';

    return json.results
      .map(p => {
        const year = p.publishedDate ? new Date(p.publishedDate).getFullYear() : null;
        const recency = year && year >= yearFilter ? ` [Recent: ${year}]` : year ? ` [${year}]` : '';
        const authors = p.authors?.slice(0, 2).map(a => a.name).join(', ') ?? 'Unknown';
        return [
          `[${p.title ?? 'Untitled'}]${recency}`,
          `Authors: ${authors}`,
          p.doi ? `DOI: https://doi.org/${p.doi}` : '',
          p.abstract ? p.abstract.slice(0, 300) + '…' : 'No abstract available.',
        ].filter(Boolean).join('\n');
      })
      .join('\n\n---\n\n');
  },
  {
    name: 'search_research_papers',
    description:
      'Search peer-reviewed academic papers about astronomy, astrophysics, cosmology, ' +
      'quantum physics, astrology, or cosmic mythology via the CORE academic API.',
    schema: z.object({
      topic: z.string().describe('The topic or concept to search research papers for'),
    }),
  }
);
