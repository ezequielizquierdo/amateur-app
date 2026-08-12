import type { OutcomeId } from "@amateur-app/shared-types";

export type OutcomeSelectionErrorCode = "INVALID_INPUT" | "NO_ELIGIBLE_OUTCOME";

type OutcomeSelectionErrorOptions = Readonly<{
  outcomeIndex?: number;
  outcomeId?: OutcomeId;
  cause?: unknown;
}>;

export class OutcomeSelectionError extends Error {
  readonly code: OutcomeSelectionErrorCode;
  declare readonly outcomeIndex?: number;
  declare readonly outcomeId?: OutcomeId;

  constructor(
    code: OutcomeSelectionErrorCode,
    message: string,
    options?: OutcomeSelectionErrorOptions,
  ) {
    super(
      message,
      options !== undefined && Object.hasOwn(options, "cause")
        ? { cause: options.cause }
        : {},
    );
    this.name = "OutcomeSelectionError";
    this.code = code;
    if (options?.outcomeIndex !== undefined) {
      this.outcomeIndex = options.outcomeIndex;
    }
    if (options?.outcomeId !== undefined) {
      this.outcomeId = options.outcomeId;
    }
  }
}
