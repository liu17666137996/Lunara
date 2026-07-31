import { chatComplete } from "@/lib/llm";
import { prisma } from "@/lib/prisma";

interface MemoryExtraction {
  isKey: boolean;
  key?: string;
  value?: string;
}

function parseExtraction(raw: string): MemoryExtraction | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as MemoryExtraction;
  } catch {
    return null;
  }
}

/**
 * SPEC 第 3 点：把聊天内容发给 LLM，判断用户是否提供了关键个人信息；
 * 如果是，upsert 到 Memory 表，供下次聊天加载。
 */
export async function extractAndSaveMemory(
  userId: string,
  characterId: string,
  userText: string
): Promise<void> {
  const raw = await chatComplete([
    {
      role: "system",
      content:
        "你是一个信息抽取助手。判断用户消息中是否包含值得长期记住的关键个人信息" +
        "（例如：姓名、生日、职业、爱好、家人朋友、重要生活事件、喜欢/讨厌的事物等）。" +
        '只输出一个 JSON 对象，不要输出任何多余文字。' +
        '如果包含关键信息：{"isKey":true,"key":"简短的英文snake_case标识，如 birthday / favorite_food / job","value":"具体内容"}。' +
        '如果不包含：{"isKey":false}。',
    },
    { role: "user", content: userText },
  ]).catch(() => null);

  if (!raw) return;

  const extraction = parseExtraction(raw);
  if (!extraction?.isKey || !extraction.key || !extraction.value) return;

  await prisma.memory.upsert({
    where: {
      userId_characterId_key: {
        userId,
        characterId,
        key: extraction.key,
      },
    },
    create: {
      userId,
      characterId,
      key: extraction.key,
      value: extraction.value,
    },
    update: {
      value: extraction.value,
    },
  });
}
