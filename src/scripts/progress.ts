import {
  completionControlCopy,
  courseActionCopy,
  lessonRevisionCopy,
  progressStatusAriaLabel,
  progressStatusCopy,
  reopenActionCopy,
  type ProgressState,
} from "../lib/ui-copy";
import type { CoreDestinationLink } from "../lib/courses";
import {
  emptyRecord,
  isRecord,
  progressStorageKey as storageKey,
  readProgress,
  writeProgress,
  type StoredCourse,
  type StoredDestination,
  type StoredProgress,
} from "./progress-store";

const legacyCompletedRevision = 1;

function ensureCourse(progress: StoredProgress, courseSlug: string): StoredCourse {
  return (progress.courses[courseSlug] ??= {
    destinations: emptyRecord(),
  });
}

function nextVisitedAt(course: StoredCourse) {
  const latest = Math.max(
    0,
    ...Object.values(course.destinations).map(
      (destination) => destination.visitedAt,
    ),
  );
  return Math.max(Date.now(), latest + 1);
}

function paintStatus(
  root: ParentNode,
  destination: CoreDestinationLink,
  state: ProgressState,
) {
  const copy = progressStatusCopy[state];
  root
    .querySelectorAll<HTMLElement>(
      `[data-progress-status][data-destination-id="${CSS.escape(destination.id)}"]`,
    )
    .forEach((status) => {
      status.dataset.state = state;
      status.setAttribute(
        "aria-label",
        progressStatusAriaLabel(destination.kind, copy.label),
      );
      const icon = status.querySelector<HTMLElement>("[data-status-icon]");
      const label = status.querySelector<HTMLElement>("[data-status-label]");
      if (icon) icon.textContent = copy.icon;
      if (label) label.textContent = copy.label;
    });
}

function paintRevisionStatus(
  root: ParentNode,
  destination: CoreDestinationLink,
  stored: StoredDestination | undefined,
) {
  if (destination.kind !== "lesson") return;
  const revisedSinceCompletion = wasRevisedSinceCompletion(
    destination,
    stored,
  );
  root
    .querySelectorAll<HTMLElement>(
      `[data-revision-status][data-destination-id="${CSS.escape(destination.id)}"]`,
    )
    .forEach((status) => {
      status.hidden = !revisedSinceCompletion;
    });
  root
    .querySelectorAll<HTMLElement>(
      `[data-revision-revisit][data-destination-id="${CSS.escape(destination.id)}"]`,
    )
    .forEach((action) => {
      action.hidden = !revisedSinceCompletion;
    });
  root
    .querySelectorAll<HTMLAnchorElement>(
      `[data-lesson-link][data-destination-id="${CSS.escape(destination.id)}"]`,
    )
    .forEach((link) => {
      const title = link.dataset.lessonTitle;
      if (revisedSinceCompletion && title) {
        link.setAttribute(
          "aria-label",
          `${lessonRevisionCopy.revisit}: ${title}`,
        );
      } else {
        link.removeAttribute("aria-label");
      }
    });
}

function wasRevisedSinceCompletion(
  destination: CoreDestinationLink,
  stored: StoredDestination | undefined,
) {
  return (
    destination.kind === "lesson" &&
    stored?.state === "completed" &&
    stored.completedRevision !== undefined &&
    destination.revision > stored.completedRevision
  );
}

function mostRecentlyVisitedIncomplete(
  course: StoredCourse,
  destinations: CoreDestinationLink[],
) {
  return destinations
    .filter(
      (destination) =>
        course.destinations[destination.id]?.state === "started",
    )
    .sort(
      (left, right) =>
        course.destinations[right.id].visitedAt -
        course.destinations[left.id].visitedAt,
    )[0]?.id;
}

function coreDestinations(root: HTMLElement): CoreDestinationLink[] {
  try {
    const value: unknown = JSON.parse(
      root.dataset.coreDestinations ?? "[]",
    );
    if (!Array.isArray(value)) return [];
    return value.filter(
      (destination): destination is CoreDestinationLink =>
        isRecord(destination) &&
        typeof destination.id === "string" &&
        (destination.kind === "lesson" ||
          destination.kind === "checkpoint" ||
          destination.kind === "capstone") &&
        typeof destination.href === "string" &&
        (destination.kind !== "lesson" ||
          (typeof destination.revision === "number" &&
            Number.isInteger(destination.revision) &&
            destination.revision > 0)),
    );
  } catch {
    return [];
  }
}

function migrateLegacyCompletionRevisions(
  course: StoredCourse,
  destinations: CoreDestinationLink[],
) {
  let changed = false;
  for (const destination of destinations) {
    const stored = course.destinations[destination.id];
    if (
      destination.kind === "lesson" &&
      stored?.state === "completed" &&
      stored.completedRevision === undefined
    ) {
      stored.completedRevision = legacyCompletedRevision;
      changed = true;
    }
  }
  return changed;
}

function refresh(root: HTMLElement, course: StoredCourse) {
  const destinations = coreDestinations(root);
  for (const destination of destinations) {
    const stored = course.destinations[destination.id];
    paintStatus(
      root,
      destination,
      stored?.state ?? "not-started",
    );
    paintRevisionStatus(root, destination, stored);
  }

  const currentId = root.dataset.currentDestination;
  const current = destinations.find(
    (destination) => destination.id === currentId,
  );
  if (current) {
    const stored = course.destinations[current.id];
    const state = stored?.state ?? "not-started";
    const revisedSinceCompletion = wasRevisedSinceCompletion(
      current,
      stored,
    );
    const revisionNotice = root.querySelector<HTMLElement>(
      "[data-revision-notice]",
    );
    if (revisionNotice) revisionNotice.hidden = !revisedSinceCompletion;
    const toggle = root.querySelector<HTMLButtonElement>("[data-completion-toggle]");
    if (toggle) {
      const completed = state === "completed";
      toggle.setAttribute("aria-pressed", String(completed));
      toggle.textContent = revisedSinceCompletion
        ? lessonRevisionCopy.complete
        : completed
        ? reopenActionCopy
        : completionControlCopy[current.kind].complete;
    }
  }

  const completedCount = destinations.filter(
    (destination) =>
      course.destinations[destination.id]?.state === "completed",
  ).length;
  const relevantProgress = destinations.filter(
    (destination) => course.destinations[destination.id],
  );
  const courseProgress = root.querySelector<HTMLElement>(
    "[data-course-progress]",
  );
  if (courseProgress) {
    courseProgress.dataset.state =
      completedCount === destinations.length && destinations.length > 0
        ? "completed"
        : relevantProgress.length > 0
          ? "started"
          : "not-started";
    courseProgress.textContent =
      completedCount === destinations.length && destinations.length > 0
        ? `✓ Курс завершён · ${completedCount} из ${destinations.length} завершено`
        : `${completedCount} из ${destinations.length} завершено`;
  }
  root
    .querySelectorAll<HTMLElement>("[data-course-progress-line]")
    .forEach((line) => {
      line.style.width = destinations.length
        ? `${(completedCount / destinations.length) * 100}%`
        : "0";
    });

  const action = root.querySelector<HTMLAnchorElement>("[data-course-action]");
  if (!action || destinations.length === 0) return;
  const incomplete = destinations.filter(
    (destination) =>
      course.destinations[destination.id]?.state !== "completed",
  );
  if (incomplete.length === 0) {
    action.textContent = courseActionCopy.review;
    action.href = destinations[0].href;
  } else if (relevantProgress.length === 0) {
    action.textContent = courseActionCopy.start;
    action.href = destinations[0].href;
  } else {
    const recentId = mostRecentlyVisitedIncomplete(course, incomplete);
    const recent = incomplete.find(
      (destination) => destination.id === recentId,
    );
    action.textContent = courseActionCopy.continue;
    action.href = (recent ?? incomplete[0]).href;
  }
}

function initialiseProgress(root: HTMLElement) {
  if (root.dataset.progressReady) return;
  root.dataset.progressReady = "true";
  const courseSlug = root.dataset.courseSlug ?? "";
  if (!courseSlug) return;
  let progress = readProgress();
  let course = ensureCourse(progress, courseSlug);
  const destinations = coreDestinations(root);
  const currentId = root.dataset.currentDestination;
  const current = destinations.find(
    (destination) => destination.id === currentId,
  );

  function recordCurrentVisit() {
    progress = readProgress();
    course = ensureCourse(progress, courseSlug);
    const migrated = migrateLegacyCompletionRevisions(
      course,
      destinations,
    );
    if (!current || course.destinations[current.id]?.state === "completed") {
      if (migrated) writeProgress(progress);
      refresh(root, course);
      return;
    }
    course.destinations[current.id] = {
      state: "started",
      visitedAt: nextVisitedAt(course),
    };
    course.lastIncomplete = current.id;
    writeProgress(progress);
    refresh(root, course);
  }

  recordCurrentVisit();

  function refreshFromStorage() {
    progress = readProgress();
    course = ensureCourse(progress, courseSlug);
    if (migrateLegacyCompletionRevisions(course, destinations)) {
      writeProgress(progress);
    }
    refresh(root, course);
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== storageKey) return;
    refreshFromStorage();
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) recordCurrentVisit();
  });

  root.querySelector<HTMLButtonElement>("[data-completion-toggle]")?.addEventListener("click", () => {
    if (!current) return;
    progress = readProgress();
    course = ensureCourse(progress, courseSlug);
    const completed =
      course.destinations[current.id]?.state === "completed";
    const revisedSinceCompletion = wasRevisedSinceCompletion(
      current,
      course.destinations[current.id],
    );
    const nextState =
      completed && !revisedSinceCompletion ? "started" : "completed";
    course.destinations[current.id] = {
      state: nextState,
      visitedAt: nextVisitedAt(course),
      ...(nextState === "completed" && current.kind === "lesson"
        ? { completedRevision: current.revision }
        : {}),
    };
    course.lastIncomplete = completed && !revisedSinceCompletion
      ? current.id
      : mostRecentlyVisitedIncomplete(course, destinations);
    writeProgress(progress);
    refresh(root, course);
  });
}

document.querySelectorAll<HTMLElement>("[data-progress-root]").forEach(initialiseProgress);
