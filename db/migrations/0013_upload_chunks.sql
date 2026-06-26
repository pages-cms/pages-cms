CREATE TABLE "upload_chunk" (
	"id" serial PRIMARY KEY NOT NULL,
	"upload_id" text NOT NULL,
	"user_id" text NOT NULL,
	"chunk_idx" integer NOT NULL,
	"data" bytea NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "upload_chunk" ADD CONSTRAINT "upload_chunk_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_upload_chunk_uploadId_chunkIdx" ON "upload_chunk" USING btree ("upload_id","chunk_idx");--> statement-breakpoint
CREATE INDEX "idx_upload_chunk_createdAt" ON "upload_chunk" USING btree ("created_at");