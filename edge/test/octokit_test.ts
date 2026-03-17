/**
 * Tests for edge/lib/octokit.ts — lightweight GitHub API client
 */

import {
  assertEquals,
  assertRejects,
} from "@std/assert";
import { GitHubClient, GitHubApiError } from "#edge/lib/octokit.ts";

// --- GitHubApiError ---

Deno.test("GitHubApiError - stores status and body", () => {
  const error = new GitHubApiError("Not Found", 404, '{"message": "Not Found"}');
  assertEquals(error.message, "Not Found");
  assertEquals(error.status, 404);
  assertEquals(error.body, '{"message": "Not Found"}');
  assertEquals(error instanceof Error, true);
});

// --- GitHubClient construction ---

Deno.test("GitHubClient - stores token", () => {
  const client = new GitHubClient("test-token");
  // The client exists - we can't directly access the private token
  // but we can verify the object was created
  assertEquals(client instanceof GitHubClient, true);
});

// --- URL building (via mock fetch) ---

Deno.test("GitHubClient - builds correct getContent URL", async () => {
  let capturedUrl = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
    capturedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    return Promise.resolve(new Response(JSON.stringify({ type: "file" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
  };

  try {
    const client = new GitHubClient("test-token");
    await client.getContent("owner", "repo", "path/to/file", "main");

    assertEquals(capturedUrl.includes("/repos/owner/repo/contents/"), true);
    assertEquals(capturedUrl.includes("ref=main"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("GitHubClient - builds correct search URL", async () => {
  let capturedUrl = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (input: string | URL | Request, _init?: RequestInit) => {
    capturedUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    return Promise.resolve(new Response(JSON.stringify({ items: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
  };

  try {
    const client = new GitHubClient("test-token");
    await client.searchRepos("test query", "updated", "desc", 10);

    assertEquals(capturedUrl.includes("/search/repositories"), true);
    assertEquals(capturedUrl.includes("per_page=10"), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("GitHubClient - throws GitHubApiError on non-ok response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () =>
    Promise.resolve(new Response('{"message": "Not Found"}', {
      status: 404,
      statusText: "Not Found",
    }));

  try {
    const client = new GitHubClient("test-token");
    await assertRejects(
      () => client.getUser(),
      GitHubApiError,
      "GitHub API error: 404",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("GitHubClient - sends correct auth headers", async () => {
  let capturedHeaders: Record<string, string> = {};

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_input: string | URL | Request, init?: RequestInit) => {
    const headers = init?.headers as Record<string, string>;
    capturedHeaders = headers;
    return Promise.resolve(new Response(JSON.stringify({}), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
  };

  try {
    const client = new GitHubClient("my-secret-token");
    await client.getUser();

    assertEquals(capturedHeaders["Authorization"], "Bearer my-secret-token");
    assertEquals(capturedHeaders["Accept"], "application/vnd.github+json");
    assertEquals(capturedHeaders["User-Agent"], "pages-cms-edge");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("GitHubClient - sends body for POST requests", async () => {
  let capturedBody = "";
  let capturedMethod = "";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_input: string | URL | Request, init?: RequestInit) => {
    capturedMethod = init?.method ?? "GET";
    capturedBody = init?.body as string ?? "";
    return Promise.resolve(new Response(JSON.stringify({}), {
      status: 200,
      headers: { "content-type": "application/json" },
    }));
  };

  try {
    const client = new GitHubClient("test-token");
    await client.createRef("owner", "repo", "refs/heads/new-branch", "abc123");

    assertEquals(capturedMethod, "POST");
    const body = JSON.parse(capturedBody);
    assertEquals(body.ref, "refs/heads/new-branch");
    assertEquals(body.sha, "abc123");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
