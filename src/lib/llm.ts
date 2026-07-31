export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ArkChatResponse {
  choices: Array<{
    message: { content: string; role: string };
    finish_reason: string;
  }>;
}

const ARK_BASE_URL = process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3";

/**
 * Calls the 火山方舟 (Volces Ark) chat completions endpoint (glm-5 per SPEC).
 */
export async function chatComplete(
  messages: ChatMessage[],
  opts: { temperature?: number } = {}
): Promise<string> {
  const res = await fetch(`${ARK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.ARK_CHAT_MODEL,
      messages,
      temperature: opts.temperature,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as ArkChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("LLM response missing message content");
  }
  return content.trim();
}
