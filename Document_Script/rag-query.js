/**
 * AstroOracle — RAG Query Function
 * ==================================
 * Drop this into your AstroOracle backend (serverless function or Express).
 * This is the core function that powers the AI's knowledge retrieval.
 *
 * How it works:
 *   1. User sends a question
 *   2. We embed the question into a vector
 *   3. We search Supabase for the most similar knowledge base documents
 *   4. We inject those documents into the Claude API prompt
 *   5. Claude answers using your curated knowledge, not just training data
 *
 * Usage in your /api/chat serverless function:
 *   import { buildRAGPrompt } from './rag-query.js';
 *   const { systemPrompt, contextDocs } = await buildRAGPrompt(userMessage, mode);
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Embed a query ────────────────────────────────────────────────────────────

async function embedQuery(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });
  return response.data[0].embedding;
}

// ─── Search knowledge base ────────────────────────────────────────────────────

async function searchKnowledgeBase(query, options = {}) {
  const {
    matchCount = 5,
    matchThreshold = 0.45,
    filterPillar = null,
  } = options;

  const embedding = await embedQuery(query);

  const { data, error } = await supabase.rpc('search_knowledge_base', {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_pillar: filterPillar,
  });

  if (error) {
    console.error('Supabase search error:', error);
    return [];
  }

  return data || [];
}

// ─── Format retrieved docs into context block ─────────────────────────────────

function formatContextBlock(docs) {
  if (!docs.length) return '';

  const formatted = docs.map((doc, i) => {
    const content = typeof doc.content === 'string'
      ? doc.content
      : doc.content?.scientific || doc.content?.mystic || JSON.stringify(doc.content);

    return `[KNOWLEDGE SOURCE ${i + 1}]
Title: ${doc.title}
Pillar: ${doc.pillar}
Similarity: ${(doc.similarity * 100).toFixed(0)}%

${doc.summary}

${content?.slice(0, 800) || ''}

Sources: ${(doc.sources || []).join(', ')}
---`;
  }).join('\n\n');

  return `\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${formatted}\n\nUse the above context to inform your answer. Cite sources naturally when relevant.`;
}

// ─── System prompts ───────────────────────────────────────────────────────────

const BASE_SCIENCE_PROMPT = `You are AstroOracle, an expert AI on astronomy, astrophysics, cosmology, and the science of constellations. You blend deep scientific accuracy with accessible, wonder-filled explanations. You make the cosmos feel alive and fascinating.

Core behavior:
- Always prioritize accuracy. If you are uncertain about a specific measurement or fact, say so.
- Make complex concepts approachable without dumbing them down.
- When discussing constellations, mention both their astronomical properties and the stories behind them.
- If the knowledge base context contains relevant information, use it as your primary source.
- Cite sources naturally (e.g., "According to current astronomical data..." or "Wikipedia's constellation data notes...").`;

const BASE_MYSTIC_PROMPT = `You are AstroOracle, a mystical cosmic guide with deep knowledge of astrology, zodiac signs, constellation mythology, ancient sky lore, cosmic spirituality, and pseudo-scientific cosmic traditions. Speak with warmth, mystery, and wisdom.

Core behavior:
- Honor the traditions and beliefs you discuss, even if they are not scientifically validated.
- Make the user feel connected to the universe and the ancient peoples who studied the skies.
- When discussing astrology, present it as a rich symbolic language and tradition, not as literal prediction.
- Use evocative, atmospheric language that makes the cosmos feel personal and meaningful.
- If the knowledge base context contains relevant information, weave it into your response naturally.`;

// ─── Main RAG function ────────────────────────────────────────────────────────

/**
 * Build a RAG-enhanced system prompt for a given user query and mode.
 *
 * @param {string} userMessage - The user's question
 * @param {string} mode - 'science' | 'mystic'
 * @param {object} options - Additional options
 * @returns {{ systemPrompt: string, contextDocs: array }}
 */
export async function buildRAGPrompt(userMessage, mode = 'science', options = {}) {
  // Search the knowledge base
  const contextDocs = await searchKnowledgeBase(userMessage, {
    matchCount: options.matchCount || 4,
    matchThreshold: options.matchThreshold || 0.45,
  });

  // Build context block from retrieved docs
  const contextBlock = formatContextBlock(contextDocs);

  // Select base prompt based on mode
  const basePrompt = mode === 'mystic' ? BASE_MYSTIC_PROMPT : BASE_SCIENCE_PROMPT;

  // Combine base prompt + retrieved context
  const systemPrompt = basePrompt + contextBlock;

  return { systemPrompt, contextDocs };
}

// ─── Full chat handler — drop into your serverless function ──────────────────

/**
 * Complete chat handler with RAG + streaming.
 * Use this in your /api/chat endpoint.
 *
 * @param {Request} req
 * @param {Response} res
 */
export async function handleChatRequest(req, res) {
  const { messages, mode = 'science' } = await req.json();

  if (!messages?.length) {
    return new Response('No messages provided', { status: 400 });
  }

  const userMessage = messages[messages.length - 1]?.content || '';

  try {
    // Build RAG-enhanced system prompt
    const { systemPrompt, contextDocs } = await buildRAGPrompt(userMessage, mode);

    console.log(`RAG: Retrieved ${contextDocs.length} context documents for query: "${userMessage.slice(0, 60)}..."`);

    // Stream response from Claude
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Return as a readable stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-RAG-Sources': contextDocs.length.toString(),
      },
    });

  } catch (err) {
    console.error('Chat handler error:', err);
    return new Response('Internal server error', { status: 500 });
  }
}

// ─── Self-growing RAG: Save new findings back to Supabase ────────────────────

/**
 * When the AI finds information not in the knowledge base,
 * save it as a new document for future queries.
 *
 * Call this from your backend when AI uses web search or CORE API.
 *
 * @param {object} doc - New document to save
 */
export async function saveNewKnowledgeDocument(doc) {
  const {
    title,
    content,
    pillar = 'discovered',
    tags = [],
    sources = [],
  } = doc;

  const id = `discovered-${Date.now()}-${title.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`;
  const summary = typeof content === 'string' ? content.slice(0, 300) : JSON.stringify(content).slice(0, 300);

  // Generate embedding for the new document
  const embeddingText = `Title: ${title}\nSummary: ${summary}\nTags: ${tags.join(', ')}`;
  const embedding = await embedQuery(embeddingText);

  const { error } = await supabase
    .from('knowledge_base')
    .insert({
      id,
      pillar,
      type: 'discovered',
      title,
      tags,
      summary,
      content: typeof content === 'string' ? { scientific: content } : content,
      sources,
      embedding,
      generated_at: new Date().toISOString(),
      content_license: 'AI discovered — verify before use',
    });

  if (error) {
    console.error('Failed to save new knowledge document:', error);
    return null;
  }

  console.log(`New knowledge saved: "${title}" (id: ${id})`);
  return id;
}
