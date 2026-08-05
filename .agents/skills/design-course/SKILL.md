---
name: design-course
description: "Спроектировать новый курс: исследовать тему, создать Course Brief и Course Blueprint."
---

# Design Course

Спроектируй один новый Course и остановись до написания learner-facing материалов. Работай в `drafts/courses/<course-slug>/`; каталог `src/content/courses/` предназначен только для прошедшего аудит Course.

## Вход и границы

Прими свободный запрос Course Owner. Сам исследуй репозиторий, платформу и тему. Если slug не задан, создай короткий lowercase-hyphen slug. Этот skill создаёт только новые Courses; при совпадении slug с существующим draft или опубликованным Course остановись и сообщи точный конфликт.

Эскалируй только Critical Decision: вопрос, который нельзя надёжно разрешить по свидетельствам и варианты которого материально меняют Learner Profile, scope, Learning Outcomes, Capstone, безопасность, юрисдикцию, стоимость, необратимую зависимость или продуктовый компромисс. Задавай по одному вопросу короткой карточкой: решение, рекомендуемый default, различающиеся последствия, безопасный fallback. При наличии безопасного default продолжай и запиши допущение.

## Обязательное ядро

- Один Course обслуживает один Learner Profile и ограниченный практический запрос.
- Entry capabilities и Learning Outcomes наблюдаемы. Полнота означает перенос каждого Learning Outcome в реалистичную новую ситуацию, а не исчерпывающий охват темы.
- Проектируй назад от Capstone Demonstration и его evidence. Topic list не заменяет Outcome Alignment.
- Один Module развивает одну промежуточную capability; один Lesson — одну primary capability и полный Learning Cycle.
- Предпосылки предшествуют использованию; Instructional Scaffolding ослабевает к независимому переносу; Cumulative Retrieval возвращает важные capabilities позже.
- Source Policy отдаёт приоритет первичным и официальным источникам. Версия, дата, юрисдикция, неопределённость и граница применимости остаются видимыми.
- Реестр доказательств связывает каждое существенное, спорное или time-sensitive утверждение с точным источником и местом будущего использования.
- Course Brief фиксирует замысел и решения; Course Blueprint доказывает покрытие, последовательность и реалистичную нагрузку.

## Канонический reference

До исследования полностью прочитай [`references/design-contract.md`](references/design-contract.md). Он содержит полный контракт этого этапа, metadata, Course architecture, Source Policy и Content Freshness. Применяй точную доменную терминологию из `CONTEXT.md`; learner-facing формулировки на этом этапе не создавай.

## Шаги

### 1. Исследовать

Прочитай `AGENTS.md`, `CONTEXT.md`, релевантные ADR, существующие Course sources, validator contract и `platform/capability-packs.json`. Найди авторитетные источники темы; проверь current версии, юрисдикцию, factual risk, safety и accessibility. Факты находи самостоятельно, решения Course Owner не подменяй.

Заверши шаг, когда для каждого consequential, disputed или time-sensitive утверждения записаны: формулировка, точный источник, версия/юрисдикция/дата проверки, граница применимости и предполагаемое место в Course; оставшиеся неопределённости классифицированы как допущение, риск или Critical Decision.

### 2. Зафиксировать Course Brief

Создай только `drafts/courses/<course-slug>/_authoring/brief.md`. Включи все поля и ready-status из design contract, непустой `## Decision record` и `## Evidence ledger`. Реестр доказательств не раздувай общеизвестными низкорисковыми фактами.

Заверши шаг, когда Learner Profile, need, entry capabilities, scope/exclusions, stable Learning Outcomes, Capstone evidence, workload/depth, Source Policy, freshness, language, packs, risks и решения образуют один непротиворечивый замысел, а unresolved Critical Decision не блокирует проектирование.

### 3. Проверить Course Blueprint

Создай `drafts/courses/<course-slug>/_authoring/blueprint.md`. Проектируй от Capstone назад: criteria → Learning Outcomes → checkpoints/practice → instruction → prerequisites. Добавь concept map, Modules/Lessons, explanation plan, scaffolding, Cumulative Retrieval, оценки времени и coverage audit.

Заверши шаг, когда каждый Learning Outcome имеет instruction, practice, Module Checkpoint и Capstone criterion; все зависимости упорядочены; каждая capability имеет одного владельца; workload входит в бюджет; gaps, duplication, overload и лишний материал устранены; unresolved Critical Decision не блокирует authoring.

### 4. Передать результат

Перечитай оба артефакта против обязательного ядра и design contract. Сообщи Course Owner только путь draft, краткий замысел, принятые defaults, остающиеся ограничения и следующий вызов `$author-course`. Learner-facing Course source не создавай.

Skill завершён только при наличии готовых `brief.md` и `blueprint.md` с выполненными критериями обоих артефактов.
