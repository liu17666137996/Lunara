// 每个角色的主题色，用于卡片光晕、聊天头部与气泡描边。
// 暂无角色美术图时也用作占位头像的渐变配色。
export const CHARACTER_ACCENTS: Record<string, string> = {
  ava: "#6FA8B5",
  emma: "#E08B6B",
  luna: "#A78BC9",
  mia: "#E85D8A",
  olivia: "#8B4A5C",
  sophia: "#C9A15A",
};

export function characterAccent(key: string): string {
  return CHARACTER_ACCENTS[key] ?? "#E8A167";
}
