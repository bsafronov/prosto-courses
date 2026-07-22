import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import path from "node:path";
import { siteBasePath, siteOrigin } from "./site.config.mjs";

const outDir = process.env.ASTRO_OUT_DIR
  ? path.resolve(process.env.ASTRO_OUT_DIR)
  : undefined;
const cacheDir = process.env.ASTRO_CACHE_DIR
  ? path.resolve(process.env.ASTRO_CACHE_DIR)
  : undefined;
export default defineConfig({
  site: siteOrigin,
  base: siteBasePath,
  output: "static",
  ...(outDir ? { outDir } : {}),
  ...(cacheDir ? { cacheDir } : {}),
  integrations: [mdx()],
});
