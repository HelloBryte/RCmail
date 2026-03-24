import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const emails = pgTable("emails", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull(),
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
