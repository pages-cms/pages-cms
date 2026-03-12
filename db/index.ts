import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const getConnectionString = async () => {
  try {
    const { env } = await import("cloudflare:workers");

    if (env.HYPERDRIVE?.connectionString) {
      return env.HYPERDRIVE.connectionString;
    }
  } catch {
    // Fall back to local Node env below.
  }

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  throw new Error("Missing database connection. Set DATABASE_URL locally or bind HYPERDRIVE in Cloudflare.");
};

const createDb = async () => {
  const connectionString = await getConnectionString();
  const client = postgres(connectionString, {
    max: 5,
    fetch_types: false,
    prepare: true,
  });

  return drizzle(client, { schema });
};

export { createDb };
