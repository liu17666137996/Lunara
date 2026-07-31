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
}

// 仓库根目录下的 6 份角色人设文件（*-character.json）。
const CHARACTER_KEYS = ["ava", "emma", "luna", "mia", "olivia", "sophia"] as const;

// SPEC 里的语音示例只给了一个 speaker id，先全员复用，后续替换为每个角色专属音色。
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
        voiceId: DEFAULT_VOICE_ID,
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
