import { createOctokitInstance } from "@/lib/utils/octokit";
import { getConfig } from "@/lib/utils/config";
import { getFileExtension, normalizePath } from "@/lib/utils/file";
import { getAuth } from "@/lib/auth";
import { getToken } from "@/lib/token";
import { getMediaCache, checkRepoAccess } from "@/lib/githubCache";

// Add docs

/**
 * Get the list of media files in a directory.
 *
 * GET /api/[owner]/[repo]/[branch]/media/[path]
 * 
 * Requires authentication.
 */

export async function GET(
  request: Request,
  { params }: { params: { owner: string, repo: string, branch: string, name: string, path: string } }
) {
  try {
    const { owner, repo, branch, name, path } = await params;

    const { user, session } = await getAuth();
    if (!session) return new Response(null, { status: 401 });

    const token = await getToken(user, owner, repo);
    if (!token) throw new Error("Token not found");

    if (user.githubId) {
      const hasAccess = await checkRepoAccess(token, owner, repo, user.githubId);
      if (!hasAccess) throw new Error(`No access to repository ${owner}/${repo}.`);
    }

    const config = await getConfig(owner, repo, branch);
    if (!config) throw new Error(`Configuration not found for ${owner}/${repo}/${branch}.`);   
    
    const mediaConfig = config.object.media.find((item: any) => item.name === name) || config.object.media[0];

    if (!mediaConfig) {
      if (name) throw new Error(`No media configuration named "${name}" found for ${owner}/${repo}/${branch}.`);
      throw new Error(`No media configuration found for ${owner}/${repo}/${branch}.`);
    }

    const normalizedPath = normalizePath(path);
    if (!normalizedPath.startsWith(mediaConfig.input)) throw new Error(`Invalid path "${path}" for media "${name}".`);

    const { searchParams } = new URL(request.url);
    const nocache = searchParams.get('nocache');

    let results = await getMediaCache(owner, repo, branch, normalizedPath, token, !!nocache);

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
    // TODO: better handling of GitHub errors
    return Response.json({
      status: "error",
      message: error.status === 404 ? "Not found" : error.message,
    });
  }
}