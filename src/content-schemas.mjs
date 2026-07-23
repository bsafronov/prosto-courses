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
const calendarDateMessage = "must be a YYYY-MM-DD calendar date";
const date = z.union([
  z.date().refine(
    (value) =>
      value.getUTCHours() === 0 &&
      value.getUTCMinutes() === 0 &&
      value.getUTCSeconds() === 0 &&
      value.getUTCMilliseconds() === 0,
    calendarDateMessage,
  ),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, calendarDateMessage)
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00.000Z`);
      return (
        !Number.isNaN(parsed.valueOf()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    }, calendarDateMessage)
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
]);
const lessonTime = z
  .object({
    study: z.number().int().nonnegative(),
    practice: z.number().int().nonnegative(),
    advanced: z.number().int().nonnegative().optional(),
  })
  .strict();
const freshness = z
  .discriminatedUnion("mode", [
    z
      .object({
        mode: z.literal("stable"),
        applicability: z.enum(["global", "jurisdiction-specific"]),
        verifiedAt: date,
        jurisdiction: nonEmptyString.optional(),
      })
      .strict(),
    z
      .object({
        mode: z.literal("time-sensitive"),
        applicability: z.enum(["global", "jurisdiction-specific"]),
        verifiedAt: date,
        reviewAfter: date,
        jurisdiction: nonEmptyString.optional(),
      })
      .strict(),
  ])
  .superRefine((value, context) => {
    if (
      value.applicability === "jurisdiction-specific" &&
      !value.jurisdiction
    ) {
      context.addIssue({
        code: "custom",
        path: ["jurisdiction"],
        message: "jurisdiction is required for jurisdiction-specific applicability",
      });
    }
    if (value.applicability === "global" && value.jurisdiction) {
      context.addIssue({
        code: "custom",
        path: ["jurisdiction"],
        message: "jurisdiction must be omitted for global applicability",
      });
    }
    if (
      value.mode === "time-sensitive" &&
      value.reviewAfter <= value.verifiedAt
    ) {
      context.addIssue({
        code: "custom",
        path: ["reviewAfter"],
        message: "reviewAfter must follow verifiedAt",
      });
    }
  });

export const courseBriefSchema = z
  .object({
    factualRisk: z.enum(["standard", "high"]),
    capabilityPacks: capabilityPackDependenciesSchema.optional(),
  })
  .strict();

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
