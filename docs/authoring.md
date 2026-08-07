# Course authoring

Основной вызов `$create-course` проводит новый Course от короткого intake до проверенной публикации. Три repo-local stage skills остаются для отдельной работы; подробные нормы живут только в canonical contracts.

## Один вызов

```text
$create-course Курс по Git для дизайнеров, которые передают макеты разработчикам
```

Skill сначала задаёт одну карточку максимум из трёх вопросов или подтверждает уже полный замысел. После одного ответа Authoring Agent сам исследует тему, фиксирует defaults, проектирует, пишет, независимо проверяет и публикует Course. Дополнительных approval gates и поздних вопросов нет.

Публикация завершается только после Independent Course Audit, validation, build, Render QA и повторной validation окончательного quality report. Временный Course Release Journal позволяет продолжить или откатить прерванный release candidate. При failed gate Course возвращается в диагностируемый draft; существующий опубликованный target не перезаписывается.

## Три этапа

| Вызов | Работа | Результат |
| --- | --- | --- |
| `$design-course` | Исследовать тему и платформу, разрешить Critical Decisions, спроектировать Course назад от Capstone | Готовые `_authoring/brief.md` и `_authoring/blueprint.md` в `drafts/courses/<course-slug>/` |
| `$author-course` | Откалибровать Reference Lesson через cold read, затем написать Course Module за Module | Полный learner-facing draft без quality report |
| `$audit-course` | Провести fresh-context Independent Course Audit, исправить findings, проверить и опубликовать Course | Quality report и готовый Course в `src/content/courses/<course-slug>/` |

Stage skills работают в том же режиме Delegated Authoring. `$design-course` проводит один intake, если не получил уже подтверждённый замысел. `$author-course` и `$audit-course` используют готовые артефакты и не задают новых вопросов.

## Канонические contracts

- [Design contract](../.agents/skills/design-course/references/design-contract.md) — полнота Course, сотрудничество, Course Brief, Course Blueprint, metadata, Course architecture, Source Policy и Content Freshness.
- [Authoring contract](../.agents/skills/author-course/references/authoring-contract.md) — Reference Lesson, module loop, Instructional Scaffolding, learner action, diagnostic errors, Cumulative Retrieval и Course Voice.
- [Plain-Russian contract](../.agents/skills/author-course/references/plain-russian-contract.md) — обязательная operational выжимка для объяснения, естественного русского, перевода, feedback и comprehension passes.
- [Platform contract](../.agents/skills/author-course/references/platform-contract.md) — assessment, learner progress, Semantic Course Components, Learning Visuals и accessibility.
- [Plain-language evidence](../.agents/skills/author-course/references/plain-language-evidence.md) — исследования и редакторские основания; загружаются только при споре о правиле или его границах.
- [Audit contract](../.agents/skills/audit-course/references/audit-contract.md) — Independent Course Audit, quality report, validation, release и Render QA.

Каждое нормативное правило живёт в одном canonical contract. `SKILL.md` содержит только обязательное process kernel и точные completion criteria.

## Draft и публикация

Незавершённый Course хранится в:

```text
drafts/courses/<course-slug>/
```

Так draft без Independent Course Audit и quality report не ломает проверку опубликованного каталога. `$audit-course` сначала проверяет draft через `COURSE_CONTENT_ROOT=./drafts/courses`, затем при свободном target перемещает готовое дерево в:

```text
src/content/courses/<course-slug>/
```

До завершения публикации обязательны `pnpm validate`, `pnpm build` и Render QA из audit contract.

## Отдельные этапы

Stage skills нужны, когда Course Owner намеренно останавливается между этапами:

```text
$design-course Курс по Git для дизайнеров, которые передают макеты разработчикам
$author-course <course-slug>
$audit-course <course-slug>
```

`$author-course` и `$audit-course` автоматически выбирают единственный подходящий draft. При нескольких кандидатах передай slug явно.
