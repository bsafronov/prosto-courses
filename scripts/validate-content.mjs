import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { isSupportedLanguage } from "./content-contract.mjs";

const contentRoot = path.resolve(process.argv[2] ?? "src/content/courses");
const errors = [];
let lessonCount = 0;

function report(file, message) {
  errors.push(`${path.relative(process.cwd(), file)}: ${message}`);
}

function requiredString(data, field, file, owner) {
  if (typeof data[field] !== "string" || data[field].trim() === "") {
    report(file, `${owner} frontmatter requires a non-empty ${field}`);
  }
}

function stringAttribute(source, name) {
  const match = source.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "s"));
  return match?.[2];
}

function validateKnowledgeChecks(body, file) {
  const openingTags = [...body.matchAll(/<KnowledgeCheck\b([\s\S]*?)\/>/g)];
  const mentions = [...body.matchAll(/<KnowledgeCheck\b/g)];

  if (openingTags.length !== mentions.length) {
    report(file, "Knowledge Check must be a self-closing component with static props");
  }

  for (const [index, match] of openingTags.entries()) {
    const source = match[1];
    const label = `Knowledge Check ${index + 1}`;
    const prompt = stringAttribute(source, "prompt");
    const answer = stringAttribute(source, "answer");
    const explanation = stringAttribute(source, "explanation");
    const optionsMatch = source.match(/\boptions\s*=\s*\{\s*(\[[\s\S]*?\])\s*\}/);

    if (!prompt?.trim()) report(file, `${label} requires a non-empty prompt`);
    if (!answer?.trim()) report(file, `${label} requires a non-empty answer`);
    if (!explanation?.trim()) {
      report(file, `${label} requires a non-empty explanation`);
    }
    if (!optionsMatch) {
      report(file, `${label} requires an options array of strings`);
      continue;
    }

    let options;
    try {
      options = JSON.parse(optionsMatch[1]);
    } catch {
      report(file, `${label} options must be a JSON array of strings`);
      continue;
    }

    if (
      !Array.isArray(options) ||
      options.length < 2 ||
      options.some((option) => typeof option !== "string" || option.trim() === "")
    ) {
      report(file, `${label} requires at least two non-empty string options`);
      continue;
    }

    if (new Set(options).size !== options.length) {
      report(file, `${label} requires unique options`);
    }
    if (answer && options.filter((option) => option === answer).length !== 1) {
      report(file, `${label} answer must match exactly one option`);
    }
  }
}

function withoutFencedCode(body) {
  const authoringLines = [];
  let fence;

  for (const line of body.split("\n")) {
    if (!fence) {
      const opening = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (opening) {
        fence = { marker: opening[1][0], length: opening[1].length };
      } else {
        authoringLines.push(line);
      }
      continue;
    }

    const closing = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
    if (
      closing &&
      closing[1][0] === fence.marker &&
      closing[1].length >= fence.length
    ) {
      fence = undefined;
    }
  }

  return authoringLines.join("\n");
}

function validateAuthoringBoundary(body, file) {
  const authoringSource = withoutFencedCode(body);
  if (/^\s*(?:import|export)\b/m.test(authoringSource)) {
    report(file, "Course content must not import presentation modules");
  }
}

function validateSharedMetadata(data, file) {
  if (Object.hasOwn(data, "layout")) {
    report(file, "Course content must not select a layout");
  }
}

async function readMdx(file) {
  try {
    return matter(await readFile(file, "utf8"));
  } catch (error) {
    report(file, `could not parse MDX frontmatter: ${error.message}`);
    return { data: {}, content: "" };
  }
}

async function validateCourse(courseEntry) {
  const courseDir = path.join(contentRoot, courseEntry.name);
  const overviewFile = path.join(courseDir, "index.mdx");
  const overview = await readMdx(overviewFile);

  requiredString(overview.data, "title", overviewFile, "Course");
  requiredString(overview.data, "summary", overviewFile, "Course");
  validateSharedMetadata(overview.data, overviewFile);
  if (
    overview.data.language !== undefined &&
    !isSupportedLanguage(overview.data.language)
  ) {
    report(overviewFile, "Course language must be a Unicode locale identifier");
  }
  if (
    !Array.isArray(overview.data.outcomes) ||
    overview.data.outcomes.length === 0 ||
    overview.data.outcomes.some(
      (outcome) => typeof outcome !== "string" || outcome.trim() === "",
    )
  ) {
    report(overviewFile, "Course frontmatter requires a non-empty outcomes list");
  }
  validateAuthoringBoundary(overview.content, overviewFile);
  validateKnowledgeChecks(overview.content, overviewFile);

  const lessonsDir = path.join(courseDir, "lessons");
  let lessonEntries = [];
  try {
    lessonEntries = (await readdir(lessonsDir, { withFileTypes: true })).filter(
      (entry) => entry.isFile() && entry.name.endsWith(".mdx"),
    );
  } catch {
    // The actionable empty-Course error below covers a missing lessons directory.
  }

  if (lessonEntries.length === 0) {
    report(courseDir, "Course must contain at least one Lesson");
    return;
  }

  lessonCount += lessonEntries.length;
  const orderToFile = new Map();

  for (const lessonEntry of lessonEntries) {
    const lessonFile = path.join(lessonsDir, lessonEntry.name);
    const lesson = await readMdx(lessonFile);
    requiredString(lesson.data, "title", lessonFile, "Lesson");
    validateSharedMetadata(lesson.data, lessonFile);

    if (!Number.isInteger(lesson.data.order) || lesson.data.order < 1) {
      report(lessonFile, "Lesson order must be a positive integer");
    } else if (orderToFile.has(lesson.data.order)) {
      report(
        lessonFile,
        `duplicate Lesson order ${lesson.data.order} (also used by ${orderToFile.get(lesson.data.order)})`,
      );
    } else {
      orderToFile.set(lesson.data.order, lessonEntry.name);
    }
    validateAuthoringBoundary(lesson.content, lessonFile);
    validateKnowledgeChecks(lesson.content, lessonFile);
  }

  const orders = [...orderToFile.keys()].sort((a, b) => a - b);
  if (
    orders.length === lessonEntries.length &&
    orders.some((order, index) => order !== index + 1)
  ) {
    report(lessonsDir, "Lesson order must be unique and contiguous starting at 1");
  }
}

let courseEntries = [];
try {
  courseEntries = (await readdir(contentRoot, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory(),
  );
} catch (error) {
  console.error(`Content validation failed:\n${contentRoot}: ${error.message}`);
  process.exit(1);
}

for (const courseEntry of courseEntries) {
  await validateCourse(courseEntry);
}

if (errors.length > 0) {
  console.error(`Content validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  process.exit(1);
}

console.log(
  `Validated ${courseEntries.length} ${courseEntries.length === 1 ? "Course" : "Courses"} and ${lessonCount} ${lessonCount === 1 ? "Lesson" : "Lessons"}.`,
);
