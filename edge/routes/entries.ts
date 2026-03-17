/**
 * Entry (file content) routes for edge runtimes.
 * Ports app/api/[owner]/[repo]/[branch]/entries/[path]/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getToken } from "#edge/lib/token.ts";
import { getConfig } from "#edge/lib/config.ts";
import { createGitHubClient, type GitHubFileContent } from "#edge/lib/octokit.ts";
import { normalizePath, getFileExtension } from "#edge/lib/file-utils.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * GET /api/:owner/:repo/:branch/entries/:path — Fetch and parse file contents
 */
export const handleGetEntry: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const { owner, repo, branch, path: rawPath } = params as Record<string, string>;
    const token = await getToken(user, owner, repo);

    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    const normalizedPath = normalizePath(rawPath);

    if (!name && normalizedPath !== ".pages.yml") {
      throw new Error(
        'If no content entry name is provided, the path must be ".pages.yml".',
      );
    }

    let config;

    if (name) {
      config = await getConfig(owner, repo, branch);
      if (!config) {
        throw new Error(
          `Configuration not found for ${owner}/${repo}/${branch}.`,
        );
      }

      // Basic schema validation
      const schema = findSchema(config.object, name);
      if (!schema) throw new Error(`Schema not found for ${name}.`);
      if (!normalizedPath.startsWith(schema.path as string)) {
        throw new Error(
          `Invalid path "${rawPath}" for ${schema.type} "${name}".`,
        );
      }
    }

    const client = createGitHubClient(token);
    const response = await client.getContent(owner, repo, normalizedPath, branch);

    if (Array.isArray(response)) {
      throw new Error("Expected a file but found a directory");
    }
    if (response.type !== "file") {
      throw new Error("Invalid response type");
    }

    const content = atob(response.content.replace(/\n/g, ""));
    const contentObject = name
      ? { body: content } // Simplified — full parsing requires field registry
      : { body: content };

    return Response.json({
      status: "success",
      data: {
        sha: response.sha,
        name: response.name,
        path: response.path,
        contentObject,
      },
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

/** Find a schema by name in config object */
const findSchema = (
  configObject: Record<string, unknown>,
  name: string,
): Record<string, unknown> | null => {
  const content = configObject.content as Record<string, unknown>[] | undefined;
  if (!content) return null;
  return (
    content.find((s) => s.name === name) as Record<string, unknown> | undefined
  ) ?? null;
};
