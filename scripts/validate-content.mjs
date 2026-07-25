import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import matter from "gray-matter";
import { JSDOM } from "jsdom";
import {
  assessmentSchema,
  capstoneSchema,
  capabilityPackDependenciesSchema,
  courseBriefSchema,
  courseSchema,
  lessonSchema,
  moduleSchema,
} from "../src/content-schemas.mjs";
import {
  createOutcomeAlignment,
  outcomeEvidence,
} from "../src/outcome-alignment.mjs";

const mermaidDom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = mermaidDom.window;
globalThis.document = mermaidDom.window.document;
const { default: mermaid } = await import("mermaid");

const contentRoot = path.resolve(
  process.argv[2] ?? process.env.COURSE_CONTENT_ROOT ?? "src/content/courses",
);
const capabilityPackManifestFile = path.resolve(
  process.env.CAPABILITY_PACK_MANIFEST ?? "platform/capability-packs.json",
);
const errors = [];
const warnings = [];
const counts = {
  courses: 0,
  modules: 0,
  lessons: 0,
  checkpoints: 0,
  capstones: 0,
};
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const calloutKinds = new Set([
  "key",
  "info",
  "warning",
  "error",
  "advanced",
  "context",
]);
const diagramAccessibilityProps = [
  "title",
  "description",
  "howToRead",
  "takeaway",
];
const factualRiskClassifications = new Set(["standard", "high"]);

function validationDate() {
  const injected = process.env.CONTENT_VALIDATION_DATE;
  if (!injected) {
    return new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(injected)) {
    console.error(
      "Content validation failed:\nCONTENT_VALIDATION_DATE must use YYYY-MM-DD",
    );
    process.exit(1);
  }

  const date = new Date(`${injected}T00:00:00.000Z`);
  if (
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== injected
  ) {
    console.error(
      "Content validation failed:\nCONTENT_VALIDATION_DATE must be a valid calendar date",
    );
    process.exit(1);
  }
  return date;
}

const currentValidationDate = validationDate();

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
        const article = /^[aeiou]/i.test(field) ? "an" : "a";
        report(
          file,
          `${owner} frontmatter does not allow ${article} ${field} field`,
        );
      }
      continue;
    }
    const location = issue.path.length > 0 ? ` ${issue.path.join(".")}` : "";
    report(file, `${owner} frontmatter${location}: ${issue.message}`);
  }
}

function validateFreshnessDeadline(freshness, file, owner, factualRisk) {
  if (
    freshness?.mode !== "time-sensitive" ||
    !factualRiskClassifications.has(factualRisk)
  ) {
    return;
  }

  const reviewAfter = new Date(freshness.reviewAfter);
  if (
    Number.isNaN(reviewAfter.valueOf()) ||
    currentValidationDate <= reviewAfter
  ) {
    return;
  }

  const deadline = reviewAfter.toISOString().slice(0, 10);
  const asOf = currentValidationDate.toISOString().slice(0, 10);
  const action =
    `review deadline ${deadline} has passed as of ${asOf}; ` +
    "verify authoritative sources and update verifiedAt and reviewAfter";
  if (factualRisk === "high") {
    report(file, `${owner} contains stale high factual-risk content: ${action}`);
  } else {
    warnings.push(`${path.relative(process.cwd(), file)}: ${owner} ${action}`);
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

function afterBracedExpression(source, start) {
  let depth = 0;
  let quote;
  let escaped = false;
  let cursor = start;

  for (; cursor < source.length; cursor += 1) {
    const character = source[cursor];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = undefined;
    } else if (
      character === '"' ||
      character === "'" ||
      character === "`"
    ) {
      quote = character;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}" && --depth === 0) {
      return cursor + 1;
    }
  }

  return cursor;
}

function componentAttributes(source) {
  const attributes = [];
  let cursor = 0;

  while (cursor < source.length) {
    while (/\s|\//.test(source[cursor] ?? "")) cursor += 1;
    if (cursor >= source.length) break;

    if (source[cursor] === "{") {
      cursor = afterBracedExpression(source, cursor);
      continue;
    }

    const nameMatch = source
      .slice(cursor)
      .match(/^[A-Za-z][A-Za-z0-9_-]*/);
    if (!nameMatch) {
      cursor += 1;
      continue;
    }

    const name = nameMatch[0];
    cursor += name.length;
    while (/\s/.test(source[cursor] ?? "")) cursor += 1;

    let expression;
    let value;
    if (source[cursor] === "=") {
      cursor += 1;
      while (/\s/.test(source[cursor] ?? "")) cursor += 1;
      const quote = source[cursor];
      if (quote === '"' || quote === "'") {
        cursor += 1;
        const valueStart = cursor;
        let escaped = false;
        for (; cursor < source.length; cursor += 1) {
          const character = source[cursor];
          if (escaped) escaped = false;
          else if (character === "\\") escaped = true;
          else if (character === quote) break;
        }
        value = source.slice(valueStart, cursor);
        cursor += 1;
      } else if (source[cursor] === "{") {
        const expressionStart = cursor;
        cursor = afterBracedExpression(source, cursor);
        expression = source.slice(expressionStart + 1, cursor - 1);
      } else {
        while (cursor < source.length && !/\s|\//.test(source[cursor])) {
          cursor += 1;
        }
      }
    }

    attributes.push({ expression, name, value });
  }

  return attributes;
}

function componentAttribute(source, name) {
  return componentAttributes(source).find(
    (attribute) => attribute.name === name,
  );
}

function stringAttribute(source, name) {
  return componentAttribute(source, name)?.value;
}

function stringArrayAttribute(source, name) {
  const attribute = componentAttribute(source, name);
  if (!attribute) return { present: false };
  if (typeof attribute.expression !== "string") {
    return { present: true };
  }

  try {
    const value = JSON.parse(
      attribute.expression.replace(/,\s*(?=])/g, ""),
    );
    if (
      !Array.isArray(value) ||
      value.some((item) => typeof item !== "string")
    ) {
      return { present: true };
    }
    return { present: true, value };
  } catch {
    return { present: true };
  }
}

function positiveIntegerAttribute(source, name) {
  const expression = componentAttribute(source, name)?.expression?.trim();
  if (!/^\d+$/.test(expression ?? "")) return;
  const value = Number(expression);
  return Number.isSafeInteger(value) && value > 0 ? value : undefined;
}

function objectArrayAttribute(source, name) {
  const attribute = componentAttribute(source, name);
  if (!attribute) return { present: false };
  if (typeof attribute.expression !== "string") return { present: true };

  try {
    const value = JSON.parse(
      attribute.expression
        .replace(/([{,]\s*)([A-Za-z][A-Za-z0-9]*)\s*:/g, '$1"$2":')
        .replace(/,\s*(?=[}\]])/g, ""),
    );
    return { present: true, value };
  } catch {
    return { present: true };
  }
}

function attributeNames(source) {
  return componentAttributes(source).map((attribute) => attribute.name);
}

function inspectFencedCode(body) {
  const authoringLines = [];
  const languages = [];
  const ranges = [];
  let fence;
  let offset = 0;

  for (const line of body.split("\n")) {
    if (!fence) {
      const opening = line.match(
        /^ {0,3}(`{3,}|~{3,})\s*([A-Za-z0-9_-]+)?/,
      );
      if (opening) {
        fence = {
          marker: opening[1][0],
          length: opening[1].length,
          start: offset,
        };
        if (opening[2]) languages.push(opening[2].toLowerCase());
      } else {
        authoringLines.push(line);
      }
      offset += line.length + 1;
      continue;
    }

    const closing = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
    if (
      closing &&
      closing[1][0] === fence.marker &&
      closing[1].length >= fence.length
    ) {
      ranges.push({ start: fence.start, end: offset + line.length });
      fence = undefined;
    }
    offset += line.length + 1;
  }
  if (fence) ranges.push({ start: fence.start, end: body.length });

  return { authoringSource: authoringLines.join("\n"), languages, ranges };
}

function withoutFencedCode(body) {
  return inspectFencedCode(body).authoringSource;
}

function topLevelFencedCodeLanguages(body) {
  return inspectFencedCode(body).languages;
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
          start: index,
          end: cursor + 1,
          selfClosing: /\/\s*$/.test(
            source.slice(attributesStart, cursor),
          ),
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

function validateReflections(body, file, alignment) {
  const allowedProps = new Set(["prompt", "outcomes", "guidance"]);
  const reflections = openingComponentTags(withoutFencedCode(body)).filter(
    (tag) => tag.name === "Reflection",
  );

  for (const [index, reflection] of reflections.entries()) {
    const label = `Reflection ${index + 1}`;
    if (!reflection.selfClosing) {
      report(
        file,
        `${label} must be a self-closing component with static props`,
      );
    }
    const propNames = attributeNames(reflection.source);
    if (propNames.filter((name) => name === "prompt").length > 1) {
      report(file, `${label} must declare prompt exactly once`);
    }
    const authoredProps = propNames.filter(
      (name) => !allowedProps.has(name),
    );
    if (authoredProps.length > 0) {
      report(
        file,
        `${label} does not allow authored props: ${authoredProps.join(", ")}`,
      );
    }
    if (!stringAttribute(reflection.source, "prompt")?.trim()) {
      report(file, `${label} requires a non-empty prompt`);
    }
    const guidance = stringArrayAttribute(reflection.source, "guidance");
    if (
      guidance.present &&
      (!guidance.value?.length ||
        guidance.value.some((item) => item.trim() === ""))
    ) {
      report(
        file,
        `${label} guidance must be a non-empty array of non-empty strings`,
      );
    }
    const outcomes = stringArrayAttribute(reflection.source, "outcomes");
    if (outcomes.present && !outcomes.value) {
      report(
        file,
        `${label} outcomes must be a static array of Learning Outcome IDs`,
      );
    }
    if (alignment) {
      alignment.registerOutcomeReferences({
        file,
        label,
        outcomeIds: outcomes.value,
      });
    } else if (!outcomes.value?.length) {
      report(
        file,
        `${label} must support at least one Course Learning Outcome`,
      );
    }
  }
}

function pairedPracticeTasks(source, file) {
  const openings = openingComponentTags(source).filter(
    (tag) => tag.name === "PracticeTask",
  );
  const openingsByStart = new Map(openings.map((opening) => [opening.start, opening]));
  const tasks = [];
  const stack = [];

  for (const marker of source.matchAll(/<\/?PracticeTask\b/g)) {
    if (marker[0].startsWith("</")) {
      const opening = stack.pop();
      if (!opening) {
        report(file, "Practice Task has a closing tag without an opening tag");
        continue;
      }
      tasks.push({
        closeStart: marker.index,
        end: marker.index + marker[0].length,
        inner: source.slice(opening.end, marker.index),
        opening,
      });
      continue;
    }

    const opening = openingsByStart.get(marker.index);
    if (!opening) continue;
    if (opening.selfClosing) {
      tasks.push({
        closeStart: opening.end,
        end: opening.end,
        inner: "",
        opening,
      });
      report(
        file,
        "Practice Task must wrap a learner prompt and exactly one feedback component",
      );
    } else {
      if (stack.length > 0) {
        report(file, "Practice Tasks cannot be nested");
      }
      stack.push(opening);
    }
  }

  for (const opening of stack) {
    tasks.push({
      closeStart: source.length,
      end: source.length,
      inner: source.slice(opening.end),
      opening,
    });
    report(file, "Practice Task requires a closing tag");
  }

  return tasks.sort((left, right) => left.opening.start - right.opening.start);
}

function meaningfulPracticePrompt(source) {
  return source
    .replace(
      /<(TaskSolution|TaskRubric)\b[\s\S]*?<\/\1\s*>/g,
      "",
    )
    .replace(/<(?:TaskSolution|TaskRubric)\b[\s\S]*?\/>/g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[*_~`#>-]/g, "")
    .trim();
}

function validateStructuredFeedback(
  component,
  file,
  index,
  name,
  allowedProps,
  structure,
) {
  const label = `${name} ${index + 1}`;
  if (!component.selfClosing) {
    report(
      file,
      `${label} must be a self-closing component with ${structure}`,
    );
  }
  const authoredProps = attributeNames(component.source).filter(
    (prop) => !allowedProps.includes(prop),
  );
  if (authoredProps.length > 0) {
    report(
      file,
      `${label} does not allow authored props: ${authoredProps.join(", ")}`,
    );
  }
  return label;
}

function validateTaskSolution(solution, file, index) {
  const label = validateStructuredFeedback(
    solution,
    file,
    index,
    "Task Solution",
    ["reasoning", "alternatives", "likelyErrors"],
    "structured feedback",
  );
  if (!stringAttribute(solution.source, "reasoning")?.trim()) {
    report(file, `${label} requires non-empty reasoning`);
  }
  for (const field of ["alternatives", "likelyErrors"]) {
    const values = stringArrayAttribute(solution.source, field);
    if (
      !values.value?.length ||
      values.value.some((item) => item.trim() === "")
    ) {
      report(
        file,
        `${label} ${field} must be a non-empty array of non-empty strings`,
      );
    }
  }
}

function validateTaskRubric(rubric, file, index) {
  const label = validateStructuredFeedback(
    rubric,
    file,
    index,
    "Task Rubric",
    ["criteria"],
    "structured criteria",
  );

  const criteria = objectArrayAttribute(rubric.source, "criteria");
  const scoreFields = new Set(["score", "points", "rating", "grade"]);
  const hasScoreField =
    Array.isArray(criteria.value) &&
    criteria.value.some(
      (criterion) =>
        criterion &&
        typeof criterion === "object" &&
        Object.keys(criterion).some((field) => scoreFields.has(field)),
    );
  if (hasScoreField) {
    report(file, `${label} must not use objective score fields`);
  }
  if (
    !Array.isArray(criteria.value) ||
    criteria.value.length === 0 ||
    criteria.value.some(
      (criterion) =>
        !criterion ||
        typeof criterion !== "object" ||
        Array.isArray(criterion) ||
        Object.keys(criterion).some(
          (field) =>
            !["criterion", "evidence"].includes(field) &&
            !scoreFields.has(field),
        ) ||
        typeof criterion.criterion !== "string" ||
        criterion.criterion.trim() === "" ||
        typeof criterion.evidence !== "string" ||
        criterion.evidence.trim() === "",
    )
  ) {
    report(
      file,
      `${label} criteria must contain only non-empty criterion and observable evidence`,
    );
  }
}

function validatePracticeTasks(body, file, owner, alignment) {
  const source = withoutFencedCode(body).replace(
    /\{\/\*[\s\S]*?\*\/\}/g,
    "",
  );
  const tasks = pairedPracticeTasks(source, file);
  const feedback = openingComponentTags(source).filter(
    (tag) => tag.name === "TaskSolution" || tag.name === "TaskRubric",
  );
  const allowedProps = new Set([
    "title",
    "level",
    "estimatedMinutes",
    "goal",
    "outcomes",
    "constraints",
    "criteria",
    "hints",
  ]);
  const allowedOwners = new Set([
    "Lesson",
    "Module Checkpoint",
    "Capstone Demonstration",
  ]);

  for (const [index, task] of tasks.entries()) {
    const label = `Practice Task ${index + 1}`;
    if (!allowedOwners.has(owner)) {
      report(
        file,
        `${label} may appear only in a Lesson, Module Checkpoint, or Capstone Demonstration`,
      );
    }
    const props = attributeNames(task.opening.source);
    const authoredProps = props.filter((name) => !allowedProps.has(name));
    if (authoredProps.length > 0) {
      report(
        file,
        `${label} does not allow authored props: ${authoredProps.join(", ")}`,
      );
    }
    if (!stringAttribute(task.opening.source, "title")?.trim()) {
      report(file, `${label} requires a non-empty title`);
    }
    if (
      !["core", "challenge", "stretch"].includes(
        stringAttribute(task.opening.source, "level"),
      )
    ) {
      report(file, `${label} level must be core, challenge, or stretch`);
    }
    if (!positiveIntegerAttribute(task.opening.source, "estimatedMinutes")) {
      report(file, `${label} estimatedMinutes must be a positive integer`);
    }
    if (!stringAttribute(task.opening.source, "goal")?.trim()) {
      report(file, `${label} requires a non-empty goal`);
    }
    for (const field of ["constraints", "hints"]) {
      const values = stringArrayAttribute(task.opening.source, field);
      if (
        values.present &&
        (!values.value?.length ||
          values.value.some((item) => item.trim() === ""))
      ) {
        report(
          file,
          `${label} ${field} must be a non-empty array of non-empty strings`,
        );
      }
    }
    const criteria = stringArrayAttribute(task.opening.source, "criteria");
    if (
      !criteria.value?.length ||
      criteria.value.some((item) => item.trim() === "")
    ) {
      report(
        file,
        `${label} criteria must be a non-empty array of non-empty strings`,
      );
    }
    const outcomes = stringArrayAttribute(task.opening.source, "outcomes");
    if (outcomes.present && !outcomes.value) {
      report(
        file,
        `${label} outcomes must be a static array of Learning Outcome IDs`,
      );
    }
    alignment.registerOutcomeReferences({
      evidenceKind: outcomeEvidence.practiceTask,
      file,
      label,
      outcomeIds: outcomes.value,
    });
    if (!meaningfulPracticePrompt(task.inner)) {
      report(file, `${label} requires a meaningful learner prompt`);
    }

    const nestedFeedback = feedback.filter(
      (component) =>
        component.start >= task.opening.end &&
        component.start < task.closeStart,
    );
    if (nestedFeedback.length !== 1) {
      report(
        file,
        `${label} must contain exactly one TaskSolution or TaskRubric`,
      );
    }
  }

  const nestedFeedback = new Set(
    feedback.filter((component) =>
      tasks.some(
        (task) =>
          component.start >= task.opening.end &&
          component.start < task.closeStart,
      ),
    ),
  );
  for (const component of feedback) {
    if (!nestedFeedback.has(component)) {
      report(
        file,
        `${component.name} must be nested directly inside a Practice Task`,
      );
    }
  }

  feedback
    .filter((component) => component.name === "TaskSolution")
    .forEach((solution, index) => validateTaskSolution(solution, file, index));
  feedback
    .filter((component) => component.name === "TaskRubric")
    .forEach((rubric, index) => validateTaskRubric(rubric, file, index));
}

function validateCallouts(body, file) {
  const authoringSource = withoutFencedCode(body);
  const openings = [...authoringSource.matchAll(/<Callout\b/g)];
  const callouts = [
    ...authoringSource.matchAll(
      /<Callout\b[^>]*>([\s\S]*?)<\/Callout\s*>/g,
    ),
  ];

  if (callouts.length !== openings.length) {
    report(file, "Callout requires meaningful content");
  }
  for (const callout of callouts) {
    const proseSource = withoutFencedCode(callout[1]).replace(
      /`+[^`]*`+/g,
      "",
    );
    if (/[{}]/.test(proseSource)) {
      report(
        file,
        "Callout requires meaningful content; MDX expressions are not allowed",
      );
      continue;
    }
    const meaningfulSource = callout[1]
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[*_~`]/g, "")
      .trim();
    if (!meaningfulSource) {
      report(file, "Callout requires meaningful content");
    }
  }
}

async function validateDiagrams(body, file) {
  const fencedCode = inspectFencedCode(body);
  const isInsideFencedExample = (index) =>
    fencedCode.ranges.some(
      (range) => index >= range.start && index <= range.end,
    );
  const diagramOpenings = openingComponentTags(body).filter(
    (tag) => tag.name === "Diagram" && !isInsideFencedExample(tag.start),
  );
  const diagrams = [];
  for (const opening of diagramOpenings) {
    if (opening.selfClosing) continue;
    const closingPattern = /<\/Diagram\s*>/g;
    closingPattern.lastIndex = opening.end;
    let closing;
    do {
      closing = closingPattern.exec(body);
    } while (closing && isInsideFencedExample(closing.index));
    if (!closing) continue;
    diagrams.push({
      content: body.slice(opening.end, closing.index),
      start: opening.start,
      end: closing.index + closing[0].length,
    });
  }
  if (diagramOpenings.length !== diagrams.length) {
    report(
      file,
      "Diagram must wrap exactly one non-empty fenced Mermaid source",
    );
  }
  let outsideCursor = 0;
  let sourceOutsideDiagrams = "";
  for (const diagram of diagrams) {
    sourceOutsideDiagrams += body.slice(outsideCursor, diagram.start);
    outsideCursor = diagram.end;
  }
  sourceOutsideDiagrams += body.slice(outsideCursor);
  if (topLevelFencedCodeLanguages(sourceOutsideDiagrams).includes("mermaid")) {
    report(file, "Mermaid source must be wrapped by Diagram");
  }

  for (const diagram of diagrams) {
    const fencedSource = diagram.content.match(
      /^\s*(?<fence>`{3,}|~{3,})mermaid[ \t]*\r?\n(?<source>[\s\S]+?)\r?\n[ \t]*\k<fence>\s*$/,
    );
    if (!fencedSource?.groups?.source.trim()) {
      report(
        file,
        "Diagram must wrap exactly one non-empty fenced Mermaid source",
      );
      continue;
    }
    const sourceLines = fencedSource.groups.source.split(/\r?\n/);
    const commonIndent = Math.min(
      ...sourceLines
        .filter((line) => line.trim())
        .map((line) => line.match(/^ */)[0].length),
    );
    const mermaidSource = sourceLines
      .map((line) => line.slice(commonIndent))
      .join("\n");
    if (
      !(await mermaid.parse(mermaidSource, {
        suppressErrors: true,
      }))
    ) {
      report(file, "Diagram contains invalid Mermaid source");
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

    if (
      componentName === "Callout" &&
      !calloutKinds.has(stringAttribute(source, "kind"))
    ) {
      report(
        file,
        "Callout kind must be one of key, info, warning, error, advanced, context",
      );
    }
    if (componentName === "Callout") {
      const authoredProps = attributeNames(source).filter(
        (name) => name !== "kind",
      );
      if (authoredProps.length > 0) {
        report(
          file,
          `Callout does not allow authored props: ${authoredProps.join(", ")}`,
        );
      }
    }
    if (componentName === "Diagram") {
      for (const prop of diagramAccessibilityProps) {
        if (!stringAttribute(source, prop)?.trim()) {
          report(file, `Diagram requires a non-empty ${prop}`);
        }
      }
      const authoredProps = attributeNames(source).filter(
        (name) => !diagramAccessibilityProps.includes(name),
      );
      if (authoredProps.length > 0) {
        report(
          file,
          `Diagram does not allow authored props: ${authoredProps.join(", ")}`,
        );
      }
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

async function validateLearnerSource(
  source,
  file,
  owner,
  declaredPacks,
  alignment,
) {
  if (!source) return;
  requiredString(source.data, "title", file, owner);
  validateSharedMetadata(source.data, file);
  validateAuthoringBoundary(source.content, file);
  validateSemanticComponents(source.content, file, declaredPacks);
  validateKnowledgeChecks(source.content, file);
  validateReflections(source.content, file, alignment);
  validatePracticeTasks(source.content, file, owner, alignment);
  validateCallouts(source.content, file);
  await validateDiagrams(source.content, file);
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
      await validateLearnerSource(lesson, file, "Lesson");
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

async function validateCourseBrief(file, dependencies) {
  const brief = await readMdx(file);
  if (!brief) return undefined;
  validateMetadata(courseBriefSchema, brief.data, file, "Course Brief");
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

  return factualRiskClassifications.has(brief.data.factualRisk)
    ? brief.data.factualRisk
    : undefined;
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
  factualRisk,
) {
  const moduleDir = path.join(courseDir, "modules", moduleEntry.name);
  validateSlug(moduleEntry.name, moduleDir, "Module");

  const moduleFile = path.join(moduleDir, "index.mdx");
  const moduleSource = await readRequiredMdx(moduleFile, "Module");
  await validateLearnerSource(
    moduleSource,
    moduleFile,
    "Module",
    declaredPacks,
    alignment,
  );
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
  await validateLearnerSource(
    checkpoint,
    checkpointFile,
    "Module Checkpoint",
    declaredPacks,
    alignment,
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
    await validateLearnerSource(
      lesson,
      lessonFile,
      "Lesson",
      declaredPacks,
      alignment,
    );
    if (lesson) {
      validateMetadata(lessonSchema, lesson.data, lessonFile, "Lesson");
      if (lesson.data.freshness) {
        validateFreshnessDeadline(
          lesson.data.freshness,
          lessonFile,
          "Lesson",
          factualRisk,
        );
      }
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
  const briefFile = path.join(courseDir, "_authoring", "brief.md");
  await validateArtifact(briefFile, "Course Brief at _authoring/brief.md");
  const factualRisk = await validateCourseBrief(
    briefFile,
    overview?.data.capabilityPacks,
  );
  const declaredPacks = validateCapabilityPackDependencies(
    overview?.data.capabilityPacks,
    overviewFile,
  );
  const alignment = createOutcomeAlignment({
    courseOutcomes: overview?.data.outcomes,
    courseFile: overviewFile,
    report,
  });
  await validateLearnerSource(
    overview,
    overviewFile,
    "Course",
    declaredPacks,
    alignment,
  );
  if (overview) {
    validateMetadata(courseSchema, overview.data, overviewFile, "Course");
    validateFreshnessDeadline(
      overview.data.freshness,
      overviewFile,
      "Course",
      factualRisk,
    );
  }

  const capstoneFile = path.join(courseDir, "capstone.mdx");
  const capstone = await readRequiredMdx(
    capstoneFile,
    "Capstone Demonstration",
  );
  await validateLearnerSource(
    capstone,
    capstoneFile,
    "Capstone Demonstration",
    declaredPacks,
    alignment,
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
      factualRisk,
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
  alignment.requireEveryOutcome({
    evidenceKind: outcomeEvidence.practiceTask,
    file: overviewFile,
    describeMissing: (outcomeId) =>
      `Learning Outcome ${outcomeId} is not practiced by any Practice Task`,
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

if (warnings.length > 0) {
  console.warn(
    `Content freshness warning:\n${warnings
      .map((warning) => `- ${warning}`)
      .join("\n")}`,
  );
}

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
