import type { ChoiceId, OutcomeId } from "@amateur-app/shared-types";

export type ChoiceResolutionErrorCode =
  | "INVALID_INPUT"
  | "GAME_NOT_ACTIVE"
  | "EVENT_NOT_CURRENT"
  | "EVENT_NOT_AVAILABLE"
  | "CHOICE_NOT_FOUND"
  | "CHOICE_NOT_AVAILABLE"
  | "CHOICE_ALREADY_RESOLVED"
  | "FOLLOW_UPS_NOT_SUPPORTED"
  | "EFFECT_RESOLUTION_FAILED"
  | "OUTCOME_SELECTION_FAILED"
  | "INVALID_RESULT_STATE";

export type ChoiceResolutionPhase =
  | "choice_effects"
  | "outcome_selection"
  | "outcome_effects"
  | "follow_ups"
  | "history";

type ChoiceResolutionErrorOptions = Readonly<{
  phase?: ChoiceResolutionPhase;
  choiceId?: ChoiceId;
  outcomeId?: OutcomeId;
  cause?: unknown;
}>;

export class ChoiceResolutionError extends Error {
  readonly code: ChoiceResolutionErrorCode;
  declare readonly phase?: ChoiceResolutionPhase;
  declare readonly choiceId?: ChoiceId;
  declare readonly outcomeId?: OutcomeId;

  constructor(
    code: ChoiceResolutionErrorCode,
    message: string,
    options?: ChoiceResolutionErrorOptions,
  ) {
    super(
      message,
      options !== undefined && Object.hasOwn(options, "cause")
        ? { cause: options.cause }
        : {},
    );
    this.name = "ChoiceResolutionError";
    this.code = code;
    if (options?.phase !== undefined) this.phase = options.phase;
    if (options?.choiceId !== undefined) this.choiceId = options.choiceId;
    if (options?.outcomeId !== undefined) this.outcomeId = options.outcomeId;
  }
}
