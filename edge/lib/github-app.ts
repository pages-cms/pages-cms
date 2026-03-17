/**
 * GitHub App helpers for edge runtimes.
 * Replaces lib/githubApp.ts, using the lightweight GitHubClient.
 */

import { createGitHubClient } from "#edge/lib/octokit.ts";

/** Get all GitHub App installations for the authenticated user */
export const getInstallations = async (
  token: string,
  owners?: string[],
): Promise<unknown[]> => {
  const client = createGitHubClient(token);
  const installations: unknown[] = [];
  const matchedInstallations: unknown[] = [];

  let page = 1;
  let hasMore = true;
  const perPage = 100;

  while (hasMore) {
    const response = await client.listInstallationsForUser(page, perPage);
    if (response.installations.length === 0) break;

    installations.push(...response.installations);

    if (owners) {
      const lowercaseOwners = owners.map((o) => o.toLowerCase());
      for (const installation of response.installations as Record<string, any>[]) {
        const login = installation.account?.login?.toLowerCase();
        if (
          login &&
          lowercaseOwners.includes(login) &&
          !matchedInstallations.find(
            (m: any) => m.id === installation.id,
          )
        ) {
          matchedInstallations.push(installation);
        }
      }

      if (matchedInstallations.length === owners.length) {
        return matchedInstallations;
      }
    }

    hasMore = page * perPage <= response.total_count;
    page++;
  }

  return matchedInstallations.length ? matchedInstallations : installations;
};

/** Get all repositories for a GitHub App installation */
export const getInstallationRepos = async (
  token: string,
  installationId: number,
  repos?: string[],
): Promise<unknown[]> => {
  const client = createGitHubClient(token);
  const allRepos: unknown[] = [];
  const matchedRepos: unknown[] = [];

  let page = 1;
  let hasMore = true;
  const perPage = 100;

  while (hasMore) {
    const response = await client.listInstallationReposForUser(
      installationId,
      page,
      perPage,
    );
    if (response.repositories.length === 0) break;

    allRepos.push(...response.repositories);

    if (repos) {
      const lowercaseRepos = repos.map((r) => r.toLowerCase());
      for (const repo of response.repositories as Record<string, any>[]) {
        const name = repo.name?.toLowerCase();
        if (
          name &&
          lowercaseRepos.includes(name) &&
          !matchedRepos.find((m: any) => m.id === repo.id)
        ) {
          matchedRepos.push(repo);
        }
      }

      if (matchedRepos.length === repos.length) {
        return matchedRepos;
      }
    }

    hasMore = page * perPage <= response.total_count;
    page++;
  }

  return matchedRepos.length ? matchedRepos : allRepos;
};
