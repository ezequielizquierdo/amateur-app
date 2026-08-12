import type {
  EventAvailability,
  EventChoice,
  GameEvent,
  GameState,
  ProbabilisticOutcome,
} from "@amateur-app/shared-types";
import { describe, expect, expectTypeOf, it } from "vitest";

import * as gameEngine from "../src/index.js";
import {
  ChoiceResolutionError,
  createInitialGameState,
  EventEffectResolutionError,
  OutcomeSelectionError,
  resolveChoice,
  validateGameState,
  type ChoiceResolutionErrorCode,
  type ChoiceResolutionResult,
} from "../src/index.js";
import { createInput } from "./test-fixtures.js";

function choice(overrides: Partial<EventChoice> = {}): EventChoice {
  return {
    id: "accept_offer",
    label: "Accept offer",
    effects: [
      { type: "player_stat", field: "mood", operation: "add", value: 5 },
    ],
    ...overrides,
  };
}

function event(
  selectedChoice: EventChoice = choice(),
  overrides: Partial<GameEvent> = {},
): GameEvent {
  return {
    id: "first_offer",
    version: 1,
    title: "First offer",
    description: "A first opportunity arrives.",
    category: "football",
    tags: ["career"],
    availability: {},
    selection: {
      mode: "mandatory",
      priority: 10,
      repeatPolicy: { type: "repeatable" },
    },
    choices: [selectedChoice],
    ...overrides,
  };
}

function state(overrides: Partial<GameState> = {}): GameState {
  const initial = createInitialGameState(createInput());
  return validateGameState({
    ...initial,
    currentEventId: "first_offer",
    ...overrides,
  });
}

function outcome(
  id: string,
  overrides: Partial<ProbabilisticOutcome> = {},
): ProbabilisticOutcome {
  return {
    id,
    weight: 1,
    effects: [
      { type: "player_stat", field: "energy", operation: "add", value: 4 },
    ],
    ...overrides,
  };
}

function runtimeResolve(
  inputEvent: unknown,
  choiceId: unknown,
  inputState: unknown,
): unknown {
  return Reflect.apply(resolveChoice, undefined, [
    inputEvent,
    choiceId,
    inputState,
  ]);
}

function captureError(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected action to throw");
}

function expectChoiceError(
  action: () => unknown,
  code: ChoiceResolutionErrorCode,
): ChoiceResolutionError {
  const error = captureError(action);
  expect(error).toBeInstanceOf(ChoiceResolutionError);
  expect(error).toMatchObject({ code });
  if (!(error instanceof ChoiceResolutionError)) {
    throw new Error("Expected ChoiceResolutionError");
  }
  return error;
}

describe("atomic choice resolution", () => {
  it("exports only the intended public API", () => {
    expect(gameEngine.resolveChoice).toBeTypeOf("function");
    expect(gameEngine.ChoiceResolutionError).toBe(ChoiceResolutionError);
    expectTypeOf<ChoiceResolutionResult>().toEqualTypeOf<
      Readonly<{
        nextState: GameState;
        decision: import("@amateur-app/shared-types").DecisionRecord;
      }>
    >();
  });

  describe("validation and availability", () => {
    it.each([
      [
        "invalid state",
        event(),
        "accept_offer",
        { ...state(), currentTurn: -1 },
      ],
      ["invalid event", { ...event(), choices: [] }, "accept_offer", state()],
      ["invalid choiceId", event(), "Invalid ID", state()],
    ])(
      "rejects %s as INVALID_INPUT",
      (_label, inputEvent, choiceId, inputState) => {
        expectChoiceError(
          () => runtimeResolve(inputEvent, choiceId, inputState),
          "INVALID_INPUT",
        );
      },
    );

    it("rejects a finished game", () => {
      const finished = state({ status: "finished", endingId: "career_end" });
      expectChoiceError(
        () => resolveChoice(event(), "accept_offer", finished),
        "GAME_NOT_ACTIVE",
      );
    });

    const withoutCurrentEvent = state();
    delete withoutCurrentEvent.currentEventId;
    it.each([
      ["absent", withoutCurrentEvent],
      ["different", state({ currentEventId: "other_event" })],
    ])("rejects %s current event", (_label, inputState) => {
      expectChoiceError(
        () => resolveChoice(event(), "accept_offer", inputState),
        "EVENT_NOT_CURRENT",
      );
    });

    it.each<[string, EventAvailability]>([
      ["minimum age", { minimumAge: 15 }],
      [
        "condition",
        {
          conditions: {
            mode: "all",
            conditions: [
              {
                type: "state",
                field: "stats.mood",
                operator: "lessThan",
                value: 0,
              },
            ],
          },
        },
      ],
    ])("rejects event unavailable by %s", (_label, availability) => {
      expectChoiceError(
        () =>
          resolveChoice(
            event(choice(), { availability }),
            "accept_offer",
            state(),
          ),
        "EVENT_NOT_AVAILABLE",
      );
    });

    it("rejects a missing choice without fallback", () => {
      expectChoiceError(
        () => resolveChoice(event(), "decline_offer", state()),
        "CHOICE_NOT_FOUND",
      );
    });

    it("rejects an unavailable choice before applying effects", () => {
      const unavailable = choice({
        availability: {
          mode: "all",
          conditions: [
            {
              type: "state",
              field: "stats.mood",
              operator: "lessThan",
              value: 0,
            },
          ],
        },
      });
      const inputState = state();
      const before = structuredClone(inputState);
      expectChoiceError(
        () => resolveChoice(event(unavailable), unavailable.id, inputState),
        "CHOICE_NOT_AVAILABLE",
      );
      expect(inputState).toEqual(before);
    });

    it("rejects the same eventId and currentTurn regardless of version", () => {
      const inputState = state();
      inputState.history.decisions.push({
        eventId: "first_offer",
        eventVersion: 99,
        choiceId: "previous_choice",
        age: inputState.life.age,
        season: inputState.currentSeason,
        turn: inputState.currentTurn,
        immediateEffects: [],
      });
      expectChoiceError(
        () => resolveChoice(event(), "accept_offer", inputState),
        "CHOICE_ALREADY_RESOLVED",
      );
    });

    it("allows the same eventId from a previous turn", () => {
      const inputState = state({ currentTurn: 2 });
      inputState.history.decisions.push({
        eventId: "first_offer",
        eventVersion: 1,
        choiceId: "previous_choice",
        age: inputState.life.age,
        season: inputState.currentSeason,
        turn: 1,
        immediateEffects: [],
      });
      expect(
        resolveChoice(event(), "accept_offer", inputState).decision.turn,
      ).toBe(2);
    });
  });

  describe("follow-up policy", () => {
    const followUp = {
      eventId: "future_event",
      trigger: { type: "turn" as const, afterTurns: 1 },
      priority: 1,
    };

    it("rejects choice follow-ups before choice effects", () => {
      const inputState = state();
      const inputEvent = event(choice({ followUps: [followUp] }));
      const before = structuredClone({ inputState, inputEvent });
      const error = expectChoiceError(
        () => resolveChoice(inputEvent, "accept_offer", inputState),
        "FOLLOW_UPS_NOT_SUPPORTED",
      );
      expect(error).toMatchObject({
        phase: "follow_ups",
        choiceId: "accept_offer",
      });
      expect({ inputState, inputEvent }).toEqual(before);
    });

    it("rejects selected outcome follow-ups before outcome effects", () => {
      const selected = outcome("selected", { followUps: [followUp] });
      const inputEvent = event(choice({ effects: [], outcomes: [selected] }));
      const error = expectChoiceError(
        () => resolveChoice(inputEvent, "accept_offer", state()),
        "FOLLOW_UPS_NOT_SUPPORTED",
      );
      expect(error).toMatchObject({
        phase: "follow_ups",
        choiceId: "accept_offer",
        outcomeId: "selected",
      });
    });

    it("does not reject follow-ups on a non-selected outcome", () => {
      const unavailable = outcome("unavailable", {
        followUps: [followUp],
        availability: {
          mode: "all",
          conditions: [
            {
              type: "state",
              field: "stats.mood",
              operator: "lessThan",
              value: 0,
            },
          ],
        },
      });
      const selected = outcome("selected");
      const result = resolveChoice(
        event(choice({ effects: [], outcomes: [unavailable, selected] })),
        "accept_offer",
        state(),
      );
      expect(result.decision.outcomeId).toBe("selected");
    });
  });

  describe("successful orchestration", () => {
    it("resolves a choice without outcomes and closes the turn", () => {
      const inputState = state({ currentTurn: 3, currentSeason: 2 });
      const previousDecisions = structuredClone(inputState.history.decisions);
      const result = resolveChoice(event(), "accept_offer", inputState);

      expect(result.nextState.stats.mood).toBe(inputState.stats.mood + 5);
      expect(result.decision).toMatchObject({
        eventId: "first_offer",
        eventVersion: 1,
        choiceId: "accept_offer",
        age: inputState.life.age,
        season: 2,
        turn: 3,
      });
      expect(Object.hasOwn(result.decision, "outcomeId")).toBe(false);
      expect(
        Object.hasOwn(result.nextState.history.decisions.at(-1)!, "outcomeId"),
      ).toBe(false);
      expect(result.decision.immediateEffects).toHaveLength(1);
      expect(result.decision.immediateEffects[0]).toMatchObject({
        source: { phase: "choice" },
        sourceEffectIndex: 0,
      });
      expect(result.nextState.history.decisions.slice(0, -1)).toEqual(
        previousDecisions,
      );
      expect(result.nextState.currentTurn).toBe(4);
      expect(result.nextState).not.toHaveProperty("currentEventId");
      expect(result.nextState.life.age).toBe(inputState.life.age);
      expect(result.nextState.life.currentYear).toBe(
        inputState.life.currentYear,
      );
      expect(result.nextState.currentSeason).toBe(inputState.currentSeason);
      expect(() => validateGameState(result.nextState)).not.toThrow();
    });

    it("uses post-choice state for selection and applies both phases in order", () => {
      const inputState = state();
      const reputationThreshold =
        inputState.football.professionalReputation + 10;
      const postChoiceOutcome = outcome("earned_contract", {
        availability: {
          mode: "all",
          conditions: [
            {
              type: "state",
              field: "football.professionalReputation",
              operator: "greaterThanOrEqual",
              value: reputationThreshold,
            },
          ],
        },
        effects: [
          {
            type: "football_attribute",
            field: "technique",
            operation: "add",
            value: 5,
          },
        ],
      });
      const fallback = outcome("fallback", {
        effects: [
          { type: "player_stat", field: "mood", operation: "add", value: -5 },
        ],
      });
      const selectedChoice = choice({
        effects: [
          {
            type: "football_state",
            field: "professionalReputation",
            operation: "add",
            value: 10,
          },
        ],
        outcomes: [postChoiceOutcome, fallback],
      });
      const result = resolveChoice(
        event(selectedChoice),
        selectedChoice.id,
        inputState,
      );

      expect(result.nextState.football.professionalReputation).toBe(
        reputationThreshold,
      );
      expect(result.nextState.footballAttributes.technique).toBe(
        inputState.footballAttributes.technique + 5,
      );
      expect(result.decision.outcomeId).toBe("earned_contract");
      expect(
        result.decision.immediateEffects.map((effect) => effect.source),
      ).toEqual([
        { phase: "choice" },
        { phase: "outcome", outcomeId: "earned_contract" },
      ]);
      expect(
        result.decision.immediateEffects.map(
          (effect) => effect.sourceEffectIndex,
        ),
      ).toEqual([0, 0]);
    });

    it("supports empty choice effects and preserves no_change records", () => {
      const selected = outcome("selected", {
        effects: [
          { type: "player_stat", field: "mood", operation: "add", value: 0 },
        ],
      });
      const result = resolveChoice(
        event(choice({ effects: [], outcomes: [selected] })),
        "accept_offer",
        state(),
      );
      expect(result.decision.immediateEffects).toHaveLength(1);
      expect(result.decision.immediateEffects[0]).toMatchObject({
        source: { phase: "outcome", outcomeId: "selected" },
        sourceEffectIndex: 0,
        status: "no_change",
      });
    });

    it("returns a deeply separate DecisionRecord", () => {
      const result = resolveChoice(event(), "accept_offer", state());
      const persisted = result.nextState.history.decisions.at(-1)!;
      expect(result.decision).not.toBe(persisted);
      expect(result.decision.immediateEffects).not.toBe(
        persisted.immediateEffects,
      );
      const mutableDecision = structuredClone(result.decision);
      mutableDecision.immediateEffects[0]!.status = "no_change";
      expect(persisted.immediateEffects[0]!.status).toBe("applied");
    });

    it("is pure for repeated calls with the same immutable inputs", () => {
      const inputState = state();
      const inputEvent = event();
      const first = resolveChoice(inputEvent, "accept_offer", inputState);
      const second = resolveChoice(inputEvent, "accept_offer", inputState);
      expect(second).toEqual(first);
      expectChoiceError(
        () => resolveChoice(inputEvent, "accept_offer", first.nextState),
        "EVENT_NOT_CURRENT",
      );
    });
  });

  describe("atomic failures and wrapping", () => {
    const failingEffect = {
      type: "life_state" as const,
      field: "numberOfChildren" as const,
      operation: "add" as const,
      value: -1,
    };

    it("wraps choice effect failures and preserves inputs", () => {
      const inputState = state();
      const inputEvent = event(choice({ effects: [failingEffect] }));
      const before = structuredClone({ inputState, inputEvent });
      const error = expectChoiceError(
        () => resolveChoice(inputEvent, "accept_offer", inputState),
        "EFFECT_RESOLUTION_FAILED",
      );
      expect(error.phase).toBe("choice_effects");
      expect(error.cause).toBeInstanceOf(EventEffectResolutionError);
      expect({ inputState, inputEvent }).toEqual(before);
    });

    it("wraps no eligible outcome", () => {
      const unavailable = outcome("unavailable", {
        availability: {
          mode: "all",
          conditions: [
            {
              type: "state",
              field: "stats.mood",
              operator: "lessThan",
              value: 0,
            },
          ],
        },
      });
      const error = expectChoiceError(
        () =>
          resolveChoice(
            event(choice({ effects: [], outcomes: [unavailable] })),
            "accept_offer",
            state(),
          ),
        "OUTCOME_SELECTION_FAILED",
      );
      expect(error.phase).toBe("outcome_selection");
      expect(error.cause).toBeInstanceOf(OutcomeSelectionError);
    });

    it("wraps outcome effect failures with outcome metadata", () => {
      const selected = outcome("failure", { effects: [failingEffect] });
      const error = expectChoiceError(
        () =>
          resolveChoice(
            event(choice({ effects: [], outcomes: [selected] })),
            "accept_offer",
            state(),
          ),
        "EFFECT_RESOLUTION_FAILED",
      );
      expect(error).toMatchObject({
        phase: "outcome_effects",
        outcomeId: "failure",
      });
      expect(error.cause).toBeInstanceOf(EventEffectResolutionError);
    });

    it("rejects currentTurn overflow atomically", () => {
      const inputState = state({ currentTurn: Number.MAX_SAFE_INTEGER });
      const before = structuredClone(inputState);
      expectChoiceError(
        () => resolveChoice(event(), "accept_offer", inputState),
        "INVALID_RESULT_STATE",
      );
      expect(inputState).toEqual(before);
    });
  });
});
