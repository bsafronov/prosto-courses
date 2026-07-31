---
status: accepted
---

# Use plain CSS for the global UI system

Prosto.Courses will centralize visual values in native CSS custom properties and reuse presentation through global layout primitives and Astro components instead of Tailwind CSS. Repeated component anatomy belongs to a shared component, unique composition may remain scoped while consuming system tokens, and repository validation prevents new raw visual values; this supersedes ADR-0008 because plain CSS preserves Astro's component model without a utility build dependency or atomic migration.
