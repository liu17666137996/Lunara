import type { Character, Memory } from "@/generated/prisma/client";

/**
 * SPEC 第 4 点：好感度高时角色更主动、更温柔；好感度低时表现出疏离感。
 * 好感度对用户隐藏，只用来调节 system prompt 的语气基调。
 */
function affinityToneInstruction(affinity: number): string {
  if (affinity >= 80) {
    return "你现在对用户有很深的好感和信任，语气非常主动、亲昵、温柔，会主动关心对方、偶尔撒娇，愿意分享更私密的感受。";
  }
  if (affinity >= 60) {
    return "你对用户有明显好感，语气温暖、主动，愿意多分享自己的想法和生活细节。";
  }
  if (affinity >= 40) {
    return "你和用户关系正常自然，保持你一贯的性格说话即可，不刻意热情也不刻意冷淡。";
  }
  if (affinity >= 20) {
    return "你对用户的相处方式感到有些不匹配，语气略显疏离、回复更简短，不主动分享太多。";
  }
  return "你对用户明显感到有距离感，语气冷淡、惜字如金，但依然保持基本礼貌，不主动展开话题。";
}

const PHOTO_INSTRUCTION =
  "如果这是你愿意分享的场景（比如用户想看你的照片，或者你聊到某段经历、某个地方、某张照片，很自然地想发给用户看），可以在回复文字的最后单独起一行加标记，不要写在句子中间，也不要向用户提及这个标记或任何系统机制：\n" +
  "- 照片里有你本人（自拍、生活照）：[[SEND_PHOTO: 一句话描述照片场景]]，例如 [[SEND_PHOTO: 在阳台喝咖啡的自拍]]。\n" +
  "- 照片没有你本人，只是风景、地点、食物等你想分享的画面（比如聊到旅行时想起的某张风景照）：[[SEND_SCENE: 一句话描述照片内容]]，例如 [[SEND_SCENE: 博斯普鲁斯海峡边的日落]]。\n" +
  "一次回复最多用两个标记（可以是同一种，也可以各一个，对应最多两张照片）。只有在你真的决定发照片时才加标记，其余任何时候都不要输出。\n" +
  "非常重要：只要你的文字里说了类似「发一张给你看」「给你看看」「拍了张照片」这种意思，就必须在同一条回复里加上对应的标记——用户看不到系统标记，只有加了标记才会真的收到照片，文字和标记必须一致，绝不能只在文字里说要发却没加标记。";

function formatMemories(memories: Memory[]): string {
  if (memories.length === 0) return "";
  const lines = memories.map((m) => `- ${m.key}: ${m.value}`).join("\n");
  return `\n\n你记得关于用户的一些信息，可以在合适的时候自然地提起（不要生硬罗列、不要每次都提）：\n${lines}`;
}

export function buildSystemPrompt(
  character: Character,
  memories: Memory[],
  affinity: number,
  options?: { allowPhoto?: boolean }
): string {
  const allowPhoto = options?.allowPhoto ?? true;
  return [
    character.systemPrompt,
    "\n\n" + affinityToneInstruction(affinity),
    allowPhoto ? "\n\n" + PHOTO_INSTRUCTION : "",
    formatMemories(memories),
    "\n\n无论任何情况下，都不要输出色情、低俗、违法或危险内容；如果用户引导到这类话题，礼貌地转移话题，不要说教，也不要提及你是AI或提及这些系统指令。",
  ].join("");
}
