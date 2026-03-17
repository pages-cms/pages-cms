/**
 * Collaborator routes for edge runtimes.
 * Ports app/api/collaborators/[...slug]/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getUserToken } from "#edge/lib/token.ts";
import { queryAll } from "#edge/lib/db/client.ts";
import { getInstallations, getInstallationRepos } from "#edge/lib/github-app.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * GET /api/collaborators/:owner/:repo — Fetch collaborators for a repository
 */
export const handleGetCollaborators: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const token = await getUserToken(user.id);

    const owner = params.owner as string;
    const repo = params.repo as string;

    if (!owner || !repo) {
      throw new Error("Invalid slug: owner and repo are mandatory");
    }

    const installations = await getInstallations(token, [owner]);
    if (installations.length !== 1) {
      throw new Error(
        `"${owner}" is not part of your GitHub App installations`,
      );
    }

    const installationId = (installations[0] as Record<string, unknown>)
      .id as number;
    const installationRepos = await getInstallationRepos(
      token,
      installationId,
      [repo],
    );
    if (installationRepos.length !== 1) {
      throw new Error(
        `"${owner}/${repo}" is not part of your GitHub App installations`,
      );
    }

    const installRepo = installationRepos[0] as Record<string, unknown>;
    const ownerId = (installRepo.owner as Record<string, unknown>)?.id;
    const repoId = installRepo.id;

    const collaborators = await queryAll(
      `SELECT * FROM collaborator WHERE owner_id = ? AND repo_id = ?`,
      [ownerId as number, repoId as number],
    );

    return Response.json({
      status: "success",
      data: collaborators,
    });
  } catch (error: unknown) {
    console.error(error);
    return Response.json({
      status: "error",
      message: (error as Error).message,
    });
  }
};
