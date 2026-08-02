import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/prompt";
import { chatComplete, type ChatMessage } from "@/lib/llm";
import { generateCharacterPhoto, generateScenePhoto } from "@/lib/imagegen";
import { extractPhotoMarkers } from "@/lib/photo-markers";
import { scoreExchange, affinityDelta, clampAffinity } from "@/lib/affinity";
import { containsBlockedContent, SAFE_REFUSAL_REPLY } from "@/lib/moderation";

export const maxDuration = 60;

const bodySchema = z.object({
  characterKey: z.string().min(1),
  affinity: z.number().min(0).max(100).default(50),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(40),
  message: z.string().min(1).max(4000),
});

/**
 * 游客模式：不落库。前端在 sessionStorage 里维护完整历史和好感度，
 * 每次请求把状态带过来，关闭标签页即清空（符合 SPEC 第 1 点）。
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { characterKey, affinity, history, message } = parsed.data;

  const character = await prisma.character.findUnique({ where: { key: characterKey } });
  if (!character) {
    return NextResponse.json({ error: "character_not_found" }, { status: 404 });
  }

  if (containsBlockedContent(message)) {
    return NextResponse.json({ reply: SAFE_REFUSAL_REPLY, affinity });
  }

  const systemPrompt = buildSystemPrompt(character, [], affinity);
  const contextMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((h): ChatMessage => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  let rawReply: string;
  try {
    rawReply = await chatComplete(contextMessages);
  } catch (err) {
    console.error("guest chatComplete failed", err);
    return NextResponse.json({ error: "llm_unavailable" }, { status: 502 });
  }

  const { markers: photoMarkers, strippedText } = extractPhotoMarkers(rawReply);
  const reply = strippedText || (photoMarkers.length ? "给你看～" : "");

  let imageUrls: string[] | undefined;
  if (photoMarkers.length) {
    const contextSummary = [...history.slice(-6), { role: "user" as const, content: message }]
      .map((h) => `${h.role === "user" ? "用户" : character.name}: ${h.content}`)
      .join("\n");

    const results = await Promise.allSettled(
      photoMarkers.map((marker) =>
        marker.kind === "SCENE"
          ? generateScenePhoto(character, contextSummary, marker.hint)
          : generateCharacterPhoto(character, contextSummary, marker.hint)
      )
    );
    imageUrls = results
      .filter((r): r is PromiseFulfilledResult<string> => {
        if (r.status !== "fulfilled") {
          console.error("guest auto photo generation failed", r.reason);
          return false;
        }
        return true;
      })
      .map((r) => r.value);
    if (imageUrls.length === 0) imageUrls = undefined;
  }

  const score = await scoreExchange(character, message);
  const nextAffinity = clampAffinity(affinity + affinityDelta(score));

  return NextResponse.json({ reply, affinity: nextAffinity, imageUrls });
}
