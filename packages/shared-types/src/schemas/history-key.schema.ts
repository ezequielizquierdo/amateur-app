import { z } from "zod";

const RESERVED_HISTORY_KEYS = new Set([
  "__proto__",
  "prototype",
  "constructor",
]);

export const HistoryKeySchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:_[a-z0-9]+)*$/,
    "History key must contain lowercase alphanumeric segments separated by single underscores",
  )
  .refine(
    (key) => !RESERVED_HISTORY_KEYS.has(key),
    "History key is reserved and cannot be used",
  );
