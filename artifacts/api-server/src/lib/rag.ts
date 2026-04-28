import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

const supabase = createClient(
  process.env["SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_KEY"]!,
);

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

async function embedQuery(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });
  return response.data[0]!.embedding;
}

interface KnowledgeDoc {
  id: string;
  pillar: string;
  title: string;
  summary: string;
  content: Record<string, unknown> | null;
  tags: string[];
  sources: string[];
  similarity: number;
}

interface SearchOptions {
  matchCount?: number;
  matchThreshold?: number;
  filterPillar?: string | null;
}

async function searchKnowledgeBase(
  query: string,
  options: SearchOptions = {},
): Promise<KnowledgeDoc[]> {
  const { matchCount = 5, matchThreshold = 0.45, filterPillar = null } =
    options;

  const embedding = await embedQuery(query);

  const { data, error } = await supabase.rpc("search_knowledge_base", {
    query_embedding: embedding,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_pillar: filterPillar,
  });

  if (error) {
    console.error("Supabase search error:", error);
    return [];
  }

  return (data as KnowledgeDoc[]) ?? [];
}

function formatContextBlock(docs: KnowledgeDoc[]): string {
  if (!docs.length) return "";

  const formatted = docs
    .map((doc, i) => {
      const c = doc.content as Record<string, unknown> | null;
      const contentText =
        typeof c === "string"
          ? (c as string)
          : ((c?.["scientific"] ?? c?.["mystic"] ?? JSON.stringify(c)) as
              | string
              | undefined);

      return `[KNOWLEDGE SOURCE ${i + 1}]
Title: ${doc.title}
Pillar: ${doc.pillar}
Similarity: ${(doc.similarity * 100).toFixed(0)}%

${doc.summary}

${contentText?.slice(0, 800) ?? ""}

Sources: ${(doc.sources ?? []).join(", ")}
---`;
    })
    .join("\n\n");

  return `\n\nRELEVANT KNOWLEDGE BASE CONTEXT:\n${formatted}\n\nUse the above context to inform your answer. Cite sources naturally when relevant.`;
}

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

export interface RAGPromptResult {
  systemPrompt: string;
  contextDocs: KnowledgeDoc[];
}

export async function buildRAGPrompt(
  userMessage: string,
  mode: "science" | "mystic" = "science",
  options: { matchCount?: number; matchThreshold?: number } = {},
): Promise<RAGPromptResult> {
  const contextDocs = await searchKnowledgeBase(userMessage, {
    matchCount: options.matchCount ?? 4,
    matchThreshold: options.matchThreshold ?? 0.45,
  });

  const contextBlock = formatContextBlock(contextDocs);
  const basePrompt =
    mode === "mystic" ? BASE_MYSTIC_PROMPT : BASE_SCIENCE_PROMPT;

  return { systemPrompt: basePrompt + contextBlock, contextDocs };
}
