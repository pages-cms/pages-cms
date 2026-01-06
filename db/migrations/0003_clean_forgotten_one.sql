CREATE TABLE IF NOT EXISTS "public_join_token" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"owner" text NOT NULL,
	"repo" text NOT NULL,
	"installation_id" integer,
	"owner_id" integer,
	"repo_id" integer,
	"type" text NOT NULL,
	"created_by" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"usage_limit" integer NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp NOT NULL,
	CONSTRAINT "public_join_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_public_join_token_token" ON "public_join_token" USING btree ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_public_join_token_owner_repo" ON "public_join_token" USING btree ("owner","repo");