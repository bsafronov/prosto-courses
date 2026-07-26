import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import AstroPWA from "@vite-pwa/astro";
import { defineConfig } from "astro/config";
import path from "node:path";
import {
  MAX_PRECACHE_FILE_BYTES,
  precacheReleaseBudget,
} from "./scripts/precache-release.mjs";
import { externalReferences } from "./scripts/rehype-external-references.mjs";
import { siteBasePath, siteOrigin } from "./site.config.mjs";

const siteScope = siteBasePath === "/" ? "/" : `${siteBasePath}/`;
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
  trailingSlash: "always",
  markdown: {
    processor: unified({
      rehypePlugins: [
        [externalReferences, { siteBasePath, siteOrigin }],
      ],
    }),
  },
  ...(outDir ? { outDir } : {}),
  ...(cacheDir ? { cacheDir } : {}),
  integrations: [
    mdx(),
    precacheReleaseBudget(),
    AstroPWA({
      ...(outDir ? { outDir } : {}),
      registerType: "prompt",
      injectRegister: false,
      manifestFilename: "manifest.webmanifest",
      manifest: {
        name: "Prosto.Courses",
        short_name: "Курсы",
        description: "Короткие практические курсы.",
        lang: "ru",
        display: "standalone",
        start_url: siteScope,
        scope: siteScope,
        theme_color: "#18181b",
        background_color: "#fafafa",
        icons: [
          {
            src: `${siteScope}pwa-192x192.png`,
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${siteScope}pwa-512x512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: `${siteScope}maskable-icon-512x512.png`,
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*"],
        maximumFileSizeToCacheInBytes: MAX_PRECACHE_FILE_BYTES,
        navigateFallback: `${siteScope}offline/`,
        runtimeCaching: [],
      },
    }),
  ],
});
