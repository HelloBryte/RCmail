import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { userPlans } from "@/lib/db/schema";

function isAdminEmail(email: string | null | undefined) {
  const allowList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (!email || allowList.length === 0) return false;
  return allowList.includes(email.toLowerCase());
}

async function checkAdmin() {
  const { userId } = await auth();
  if (!userId) return null;
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!isAdminEmail(email)) return null;
  return userId;
}

// GET /api/admin/users — 获取所有用户套餐列表（附带邮箱）
export async function GET() {
  if (!(await checkAdmin())) return new Response("Forbidden", { status: 403 });

  const db = getDb();
  const rows = await db.select().from(userPlans).orderBy(desc(userPlans.updatedAt));

  // 批量从 Clerk 拉取邮箱
  const client = await clerkClient();
  const userIds = rows.map((r) => r.userId);
  const emailMap: Record<string, string> = {};
  if (userIds.length > 0) {
    try {
      const clerkUsers = await client.users.getUserList({ userId: userIds, limit: 500 });
      for (const u of clerkUsers.data) {
        emailMap[u.id] = u.emailAddresses?.[0]?.emailAddress ?? "";
      }
    } catch { /* ignore clerk errors */ }
  }

  const result = rows.map((r) => ({ ...r, email: emailMap[r.userId] ?? "" }));
  return Response.json(result);
}

// POST /api/admin/users — 修改用户套餐
export async function POST(req: Request) {
  if (!(await checkAdmin())) return new Response("Forbidden", { status: 403 });

  const body = await req.json() as {
    targetUserId: string;
    action: "grant_monthly" | "grant_yearly" | "revoke";
  };

  if (!body.targetUserId || !body.action) {
    return new Response("Missing targetUserId or action", { status: 400 });
  }

  const db = getDb();

  let planType: string;
  let planVariant: string;
  let planExpiry: Date | null;

  if (body.action === "grant_monthly") {
    planType = "business";
    planVariant = "monthly";
    planExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  } else if (body.action === "grant_yearly") {
    planType = "business";
    planVariant = "yearly";
    planExpiry = null;
  } else {
    planType = "personal";
    planVariant = "personal";
    planExpiry = null;
  }

  await db
    .insert(userPlans)
    .values({ userId: body.targetUserId, planType, planVariant, planExpiry, trialUsed: 0, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userPlans.userId,
      set: { planType, planVariant, planExpiry, updatedAt: new Date() },
    });

  const [updated] = await db.select().from(userPlans).where(eq(userPlans.userId, body.targetUserId)).limit(1);

  // 附带邮箱
  let email = "";
  try {
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(body.targetUserId);
    email = clerkUser.emailAddresses?.[0]?.emailAddress ?? "";
  } catch { /* ignore */ }

  return Response.json({ ...updated, email });
}
