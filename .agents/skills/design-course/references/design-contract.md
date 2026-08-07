# Course design contract

This reference owns the requirements used by `$design-course`. Later-stage requirements live in the canonical authoring, platform, plain-Russian, and audit references linked from `docs/authoring.md`.

## Contents

- [What a complete Course means](#what-a-complete-course-means)
- [Collaboration with the Course Owner](#collaboration-with-the-course-owner)
- [Required design workflow](#required-authoring-workflow)
- [Target directory convention](#target-directory-convention)
- [Metadata](#metadata)
- [Course architecture](#course-architecture)
- [Sources, claims, and Content Freshness](#sources-claims-and-content-freshness)

An Authoring Agent creates or changes versioned Course source through this provider-independent contract. It does not import layouts, navigation, progress controls, styles, scripts, or application components. The platform owns presentation and learner-state behavior.

All learner-facing content is idiomatic Russian written for the recorded Learner
Profile. Plain language means that this learner can find the needed idea, understand
it, and use it; it does not mean deleting necessary precision or writing for an
imagined universal audience. Write Russian as Russian rather than as a visible
translation from another language. Use the domain language from `CONTEXT.md`
consistently.

## What a complete Course means

A Course is complete relative to its recorded Learner Profile, scope, and Learning Outcomes. It is complete when a learner with the stated entry capabilities can:

- demonstrate every Learning Outcome in a realistic new situation;
- handle the important normal cases;
- recognize consequential errors, limits, and trade-offs;
- identify the boundary beyond which another Course or independent investigation is needed.

Completeness does not mean exhausting everything known about a topic. If the requested topic cannot be covered coherently within the time and depth constraints, propose a narrower scope or several separate Courses before designing content.

## Collaboration with the Course Owner

Delegated Authoring uses one compact intake round. The Course Owner supplies the
learner's need, product intent, known constraints, and value judgments. The Course
Owner is not expected to be a subject-matter expert or to verify facts, explanations,
or instructional choices. The Authoring Agent owns research, source verification,
terminology, sequence, pedagogy, examples, assessment alignment, plain Russian, and
quality control.

Inspect the repository, available Capability Packs, and authoritative sources far
enough to avoid asking for discoverable facts. Reuse details already present in the
request. Before writing artifacts, ask one adaptive decision card with at most three
short questions covering only choices that materially affect the Learner Profile,
final performance, scope, depth, safety, jurisdiction, accessibility, cost, or an
irreversible dependency. If no material detail is missing, restate the inferred
learner, result, and scope and ask for confirmation. Include a recommended default
for every open choice and wait for one reply.

After that reply, close intake and ask no more questions. Resolve later uncertainty
in this order: authoritative evidence, confirmed intent, repository conventions, the
narrowest useful scope, then the safest reversible and accessible default. Record
every material decision, evidence, and assumption in the Course Brief, Course
Blueprint, or quality report. Never broaden scope or change Learning Outcomes
silently. If no safe useful Course remains, preserve the draft, record the exact
blocker, and stop without publication. Course Owner review is never a default gate.

Immediately after the intake reply, create the draft path and persist an initial
`_authoring/brief.md` before any further research or design. Its non-empty
`## Intake record` contains the exact original request, the Course Owner's one reply,
the inferred learner, final performance and scope, every accepted default, and the
literal line `Intake state: closed`. This is a resumable checkpoint, not a ready
Brief; expand the same file and preserve this section throughout the workflow.

## Required authoring workflow

### 1. Investigate the topic and platform

Before closing intake:

- inspect existing Course source, the component contract, validation rules, and relevant domain decisions;
- identify the topic's authoritative primary and secondary sources;
- identify facts that are jurisdiction-, date-, standard-, or version-dependent;
- confirm which Capability Packs the platform supports;
- identify safety, accessibility, and factual-risk concerns.

### 2. Record the Course Brief

Create `_authoring/brief.md`. It is versioned but never learner-facing. It must contain:

- the closed `## Intake record` and original request identity;
- the Learner Profile and application context;
- observable entry capabilities;
- the learner's practical need;
- scope inclusions and explicit exclusions;
- stable Learning Outcome IDs and observable statements;
- the expected Capstone Demonstration and evidence of learning;
- the total time budget and target Course Depth;
- required Capability Packs;
- the Source Policy, jurisdiction, versions, and Content Freshness policy;
- the Russian register, required terms, and source-language or localization risks;
- accessibility or safety constraints;
- accepted assumptions and unresolved risks;
- Critical Decisions, their answers or safe defaults, and any decisions still blocking
  dependent work.

Record a non-empty `## Evidence ledger` for consequential, disputed, or time-sensitive
claims and models. Each entry states the claim, exact authoritative source, applicable
version or jurisdiction, verification date, applicability boundary, and planned Course
location. Ordinary low-risk facts need no ledger entry.

Record the last item in a non-empty `## Decision record` section. The validator also
accepts the legacy `## Approval record` heading for existing Courses.

Do not design the Course structure until the Brief records a coherent intent and no
unresolved Critical Decision blocks design. Explicit Course Owner approval is not
required in Delegated Authoring.

Course Brief frontmatter classifies the Course's factual risk:

```yaml
---
factualRisk: standard
capabilityPacks:
  - name: approved-pack-name
    version: 1.2.0
---
```

Use `standard` for ordinary factual content and `high` for medical, legal,
financial, safety, or similarly consequential material. This is a risk
classification, not an expert-review claim. Do not add approval or reviewer
credentials to the Course Brief. When Capability Packs are required, confirm
the same exact dependencies in Course Brief and Course metadata.

### 3. Verify the Course Blueprint

Create `_authoring/blueprint.md`. It is versioned but never learner-facing. It must contain:

- a concept map and prerequisite dependencies;
- ordered Modules and the intermediate capability of each;
- ordered Lessons and the single primary capability of each;
- each Module Checkpoint;
- the Capstone Demonstration and its rubric;
- Outcome Alignment from every Learning Outcome to instruction, practice, Module Checkpoints, and Capstone criteria;
- the Instructional Scaffolding plan;
- the Cumulative Retrieval plan;
- the explanation plan for difficult concepts, including concrete cases, causal
  models, necessary terms, boundaries, and likely misconceptions;
- study, practice, and optional advanced time estimates;
- a coverage audit for gaps, duplication, overload, and unnecessary material.

Design backward from the Capstone Demonstration. Do not begin by making a list of topics and adding a final project afterward.

Before authoring Lessons, the Authoring Agent verifies that the Blueprint covers every
Learning Outcome, respects dependencies and workload, and contains no unresolved
Critical Decision that blocks authoring. Course Owner approval is optional.

## Target directory convention

Design and author the versioned draft in `drafts/courses/<course-slug>/`. After the
Independent Course Audit passes and the quality report is complete, publish the same
self-contained tree at `src/content/courses/<course-slug>/`:

```text
src/content/courses/<course-slug>/
├── index.mdx
├── capstone.mdx
├── _authoring/
│   ├── brief.md
│   ├── blueprint.md
│   └── quality-report.md
└── modules/
    └── <module-slug>/
        ├── index.mdx
        ├── checkpoint.mdx
        └── lessons/
            └── <lesson-slug>.mdx
```

A Course has at least one Module. A Module has at least one Lesson and exactly one Module Checkpoint. A Course has exactly one Capstone Demonstration.

Use lowercase URL-safe slugs with hyphens. Slugs express identity, not order.

- Keep a Course slug while its Learner Profile, scope, and Learning Outcomes remain substantially the same.
- Keep a Module slug while it develops the same intermediate capability.
- Keep a Lesson slug while it develops the same primary capability.
- A Lesson's public identity is `course-slug + lesson-slug`, independent of its Module directory.
- Moving a Lesson between Modules must not change its URL, Content Revision, or Lesson Progress.
- Lesson slugs must be unique across the whole Course.
- Use a new slug only when the corresponding capability is fundamentally replaced.

## Metadata

Metadata stores authoritative authored facts. The platform derives counts, totals, links, progress, and aggregated freshness.

### Course metadata

`index.mdx` requires:

```mdx
---
title: Понятное название курса
summary: Одно предложение, помогающее решить, подходит ли курс.
learnerProfile: Для начинающих бухгалтеров, знакомых с назначением первичных документов.
prerequisites:
  - Различать доход, расход, актив и обязательство на бытовых примерах
outcomes:
  - id: reconcile-balance
    statement: Сверять оборотно-сальдовую ведомость и находить причину расхождения
createdAt: 2026-07-22
capabilityPacks: []
freshness:
  mode: time-sensitive
  applicability: jurisdiction-specific
  verifiedAt: 2026-07-22
  reviewAfter: 2026-10-22
  jurisdiction: Российская Федерация
---
```

Rules:

- `summary` is concise and concrete.
- `learnerProfile` describes one primary learner and target level.
- `prerequisites` are observable capabilities, not vague labels such as “basic knowledge.”
- Each outcome has a unique stable lowercase-hyphen ID and an observable statement.
- `createdAt` is the original Course creation date and never changes.
- `capabilityPacks` contains exact `{ name, version }` dependencies when required. Names and versions must match the platform manifest; version ranges and combined strings such as `pack@1.2.0` are invalid.
- `freshness.mode` is `stable` or `time-sensitive`.
- `applicability` is `global` or `jurisdiction-specific`.
- `verifiedAt` records factual verification, not the last file edit.
- `reviewAfter` is required for time-sensitive content.
- `reviewAfter` must be later than `verifiedAt`.
- `jurisdiction` is required for `jurisdiction-specific` applicability and is
  not allowed for `global` applicability.

Do not add manually maintained module counts, lesson counts, total duration, progress, or last-modified dates.

### Module metadata

Each `modules/<module-slug>/index.mdx` requires:

```mdx
---
title: Основы двойной записи
summary: Свяжи хозяйственную операцию с изменениями двух счетов.
order: 1
capability: Объяснять и составлять простые записи без нарушения балансового равенства
outcomes:
  - reconcile-balance
---
```

Module orders are unique and contiguous from `1` within the Course. `outcomes` references Course Learning Outcome IDs.

### Lesson metadata

Every Lesson requires:

```mdx
---
title: Как операция изменяет баланс
order: 1
revision: 1
capability: Определять статьи баланса, затронутые одной хозяйственной операцией
outcomes:
  - reconcile-balance
time:
  study: 12
  practice: 18
  advanced: 0
---
```

Rules:

- Lesson orders are unique and contiguous from `1` within the Module.
- `revision` is a positive integer.
- Increment `revision` only when the learner action or mental model changes materially.
- Do not increment it for spelling, wording, link, source-refresh, or Module-move changes.
- Time values are estimated integer minutes; `advanced` is optional learner time.
- A Lesson may override Course freshness only when its source lifecycle materially differs.

### Module Checkpoint and Capstone metadata

`checkpoint.mdx` requires `title`, `outcomes`, and `time`. Its outcome IDs must belong to the Course, and it must cover every Learning Outcome taught by Lessons in its Module.

`capstone.mdx` requires `title`, `outcomes`, `criteria`, and `time`:

```mdx
---
title: Сверка оборотно-сальдовой ведомости
outcomes:
  - reconcile-balance
criteria:
  - statement: Причина расхождения установлена и связана с конкретной операцией
    outcomes:
      - reconcile-balance
time: 45
---
```

Each Capstone criterion has an observable learner-facing `statement` and at least one Course Learning Outcome ID. The Capstone and its criteria collectively cover every Course Learning Outcome.

The public validator rejects unknown or duplicate references, learner-facing Course parts with no Learning Outcome, outcomes not taught by a Lesson, outcomes omitted by the appropriate Module Checkpoint, and outcomes not demonstrated by a Capstone criterion. These rules form the shared Outcome Alignment model that later Knowledge Check, Practice Task, and Reflection validation extends.

The platform calculates Course duration, counts, aggregated Content Freshness, navigation, and Course Completion.

## Course architecture

### One Course, one Learner Profile

Do not try to teach novices and experts in the same primary route. Brief prerequisite reminders and optional advanced material may support nearby needs. Divergent entry capabilities, outcomes, or depth require separate Courses.

### One Module, one intermediate capability

A Module groups Lessons that jointly develop one usable capability. It ends with a Module Checkpoint that integrates material rather than repeating the final Lesson.

### One Lesson, one primary capability

A Lesson normally takes 15–35 minutes including short practice. Longer labs and Capstone work are estimated separately. Split a Lesson when the learner must coordinate too many new ideas at once; do not split coherent work merely to create “micro-lessons.”

Each Lesson follows the Learning Cycle. The functions are required, but fixed headings are not:

1. Activate relevant prior knowledge and present a meaningful problem.
2. Build an accurate mental model in plain language.
3. Elicit a meaningful learner action.
4. Provide corrective, explanatory feedback.
5. Test transfer in a changed situation.
6. Consolidate the key idea and connect it to later learning.

## Sources, claims, and Content Freshness

### Source hierarchy

The Course Brief defines a topic-specific hierarchy. Prefer, in order:

1. primary law, standard, specification, dataset, or original research;
2. official regulator or maintainer guidance;
3. authoritative professional reference material;
4. secondary teaching material for explanation only.

For law- or regulation-dependent content, distinguish an official act from commentary about it. Record jurisdiction, applicable version, and verification date. Link to the exact document or section, not a resource home page.

Place a citation close to the claim it supports. Clearly label simulations, simplifications, opinions, disputed interpretations, and uncertainty. Do not invent facts about real organizations.

### External References

An External Reference may supplement explanation or let a learner verify a
claim, but it cannot be required to complete the core learning path. Every
core Lesson explanation, Knowledge Check, Practice Task, Module Checkpoint,
and Capstone Demonstration must remain understandable and completable from
platform-owned material alone.

Use descriptive link text and link to the exact relevant resource. Do not add
installation, offline, new-window, badge, icon, or connectivity markup to
Course source. The platform marks External References as requiring internet,
opens them separately when online, and explains why navigation is blocked
when the learner is offline.

For medical, legal, financial, safety, or other high-risk content:

- state applicability boundaries;
- rely on current authoritative sources;
- disclose in the quality report when no independent expert reviewed the Course;
- never claim AI self-review is expert approval.

An Independent Course Audit and authoritative sourcing are required, but neither is a
substitute for an independent expert. Expert review is not a universal publication
gate; unresolved consequential uncertainty is. For high-risk content, block release
when sources conflict materially, applicability cannot be bounded, or the AI audit
cannot verify a consequential claim. Disclose the missing expert review even when the
remaining uncertainty is bounded.

### Freshness semantics

`createdAt`, modification time, and Content Freshness are different:

- `createdAt` records original Course creation;
- modification time is derived from Git and may reflect a trivial edit;
- `verifiedAt` records the last factual source verification;
- `reviewAfter` records when verification must be repeated.

A time-sensitive Lesson may override Course freshness. Module freshness is derived from its Lessons, and Course freshness uses the earliest dependent `reviewAfter`. A law or source change can make content stale even when no file changed. Fixing a typo does not refresh factual verification.

The validator emits an actionable warning for stale standard content and
rejects publication of stale high-risk content. Validation normally compares
deadlines with the current date. Contract and browser tests inject a calendar
date without changing the machine clock:

```sh
CONTENT_VALIDATION_DATE=2026-10-23 pnpm validate
```

Course and Module overviews show the verification date, jurisdiction, review
deadline, and state from the same controlling freshness record: the dependent
time-sensitive record with the earliest `reviewAfter`. Git modification time
is not verification metadata and is never shown as such.
