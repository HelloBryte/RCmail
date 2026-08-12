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

  type CountRow = { count: number };
  type ValueRow = { value: number };
  type TopEventRow = { event_name: string; count: number };

  /** db.execute 的返回类型随驱动而异，统一取出首行的单个标量 */
  function firstScalar<T extends Record<string, unknown>>(
    result: { rows?: T[] },
    key: keyof T
  ): number {
    return Number(result.rows?.[0]?.[key] ?? 0);
  }

  const [
    eventsTotalResult,
    events24hResult,
    usersTotalResult,
    businessUsersResult,
    generatedMailsResult,
    avgLatencyResult,
    topEvents,
  ] = await Promise.all([
    db.execute<CountRow>(sql`select count(*)::int as count from analytics_events`),
    db.execute<CountRow>(sql`select count(*)::int as count from analytics_events where created_at >= now() - interval '24 hours'`),
    db.execute<CountRow>(sql`select count(*)::int as count from user_plans`),
    db.execute<CountRow>(sql`select count(*)::int as count from user_plans where plan_type = 'business'`),
    db.execute<CountRow>(sql`select count(*)::int as count from emails`),
    db.execute<ValueRow>(sql`select coalesce(round(avg(response_ms))::int,0) as value from analytics_events where response_ms is not null`),
    db.execute<TopEventRow>(sql`
      select event_name, count(*)::int as count
      from analytics_events
      group by event_name
      order by count desc
      limit 10
    `),
  ]);

  return Response.json({
    cards: {
      eventsTotal: firstScalar(eventsTotalResult, "count"),
      events24h: firstScalar(events24hResult, "count"),
      usersTotal: firstScalar(usersTotalResult, "count"),
      businessUsers: firstScalar(businessUsersResult, "count"),
      generatedMails: firstScalar(generatedMailsResult, "count"),
      avgLatencyMs: firstScalar(avgLatencyResult, "value"),
    },
    topEvents: topEvents.rows ?? [],
  });
}
