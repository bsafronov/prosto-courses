# Course platform contract for authors

This reference owns assessments, learner-progress semantics, the closed Semantic Course Component catalog, Learning Visuals and authored accessibility requirements.

## Contents

- [Assessment and learner progress](#assessment-and-learner-progress)
- [Semantic Course Components](#semantic-course-components)
- [Learning Visuals](#learning-visuals)
- [Accessibility](#accessibility)

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

The platform-owned manifest is [`platform/capability-packs.json`](../../../../platform/capability-packs.json). Its `manifestVersion` versions the dependency contract, `baseCatalog` records the components available without a pack, and `packs` maps each available exact pack version to its components and any supported runtime or service identifiers. The default manifest intentionally contains no specialized packs. Platform maintainers can validate against a candidate manifest by setting `CAPABILITY_PACK_MANIFEST`; Course source cannot select or replace the manifest.

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
