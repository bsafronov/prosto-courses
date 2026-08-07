---
name: author-course
description: Author a complete natural-Russian Course draft from a ready Course Brief and Course Blueprint.
---

# Author Course

Turn a ready design into a complete learner-facing draft. Keep it in `drafts/courses/<course-slug>/`; leave independent audit and publication to `$audit-course`.

## Load the contract

Resolve the requested slug or the single eligible draft. If selection is ambiguous, stop and list the candidates without asking a question. Require ready `_authoring/brief.md` and `_authoring/blueprint.md`. Resume from the first incomplete gate: Reference Lesson calibration, the next incomplete Module, Course Overview and Capstone, then self-review.

Read both artifacts and the complete contracts for [authoring](references/authoring-contract.md), [plain Russian](references/plain-russian-contract.md), and the [platform](references/platform-contract.md). Treat the Brief and Blueprint as the intent contract. Resolve later uncertainty from evidence and recorded intent; choose the narrowest safe default and record it. Update both design artifacts before any material scope or outcome change. Ask no Course Owner questions.

## Calibrate, then author

Write one representative Reference Lesson from the middle of the Course. Give a fresh cold reader only the Learner Profile, needed entry capabilities, Learning Outcome, and Lesson source. Require the reader to recover the central model, explain it without copying, and solve a changed case. Correct every material comprehension, Russian, task, feedback, or platform problem. Record the lesson path, cold-read input, findings, corrections, reruns, limitations, and `Calibration state: ready` under `## Reference Lesson calibration` in the Blueprint before continuing.

Author Modules in dependency order. For each Module:

- connect every Lesson to prior capability and the next meaningful action;
- explain precise ideas in simple, idiomatic Russian through relevant household or work examples;
- show consequential reasoning, then fade support from partial completion to independent transfer;
- give a genuine attempt before hints, answers, solutions, or rubrics;
- return earlier capabilities through Cumulative Retrieval;
- solve every deterministic answer and worked solution independently;
- complete the Module Checkpoint and pass alignment, language, accessibility, and source checks.

Create the Course Overview and Capstone Demonstration only after the Module path is coherent. Then run separate accuracy, structure, Russian, read-aloud, solvability, Outcome Alignment, sources/freshness, component, and accessibility passes. Run draft validation; the only acceptable pre-audit error is the missing quality report.

Finish only when the full Course tree exists, every Learning Outcome is taught, practiced, and demonstrated, and no known critical or material authoring finding remains. Report the draft path, coverage, cold-read result, limitations, and `$audit-course <course-slug>`.
