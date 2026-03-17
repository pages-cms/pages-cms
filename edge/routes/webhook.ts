/**
 * GitHub webhook handler for edge runtimes.
 * Ports app/api/webhook/github/route.ts
 */

import { execute, queryAll } from "#edge/lib/db/client.ts";
import {
  updateMultipleFilesCache,
  clearFileCache,
  updateFileCacheRepository,
  updateFileCacheOwner,
} from "#edge/lib/github-cache.ts";
import { getInstallationToken } from "#edge/lib/token.ts";
import { requireEnv } from "#edge/lib/env.ts";
import { normalizePath } from "#edge/lib/file-utils.ts";
import type { RouteHandler } from "#edge/router.ts";

/** HMAC-SHA256 signature verification using Web Crypto API */
const verifySignature = async (
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(body),
  );

  const digest = `sha256=${Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")}`;

  return signature === digest;
};

/**
 * POST /api/webhook/github — Handle GitHub App webhooks
 */
export const handleWebhook: RouteHandler = async (request) => {
  try {
    const signature = request.headers.get("X-Hub-Signature-256");
    if (!signature) return Response.json(null, { status: 400 });

    const body = await request.text();
    const secret = requireEnv("GITHUB_APP_WEBHOOK_SECRET");

    const valid = await verifySignature(body, signature, secret);
    if (!valid) return Response.json(null, { status: 401 });

    const data = JSON.parse(body);
    const event = request.headers.get("X-GitHub-Event");

    try {
      switch (event) {
        case "installation":
          if (data.action === "deleted") {
            const accountLogin = data.installation?.account?.login;
            if (!accountLogin) break;

            await Promise.all([
              execute(
                `DELETE FROM collaborator WHERE installation_id = ?`,
                [data.installation.id],
              ),
              execute(
                `DELETE FROM github_installation_token WHERE installation_id = ?`,
                [data.installation.id],
              ),
              clearFileCache(accountLogin),
            ]);
          }
          break;

        case "installation_repositories":
          if (data.action === "removed") {
            const reposRemoved = data.repositories_removed ?? [];
            const repoIds = reposRemoved.map((r: { id: number }) => r.id);
            if (repoIds.length === 0) break;

            // Delete collaborators for removed repos
            for (const repoId of repoIds) {
              await execute(
                `DELETE FROM collaborator WHERE repo_id = ?`,
                [repoId],
              );
            }

            // Clear file cache
            await Promise.all(
              reposRemoved.map((repo: { full_name: string }) => {
                const [owner, repoName] = (repo.full_name || "").split("/");
                if (owner && repoName) return clearFileCache(owner, repoName);
                return Promise.resolve();
              }),
            );
          }
          break;

        case "repository": {
          const owner = data.repository?.owner?.login;
          const repoName = data.repository?.name;
          const repoId = data.repository?.id;
          if (!owner || !repoName || !repoId) break;

          if (data.action === "deleted") {
            await Promise.all([
              execute(`DELETE FROM collaborator WHERE repo_id = ?`, [repoId]),
              clearFileCache(owner, repoName),
            ]);
          } else if (data.action === "transferred") {
            const oldOwner = data.changes?.owner?.from?.login || owner;
            await Promise.all([
              execute(`DELETE FROM collaborator WHERE repo_id = ?`, [repoId]),
              clearFileCache(oldOwner, repoName),
            ]);
          } else if (data.action === "renamed") {
            const oldName = data.changes?.repository?.name?.from;
            if (!oldName) break;
            await Promise.all([
              execute(
                `UPDATE collaborator SET repo = ? WHERE repo_id = ?`,
                [repoName, repoId],
              ),
              updateFileCacheRepository(owner, oldName, repoName),
            ]);
          }
          break;
        }

        case "installation_target":
          if (data.action === "renamed") {
            const oldOwner = data.changes?.login?.from;
            const newOwner = data.account?.login;
            const accountId = data.account?.id;
            if (!oldOwner || !newOwner || !accountId) break;

            await Promise.all([
              execute(
                `UPDATE collaborator SET owner = ? WHERE owner_id = ?`,
                [newOwner, accountId],
              ),
              updateFileCacheOwner(oldOwner, newOwner),
            ]);
          }
          break;

        case "delete":
          if (data.ref_type === "branch") {
            const deleteOwner = data.repository?.owner?.login;
            const deleteRepo = data.repository?.name;
            const deleteBranch = data.ref?.replace("refs/heads/", "");
            if (!deleteOwner || !deleteRepo || !deleteBranch) break;
            await clearFileCache(deleteOwner, deleteRepo, deleteBranch);
          }
          break;

        case "push": {
          if (data.deleted === true) break;

          const pushOwner = data.repository.owner.login;
          const pushRepo = data.repository.name;
          const pushBranch = data.ref.replace("refs/heads/", "");

          const removedFiles = data.commits.flatMap((commit: Record<string, unknown>) =>
            ((commit.removed as string[]) || []).map((path: string) => ({
              path: normalizePath(path),
            })),
          );

          const modifiedFiles = data.commits.flatMap((commit: Record<string, unknown>) =>
            ((commit.modified as string[]) || []).map((path: string) => ({
              path: normalizePath(path),
              sha: commit.id as string,
            })),
          );

          const addedFiles = data.commits.flatMap((commit: Record<string, unknown>) =>
            ((commit.added as string[]) || []).map((path: string) => ({
              path: normalizePath(path),
              sha: commit.id as string,
            })),
          );

          const installationToken = await getInstallationToken(
            pushOwner,
            pushRepo,
          );

          const commit = {
            sha: data.head_commit.id,
            timestamp: new Date(data.head_commit.timestamp).getTime(),
          };

          await updateMultipleFilesCache(
            pushOwner,
            pushRepo,
            pushBranch,
            removedFiles,
            modifiedFiles,
            addedFiles,
            installationToken,
            commit,
          );
          break;
        }
      }
    } catch (error) {
      console.error("Error in Webhook", { error, event, action: data?.action });
    }

    return Response.json(null, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return Response.json(null, { status: 500 });
  }
};
