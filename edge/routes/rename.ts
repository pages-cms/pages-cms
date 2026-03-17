/**
 * File rename routes for edge runtimes.
 * Ports app/api/[owner]/[repo]/[branch]/files/[path]/rename/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getToken } from "#edge/lib/token.ts";
import { getConfig } from "#edge/lib/config.ts";
import { createGitHubClient } from "#edge/lib/octokit.ts";
import { updateFileCache } from "#edge/lib/github-cache.ts";
import { normalizePath } from "#edge/lib/file-utils.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * POST /api/:owner/:repo/:branch/files/:path/rename — Rename a file
 *
 * Uses GitHub's low-level Git Data API (5 API calls) to preserve history.
 */
export const handleRenameFile: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const { owner, repo, branch, path: rawPath } = params as Record<
      string,
      string
    >;
    const token = await getToken(user, owner, repo);

    if (rawPath === ".pages.yml") {
      throw new Error("Renaming the settings file isn't allowed.");
    }

    const config = await getConfig(owner, repo, branch);
    if (!config) {
      throw new Error(
        `Configuration not found for ${owner}/${repo}/${branch}.`,
      );
    }

    const data = await request.json();
    if (!data.type || !["content", "media"].includes(data.type)) {
      throw new Error(
        '"type" is required and must be set to "content" or "media".',
      );
    }
    if (!data.newPath) throw new Error('"newPath" is required.');

    const normalizedPath = normalizePath(rawPath);
    const normalizedNewPath = normalizePath(data.newPath);
    if (normalizedPath === normalizedNewPath) {
      throw new Error(
        `New path "${data.newPath}" is the same as the old path.`,
      );
    }

    const client = createGitHubClient(token);

    // Step 1: Get current branch commit SHA
    const branchData = await client.getBranch(owner, repo, branch);
    const currentSha = branchData.commit.sha;

    // Step 2: Get the current tree
    const treeData = await client.getTree(owner, repo, currentSha, true);

    // Step 3: Create new tree with renamed file
    const newTree = treeData.tree
      .filter((item) => item.type !== "tree")
      .map((item) => ({
        path: item.path === normalizedPath ? normalizedNewPath : item.path,
        mode: item.mode,
        type: item.type,
        sha: item.sha,
      }));

    const newTreeResult = await client.createTree(owner, repo, newTree);

    // Step 4: Create commit
    const commitResult = await client.createCommit(
      owner,
      repo,
      `Rename ${normalizedPath} to ${normalizedNewPath}`,
      newTreeResult.sha,
      [currentSha],
    );

    // Step 5: Update branch ref
    await client.updateRef(owner, repo, `heads/${branch}`, commitResult.sha);

    // Update cache
    await updateFileCache(
      data.type === "content" ? "collection" : "media",
      owner,
      repo,
      branch,
      {
        type: "rename",
        path: normalizedPath,
        newPath: normalizedNewPath,
        commit: { sha: commitResult.sha, timestamp: Date.now() },
      },
    );

    return Response.json({
      status: "success",
      message: `File "${normalizedPath}" moved to "${normalizedNewPath}".`,
      data: {
        path: normalizedPath,
        newPath: normalizedNewPath,
      },
    });
  } catch (error: unknown) {
    console.error(error);
    return Response.json({
      status: "error",
      message: (error as Error).message,
    });
  }
};
