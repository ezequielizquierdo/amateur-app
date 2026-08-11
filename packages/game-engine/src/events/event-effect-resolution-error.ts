import type { GameEffect } from "@amateur-app/shared-types";

export type EventEffectResolutionErrorCode =
  | "INVALID_INPUT"
  | "INVALID_NUMERIC_RESULT"
  | "RELATIONSHIP_ID_CONFLICT"
  | "RELATIONSHIP_NOT_FOUND"
  | "RELATIONSHIP_SELECTOR_NO_MATCH"
  | "SCHEDULED_EVENT_ID_CONFLICT"
  | "TRIGGER_IN_THE_PAST"
  | "INVALID_RESULT_STATE";

type EventEffectResolutionErrorOptions = Readonly<{
  effectIndex?: number;
  effectType?: GameEffect["type"];
  cause?: unknown;
}>;

export class EventEffectResolutionError extends Error {
  readonly code: EventEffectResolutionErrorCode;
  declare readonly effectIndex?: number;
  declare readonly effectType?: GameEffect["type"];

  constructor(
    code: EventEffectResolutionErrorCode,
    message: string,
    options?: EventEffectResolutionErrorOptions,
  ) {
    super(
      message,
      options !== undefined && Object.hasOwn(options, "cause")
        ? { cause: options.cause }
        : {},
    );
    this.name = "EventEffectResolutionError";
    this.code = code;
    if (options?.effectIndex !== undefined) {
      this.effectIndex = options.effectIndex;
    }
    if (options?.effectType !== undefined) {
      this.effectType = options.effectType;
    }
  }
}
