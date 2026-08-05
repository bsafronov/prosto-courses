---
name: audit-course
description: Независимо проверить, исправить и опубликовать готовый draft нового курса.
---

# Audit Course

Проведи Independent Course Audit готового draft в свежем контексте, исправь findings, создай quality report и только затем опубликуй Course из `drafts/courses/` в `src/content/courses/`.

## Вход и границы

Если slug не указан, найди единственный draft с Brief, Blueprint и полным learner-facing Course source. При нескольких кандидатах запроси только slug. Этот skill обслуживает новый Course: перед публикацией `src/content/courses/<course-slug>` должен отсутствовать. Существующий target — точный конфликт, а не разрешение на overwrite.

Independent Course Audit — fresh-context AI review. Он сильнее self-review, но не является independent expert review, field validation или доказательством отсутствия ошибок. Отсутствие target-learner probe и expert review остаётся явным ограничением там, где применимо.

## Обязательное ядро

- Начинай аудит от Brief, Blueprint, Source Policy, canonical contracts и authoritative sources, а не от авторского summary.
- Проверяй каждое Learning Outcome по цепочке instruction → practice → Module Checkpoint → Capstone criterion и transfer.
- Независимо решай или трассируй каждый deterministic answer, worked solution и rubric criterion.
- Перепроверяй каждое consequential/time-sensitive утверждение и representative sample остальных по primary/official sources.
- Разделяй accuracy, learning design, plain Russian, platform/accessibility и render QA на отдельные passes.
- Классифицируй findings как `critical`, `material` или `minor`; указывай location, evidence, consequence и concrete correction.
- Исправляй все `critical` и `material`; локальные безопасные `minor` исправляй, остальные получают явный disposition.
- Повторяй затронутые проверки после исправления. Release требует ноль unresolved `critical` и `material`, выполненный validator/build и отсутствие blocking Critical Decision.

## Канонические references

До запуска аудитора полностью прочитай [`references/audit-contract.md`](references/audit-contract.md). Он содержит audit method, quality report, Content Revision, Definition of Done и Render QA.

Аудитору передай прямые pointers и потребуй читать их по pass, а не одной неразличимой массой:

- [`../design-course/references/design-contract.md`](../design-course/references/design-contract.md) — intent, metadata, architecture, Source Policy и freshness;
- [`../author-course/references/authoring-contract.md`](../author-course/references/authoring-contract.md) — pedagogy и Course Voice;
- [`../author-course/references/plain-russian-contract.md`](../author-course/references/plain-russian-contract.md) — исчерпывающий language audit;
- [`../author-course/references/platform-contract.md`](../author-course/references/platform-contract.md) — assessments, components, visuals и accessibility.

Full research evidence [`../author-course/references/plain-language-evidence.md`](../author-course/references/plain-language-evidence.md) раскрывай только для disputed language rule или проверки границы переноса research finding.

## Шаги

### 1. Зафиксировать audit input

Проверь полноту draft. Собери Brief, Blueprint, весь Course source, evidence ledger, Source Policy, platform manifest и canonical references. Не передавай auditor собственные выводы, suspected bugs или ожидаемый verdict.

Заверши шаг, когда audit bundle позволяет восстановить требования и проверить Course без авторского контекста, а unresolved Critical Decision либо отсутствует, либо точно блокирует только зависимую часть.

### 2. Запустить fresh-context auditor

Запусти отдельного субагента как независимого аудитора. Передай raw audit bundle и следующий scope:

1. facts, causal models, versions, jurisdiction, safety и freshness;
2. prerequisites, cognitive load, Outcome Alignment, scaffolding, Cumulative Retrieval и changed-case transfer;
3. все deterministic answers, worked solutions, tasks и Capstone rubric;
4. plain Russian, literal translation, terminology, read-aloud risks и Course Voice;
5. platform API, metadata, accessibility и render risks.

Потребуй exhaustive findings с location, severity, evidence и correction. Аудитор завершён только после проверки каждого consequential claim, каждого deterministic artifact, каждого Learning Outcome и каждого unique component/visual pattern; representative sampling допустим только для lower-risk claims.

### 3. Исправить и перепроверить

Самостоятельно проверь evidence каждого finding. Исправь confirmed `critical` и `material`; исправь безопасные локальные `minor`, остальные запиши с причиной disposition. Если authoritative sources конфликтуют materially и research не разрешает конфликт, оформи одну Critical Decision.

Повторно реши изменённые answers, перепроверь затронутые claims, alignment, русский и platform contract. При существенной переработке попроси fresh-context auditor повторить affected pass. Шаг завершён при нуле unresolved `critical` и `material` и документированном disposition каждого `minor`.

### 4. Создать quality report

Создай `_authoring/quality-report.md` с точным ready-status из audit contract. Запиши Outcome Alignment, coverage/dependencies, answers/solutions, practice solvability, plain-Russian findings, sources/freshness, accessibility/render QA, validator/build, audit method, fresh-context auditor, findings/corrections/reruns и remaining limitations.

Заверши шаг, когда непустой `## Independent Course Audit` честно отражает raw findings и corrections, не заявляет expert review и содержит достаточно evidence для воспроизведения release decision.

### 5. Проверить draft и опубликовать

Запусти validator на draft через `COURSE_CONTENT_ROOT=./drafts/courses`. Исправь каждую ошибку выбранного Course. До переноса проверь все относительные ссылки, пути к assets и provenance так, как они будут разрешаться из будущего `src/content/courses/<course-slug>`; draft-пути не должны попасть в release. Убедись, что target отсутствует, затем перемести туда готовый Course без overwrite и повторно проверь ссылки уже из опубликованного пути.

Запусти:

```sh
pnpm validate
pnpm build
```

Проведи Render QA для Course Overview, Capstone, одного representative Lesson каждого Module и каждой unique component/visual pattern на desktop/mobile и с keyboard. Platform defect запиши отдельно; Course source исправляй только в пределах authoring contract.

При post-publish failure сохрани диагностируемое состояние, исправь Course и повтори affected checks. Release завершён только при успешных validate/build, пройденном Render QA, нуле unresolved `critical`/`material` и отсутствии blocking Critical Decision.

### 6. Передать release

Сообщи Course Owner: чему теперь учит Course, audit result, выполненные checks, remaining high-risk limitations и путь опубликованного Course. Не требуй общего approval и не выдавай AI audit за expert или learner validation.
