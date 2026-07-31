import { uploadToR2 } from "@/lib/r2";
import type { Character } from "@/generated/prisma/client";

interface ArkImageResponse {
  data: Array<{ url: string; size: string }>;
}

const ARK_BASE_URL = process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3";

const SAFETY_SUFFIX =
  "，画面健康得体，无裸露、无暴力、无违法违规内容，符合公开社交平台发布标准";

/**
 * Calls the 火山方舟 图片生成 (doubao-seedream) endpoint. Returns a temporary
 * TOS url (signed, expires in ~24h) — callers must re-upload to R2 for
 * durable storage.
 */
export async function generateImage(prompt: string): Promise<Buffer> {
  const res = await fetch(`${ARK_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.ARK_IMAGE_MODEL,
      prompt: `${prompt}${SAFETY_SUFFIX}`,
      sequential_image_generation: "disabled",
      response_format: "url",
      size: "2K",
      stream: false,
      watermark: true,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Image generation failed (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as ArkImageResponse;
  const url = data.data?.[0]?.url;
  if (!url) {
    throw new Error("Image generation response missing url");
  }

  const imageRes = await fetch(url);
  if (!imageRes.ok) {
    throw new Error(`Failed to download generated image (${imageRes.status})`);
  }
  const arrayBuffer = await imageRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Builds a prompt from the character's persona + recent chat context, generates
 * the photo, and uploads it to R2. Shared by the explicit "发照片" button and the
 * auto-detected in-chat photo request.
 */
export async function generateCharacterPhoto(
  character: Character,
  contextSummary: string,
  hint?: string
): Promise<string> {
  const prompt = [
    `根据这份角色信息，生成一张符合她真实形象的生活照，角色信息：${character.systemPrompt}`,
    contextSummary ? `最近的聊天上下文：\n${contextSummary}` : "",
    hint ? `用户希望看到：${hint}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const buffer = await generateImage(prompt);
  return uploadToR2("images", buffer, "image/jpeg", "jpg");
}
