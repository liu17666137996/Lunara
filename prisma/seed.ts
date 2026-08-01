import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

interface CharacterJson {
  character: {
    name: string;
    age: number;
    occupation?: string;
    life_philosophy?: string;
    dream?: string;
    career_goal?: string;
  };
  personality: { core_traits: string[] };
  system_prompt_template: string;
  image_url?: string;
  voice_id?: string;
}

// 仓库根目录下的 6 份角色人设文件（*-character.json）。
const CHARACTER_KEYS = ["ava", "emma", "luna", "mia", "olivia", "sophia"] as const;

// 角色 JSON 未填 voice_id 时的兜底音色。
const DEFAULT_VOICE_ID = "zh_female_vv_uranus_bigtts";

function loadCharacterJson(key: string): CharacterJson {
  const filePath = join(__dirname, "..", `${key}-character.json`);
  return JSON.parse(readFileSync(filePath, "utf-8")) as CharacterJson;
}

function buildTagline(data: CharacterJson): string {
  return (
    data.character.life_philosophy ??
    data.character.dream ??
    data.character.career_goal ??
    data.character.occupation ??
    "等待与你相遇"
  );
}

async function main() {
  for (const key of CHARACTER_KEYS) {
    const data = loadCharacterJson(key);
    // 有真实形象图（image_url）就用它，没有的话退回占位卡片图。
    const avatarUrl = data.image_url ?? `/characters/${key}.svg`;
    const voiceId = data.voice_id ?? DEFAULT_VOICE_ID;

    await prisma.character.upsert({
      where: { key },
      create: {
        key,
        name: data.character.name,
        age: data.character.age,
        occupation: data.character.occupation ?? "",
        tagline: buildTagline(data),
        keywords: data.personality.core_traits.slice(0, 3),
        avatarUrl,
        baseImageUrl: avatarUrl,
        systemPrompt: data.system_prompt_template,
        voiceId,
        profile: data as unknown as object,
      },
      update: {
        name: data.character.name,
        age: data.character.age,
        occupation: data.character.occupation ?? "",
        tagline: buildTagline(data),
        keywords: data.personality.core_traits.slice(0, 3),
        avatarUrl,
        baseImageUrl: avatarUrl,
        systemPrompt: data.system_prompt_template,
        voiceId,
        profile: data as unknown as object,
      },
    });

    console.log(`Seeded character: ${key}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
