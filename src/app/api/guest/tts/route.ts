import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { synthesizeSpeech } from "@/lib/tts";

const bodySchema = z.object({
  characterKey: z.string().min(1),
  text: z.string().min(1).max(2000),
});

/** 游客语音：不写库，直接把 mp3 转成 data URL 返回，随会话结束即丢弃。 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const character = await prisma.character.findUnique({ where: { key: parsed.data.characterKey } });
  if (!character) {
    return NextResponse.json({ error: "character_not_found" }, { status: 404 });
  }

  try {
    const buffer = await synthesizeSpeech(parsed.data.text, character.voiceId);
    const dataUrl = `data:audio/mpeg;base64,${buffer.toString("base64")}`;
    return NextResponse.json({ audioUrl: dataUrl });
  } catch (err) {
    console.error("guest TTS failed", err);
    return NextResponse.json({ error: "tts_failed" }, { status: 502 });
  }
}
