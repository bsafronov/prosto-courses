# Quality report: Общий язык с ИИ

Версия: 1

Статус: независимый ИИ-аудит завершён; критических и существенных замечаний нет

## Outcome Alignment audit

| Learning Outcome | Instruction | Practice | Checkpoint | Capstone evidence | Результат |
| --- | --- | --- | --- | --- | --- |
| `distinguish-system-boundaries` | Module 1: модель, ассистент, инструмент, вариативность, контекстное окно и instruction hierarchy | classification, repeated runs и system-boundary map | Modules 1, 2, 4, 5 | границы системы учтены | полная цепочка |
| `specify-work` | Module 1: task map, minimal sufficiency и mode choice | raw intent → specification и сокращение полей | Modules 1, 2, 5 | спецификация минимально достаточна | полная цепочка |
| `design-inputs` | Module 2: relevance, lost conditions, examples и format boundaries | context ablation, example selection и input package | Modules 1, 2, 4, 5 | входной пакет спроектирован по функции | полная цепочка |
| `orchestrate-work` | Modules 1–2: request/dialog/workflow, consolidation и decomposition | artefact, verification и stop/go condition для каждого шага | Modules 1, 2, 4 | режим работы обоснован | полная цепочка |
| `evaluate-quality` | Module 3: rubric, case roles, baseline, variability и measured iteration | development set, multiple runs и version comparison | Modules 1–5 | качество измеряется | полная цепочка |
| `verify-evidence` | Modules 3–4: external feedback, source, search, calculation и Deterministic Check | evidence register, citation fragment и uncertainty label | Modules 2, 3, 4 | тезисы связаны с подтверждениями | полная цепочка |
| `manage-risk` | Modules 1, 3, 4: instruction priority, stakes, injection, privacy, bias, IP и actions | trust-boundary review, data minimization и confirmation card | Modules 1, 3, 4 | риск управляется пропорционально ставке | полная цепочка |
| `improve-and-transfer` | Modules 3, 5: measured failure, metaprompt pipeline, held-out check и portable core | iteration log, candidate selection и adapter separation | Modules 3, 5 | улучшение и перенос доказаны | полная цепочка |

Каждый outcome присутствует в metadata, преподаётся, практикуется, проверяется
в Module Checkpoint и имеет наблюдаемое Capstone evidence. Outcomes только с
recall evidence нет.

## Coverage and dependency checks

- Course содержит 5 Modules, 30 Lessons, 5 Module Checkpoints и Capstone.
- Основной маршрут — 1 575 минут: readiness 30, Lessons 1 050, Checkpoints 255,
  Capstone 240. Optional advanced — 240 минут.
- Последовательность соблюдает prerequisites: намерение → спецификация →
  исполнение → измерение → уточнение и перенос.
- Поздние Modules возвращают ранние capabilities через Cumulative Retrieval:
  unknowns, формат следующего потребителя, baseline, evidence и safety gates.
- Scaffolding убывает от заполненных таблиц и подсказок к самостоятельным
  checkpoints и новой Capstone-задаче.
- Changed-case transfer проверяется отдельно от development cases; held-out case
  не используется для редактирования уже выбранной версии.
- Реальное внешнее действие, юридическое заключение, автоматическая отправка
  данных и универсальные обещания качества исключены из core.

## Deterministic answers and worked solutions

Независимо решены все 20 Knowledge Checks: `single`, `multiple`, `matching` и
`ordering`. Ответы однозначно следуют из локального контракта урока; скрытая
provider knowledge не требуется.

Повторно пересчитаны числовые и количественные примеры:

- `15 × 6 500 + 48 000 = 145 500 ₽`;
- `4 × 3 = 12` результатов;
- baseline `2 + 3 + 3 + 1 = 9` результатов;
- рискованные ошибки baseline — `3 из 9`, без ложной статистической
  экстраполяции;
- другой worked example — `5 из 9` в указанной серии.

Аудит выявил и исправил противоречие: исходный текст называл девять результатов
восемью, а offline fallback не содержал запрошенный случай. Условие, offline
series и rubric теперь задают один протокол из девяти наблюдений.

## Practice solvability

Проверены 56 Practice Tasks и 56 Task Rubrics. Обязательный маршрут решаем
offline: learner может использовать данные из условия, вымышленные или безопасно
сокращённые материалы; платный API, реальный аккаунт и раскрытие рабочих данных
не требуются.

- Ранние tasks дают структуру, hints и пример evidence.
- Stretch tasks не блокируют основной маршрут.
- Checkpoints требуют собрать ранее изученные части без нового скрытого правила.
- Capstone использует новую задачу, покрывает восемь критериев rubric и занимает
  240 минут по сумме этапов.
- Risky input имеет безопасную замену; external action останавливается до
  проверки точного объекта, параметров и последствий.

## Plain-Russian and comprehension audit

- Learner-facing текст обращается на `ты`; ключевые англоязычные термины
  объясняются при первом значимом употреблении.
- Термины `prompt`, `baseline`, `development set`, `held-out case`, `rubric`,
  `model ID` и `prompt injection` используются последовательно.
- Headings и инструкции прошли read-aloud pass; критической двусмысленности не
  найдено.
- Четыре ASCII-многоточия заменены типографским знаком `…`.
- Target-learner comprehension probe с живым участником не проводился; это
  ограничение, а не подтверждение понимания.

## Source, version, jurisdiction and freshness checks

Factual risk: standard. Applicability: provider- and product-specific claims
меняются; юридические границы зависят от договора, лицензии, региона и
применимого права. Источники повторно проверены 2026-08-04.

- Deprecated OpenAI Prompt Optimizer удалён из устойчивого учебного основания;
  остаётся провайдер-независимый eval workflow.
- Архивная Cookbook-страница больше не подтверждает текущую семантику `seed`;
  курс требует проверять конкретные API, endpoint, model snapshot и условия.
- Data controls и backwards-compatibility URLs обновлены на текущие canonical
  OpenAI developer docs.
- Для деидентификации добавлен NIST SP 800-188; удаление прямых идентификаторов
  не названо анонимизацией или псевдонимизацией без отдельной проверки метода и
  риска повторной идентификации.
- Собственное резюме не названо автоматическим правом на обработку; learner
  проверяет лицензию, договор и применимое право.
- Structured Outputs ограничен успешным non-refusal ответом и поддерживаемой
  схемой; incomplete, refusal, errors и смысл значений проверяются отдельно.
- OWASP Top 10 2025 явно помечен архивной версией.

Provider-specific living docs нужно перепроверять перед каждым релизом и не реже
чем каждые 90 дней; data-retention и model/API compatibility — перед реальной
отправкой данных или сменой системы.

## Accessibility and render-QA scope

Content-level audit:

- смысл не кодируется только цветом;
- таблицы имеют header rows и не служат единственным носителем safety rule;
- 20 Knowledge Checks дают текстовые feedback/explanation;
- 56 Practice Tasks имеют критерии и feedback;
- Reflections не оцениваются автоматически;
- Course не требует таймера, реакции на скорость, реальных персональных данных,
  diagram, chart или authored image для понимания core path;
- motion-specific content отсутствует.

Финальный render-QA охватывает Overview, Capstone и по одному Lesson каждого
Module при desktop/mobile widths, а также все уникальные patterns: single,
multiple, matching, ordering, Practice hints/rubric, Reflection, Callout,
таблицы и code blocks. Проверяются keyboard focus, live feedback, console errors
и page-level horizontal overflow.

Фактический render-QA:

- 7 representative routes × 2 widths (1440×900 и 390×844): 14/14 HTTP 200;
- на всех routes ровно один `h1`, нет пропусков heading levels, console errors
  и page-level horizontal overflow;
- single, multiple, matching и ordering отвечают с клавиатуры и публикуют
  status feedback; ordering сохраняет focus и объявляет новую позицию;
- Practice hints открываются с клавиатуры, Task Rubric доступен, Reflection
  сохраняет private draft и сообщает об этом через live status;
- `key`, `warning` и `context` Callouts имеют текстовый label и semantic region;
- desktop Overview и mobile representative Lesson дополнительно просмотрены по
  полностраничным screenshots;
- две cross-Course ссылки исправлены на canonical deployment URLs внутри
  production base; PWA regression test проверяет, что они остаются внутри
  platform scope.

## Validation record

| Check | Date | Result |
| --- | --- | --- |
| Draft content validator before report | 2026-08-04 | source accepted; expected missing quality-report blocker only |
| Independent source and deterministic audit | 2026-08-04 | 0 critical; 4 material fixed; 4 minor fixed |
| Final public validator | 2026-08-04 | pass: 5 Courses, 24 Modules, 86 Lessons, 24 Checkpoints, 5 Capstones; UI contract — 60 files |
| Typecheck | 2026-08-04 | pass: 94 files; 0 errors, 0 warnings, 0 hints |
| Production build | 2026-08-04 | pass: 151 pages, 15.89 MiB offline release, 5 Course PDFs |
| Focused Course render-QA | 2026-08-04 | pass: 7 routes × 2 widths; 14/14 HTTP 200; no console errors, heading gaps or overflow |
| Full contract suite | 2026-08-04 | pass: 161/161 |
| Full browser suite | 2026-08-04 | pass: 177/177 Chromium tests |

## Независимый ИИ-аудит

Fresh-context auditor получил issue #68, Course Brief, Course Blueprint, полный
Course source, Source Policy, evidence base и authoring contract — не авторское
резюме. Полный отчёт сохранён в
`docs/research/common-language-with-ai-independent-audit.md`.

Метод:

- consequential и time-sensitive claims повторно сверены с текущими
  официальными страницами и первичными публикациями;
- 20 deterministic answers и числовые примеры независимо решены;
- Outcome Alignment, dependencies, cognitive load, scaffolding, Cumulative
  Retrieval и changed-case transfer прослежены от Brief до Capstone;
- plain Russian, перевод терминов, read-aloud, safety и accessibility проверены;
- findings классифицированы как `critical`, `material`, `minor` с evidence и
  конкретным исправлением.

Исходные findings: 0 critical, 4 material (включая baseline defect), 4 minor.
Все material и minor findings исправлены и повторно проверены. Неразрешённых
critical или material findings нет.

Это независимый ИИ-аудит, не independent expert review, field validation,
certification или доказательство отсутствия ошибок.

## Remaining limitations

- Независимая экспертная проверка не проводилась. No independent expert review
  was performed.
- Target-learner probe и field validation не проводились.
- Digital render-QA не заменяет ручное тестирование screen reader и проверку с
  людьми с инвалидностью.
- Provider behavior, model parameters, product controls и data-retention rules
  меняются и требуют повторной проверки в конкретной системе.
- Юридическая допустимость материала зависит от лицензии, договора, региона и
  применимого права; Course не является юридической консультацией.
