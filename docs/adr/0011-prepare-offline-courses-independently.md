---
status: proposed
---

# Prepare Offline Courses independently

The platform should keep its shell and lightweight Course Catalog offline while letting the learner explicitly prepare each complete Offline Course instead of precaching all Course content. Downloads and updates remain atomic, updates retain at most one active and one prepared release and activate only after learner confirmation, nothing is silently evicted, removing an Offline Course preserves learner state, and a Withdrawn Course remains until manually removed. Once implemented, this decision supersedes ADR-0007; until then, catalog-wide precaching remains in force except for Course PDFs under ADR-0010.
