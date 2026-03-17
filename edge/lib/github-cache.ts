/**
 * GitHub file cache management for edge runtimes.
 * Replaces lib/githubCache.ts (which uses Drizzle ORM) with raw SQL for libsql.
 */

import { execute, queryAll, queryOne } from "#edge/lib/db/client.ts";
import { createGitHubClient } from "#edge/lib/octokit.ts";

type FileOperation = {
  type: "add" | "modify" | "delete" | "rename";
  path: string;
  newPath?: string;
  sha?: string;
  content?: string;
  size?: number;
  downloadUrl?: string;
  commit?: { sha: string; timestamp: number };
};

/** Get the parent path of a file path */
const getParentPath = (path: string): string =>
  path === "" || path === "/" ? "" : path.split("/").slice(0, -1).join("/") || "";

/** Get the filename from a path */
const getFileName = (path: string): string => path.split("/").pop() || "";

/** Check if a user has repository access (with caching) */
export const checkRepoAccess = async (
  token: string,
  owner: string,
  repo: string,
  githubId: number,
): Promise<boolean> => {
  const lowerOwner = owner.toLowerCase();
  const lowerRepo = repo.toLowerCase();

  // Check cache
  const cached = await queryOne<{ last_updated: number }>(
    `SELECT last_updated FROM cache_permission
     WHERE github_id = ? AND owner = ? AND repo = ?`,
    [githubId, lowerOwner, lowerRepo],
  );

  const permissionCacheTTL =
    parseInt(String(globalThis?.process?.env?.PERMISSION_CACHE_TTL ?? "60")) *
    60 *
    1000;

  if (cached && Date.now() - cached.last_updated < permissionCacheTTL) {
    return true;
  }

  // Verify with GitHub API
  try {
    const client = createGitHubClient(token);
    await client.checkRepoAccess(owner, repo);

    // Update cache
    await execute(
      `INSERT OR REPLACE INTO cache_permission (github_id, owner, repo, last_updated)
       VALUES (?, ?, ?, ?)`,
      [githubId, lowerOwner, lowerRepo, Date.now()],
    );

    return true;
  } catch {
    return false;
  }
};

/** Get collection file cache, fetching from GitHub if not cached */
export const getCollectionCache = async (
  owner: string,
  repo: string,
  branch: string,
  path: string,
  token: string,
  _nodeFilename?: string,
): Promise<Record<string, unknown>[]> => {
  const lowerOwner = owner.toLowerCase();
  const lowerRepo = repo.toLowerCase();

  // Check cache
  const cached = await queryAll<Record<string, unknown>>(
    `SELECT * FROM cache_file
     WHERE owner = ? AND repo = ? AND branch = ? AND parent_path = ? AND context = 'collection'
     ORDER BY type ASC, name ASC`,
    [lowerOwner, lowerRepo, branch, path],
  );

  if (cached.length > 0) {
    return cached.map(normalizeRow);
  }

  // Fetch from GitHub and cache
  return fetchAndCacheDirectory(
    "collection",
    owner,
    repo,
    branch,
    path,
    token,
  );
};

/** Get media file cache */
export const getMediaCache = async (
  owner: string,
  repo: string,
  branch: string,
  path: string,
  token: string,
  nocache = false,
): Promise<Record<string, unknown>[]> => {
  const lowerOwner = owner.toLowerCase();
  const lowerRepo = repo.toLowerCase();

  if (!nocache) {
    const cached = await queryAll<Record<string, unknown>>(
      `SELECT * FROM cache_file
       WHERE owner = ? AND repo = ? AND branch = ? AND parent_path = ? AND context = 'media'
       ORDER BY type ASC, name ASC`,
      [lowerOwner, lowerRepo, branch, path],
    );

    if (cached.length > 0) {
      return cached.map(normalizeRow);
    }
  }

  return fetchAndCacheDirectory("media", owner, repo, branch, path, token);
};

/** Fetch directory from GitHub and store in cache */
const fetchAndCacheDirectory = async (
  context: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  token: string,
): Promise<Record<string, unknown>[]> => {
  const client = createGitHubClient(token);
  const lowerOwner = owner.toLowerCase();
  const lowerRepo = repo.toLowerCase();

  try {
    const contents = await client.getContent(owner, repo, path || ".", branch);
    if (!Array.isArray(contents)) return [];

    const now = Date.now();
    const entries: Record<string, unknown>[] = [];

    for (const item of contents) {
      let content: string | null = null;

      // For collection context files, fetch content
      if (context === "collection" && item.type === "file" && item.size < 1_000_000) {
        try {
          const fileData = await client.getContent(owner, repo, item.path, branch);
          if (!Array.isArray(fileData) && fileData.type === "file" && fileData.content) {
            content = atob(fileData.content.replace(/\n/g, ""));
          }
        } catch {
          // Skip files we can't read
        }
      }

      const entry = {
        context,
        owner: lowerOwner,
        repo: lowerRepo,
        branch,
        parentPath: path,
        name: item.name,
        path: item.path,
        type: item.type,
        content,
        sha: item.sha,
        size: item.size,
        downloadUrl: item.download_url,
        lastUpdated: now,
      };

      entries.push(entry);

      // Insert into cache
      await execute(
        `INSERT OR REPLACE INTO cache_file
         (context, owner, repo, branch, parent_path, name, path, type, content, sha, size, download_url, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          context,
          lowerOwner,
          lowerRepo,
          branch,
          path,
          item.name,
          item.path,
          item.type,
          content,
          item.sha,
          item.size,
          item.download_url,
          now,
        ],
      );
    }

    return entries;
  } catch (error) {
    console.error(`Failed to fetch directory ${owner}/${repo}/${path}:`, error);
    return [];
  }
};

/** Update cache for a single file operation */
export const updateFileCache = async (
  context: string,
  owner: string,
  repo: string,
  branch: string,
  operation: FileOperation,
): Promise<void> => {
  const lowerOwner = owner.toLowerCase();
  const lowerRepo = repo.toLowerCase();
  const now = Date.now();

  switch (operation.type) {
    case "add":
    case "modify":
      await execute(
        `INSERT OR REPLACE INTO cache_file
         (context, owner, repo, branch, parent_path, name, path, type, content, sha, size, download_url, commit_sha, commit_timestamp, last_updated)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'file', ?, ?, ?, ?, ?, ?, ?)`,
        [
          context,
          lowerOwner,
          lowerRepo,
          branch,
          getParentPath(operation.path),
          getFileName(operation.path),
          operation.path,
          operation.content ?? null,
          operation.sha ?? null,
          operation.size ?? null,
          operation.downloadUrl ?? null,
          operation.commit?.sha ?? null,
          operation.commit?.timestamp ?? null,
          now,
        ],
      );
      break;

    case "delete":
      await execute(
        `DELETE FROM cache_file WHERE owner = ? AND repo = ? AND branch = ? AND path = ?`,
        [lowerOwner, lowerRepo, branch, operation.path],
      );
      break;

    case "rename":
      if (!operation.newPath) break;
      await execute(
        `UPDATE cache_file SET path = ?, parent_path = ?, name = ?, commit_sha = ?, commit_timestamp = ?, last_updated = ?
         WHERE owner = ? AND repo = ? AND branch = ? AND path = ?`,
        [
          operation.newPath,
          getParentPath(operation.newPath),
          getFileName(operation.newPath),
          operation.commit?.sha ?? null,
          operation.commit?.timestamp ?? null,
          now,
          lowerOwner,
          lowerRepo,
          branch,
          operation.path,
        ],
      );
      break;
  }
};

/** Update cache for multiple files (webhook push event) */
export const updateMultipleFilesCache = async (
  owner: string,
  repo: string,
  branch: string,
  removed: Array<{ path: string }>,
  modified: Array<{ path: string; sha: string }>,
  added: Array<{ path: string; sha: string }>,
  token: string,
  commit: { sha: string; timestamp: number },
): Promise<void> => {
  const lowerOwner = owner.toLowerCase();
  const lowerRepo = repo.toLowerCase();

  // Delete removed files
  for (const file of removed) {
    await execute(
      `DELETE FROM cache_file WHERE owner = ? AND repo = ? AND branch = ? AND path = ?`,
      [lowerOwner, lowerRepo, branch, file.path],
    );
  }

  // Update modified files
  for (const file of modified) {
    await execute(
      `UPDATE cache_file SET sha = ?, commit_sha = ?, commit_timestamp = ?, last_updated = ?
       WHERE owner = ? AND repo = ? AND branch = ? AND path = ?`,
      [file.sha, commit.sha, commit.timestamp, Date.now(), lowerOwner, lowerRepo, branch, file.path],
    );
  }

  // Add new files (fetch content from GitHub)
  const client = createGitHubClient(token);
  for (const file of added) {
    let content: string | null = null;
    try {
      const fileData = await client.getContent(owner, repo, file.path, branch);
      if (!Array.isArray(fileData) && fileData.type === "file" && fileData.content) {
        content = atob(fileData.content.replace(/\n/g, ""));
      }
    } catch {
      // Skip
    }

    await execute(
      `INSERT OR REPLACE INTO cache_file
       (context, owner, repo, branch, parent_path, name, path, type, content, sha, size, download_url, commit_sha, commit_timestamp, last_updated)
       VALUES ('collection', ?, ?, ?, ?, ?, ?, 'file', ?, ?, NULL, NULL, ?, ?, ?)`,
      [
        lowerOwner,
        lowerRepo,
        branch,
        getParentPath(file.path),
        getFileName(file.path),
        file.path,
        content,
        file.sha,
        commit.sha,
        commit.timestamp,
        Date.now(),
      ],
    );
  }
};

/** Clear file cache for an owner/repo/branch */
export const clearFileCache = async (
  owner: string,
  repo?: string,
  branch?: string,
): Promise<void> => {
  const lowerOwner = owner.toLowerCase();

  if (branch && repo) {
    await execute(
      `DELETE FROM cache_file WHERE owner = ? AND repo = ? AND branch = ?`,
      [lowerOwner, repo.toLowerCase(), branch],
    );
  } else if (repo) {
    await execute(
      `DELETE FROM cache_file WHERE owner = ? AND repo = ?`,
      [lowerOwner, repo.toLowerCase()],
    );
  } else {
    await execute(`DELETE FROM cache_file WHERE owner = ?`, [lowerOwner]);
  }
};

/** Update cache when a repository is renamed */
export const updateFileCacheRepository = async (
  owner: string,
  oldRepo: string,
  newRepo: string,
): Promise<void> => {
  await execute(
    `UPDATE cache_file SET repo = ? WHERE owner = ? AND repo = ?`,
    [newRepo.toLowerCase(), owner.toLowerCase(), oldRepo.toLowerCase()],
  );
};

/** Update cache when an owner is renamed */
export const updateFileCacheOwner = async (
  oldOwner: string,
  newOwner: string,
): Promise<void> => {
  await execute(
    `UPDATE cache_file SET owner = ? WHERE owner = ?`,
    [newOwner.toLowerCase(), oldOwner.toLowerCase()],
  );
};

/** Normalize database row to camelCase for API compatibility */
const normalizeRow = (row: Record<string, unknown>): Record<string, unknown> => ({
  context: row.context,
  owner: row.owner,
  repo: row.repo,
  branch: row.branch,
  parentPath: row.parent_path ?? row.parentPath,
  name: row.name,
  path: row.path,
  type: row.type,
  content: row.content,
  sha: row.sha,
  size: row.size,
  downloadUrl: row.download_url ?? row.downloadUrl,
  commitSha: row.commit_sha ?? row.commitSha,
  commitTimestamp: row.commit_timestamp ?? row.commitTimestamp,
  lastUpdated: row.last_updated ?? row.lastUpdated,
});
