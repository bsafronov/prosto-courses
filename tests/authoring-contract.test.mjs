import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test from "node:test";

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

const validateFixture = (name) => validateContent(fixturePath(name));

async function withChangedValidCourse(changes, run, options) {
  const root = await mkdtemp(path.join(tmpdir(), "prosto-authoring-contract-"));
  const course = path.join(root, "accessible-images");
  await cp(fixturePath("valid-course/accessible-images"), course, {
    recursive: true,
  });

  try {
    for (const [relativePath, change] of Object.entries(changes)) {
      const file = path.join(course, relativePath);
      await writeFile(file, change(await readFile(file, "utf8")));
    }
    await run(await validateContent(root, options));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("accepts the canonical Russian Course through the public contract", async () => {
  const result = await validateContent(canonicalCoursePath);
  assert.equal(result.exitCode, 0, result.output);
  assert.match(
    result.output,
    /Validated 1 Course, 1 Module, 3 Lessons, 1 Module Checkpoint, and 1 Capstone Demonstration/,
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
  const result = await validateContent(fixturePath("valid-course"), {
    validationDate: "2026-10-22",
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
        /modules\/alt-text\/lessons\/describe-purpose\.mdx: Lesson review deadline 2026-10-22 has passed/i,
      );
      assert.doesNotMatch(
        result.output,
        /index\.mdx: Course review deadline 2026-12-31 has passed/i,
      );
    },
    { validationDate: "2026-10-23" },
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
  ["duplicate-options", "unique options"],
  ["whitespace-duplicate-options", "unique options"],
  ["missing-answer", "answer"],
  ["ambiguous-answer", "exactly one option"],
  ["missing-explanation", "explanation"],
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
