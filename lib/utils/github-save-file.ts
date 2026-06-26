import { createOctokitInstance } from "@/lib/utils/octokit";
import { createHttpError } from "@/lib/api-error";
import { getParentPath } from "@/lib/utils/file";
import { buildCommitTokens, resolveCommitMessage } from "@/lib/commit-message";

type GithubSaveFileOptions = {
  configObject?: Record<string, any>;
  templatesOverride?: Record<string, string>;
  contentName?: string;
  user?: string;
  onConflict?: "rename" | "error";
  committer?: { name: string; email: string };
};

export const githubSaveFile = async (
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  contentBase64: string,
  sha?: string,
  options?: GithubSaveFileOptions,
) => {
  const octokit = createOctokitInstance(token, { retry: { doNotRetry: [409] } });

  const message = resolveCommitMessage({
    configObject: options?.configObject,
    templatesOverride: options?.templatesOverride,
    action: sha ? "update" : "create",
    tokens: buildCommitTokens({
      action: sha ? "update" : "create",
      owner,
      repo,
      branch,
      path,
      contentName: options?.contentName,
      user: options?.user,
      userName: options?.committer?.name,
      userEmail: options?.committer?.email,
    }),
  });

  try {
    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: contentBase64,
      branch,
      sha: sha || undefined,
      committer: options?.committer,
    });

    if (response.data.content && response.data.commit) {
      return response;
    }
    throw new Error("Invalid response structure");
  } catch (error: any) {
    const githubMessage = typeof error?.response?.data?.message === "string"
      ? error.response.data.message
      : undefined;

    if (error.status === 409) {
      if (githubMessage?.includes("Repository rule violations found")) {
        throw createHttpError(
          "This repository requires changes through a pull request. Save to a different branch or fork, or ask a maintainer to relax the repository rule for direct edits.",
          409,
        );
      }

      if (sha) {
        throw createHttpError(
          "File has changed since you last loaded it. Please refresh the page and try again.",
          409,
        );
      }
    }

    if (error.status === 422 && !sha) {
      if (options?.onConflict === "error") {
        throw createHttpError(`File \"${path}\" already exists.`, 409);
      }

      const parentDir = getParentPath(path);
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: parentDir || '.',
        ref: branch,
      });

      if (!Array.isArray(data)) {
        throw new Error('Expected directory listing');
      }

      const basename = path.split('/').pop() || "";
      const lastDotIndex = basename.lastIndexOf(".");
      const filename = lastDotIndex > 0 ? basename.slice(0, lastDotIndex) : basename;
      const extension = lastDotIndex > 0 ? basename.slice(lastDotIndex + 1) : "";
      const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const escapedFilename = escapeRegExp(filename);
      const escapedExtension = escapeRegExp(extension);
      const pattern = extension
        ? new RegExp(`^${escapedFilename}-(\\d+)\\.${escapedExtension}$`)
        : new RegExp(`^${escapedFilename}-(\\d+)$`);
      const maxNumber = Math.max(0, ...data
        .map(file => {
          const match = file.name.match(pattern);
          return match ? parseInt(match[1], 10) : 0;
        }));

      for (let i = 1; i <= 3; i++) {
        const candidateFilename = extension
          ? `${filename}-${maxNumber + i}.${extension}`
          : `${filename}-${maxNumber + i}`;
        const newPath = `${parentDir ? parentDir + '/' : ''}${candidateFilename}`;
        const fallbackMessage = resolveCommitMessage({
          configObject: options?.configObject,
          templatesOverride: options?.templatesOverride,
          action: "create",
          tokens: buildCommitTokens({
            action: "create",
            owner,
            repo,
            branch,
            path: newPath,
            contentName: options?.contentName,
            user: options?.user,
            userName: options?.committer?.name,
            userEmail: options?.committer?.email,
          }),
        });
        try {
          const response = await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: newPath,
            message: fallbackMessage,
            content: contentBase64,
            branch,
            committer: options?.committer,
          });

          if (response.data.content && response.data.commit) {
            return response;
          }
        } catch (error: any) {
          if (i === 3 || error.status !== 422) throw error;
        }
      }
    }
    throw error;
  }
};
