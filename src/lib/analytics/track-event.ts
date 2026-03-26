import { getDb } from "@/lib/db";
import { analyticsEvents } from "@/lib/db/schema";

type TrackEventInput = {
  eventName: string;
  route: string;
  userId?: string;
  statusCode?: number;
  responseMs?: number;
  userAgent?: string;
  details?: string;
};

export async function trackEvent(input: TrackEventInput) {
  try {
    const db = getDb();
    await db.insert(analyticsEvents).values({
      eventName: input.eventName,
      route: input.route,
      userId: input.userId,
      statusCode: input.statusCode,
      responseMs: input.responseMs,
      userAgent: input.userAgent,
      details: input.details,
    });
  } catch {
    // Analytics failures should not break primary product flows.
  }
}
