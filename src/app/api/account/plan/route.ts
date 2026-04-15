import { auth } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { buildPlanInfo, getActiveUserPlan } from "@/lib/plans";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const db = getDb();
  const plan = await getActiveUserPlan(db, userId);

  return Response.json(buildPlanInfo(plan));
}
