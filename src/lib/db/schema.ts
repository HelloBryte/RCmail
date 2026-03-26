import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const emails = pgTable("emails", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
  emailType: text("email_type").notNull().default("follow_up"),
  subject: text("subject").notNull(),
  recipient: text("recipient").notNull(),
  tone: text("tone").notNull(),
  chineseInput: text("chinese_input").notNull(),
  russianOutput: text("russian_output").notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export type EmailRow = typeof emails.$inferSelect;
export type NewEmailRow = typeof emails.$inferInsert;

export const userPlans = pgTable("user_plans", {
  userId: text("user_id").primaryKey(),
  planType: text("plan_type").notNull().default("personal"),
  trialUsed: integer("trial_used").notNull().default(0),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
});

export type UserPlanRow = typeof userPlans.$inferSelect;
export type NewUserPlanRow = typeof userPlans.$inferInsert;

export const analyticsEvents = pgTable("analytics_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventName: text("event_name").notNull(),
  route: text("route").notNull(),
  userId: text("user_id"),
  statusCode: integer("status_code"),
  responseMs: integer("response_ms"),
  userAgent: text("user_agent"),
  details: text("details"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export type AnalyticsEventRow = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEventRow = typeof analyticsEvents.$inferInsert;
