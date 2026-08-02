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
 * durable storage. When `referenceImageUrl` is given, does image-to-image
 * generation so the output keeps the character's actual appearance instead
 * of a purely text-imagined face.
 */
export async function generateImage(prompt: string, referenceImageUrl?: string): Promise<Buffer> {
  const res = await fetch(`${ARK_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.ARK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.ARK_IMAGE_MODEL,
      prompt: `${prompt}${SAFETY_SUFFIX}`,
      ...(referenceImageUrl ? { image: referenceImageUrl } : {}),
      sequential_image_generation: "disabled",
      response_format: "url",
      size: "2K",
      stream: false,
      watermark: false,
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
    "以参考图中的人物为准，保持同一个人的五官、脸型和发型不变，生成一张她的新生活照，只改变场景、姿势、穿着或光线。",
    `角色信息：${character.systemPrompt}`,
    contextSummary ? `最近的聊天上下文：\n${contextSummary}` : "",
    hint ? `用户希望看到：${hint}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const buffer = await generateImage(prompt, character.baseImageUrl);
  return uploadToR2("images", buffer, "image/jpeg", "jpg");
}

/**
 * 和 generateCharacterPhoto 的区别：不带参考图做 image-to-image，也不要求
 * "保持同一个人的五官不变"——用于角色分享的风景/地点/物品照片，画面主体不是她本人，
 * 顶多有路人剪影。对应 chat/send 里 [[SEND_SCENE: ...]] 标记。
 */
export async function generateScenePhoto(
  character: Character,
  contextSummary: string,
  hint?: string
): Promise<string> {
  const prompt = [
    "生成一张真实自然的生活/旅行照片，手机随手拍的质感，不是网红摆拍。画面主体是风景、地点或物品本身，不需要清晰的人物肖像特写，可以有路人的剪影或背影但不是焦点。",
    `角色信息（帮助判断照片的地点、氛围是否符合她的经历和喜好）：${character.systemPrompt}`,
    contextSummary ? `最近的聊天上下文：\n${contextSummary}` : "",
    hint ? `照片描述：${hint}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const buffer = await generateImage(prompt);
  return uploadToR2("images", buffer, "image/jpeg", "jpg");
}
