---
status: accepted
---

# Precache complete Course Catalog releases

The static platform uses the Astro Vite PWA integration and a Workbox-generated service worker to precache every platform-owned learner-facing page and asset as one Course Catalog release. A failed initial precache never claims Offline Availability, a failed Catalog Update leaves the prior complete release active, and a prepared update activates only after learner confirmation; once prepared, it can also be accepted without a network connection. This deliberately favors a trustworthy whole-catalog offline guarantee over smaller on-demand Course downloads as the catalog grows. CI rejects a release above 25 MiB in total or containing an individual precached file above 5 MiB, making growth pressure explicit before deployment. Precache begins automatically after the first online visit unless the browser reports a data-saving preference, in which case the learner sees the release size and starts preparation explicitly. The platform checks for Catalog Updates when it starts and when connectivity returns, without polling during a learning session. Accepting an update activates it atomically and returns the learner to the Course Catalog instead of assuming the current route still exists.
