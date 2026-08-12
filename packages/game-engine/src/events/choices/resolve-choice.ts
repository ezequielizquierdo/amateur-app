import {
  ChoiceIdSchema,
  DecisionRecordSchema,
  GameEventSchema,
  type AppliedEffect,
  type ChoiceId,
  type DecisionRecord,
  type EventAvailability,
  type GameEvent,
  type GameState,
  type ProbabilisticOutcome,
} from "@amateur-app/shared-types";

import { validateGameState } from "../../validation/validate-game-state.js";
import { evaluateEventConditionGroup } from "../conditions/evaluate-event-condition-group.js";
import { EventEffectResolutionError } from "../event-effect-resolution-error.js";
import { OutcomeSelectionError } from "../outcomes/outcome-selection-error.js";
import { selectDeterministicOutcome } from "../outcomes/select-deterministic-outcome.js";
import { resolveGameEffects } from "../resolve-game-effects.js";
import {
  ChoiceResolutionError,
  type ChoiceResolutionPhase,
} from "./choice-resolution-error.js";

export type ChoiceResolutionResult = Readonly<{
  nextState: GameState;
  decision: DecisionRecord;
}>;

function inputError(message: string, cause: unknown): ChoiceResolutionError {
  return new ChoiceResolutionError("INVALID_INPUT", message, { cause });
}

function isEventAvailable(
  availability: EventAvailability,
  state: GameState,
): boolean {
  if (
    availability.minimumAge !== undefined &&
    state.life.age < availability.minimumAge
  ) {
    return false;
  }
  if (
    availability.maximumAge !== undefined &&
    state.life.age > availability.maximumAge
  ) {
    return false;
  }
  if (
    availability.lifeStages !== undefined &&
    !availability.lifeStages.includes(state.life.lifeStage)
  ) {
    return false;
  }
  if (
    availability.careerTypes !== undefined &&
    !availability.careerTypes.includes(state.football.careerType)
  ) {
    return false;
  }
  if (
    availability.footballStatuses !== undefined &&
    !availability.footballStatuses.includes(state.football.status)
  ) {
    return false;
  }
  return (
    availability.conditions === undefined ||
    evaluateEventConditionGroup(availability.conditions, state)
  );
}

function resolveEffects(
  effects: GameEvent["choices"][number]["effects"],
  state: GameState,
  event: GameEvent,
  choiceId: ChoiceId,
  phase: "choice_effects" | "outcome_effects",
  selectedOutcome?: ProbabilisticOutcome,
): { nextState: GameState; appliedEffects: AppliedEffect[] } {
  try {
    return resolveGameEffects(effects, state, {
      sourceEventId: event.id,
      sourceEventVersion: event.version,
      choiceId,
      source:
        selectedOutcome === undefined
          ? { phase: "choice" }
          : { phase: "outcome", outcomeId: selectedOutcome.id },
    });
  } catch (cause) {
    if (cause instanceof EventEffectResolutionError) {
      throw new ChoiceResolutionError(
        "EFFECT_RESOLUTION_FAILED",
        `Choice resolution failed during ${phase}`,
        {
          phase,
          choiceId,
          ...(selectedOutcome === undefined
            ? {}
            : { outcomeId: selectedOutcome.id }),
          cause,
        },
      );
    }
    throw cause;
  }
}

function selectOutcome(
  outcomes: readonly ProbabilisticOutcome[],
  state: GameState,
  event: GameEvent,
  choiceId: ChoiceId,
): ProbabilisticOutcome {
  try {
    return selectDeterministicOutcome(outcomes, state, {
      sourceEventId: event.id,
      sourceEventVersion: event.version,
      choiceId,
    });
  } catch (cause) {
    if (cause instanceof OutcomeSelectionError) {
      throw new ChoiceResolutionError(
        "OUTCOME_SELECTION_FAILED",
        "Choice resolution failed during outcome selection",
        { phase: "outcome_selection", choiceId, cause },
      );
    }
    throw cause;
  }
}

function unsupportedFollowUps(
  choiceId: ChoiceId,
  outcome?: ProbabilisticOutcome,
): ChoiceResolutionError {
  return new ChoiceResolutionError(
    "FOLLOW_UPS_NOT_SUPPORTED",
    "Choice resolution does not yet support follow-ups",
    {
      phase: "follow_ups",
      choiceId,
      ...(outcome === undefined ? {} : { outcomeId: outcome.id }),
    },
  );
}

function resultError(
  message: string,
  phase: ChoiceResolutionPhase,
  cause: unknown,
  choiceId: ChoiceId,
  outcome?: ProbabilisticOutcome,
): ChoiceResolutionError {
  return new ChoiceResolutionError("INVALID_RESULT_STATE", message, {
    phase,
    choiceId,
    ...(outcome === undefined ? {} : { outcomeId: outcome.id }),
    cause,
  });
}

export function resolveChoice(
  event: GameEvent,
  choiceId: ChoiceId,
  state: GameState,
): ChoiceResolutionResult {
  let initialState: GameState;
  try {
    initialState = validateGameState(state);
  } catch (cause) {
    throw inputError("Invalid game state", cause);
  }

  const eventResult = GameEventSchema.safeParse(event);
  if (!eventResult.success) {
    throw inputError("Invalid game event", eventResult.error);
  }
  const validatedEvent = eventResult.data;
  const choiceIdResult = ChoiceIdSchema.safeParse(choiceId);
  if (!choiceIdResult.success) {
    throw inputError("Invalid choiceId", choiceIdResult.error);
  }
  const validatedChoiceId = choiceIdResult.data;

  if (initialState.status !== "active") {
    throw new ChoiceResolutionError(
      "GAME_NOT_ACTIVE",
      "Cannot resolve a choice for a finished game",
      { choiceId: validatedChoiceId },
    );
  }
  if (initialState.currentEventId !== validatedEvent.id) {
    throw new ChoiceResolutionError(
      "EVENT_NOT_CURRENT",
      `Event "${validatedEvent.id}" is not the current event`,
      { choiceId: validatedChoiceId },
    );
  }
  if (!isEventAvailable(validatedEvent.availability, initialState)) {
    throw new ChoiceResolutionError(
      "EVENT_NOT_AVAILABLE",
      `Event "${validatedEvent.id}" is not available`,
      { choiceId: validatedChoiceId },
    );
  }
  if (
    initialState.history.decisions.some(
      (decision) =>
        decision.eventId === validatedEvent.id &&
        decision.turn === initialState.currentTurn,
    )
  ) {
    throw new ChoiceResolutionError(
      "CHOICE_ALREADY_RESOLVED",
      `Event "${validatedEvent.id}" was already resolved this turn`,
      { choiceId: validatedChoiceId },
    );
  }

  const choice = validatedEvent.choices.find(
    (candidate) => candidate.id === validatedChoiceId,
  );
  if (choice === undefined) {
    throw new ChoiceResolutionError(
      "CHOICE_NOT_FOUND",
      `Choice "${validatedChoiceId}" does not exist in event "${validatedEvent.id}"`,
      { choiceId: validatedChoiceId },
    );
  }
  if (
    choice.availability !== undefined &&
    !evaluateEventConditionGroup(choice.availability, initialState)
  ) {
    throw new ChoiceResolutionError(
      "CHOICE_NOT_AVAILABLE",
      `Choice "${choice.id}" is not available`,
      { choiceId: choice.id },
    );
  }
  if (choice.followUps !== undefined) {
    throw unsupportedFollowUps(choice.id);
  }

  const decisionAge = initialState.life.age;
  const decisionSeason = initialState.currentSeason;
  const decisionTurn = initialState.currentTurn;
  const choiceResolution = resolveEffects(
    choice.effects,
    initialState,
    validatedEvent,
    choice.id,
    "choice_effects",
  );

  let selectedOutcome: ProbabilisticOutcome | undefined;
  let stateAfterOutcome = choiceResolution.nextState;
  let outcomeAppliedEffects: AppliedEffect[] = [];
  if (choice.outcomes !== undefined) {
    selectedOutcome = selectOutcome(
      choice.outcomes,
      choiceResolution.nextState,
      validatedEvent,
      choice.id,
    );
    if (selectedOutcome.followUps !== undefined) {
      throw unsupportedFollowUps(choice.id, selectedOutcome);
    }
    const outcomeResolution = resolveEffects(
      selectedOutcome.effects,
      choiceResolution.nextState,
      validatedEvent,
      choice.id,
      "outcome_effects",
      selectedOutcome,
    );
    stateAfterOutcome = outcomeResolution.nextState;
    outcomeAppliedEffects = outcomeResolution.appliedEffects;
  }

  const candidateDecision = {
    eventId: validatedEvent.id,
    eventVersion: validatedEvent.version,
    choiceId: choice.id,
    ...(selectedOutcome === undefined ? {} : { outcomeId: selectedOutcome.id }),
    age: decisionAge,
    season: decisionSeason,
    turn: decisionTurn,
    immediateEffects: [
      ...choiceResolution.appliedEffects,
      ...outcomeAppliedEffects,
    ],
  };
  const decisionResult = DecisionRecordSchema.safeParse(candidateDecision);
  if (!decisionResult.success) {
    throw resultError(
      "Choice resolution produced an invalid DecisionRecord",
      "history",
      decisionResult.error,
      choice.id,
      selectedOutcome,
    );
  }
  const persistedDecision = structuredClone(decisionResult.data);
  const returnedDecision = structuredClone(decisionResult.data);

  const nextTurn = stateAfterOutcome.currentTurn + 1;
  if (!Number.isSafeInteger(nextTurn) || nextTurn < 0) {
    throw resultError(
      "Choice resolution produced an invalid currentTurn",
      "history",
      nextTurn,
      choice.id,
      selectedOutcome,
    );
  }

  const stateWithoutCurrentEvent = { ...stateAfterOutcome };
  delete stateWithoutCurrentEvent.currentEventId;
  const candidateFinalState = {
    ...stateWithoutCurrentEvent,
    history: {
      ...stateAfterOutcome.history,
      decisions: [...stateAfterOutcome.history.decisions, persistedDecision],
    },
    currentTurn: nextTurn,
  };

  let nextState: GameState;
  try {
    nextState = validateGameState(candidateFinalState);
  } catch (cause) {
    throw resultError(
      "Choice resolution produced an invalid final GameState",
      "history",
      cause,
      choice.id,
      selectedOutcome,
    );
  }
  return { nextState, decision: returnedDecision };
}
