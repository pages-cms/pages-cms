/**
 * File create/update/delete routes for edge runtimes.
 * Ports app/api/[owner]/[repo]/[branch]/files/[path]/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getToken } from "#edge/lib/token.ts";
import { getConfig, updateConfig } from "#edge/lib/config.ts";
import { createGitHubClient } from "#edge/lib/octokit.ts";
import { updateFileCache } from "#edge/lib/github-cache.ts";
import {
  normalizePath,
  getFileExtension,
  getFileName,
  getParentPath,
} from "#edge/lib/file-utils.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * POST /api/:owner/:repo/:branch/files/:path — Create or update a file
 */
export const handleSaveFile: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const { owner, repo, branch, path: rawPath } = params as Record<
      string,
      string
    >;
    const token = await getToken(user, owner, repo);
    const normalizedPath = normalizePath(rawPath);

    const config = await getConfig(owner, repo, branch);
    if (!config && normalizedPath !== ".pages.yml") {
      throw new Error(
        `Configuration not found for ${owner}/${repo}/${branch}.`,
      );
    }

    const data = await request.json();

    let contentBase64: string;

    switch (data.type) {
      case "content":
        if (!data.name) throw new Error('"name" is required for content.');

        if (getFileName(normalizedPath) === ".gitkeep") {
          contentBase64 = "";
        } else {
          // For edge, we pass through content as-is (serialization done client-side)
          const body = data.content?.body ?? "";
          contentBase64 = btoa(
            typeof body === "string"
              ? body
              : JSON.stringify(data.content),
          );
        }
        break;

      case "media":
        if (!data.name) throw new Error('"name" is required for media.');

        if (getFileName(normalizedPath) === ".gitkeep") {
          contentBase64 = "";
        } else {
          contentBase64 = data.content; // Already base64
        }
        break;

      case "settings":
        if (normalizedPath !== ".pages.yml") {
          throw new Error(`Invalid path "${rawPath}" for settings.`);
        }
        contentBase64 = btoa(data.content?.body ?? "");
        break;

      default:
        throw new Error(`Invalid type "${data.type}".`);
    }

    const client = createGitHubClient(token);

    // Save to GitHub
    let response;
    try {
      response = await client.createOrUpdateFile(
        owner,
        repo,
        normalizedPath,
        data.sha
          ? `Update ${normalizedPath} (via Pages CMS)`
          : `Create ${normalizedPath} (via Pages CMS)`,
        contentBase64,
        branch,
        data.sha,
      );
    } catch (error: unknown) {
      const err = error as Record<string, unknown>;
      if (err.status === 409) {
        throw new Error(
          "File has changed since you last loaded it. Please refresh the page and try again.",
        );
      }
      throw error;
    }

    const savedPath = response.content?.path;

    // Update config cache if settings file was saved
    if (data.type === "settings" && response.content && response.commit) {
      const configVersion = "2.3";
      let configObject;
      try {
        // Import yaml dynamically for edge builds
        const YAML = await import("yaml");
        const doc = YAML.default.parseDocument(data.content.body ?? "");
        configObject = doc.toJSON();
      } catch {
        configObject = {};
      }

      const newConfig = {
        owner,
        repo,
        branch,
        sha: response.content.sha,
        version: configVersion,
        object: configObject,
      };
      await updateConfig(newConfig);
    }

    // Update file cache
    if (response.content && response.commit) {
      await updateFileCache(
        data.type === "content" ? "collection" : "media",
        owner,
        repo,
        branch,
        {
          type: data.sha ? "modify" : "add",
          path: response.content.path,
          sha: response.content.sha,
          content: atob(contentBase64),
          size: response.content.size,
          downloadUrl: response.content.download_url ?? undefined,
          commit: {
            sha: response.commit.sha,
            timestamp: new Date(
              response.commit.committer?.date ?? new Date().toISOString(),
            ).getTime(),
          },
        },
      );
    }

    return Response.json({
      status: "success",
      message:
        savedPath !== normalizedPath
          ? `File "${normalizedPath}" saved successfully but renamed to "${savedPath}" to avoid naming conflict.`
          : `File "${normalizedPath}" saved successfully.`,
      data: {
        type: response.content?.type,
        sha: response.content?.sha,
        name: response.content?.name,
        path: savedPath,
        extension: getFileExtension(response.content?.name || ""),
        size: response.content?.size,
        url: response.content?.download_url,
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

/**
 * DELETE /api/:owner/:repo/:branch/files/:path — Delete a file
 */
export const handleDeleteFile: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const { owner, repo, branch, path: rawPath } = params as Record<
      string,
      string
    >;
    const token = await getToken(user, owner, repo);

    if (rawPath === ".pages.yml") {
      throw new Error("Deleting the settings file isn't allowed.");
    }

    const url = new URL(request.url);
    const sha = url.searchParams.get("sha");
    const type = url.searchParams.get("type");
    const name = url.searchParams.get("name");

    if (!type || !["content", "media"].includes(type)) {
      throw new Error(
        '"type" is required and must be set to "content" or "media".',
      );
    }
    if (!name && type === "content") throw new Error('"name" is required.');
    if (!sha) throw new Error('"sha" is required.');

    const normalizedPath = normalizePath(rawPath);

    const client = createGitHubClient(token);
    const response = await client.deleteFile(
      owner,
      repo,
      normalizedPath,
      `Delete ${normalizedPath} (via Pages CMS)`,
      sha,
      branch,
    );

    await updateFileCache("collection", owner, repo, branch, {
      type: "delete",
      path: normalizedPath,
    });

    return Response.json({
      status: "success",
      message: `File "${normalizedPath}" deleted successfully.`,
      data: {
        sha: response.commit.sha,
        name: response.content?.name,
        path: response.content?.path,
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
