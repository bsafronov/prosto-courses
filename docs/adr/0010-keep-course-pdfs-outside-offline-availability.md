---
status: accepted
---

# Keep Course PDFs outside Offline Availability

A Course PDF is a build-generated public export, not an Offline Course or an asset covered by Offline Availability. It is downloaded only after explicit learner action and excluded from PWA precache, so optional print artifacts do not consume the atomic Course Catalog release budget; this narrows ADR-0007 for Course PDFs without otherwise changing the current catalog-wide precache.
