/**
 * Tests for edge/lib/db/schema.ts — SQL DDL migrations
 */

import { assertEquals, assertNotEquals } from "@std/assert";
import { MIGRATIONS } from "#edge/lib/db/schema.ts";

Deno.test("schema - has migration statements", () => {
  assertNotEquals(MIGRATIONS.length, 0);
});

Deno.test("schema - all migrations are CREATE TABLE or CREATE INDEX", () => {
  for (const sql of MIGRATIONS) {
    const trimmed = sql.trim().toUpperCase();
    const valid = trimmed.startsWith("CREATE TABLE") || trimmed.startsWith("CREATE INDEX") || trimmed.startsWith("CREATE UNIQUE INDEX");
    assertEquals(valid, true, `Unexpected migration: ${sql.slice(0, 50)}`);
  }
});

Deno.test("schema - uses IF NOT EXISTS for idempotency", () => {
  for (const sql of MIGRATIONS) {
    assertEquals(
      sql.toUpperCase().includes("IF NOT EXISTS"),
      true,
      `Migration missing IF NOT EXISTS: ${sql.slice(0, 50)}`,
    );
  }
});

Deno.test("schema - includes all required tables", () => {
  const allSql = MIGRATIONS.join("\n").toLowerCase();

  const requiredTables = [
    '"user"',
    '"session"',
    "github_user_token",
    "github_installation_token",
    "email_login_token",
    "collaborator",
    "config",
    "cache_file",
    "cache_permission",
  ];

  for (const table of requiredTables) {
    assertEquals(
      allSql.includes(table.toLowerCase()),
      true,
      `Missing table: ${table}`,
    );
  }
});

Deno.test("schema - includes required indexes", () => {
  const allSql = MIGRATIONS.join("\n").toLowerCase();

  const requiredIndexes = [
    "idx_session_userid",
    "idx_github_user_token_userid",
    "idx_github_installation_token_installationid",
    "idx_collaborator_owner_repo_email",
    "idx_config_owner_repo_branch",
    "idx_cache_file_owner_repo_branch_parentpath",
    "idx_cache_file_owner_repo_branch_path",
    "idx_cache_permission_githubid_owner_repo",
  ];

  for (const index of requiredIndexes) {
    assertEquals(
      allSql.includes(index.toLowerCase()),
      true,
      `Missing index: ${index}`,
    );
  }
});
