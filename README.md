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

## Deployment

GitHub Actions publishes the static site to GitHub Pages at
`https://bsafronov.github.io/prosto-courses/`. Pull requests and manual runs
from other branches validate, test, and build the site, but only `main` uploads
and deploys the Pages artifact.

The workflow installs the lockfile with pnpm's frozen mode, validates the
Authoring Agent contract, runs browser behavior against a production build at
the `/prosto-courses` repository base path, and creates `dist`. The same `dist`
directory is then uploaded without rebuilding or adding a server adapter.

Repository settings must use **GitHub Actions** as the Pages source. Course
authors do not need deployment-specific files or steps; merged content follows
the same validation and deployment pipeline as platform changes.
