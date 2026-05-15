import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { createHash } from "node:crypto";

const supabase = createClient(
  process.env["SUPABASE_URL"]!,
  process.env["SUPABASE_SERVICE_KEY"]!,
);

const openai = new OpenAI({ apiKey: process.env["OPENAI_API_KEY"] });

const TTS_MODEL = process.env["OPENAI_TTS_MODEL"] ?? "tts-1";

type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
const VOICES: Record<"science" | "mystic", TTSVoice> = {
  science: (process.env["OPENAI_TTS_VOICE_SCIENCE"] ?? "nova") as TTSVoice,
  mystic:  (process.env["OPENAI_TTS_VOICE_MYSTIC"]  ?? "nova") as TTSVoice,
};

const BUCKET = "narration-cache";

function hashKey(mode: string, text: string): string {
  return createHash("sha256").update(`${mode}:${text}`).digest("hex");
}

function publicUrl(storagePath: string): string {
  const base = process.env["SUPABASE_URL"]!.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${storagePath}`;
}

export async function getNarrationUrl(
  text: string,
  mode: "science" | "mystic",
): Promise<string> {
  const hash = hashKey(mode, text);

  // Check cache first — same text never generates twice
  const { data: cached } = await supabase
    .from("narration_cache")
    .select("storage_path")
    .eq("hash", hash)
    .maybeSingle();

  if (cached?.storage_path) {
    return publicUrl(cached.storage_path);
  }

  // Generate TTS audio via OpenAI
  const voice = VOICES[mode];
  const mp3 = await openai.audio.speech.create({
    model: TTS_MODEL,
    voice,
    input: text,
    response_format: "mp3",
  });

  const buffer = Buffer.from(await mp3.arrayBuffer());
  const objectPath  = `${mode}/${hash}.mp3`;           // path inside bucket
  const storagePath = `${BUCKET}/${mode}/${hash}.mp3`; // full path stored in DB

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buffer, {
      contentType: "audio/mpeg",
      upsert: false,
    });

  // "already exists" is safe to ignore — another request beat us to it
  if (uploadError && !uploadError.message.includes("already exists")) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  // Insert cache record
  await supabase.from("narration_cache").insert({
    hash,
    mode,
    text_hash: createHash("sha256").update(text).digest("hex"),
    storage_path: storagePath,
  });

  return publicUrl(storagePath);
}
