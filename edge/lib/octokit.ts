/**
 * Lightweight GitHub API client for edge runtimes.
 * Replaces the Octokit dependency with direct fetch calls.
 * This avoids the heavy octokit bundle in the edge script.
 */

const GITHUB_API = "https://api.github.com";
const USER_AGENT = "pages-cms-edge";

interface GitHubRequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export class GitHubClient {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async request<T = unknown>(
    path: string,
    options: GitHubRequestOptions = {},
  ): Promise<T> {
    const url = path.startsWith("http") ? path : `${GITHUB_API}${path}`;
    const method = options.method ?? "GET";

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": USER_AGENT,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const error = new GitHubApiError(
        `GitHub API error: ${response.status} ${response.statusText}`,
        response.status,
        errorBody,
      );
      throw error;
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  // --- Repos ---

  async getContent(
    owner: string,
    repo: string,
    path: string,
    ref?: string,
  ): Promise<GitHubFileContent | GitHubDirContent[]> {
    const params = ref ? `?ref=${encodeURIComponent(ref)}` : "";
    return this.request(
      `/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}${params}`,
    );
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    content: string,
    branch: string,
    sha?: string,
  ): Promise<GitHubFileCommitResponse> {
    return this.request(`/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      body: { message, content, branch, sha: sha || undefined },
    });
  }

  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch: string,
  ): Promise<GitHubFileCommitResponse> {
    return this.request(`/repos/${owner}/${repo}/contents/${path}`, {
      method: "DELETE",
      body: { message, sha, branch },
    });
  }

  async listCommits(
    owner: string,
    repo: string,
    path: string,
    sha?: string,
  ): Promise<unknown[]> {
    const params = new URLSearchParams();
    if (path) params.set("path", path);
    if (sha) params.set("sha", sha);
    return this.request(
      `/repos/${owner}/${repo}/commits?${params}`,
    );
  }

  // --- Git Data ---

  async getRef(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<{ object: { sha: string } }> {
    return this.request(`/repos/${owner}/${repo}/git/ref/${ref}`);
  }

  async createRef(
    owner: string,
    repo: string,
    ref: string,
    sha: string,
  ): Promise<unknown> {
    return this.request(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: { ref, sha },
    });
  }

  async getTree(
    owner: string,
    repo: string,
    treeSha: string,
    recursive = false,
  ): Promise<{
    sha: string;
    tree: Array<{
      path: string;
      mode: string;
      type: string;
      sha: string;
      size?: number;
    }>;
  }> {
    const params = recursive ? "?recursive=true" : "";
    return this.request(
      `/repos/${owner}/${repo}/git/trees/${treeSha}${params}`,
    );
  }

  async createTree(
    owner: string,
    repo: string,
    tree: Array<{ path: string; mode: string; type: string; sha: string | null }>,
  ): Promise<{ sha: string }> {
    return this.request(`/repos/${owner}/${repo}/git/trees`, {
      method: "POST",
      body: { tree },
    });
  }

  async createCommit(
    owner: string,
    repo: string,
    message: string,
    tree: string,
    parents: string[],
  ): Promise<{ sha: string }> {
    return this.request(`/repos/${owner}/${repo}/git/commits`, {
      method: "POST",
      body: { message, tree, parents },
    });
  }

  async updateRef(
    owner: string,
    repo: string,
    ref: string,
    sha: string,
  ): Promise<unknown> {
    return this.request(`/repos/${owner}/${repo}/git/refs/${ref}`, {
      method: "PATCH",
      body: { sha },
    });
  }

  // --- Search ---

  async searchRepos(
    query: string,
    sort = "updated",
    order = "desc",
    perPage = 5,
  ): Promise<{ items: unknown[] }> {
    const params = new URLSearchParams({
      q: query,
      sort,
      order,
      per_page: String(perPage),
    });
    return this.request(`/search/repositories?${params}`);
  }

  // --- Apps ---

  async listInstallationsForUser(
    page = 1,
    perPage = 100,
  ): Promise<{ total_count: number; installations: unknown[] }> {
    return this.request(
      `/user/installations?page=${page}&per_page=${perPage}`,
    );
  }

  async listInstallationReposForUser(
    installationId: number,
    page = 1,
    perPage = 100,
  ): Promise<{ total_count: number; repositories: unknown[] }> {
    return this.request(
      `/user/installations/${installationId}/repositories?page=${page}&per_page=${perPage}`,
    );
  }

  // --- User ---

  async getUser(): Promise<GitHubUser> {
    return this.request("/user");
  }

  // --- Permissions ---

  async checkRepoAccess(
    owner: string,
    repo: string,
  ): Promise<{ permission: string }> {
    return this.request(
      `/repos/${owner}/${repo}`,
    );
  }

  async getBranch(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<{ commit: { sha: string } }> {
    return this.request(
      `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    );
  }
}

export class GitHubApiError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface GitHubUser {
  id: number;
  login: string;
  email: string;
  name: string;
}

export interface GitHubFileContent {
  type: "file";
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
  encoding: string;
  download_url: string;
}

export interface GitHubDirContent {
  type: "file" | "dir" | "symlink" | "submodule";
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string | null;
}

export interface GitHubFileCommitResponse {
  content: {
    name: string;
    path: string;
    sha: string;
    size: number;
    type: string;
    download_url: string | null;
  } | null;
  commit: {
    sha: string;
    committer: { date: string } | null;
  };
}

/** Create a new GitHubClient instance */
export const createGitHubClient = (token: string): GitHubClient =>
  new GitHubClient(token);
