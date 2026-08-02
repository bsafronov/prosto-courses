# Quality report: Контейнерная заявка — от запроса до закрытия

Версия: 1

Статус: независимый ИИ-аудит завершён; критических и существенных замечаний нет

## Outcome Alignment audit

| Learning Outcome | Instruction | Practice | Module Checkpoint | Capstone evidence | Результат |
| --- | --- | --- | --- | --- | --- |
| `qualify-client-request` | Modules 1–3 | карта полей, классификация пробелов, changed cases | Modules 1–3 | квалификация исходного запроса и решения по расчёту/запуску | полная цепочка |
| `compose-service-and-rate` | Module 3, retrieval в 6 | синтетические расчёты, коммерческое письмо, план/факт | Modules 3 и 6 | выбор полного закупочного предложения, база, надбавка, включения и условия | полная цепочка |
| `control-shipment-execution` | Modules 1, 2 и 5 | источники факта, контрольные точки, два цикла статуса | Modules 1, 2 и 5 | план/факт и обработка двух отклонений | полная цепочка |
| `verify-transport-documents` | Module 4, retrieval в 5–6 | карта функций, сквозная сверка, протоколы расхождений | Modules 4–6 | проверка номера контейнера и честный статус пакета | полная цепочка |
| `communicate-and-close` | Modules 3, 5–6 | коммерческий ответ, изменение, статус, расчётный пакет | Modules 3–6 | сообщения, версия условий и финансовое закрытие | полная цепочка |

Все пять outcomes принадлежат Course metadata, преподаются минимум одним
Lesson, практикуются в Practice Task, покрыты соответствующим Module
Checkpoint и имеют наблюдаемый Capstone criterion. Outcome только с recall
evidence нет.

## Coverage and dependency checks

- Course содержит 6 Modules, 12 Lessons, 6 Module Checkpoints и Capstone.
- Основной маршрут — 580 минут: Modules с Checkpoints — 505, Capstone — 75.
  Optional advanced — 120 минут.
- Последовательность соблюдает prerequisites: услуга/роли → запрос → ставка →
  документы → исполнение → закрытие.
- Каждый поздний Module повторно применяет раннюю capability: участники,
  стоп-факторы, версия ставки, сквозные поля и план/факт.
- Reference Lesson «Проверь полноту до расчёта» проверяет центральный decision
  model и перенос на изменённый случай.
- Обычный груз покрыт как типовой case. Опасный, рефрижераторный, таможенный и
  неясно описанный груз остаётся границей остановки и эскалации.
- Интерфейсы, регулируемый тариф, налоги, юридическое заключение и внутренние
  полномочия не попали в core.
- Capability Packs не требуются и не заявлены.

## Deterministic answers and worked solutions

Проверены все 14 Knowledge Checks:

| Placement | Type | Проверенный ответ |
| --- | --- | --- |
| Course readiness | single | запросить описание груза до расчёта |
| Module 1, Lesson 1 | ordering | приём терминалом → размещение → автодоставка → разгрузка → возврат порожнего |
| Module 1, Lesson 2 | matching | прямые источники прибытия, окна, возврата и счёта сопоставлены с фактами |
| Module 2, Lesson 1 | matching | свойства/окно/номер/возврат сопоставлены с зависимыми решениями |
| Module 2, Lesson 2 | multiple | неизвестная жидкость и неподтверждённая выдача требуют СТОП до заказа автомобиля |
| Module 2, Lesson 2 transfer | single | два сценария или одно явное допущение |
| Module 3, Lesson 1 | numeric | 59 400 ₽ |
| Module 3, Lesson 2 | single | явно указаны включённые 2 часа и порядок превышения |
| Module 4, Lesson 1 | matching | функция документа сопоставлена с вопросом |
| Module 4, Lesson 2 | multiple | номер контейнера, ожидание в акте и старая версия окна требуют разрешения |
| Module 5, Lesson 1 | matching | прямые источники четырёх контрольных точек |
| Module 5, Lesson 2 | matching | safety, facts, authority, client status и new plan сопоставлены с условиями |
| Module 6, Lesson 1 | single | потенциальное превышение 30 минут, основание ещё проверяется |
| Module 6, Lesson 2 | multiple | документы/остатки, клиентский статус и история версии |

Проверено единственное раскрытое `TaskSolution`: база 65 000 ₽, надбавка 12%
7 800 ₽, итог 72 800 ₽. Проверены все числовые элементы открытых rubrics:

- worked example: 62 500 + 6 250 = 68 750 ₽;
- Module 3 Checkpoint: 60 000 + 6 000 = 66 000 ₽, возврат не посчитан;
- Module 4 Checkpoint: 09:30–11:00 = 90 минут; потенциально 30 сверх 60;
- Module 5 Checkpoint: 11:20–13:05 = 105 минут; 45 сверх 60;
- Module 6 Lesson: 95 − 60 = 35 минут;
- Module 6 Checkpoint: 105 − 60 = 45 минут;
- Capstone rate: 48 000 + 12 500 + 1 500 = 62 000 ₽; 10% = 6 200 ₽;
  итог 68 200 ₽;
- Capstone waiting: 11:35–13:20 = 105 минут; 45 сверх 60; два начатых
  интервала по 30 минут × 1 800 = 3 600 ₽;
- Capstone milestones: 12 + 12 + 8 + 12 + 13 + 10 + 8 = 75 минут.

После независимого аудита условие Capstone прямо задаёт начало и конец
учитываемого ожидания. Неоднозначный ordering по аварийному событию заменён
matching с жёсткими зависимостями.

## Practice solvability

Проверены 19 Practice Tasks: 12 Lesson tasks, 6 Module Checkpoints и Capstone.
В 18 tasks используется `TaskRubric`, в одном сходящемся расчёте —
`TaskSolution`.

- Каждое условие содержит данные, нужные для заявленного решения.
- Если точный ответ зависит от внутреннего правила, learner должен назвать
  локальный вопрос, а не угадывать.
- Задания выполняются без реальной CRM, 1С, «Этран», ГИС ЭПД, договора или
  тарифа АО «Контранс».
- Синтетические идентификаторы и организации не требуют персональных данных.
- Support fades: ранние cases дают карту и подсказки; Checkpoints и Capstone
  требуют самостоятельно выбрать структуру и обосновать решение.
- Capstone решаем: полное закупочное предложение определено, правило ожидания
  явно задано, полномочие изменения подтверждено, ошибка документа оставлена
  как управляемый остаток.

## Plain-Russian and comprehension audit

- Learner-facing текст обращается на `ты`; англоязычная внутренняя лексика
  заменена русской там, где она не несёт точного идентификатора.
- «Порожний контейнер» и «закупочная ставка» объяснены при первом учебном
  применении.
- Minor audit finding о кальке «владелец решения» исправлен: используется
  «уполномоченная роль» или «сотрудник, уполномоченный принять решение».
- Headings формулируют рабочий вопрос или действие. Read-aloud pass не выявил
  consequential ambiguity после исправлений.
- Reference Lesson внутренне пересказан без копирования и применён к case с
  изменившимся окном и неясной жидкостью.
- Target-learner comprehension probe с живым участником не проводился; это
  ограничение, а не подтверждение понимания.

## Source, version, jurisdiction and freshness checks

Factual risk: high. Applicability: jurisdiction-specific, Российская Федерация.
Источники проверены 2026-08-02. Повторная обязательная проверка — 2026-08-31,
до вступления новых требований 01.09.2026.

Проверены:

- публичные страницы АО «Контранс» о терминале, железнодорожных услугах,
  «Этран» и подразделениях;
- текущая статья 4 Федерального закона № 87-ФЗ и официальная публикация
  Федерального закона № 140-ФЗ;
- официальные разъяснения Минтранса о границе экспедиционной роли и переходе
  на ЭПД;
- официальная публикация постановления Правительства РФ от 20.02.2026 № 173;
- приказ Минтруда России от 13.04.2026 № 150н и дата вступления 01.09.2026.

87-ФЗ теперь прямо ограничен ситуацией, где организация действует как
экспедитор по договору транспортной экспедиции. Для другой договорной роли
остановка при неизвестном грузе обозначена как safety rule Курса и предмет
локальной процедуры, а не универсальный claim закона.

В learner-facing тексте переход на ЭПД описан как будущий только до даты
review. Локальный инструктаж требуется до первого оформления и до 31.08.2026;
после 01.09.2026 нужна повторно проверенная версия материалов.

## Accessibility and render-QA scope

Content-level audit:

- значение не кодируется только цветом;
- одна Mermaid diagram имеет `title`, `description`, `howToRead`, `takeaway`;
  условное хранение имеет явную обходную ветвь;
- таблицы имеют заголовки и не являются единственным источником safety rule;
- 14 Knowledge Checks дают текстовый feedback и explanation;
- 19 Practice Tasks имеют критерии и feedback;
- открытая Reflection не оценивается автоматически;
- Course не требует таймера, реакции на скорость или раскрытия реальных
  клиентских данных.

Render scope для финальной проверки: Overview, 6 Module pages, 12 Lessons,
6 Checkpoints и Capstone; desktop/mobile; Mermaid fallback; tables; matching,
ordering, numeric, multiple/single; keyboard focus and feedback; absence of
page-level horizontal overflow.

Фактическая render-QA:

- production build создал 104 static pages, включая все 26 routes Course;
- 20 core routes Course отдельно проверены при 1440 px и 390 px: 40/40
  вернули HTTP 200, имеют ровно один `h1`, console errors и page-level
  horizontal overflow отсутствуют;
- полный browser suite прошёл 162/162 tests после трёх production builds;
- suite проверил desktop/mobile navigation, keyboard paths, Knowledge Checks,
  Practice Tasks, Reflections, semantic visuals, progress, revisions,
  deployment paths и offline behavior.

## Validation record

| Check | Date | Result |
| --- | --- | --- |
| Public content validator before report | 2026-08-02 | all Course source accepted; expected missing quality-report blocker only |
| Contract tests before report | 2026-08-02 | 136/138 pass; two expected failures depended only on missing quality report |
| Whitespace check | 2026-08-02 | pass |
| Final public validator | 2026-08-02 | pass: 4 Courses, 19 Modules, 56 Lessons, 19 Checkpoints, 4 Capstones; 0 errors |
| Contract tests | 2026-08-02 | pass: 138/138 |
| Production build | 2026-08-02 | pass: 104 pages; 11.05 MiB offline release |
| Browser suite | 2026-08-02 | pass: 162/162 after three production builds |
| Focused Course render QA | 2026-08-02 | pass: 20 routes × 2 widths; 40/40 HTTP 200; no console errors or overflow |

## Независимый ИИ-аудит

Fresh-context auditor: `/root/independent_course_audit`. Auditor received the
platform authoring contract, Course Brief, Course Blueprint, research source
policy and every learner-facing source file. Files were not edited by auditor.

Audit method:

- consequential/time-sensitive claims independently rechecked against current
  law, official Mintrans guidance and official company pages;
- all 14 deterministic answers, the worked solution and every numeric rubric
  line independently solved;
- Outcome Alignment, prerequisites, workload, scaffolding, cumulative
  retrieval and changed-case transfer traced from requirements;
- plain Russian, terminology, read-aloud, accessibility, safety, jurisdiction,
  versions and freshness checked;
- findings classified `critical`, `material` and `minor` with evidence and
  concrete correction.

Initial findings: 0 critical, 5 material, 2 minor.

Corrections:

1. 87-ФЗ bounded to the contractual role of expediter; primary publication and
   Mintrans boundary guidance added.
2. Review deadline moved from 2026-09-02 to 2026-08-31; local instruction must
   be learned before first EPD and before the transition.
3. Dates corrected: Government resolution № 173 — 20.02.2026; Labour Ministry
   order № 150н — 13.04.2026.
4. Capstone now defines the measured waiting interval and exposes planned
   overrun risk.
5. Ambiguous safety ordering replaced by deterministic matching.
6. Minor terminology calque removed and Mermaid storage bypass added.

Affected content validation rerun reached no source or component error; before
this report existed, the only remaining validator message was its expected
absence. No critical or material finding remains unresolved.

This is an independent AI audit, not independent expert review, field
validation, certification, or proof that no error remains.

## Remaining limitations

- Независимая экспертная проверка не проводилась. No independent expert review
  was performed.
- Юрист РФ, специалист по транспортной экспедиции, сотрудник по опасным грузам
  и внутренний эксперт АО «Контранс» Course не проверяли.
- Должностная инструкция, RACI, реальные договоры, ставки, нормативы,
  полномочия, оператор ИС ЭПД и интерфейсы АО «Контранс» недоступны.
- Course готовит к типовой заявке на обычный груз под локальным контролем, но
  не даёт допуска к опасному, таможенному, рефрижераторному или претензионному
  случаю.
- Target-learner probe и field validation не проводились.
- Digital render QA не заменяет ручное тестирование screen reader и проверку с
  людьми с инвалидностью.
- После 2026-08-31 high-risk материал нельзя считать актуально проверенным без
  повторной верификации и обновления future-tense claims.
