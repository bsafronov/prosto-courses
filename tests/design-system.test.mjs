import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import {
  designSystemBuildBudget,
  tailwindRuntimeGuard,
  validateDesignSystemBuild,
} from "../scripts/design-system-build.mjs";
import {
  presentationFingerprint,
  technicalStyleFingerprint,
  validateDesignSystemSources,
  validateRepositoryDesignSystem,
  validateThemeSource,
} from "../scripts/design-system.mjs";

test("rejects local CSS outside the legacy migration boundary", () => {
  assert.throws(
    () =>
      validateDesignSystemSources({
        legacyStyleOwners: {},
        sources: [
          {
            path: "src/components/NewCard.astro",
            source: "<article>New card</article><style>.card { padding: 13px; }</style>",
          },
        ],
      }),
    /NewCard\.astro.*outside the closed design system/i,
  );
});

test("allows complex component CSS when every visual value is tokenized", () => {
  assert.deepEqual(
    validateDesignSystemSources({
      legacyStyleOwners: {},
      sources: [
        {
          path: "src/components/NewCard.astro",
          source:
            "<article>New card</article>" +
            "<style>.card:hover { display: grid; color: var(--color-ink); padding: var(--spacing-3); }</style>",
        },
      ],
    }),
    {
      checkedFiles: 1,
      legacyStyleOwners: 0,
      technicalStyleExceptions: 0,
    },
  );
});

test("rejects custom CSS that mixes tokens with new visual literals", () => {
  for (const css of [
    ".card { padding: calc(var(--spacing-3) + 13px); }",
    "@media (width >= 53rem) { .card { color: var(--color-ink); } }",
  ]) {
    assert.throws(
      () =>
        validateDesignSystemSources({
          legacyStyleOwners: {},
          sources: [
            {
              path: "src/components/NewCard.astro",
              source: `<article>New card</article><style>${css}</style>`,
            },
          ],
        }),
      /NewCard\.astro.*visual literals must use theme variables/i,
    );
  }
});

test("rejects presentation drift inside a frozen legacy owner", () => {
  const path = "src/components/LegacyCard.astro";
  const original = "<article>Legacy</article><style>.card { padding: 12px; }</style>";
  const changed = "<article>Legacy</article><style>.card { padding: 13px; }</style>";

  assert.throws(
    () =>
      validateDesignSystemSources({
        legacyStyleOwners: {
          [path]: presentationFingerprint(path, original),
        },
        sources: [{ path, source: changed }],
      }),
    /LegacyCard\.astro.*legacy presentation changed/i,
  );
});

test("allows only fingerprinted technical style exceptions", () => {
  const source = 'progress.style.width = `${percent}%`;';
  const exception = {
    reason: "Progress width is data-derived geometry.",
    fingerprint: technicalStyleFingerprint(source),
  };

  assert.deepEqual(
    validateDesignSystemSources({
      legacyStyleOwners: {},
      technicalStyleExceptions: {
        "src/scripts/progress.ts": exception,
      },
      sources: [{ path: "src/scripts/progress.ts", source }],
    }),
    {
      checkedFiles: 1,
      legacyStyleOwners: 0,
      technicalStyleExceptions: 1,
    },
  );
  assert.throws(
    () =>
      validateDesignSystemSources({
        legacyStyleOwners: {},
        technicalStyleExceptions: {
          "src/scripts/progress.ts": exception,
        },
        sources: [
          {
            path: "src/scripts/progress.ts",
            source: 'progress.style.width = "13px";',
          },
        ],
      }),
    /progress\.ts.*technical presentation changed/i,
  );
});

test("rejects DOM style APIs outside a technical exception", () => {
  for (const source of [
    'card.style.padding = "13px";',
    'card.style["padding"] = "13px";',
    'Object.assign(card.style, { padding: "13px" });',
    'card.setAttribute("style", "padding: 13px");',
  ]) {
    assert.throws(
      () =>
        validateDesignSystemSources({
          legacyStyleOwners: {},
          sources: [{ path: "src/scripts/card.ts", source }],
        }),
      /card\.ts.*outside the legacy migration boundary/i,
    );
  }
});

test("rejects color utilities outside the semantic palette", () => {
  assert.throws(
    () =>
      validateDesignSystemSources({
        legacyStyleOwners: {},
        sources: [
          {
            path: "src/components/NewCard.astro",
            source: '<article class="bg-red-500">New card</article>',
          },
        ],
      }),
    /bg-red-500.*closed design system/i,
  );
});

test("rejects unapproved utilities inside Astro class lists", () => {
  assert.throws(
    () =>
      validateDesignSystemSources({
        legacyStyleOwners: {},
        sources: [
          {
            path: "src/components/NewCard.astro",
            source:
              '<article class:list={["bg-red-500", { hidden: false }]}>New card</article>',
          },
        ],
      }),
    /bg-red-500.*closed design system/i,
  );
});

test("rejects unapproved utilities passed to classList", () => {
  assert.throws(
    () =>
      validateDesignSystemSources({
        legacyStyleOwners: {},
        sources: [
          {
            path: "src/scripts/card.ts",
            source: 'card.classList.add("bg-red-500");',
          },
        ],
      }),
    /bg-red-500.*closed design system/i,
  );
});

test("uses Tailwind source scanning to reject indirect candidates", () => {
  for (const source of [
    'const unsafe = "bg-[#fff]"; <article class:list={unsafe}>New card</article>',
    'const unsafe = "opacity-50"; card.setAttribute("class", unsafe);',
  ]) {
    assert.throws(
      () =>
        validateDesignSystemSources({
          legacyStyleOwners: {},
          sources: [{ path: "src/components/NewCard.astro", source }],
        }),
      /(?:bg-\[#fff\].*arbitrary values are unavailable|opacity-50.*closed design system)/i,
    );
  }
});

test("rejects arbitrary visual utilities", () => {
  assert.throws(
    () =>
      validateDesignSystemSources({
        legacyStyleOwners: {},
        sources: [
          {
            path: "src/components/NewCard.astro",
            source: '<article class="text-[17px]">New card</article>',
          },
        ],
      }),
    /text-\[17px\].*arbitrary values are unavailable/i,
  );
});

test("rejects spacing outside the approved scale", () => {
  assert.throws(
    () =>
      validateDesignSystemSources({
        legacyStyleOwners: {},
        sources: [
          {
            path: "src/components/NewCard.astro",
            source: '<article class="p-7">New card</article>',
          },
        ],
      }),
    /p-7.*approved spacing scale/i,
  );
});

test("rejects unapproved visual roles across the closed namespaces", () => {
  for (const utility of [
    "text-xl",
    "rounded-xl",
    "shadow-lg",
    "max-w-7xl",
    "font-bold",
    "border-8",
    "size-10",
    "opacity-50",
    "outline-8",
    "ring-8",
    "duration-700",
    "scale-150",
    "rotate-45",
    "translate-x-1/2",
    "mix-blend-multiply",
    "ring",
    "min-[53rem]:grid",
    "max-[900px]:hidden",
    "[@media(width>=53rem)]:grid",
    "xl:grid",
  ]) {
    assert.throws(
      () =>
        validateDesignSystemSources({
          legacyStyleOwners: {},
          sources: [
            {
              path: "src/components/NewCard.astro",
              source: `<article class="${utility}">New card</article>`,
            },
          ],
        }),
      new RegExp(`${utility.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*(?:closed|approved|unavailable)`, "i"),
    );
  }
});

test("publishes only the approved semantic theme", async () => {
  const source = await readFile("src/styles/theme.css", "utf8");

  assert.deepEqual(validateThemeSource(source), {
    themeVariables: 69,
    typographyRoles: 7,
  });
});

test("rejects CSS appended outside the approved theme API", async () => {
  const source = await readFile("src/styles/theme.css", "utf8");

  assert.throws(
    () => validateThemeSource(`${source}\n.escape { padding: 13px; }\n`),
    /theme source changed/i,
  );
});

test("fails the production build above the representative Lesson CSS budget", () => {
  assert.throws(
    () =>
      validateDesignSystemBuild(
        {
          cssSources: [Buffer.from(".lesson { color: var(--color-ink); }")],
          tailwindRuntimeSources: [],
        },
        { maxCssGzipBytes: 1 },
      ),
    /representative Lesson CSS.*budget/i,
  );
});

test("fails the production build when Tailwind runtime JavaScript is present", () => {
  assert.throws(
    () =>
      validateDesignSystemBuild({
        cssSources: [Buffer.from(".lesson {}")],
        tailwindRuntimeSources: [Buffer.from("window.tailwind = {}")],
      }),
    /Tailwind runtime JavaScript.*0 bytes/i,
  );
});

test("fails bundling when a Tailwind package enters a runtime chunk", () => {
  const guard = tailwindRuntimeGuard();

  assert.throws(
    () =>
      guard.generateBundle(
        {},
        {
          "entry.js": {
            type: "chunk",
            modules: {
              "/repo/node_modules/tailwindcss/index.js": {},
            },
          },
        },
      ),
    /Tailwind build module.*runtime chunk/i,
  );
});

test("production build measures representative linked and inline CSS", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "design-system-build-"));
  try {
    const lessonDirectory = path.join(
      root,
      "courses/markdown/lessons/formatting",
    );
    const assetDirectory = path.join(root, "assets");
    await mkdir(lessonDirectory, { recursive: true });
    await mkdir(assetDirectory, { recursive: true });
    const linkedCss = ".lesson { color: var(--color-ink); }";
    const inlineCss = ".inline { color: var(--color-muted); }";
    await writeFile(path.join(assetDirectory, "app.css"), linkedCss);
    await writeFile(
      path.join(lessonDirectory, "index.html"),
      `<link rel="stylesheet" href="/prosto-courses/assets/app.css"><style>${inlineCss}</style>`,
    );

    const hook = designSystemBuildBudget({
      siteBasePath: "/prosto-courses",
    }).hooks["astro:build:done"];
    await hook({ dir: pathToFileURL(`${root}${path.sep}`) });

    const report = JSON.parse(
      await readFile(path.join(root, "design-system-report.json"), "utf8"),
    );
    const { cssGzipBytes, ...stableReport } = report;
    assert.ok(Number.isInteger(cssGzipBytes) && cssGzipBytes > 0);
    assert.deepEqual(stableReport, {
      representativeLesson: "courses/markdown/lessons/formatting/index.html",
      cssRawBytes: 74,
      tailwindRuntimeBytes: 0,
      cssBudgetGzipBytes: 20 * 1024,
    });
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});

test("repository stays inside the Tailwind foundation boundary", async () => {
  assert.deepEqual(await validateRepositoryDesignSystem(), {
    checkedFiles: 40,
    legacyStyleOwners: 29,
    technicalStyleExceptions: 2,
    themeVariables: 69,
    typographyRoles: 7,
  });
});
