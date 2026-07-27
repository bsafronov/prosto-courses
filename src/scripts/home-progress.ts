import {
  progressStorageKey as storageKey,
  readProgress,
  type StoredDestination,
} from "./progress-store";
import type {
  HomeCatalogCourse,
  HomeCatalogDestination,
} from "../lib/home-catalog";

function setText(root: ParentNode, selector: string, value: string) {
  const element = root.querySelector<HTMLElement>(selector);
  if (element) element.textContent = value;
}

function refreshHome(root: HTMLElement) {
  let catalog: HomeCatalogCourse[] = [];
  try {
    const value: unknown = JSON.parse(root.dataset.courseCatalog ?? "[]");
    if (Array.isArray(value)) catalog = value as HomeCatalogCourse[];
  } catch {
    // The static Course Catalog remains available if enhancement data is invalid.
  }

  const progress = readProgress();
  const resumeCandidates: Array<{
    course: HomeCatalogCourse;
    destination: HomeCatalogDestination;
    stored: StoredDestination;
    position: number;
    completed: number;
  }> = [];

  for (const course of catalog) {
    const storedDestinations =
      progress.courses?.[course.id]?.destinations ?? {};
    const completed = course.destinations.filter(
      ({ id }) => storedDestinations[id]?.state === "completed",
    ).length;
    const hasProgress = course.destinations.some(
      ({ id }) => storedDestinations[id] !== undefined,
    );
    const courseRow = root.querySelector<HTMLElement>(
      `[data-catalog-course="${CSS.escape(course.id)}"]`,
    );
    if (courseRow) {
      setText(
        courseRow,
        "[data-catalog-progress]",
        completed === course.destinations.length
          ? `✓ Курс завершён · ${completed} из ${course.destinations.length} завершено`
          : hasProgress
            ? `${completed} из ${course.destinations.length} завершено`
            : "Не начат",
      );
      courseRow
        .querySelectorAll<HTMLElement>("[data-compact-destination]")
        .forEach((node) => {
          const id = node.dataset.destinationId ?? "";
          const stored = storedDestinations[id];
          const state = stored?.state ?? "not-started";
          const destination = course.destinations.find(
            (destination) => destination.id === id,
          );
          const kind = destination?.kind;
          const revision = destination?.revision;
          const revisit =
            state === "completed" &&
            kind === "lesson" &&
            typeof stored.completedRevision === "number" &&
            typeof revision === "number" &&
            revision > stored.completedRevision;
          node.dataset.state = state;
          node.dataset.revisit = String(revisit);
          node.textContent =
            revisit
              ? "↻"
              : state === "completed"
              ? "✓"
              : state === "started"
                ? kind === "lesson"
                  ? "●"
                  : kind === "checkpoint"
                    ? "◈"
                    : "▣"
                : kind === "checkpoint"
                  ? "◆"
                  : kind === "capstone"
                    ? "■"
                    : "○";
        });
      course.destinations.forEach((destination) => {
        const stored = storedDestinations[destination.id];
        const revisit =
          stored?.state === "completed" &&
          destination.kind === "lesson" &&
          typeof stored.completedRevision === "number" &&
          typeof destination.revision === "number" &&
          destination.revision > stored.completedRevision;
        const status = courseRow.querySelector<HTMLElement>(
          `[data-catalog-destination-status][data-destination-id="${CSS.escape(destination.id)}"]`,
        );
        if (status) {
          status.textContent = revisit
            ? "Завершено · материал обновлён — повтори"
            : stored?.state === "completed"
              ? "Завершено"
              : stored?.state === "started"
                ? "В процессе"
                : "Не начато";
        }
      });
    }

    course.destinations.forEach((destination, index) => {
      const stored = storedDestinations[destination.id];
      if (stored?.state !== "started" || !Number.isFinite(stored.visitedAt)) {
        return;
      }
      resumeCandidates.push({
        course,
        destination,
        stored,
        position: index + 1,
        completed,
      });
    });
  }

  const resume = resumeCandidates.sort(
    (left, right) => right.stored.visitedAt - left.stored.visitedAt,
  )[0];
  const resumeSection = root.querySelector<HTMLElement>(
    "[data-resume-destination]",
  );
  const noProgress = root.querySelector<HTMLElement>("[data-no-progress]");
  if (!resume) {
    if (resumeSection) resumeSection.hidden = true;
    if (noProgress) noProgress.hidden = false;
    return;
  }

  if (resumeSection) resumeSection.hidden = false;
  if (noProgress) noProgress.hidden = true;
  setText(root, "[data-resume-course]", `Курс: ${resume.course.title}`);
  setText(root, "[data-resume-title]", resume.destination.title);
  setText(root, "[data-resume-capability]", resume.destination.capability);
  const moduleContext = root.querySelector<HTMLElement>(
    "[data-resume-module]",
  );
  if (moduleContext) {
    moduleContext.hidden = !resume.destination.moduleTitle;
    moduleContext.textContent = resume.destination.moduleTitle
      ? `Модуль: ${resume.destination.moduleTitle}`
      : "";
  }
  setText(
    root,
    "[data-resume-position]",
    `Маршрут: ${resume.position} из ${resume.course.destinations.length}`,
  );
  setText(
    root,
    "[data-resume-time]",
    `Время: ${resume.destination.minutes} мин`,
  );
  setText(
    root,
    "[data-resume-progress]",
    `Завершено: ${resume.completed} из ${resume.course.destinations.length}`,
  );

  const action = root.querySelector<HTMLAnchorElement>("[data-resume-link]");
  if (action) {
    const label =
      resume.destination.kind === "lesson"
        ? "Продолжить Урок"
        : resume.destination.kind === "checkpoint"
          ? "Продолжить проверку"
          : "Продолжить итоговую работу";
    action.href = resume.destination.href;
    action.innerHTML = `${label} <span aria-hidden="true">→</span>`;
  }
}

document.querySelectorAll<HTMLElement>("[data-home-progress]").forEach((root) => {
  refreshHome(root);
  window.addEventListener("storage", (event) => {
    if (event.key === null || event.key === storageKey) refreshHome(root);
  });
  window.addEventListener("pageshow", () => refreshHome(root));
});
