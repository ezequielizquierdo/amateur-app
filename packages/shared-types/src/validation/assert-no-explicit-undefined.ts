function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "state";
  return path
    .map((part, index) =>
      typeof part === "symbol"
        ? `[${String(part)}]`
        : typeof part === "number" || /^\d+$/.test(part)
          ? `[${String(part)}]`
          : index === 0
            ? part
            : `.${part}`,
    )
    .join("");
}

export function assertNoExplicitUndefined(value: unknown): void {
  const ancestors = new WeakSet<object>();

  function inspect(current: unknown, path: readonly PropertyKey[]): void {
    if (typeof current !== "object" || current === null) return;
    if (ancestors.has(current)) {
      throw new Error(
        `Invalid game state: ${formatPath(path)} contains a circular reference and is not persistible`,
      );
    }

    ancestors.add(current);
    try {
      for (const key of Reflect.ownKeys(current)) {
        const child = (current as Record<PropertyKey, unknown>)[key];
        const childPath = [...path, key];
        if (child === undefined) {
          throw new Error(
            `Invalid game state: ${formatPath(childPath)} is explicitly undefined; undefined is not a persistible value`,
          );
        }
        inspect(child, childPath);
      }
    } finally {
      ancestors.delete(current);
    }
  }

  inspect(value, []);
}
