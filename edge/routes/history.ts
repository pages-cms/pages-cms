/**
 * File history routes for edge runtimes.
 * Ports app/api/[owner]/[repo]/[branch]/entries/[path]/history/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getToken } from "#edge/lib/token.ts";
import { getConfig } from "#edge/lib/config.ts";
import { createGitHubClient } from "#edge/lib/octokit.ts";
import { normalizePath, getFileExtension } from "#edge/lib/file-utils.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * GET /api/:owner/:repo/:branch/entries/:path/history — File commit history
 */
export const handleGetHistory: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const { owner, repo, branch, path: rawPath } = params as Record<
      string,
      string
    >;
    const token = await getToken(user, owner, repo);

    const url = new URL(request.url);
    const name = url.searchParams.get("name") || "";
    const normalizedPath = normalizePath(rawPath);

    if (name) {
      const config = await getConfig(owner, repo, branch);
      if (!config) {
        throw new Error(
          `Configuration not found for ${owner}/${repo}/${branch}.`,
        );
      }
    } else if (normalizedPath !== ".pages.yml") {
      throw new Error(
        'If no content entry name is provided, the path must be ".pages.yml".',
      );
    }

    const client = createGitHubClient(token);
    const commits = await client.listCommits(
      owner,
      repo,
      decodeURIComponent(normalizedPath),
      branch,
    );

    return Response.json({
      status: "success",
      data: commits,
    });
  } catch (error: unknown) {
    console.error(error);
    return Response.json({
      status: "error",
      message: (error as Error).message,
    });
  }
};
