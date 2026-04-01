import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getCustomerInfo } from "@/lib/ezboti";
import { getDb } from "@/lib/db";
import { userPlans } from "@/lib/db/schema";

const PERSONAL_LIMIT = 3;

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [ezInfo, dbResult] = await Promise.allSettled([
    getCustomerInfo(userId),
    getDb().select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1),
  ]);

  const ez = ezInfo.status === "fulfilled" ? ezInfo.value : null;
  const plan = dbResult.status === "fulfilled" ? dbResult.value[0] : null;

  if (ez?.isBusiness) {
    return Response.json({
      type: "business",
      trialUsed: plan?.trialUsed ?? 0,
      trialRemaining: null,
      expireAt: ez.expireAt,
      paywallUrl: ez.paywallUrl,
    });
  }

  const trialUsed = plan?.trialUsed ?? 0;
  return Response.json({
    type: "personal",
    trialUsed,
    trialRemaining: Math.max(0, PERSONAL_LIMIT - trialUsed),
    expireAt: null,
    paywallUrl: ez?.paywallUrl ?? "",
  });
}
