import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAccessStatus } from "@/lib/billing";
import { ChatClient } from "@/components/chat/ChatClient";
import type { AccessStatus, CharacterSummary, MessageDTO } from "@/types/domain";

export default async function ChatPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return <ChatClient mode="guest" />;
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id } });
  const userCharacter = await prisma.userCharacter.findUnique({
    where: { userId: user.id },
    include: { character: true },
  });

  if (!userCharacter) {
    redirect("/");
  }

  const messages = await prisma.message.findMany({
    where: { userId: user.id, characterId: userCharacter.characterId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  const c = userCharacter.character;
  const character: CharacterSummary = {
    id: c.id,
    key: c.key,
    name: c.name,
    age: c.age,
    occupation: c.occupation,
    tagline: c.tagline,
    keywords: c.keywords,
    avatarUrl: c.avatarUrl,
  };

  const initialMessages: MessageDTO[] = messages.reverse().map((m) => ({
    id: m.id,
    role: m.role,
    type: m.type,
    content: m.content,
    mediaUrl: m.mediaUrl,
    audioUrl: m.audioUrl,
    createdAt: m.createdAt.toISOString(),
  }));

  const statusRaw = getAccessStatus(user);
  const access: AccessStatus = {
    ...statusRaw,
    planExpiresAt: statusRaw.planExpiresAt ? statusRaw.planExpiresAt.toISOString() : null,
  };

  return <ChatClient mode="member" character={character} initialMessages={initialMessages} access={access} />;
}
