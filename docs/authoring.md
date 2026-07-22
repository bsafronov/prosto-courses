# Course authoring contract

> **Implementation status:** this is the accepted target contract for a breaking platform revision. The current content loader, routes, components, and validator do not implement it yet. Do not publish newly authored Courses until the platform migration is complete.

An Authoring Agent creates or changes versioned Course source through this provider-independent contract. It does not import layouts, navigation, progress controls, styles, scripts, or application components. The platform owns presentation and learner-state behavior.

All learner-facing content is Russian. Use the domain language from `CONTEXT.md` consistently.

## What a complete Course means

A Course is complete relative to its approved Learner Profile, scope, and Learning Outcomes. It is complete when a learner with the stated entry capabilities can:

- demonstrate every Learning Outcome in a realistic new situation;
- handle the important normal cases;
- recognize consequential errors, limits, and trade-offs;
- identify the boundary beyond which another Course or independent investigation is needed.

Completeness does not mean exhausting everything known about a topic. If the requested topic cannot be covered coherently within the time and depth constraints, propose a narrower scope or several separate Courses before designing content.

## Collaboration with the Course Owner

The Course Owner is the only person who approves design decisions. The Authoring Agent must establish shared understanding before authoring content.

For every material decision:

1. Inspect the repository, available Capability Packs, and authoritative sources first.
2. Do not ask the Course Owner for facts that can be established reliably.
3. Ask one decision question at a time.
4. Recommend an answer and explain its important consequences.
5. Record the accepted answer immediately in the Course Brief or Course Blueprint.
6. State any low-impact assumptions explicitly.
7. Stop when a new decision would contradict or materially expand an approved artifact.

The Course Owner may explicitly delegate a decision. Delegation is not permission to change the Course scope or Learning Outcomes silently.

## Required authoring workflow

### 1. Investigate the topic and platform

Before asking design questions:

- inspect existing Course source, the component contract, validation rules, and relevant domain decisions;
- identify the topic's authoritative primary and secondary sources;
- identify facts that are jurisdiction-, date-, standard-, or version-dependent;
- confirm which Capability Packs the platform supports;
- identify safety, accessibility, and factual-risk concerns.

### 2. Agree the Course Brief

Create `_authoring/brief.md`. It is versioned but never learner-facing. It must contain:

- the Learner Profile and application context;
- observable entry capabilities;
- the learner's practical need;
- scope inclusions and explicit exclusions;
- stable Learning Outcome IDs and observable statements;
- the expected Capstone Demonstration and evidence of learning;
- the total time budget and target Course Depth;
- required Capability Packs;
- the Source Policy, jurisdiction, versions, and Content Freshness policy;
- accessibility or safety constraints;
- accepted assumptions and unresolved risks.

Do not design the Course structure until the Course Owner explicitly approves the Course Brief.

### 3. Agree the Course Blueprint

Create `_authoring/blueprint.md`. It is versioned but never learner-facing. It must contain:

- a concept map and prerequisite dependencies;
- ordered Modules and the intermediate capability of each;
- ordered Lessons and the single primary capability of each;
- each Module Checkpoint;
- the Capstone Demonstration and its rubric;
- Outcome Alignment from every Learning Outcome to instruction, practice, Module Checkpoints, and Capstone criteria;
- the Instructional Scaffolding plan;
- the Cumulative Retrieval plan;
- study, practice, and optional advanced time estimates;
- a coverage audit for gaps, duplication, overload, and unnecessary material.

Design backward from the Capstone Demonstration. Do not begin by making a list of topics and adding a final project afterward.

Do not author Lessons until the Course Owner explicitly approves the Course Blueprint.

### 4. Agree a Reference Lesson

Author one representative Lesson, preferably from the middle of the Course. It should exercise the planned depth, explanation, practice, feedback, interaction, and visual language.

Ask the Course Owner to approve:

- depth and pacing;
- Russian voice and terminology;
- example quality;
- interaction density;
- visual treatment;
- the balance between guidance and independent work.

The Course Owner may explicitly skip this gate for a small Course.

### 5. Author the Course Module by Module

After Reference Lesson approval:

- author Modules in dependency order;
- validate and self-review each Module before continuing;
- update Cumulative Retrieval as earlier material becomes available;
- continue autonomously unless a new material decision is discovered;
- never invent a component, source, requirement, or Course Owner decision.

### 6. Complete the quality report

Create `_authoring/quality-report.md` with:

- the final Outcome Alignment audit;
- coverage and dependency checks;
- checks of every deterministic answer and every worked solution;
- a practice-solvability review;
- source, version, jurisdiction, and Content Freshness checks;
- accessibility and render-QA findings;
- validator and build results;
- remaining limitations and the absence of independent expert review, when relevant.

The Course Owner approves the completed Course after reviewing this report.

## Target directory convention

Create one self-contained directory:

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
- `capabilityPacks` contains explicit versioned pack identifiers when required.
- `freshness.mode` is `stable` or `time-sensitive`.
- `verifiedAt` records factual verification, not the last file edit.
- `reviewAfter` is required for time-sensitive content.
- `jurisdiction` is required when applicability depends on location or legal regime.

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

## Pedagogical rules

### Explain simply without distorting

- Begin with the learner's problem or decision, not a dictionary definition.
- Introduce an intuitive model before formal terminology when that reduces cognitive load.
- Name and define each necessary term at first use, then use it consistently.
- Explain causal relationships, not merely procedures.
- State where a simplification or analogy stops working.
- Exclude internal detail that does not affect the Learning Outcomes, or mark it `advanced`.

Course Depth means sufficient causal understanding, application, boundary recognition, and trade-off reasoning for the approved Learner Profile. It does not mean maximum detail.

### Scaffold and then remove support

Prefer this progression when the learner is new to a capability:

1. a short worked example with visible reasoning;
2. partial completion by the learner;
3. independent work in a familiar context;
4. transfer to a changed or ambiguous context;
5. independent choice and justification of an approach.

For an experienced Learner Profile, compress early stages or use a realistic anti-example. Do not keep showing complete solutions after independent performance is expected.

### Make the learner act

Regularly ask the learner to predict, explain, compare, diagnose, complete, decide, improve, or construct. Interaction must require thinking; clicking to reveal ordinary prose is not active learning.

Do not impose quotas such as three exercises, one analogy, or one diagram per Lesson. Every element must support a capability or resolve a likely misconception.

### Design errors diagnostically

For consequential misconceptions, show:

- the realistic wrong approach;
- why it initially seems plausible;
- the symptom or consequence;
- how to diagnose it;
- how to correct and prevent it.

Incorrect options must be plausible misconceptions, not jokes or obviously absurd filler.

### Plan Cumulative Retrieval

- Recall selected earlier ideas without copying the original wording.
- Reuse old capabilities inside new work.
- Make Module Checkpoints cumulative across the Module.
- Revisit important capabilities in later Modules after increasing intervals.
- Integrate the Course in the Capstone Demonstration.

Flashcards are optional. Repetition is a Course-sequence property, not a component quota.

### Use a respectful Course Voice

- Address the learner as `ты` in clear conversational Russian.
- Be precise without bureaucratic prose or unexplained jargon.
- Describe what is wrong with an answer, never what is wrong with the learner.
- Give specific feedback instead of automatic praise.
- Acknowledge genuine difficulty without dramatizing it.
- Humor and emoji are allowed when they materially improve understanding, memory, or emotional ease.
- Do not use humor or emoji as decoration, structure, or a substitute for explanation.
- Avoid stereotypes and unexplained culture-specific assumptions.

Interest comes from relevance, growing competence, autonomy, meaningful progress, and useful feedback. Do not add points, streaks, rankings, random rewards, or mandatory badges to the authoring contract.

## Assessment and learner progress

### Readiness Check

Course Overview states entry capabilities and may embed a short Readiness Check using Knowledge Checks. It is optional and non-blocking. When a gap is found, recommend a specific Lesson, Course, or authoritative external resource.

### Knowledge Checks

Place a Knowledge Check near the explanation it reinforces. It represents one deterministic diagnostic action, not a scored quiz. It gives immediate explanatory feedback, allows unlimited retries, and does not determine Lesson Completion.

Supported core response types are:

- `single`;
- `multiple`;
- `matching`;
- `ordering`;
- `exact`;
- `numeric`.

`true/false` is a `single` check with two options. “Find the error,” “predict the result,” and “choose for this scenario” are prompt designs, not component types.

Shared props are static and required unless stated otherwise:

- `type`;
- `prompt`;
- `outcomes`, containing at least one Course Learning Outcome ID;
- `explanation`, which explains the governing idea rather than repeating the answer.

Response-specific props are:

- `single`: `options` is an array of `{ id, text, feedback }`; `answer` is one option ID.
- `multiple`: `options` has the same shape; `answer` is a non-empty array of unique option IDs.
- `matching`: `pairs` is an array of `{ id, left, right, feedback }`; the platform shuffles the right-hand values.
- `ordering`: `items` is an array of `{ id, text }` in the correct order; the platform shuffles them for the learner.
- `exact`: `acceptedAnswers` is a non-empty array of strings and `normalization` explicitly declares trimming and case handling.
- `numeric`: `answer` is a number, `tolerance` is a non-negative number, and `unit` is required when the quantity has one.

IDs are unique and never derived from learner-facing display text. Option-specific feedback diagnoses why that response is or is not appropriate. Do not expose correct ordering or matching through IDs or initial presentation.

Example:

```mdx
<KnowledgeCheck
  type="single"
  prompt="Что изменилось после покупки оборудования за деньги?"
  outcomes={["reconcile-balance"]}
  options={[
    {
      id: "asset-composition",
      text: "Изменился состав активов",
      feedback: "Верно: один актив вырос, а другой уменьшился на ту же сумму.",
    },
    {
      id: "liability-total",
      text: "Увеличилась сумма обязательств",
      feedback: "Оплата собственными деньгами не создаёт обязательство перед кредитором.",
    },
  ]}
  answer="asset-composition"
  explanation="Покупка за деньги меняет две статьи активов, сохраняя их общую сумму."
/>
```

Never use automatic evaluation for an open explanation, essay, case analysis, or project. Use Self-Assessment instead.

### Practice Tasks

Use the same `PracticeTask` model inside Lessons, Module Checkpoints, and `capstone.mdx`.

```mdx
<PracticeTask
  title="Отрази покупку оборудования"
  level="core"
  estimatedMinutes={15}
  goal="Применить балансовое равенство к хозяйственной операции"
  outcomes={["reconcile-balance"]}
  constraints={[
    "Не составляй проводки — работай только с активами и обязательствами",
  ]}
  criteria={[
    "Указаны затронутые статьи",
    "Объяснено направление каждого изменения",
    "После операции сохранено балансовое равенство",
  ]}
  hints={[
    "Сначала определи источник получения оборудования.",
    "Сравни изменение оборудования и денежных средств.",
  ]}
>
  Организация купила оборудование за 120 000 ₽ и сразу оплатила его
  с расчётного счёта. Покажи состояние до и после операции.

  <TaskSolution>
    Оборудование увеличилось на 120 000 ₽, а денежные средства уменьшились
    на ту же сумму. Общая величина активов не изменилась.
  </TaskSolution>
</PracticeTask>
```

Rules:

- `level` is `core`, `challenge`, or `stretch` relative to the Learner Profile.
- Give the learner a genuine opportunity to act before revealing help.
- Reveal hints progressively from general to specific.
- A convergent task uses one deliberately revealed `TaskSolution` with reasoning, alternatives, and likely errors.
- An open task uses one nested `TaskRubric` with observable evidence instead of an objective score:

  ```mdx
  <TaskRubric
    criteria={[
      {
        criterion: "Причина расхождения установлена",
        evidence: "Объяснение связывает конкретную операцию с двумя затронутыми счетами",
      },
    ]}
  />
  ```

- Every `PracticeTask` contains exactly one `TaskSolution` or `TaskRubric`, never both.
- Do not require timers or a correct answer before the learner may see help.
- `Hint`, `TaskSolution`, and `TaskRubric` content cannot appear outside a `PracticeTask`.

### Module Checkpoints and Capstone Demonstration

A Module Checkpoint integrates its Module and gives targeted review guidance. It does not block later navigation.

The Capstone Demonstration is an authentic final performance shaped by the Learning Outcomes. It may be a software project, design, source analysis, scenario decision, simulated conversation, explanation, diagnosis, or another suitable form. A multiple-choice quiz cannot be the only Capstone evidence for a deep Course.

The Capstone must include:

- a realistic brief;
- required and optional scope;
- constraints and available resources;
- staged milestones when the work is large;
- observable acceptance criteria;
- a Self-Assessment rubric aligned to every Learning Outcome;
- likely failure modes;
- reflection and possible extensions.

### Completion is not mastery certification

Learner navigation remains open. Checks recommend review but never act as gates.

Course Completion requires explicit completion of every core Lesson, Module Checkpoint, and the Capstone Demonstration. Advanced material and stretch Practice Tasks are optional. Completion is neither a grade nor certification of mastery.

## Semantic Course Components

The base catalog is closed and versioned:

- `Callout`;
- `KnowledgeCheck`;
- `PracticeTask`, with nested solution or rubric content;
- `Reflection`;
- `Diagram`;
- `Chart`.

The Authoring Agent may use only documented components and props. If a needed component is unavailable, use clear Markdown, revise the learning design, or record a platform requirement. Never invent an MDX API.

Presentation-only primitives are forbidden in Course source, including layout wrappers, `Progress`, `DifficultyBadge`, generic `Tabs`, generic `Accordion`, generic `Spoiler`, and colored containers. The platform derives progress and visual treatment. A semantic component may render with tabs or disclosure internally without exposing that presentation choice to authors.

### Callout

`Callout` requires `kind` and meaningful content. Supported kinds are:

- `key` — a key model or conclusion;
- `info` — required clarification;
- `warning` — a risk or pitfall;
- `error` — an incorrect or dangerous approach;
- `advanced` — optional depth;
- `context` — additional context.

The Authoring Agent selects meaning, never a color. The platform supplies consistent labels, icons, colors, and accessible semantics. Do not use Callouts to decorate ordinary paragraphs.

### Reflection

`Reflection` asks one specific metacognitive question and has no correct answer. The platform stores any response only in the learner's browser, explains that it is not transmitted, and lets the learner copy, export, or delete it. Use ordinary prose when recording a response has no learning value.

```mdx
<Reflection
  prompt="Какое предположение в твоём первоначальном решении оказалось неверным?"
  outcomes={["reconcile-balance"]}
  guidance={["Назови предположение", "Опиши наблюдаемый симптом", "Сформулируй новое правило"]}
/>
```

`prompt` and `outcomes` are required. `guidance` is optional and must support reflection without supplying a correct answer.

### Capability Packs

Versioned Capability Packs extend the base catalog for bounded needs such as:

- safe code execution and test-based checking;
- mathematical input;
- interactive simulation;
- audio or video with transcripts.

The Course Brief must name the exact pack and supported version. Do not assume a language runtime, external service, or media feature that the platform has not declared.

## Learning Visuals

Choose the smallest visual form that materially reduces the effort of understanding:

1. concise text;
2. a Markdown table for exact comparisons;
3. Mermaid for relationships, processes, states, and sequences;
4. a Chart generated from structured numeric data;
5. a sourced image only when appearance or spatial form matters.

Every Diagram and Chart requires:

- a descriptive title;
- a text description;
- instructions for how to read it;
- the intended takeaway.

A Chart also requires named axes, units, structured source data, provenance, and a platform-generated tabular alternative.

Mermaid source is fenced inside `Diagram`; raw Mermaid outside the component is invalid:

````mdx
<Diagram
  title="Как операция сохраняет равенство"
  description="Денежные средства уменьшаются на ту же сумму, на которую растёт оборудование."
  howToRead="Следуй по стрелкам слева направо."
  takeaway="Меняется состав активов, а не их общая сумма."
>
  ```mermaid
  flowchart LR
    Cash[Денежные средства −120 000] --> Balance[Общая сумма активов без изменения]
    Equipment[Оборудование +120 000] --> Balance
  ```
</Diagram>
````

`Chart` receives static `series` data plus `xAxis`, `yAxis`, and `source` objects. The platform derives the visual marks and data table; the Authoring Agent does not supply drawing instructions or colors.

Do not add visuals by quota or as decoration. Explain a visual close to where it appears.

External images require a permitted license, provenance, useful alt text, and a meaningful caption. AI-generated images are a last resort and may illustrate atmosphere, metaphor, or a clearly simulated scenario. They must not serve as factual evidence, a precise technical or medical diagram, or a historical document. Label them as illustrative whenever confusion is possible.

## Accessibility

Accessibility is a publication requirement:

- never encode meaning only through color, position, sound, or motion;
- use semantic heading order and descriptive links;
- provide text alternatives for every Learning Visual;
- provide transcripts or captions for audio and video;
- ensure every interaction works with a keyboard and exposes status to assistive technology;
- avoid reaction-time requirements and unnecessary timers;
- keep instructions unambiguous and interaction patterns consistent;
- provide a functional non-interactive representation for every component;
- respect reduced-motion and responsive-layout preferences at the platform layer.

An inaccessible component cannot enter the catalog. The Authoring Agent supplies semantic content; the platform supplies accessible interaction behavior.

## Sources, claims, and Content Freshness

### Source hierarchy

The Course Brief defines a topic-specific hierarchy. Prefer, in order:

1. primary law, standard, specification, dataset, or original research;
2. official regulator or maintainer guidance;
3. authoritative professional reference material;
4. secondary teaching material for explanation only.

For law- or regulation-dependent content, distinguish an official act from commentary about it. Record jurisdiction, applicable version, and verification date. Link to the exact document or section, not a resource home page.

Place a citation close to the claim it supports. Clearly label simulations, simplifications, opinions, disputed interpretations, and uncertainty. Do not invent facts about real organizations.

For medical, legal, financial, safety, or other high-risk content:

- state applicability boundaries;
- rely on current authoritative sources;
- disclose in the quality report when no independent expert reviewed the Course;
- never claim AI self-review is expert approval.

At the current project stage, Course Owner approval and authoritative sourcing are sufficient; independent expert review is not a publication gate.

### Freshness semantics

`createdAt`, modification time, and Content Freshness are different:

- `createdAt` records original Course creation;
- modification time is derived from Git and may reflect a trivial edit;
- `verifiedAt` records the last factual source verification;
- `reviewAfter` records when verification must be repeated.

A time-sensitive Lesson may override Course freshness. Module freshness is derived from its Lessons, and Course freshness uses the earliest dependent `reviewAfter`. A law or source change can make content stale even when no file changed. Fixing a typo does not refresh factual verification.

The target validator warns about stale standard content and rejects publication of stale high-risk content.

## Content Revision and progress durability

Content Revision signals a material learning change while preserving identity.

Increment a Lesson `revision` when:

- its primary learner action changes materially;
- its mental model changes materially;
- previously completed work no longer demonstrates the intended capability.

Do not increment it for:

- wording or formatting changes;
- corrected spelling;
- refreshed links or sources that do not change the learned capability;
- Module moves;
- presentation changes.

The platform preserves Lesson Completion across a revision but tells the learner that the Lesson changed after completion and offers a revisit. A fundamentally different capability receives a new Lesson slug.

## Validation and Definition of Done

Run the public validation and build entry points before Course approval:

```sh
pnpm validate
pnpm build
```

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
- stale high-risk content;
- presentation imports, custom scripts, styles, layouts, or progress controls.

Technical validity is necessary but not sufficient. Before approval, confirm:

- every Learning Outcome is taught, practiced, and demonstrated;
- dependencies are introduced before use;
- every Lesson completes the Learning Cycle without mechanical headings;
- examples and tasks are solvable from available material;
- feedback diagnoses reasoning rather than merely revealing an answer;
- support fades toward independent transfer;
- Cumulative Retrieval is present across the Course;
- no Lesson is overloaded or padded;
- visuals reduce cognitive load and remain understandable without color;
- claims satisfy the Source Policy;
- Russian prose follows the Course Voice;
- the Capstone genuinely demonstrates all Learning Outcomes.

### Render QA

Inspect the rendered Course Overview, Capstone, one representative Lesson per Module, and every page containing a unique component or visual pattern. Check desktop and mobile widths, keyboard interaction, heading order, table and code overflow, Chart readability, fallback content, and feedback announcements.

Fix Course source only within this contract. Do not add local CSS or scripts to conceal a platform defect; record that defect separately.
