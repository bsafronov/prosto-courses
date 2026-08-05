# Course authoring

Канонический authoring contract разделён между тремя repo-local, user-invoked skills. Каждый запуск загружает только правила своего этапа; подробные нормы не дублируются в этом файле.

## Три этапа

| Вызов | Работа | Результат |
| --- | --- | --- |
| `$design-course` | Исследовать тему и платформу, разрешить Critical Decisions, спроектировать Course назад от Capstone | Готовые `_authoring/brief.md` и `_authoring/blueprint.md` в `drafts/courses/<course-slug>/` |
| `$author-course` | Откалибровать Reference Lesson через cold read, затем написать Course Module за Module | Полный learner-facing draft без quality report |
| `$audit-course` | Провести fresh-context Independent Course Audit, исправить findings, проверить и опубликовать Course | Quality report и готовый Course в `src/content/courses/<course-slug>/` |

Skills работают в режиме Delegated Authoring. Course Owner отвечает только на Critical Decisions без безопасного default; промежуточные approval gates не требуются.

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

После публикации обязательны `pnpm validate`, `pnpm build` и Render QA из audit contract.

## Быстрый вызов

Начального запроса в свободной форме достаточно:

```text
$design-course Курс по Git для дизайнеров, которые передают макеты разработчикам
```

Следующие skills автоматически выбирают единственный подходящий draft. Slug нужен только при нескольких кандидатах:

```text
$author-course <course-slug>
$audit-course <course-slug>
```
