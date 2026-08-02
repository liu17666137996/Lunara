import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HomeClient } from "@/components/home/HomeClient";
import type { CharacterSummary } from "@/types/domain";

export default async function HomePage() {
  const session = await auth();

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

  let currentCharacter: CharacterSummary | null = null;
  if (session?.user?.id) {
    const userCharacter = await prisma.userCharacter.findUnique({
      where: { userId: session.user.id },
      include: { character: true },
    });
    if (userCharacter) {
      const c = userCharacter.character;
      currentCharacter = {
        id: c.id,
        key: c.key,
        name: c.name,
        age: c.age,
        occupation: c.occupation,
        tagline: c.tagline,
        keywords: c.keywords,
        avatarUrl: c.avatarUrl,
      };
    }
  }

  return (
    <HomeClient
      isLoggedIn={!!session?.user}
      characters={characters}
      currentCharacter={currentCharacter}
    />
  );
}
