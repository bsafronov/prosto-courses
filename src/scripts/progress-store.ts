import type { ProgressState } from "../lib/ui-copy";

export type StoredDestination = {
  state: Exclude<ProgressState, "not-started">;
  visitedAt: number;
  completedRevision?: number;
};

export type StoredCourse = {
  destinations: Record<string, StoredDestination>;
  lastIncomplete?: string;
};

export type StoredProgress = {
  courses: Record<string, StoredCourse>;
};

export const progressStorageKey = "prosto-courses:progress:v1";

export const emptyRecord = <Value>() =>
  Object.create(null) as Record<string, Value>;

export function isRecord(value: unknown): value is Record<string, unknown> {
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
  const completedRevision =
    value.state === "completed" &&
    typeof value.completedRevision === "number" &&
    Number.isInteger(value.completedRevision) &&
    value.completedRevision > 0
      ? value.completedRevision
      : undefined;
  return {
    state: value.state,
    visitedAt: value.visitedAt,
    ...(completedRevision ? { completedRevision } : {}),
  };
}

export function readProgress(): StoredProgress {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(progressStorageKey) ?? "null",
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
    return { courses: emptyRecord() };
  }
}

export function writeProgress(progress: StoredProgress) {
  try {
    localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  } catch {
    // Progress controls remain usable when browser storage is unavailable.
  }
}
