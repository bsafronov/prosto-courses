import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import {
  assessmentSchema,
  courseSchema,
  lessonSchema,
  moduleSchema,
} from "../src/content-schemas.mjs";

const contentRoot = path.resolve(
  process.argv[2] ?? process.env.COURSE_CONTENT_ROOT ?? "src/content/courses",
);
const errors = [];
const counts = {
  courses: 0,
  modules: 0,
  lessons: 0,
  checkpoints: 0,
  capstones: 0,
};
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function report(file, message) {
  errors.push(`${path.relative(process.cwd(), file)}: ${message}`);
}

function requiredString(data, field, file, owner) {
  if (typeof data[field] !== "string" || data[field].trim() === "") {
    report(file, `${owner} frontmatter requires a non-empty ${field}`);
  }
}

function validateMetadata(schema, data, file, owner) {
  const result = schema.safeParse(data);
  if (result.success) return;

  for (const issue of result.error.issues) {
    if (issue.code === "unrecognized_keys") {
      for (const field of issue.keys) {
        report(file, `${owner} frontmatter does not allow a ${field} field`);
      }
      continue;
    }
    const location = issue.path.length > 0 ? ` ${issue.path.join(".")}` : "";
    report(file, `${owner} frontmatter${location}: ${issue.message}`);
  }
}

function validateSlug(slug, file, owner) {
  if (!slugPattern.test(slug)) {
    report(
      file,
      `${owner} slug must use lowercase URL-safe words separated by hyphens`,
    );
  }
}

function stringAttribute(source, name) {
  const match = source.match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "s"),
  );
  return match?.[2];
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

function validateKnowledgeChecks(body, file) {
  body = withoutFencedCode(body);
  const openingTags = [...body.matchAll(/<KnowledgeCheck\b([\s\S]*?)\/>/g)];
  const mentions = [...body.matchAll(/<KnowledgeCheck\b/g)];

  if (openingTags.length !== mentions.length) {
    report(
      file,
      "Knowledge Check must be a self-closing component with static props",
    );
  }

  for (const [index, match] of openingTags.entries()) {
    const source = match[1];
    const label = `Knowledge Check ${index + 1}`;
    const prompt = stringAttribute(source, "prompt");
    const answer = stringAttribute(source, "answer");
    const explanation = stringAttribute(source, "explanation");
    const optionsMatch = source.match(
      /\boptions\s*=\s*\{\s*(\[[\s\S]*?\])\s*\}/,
    );

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
      options.some(
        (option) => typeof option !== "string" || option.trim() === "",
      )
    ) {
      report(file, `${label} requires at least two non-empty string options`);
      continue;
    }

    if (
      new Set(options.map((option) => option.trim())).size !== options.length
    ) {
      report(file, `${label} requires unique options`);
    }
    if (answer && options.filter((option) => option === answer).length !== 1) {
      report(file, `${label} answer must match exactly one option`);
    }
  }
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

function validateLearnerSource(source, file, owner) {
  if (!source) return;
  requiredString(source.data, "title", file, owner);
  validateSharedMetadata(source.data, file);
  validateAuthoringBoundary(source.content, file);
  validateKnowledgeChecks(source.content, file);
}

async function readMdx(file) {
  try {
    return matter(await readFile(file, "utf8"));
  } catch (error) {
    report(file, `could not parse MDX frontmatter: ${error.message}`);
    return null;
  }
}

async function readRequiredMdx(file, owner) {
  try {
    return matter(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      report(file, `${owner} source is required`);
    } else {
      report(file, `could not parse MDX frontmatter: ${error.message}`);
    }
    return null;
  }
}

async function findFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await findFiles(entryPath)));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function isOwnedCourseFile(relativePath) {
  return (
    relativePath === "index.mdx" ||
    relativePath === "capstone.mdx" ||
    /^_authoring\/(brief|blueprint|quality-report)\.md$/.test(relativePath) ||
    /^modules\/[^/]+\/(index|checkpoint)\.mdx$/.test(relativePath) ||
    /^modules\/[^/]+\/lessons\/[^/]+\.mdx$/.test(relativePath)
  );
}

async function validateCourseOwnership(courseDir) {
  for (const file of await findFiles(courseDir)) {
    const relativePath = path
      .relative(courseDir, file)
      .split(path.sep)
      .join("/");
    if (isOwnedCourseFile(relativePath)) continue;

    if (/^lessons\/[^/]+\.mdx$/.test(relativePath)) {
      report(
        file,
        "legacy flat Course/Lesson structure is not supported; Lessons must belong to modules/<module-slug>/lessons/",
      );
      const lesson = await readMdx(file);
      validateLearnerSource(lesson, file, "Lesson");
      if (lesson) validateOrder(lesson.data, file, "Lesson", new Map());
    } else if (file.endsWith(".mdx")) {
      report(file, "Course MDX must follow the target Course tree");
      const source = await readMdx(file);
      validateSharedMetadata(source?.data ?? {}, file);
      validateAuthoringBoundary(source?.content ?? "", file);
      validateKnowledgeChecks(source?.content ?? "", file);
    } else if (file.endsWith(".md")) {
      report(
        file,
        "Course authoring Markdown must be an owned _authoring artifact",
      );
    }
  }
}

function validateOrder(data, file, owner, orderToFile) {
  if (!Object.hasOwn(data, "order")) {
    report(file, `${owner} frontmatter requires an order`);
    return;
  }
  if (!Number.isInteger(data.order)) {
    report(file, `${owner} order must be an integer`);
    return;
  }
  if (data.order < 1) {
    report(file, `${owner} order must be positive`);
    return;
  }
  if (orderToFile.has(data.order)) {
    report(
      file,
      `duplicate ${owner} order ${data.order} (also used by ${orderToFile.get(data.order)})`,
    );
    return;
  }
  orderToFile.set(data.order, path.basename(file));
}

function validateContiguousOrders(
  orderToFile,
  expectedCount,
  directory,
  owner,
) {
  const orders = [...orderToFile.keys()].sort((left, right) => left - right);
  if (
    orders.length === expectedCount &&
    orders.some((order, index) => order !== index + 1)
  ) {
    report(
      directory,
      `${owner} order must be unique and contiguous starting at 1`,
    );
  }
}

async function validateArtifact(file, label) {
  try {
    const source = await readFile(file, "utf8");
    if (source.trim() === "") report(file, `${label} must not be empty`);
  } catch (error) {
    if (error.code === "ENOENT") report(file, `Course must own a ${label}`);
    else report(file, `could not read ${label}: ${error.message}`);
  }
}

async function directoryEntries(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function validateModule(courseDir, courseLessonSlugs, moduleEntry) {
  const moduleDir = path.join(courseDir, "modules", moduleEntry.name);
  validateSlug(moduleEntry.name, moduleDir, "Module");

  const moduleFile = path.join(moduleDir, "index.mdx");
  const moduleSource = await readRequiredMdx(moduleFile, "Module");
  validateLearnerSource(moduleSource, moduleFile, "Module");
  if (moduleSource)
    validateMetadata(moduleSchema, moduleSource.data, moduleFile, "Module");

  const checkpointFile = path.join(moduleDir, "checkpoint.mdx");
  const checkpoint = await readRequiredMdx(checkpointFile, "Module Checkpoint");
  validateLearnerSource(checkpoint, checkpointFile, "Module Checkpoint");
  if (checkpoint) {
    validateMetadata(
      assessmentSchema,
      checkpoint.data,
      checkpointFile,
      "Module Checkpoint",
    );
    counts.checkpoints += 1;
  }

  const lessonsDir = path.join(moduleDir, "lessons");
  const lessonEntries = (await directoryEntries(lessonsDir)).filter(
    (entry) => entry.isFile() && entry.name.endsWith(".mdx"),
  );
  if (lessonEntries.length === 0) {
    report(moduleDir, "Module must contain at least one Lesson");
  }

  counts.lessons += lessonEntries.length;
  const lessonOrders = new Map();
  for (const lessonEntry of lessonEntries) {
    const lessonSlug = lessonEntry.name.replace(/\.mdx$/, "");
    const lessonFile = path.join(lessonsDir, lessonEntry.name);
    validateSlug(lessonSlug, lessonFile, "Lesson");
    if (courseLessonSlugs.has(lessonSlug)) {
      report(
        lessonFile,
        `Lesson slug ${lessonSlug} collides across the Course (also used by ${courseLessonSlugs.get(lessonSlug)})`,
      );
    } else {
      courseLessonSlugs.set(lessonSlug, path.relative(courseDir, lessonFile));
    }

    const lesson = await readMdx(lessonFile);
    validateLearnerSource(lesson, lessonFile, "Lesson");
    if (lesson) {
      validateMetadata(lessonSchema, lesson.data, lessonFile, "Lesson");
      validateOrder(lesson.data, lessonFile, "Lesson", lessonOrders);
    }
  }
  validateContiguousOrders(
    lessonOrders,
    lessonEntries.length,
    lessonsDir,
    "Lesson",
  );

  return moduleSource;
}

async function validateCourse(courseEntry) {
  const courseDir = path.join(contentRoot, courseEntry.name);
  validateSlug(courseEntry.name, courseDir, "Course");
  await validateCourseOwnership(courseDir);

  const overviewFile = path.join(courseDir, "index.mdx");
  const overview = await readRequiredMdx(overviewFile, "Course");
  validateLearnerSource(overview, overviewFile, "Course");
  if (overview)
    validateMetadata(courseSchema, overview.data, overviewFile, "Course");

  const capstoneFile = path.join(courseDir, "capstone.mdx");
  const capstone = await readRequiredMdx(
    capstoneFile,
    "Capstone Demonstration",
  );
  validateLearnerSource(capstone, capstoneFile, "Capstone Demonstration");
  if (capstone) {
    validateMetadata(
      assessmentSchema,
      capstone.data,
      capstoneFile,
      "Capstone Demonstration",
    );
    counts.capstones += 1;
  }

  await validateArtifact(
    path.join(courseDir, "_authoring", "brief.md"),
    "Course Brief at _authoring/brief.md",
  );
  await validateArtifact(
    path.join(courseDir, "_authoring", "blueprint.md"),
    "Course Blueprint at _authoring/blueprint.md",
  );
  await validateArtifact(
    path.join(courseDir, "_authoring", "quality-report.md"),
    "quality report at _authoring/quality-report.md",
  );

  const modulesDir = path.join(courseDir, "modules");
  const moduleEntries = (await directoryEntries(modulesDir)).filter((entry) =>
    entry.isDirectory(),
  );
  if (moduleEntries.length === 0) {
    report(courseDir, "Course must contain at least one Module");
    report(courseDir, "Course must contain at least one Lesson");
  }

  counts.modules += moduleEntries.length;
  const moduleOrders = new Map();
  const courseLessonSlugs = new Map();
  for (const moduleEntry of moduleEntries) {
    const moduleSource = await validateModule(
      courseDir,
      courseLessonSlugs,
      moduleEntry,
    );
    if (moduleSource) {
      validateOrder(
        moduleSource.data,
        path.join(modulesDir, moduleEntry.name, "index.mdx"),
        "Module",
        moduleOrders,
      );
    }
  }
  validateContiguousOrders(
    moduleOrders,
    moduleEntries.length,
    modulesDir,
    "Module",
  );
}

let contentEntries;
try {
  contentEntries = await readdir(contentRoot, { withFileTypes: true });
} catch (error) {
  console.error(`Content validation failed:\n${contentRoot}: ${error.message}`);
  process.exit(1);
}

for (const entry of contentEntries) {
  if (entry.isFile() && entry.name.endsWith(".mdx")) {
    report(
      path.join(contentRoot, entry.name),
      "Lesson must belong to a Course Module under modules/<module-slug>/lessons/",
    );
  }
}

const courseEntries = contentEntries.filter((entry) => entry.isDirectory());
counts.courses = courseEntries.length;
for (const courseEntry of courseEntries) await validateCourse(courseEntry);

if (errors.length > 0) {
  console.error(
    `Content validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
  );
  process.exit(1);
}

console.log(
  `Validated ${counts.courses} ${counts.courses === 1 ? "Course" : "Courses"}, ` +
    `${counts.modules} ${counts.modules === 1 ? "Module" : "Modules"}, ` +
    `${counts.lessons} ${counts.lessons === 1 ? "Lesson" : "Lessons"}, ` +
    `${counts.checkpoints} ${counts.checkpoints === 1 ? "Module Checkpoint" : "Module Checkpoints"}, ` +
    `and ${counts.capstones} ${counts.capstones === 1 ? "Capstone Demonstration" : "Capstone Demonstrations"}.`,
);
