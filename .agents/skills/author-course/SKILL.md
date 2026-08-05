---
name: author-course
description: Написать новый курс по готовым Course Brief и Course Blueprint.
---

# Author Course

Преврати готовый проект нового Course в полный draft. Откалибруй один Reference Lesson, затем пиши Module за Module. Сохраняй draft в `drafts/courses/<course-slug>/`; quality report и публикацию оставь `$audit-course`.

## Вход и границы

Если Course Owner не указал slug, найди единственный draft с готовыми `_authoring/brief.md` и `_authoring/blueprint.md`. При нескольких кандидатах запроси только slug. При отсутствии готового проекта остановись и назови недостающий артефакт. Этот skill не перерабатывает опубликованные Courses.

Brief и Blueprint — контракт. Сам разрешай исследуемые и обратимые вопросы. Эскалируй одну Critical Decision только когда новый факт материально меняет Learner Profile, scope, Learning Outcomes, Capstone, безопасность, юрисдикцию, стоимость, необратимую зависимость или продуктовый компромисс. Изменение замысла сначала запиши в Brief и Blueprint.

## Обязательное ядро

- Начинай объяснение с практического вопроса ученика и дай короткий точный ответ рано.
- Выстрой mental model по одному причинному или decision step: предпосылки → необходимые части и термины → связи → representative case → contrast/boundary.
- Один Lesson развивает одну primary capability через полный Learning Cycle: активация, модель, действие, corrective feedback, transfer, consolidation.
- Введи необходимый термин через знакомое объяснение, точный термин, роль/признак, пример и близкий non-example; затем сохраняй одно название.
- Покажи consequential reasoning в worked example. Затем сними Instructional Scaffolding: partial completion → independent familiar case → changed/ambiguous transfer.
- Дай ученику попытку до ответа. Feedback называет признак, причину ошибки, governing rule и следующее действие.
- Возвращай важные capabilities через Cumulative Retrieval; используй прежние знания внутри новой работы.
- Пиши learner-facing content естественно по-русски. Внутренние английские термины, prompts и sources не переходят в Course. Официальные имена, code, commands, identifiers и точные interface labels сохраняют исходную форму.
- Каждый факт следует Source Policy и evidence ledger. Каждый компонент и prop следует closed platform contract.
- Каждый элемент служит Learning Outcome или исправляет вероятную misconception; decoration и quota не проектируют Course.

## Канонические references

Перед authoring полностью прочитай:

1. [`references/authoring-contract.md`](references/authoring-contract.md) — Reference Lesson, module loop, педагогика и Course Voice.
2. [`references/plain-russian-contract.md`](references/plain-russian-contract.md) — обязательный operational contract русского учебного текста.
3. [`references/platform-contract.md`](references/platform-contract.md) — assessment, Semantic Course Components, visuals и accessibility.

[`references/plain-language-evidence.md`](references/plain-language-evidence.md) содержит исследования и редакторские основания. Читай его только при неоднозначности правила, изменении plain-Russian contract или необходимости проверить перенос вывода на конкретную аудиторию; ежедневный authoring опирается на короткий operational contract.

## Шаги

### 1. Подготовить authoring context

Полностью прочитай Brief и Blueprint. Проверь Decision record, evidence ledger, Source Policy, current dates/versions, Capability Packs и unresolved risks. Составь внутреннюю матрицу `Learning Outcome → instruction → practice → checkpoint → Capstone` и порядок dependencies. Не создавай новый scope молча.

Заверши шаг, когда каждый planned Course source имеет владельца, входные capabilities и evidence; все нужные источники доступны или факт помечен для повторной проверки; unresolved Critical Decision не блокирует authoring.

### 2. Откалибровать Reference Lesson

Выбери representative Lesson из середины Course, который проверяет planned depth, explanation, practice, feedback, interaction и visual language. Создай нужный Module path и полностью напиши Lesson по обязательному ядру.

Запусти cold-reader в отдельном свежем agent context. Передай только Learner Profile, нужные entry capabilities, Learning Outcome и Lesson source — без ожидаемого пересказа и собственной оценки. Попроси найти центральную идею, пересказать causal/decision model своими словами, решить малую changed case и назвать места, где связь пришлось угадывать. Рассматривай это как AI cold read, не как target-learner comprehension probe и не как expert review.

Исправляй Lesson и повторяй затронутую проверку, пока central model можно восстановить без копирования формулировок, changed case решается из Lesson, практика имеет честную попытку и explanatory feedback, support соответствует Learner Profile, русский звучит естественно, а platform props точны. Запиши метод, findings, corrections и отсутствие живого learner probe в Blueprint.

### 3. Написать Course по Modules

Пиши Modules в dependency order. Для каждого Module:

1. перечитай его Blueprint slice, связанные evidence и прежние capabilities для Cumulative Retrieval;
2. создай Module overview и Lessons, сохраняя одну intermediate capability и одну primary capability на Lesson;
3. создай cumulative Module Checkpoint, который интегрирует Module;
4. независимо реши каждый deterministic answer и worked solution;
5. проверь Outcome Alignment, solvability, fading support, transfer, feedback, plain Russian, exact components и accessibility;
6. исправь все найденные material gaps до перехода к следующему Module.

Module завершён только когда все его outcomes обучены и отработаны, checkpoint их интегрирует, prerequisites уже введены, задачи решаемы из доступного content, ответы проверены, а source и language audits не оставляют material finding.

### 4. Завершить learner-facing Course

Создай Course Overview и Capstone Demonstration по metadata contract. Capstone даёт authentic performance, observable criteria и Self-Assessment по каждому Learning Outcome. Проверь required/optional scope, constraints, milestones, likely failures, reflection и extensions.

Заверши шаг, когда Course tree содержит Overview, все Modules/Lessons/Checkpoints и один Capstone; каждый Learning Outcome taught, practiced и demonstrated; time estimates согласованы; core path self-contained; External References только дополняют его.

### 5. Провести self-review draft

Выполни отдельные passes: accuracy, structure, Russian, read-aloud, deterministic answers, practice solvability, Outcome Alignment, sources/freshness, components и accessibility. Запусти content validator против `drafts/courses`; до Independent Course Audit единственной допустимой ошибкой выбранного Course остаётся отсутствие `_authoring/quality-report.md`. Исправь все остальные ошибки.

Сообщи Course Owner путь draft, coverage summary, результат cold read, ограничения и следующий вызов `$audit-course`. Не создавай quality report, не перемещай Course в `src/content/courses/` и не представляй self-review как Independent Course Audit.

Skill завершён только при полном learner-facing draft, пройденных module criteria и отсутствии известных critical/material authoring findings.
