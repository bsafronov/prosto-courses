import {
  completionControlCopy,
  courseActionCopy,
  courseStatusCopy,
  progressStatusAriaLabel,
  progressStatusCopy,
  reopenActionCopy,
  type ProgressState,
} from "../lib/ui-copy";
import type { CoreDestinationLink } from "../lib/courses";

type StoredDestination = {
  state: Exclude<ProgressState, "not-started">;
  visitedAt: number;
};
type StoredCourse = {
  destinations: Record<string, StoredDestination>;
  lastIncomplete?: string;
};
type StoredProgress = { courses: Record<string, StoredCourse> };

const storageKey = "prosto-courses:progress:v1";

const emptyRecord = <Value>() =>
  Object.create(null) as Record<string, Value>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function storedDestination(value: unknown): StoredDestination | undefined {
  if (!isRecord(value)) return;
  if (value.state !== "started" && value.state !== "completed") return;
  if (
    typeof value.visitedAt !== "number" ||
    !Number.isFinite(value.visitedAt) ||
    value.visitedAt < 0
  ) return;
  return { state: value.state, visitedAt: value.visitedAt };
}

function readProgress(): StoredProgress {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    );
    if (!isRecord(value) || !isRecord(value.courses)) {
      return { courses: emptyRecord() };
    }

    const courses = emptyRecord<StoredCourse>();
    for (const [courseSlug, candidateCourse] of Object.entries(value.courses)) {
      if (!isRecord(candidateCourse)) continue;
      const destinations = emptyRecord<StoredDestination>();

      if (isRecord(candidateCourse.destinations)) {
        for (const [id, candidateDestination] of Object.entries(
          candidateCourse.destinations,
        )) {
          const destination = storedDestination(candidateDestination);
          if (destination) destinations[id] = destination;
        }
      }

      // Migrate the Lesson-only v1 shape without discarding durable progress.
      if (isRecord(candidateCourse.lessons)) {
        for (const [lessonSlug, candidateLesson] of Object.entries(
          candidateCourse.lessons,
        )) {
          const destination = storedDestination(candidateLesson);
          const id = `lesson:${lessonSlug}`;
          if (destination && !destinations[id]) destinations[id] = destination;
        }
      }

      const candidateLastIncomplete = candidateCourse.lastIncomplete;
      const migratedLastIncomplete =
        typeof candidateLastIncomplete === "string" &&
        destinations[`lesson:${candidateLastIncomplete}`]
          ? `lesson:${candidateLastIncomplete}`
          : candidateLastIncomplete;
      courses[courseSlug] = {
        destinations,
        ...(typeof migratedLastIncomplete === "string" &&
        destinations[migratedLastIncomplete]
          ? { lastIncomplete: migratedLastIncomplete }
          : {}),
      };
    }
    return { courses };
  } catch {
    // Invalid browser-local data is ignored rather than breaking navigation.
  }
  return { courses: emptyRecord() };
}

function writeProgress(progress: StoredProgress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Progress controls remain usable when browser storage is unavailable.
  }
}

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
        typeof destination.href === "string",
    );
  } catch {
    return [];
  }
}

function refresh(root: HTMLElement, course: StoredCourse) {
  const destinations = coreDestinations(root);
  for (const destination of destinations) {
    paintStatus(
      root,
      destination,
      course.destinations[destination.id]?.state ?? "not-started",
    );
  }

  const currentId = root.dataset.currentDestination;
  const current = destinations.find(
    (destination) => destination.id === currentId,
  );
  if (current) {
    const state =
      course.destinations[current.id]?.state ?? "not-started";
    const toggle = root.querySelector<HTMLButtonElement>("[data-completion-toggle]");
    if (toggle) {
      const completed = state === "completed";
      toggle.setAttribute("aria-pressed", String(completed));
      toggle.textContent = completed
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
  const courseState: ProgressState =
    destinations.length > 0 && completedCount === destinations.length
      ? "completed"
      : relevantProgress.length > 0
        ? "started"
        : "not-started";
  const courseProgress = root.querySelector<HTMLElement>(
    "[data-course-progress]",
  );
  if (courseProgress) {
    courseProgress.dataset.state = courseState;
    courseProgress.textContent =
      `Статус курса: ${courseStatusCopy[courseState]}`;
  }

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
    const recentId =
      incomplete.find(
        (destination) => destination.id === course.lastIncomplete,
      )?.id ?? mostRecentlyVisitedIncomplete(course, incomplete);
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
    if (!current || course.destinations[current.id]?.state === "completed") {
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
    course.destinations[current.id] = {
      state: completed ? "started" : "completed",
      visitedAt: nextVisitedAt(course),
    };
    course.lastIncomplete = completed
      ? current.id
      : mostRecentlyVisitedIncomplete(course, destinations);
    writeProgress(progress);
    refresh(root, course);
  });
}

document.querySelectorAll<HTMLElement>("[data-progress-root]").forEach(initialiseProgress);
