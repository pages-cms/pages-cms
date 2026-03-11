import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import vinext from "vinext";

export default defineConfig({
  plugins: [vinext(), tsconfigPaths()],
});
