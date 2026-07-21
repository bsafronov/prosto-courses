import { getCollection, type CollectionEntry } from "astro:content";

export type CourseEntry = CollectionEntry<"courses">;
export type LessonEntry = CollectionEntry<"lessons">;
export type LessonLink = { slug: string; href: string };

export function lessonCourseSlug(lesson: LessonEntry) {
  return lesson.id.split("/")[0];
}

export function lessonSlug(lesson: LessonEntry) {
  return lesson.id.split("/")[1];
}

export async function getCourses() {
  return (await getCollection("courses")).sort((left, right) =>
    left.data.title.localeCompare(right.data.title),
  );
}

export async function getLessons(courseSlug: string) {
  return (await getCollection("lessons"))
    .filter((lesson) => lessonCourseSlug(lesson) === courseSlug)
    .sort((left, right) => left.data.order - right.data.order);
}

export function sitePath(relativePath = "") {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const path = relativePath.replace(/^\//, "");
  return path ? `${base}/${path}` : `${base}/`;
}

export const coursePath = (courseSlug: string) =>
  sitePath(`courses/${courseSlug}/`);

export const lessonPath = (courseSlug: string, lessonSlug: string) =>
  sitePath(`courses/${courseSlug}/lessons/${lessonSlug}/`);

export function getLessonLinks(
  courseSlug: string,
  lessons: LessonEntry[],
): LessonLink[] {
  return lessons.map((lesson) => ({
    slug: lessonSlug(lesson),
    href: lessonPath(courseSlug, lessonSlug(lesson)),
  }));
}
