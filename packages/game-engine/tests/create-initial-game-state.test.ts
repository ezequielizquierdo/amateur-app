import { describe, expect, it, vi } from "vitest";

import {
  calculateFamilySupport,
  createInitialGameState,
  GAME_VERSION,
} from "../src/index.js";
import { createInput, createRelationship } from "./test-fixtures.js";

describe("createInitialGameState", () => {
  it("creates the specified initial state", () => {
    const state = createInitialGameState(createInput());

    expect(state.life).toMatchObject({
      age: 14,
      currentYear: 2026,
      lifeStage: "adolescence",
      educationStatus: "secondary_school",
      employmentStatus: "not_working",
      relationshipStatus: "single",
      numberOfChildren: 0,
      housingStatus: "family_home",
    });
    expect(state.football).toMatchObject({
      status: "without_team",
      careerType: "undecided",
      teamRole: "prospect",
      isInjured: false,
      retirementStatus: "not_retired",
    });
    expect(state.currentSeason).toBe(1);
    expect(state.currentTurn).toBe(0);
    expect(state.status).toBe("active");
    expect(state.history.decisions).toEqual([]);
    expect(state.scheduledEvents).toEqual([]);
  });

  it("produces exactly the same state for the same input", () => {
    const input = createInput();
    expect(createInitialGameState(input)).toEqual(
      createInitialGameState(input),
    );
  });

  it("preserves explicit technical identifiers", () => {
    const state = createInitialGameState(
      createInput({
        runId: "explicit-run",
        profileId: "explicit-profile",
        seed: "explicit-seed",
      }),
    );
    expect(state.runId).toBe("explicit-run");
    expect(state.profile.id).toBe("explicit-profile");
    expect(state.seed).toBe("explicit-seed");
  });

  it("always uses the controlled game version", () => {
    expect(GAME_VERSION).toBe("0.3.0");
    expect(createInitialGameState(createInput()).gameVersion).toBe("0.3.0");
  });

  it("does not invoke clock or randomness sources", () => {
    try {
      vi.spyOn(Math, "random").mockImplementation(() => {
        throw new Error("Math.random must not be called");
      });
      vi.spyOn(Date, "now").mockImplementation(() => {
        throw new Error("Date.now must not be called");
      });
      if (typeof globalThis.crypto?.randomUUID === "function") {
        vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => {
          throw new Error("crypto.randomUUID must not be called");
        });
      }

      const input = createInput({ currentYear: 2040, seed: "caller-seed" });
      const state = createInitialGameState(input);
      expect(state.life.currentYear).toBe(2040);
      expect(state.seed).toBe("caller-seed");
    } finally {
      vi.restoreAllMocks();
    }
  });

  it("preserves surrounding spaces in identifiers", () => {
    const state = createInitialGameState(
      createInput({
        runId: " run-1 ",
        profileId: " profile-1 ",
        seed: " seed-1 ",
      }),
    );
    expect(state.runId).toBe(" run-1 ");
    expect(state.profile.id).toBe(" profile-1 ");
    expect(state.seed).toBe(" seed-1 ");
  });

  it("starts without relationships when none are supplied", () => {
    expect(createInitialGameState(createInput()).relationships).toEqual([]);
  });

  it("does not mutate or retain mutable relationship references", () => {
    const relationship = createRelationship();
    const relationships = [relationship];
    const snapshot = structuredClone(relationships);
    const state = createInitialGameState(
      createInput({ initialRelationships: relationships }),
    );

    expect(relationships).toEqual(snapshot);
    expect(state.relationships).toEqual(relationships);
    expect(state.relationships).not.toBe(relationships);
    expect(state.relationships[0]).not.toBe(relationship);
    expect(state.relationships[0]?.tags).not.toBe(relationship.tags);
  });

  it("calculates football level after both traits", () => {
    const state = createInitialGameState(
      createInput({
        positiveTrait: "talented",
        challengingTrait: "injury_prone",
      }),
    );
    expect(state.footballAttributes.talent).toBe(70);
    expect(state.stats.health).toBe(80);
    expect(state.stats.footballLevel).toBe(49);
  });

  it("allows stats.family and calculated family support to differ", () => {
    const relationship = createRelationship({
      affection: 10,
      trust: 10,
      conflict: 80,
    });
    const state = createInitialGameState(
      createInput({
        positiveTrait: "family_oriented",
        initialRelationships: [relationship],
      }),
    );
    expect(state.stats.family).toBe(77);
    expect(calculateFamilySupport(state.relationships)).toBe(0);
  });

  it.each([
    ["runId", ""],
    ["profileId", " "],
    ["seed", ""],
  ] as const)("rejects an empty %s", (field, value) => {
    expect(() =>
      createInitialGameState(createInput({ [field]: value })),
    ).toThrow(/Invalid game state/);
  });
});
