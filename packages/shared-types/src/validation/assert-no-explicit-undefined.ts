import { inspectUndefinedAndCyclesOnly } from "./inspect-object-graph.js";

function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "$";
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
  const issue = inspectUndefinedAndCyclesOnly(value);
  if (issue !== undefined) {
    throw new Error(
      `Invalid persistible value: ${formatPath(issue.path)} ${issue.message}`,
    );
  }
}
