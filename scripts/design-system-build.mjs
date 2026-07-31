import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

export const MAX_REPRESENTATIVE_CSS_GZIP_BYTES = 20 * 1024;
export const REPRESENTATIVE_LESSON =
  "courses/markdown/lessons/formatting/index.html";

const formatKib = (bytes) => `${(bytes / 1024).toFixed(2)} KiB`;

export function validateDesignSystemBuild(
  { cssSources, tailwindRuntimeSources },
  { maxCssGzipBytes = MAX_REPRESENTATIVE_CSS_GZIP_BYTES } = {},
) {
  const css = Buffer.concat(cssSources);
  const cssGzipBytes = gzipSync(css).byteLength;
  if (cssGzipBytes > maxCssGzipBytes) {
    throw new Error(
      `Representative Lesson CSS is ${formatKib(cssGzipBytes)} gzip, above ` +
        `the ${formatKib(maxCssGzipBytes)} production budget.`,
    );
  }

  const tailwindRuntimeBytes = tailwindRuntimeSources.reduce(
    (total, source) => total + source.byteLength,
    0,
  );
  if (tailwindRuntimeBytes > 0) {
    throw new Error(
      `Tailwind runtime JavaScript is ${tailwindRuntimeBytes} bytes; expected 0 bytes.`,
    );
  }

  return {
    cssRawBytes: css.byteLength,
    cssGzipBytes,
    tailwindRuntimeBytes,
  };
}

export function tailwindRuntimeGuard() {
  return {
    name: "prosto-courses-no-tailwind-runtime",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        const tailwindModules = Object.keys(output.modules).filter(
          (moduleId) =>
            /[/\\]node_modules[/\\](?:@tailwindcss|tailwindcss)[/\\]/.test(
              moduleId,
            ),
        );
        if (tailwindModules.length) {
          throw new Error(
            `Tailwind build module entered runtime chunk ${output.fileName ?? "unknown"}: ` +
              tailwindModules.join(", "),
          );
        }
      }
    },
  };
}

const attributeValue = (tag, name) =>
  tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];

function resolveBuildAsset(root, htmlPath, reference, siteBasePath) {
  const pageUrl = new URL(htmlPath, "https://production.invalid/");
  const pathname = decodeURIComponent(new URL(reference, pageUrl).pathname);
  let relativePath = pathname.replace(/^\/+/, "");
  const basePath = siteBasePath.replace(/^\/+|\/+$/g, "");
  if (basePath && relativePath.startsWith(`${basePath}/`)) {
    relativePath = relativePath.slice(basePath.length + 1);
  }

  const assetPath = path.resolve(root, relativePath);
  if (assetPath !== root && !assetPath.startsWith(`${root}${path.sep}`)) {
    throw new Error(`Build asset escapes output directory: ${reference}`);
  }
  return assetPath;
}

async function collectProductionSources(
  root,
  { representativeLesson, siteBasePath },
) {
  const htmlPath = path.join(root, representativeLesson);
  const html = await readFile(htmlPath, "utf8");
  const cssSources = [];
  const stylesheetPaths = new Set();

  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attributeValue(tag, "rel") ?? "";
    const href = attributeValue(tag, "href");
    if (!href || !rel.split(/\s+/).includes("stylesheet")) continue;
    stylesheetPaths.add(
      resolveBuildAsset(root, representativeLesson, href, siteBasePath),
    );
  }
  for (const stylesheetPath of stylesheetPaths) {
    cssSources.push(await readFile(stylesheetPath));
  }
  for (const [, inlineCss] of html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)) {
    cssSources.push(Buffer.from(inlineCss));
  }
  for (const [, inlineStyle] of html.matchAll(/\sstyle\s*=\s*["']([^"']*)["']/gi)) {
    cssSources.push(Buffer.from(inlineStyle));
  }

  const tailwindRuntimeSources = [];
  for (const [tag, inlineScript] of html.matchAll(
    /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
  )) {
    const src = attributeValue(tag, "src");
    if (src) {
      const script = await readFile(
        resolveBuildAsset(root, representativeLesson, src, siteBasePath),
      );
      if (/tailwind(?:css)?/i.test(src) || /tailwind(?:css)?/i.test(script.toString())) {
        tailwindRuntimeSources.push(script);
      }
      continue;
    }
    if (/tailwind(?:css)?/i.test(inlineScript)) {
      tailwindRuntimeSources.push(Buffer.from(inlineScript));
    }
  }

  return { cssSources, tailwindRuntimeSources };
}

export function designSystemBuildBudget({
  representativeLesson = REPRESENTATIVE_LESSON,
  siteBasePath = "/",
} = {}) {
  return {
    name: "prosto-courses-design-system-build-budget",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const root = path.resolve(fileURLToPath(dir));
        const sources = await collectProductionSources(root, {
          representativeLesson,
          siteBasePath,
        });
        const result = validateDesignSystemBuild(sources);
        const report = {
          representativeLesson,
          ...result,
          cssBudgetGzipBytes: MAX_REPRESENTATIVE_CSS_GZIP_BYTES,
        };
        await writeFile(
          path.join(root, "design-system-report.json"),
          `${JSON.stringify(report, null, 2)}\n`,
        );
        console.info(
          `Design system: ${formatKib(result.cssRawBytes)} raw CSS, ` +
            `${formatKib(result.cssGzipBytes)} gzip; Tailwind runtime JavaScript 0 bytes.`,
        );
      },
    },
  };
}
