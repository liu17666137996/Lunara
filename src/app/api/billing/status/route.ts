import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { getAccessStatus } from "@/lib/billing";

export async function GET() {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return NextResponse.json({ access: getAccessStatus(user) });
}
