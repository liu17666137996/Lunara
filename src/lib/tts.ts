interface TtsEvent {
  code: number;
  message?: string;
  data?: string | null;
  sentence?: unknown;
}

/**
 * The `unidirectional` TTS endpoint returns several JSON objects back to back
 * (not a JSON array). Split them by scanning for balanced top-level `{...}`
 * blocks so it works whether the objects are newline-separated or literally
 * concatenated.
 */
function splitJsonObjects(raw: string): TtsEvent[] {
  const events: TtsEvent[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start >= 0) {
        const chunk = raw.slice(start, i + 1);
        try {
          events.push(JSON.parse(chunk) as TtsEvent);
        } catch {
          // ignore malformed fragment
        }
        start = -1;
      }
    }
  }

  return events;
}

/**
 * Calls the ByteDance TTS `unidirectional` endpoint and returns an mp3 Buffer.
 */
export async function synthesizeSpeech(
  text: string,
  speaker: string,
  contextTexts?: string
): Promise<Buffer> {
  const res = await fetch("https://openspeech.bytedance.com/api/v3/tts/unidirectional", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.TTS_API_KEY ?? "",
      "X-Api-Resource-Id": process.env.TTS_RESOURCE_ID ?? "seed-tts-2.0",
      Connection: "keep-alive",
    },
    body: JSON.stringify({
      req_params: {
        text,
        speaker,
        audio_params: { format: "mp3", sample_rate: 24000 },
        explicit_language: "zh-cn",
        ...(contextTexts ? { context_texts: contextTexts } : {}),
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`TTS request failed (${res.status}): ${errText}`);
  }

  const raw = await res.text();
  const events = splitJsonObjects(raw);

  const errorEvent = events.find((e) => e.code !== 0 && e.code !== 20000000);
  if (errorEvent) {
    throw new Error(`TTS error ${errorEvent.code}: ${errorEvent.message}`);
  }

  const base64Audio = events
    .filter((e) => typeof e.data === "string" && e.data.length > 0)
    .map((e) => e.data as string)
    .join("");

  if (!base64Audio) {
    throw new Error("TTS response contained no audio data");
  }

  return Buffer.from(base64Audio, "base64");
}
