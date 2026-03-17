/**
 * Database migration runner for libsql/SQLite.
 * Runs all migrations on startup (idempotent via IF NOT EXISTS).
 */

import { getDb } from "#edge/lib/db/client.ts";
import { MIGRATIONS } from "#edge/lib/db/schema.ts";

export const initDb = async (): Promise<void> => {
  const db = getDb();
  for (const sql of MIGRATIONS) {
    try {
      await db.execute(sql);
    } catch (error) {
      // Ignore "already exists" errors for idempotent migrations
      const msg = String(error);
      if (!msg.includes("already exists")) {
        console.error(`Migration failed: ${sql.slice(0, 80)}...`, error);
        throw error;
      }
    }
  }
};
