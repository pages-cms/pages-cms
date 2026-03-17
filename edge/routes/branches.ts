/**
 * Branch management routes for edge runtimes.
 * Ports app/api/[owner]/[repo]/[branch]/branches/route.ts
 */

import { getAuth } from "#edge/lib/auth.ts";
import { getToken } from "#edge/lib/token.ts";
import { createGitHubClient } from "#edge/lib/octokit.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * POST /api/:owner/:repo/:branch/branches — Create a new branch
 */
export const handleCreateBranch: RouteHandler = async (request, params) => {
  try {
    const { user, session } = await getAuth(request);
    if (!session) return new Response(null, { status: 401 });

    const { owner, repo, branch } = params as Record<string, string>;
    const token = await getToken(user, owner, repo);

    const data = await request.json();
    if (!data.name) throw new Error('"name" is required.');

    const client = createGitHubClient(token);

    // Get the SHA of the source branch
    const refData = await client.getRef(owner, repo, `heads/${branch}`);
    const sha = refData.object.sha;

    // Create the new branch
    const response = await client.createRef(
      owner,
      repo,
      `refs/heads/${data.name}`,
      sha,
    );

    return Response.json({
      status: "success",
      message: `Branch "${data.name}" created successfully from "${branch}".`,
      data: response,
    });
  } catch (error: unknown) {
    console.error(error);
    return Response.json({
      status: "error",
      message: (error as Error).message,
    });
  }
};
