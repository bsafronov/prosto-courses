# Handoff: Prosto.Courses UX planning

Audit date: 2026-08-03  
Saved: 2026-08-08  
Next session: turn UX audit into a scoped, sequenced product/engineering plan. No implementation requested yet.

## Repository state

- Repository: `/Users/bogdan/Code/prosto-courses`
- Audit made no repository changes.
- At handoff creation, unrelated untracked `.DS_Store` existed; preserve it.
- Project instructions activate `/caveman` and prefer `codebase-memory-mcp` graph tools for code discovery.

## Current platform

Static/serverless Astro + MDX course platform. Audited catalog: 4 Courses, 19 Modules, 56 Lessons. Existing learner UX includes Course Catalog, Course Overview, Course route, browser-local progress, cross-catalog Resume Destination, Content Revision revisit notices, Knowledge Checks, Practice Tasks, private Reflection notes, theme control, PWA installation, and atomic full-catalog Offline Availability.

Use product vocabulary and boundaries from [`CONTEXT.md`](../CONTEXT.md). Architecture/contribution summary: [`README.md`](../README.md).

## Audit conclusion

Navigation between destinations is strong. Biggest gap: continuity inside long Lessons and across sessions. Lessons reached 388 MDX lines during audit, but Lesson pages lacked an in-page outline, section-level resume, and persisted Knowledge Check / hint state.

## Candidate roadmap

### P0 — learning continuity

1. **Lesson outline + section resume**
   - Generate links from authored `h2`/`h3` headings.
   - Desktop: compact sticky outline; mobile: collapsible “В этом Уроке”.
   - Persist last meaningful `headingId`, not pixel offset; fall back safely after Content Revision.
   - Keep independent from Lesson Completion.

2. **Persist transient learning interactions**
   - Restore Knowledge Check input/result, revealed Practice Task hints, and optional Practice Task working state after reload.
   - Keep formative: no score, grade, gate, or automatic Lesson Completion.
   - Decide whether correct answers restore visibly or require deliberate re-check.

3. **Learner-state backup/restore**
   - Export/import progress plus all Reflection notes as versioned JSON.
   - Import previews contents, validates schema, and offers decided merge/replace semantics before writing.
   - Consider persistent browser storage where supported; explain that browser-local data can still be lost.

### P1 — orientation and discovery

4. **“Моё обучение” view**
   - Active Courses, next concrete action, updated Lessons, completed Courses.
   - Reuse current local progress; avoid peer comparisons and decorative analytics.

5. **Static offline search**
   - Search Course, Module, Lesson title/capability and possibly body text.
   - Build-time index; works under repository base path and Offline Availability.
   - Add useful catalog filters only: progress state, updated content, workload/topic. Avoid vague “difficulty” unless domain model defines it.

6. **Actionable Readiness Check**
   - Incorrect response may recommend a specific Lesson, Course, or authoritative preparation resource.
   - Requires authoring-contract/schema decision; existing Knowledge Check supports feedback but not destination recommendations.

### P2 — trust and scale

7. **“Сообщить об ошибке”**
   - Prefill Course, destination, Lesson revision, URL, and Content Freshness context.
   - Choose a learner-friendly reporting channel; do not assume every learner has GitHub.

8. **Independent Offline Courses**
   - Already proposed in [`ADR-0011`](adr/0011-prepare-offline-courses-independently.md); plan by referencing or reopening that decision.

## Recommended first planning slice

Plan **Lesson continuity** as one outcome, then decide ticket boundaries:

- section outline/navigation;
- durable section-level return;
- persisted formative interaction state.

Suggested success criteria:

- learner returns to a long Lesson and reaches previous section in one action;
- outline order and labels exactly match rendered major headings;
- mobile layout does not compete with Course route drawer;
- state survives reload/offline launch but never changes Lesson Completion;
- missing/renamed headings and old stored state fail safely;
- keyboard, screen reader, reduced motion, 200% zoom, root path, and repository base path covered.

## Key implementation seams

- Lesson body wrapper: [`src/components/LearningPage.astro`](../src/components/LearningPage.astro)
- Course shell/drawer: [`src/components/LearningShell.astro`](../src/components/LearningShell.astro)
- Lesson route: [`src/pages/courses/[course]/lessons/[lesson].astro`](../src/pages/courses/[course]/lessons/[lesson].astro)
- Progress storage: [`src/scripts/progress-store.ts`](../src/scripts/progress-store.ts)
- Progress behavior: [`src/scripts/progress.ts`](../src/scripts/progress.ts)
- Home Resume Destination: [`src/scripts/home-progress.ts`](../src/scripts/home-progress.ts)
- Knowledge Check state was ephemeral: [`src/components/KnowledgeCheck.astro`](../src/components/KnowledgeCheck.astro)
- Practice hints were ephemeral: [`src/components/PracticeTask.astro`](../src/components/PracticeTask.astro)
- Reflection export handled one note: [`src/components/Reflection.astro`](../src/components/Reflection.astro)
- Content schemas: [`src/content-schemas.mjs`](../src/content-schemas.mjs)
- UI contract: [`docs/design-system.md`](design-system.md)

Relevant accepted decisions:

- Static platform: [`ADR-0002`](adr/0002-use-astro-for-the-static-platform.md)
- Progress across revisions: [`ADR-0006`](adr/0006-preserve-progress-across-content-revisions.md)
- Current catalog-wide offline model: [`ADR-0007`](adr/0007-precache-complete-catalog-releases.md)

## Existing work — do not duplicate

- Course PDF epic already exists: [GitHub issue #60](https://github.com/bsafronov/prosto-courses/issues/60), with child issues #61–67 at audit time.
- Independent Offline Courses already captured by ADR-0011 above.
- Do not introduce points, streaks, rankings, mandatory badges, grading, or certification; authoring/domain docs reject those semantics.
- Prefer backup/restore before accounts or cloud synchronization; current product promises browser-local state and static deployment.

## Evidence used

- W3C in-document outline technique: [G64 — Providing a Table of Contents](https://www.w3.org/WAI/WCAG22/Techniques/general/G64)
- Browser persistent-storage behavior: [MDN `StorageManager.persist()`](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)
- Dashboard caution: learner-facing analytics should produce actionable recommendations, not only descriptive numbers: [systematic review](https://pubmed.ncbi.nlm.nih.gov/35194560/)

## Open decisions for planning

1. First outcome: Lesson outline only, or outline plus durable return?
2. Should transient interaction restoration be automatic, or offered as “Продолжить попытку”?
3. Backup import: merge only, replace only, or both?
4. One “Моё обучение” section on Catalog, or separate route?
5. Search scope: metadata first or full Lesson text immediately?
6. Does actionable Readiness Check need a new Semantic Course Component input or separate recommendation component?

## Suggested skills

- `grilling` — stress-test first outcome, scope, and trade-offs before PRD.
- `domain-modeling` — define new terms such as learner-state backup or section resume; avoid vocabulary drift.
- `codebase-design` — design a deep learner-state/storage boundary instead of spreading localStorage keys through components.
- `prototype` — test desktop/mobile Lesson outline and resume behavior before committing UI architecture.
- `frontend-design` — shape outline and “Моё обучение” without weakening current restrained design language.
- `tdd` — once implementation starts, lock behavior through browser tests and storage migration fixtures.
