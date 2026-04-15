CREATE TABLE "analytics_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_name" text NOT NULL,
	"route" text NOT NULL,
	"user_id" text,
	"status_code" integer,
	"response_ms" integer,
	"user_agent" text,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"email_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"message_type" text NOT NULL,
	"content" text NOT NULL,
	"subject" text,
	"body" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"email_type" text DEFAULT 'follow_up' NOT NULL,
	"subject" text NOT NULL,
	"recipient" text NOT NULL,
	"tone" text NOT NULL,
	"chinese_input" text NOT NULL,
	"russian_output" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_plans" (
	"user_id" text PRIMARY KEY NOT NULL,
	"plan_type" text DEFAULT 'personal' NOT NULL,
	"plan_variant" text DEFAULT 'personal' NOT NULL,
	"plan_expiry" timestamp,
	"trial_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_email_id_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE cascade ON UPDATE no action;