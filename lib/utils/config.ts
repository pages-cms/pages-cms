import { Config } from "@/types/config";
import { db } from "@/db";
import { configs } from "@/db/schema";
import { and, eq } from "drizzle-orm";

let cachedConfig: Config | undefined;

const getConfig = async (
  owner: string,
  repo: string,
  branch: string,
): Promise<Config | null> => {
  if (!owner || !repo || !branch) throw new Error(`Owner, repo, and branch must all be provided.`);

  if (cachedConfig && cachedConfig.owner === owner && cachedConfig.repo === repo && cachedConfig.branch === branch) return cachedConfig;
  
  const config = await db.query.configs.findFirst({
    where: and(
      eq(configs.owner, owner.toLowerCase()),
      eq(configs.repo, repo.toLowerCase()),
      eq(configs.branch, branch),
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
}

const saveConfig = async (
  config: Config,
): Promise<Config> => {
  await db.insert(configs).values({
    owner: config.owner.toLowerCase(),
    repo: config.repo.toLowerCase(),
    branch: config.branch,
    sha: config.sha,
    version: config.version,
    object: JSON.stringify(config.object)
  });
  
  cachedConfig = config;

  return cachedConfig;
}

const updateConfig = async (
  config: Config,
): Promise<Config> => {
  await db.update(configs).set({
    sha: config.sha,
    version: config.version,
    object: JSON.stringify(config.object)
  }).where(
    and(
      eq(configs.owner, config.owner.toLowerCase()),
      eq(configs.repo, config.repo.toLowerCase()),
      eq(configs.branch, config.branch)
    )
  );

  cachedConfig = config;

  return cachedConfig;
}

export { getConfig, saveConfig, updateConfig };