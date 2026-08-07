---
name: design-course
description: Research and design one new Course, producing a ready Course Brief and Course Blueprint without learner-facing content.
---

# Design Course

Design one new Course in `drafts/courses/<course-slug>/` and stop before learner-facing authoring.

## Establish the input

Read `AGENTS.md`, `CONTEXT.md`, `docs/authoring.md`, and the complete [design contract](references/design-contract.md). Accept either a free-form Course Owner request or a confirmed intake from `$create-course`. Create a short lowercase-hyphen slug when none is supplied. Resume a matching partial design from its Intake record and first incomplete artifact gate; stop on a different draft identity or any published slug conflict.

When no confirmed intake exists, inspect the request and repository first, then ask one adaptive card with at most three questions covering the Learner Profile and entry capabilities, observable final performance, and material depth, time, scope, jurisdiction, or safety constraints. Reuse supplied facts; if the request is complete, restate the inferred design and ask for confirmation. Include recommended defaults and wait once.

After intake closes, ask no further questions. First create the draft path and persist the closed Intake record in `_authoring/brief.md`. Resolve later uncertainty through evidence, confirmed intent, repository conventions, narrow scope, and safe reversible defaults. Record every consequential choice. If no safe useful scope remains, preserve the artifacts and stop.

## Design backward

Research the platform and topic from authoritative sources. Build the Course from Capstone evidence backward to Learning Outcomes, prerequisite capabilities, Modules, Lessons, practice, Module Checkpoints, and Cumulative Retrieval. Keep one Learner Profile, one intermediate capability per Module, and one primary capability per Lesson. Remove material that serves no outcome, prerequisite, misconception, or transfer need.

Create only:

1. `_authoring/brief.md`, with a coherent learner need, outcomes, scope, Source Policy, evidence ledger, constraints, assumptions, and closed decision record;
2. `_authoring/blueprint.md`, with dependencies, aligned instruction and practice, scaffolding, retrieval, explanation plans, workload, and coverage audit.

Finish only when both artifacts satisfy every readiness criterion in the design contract and no unresolved uncertainty blocks safe authoring. Report their paths, the Course's practical promise, material defaults, limitations, and the next standalone command `$author-course <course-slug>`.
