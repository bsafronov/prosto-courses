import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";
import {
  completeAuthoringArtifacts,
  completeContentRootAuthoringArtifacts,
} from "./support/complete-authoring-artifacts.mjs";

const execFileAsync = promisify(execFile);
const fixturePath = (name) =>
  fileURLToPath(new URL(`fixtures/${name}`, import.meta.url));
const canonicalCoursePath = fileURLToPath(
  new URL("../src/content/courses", import.meta.url),
);

async function validateContent(
  contentPath,
  { capabilityPackManifest, validationDate } = {},
) {
  try {
    const result = await execFileAsync(
      process.execPath,
      ["scripts/validate-content.mjs", contentPath],
      {
        cwd: fileURLToPath(new URL("..", import.meta.url)),
        env: {
          ...process.env,
          ...(capabilityPackManifest
            ? { CAPABILITY_PACK_MANIFEST: capabilityPackManifest }
            : {}),
          ...(validationDate
            ? { CONTENT_VALIDATION_DATE: validationDate }
            : {}),
        },
      },
    );
    return { exitCode: 0, output: result.stdout + result.stderr };
  } catch (error) {
    return {
      exitCode: error.code,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

async function validateFixture(name, options) {
  const root = await mkdtemp(path.join(tmpdir(), "prosto-content-fixture-"));
  const content = path.join(root, "content");
  await cp(fixturePath(name), content, { recursive: true });
  try {
    await completeContentRootAuthoringArtifacts(content);
    return await validateContent(content, options);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function withChangedValidCourse(changes, run, options) {
  const root = await mkdtemp(path.join(tmpdir(), "prosto-authoring-contract-"));
  const course = path.join(root, "accessible-images");
  await cp(fixturePath("valid-course/accessible-images"), course, {
    recursive: true,
  });

  try {
    await completeAuthoringArtifacts(course);
    for (const [relativePath, change] of Object.entries(changes)) {
      const file = path.join(course, relativePath);
      await writeFile(file, change(await readFile(file, "utf8")));
    }
    await run(await validateContent(root, options));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("accepts the canonical Russian Courses through the public contract", async () => {
  const result = await validateContent(canonicalCoursePath);
  assert.equal(result.exitCode, 0, result.output);
  assert.match(
    result.output,
    /Validated 5 Courses, 24 Modules, 86 Lessons, 24 Module Checkpoints, and 5 Capstone Demonstrations/,
  );
});

test("accepts a fresh Course through the public authoring contract", async () => {
  const result = await validateFixture("valid-course");
  assert.equal(result.exitCode, 0, result.output);
  assert.match(
    result.output,
    /Validated 1 Course, 1 Module, 2 Lessons, 1 Module Checkpoint, and 1 Capstone Demonstration/,
  );
});

test("uses an injected validation date without depending on the machine clock", async () => {
  const result = await validateFixture("valid-course", {
    validationDate: "2026-08-29",
  });
  assert.equal(result.exitCode, 0, result.output);
  assert.doesNotMatch(result.output, /Content freshness warning/i);
});

test("requires a standard or high factual-risk classification in the Course Brief", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace("factualRisk: standard\n", ""),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Course Brief frontmatter factualRisk.*standard.*high/i,
      );
    },
  );
});

test("rejects Course Brief metadata that claims expert approval", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace(
          "factualRisk: standard",
          "factualRisk: standard\nexpertApproved: true",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Course Brief frontmatter does not allow an expertApproved field/i,
      );
    },
  );
});

test("warns actionably when standard factual content is stale on the injected validation date", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "reviewAfter: 2026-12-31",
          "reviewAfter: 2026-08-01",
        ),
    },
    (result) => {
      assert.equal(result.exitCode, 0, result.output);
      assert.match(result.output, /Content freshness warning/i);
      assert.match(result.output, /review deadline 2026-08-01 has passed/i);
      assert.match(
        result.output,
        /verify authoritative sources and update verifiedAt and reviewAfter/i,
      );
    },
    { validationDate: "2026-08-02" },
  );
});

test("fails publication when high factual-risk content is stale", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace("factualRisk: standard", "factualRisk: high"),
      "index.mdx": (source) =>
        source.replace(
          "reviewAfter: 2026-12-31",
          "reviewAfter: 2026-08-01",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /stale high factual-risk content/i);
      assert.match(result.output, /review deadline 2026-08-01 has passed/i);
    },
    { validationDate: "2026-08-02" },
  );
});

test("rejects a time-sensitive review deadline that does not follow factual verification", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "reviewAfter: 2026-12-31",
          "reviewAfter: 2026-07-21",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Course frontmatter freshness\.reviewAfter.*must follow verifiedAt/i,
      );
    },
  );
});

const malformedFreshnessCases = [
  {
    name: "Course factual verification date",
    change: (source) => source.replace("  verifiedAt: 2026-07-22\n", ""),
    expected: /Course frontmatter freshness.*verifiedAt/i,
  },
  {
    name: "non-date factual verification value",
    change: (source) =>
      source.replace("verifiedAt: 2026-07-22", "verifiedAt: 42"),
    expected: /Course frontmatter freshness\.verifiedAt/i,
  },
  {
    name: "time-sensitive Course review deadline",
    change: (source) => source.replace("  reviewAfter: 2026-12-31\n", ""),
    expected: /Course frontmatter freshness.*reviewAfter/i,
  },
  {
    name: "fields outside the selected freshness mode",
    change: (source) =>
      source.replace("mode: time-sensitive", "mode: stable"),
    expected: /Course frontmatter does not allow a reviewAfter field/i,
  },
  {
    name: "empty jurisdiction when jurisdiction is declared",
    change: (source) =>
      source.replace(
        "jurisdiction: Международные рекомендации по доступности",
        "jurisdiction: '   '",
      ),
    expected: /Course frontmatter freshness\.jurisdiction/i,
  },
  {
    name: "missing applicability declaration",
    change: (source) =>
      source.replace("  applicability: jurisdiction-specific\n", ""),
    expected: /Course frontmatter freshness\.applicability/i,
  },
  {
    name: "missing jurisdiction for jurisdiction-specific applicability",
    change: (source) =>
      source.replace(
        "  jurisdiction: Международные рекомендации по доступности\n",
        "",
      ),
    expected:
      /Course frontmatter freshness\.jurisdiction.*jurisdiction-specific applicability/i,
  },
  {
    name: "jurisdiction on globally applicable content",
    change: (source) =>
      source.replace(
        "applicability: jurisdiction-specific",
        "applicability: global",
      ),
    expected:
      /Course frontmatter freshness\.jurisdiction.*omitted for global applicability/i,
  },
];

for (const { name, change, expected } of malformedFreshnessCases) {
  test(`rejects malformed ${name}`, async () => {
    await withChangedValidCourse(
      { "index.mdx": change },
      (result) => {
        assert.notEqual(result.exitCode, 0);
        assert.match(result.output, expected);
      },
    );
  });
}

test("uses a stale Lesson freshness override before the Course review deadline", async () => {
  await withChangedValidCourse(
    {},
    (result) => {
      assert.equal(result.exitCode, 0, result.output);
      assert.match(result.output, /Content freshness warning/i);
      assert.match(
        result.output,
        /modules\/alt-text\/lessons\/describe-purpose\.mdx: Lesson review deadline 2026-08-29 has passed/i,
      );
      assert.doesNotMatch(
        result.output,
        /index\.mdx: Course review deadline 2026-12-31 has passed/i,
      );
    },
    { validationDate: "2026-08-30" },
  );
});

test("accepts an available Capability Pack dependency and its components", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "capabilityPacks: []",
          "capabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
      "_authoring/brief.md": (source) =>
        source.replace(
          "factualRisk: standard",
          "factualRisk: standard\ncapabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<FixtureLab runtime="fixture-runtime" service="fixture-service" />\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

test("rejects a Capability Pack not confirmed by the Course Brief", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "capabilityPacks: []",
          "capabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Course Brief must confirm Capability Pack fixture-lab version 1\.2\.0/i,
      );
    },
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

test("rejects an invented Capability Pack declared only by the Course Brief", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace(
          "factualRisk: standard",
          "factualRisk: standard\ncapabilityPacks:\n  - name: invented-pack\n    version: 1.0.0",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Capability Pack invented-pack is not available in platform manifest version 1/i,
      );
      assert.match(
        result.output,
        /Course Brief Capability Pack invented-pack version 1\.0\.0 must also be declared in Course metadata/i,
      );
    },
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

test("rejects unknown Capability Pack names", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "capabilityPacks: []",
          "capabilityPacks:\n  - name: invented-pack\n    version: 1.0.0",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Capability Pack invented-pack is not available in platform manifest version 1/i,
      );
    },
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

test("rejects unsupported Capability Pack versions", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "capabilityPacks: []",
          "capabilityPacks:\n  - name: fixture-lab\n    version: 2.0.0",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Capability Pack fixture-lab version 2\.0\.0 is unsupported; available versions: 1\.2\.0/i,
      );
    },
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

test("rejects components from an undeclared Capability Pack", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<FixtureLab prompt="Missing Course dependency" />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /FixtureLab requires Capability Pack fixture-lab version 1\.2\.0 to be declared in Course metadata/i,
      );
    },
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

test("rejects invented components", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<InventedComponent />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /InventedComponent is not a base Semantic Course Component or an available Capability Pack component/i,
      );
    },
  );
});

test("rejects runtimes and services not declared by an available dependency", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "capabilityPacks: []",
          "capabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
      "_authoring/brief.md": (source) =>
        source.replace(
          "factualRisk: standard",
          "factualRisk: standard\ncapabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<FixtureLab prompt="x > y" runtime="python" service="invented.example" />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /FixtureLab runtime python is not declared by Capability Pack fixture-lab version 1\.2\.0/i,
      );
      assert.match(
        result.output,
        /FixtureLab service invented\.example is not declared by Capability Pack fixture-lab version 1\.2\.0/i,
      );
    },
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

test("rejects spread props that can hide undeclared runtimes or services", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "capabilityPacks: []",
          "capabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
      "_authoring/brief.md": (source) =>
        source.replace(
          "factualRisk: standard",
          "factualRisk: standard\ncapabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<FixtureLab {...{ runtime: "python", service: "invented.example" }} />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /FixtureLab must use explicit static props; spread props can hide undeclared runtimes or services/i,
      );
    },
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

test("rejects a Callout meaning outside the closed semantic catalog", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Callout kind="success">This meaning is not part of the authoring contract.</Callout>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Callout kind must be one of key, info, warning, error, advanced, context/i,
      );
    },
  );
});

test("rejects authored presentation controls on Callouts", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Callout kind="info" color layout>Platform-owned presentation cannot be authored.</Callout>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Callout does not allow authored props: color, layout/i,
      );
    },
  );
});

test("rejects a Callout without meaningful content", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Callout kind="info"></Callout>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /Callout requires meaningful content/i);
    },
  );
});

test("rejects a Callout expression that renders no meaningful content", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Callout kind="info">{" "}</Callout>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /Callout requires meaningful content/i);
    },
  );
});

test("rejects a Diagram without every accessibility input", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Diagram title="Alt text workflow">\n\n\`\`\`mermaid\nflowchart LR\n  Context --> Description\n\`\`\`\n\n</Diagram>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      for (const prop of ["description", "howToRead", "takeaway"]) {
        assert.match(
          result.output,
          new RegExp(`Diagram requires a non-empty ${prop}`, "i"),
        );
      }
    },
  );
});

test("rejects raw Mermaid fences outside Diagram", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n\n\`\`\`mermaid\nflowchart LR\n  Context --> Description\n\`\`\`\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Mermaid source must be wrapped by Diagram/i,
      );
    },
  );
});

test("accepts Mermaid examples inside a Markdown fence", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n\n\`\`\`\`mdx\n\`\`\`mermaid\nflowchart LR\n  Context --> Description\n\`\`\`\n\`\`\`\`\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("requires Diagram to wrap exactly one fenced Mermaid source", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Diagram title="Alt text workflow" description="Context determines the useful description." howToRead="Read from left to right." takeaway="Describe purpose, not pixels.">\nContext --> Description\n</Diagram>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Diagram must wrap exactly one non-empty fenced Mermaid source/i,
      );
    },
  );
});

test("rejects a self-closing Diagram without Mermaid source", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Diagram title="Alt text workflow" description="Context determines the useful description." howToRead="Read from left to right." takeaway="Describe purpose, not pixels." />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Diagram must wrap exactly one non-empty fenced Mermaid source/i,
      );
    },
  );
});

test("rejects authored presentation controls on Diagrams", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Diagram title="Alt text workflow" description="Context determines the useful description." howToRead="Read from left to right." takeaway="Describe purpose, not pixels." color layout>\n\n\`\`\`mermaid\nflowchart LR\n  Context --> Description\n\`\`\`\n\n</Diagram>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Diagram does not allow authored props: color, layout/i,
      );
    },
  );
});

test("rejects invalid Mermaid syntax inside Diagram", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Diagram title="Alt text workflow" description="Context determines the useful description." howToRead="Read from left to right." takeaway="Describe purpose, not pixels.">\n\n\`\`\`mermaid\nnot-a-diagram -->\n\`\`\`\n\n</Diagram>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /Diagram contains invalid Mermaid source/i);
    },
  );
});

test("accepts every Callout meaning and an accessible Diagram", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n${["key", "info", "warning", "error", "advanced", "context"]
          .map((kind) => `<Callout kind="${kind}">${kind}</Callout>`)
          .join("\n")}\n<Diagram title="Alt text workflow" description="When x=1 and x > 0, context leads to a useful description." howToRead="Read from left to right." takeaway="Purpose determines the description.">\n  \`\`\`mermaid\n  flowchart LR\n    Context --> Description\n  \`\`\`\n</Diagram>\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("rejects a Chart without every accessibility input", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", values: [{ x: "July", y: 3 }] }]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      for (const prop of ["description", "howToRead", "takeaway"]) {
        assert.match(
          result.output,
          new RegExp(`Chart requires a non-empty ${prop}`, "i"),
        );
      }
    },
  );
});

test("rejects a Chart with missing axis units", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  description="One lesson was published in June and three in July."
  howToRead="Read months from left to right and compare bar heights."
  takeaway="Publishing increased in July."
  xAxis={{ label: "Month" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", values: [{ x: "June", y: 1 }, { x: "July", y: 3 }] }]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /Chart xAxis requires a non-empty unit/i);
    },
  );
});

test("rejects a Chart with missing provenance", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  description="One lesson was published in June and three in July."
  howToRead="Read months from left to right and compare bar heights."
  takeaway="Publishing increased in July."
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", values: [{ x: "June", y: 1 }, { x: "July", y: 3 }] }]}
  source={{ label: "Editorial report" }}
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /Chart source requires a valid http\(s\) url/i);
    },
  );
});

test("rejects malformed Chart series values", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  description="One lesson was published in June and three in July."
  howToRead="Read months from left to right and compare bar heights."
  takeaway="Publishing increased in July."
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", values: [{ x: "June", y: "one" }] }]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Chart series 1 value 1 requires a finite numeric y/i,
      );
    },
  );
});

test("rejects Chart series with inconsistent x values", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published and reviewed lessons"
  description="Published and reviewed lesson counts are compared for June and July."
  howToRead="Read months from left to right and compare each pair of values."
  takeaway="Reviews did not keep pace with publishing in July."
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Lessons", unit: "lesson" }}
  series={[
    { name: "Published", values: [{ x: "June", y: 1 }, { x: "July", y: 3 }] },
    { name: "Reviewed", values: [{ x: "June", y: 1 }, { x: "August", y: 2 }] },
  ]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Chart series 2 must use the same ordered x values as series 1/i,
      );
    },
  );
});

test("rejects authored drawing instructions on Charts", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  description="One lesson was published in June and three in July."
  howToRead="Read months from left to right and compare bar heights."
  takeaway="Publishing increased in July."
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", values: [{ x: "June", y: 1 }, { x: "July", y: 3 }] }]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
  color="red"
  chartType="line"
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Chart does not allow authored props: color, chartType/i,
      );
    },
  );
});

test("rejects Chart prop spreads that can hide drawing instructions", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  description="One lesson was published in June."
  howToRead="Read the month and its value."
  takeaway="One lesson was published."
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", values: [{ x: "June", y: 1 }] }]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
  {...{ color: "red", chartType: "line" }}
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Chart must use explicit static props; spread props can hide undeclared runtimes or services/i,
      );
    },
  );
});

test("rejects drawing instructions nested in Chart data", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  description="One lesson was published in June and three in July."
  howToRead="Read months from left to right and compare bar heights."
  takeaway="Publishing increased in July."
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", color: "red", values: [{ x: "June", y: 1 }] }]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Chart series 1 does not allow authored fields: color/i,
      );
    },
  );
});

test("rejects extra fields nested in Chart axes, values, and provenance", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  description="One lesson was published in June."
  howToRead="Read the month and its value."
  takeaway="One lesson was published."
  xAxis={{ label: "Month", unit: "month", scale: "band" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", values: [{ x: "June", y: 1, shape: "circle" }] }]}
  source={{ label: "Editorial report", url: "https://example.com/report", color: "red" }}
/>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Chart xAxis does not allow authored fields: scale/i,
      );
      assert.match(
        result.output,
        /Chart series 1 value 1 does not allow authored fields: shape/i,
      );
      assert.match(
        result.output,
        /Chart source does not allow authored fields: color/i,
      );
    },
  );
});

test("requires Chart to be self-closing with static props", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published lessons by month"
  description="One lesson was published in June."
  howToRead="Read the month and its value."
  takeaway="One lesson was published."
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Published lessons", unit: "lesson" }}
  series={[{ name: "Lessons", values: [{ x: "June", y: 1 }] }]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
>Authored drawing area</Chart>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Chart must be a self-closing component with static props/i,
      );
    },
  );
});

test("accepts an accessible sourced Chart with consistent structured series", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Chart
  title="Published and reviewed lessons"
  description="Published and reviewed lesson counts are compared for June and July."
  howToRead="Read months from left to right and compare each pair of values."
  takeaway="Reviews did not keep pace with publishing in July."
  xAxis={{ label: "Month", unit: "month" }}
  yAxis={{ label: "Lessons", unit: "lesson" }}
  series={[
    { name: "Published", values: [{ x: "June", y: 1 }, { x: "July", y: 3 }] },
    { name: "Reviewed", values: [{ x: "June", y: 1 }, { x: "July", y: 2 }] },
  ]}
  source={{ label: "Editorial report", url: "https://example.com/report" }}
/>\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("accepts sourced external and explicitly illustrative generated images", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
![External example](https://example.com/external.png '{"caption":"External example caption","source":{"label":"Example source","url":"https://example.com/source"},"license":"CC BY 4.0","origin":"external"}')
![Generated example](https://example.com/generated.png '{"caption":"Generated example caption","source":{"label":"Fixture generator"},"license":"Course-owned","origin":"generated","illustrative":true}')
`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("rejects images without accessible provenance and generated-image disclosure", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
![](https://example.com/external.png '{"caption":"External example","source":{"label":"Example source","url":"https://example.com/source"},"license":"CC BY 4.0","origin":"external"}')
![Generated example](https://example.com/generated.png '{"caption":"Generated example","source":{"label":"Fixture generator"},"license":"","origin":"generated","illustrative":false}')
![Undocumented image](https://example.com/undocumented.png)
![Reference-style image][asset]

[asset]: https://example.com/reference.png
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(result.output, /Image \d+ requires useful alternative text/i);
      assert.match(result.output, /Image \d+ requires a non-empty license/i);
      assert.match(
        result.output,
        /Image \d+ generated origin must declare illustrative: true/i,
      );
      assert.match(
        result.output,
        /Image \d+ requires JSON title metadata for caption, source, license, and origin/i,
      );
      assert.match(
        result.output,
        /Images must use the documented inline Markdown syntax with JSON title metadata/i,
      );
    },
  );
});

const solutionPracticeTask = `
<PracticeTask
  title="Draft useful alternative text"
  level="core"
  estimatedMinutes={8}
  goal="Connect the image purpose to a concise description"
  outcomes={["identify-image-purpose"]}
  constraints={["Use one sentence"]}
  criteria={["The description communicates the image purpose"]}
  hints={[
    "Start with the surrounding paragraph.",
    "Name the information the image adds.",
  ]}
>
  Draft alternative text for a chart that compares two publishing options.

  <TaskSolution
    reasoning="The description should state the comparison the chart contributes."
    alternatives={["Name the main difference before secondary details."]}
    likelyErrors={["Listing visual properties without explaining the comparison."]}
  />
</PracticeTask>
`;

const rubricPracticeTask = `
<PracticeTask
  title="Review an image description"
  level="challenge"
  estimatedMinutes={10}
  goal="Judge whether alternative text preserves meaning without redundancy"
  outcomes={["write-concise-alt-text"]}
  criteria={["The review identifies useful meaning and removable wording"]}
>
  Review a proposed image description and explain what you would retain or remove.

  <TaskRubric
    criteria={[
      {
        "criterion": "Useful meaning is preserved",
        "evidence": "The review identifies the information a screen-reader user needs",
      },
      {
        "criterion": "Redundancy is removed",
        "evidence": "The revision omits phrases already announced by assistive technology",
      },
    ]}
  />
</PracticeTask>
`;

test("accepts optional stable interaction IDs", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source.replace(
          "<KnowledgeCheck\n",
          '<KnowledgeCheck\n  id="identify-image-purpose"\n',
        ),
      "modules/alt-text/lessons/edit-for-clarity.mdx": (source) =>
        source.replace(
          "<PracticeTask\n",
          '<PracticeTask\n  id="polish-description"\n',
        ),
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("rejects malformed stable interaction IDs at the authored component", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source.replace(
          "<KnowledgeCheck\n",
          '<KnowledgeCheck\n  id="Identify image purpose"\n',
        ),
      "modules/alt-text/lessons/edit-for-clarity.mdx": (source) =>
        source.replace(
          "<PracticeTask\n",
          '<PracticeTask\n  id="polish_description"\n',
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /describe-purpose\.mdx: Knowledge Check 1 id must use a stable lowercase-hyphen form/i,
      );
      assert.match(
        result.output,
        /edit-for-clarity\.mdx: Practice Task 1 id must use a stable lowercase-hyphen form/i,
      );
    },
  );
});

test("rejects duplicate interaction IDs within one authored destination", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/edit-for-clarity.mdx": (source) =>
        source
          .replace(
            "<KnowledgeCheck\n",
            '<KnowledgeCheck\n  id="concise-alt-text"\n',
          )
          .replace(
            "<PracticeTask\n",
            '<PracticeTask\n  id="concise-alt-text"\n',
          ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /edit-for-clarity\.mdx: Practice Task 1 id concise-alt-text duplicates Knowledge Check 1 in this authored destination/i,
      );
    },
  );
});

test("accepts valid solution and Self-Assessment Practice Tasks", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n${solutionPracticeTask}`,
      "modules/alt-text/lessons/edit-for-clarity.mdx": (source) =>
        `${source}\n${rubricPracticeTask}`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("requires the complete Practice Task contract and a learner prompt", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<PracticeTask><TaskSolution /></PracticeTask>\n${rubricPracticeTask}`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      for (const expected of [
        /Practice Task 1 requires a non-empty title/i,
        /Practice Task 1 level must be core, challenge, or stretch/i,
        /Practice Task 1 estimatedMinutes must be a positive integer/i,
        /Practice Task 1 requires a non-empty goal/i,
        /Practice Task 1 must support at least one Course Learning Outcome/i,
        /Practice Task 1 criteria must be a non-empty array of non-empty strings/i,
        /Practice Task 1 requires a meaningful learner prompt/i,
      ]) {
        assert.match(result.output, expected);
      }
    },
  );
});

test("rejects invalid Practice Task values and presentation controls", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n${solutionPracticeTask
          .replace('level="core"', 'level="expert"')
          .replace("estimatedMinutes={8}", "estimatedMinutes={0}")
          .replace(
            'constraints={["Use one sentence"]}',
            'constraints={["Use one sentence", "   "]}',
          )
          .replace('criteria={["The description communicates the image purpose"]}', "criteria={[]}")
          .replace('title="Draft useful alternative text"', 'title="Draft useful alternative text" timer score={10}')}
${rubricPracticeTask}`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Practice Task 1 does not allow authored props: timer, score/i,
      );
      assert.match(
        result.output,
        /Practice Task 1 level must be core, challenge, or stretch/i,
      );
      assert.match(
        result.output,
        /Practice Task 1 estimatedMinutes must be a positive integer/i,
      );
      assert.match(
        result.output,
        /Practice Task 1 constraints must be a non-empty array of non-empty strings/i,
      );
      assert.match(
        result.output,
        /Practice Task 1 criteria must be a non-empty array of non-empty strings/i,
      );
    },
  );
});

test("rejects malformed Practice Task feedback nesting", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<TaskSolution reasoning="Outside" alternatives={["Another route"]} likelyErrors={["A likely error"]} />
<PracticeTask title="No feedback" level="core" estimatedMinutes={5} goal="Try" outcomes={["identify-image-purpose"]} criteria={["Evidence"]}>
  Attempt the work without feedback.
</PracticeTask>
<PracticeTask title="Two feedback types" level="core" estimatedMinutes={5} goal="Try" outcomes={["identify-image-purpose"]} criteria={["Evidence"]}>
  Attempt the work.
  <TaskSolution reasoning="Reasoning" alternatives={["Another route"]} likelyErrors={["A likely error"]} />
  <TaskRubric criteria={[{"criterion":"Evidence","evidence":"Observable work"}]} />
</PracticeTask>
<PracticeTask title="Commented feedback" level="core" estimatedMinutes={5} goal="Try" outcomes={["identify-image-purpose"]} criteria={["Evidence"]}>
  Attempt the work.
  {/* <TaskSolution reasoning="Not rendered" alternatives={["Not rendered"]} likelyErrors={["Not rendered"]} /> */}
</PracticeTask>
${rubricPracticeTask}`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /TaskSolution must be nested directly inside a Practice Task/i,
      );
      assert.match(
        result.output,
        /Practice Task 1 must contain exactly one TaskSolution or TaskRubric/i,
      );
      assert.match(
        result.output,
        /Practice Task 2 must contain exactly one TaskSolution or TaskRubric/i,
      );
      assert.match(
        result.output,
        /Practice Task 3 must contain exactly one TaskSolution or TaskRubric/i,
      );
    },
  );
});

test("requires reasoned Task Solutions with alternatives and likely errors", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n${solutionPracticeTask
          .replace(
            'reasoning="The description should state the comparison the chart contributes."',
            'reasoning="   "',
          )
          .replace(
            'alternatives={["Name the main difference before secondary details."]}',
            "alternatives={[]}",
          )
          .replace(
            'likelyErrors={["Listing visual properties without explaining the comparison."]}',
            'likelyErrors={["   "]} score={10}',
          )}
${rubricPracticeTask}`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Task Solution 1 requires non-empty reasoning/i,
      );
      assert.match(
        result.output,
        /Task Solution 1 alternatives must be a non-empty array of non-empty strings/i,
      );
      assert.match(
        result.output,
        /Task Solution 1 likelyErrors must be a non-empty array of non-empty strings/i,
      );
      assert.match(
        result.output,
        /Task Solution 1 does not allow authored props: score/i,
      );
    },
  );
});

test("requires observable, unscored Task Rubric evidence", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n${solutionPracticeTask}
${rubricPracticeTask.replace(
  '"evidence": "The review identifies the information a screen-reader user needs",',
  '"evidence": "   ", "score": 10,',
)}`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Task Rubric 1 criteria must contain only non-empty criterion and observable evidence/i,
      );
      assert.match(
        result.output,
        /Task Rubric 1 must not use objective score fields/i,
      );
    },
  );
});

test("rejects duplicate and unknown Practice Task Outcome references", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n${solutionPracticeTask.replace(
          'outcomes={["identify-image-purpose"]}',
          'outcomes={["identify-image-purpose", "identify-image-purpose", "missing-outcome"]}',
        )}
${rubricPracticeTask}`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Practice Task 1 has duplicate Learning Outcome ID identify-image-purpose/i,
      );
      assert.match(
        result.output,
        /Practice Task 1 references unknown Course Learning Outcome ID missing-outcome/i,
      );
    },
  );
});

test("requires every Course Learning Outcome to be practiced", async () => {
  await withChangedValidCourse(
    {
      "capstone.mdx": (source) =>
        source.replace(
          'outcomes={["identify-image-purpose", "write-concise-alt-text"]}',
          'outcomes={["identify-image-purpose"]}',
        ),
      "modules/alt-text/lessons/edit-for-clarity.mdx": (source) =>
        source.replace(/\n<PracticeTask[\s\S]*?<\/PracticeTask>\n?/, "\n"),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Learning Outcome write-concise-alt-text is not practiced by any Practice Task/i,
      );
    },
  );
});

test("rejects a Reflection without a prompt", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Reflection outcomes={["identify-image-purpose"]} />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /describe-purpose\.mdx: Reflection 1 requires a non-empty prompt/i,
      );
    },
  );
});

test("rejects a Reflection without Learning Outcome references", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Reflection prompt="What changed in your mental model?" />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /describe-purpose\.mdx: Reflection 1 must support at least one Course Learning Outcome/i,
      );
    },
  );
});

test("rejects answer-bearing Reflection props", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Reflection prompt="What changed in your mental model?" outcomes={["identify-image-purpose"]} answer="Decorative images need empty alt text" />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /describe-purpose\.mdx: Reflection 1 does not allow authored props: answer/i,
      );
    },
  );
});

test("rejects malformed Reflection guidance", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Reflection prompt="What changed in your mental model?" outcomes={["identify-image-purpose"]} guidance={["Name the assumption", "   "]} />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /describe-purpose\.mdx: Reflection 1 guidance must be a non-empty array of non-empty strings/i,
      );
    },
  );
});

test("rejects nested Reflection content", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Reflection prompt="What changed in your mental model?" outcomes={["identify-image-purpose"]}>A suggested answer.</Reflection>\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /describe-purpose\.mdx: Reflection 1 must be a self-closing component with static props/i,
      );
    },
  );
});

test("rejects duplicate Reflection prompts", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Reflection prompt="What changed?" prompt="What will you do next?" outcomes={["identify-image-purpose"]} />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /describe-purpose\.mdx: Reflection 1 must declare prompt exactly once/i,
      );
    },
  );
});

test("accepts a Reflection with aligned guidance", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Reflection prompt="What changed in your mental model?" outcomes={["identify-image-purpose"]} guidance={["Name your initial assumption", "Describe the evidence that changed it"]} />\n`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("rejects duplicate and unknown Reflection Outcome references", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}\n<Reflection prompt="What changed in your mental model?" outcomes={["identify-image-purpose", "identify-image-purpose", "missing-outcome"]} />\n`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Reflection 1 has duplicate Learning Outcome ID identify-image-purpose/i,
      );
      assert.match(
        result.output,
        /Reflection 1 references unknown Course Learning Outcome ID missing-outcome/i,
      );
    },
  );
});

test("rejects a Course Learning Outcome that no Lesson teaches", async () => {
  const result = await validateFixture("untaught-outcome");
  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.output,
    /course\/index\.mdx: Learning Outcome untaught-outcome is not taught by any Lesson/i,
  );
});

test("rejects a taught outcome omitted by its Module Checkpoint", async () => {
  const result = await validateFixture("outcome-missing-from-checkpoint");
  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.output,
    /modules\/module\/checkpoint\.mdx: Module Checkpoint does not cover taught Learning Outcome unchecked-outcome/i,
  );
});

test("rejects a Course Learning Outcome omitted by Capstone criteria", async () => {
  const result = await validateFixture(
    "outcome-missing-from-capstone-criteria",
  );
  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.output,
    /capstone\.mdx: Learning Outcome undemonstrated-outcome is not demonstrated by any Capstone criterion/i,
  );
});

test("rejects a Course Learning Outcome omitted by Capstone metadata", async () => {
  const result = await validateFixture("outcome-missing-from-capstone");
  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.output,
    /capstone\.mdx: Capstone Demonstration does not support Learning Outcome omitted-capstone-outcome/i,
  );
});

test("rejects duplicate outcome declarations and references at their authored sources", async () => {
  const result = await validateFixture("duplicate-course-outcome");
  assert.notEqual(result.exitCode, 0);
  for (const expectedMessage of [
    /course\/index\.mdx: duplicate Course Learning Outcome ID shared-outcome/i,
    /modules\/module\/index\.mdx: Module has duplicate Learning Outcome ID shared-outcome/i,
    /checkpoint\.mdx: Module Checkpoint has duplicate Learning Outcome ID shared-outcome/i,
    /lesson\.mdx: Lesson has duplicate Learning Outcome ID shared-outcome/i,
    /capstone\.mdx: Capstone Demonstration has duplicate Learning Outcome ID shared-outcome/i,
    /capstone\.mdx: Capstone criterion 1 has duplicate Learning Outcome ID shared-outcome/i,
  ]) {
    assert.match(result.output, expectedMessage);
  }
});

test("rejects unknown outcome references at every authored source", async () => {
  const result = await validateFixture("unknown-lesson-outcome");
  assert.notEqual(result.exitCode, 0);
  for (const expectedMessage of [
    /modules\/module\/index\.mdx: Module references unknown Course Learning Outcome ID missing-module-outcome/i,
    /checkpoint\.mdx: Module Checkpoint references unknown Course Learning Outcome ID missing-checkpoint-outcome/i,
    /lesson\.mdx: Lesson references unknown Course Learning Outcome ID missing-lesson-outcome/i,
    /capstone\.mdx: Capstone Demonstration references unknown Course Learning Outcome ID missing-capstone-outcome/i,
    /capstone\.mdx: Capstone criterion 1 references unknown Course Learning Outcome ID missing-criterion-outcome/i,
  ]) {
    assert.match(result.output, expectedMessage);
  }
});

test("rejects learner-facing Course parts without outcome references", async () => {
  const result = await validateFixture("unaligned-lesson");
  assert.notEqual(result.exitCode, 0);
  for (const expectedMessage of [
    /modules\/module\/index\.mdx: Module must support at least one Course Learning Outcome/i,
    /checkpoint\.mdx: Module Checkpoint must support at least one Course Learning Outcome/i,
    /lesson\.mdx: Lesson must support at least one Course Learning Outcome/i,
    /capstone\.mdx: Capstone Demonstration must support at least one Course Learning Outcome/i,
    /capstone\.mdx: Capstone criterion 1 must support at least one Course Learning Outcome/i,
  ]) {
    assert.match(result.output, expectedMessage);
  }
});

test("reports a missing Module Checkpoint at its authored path", async () => {
  const result = await validateFixture("missing-checkpoint-source");
  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.output,
    /modules\/module\/checkpoint\.mdx: Module Checkpoint source is required/i,
  );
  assert.match(
    result.output,
    /modules\/module\/checkpoint\.mdx: Module Checkpoint must support at least one Course Learning Outcome/i,
  );
});

test("rejects the legacy flat Course and Lesson structure", async () => {
  const result = await validateFixture("legacy-course");
  assert.notEqual(result.exitCode, 0);
  assert.match(
    result.output,
    /legacy flat Course\/Lesson structure is not supported/i,
  );
});

test("rejects Course metadata that the strict collection cannot load", async () => {
  const result = await validateFixture("missing-course-metadata");
  assert.notEqual(result.exitCode, 0);
  assert.match(result.output, /learnerProfile/i);
});

test("rejects Lesson metadata that the strict collection cannot load", async () => {
  const result = await validateFixture("missing-lesson-metadata");
  assert.notEqual(result.exitCode, 0);
  assert.match(result.output, /revision/i);
});

test("rejects a non-positive Content Revision", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source.replace("revision: 1", "revision: 0"),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Lesson frontmatter revision.*(?:greater than|>)\s*0/i,
      );
    },
  );
});

test("rejects authored counts, positions, links, and duration totals", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "capabilityPacks: []",
          "capabilityPacks: []\nmoduleCount: 1\nlessonCount: 2\ntotalTime: 70",
        ),
      "modules/alt-text/index.mdx": (source) =>
        source.replace(
          "order: 1",
          "order: 1\nlessonCount: 2\ntotalTime: 50\nhref: /modules/alt-text",
        ),
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source.replace(
          "revision: 1",
          "revision: 1\nposition: 1\nhref: /lessons/describe-purpose",
        ),
    },
    async (result) => {
      assert.notEqual(result.exitCode, 0);
      for (const field of [
        "moduleCount",
        "lessonCount",
        "totalTime",
        "position",
        "href",
      ]) {
        assert.match(
          result.output,
          new RegExp(`does not allow a ${field} field`, "i"),
        );
      }
    },
  );
});

test("rejects malformed promise, capability, outcome, and workload metadata", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source
          .replace(
            "learnerProfile: Writers who publish image-supported learning material and know basic HTML semantics.",
            "learnerProfile: '   '",
          )
          .replace("id: identify-image-purpose", "id: Invalid Outcome ID"),
      "modules/alt-text/index.mdx": (source) =>
        source.replace(
          "capability: Write useful alternative text for an image in context",
          "capability: ''",
        ),
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source.replace("study: 5", "study: -1"),
    },
    async (result) => {
      assert.notEqual(result.exitCode, 0);
      for (const expectedMessage of [
        /Course frontmatter learnerProfile/i,
        /Course frontmatter outcomes\.0\.id/i,
        /Module frontmatter capability/i,
        /Lesson frontmatter time\.study/i,
      ]) {
        assert.match(result.output, expectedMessage);
      }
    },
  );
});

test("rejects legacy display-string choice Knowledge Checks", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source
          .replace('  type="single"\n', "")
          .replace('  outcomes={["identify-image-purpose"]}\n', "")
          .replace(
            /  options=\{\[[\s\S]*?\]\}\n  answer="purpose-in-context"/,
            '  options={["Its file name", "Its purpose in context"]}\n  answer="Its purpose in context"',
          ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check 1 type must be one of single, multiple, matching, ordering, exact, or numeric/i,
      );
      assert.match(
        result.output,
        /Knowledge Check 1 must support at least one Course Learning Outcome/i,
      );
      assert.match(
        result.output,
        /Knowledge Check 1 options must be a static array of at least two option objects/i,
      );
    },
  );
});

test("rejects malformed and duplicate Knowledge Check option IDs", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source
          .replace('id: "file-name"', 'id: "Its file name"')
          .replace('id: "pixel-dimensions"', 'id: "purpose-in-context"'),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check 1 option 1 id must use a stable lowercase-hyphen form/i,
      );
      assert.match(
        result.output,
        /Knowledge Check 1 option 3 id purpose-in-context must be unique/i,
      );
    },
  );
});

test("requires learner-facing text and response-specific feedback for every choice", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source
          .replace('text: "Its file name"', 'text: "   "')
          .replace(
            'feedback: "Pixel dimensions describe the file, not the meaning the image contributes."',
            'feedback: "   "',
          ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check 1 option 1 requires non-empty learner-facing text/i,
      );
      assert.match(
        result.output,
        /Knowledge Check 1 option 3 requires non-empty response-specific feedback/i,
      );
    },
  );
});

test("rejects single-choice answers that do not reference one option ID", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source.replace(
          'answer="purpose-in-context"',
          'answer="Its purpose in context"',
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check 1 single answer must reference exactly one option ID/i,
      );
    },
  );
});

test("rejects duplicate and unknown multiple-choice answer IDs", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/edit-for-clarity.mdx": (source) =>
        source.replace(
          'answer={["remove-image-of", "keep-warning"]}',
          'answer={["remove-image-of", "remove-image-of", "missing-option"]}',
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check 1 multiple answer must contain unique option IDs/i,
      );
      assert.match(
        result.output,
        /Knowledge Check 1 multiple answer references unknown option ID missing-option/i,
      );
    },
  );
});

test("accepts matching Knowledge Checks with stable pairs and feedback", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="matching"
  prompt="Match each accessibility input to its purpose."
  outcomes={["identify-image-purpose"]}
  pairs={[
    {
      id: "surrounding-context",
      left: "Surrounding context",
      right: "Identifies the information the image contributes",
      feedback: "Context determines the image's purpose.",
    },
    {
      id: "alternative-text",
      left: "Alternative text",
      right: "Communicates that information without the image",
      feedback: "Alternative text provides an equivalent route to the information.",
    },
  ]}
  explanation="Useful alternative text follows from the image's purpose in context."
/>
`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("rejects duplicate IDs and malformed matching pairs", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="matching"
  prompt="Match each accessibility input to its purpose."
  outcomes={["identify-image-purpose"]}
  pairs={[
    {
      id: "context",
      left: "Surrounding context",
      right: "",
      feedback: "Context determines the image's purpose.",
    },
    {
      id: "context",
      left: "Alternative text",
      feedback: "",
    },
  ]}
  explanation="Useful alternative text follows from the image's purpose in context."
/>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check \d+ pair 1 requires a non-empty right value/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ pair 2 id context must be unique/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ pair 2 requires non-empty response-specific feedback/i,
      );
    },
  );
});

test("accepts ordering Knowledge Checks whose items declare the correct order", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="ordering"
  prompt="Put the description workflow in order."
  outcomes={["identify-image-purpose"]}
  items={[
    { id: "inspect-context", text: "Inspect the surrounding context" },
    { id: "identify-purpose", text: "Identify the image's purpose" },
    { id: "write-equivalent", text: "Write an equivalent description" },
  ]}
  explanation="Context and purpose come before wording."
/>
`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("rejects malformed and duplicate ordering items", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="ordering"
  prompt="Put the description workflow in order."
  outcomes={["identify-image-purpose"]}
  items={[
    { id: "step", text: "Inspect the surrounding context", position: 1 },
    { id: "step", text: "   " },
  ]}
  explanation="Context and purpose come before wording."
/>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check \d+ item 1 does not allow authored fields: position/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ item 2 id step must be unique/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ item 2 requires non-empty learner-facing text/i,
      );
    },
  );
});

test("rejects ambiguous matching values and ordering text", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="matching"
  prompt="Match each input."
  outcomes={["identify-image-purpose"]}
  pairs={[
    { id: "first", left: "Context", right: "Purpose", feedback: "First." },
    { id: "second", left: "Context ", right: "Purpose ", feedback: "Second." },
  ]}
  explanation="Each side must identify one unambiguous pair."
/>
<KnowledgeCheck
  type="ordering"
  prompt="Put the steps in order."
  outcomes={["identify-image-purpose"]}
  items={[
    { id: "first-step", text: "Inspect context" },
    { id: "second-step", text: "Inspect context " },
  ]}
  explanation="Each position must have one distinguishable item."
/>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check \d+ pair 2 left value must be unique/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ pair 2 right value must be unique/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ item 2 learner-facing text must be unique/i,
      );
    },
  );
});

test("accepts exact Knowledge Checks with explicit trimming and case normalization", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="exact"
  prompt="Name the text alternative attribute."
  outcomes={["identify-image-purpose"]}
  acceptedAnswers={["alt", "alt attribute"]}
  normalization={{ trim: true, case: "insensitive" }}
  explanation="HTML images use the alt attribute for their text alternative."
/>
`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("rejects invalid or ambiguous exact-answer normalization", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="exact"
  prompt="Name the text alternative attribute."
  outcomes={["identify-image-purpose"]}
  acceptedAnswers={["ALT", " alt "]}
  normalization={{ trim: true, case: "fold", locale: "en" }}
  explanation="HTML images use the alt attribute for their text alternative."
/>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check \d+ normalization does not allow authored fields: locale/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ normalization case must be sensitive or insensitive/i,
      );
    },
  );

  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="exact"
  prompt="Name the text alternative attribute."
  outcomes={["identify-image-purpose"]}
  acceptedAnswers={["ALT", " alt "]}
  normalization={{ trim: true, case: "insensitive" }}
  explanation="HTML images use the alt attribute for their text alternative."
/>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check \d+ acceptedAnswers become ambiguous after normalization/i,
      );
    },
  );
});

test("accepts numeric Knowledge Checks with explicit tolerance and unit", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="numeric"
  prompt="How many characters are in the alt attribute name?"
  outcomes={["identify-image-purpose"]}
  answer={3}
  tolerance={0}
  unit="characters"
  explanation="The attribute name is written as three characters: alt."
/>
`,
    },
    (result) => assert.equal(result.exitCode, 0, result.output),
  );
});

test("rejects invalid numeric answers, tolerance, and units", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="numeric"
  prompt="How many characters are in the alt attribute name?"
  outcomes={["identify-image-purpose"]}
  answer="3"
  tolerance={-1}
  unit={3}
  explanation="The attribute name is written as three characters: alt."
/>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check \d+ numeric answer must be a finite number/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ tolerance must be a finite non-negative number/i,
      );
      assert.match(
        result.output,
        /Knowledge Check \d+ unit must be a non-empty static string when declared/i,
      );
    },
  );
});

test("rejects response props from another Knowledge Check type", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<KnowledgeCheck
  type="exact"
  prompt="Name the text alternative attribute."
  outcomes={["identify-image-purpose"]}
  acceptedAnswers={["alt"]}
  normalization={{ trim: true, case: "insensitive" }}
  options={[]}
  answer="alt"
  explanation="HTML images use the alt attribute."
/>
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check \d+ does not allow authored props: options, answer/i,
      );
    },
  );
});

test("rejects duplicate and unknown Knowledge Check Outcome references", async () => {
  await withChangedValidCourse(
    {
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        source.replace(
          'outcomes={["identify-image-purpose"]}',
          'outcomes={["identify-image-purpose", "identify-image-purpose", "missing-outcome"]}',
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Knowledge Check 1 has duplicate Learning Outcome ID identify-image-purpose/i,
      );
      assert.match(
        result.output,
        /Knowledge Check 1 references unknown Course Learning Outcome ID missing-outcome/i,
      );
    },
  );
});

const fencedExamples = [
  ["fenced-import-example", "import"],
  ["fenced-knowledge-check-example", "Knowledge Check"],
];

for (const [fixture, example] of fencedExamples) {
  test(`accepts ${example} examples inside Markdown fences`, async () => {
    const result = await validateFixture(fixture);
    assert.equal(result.exitCode, 0, result.output);
  });
}

test("requires versioned, ready, structurally complete authoring artifacts", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) => source.replace("Version 1.", ""),
      "_authoring/blueprint.md": (source) =>
        source.replace("## Outcome Alignment", "## Alignment"),
      "_authoring/quality-report.md": (source) =>
        source.replace("## Remaining limitations", "## Limitations"),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Course Brief must declare a positive Version/i,
      );
      assert.match(
        result.output,
        /Course Blueprint requires an Outcome Alignment section/i,
      );
      assert.match(
        result.output,
        /quality report requires a Remaining limitations section/i,
      );
    },
  );
});

test("rejects empty artifact sections and ignores headings inside examples", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace(
          "## Scope\n\nLimited to the one validator behavior named by the fixture.",
          "## Scope",
        ),
      "_authoring/blueprint.md": (source) =>
        `${source.replace("## Outcome Alignment", "## Alignment")}

\`\`\`md
## Outcome Alignment

Example content is not a valid Blueprint section.
\`\`\`
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Course Brief Scope section must not be empty/i,
      );
      assert.match(
        result.output,
        /Course Blueprint requires an Outcome Alignment section/i,
      );
    },
  );
});

test("rejects negated or pending delegated-authoring statuses", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace(
          "Статус: замысел зафиксирован; делегированное создание курса активно",
          "Статус: замысел не зафиксирован; делегированное создание курса активно",
        ),
      "_authoring/blueprint.md": (source) =>
        source.replace(
          "Статус: проект курса проверен; делегированное создание курса активно",
          "Статус: проект курса не проверен; делегированное создание курса активно",
        ),
      "_authoring/quality-report.md": (source) =>
        source.replace(
          "Статус: независимый ИИ-аудит завершён; критических и существенных замечаний нет",
          "Статус: независимый ИИ-аудит ожидает запуска",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /brief\.md: Course Brief must record a ready delegated-authoring or legacy Course Owner status/i,
      );
      assert.match(
        result.output,
        /blueprint\.md: Course Blueprint must record a ready delegated-authoring or legacy Course Owner status/i,
      );
      assert.match(
        result.output,
        /quality-report\.md: quality report must record a ready delegated-authoring or legacy Course Owner status/i,
      );
    },
  );
});

test("rejects Authoring Agent self-approval as an artifact status", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace(
          "Статус: замысел зафиксирован; делегированное создание курса активно",
          "Status: approved by Authoring Agent.",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /brief\.md: Course Brief must record a ready delegated-authoring or legacy Course Owner status/i,
      );
    },
  );
});

test("accepts legacy Course Owner approval statuses", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace(
          "Статус: замысел зафиксирован; делегированное создание курса активно",
          "Status: approved by Course Owner for legacy contract use.",
        ),
      "_authoring/blueprint.md": (source) =>
        source.replace(
          "Статус: проект курса проверен; делегированное создание курса активно",
          "Status: approved by Course Owner for legacy contract use.",
        ),
      "_authoring/quality-report.md": (source) =>
        source.replace(
          "Статус: независимый ИИ-аудит завершён; критических и существенных замечаний нет",
          "Status: approved by Course Owner for legacy contract use.",
        ),
    },
    (result) => {
      assert.equal(result.exitCode, 0, result.output);
    },
  );
});

test("requires a recorded Independent Course Audit for delegated release", async () => {
  await withChangedValidCourse(
    {
      "_authoring/quality-report.md": (source) =>
        source.replace(
          "## Independent Course Audit",
          "## Secondary review",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /delegated quality report requires a non-empty Independent Course Audit section/i,
      );
    },
  );
});

test("requires high factual-risk quality reports to disclose missing expert review", async () => {
  await withChangedValidCourse(
    {
      "_authoring/brief.md": (source) =>
        source.replace("factualRisk: standard", "factualRisk: high"),
      "_authoring/quality-report.md": (source) =>
        source.replace(
          "No independent expert review was performed.",
          "No limitations remain. Independent expert review was performed.",
        ),
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /high factual-risk quality report must disclose the absence of independent expert review/i,
      );
    },
  );
});

test("rejects raw HTML and authored presentation or runtime controls", async () => {
  await withChangedValidCourse(
    {
      "index.mdx": (source) =>
        source.replace(
          "capabilityPacks: []",
          "capabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
      "_authoring/brief.md": (source) =>
        source.replace(
          "factualRisk: standard",
          "factualRisk: standard\ncapabilityPacks:\n  - name: fixture-lab\n    version: 1.2.0",
        ),
      "modules/alt-text/lessons/describe-purpose.mdx": (source) =>
        `${source}
<sCrIpT src="/authored-runtime.js"></sCrIpT>
<details><summary>Authored disclosure</summary>Hidden prose</details>
<FixtureLab class="authored-layout" onClick={() => alert("runtime")} onclick="runtime()" ondblclick="runtime()" oncontextmenu="runtime()" oncopy="runtime()" ondragstart="runtime()" on:click={() => alert("directive")} client:load />
`,
    },
    (result) => {
      assert.notEqual(result.exitCode, 0);
      assert.match(
        result.output,
        /Course content must not author raw HTML elements: script, details, summary/i,
      );
      assert.match(
        result.output,
        /FixtureLab must not author presentation or runtime props: class, onClick, onclick, ondblclick, oncontextmenu, oncopy, ondragstart, on:click, client:load/i,
      );
    },
    { capabilityPackManifest: fixturePath("capability-packs.json") },
  );
});

const invalidFixtures = [
  ["duplicate-module-order", "duplicate Module order 1"],
  [
    "module-order-gap",
    "Module order must be unique and contiguous starting at 1",
  ],
  [
    "duplicate-lesson-slug",
    "Lesson slug shared-lesson collides across the Course",
  ],
  [
    "missing-authoring-artifact",
    "quality report at _authoring/quality-report.md",
  ],
  ["missing-course-metadata", "summary"],
  ["missing-lesson-metadata", "title"],
  ["orphan-lesson", "must belong to a Course Module"],
  ["misplaced-lesson", "must follow the target Course tree"],
  ["empty-course", "at least one Lesson"],
  ["duplicate-order", "duplicate Lesson order 1"],
  ["order-gap", "contiguous starting at 1"],
  ["missing-order", "requires an order"],
  ["non-integer-order", "must be an integer"],
  ["non-positive-order", "must be positive"],
  ["presentation-import", "must not import presentation"],
  ["layout-selection", "must not select a layout"],
  ["invalid-language", "does not allow a language field"],
];

for (const [fixture, expectedMessage] of invalidFixtures) {
  test(`rejects ${fixture.replaceAll("-", " ")}`, async () => {
    const result = await validateFixture(fixture);
    assert.notEqual(result.exitCode, 0);
    assert.match(result.output, new RegExp(expectedMessage, "i"));
  });
}
