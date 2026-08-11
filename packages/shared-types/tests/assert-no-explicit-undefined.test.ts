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

  it("rejects undefined in Symbol-keyed and non-enumerable data properties", () => {
    const symbol = Symbol("missing");
    const value: Record<PropertyKey, unknown> = { [symbol]: undefined };
    Object.defineProperty(value, "hidden", {
      enumerable: false,
      value: undefined,
    });

    expect(() => assertNoExplicitUndefined(value)).toThrow(
      /undefined is not a persistible value/,
    );
    delete value[symbol];
    expect(() => assertNoExplicitUndefined(value)).toThrow(
      /hidden.*undefined is not a persistible value/,
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

  it("rejects an indirect circular reference", () => {
    const first: Record<string, unknown> = {};
    const second: Record<string, unknown> = { first };
    first.second = second;

    expect(() => assertNoExplicitUndefined(first)).toThrow(
      /second\.first contains a circular reference/,
    );
  });

  it("does not execute or reject an accessor only for existing", () => {
    let getterCalls = 0;
    const value = {};
    Object.defineProperty(value, "computed", {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error("boom");
      },
    });

    expect(() => assertNoExplicitUndefined(value)).not.toThrow();
    expect(getterCalls).toBe(0);
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
