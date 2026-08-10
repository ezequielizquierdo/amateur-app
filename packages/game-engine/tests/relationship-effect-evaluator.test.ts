import {
  AppliedEffectSchema,
  type AppliedEffectSource,
  type CreateRelationshipEffect,
  type GameState,
  type Relationship,
  type RelationshipValueEffect,
} from "@amateur-app/shared-types";
import { describe, expect, it } from "vitest";

import { applyRelationshipEffect } from "../src/events/effects/apply-relationship-effect.js";
import { InternalEffectApplicationError } from "../src/events/effects/internal-effect-application-error.js";
import { createInitialGameState } from "../src/index.js";
import { createInput, createRelationship } from "./test-fixtures.js";

type SupportedEffect =
  | RelationshipValueEffect
  | CreateRelationshipEffect
  | {
      type: "deactivate_relationship";
      relationshipId: string;
    };

function stateWith(...relationships: Relationship[]): GameState {
  return createInitialGameState(
    createInput({ initialRelationships: relationships }),
  );
}

function apply(
  effect: SupportedEffect,
  state = stateWith(createRelationship()),
  source: AppliedEffectSource = { phase: "choice" },
) {
  const audit = { source, sourceEffectIndex: 4 };
  const records = applyRelationshipEffect(effect, state, audit);
  return { audit, records, state };
}

function expectPersistible(records: readonly unknown[]): void {
  for (const record of records) {
    expect(AppliedEffectSchema.safeParse(record).success).toBe(true);
  }
}

function creationEffect(
  overrides: Partial<CreateRelationshipEffect["relationship"]> = {},
  conflictPolicy: CreateRelationshipEffect["conflictPolicy"] = "error",
): CreateRelationshipEffect {
  return {
    type: "create_relationship",
    relationship: {
      id: "relationship-new",
      characterId: "character-new",
      type: "friend",
      displayName: "New Friend",
      affection: 55,
      trust: 45,
      conflict: 5,
      tags: ["school_friend", "supportive"],
      ...overrides,
    },
    conflictPolicy,
  };
}

describe("applyRelationshipEffect", () => {
  describe("relationship_value selectors", () => {
    it("matches relationshipId exactly", () => {
      const state = stateWith(
        createRelationship({ id: "first" }),
        createRelationship({ id: "second", trust: 20 }),
      );
      const { records } = apply(
        {
          type: "relationship_value",
          selector: { relationshipId: "second" },
          field: "trust",
          operation: "add",
          value: 5,
        },
        state,
      );
      expect(records.map((record) => record.type)).toEqual([
        "relationship_value",
      ]);
      expect(records[0]).toMatchObject({
        relationshipId: "second",
        previous: { exists: true, value: 20 },
        resulting: { exists: true, value: 25 },
      });
      expect(
        state.relationships.map((relationship) => relationship.trust),
      ).toEqual([70, 25]);
    });

    it("matches type without filtering inactive or dead relationships", () => {
      const state = stateWith(
        createRelationship({ id: "active", type: "friend" }),
        createRelationship({ id: "inactive", type: "friend", isActive: false }),
        createRelationship({ id: "dead", type: "friend", isAlive: false }),
        createRelationship({ id: "coach", type: "coach" }),
      );
      const { records } = apply(
        {
          type: "relationship_value",
          selector: { type: "friend" },
          field: "affection",
          operation: "add",
          value: 1,
        },
        state,
      );
      expect(
        records.map(
          (record) =>
            record.type === "relationship_value" && record.relationshipId,
        ),
      ).toEqual(["active", "inactive", "dead"]);
    });

    it("requires every requested tag and permits additional tags", () => {
      const state = stateWith(
        createRelationship({
          id: "all",
          tags: ["school_friend", "supportive", "extra"],
        }),
        createRelationship({ id: "partial", tags: ["school_friend"] }),
      );
      const { records } = apply(
        {
          type: "relationship_value",
          selector: { requiredTags: ["school_friend", "supportive"] },
          field: "conflict",
          operation: "set",
          value: 8,
        },
        state,
      );
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ relationshipId: "all" });
      expect(state.relationships[1]?.conflict).toBe(10);
    });

    it("combines selector criteria with AND", () => {
      const state = stateWith(
        createRelationship({ id: "wanted", type: "friend", tags: ["team"] }),
        createRelationship({ id: "wrong-type", type: "coach", tags: ["team"] }),
        createRelationship({
          id: "wrong-tags",
          type: "friend",
          tags: ["other"],
        }),
      );
      const { records } = apply(
        {
          type: "relationship_value",
          selector: { type: "friend", requiredTags: ["team"] },
          field: "trust",
          operation: "set",
          value: 40,
        },
        state,
      );
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({ relationshipId: "wanted" });
    });

    it("preserves the original relationship order", () => {
      const state = stateWith(
        createRelationship({ id: "third", type: "friend" }),
        createRelationship({ id: "first", type: "friend" }),
        createRelationship({ id: "second", type: "friend" }),
      );
      const { records } = apply(
        {
          type: "relationship_value",
          selector: { type: "friend" },
          field: "trust",
          operation: "add",
          value: 1,
        },
        state,
      );
      expect(
        records.map((record) =>
          record.type === "relationship_value" ? record.relationshipId : "",
        ),
      ).toEqual(["third", "first", "second"]);
    });

    it("rejects a selector with no matches without modifying state", () => {
      const state = stateWith(createRelationship());
      const before = structuredClone(state);
      expect(() =>
        apply(
          {
            type: "relationship_value",
            selector: { relationshipId: "missing" },
            field: "trust",
            operation: "add",
            value: 1,
          },
          state,
        ),
      ).toThrow(InternalEffectApplicationError);
      expect(state).toEqual(before);
      try {
        apply(
          {
            type: "relationship_value",
            selector: { relationshipId: "missing" },
            field: "trust",
            operation: "add",
            value: 1,
          },
          state,
        );
      } catch (error) {
        expect(error).toMatchObject({
          code: "RELATIONSHIP_SELECTOR_NO_MATCH",
        });
      }
    });
  });

  describe("relationship_value operations and audit", () => {
    it.each([
      ["affection", "set", 35.5, 35.5],
      ["trust", "add", 2.5, 72.5],
      ["conflict", "add", -3.5, 6.5],
    ] as const)(
      "applies %s %s with fractional values",
      (field, operation, value, expected) => {
        const { records, state } = apply({
          type: "relationship_value",
          selector: { relationshipId: "relationship-1" },
          field,
          operation,
          value,
        });
        expect(state.relationships[0]?.[field]).toBe(expected);
        expect(records[0]).toMatchObject({
          status: "applied",
          relationshipId: "relationship-1",
          previous: { exists: true },
          resulting: { exists: true, value: expected },
        });
        expectPersistible(records);
      },
    );

    it.each([
      ["trust", 40, 100],
      ["conflict", -40, 0],
    ] as const)("clamps %s to %s", (field, value, expected) => {
      const { records, state } = apply({
        type: "relationship_value",
        selector: { relationshipId: "relationship-1" },
        field,
        operation: "add",
        value,
      });
      expect(state.relationships[0]?.[field]).toBe(expected);
      expect(records[0]).toMatchObject({
        status: "applied",
        resulting: { exists: true, value: expected },
      });
    });

    it("returns no_change without rewriting the value", () => {
      const state = stateWith(createRelationship({ trust: 100 }));
      const relationship = state.relationships[0];
      const { records } = apply(
        {
          type: "relationship_value",
          selector: { relationshipId: "relationship-1" },
          field: "trust",
          operation: "add",
          value: 10,
        },
        state,
      );
      expect(records[0]).toMatchObject({
        status: "no_change",
        previous: { exists: true, value: 100 },
        resulting: { exists: true, value: 100 },
      });
      expect(state.relationships[0]).toBe(relationship);
    });

    it("returns mixed applied and no_change records in relationship order", () => {
      const state = stateWith(
        createRelationship({ id: "max", type: "friend", trust: 100 }),
        createRelationship({ id: "middle", type: "friend", trust: 50 }),
      );
      const { records } = apply(
        {
          type: "relationship_value",
          selector: { type: "friend" },
          field: "trust",
          operation: "add",
          value: 10,
        },
        state,
      );
      expect(records.map((record) => record.status)).toEqual([
        "no_change",
        "applied",
      ]);
      expect(
        state.relationships.map((relationship) => relationship.trust),
      ).toEqual([100, 60]);
    });

    it.each([
      { phase: "choice" } as const,
      { phase: "outcome", outcomeId: "outcome_1" } as const,
    ])("copies source and requested for $phase", (source) => {
      const effect: RelationshipValueEffect = {
        type: "relationship_value",
        selector: { type: "friend", requiredTags: ["shared"] },
        field: "trust",
        operation: "add",
        value: 1,
      };
      const state = stateWith(
        createRelationship({ id: "one", type: "friend", tags: ["shared"] }),
        createRelationship({ id: "two", type: "friend", tags: ["shared"] }),
      );
      const effectBefore = structuredClone(effect);
      const sourceBefore = structuredClone(source);
      const { audit, records } = apply(effect, state, source);

      expect(records).toHaveLength(2);
      expect(records[0]?.sourceEffectIndex).toBe(4);
      expect(records[1]?.sourceEffectIndex).toBe(4);
      expect(records[0]?.source).toEqual(source);
      expect(records[0]?.source).not.toBe(source);
      expect(records[1]?.source).not.toBe(source);
      expect(records[0]?.source).not.toBe(records[1]?.source);
      expect(records[0]?.requested).toEqual({
        selector: { type: "friend", requiredTags: ["shared"] },
        field: "trust",
        operation: "add",
        value: 1,
      });
      expect(records[0]?.requested).not.toBe(records[1]?.requested);
      if (
        records[0]?.type === "relationship_value" &&
        records[1]?.type === "relationship_value"
      ) {
        expect(records[0].requested.selector.requiredTags).not.toBe(
          records[1].requested.selector.requiredTags,
        );
      }
      expect(effect).toEqual(effectBefore);
      expect(source).toEqual(sourceBefore);
      expect(audit.source).toBe(source);
      expectPersistible(records);
    });

    it("precomputes every match before mutating any relationship", () => {
      const state = stateWith(
        createRelationship({ id: "first", type: "friend", trust: 50 }),
        createRelationship({ id: "invalid", type: "friend", trust: 50 }),
      );
      state.relationships[1]!.trust = Number.MAX_VALUE;
      const before = structuredClone(state.relationships);
      expect(() =>
        apply(
          {
            type: "relationship_value",
            selector: { type: "friend" },
            field: "trust",
            operation: "add",
            value: Number.MAX_VALUE,
          },
          state,
        ),
      ).toThrow(InternalEffectApplicationError);
      expect(state.relationships).toEqual(before);
      try {
        apply(
          {
            type: "relationship_value",
            selector: { type: "friend" },
            field: "trust",
            operation: "add",
            value: Number.MAX_VALUE,
          },
          state,
        );
      } catch (error) {
        expect(error).toMatchObject({ code: "INVALID_NUMERIC_RESULT" });
      }
    });
  });

  describe("create_relationship", () => {
    it("creates, validates, and appends a complete relationship", () => {
      const state = stateWith(createRelationship({ id: "existing" }));
      state.life.age = 22;
      const effect = creationEffect();
      const { records } = apply(effect, state);
      const created = state.relationships[1];

      expect(
        state.relationships.map((relationship) => relationship.id),
      ).toEqual(["existing", "relationship-new"]);
      expect(created).toEqual({
        ...effect.relationship,
        startedAtAge: 22,
        isActive: true,
        isAlive: true,
      });
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        type: "create_relationship",
        status: "applied",
        previous: { exists: false },
        resulting: { exists: true, value: created },
      });
      if (records[0]?.type === "create_relationship") {
        expect(records[0].requested).toEqual({
          relationship: effect.relationship,
          conflictPolicy: "error",
        });
        expect(records[0].requested.relationship).not.toHaveProperty(
          "startedAtAge",
        );
        expect(records[0].requested.relationship).not.toHaveProperty(
          "isActive",
        );
        expect(records[0].requested.relationship).not.toHaveProperty("isAlive");
      }
      expectPersistible(records);
    });

    it("does not share relationship or tag references", () => {
      const effect = creationEffect();
      const state = stateWith();
      const { records } = apply(effect, state);
      if (records[0]?.type !== "create_relationship") return;
      const stateRelationship = state.relationships[0];
      const snapshotRelationship = records[0].resulting.value;

      expect(stateRelationship).not.toBe(effect.relationship);
      expect(stateRelationship?.tags).not.toBe(effect.relationship.tags);
      expect(snapshotRelationship).not.toBe(stateRelationship);
      expect(snapshotRelationship.tags).not.toBe(stateRelationship?.tags);
      expect(records[0].requested.relationship).not.toBe(effect.relationship);
      expect(records[0].requested.relationship.tags).not.toBe(
        effect.relationship.tags,
      );

      effect.relationship.tags.push("effect-only");
      stateRelationship?.tags.push("state-only");
      expect(snapshotRelationship.tags).not.toContain("effect-only");
      expect(snapshotRelationship.tags).not.toContain("state-only");
    });

    it("rejects a duplicate ID with error without modifying state", () => {
      const existing = createRelationship({ id: "relationship-new" });
      const state = stateWith(existing);
      const before = structuredClone(state);
      expect(() => apply(creationEffect(), state)).toThrow(
        InternalEffectApplicationError,
      );
      expect(state).toEqual(before);
      try {
        apply(creationEffect(), state);
      } catch (error) {
        expect(error).toMatchObject({ code: "RELATIONSHIP_ID_CONFLICT" });
      }
    });

    it("ignores a duplicate ID with independent complete snapshots", () => {
      const existing = createRelationship({
        id: "relationship-new",
        tags: ["existing"],
      });
      const state = stateWith(existing);
      const before = structuredClone(state);
      const { records } = apply(creationEffect({}, "ignore"), state);
      expect(state).toEqual(before);
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject({
        type: "create_relationship",
        status: "ignored",
        previous: { exists: true, value: existing },
        resulting: { exists: true, value: existing },
      });
      if (records[0]?.type !== "create_relationship") return;
      if (!records[0].previous.exists || !records[0].resulting.exists) {
        throw new Error("Expected complete snapshots for ignored creation");
      }
      expect(records[0].previous.value).not.toBe(state.relationships[0]);
      expect(records[0].resulting.value).not.toBe(state.relationships[0]);
      expect(records[0].previous.value).not.toBe(records[0].resulting.value);
      expect(records[0].previous.value.tags).not.toBe(
        records[0].resulting.value.tags,
      );
      expectPersistible(records);
    });

    it("treats an identical requested definition as an ID conflict", () => {
      const definition = creationEffect().relationship;
      const existing = createRelationship({
        ...definition,
        startedAtAge: 14,
        isActive: true,
        isAlive: true,
      });
      expect(() => apply(creationEffect(), stateWith(existing))).toThrow(
        InternalEffectApplicationError,
      );
    });

    it("allows the same characterId with a different relationship ID", () => {
      const state = stateWith(
        createRelationship({ id: "existing", characterId: "shared" }),
      );
      const { records } = apply(
        creationEffect({ id: "different", characterId: "shared" }),
        state,
      );
      expect(records[0]?.status).toBe("applied");
      expect(state.relationships).toHaveLength(2);
    });

    it("validates the completed relationship before push", () => {
      const state = stateWith();
      state.life.age = -1;
      const beforeLength = state.relationships.length;
      expect(() => apply(creationEffect(), state)).toThrow(
        InternalEffectApplicationError,
      );
      expect(state.relationships).toHaveLength(beforeLength);
      try {
        apply(creationEffect(), state);
      } catch (error) {
        expect(error).toMatchObject({ code: "INVALID_INPUT" });
        expect(error).toHaveProperty("cause");
      }
    });
  });

  describe("deactivate_relationship", () => {
    it("deactivates an active relationship without changing other fields", () => {
      const relationship = createRelationship({ tags: ["one", "two"] });
      const state = stateWith(relationship);
      const before = structuredClone(state.relationships[0]);
      const { records } = apply(
        {
          type: "deactivate_relationship",
          relationshipId: relationship.id,
        },
        state,
      );
      expect(state.relationships).toEqual([{ ...before, isActive: false }]);
      expect(records[0]).toMatchObject({
        type: "deactivate_relationship",
        status: "applied",
        previous: { exists: true, value: before },
        resulting: { exists: true, value: { ...before, isActive: false } },
      });
      expectPersistible(records);
    });

    it("returns no_change for an already inactive relationship", () => {
      const relationship = createRelationship({ isActive: false });
      const state = stateWith(relationship);
      const beforeReference = state.relationships[0];
      const { records } = apply(
        {
          type: "deactivate_relationship",
          relationshipId: relationship.id,
        },
        state,
      );
      expect(records[0]?.status).toBe("no_change");
      expect(state.relationships[0]).toBe(beforeReference);
      expectPersistible(records);
    });

    it("rejects a missing relationship without modifying state", () => {
      const state = stateWith(createRelationship());
      const before = structuredClone(state);
      expect(() =>
        apply(
          { type: "deactivate_relationship", relationshipId: "missing" },
          state,
        ),
      ).toThrow(InternalEffectApplicationError);
      expect(state).toEqual(before);
      try {
        apply(
          { type: "deactivate_relationship", relationshipId: "missing" },
          state,
        );
      } catch (error) {
        expect(error).toMatchObject({ code: "RELATIONSHIP_NOT_FOUND" });
      }
    });

    it.each([
      [true, "applied"],
      [false, "no_change"],
    ] as const)(
      "handles a dead relationship with isActive %s",
      (isActive, status) => {
        const relationship = createRelationship({ isAlive: false, isActive });
        const { records, state } = apply(
          {
            type: "deactivate_relationship",
            relationshipId: relationship.id,
          },
          stateWith(relationship),
        );
        expect(records[0]?.status).toBe(status);
        expect(state.relationships[0]?.isAlive).toBe(false);
        expect(state.relationships[0]?.isActive).toBe(false);
      },
    );

    it("creates independent complete snapshots", () => {
      const state = stateWith(createRelationship({ tags: ["original"] }));
      const effect = {
        type: "deactivate_relationship" as const,
        relationshipId: "relationship-1",
      };
      const effectBefore = structuredClone(effect);
      const { records } = apply(effect, state);
      if (records[0]?.type !== "deactivate_relationship") return;
      expect(records[0].previous.value).not.toBe(state.relationships[0]);
      expect(records[0].resulting.value).not.toBe(state.relationships[0]);
      expect(records[0].previous.value).not.toBe(records[0].resulting.value);
      expect(records[0].previous.value.tags).not.toBe(
        records[0].resulting.value.tags,
      );
      state.relationships[0]?.tags.push("state-only");
      expect(records[0].previous.value.tags).toEqual(["original"]);
      expect(records[0].resulting.value.tags).toEqual(["original"]);
      expect(effect).toEqual(effectBefore);
    });
  });

  it("is deterministic and does not mutate audit or effect", () => {
    const effect: RelationshipValueEffect = {
      type: "relationship_value",
      selector: { relationshipId: "relationship-1" },
      field: "trust",
      operation: "add",
      value: 2,
    };
    const source: AppliedEffectSource = {
      phase: "outcome",
      outcomeId: "outcome_1",
    };
    const effectBefore = structuredClone(effect);
    const sourceBefore = structuredClone(source);
    const first = apply(effect, undefined, source);
    const second = apply(effect, undefined, source);
    expect(first.state).toEqual(second.state);
    expect(first.records).toEqual(second.records);
    expect(effect).toEqual(effectBefore);
    expect(source).toEqual(sourceBefore);
    expect(first.audit.source).toBe(source);
  });
});
