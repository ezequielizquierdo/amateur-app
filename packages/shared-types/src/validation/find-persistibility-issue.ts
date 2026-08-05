export type PersistibilityIssue = {
  path: PropertyKey[];
  message: string;
};

function inspect(
  current: unknown,
  path: readonly PropertyKey[],
  ancestors: WeakSet<object>,
): PersistibilityIssue | undefined {
  if (current === undefined) {
    return {
      path: [...path],
      message: "undefined is not a persistible value",
    };
  }

  if (typeof current !== "object" || current === null) return undefined;

  if (ancestors.has(current)) {
    return {
      path: [...path],
      message: "contains a circular reference and is not persistible",
    };
  }

  ancestors.add(current);
  try {
    for (const key of Reflect.ownKeys(current)) {
      const child = (current as Record<PropertyKey, unknown>)[key];
      const issue = inspect(child, [...path, key], ancestors);
      if (issue !== undefined) return issue;
    }
  } finally {
    ancestors.delete(current);
  }

  return undefined;
}

export function findPersistibilityIssue(
  value: unknown,
): PersistibilityIssue | undefined {
  return inspect(value, [], new WeakSet<object>());
}
