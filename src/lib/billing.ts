export const TRIAL_DAYS = 7;

export const PLAN_PRICE_CENTS = {
  SUB_MONTH: 2000,
  SUB_HALF_YEAR: 10000,
  SUB_YEAR: 19000,
  CHARACTER_SWITCH: 5000,
} as const;

export const PLAN_DURATION_DAYS: Record<"SUB_MONTH" | "SUB_HALF_YEAR" | "SUB_YEAR", number> = {
  SUB_MONTH: 30,
  SUB_HALF_YEAR: 182,
  SUB_YEAR: 365,
};

export interface AccessStatus {
  canChat: boolean;
  hasActiveSubscription: boolean;
  trialDaysLeft: number | null;
  trialExpired: boolean;
  planExpiresAt: Date | null;
}

/**
 * SPEC 第 8 点：会员开启聊天后可体验 7 天，7 天后冻结聊天功能直到付费。
 * trialStartedAt 在用户第一次真正发消息时才写入（见 chat/send route）。
 */
export function getAccessStatus(user: {
  trialStartedAt: Date | null;
  isPaid: boolean;
  planExpiresAt: Date | null;
}): AccessStatus {
  const now = new Date();
  const hasActiveSubscription = user.isPaid && !!user.planExpiresAt && user.planExpiresAt > now;

  if (hasActiveSubscription) {
    return {
      canChat: true,
      hasActiveSubscription: true,
      trialDaysLeft: null,
      trialExpired: false,
      planExpiresAt: user.planExpiresAt,
    };
  }

  if (!user.trialStartedAt) {
    return {
      canChat: true,
      hasActiveSubscription: false,
      trialDaysLeft: TRIAL_DAYS,
      trialExpired: false,
      planExpiresAt: user.planExpiresAt,
    };
  }

  const daysElapsed = (now.getTime() - user.trialStartedAt.getTime()) / (1000 * 60 * 60 * 24);
  const trialExpired = daysElapsed >= TRIAL_DAYS;
  const trialDaysLeft = Math.max(0, Math.ceil(TRIAL_DAYS - daysElapsed));

  return {
    canChat: !trialExpired,
    hasActiveSubscription: false,
    trialDaysLeft,
    trialExpired,
    planExpiresAt: user.planExpiresAt,
  };
}
