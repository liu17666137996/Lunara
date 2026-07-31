// Best-effort keyword guard for obviously explicit / illegal content.
// This is NOT a complete moderation system — the system prompt (see prompt.ts)
// is the primary line of defense; this just catches the worst cases cheaply
// without a round-trip to the LLM. Swap in a real moderation API/service list
// before shipping to production.
const BLOCKED_PATTERNS: RegExp[] = [
  /色情|裸聊|约炮|卖淫|嫖娼/i,
  /child\s*porn|csam/i,
  /强奸|性交易/i,
  /毒品交易|贩毒/i,
];

export function containsBlockedContent(text: string): boolean {
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}

export const SAFE_REFUSAL_REPLY =
  "这个话题我们还是换一个吧，我更想听听你今天过得怎么样。";
