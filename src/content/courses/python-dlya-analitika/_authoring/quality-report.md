# Quality report: Python для аналитика

Версия: 1

Статус: Course Owner approval зафиксирован 2026-07-27; self-review Authoring Agent завершён

Дата проверки: 2026-07-27

## Outcome Alignment audit

| Learning Outcome | Taught | Practiced | Module Checkpoint | Capstone evidence | Результат |
| --- | --- | --- | --- | --- | --- |
| `reproduce-analysis` | Modules 1, 2 и 4 | locked environment, clean kernel, controls после преобразований | Modules 1, 2 и 4 | проект восстанавливается через `uv sync --locked`, notebook проходит Restart and Run All | полная цепочка |
| `calculate-with-arrays` | Module 1, retrieval в Module 3 | `shape`, `dtype`, masks, axes, vectorized calculations | Module 1, cumulative retrieval в Module 3 | SLA mask рассчитана по двум equal-shape NumPy arrays и имеет boolean dtype | полная цепочка |
| `prepare-tabular-data` | Module 2, retrieval в Module 3 | CSV/XLSX inspection, quality diagnosis, очистка с controls | Modules 2 и 3 | baseline, duplicate, dates, duration и unmatched keys разведены и reconciled | полная цепочка |
| `answer-with-transformations` | Module 3, retrieval в Module 4 | filters, calculated columns, groupby, pivot, checked merge | Modules 3 и 4 | summary на grain `month × team × channel`, pivot и merge controls | полная цепочка |
| `communicate-findings` | Module 4 | chart choice, accessible encoding, findings/limitations | Module 4 | два разных charts, три evidence-linked findings, limitations и next question | полная цепочка |

Все пять Learning Outcomes присутствуют в Course metadata, преподаются хотя бы
одним Lesson, практикуются, входят в подходящий Module Checkpoint и имеют
отдельный наблюдаемый Capstone criterion. Outcome только с recall evidence нет.

## Coverage and dependency checks

- Course содержит 4 Modules, 14 Lessons, 4 Module Checkpoints и отдельный
  Capstone.
- Основной путь занимает 720 минут; optional extensions — 120 минут.
- Последовательность соблюдает dependencies:
  environment → Python → NumPy → pandas inspection → cleaning → transformation
  → aggregation/merge → visualization → findings → clean handoff.
- Каждый Module index перечисляет Lessons в учебном порядке и формулирует
  intermediate capability.
- Более поздние Lessons возвращают ранние skills: NumPy masks используются в
  pandas, controls качества — после merge, clean run — в финальной передаче.
- Core path self-contained: datasets создаются deterministic bootstrap cells;
  внешние docs только supplemental.
- Capability Packs не заявлены: `platform/capability-packs.json` не предлагает
  Python runtime или autograding, поэтому Course честно требует локальный
  `uv`/JupyterLab workflow.
- Scope не расширяется до SQL, API, scraping, production engineering,
  statistical inference или machine learning. Polars, DuckDB, Parquet, Plotly,
  SciPy/statsmodels и scikit-learn названы только как next steps.

## Deterministic answers

Проверены prompt, answer contract, distractor feedback и explanation всех 17
Knowledge Checks.

| Placement | Type | Проверенный ответ | Результат |
| --- | --- | --- | --- |
| Course readiness | single | `name-row-grain` | однозначен |
| `setup-analysis-project` | ordering | restore environment → launch through uv → restart kernel → execute top-down → compare result | однозначен |
| `python-values-collections` | single | `numeric-price` | однозначен |
| `python-decisions-functions` | single | `missing-return` | однозначен |
| `numpy-array-model` | matching | `shape`, `ndim`, `size`, `dtype` сопоставлены их определениям | все 4 пары проверены |
| `numpy-vector-calculations` | numeric | `31200`, tolerance `0` | пересчитан |
| Module 1 Checkpoint | single | `hidden-state` | однозначен |
| `load-and-inspect-data` | multiple | shape/columns + types/ranges + more-than-head | все и только 3 верных |
| `diagnose-data-quality` | matching | repeated key, missing value, zero и category variant сопоставлены diagnostic questions | все 4 пары проверены |
| `clean-and-validate-data` | ordering | baseline → diagnosis → staged change → controls → clean restart | однозначен |
| Module 2 Checkpoint | multiple | remove exact repeat + normalize region by contract | все и только 2 верных |
| `select-filter-calculate` | multiple | paid status + inclusive start + exclusive next month | все и только 3 верных |
| `group-and-pivot` | single | `weighted-from-total` | однозначен |
| `combine-and-check-tables` | numeric | `6`, tolerance `0` | пересчитан |
| `choose-chart-for-question` | matching | category/bar, time/line, distribution/histogram, relationship/scatter | все 4 пары проверены |
| `build-honest-chart` | multiple | units + zero baseline for bars + redundant cues | все и только 3 верных |
| `state-findings-and-limits` | single | `descriptive-comparison` | однозначен |

Проверены 10 worked `TaskSolution`: код выполняется на Reference stack,
ожидаемые shapes/counts/totals совпадают. В
`select-filter-calculate` значение `4470` используется только как намеренно
ошибочный anti-example и сразу независимо опровергается правильным итогом
`4350`; practice control равен `725`. Module 3 Checkpoint reconciles к
`16200`.

## Practice solvability

Все 19 Practice Tasks проверены против доступных инструкций, bootstrap cells,
constraints, критериев и hints:

- 10 convergent tasks имеют скрываемый `TaskSolution`, который не требуется
  для понимания условия;
- 9 authentic/open tasks имеют `TaskRubric` с наблюдаемым evidence;
- каждый task можно выполнить только на материалах Course без внешней рабочей
  выгрузки;
- hints прогрессивны и не раскрывают финальный ответ до попытки;
- все 19 Reflections привязаны к outcomes и требуют назвать evidence, решение
  или ограничение, а не сообщать личные чувствительные данные.

Executable smoke runs выполнены по Module 1–4 в точном environment. Capstone
bootstrap и независимый analysis pipeline подтвердили:

| Control | Expected | Observed |
| --- | ---: | ---: |
| raw requests | 49 | 49 |
| exact duplicates | 1 | 1 |
| after deduplication | 48 | 48 |
| open/out of closed scope | 7 | 7 |
| invalid created date | 1 | 1 |
| negative duration | 1 | 1 |
| unmatched team | 1 | 1 |
| ready closed/matched rows | 38 | 38 |

Capstone также подтвердил equal-shape NumPy arrays, boolean SLA mask, group
reconciliation, June/July pivot и создание двух chart files.

## Source, version, jurisdiction and freshness checks

Reference stack совместно установлен и smoke-tested:

| Tool | Version |
| --- | --- |
| Python | 3.14.6 |
| uv | 0.11.29 |
| JupyterLab | 4.6.2 |
| NumPy | 2.5.0 |
| pandas | 3.0.5 |
| Matplotlib | 3.11.1 |
| Seaborn | 0.13.2 |
| openpyxl | 3.1.5 |

Источники — официальные release pages и user guides Python, uv, Jupyter,
NumPy, pandas, Matplotlib, Seaborn и openpyxl. Core explanations не зависят от
доступности ссылок. Проверка совместимости включает imports, NumPy/pandas
operations, XLSX roundtrip и Matplotlib/Seaborn rendering.

Freshness metadata: `time-sensitive`, applicability `global`, verified
2026-07-27, review after 2026-10-27. Пересмотр нужен раньше при новом Python
minor release, несовместимости exact stack или изменении CLI/API. Юрисдикционные
утверждения отсутствуют. SLA в Capstone — локальный synthetic contract, не
отраслевая или правовая норма.

## Accessibility and render-QA scope

- Meaning не кодируется только цветом: series используют labels, markers или
  grouping; chart tasks требуют redundant cues.
- Примеры требуют title, axis labels и units; готовая exact table сохраняется
  рядом с chart.
- Таблицы имеют header row; код разбит на короткие blocks и допускает
  horizontal overflow без потери текста.
- Knowledge Checks управляются стандартными semantic components и содержат
  textual feedback.
- Все изображения создаются кодом learner; необходимая информация также дана
  текстом и таблицами, поэтому alt-only dependency отсутствует.
- Инструкции используют относительные paths и отдельно называют Windows
  PowerShell command, где она отличается.
- Проверяемый render scope: Course, Module, Lesson, Checkpoint и Capstone routes
  на desktop/mobile; keyboard focus; interactive answer/retry; code/table
  overflow; no unexpected horizontal page overflow.
- Safety: только synthetic local datasets; Course запрещает помещать рабочие
  персональные или конфиденциальные данные в упражнения.

## Validation record

| Check | Date | Result |
| --- | --- | --- |
| Exact-stack dependency installation/imports | 2026-07-27 | pass |
| Module 1 executable smoke | 2026-07-27 | pass |
| Module 2 executable smoke | 2026-07-27 | pass |
| Reference Lesson executable smoke | 2026-07-27 | pass |
| Module 3 executable smoke | 2026-07-27 | pass |
| Module 4 executable/render smoke | 2026-07-27 | pass |
| Capstone bootstrap/pipeline/render smoke | 2026-07-27 | pass: `49 → 48 → 38`, 2 charts |
| Public content validator | 2026-07-27 | pass: 2 Courses, 7 Modules, 20 Lessons, 7 Module Checkpoints, 2 Capstones |
| Astro type/content check | 2026-07-27 | pass: 67 files, 0 errors, 0 warnings, 0 hints |
| Contract tests | 2026-07-27 | pass: 125/125 |
| Browser/render tests | 2026-07-27 | pass: 109/109; три production builds временной approved fixture |

Course Owner одобрил финальную версию Курса и этот quality report 2026-07-27.

## Remaining limitations

- Независимый subject-matter expert и независимый instructional-design reviewer
  Course не проверяли.
- Browser QA не заменяет ручную проверку screen reader на Windows, macOS и
  Linux.
- Platform не исполняет Python и не оценивает notebook автоматически; learner
  сверяет controls и rubric локально.
- Первая установка exact stack требует интернета и достаточно места на диске.
- Все datasets малые и синтетические; Course не доказывает scalability и не
  отражает полный набор проблем production data.
- Capstone охватывает только два месяца и не поддерживает causal или
  statistical-inference claims.
- Exact dependency pins повышают воспроизводимость сейчас, но требуют
  freshness review после 2026-10-27.
- Optional tools названы, но не преподаются и не проверяются.
