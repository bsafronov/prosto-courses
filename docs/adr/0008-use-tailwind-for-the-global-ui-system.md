---
status: superseded by ADR-0009
---

# Use Tailwind for the global UI system

Prosto.Courses will replace local component-level visual scales with Tailwind CSS v4 as the sole design-token and utility build system. The theme exposes a deliberately closed set of semantic typography, color, spacing, radius, border, shadow, breakpoint, measure, and control roles; custom component CSS may implement complex selectors but must consume these tokens instead of inventing values. We chose this over continuing scoped CSS or layering Tailwind alongside it to make UI changes global and repeatable, accepting an atomic migration and a build-time dependency; `@tailwindcss/typography` is excluded because the platform controls its MDX and a second typography layer would add maintenance.
