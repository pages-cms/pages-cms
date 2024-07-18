import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

// Users table
const users = pgTable("user", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  githubId: integer("github_id").unique(),
  githubUsername: text("github_username"),
});

// Sessions table
const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
  userId: text("user_id").notNull().references(() => users.id),
});

// Tokens table
const tokens = pgTable("token", {
  id: serial("id").primaryKey(),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  userId: text("user_id").notNull().references(() => users.id),
});

// Configurations table
const configs = pgTable("config", {
  id: serial("id").primaryKey(),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch").notNull(),
  sha: text("sha").notNull(),
  version: text("version").notNull(),
  file: text("file").notNull(),
  object: text("object").notNull()
});

export { users, sessions, tokens, configs };