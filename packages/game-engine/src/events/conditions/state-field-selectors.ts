import type {
  AllowedStateConditionField,
  GameState,
} from "@amateur-app/shared-types";

type SelectedStateValue = {
  exists: boolean;
  value: number | string | boolean | undefined;
};

type StateFieldSelector = (state: GameState) => SelectedStateValue;

function present(value: number | string | boolean): SelectedStateValue {
  return { exists: true, value };
}

function optional(
  owner: object,
  key: PropertyKey,
  value: string | undefined,
): SelectedStateValue {
  return { exists: Object.hasOwn(owner, key), value };
}

const STATE_FIELD_SELECTORS: Readonly<
  Record<AllowedStateConditionField, StateFieldSelector>
> = Object.freeze({
  "stats.mood": (state) => present(state.stats.mood),
  "stats.energy": (state) => present(state.stats.energy),
  "stats.health": (state) => present(state.stats.health),
  "stats.family": (state) => present(state.stats.family),
  "stats.friends": (state) => present(state.stats.friends),
  "stats.finances": (state) => present(state.stats.finances),
  "stats.footballLevel": (state) => present(state.stats.footballLevel),
  "footballAttributes.talent": (state) =>
    present(state.footballAttributes.talent),
  "footballAttributes.technique": (state) =>
    present(state.footballAttributes.technique),
  "footballAttributes.physicalCondition": (state) =>
    present(state.footballAttributes.physicalCondition),
  "footballAttributes.tacticalUnderstanding": (state) =>
    present(state.footballAttributes.tacticalUnderstanding),
  "footballAttributes.discipline": (state) =>
    present(state.footballAttributes.discipline),
  "footballAttributes.currentForm": (state) =>
    present(state.footballAttributes.currentForm),
  "footballAttributes.potential": (state) =>
    present(state.footballAttributes.potential),
  "footballAttributes.injuryRisk": (state) =>
    present(state.footballAttributes.injuryRisk),
  "life.age": (state) => present(state.life.age),
  "life.currentYear": (state) => present(state.life.currentYear),
  "life.lifeStage": (state) => present(state.life.lifeStage),
  "life.educationStatus": (state) => present(state.life.educationStatus),
  "life.employmentStatus": (state) => present(state.life.employmentStatus),
  "life.relationshipStatus": (state) => present(state.life.relationshipStatus),
  "life.occupationId": (state) =>
    optional(state.life, "occupationId", state.life.occupationId),
  "life.employerId": (state) =>
    optional(state.life, "employerId", state.life.employerId),
  "life.city": (state) => present(state.life.city),
  "life.country": (state) => present(state.life.country),
  "life.numberOfChildren": (state) => present(state.life.numberOfChildren),
  "life.housingStatus": (state) => present(state.life.housingStatus),
  "football.status": (state) => present(state.football.status),
  "football.careerType": (state) => present(state.football.careerType),
  "football.currentTeamId": (state) =>
    optional(state.football, "currentTeamId", state.football.currentTeamId),
  "football.currentClubId": (state) =>
    optional(state.football, "currentClubId", state.football.currentClubId),
  "football.currentContractId": (state) =>
    optional(
      state.football,
      "currentContractId",
      state.football.currentContractId,
    ),
  "football.currentAgentId": (state) =>
    optional(state.football, "currentAgentId", state.football.currentAgentId),
  "football.teamRole": (state) => present(state.football.teamRole),
  "football.teamTrust": (state) => present(state.football.teamTrust),
  "football.coachTrust": (state) => present(state.football.coachTrust),
  "football.professionalReputation": (state) =>
    present(state.football.professionalReputation),
  "football.amateurReputation": (state) =>
    present(state.football.amateurReputation),
  "football.salary": (state) => present(state.football.salary),
  "football.marketValue": (state) => present(state.football.marketValue),
  "football.isInjured": (state) => present(state.football.isInjured),
  "football.retirementStatus": (state) =>
    present(state.football.retirementStatus),
  currentSeason: (state) => present(state.currentSeason),
  currentTurn: (state) => present(state.currentTurn),
} satisfies Record<AllowedStateConditionField, StateFieldSelector>);

export function selectStateField(
  field: AllowedStateConditionField,
  state: GameState,
): SelectedStateValue {
  const selector = STATE_FIELD_SELECTORS[field];
  if (selector === undefined) {
    throw new TypeError(`Unsupported state condition field: ${field}`);
  }
  return selector(state);
}
