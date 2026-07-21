import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { isSupportedLanguage } from "../scripts/content-contract.mjs";

const base = "./src/content/courses";

const courses = defineCollection({
  loader: glob({
    base,
    pattern: "*/index.mdx",
    generateId: ({ entry }) => entry.split("/")[0],
  }),
  schema: z
    .object({
      title: z.string().min(1),
      summary: z.string().min(1),
      outcomes: z.array(z.string().min(1)).min(1),
      language: z.string().refine(isSupportedLanguage).optional(),
    })
    .strict(),
});

const lessons = defineCollection({
  loader: glob({
    base,
    pattern: "*/lessons/*.mdx",
    generateId: ({ entry }) => {
      const [courseSlug, , filename] = entry.split("/");
      return `${courseSlug}/${filename.replace(/\.mdx$/, "")}`;
    },
  }),
  schema: z
    .object({
      title: z.string().min(1),
      order: z.number().int().positive(),
    })
    .strict(),
});

export const collections = { courses, lessons };
