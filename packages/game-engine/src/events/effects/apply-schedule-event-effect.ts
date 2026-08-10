import {
  ScheduledEventSchema,
  type AppliedEffect,
  type AppliedEffectSource,
  type ChoiceId,
  type EventConditionGroup,
  type EventId,
  type GameState,
  type ScheduleEventEffect,
  type ScheduledEvent,
} from "@amateur-app/shared-types";

import { InternalEffectApplicationError } from "./internal-effect-application-error.js";

type ScheduleEffectContext = Readonly<{
  sourceEventId: EventId;
  sourceEventVersion: number;
  choiceId: ChoiceId;
  source: AppliedEffectSource;
  sourceEffectIndex: number;
}>;

type AppliedScheduleEventEffect = Extract<
  AppliedEffect,
  { type: "schedule_event" }
>;

type ScheduledEventTriggerFields =
  | { triggerType: "turn"; triggerValue: number }
  | { triggerType: "age"; triggerValue: number }
  | { triggerType: "season"; triggerValue: number }
  | { triggerType: "condition"; conditions: EventConditionGroup };

function assertNever(value: never, family: string): never {
  throw new InternalEffectApplicationError(
    "INVALID_INPUT",
    `Unsupported ${family} variant: ${JSON.stringify(value)}`,
  );
}

function copySource(source: AppliedEffectSource): AppliedEffectSource {
  return source.phase === "choice"
    ? { phase: "choice" }
    : { phase: "outcome", outcomeId: source.outcomeId };
}

function encodeScheduledEventIdPart(value: string | number): string {
  const text = String(value);
  return `${text.length}:${text}`;
}

function generateScheduledEventId(
  workingState: GameState,
  context: ScheduleEffectContext,
): string {
  const outcomeSlot =
    context.source.phase === "outcome" ? context.source.outcomeId : "";
  const parts = [
    workingState.runId,
    workingState.currentTurn,
    context.sourceEventId,
    context.sourceEventVersion,
    context.choiceId,
    context.source.phase,
    outcomeSlot,
    context.sourceEffectIndex,
  ];

  return `scheduled_event:v1:${parts
    .map((part) => encodeScheduledEventIdPart(part))
    .join("")}`;
}

function convertTrigger(
  effect: ScheduleEventEffect,
  workingState: GameState,
): ScheduledEventTriggerFields {
  const trigger = effect.followUp.trigger;

  switch (trigger.type) {
    case "turn": {
      const triggerValue = workingState.currentTurn + trigger.afterTurns;
      if (!Number.isFinite(triggerValue)) {
        throw new InternalEffectApplicationError(
          "INVALID_NUMERIC_RESULT",
          "schedule_event turn trigger produced a non-finite result",
        );
      }
      return { triggerType: "turn", triggerValue };
    }
    case "age":
      if (trigger.atAge < workingState.life.age) {
        throw new InternalEffectApplicationError(
          "TRIGGER_IN_THE_PAST",
          `schedule_event age trigger ${trigger.atAge} is before current age ${workingState.life.age}`,
        );
      }
      return { triggerType: "age", triggerValue: trigger.atAge };
    case "season":
      if (trigger.atSeason < workingState.currentSeason) {
        throw new InternalEffectApplicationError(
          "TRIGGER_IN_THE_PAST",
          `schedule_event season trigger ${trigger.atSeason} is before current season ${workingState.currentSeason}`,
        );
      }
      return { triggerType: "season", triggerValue: trigger.atSeason };
    case "condition":
      return {
        triggerType: "condition",
        conditions: structuredClone(trigger.conditions),
      };
    default:
      return assertNever(trigger, "schedule_event trigger");
  }
}

export function applyScheduleEventEffect(
  effect: ScheduleEventEffect,
  workingState: GameState,
  context: ScheduleEffectContext,
): AppliedScheduleEventEffect {
  const triggerFields = convertTrigger(effect, workingState);
  const id = generateScheduledEventId(workingState, context);

  if (workingState.scheduledEvents.some((event) => event.id === id)) {
    throw new InternalEffectApplicationError(
      "SCHEDULED_EVENT_ID_CONFLICT",
      `schedule_event failed: scheduled event ID ${id} already exists`,
    );
  }

  const candidate = {
    id,
    eventId: effect.followUp.eventId,
    sourceEventId: context.sourceEventId,
    priority: effect.followUp.priority,
    createdAtTurn: workingState.currentTurn,
    consumed: false,
    ...triggerFields,
  };
  let validatedScheduledEvent: ScheduledEvent;
  try {
    validatedScheduledEvent = ScheduledEventSchema.parse(candidate);
  } catch (cause) {
    throw new InternalEffectApplicationError(
      "INVALID_INPUT",
      `schedule_event failed: derived scheduled event ${id} is invalid`,
      { cause },
    );
  }

  const scheduledEventForState = structuredClone(validatedScheduledEvent);
  const appliedEffect: AppliedScheduleEventEffect = {
    type: "schedule_event",
    source: copySource(context.source),
    sourceEffectIndex: context.sourceEffectIndex,
    status: "applied",
    requested: { followUp: structuredClone(effect.followUp) },
    previous: { exists: false },
    resulting: {
      exists: true,
      value: structuredClone(validatedScheduledEvent),
    },
  };

  workingState.scheduledEvents.push(scheduledEventForState);
  return appliedEffect;
}
