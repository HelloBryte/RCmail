import { auth, currentUser } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

function isAdminEmail(email: string | null | undefined) {
  const allowList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (!email || allowList.length === 0) return false;
  return allowList.includes(email.toLowerCase());
}

// POST /api/admin/migrate-plans
// 将旧数据中 planType=business 但 planVariant=personal 的记录修正为 yearly
export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!isAdminEmail(email)) return new Response("Forbidden", { status: 403 });

  const db = getDb();

  // 修正：business 用户若 planVariant 仍为 personal（旧版无此字段时的默认值），视为年卡
  const result = await db.execute(
    sql`UPDATE user_plans
        SET plan_variant = 'yearly', updated_at = NOW()
        WHERE plan_type = 'business'
          AND plan_variant = 'personal'`
  );

  return Response.json({ fixed: result.rowCount ?? 0 });
}
