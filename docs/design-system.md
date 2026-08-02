# Plain-CSS design system

Prosto.Courses owns visual decisions centrally. Application CSS consumes the
system; Course source expresses learning meaning and never selects presentation.

## Token ownership

[`src/styles/tokens.css`](../src/styles/tokens.css) is the only source of raw
visual values. It owns semantic colors, the eight type roles, allowed font
weights, the 4px spacing scale, measures, responsive boundaries, borders,
radii, shadows, control sizes, layers, and motion. Theme rules may replace
semantic color tokens, but consumers still reference the same role.

Consumer CSS uses `var(--role)` for a visual decision. `0`, `auto`, `inherit`,
percentages, and CSS-wide or intrinsic layout keywords are allowed because they
do not create a competing design scale. Media queries cannot consume custom
properties, so their literal value must match a `--breakpoint-*` declaration in
the token source.

Typography is selected as a composite role: `meta`, `supporting`, `body`,
`reading`, `component-title`, `section-title`, `page-title`, or `display`.
Muted text changes color only. `display` belongs only to the short Course
Catalog hero. Onest consumers use weights 400, 500, 600, or 700 through the
named weight tokens.

## Card contract

[`Card.astro`](../src/components/Card.astro) owns one surface and the optional
eyebrow, title, description, body, and actions regions. Callers choose the
semantic root and heading level. They do not choose decorative padding,
surface, radius, or elevation variants. Blocks with a different concept or
behavior get a named component instead of another Card prop.

Work areas use the same Card anatomy and shared control primitives. Their
scoped rules may express unique interaction geometry or state composition, but
not a new surface or local type, spacing, control, or color scale.

## Scoped-style extraction rule

Unique composition stays beside its Astro component and consumes tokens. When
the same anatomy or visual rule gains a second independent consumer, extract
it: anatomy or accessibility goes into a shared Astro component; visual-only
layout goes into a small semantic rule in `global.css`. Do not create atomic
utility classes or wrapper components without anatomy or behavior.

## Technical exceptions

Data-driven geometry may remain dynamic when a token cannot represent it:

- Chart SVG coordinates and dimensions are derived from series count and label
  density in `Chart.astro`; palette values still come from semantic data tokens.
- Catalog and Course-route progress widths are computed percentages in
  `home-progress.ts` and `progress.ts`.
- Knowledge Check ordering uses pointer/keyboard displacement in pixels from
  `@dnd-kit` and the rendered item geometry.
- Knowledge Check ordering uses one documented 16rem container threshold for
  its unique two-control composition; it is not a global viewport breakpoint.
- Inline custom properties may transport those computed values; they may not
  contain a raw color, type, spacing, border, radius, shadow, layer, or motion
  decision.

Keep exceptions local to computed geometry. A static value that could be a
token is not an exception. Mark a script mutation with an adjacent
`ui-contract-exception data-driven-geometry: <reason>` comment, or an Astro
inline custom property with `data-ui-geometry-exception="<reason>"`. Validator
accepts only documented dynamic geometry properties; marker cannot bypass
color, typography, spacing, or other guardrails.
Unique local container thresholds use an adjacent
`ui-contract-exception component-geometry: <reason>` comment.

## Adding a role

1. Confirm an existing semantic role cannot express the need and identify at
   least two consumers, unless the value is a platform-level technical token.
2. Name the role for meaning, not its current value or one component.
3. Add the raw value once in `tokens.css`, including the dark-theme value only
   when semantics require it.
4. Migrate consumers to the role and add or update rendered contract coverage.
5. Run `pnpm validate`, `pnpm test:contract`, `pnpm test:browser`, and for a
   final UI cutover `pnpm test:browser:cross-browser`.

`pnpm validate` runs the value-based repository contract. It rejects raw
colors, typography, weights, spacing, sizes, borders, radii, shadows, layers,
motion, undeclared breakpoints, and undocumented inline presentation. Errors
name the source, property, offending value, and required contract. It uses no
file fingerprints or legacy allowlists.
