import {
  sqliteTable,
  text,
  integer,
} from "drizzle-orm/sqlite-core";

const userTable = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  githubEmail: text("github_email"),
  githubName: text("github_name"),
  githubId: integer("github_id").unique(),
  githubUsername: text("github_username"),
  email: text("email").unique()
});

const sessionTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  expiresAt: integer("expires_at").notNull(),
  userId: text("user_id").notNull().references(() => userTable.id)
});

const githubUserTokenTable = sqliteTable("github_user_token", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ciphertext: text("ciphertext").notNull(),
  iv: text("iv").notNull(),
  userId: text("user_id").notNull().references(() => userTable.id)
});

const configTable = sqliteTable("config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  branch: text("branch").notNull(),
  sha: text("sha").notNull(),
  version: text("version").notNull(),
  object: text("object").notNull()
});

export {
  userTable,
  sessionTable,
  githubUserTokenTable,
  configTable
};