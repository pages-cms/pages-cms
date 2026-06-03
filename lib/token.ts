/**
 * Token helper functions.
 */

import { cache } from "react";
import { App } from "@octokit/app";
import { decrypt, encrypt } from "@/lib/crypto";
import { createOctokitInstance } from "@/lib/utils/octokit";
import { db } from "@/db";
import {
  githubInstallationTokenTable
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { User } from "@/types/user";
import { auth } from "@/lib/auth";
import { getGithubAccount } from "@/lib/github-account";
import { createHttpError } from "@/lib/api-error";
import { collaboratorMatchesUserForRepo } from "@/lib/collaborator-access";

const installationTokenRefreshInFlight = new Map<number, Promise<string>>();
const userTokenRefreshInFlight = new Map<string, Promise<string | null>>();

// Return a usable GitHub user access token, refreshing it via Better Auth when
// the stored token is at/near expiry. GitHub App user tokens expire after 8
// hours; without this the stored token simply dies and the user (including repo
// owners) gets a misleading "no permission" error. Better Auth's getAccessToken
// performs the refresh-token exchange and persists the rotated tokens. We
// deduplicate concurrent refreshes per user because GitHub invalidates the old
// refresh token the moment a new one is issued, so racing refreshes would
// clobber each other's tokens.
const getUserAccessToken = async (userId: string): Promise<string | null> => {
  const githubAccount = await getGithubAccount(userId);
  if (!githubAccount?.accessToken) return null;

  // No recorded expiry means non-expiring tokens (expiring user tokens disabled
  // on the GitHub App); use the stored token as-is.
  if (!githubAccount.accessTokenExpiresAt) return githubAccount.accessToken;

  const inFlight = userTokenRefreshInFlight.get(userId);
  if (inFlight) return inFlight;

  const refreshJob = (async () => {
    try {
      const { accessToken } = await auth.api.getAccessToken({
        body: { providerId: "github", userId },
      });
      return accessToken ?? githubAccount.accessToken;
    } catch (error) {
      // Refresh failed (e.g. the refresh token was revoked). Fall back to the
      // stored token so the caller surfaces a real auth error rather than
      // masking it as a transient failure.
      console.warn("[token] github user token refresh failed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return githubAccount.accessToken;
    }
  })();

  userTokenRefreshInFlight.set(userId, refreshJob);
  try {
    return await refreshJob;
  } finally {
    userTokenRefreshInFlight.delete(userId);
  }
};

// Get a token for a user (including collagborators who need to provide an owner/repo scope).
const getToken = cache(async (
  user: User,
  owner: string,
  repo: string,
  verifyGithubAccess: boolean = false,
) => {
  const userAccessToken = await getUserAccessToken(user.id);
  if (userAccessToken) {
    const hasGithubAccess = await canAccessRepoWithToken(userAccessToken, owner, repo);
    if (hasGithubAccess) return {
      token: userAccessToken,
      source: "user" as const,
    };

    if (verifyGithubAccess) {
      throw createHttpError(
        `You do not have permission to access "${owner}/${repo}".`,
        403,
      );
    }
  }

  const permission = await db.query.collaboratorTable.findFirst({
    where: collaboratorMatchesUserForRepo(user, owner, repo),
  });
  if (!permission) {
    throw createHttpError(
      `You do not have permission to access "${owner}/${repo}".`,
      403,
    );
  }

  const installationToken = await getInstallationToken(owner, repo);

  return {
    token: installationToken,
    source: "installation" as const,
  };
});

// Get the GitHub App installation token for a specific repository.
const getInstallationToken = cache(async (owner: string, repo: string) => {
  const app = new App({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!,
  });

  const repoInstallation = await app.octokit.request(
    "GET /repos/{owner}/{repo}/installation",
    { owner, repo },
  );
  if (!repoInstallation) throw new Error(`Installation token not found for "${owner}/${repo}".`);

  const installationId = repoInstallation.data.id;
  const tokenData = await db.query.githubInstallationTokenTable.findFirst({
    where: eq(githubInstallationTokenTable.installationId, installationId)
  });

  if (tokenData && Date.now() < tokenData.expiresAt.getTime() - 60_000) {
    const token = await decrypt(tokenData.ciphertext, tokenData.iv);
    if (!token) throw new Error(`Token could not be retrieved and/or decrypted.`);
    return token;
  }

  const existingRefresh = installationTokenRefreshInFlight.get(installationId);
  if (existingRefresh) {
    return existingRefresh;
  }

  const refreshJob = (async () => {
    const installationToken = await app.octokit.request(
      "POST /app/installations/{installation_id}/access_tokens",
      {
        installation_id: installationId,
      },
    );

    const { ciphertext, iv } = await encrypt(installationToken.data.token);
    const expiresAt = new Date(installationToken.data.expires_at);

    if (tokenData) {
      await db.update(githubInstallationTokenTable).set({
        ciphertext,
        iv,
        expiresAt
      }).where(
        eq(githubInstallationTokenTable.id, tokenData.id)
      );
    } else {
      await db.insert(githubInstallationTokenTable).values({
        ciphertext,
        iv,
        installationId,
        expiresAt
      }).onConflictDoUpdate({
        target: githubInstallationTokenTable.installationId,
        set: {
          ciphertext,
          iv,
          expiresAt,
        },
      });
    }

    return installationToken.data.token;
  })();

  installationTokenRefreshInFlight.set(installationId, refreshJob);
  try {
    return await refreshJob;
  } finally {
    installationTokenRefreshInFlight.delete(installationId);
  }
});

// Get the GitHub user token.
const getUserToken = cache(async (userId: string) => {
  const accessToken = await getUserAccessToken(userId);
  if (!accessToken) throw new Error(`GitHub token not found for user ${userId}.`);

  return accessToken;
});

const canAccessRepoWithToken = async (
  token: string,
  owner: string,
  repo: string,
) => {
  try {
    const octokit = createOctokitInstance(token);
    await octokit.rest.repos.get({ owner, repo });
    return true;
  } catch {
    return false;
  }
};

export { getInstallationToken, getUserToken, getToken };
