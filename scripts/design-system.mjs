import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Scanner } from "@tailwindcss/oxide";
import { __unstable__loadDesignSystem } from "tailwindcss";
import {
  approvedThemeSourceFingerprint,
  approvedThemeVariables,
  legacyStyleOwners as repositoryLegacyStyleOwners,
  technicalStyleExceptions as repositoryTechnicalStyleExceptions,
  typographyRoles,
} from "../design-system.config.mjs";

const repositoryThemeSource = await readFile(
  new URL("../src/styles/theme.css", import.meta.url),
  "utf8",
);
const candidateDesignSystem = await __unstable__loadDesignSystem(
  repositoryThemeSource.replace(/^@import[^;]+;\s*$/gm, ""),
);

const embeddedStylesPattern = /<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi;
const embeddedStyleBodiesPattern =
  /<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi;
const inlineStylePattern =
  /\sstyle\s*=\s*(?:"[^"]*"|'[^']*'|`[^`]*`|\{(?:`[^`]*`|"[^"]*"|'[^']*'|[^}])*\})/g;
const domStyleAssignmentPattern =
  /\b[\w$.[\]?]+\.style\.[A-Za-z][\w-]*\s*=\s*[\s\S]*?;/g;
const bracketStyleAssignmentPattern =
  /\b[\w$.[\]?]+\.style\s*\[[^\]]+\]\s*=\s*[\s\S]*?;/g;
const domStyleMethodPattern =
  /\b[\w$.[\]?]+\.style\.setProperty\s*\([\s\S]*?\);/g;
const styleAttributeMethodPattern =
  /\b[\w$.[\]?]+\.setAttribute\s*\(\s*["']style["']\s*,[\s\S]*?\);/g;
const objectStyleAssignmentPattern =
  /\bObject\.assign\s*\([^,;]*\.style\s*,[\s\S]*?\);/g;
const presentationApiPattern =
  /\.style\b|\.setAttribute\s*\(\s*["']style["']|\b(?:insertRule|replaceSync)\s*\(/;
const semanticColors = new Set([
  "canvas",
  "surface",
  "ink",
  "muted",
  "border",
  "focus",
  "brand",
  "completed",
  "warning",
  "error",
  "data-series-1",
  "data-series-2",
  "data-series-3",
  "data-series-4",
  "data-series-5",
]);
const spacingSteps = new Set([
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "8",
  "12",
  "16",
  "auto",
  "full",
]);
const typographyUtilities = new Set(
  typographyRoles.map((role) => `type-${role}`),
);
const radiusRoles = new Set(["none", "surface", "control", "round"]);
const borderRoles = new Set(["none", "default", "emphasis", "accent"]);
const structuralTextUtilities = new Set([
  "left",
  "center",
  "right",
  "start",
  "end",
  "justify",
  "ellipsis",
  "clip",
  "wrap",
  "nowrap",
  "balance",
  "pretty",
]);
const structuralSizes = new Set([
  "auto",
  "full",
  "screen",
  "svw",
  "lvw",
  "dvw",
  "svh",
  "lvh",
  "dvh",
  "min",
  "max",
  "fit",
]);
const structuralUtilities = new Set([
  "absolute",
  "block",
  "box-border",
  "box-content",
  "collapse",
  "contents",
  "fixed",
  "flex",
  "flex-col",
  "flex-col-reverse",
  "flex-nowrap",
  "flex-row",
  "flex-row-reverse",
  "flex-wrap",
  "flex-wrap-reverse",
  "flow-root",
  "grid",
  "grow",
  "grow-0",
  "hidden",
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "invisible",
  "isolate",
  "isolation-auto",
  "not-sr-only",
  "pointer-events-auto",
  "pointer-events-none",
  "relative",
  "shrink",
  "shrink-0",
  "sr-only",
  "static",
  "sticky",
  "visible",
]);
const safeCssKeywords = new Set([
  "absolute",
  "auto",
  "baseline",
  "block",
  "both",
  "center",
  "clip",
  "column",
  "column-reverse",
  "currentcolor",
  "dashed",
  "dotted",
  "double",
  "end",
  "fixed",
  "flex",
  "grid",
  "hidden",
  "inherit",
  "initial",
  "inline",
  "inline-block",
  "inline-flex",
  "inline-grid",
  "none",
  "nowrap",
  "normal",
  "pointer",
  "relative",
  "row",
  "row-reverse",
  "scroll",
  "solid",
  "space-around",
  "space-between",
  "space-evenly",
  "start",
  "static",
  "sticky",
  "stretch",
  "transparent",
  "unset",
  "visible",
  "wrap",
  "wrap-reverse",
]);
const safeCssFunctions = new Set([
  "calc",
  "clamp",
  "max",
  "min",
  "rotate",
  "scale",
  "translate",
  "translatex",
  "translatey",
]);

function presentationSource(path, source) {
  if (path.endsWith(".css")) return source;
  return [
    ...(source.match(embeddedStylesPattern) ?? []),
    ...(source.match(inlineStylePattern) ?? []),
    ...(source.match(domStyleAssignmentPattern) ?? []),
    ...(source.match(bracketStyleAssignmentPattern) ?? []),
    ...(source.match(domStyleMethodPattern) ?? []),
    ...(source.match(styleAttributeMethodPattern) ?? []),
    ...(source.match(objectStyleAssignmentPattern) ?? []),
  ].join("\n");
}

export function presentationFingerprint(path, source) {
  return createHash("sha256")
    .update(presentationSource(path, source))
    .digest("hex");
}

export function technicalStyleFingerprint(source) {
  return createHash("sha256").update(source).digest("hex");
}

function stylesheetSources(path, source) {
  if (path.endsWith(".css")) return [source];
  return [...source.matchAll(embeddedStyleBodiesPattern)].map(
    (match) => match[1],
  );
}

function rejectCssValue(path, property, value, reason) {
  throw new Error(
    `${path} defines ${property}: ${value} outside the closed design system; ${reason}.`,
  );
}

const containsNonzeroCssNumber = (value) =>
  [...value.matchAll(/-?(?:\d*\.)?\d+(?:[A-Za-z%]+)?/g)].some(
    ([number]) => Number.parseFloat(number) !== 0,
  );

function validateCustomStylesheet(path, source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/@(?:import|plugin|theme|utility|config|source)\b/i.test(css)) {
    throw new Error(
      `${path} may not extend the closed Tailwind configuration from component CSS.`,
    );
  }

  for (const condition of css.matchAll(/@(?:media|container)\s*([^\{]+)/gi)) {
    const value = condition[1].trim();
    if (containsNonzeroCssNumber(value)) {
      rejectCssValue(
        path,
        "responsive condition",
        value,
        "visual literals must use theme variables",
      );
    }
    const variables = [...value.matchAll(/theme\(\s*(--[\w-]+)/g)].map(
      (variable) => variable[1],
    );
    if (variables.some((variable) => !(variable in approvedThemeVariables))) {
      rejectCssValue(
        path,
        "responsive condition",
        value,
        "unknown theme variables are unavailable",
      );
    }
  }

  for (const match of css.matchAll(
    /(^|[;{])\s*(--[\w-]+|[A-Za-z-]+)\s*:\s*([^;{}]+)(?=;|})/g,
  )) {
    const property = match[2].toLowerCase();
    const value = match[3].trim();
    if (property.startsWith("--")) {
      rejectCssValue(path, property, value, "local design tokens are unavailable");
    }

    const variables = [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(
      (variable) => variable[1],
    );
    const unknownVariables = variables.filter(
      (variable) => !(variable in approvedThemeVariables),
    );
    if (unknownVariables.length) {
      rejectCssValue(
        path,
        property,
        value,
        `unknown theme variables: ${unknownVariables.join(", ")}`,
      );
    }
    const withoutVariables = value.replace(
      /var\(\s*--[\w-]+\s*\)/g,
      " ",
    );
    if (
      /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/i.test(
        withoutVariables,
      ) ||
      containsNonzeroCssNumber(withoutVariables)
    ) {
      rejectCssValue(path, property, value, "visual literals must use theme variables");
    }

    const remainingWords = withoutVariables
      .replace(/[(),/+*\-]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .filter((word) => word !== "0");
    const unsupportedWords = remainingWords.filter(
      (word) =>
        !safeCssKeywords.has(word.toLowerCase()) &&
        !safeCssFunctions.has(word.toLowerCase()),
    );
    if (unsupportedWords.length) {
      rejectCssValue(path, property, value, "visual literals must use theme variables");
    }
  }
}

const normalizeCssValue = (value) => value.trim().replace(/\s+/g, " ");

export function validateThemeSource(source) {
  const fingerprint = createHash("sha256").update(source).digest("hex");
  if (fingerprint !== approvedThemeSourceFingerprint) {
    throw new Error(
      "Approved theme source changed. Update its closed contract after design-system review.",
    );
  }
  const theme = source.match(/@theme\s+static\s*\{([\s\S]*?)\n\}/);
  if (!theme) throw new Error("Theme must use a static @theme block.");

  const declarations = Object.fromEntries(
    [...theme[1].matchAll(/^\s*(--[^:]+):\s*([^;]+);/gm)].map(
      ([, name, value]) => [name, normalizeCssValue(value)],
    ),
  );
  if (declarations["--*"] !== "initial") {
    throw new Error("Theme must reset the complete default namespace.");
  }
  delete declarations["--*"];

  assertThemeVariables(declarations);
  assertCompositeTypographyUtilities(source);

  return {
    themeVariables: Object.keys(declarations).length,
    typographyRoles: typographyRoles.length,
  };
}

function assertThemeVariables(actual) {
  const expectedNames = Object.keys(approvedThemeVariables);
  const actualNames = Object.keys(actual);
  const unexpected = actualNames.filter((name) => !(name in approvedThemeVariables));
  const missing = expectedNames.filter((name) => !(name in actual));
  const changed = expectedNames.filter(
    (name) => name in actual && actual[name] !== normalizeCssValue(approvedThemeVariables[name]),
  );
  if (unexpected.length || missing.length || changed.length) {
    throw new Error(
      `Theme contract mismatch. Unexpected: ${unexpected.join(", ") || "none"}; ` +
        `missing: ${missing.join(", ") || "none"}; changed: ${changed.join(", ") || "none"}.`,
    );
  }
}

function assertCompositeTypographyUtilities(source) {
  for (const role of typographyRoles) {
    const utility = source.match(
      new RegExp(`@utility\\s+type-${role}\\s*\\{([\\s\\S]*?)\\n\\}`),
    );
    const body = utility?.[1] ?? "";
    for (const property of ["font-size", "line-height", "font-weight"]) {
      if (!body.includes(`${property}: var(--text-type-${role}`)) {
        throw new Error(`Typography role type-${role} must own ${property}.`);
      }
    }
  }
}

function tailwindCandidates(sourcePath, source) {
  const extension = path.extname(sourcePath).slice(1) || "html";
  return new Scanner({ sources: [] }).scanFiles([
    { content: source, extension },
  ]);
}

function baseUtility(token) {
  return token.split(":").at(-1);
}

function rejectUtility(path, token, reason = "closed design system") {
  throw new Error(`${path} uses "${token}", which is outside the ${reason}.`);
}

function validateUtility(path, token) {
  if (token.includes("[") || token.includes("]") || /-\(--[^)]+\)/.test(token)) {
    throw new Error(
      `${path} uses "${token}"; arbitrary values are unavailable outside ` +
        "a documented technical exception.",
    );
  }

  const variants = token.split(":").slice(0, -1);
  for (const variant of variants) {
    const responsive = variant.match(/^(?:(?:min|max)-)?(xs|sm|md|lg|xl|2xl)$/);
    if (responsive && !["sm", "md", "lg"].includes(responsive[1])) {
      rejectUtility(
        path,
        token,
        "approved breakpoint set; this variant is unavailable",
      );
    }
  }

  const utility = baseUtility(token);
  const background = utility.match(/^bg-(.+)$/);
  if (background) {
    if (!semanticColors.has(background[1])) {
      throw new Error(
        `${path} uses "${token}", which is outside the closed design system. ` +
          "Choose an approved semantic color role.",
      );
    }
    return;
  }

  if (utility.startsWith("type-")) {
    if (!typographyUtilities.has(utility)) rejectUtility(path, token);
    return;
  }

  const text = utility.match(/^text-(.+)$/);
  if (text) {
    if (
      !semanticColors.has(text[1]) &&
      !structuralTextUtilities.has(text[1])
    ) {
      rejectUtility(path, token);
    }
    return;
  }

  const semanticColor = utility.match(
    /^(?:fill|stroke|caret|accent|decoration|divide|placeholder)-(.+)$/,
  );
  if (semanticColor) {
    if (!semanticColors.has(semanticColor[1])) rejectUtility(path, token);
    return;
  }

  const radius = utility.match(/^rounded(?:-[trblse]{1,2})?-(.+)$/);
  if (utility === "rounded" || radius) {
    if (utility === "rounded" || !radiusRoles.has(radius[1])) {
      rejectUtility(path, token);
    }
    return;
  }

  const shadow = utility.match(/^shadow-(.+)$/);
  if (utility === "shadow" || shadow) {
    if (utility === "shadow" || !["none", "overlay"].includes(shadow[1])) {
      rejectUtility(path, token);
    }
    return;
  }

  const measure = utility.match(/^measure-(.+)$/);
  if (measure) {
    if (!["shell", "intro", "reading"].includes(measure[1])) {
      rejectUtility(path, token);
    }
    return;
  }

  const maximumWidth = utility.match(/^max-w-(.+)$/);
  if (maximumWidth) {
    if (!structuralSizes.has(maximumWidth[1])) rejectUtility(path, token);
    return;
  }

  const font = utility.match(/^font-(.+)$/);
  if (font) {
    if (!["ui", "code", "strong"].includes(font[1])) {
      rejectUtility(path, token);
    }
    return;
  }

  const border = utility.match(/^border(?:-[xytrblse])?-(.+)$/);
  if (border) {
    if (
      !borderRoles.has(border[1]) &&
      !semanticColors.has(border[1]) &&
      !["solid", "dashed", "dotted", "double", "hidden"].includes(border[1])
    ) {
      rejectUtility(path, token);
    }
    return;
  }

  const outlineOrRing = utility.match(/^(?:outline|ring)-(.+)$/);
  if (outlineOrRing) {
    if (
      !semanticColors.has(outlineOrRing[1]) &&
      !["hidden", "none"].includes(outlineOrRing[1])
    ) {
      rejectUtility(path, token);
    }
    return;
  }

  const sizing = utility.match(/^(?:size|w|h|min-w|min-h|max-h|basis)-(.+)$/);
  if (sizing) {
    if (
      !spacingSteps.has(sizing[1]) &&
      !structuralSizes.has(sizing[1]) &&
      !/^\d+\/\d+$/.test(sizing[1])
    ) {
      rejectUtility(path, token, "approved sizing roles");
    }
    return;
  }

  const control = utility.match(/^control-(.+)$/);
  if (control) {
    if (!["compact", "default"].includes(control[1])) {
      rejectUtility(path, token);
    }
    return;
  }
  const icon = utility.match(/^icon-(.+)$/);
  if (icon) {
    if (!["sm", "md", "lg"].includes(icon[1])) rejectUtility(path, token);
    return;
  }

  const spacing = utility
    .replace(/^-/, "")
    .match(
      /^(?:p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left|start|end|scroll-m[trblxyse]?|scroll-p[trblxyse]?)-(.+)$/,
    );
  if (spacing) {
    if (!spacingSteps.has(spacing[1])) {
      throw new Error(
        `${path} uses "${token}", which is outside the approved spacing scale.`,
      );
    }
    return;
  }

  if (structuralUtilities.has(utility)) return;
  if (candidateDesignSystem.candidatesToCss([token])[0] !== null) {
    rejectUtility(path, token);
  }
}

export function validateDesignSystemSources({
  legacyStyleOwners,
  sources,
  technicalStyleExceptions = {},
  themeSourcePath = "src/styles/theme.css",
}) {
  const sourcePaths = new Set(sources.map((source) => source.path));
  for (const source of sources) {
    if (source.path === themeSourcePath) {
      validateThemeSource(source.source);
      continue;
    }

    if (source.path in legacyStyleOwners) {
      const fingerprint = presentationFingerprint(source.path, source.source);
      if (fingerprint !== legacyStyleOwners[source.path]) {
        throw new Error(
          `${source.path} legacy presentation changed. ` +
            "Remove migrated styling from the boundary or record an explicit design-system decision.",
        );
      }
      continue;
    }

    const technicalException = technicalStyleExceptions[source.path];
    if (technicalException) {
      if (!technicalException.reason?.trim()) {
        throw new Error(
          `${source.path} technical style exception needs a reason.`,
        );
      }
      if (!presentationApiPattern.test(source.source)) {
        throw new Error(
          `${source.path} technical style exception has no presentation.`,
        );
      }
      const fingerprint = technicalStyleFingerprint(source.source);
      if (fingerprint !== technicalException.fingerprint) {
        throw new Error(
          `${source.path} technical presentation changed. ` +
            "Update the narrow exception only after design-system review.",
        );
      }
    }

    if (
      !technicalException &&
      ((source.source.match(inlineStylePattern) ?? []).length > 0 ||
        presentationApiPattern.test(source.source))
    ) {
      throw new Error(
        `${source.path} defines local CSS outside the legacy migration boundary. ` +
          "Use the closed semantic theme instead.",
      );
    }

    for (const stylesheet of stylesheetSources(source.path, source.source)) {
      validateCustomStylesheet(source.path, stylesheet);
    }

    for (const token of tailwindCandidates(source.path, source.source)) {
      validateUtility(source.path, token);
    }
  }

  const missingOwners = Object.keys(legacyStyleOwners).filter(
    (owner) => !sourcePaths.has(owner),
  );
  if (missingOwners.length) {
    throw new Error(
      `Legacy migration boundary lists missing owners: ${missingOwners.join(", ")}.`,
    );
  }
  const missingExceptions = Object.keys(technicalStyleExceptions).filter(
    (exception) => !sourcePaths.has(exception),
  );
  if (missingExceptions.length) {
    throw new Error(
      `Technical style exceptions list missing sources: ${missingExceptions.join(", ")}.`,
    );
  }

  return {
    checkedFiles: sources.length,
    legacyStyleOwners: Object.keys(legacyStyleOwners).length,
    technicalStyleExceptions: Object.keys(technicalStyleExceptions).length,
  };
}

const sourceRoots = [
  "src/components",
  "src/layouts",
  "src/lib",
  "src/pages",
  "src/scripts",
  "src/styles",
];
const sourceExtensions = new Set([".astro", ".css", ".js", ".mjs", ".ts", ".tsx"]);

async function collectSourceFiles(projectRoot) {
  const sources = [];
  async function visit(directory) {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, item.name);
      if (item.isDirectory()) {
        await visit(absolutePath);
      } else if (item.isFile() && sourceExtensions.has(path.extname(item.name))) {
        sources.push({
          path: path.relative(projectRoot, absolutePath).split(path.sep).join("/"),
          source: await readFile(absolutePath, "utf8"),
        });
      }
    }
  }
  for (const root of sourceRoots) await visit(path.join(projectRoot, root));
  return sources.sort((left, right) => left.path.localeCompare(right.path));
}

function validateTailwindDependencies(packageJson) {
  const runtimeDependencies = packageJson.dependencies ?? {};
  const developmentDependencies = packageJson.devDependencies ?? {};
  for (const dependency of [
    "tailwindcss",
    "@tailwindcss/oxide",
    "@tailwindcss/vite",
  ]) {
    if (dependency in runtimeDependencies) {
      throw new Error(`${dependency} must be a build-time dependency only.`);
    }
    if (!/^\^?4\./.test(developmentDependencies[dependency] ?? "")) {
      throw new Error(`${dependency} must be installed at Tailwind CSS v4.`);
    }
  }
  for (const dependencies of [runtimeDependencies, developmentDependencies]) {
    if ("@tailwindcss/typography" in dependencies) {
      throw new Error("@tailwindcss/typography is excluded by ADR-0008.");
    }
  }
}

export async function validateRepositoryDesignSystem(
  projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url))),
) {
  const sources = await collectSourceFiles(projectRoot);
  const validation = validateDesignSystemSources({
    legacyStyleOwners: repositoryLegacyStyleOwners,
    sources,
    technicalStyleExceptions: repositoryTechnicalStyleExceptions,
  });
  const themeSource = sources.find(
    (source) => source.path === "src/styles/theme.css",
  );
  if (!themeSource) throw new Error("Missing src/styles/theme.css.");
  const theme = validateThemeSource(themeSource.source);
  const globalSource = sources.find(
    (source) => source.path === "src/styles/global.css",
  );
  if (!globalSource?.source.startsWith('@import "./theme.css";')) {
    throw new Error("Global CSS must import the closed Tailwind theme first.");
  }
  const packageJson = JSON.parse(
    await readFile(path.join(projectRoot, "package.json"), "utf8"),
  );
  validateTailwindDependencies(packageJson);

  return { ...validation, ...theme };
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const result = await validateRepositoryDesignSystem();
  console.info(
    `Validated ${result.themeVariables} theme variables and ` +
      `${result.legacyStyleOwners} frozen legacy style owners.`,
  );
}
