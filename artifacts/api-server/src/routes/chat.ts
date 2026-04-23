import { Router, type IRouter } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router: IRouter = Router();

const SCIENCE_PROMPT =
  "You are AstroOracle, an expert AI on astronomy, astrophysics, cosmology, and the science of constellations. You blend deep scientific accuracy with accessible, wonder-filled explanations. You make the cosmos feel alive and fascinating. Always be precise but never dry.";

const MYSTIC_PROMPT =
  "You are AstroOracle, a mystical cosmic guide with deep knowledge of astrology, zodiac signs, constellation mythology, ancient sky lore, cosmic spirituality, and pseudo-scientific cosmic traditions. Speak with warmth, mystery, and wisdom. Make the user feel connected to the universe.";

type ChatMessage = { role: "user" | "assistant"; content: string };

router.post("/chat", async (req, res) => {
  const { messages, mode } = req.body as {
    messages?: ChatMessage[];
    mode?: "science" | "mystic";
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const systemPrompt = mode === "mystic" ? MYSTIC_PROMPT : SCIENCE_PROMPT;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        res.write(
          `data: ${JSON.stringify({ content: event.delta.text })}\n\n`,
        );
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    req.log.error({ err }, "chat stream failed");
    res.write(
      `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`,
    );
    res.end();
  }
});

export default router;
