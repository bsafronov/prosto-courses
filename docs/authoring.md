# Course authoring contract

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

Delegated Authoring is the default collaboration mode. The Course Owner supplies
the learner's need, product intent, known constraints, and value judgments. The
Course Owner is not expected to be a subject-matter expert or to verify every fact,
explanation, or instructional choice. The Authoring Agent owns research, source
verification, terminology, sequence, pedagogy, examples, assessment alignment,
plain Russian, and quality control.

Do not turn uncertainty into a questionnaire. Inspect the repository, available
Capability Packs, and authoritative sources first. Resolve evidence-based and
reversible low-impact choices autonomously, then record the evidence or assumption
in the Course Brief, Course Blueprint, or quality report.

Escalate a Critical Decision only when the answer cannot be established reliably and
at least one option would materially change:

- the Learner Profile, scope, Learning Outcomes, or evidence required by the Capstone;
- safety, factual risk, jurisdiction, cost, or an irreversible platform dependency;
- a value judgment, product preference, or trade-off that belongs to the Course Owner;
- the treatment of a consequential conflict between authoritative sources.

Ask no more than one Critical Decision at a time. Use a short decision card containing:

1. the question in one sentence;
2. the Authoring Agent's recommended default;
3. only the consequences that distinguish the viable options;
4. the safe fallback that will be used if no answer arrives, when such a fallback exists.

If there is a safe default, proceed and record it as an assumption. If there is no
safe default, pause only the work that depends on the decision. Never change the
Course scope or Learning Outcomes silently. The Course Owner may request explicit
review at any workflow stage, but such review is not a default publication gate.

## Required authoring workflow

### 1. Investigate the topic and platform

Before asking design questions:

- inspect existing Course source, the component contract, validation rules, and relevant domain decisions;
- identify the topic's authoritative primary and secondary sources;
- identify facts that are jurisdiction-, date-, standard-, or version-dependent;
- confirm which Capability Packs the platform supports;
- identify safety, accessibility, and factual-risk concerns.

### 2. Record the Course Brief

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
- the Russian register, required terms, and source-language or localization risks;
- accessibility or safety constraints;
- accepted assumptions and unresolved risks;
- Critical Decisions, their answers or safe defaults, and any decisions still blocking
  dependent work.

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

### 4. Calibrate a Reference Lesson

Author one representative Lesson, preferably from the middle of the Course. It should exercise the planned depth, explanation, practice, feedback, interaction, and visual language.

Audit the Reference Lesson for:

- depth and pacing;
- Russian voice and terminology;
- target-learner comprehension evidence, including whether the central explanation
  can be retold and used without copying its wording;
- natural Russian localization when sources use another language;
- example quality;
- interaction density;
- visual treatment;
- the balance between guidance and independent work.

When practical, run the target-learner comprehension probe described below. The
Course Owner's lay reading may reveal unnatural language or a broken explanation and
is useful evidence, but it is not the sole quality test. Escalate only a Critical
Decision. A small Course may record why a separate Reference Lesson was unnecessary.

### 5. Author the Course Module by Module

After Reference Lesson calibration:

- author Modules in dependency order;
- validate and self-review each Module before continuing;
- update Cumulative Retrieval as earlier material becomes available;
- continue autonomously unless a new Critical Decision is discovered;
- never invent a component, source, requirement, or Course Owner decision.

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
minor findings, and reruns affected checks. A critical finding blocks release. A
material disagreement between authoritative sources becomes a Critical Decision only
when research cannot resolve it and product judgment is required.

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

Record the audit in a non-empty `## Independent Course Audit` or
`## Независимый ИИ-аудит` section.

Release the Course when validation passes, the Independent Course Audit has no
unresolved critical or material findings, and no Critical Decision remains blocked.
Give the Course Owner a concise release summary: what the Course now teaches, audit
result, remaining high-risk limitations, and only the Critical Decisions that still
need an answer. Full Course Owner approval is optional.

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

## Pedagogical rules

The evidence and editorial rationale for these rules is recorded in
[`research/plain-language-course-authoring.md`](research/plain-language-course-authoring.md).

### Explain simply without distorting

Plain language is an outcome for the Learner Profile, not a readability score, a
sentence-length target, or a list of forbidden words. Preserve difficulty inherent in
the subject. Remove difficulty created by poor order, missing context, indirect syntax,
and unexplained terminology.

- Begin with the learner's concrete problem, question, or decision, not a dictionary
  definition or the history of the topic.
- Give the shortest accurate answer early, then explain why it is true and when it is
  useful.
- Introduce prerequisite ideas before using them. Present one conceptual step at a
  time and make the connection to the previous step explicit.
- Show a representative concrete case. Map each important object, action, and result
  in the case to the general model.
- Introduce an intuitive model before formal terminology when that reduces cognitive
  load. For each necessary new term, give a familiar-language explanation, the exact
  term, its role or distinguishing feature, a representative example, and a nearby
  non-example when confusion is likely. Then use the term consistently.
- Explain causes and decisions, not merely procedures. Make relations such as
  condition, cause, consequence, contrast, and exception explicit.
- Follow a core case with a contrast or boundary case that differs in one important
  way. State where every simplification or analogy stops working.
- Keep an exception near the rule when it changes the learner's immediate action.
  Move nonessential nuance to `advanced` content.
- Remove anecdotes, decoration, and interesting facts that do not improve the mental
  model, resolve a misconception, or support a Learning Outcome.

These functions do not require fixed headings or the same sequence in every Lesson.
Use the smallest explanation that lets the learner reason and act accurately.

Course Depth means sufficient causal understanding, application, boundary recognition, and trade-off reasoning for the recorded Learner Profile. It does not mean maximum detail.

### Write idiomatic plain Russian

Draft from meaning, not from source-language syntax. When a source is not Russian,
first establish its claim, intent, and logical relations; then express them as a Russian
author would. Do not preserve source sentence boundaries, word order, parts of speech,
pronouns, idioms, metaphors, or punctuation merely because they appear in the source.
After rewriting, compare every fact, condition, and applicability boundary with the
source, and verify required terminology against an authoritative domain glossary.

- Put the paragraph's answer or main claim before supporting detail when the learner
  does not need the detail to understand it. Give each paragraph one logical move.
- Prefer a visible actor and a finite verb to a chain of abstract nouns. Name who does
  what unless the actor is unknown, irrelevant, or deliberately omitted to avoid
  blaming the learner.
- Prefer active voice when it makes the actor and action clearer. Use passive voice
  when the result matters more than the actor or when active voice becomes awkward.
- Prefer familiar, specific Russian words to formal calques when both are equally
  accurate. Keep an exact professional term when the learner must recognize or use it;
  explain it through known words and a concrete case instead of replacing it with an
  inaccurate everyday synonym.
- Use the same term for the same concept. Do not vary terminology merely to avoid
  repetition.
- Prefer one main assertion per sentence. Split nested clauses, long parenthetical
  remarks, and multiple unrelated enumerations, but do not chop connected thought
  into artificial fragments.
- Keep the actor, action, and object close enough to parse without holding a long
  insertion in memory. Unpack long chains of dependent nouns, especially consecutive
  genitive constructions, with a verb, preposition, or separate sentence.
- Use ordinary conjunctions and pronouns when they make relations natural and clear.
  Do not remove them mechanically for brevity.
- Write headings that let the learner predict the question, object, decision, or action
  below. Prefer a verb when the learner action is central, but do not force every
  heading into an imperative or infinitive.
- Address the learner as `ты`. Use an imperative for a real step, not for every
  explanatory sentence.

Edit constructions by function, not by keyword:

| Avoid when it hides the action | Prefer when meaning is unchanged |
| --- | --- |
| `Для осуществления проверки выполни следующие действия` | `Чтобы проверить, сделай следующее` |
| `Данный способ обеспечивает возможность определить ошибку` | `Этот способ помогает найти ошибку` |
| `При наличии необходимости изменить значение...` | `Если нужно изменить значение...` |
| `После выполнения сохранения данные обновляются` | `Когда ты сохраняешь документ, данные обновляются` |

Words such as `данный`, `является`, `осуществлять`, `посредством`, verbal nouns,
participles, and passive constructions are warning signs, not automatic errors. Keep
one when it is the clearest accurate choice in context.

### Control Russian–English switching

Learner-facing explanations, headings, instructions, feedback, examples, and authored
metadata are Russian whenever an accurate natural Russian expression exists. An
English source, skill, prompt, or internal agent vocabulary does not justify English
prose in the Course.

Keep the original language when it carries identity or exact operational meaning:

- an official name of a person, organization, company, product, library, framework,
  standard, or publication without an established official Russian form;
- code, commands, identifiers, API names, file paths, configuration keys, and data
  field names;
- an exact interface label that the learner must find, especially when the declared
  interface language is English;
- a quotation or bibliographic title when its original form matters.

Do not translate or transliterate a company or product name arbitrarily. Use its
official Russian form when one exists; otherwise preserve the original, for example
`OpenAI`, not `Открытый ИИ`. When an English professional term helps the learner search
sources, recognize software, or communicate in the field, introduce it once after the
Russian term, for example `извлечение из памяти (retrieval practice)`. Continue with
the Russian term unless the English token itself is the object of instruction.

Avoid mixed sentences such as `Сделай retrieval practice и получи feedback` when
`Попробуй извлечь материал из памяти и получи обратную связь` preserves the meaning.
Do not alternate English and Russian synonyms for stylistic variety, duplicate every
heading in two languages, or leave English scaffolding copied from authoring artifacts.
If an exact English interface label is necessary, keep the surrounding instruction in
Russian: `Нажми Run`, not `Click Run`.

### Revise for comprehension

Use separate review passes so surface editing does not conceal a broken explanation:

1. **Accuracy:** verify facts, causal model, examples, boundaries, and terminology.
2. **Structure:** check that learner need comes first, prerequisites precede use, and
   headings expose the path through the explanation.
3. **Russian:** remove literal translation, unnecessary English switching,
   bureaucratic scaffolding, hidden actors, noun chains, ambiguous references, and
   needlessly nested syntax.
4. **Read aloud:** rewrite every place where natural speech stumbles, then confirm that
   no meaning or logical link disappeared.
5. **Learner probe:** ask a person matching the Learner Profile to find the needed
   idea, explain it in their own words, and use it in a small changed case. Record where
   they hesitate, infer the wrong relation, or cannot act; revise and retest when the
   finding is consequential.

Run the learner probe on the Reference Lesson and on other high-risk explanations
when practical. If no matching learner is available, record that limitation in the
quality report. Course Owner approval, an Authoring Agent self-review, automated
readability metrics, and a request such as “Всё понятно?” do not demonstrate learner
comprehension.

### Scaffold and then remove support

Prefer this progression when the learner is new to a capability:

1. a short worked example with visible reasoning;
2. partial completion by the learner;
3. independent work in a familiar context;
4. transfer to a changed or ambiguous context;
5. independent choice and justification of an approach.

For an experienced Learner Profile, compress early stages or use a realistic anti-example. Do not keep showing complete solutions after independent performance is expected.

A worked example normally makes its context and goal, relevant initial data, each
consequential step, the reason for that step, an intermediate check, the interpreted
result, and its applicability boundary visible. Omit trivial mechanics that add no
decision or useful model.

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
- Do not dismiss a difficult step with `это просто`, `это легко`, or `это очевидно`.
  Demonstrate the reasoning and acknowledge prerequisites instead of judging the
  learner's difficulty. Keep these words when they carry exact domain meaning.
- Do not imitate children's speech, overexplain common knowledge, or use a childish
  analogy merely because the Learner Profile is new to the topic.
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
- `matching`: `pairs` is an array of `{ id, left, right, feedback }`; IDs, left values, and right values are unique, and the platform shuffles the presented right-hand values.
- `ordering`: `items` is an array of unique `{ id, text }` objects in the correct order; the platform shuffles them for the learner.
- `exact`: `acceptedAnswers` is a non-empty array of strings and `normalization` is exactly `{ trim: boolean, case: "sensitive" | "insensitive" }`. Accepted answers must remain non-empty and distinct after that normalization.
- `numeric`: `answer` is a finite number, `tolerance` is a finite non-negative number measured in the same unit, and `unit` is a non-empty string whenever the quantity is not unitless.

IDs are unique and never derived from learner-facing display text. Option-specific feedback diagnoses why that response is or is not appropriate. Do not expose correct ordering or matching through IDs or initial presentation.

Matching uses labelled native selection controls. Ordering exposes a labelled drag handle for each step: pointer and touch users drag the handle, while keyboard users press Enter or Space, move with the arrow keys, then press Enter or Space again to drop (Escape cancels). The platform announces each new position. Exact and numeric fields have explicit labels; a numeric unit is both visible and included in the field's accessible name.

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
      feedback:
        "Оплата собственными деньгами не создаёт обязательство перед кредитором.",
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

  <TaskSolution
    reasoning="Оборудование увеличилось на 120 000 ₽, а денежные средства уменьшились на ту же сумму. Общая величина активов не изменилась."
    alternatives={["Начать с проверки источника оплаты, а затем назвать две изменившиеся статьи активов."]}
    likelyErrors={["Ошибочно увеличить общую сумму активов, не учтя уменьшение денежных средств."]}
  />
</PracticeTask>
```

Rules:

- `title`, `level`, positive integer `estimatedMinutes`, `goal`, `outcomes`,
  `criteria`, and meaningful learner prompt content are required.
- `constraints` and `hints` are optional non-empty arrays of non-empty strings.
  `criteria` is always a non-empty array of observable completion criteria.
- `level` is `core`, `challenge`, or `stretch` relative to the Learner Profile.
- `outcomes` contains unique IDs owned by the Course. Across the Course, Practice
  Tasks must practice every Learning Outcome.
- Give the learner a genuine opportunity to act before revealing help.
- Reveal hints progressively from general to specific.
- A convergent task uses one deliberately revealed, self-closing `TaskSolution`.
  Its non-empty `reasoning` explains the governing idea; `alternatives` and
  `likelyErrors` are non-empty arrays.
- An open task uses one nested `TaskRubric` with observable evidence instead of an objective score:

  ```mdx
  <TaskRubric
    criteria={[
      {
        "criterion": "Причина расхождения установлена",
        "evidence": "Объяснение связывает конкретную операцию с двумя затронутыми счетами",
      },
    ]}
  />
  ```

- Every `PracticeTask` contains exactly one `TaskSolution` or `TaskRubric`, never both.
- A rubric criterion contains only non-empty `criterion` and `evidence` fields.
  Objective score, points, rating, and grade fields are invalid.
- The learner may reveal either feedback type directly. Do not require a timer,
  a correct answer, or opening every hint first.
- `PracticeTask` may appear only in a Lesson, Module Checkpoint, or Capstone
  Demonstration. `TaskSolution` and `TaskRubric` cannot appear outside one.

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

Presentation-only primitives are forbidden in Course source, including layout wrappers, `Progress`, `DifficultyBadge`, generic `Tabs`, generic `Accordion`, generic `Spoiler`, and colored containers. Raw HTML elements and authored `class`, `style`, event-handler, or hydration props are likewise invalid. The platform derives progress and visual treatment. A semantic component may render with tabs or disclosure internally without exposing that presentation choice to authors.

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
  guidance={[
    "Назови предположение",
    "Опиши наблюдаемый симптом",
    "Сформулируй новое правило",
  ]}
/>
```

`prompt` and `outcomes` are required. `guidance` is optional and must support reflection without supplying a correct answer.

- Use one self-closing `Reflection` with explicit static props. Only `prompt`,
  `outcomes`, and `guidance` are allowed; answer, solution, rubric, score, and
  evaluation props are invalid.
- `outcomes` must contain at least one unique ID owned by the Course.
- When present, `guidance` is a non-empty array of non-empty process cues or
  questions. It can help the learner notice evidence or structure their
  thinking, but it must not state a correct response. If a response can be
  checked deterministically, use a Knowledge Check instead.
- The platform stores the learner's note separately from progress and Knowledge
  Check state. It never submits or evaluates the note.

### Capability Packs

Versioned Capability Packs extend the base catalog for bounded needs such as:

- safe code execution and test-based checking;
- mathematical input;
- interactive simulation;
- audio or video with transcripts.

When the platform manifest makes a pack available, declare its name and exact version separately:

```yaml
capabilityPacks:
  - name: approved-pack-name
    version: 1.2.0
```

The Course Brief must name the exact pack and supported version. Do not assume a language runtime, external service, or media feature that the platform has not declared.

The platform-owned manifest is [`platform/capability-packs.json`](../platform/capability-packs.json). Its `manifestVersion` versions the dependency contract, `baseCatalog` records the components available without a pack, and `packs` maps each available exact pack version to its components and any supported runtime or service identifiers. The default manifest intentionally contains no specialized packs. Platform maintainers can validate against a candidate manifest by setting `CAPABILITY_PACK_MANIFEST`; Course source cannot select or replace the manifest.

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

`Chart` is self-closing and receives only explicit static props:

```mdx
<Chart
  title="Среднее число опубликованных и проверенных уроков"
  description="Средние числа опубликованных и проверенных уроков на редактора сопоставлены за июнь и июль."
  howToRead="Читай месяцы слева направо и сравнивай пары столбцов."
  takeaway="В июне проверка успевала за публикацией, а в июле начала отставать."
  xAxis={{ label: "Месяц", unit: "месяц" }}
  yAxis={{ label: "Среднее число уроков на редактора", unit: "урок" }}
  series={[
    {
      name: "Опубликовано",
      values: [{ x: "Июнь", y: 1.001 }, { x: "Июль", y: 3.003 }],
    },
    {
      name: "Проверено",
      values: [{ x: "Июнь", y: 1.002 }, { x: "Июль", y: 2.002 }],
    },
  ]}
  source={{
    label: "Смоделированный набор данных в исходнике учебного примера",
    url: "https://github.com/bsafronov/prosto-courses/blob/main/tests/fixtures/valid-course/accessible-images/modules/alt-text/lessons/describe-purpose.mdx",
  }}
/>
```

- `title`, `description`, `howToRead`, and `takeaway` are required non-empty strings.
- `xAxis` and `yAxis` contain exactly a non-empty `label` and `unit`.
- `series` is a non-empty array of uniquely named series. Every series contains
  a non-empty `values` array of exact `{ x, y }` points. `x` is a non-empty
  string or finite number; `y` is a finite number.
- All series use the same unique `x` values in the same order. The platform uses
  that shared domain to generate one equivalent comparison table.
- `source` contains exactly a non-empty `label` and an HTTP(S) `url`.
- Do not author chart types, marks, colors, scales, dimensions, labels, or other
  drawing instructions at any level. The platform owns them and communicates
  series identity with text identifiers and patterns as well as color.

Do not add visuals by quota or as decoration. Explain a visual close to where it appears.

External images require a permitted license, provenance, useful alt text, and a
meaningful caption. Use inline Markdown image syntax with JSON title metadata;
the platform turns it into an accessible figure:

```md
![Краткое описание](https://example.org/image.png '{"caption":"Подпись, объясняющая назначение изображения.","source":{"label":"Точный источник","url":"https://example.org/source"},"license":"CC BY 4.0","origin":"external"}')
```

`caption`, `source.label`, `license`, and `origin` are required. External
images require an HTTP(S) `source.url`. Generated images use
`"origin":"generated"` and must also declare `"illustrative":true`; their
source URL is optional when no public generation record exists. Unknown
metadata fields are invalid.

AI-generated images are a last resort and may illustrate atmosphere, metaphor, or a clearly simulated scenario. They must not serve as factual evidence, a precise technical or medical diagram, or a historical document. Label them as illustrative whenever confusion is possible.

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

Run the public validation and build entry points before Course release:

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

The Course Owner reviews only the release summary and any unresolved Critical
Decisions unless they explicitly request a broader review.

### Render QA

Inspect the rendered Course Overview, Capstone, one representative Lesson per Module, and every page containing a unique component or visual pattern. Check desktop and mobile widths, keyboard interaction, heading order, table and code overflow, Chart readability, fallback content, and feedback announcements.

Fix Course source only within this contract. Do not add local CSS or scripts to conceal a platform defect; record that defect separately.
