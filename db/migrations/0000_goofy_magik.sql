CREATE TABLE `config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`owner` text NOT NULL,
	`repo` text NOT NULL,
	`branch` text NOT NULL,
	`sha` text NOT NULL,
	`version` text NOT NULL,
	`object` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `github_user_token` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ciphertext` text NOT NULL,
	`iv` text NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`github_email` text,
	`github_name` text,
	`github_id` integer,
	`github_username` text,
	`email` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_github_id_unique` ON `user` (`github_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);