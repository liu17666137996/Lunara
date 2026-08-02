"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { DisplayMessage } from "@/components/chat/ChatClient";

function AudioPill({
  url,
  accent,
  variant = "filled",
}: {
  url: string;
  accent: string;
  variant?: "filled" | "subtle";
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  }

  const barColor = variant === "filled" ? "bg-ink/70" : "bg-paper-dim";

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        variant === "filled"
          ? "flex items-center gap-2 rounded-full px-4 py-2 text-sm text-ink"
          : "flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-paper-dim"
      }
      style={variant === "filled" ? { background: accent } : undefined}
    >
      <audio
        ref={audioRef}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
      <span className="flex items-end gap-0.5">
        {[3, 5, 4, 6, 3].map((h, i) => (
          <span key={i} className={`w-0.5 rounded-full ${barColor}`} style={{ height: `${h * 2}px` }} />
        ))}
      </span>
    </button>
  );
}

export function MessageBubble({
  message,
  accent,
  characterName,
}: {
  message: DisplayMessage;
  accent: string;
  characterName: string;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div
          className="mt-1 h-7 w-7 shrink-0 rounded-full text-center text-[10px] leading-7 text-ink"
          style={{ background: accent }}
          aria-hidden
        >
          {characterName[0]}
        </div>
      )}

      {isUser && (
        <div
          className="mt-1 h-7 w-7 shrink-0 rounded-full border border-line bg-ink-2 text-center text-[10px] leading-7 text-paper-dim"
          aria-hidden
        >
          我
        </div>
      )}

      <div className={`flex max-w-[75%] flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {message.type === "IMAGE" && message.mediaUrl && (
          <a href={message.mediaUrl} target="_blank" rel="noreferrer">
            <Image
              src={message.mediaUrl}
              alt="聊天图片"
              width={220}
              height={220}
              className="rounded-xl border border-line object-cover"
              unoptimized={message.mediaUrl.startsWith("blob:")}
            />
          </a>
        )}

        {message.type === "AUDIO" && message.mediaUrl && <AudioPill url={message.mediaUrl} accent={accent} />}

        {message.content && (
          <div
            className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              isUser ? "rounded-tr-sm text-ink" : "rounded-tl-sm border border-line bg-ink-2 text-paper"
            }`}
            style={isUser ? { background: accent } : undefined}
          >
            {message.content}
          </div>
        )}

        {!isUser && message.type === "TEXT" && (
          <div>
            {message.audioUrl ? (
              <AudioPill url={message.audioUrl} accent={accent} variant="subtle" />
            ) : message.audioLoading ? (
              <span className="text-[11px] text-mist">语音生成中…</span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
