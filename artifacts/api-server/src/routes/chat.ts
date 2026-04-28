import { Router, type IRouter } from "express";
import { runAstroAgent } from "../agent/astro-agent.js";
import { maybeWriteToKnowledgeBase } from "../agent/knowledge-writer.js";

const router: IRouter = Router();

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

  const userMessage = messages[messages.length - 1]?.content ?? "";
  const resolvedMode = mode === "mystic" ? "mystic" : "science";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const { toolsUsed, fullText } = await runAstroAgent(userMessage, resolvedMode, res);

    // Fire-and-forget — never blocks the response
    maybeWriteToKnowledgeBase(userMessage, fullText, toolsUsed).then(result => {
      req.log.info({ kbWrite: result }, "knowledge base write attempt");
    }).catch(err => {
      req.log.error({ err }, "knowledge base write failed");
    });

    res.write(
      `data: ${JSON.stringify({ done: true, toolsUsed })}\n\n`
    );
    res.end();
  } catch (err) {
    req.log.error({ err }, "chat stream failed");
    res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    res.end();
  }
});

export default router;
