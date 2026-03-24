import { tool } from "ai";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { getRedis } from "@/lib/redis";

const preferenceSchema = z.object({
  defaultTone: z.enum(["formal", "informal", "business"]).optional(),
  signature: z.string().max(200).optional(),
});

const upsertEmailInput = z.object({
  subject: z.string().min(1).max(200),
  recipient: z.string().min(1).max(200),
  tone: z.enum(["formal", "informal", "business"]),
  chineseInput: z.string().min(1),
  russianOutput: z.string().min(1),
});

type PreferenceInput = z.infer<typeof preferenceSchema>;
type UpsertEmailInput = z.infer<typeof upsertEmailInput>;

export function buildAgentTools(userId: string) {
  const db = getDb();
  const redis = getRedis();

  return {
    saveEmailDraft: tool({
      description: "Save a newly generated Russian email draft for the current user.",
      inputSchema: upsertEmailInput,
      execute: async (input: UpsertEmailInput) => {
        const [record] = await db
          .insert(emails)
          .values({
            userId,
            subject: input.subject,
            recipient: input.recipient,
            tone: input.tone,
            chineseInput: input.chineseInput,
            russianOutput: input.russianOutput,
            updatedAt: new Date(),
          })
          .returning();

        return { ok: true, record };
      },
    }),

    getEmailHistory: tool({
      description: "Get historical generated emails for the current user.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(50).default(20),
      }),
      execute: async ({ limit }: { limit: number }) => {
        const rows = await db
          .select()
          .from(emails)
          .where(eq(emails.userId, userId))
          .orderBy(desc(emails.createdAt))
          .limit(limit);

        return { ok: true, rows };
      },
    }),

    updateEmailDraft: tool({
      description: "Update an existing draft that belongs to the current user.",
      inputSchema: z.object({
        id: z.string().min(1),
        subject: z.string().min(1).max(200).optional(),
        recipient: z.string().min(1).max(200).optional(),
        tone: z.enum(["formal", "informal", "business"]).optional(),
        chineseInput: z.string().min(1).optional(),
        russianOutput: z.string().min(1).optional(),
      }),
      execute: async ({ id, ...payload }: {
        id: string;
        subject?: string;
        recipient?: string;
        tone?: "formal" | "informal" | "business";
        chineseInput?: string;
        russianOutput?: string;
      }) => {
        const [record] = await db
          .update(emails)
          .set({ ...payload, updatedAt: new Date() })
          .where(and(eq(emails.id, id), eq(emails.userId, userId)))
          .returning();

        if (!record) {
          return { ok: false, message: "Draft not found or access denied." };
        }

        return { ok: true, record };
      },
    }),

    deleteEmailDraft: tool({
      description: "Delete an existing draft that belongs to the current user.",
      inputSchema: z.object({ id: z.string().min(1) }),
      execute: async ({ id }: { id: string }) => {
        const [record] = await db
          .delete(emails)
          .where(and(eq(emails.id, id), eq(emails.userId, userId)))
          .returning();

        if (!record) {
          return { ok: false, message: "Draft not found or access denied." };
        }

        return { ok: true, id };
      },
    }),

    getUserPreferences: tool({
      description: "Read current user preferences like default tone and signature.",
      inputSchema: z.object({}),
      execute: async () => {
        const key = `user:${userId}:prefs`;
        const prefs = await redis.get<PreferenceInput>(key);
        return {
          ok: true,
          preferences: prefs ?? { defaultTone: "business" },
        };
      },
    }),

    setUserPreferences: tool({
      description: "Update current user preferences used during mail generation.",
      inputSchema: preferenceSchema,
      execute: async (input: PreferenceInput) => {
        const key = `user:${userId}:prefs`;
        await redis.set(key, input);
        return { ok: true, preferences: input };
      },
    }),
  };
}
