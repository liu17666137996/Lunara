import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/require-user";
import { PLAN_PRICE_CENTS, PLAN_DURATION_DAYS, getAccessStatus } from "@/lib/billing";

const bodySchema = z.object({ plan: z.enum(["SUB_MONTH", "SUB_HALF_YEAR", "SUB_YEAR"]) });

/**
 * Mock 订阅支付：点击即视为支付成功，写 Payment 记录并延长 planExpiresAt。
 * 后续接入真实支付网关时，只需把这里换成 webhook 驱动的状态更新。
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (userId instanceof NextResponse) return userId;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const plan = parsed.data.plan;
  const durationDays = PLAN_DURATION_DAYS[plan];

  const now = new Date();
  const currentExpiry = user.isPaid && user.planExpiresAt && user.planExpiresAt > now ? user.planExpiresAt : now;
  const planExpiresAt = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const [, updatedUser] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        userId,
        type: plan,
        amountCents: PLAN_PRICE_CENTS[plan],
        status: "SUCCEEDED",
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isPaid: true, planExpiresAt },
    }),
  ]);

  return NextResponse.json({ access: getAccessStatus(updatedUser) });
}
