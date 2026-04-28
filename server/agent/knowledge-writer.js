import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { randomUUID } from 'crypto';
import { isOnTopic } from './tools.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MIN_CONTENT_LENGTH = 200;

function inferPillar(text) {
  const lower = text.toLowerCase();
  if (/quantum|particle|wave function|entanglement|superposition|relativity|planck/.test(lower))
    return 'quantum_physics';
  if (/astrology|zodiac|horoscope|birth chart|retrograde|mercury|venus|mars|saturn/.test(lower))
    return 'astrology';
  if (/myth|mythology|greek|roman|norse|titan|olympus|deity|goddess/.test(lower))
    return 'mythology';
  if (/spiritual|chakra|karma|meditation|cosmic energy|astral|divine|sacred/.test(lower))
    return 'spirituality';
  return 'astronomy';
}

function buildTitle(question) {
  return question
    .replace(/^(what|who|where|when|how|why|can you|could you|tell me|explain|describe|what are|what is|what was|what were)\s+(about|is|are|was|were|the|a|an)?\s*/i, '')
    .replace(/\b(latest|most recent|newest|current|today'?s?|right now|in \d{4}|as of \d{4}|this year|last year|recently|just|new)\b/gi, '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/\s+(launched|discovered|found|announced|released|reported)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[?.!,]+$/, '')
    .trim()
    .slice(0, 80);
}

async function isDuplicate(embedding) {
  const { data } = await supabase.rpc('search_knowledge_base', {
    query_embedding: embedding,
    match_threshold: 0.93,
    match_count: 1,
  });
  return !!(data && data.length > 0);
}

export async function maybeWriteToKnowledgeBase(question, agentResponse, toolsUsed) {
  const usedExternalTool = toolsUsed.some(t =>
    t === 'search_web' || t === 'search_research_papers'
  );
  if (!usedExternalTool) return { saved: false, reason: 'no external tools used' };
  if (!isOnTopic(question)) return { saved: false, reason: 'off-topic' };
  if (agentResponse.length < MIN_CONTENT_LENGTH) return { saved: false, reason: 'response too short' };

  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: agentResponse.slice(0, 2000),
  });
  const embedding = embeddingRes.data[0].embedding;

  if (await isDuplicate(embedding)) return { saved: false, reason: 'duplicate content already in KB' };

  const pillar = inferPillar(agentResponse);
  const title = buildTitle(question);
  const sourceLabel = toolsUsed.includes('search_research_papers') ? 'core_academic' : 'tavily_web';

  const { error } = await supabase.from('knowledge_base').insert({
    id: `agent-${randomUUID()}`,
    pillar,
    type: 'agent_discovery',
    title,
    summary: agentResponse.slice(0, 500),
    content: { text: agentResponse },
    sources: [sourceLabel],
    embedding,
    metadata: { origin: 'agent_auto_write', tools_used: toolsUsed },
    generated_at: new Date().toISOString(),
  });

  if (error) return { saved: false, reason: `supabase insert error: ${error.message}` };
  return { saved: true };
}
