import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { getAccessStatus } from "@/lib/billing";
import { buildSystemPrompt } from "@/lib/prompt";
import { chatComplete, type ChatMessage } from "@/lib/llm";
import { generateCharacterPhoto, generateScenePhoto } from "@/lib/imagegen";
import { extractPhotoMarkers } from "@/lib/photo-markers";
import { extractAndSaveMemory } from "@/lib/memory";
import { scoreExchange, affinityDelta, clampAffinity } from "@/lib/affinity";
import { containsBlockedContent, SAFE_REFUSAL_REPLY } from "@/lib/moderation";

export const maxDuration = 60;

const HISTORY_LIMIT = 20;

const bodySchema = z.object({
  type: z.enum(["TEXT", "IMAGE", "AUDIO"]),
  content: z.string().max(4000).optional(),
  mediaUrl: z.string().url().optional(),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const { type, content, mediaUrl } = parsed.data;

  if ((type === "IMAGE" || type === "AUDIO") && !mediaUrl) {
    return NextResponse.json({ error: "media_url_required" }, { status: 400 });
  }
  if (type === "TEXT" && !content) {
    return NextResponse.json({ error: "content_required" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const userCharacter = await prisma.userCharacter.findUnique({
    where: { userId },
    include: { character: true },
  });
  if (!userCharacter) {
    return NextResponse.json({ error: "no_character_selected" }, { status: 400 });
  }

  const access = getAccessStatus(user);
  if (!access.canChat) {
    return NextResponse.json({ error: "trial_expired", access }, { status: 402 });
  }

  if (!user.trialStartedAt) {
    await prisma.user.update({ where: { id: userId }, data: { trialStartedAt: new Date() } });
  }

  const fallbackText = type === "IMAGE" ? "[发送了一张图片]" : type === "AUDIO" ? "[语音消息]" : "";
  const effectiveText = content?.trim() || fallbackText;

  const userMessage = await prisma.message.create({
    data: {
      userId,
      characterId: userCharacter.characterId,
      role: "USER",
      type,
      content: content ?? null,
      mediaUrl: mediaUrl ?? null,
    },
  });

  if (type === "TEXT" && containsBlockedContent(effectiveText)) {
    const assistantMessage = await prisma.message.create({
      data: {
        userId,
        characterId: userCharacter.characterId,
        role: "ASSISTANT",
        type: "TEXT",
        content: SAFE_REFUSAL_REPLY,
      },
    });
    return NextResponse.json({ userMessage, assistantMessage, access: getAccessStatus(user) });
  }

  const [history, memories] = await Promise.all([
    prisma.message.findMany({
      where: { userId, characterId: userCharacter.characterId },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    }),
    prisma.memory.findMany({ where: { userId, characterId: userCharacter.characterId } }),
  ]);

  const systemPrompt = buildSystemPrompt(userCharacter.character, memories, userCharacter.affinity);
  const chronological = history.reverse();
  const contextMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...chronological.map((m): ChatMessage => ({
      role: m.role === "USER" ? "user" : "assistant",
      content: m.content?.trim() || (m.type === "IMAGE" ? "[图片]" : m.type === "AUDIO" ? "[语音]" : ""),
    })),
  ];

  let rawReplyText: string;
  try {
    rawReplyText = await chatComplete(contextMessages);
  } catch (err) {
    console.error("chatComplete failed", err);
    return NextResponse.json({ error: "llm_unavailable" }, { status: 502 });
  }

  const { markers: photoMarkers, strippedText } = extractPhotoMarkers(rawReplyText);
  const replyText = strippedText || (photoMarkers.length ? "给你看～" : "");

  const assistantMessage = await prisma.message.create({
    data: {
      userId,
      characterId: userCharacter.characterId,
      role: "ASSISTANT",
      type: "TEXT",
      content: replyText,
    },
  });

  const assistantImageMessages = [];
  if (photoMarkers.length) {
    const contextSummary = chronological
      .slice(-6)
      .map((m) => `${m.role === "USER" ? "用户" : userCharacter.character.name}: ${m.content ?? ""}`)
      .join("\n");

    const results = await Promise.allSettled(
      photoMarkers.map((marker) =>
        marker.kind === "SCENE"
          ? generateScenePhoto(userCharacter.character, contextSummary, marker.hint)
          : generateCharacterPhoto(userCharacter.character, contextSummary, marker.hint)
      )
    );

    for (const result of results) {
      if (result.status !== "fulfilled") {
        console.error("Auto photo generation failed", result.reason);
        continue;
      }
      assistantImageMessages.push(
        await prisma.message.create({
          data: {
            userId,
            characterId: userCharacter.characterId,
            role: "ASSISTANT",
            type: "IMAGE",
            mediaUrl: result.value,
          },
        })
      );
    }
  }

  // 记忆抽取 + 好感度评分：单次 LLM 调用，速度可接受，同步等待后一起返回。
  const [, score] = await Promise.all([
    extractAndSaveMemory(userId, userCharacter.characterId, effectiveText),
    scoreExchange(userCharacter.character, effectiveText),
  ]);

  const delta = affinityDelta(score);
  if (delta !== 0) {
    await prisma.userCharacter.update({
      where: { userId },
      data: { affinity: clampAffinity(userCharacter.affinity + delta) },
    });
  }

  return NextResponse.json({
    userMessage,
    assistantMessage,
    assistantImageMessages: assistantImageMessages.length ? assistantImageMessages : undefined,
    access: getAccessStatus(user),
  });
}
