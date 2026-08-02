"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import SocialCards from "@/components/ui/card-fan-carousel";
import { characterAccent } from "@/lib/character-theme";
import { setGuestCharacterKey } from "@/lib/guest-storage";
import type { CharacterSummary } from "@/types/domain";

function characterCardOverlay(character: CharacterSummary) {
  const accent = characterAccent(character.key);
  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-[15] bg-gradient-to-t from-ink via-ink/60 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 p-4 sm:p-5">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-xl text-paper sm:text-2xl">{character.name}</span>
          <span className="text-xs text-paper-dim sm:text-sm">
            {character.age}岁 · {character.occupation}
          </span>
        </div>
        <p className="line-clamp-2 text-sm italic text-paper-dim font-display">“{character.tagline}”</p>
        <span
          className="mt-1 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-ink"
          style={{ background: accent }}
        >
          选择她
        </span>
      </div>
    </>
  );
}

export function HomeClient({
  isLoggedIn,
  characters,
  currentCharacter,
}: {
  isLoggedIn: boolean;
  characters: CharacterSummary[];
  currentCharacter: CharacterSummary | null;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(character: CharacterSummary) {
    setError(null);

    if (!isLoggedIn) {
      setGuestCharacterKey(character.key);
      router.push("/chat?guest=1");
      return;
    }

    setPendingId(character.id);
    try {
      const res = await fetch("/api/characters/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: character.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "选角失败，请刷新重试。");
        return;
      }
      router.push("/chat");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-8 sm:px-10">
      {currentCharacter ? (
        <SpotlightSection character={currentCharacter} router={router} />
      ) : (
        <>
          <section className="mt-10 max-w-xl sm:mt-16">
            <h1 className="mt-3 font-display text-4xl leading-tight text-paper sm:text-5xl">
              值得信赖的AI女友
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-paper-dim">
              六位女孩，六种性格。选一位，开始只属于你们的对话。
              {!isLoggedIn && "不登录也能先聊聊看，但关闭页面后对话就会清空——登录后可以保存记忆、语音和照片。"}
            </p>
            {error && <p className="mt-3 text-sm text-rose">{error}</p>}
          </section>

          <SocialCards
            cards={characters.map((c) => ({
              imgUrl: c.avatarUrl,
              alt: c.name,
              content: characterCardOverlay(c),
              onClick: () => handleSelect(c),
              disabled: pendingId === c.id,
            }))}
          />
        </>
      )}
    </div>
  );
}

function SpotlightSection({
  character,
  router,
}: {
  character: CharacterSummary;
  router: ReturnType<typeof useRouter>;
}) {
  const accent = characterAccent(character.key);

  return (
    <section className="mt-10 flex flex-1 flex-col items-center justify-center gap-8 pb-16 sm:mt-16 sm:flex-row sm:items-stretch">
      <div
        className="relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-2xl border border-line sm:max-w-sm md:max-w-md lg:max-w-lg"
        style={{ boxShadow: `0 0 60px -20px ${accent}` }}
      >
        <Image
          src={character.avatarUrl}
          alt={character.name}
          fill
          sizes="(min-width: 1024px) 32rem, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
      </div>

      <div className="flex max-w-sm flex-col justify-center gap-4 lg:max-w-md">
        <p className="text-xs uppercase tracking-[0.3em] text-mist">你的专属</p>
        <h2 className="font-display text-4xl text-paper">{character.name}</h2>
        <p className="text-sm italic text-paper-dim font-display">“{character.tagline}”</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => router.push("/chat")}
            className="rounded-full px-6 py-2.5 text-sm font-medium text-ink"
            style={{ background: accent }}
          >
            继续聊天
          </button>
          <button
            onClick={() => router.push("/billing?intent=switch")}
            className="rounded-full border border-line px-6 py-2.5 text-sm text-paper-dim transition-colors hover:text-paper"
          >
            更换女友 · $50
          </button>
        </div>
      </div>
    </section>
  );
}
