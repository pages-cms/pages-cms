import "@/db/envConfig";
import { defineConfig } from "drizzle-kit";
 
export default defineConfig({
  schema: "./db/schema.ts",
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL!,
  },
});