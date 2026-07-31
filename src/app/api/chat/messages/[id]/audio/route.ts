import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { synthesizeSpeech } from "@/lib/tts";
import { uploadToR2 } from "@/lib/r2";

/**
 * 懒加载生成某条 AI 文本消息的语音（SPEC 第 5 点：文字先返回，语音异步补上）。
 * 首次调用才真正调用 TTS，写回 audioUrl 后续请求直接命中缓存。
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const { id } = await params;
  const message = await prisma.message.findUnique({ where: { id } });

  if (!message || message.userId !== userId || message.role !== "ASSISTANT" || message.type !== "TEXT") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (message.audioUrl) {
    return NextResponse.json({ audioUrl: message.audioUrl });
  }

  if (!message.content) {
    return NextResponse.json({ error: "no_content" }, { status: 400 });
  }

  const character = await prisma.character.findUnique({ where: { id: message.characterId } });
  if (!character) {
    return NextResponse.json({ error: "character_not_found" }, { status: 404 });
  }

  try {
    const audioBuffer = await synthesizeSpeech(message.content, character.voiceId);
    const audioUrl = await uploadToR2("audio", audioBuffer, "audio/mpeg", "mp3");

    await prisma.message.update({ where: { id }, data: { audioUrl } });
    return NextResponse.json({ audioUrl });
  } catch (err) {
    console.error("TTS generation failed", err);
    return NextResponse.json({ error: "tts_failed" }, { status: 502 });
  }
}
