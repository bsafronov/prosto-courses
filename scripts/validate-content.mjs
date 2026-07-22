import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import {
  assessmentSchema,
  capstoneSchema,
  capabilityPackDependenciesSchema,
  courseSchema,
  lessonSchema,
  moduleSchema,
} from "../src/content-schemas.mjs";
import {
  createOutcomeAlignment,
  outcomeEvidence,
} from "../src/outcome-alignment.mjs";

const contentRoot = path.resolve(
  process.argv[2] ?? process.env.COURSE_CONTENT_ROOT ?? "src/content/courses",
);
const capabilityPackManifestFile = path.resolve(
  process.env.CAPABILITY_PACK_MANIFEST ?? "platform/capability-packs.json",
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

async function readCapabilityPackManifest() {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(capabilityPackManifestFile, "utf8"));
  } catch (error) {
    console.error(
      `Capability Pack manifest could not be read at ${capabilityPackManifestFile}: ${error.message}`,
    );
    process.exit(1);
  }

  if (
    !Number.isInteger(manifest.manifestVersion) ||
    manifest.manifestVersion < 1 ||
    typeof manifest.baseCatalog?.version !== "string" ||
    !Array.isArray(manifest.baseCatalog?.components) ||
    !Array.isArray(manifest.packs)
  ) {
    console.error(
      `Capability Pack manifest is malformed at ${capabilityPackManifestFile}`,
    );
    process.exit(1);
  }

  return manifest;
}

const capabilityPackManifest = await readCapabilityPackManifest();
const baseComponents = new Set(capabilityPackManifest.baseCatalog.components);
const componentPacks = new Map();
for (const pack of capabilityPackManifest.packs) {
  for (const declaration of pack.components ?? []) {
    const component =
      typeof declaration === "string" ? { name: declaration } : declaration;
    const owners = componentPacks.get(component.name) ?? [];
    owners.push({ pack, component });
    componentPacks.set(component.name, owners);
  }
}

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

function openingComponentTags(source) {
  const tags = [];

  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== "<" || !/[A-Z]/.test(source[index + 1] ?? "")) {
      continue;
    }

    const nameStart = index + 1;
    let cursor = nameStart + 1;
    while (/[A-Za-z0-9]/.test(source[cursor] ?? "")) cursor += 1;
    const name = source.slice(nameStart, cursor);
    const attributesStart = cursor;
    let braceDepth = 0;
    let quote;
    let escaped = false;

    for (; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (quote) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === quote) quote = undefined;
        continue;
      }
      if (character === '"' || character === "'" || character === "`") {
        quote = character;
      } else if (character === "{") {
        braceDepth += 1;
      } else if (character === "}") {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (character === ">" && braceDepth === 0) {
        tags.push({
          name,
          source: source.slice(attributesStart, cursor),
        });
        index = cursor;
        break;
      }
    }
  }

  return tags;
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

function validateCapabilityPackDependencies(dependencies, file) {
  const declaredPacks = new Map();
  if (!Array.isArray(dependencies)) return declaredPacks;

  for (const dependency of dependencies) {
    if (
      typeof dependency?.name !== "string" ||
      typeof dependency?.version !== "string"
    ) {
      continue;
    }
    if (declaredPacks.has(dependency.name)) {
      report(
        file,
        `Capability Pack ${dependency.name} must be declared exactly once`,
      );
      continue;
    }

    const availableByName = capabilityPackManifest.packs.filter(
      (pack) => pack.name === dependency.name,
    );
    if (availableByName.length === 0) {
      report(
        file,
        `Capability Pack ${dependency.name} is not available in platform manifest version ${capabilityPackManifest.manifestVersion}`,
      );
      continue;
    }

    const available = availableByName.find(
      (pack) => pack.version === dependency.version,
    );
    if (!available) {
      const versions = availableByName.map((pack) => pack.version).join(", ");
      report(
        file,
        `Capability Pack ${dependency.name} version ${dependency.version} is unsupported; available versions: ${versions}`,
      );
      continue;
    }
    declaredPacks.set(dependency.name, available);
  }

  return declaredPacks;
}

function validateSemanticComponents(body, file, declaredPacks = new Map()) {
  const authoringSource = withoutFencedCode(body);
  const components = openingComponentTags(authoringSource);

  for (const { name: componentName, source } of components) {
    const isBaseComponent = baseComponents.has(componentName);
    const owners = componentPacks.get(componentName) ?? [];
    const declaredOwner = owners.find(
      ({ pack }) => declaredPacks.get(pack.name)?.version === pack.version,
    );

    if (!isBaseComponent && !declaredOwner && owners.length === 0) {
      report(
        file,
        `${componentName} is not a base Semantic Course Component or an available Capability Pack component`,
      );
      continue;
    }

    if (!isBaseComponent && !declaredOwner) {
      const { pack } = owners[0];
      report(
        file,
        `${componentName} requires Capability Pack ${pack.name} version ${pack.version} to be declared in Course metadata`,
      );
      continue;
    }

    if (/\{\s*\.\.\./.test(source)) {
      report(
        file,
        `${componentName} must use explicit static props; spread props can hide undeclared runtimes or services`,
      );
      continue;
    }

    for (const resource of ["runtime", "service"]) {
      if (!new RegExp(`\\b${resource}\\s*=`).test(source)) continue;
      const value = stringAttribute(source, resource);
      if (!value) {
        report(
          file,
          `${componentName} ${resource} must be a static non-empty string declared by a Course Capability Pack`,
        );
        continue;
      }

      const allowedValues = declaredOwner?.component[`${resource}s`] ?? [];
      if (!allowedValues.includes(value)) {
        const dependency = declaredOwner?.pack;
        const owner = dependency
          ? `Capability Pack ${dependency.name} version ${dependency.version}`
          : "any declared Course Capability Pack";
        report(
          file,
          `${componentName} ${resource} ${value} is not declared by ${owner}`,
        );
      }
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

function validateLearnerSource(source, file, owner, declaredPacks) {
  if (!source) return;
  requiredString(source.data, "title", file, owner);
  validateSharedMetadata(source.data, file);
  validateAuthoringBoundary(source.content, file);
  validateSemanticComponents(source.content, file, declaredPacks);
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

async function validateCourseBriefCapabilityPacks(file, dependencies) {
  const brief = await readMdx(file);
  if (!brief) return;
  const courseDependencies = Array.isArray(dependencies) ? dependencies : [];
  const declared = brief.data.capabilityPacks ?? [];
  const result = capabilityPackDependenciesSchema.safeParse(declared);
  if (!result.success) {
    for (const issue of result.error.issues) {
      const location = issue.path.length > 0 ? `.${issue.path.join(".")}` : "";
      report(file, `Course Brief capabilityPacks${location}: ${issue.message}`);
    }
  }
  const confirmed = Array.isArray(declared) ? declared : [];
  validateCapabilityPackDependencies(confirmed, file);

  for (const dependency of courseDependencies) {
    if (
      typeof dependency?.name !== "string" ||
      typeof dependency?.version !== "string"
    ) {
      continue;
    }
    const isConfirmed = confirmed.some(
      (pack) =>
        pack?.name === dependency.name && pack?.version === dependency.version,
    );
    if (!isConfirmed) {
      report(
        file,
        `Course Brief must confirm Capability Pack ${dependency.name} version ${dependency.version}`,
      );
    }
  }

  for (const dependency of confirmed) {
    if (
      typeof dependency?.name !== "string" ||
      typeof dependency?.version !== "string"
    ) {
      continue;
    }
    const isCourseDependency = courseDependencies.some(
      (pack) =>
        pack?.name === dependency.name && pack?.version === dependency.version,
    );
    if (!isCourseDependency) {
      report(
        file,
        `Course Brief Capability Pack ${dependency.name} version ${dependency.version} must also be declared in Course metadata`,
      );
    }
  }
}

async function directoryEntries(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function validateModule(
  courseDir,
  courseLessonSlugs,
  moduleEntry,
  alignment,
  declaredPacks,
) {
  const moduleDir = path.join(courseDir, "modules", moduleEntry.name);
  validateSlug(moduleEntry.name, moduleDir, "Module");

  const moduleFile = path.join(moduleDir, "index.mdx");
  const moduleSource = await readRequiredMdx(moduleFile, "Module");
  validateLearnerSource(moduleSource, moduleFile, "Module", declaredPacks);
  if (moduleSource)
    validateMetadata(moduleSchema, moduleSource.data, moduleFile, "Module");
  if (moduleSource) {
    alignment.registerOutcomeReferences({
      file: moduleFile,
      label: "Module",
      outcomeIds: moduleSource.data.outcomes,
    });
  }

  const checkpointFile = path.join(moduleDir, "checkpoint.mdx");
  const checkpoint = await readRequiredMdx(checkpointFile, "Module Checkpoint");
  validateLearnerSource(
    checkpoint,
    checkpointFile,
    "Module Checkpoint",
    declaredPacks,
  );
  if (checkpoint) {
    validateMetadata(
      assessmentSchema,
      checkpoint.data,
      checkpointFile,
      "Module Checkpoint",
    );
    counts.checkpoints += 1;
  }
  alignment.registerOutcomeReferences({
    alignmentScope: moduleEntry.name,
    evidenceKind: outcomeEvidence.moduleCheckpoint,
    file: checkpointFile,
    label: "Module Checkpoint",
    outcomeIds: checkpoint?.data.outcomes,
  });

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
    validateLearnerSource(lesson, lessonFile, "Lesson", declaredPacks);
    if (lesson) {
      validateMetadata(lessonSchema, lesson.data, lessonFile, "Lesson");
      alignment.registerOutcomeReferences({
        alignmentScope: moduleEntry.name,
        evidenceKind: outcomeEvidence.lessonInstruction,
        file: lessonFile,
        label: "Lesson",
        outcomeIds: lesson.data.outcomes,
      });
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
  const declaredPacks = validateCapabilityPackDependencies(
    overview?.data.capabilityPacks,
    overviewFile,
  );
  validateLearnerSource(overview, overviewFile, "Course", declaredPacks);
  const alignment = createOutcomeAlignment({
    courseOutcomes: overview?.data.outcomes,
    courseFile: overviewFile,
    report,
  });
  if (overview) {
    validateMetadata(courseSchema, overview.data, overviewFile, "Course");
  }

  const capstoneFile = path.join(courseDir, "capstone.mdx");
  const capstone = await readRequiredMdx(
    capstoneFile,
    "Capstone Demonstration",
  );
  validateLearnerSource(
    capstone,
    capstoneFile,
    "Capstone Demonstration",
    declaredPacks,
  );
  if (capstone) {
    validateMetadata(
      capstoneSchema,
      capstone.data,
      capstoneFile,
      "Capstone Demonstration",
    );
    alignment.registerOutcomeReferences({
      evidenceKind: outcomeEvidence.capstone,
      file: capstoneFile,
      label: "Capstone Demonstration",
      outcomeIds: capstone.data.outcomes,
    });
    for (const [index, criterion] of (Array.isArray(capstone.data.criteria)
      ? capstone.data.criteria
      : []
    ).entries()) {
      alignment.registerOutcomeReferences({
        evidenceKind: outcomeEvidence.capstoneCriterion,
        file: capstoneFile,
        label: `Capstone criterion ${index + 1}`,
        outcomeIds: criterion?.outcomes,
      });
    }
    counts.capstones += 1;
  }

  const briefFile = path.join(courseDir, "_authoring", "brief.md");
  await validateArtifact(briefFile, "Course Brief at _authoring/brief.md");
  await validateCourseBriefCapabilityPacks(
    briefFile,
    overview?.data.capabilityPacks,
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
      alignment,
      declaredPacks,
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
  alignment.requireEveryOutcome({
    evidenceKind: outcomeEvidence.lessonInstruction,
    file: overviewFile,
    describeMissing: (outcomeId) =>
      `Learning Outcome ${outcomeId} is not taught by any Lesson`,
  });
  alignment.requireMatchingEvidence({
    evidenceKind: outcomeEvidence.moduleCheckpoint,
    sourceEvidenceKind: outcomeEvidence.lessonInstruction,
    describeMissing: (outcomeId) =>
      `Module Checkpoint does not cover taught Learning Outcome ${outcomeId}`,
  });
  alignment.requireEveryOutcome({
    evidenceKind: outcomeEvidence.capstone,
    file: capstoneFile,
    describeMissing: (outcomeId) =>
      `Capstone Demonstration does not support Learning Outcome ${outcomeId}`,
  });
  alignment.requireEveryOutcome({
    evidenceKind: outcomeEvidence.capstoneCriterion,
    file: capstoneFile,
    describeMissing: (outcomeId) =>
      `Learning Outcome ${outcomeId} is not demonstrated by any Capstone criterion`,
  });
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
