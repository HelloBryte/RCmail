import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlans } from "@/lib/db/schema";

const PERSONAL_LIMIT = 3;

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const [plan] = await db.select().from(userPlans).where(eq(userPlans.userId, userId)).limit(1);

  if (!plan) {
    return Response.json({ type: "personal", trialUsed: 0, trialRemaining: PERSONAL_LIMIT });
  }

  return Response.json({
    type: plan.planType,
    trialUsed: plan.trialUsed,
    trialRemaining: plan.planType === "personal" ? Math.max(0, PERSONAL_LIMIT - plan.trialUsed) : null,
  });
}
