import type { Relationship } from "@amateur-app/shared-types";

import type { CreateInitialGameStateInput } from "../src/index.js";

export function createRelationship(
  overrides: Partial<Relationship> = {},
): Relationship {
  return {
    id: "relationship-1",
    characterId: "character-1",
    type: "mother",
    displayName: "Mother",
    affection: 80,
    trust: 70,
    conflict: 10,
    isActive: true,
    isAlive: true,
    startedAtAge: 14,
    tags: ["supportive"],
    ...overrides,
  };
}

export function createInput(
  overrides: Partial<CreateInitialGameStateInput> = {},
): CreateInitialGameStateInput {
  return {
    runId: "run-1",
    profileId: "profile-1",
    seed: "seed-1",
    name: "Alex",
    gender: "woman",
    birthCountry: "Argentina",
    birthCity: "Rosario",
    preferredPosition: "midfielder",
    dominantFoot: "right",
    positiveTrait: "disciplined",
    challengingTrait: "insecure",
    currentYear: 2026,
    city: "Rosario",
    country: "Argentina",
    ...overrides,
  };
}
