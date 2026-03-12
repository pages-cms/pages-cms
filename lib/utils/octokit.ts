/**
 * Create an Octokit instance that wraps the requests with a check for credentials
 * to log out the user if they revoked/lost access.
 */

import { Octokit } from "octokit";

export const createOctokitInstance = (token: string, options?: any) => {
  if (!token) throw new Error("Auth token is required to initialize Octokit");

  return new Octokit({
    ...options,
    auth: token,
    request: {
      fetch: async (url: string, options: RequestInit) => {
        try {
          const response = await fetch(url, options);
          
          // Avoid invoking request-scoped auth actions from inside Octokit fetches.
          // In Workers that can cross request boundaries and trigger I/O errors.
          if (response.status === 401) {
            try {
              const data = await response.clone().json();
              if (data.message === "Bad credentials") {
                throw new Error("GitHub credentials are no longer valid. Please sign in again.");
              }
            } catch (parseError) {
              if (parseError instanceof Error && parseError.message === "GitHub credentials are no longer valid. Please sign in again.") {
                throw parseError;
              }
            }
          }
          
          // Always return the original response regardless of status
          return response;
        } catch (error) {
          throw error;
        }
      }
    }
  });
};
