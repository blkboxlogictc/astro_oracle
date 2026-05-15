import { Router, type IRouter } from "express";
import { getNarrationUrl } from "../services/voiceNarration.js";

const router: IRouter = Router();

router.post("/narrate", async (req, res) => {
  const { text, mode } = req.body as {
    text?: string;
    mode?: "science" | "mystic";
  };

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const resolvedMode = mode === "mystic" ? "mystic" : "science";

  try {
    const url = await getNarrationUrl(text.trim(), resolvedMode);
    res.json({ url });
  } catch (err) {
    req.log.error({ err }, "narration failed");
    res.status(500).json({ error: "Narration generation failed" });
  }
});

export default router;
