"use client";

import { useRef, useState } from "react";

// Web Speech API 类型在 TS lib 里不完整，这里按需声明最小接口。
interface MinimalSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: { transcript: string }[][] }) => void) | null;
  onerror: (() => void) | null;
}

function createSpeechRecognition(): MinimalSpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => MinimalSpeechRecognition;
    webkitSpeechRecognition?: new () => MinimalSpeechRecognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = "zh-CN";
  recognition.continuous = true;
  recognition.interimResults = false;
  return recognition;
}

export function ChatInput({
  disabled,
  canRequestPhoto,
  onSendText,
  onSendImage,
  onSendAudio,
  onRequestPhoto,
}: {
  disabled?: boolean;
  canRequestPhoto?: boolean;
  onSendText: (text: string) => void;
  onSendImage: (file: File) => void;
  onSendAudio: (blob: Blob, transcript: string) => void;
  onRequestPhoto?: () => void;
}) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const transcriptRef = useRef("");
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);

  function submitText() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSendText(trimmed);
    setText("");
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onSendImage(file);
    e.target.value = "";
  }

  async function startRecording() {
    if (disabled || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      transcriptRef.current = "";

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        onSendAudio(blob, transcriptRef.current.trim());
      };

      const recognition = createSpeechRecognition();
      if (recognition) {
        recognition.onresult = (event) => {
          const transcriptText = event.results
            .map((alt) => alt[0]?.transcript ?? "")
            .join("");
          transcriptRef.current = transcriptText;
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }

  function stopRecording() {
    if (!recording) return;
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    setRecording(false);
  }

  return (
    <div className="border-t border-line bg-ink-2 px-3 py-3">
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImagePick}
        />
        <button
          type="button"
          aria-label="发送图片"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 rounded-full border border-line p-2.5 text-paper-dim transition-colors hover:text-paper disabled:opacity-40"
        >
          🖼
        </button>

        {canRequestPhoto && (
          <button
            type="button"
            aria-label="请她发一张照片"
            disabled={disabled}
            onClick={onRequestPhoto}
            className="shrink-0 rounded-full border border-line p-2.5 text-paper-dim transition-colors hover:text-paper disabled:opacity-40"
          >
            📷
          </button>
        )}

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submitText();
            }
          }}
          disabled={disabled}
          rows={1}
          placeholder={disabled ? "对方输入中..." : "说点什么…"}
          className="max-h-28 flex-1 resize-none rounded-2xl border border-line bg-ink px-4 py-2.5 text-sm text-paper placeholder:text-mist focus:outline-none focus-visible:ring-2 focus-visible:ring-ember disabled:opacity-50"
        />

        <button
          type="button"
          aria-label="按住说话"
          disabled={disabled}
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={() => recording && stopRecording()}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`shrink-0 rounded-full border p-2.5 transition-colors disabled:opacity-40 ${
            recording ? "border-rose bg-rose/20 text-rose" : "border-line text-paper-dim hover:text-paper"
          }`}
        >
          {recording ? "● 录音中" : "🎤"}
        </button>

        <button
          type="button"
          onClick={submitText}
          disabled={disabled || !text.trim()}
          className="shrink-0 rounded-full bg-ember px-4 py-2.5 text-sm font-medium text-ink transition-opacity disabled:opacity-40"
        >
          发送
        </button>
      </div>
    </div>
  );
}
