"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { ChatInput } from "@/components/chat/ChatInput";
import { characterAccent } from "@/lib/character-theme";
import {
  getGuestAffinity,
  getGuestCharacterKey,
  getGuestHistory,
  setGuestAffinity,
  setGuestHistory,
} from "@/lib/guest-storage";
import type { AccessStatus, CharacterSummary, GuestMessage, MessageDTO } from "@/types/domain";

const TRIAL_WARNING_DAYS = 2;

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  type: "TEXT" | "IMAGE" | "AUDIO";
  content: string | null;
  mediaUrl: string | null;
  audioUrl: string | null;
  audioLoading?: boolean;
  createdAt: string;
}

type Props =
  | { mode: "member"; character: CharacterSummary; initialMessages: MessageDTO[]; access: AccessStatus }
  | { mode: "guest" };

function fromMessageDTO(m: MessageDTO): DisplayMessage {
  return {
    id: m.id,
    role: m.role === "USER" ? "user" : "assistant",
    type: m.type,
    content: m.content,
    mediaUrl: m.mediaUrl,
    audioUrl: m.audioUrl,
    createdAt: m.createdAt,
  };
}

function fromGuestMessage(m: GuestMessage, index: number): DisplayMessage {
  return {
    id: `guest-${index}`,
    role: m.role,
    type: m.type,
    content: m.content,
    mediaUrl: m.mediaUrl ?? null,
    audioUrl: m.audioUrl ?? null,
    createdAt: new Date().toISOString(),
  };
}

function fallbackText(type: DisplayMessage["type"]) {
  if (type === "IMAGE") return "[发送了一张图片]";
  if (type === "AUDIO") return "[语音消息]";
  return "";
}

export function ChatClient(props: Props) {
  const router = useRouter();
  const [character, setCharacter] = useState<CharacterSummary | null>(
    props.mode === "member" ? props.character : null
  );
  const [messages, setMessages] = useState<DisplayMessage[]>(
    props.mode === "member" ? props.initialMessages.map(fromMessageDTO) : []
  );
  const [access, setAccess] = useState<AccessStatus | null>(props.mode === "member" ? props.access : null);
  const [guestAffinity, setGuestAffinityState] = useState(50);
  const [guestReady, setGuestReady] = useState(props.mode === "member");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (props.mode !== "guest") return;
    const key = getGuestCharacterKey();
    if (!key) {
      router.replace("/");
      return;
    }
    fetch("/api/characters")
      .then((r) => r.json())
      .then(({ characters }: { characters: CharacterSummary[] }) => {
        const found = characters.find((c) => c.key === key);
        if (!found) {
          router.replace("/");
          return;
        }
        setCharacter(found);
        setMessages(getGuestHistory().map(fromGuestMessage));
        setGuestAffinityState(getGuestAffinity());
        setGuestReady(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const accent = character ? characterAccent(character.key) : "#E8A167";
  const disabled = sending || !character || !guestReady || (access ? !access.canChat : false);

  function persistGuestHistory(next: DisplayMessage[]) {
    const serializable: GuestMessage[] = next.map((m) => ({
      role: m.role,
      type: m.type,
      content: m.content ?? "",
      mediaUrl: m.mediaUrl ?? undefined,
      audioUrl: m.audioUrl ?? undefined,
    }));
    setGuestHistory(serializable);
  }

  async function fetchAssistantAudio(messageId: string) {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, audioLoading: true } : m)));
    try {
      const res = await fetch(`/api/chat/messages/${messageId}/audio`);
      if (!res.ok) throw new Error("audio failed");
      const data = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, audioUrl: data.audioUrl, audioLoading: false } : m))
      );
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, audioLoading: false } : m)));
    }
  }

  async function fetchGuestAudio(messageId: string, text: string) {
    if (!character) return;
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, audioLoading: true } : m)));
    try {
      const res = await fetch("/api/guest/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterKey: character.key, text }),
      });
      if (!res.ok) throw new Error("tts failed");
      const data = await res.json();
      setMessages((prev) => {
        const next = prev.map((m) => (m.id === messageId ? { ...m, audioUrl: data.audioUrl, audioLoading: false } : m));
        persistGuestHistory(next);
        return next;
      });
    } catch {
      setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, audioLoading: false } : m)));
    }
  }

  async function sendMemberMessage(type: DisplayMessage["type"], content: string | null, mediaUrl?: string) {
    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content: content ?? undefined, mediaUrl }),
    });
    if (res.status === 402) {
      const data = await res.json();
      setAccess(data.access);
      return;
    }
    if (!res.ok) {
      setSendError("消息没有发送成功，请重试。");
      return;
    }
    const data: { userMessage: MessageDTO; assistantMessage: MessageDTO; assistantImageMessage?: MessageDTO } =
      await res.json();
    setMessages((prev) => {
      const next = [...prev.slice(0, -1), fromMessageDTO(data.userMessage), fromMessageDTO(data.assistantMessage)];
      return data.assistantImageMessage ? [...next, fromMessageDTO(data.assistantImageMessage)] : next;
    });
    fetchAssistantAudio(data.assistantMessage.id);
  }

  async function sendGuestMessage(type: DisplayMessage["type"], content: string | null) {
    if (!character) return;
    const effectiveText = content?.trim() || fallbackText(type);
    const historyForApi = messages.map((m) => ({ role: m.role, content: m.content ?? fallbackText(m.type) }));

    const res = await fetch("/api/guest/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterKey: character.key,
        affinity: guestAffinity,
        history: historyForApi,
        message: effectiveText,
      }),
    });
    if (!res.ok) {
      setSendError("消息没有发送成功，请重试。");
      return;
    }
    const data: { reply: string; affinity: number } = await res.json();

    const assistantMsg: DisplayMessage = {
      id: `guest-${Date.now()}`,
      role: "assistant",
      type: "TEXT",
      content: data.reply,
      mediaUrl: null,
      audioUrl: null,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => {
      const next = [...prev, assistantMsg];
      persistGuestHistory(next);
      return next;
    });
    setGuestAffinityState(data.affinity);
    setGuestAffinity(data.affinity);
    fetchGuestAudio(assistantMsg.id, data.reply);
  }

  function pushOptimisticUser(type: DisplayMessage["type"], content: string | null, mediaUrl?: string) {
    const optimistic: DisplayMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      type,
      content,
      mediaUrl: mediaUrl ?? null,
      audioUrl: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => {
      const next = [...prev, optimistic];
      if (props.mode === "guest") persistGuestHistory(next);
      return next;
    });
  }

  async function dispatchSend(type: DisplayMessage["type"], content: string | null, mediaUrl?: string) {
    if (!character || sending) return;
    setSending(true);
    setSendError(null);
    pushOptimisticUser(type, content, mediaUrl);
    try {
      if (props.mode === "member") {
        await sendMemberMessage(type, content, mediaUrl);
      } else {
        await sendGuestMessage(type, content);
      }
    } finally {
      setSending(false);
    }
  }

  async function handleSendText(text: string) {
    await dispatchSend("TEXT", text);
  }

  async function handleSendImage(file: File) {
    if (props.mode === "member") {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) return;
      const { url } = await res.json();
      await dispatchSend("IMAGE", null, url);
    } else {
      const blobUrl = URL.createObjectURL(file);
      await dispatchSend("IMAGE", null, blobUrl);
    }
  }

  async function handleSendAudio(blob: Blob, transcript: string) {
    if (props.mode === "member") {
      const form = new FormData();
      form.append("file", new File([blob], "voice.webm", { type: blob.type || "audio/webm" }));
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) return;
      const { url } = await res.json();
      await dispatchSend("AUDIO", transcript || null, url);
    } else {
      const blobUrl = URL.createObjectURL(blob);
      await dispatchSend("AUDIO", transcript || null, blobUrl);
    }
  }

  async function handleRequestPhoto() {
    if (props.mode !== "member" || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/chat/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (res.status === 402) {
        const data = await res.json();
        setAccess(data.access);
        return;
      }
      if (!res.ok) return;
      const data: { message: MessageDTO } = await res.json();
      setMessages((prev) => [...prev, fromMessageDTO(data.message)]);
    } finally {
      setSending(false);
    }
  }

  if (!character) {
    return <div className="flex flex-1 items-center justify-center text-mist">加载中…</div>;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <header className="flex items-center gap-3 border-b border-line bg-ink-2 px-4 py-3">
        <Link href="/" aria-label="返回" className="text-mist transition-colors hover:text-paper">
          ←
        </Link>
        <div
          className="h-9 w-9 shrink-0 rounded-full text-center text-sm leading-9 text-ink"
          style={{ background: accent }}
        >
          {character.name[0]}
        </div>
        <div className="flex flex-col">
          <span className="font-display text-base text-paper">{character.name}</span>
          <span className="text-[11px] text-mist">
            {props.mode === "guest"
              ? "游客模式 · 关闭页面即清空"
              : access?.hasActiveSubscription
              ? "会员"
              : access?.trialDaysLeft != null
              ? `试用剩 ${access.trialDaysLeft} 天`
              : ""}
          </span>
        </div>
      </header>

      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} accent={accent} characterName={character.name} />
        ))}
      </div>

      {sendError && (
        <p className="border-t border-line bg-ink-2 px-4 py-2 text-center text-xs text-rose">{sendError}</p>
      )}

      {access && !access.canChat ? (
        <div className="border-t border-line bg-ink-2 px-4 py-4 text-center">
          <p className="text-sm text-paper-dim">7 天试用已经结束，开通会员继续和 {character.name} 聊天吧。</p>
          <Link
            href="/billing"
            className="mt-3 inline-block rounded-full px-5 py-2 text-sm font-medium text-ink"
            style={{ background: accent }}
          >
            去开通会员
          </Link>
        </div>
      ) : (
        <>
          {access && access.trialDaysLeft != null && access.trialDaysLeft <= TRIAL_WARNING_DAYS && (
            <div className="flex items-center justify-between gap-3 border-t border-line bg-ink-2 px-4 py-2">
              <p className="text-xs text-paper-dim">
                试用还剩 {access.trialDaysLeft} 天，提前开通会员就不会中断和 {character.name} 的聊天啦。
              </p>
              <Link
                href="/billing"
                className="shrink-0 rounded-full px-3 py-1.5 text-xs font-medium text-ink"
                style={{ background: accent }}
              >
                去开通
              </Link>
            </div>
          )}
          <ChatInput
            disabled={disabled}
            canRequestPhoto={props.mode === "member"}
            onSendText={handleSendText}
            onSendImage={handleSendImage}
            onSendAudio={handleSendAudio}
            onRequestPhoto={handleRequestPhoto}
          />
        </>
      )}
    </div>
  );
}
