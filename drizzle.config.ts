import "@/db/envConfig";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "turso",
  dbCredentials: {
    url: process.env.SQLITE_URL!,
    authToken: process.env.SQLITE_AUTH_TOKEN,
  }
});