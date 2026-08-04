import { z } from "zod";

export const NonEmptyStringSchema = z
  .string()
  .refine((value) => value.trim().length > 0, "String cannot be empty");
export const ScaleSchema = z.number().finite().min(0).max(100);
export const NonNegativeIntegerSchema = z.number().int().nonnegative();
export const NonNegativeNumberSchema = z.number().finite().nonnegative();

export const PlayerGenderSchema = z.enum(["woman", "man"]);
export const DominantFootSchema = z.enum(["left", "right"]);
export const FootballPositionSchema = z.enum([
  "goalkeeper",
  "defender",
  "midfielder",
  "forward",
]);
export const PositiveTraitSchema = z.enum([
  "disciplined",
  "talented",
  "sociable",
  "resilient",
  "ambitious",
  "family_oriented",
]);
export const ChallengingTraitSchema = z.enum([
  "impulsive",
  "undisciplined",
  "insecure",
  "individualistic",
  "injury_prone",
  "low_frustration_tolerance",
]);
export const EffectIntensitySchema = z.enum(["minor", "medium", "major"]);
