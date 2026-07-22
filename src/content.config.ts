import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import {
  assessmentSchema,
  capstoneSchema,
  courseSchema,
  lessonSchema,
  moduleSchema,
} from "./content-schemas.mjs";

const base = process.env.COURSE_CONTENT_ROOT ?? "./src/content/courses";

const courses = defineCollection({
  loader: glob({
    base,
    pattern: "*/index.mdx",
    generateId: ({ entry }) => entry.split("/")[0],
  }),
  schema: courseSchema,
});

const modules = defineCollection({
  loader: glob({
    base,
    pattern: "*/modules/*/index.mdx",
    generateId: ({ entry }) => {
      const [courseSlug, , moduleSlug] = entry.split("/");
      return `${courseSlug}/${moduleSlug}`;
    },
  }),
  schema: moduleSchema,
});

const lessons = defineCollection({
  loader: glob({
    base,
    pattern: "*/modules/*/lessons/*.mdx",
    generateId: ({ entry }) => {
      const [courseSlug, , , , filename] = entry.split("/");
      return `${courseSlug}/${filename.replace(/\.mdx$/, "")}`;
    },
  }),
  schema: lessonSchema,
});

const checkpoints = defineCollection({
  loader: glob({
    base,
    pattern: "*/modules/*/checkpoint.mdx",
    generateId: ({ entry }) => {
      const [courseSlug, , moduleSlug] = entry.split("/");
      return `${courseSlug}/${moduleSlug}`;
    },
  }),
  schema: assessmentSchema,
});

const capstones = defineCollection({
  loader: glob({
    base,
    pattern: "*/capstone.mdx",
    generateId: ({ entry }) => entry.split("/")[0],
  }),
  schema: capstoneSchema,
});

export const collections = {
  courses,
  modules,
  lessons,
  checkpoints,
  capstones,
};
