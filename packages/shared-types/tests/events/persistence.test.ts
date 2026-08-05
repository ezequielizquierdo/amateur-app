import { describe, expect, it } from "vitest";

import { DecisionRecordSchema, ScheduledEventSchema } from "../../src/index.js";

describe("event persistence contracts", () => {
  const decision = {
    eventId: "first_trial",
    eventVersion: 1,
    choiceId: "attend_trial",
    outcomeId: "accepted",
    age: 14,
    season: 1,
    turn: 0,
    immediateEffects: [],
  };

  it("accepts a decision with an event version and optional outcome", () => {
    expect(DecisionRecordSchema.safeParse(decision).success).toBe(true);
    const withoutOutcome: Record<string, unknown> = { ...decision };
    delete withoutOutcome.outcomeId;
    expect(DecisionRecordSchema.safeParse(withoutOutcome).success).toBe(true);
  });

  it("rejects a decision without eventVersion", () => {
    const withoutVersion: Record<string, unknown> = { ...decision };
    delete withoutVersion.eventVersion;
    expect(DecisionRecordSchema.safeParse(withoutVersion).success).toBe(false);
  });

  it.each([
    { triggerType: "turn", triggerValue: 3 },
    { triggerType: "age", triggerValue: 18 },
    { triggerType: "season", triggerValue: 2 },
    {
      triggerType: "condition",
      conditions: {
        mode: "all",
        conditions: [
          { type: "flag", key: "ready", operator: "equals", value: true },
        ],
      },
    },
  ])("accepts a valid absolute scheduled event variant", (trigger) => {
    expect(
      ScheduledEventSchema.safeParse({
        id: "scheduled-1",
        eventId: "next_event",
        sourceEventId: "first_event",
        priority: 1,
        createdAtTurn: 0,
        consumed: false,
        ...trigger,
      }).success,
    ).toBe(true);
  });

  it.each([
    {
      triggerType: "turn",
      triggerValue: 3,
      conditions: { mode: "all", conditions: [] },
    },
    {
      triggerType: "condition",
      triggerValue: 3,
      conditions: { mode: "all", conditions: [] },
    },
    { triggerType: "condition" },
  ])("rejects incompatible scheduled event fields", (trigger) => {
    expect(
      ScheduledEventSchema.safeParse({
        id: "scheduled-1",
        eventId: "next_event",
        sourceEventId: "first_event",
        priority: 1,
        createdAtTurn: 0,
        consumed: false,
        ...trigger,
      }).success,
    ).toBe(false);
  });
});
