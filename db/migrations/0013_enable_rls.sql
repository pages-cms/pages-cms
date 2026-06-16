-- Enable Row Level Security on all public tables.
-- The app connects via the postgres superuser (DATABASE_URL), which bypasses RLS,
-- so no policies are needed. This blocks direct API access via the anon/authenticated roles.
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "github_installation_token" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "collaborator" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "collaborator_invite" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "config" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cache_file" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cache_file_meta" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cache_permission" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "action_run" ENABLE ROW LEVEL SECURITY;
