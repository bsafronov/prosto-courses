import {
  completionActionCopy,
  courseActionCopy,
  lessonStatusAriaLabel,
  lessonStatusCopy,
  type LessonState,
} from "../lib/ui-copy";

type StoredLesson = { state: Exclude<LessonState, "not-started">; visitedAt: number };
type StoredCourse = { lessons: Record<string, StoredLesson>; lastIncomplete?: string };
type StoredProgress = { courses: Record<string, StoredCourse> };

const storageKey = "prosto-courses:progress:v1";

function readProgress(): StoredProgress {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (value?.courses && typeof value.courses === "object") return value;
  } catch {
    // Invalid browser-local data is ignored rather than breaking navigation.
  }
  return { courses: {} };
}

function writeProgress(progress: StoredProgress) {
  localStorage.setItem(storageKey, JSON.stringify(progress));
}

function ensureCourse(progress: StoredProgress, courseSlug: string): StoredCourse {
  return (progress.courses[courseSlug] ??= { lessons: {} });
}

function nextVisitedAt(course: StoredCourse) {
  const latest = Math.max(
    0,
    ...Object.values(course.lessons).map((lesson) => lesson.visitedAt),
  );
  return Math.max(Date.now(), latest + 1);
}

function paintStatus(root: ParentNode, lessonSlug: string, state: LessonState) {
  const copy = lessonStatusCopy[state];
  root
    .querySelectorAll<HTMLElement>(`[data-progress-status][data-lesson-slug="${CSS.escape(lessonSlug)}"]`)
    .forEach((status) => {
      status.dataset.state = state;
      status.setAttribute("aria-label", lessonStatusAriaLabel(copy.label));
      const icon = status.querySelector<HTMLElement>("[data-status-icon]");
      const label = status.querySelector<HTMLElement>("[data-status-label]");
      if (icon) icon.textContent = copy.icon;
      if (label) label.textContent = copy.label;
    });
}

function mostRecentlyVisitedIncomplete(
  course: StoredCourse,
  lessonSlugs: string[],
) {
  return lessonSlugs
    .filter((slug) => course.lessons[slug]?.state === "started")
    .sort(
      (left, right) =>
        course.lessons[right].visitedAt - course.lessons[left].visitedAt,
    )[0];
}

function refresh(root: HTMLElement, course: StoredCourse) {
  const lessons: Array<{ slug: string; href: string }> = JSON.parse(root.dataset.lessons ?? "[]");
  for (const lesson of lessons) {
    paintStatus(root, lesson.slug, course.lessons[lesson.slug]?.state ?? "not-started");
  }

  const currentSlug = root.dataset.currentLesson;
  if (currentSlug) {
    const state = course.lessons[currentSlug]?.state ?? "not-started";
    const toggle = root.querySelector<HTMLButtonElement>("[data-completion-toggle]");
    if (toggle) {
      const completed = state === "completed";
      toggle.setAttribute("aria-pressed", String(completed));
      toggle.textContent = completed
        ? completionActionCopy.reopen
        : completionActionCopy.complete;
    }
  }

  const action = root.querySelector<HTMLAnchorElement>("[data-course-action]");
  if (!action || lessons.length === 0) return;
  const started = lessons.filter((lesson) => course.lessons[lesson.slug]);
  const incomplete = lessons.filter((lesson) => course.lessons[lesson.slug]?.state !== "completed");
  if (incomplete.length === 0) {
    action.textContent = courseActionCopy.review;
    action.href = lessons[0].href;
  } else if (started.length === 0) {
    action.textContent = courseActionCopy.start;
    action.href = lessons[0].href;
  } else {
    const recentSlug =
      incomplete.find((lesson) => lesson.slug === course.lastIncomplete)?.slug ??
      mostRecentlyVisitedIncomplete(
        course,
        incomplete.map((lesson) => lesson.slug),
      );
    const recent = incomplete.find((lesson) => lesson.slug === recentSlug);
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
  const currentSlug = root.dataset.currentLesson;

  if (currentSlug && course.lessons[currentSlug]?.state !== "completed") {
    course.lessons[currentSlug] = {
      state: "started",
      visitedAt: nextVisitedAt(course),
    };
    course.lastIncomplete = currentSlug;
    writeProgress(progress);
  }
  refresh(root, course);

  function refreshFromStorage() {
    progress = readProgress();
    course = ensureCourse(progress, courseSlug);
    refresh(root, course);
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey) return;
    refreshFromStorage();
  });

  window.addEventListener("pageshow", (event) => {
    if (event.persisted) refreshFromStorage();
  });

  root.querySelector<HTMLButtonElement>("[data-completion-toggle]")?.addEventListener("click", () => {
    if (!currentSlug) return;
    const completed = course.lessons[currentSlug]?.state === "completed";
    course.lessons[currentSlug] = {
      state: completed ? "started" : "completed",
      visitedAt: nextVisitedAt(course),
    };
    if (completed) course.lastIncomplete = currentSlug;
    else {
      const lessonSlugs: string[] = JSON.parse(root.dataset.lessons ?? "[]").map(
        (lesson: { slug: string }) => lesson.slug,
      );
      course.lastIncomplete = mostRecentlyVisitedIncomplete(course, lessonSlugs);
    }
    writeProgress(progress);
    refresh(root, course);
  });
}

document.querySelectorAll<HTMLElement>("[data-progress-root]").forEach(initialiseProgress);
