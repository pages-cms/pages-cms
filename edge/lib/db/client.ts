/**
 * Database client for libsql/Turso.
 * Replaces the PostgreSQL + Drizzle ORM setup from the Next.js version.
 * Uses @libsql/client which works on edge runtimes (Deno, Bunny Edge).
 */

import { createClient, type Client, type InValue, type ResultSet } from "@libsql/client";
import { getEnv } from "#edge/lib/env.ts";

let _db: Client | null = null;

export const getDb = (): Client => {
  if (!_db) {
    const url = getEnv("DATABASE_URL") ?? getEnv("DB_URL");
    if (!url) throw new Error("DATABASE_URL or DB_URL environment variable is required");

    _db = createClient({
      url,
      authToken: getEnv("DB_TOKEN"),
    });
  }
  return _db;
};

/** Execute a single SQL statement and return the result set */
export const execute = (
  sql: string,
  args: InValue[] = [],
): Promise<ResultSet> => getDb().execute({ sql, args });

/** Query a single row, returning null if not found */
export const queryOne = async <T>(
  sql: string,
  args: InValue[] = [],
): Promise<T | null> => {
  const result = await execute(sql, args);
  if (result.rows.length === 0) return null;
  return result.rows[0] as unknown as T;
};

/** Query all matching rows */
export const queryAll = async <T>(
  sql: string,
  args: InValue[] = [],
): Promise<T[]> => {
  const result = await execute(sql, args);
  return result.rows as unknown as T[];
};

/** Execute multiple statements in a batch (transaction) */
export const executeBatch = async (
  statements: Array<{ sql: string; args?: InValue[] }>,
): Promise<void> => {
  await getDb().batch(
    statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
    "write",
  );
};
