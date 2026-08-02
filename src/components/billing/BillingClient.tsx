"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CharacterCard } from "@/components/CharacterCard";
import { characterAccent } from "@/lib/character-theme";
import type { AccessStatus, CharacterSummary } from "@/types/domain";

type PlanKey = "SUB_MONTH" | "SUB_HALF_YEAR" | "SUB_YEAR";

const PLANS: { key: PlanKey; label: string; price: string; note: string; featured?: boolean }[] = [
  { key: "SUB_MONTH", label: "1 个月", price: "$20", note: "先感受一下" },
  { key: "SUB_HALF_YEAR", label: "半年", price: "$100", note: "平均 $16.7/月", featured: true },
  { key: "SUB_YEAR", label: "一年", price: "$190", note: "平均 $15.8/月" },
];

export function BillingClient({
  access,
  currentCharacter,
  characters,
}: {
  access: AccessStatus | null;
  currentCharacter: CharacterSummary | null;
  characters: CharacterSummary[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [switchTarget, setSwitchTarget] = useState<CharacterSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSwitchPicker, setShowSwitchPicker] = useState(searchParams.get("intent") === "switch");

  async function subscribe(plan: PlanKey) {
    if (!access) {
      router.push("/login");
      return;
    }
    setError(null);
    setLoadingPlan(plan);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        setError("支付失败，请重试。");
        return;
      }
      router.push("/chat");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function confirmSwitch() {
    if (!switchTarget) return;
    setError(null);
    setLoadingPlan("switch");
    try {
      const res = await fetch("/api/characters/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: switchTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message ?? "更换失败，请重试。");
        return;
      }
      router.push("/chat");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-10 sm:px-10">
      <h1 className="font-display text-3xl text-paper">开通会员</h1>
      <p className="mt-2 text-sm text-paper-dim">
        {!access
          ? "登录后即可开始 7 天免费试用，随时开通会员解锁完整体验。"
          : access.trialExpired
          ? "7 天试用已结束，开通会员后可以继续聊天、保留记忆和历史消息。"
          : access.trialDaysLeft != null
          ? `试用还剩 ${access.trialDaysLeft} 天，提前开通不会浪费剩余天数。`
          : "你已经是会员。"}
      </p>

      {error && <p className="mt-3 text-sm text-rose">{error}</p>}

      <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`relative flex flex-col rounded-2xl border p-6 ${
              plan.featured ? "border-ember bg-ink-2" : "border-line bg-ink-2"
            }`}
          >
            {plan.featured && (
              <span className="absolute -top-3 left-6 rounded-full bg-ember px-3 py-1 text-[11px] font-medium text-ink">
                推荐
              </span>
            )}
            <span className="text-sm text-mist">{plan.label}</span>
            <span className="mt-2 font-display text-4xl text-paper">{plan.price}</span>
            <span className="mt-1 text-xs text-paper-dim">{plan.note}</span>
            <button
              onClick={() => subscribe(plan.key)}
              disabled={loadingPlan === plan.key}
              className="mt-6 rounded-full bg-paper px-4 py-2.5 text-sm font-medium text-ink transition-opacity disabled:opacity-50"
            >
              {loadingPlan === plan.key ? "处理中…" : "订阅"}
            </button>
          </div>
        ))}
      </section>

      {currentCharacter && (
        <section className="mt-12 rounded-2xl border border-line bg-ink-2 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-paper">更换女友</h2>
              <p className="mt-1 text-sm text-paper-dim">
                当前是 <span style={{ color: characterAccent(currentCharacter.key) }}>{currentCharacter.name}</span>。
                更换后聊天记录会保留，但好感度从 50 重新开始。
              </p>
            </div>
            <button
              onClick={() => setShowSwitchPicker((v) => !v)}
              className="rounded-full border border-line px-4 py-2 text-sm text-paper-dim hover:text-paper"
            >
              {showSwitchPicker ? "收起" : "选择新的女友 · $50"}
            </button>
          </div>

          {showSwitchPicker && (
            <div className="mt-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {characters
                  .filter((c) => c.key !== currentCharacter.key)
                  .map((c) => (
                    <CharacterCard
                      key={c.id}
                      character={c}
                      ctaLabel={switchTarget?.id === c.id ? "已选中" : "选她"}
                      onSelect={setSwitchTarget}
                    />
                  ))}
              </div>

              {switchTarget && (
                <button
                  onClick={confirmSwitch}
                  disabled={loadingPlan === "switch"}
                  className="mt-6 rounded-full bg-ember px-6 py-2.5 text-sm font-medium text-ink disabled:opacity-50"
                >
                  {loadingPlan === "switch" ? "处理中…" : `确认支付 $50 并换成 ${switchTarget.name}`}
                </button>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
