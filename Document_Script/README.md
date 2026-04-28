# AstroOracle Knowledge Base Builder

Pulls accurate astronomical data from free, openly licensed sources and
formats it into RAG-ready documents for Supabase.

## Sources Used

| Source | Content | License |
|--------|---------|---------|
| Wikipedia API | Constellation articles, cosmology topics | CC BY-SA 4.0 |
| HYG Star Database (GitHub) | All named stars with measurements | CC BY-SA 2.5 |
| IAU | Official constellation boundaries | Public reference |

You are legally free to use and adapt all of this content.

---

## What Gets Built

- **88 constellation documents** — each with scientific facts, named stars,
  Wikipedia summary, and source attribution
- **20 cosmology topic documents** — Big Bang, black holes, dark matter, etc.
- **Named star index** — every named star with magnitude, distance, spectral type
- All formatted as structured JSON ready to embed and upload to Supabase

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
- Create a free account at supabase.com
- Create a new project
- Go to SQL Editor and run the SQL block at the bottom of load-to-supabase.js
  (creates the table, indexes, and search function)

### 3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your actual keys
```

You need:
- **SUPABASE_URL** and **SUPABASE_SERVICE_KEY** from your Supabase project settings
- **OPENAI_API_KEY** for generating embeddings (very cheap — ~$0.02 for all 108 docs)
- **ANTHROPIC_API_KEY** for the chat function in rag-query.js

---

## Running

### Step 1 — Build the knowledge base files
```bash
npm run build
```

This fetches data from Wikipedia and GitHub and writes JSON files to:
```
output/
  knowledge-base/
    constellations/     ← 88 JSON files
    cosmology/          ← 20 JSON files
    stars/              ← hyg-named-stars.json
    build-summary.json
  build-log.txt
```

Takes about 5-8 minutes due to respectful API rate limiting.

### Step 2 — Load to Supabase
```bash
npm run load
```

This reads all the JSON files, generates vector embeddings via OpenAI,
and uploads everything to your Supabase knowledge_base table.

### Or run both steps at once
```bash
npm run build-and-load
```

---

## Using in Your AstroOracle Backend

Copy `rag-query.js` into your AstroOracle project and use it in your
`/api/chat` serverless function:

```javascript
import { buildRAGPrompt } from './rag-query.js';

export default async function handler(req) {
  const { messages, mode } = await req.json();
  const userMessage = messages[messages.length - 1].content;

  // This retrieves relevant knowledge and builds a context-aware system prompt
  const { systemPrompt, contextDocs } = await buildRAGPrompt(userMessage, mode);

  // Then use systemPrompt with the Anthropic API as normal
  // ...
}
```

---

## Re-running & Updating

The knowledge base can be rebuilt anytime:
- Run `npm run build` to refresh all content from Wikipedia
- Run `npm run load` to re-upload (uses upsert — safe to run multiple times)
- The `saveNewKnowledgeDocument()` function in rag-query.js lets the AI
  save new knowledge it discovers via web search automatically

---

## Cost Estimate

| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Wikipedia API | 216 requests | Free |
| HYG Database (GitHub) | 1 file download | Free |
| OpenAI embeddings | ~108 documents | ~$0.02 |
| Supabase | Storage + queries | Free tier |

**Total: approximately $0.02 to build the entire knowledge base.**
