import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildSystemPrompt } from "@/lib/prompt";
import { chatComplete, type ChatMessage } from "@/lib/llm";
import { scoreExchange, affinityDelta, clampAffinity } from "@/lib/affinity";
import { containsBlockedContent, SAFE_REFUSAL_REPLY } from "@/lib/moderation";

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

  let reply: string;
  try {
    reply = await chatComplete(contextMessages);
  } catch (err) {
    console.error("guest chatComplete failed", err);
    return NextResponse.json({ error: "llm_unavailable" }, { status: 502 });
  }

  const score = await scoreExchange(character, message);
  const nextAffinity = clampAffinity(affinity + affinityDelta(score));

  return NextResponse.json({ reply, affinity: nextAffinity });
}
