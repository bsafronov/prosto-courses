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

const idPart = (id: string, index: number) => id.split("/")[index];

export const moduleCourseSlug = (module: ModuleEntry) => idPart(module.id, 0);
export const moduleSlug = (module: ModuleEntry) => idPart(module.id, 1);
export const lessonCourseSlug = (lesson: LessonEntry) => idPart(lesson.id, 0);
export const lessonModuleSlug = (lesson: LessonEntry) => idPart(lesson.id, 1);
export const lessonSlug = (lesson: LessonEntry) => idPart(lesson.id, 2);
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
