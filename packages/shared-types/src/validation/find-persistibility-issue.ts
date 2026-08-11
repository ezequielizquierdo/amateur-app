import {
  inspectPersistibility,
  type InspectionIssue,
} from "./inspect-object-graph.js";

export type PersistibilityIssue = InspectionIssue;

export function findPersistibilityIssue(
  value: unknown,
): PersistibilityIssue | undefined {
  return inspectPersistibility(value);
}
