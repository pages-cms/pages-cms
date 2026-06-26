import { after } from "next/server";
import { db } from "@/db";
import { uploadChunkTable } from "@/db/schema";
import { and, asc, eq, lt, or } from "drizzle-orm";
import { getRepoReadContext } from "@/lib/api-repo-context";
import { getFileExtension, getFileName, normalizePath } from "@/lib/utils/file";
import { getMediaCache, updateFileCache } from "@/lib/github-cache-file";
import { createHttpError, toErrorResponse } from "@/lib/api-error";
import { requireApiUserSession } from "@/lib/session-server";
import { getToken } from "@/lib/token";
import { getConfig } from "@/lib/config-store";
import { getSchemaByName } from "@/lib/schema";
import { resolveCommitIdentity } from "@/lib/commit-message";
import { githubSaveFile } from "@/lib/utils/github-save-file";
import { CHUNK_BYTES, MAX_TOTAL_BYTES } from "@/lib/utils/upload-media";

const STALE_CHUNK_AGE_MS = 10 * 60 * 1000;

/**
 * GET: list media files in a directory.
 * POST: finalize a chunked media upload (chunks staged via the /chunk sub-route).
 *
 * GET /api/[owner]/[repo]/[branch]/media/[name]/[path]
 * POST /api/[owner]/[repo]/[branch]/media/[name]/[path]
 *
 * Requires authentication.
 */

export async function GET(
  request: Request,
  context: { params: Promise<{ owner: string, repo: string, branch: string, name: string, path: string }> }
) {
  try {
    const params = await context.params;
    const { token, config } = await getRepoReadContext(params);
    
    const mediaConfig = config.object.media.find((item: any) => item.name === params.name) || config.object.media[0];

    if (!mediaConfig) {
      if (params.name) throw createHttpError(`No media configuration named "${params.name}" found for ${params.owner}/${params.repo}/${params.branch}.`, 404);
      throw createHttpError(`No media configuration found for ${params.owner}/${params.repo}/${params.branch}.`, 404);
    }

    const normalizedPath = normalizeMediaPath(
      params.path,
      params.owner,
      params.repo,
      params.branch,
    );
    if (!normalizedPath.startsWith(mediaConfig.input)) throw createHttpError(`Invalid path "${params.path}" for media "${params.name}".`, 400);

    const { searchParams } = new URL(request.url);
    const nocache = searchParams.get('nocache');

    let results;
    try {
      results = await getMediaCache(params.owner, params.repo, params.branch, normalizedPath, token, !!nocache);
    } catch (error: any) {
      if (error?.status === 404) {
        results = [];
      } else {
        throw error;
      }
    }

    if (mediaConfig.extensions && mediaConfig.extensions.length > 0) {
      results = results.filter((item) => {
        if (item.type === "dir") return true;
        const extension = getFileExtension(item.name);
        return mediaConfig.extensions.includes(extension);
      });
    }

    results.sort((a: any, b: any) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name);
      } else {
        return a.type === "dir" ? -1 : 1;
      }
    });

    return Response.json({
      status: "success",
      data: results.map((item: any) => {
        return {
          type: item.type,
          sha: item.sha,
          name: item.name,
          path: item.path,
          extension: item.type === "dir" ? undefined : getFileExtension(item.name),
          size: item.size,
          url: item.downloadUrl
        };
      }),
    });
  } catch (error: any) {
    console.error(error);
    return toErrorResponse(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ owner: string, repo: string, branch: string, name: string, path: string }> }
) {
  try {
    const sessionResult = await requireApiUserSession();
    if ("response" in sessionResult) return sessionResult.response;
    const user = sessionResult.user;

    const { owner, repo, branch, name, path } = await context.params;

    const form = await request.formData();
    const uploadId = typeof form.get("uploadId") === "string" ? form.get("uploadId") as string : "";
    const totalChunksRaw = form.get("totalChunks");
    const totalChunks = typeof totalChunksRaw === "string" ? parseInt(totalChunksRaw, 10) : NaN;
    const shaRaw = form.get("sha");
    const sha = typeof shaRaw === "string" && shaRaw.length > 0 ? shaRaw : undefined;
    const onConflict = form.get("onConflict") === "error" ? "error" : "rename";
    const firstChunk = form.get("firstChunk");

    if (!uploadId || uploadId.length > 64) throw createHttpError(`Invalid "uploadId".`, 400);
    if (!Number.isInteger(totalChunks) || totalChunks < 1) {
      throw createHttpError(`"totalChunks" must be a positive integer.`, 400);
    }
    if (!name) throw createHttpError(`Missing "name".`, 400);
    if (!(firstChunk instanceof Blob)) {
      throw createHttpError(`Missing "firstChunk".`, 400);
    }
    if (firstChunk.size > CHUNK_BYTES) {
      throw createHttpError(`"firstChunk" too large.`, 413);
    }

    const { token } = await getToken(user, owner, repo, true);
    if (!token) throw new Error("Token not found");

    const normalizedPath = normalizePath(path);
    const isFolderMarker = getFileName(normalizedPath) === ".gitkeep";

    if (firstChunk.size === 0 && !isFolderMarker) {
      throw createHttpError(`Empty "firstChunk" only allowed for .gitkeep folder markers.`, 400);
    }

    const config = await getConfig(owner, repo, branch, { getToken: async () => token });
    if (!config) throw new Error(`Configuration not found for ${owner}/${repo}/${branch}.`);

    const schema = getSchemaByName(config.object, name, "media");
    if (!schema) throw new Error(`Media schema not found for ${name}.`);
    if (!normalizedPath.startsWith(schema.input)) {
      throw new Error(`Invalid path "${path}" for media "${name}".`);
    }
    if (
      !isFolderMarker &&
      schema.extensions?.length > 0 &&
      !schema.extensions.includes(getFileExtension(normalizedPath))
    ) {
      throw new Error(`Invalid extension "${getFileExtension(normalizedPath)}" for media.`);
    }

    const expectedFromDb = totalChunks - 1;
    const chunksFromDb = expectedFromDb > 0
      ? await db
          .select({ chunkIdx: uploadChunkTable.chunkIdx, data: uploadChunkTable.data })
          .from(uploadChunkTable)
          .where(and(
            eq(uploadChunkTable.uploadId, uploadId),
            eq(uploadChunkTable.userId, user.id),
          ))
          .orderBy(asc(uploadChunkTable.chunkIdx))
      : [];

    if (chunksFromDb.length !== expectedFromDb) {
      throw createHttpError(
        `Expected ${expectedFromDb} staged chunks but found ${chunksFromDb.length}.`,
        400,
      );
    }
    for (let i = 0; i < chunksFromDb.length; i++) {
      if (chunksFromDb[i].chunkIdx !== i + 1) {
        throw createHttpError(`Missing chunk at index ${i + 1}.`, 400);
      }
    }

    const buffers = [
      Buffer.from(await firstChunk.arrayBuffer()),
      ...chunksFromDb.map(c => c.data),
    ];
    const totalSize = buffers.reduce((acc, b) => acc + b.length, 0);
    if (totalSize > MAX_TOTAL_BYTES) {
      throw createHttpError(
        `File too large (${totalSize} bytes). Max ${MAX_TOTAL_BYTES} bytes.`,
        413,
      );
    }
    const contentBase64 = Buffer.concat(buffers).toString("base64");

    const schemaCommitTemplates = schema?.commit?.templates;
    const schemaCommitIdentity = schema?.commit?.identity;
    const commitIdentity = resolveCommitIdentity({
      configObject: config.object,
      identityOverride: schemaCommitIdentity,
    });
    const committer = (commitIdentity === "user" && user.email)
      ? { name: user.name?.trim() || user.email, email: user.email }
      : undefined;

    const response = await githubSaveFile(
      token,
      owner,
      repo,
      branch,
      normalizedPath,
      contentBase64,
      sha,
      {
        configObject: config.object,
        templatesOverride: schemaCommitTemplates,
        contentName: name,
        user: user.email || user.name || String(user.id || ""),
        onConflict,
        committer,
      }
    );

    const savedPath = response?.data.content?.path;

    if (response?.data.content && response?.data.commit) {
      await updateFileCache(
        'media',
        owner,
        repo,
        branch,
        {
          type: sha ? 'modify' : 'add',
          path: response.data.content.path!,
          sha: response.data.content.sha!,
          content: Buffer.from(contentBase64, 'base64').toString('utf-8'),
          size: response.data.content.size,
          downloadUrl: response.data.content.download_url,
          commit: {
            sha: response.data.commit.sha!,
            timestamp: new Date(response.data.commit.committer?.date ?? new Date().toISOString()).getTime()
          }
        }
      );
    }

    after(async () => {
      try {
        await db.delete(uploadChunkTable).where(or(
          and(
            eq(uploadChunkTable.uploadId, uploadId),
            eq(uploadChunkTable.userId, user.id),
          ),
          lt(uploadChunkTable.createdAt, new Date(Date.now() - STALE_CHUNK_AGE_MS)),
        ));
      } catch (error) {
        console.error("Chunk cleanup after finalize failed", error);
      }
    });

    return Response.json({
      status: "success",
      message: savedPath !== normalizedPath
        ? `File "${normalizedPath}" saved successfully but renamed to "${savedPath}" to avoid naming conflict.`
        : `File "${normalizedPath}" saved successfully.`,
      data: {
        type: response?.data.content?.type,
        sha: response?.data.content?.sha,
        name: response?.data.content?.name,
        path: savedPath,
        extension: getFileExtension(response?.data.content?.name || ""),
        size: response?.data.content?.size,
        url: response?.data.content?.download_url,
      }
    });
  } catch (error: any) {
    if (!error?.status || error.status >= 500) console.error(error);
    return toErrorResponse(error);
  }
}

const normalizeMediaPath = (
  rawPath: string,
  owner: string,
  repo: string,
  branch: string,
) => {
  const decodedPath = decodeURIComponent(rawPath || "");

  // Handle markdown-link wrappers: [label](target)
  const markdownMatch = decodedPath.match(/^\[.*?\]\((.+)\)$/);
  const markdownLooseMatch = decodedPath.match(/^\[.*?\]\((.+)$/);
  const candidate = (
    markdownMatch?.[1]
    || markdownLooseMatch?.[1]?.replace(/\)$/, "")
    || decodedPath
  ).trim();

  // If caller accidentally passes a raw.githubusercontent URL, map it back to repo-relative path.
  let repoRelativePath = candidate;
  if (candidate.startsWith("https://raw.githubusercontent.com/")) {
    try {
      const url = new URL(candidate);
      const pathname = decodeURIComponent(url.pathname || "");
      const branchPrefix = `/${owner}/${repo}/${branch}/`;
      if (pathname.startsWith(branchPrefix)) {
        repoRelativePath = pathname.slice(branchPrefix.length);
      }
    } catch {
      repoRelativePath = candidate;
    }
  }

  repoRelativePath = repoRelativePath.split("#")[0]?.split("?")[0] || repoRelativePath;

  return normalizePath(repoRelativePath);
};
