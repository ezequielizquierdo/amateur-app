import { z } from "zod";

import { findPersistibilityIssue } from "./find-persistibility-issue.js";

export function persistibleSchema<TSchema extends z.ZodType>(
  structuralSchema: TSchema,
) {
  return z
    .unknown()
    .superRefine((value, context) => {
      const issue = findPersistibilityIssue(value);
      if (issue !== undefined) {
        context.addIssue({
          code: "custom",
          message: issue.message,
          path: issue.path,
        });
      }
    })
    .pipe(structuralSchema);
}
