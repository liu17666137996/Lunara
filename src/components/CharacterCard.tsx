"use client";

import Image from "next/image";
import { characterAccent } from "@/lib/character-theme";
import type { CharacterSummary } from "@/types/domain";

export function CharacterCard({
  character,
  onSelect,
  disabled,
  ctaLabel = "选择她",
}: {
  character: CharacterSummary;
  onSelect: (character: CharacterSummary) => void;
  disabled?: boolean;
  ctaLabel?: string;
}) {
  const accent = characterAccent(character.key);

  return (
    <button
      type="button"
      onClick={() => onSelect(character)}
      disabled={disabled}
      style={{ ["--accent" as string]: accent }}
      className="group relative flex aspect-[3/4] w-full flex-col justify-end overflow-hidden rounded-2xl border border-line bg-ink-2 text-left transition-transform duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-40 hover:-translate-y-1"
    >
      <div
        className="pointer-events-none absolute -inset-6 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40 group-focus-visible:opacity-40 candle-glow"
        style={{ background: `radial-gradient(circle, var(--accent), transparent 70%)` }}
      />
      <Image
        src={character.avatarUrl}
        alt={character.name}
        fill
        sizes="(min-width: 768px) 33vw, 50vw"
        className="object-cover transition-transform duration-500 group-hover:scale-105"
        priority={false}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

      <div className="relative z-10 flex flex-col gap-2 p-4">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl text-paper">{character.name}</span>
          <span className="text-xs text-mist">{character.age}岁 · {character.occupation}</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {character.keywords.map((kw) => (
            <span
              key={kw}
              className="rounded-full border px-2 py-0.5 text-[11px] text-paper-dim"
              style={{ borderColor: "var(--accent)" }}
            >
              {kw}
            </span>
          ))}
        </div>

        <p className="line-clamp-2 text-sm italic text-paper-dim font-display">
          “{character.tagline}”
        </p>

        <span
          className="mt-1 inline-flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-ink transition-colors"
          style={{ background: "var(--accent)" }}
        >
          {ctaLabel}
        </span>
      </div>
    </button>
  );
}
