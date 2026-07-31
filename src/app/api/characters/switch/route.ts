import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { PLAN_PRICE_CENTS } from "@/lib/billing";

const bodySchema = z.object({ characterId: z.string().min(1) });

/**
 * SPEC 第 8 点：付费 $50 更换女友。支付走 Mock（直接标记成功），
 * 数据库结构（Payment 表）保留后续接入真实支付渠道的空间。
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const current = await prisma.userCharacter.findUnique({ where: { userId }, include: { character: true } });
  if (!current) {
    return NextResponse.json(
      { error: "no_current_character", message: "还没有选择过女友，请先选角。" },
      { status: 404 }
    );
  }

  if (current.characterId === parsed.data.characterId) {
    return NextResponse.json({ error: "same_character" }, { status: 400 });
  }

  const nextCharacter = await prisma.character.findUnique({ where: { id: parsed.data.characterId } });
  if (!nextCharacter) {
    return NextResponse.json({ error: "character_not_found" }, { status: 404 });
  }

  const [, updated] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        userId,
        type: "CHARACTER_SWITCH",
        amountCents: PLAN_PRICE_CENTS.CHARACTER_SWITCH,
        status: "SUCCEEDED",
      },
    }),
    prisma.userCharacter.update({
      where: { userId },
      data: {
        characterId: nextCharacter.id,
        switchedFrom: current.character.key,
        affinity: 50,
        relationshipStage: 1,
        selectedAt: new Date(),
      },
      include: { character: true },
    }),
  ]);

  return NextResponse.json({ userCharacter: updated });
}
