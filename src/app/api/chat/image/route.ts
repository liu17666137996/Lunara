import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { getAccessStatus } from "@/lib/billing";
import { generateCharacterPhoto } from "@/lib/imagegen";

const bodySchema = z.object({ hint: z.string().max(300).optional() });

/**
 * SPEC 第 7 点：根据基础图片（角色人设）+ 上下文信息生成图片。
 * 由用户点击聊天输入框里的"发照片"按钮显式触发。角色在自然对话中主动决定发照片
 * 的那条路径见 chat/send/route.ts 里的 SEND_PHOTO 标记检测。
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
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

  const recentMessages = await prisma.message.findMany({
    where: { userId, characterId: userCharacter.characterId, type: "TEXT" },
    orderBy: { createdAt: "desc" },
    take: 6,
  });
  const contextSummary = recentMessages
    .reverse()
    .map((m) => `${m.role === "USER" ? "用户" : userCharacter.character.name}: ${m.content}`)
    .join("\n");

  let imageUrl: string;
  try {
    imageUrl = await generateCharacterPhoto(userCharacter.character, contextSummary, parsed.data.hint);
  } catch (err) {
    console.error("Image generation failed", err);
    return NextResponse.json({ error: "imagegen_failed" }, { status: 502 });
  }

  const message = await prisma.message.create({
    data: {
      userId,
      characterId: userCharacter.characterId,
      role: "ASSISTANT",
      type: "IMAGE",
      mediaUrl: imageUrl,
    },
  });

  return NextResponse.json({ message });
}
