import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import path from "node:path";

const outDir = process.env.ASTRO_OUT_DIR
  ? path.resolve(process.env.ASTRO_OUT_DIR)
  : undefined;

export default defineConfig({
  site: "https://bsafronov.github.io",
  base: "/prosto-courses",
  output: "static",
  ...(outDir ? { outDir } : {}),
  integrations: [mdx()],
});
