export type InspectionIssue = {
  path: PropertyKey[];
  message: string;
};

type InspectionPolicy = "persistibility" | "undefined-and-cycles";

type ReflectionResult<T> =
  { ok: true; value: T } | { ok: false; issue: InspectionIssue };

const MAX_ARRAY_INDEX = 2 ** 32 - 1;

function issue(path: readonly PropertyKey[], message: string): InspectionIssue {
  return { path: [...path], message };
}

function reflectionIssue(path: readonly PropertyKey[]): InspectionIssue {
  return issue(path, "could not be inspected safely and is not persistible");
}

function ownKeys(
  value: object,
  path: readonly PropertyKey[],
): ReflectionResult<Array<string | symbol>> {
  try {
    return { ok: true, value: Reflect.ownKeys(value) };
  } catch {
    return { ok: false, issue: reflectionIssue(path) };
  }
}

function descriptor(
  value: object,
  key: PropertyKey,
  path: readonly PropertyKey[],
): ReflectionResult<PropertyDescriptor> {
  try {
    const result = Object.getOwnPropertyDescriptor(value, key);
    return result === undefined
      ? { ok: false, issue: reflectionIssue(path) }
      : { ok: true, value: result };
  } catch {
    return { ok: false, issue: reflectionIssue(path) };
  }
}

function prototype(
  value: object,
  path: readonly PropertyKey[],
): ReflectionResult<object | null> {
  try {
    return { ok: true, value: Object.getPrototypeOf(value) as object | null };
  } catch {
    return { ok: false, issue: reflectionIssue(path) };
  }
}

function arrayKind(
  value: object,
  path: readonly PropertyKey[],
): ReflectionResult<boolean> {
  try {
    return { ok: true, value: Array.isArray(value) };
  } catch {
    return { ok: false, issue: reflectionIssue(path) };
  }
}

function isCanonicalArrayIndex(key: string): boolean {
  const index = Number(key);
  return (
    Number.isInteger(index) &&
    index >= 0 &&
    index < MAX_ARRAY_INDEX &&
    String(index) === key
  );
}

function inspectPrimitive(
  value: unknown,
  path: readonly PropertyKey[],
  policy: InspectionPolicy,
): InspectionIssue | undefined {
  if (value === undefined) {
    return issue(path, "undefined is not a persistible value");
  }
  if (policy === "undefined-and-cycles" || value === null) return undefined;

  switch (typeof value) {
    case "string":
    case "boolean":
      return undefined;
    case "number":
      return Number.isFinite(value)
        ? undefined
        : issue(path, "non-finite number is not a persistible value");
    case "bigint":
      return issue(path, "bigint is not a persistible value");
    case "symbol":
      return issue(path, "Symbol value is not persistible");
    case "function":
      return issue(path, "function is not a persistible value");
    default:
      return undefined;
  }
}

function inspectArray(
  value: object,
  path: readonly PropertyKey[],
  ancestors: WeakSet<object>,
): InspectionIssue | undefined {
  const prototypeResult = prototype(value, path);
  if (!prototypeResult.ok) return prototypeResult.issue;
  if (prototypeResult.value !== Array.prototype) {
    return issue(path, "array has an unsupported prototype");
  }

  const ownKeysResult = ownKeys(value, path);
  if (!ownKeysResult.ok) return ownKeysResult.issue;

  let lengthValue: number | undefined;
  const indexDescriptors: Array<[string, PropertyDescriptor]> = [];

  for (const key of ownKeysResult.value) {
    if (typeof key === "symbol") {
      return issue(path, `own Symbol key ${String(key)} is not persistible`);
    }

    const propertyPath = [...path, key];
    const descriptorResult = descriptor(value, key, propertyPath);
    if (!descriptorResult.ok) return descriptorResult.issue;
    const propertyDescriptor = descriptorResult.value;
    if (!("value" in propertyDescriptor)) {
      return issue(propertyPath, "accessor property is not persistible");
    }

    if (key === "length") {
      if (
        typeof propertyDescriptor.value !== "number" ||
        !Number.isInteger(propertyDescriptor.value) ||
        propertyDescriptor.value < 0 ||
        propertyDescriptor.value > MAX_ARRAY_INDEX
      ) {
        return issue(propertyPath, "array length descriptor is invalid");
      }
      lengthValue = propertyDescriptor.value;
      continue;
    }

    if (!isCanonicalArrayIndex(key)) {
      return issue(propertyPath, "custom array property is not persistible");
    }
    indexDescriptors.push([key, propertyDescriptor]);
  }

  if (lengthValue === undefined) {
    return issue(path, "array length descriptor is missing");
  }
  if (indexDescriptors.length !== lengthValue) {
    return issue(path, "sparse array is not persistible");
  }

  for (const [key, propertyDescriptor] of indexDescriptors) {
    const childIssue = inspect(
      propertyDescriptor.value,
      [...path, key],
      ancestors,
      "persistibility",
    );
    if (childIssue !== undefined) return childIssue;
  }
  return undefined;
}

function inspectObject(
  value: object,
  path: readonly PropertyKey[],
  ancestors: WeakSet<object>,
): InspectionIssue | undefined {
  const prototypeResult = prototype(value, path);
  if (!prototypeResult.ok) return prototypeResult.issue;
  if (
    prototypeResult.value !== Object.prototype &&
    prototypeResult.value !== null
  ) {
    return issue(path, "object has an unsupported prototype");
  }

  const ownKeysResult = ownKeys(value, path);
  if (!ownKeysResult.ok) return ownKeysResult.issue;
  for (const key of ownKeysResult.value) {
    if (typeof key === "symbol") {
      return issue(path, `own Symbol key ${String(key)} is not persistible`);
    }

    const propertyPath = [...path, key];
    const descriptorResult = descriptor(value, key, propertyPath);
    if (!descriptorResult.ok) return descriptorResult.issue;
    const propertyDescriptor = descriptorResult.value;
    if (!("value" in propertyDescriptor)) {
      return issue(propertyPath, "accessor property is not persistible");
    }
    if (propertyDescriptor.enumerable !== true) {
      return issue(propertyPath, "non-enumerable property is not persistible");
    }

    const childIssue = inspect(
      propertyDescriptor.value,
      propertyPath,
      ancestors,
      "persistibility",
    );
    if (childIssue !== undefined) return childIssue;
  }
  return undefined;
}

function inspectUndefinedAndCycles(
  value: object,
  path: readonly PropertyKey[],
  ancestors: WeakSet<object>,
): InspectionIssue | undefined {
  const ownKeysResult = ownKeys(value, path);
  if (!ownKeysResult.ok) return ownKeysResult.issue;
  for (const key of ownKeysResult.value) {
    const propertyPath = [...path, key];
    const descriptorResult = descriptor(value, key, propertyPath);
    if (!descriptorResult.ok) return descriptorResult.issue;
    const propertyDescriptor = descriptorResult.value;
    if (!("value" in propertyDescriptor)) continue;

    const childIssue = inspect(
      propertyDescriptor.value,
      propertyPath,
      ancestors,
      "undefined-and-cycles",
    );
    if (childIssue !== undefined) return childIssue;
  }
  return undefined;
}

function inspect(
  current: unknown,
  path: readonly PropertyKey[],
  ancestors: WeakSet<object>,
  policy: InspectionPolicy,
): InspectionIssue | undefined {
  const primitiveIssue = inspectPrimitive(current, path, policy);
  if (primitiveIssue !== undefined) return primitiveIssue;
  if (
    (typeof current !== "object" || current === null) &&
    typeof current !== "function"
  ) {
    return undefined;
  }
  if (typeof current === "function") return undefined;

  if (ancestors.has(current)) {
    return issue(path, "contains a circular reference and is not persistible");
  }

  ancestors.add(current);
  try {
    if (policy === "undefined-and-cycles") {
      return inspectUndefinedAndCycles(current, path, ancestors);
    }
    const arrayKindResult = arrayKind(current, path);
    if (!arrayKindResult.ok) return arrayKindResult.issue;
    return arrayKindResult.value
      ? inspectArray(current, path, ancestors)
      : inspectObject(current, path, ancestors);
  } finally {
    ancestors.delete(current);
  }
}

export function inspectPersistibility(
  value: unknown,
): InspectionIssue | undefined {
  return inspect(value, [], new WeakSet<object>(), "persistibility");
}

export function inspectUndefinedAndCyclesOnly(
  value: unknown,
): InspectionIssue | undefined {
  return inspect(value, [], new WeakSet<object>(), "undefined-and-cycles");
}
