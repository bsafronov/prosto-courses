# Prosto.Courses

A static, serverless course platform built with Astro and MDX. Courses are authored as content-only directories; the platform supplies the Course Catalog, layouts, navigation, browser-local Lesson Progress, and Knowledge Checks.

## Local development

Requires Node.js and pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Useful checks:

```sh
pnpm validate       # Authoring contract and Astro type checks
pnpm test           # Authoring fixtures and production-output browser tests
pnpm build          # Exact static production build
```

See [the Authoring Agent guide](docs/authoring.md) to add a Course.
