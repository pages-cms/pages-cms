/**
 * Configuration management for edge runtimes.
 * Replaces lib/utils/config.ts (which uses React cache + Drizzle ORM).
 */

import { execute, queryOne } from "#edge/lib/db/client.ts";

export interface Config {
  owner: string;
  repo: string;
  branch: string;
  sha: string;
  version: string;
  object: Record<string, unknown>;
}

/** Get config from the database cache */
export const getConfig = async (
  owner: string,
  repo: string,
  branch: string,
): Promise<Config | null> => {
  if (!owner || !repo || !branch) {
    throw new Error("Owner, repo, and branch must all be provided.");
  }

  const config = await queryOne<{
    owner: string;
    repo: string;
    branch: string;
    sha: string;
    version: string;
    object: string;
  }>(
    `SELECT owner, repo, branch, sha, version, object FROM config
     WHERE lower(owner) = lower(?) AND lower(repo) = lower(?) AND branch = ?`,
    [owner, repo, branch],
  );

  if (!config) return null;

  return {
    owner: config.owner,
    repo: config.repo,
    branch: config.branch,
    sha: config.sha,
    version: config.version,
    object: JSON.parse(config.object),
  };
};

/** Save a new config to the database */
export const saveConfig = async (config: Config): Promise<Config> => {
  await execute(
    `INSERT INTO config (owner, repo, branch, sha, version, object) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      config.owner,
      config.repo,
      config.branch,
      config.sha,
      config.version,
      JSON.stringify(config.object),
    ],
  );
  return config;
};

/** Update an existing config in the database */
export const updateConfig = async (config: Config): Promise<Config> => {
  await execute(
    `UPDATE config SET sha = ?, version = ?, object = ?
     WHERE lower(owner) = lower(?) AND lower(repo) = lower(?) AND branch = ?`,
    [
      config.sha,
      config.version,
      JSON.stringify(config.object),
      config.owner,
      config.repo,
      config.branch,
    ],
  );
  return config;
};
