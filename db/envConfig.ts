import { loadEnvConfig } from "@next/env";
 
const projectDir = process.cwd();
// Without the dev flag, loadEnvConfig runs in production mode and skips
// .env.development (where the local DATABASE_URL default lives).
loadEnvConfig(projectDir, process.env.NODE_ENV !== "production");
