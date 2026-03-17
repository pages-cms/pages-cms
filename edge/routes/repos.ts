/**
 * Repository listing routes for edge runtimes.
 * Ports app/api/repos/[owner]/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getUserToken } from "#edge/lib/token.ts";
import { queryAll } from "#edge/lib/db/client.ts";
import { createGitHubClient } from "#edge/lib/octokit.ts";
import { getInstallations, getInstallationRepos } from "#edge/lib/github-app.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * GET /api/repos/:owner — Fetch repositories for a user
 */
export const handleGetRepos: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const owner = params.owner as string;
    const url = new URL(request.url);
    const type = url.searchParams.get("type");
    let repos: Record<string, unknown>[] = [];

    if (user.githubId) {
      const token = await getUserToken(user.id);
      const repositorySelection = url.searchParams.get("repository_selection");

      if (repositorySelection === "selected") {
        const installations = await getInstallations(token, [owner]);
        if (installations.length !== 1) {
          throw new Error(
            `"${owner}" is not part of your GitHub App installations`,
          );
        }
        const installationId = (installations[0] as Record<string, unknown>).id as number;
        const installRepos = await getInstallationRepos(token, installationId);
        repos = (installRepos as Record<string, unknown>[])
          .filter((r) => (r.permissions as Record<string, boolean>)?.push)
          .map((r) => ({
            owner: (r.owner as Record<string, unknown>)?.login,
            repo: r.name,
            private: r.private,
            defaultBranch: r.default_branch,
            updatedAt: r.updated_at,
          }));
      } else {
        const keyword = url.searchParams.get("keyword");
        const client = createGitHubClient(token);
        const query = `${keyword} in:name ${type}:${owner} fork:true`;
        const result = await client.searchRepos(query);
        repos = result.items
          .filter((r: any) => r.permissions?.push)
          .map((r: any) => ({
            owner: r.owner?.login,
            repo: r.name,
            private: r.private,
            defaultBranch: r.default_branch,
            updatedAt: r.updated_at,
          }));
      }
    } else {
      repos = await queryAll(
        `SELECT * FROM collaborator WHERE email = ? AND owner = ?`,
        [user.email!, owner],
      );
    }

    return Response.json({ status: "success", data: repos });
  } catch (error: unknown) {
    console.error(error);
    return Response.json({
      status: "error",
      message: (error as Error).message,
    });
  }
};
