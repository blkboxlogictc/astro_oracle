/**
 * AstroOracle — Load Knowledge Base to Supabase
 * ================================================
 * Takes the JSON documents built by build-knowledge-base.js
 * and loads them into Supabase with vector embeddings via
 * the OpenAI or Anthropic embeddings API.
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js openai dotenv
 *
 * Required .env variables:
 *   SUPABASE_URL=
 *   SUPABASE_SERVICE_KEY=
 *   OPENAI_API_KEY=          (for embeddings — cheaper than Anthropic for this)
 *
 * Run AFTER build-knowledge-base.js:
 *   node load-to-supabase.js
 *
 * Supabase SQL to run first (in Supabase SQL editor):
 * See bottom of this file for the CREATE TABLE statement.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, 'output', 'knowledge-base');

// ─── Clients ──────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry(fn, retries = 3, delayMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      log(`  ↻ Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

/**
 * Converts a knowledge base document into a flat text string
 * suitable for embedding. Combines the most semantically rich fields.
 */
function documentToEmbeddingText(doc) {
  if (doc.type === 'star') {
    const m = doc.metadata || {};
    const parts = [
      `Star: ${doc.title}`,
      `Summary: ${doc.summary}`,
      m.constellation_name ? `Constellation: ${m.constellation_name} (${m.constellation_abbr})` : null,
      m.magnitude !== null && m.magnitude !== undefined ? `Visual magnitude: ${m.magnitude}` : null,
      m.distance_ly ? `Distance from Earth: ${m.distance_ly} light-years` : null,
      m.spectral_type ? `Spectral type: ${m.spectral_type}` : null,
      m.color_index !== null && m.color_index !== undefined ? `Color index (B-V): ${m.color_index}` : null,
      doc.content?.scientific ? `Details: ${doc.content.scientific}` : null,
      doc.tags?.length ? `Tags: ${doc.tags.join(', ')}` : null,
    ].filter(Boolean);
    return parts.join('\n');
  }

  const parts = [
    `Title: ${doc.title}`,
    `Summary: ${doc.summary}`,
  ];

  if (doc.content?.scientific) {
    parts.push(`Scientific content: ${doc.content.scientific.slice(0, 1500)}`);
  }
  if (doc.content?.named_stars) {
    parts.push(`Notable stars: ${doc.content.named_stars.slice(0, 500)}`);
  }
  if (doc.tags?.length) {
    parts.push(`Tags: ${doc.tags.join(', ')}`);
  }

  return parts.join('\n\n');
}

/**
 * Generate an embedding vector for a piece of text using OpenAI.
 * text-embedding-3-small is fast, cheap, and 1536 dimensions —
 * perfect for Supabase pgvector.
 */
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000), // token safety limit
  });
  return response.data[0].embedding;
}

// ─── Load all JSON docs from output directory ─────────────────────────────────

function loadAllDocuments() {
  const docs = [];
  const pillars = ['constellations', 'cosmology', path.join('stars', 'individual'), 'astrology', 'mythology', 'spirituality', 'quantum_physics', 'stellar', 'extreme_universe'];

  pillars.forEach(pillar => {
    const dir = path.join(OUTPUT_DIR, pillar);
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
    files.forEach(file => {
      try {
        const raw = fs.readFileSync(path.join(dir, file), 'utf-8');
        docs.push(JSON.parse(raw));
      } catch (err) {
        log(`  ⚠ Could not parse ${file}: ${err.message}`);
      }
    });
  });

  return docs;
}

// ─── Main Loader ──────────────────────────────────────────────────────────────

async function loadToSupabase() {
  log('═══════════════════════════════════════');
  log('  AstroOracle → Supabase Loader        ');
  log('═══════════════════════════════════════\n');

  // Validate env vars
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY', 'OPENAI_API_KEY'];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    log(`✗ Missing environment variables: ${missing.join(', ')}`);
    log('  Copy .env.example to .env and fill in your keys.');
    process.exit(1);
  }

  const docs = loadAllDocuments();
  log(`Found ${docs.length} documents to load.\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    log(`[${i + 1}/${docs.length}] ${doc.title}`);

    try {
      await withRetry(async () => {
        const embeddingText = documentToEmbeddingText(doc);
        const embedding = await generateEmbedding(embeddingText);

        const { error } = await supabase
          .from('knowledge_base')
          .upsert({
            id: doc.id,
            pillar: doc.pillar,
            type: doc.type,
            title: doc.title,
            tags: doc.tags,
            summary: doc.summary,
            content: doc.content,
            metadata: doc.metadata,
            related_topics: doc.related_topics,
            sources: doc.sources,
            content_license: doc.content_license,
            embedding,
            generated_at: doc.generated_at,
          }, { onConflict: 'id' });

        if (error) throw error;
      });

      log(`  ✓ Uploaded with embedding`);
      successCount++;
      await sleep(250);

    } catch (err) {
      log(`  ✗ Failed after retries: ${err.message}`);
      errorCount++;
    }
  }

  log('\n═══════════════════════════════════════');
  log(`  LOAD COMPLETE`);
  log(`  ✓ Successful: ${successCount}`);
  log(`  ✗ Failed: ${errorCount}`);
  log('═══════════════════════════════════════\n');

  if (successCount > 0) {
    log('Your knowledge base is live in Supabase!');
    log('Next: integrate the RAG query function into your AstroOracle backend.');
  }
}

loadToSupabase().catch(err => {
  log(`\n✗ LOADER FAILED: ${err.message}`);
  console.error(err);
  process.exit(1);
});


/*
═══════════════════════════════════════════════════════
  SUPABASE SQL — Run this in your Supabase SQL Editor
  BEFORE running this script
═══════════════════════════════════════════════════════

-- Enable the pgvector extension (one time)
create extension if not exists vector;

-- Create the knowledge base table
create table if not exists knowledge_base (
  id text primary key,
  pillar text not null,
  type text not null,
  title text not null,
  tags text[],
  summary text,
  content jsonb,
  metadata jsonb,
  related_topics text[],
  sources text[],
  content_license text,
  embedding vector(1536),
  generated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create vector similarity search index
create index if not exists knowledge_base_embedding_idx
  on knowledge_base
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Create text search index on title and summary
create index if not exists knowledge_base_title_idx
  on knowledge_base using gin(to_tsvector('english', title || ' ' || coalesce(summary, '')));

-- Create the RAG search function used by your backend
create or replace function search_knowledge_base(
  query_embedding vector(1536),
  match_threshold float default 0.5,
  match_count int default 5,
  filter_pillar text default null
)
returns table (
  id text,
  pillar text,
  title text,
  summary text,
  content jsonb,
  tags text[],
  sources text[],
  similarity float
)
language sql stable
as $$
  select
    kb.id,
    kb.pillar,
    kb.title,
    kb.summary,
    kb.content,
    kb.tags,
    kb.sources,
    1 - (kb.embedding <=> query_embedding) as similarity
  from knowledge_base kb
  where
    1 - (kb.embedding <=> query_embedding) > match_threshold
    and (filter_pillar is null or kb.pillar = filter_pillar)
  order by kb.embedding <=> query_embedding
  limit match_count;
$$;

*/
