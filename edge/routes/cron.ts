/**
 * Cache cleanup cron route for edge runtimes.
 * Ports app/api/cron/route.ts
 */

import { execute } from "#edge/lib/db/client.ts";
import { getEnv } from "#edge/lib/env.ts";
import type { RouteHandler } from "#edge/router.ts";

/**
 * GET /api/cron — Clean up expired cache entries
 * Protected by CRON_SECRET bearer token.
 */
export const handleCron: RouteHandler = async (request) => {
  const authHeader = request.headers.get("authorization");
  const cronSecret = getEnv("CRON_SECRET");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    console.log("Cron job started: Cleaning up cache.");

    // Delete expired cache_file entries
    const fileCacheTTL =
      parseInt(getEnv("FILE_CACHE_TTL") ?? "10080") * 60 * 1000;
    const fileExpiryTimestamp = Date.now() - fileCacheTTL;
    const deletedFiles = await execute(
      `DELETE FROM cache_file WHERE last_updated < ?`,
      [fileExpiryTimestamp],
    );
    console.log(
      `Deleted ${deletedFiles.rowsAffected} expired file cache entries.`,
    );

    // Delete expired cache_permission entries
    const permissionCacheTTL =
      parseInt(getEnv("PERMISSION_CACHE_TTL") ?? "60") * 60 * 1000;
    const permissionExpiryTimestamp = Date.now() - permissionCacheTTL;
    const deletedPermissions = await execute(
      `DELETE FROM cache_permission WHERE last_updated < ?`,
      [permissionExpiryTimestamp],
    );
    console.log(
      `Deleted ${deletedPermissions.rowsAffected} expired permission cache entries.`,
    );

    return Response.json({
      success: true,
      deletedFiles: deletedFiles.rowsAffected,
      deletedPermissions: deletedPermissions.rowsAffected,
    });
  } catch (error) {
    console.error("Error cleaning up cache:", error);
    return Response.json(
      { error: "Failed to clean up cache" },
      { status: 500 },
    );
  }
};
