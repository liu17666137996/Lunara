import type { GuestMessage } from "@/types/domain";

// 游客模式的全部状态都只存在 sessionStorage：关闭标签页即清空，不落库。
const CHARACTER_KEY = "lunara_guest_character";
const HISTORY_KEY = "lunara_guest_history";
const AFFINITY_KEY = "lunara_guest_affinity";

export function getGuestCharacterKey(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(CHARACTER_KEY);
}

export function setGuestCharacterKey(key: string) {
  sessionStorage.setItem(CHARACTER_KEY, key);
  sessionStorage.removeItem(HISTORY_KEY);
  sessionStorage.setItem(AFFINITY_KEY, "50");
}

export function getGuestHistory(): GuestMessage[] {
  if (typeof window === "undefined") return [];
  const raw = sessionStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as GuestMessage[];
  } catch {
    return [];
  }
}

export function setGuestHistory(history: GuestMessage[]) {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getGuestAffinity(): number {
  if (typeof window === "undefined") return 50;
  const raw = sessionStorage.getItem(AFFINITY_KEY);
  return raw ? Number(raw) : 50;
}

export function setGuestAffinity(value: number) {
  sessionStorage.setItem(AFFINITY_KEY, String(value));
}
