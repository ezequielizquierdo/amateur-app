import { z } from "zod";

import type { JsonValue } from "../types.js";
import { persistibleSchema } from "../validation/persistible-schema.js";

export const JsonPrimitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const JsonValueStructuralSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    JsonPrimitiveSchema,
    z.array(JsonValueStructuralSchema),
    z.record(z.string(), JsonValueStructuralSchema),
  ]),
);

export const JsonValueSchema = persistibleSchema(JsonValueStructuralSchema);
