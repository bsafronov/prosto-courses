import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const base = process.env.COURSE_CONTENT_ROOT ?? "./src/content/courses";
const nonEmptyString = z.string().trim().min(1);
const outcomeId = nonEmptyString.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const date = z.coerce.date();
const time = z.object({
  study: z.number().int().nonnegative(),
  practice: z.number().int().nonnegative(),
  advanced: z.number().int().nonnegative().optional(),
}).strict();
const freshness = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("stable"),
    verifiedAt: date,
    jurisdiction: nonEmptyString.optional(),
  }).strict(),
  z.object({
    mode: z.literal("time-sensitive"),
    verifiedAt: date,
    reviewAfter: date,
    jurisdiction: nonEmptyString.optional(),
  }).strict(),
]);

const courses = defineCollection({
  loader: glob({
    base,
    pattern: "*/index.mdx",
    generateId: ({ entry }) => entry.split("/")[0],
  }),
  schema: z.object({
    title: nonEmptyString,
    summary: nonEmptyString,
    learnerProfile: nonEmptyString,
    prerequisites: z.array(nonEmptyString),
    outcomes: z.array(z.object({
      id: outcomeId,
      statement: nonEmptyString,
    }).strict()).min(1),
    createdAt: date,
    capabilityPacks: z.array(nonEmptyString),
    freshness,
  }).strict(),
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
  schema: z.object({
    title: nonEmptyString,
    summary: nonEmptyString,
    order: z.number().int().positive(),
    capability: nonEmptyString,
    outcomes: z.array(outcomeId).min(1),
  }).strict(),
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
  schema: z.object({
    title: nonEmptyString,
    order: z.number().int().positive(),
    revision: z.number().int().positive(),
    capability: nonEmptyString,
    outcomes: z.array(outcomeId).min(1),
    time,
    freshness: freshness.optional(),
  }).strict(),
});

const assessmentSchema = z.object({
  title: nonEmptyString,
  outcomes: z.array(outcomeId).min(1),
  time: z.number().int().positive(),
}).strict();

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
  schema: assessmentSchema,
});

export const collections = {
  courses,
  modules,
  lessons,
  checkpoints,
  capstones,
};
