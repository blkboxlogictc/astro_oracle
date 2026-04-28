import { Router } from 'express';
import { runAstroAgent } from '../agent/astro-agent.js';
import { maybeWriteToKnowledgeBase } from '../agent/knowledge-writer.js';

const router = Router();

router.post('/', async (req, res) => {
  const { messages, mode, userContext } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const userMessage = messages[messages.length - 1]?.content ?? '';
  const resolvedMode = mode === 'mystic' ? 'mystic' : 'science';

  // If auth middleware attached user context (Stage 9), inject as system prefix
  const systemPrefix = userContext
    ? `The user's cosmic profile: Sun sign: ${userContext.sun_sign ?? 'unknown'}, ` +
      `Moon sign: ${userContext.moon_sign ?? 'unknown'}, ` +
      `Rising sign: ${userContext.rising_sign ?? 'unknown'}. ` +
      `Subtly personalize your response with this in mind without being heavy-handed.`
    : '';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  try {
    const { toolsUsed, fullText } = await runAstroAgent(
      userMessage,
      resolvedMode,
      res,
      systemPrefix
    );

    maybeWriteToKnowledgeBase(userMessage, fullText, toolsUsed)
      .then(result => {
        if (result.saved) console.log('[KB Write] Saved:', userMessage.slice(0, 60));
      })
      .catch(err => console.error('[KB Write] Failed:', err.message));

    res.write(`data: ${JSON.stringify({ done: true, toolsUsed })}\n\n`);
    res.end();
  } catch (err) {
    console.error('[Chat] Stream failed:', err);
    res.write(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`);
    res.end();
  }
});

export default router;
