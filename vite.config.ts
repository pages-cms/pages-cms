import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import rsc from "@vitejs/plugin-rsc";
import { cloudflare } from "@cloudflare/vite-plugin";
import vinext from "vinext";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"]
      }
    }),
    tsconfigPaths()
  ]
});
