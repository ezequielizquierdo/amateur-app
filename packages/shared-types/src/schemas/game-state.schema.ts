import { z } from "zod";

import {
  NonEmptyStringSchema,
  NonNegativeIntegerSchema,
} from "./common.schema.js";
import { FootballAttributesSchema } from "./football-attributes.schema.js";
import { FootballStateSchema } from "./football.schema.js";
import { GameHistorySchema } from "./history.schema.js";
import { LifeStateSchema } from "./life.schema.js";
import { PlayerProfileSchema } from "./profile.schema.js";
import { RelationshipSchema } from "./relationship.schema.js";
import { ScheduledEventSchema } from "./scheduled-event.schema.js";
import { PlayerStatsSchema } from "./stats.schema.js";
import { persistibleSchema } from "../validation/persistible-schema.js";

export const GameRunStatusSchema = z.enum(["active", "finished"]);

function addDuplicateIdIssues(
  items: readonly { id: string }[],
  collection: "relationships" | "scheduledEvents",
  label: "relationship" | "scheduled event",
  context: z.RefinementCtx,
): void {
  const seenIds = new Set<string>();

  for (const [index, item] of items.entries()) {
    if (seenIds.has(item.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate ${label} id "${item.id}"`,
        path: [collection, index, "id"],
      });
    } else {
      seenIds.add(item.id);
    }
  }
}

const GameStateStructuralSchema = z
  .object({
    runId: NonEmptyStringSchema,
    gameVersion: NonEmptyStringSchema,
    seed: NonEmptyStringSchema,
    profile: PlayerProfileSchema,
    stats: PlayerStatsSchema,
    footballAttributes: FootballAttributesSchema,
    life: LifeStateSchema,
    football: FootballStateSchema,
    relationships: z.array(RelationshipSchema),
    history: GameHistorySchema,
    scheduledEvents: z.array(ScheduledEventSchema),
    currentSeason: z.number().int().min(1),
    currentTurn: NonNegativeIntegerSchema,
    currentEventId: NonEmptyStringSchema.optional(),
    status: GameRunStatusSchema,
    endingId: NonEmptyStringSchema.optional(),
  })
  .strict()
  .superRefine((state, context) => {
    addDuplicateIdIssues(
      state.relationships,
      "relationships",
      "relationship",
      context,
    );
    addDuplicateIdIssues(
      state.scheduledEvents,
      "scheduledEvents",
      "scheduled event",
      context,
    );
    if (state.life.age < state.profile.startingAge) {
      context.addIssue({
        code: "custom",
        message: "Current age cannot be lower than startingAge",
        path: ["life", "age"],
      });
    }
    if (state.status === "finished" && state.endingId === undefined) {
      context.addIssue({
        code: "custom",
        message: "A finished game requires endingId",
        path: ["endingId"],
      });
    }
    if (state.status === "active" && state.endingId !== undefined) {
      context.addIssue({
        code: "custom",
        message: "An active game cannot have endingId",
        path: ["endingId"],
      });
    }
  });

export const GameStateSchema = persistibleSchema(GameStateStructuralSchema);
