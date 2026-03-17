/**
 * Media file routes for edge runtimes.
 * Ports app/api/[owner]/[repo]/[branch]/media/[name]/[path]/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getToken } from "#edge/lib/token.ts";
import { getConfig } from "#edge/lib/config.ts";
import { getMediaCache, checkRepoAccess } from "#edge/lib/github-cache.ts";
import { normalizePath, getFileExtension } from "#edge/lib/file-utils.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * GET /api/:owner/:repo/:branch/media/:name/:path — Get media file listing
 */
export const handleGetMedia: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const { owner, repo, branch, name, path: rawPath } = params as Record<
      string,
      string
    >;
    const token = await getToken(user, owner, repo);

    if (user.githubId) {
      const hasAccess = await checkRepoAccess(
        token,
        owner,
        repo,
        user.githubId,
      );
      if (!hasAccess) {
        throw new Error(`No access to repository ${owner}/${repo}.`);
      }
    }

    const config = await getConfig(owner, repo, branch);
    if (!config) {
      throw new Error(
        `Configuration not found for ${owner}/${repo}/${branch}.`,
      );
    }

    const media = config.object.media as Record<string, unknown>[] | undefined;
    const mediaConfig =
      media?.find((item) => item.name === name) ?? media?.[0];

    if (!mediaConfig) {
      throw new Error(
        name
          ? `No media configuration named "${name}" found for ${owner}/${repo}/${branch}.`
          : `No media configuration found for ${owner}/${repo}/${branch}.`,
      );
    }

    const normalizedPath = normalizePath(rawPath);
    if (!normalizedPath.startsWith(mediaConfig.input as string)) {
      throw new Error(
        `Invalid path "${rawPath}" for media "${name}".`,
      );
    }

    const url = new URL(request.url);
    const nocache = url.searchParams.get("nocache");

    let results = await getMediaCache(
      owner,
      repo,
      branch,
      normalizedPath,
      token,
      !!nocache,
    );

    // Filter by allowed extensions
    const extensions = mediaConfig.extensions as string[] | undefined;
    if (extensions && extensions.length > 0) {
      results = results.filter((item) => {
        if (item.type === "dir") return true;
        const ext = getFileExtension(item.name as string);
        return extensions.includes(ext);
      });
    }

    // Sort: directories first, then alphabetical
    results.sort((a, b) => {
      if (a.type === b.type) {
        return (a.name as string).localeCompare(b.name as string);
      }
      return a.type === "dir" ? -1 : 1;
    });

    return Response.json({
      status: "success",
      data: results.map((item) => ({
        type: item.type,
        sha: item.sha,
        name: item.name,
        path: item.path,
        extension:
          item.type === "dir"
            ? undefined
            : getFileExtension(item.name as string),
        size: item.size,
        url: item.downloadUrl,
      })),
    });
  } catch (error: unknown) {
    console.error(error);
    const err = error as Record<string, unknown>;
    return Response.json({
      status: "error",
      message: err.status === 404 ? "Not found" : (error as Error).message,
    });
  }
};
