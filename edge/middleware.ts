/**
 * Edge middleware: CSRF protection and security headers.
 * Replaces Next.js middleware.ts with standalone request/response processing.
 */

/** CSRF protection — verify Origin header matches Host */
export const verifyCsrf = (request: Request): Response | null => {
  if (request.method === "GET" || request.method === "HEAD") return null;

  const url = new URL(request.url);
  const path = url.pathname;

  // Exempt webhook endpoints from CSRF
  if (path.startsWith("/api/webhook/")) return null;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return new Response(null, { status: 403 });
  }

  // Verify origin matches host
  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) {
      return new Response(null, { status: 403 });
    }
  } catch {
    return new Response(null, { status: 403 });
  }

  return null;
};

/** Apply security headers to a response */
export const applySecurityHeaders = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/** CORS headers for API responses */
export const applyCorsHeaders = (
  response: Response,
  request: Request,
): Response => {
  const origin = request.headers.get("origin");
  if (!origin) return response;

  const headers = new Headers(response.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("access-control-allow-headers", "Content-Type, Authorization");
  headers.set("access-control-allow-credentials", "true");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
