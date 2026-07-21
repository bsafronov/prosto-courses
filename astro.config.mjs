import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://bsafronov.github.io",
  base: "/prosto-courses",
  output: "static",
  integrations: [mdx()],
});
