import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessStatus } from "@/lib/billing";
import { BillingClient } from "@/components/billing/BillingClient";
import type { AccessStatus, CharacterSummary } from "@/types/domain";

export default async function BillingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const userCharacter = await prisma.userCharacter.findUnique({
    where: { userId: user.id },
    include: { character: true },
  });

  const characters: CharacterSummary[] = await prisma.character.findMany({
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

  const statusRaw = getAccessStatus(user);
  const access: AccessStatus = {
    ...statusRaw,
    planExpiresAt: statusRaw.planExpiresAt ? statusRaw.planExpiresAt.toISOString() : null,
  };

  const c = userCharacter?.character;
  const currentCharacter: CharacterSummary | null = c
    ? {
        id: c.id,
        key: c.key,
        name: c.name,
        age: c.age,
        occupation: c.occupation,
        tagline: c.tagline,
        keywords: c.keywords,
        avatarUrl: c.avatarUrl,
      }
    : null;

  return <BillingClient access={access} currentCharacter={currentCharacter} characters={characters} />;
}
