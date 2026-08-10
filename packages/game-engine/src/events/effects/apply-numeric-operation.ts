import { InternalEffectApplicationError } from "./internal-effect-application-error.js";

type NumericOperation = "set" | "add" | "multiply";
type NumericLimit = "scale" | "nonnegative" | "none";

function assertNever(value: never): never {
  throw new InternalEffectApplicationError(
    "INVALID_INPUT",
    `Unsupported numeric operation: ${String(value)}`,
  );
}

export function applyNumericOperation(
  previous: number,
  operation: NumericOperation,
  requested: number,
  limit: NumericLimit,
): number {
  let calculated: number;

  switch (operation) {
    case "set":
      calculated = requested;
      break;
    case "add":
      calculated = previous + requested;
      break;
    case "multiply":
      calculated = previous * requested;
      break;
    default:
      return assertNever(operation);
  }

  if (!Number.isFinite(calculated)) {
    throw new InternalEffectApplicationError(
      "INVALID_NUMERIC_RESULT",
      `Numeric operation ${operation} produced a non-finite result`,
    );
  }

  let limited: number;
  switch (limit) {
    case "scale":
      limited = Math.max(0, Math.min(100, calculated));
      break;
    case "nonnegative":
      limited = Math.max(0, calculated);
      break;
    case "none":
      limited = calculated;
      break;
    default:
      return assertNever(limit);
  }

  return Object.is(limited, -0) ? 0 : limited;
}
