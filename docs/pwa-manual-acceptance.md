# PWA manual acceptance

Run these checks against the deployed HTTPS production release after changing
PWA dependencies, the manifest, icons, the global control, or service-worker
configuration. Automated Chrome coverage remains the release gate; these checks
cover native Safari installation surfaces that Playwright cannot automate.

## Safari on iPhone and iPad

1. Open the Course Catalog online and wait until `Подготовка офлайн`
   disappears and only `Установить` remains.
2. Select `Установить`. Confirm the control shows **Share → Add to Home
   Screen**, then select `Установить` again and confirm the guidance collapses.
3. Use **Share → Add to Home Screen** and confirm the `P.` icon and
   `Prosto.Courses` identity are legible.
4. Launch the saved application. Confirm it opens at the Course Catalog in
   standalone display and no installation action remains in the global control.
5. Follow internal links and confirm they remain in the installed application.
6. Open an External Reference and confirm Safari opens it separately.
7. Enable airplane mode, relaunch, and complete a Knowledge Check, update Lesson
   Progress, and write a Reflection.

On iPadOS versions that report a desktop-style user agent, also confirm the
manual action still says **Share → Add to Home Screen**, not **Add to Dock**.

## Safari on macOS

1. Open the Course Catalog online and wait until `Подготовка офлайн`
   disappears and only `Установить` remains.
2. Select `Установить`. Confirm the control shows **File → Add to Dock**, then
   select `Установить` again and confirm the guidance collapses.
3. Use **File → Add to Dock** and confirm the `P.` icon and application identity.
4. Launch from the Dock. Confirm standalone display, the Course Catalog start
   destination, in-scope internal navigation, and separately opened External
   References.
5. Disconnect networking and confirm the complete saved Course Catalog and
   browser-local learner data remain usable.

## Integration compatibility note

`@vite-pwa/astro` 1.2.0 is the current upstream release, but its published peer
metadata stops at Astro 5. This repository currently runs Astro 7, so
`pnpm-workspace.yaml` carries a narrow, explicit peer exception. The production
build and two-release PWA browser suite are required evidence for this
combination until upstream publishes Astro 7 support. Do not broaden the
exception or upgrade either dependency without rerunning this checklist and the
full automated suite.
