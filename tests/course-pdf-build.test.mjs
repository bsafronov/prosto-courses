import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  MAX_COURSE_PDF_BYTES,
  assertCoursePdfSize,
  isCoursePdfArtifactName,
} from "../scripts/course-pdf-artifacts.mjs";
import { coursePdfBuild } from "../scripts/generate-course-pdfs.mjs";
import {
  completeAuthoringArtifacts,
} from "./support/complete-authoring-artifacts.mjs";
import { isPdfVisualMark } from "./support/pdf-inspection.mjs";

const courseSlug = "visual-course";
const projectRoot = path.resolve(import.meta.dirname, "..");

async function withPrintDocument(
  body,
  run,
  { filename = "prosto-courses-visual-course.pdf" } = {},
) {
  const root = await mkdtemp(path.join(tmpdir(), "course-pdf-build-"));
  const printDirectory = path.join(root, "course-pdf-print", courseSlug);
  const courseDirectory = path.join(root, "courses", courseSlug);
  await mkdir(printDirectory, { recursive: true });
  await mkdir(courseDirectory, { recursive: true });
  await writeFile(
    path.join(courseDirectory, "index.html"),
    `<a href="/${filename}" download="${filename}">Download PDF</a>`,
  );
  await writeFile(
    path.join(printDirectory, "index.html"),
    `<!doctype html>
<html>
  <head>
    <meta name="course-pdf-filename" content="${filename}">
    <title>Readable A4 Course | Prosto.Courses</title>
    <style>
      :root {
        --color-muted: #707070;
        --font-sans: sans-serif;
        --font-size-meta: 0.75rem;
        --font-size-print-min: 0.625rem;
        --print-page-margin-block: 16mm;
        --print-page-margin-inline: 14mm;
      }
    </style>
  </head>
  <body><div data-course-pdf-required-section>${body}</div></body>
</html>`,
  );

  try {
    await run(root);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
}

async function runProductionBuild(root) {
  const hook = coursePdfBuild({ siteBasePath: "/" }).hooks["astro:build:done"];
  await hook({
    dir: pathToFileURL(`${root}${path.sep}`),
    logger: { info() {} },
  });
}

const runDefaultProductionBuild = ({ cacheRoot, contentRoot, outputRoot }) =>
  new Promise((resolve, reject) => {
    const child = spawn("pnpm", ["build"], {
      cwd: projectRoot,
      env: {
        ...process.env,
        ASTRO_CACHE_DIR: cacheRoot,
        ASTRO_OUT_DIR: outputRoot,
        CONTENT_VALIDATION_DATE: "2026-08-30",
        COURSE_CONTENT_ROOT: contentRoot,
        NO_PROXY: [process.env.NO_PROXY, "127.0.0.1", "localhost"]
          .filter(Boolean)
          .join(","),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, output, signal }));
  });

test("Course PDF release limit is 20 MiB", () => {
  assert.equal(MAX_COURSE_PDF_BYTES, 20 * 1024 * 1024);
});

test("production build publishes exactly one Course PDF and removes stale artifacts", async () => {
  await withPrintDocument("<p>Complete Course release</p>", async (root) => {
    await writeFile(path.join(root, "prosto-courses-orphan.pdf"), "stale");
    await writeFile(path.join(root, "prosto-courses-visual-course.pdf"), "old");

    await runProductionBuild(root);

    const artifacts = (await readdir(root))
      .filter(isCoursePdfArtifactName)
      .sort();
    assert.deepEqual(artifacts, ["prosto-courses-visual-course.pdf"]);
    assert.rejects(
      () =>
        readFile(
          path.join(root, "course-pdf-print", courseSlug, "index.html"),
        ),
      { code: "ENOENT" },
    );
  });
});

test("production boundary rejects an oversized Course PDF", () => {
  assert.throws(
    () =>
      assertCoursePdfSize(courseSlug, MAX_COURSE_PDF_BYTES + 512 * 1024),
    /Course "visual-course".*measured 20\.50 MiB.*20\.00 MiB limit/i,
  );
});

test("production build rejects an incomplete Course PDF", async () => {
  await withPrintDocument("", async (root) => {
    await assert.rejects(
      () => runProductionBuild(root),
      /Course "visual-course".*required Course content/i,
    );
  });
});

test("production build rejects a PDF that omits required repeated content", async () => {
  await withPrintDocument(
    `<h1>Complete Course release</h1>
    <p data-repeated-content>Repeated body evidence</p>
    <p data-repeated-content>Repeated body evidence</p>
    <script>
      addEventListener('beforeprint', () => {
        document.querySelectorAll('[data-repeated-content]').item(1).remove();
      });
    </script>`,
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*malformed or incomplete.*Repeated body evidence.*expected 2 occurrences/i,
      );
    },
  );
});

test("production build accepts a PDF that omits aria-hidden presentation text", async () => {
  await withPrintDocument(
    `<span aria-hidden="true" style="display: block; text-transform: uppercase">ⓘ</span>
    <p>Complete Course release</p>
    <script>
      addEventListener('beforeprint', () => {
        document.querySelector('[aria-hidden="true"]').remove();
      });
    </script>`,
    async (root) => {
      await runProductionBuild(root);
    },
  );
});

test("production build rejects missing and orphaned Course print documents", async () => {
  await withPrintDocument("<p>Complete Course release</p>", async (root) => {
    await mkdir(path.join(root, "courses", "missing-course"), { recursive: true });
    await writeFile(
      path.join(root, "courses", "missing-course", "index.html"),
      "Missing Course PDF",
    );
    const orphanDirectory = path.join(root, "course-pdf-print", "orphan-course");
    await mkdir(orphanDirectory, { recursive: true });
    await writeFile(
      path.join(orphanDirectory, "index.html"),
      "Orphan print document",
    );

    await assert.rejects(
      () => runProductionBuild(root),
      /print document inventory.*missing for missing-course.*orphaned for orphan-course/i,
    );
  });
});

test("production build rejects a Course PDF with mismatched identity", async () => {
  await withPrintDocument(
    "<p>Complete Course release</p>",
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*identity mismatch.*prosto-courses-visual-course\.pdf.*wrong-course\.pdf/i,
      );
    },
    { filename: "prosto-courses-wrong-course.pdf" },
  );
});

async function inspectPdf(file) {
  const loadingTask = getDocument({ data: new Uint8Array(await readFile(file)) });
  const document = await loadingTask.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const operators = await page.getOperatorList();
    pages.push({
      height: page.view[3] - page.view[1],
      text: content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" "),
      visualMarks: operators.fnArray.filter(isPdfVisualMark).length,
      width: page.view[2] - page.view[0],
    });
  }
  await loadingTask.destroy();
  return pages;
}

async function inspectPdfLinks(file) {
  const loadingTask = getDocument({ data: new Uint8Array(await readFile(file)) });
  const document = await loadingTask.promise;
  const externalUrls = [];
  const internalLinkTargets = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    for (const annotation of await page.getAnnotations()) {
      if (annotation.subtype !== "Link") continue;
      if (typeof annotation.url === "string") externalUrls.push(annotation.url);
      if (typeof annotation.dest === "string") {
        internalLinkTargets.push(annotation.dest);
      }
    }
  }
  await loadingTask.destroy();
  return { externalUrls, internalLinkTargets };
}

test("production build preserves exact same-Course PDF destinations", async () => {
  const canonicalCourseUrl =
    "https://bsafronov.github.io/prosto-courses/courses/visual-course/";
  const lessonUrl = `${canonicalCourseUrl}lessons/lesson/`;
  await withPrintDocument(
    `<div class="course-pdf__release-identity">
      <a href="${canonicalCourseUrl}">${canonicalCourseUrl}</a>
    </div>
    <section id="course-overview" data-course-pdf-route="/prosto-courses/courses/visual-course/">
      <a href="${lessonUrl}#lesson-details">Read lesson details</a>
    </section>
    <section id="lesson" data-course-pdf-route="/prosto-courses/courses/visual-course/lessons/lesson/">
      <h2 id="lesson-details">Lesson details</h2>
    </section>`,
    async (root) => {
      await runProductionBuild(root);
      const links = await inspectPdfLinks(
        path.join(root, "prosto-courses-visual-course.pdf"),
      );
      assert.ok(links.internalLinkTargets.includes("lesson-details"));
      assert.ok(links.externalUrls.includes(canonicalCourseUrl));
      assert.ok(!links.externalUrls.includes(`${lessonUrl}#lesson-details`));
    },
  );
});

test("production build rejects a Course PDF with a missing authored image", async () => {
  await withPrintDocument(
    '<img src="/missing-authored-image.png" alt="Missing visual">',
    async (root) => {
      const oldArtifact = path.join(root, "prosto-courses-visual-course.pdf");
      await writeFile(oldArtifact, "old");
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*authored image.*missing-authored-image\.png/i,
      );
      await assert.rejects(() => readFile(oldArtifact), { code: "ENOENT" });
    },
  );
});

test("production build rejects a Course PDF when a Diagram fails", async () => {
  await withPrintDocument(
    `<figure class="learning-visual" aria-label="Broken workflow">
      <div
        data-mermaid-container
        data-mermaid-rendered="error"
        data-mermaid-error="Unexpected token near line 2"
        aria-label="Broken workflow description"
        aria-busy="false"
      ></div>
    </figure>`,
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*Diagram.*Broken workflow description.*Unexpected token near line 2/i,
      );
    },
  );
});

test("production build rejects a Course PDF when a local font fails", async () => {
  await withPrintDocument(
    `<style>
      @font-face {
        font-family: "Broken Course Font";
        src: url("/missing-course-font.woff2") format("woff2");
      }
    </style>
    <p>Every declared local Course font must load before printing.</p>`,
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*font.*Broken Course Font/i,
      );
    },
  );
});

test("production build rejects an unresolved Learning Visual", async () => {
  await withPrintDocument(
    `<figure class="learning-visual" aria-label="Empty chart">
      <div data-course-pdf-visual="chart"></div>
    </figure>`,
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*Chart.*Empty chart.*nonblank/i,
      );
    },
  );
});

test("production build rejects a Diagram with blank SVG output", async () => {
  await withPrintDocument(
    `<figure class="learning-visual" aria-label="Empty workflow">
      <div
        data-mermaid-container
        data-mermaid-rendered="true"
        aria-label="Empty workflow description"
        aria-busy="false"
      ><svg width="100" height="50"></svg></div>
    </figure>`,
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*Diagram.*Empty workflow description.*nonblank/i,
      );
    },
  );
});

test("production build waits for asynchronous visuals and emits nonblank output", async () => {
  await withPrintDocument(
    `<style>.representative-visual { break-after: page; }</style>
    <figure class="learning-visual representative-visual" aria-label="Meaningful Chart">
      <figcaption>Meaningful Chart</figcaption>
      <div data-course-pdf-visual="chart">
        <svg width="500" height="60" aria-hidden="true">
          <rect width="500" height="40" fill="rgb(64, 64, 64)"></rect>
          <text x="4" y="24">Exact Chart value: 42 units</text>
        </svg>
      </div>
      <p>Legend: patterned series. Takeaway: exact meaning. Source: fixture.</p>
    </figure>
    <figure class="learning-visual representative-visual" aria-label="Async Diagram title">
      <div
        data-mermaid-container
        aria-label="Async Diagram description"
        aria-busy="true"
      ></div>
      <p>How to read: left to right. Diagram takeaway: completion matters.</p>
    </figure>
    <figure class="learning-visual" aria-label="Authored image caption">
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60'%3E%3Crect width='120' height='60' fill='rgb(220,20,60)'/%3E%3C/svg%3E"
        alt="Authored image alternative"
      >
      <figcaption>
        Authored image caption. Source: fixture. License: course-owned.
        Generated-image disclosure: illustrative.
      </figcaption>
    </figure>
    <script>
      setTimeout(() => {
        const diagram = document.querySelector('[data-mermaid-container]');
        diagram.innerHTML = '<svg width="500" height="60" aria-hidden="true"><rect width="500" height="40" fill="rgb(90, 90, 90)"></rect><text x="4" y="24">Async Diagram rendered</text></svg>';
        diagram.dataset.mermaidRendered = 'true';
        diagram.setAttribute('aria-busy', 'false');
      }, 900);
    </script>`,
    async (root) => {
      await runProductionBuild(root);
      const pages = await inspectPdf(
        path.join(root, "prosto-courses-visual-course.pdf"),
      );
      for (const label of [
        "Exact Chart value: 42 units",
        "Async Diagram rendered",
        "Authored image caption",
      ]) {
        const page = pages.find((candidate) => candidate.text.includes(label));
        assert.ok(page, `expected PDF page for ${label}`);
        assert.ok(
          page.visualMarks > 0,
          `expected nonblank PDF output for ${label}`,
        );
      }
    },
  );
});

test("production build rejects a failed local visual resource", async () => {
  await withPrintDocument(
    `<link rel="stylesheet" href="/missing-print-visual.css">
    <p>Course copy</p>`,
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*resource.*missing-print-visual\.css.*404/i,
      );
    },
  );
});

test("production build rejects unreadable printable-width overflow", async () => {
  await withPrintDocument(
    `<section aria-label="Deliberate overflow fixture">
      <div style="width: 260mm; min-width: 260mm">Too wide for A4</div>
    </section>`,
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*printable width.*Deliberate overflow fixture/i,
      );
    },
  );
});

test("production build rejects a Learning Visual scaled below legibility", async () => {
  await withPrintDocument(
    `<style>
      .learning-visual__viewport > svg {
        width: auto !important;
        min-width: 0 !important;
        max-width: 100% !important;
      }
    </style>
    <figure class="learning-visual" aria-label="Unreadable dense visual">
      <div class="learning-visual__viewport">
        <svg width="2400" height="120" viewBox="0 0 2400 120">
          <text x="10" y="20" style="font-size: 12px">Dense label</text>
        </svg>
      </div>
    </figure>`,
    async (root) => {
      await assert.rejects(
        () => runProductionBuild(root),
        /Course "visual-course".*Learning Visual.*Unreadable dense visual.*legible/i,
      );
    },
  );
});

test("production build emits A4 portrait pages with running furniture", async () => {
  await withPrintDocument(
    `<main>
      <header style="break-after: page"><h1>Readable A4 Course</h1></header>
      <section style="break-after: page"><h2>Module page</h2></section>
      <article><h2>Lesson page</h2></article>
    </main>`,
    async (root) => {
      await runProductionBuild(root);
      const pages = await inspectPdf(
        path.join(root, "prosto-courses-visual-course.pdf"),
      );
      assert.equal(pages.length, 3);
      for (const [index, page] of pages.entries()) {
        assert.ok(
          Math.abs(page.width - 595.28) < 1.5,
          `page ${index + 1} width: ${page.width}`,
        );
        assert.ok(
          Math.abs(page.height - 841.89) < 1.5,
          `page ${index + 1} height: ${page.height}`,
        );
      }
      assert.doesNotMatch(pages[0].text, /Readable A4 Course \| Prosto\.Courses/);
      assert.ok(!pages[0].text.includes("1 / 3"));
      for (const [index, page] of pages.slice(1).entries()) {
        assert.match(page.text, /Readable A4 Course \| Prosto\.Courses/);
        assert.ok(page.text.includes(`${index + 2} / 3`));
      }
    },
  );
});

test("default production build rolls back PDFs when a Course resource fails", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "course-pdf-full-build-"));
  const contentRoot = path.join(root, "courses");
  const courseRoot = path.join(contentRoot, "accessible-images");
  const outputRoot = path.join(root, "dist");
  const lessonPath = path.join(
    courseRoot,
    "modules",
    "alt-text",
    "lessons",
    "describe-purpose.mdx",
  );
  try {
    await mkdir(contentRoot, { recursive: true });
    await cp(
      path.join(
        projectRoot,
        "tests",
        "fixtures",
        "valid-course",
        "accessible-images",
      ),
      courseRoot,
      { recursive: true },
    );
    await completeAuthoringArtifacts(courseRoot);
    const source = await readFile(lessonPath, "utf8");
    const brokenSource = source.replace(
      /\]\(data:image\/svg\+xml;base64,[^ ]+ /,
      "](/missing-course-pdf-image.svg ",
    );
    assert.notEqual(brokenSource, source, "failure fixture replaces its image");
    await writeFile(lessonPath, brokenSource);

    const result = await runDefaultProductionBuild({
      cacheRoot: path.join(root, "cache"),
      contentRoot,
      outputRoot,
    });

    assert.notEqual(result.code, 0, result.output);
    assert.match(
      result.output,
      /Course "accessible-images".*authored image.*missing-course-pdf-image\.svg/i,
    );
    const artifacts = (await readdir(outputRoot)).filter((entry) =>
      isCoursePdfArtifactName(entry),
    );
    assert.deepEqual(artifacts, []);
  } finally {
    await rm(root, { force: true, recursive: true });
  }
});
