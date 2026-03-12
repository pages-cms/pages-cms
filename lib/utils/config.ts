/**
 * Utility functions to create, retrieve and update a repository configuration
 * from the DB.
 * 
 * Look at the `lib/config.ts` file to understand how the config is parsed,
 * normalized and validated.
 */

import { Config } from "@/types/config";
import { createDb } from "@/db";
import { configTable } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";

// TODO: add a fallback behavior to retrieve conf if not in DB
const getConfig = async (
  owner: string,
  repo: string,
  branch: string,
): Promise<Config | null> => {
  if (!owner || !repo || !branch) throw new Error(`Owner, repo, and branch must all be provided.`);

  const db = await createDb();
  const config = await db.query.configTable.findFirst({
    where: and(
      sql`lower(${configTable.owner}) = lower(${owner})`,
      sql`lower(${configTable.repo}) = lower(${repo})`,
      eq(configTable.branch, branch),
    )
  });

  if (!config) return null;

  return {
    owner: config.owner,
    repo: config.repo,
    branch: config.branch,
    sha: config.sha,
    version: config.version,
    object: JSON.parse(config.object)
  }
};

const saveConfig = async (
  config: Config,
): Promise<Config> => {
  const db = await createDb();
  const result = await db.insert(configTable).values({
    owner: config.owner,
    repo: config.repo,
    branch: config.branch,
    sha: config.sha,
    version: config.version,
    object: JSON.stringify(config.object)
  });

  return config;
}

const updateConfig = async (
  config: Config,
): Promise<Config> => {
  const db = await createDb();
  await db.update(configTable).set({
    sha: config.sha,
    version: config.version,
    object: JSON.stringify(config.object)
  }).where(
    and(
      sql`lower(${configTable.owner}) = lower(${config.owner})`,
      sql`lower(${configTable.repo}) = lower(${config.repo})`,
      eq(configTable.branch, config.branch)
    )
  );

  return config;
}

export { getConfig, saveConfig, updateConfig };
