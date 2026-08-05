import { describe, expect, it } from "vitest";

import { assertNoExplicitUndefined } from "../src/index.js";

describe("assertNoExplicitUndefined", () => {
  it("accepts an object without undefined", () => {
    expect(() =>
      assertNoExplicitUndefined({
        profile: { name: "Alex" },
        values: [1, null, "ok"],
      }),
    ).not.toThrow();
  });

  it("rejects an explicitly undefined root property", () => {
    expect(() => assertNoExplicitUndefined({ missing: undefined })).toThrow(
      /missing.*undefined is not a persistible value/,
    );
  });

  it("rejects an explicitly undefined nested property", () => {
    expect(() =>
      assertNoExplicitUndefined({
        profile: { birthCity: undefined },
      }),
    ).toThrow(/profile\.birthCity.*undefined is not a persistible value/);
  });

  it("rejects an explicitly undefined array element", () => {
    expect(() => assertNoExplicitUndefined(["ok", undefined])).toThrow(
      /\[1\].*undefined is not a persistible value/,
    );
  });

  it("identifies the complete path of the invalid property", () => {
    expect(() =>
      assertNoExplicitUndefined({
        relationships: [{ tags: ["friend", undefined] }],
      }),
    ).toThrow(
      /relationships\[0\]\.tags\[1\].*undefined is not a persistible value/,
    );
  });

  it("accepts a shared reference that is not circular", () => {
    const shared = { value: "ok" };
    expect(() =>
      assertNoExplicitUndefined({ first: shared, second: shared }),
    ).not.toThrow();
  });

  it("rejects a circular reference", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => assertNoExplicitUndefined(circular)).toThrow(
      /self contains a circular reference and is not persistible/,
    );
  });

  it("does not mutate the received value", () => {
    const value = {
      profile: { name: "Alex" },
      values: [{ nested: true }, "ok"],
    };
    const snapshot = structuredClone(value);
    assertNoExplicitUndefined(value);
    expect(value).toEqual(snapshot);
  });
});
