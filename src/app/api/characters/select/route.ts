import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";

const bodySchema = z.object({ characterId: z.string().min(1) });

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const existing = await prisma.userCharacter.findUnique({ where: { userId } });
  if (existing) {
    return NextResponse.json(
      { error: "already_selected", message: "一个用户同一时间只能拥有一个虚拟女友，请使用换女友功能。" },
      { status: 409 }
    );
  }

  const character = await prisma.character.findUnique({ where: { id: parsed.data.characterId } });
  if (!character) {
    return NextResponse.json({ error: "character_not_found" }, { status: 404 });
  }

  const userCharacter = await prisma.userCharacter.create({
    data: { userId, characterId: character.id },
    include: { character: true },
  });

  return NextResponse.json({ userCharacter });
}
