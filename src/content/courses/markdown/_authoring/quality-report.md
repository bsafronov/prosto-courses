# Quality report: Основы Markdown

Версия: 2

Статус: Authoring Agent self-review завершён; Course Owner approval зафиксирован

Дата: 2026-07-25

## Outcome Alignment audit

| Outcome | Taught | Practiced | Module Checkpoint | Capstone |
| --- | --- | --- | --- | --- |
| `explain-markup` | да | да | Modules 1 и 3 | criterion 1 |
| `structure-document` | да | да | Modules 2 и 3 | criterion 2 |
| `connect-resources` | да | да | Modules 2 и 3 | criterion 3 |
| `review-portability` | да | да | Module 3 | criterion 4 |

Результат: gaps, unknown references и unaligned learner-facing units не найдены.

## Coverage и dependency checks

- три Modules образуют progression от mental model к authoring и independent review;
- каждый Module содержит два Lessons и интегрирующий Module Checkpoint;
- каждый Lesson развивает одну primary capability;
- GFM extensions появляются после базовой модели CommonMark;
- advanced dialect comparison optional и не влияет на completion;
- Cumulative Retrieval присутствует в Module 3, его Checkpoint и Capstone;
- Capstone требует changed-context application, а не повторение Lesson wording.

## Deterministic answers

- Readiness `single`: `save-text-file`;
- `vvedenie` `single`: `readable-source`;
- `source-render` `matching`: heading / list item / inline code roles;
- `formatting` `single`: `level-two-heading`;
- `formatting` `ordering`: reader result → groups → levels → outline check;
- `links-code` `multiple`: `link-text` + `destination`;
- `portability` `exact`: `CommonMark`, trimmed and case-insensitive;
- `portability` `ordering`: environment → constructs → documentation → preview;
- `review` `single`: финальная среда названа и критичные конструкции повторно проверены именно в ней.

Каждый answer независимо сверен с authored examples или structured Chart data. Choice feedback диагностирует конкретный response; checks не создают score и не влияют на completion.

## Practice solvability и scaffolding

- все convergent tasks имеют reasoned Task Solution, alternative и likely errors;
- open work использует observable Task Rubric без objective score;
- hints идут от общего направления к конкретному диагностическому шагу;
- ни один task не требует внешний источник для основного решения;
- support recedes от worked comparison к independent Capstone;
- time estimates соответствуют объёму prompt и expected evidence.

## Source, version, jurisdiction и freshness

Проверены:

- CommonMark 0.31.2 — 2026-07-25;
- GFM 0.29-gfm — 2026-07-25;
- GitHub Docs formatting guidance — 2026-07-25;
- W3C WCAG 2.2 SC 2.4.4 explanation — 2026-07-25.

Applicability: CommonMark 0.31.2, GFM 0.29-gfm и GitHub.com. Следующая плановая проверка: 2027-01-25; новая версия primary specification triggers earlier review. Simulated Chart data clearly labeled and not used as factual evidence.

## Base component audit

| Family / pattern | Natural learning use |
| --- | --- |
| Callout: all six semantic kinds | model, clarification, risk, wrong approach, optional depth, context |
| Knowledge Check: five response types | diagnostic form follows capability; `numeric` не добавлен без естественной количественной capability |
| Practice Task + Task Solution | convergent source diagnosis and correction |
| Practice Task + Task Rubric | open instruction design and review |
| Reflection | process and mental-model change |
| Diagram | content + markup → transformed document relationship |
| Chart | compare structured review evidence with exact table fallback |

No component exists only to fill a quota; every placement appears in Blueprint alignment or calibration. Платформа отдельно проверяет поддержку `numeric`, но канонический Course не превращает чтение небольшого Chart в искусственное упражнение на сложение.

## Accessibility and render-QA scope

Representative pages:

- Course Overview with Readiness Check and freshness;
- Capstone with open rubric and Reflection;
- Module 1: `vvedenie` for Diagram and single choice;
- Module 2: `formatting` for ordering, progressive hints and Reflection;
- Module 3: `portability` for exact/ordering and `review` for Chart/single/open rubric;
- checkpoints for Task Solution and Task Rubric patterns.

Automated QA checks:

- desktop and 390×844 narrow viewport для Course Overview, Capstone и всех шести canonical Lessons;
- keyboard operation в canonical Russian instances для `single`, `multiple`, `ordering` и `exact`; canonical matching focus/submission и platform-fixture keyboard selection для того же native control; также hint/reveal controls, Reflection и completion;
- heading order, code/table overflow and open navigation;
- Diagram description/how-to-read/takeaway;
- canonical Chart axes, units, legend, exact table data, provenance and keyboard-reachable overflow;
- polite feedback/status announcements.

## Validation record

Final results on 2026-07-25:

- `pnpm validate`: passed; canonical tree reported 1 Course, 3 Modules, 6 Lessons, 3 Module Checkpoints and 1 Capstone Demonstration; Astro reported 0 errors, warnings or hints;
- `pnpm build`: passed with static output and the configured repository base path;
- `pnpm test:contract`: 122 passed;
- `pnpm test:browser`: 60 passed;
- repository-base-path deployment coverage loaded Course Overview, every Module and Module Checkpoint, one Lesson per Module, Capstone and their generated assets successfully;
- canonical route QA passed at desktop and narrow widths for Course Overview, Capstone and all six Lessons;
- targeted keyboard QA passed for canonical `single`, `multiple`, `ordering` and `exact`, plus progressive Practice Task support, Reflection, Diagram and Chart;
- the platform-level browser fixture separately passed native-keyboard `matching` selection and `numeric` behavior; the canonical Russian matching instance passed focus, response and keyboard submission.

## Content Revision record

- `vvedenie`: revision 2 — mental model and transfer Practice Task materially expanded;
- `formatting`: revision 3 — added ordered transfer check and source-backed explanation;
- `links-code`: revision 3 — added accessibility rationale and corrective Practice Task;
- new Lessons `source-render`, `portability` and `review`: initial revision 1.

Existing completion remains preserved; the higher revision marks changed Lessons
for an optional revisit.

## Remaining limitations

- independent subject-matter expert review was not performed; this report is Authoring Agent self-review, not expert approval;
- external specifications and GitHub.com may change after `verifiedAt`;
- the Course covers a bounded CommonMark/GFM working subset, not every parser edge case;
- keyboard and responsive QA use the repository browser target and do not replace manual assistive-technology testing across all platforms.
