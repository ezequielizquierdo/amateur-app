import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import {
  ChoiceIdSchema,
  EventIdSchema,
  EventNarrativeMetadataSchema,
  EventChoiceSchema,
  EventSelectionSchema,
  FollowUpTriggerSchema,
  GameEventSchema,
  OutcomeIdSchema,
  ProbabilisticOutcomeSchema,
} from "../../src/index.js";

function validEvent(): Record<string, unknown> {
  return {
    id: "friends_team_or_trial",
    version: 1,
    title: "Dos caminos",
    description: "Debes elegir.",
    category: "football",
    tags: ["adolescence"],
    availability: { minimumAge: 14, maximumAge: 17 },
    selection: {
      mode: "mandatory",
      priority: 100,
      repeatPolicy: { type: "once_per_run" },
    },
    choices: [
      {
        id: "attend_trial",
        label: "Ir a la prueba",
        effects: [
          { type: "player_stat", field: "mood", operation: "add", value: 2 },
        ],
      },
    ],
  };
}

describe("game event schema", () => {
  it("accepts a complete declarative event", () => {
    expect(GameEventSchema.safeParse(validEvent()).success).toBe(true);
  });

  const idSchemas = [EventIdSchema, ChoiceIdSchema, OutcomeIdSchema];

  it.each(idSchemas)("accepts valid IDs on each ID schema", (schema) => {
    for (const id of ["event_1", "club_trial", "a1"]) {
      expect(schema.safeParse(id).success).toBe(true);
    }
  });

  it.each(idSchemas)("rejects invalid IDs on each ID schema", (schema) => {
    for (const id of [
      "",
      "Event",
      "event-name",
      "event name",
      "_event",
      "event_",
      "event__name",
    ]) {
      expect(schema.safeParse(id).success).toBe(false);
    }
  });

  it.each(["event_1", "club_trial", "a1"])(
    "accepts the valid chainId %s",
    (chainId) => {
      expect(EventNarrativeMetadataSchema.safeParse({ chainId }).success).toBe(
        true,
      );
    },
  );

  it.each([
    "",
    "Event",
    "event-name",
    "event name",
    "_event",
    "event_",
    "event__name",
  ])("rejects the invalid chainId %s", (chainId) => {
    expect(EventNarrativeMetadataSchema.safeParse({ chainId }).success).toBe(
      false,
    );
  });

  it("requires narrative.step to be a positive integer", () => {
    expect(EventNarrativeMetadataSchema.safeParse({ step: 1 }).success).toBe(
      true,
    );
    expect(EventNarrativeMetadataSchema.safeParse({ step: 0 }).success).toBe(
      false,
    );
    expect(EventNarrativeMetadataSchema.safeParse({ step: 1.5 }).success).toBe(
      false,
    );
  });

  it.each([
    { type: "turn", afterTurns: 1 },
    { type: "age", atAge: 14 },
    { type: "season", atSeason: 1 },
    {
      type: "condition",
      conditions: {
        mode: "all",
        conditions: [
          { type: "flag", key: "ready", operator: "equals", value: true },
        ],
      },
    },
  ])("accepts a valid follow-up trigger", (trigger) => {
    expect(FollowUpTriggerSchema.safeParse(trigger).success).toBe(true);
  });

  it("rejects an empty cooldown", () => {
    expect(
      EventSelectionSchema.safeParse({
        mode: "mandatory",
        priority: 1,
        repeatPolicy: { type: "cooldown" },
      }).success,
    ).toBe(false);
  });

  it.each([0, -1, 1.5])("rejects invalid weighted values", (weight) => {
    expect(
      EventSelectionSchema.safeParse({
        mode: "weighted",
        priority: 1,
        weight,
        repeatPolicy: { type: "repeatable" },
      }).success,
    ).toBe(false);
  });

  it("rejects a fractional priority", () => {
    const event = validEvent();
    event.selection = {
      mode: "mandatory",
      priority: 1.5,
      repeatPolicy: { type: "repeatable" },
    };
    expect(GameEventSchema.safeParse(event).success).toBe(false);
  });

  it("rejects an empty outcomes array", () => {
    expect(
      EventChoiceSchema.safeParse({
        id: "choice",
        label: "Choose",
        effects: [],
        outcomes: [],
      }).success,
    ).toBe(false);
  });

  it("rejects an option without a resolution path", () => {
    expect(
      EventChoiceSchema.safeParse({
        id: "choice",
        label: "Choose",
        effects: [],
      }).success,
    ).toBe(false);
  });

  it("rejects an outcome without a resolution path", () => {
    expect(
      ProbabilisticOutcomeSchema.safeParse({
        id: "outcome",
        weight: 1,
        effects: [],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate option IDs", () => {
    const event = validEvent();
    const choice = (event.choices as Record<string, unknown>[])[0];
    event.choices = [choice, { ...choice }];
    expect(GameEventSchema.safeParse(event).success).toBe(false);
  });

  it("rejects duplicate outcome IDs", () => {
    const outcome = {
      id: "accepted",
      weight: 1,
      effects: [{ type: "flag", key: "accepted", value: true }],
    };
    expect(
      EventChoiceSchema.safeParse({
        id: "choice",
        label: "Choose",
        effects: [],
        outcomes: [outcome, { ...outcome }],
      }).success,
    ).toBe(false);
  });

  it.each([
    { minimumAge: 13 },
    { minimumAge: 18, maximumAge: 17 },
    { lifeStages: [] },
    { careerTypes: [] },
    { footballStatuses: [] },
  ])("rejects invalid availability", (availability) => {
    const event = validEvent();
    event.availability = availability;
    expect(GameEventSchema.safeParse(event).success).toBe(false);
  });

  it("rejects extra object properties", () => {
    const event = validEvent();
    event.callback = "not_allowed";
    expect(GameEventSchema.safeParse(event).success).toBe(false);
  });

  it.each([
    new Date(0),
    () => true,
    BigInt(1),
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ])("rejects a non-persistible value", (value) => {
    const event = validEvent();
    event.tags = [value];
    expect(GameEventSchema.safeParse(event).success).toBe(false);
  });

  it("returns a failed safeParse result for explicit undefined", () => {
    const event = validEvent();
    event.narrative = undefined;

    expect(() => GameEventSchema.safeParse(event)).not.toThrow();
    expect(GameEventSchema.safeParse(event).success).toBe(false);
  });

  it("returns a useful path for nested explicit undefined", () => {
    const event = validEvent();
    event.narrative = { tone: undefined };

    const result = GameEventSchema.safeParse(event);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["narrative", "tone"]);
    }
  });

  it("returns a failed safeParse result for a circular reference", () => {
    const event = validEvent();
    event.circular = event;

    expect(() => GameEventSchema.safeParse(event)).not.toThrow();
    expect(GameEventSchema.safeParse(event).success).toBe(false);
  });

  it("throws ZodError from parse for a circular reference", () => {
    const event = validEvent();
    event.circular = event;

    expect(() => GameEventSchema.parse(event)).toThrow(ZodError);
  });

  it("accepts a shared reference that is not circular", () => {
    const event = validEvent();
    const sharedEffect = {
      type: "flag",
      key: "shared_effect",
      value: true,
    };
    event.choices = [
      {
        id: "choice",
        label: "Choose",
        effects: [sharedEffect, sharedEffect],
      },
    ];

    expect(GameEventSchema.safeParse(event).success).toBe(true);
  });

  it("does not mutate the event during safeParse", () => {
    const event = validEvent();
    const snapshot = structuredClone(event);

    GameEventSchema.safeParse(event);

    expect(event).toEqual(snapshot);
  });
});
