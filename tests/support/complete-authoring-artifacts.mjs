import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const contracts = {
  "brief.md": {
    heading: "# Course Brief",
    marker: "## Learner Profile",
    sections: [
      ["Learner Profile", "Defined by this focused contract fixture's Course metadata."],
      ["Scope", "Limited to the one validator behavior named by the fixture."],
      ["Learning Outcomes", "Declared in the fixture's learner-facing Course source."],
      ["Capstone Demonstration", "Uses the fixture's authored Capstone evidence."],
      ["Time budget", "Uses the fixture's authored time estimates."],
      ["Source Policy", "Repository contract behavior is the primary source."],
      ["Accessibility and safety constraints", "Semantic text remains the required fallback."],
      ["Accepted assumptions and unresolved risks", "No independent expert review was performed."],
      ["Approval record", "Course Owner approved this focused contract fixture."],
    ],
  },
  "blueprint.md": {
    heading: "# Course Blueprint",
    marker: "## Concept map",
    sections: [
      ["Concept map", "Represented by the fixture's focused Course tree."],
      ["Sequence", "Lesson, Module Checkpoint, then Capstone Demonstration."],
      ["Outcome Alignment", "The public validator determines the fixture's expected alignment result."],
      ["Instructional Scaffolding", "The fixture keeps only support needed by its test seam."],
      ["Cumulative Retrieval", "Checkpoint and Capstone reuse Lesson capabilities."],
      ["Reference Lesson", "The fixture Lesson calibrates this contract example."],
      ["Coverage audit", "The owning test asserts the fixture's intentional defect or valid path."],
      ["Workload", "Authored estimates cover all core destinations."],
    ],
  },
  "quality-report.md": {
    heading: "# Quality report",
    marker: "## Outcome Alignment audit",
    sections: [
      ["Outcome Alignment audit", "Result is asserted by the fixture's public-validator test."],
      ["Coverage and dependency checks", "Result is asserted by the fixture's public-validator test."],
      ["Deterministic answers", "Result is asserted by the fixture's public-validator test."],
      ["Practice solvability", "Core work is self-contained inside the fixture."],
      ["Source, version, jurisdiction and freshness", "Result is asserted with an injected validation date."],
      ["Accessibility and render-QA scope", "Semantic behavior remains part of fixture acceptance."],
      ["Validation record", "The fixture runs only through the public validation entry point."],
      ["Remaining limitations", "No independent expert review was performed."],
    ],
  },
};

const versionPattern = /^(?:Version|Версия)\s*:?\s*[1-9]\d*\b/im;
const approvalPattern =
  /^(?:Status|Статус)\s*:\s*(?:(?:approved|одобрен(?:а|о|ы)?)(?=\s|[.;,]|$).*Course Owner|Course Owner approval.*(?:recorded|зафиксирован))/im;

async function completeArtifact(file, contract) {
  let source;
  try {
    source = await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }

  const headingPattern = new RegExp(
    `^${contract.heading.replace("# ", "#\\s+")}\\b`,
    "im",
  );
  if (!headingPattern.test(source)) {
    source = source.replace(/^#\s+.*$/m, contract.heading);
  }
  if (!versionPattern.test(source)) {
    source = source.replace(
      contract.heading,
      `${contract.heading}\n\nVersion 1.`,
    );
  }
  if (!approvalPattern.test(source)) {
    source = `${source.trimEnd()}\n\nStatus: approved by Course Owner for contract-fixture use.\n`;
  }
  if (!source.includes(contract.marker)) {
    const sections = contract.sections
      .map(([heading, content]) => `## ${heading}\n\n${content}`)
      .join("\n\n");
    source = `${source.trimEnd()}\n\n${sections}\n`;
  }
  await writeFile(file, source);
}

export async function completeAuthoringArtifacts(courseDirectory) {
  const directory = path.join(courseDirectory, "_authoring");
  for (const [filename, contract] of Object.entries(contracts)) {
    await completeArtifact(path.join(directory, filename), contract);
  }
}

export async function completeContentRootAuthoringArtifacts(contentRoot) {
  for (const entry of await readdir(contentRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    await completeAuthoringArtifacts(path.join(contentRoot, entry.name));
  }
}
