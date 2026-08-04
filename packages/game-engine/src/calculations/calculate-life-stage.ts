import type { LifeStage } from "@amateur-app/shared-types";

export function calculateLifeStage(age: number): LifeStage {
  if (age < 14 || !Number.isInteger(age)) {
    throw new RangeError("Age must be an integer greater than or equal to 14");
  }
  if (age <= 17) return "adolescence";
  if (age <= 23) return "early_adulthood";
  if (age <= 30) return "adulthood";
  if (age <= 36) return "maturity";
  return "late_career";
}
