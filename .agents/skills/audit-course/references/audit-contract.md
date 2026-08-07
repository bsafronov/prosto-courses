# Course audit and release contract

This reference owns Independent Course Audit, the quality report, release validation and Render QA for a new Course.

## Contents

- [Run an Independent Course Audit](#6-run-an-independent-course-audit)
- [Complete the quality report](#7-complete-the-quality-report)
- [Validation and Definition of Done](#validation-and-definition-of-done)
- [Render QA](#render-qa)

### 6. Run an Independent Course Audit

After the full draft is complete, start a separate audit in a fresh agent context. Give
the auditor the Course Brief, Course Blueprint, Course source, Source Policy, and
platform contract. Do not ask it merely to agree with the Authoring Agent's summary.
The auditor begins from the requirements and sources, then checks the draft.

The audit must:

- independently verify every consequential or time-sensitive claim and a representative
  sample of lower-risk claims against authoritative sources;
- verify every deterministic answer, worked solution, and Capstone rubric by solving
  or tracing it rather than trusting the authored answer;
- check Outcome Alignment, prerequisites, coverage, cognitive load, scaffolding, and
  transfer to a changed case;
- run the plain-Russian, translation, terminology, and read-aloud audits;
- check accessibility, safety boundaries, jurisdiction, versions, and freshness;
- classify findings as `critical`, `material`, or `minor`, cite evidence, and propose
  a concrete correction.

The Authoring Agent fixes critical and material findings, records the disposition of
minor findings, and reruns affected checks. A critical finding blocks release. When
research cannot resolve a material disagreement between authoritative sources, use
the recorded intent and narrowest safe applicability boundary. Remove the dependent
claim or outcome when necessary; if no safe useful Course remains, preserve the draft
and block release.

An Independent Course Audit is stronger than Authoring Agent self-review, but it is
still an AI audit. It must never be represented as independent expert review, field
validation, or proof that no error remains.

### 7. Complete the quality report

Create `_authoring/quality-report.md` with:

- the final Outcome Alignment audit;
- coverage and dependency checks;
- checks of every deterministic answer and every worked solution;
- a practice-solvability review;
- the plain-Russian audit and any target-learner comprehension findings;
- source, version, jurisdiction, and Content Freshness checks;
- accessibility and render-QA findings;
- validator and build results;
- the Independent Course Audit method, fresh-context auditor, sources rechecked,
  findings by severity, corrections, and rerun results;
- remaining limitations and the absence of independent expert review, when relevant.

Stage the release state in that report. Before the catalog move, record the literal
line `Release state: candidate`, the completed draft checks, and each public gate as
pending. This state is truthful because the required ready status certifies the
Independent Course Audit, not publication. After public validation, build, and Render
QA pass, replace the pending entries with exact results and set
`Release state: published`; validate that final report before declaring release.

Record the audit in a non-empty `## Independent Course Audit` or
`## Независимый ИИ-аудит` section.

Release the Course when validation passes, the Independent Course Audit has no
unresolved critical or material findings, every consequential uncertainty has a
documented resolution or safe applicability boundary, and no release journal remains.
Give the Course Owner a concise release summary: what the Course now teaches, audit
result, material assumptions, and remaining high-risk limitations. Course Owner
approval is not a release gate.

The public validator treats these as structured artifacts, not placeholder
files. Each uses its documented level-one heading, a positive `Version` or
`Версия`, a ready `Status` or `Статус`, and non-empty level-two sections named
above. Headings inside fenced examples do not satisfy the artifact contract. New
delegated artifacts use these states:

- Brief: `Статус: замысел зафиксирован; делегированное создание курса активно`;
- Blueprint: `Статус: проект курса проверен; делегированное создание курса активно`;
- quality report: `Статус: независимый ИИ-аудит завершён; критических и существенных замечаний нет`.

Legacy Course Owner approvals remain valid. `Approved by Authoring Agent` is not a
valid substitute: Authoring Agent self-review is neither owner approval nor an
Independent Course Audit. The Brief records decisions and assumptions; the Blueprint
records Reference Lesson calibration and workload; the quality report records its
independent audit, validation run, and remaining limitations.

## Validation and Definition of Done

Validate the completed draft with `COURSE_CONTENT_ROOT=./drafts/courses`. After it
passes, confirm that `src/content/courses/<course-slug>` does not exist. Create a
transient `drafts/course-releases/<course-slug>.md` journal containing the closed
Intake identity, exact draft and target paths, current gate, attempts, results, and
the literal line `Journal state: candidate`. Then move the whole Course tree to the
target without overwrite as a release candidate and run the public validation and
build entry points:

```sh
pnpm validate
pnpm build
```

Run Render QA while the release candidate is at the catalog path. After all three
gates pass, write their exact results to the quality report, set
`Release state: published`, set `Journal state: final-validation`, and run
`pnpm validate` once more against the final report. If learner-facing source or
metadata changed after a successful build or Render QA pass, rerun those affected
gates too. Delete the journal only after every final required check succeeds; that
deletion finalizes publication.

If an invocation finds no draft but finds both a catalog target and matching release
journal whose Intake identity and paths agree, treat it as the owned interrupted
transaction regardless of the report state: resume the journal's current gate or
roll it back. If no draft or journal exists and the requested catalog target has a
closed Intake record plus `Release state: published`, report idempotent success
without changing it. Any other target without a matching journal is a conflict.

If any post-move gate fails, reset the report to `Release state: candidate`, record
the failure in both report and journal, move the Course back to its original draft
path when that move is safe, preserve diagnostics, and leave no catalog target.
If rollback itself cannot be completed safely, report the exact filesystem state and
never claim publication.

The target validator must reject:

- invalid directory placement or missing Course ownership;
- missing Module Checkpoints or Capstone Demonstration;
- duplicate, missing, or non-contiguous orders;
- duplicate Lesson slugs across Modules;
- malformed metadata, dates, freshness, or Content Revisions;
- unknown Learning Outcome references or incomplete Outcome Alignment;
- unavailable Capability Packs;
- invented components or invalid component props;
- malformed deterministic answers;
- missing Practice Task criteria, solution/rubric, or required feedback;
- missing visual descriptions, data provenance, or accessibility fields;
- links, asset paths, or provenance URLs that break or still point to `drafts/`
  after publication;
- stale high-risk content;
- presentation imports, custom scripts, styles, layouts, or progress controls.

Technical validity is necessary but not sufficient. Before release, confirm:

- every Learning Outcome is taught, practiced, and demonstrated;
- dependencies are introduced before use;
- every Lesson completes the Learning Cycle without mechanical headings;
- examples and tasks are solvable from available material;
- feedback diagnoses reasoning rather than merely revealing an answer;
- support fades toward independent transfer;
- Cumulative Retrieval is present across the Course;
- no Lesson is overloaded or padded;
- each difficult explanation starts from the learner's need, makes its causal or
  decision model explicit, and tests a changed case;
- learner-facing prose passes the plain-Russian, translation, and read-aloud audits;
- every retained non-Russian fragment has an identity, source, interface, or technical
  reason and uses the authoritative original form;
- comprehension findings from the Reference Lesson are resolved or their absence is
  recorded as a limitation;
- visuals reduce cognitive load and remain understandable without color;
- claims satisfy the Source Policy;
- External References are supplemental and the core learning path is self-contained;
- Russian prose follows the Course Voice;
- the Capstone genuinely demonstrates all Learning Outcomes.

The Course Owner receives the release summary and may request a broader review, but
no additional approval or question is part of the default workflow.

### Render QA

Inspect the rendered Course Overview, Capstone, one representative Lesson per Module, and every page containing a unique component or visual pattern. Check desktop and mobile widths, keyboard interaction, heading order, table and code overflow, Chart readability, fallback content, and feedback announcements.

Fix Course source only within this contract. Do not add local CSS or scripts to conceal a platform defect; record that defect separately.
