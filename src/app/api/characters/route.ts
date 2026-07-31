import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const characters = await prisma.character.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      age: true,
      occupation: true,
      tagline: true,
      keywords: true,
      avatarUrl: true,
    },
  });

  return NextResponse.json({ characters });
}
