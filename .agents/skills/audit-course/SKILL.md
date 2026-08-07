---
name: audit-course
description: Independently audit, correct, validate, and publish one complete new Course draft.
---

# Audit Course

Audit a complete draft in a fresh context, correct it, create the quality report, and publish only after every release gate passes.

## Establish independent input

Resolve the requested slug or the single eligible draft. If selection is ambiguous, stop and list candidates without asking a question. Require a ready Brief, Blueprint, and complete learner-facing Course tree. The catalog target must be absent unless a matching `drafts/course-releases/<course-slug>.md` journal points to it and its Brief carries the same Intake record; in that case resume or roll back the interrupted owned release. If no draft or journal exists and the requested target has a closed Intake record plus `Release state: published`, report idempotent success without changing it. Treat every other target as a conflict.

Read the complete [audit contract](references/audit-contract.md) and its linked design, authoring, plain-Russian, and platform contracts. Build the audit bundle from raw requirements, sources, evidence ledger, platform manifest, and Course source. Do not include the author's verdict or suspected findings.

## Audit and correct

Use a fresh auditor to run distinct passes for:

- consequential facts, causal models, versions, jurisdiction, safety, and freshness;
- every Learning Outcome from instruction through practice, Module Checkpoint, and Capstone transfer;
- every deterministic answer, worked solution, task, and rubric criterion;
- prerequisites, cognitive load, scaffolding, Cumulative Retrieval, and Course continuity;
- natural Russian, terminology, language boundaries, read-aloud quality, and Course Voice;
- platform metadata, components, accessibility, and render risks.

Require each finding to include location, severity, evidence, consequence, and correction. Verify findings, fix every critical and material issue, disposition minor findings, and rerun affected passes in a fresh context when changes are substantial. Ask no Course Owner questions: resolve uncertainty through evidence, recorded intent, narrow scope, and safe reversible defaults. If no safe useful Course remains, block release and preserve the draft.

## Release transactionally

After the audit converges, create `_authoring/quality-report.md` with the required ready audit status, draft-check results, `Release state: candidate`, and public gates explicitly marked pending. Validate the draft, verify future links and assets, and ensure the catalog target remains absent. Before moving, create `drafts/course-releases/<course-slug>.md` with the Intake identity, draft and target paths, current gate, attempts, results, and `Journal state: candidate`. Move the Course to `src/content/courses/<course-slug>/`, then run `pnpm validate`, `pnpm build`, and required desktop/mobile/keyboard Render QA.

After those gates pass, update the report with their exact results and `Release state: published`; update the journal to `Journal state: final-validation`; then run `pnpm validate` against that final report. Rerun build and affected Render QA too if any learner-facing source or metadata changed after their successful pass. Delete the journal only after the final required checks succeed. Journal removal finalizes publication.

If interrupted while the candidate is at the catalog path, use the matching journal to resume the pending gate or roll it back; do not report a conflict. If any post-move gate fails, reset the report to `Release state: candidate`, record the failure in both report and journal, move the Course back to its original draft path when safe, preserve diagnostics, and leave no catalog target. Never claim publication while a gate is failing and never overwrite either path.

Finish only with zero unresolved critical or material findings, successful validation/build/Render QA, a truthful quality report, the Course at its published path, and no release journal. Report what it teaches, audit result, checks, source/freshness boundary, remaining high-risk limitations, and the published path.
