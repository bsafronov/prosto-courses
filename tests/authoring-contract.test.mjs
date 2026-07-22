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

async function validateContent(contentPath) {
  try {
    const result = await execFileAsync(
      process.execPath,
      ["scripts/validate-content.mjs", contentPath],
      { cwd: fileURLToPath(new URL("..", import.meta.url)) },
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

async function withChangedValidCourse(changes, run) {
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
    await run(await validateContent(root));
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
  const result = await validateFixture("outcome-missing-from-capstone-criteria");
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
  assert.match(result.output, /legacy flat Course\/Lesson structure is not supported/i);
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
  ["module-order-gap", "Module order must be unique and contiguous starting at 1"],
  ["duplicate-lesson-slug", "Lesson slug shared-lesson collides across the Course"],
  ["missing-authoring-artifact", "quality report at _authoring/quality-report.md"],
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
