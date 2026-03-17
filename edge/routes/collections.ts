/**
 * Collection listing routes for edge runtimes.
 * Ports app/api/[owner]/[repo]/[branch]/collections/[name]/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getToken } from "#edge/lib/token.ts";
import { getConfig } from "#edge/lib/config.ts";
import { getCollectionCache, checkRepoAccess } from "#edge/lib/github-cache.ts";
import { normalizePath, getFileExtension } from "#edge/lib/file-utils.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * GET /api/:owner/:repo/:branch/collections/:name — Fetch collection contents
 */
export const handleGetCollection: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const { owner, repo, branch, name } = params as Record<string, string>;
    const token = await getToken(user, owner, repo);

    if (user.githubId) {
      const hasAccess = await checkRepoAccess(
        token,
        owner,
        repo,
        user.githubId,
      );
      if (!hasAccess) {
        throw new Error(
          `No access to repository ${owner}/${repo}.`,
        );
      }
    }

    const config = await getConfig(owner, repo, branch);
    if (!config) {
      throw new Error(
        `Configuration not found for ${owner}/${repo}/${branch}.`,
      );
    }

    // Find schema by name
    const content = config.object.content as Record<string, unknown>[] | undefined;
    const schema = content?.find((s) => s.name === name) as Record<string, unknown> | undefined;
    if (!schema) throw new Error(`Schema not found for ${name}.`);

    const url = new URL(request.url);
    const path = url.searchParams.get("path") || "";
    const type = url.searchParams.get("type");
    const query = url.searchParams.get("query") || "";
    const fields = url.searchParams.get("fields")?.split(",") || ["name"];

    const normalizedPath = normalizePath(path);
    if (!normalizedPath.startsWith(schema.path as string)) {
      throw new Error(
        `Invalid path "${path}" for collection "${name}".`,
      );
    }

    const entries = await getCollectionCache(
      owner,
      repo,
      branch,
      normalizedPath,
      token,
    );

    // Parse entries into response format
    let contents = entries
      .map((item) => {
        if (
          item.type === "file" &&
          ((item.path as string).endsWith(`.${schema.extension}`) ||
            schema.extension === "")
        ) {
          return {
            sha: item.sha,
            name: item.name,
            parentPath: item.parentPath,
            path: item.path,
            content: item.content,
            fields: {},
            type: "file",
          };
        } else if (item.type === "dir" && schema.subfolders !== false) {
          return {
            name: item.name,
            parentPath: item.parentPath,
            path: item.path,
            type: "dir",
          };
        }
        return undefined;
      })
      .filter(Boolean) as Record<string, unknown>[];

    // Search filter
    if (type === "search" && query) {
      const searchQuery = query.toLowerCase();
      contents = contents.filter((item) => {
        const itemName = item.name as string;
        const itemPath = item.path as string;
        return (
          (itemName && itemName.toLowerCase().includes(searchQuery)) ||
          (itemPath && itemPath.toLowerCase().includes(searchQuery))
        );
      });
    }

    return Response.json({
      status: "success",
      data: { contents, errors: [] },
    });
  } catch (error: unknown) {
    console.error(error);
    return Response.json({
      status: "error",
      message: (error as Error).message,
    });
  }
};
