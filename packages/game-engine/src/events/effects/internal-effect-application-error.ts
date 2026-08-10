export type InternalEffectErrorCode =
  "INVALID_INPUT" | "INVALID_NUMERIC_RESULT";

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
