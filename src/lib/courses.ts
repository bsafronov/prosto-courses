import { getCollection, type CollectionEntry } from "astro:content";

export type CourseEntry = CollectionEntry<"courses">;
export type ModuleEntry = CollectionEntry<"modules">;
export type LessonEntry = CollectionEntry<"lessons">;
export type CheckpointEntry = CollectionEntry<"checkpoints">;
export type CapstoneEntry = CollectionEntry<"capstones">;
export type LessonLink = { slug: string; href: string };
export type CourseModule = {
  module: ModuleEntry;
  lessons: LessonEntry[];
  checkpoint: CheckpointEntry;
};
export type CourseTree = {
  modules: CourseModule[];
  capstone: CapstoneEntry;
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
  formatRussianCount(count, ["Модуль", "Модуля", "Модулей"]);

export const formatLessonCount = (count: number) =>
  formatRussianCount(count, ["Урок", "Урока", "Уроков"]);

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

export function getLessonLinks(
  courseSlug: string,
  lessons: LessonEntry[],
): LessonLink[] {
  return lessons.map((lesson) => ({
    slug: lessonSlug(lesson),
    href: lessonPath(courseSlug, lessonSlug(lesson)),
  }));
}
