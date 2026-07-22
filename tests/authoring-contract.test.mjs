import assert from "node:assert/strict";
import { execFile } from "node:child_process";
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

test("rejects the legacy flat Course and Lesson structure", async () => {
  const result = await validateFixture("legacy-course");
  assert.notEqual(result.exitCode, 0);
  assert.match(result.output, /legacy flat Course\/Lesson structure is not supported/i);
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
