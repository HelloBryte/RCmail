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

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  if (!isAdminEmail(email)) {
    return new Response("Forbidden", { status: 403 });
  }

  const db = getDb();

  const eventsTotalResult = await db.execute(sql`select count(*)::int as count from analytics_events`);
  const events24hResult = await db.execute(sql`select count(*)::int as count from analytics_events where created_at >= now() - interval '24 hours'`);
  const usersTotalResult = await db.execute(sql`select count(*)::int as count from user_plans`);
  const businessUsersResult = await db.execute(sql`select count(*)::int as count from user_plans where plan_type = 'business'`);
  const generatedMailsResult = await db.execute(sql`select count(*)::int as count from emails`);
  const avgLatencyResult = await db.execute(sql`select coalesce(round(avg(response_ms))::int,0) as value from analytics_events where response_ms is not null`);

  const topEvents = await db.execute(sql`
    select event_name, count(*)::int as count
    from analytics_events
    group by event_name
    order by count desc
    limit 10
  `);

  return Response.json({
    cards: {
      eventsTotal: Number((eventsTotalResult as any).rows?.[0]?.count ?? 0),
      events24h: Number((events24hResult as any).rows?.[0]?.count ?? 0),
      usersTotal: Number((usersTotalResult as any).rows?.[0]?.count ?? 0),
      businessUsers: Number((businessUsersResult as any).rows?.[0]?.count ?? 0),
      generatedMails: Number((generatedMailsResult as any).rows?.[0]?.count ?? 0),
      avgLatencyMs: Number((avgLatencyResult as any).rows?.[0]?.value ?? 0),
    },
    topEvents: (topEvents as any).rows ?? [],
  });
}
