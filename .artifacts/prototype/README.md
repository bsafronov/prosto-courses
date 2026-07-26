# Variant A prototype evidence

This throwaway branch preserves the A/B/C learner-interface exploration that
preceded production work for [issue #30](https://github.com/bsafronov/prosto-courses/issues/30).
It is review evidence, not production code.

## Verdict

The Course Owner selected **Variant A** on 2026-07-26 without requesting a
hybrid:

- Home: **Редакционный маршрут**
- Learning destinations: **Тихая колонка**

The prototype validated the neutral light and dark palettes, editorial Home,
ruled Course Catalog, persistent `18rem` desktop Course route, `65–70ch`
Lesson column, locally bundled Onest and IBM Plex Mono fonts, and accessible
mobile Course-route drawer behavior.

Variants B and C remain here only as comparison evidence. Production work must
rewrite the selected direction as maintainable production components and must
not promote prototype switching, query parameters, storage keys, or review
controls.

## Captures

Variant A has desktop and mobile captures in light and dark themes for Home and
Lesson. Additional captures show the mobile drawer and representative Knowledge
Check and Practice Task states. Desktop light captures preserve Variants B and C
for comparison.

All PNG files in this directory were captured from the prototype represented by
this branch.

## Observations

- No external runtime resource requests were observed.
- Reduced-motion preferences were respected.
- The prototype generated a `4.23 MiB` Offline Availability release with the
  then-current single-Course catalog. This is evidence, not a new release budget.

Issue #31 exists to keep this evidence recoverable while returning production
to its pre-prototype learner UI.
