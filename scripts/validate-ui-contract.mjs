import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const rootFlag = args.indexOf("--root");
const repositoryRoot = path.resolve(
  rootFlag === -1 ? process.cwd() : (args[rootFlag + 1] ?? ""),
);
const sourceRoot = path.join(repositoryRoot, "src");
const tokenFile = path.join(sourceRoot, "styles", "tokens.css");

const sourceExtensions = new Set([
  ".astro",
  ".css",
  ".js",
  ".jsx",
  ".mjs",
  ".ts",
  ".tsx",
]);
const ignoredDirectories = new Set([".astro", ".git", "dist", "node_modules"]);
const colorFunctionPattern = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const rawColorPattern = /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/gi;
const dimensionPattern = /(^|[^\w-])-?(?:\d*\.\d+|\d+\.\d*|\d+)(px|r?em|ch|ex|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|cm|mm|q|in|pt|pc)\b/gi;
const anglePattern = /(^|[^\w-])-?(?:\d*\.\d+|\d+\.\d*|\d+)(deg|grad|rad|turn)\b/gi;
const breakpointDimensionPattern = /-?(?:\d*\.\d+|\d+\.\d*|\d+)(?:px|r?em|ch|ex|cap|ic|lh|rlh|vw|vh|vi|vb|vmin|vmax|cm|mm|q|in|pt|pc)\b/gi;

const colorProperties = /^(?:color|background(?:-color)?|border(?:-(?:block|inline)(?:-(?:start|end))?|-(?:top|right|bottom|left))?-color|outline-color|text-decoration-color|caret-color|fill|stroke)$/;
const typographyProperties = /^(?:font-family|font-size|font-weight|line-height|letter-spacing)$/;
const geometryProperties = /^(?:margin|margin-(?:block|inline)(?:-(?:start|end))?|margin-(?:top|right|bottom|left)|padding|padding-(?:block|inline)(?:-(?:start|end))?|padding-(?:top|right|bottom|left)|gap|row-gap|column-gap|inset|inset-(?:block|inline)(?:-(?:start|end))?|top|right|bottom|left|width|height|min-width|max-width|min-height|max-height|block-size|inline-size|min-block-size|max-block-size|min-inline-size|max-inline-size|border-radius|border-(?:start-start|start-end|end-start|end-end|top-left|top-right|bottom-left|bottom-right)-radius|outline-offset|scroll-(?:margin|padding)(?:-(?:block|inline)(?:-(?:start|end))?|-(?:top|right|bottom|left))?)$/;
const borderProperties = /^(?:border|border-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?|border-width|border-(?:top|right|bottom|left|block|inline)-width|outline)$/;
const shadowProperties = /^(?:box-shadow|text-shadow)$/;
const motionProperties = /^(?:transition|animation)(?:-(?:delay|duration|timing-function))?$/;
const dynamicGeometryProperties = /^(?:--(?:segment[\w-]*|completion|progress[\w-]*|position[\w-]*|offset[\w-]*|coordinate[\w-]*|ratio[\w-]*|scale[\w-]*)|width|height|inset|top|right|bottom|left|transform)$/;
const safeKeywords = new Set([
  "auto",
  "currentcolor",
  "fit-content",
  "inherit",
  "initial",
  "max-content",
  "min-content",
  "none",
  "normal",
  "revert",
  "revert-layer",
  "transparent",
  "unset",
]);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectFiles(absolute)));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

function lineAt(source, index) {
  return source.slice(0, index).split("\n").length;
}

function withoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) =>
    comment.replace(/[^\n]/g, " "),
  );
}

function findDeclarations(css) {
  const clean = withoutComments(css);
  const declarations = [];
  const pattern = /(^|[;{])\s*(--[\w-]+|[a-z-]+)\s*:\s*([^;{}]+)(?=;|})/gim;
  for (const match of clean.matchAll(pattern)) {
    declarations.push({
      index: match.index + match[0].indexOf(match[2]),
      property: match[2].toLowerCase(),
      value: match[3].trim(),
    });
  }
  return declarations;
}

function extractCss(source, extension) {
  if (extension === ".css") return [{ css: source, offset: 0 }];
  if (extension !== ".astro") return [];
  return [...source.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style>/gi)].map(
    (match) => ({
      css: match[1],
      offset: match.index + match[0].indexOf(match[1]),
    }),
  );
}

function hasRawDimension(value) {
  dimensionPattern.lastIndex = 0;
  anglePattern.lastIndex = 0;
  return dimensionPattern.test(value) || anglePattern.test(value);
}

function hasRawColor(value) {
  return /#[\da-f]{3,8}\b/i.test(value) || colorFunctionPattern.test(value);
}

function hasUnsafeVarReference(value) {
  return [...value.matchAll(/var\(([^)]*)\)/g)].some(
    (match) => !/^\s*--[\w-]+\s*$/.test(match[1]),
  );
}

function isSingleTokenReference(value) {
  return /^var\(\s*--[\w-]+\s*\)$/.test(value);
}

function isZero(value) {
  return /^[-+]?0(?:\.0+)?(?:[a-z%]+)?$/i.test(value);
}

function tokensIn(value) {
  return value
    .toLowerCase()
    .replace(/!important\b/g, " ")
    .replace(/var\([^)]*\)/g, " ")
    .replace(/(?:calc|min|max|clamp)\(/g, " ")
    .replace(/[(),/*]/g, " ")
    .replace(/\s[+-]\s/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function valueUsesOnlyContractGeometry(value) {
  if (
    hasRawColor(value) ||
    hasRawDimension(value) ||
    hasUnsafeVarReference(value)
  ) {
    return false;
  }
  for (const token of tokensIn(value)) {
    if (safeKeywords.has(token) || isZero(token) || /^\d+(?:\.\d+)?%$/.test(token)) {
      continue;
    }
    // Unitless numbers inside math are ratios or multipliers, not visual scales.
    if (/^-?\d+(?:\.\d+)?$/.test(token) && /(?:calc|min|max|clamp)\(/.test(value)) {
      continue;
    }
    if (/^(?:solid|dashed|dotted|double)$/.test(token)) continue;
    return false;
  }
  return true;
}

function declarationViolation(property, value) {
  if (property.startsWith("--")) {
    return isSingleTokenReference(value) ? null : "custom property";
  }

  if (colorProperties.test(property)) {
    if (hasRawColor(value) || hasUnsafeVarReference(value)) return "color";
    if (value.includes("var(") || safeKeywords.has(value.toLowerCase())) return null;
    return "color";
  }

  if (typographyProperties.test(property)) {
    if (
      isSingleTokenReference(value) ||
      safeKeywords.has(value.toLowerCase()) ||
      isZero(value)
    ) {
      return null;
    }
    return "typography";
  }

  if (geometryProperties.test(property) || borderProperties.test(property)) {
    return valueUsesOnlyContractGeometry(value) ? null : "geometry";
  }

  if (shadowProperties.test(property)) {
    return (value.includes("var(") && !hasUnsafeVarReference(value) && !hasRawDimension(value)) || /^(?:none|inherit|initial|unset|revert)$/.test(value)
      ? null
      : "shadow";
  }

  if (property === "z-index") {
    return isSingleTokenReference(value) || /^(?:0|auto|inherit|initial|unset|revert)$/.test(value)
      ? null
      : "layer";
  }

  if (property === "opacity") {
    return isSingleTokenReference(value) || /^(?:0|1|inherit|initial|unset|revert)$/.test(value)
      ? null
      : "opacity";
  }

  if (motionProperties.test(property)) {
    const normalized = value.replace(/!important\b/g, "").trim();
    const hasNonzeroTime = [...normalized.matchAll(/(?:^|\s|,)(\d*\.?\d+)(ms|s)\b/gi)]
      .some((match) => Number(match[1]) !== 0);
    const withoutTokens = normalized.replace(/var\([^)]*\)/g, " ");
    const hasRawEasing = /\b(?:ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)\b|\b(?:cubic-bezier|steps|linear)\s*\(/i.test(
      withoutTokens,
    );
    return hasNonzeroTime || hasRawEasing || hasUnsafeVarReference(value)
      ? "motion"
      : null;
  }

  if (property !== "content" && property !== "src") {
    const visualValue = value
      .replace(/url\([^)]*\)/gi, "")
      .replace(/(["']).*?\1/g, "");
    if (hasRawColor(visualValue) || hasRawDimension(visualValue)) {
      return "visual literal";
    }
  }

  return null;
}

function cssPropertyName(scriptProperty) {
  return scriptProperty.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function hasDocumentedGeometryException(source, index) {
  const precedingLines = source.slice(0, index).split("\n").slice(-3).join("\n");
  const tagStart = source.lastIndexOf("<", index);
  const tagEnd = source.indexOf(">", index);
  const currentTag =
    tagStart === -1 || tagEnd === -1 ? "" : source.slice(tagStart, tagEnd);
  return (
    /ui-contract-exception\s+data-driven-geometry:\s*\S/i.test(
      precedingLines,
    ) ||
    /data-ui-geometry-exception\s*=\s*["'][^"']+["']/i.test(currentTag)
  );
}

function hasDocumentedComponentGeometry(source, index) {
  const precedingLines = source.slice(0, index).split("\n").slice(-3).join("\n");
  return /ui-contract-exception\s+component-geometry:\s*\S/i.test(
    precedingLines,
  );
}

function inlineDeclarations(source) {
  return source
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => {
      const separator = declaration.indexOf(":");
      return separator === -1
        ? null
        : {
            property: declaration.slice(0, separator).trim().toLowerCase(),
            value: declaration.slice(separator + 1).trim(),
          };
    })
    .filter(Boolean);
}

function findBreakpoints(css) {
  const breakpoints = [];
  for (const atRule of css.matchAll(/@(?:media|container)\b([^{}]*)\{/gi)) {
    const prelude = atRule[1];
    for (const condition of prelude.matchAll(/\(([^)]*\b(?:width|height)\b[^)]*)\)/gi)) {
      for (const dimension of condition[1].matchAll(breakpointDimensionPattern)) {
        breakpoints.push({
          index:
            atRule.index +
            atRule[0].indexOf(prelude) +
            condition.index +
            condition[0].indexOf(condition[1]) +
            dimension.index,
          value: dimension[0],
        });
      }
      breakpointDimensionPattern.lastIndex = 0;
    }
  }
  return breakpoints;
}

let tokenSource;
try {
  tokenSource = await readFile(tokenFile, "utf8");
} catch (error) {
  console.error(
    `UI contract validation failed:\n${path.relative(repositoryRoot, tokenFile)}: ${error.message}`,
  );
  process.exit(1);
}

const approvedBreakpoints = new Set(
  [...tokenSource.matchAll(/--breakpoint-[\w-]+\s*:\s*([^;]+);/g)].map((match) =>
    match[1].trim().toLowerCase(),
  ),
);
const violations = [];
const seen = new Set();

function report(file, line, property, value, contract = "use a central token") {
  const relative = path.relative(repositoryRoot, file);
  const key = `${relative}:${line}:${property}:${value}`;
  if (seen.has(key)) return;
  seen.add(key);
  violations.push(`${relative}:${line} — ${property}: ${value} — ${contract}`);
}

const files = await collectFiles(sourceRoot);
for (const file of files) {
  if (file === tokenFile) continue;
  const source = await readFile(file, "utf8");
  const extension = path.extname(file);

  for (const match of source.matchAll(rawColorPattern)) {
    report(file, lineAt(source, match.index), "raw-color", match[0]);
  }
  rawColorPattern.lastIndex = 0;

  for (const block of extractCss(source, extension)) {
    for (const declaration of findDeclarations(block.css)) {
      if (declarationViolation(declaration.property, declaration.value)) {
        report(
          file,
          lineAt(source, block.offset + declaration.index),
          declaration.property,
          declaration.value,
        );
      }
    }

    for (const match of findBreakpoints(block.css)) {
      const value = match.value.toLowerCase();
      if (
        !approvedBreakpoints.has(value) &&
        !hasDocumentedComponentGeometry(block.css, match.index)
      ) {
        report(
          file,
          lineAt(source, block.offset + match.index),
          "breakpoint",
          value,
          "declare this breakpoint in the central token source",
        );
      }
    }
  }

  if (extension === ".astro" || extension === ".jsx" || extension === ".tsx") {
    const stylePatterns = [
      /\bstyle\s*=\s*(["'])([\s\S]*?)\1/g,
      /\bstyle\s*=\s*\{`([\s\S]*?)`\}/g,
      /\bstyle\s*=\s*\{\s*(["'])([\s\S]*?)\1\s*\}/g,
    ];
    for (const match of stylePatterns.flatMap((pattern) =>
      [...source.matchAll(pattern)]
    )) {
      const css = match[2] ?? match[1] ?? "";
      const documentedGeometry = hasDocumentedGeometryException(
        source,
        match.index,
      );
      for (const declaration of inlineDeclarations(css)) {
        if (declaration.value.includes("${")) {
          if (
            !documentedGeometry ||
            !dynamicGeometryProperties.test(declaration.property)
          ) {
            report(
              file,
              lineAt(source, match.index),
              declaration.property,
              declaration.value,
              "document this narrow data-driven geometry exception",
            );
          }
        } else if (
          declarationViolation(declaration.property, declaration.value)
        ) {
          report(
            file,
            lineAt(source, match.index),
            declaration.property,
            declaration.value,
          );
        }
      }
    }

    const objectStylePattern = /\bstyle\s*=\s*\{\s*\{([\s\S]*?)\}\s*\}/g;
    for (const match of source.matchAll(objectStylePattern)) {
      const documentedGeometry = hasDocumentedGeometryException(
        source,
        match.index,
      );
      const declarations = match[1].matchAll(/([a-zA-Z][\w]*)\s*:\s*([^,}]+)/g);
      for (const declaration of declarations) {
        const property = cssPropertyName(declaration[1]);
        const expression = declaration[2].trim();
        const literal = expression.match(/^["'`]([^"'`]*)["'`]$/);
        const value = literal?.[1] ?? expression.replace(/\s+/g, " ");
        if (literal && declarationViolation(property, value)) {
          report(file, lineAt(source, match.index + declaration.index), property, value);
        } else if (
          !literal &&
          (!documentedGeometry || !dynamicGeometryProperties.test(property))
        ) {
          report(
            file,
            lineAt(source, match.index + declaration.index),
            property,
            value,
            "document this narrow data-driven geometry exception",
          );
        }
      }
    }
  }

  if ([".astro", ".js", ".jsx", ".mjs", ".ts", ".tsx"].includes(extension)) {
    const directStylePattern = /\.style\.([a-zA-Z][\w]*)\s*=\s*([\s\S]*?);/g;
    for (const match of source.matchAll(directStylePattern)) {
      const property = cssPropertyName(match[1]);
      const expression = match[2].trim();
      const literal = expression.match(/^["'`]([^"'`]*)["'`]$/);
      const value = literal?.[1] ?? expression.replace(/\s+/g, " ");
      if (literal && declarationViolation(property, value)) {
        report(file, lineAt(source, match.index), property, value);
      } else if (
        !literal &&
        (!hasDocumentedGeometryException(source, match.index) ||
          !dynamicGeometryProperties.test(property))
      ) {
        report(
          file,
          lineAt(source, match.index),
          property,
          value,
          "document this narrow data-driven geometry exception",
        );
      }
    }

    const setPropertyPattern = /\.style\.setProperty\(\s*["']([^"']+)["']\s*,\s*([\s\S]*?)\);/g;
    for (const match of source.matchAll(setPropertyPattern)) {
      const property = match[1].toLowerCase();
      const expression = match[2].trim();
      const literal = expression.match(/^["'`]([^"'`]*)["'`]$/);
      const value = literal?.[1] ?? expression.replace(/\s+/g, " ");
      if (literal && declarationViolation(property, value)) {
        report(file, lineAt(source, match.index), property, value);
      } else if (
        !literal &&
        (!hasDocumentedGeometryException(source, match.index) ||
          !dynamicGeometryProperties.test(property))
      ) {
        report(
          file,
          lineAt(source, match.index),
          property,
          value,
          "document this narrow data-driven geometry exception",
        );
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    `UI contract validation failed:\n${violations.map((item) => `- ${item}`).join("\n")}`,
  );
  process.exit(1);
}

console.log(`Validated UI contract across ${files.length} source files.`);
