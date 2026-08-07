---
name: create-course
description: Create and publish one complete new Course from a free-form request. Use when the Course Owner wants intake, research, design, natural-Russian authoring, independent audit, validation, and release completed in one invocation.
---

# Create Course

Turn one request into one published Course. Own every stage transition; never ask the Course Owner to invoke another skill.

## Close intake once

Before writing Course artifacts, inspect the request and repository far enough to avoid asking for discoverable facts. Extract:

- the Learner Profile, application context, and entry capabilities;
- the observable final performance and evidence of success;
- the desired Course Depth, time budget, scope, and exclusions;
- consequential jurisdiction, safety, accessibility, or product constraints.

Ask one adaptive intake card containing at most three short questions. Reuse details already supplied. If nothing material is missing, restate the inferred learner, result, and scope and ask for confirmation. Include a recommended default for every open choice, then wait for one reply.

After that reply, ask no more questions. Before further work, create the draft path and write a durable `## Intake record` checkpoint in `_authoring/brief.md` containing the exact original request, reply, inferred learner/result/scope, accepted defaults, and `Intake state: closed`. Preserve that section when completing the Brief.

Resolve later uncertainty in this order: authoritative evidence, confirmed intent, repository conventions, the narrowest useful scope, then the safest reversible and accessible default. Record every material assumption or narrowing in the Course Brief and final summary. Never broaden scope silently. If no safe useful Course remains, preserve the draft, record the blocker, and stop without publishing.

## Run the pipeline

Use durable artifacts as stage gates and load only the current stage's contracts. Keep authoring and independent audit in separate agent contexts; use fresh contexts for the Reference Lesson cold read and Independent Course Audit.

1. **Design.** Read the complete [design contract](../design-course/references/design-contract.md). Research the topic and platform, then create ready `_authoring/brief.md` and `_authoring/blueprint.md` under `drafts/courses/<course-slug>/`.
2. **Author.** Read the complete [authoring](../author-course/references/authoring-contract.md), [plain-Russian](../author-course/references/plain-russian-contract.md), and [platform](../author-course/references/platform-contract.md) contracts. Calibrate a representative Lesson with a fresh cold reader, author the Course Module by Module, and pass draft validation.
3. **Audit and release.** Start from raw artifacts and sources, not the author's summary. Read the complete [audit contract](../audit-course/references/audit-contract.md), run a fresh Independent Course Audit, correct every critical and material finding, create the staged quality report, and complete the resumable release transaction.

Do not treat stage self-review as independent evidence. Do not publish while any required artifact or gate is incomplete.

## Resume safely

When a matching unfinished draft exists, verify its `## Intake record` and resume from the first incomplete artifact gate. Reuse a closed intake instead of questioning the Course Owner again.

When no draft exists but `drafts/course-releases/<course-slug>.md` points to a catalog target with the same Intake record, treat it as an interrupted owned release regardless of the report's current state: resume its pending gate or roll it back. When no journal exists and the target has the same Intake record plus `Release state: published`, report idempotent success without changing it. Treat a different draft identity or any other catalog target as an exact conflict. Never overwrite it. On research, audit, validation, build, or Render QA failure, leave a diagnosable draft and release journal but no catalog target; report the failed gate without claiming completion.

## Finish

Finish only when the Course is present at `src/content/courses/<course-slug>/`, its release journal is absent, every contract gate passes, and no unresolved critical or material finding remains. Report the published path, learner and outcomes, important assumptions, source/freshness boundary, audit result, checks, and remaining limitations.
