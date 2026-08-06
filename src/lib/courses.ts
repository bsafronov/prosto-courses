import { getCollection, type CollectionEntry } from "astro:content";

export type CourseEntry = CollectionEntry<"courses">;
export type ModuleEntry = CollectionEntry<"modules">;
export type LessonEntry = CollectionEntry<"lessons">;
export type CheckpointEntry = CollectionEntry<"checkpoints">;
export type CapstoneEntry = CollectionEntry<"capstones">;
export type CoreDestinationKind = "lesson" | "checkpoint" | "capstone";
export type CoreDestinationRef =
  | { id: string; kind: "lesson" }
  | { id: string; kind: "checkpoint" }
  | { id: "capstone:capstone"; kind: "capstone" };
export type CoreDestinationLink =
  | (Extract<CoreDestinationRef, { kind: "lesson" }> & {
      href: string;
      revision: number;
    })
  | (Exclude<CoreDestinationRef, { kind: "lesson" }> & {
      href: string;
    });
export type CoreRouteContext = {
  destinations: CoreDestinationLink[];
  current: CoreDestinationLink;
};
export type CourseModule = {
  module: ModuleEntry;
  lessons: LessonEntry[];
  checkpoint: CheckpointEntry;
};
export type CourseTree = {
  modules: CourseModule[];
  capstone: CapstoneEntry;
};
type ContentFreshness = CourseEntry["data"]["freshness"];
export type ContentFreshnessState = {
  status: "stable" | "current" | "stale";
  freshness: ContentFreshness;
};

export const lessonMinutes = (lesson: LessonEntry) =>
  lesson.data.time.study +
  lesson.data.time.practice +
  (lesson.data.time.advanced ?? 0);

export const moduleMinutes = (courseModule: CourseModule) =>
  courseModule.lessons.reduce(
    (total, lesson) => total + lessonMinutes(lesson),
    courseModule.checkpoint.data.time,
  );

export const courseMinutes = (tree: CourseTree) =>
  tree.modules.reduce(
    (total, courseModule) => total + moduleMinutes(courseModule),
    tree.capstone.data.time,
  );

function contentValidationDate() {
  const injected = process.env.CONTENT_VALIDATION_DATE;
  const calendarDate = injected ?? new Date().toISOString().slice(0, 10);
  return new Date(`${calendarDate}T00:00:00.000Z`);
}

function aggregateFreshness(
  applicableFreshness: ContentFreshness[],
): ContentFreshnessState {
  const timeSensitive = applicableFreshness
    .filter(
      (
        freshness,
      ): freshness is Extract<
        ContentFreshness,
        { mode: "time-sensitive" }
      > => freshness.mode === "time-sensitive",
    )
    .sort(
      (left, right) =>
        left.reviewAfter.valueOf() - right.reviewAfter.valueOf(),
    );
  const controllingFreshness = timeSensitive[0];
  if (!controllingFreshness) {
    return { status: "stable", freshness: applicableFreshness[0] };
  }
  return {
    status:
      contentValidationDate() > controllingFreshness.reviewAfter
        ? "stale"
        : "current",
    freshness: controllingFreshness,
  };
}

export function moduleFreshnessState(
  course: CourseEntry,
  courseModule: CourseModule,
) {
  return aggregateFreshness(
    courseModule.lessons.map(
      (lesson) => lesson.data.freshness ?? course.data.freshness,
    ),
  );
}

export function courseFreshnessState(
  course: CourseEntry,
  tree: CourseTree,
) {
  return aggregateFreshness([
    course.data.freshness,
    ...tree.modules.map(
      (courseModule) =>
        moduleFreshnessState(course, courseModule).freshness,
    ),
  ]);
}

export function formatFreshnessDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return [
    hours > 0 ? `${hours} ч` : "",
    remainder > 0 ? `${remainder} мин` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function formatRussianCount(
  count: number,
  forms: [one: string, few: string, many: string],
) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  const form =
    lastTwoDigits >= 11 && lastTwoDigits <= 14
      ? forms[2]
      : lastDigit === 1
        ? forms[0]
        : lastDigit >= 2 && lastDigit <= 4
          ? forms[1]
          : forms[2];
  return `${count} ${form}`;
}

export const formatModuleCount = (count: number) =>
  formatRussianCount(count, ["модуль", "модуля", "модулей"]);

export const formatLessonCount = (count: number) =>
  formatRussianCount(count, ["урок", "урока", "уроков"]);

export function getModuleOutcomes(course: CourseEntry, module: ModuleEntry) {
  const outcomesById = new Map(
    course.data.outcomes.map((outcome) => [outcome.id, outcome]),
  );
  return module.data.outcomes.map((outcomeId) => {
    const outcome = outcomesById.get(outcomeId);
    if (!outcome) {
      throw new Error(
        `Module ${module.id} references unknown Learning Outcome ${outcomeId}`,
      );
    }
    return outcome;
  });
}

const idPart = (id: string, index: number) => id.split("/")[index];

export const moduleCourseSlug = (module: ModuleEntry) => idPart(module.id, 0);
export const moduleSlug = (module: ModuleEntry) => idPart(module.id, 1);
export const lessonCourseSlug = (lesson: LessonEntry) => idPart(lesson.id, 0);
export const lessonSlug = (lesson: LessonEntry) => idPart(lesson.id, 1);
export function lessonModuleSlug(lesson: LessonEntry) {
  const normalizedPath = lesson.filePath?.replaceAll("\\", "/") ?? "";
  const match = normalizedPath.match(
    /(?:^|\/)modules\/([^/]+)\/lessons\/[^/]+\.mdx$/,
  );
  if (!match) throw new Error(`Lesson ${lesson.id} has no Module-owned source path`);
  return match[1];
}
export const checkpointCourseSlug = (checkpoint: CheckpointEntry) =>
  idPart(checkpoint.id, 0);
export const checkpointModuleSlug = (checkpoint: CheckpointEntry) =>
  idPart(checkpoint.id, 1);

export async function getCourses() {
  return (await getCollection("courses")).sort((left, right) =>
    left.data.title.localeCompare(right.data.title),
  );
}

export async function getCourseTree(courseSlug: string): Promise<CourseTree> {
  const [allModules, allLessons, allCheckpoints, allCapstones] =
    await Promise.all([
      getCollection("modules"),
      getCollection("lessons"),
      getCollection("checkpoints"),
      getCollection("capstones"),
    ]);
  const modules = allModules
    .filter((module) => moduleCourseSlug(module) === courseSlug)
    .sort((left, right) => left.data.order - right.data.order)
    .map((module) => {
      const slug = moduleSlug(module);
      const checkpoint = allCheckpoints.find(
        (candidate) =>
          checkpointCourseSlug(candidate) === courseSlug &&
          checkpointModuleSlug(candidate) === slug,
      );
      if (!checkpoint) {
        throw new Error(`Module ${courseSlug}/${slug} has no Module Checkpoint`);
      }
      return {
        module,
        lessons: allLessons
          .filter(
            (lesson) =>
              lessonCourseSlug(lesson) === courseSlug &&
              lessonModuleSlug(lesson) === slug,
          )
          .sort((left, right) => left.data.order - right.data.order),
        checkpoint,
      };
    });
  const capstone = allCapstones.find((entry) => entry.id === courseSlug);
  if (!capstone) throw new Error(`Course ${courseSlug} has no Capstone Demonstration`);
  return { modules, capstone };
}

export async function getLessons(courseSlug: string) {
  const tree = await getCourseTree(courseSlug);
  return tree.modules.flatMap((module) => module.lessons);
}

export function sitePath(relativePath = "") {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = relativePath.replace(/^\//, "");
  return path ? `${base}/${path}` : `${base}/`;
}

export const coursePath = (courseSlug: string) =>
  sitePath(`courses/${courseSlug}/`);

export const modulePath = (courseSlug: string, moduleSlug: string) =>
  sitePath(`courses/${courseSlug}/modules/${moduleSlug}/`);

export const lessonPath = (courseSlug: string, lessonSlug: string) =>
  sitePath(`courses/${courseSlug}/lessons/${lessonSlug}/`);

export const checkpointPath = (courseSlug: string, moduleSlug: string) =>
  sitePath(`courses/${courseSlug}/modules/${moduleSlug}/checkpoint/`);

export const capstonePath = (courseSlug: string) =>
  sitePath(`courses/${courseSlug}/capstone/`);

const coreDestination = <Kind extends CoreDestinationKind>(
  kind: Kind,
  slug: string,
) => ({
  id: `${kind}:${slug}`,
  kind,
});

export const lessonDestination = (
  lessonSlug: string,
): Extract<CoreDestinationRef, { kind: "lesson" }> =>
  coreDestination("lesson", lessonSlug);

export const checkpointDestination = (
  moduleSlug: string,
): Extract<CoreDestinationRef, { kind: "checkpoint" }> =>
  coreDestination("checkpoint", moduleSlug);

export const capstoneDestination = (): Extract<
  CoreDestinationRef,
  { kind: "capstone" }
> => ({
  id: "capstone:capstone",
  kind: "capstone",
});

export const lessonDestinationLink = (
  courseSlug: string,
  lesson: LessonEntry,
): CoreDestinationLink => ({
  ...lessonDestination(lessonSlug(lesson)),
  href: lessonPath(courseSlug, lessonSlug(lesson)),
  revision: lesson.data.revision,
});

export const checkpointDestinationLink = (
  courseSlug: string,
  moduleSlug: string,
): CoreDestinationLink => ({
  ...checkpointDestination(moduleSlug),
  href: checkpointPath(courseSlug, moduleSlug),
});

export const capstoneDestinationLink = (
  courseSlug: string,
): CoreDestinationLink => ({
  ...capstoneDestination(),
  href: capstonePath(courseSlug),
});

export function getCoreDestinationLinks(
  courseSlug: string,
  tree: CourseTree,
): CoreDestinationLink[] {
  return [
    ...tree.modules.flatMap((courseModule) => {
      const checkpointSlug = moduleSlug(courseModule.module);
      return [
        ...courseModule.lessons.map((lesson) =>
          lessonDestinationLink(courseSlug, lesson)),
        checkpointDestinationLink(courseSlug, checkpointSlug),
      ];
    }),
    capstoneDestinationLink(courseSlug),
  ];
}

export function getCoreRouteContext(
  courseSlug: string,
  tree: CourseTree,
  ref: CoreDestinationRef,
): CoreRouteContext {
  const destinations = getCoreDestinationLinks(courseSlug, tree);
  const current = destinations.find(
    (destination) => destination.id === ref.id,
  );
  if (!current) {
    throw new Error(
      `Course ${courseSlug} has no ${ref.kind} destination ${ref.id}`,
    );
  }
  return { destinations, current };
}
