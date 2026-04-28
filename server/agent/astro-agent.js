import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import {
  isOnTopic,
  searchKnowledgeBaseTool,
  searchWebTool,
  searchResearchPapersTool,
} from './tools.js';

const SCIENCE_PROMPT =
  'You are AstroOracle in Science Mode — a precise, knowledgeable guide to astronomy, ' +
  'astrophysics, cosmology, quantum physics, and space science. ' +
  "Answer the user's question using the context provided. Be accurate, educational, and engaging.";

const MYSTIC_PROMPT =
  'You are AstroOracle in Mystic Mode — an ethereal, poetic guide to astrology, zodiac wisdom, ' +
  'cosmic mythology, and celestial spirituality. Speak with warmth and wonder. ' +
  "Answer the user's question using the context provided.";

function pickExternalTool(question) {
  const lower = question.toLowerCase();

  if (/\b(research|studies|study|papers?|academic|journal|peer.reviewed|scientists?\s+(found|say|report)|published|findings)\b/.test(lower)) {
    return 'research';
  }

  const DEEP_SCIENCE = [
    'quantum', 'wave function', 'entanglement', 'superposition',
    'uncertainty principle', 'planck', 'boson', 'fermion', 'hadron',
    'neutrino', 'string theory', 'higgs', 'antimatter', 'particle physics',
    'dark matter', 'dark energy', 'neutron star', 'pulsar', 'quasar',
    'gravitational wave', 'hawking radiation', 'event horizon', 'singularity',
    'spacetime', 'general relativity', 'special relativity', 'wormhole',
    'multiverse', 'big bang', 'cosmic inflation', 'baryogenesis',
    'stellar evolution', 'nucleosynthesis', 'main sequence', 'white dwarf',
    'red giant', 'stellar interior', 'nuclear fusion', 'plasma physics',
    'cosmological constant', 'hubble tension', 'cosmic microwave background',
    'lambda cdm', 'redshift', 'baryon acoustic',
  ];

  if (DEEP_SCIENCE.some(kw => lower.includes(kw))) return 'research';
  return 'web';
}

function extractText(response) {
  return typeof response.content === 'string'
    ? response.content
    : response.content.map(b => b.text ?? '').join('');
}

function streamChunks(text, res, chunkSize = 80) {
  for (let i = 0; i < text.length; i += chunkSize) {
    res.write(
      `data: ${JSON.stringify({ type: 'text', content: text.slice(i, i + chunkSize) })}\n\n`
    );
  }
}

function buildModel() {
  return new ChatAnthropic({
    model: 'claude-sonnet-4-6',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    temperature: 0.7,
  });
}

async function synthesise(question, context, mode, res, systemPrefix = '') {
  const basePrompt = mode === 'science' ? SCIENCE_PROMPT : MYSTIC_PROMPT;
  const system = (systemPrefix ? systemPrefix + '\n\n' : '') +
    basePrompt + '\n\nContext:\n\n' + context;

  const response = await buildModel().invoke([
    new SystemMessage(system),
    new HumanMessage(question),
  ]);

  const text = extractText(response);
  streamChunks(text, res);
  return text;
}

export async function runAstroAgent(question, mode, res, systemPrefix = '') {
  if (!isOnTopic(question)) {
    const refusal =
      "I'm AstroOracle — your guide to astronomy, cosmology, astrology, quantum physics, and cosmic mythology. " +
      "I'm not able to help with that topic, but I'd love to explore the stars with you!";
    res.write(`data: ${JSON.stringify({ type: 'text', content: refusal })}\n\n`);
    return { toolsUsed: [], fullText: refusal };
  }

  const toolsUsed = [];

  // Step 1: always search KB first — in code, not Claude's choice
  res.write(`data: ${JSON.stringify({ type: 'tool_start', tool: 'search_knowledge_base' })}\n\n`);
  toolsUsed.push('search_knowledge_base');
  const kbResult = await searchKnowledgeBaseTool.invoke({ query: question });
  const kbHasResults = !kbResult.includes('No relevant knowledge found');

  if (kbHasResults) {
    const fullText = await synthesise(question, kbResult, mode, res, systemPrefix);
    return { toolsUsed, fullText };
  }

  // Step 2: KB empty — pick exactly ONE external tool based on question keywords
  const toolChoice = pickExternalTool(question);
  const externalToolName = toolChoice === 'research' ? 'search_research_papers' : 'search_web';

  res.write(`data: ${JSON.stringify({ type: 'tool_start', tool: externalToolName })}\n\n`);
  toolsUsed.push(externalToolName);

  const externalResult = toolChoice === 'research'
    ? await searchResearchPapersTool.invoke({ topic: question })
    : await searchWebTool.invoke({ question });

  const fullText = await synthesise(question, String(externalResult), mode, res, systemPrefix);
  return { toolsUsed, fullText };
}
