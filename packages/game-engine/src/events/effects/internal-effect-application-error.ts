export type InternalEffectErrorCode =
  | "INVALID_INPUT"
  | "INVALID_NUMERIC_RESULT"
  | "RELATIONSHIP_ID_CONFLICT"
  | "RELATIONSHIP_NOT_FOUND"
  | "RELATIONSHIP_SELECTOR_NO_MATCH"
  | "SCHEDULED_EVENT_ID_CONFLICT"
  | "TRIGGER_IN_THE_PAST";

export class InternalEffectApplicationError extends Error {
  readonly code: InternalEffectErrorCode;

  constructor(
    code: InternalEffectErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "InternalEffectApplicationError";
    this.code = code;
  }
}
