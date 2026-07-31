import { chatComplete } from "@/lib/llm";
import type { Character } from "@/generated/prisma/client";

/**
 * SPEC 第 4 点：将角色人设 + 用户本轮发言发给 LLM 综合评分（0-100）。
 * 大于 50 分好感度 +1（封顶 100），小于 30 分好感度 -1（下限 0），
 * 30-50 分之间不变。
 */
export async function scoreExchange(character: Character, userText: string): Promise<number> {
  const raw = await chatComplete(
    [
      {
        role: "system",
        content:
          `你正在扮演角色"${character.name}"（${character.occupation}，性格：${
            (character.profile as { personality?: { core_traits?: string[] } })?.personality
              ?.core_traits?.join("、") ?? ""
          }）。` +
          "请评估用户刚才这句话的说话方式/态度，与该角色理想中的相处方式有多匹配，" +
          "给出一个 0-100 的整数分数（分数越高代表用户的说话方式越让角色有好感，" +
          "越低代表越让角色反感或不匹配）。只输出这个整数，不要输出任何其他内容。",
      },
      { role: "user", content: userText },
    ],
    { temperature: 0.3 }
  ).catch(() => null);

  if (!raw) return 50;

  const match = raw.match(/-?\d+/);
  if (!match) return 50;

  const score = parseInt(match[0], 10);
  if (Number.isNaN(score)) return 50;
  return Math.min(100, Math.max(0, score));
}

export function affinityDelta(score: number): number {
  if (score > 50) return 1;
  if (score < 30) return -1;
  return 0;
}

export function clampAffinity(value: number): number {
  return Math.min(100, Math.max(0, value));
}
