import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const DEFAULT_LIMIT = 30;

/** 会员聊天历史分页：?before=<messageId> 取更早的消息，不传则取最新一页。 */
export async function GET(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const userCharacter = await prisma.userCharacter.findUnique({ where: { userId } });
  if (!userCharacter) {
    return NextResponse.json({ messages: [], character: null, hasMore: false });
  }

  const { searchParams } = new URL(req.url);
  const before = searchParams.get("before");
  const limit = Math.min(100, Number(searchParams.get("limit")) || DEFAULT_LIMIT);

  let cursorCreatedAt: Date | undefined;
  if (before) {
    const cursorMessage = await prisma.message.findUnique({ where: { id: before } });
    cursorCreatedAt = cursorMessage?.createdAt;
  }

  const messages = await prisma.message.findMany({
    where: {
      userId,
      characterId: userCharacter.characterId,
      ...(cursorCreatedAt ? { createdAt: { lt: cursorCreatedAt } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
  });

  const hasMore = messages.length > limit;
  const page = messages.slice(0, limit).reverse();

  return NextResponse.json({ messages: page, characterId: userCharacter.characterId, hasMore });
}
