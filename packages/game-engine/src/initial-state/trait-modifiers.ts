import type {
  ChallengingTrait,
  FootballAttributes,
  PlayerStats,
  PositiveTrait,
} from "@amateur-app/shared-types";

export type InitialTraitModifier = {
  readonly stats?: Readonly<Partial<Record<keyof PlayerStats, number>>>;
  readonly footballAttributes?: Readonly<
    Partial<Record<keyof FootballAttributes, number>>
  >;
};

function freezeModifier(
  modifier: InitialTraitModifier,
): Readonly<InitialTraitModifier> {
  if (modifier.stats !== undefined) Object.freeze(modifier.stats);
  if (modifier.footballAttributes !== undefined) {
    Object.freeze(modifier.footballAttributes);
  }
  return Object.freeze(modifier);
}

export const POSITIVE_TRAIT_MODIFIERS = Object.freeze({
  disciplined: freezeModifier({ footballAttributes: { discipline: 15 } }),
  talented: freezeModifier({
    footballAttributes: { talent: 15, potential: 10 },
  }),
  sociable: freezeModifier({ stats: { friends: 12 } }),
  resilient: freezeModifier({ stats: { mood: 10 } }),
  ambitious: freezeModifier({
    footballAttributes: { discipline: 5, potential: 8 },
  }),
  family_oriented: freezeModifier({ stats: { family: 12 } }),
} satisfies Record<PositiveTrait, InitialTraitModifier>);

export const CHALLENGING_TRAIT_MODIFIERS = Object.freeze({
  impulsive: freezeModifier({ footballAttributes: { discipline: -8 } }),
  undisciplined: freezeModifier({
    footballAttributes: { discipline: -18 },
  }),
  insecure: freezeModifier({ stats: { mood: -10 } }),
  individualistic: freezeModifier({ stats: { friends: -8 } }),
  injury_prone: freezeModifier({
    stats: { health: -5 },
    footballAttributes: { injuryRisk: 20 },
  }),
  low_frustration_tolerance: freezeModifier({
    stats: { mood: -8 },
    footballAttributes: { discipline: -4 },
  }),
} satisfies Record<ChallengingTrait, InitialTraitModifier>);
