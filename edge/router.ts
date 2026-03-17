/**
 * Declarative HTTP router with pattern matching and typed route params.
 * Adapted from the tickets project's router.ts for pages-cms edge routes.
 */

/** Route parameters extracted from URL patterns */
export type RouteParams = Record<string, string | number | undefined>;

/** Route handler function */
export type RouteHandler = (
  request: Request,
  params: RouteParams,
) => Response | Promise<Response>;

/** Compiled route with regex */
type CompiledRoute = {
  regex: RegExp;
  paramNames: string[];
  handler: RouteHandler;
};

/**
 * Compile a route pattern into a regex.
 * Supports :param syntax for path parameters.
 * Supports * for catch-all segments (e.g. /api/collaborators/*slug)
 *
 * Examples:
 *   "GET /api/repos/:owner" -> matches /api/repos/foo
 *   "GET /api/:owner/:repo/:branch/entries/:path" -> extracts all params
 *   "GET /api/collaborators/*slug" -> catch-all
 */
const compilePattern = (
  pattern: string,
): { regex: RegExp; paramNames: string[] } => {
  const paramNames: string[] = [];

  let regexStr = pattern
    // Escape special regex chars except : and *
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    // Handle catch-all params (*slug)
    .replace(/\*(\w+)/g, (_, name) => {
      paramNames.push(name);
      return "(.+)";
    })
    // Handle named params (:param)
    .replace(/:(\w+)/g, (_, name) => {
      paramNames.push(name);
      return "([^/]+)";
    });

  return {
    regex: new RegExp(`^${regexStr}$`),
    paramNames,
  };
};

/** Parse "METHOD /path" into method and path */
const parseRoutePattern = (
  pattern: string,
): { method: string; path: string } => {
  const spaceIndex = pattern.indexOf(" ");
  return {
    method: pattern.slice(0, spaceIndex),
    path: pattern.slice(spaceIndex + 1),
  };
};

/** Compile all routes grouped by method */
const compileRoutes = (
  routes: Record<string, RouteHandler>,
): Map<string, CompiledRoute[]> => {
  const compiled = new Map<string, CompiledRoute[]>();

  for (const [pattern, handler] of Object.entries(routes)) {
    const { method, path } = parseRoutePattern(pattern);
    const { regex, paramNames } = compilePattern(path);
    const methodRoutes = compiled.get(method) ?? [];
    methodRoutes.push({ regex, paramNames, handler });
    compiled.set(method, methodRoutes);
  }

  return compiled;
};

/** Try to match a request against compiled routes */
const matchRequest = (
  compiledRoutes: Map<string, CompiledRoute[]>,
  method: string,
  path: string,
): { handler: RouteHandler; params: RouteParams } | null => {
  const methodRoutes = compiledRoutes.get(method);
  if (!methodRoutes) return null;

  for (const route of methodRoutes) {
    const match = path.match(route.regex);
    if (match) {
      const params: RouteParams = {};
      for (let i = 0; i < route.paramNames.length; i++) {
        const name = route.paramNames[i];
        if (name !== undefined) {
          params[name] = match[i + 1];
        }
      }
      return { handler: route.handler, params };
    }
  }

  return null;
};

/**
 * Create a router from route definitions.
 * Returns an async function that matches requests and dispatches to handlers.
 */
export const createRouter = (
  routes: Record<string, RouteHandler>,
): ((
  request: Request,
  path: string,
  method: string,
) => Promise<Response | null>) => {
  const compiled = compileRoutes(routes);

  return async (request, path, method) => {
    const match = matchRequest(compiled, method, path);
    if (!match) return null;
    return Promise.resolve(match.handler(request, match.params));
  };
};
