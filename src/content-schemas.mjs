import { z } from "astro/zod";

const nonEmptyString = z.string().trim().min(1);
const outcomeId = nonEmptyString.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const capabilityPackName = nonEmptyString.regex(
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  "Capability Pack name must use lowercase words separated by hyphens",
);
const exactVersion = nonEmptyString.regex(
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/,
  "Capability Pack version must be an exact semantic version",
);
export const capabilityPackDependenciesSchema = z.array(
  z
    .object({
      name: capabilityPackName,
      version: exactVersion,
    })
    .strict(),
);
const date = z.coerce.date();
const lessonTime = z
  .object({
    study: z.number().int().nonnegative(),
    practice: z.number().int().nonnegative(),
    advanced: z.number().int().nonnegative().optional(),
  })
  .strict();
const freshness = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("stable"),
      verifiedAt: date,
      jurisdiction: nonEmptyString.optional(),
    })
    .strict(),
  z
    .object({
      mode: z.literal("time-sensitive"),
      verifiedAt: date,
      reviewAfter: date,
      jurisdiction: nonEmptyString.optional(),
    })
    .strict(),
]);

export const courseSchema = z
  .object({
    title: nonEmptyString,
    summary: nonEmptyString,
    learnerProfile: nonEmptyString,
    prerequisites: z.array(nonEmptyString),
    outcomes: z
      .array(
        z
          .object({
            id: outcomeId,
            statement: nonEmptyString,
          })
          .strict(),
      )
      .min(1),
    createdAt: date,
    capabilityPacks: capabilityPackDependenciesSchema,
    freshness,
  })
  .strict();

export const moduleSchema = z
  .object({
    title: nonEmptyString,
    summary: nonEmptyString,
    order: z.number().int().positive(),
    capability: nonEmptyString,
    outcomes: z.array(outcomeId).min(1),
  })
  .strict();

export const lessonSchema = z
  .object({
    title: nonEmptyString,
    order: z.number().int().positive(),
    revision: z.number().int().positive(),
    capability: nonEmptyString,
    outcomes: z.array(outcomeId).min(1),
    time: lessonTime,
    freshness: freshness.optional(),
  })
  .strict();

export const assessmentSchema = z
  .object({
    title: nonEmptyString,
    outcomes: z.array(outcomeId).min(1),
    time: z.number().int().positive(),
  })
  .strict();

export const capstoneSchema = assessmentSchema.extend({
  criteria: z
    .array(
      z
        .object({
          statement: nonEmptyString,
          outcomes: z.array(outcomeId).min(1),
        })
        .strict(),
    )
    .min(1),
});
