# Simulador narrativo de vida y fútbol

## Especificación funcional del estado de la partida — Versión 0.1

### 1. Objetivo

Definir el modelo central de información que representa la vida y la carrera futbolística del personaje durante una partida.

Este modelo debe permitir:

* comenzar la historia a los 14 años;
* representar personajes hombres o mujeres;
* recorrer caminos profesionales, amateurs o mixtos;
* registrar el impacto de las decisiones;
* recordar acontecimientos anteriores;
* administrar relaciones individuales;
* programar consecuencias futuras;
* calcular indicadores derivados;
* guardar y recuperar una partida;
* ampliar el juego sin modificar toda la arquitectura.

El estado de la partida será la única fuente de verdad del juego.

---

# 2. Principios del modelo

## 2.1. Separación de responsabilidades

El estado se divide en bloques independientes:

1. Perfil e identidad.
2. Indicadores visibles.
3. Atributos futbolísticos internos.
4. Situación de vida.
5. Situación futbolística.
6. Relaciones.
7. Historial y memoria narrativa.
8. Consecuencias programadas.
9. Información técnica de la partida.

Cada bloque representa un aspecto diferente del personaje.

## 2.2. El estado no contiene lógica visual

El modelo no debe saber:

* cómo se dibuja una barra;
* qué pantalla está abierta;
* qué animación se está mostrando;
* qué componente de React utiliza el dato.

La interfaz solamente interpreta el estado.

## 2.3. El estado no decide el siguiente acontecimiento

En esta etapa, el modelo almacena la información necesaria para que, posteriormente, el motor de acontecimientos pueda determinar qué situación debe aparecer.

## 2.4. Los datos importantes deben ser persistibles

Todo dato que pueda modificar una decisión futura debe poder guardarse.

Los valores aceptados por una frontera persistible representan datos JSON y no deben perder contenido semánticamente relevante durante un JSON round-trip. No se exige conservar la identidad de referencias compartidas, el prototype nulo, los atributos `writable` o `configurable`, ni distinguir semánticamente `0` de `-0`.

Ejemplos:

* faltar a un partido importante;
* abandonar el colegio;
* prometer no mudarse;
* ser rechazado por un club;
* tener una mala relación con un representante;
* pedir disculpas a un equipo anterior.

---

# 3. Perfil del personaje

El perfil contiene datos relativamente permanentes.

```ts
type PlayerGender = "woman" | "man";

type DominantFoot = "left" | "right";

type FootballPosition =
  | "goalkeeper"
  | "defender"
  | "midfielder"
  | "forward";

type PlayerProfile = {
  id: string;
  name: string;
  gender: PlayerGender;
  birthCountry: string;
  birthCity?: string;
  preferredPosition: FootballPosition;
  dominantFoot: DominantFoot;
  startingAge: 14;
  positiveTrait: PositiveTrait;
  challengingTrait: ChallengingTrait;
};
```

## Reglas

* En el MVP, la edad inicial siempre será 14.
* El usuario podrá elegir hombre o mujer.
* La posición inicial será general.
* Las posiciones específicas podrán agregarse posteriormente.
* El nombre no puede estar vacío.
* El personaje debe tener un rasgo positivo y uno desafiante.

---

# 4. Rasgos iniciales

## 4.1. Rasgos positivos

```ts
type PositiveTrait =
  | "disciplined"
  | "talented"
  | "sociable"
  | "resilient"
  | "ambitious"
  | "family_oriented";
```

Significado:

* `disciplined`: mejora la constancia y la relación con entrenadores.
* `talented`: aumenta la capacidad futbolística inicial y el potencial.
* `sociable`: facilita amistades, vínculos y adaptación.
* `resilient`: reduce el impacto emocional de derrotas y rechazos.
* `ambitious`: favorece el crecimiento, pero puede aumentar sacrificios.
* `family_oriented`: comienza con vínculos familiares más sólidos.

## 4.2. Rasgos desafiantes

```ts
type ChallengingTrait =
  | "impulsive"
  | "undisciplined"
  | "insecure"
  | "individualistic"
  | "injury_prone"
  | "low_frustration_tolerance";
```

Significado:

* `impulsive`: aumenta la posibilidad de decisiones conflictivas.
* `undisciplined`: dificulta entrenamientos, estudios y compromisos.
* `insecure`: aumenta el impacto de suplencias, críticas y rechazos.
* `individualistic`: dificulta la confianza de equipos y compañeros.
* `injury_prone`: aumenta el riesgo físico.
* `low_frustration_tolerance`: facilita crisis de ánimo y abandono.

Los rasgos deben modificar valores o probabilidades. No serán solamente etiquetas narrativas.

---

# 5. Indicadores visibles

El usuario verá siete indicadores principales.

```ts
type PlayerStats = {
  mood: number;
  energy: number;
  health: number;
  family: number;
  friends: number;
  finances: number;
  footballLevel: number;
};
```

Todos los valores deben permanecer entre `0` y `100`.

## 5.1. Ánimo

Representa:

* motivación;
* bienestar emocional;
* entusiasmo;
* capacidad para afrontar dificultades.

Un ánimo bajo puede habilitar:

* deseos de abandonar;
* discusiones;
* malas actuaciones;
* aislamiento;
* decisiones impulsivas.

## 5.2. Energía

Representa:

* cansancio;
* descanso;
* disponibilidad física y mental;
* acumulación de obligaciones.

Una energía baja puede provocar:

* peor rendimiento;
* ausencias;
* errores;
* mayor riesgo de lesión;
* conflictos laborales o familiares.

## 5.3. Salud

Representa:

* estado físico general;
* recuperación;
* enfermedades;
* lesiones.

La salud no equivale al riesgo de lesión. Un personaje puede estar sano, pero tener una predisposición elevada a lesionarse.

## 5.4. Familia

Es un resumen visible de los vínculos familiares.

No reemplaza las relaciones individuales. Se calcula o ajusta considerando:

* padres;
* hermanos;
* abuelos;
* pareja;
* hijos;
* familiares relevantes.

## 5.5. Amigos

Representa:

* vida social;
* amistades;
* pertenencia;
* apoyo fuera de la familia;
* relación general con el grupo.

## 5.6. Economía

Representa:

* estabilidad económica;
* capacidad para afrontar gastos;
* dependencia de un trabajo;
* presión para aceptar contratos u ofertas.

No representa una cantidad monetaria exacta.

## 5.7. Nivel futbolístico

Es un indicador derivado de los atributos futbolísticos internos.

No debe modificarse directamente como efecto normal de un acontecimiento. Los acontecimientos deben modificar los atributos que lo componen y luego recalcularlo.

---

# 6. Atributos futbolísticos internos

```ts
type FootballAttributes = {
  talent: number;
  technique: number;
  physicalCondition: number;
  tacticalUnderstanding: number;
  discipline: number;
  currentForm: number;
  potential: number;
  injuryRisk: number;
};
```

Todos los valores deben estar entre `0` y `100`.

## Funciones

* `talent`: habilidad natural. Cambia poco durante la partida.
* `technique`: mejora con práctica y entrenamiento.
* `physicalCondition`: depende de edad, actividad, descanso y lesiones.
* `tacticalUnderstanding`: aumenta con experiencia.
* `discipline`: influye en entrenamientos, puntualidad y compromisos.
* `currentForm`: rendimiento reciente.
* `potential`: techo de desarrollo estimado.
* `injuryRisk`: probabilidad relativa de sufrir una lesión.

## Cálculo inicial del nivel futbolístico

```ts
footballLevel =
  talent * 0.10 +
  technique * 0.30 +
  physicalCondition * 0.25 +
  tacticalUnderstanding * 0.20 +
  currentForm * 0.15;
```

El resultado debe redondearse y limitarse al rango de `0` a `100`.

El potencial no forma parte del nivel actual. Representa cuánto podría crecer el personaje.

---

# 7. Situación de vida

```ts
type LifeStage =
  | "adolescence"
  | "early_adulthood"
  | "adulthood"
  | "maturity"
  | "late_career";

type EducationStatus =
  | "secondary_school"
  | "secondary_completed"
  | "secondary_abandoned"
  | "university"
  | "university_paused"
  | "university_completed"
  | "not_studying";

type EmploymentStatus =
  | "not_working"
  | "part_time"
  | "full_time"
  | "self_employed"
  | "unemployed"
  | "retired";

type RelationshipStatus =
  | "single"
  | "dating"
  | "committed"
  | "married"
  | "separated"
  | "widowed";

type HousingStatus =
  | "family_home"
  | "renting"
  | "owner"
  | "club_housing"
  | "shared_housing"
  | "temporary";

type LifeState = {
  age: number;
  currentYear: number;
  lifeStage: LifeStage;

  educationStatus: EducationStatus;
  employmentStatus: EmploymentStatus;
  relationshipStatus: RelationshipStatus;

  occupationId?: string;
  employerId?: string;

  city: string;
  country: string;

  numberOfChildren: number;
  petIds: string[];

  housingStatus: HousingStatus;
};
```

## Estado inicial

Al comenzar:

```ts
{
  age: 14,
  lifeStage: "adolescence",
  educationStatus: "secondary_school",
  employmentStatus: "not_working",
  relationshipStatus: "single",
  numberOfChildren: 0,
  petIds: [],
  housingStatus: "family_home"
}
```

## Etapas por edad

Como regla inicial:

```text
14–17: adolescence
18–23: early_adulthood
24–30: adulthood
31–36: maturity
37 o más: late_career
```

La función que calcula la etapa debe estar centralizada.

---

# 8. Situación futbolística

```ts
type FootballStatus =
  | "school_team"
  | "friends_team"
  | "trying_out"
  | "academy"
  | "reserve"
  | "professional"
  | "semi_professional"
  | "amateur"
  | "without_team"
  | "retired";

type CareerType =
  | "undecided"
  | "professional_path"
  | "amateur_path"
  | "mixed";

type TeamRole =
  | "prospect"
  | "substitute"
  | "rotation"
  | "starter"
  | "important"
  | "captain"
  | "excluded";

type RetirementStatus =
  | "not_retired"
  | "considering"
  | "temporarily_retired"
  | "permanently_retired";

type FootballState = {
  status: FootballStatus;
  careerType: CareerType;

  currentTeamId?: string;
  currentClubId?: string;
  currentContractId?: string;
  currentAgentId?: string;

  teamRole: TeamRole;
  teamTrust: number;
  coachTrust: number;

  professionalReputation: number;
  amateurReputation: number;

  salary: number;
  marketValue: number;

  seasonMatches: number;
  seasonGoals: number;
  seasonAssists: number;

  careerMatches: number;
  careerGoals: number;
  careerAssists: number;

  isInjured: boolean;
  currentInjuryId?: string;

  retirementStatus: RetirementStatus;
};
```

## Estado inicial

```ts
{
  status: "without_team",
  careerType: "undecided",

  teamRole: "prospect",
  teamTrust: 0,
  coachTrust: 0,

  professionalReputation: 0,
  amateurReputation: 0,

  salary: 0,
  marketValue: 0,

  seasonMatches: 0,
  seasonGoals: 0,
  seasonAssists: 0,

  careerMatches: 0,
  careerGoals: 0,
  careerAssists: 0,

  isInjured: false,
  retirementStatus: "not_retired"
}
```

El primer acontecimiento narrativo decidirá si el personaje se incorpora a un equipo escolar, acepta jugar con amigos o comienza a buscar una prueba profesional.

---

# 9. Relaciones individuales

```ts
type RelationshipType =
  | "mother"
  | "father"
  | "sibling"
  | "grandparent"
  | "aunt_uncle"
  | "partner"
  | "child"
  | "friend"
  | "teammate"
  | "coach"
  | "agent";

type Relationship = {
  id: string;
  characterId: string;
  type: RelationshipType;
  displayName: string;

  affection: number;
  trust: number;
  conflict: number;

  isActive: boolean;
  isAlive: boolean;

  startedAtAge: number;
  tags: string[];
};
```

Los campos `affection`, `trust` y `conflict` estarán entre `0` y `100`.

## Principios

* Una relación puede continuar existiendo aunque no esté activa.
* Una expareja puede quedar registrada con `isActive: false`.
* Un familiar fallecido permanece en la historia con `isAlive: false`.
* Los tags permiten identificar relaciones narrativas particulares.
* Dentro de un `GameState`, cada `Relationship.id` debe ser único en `relationships`. La comparación es exacta y case-sensitive, sin trim, lowercase ni normalización.
* `Relationship.characterId` no tiene unicidad de colección. Dos relaciones pueden apuntar al mismo personaje si sus `Relationship.id` son diferentes; por ejemplo, `alex_friend` y `alex_teammate` pueden compartir `characterId: "alex"`.

Ejemplos de tags:

```ts
[
  "favorite_aunt",
  "strict_parent",
  "childhood_friend",
  "team_captain",
  "supportive_partner",
  "dishonest_agent"
]
```

---

# 10. Historial y memoria narrativa

```ts
type JsonPrimitive = string | number | boolean | null;

type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

type AppliedEffectSource =
  | { phase: "choice" }
  | { phase: "outcome"; outcomeId: string };

type AppliedEffect =
  | AppliedPlayerStatEffect
  | AppliedFootballAttributeEffect
  | AppliedLifeStateEffect
  | AppliedFootballStateEffect
  | AppliedFlagEffect
  | AppliedCounterEffect
  | AppliedRelationshipValueEffect
  | AppliedCreateRelationshipEffect
  | AppliedDeactivateRelationshipEffect
  | AppliedScheduleEventEffect;

type DecisionRecord = {
  eventId: string;
  eventVersion: number;
  choiceId: string;
  outcomeId?: string;
  age: number;
  season: number;
  turn: number;
  immediateEffects: AppliedEffect[];
};

type HistoryFlagValue = boolean | number | string;

type HistoryKey = string;

type GameHistory = {
  decisions: DecisionRecord[];
  flags: Record<HistoryKey, HistoryFlagValue>;
  counters: Record<HistoryKey, number>;

  completedEventIds: string[];
  recentEventIds: string[];

  formerTeamIds: string[];
  formerClubIds: string[];
};
```

`eventVersion` es un entero positivo obligatorio y no recibe un valor por defecto silencioso. `outcomeId` está ausente cuando la decisión no produjo un resultado probabilístico.

`HistoryKey` utiliza el formato `^[a-z0-9]+(?:_[a-z0-9]+)*$`. `accepted_offer`, `missed_matches` y `counter_2` son ejemplos válidos; `__proto__`, `" exact "`, `UPPERCASE` y `with-dash` son inválidos. Los nombres `__proto__`, `prototype` y `constructor` están reservados. No se aplica trim, lowercase automático, normalización ni coerción. El schema concreto que aplica esta regla es un detalle interno del contrato.

`AppliedEffect` es una unión discriminada estricta por las diez familias de `GameEffect`. Cada registro conserva `source`, `sourceEffectIndex`, `status`, el payload solicitado en `requested` sin repetir `type`, y snapshots anterior y resultante tipados para su familia. No admite `target`, paths ni campos arbitrarios. Las variantes internas de `life_state` y `football_state` mantienen correlacionados `field`, `operation` y `value`.

Los snapshots escalares sólo admiten `boolean`, números finitos o `string`; los snapshots de relaciones contienen una `Relationship` completa y los de programación un `ScheduledEvent`. La ausencia se representa con `{ exists: false }`, nunca con `undefined`. `DecisionRecord.immediateEffects` requiere esta forma persistible; la forma abierta anterior ya no es válida.

## Flags

Las flags representan hechos concretos.

Ejemplos:

```ts
{
  rejected_first_club_trial: true,
  apologized_to_former_team: false,
  abandoned_secondary_school_for_football: false,
  agent_hid_offer: true,
  promised_partner_not_to_relocate: true
}
```

Las flags admiten valores `boolean`, números finitos o `string`. El string vacío es un valor válido y presente, aunque una key vacía es inválida. Una flag nueva se crea; una existente puede sobrescribirse sólo conservando el tipo del valor. Repetir el mismo valor produce `no_change` y cambiar el tipo produce error.

## Contadores

Los contadores representan conductas acumuladas.

Ejemplos:

```ts
{
  missed_matches: 3,
  missed_important_matches: 1,
  broken_promises: 2,
  club_trial_rejections: 2,
  major_injuries: 1,
  family_sacrifices_for_football: 4,
  football_sacrifices_for_family: 2
}
```

Cada contador persistido debe cumplir `Number.isSafeInteger(value) && value >= 0`. `set` acepta safe integers no negativos e `increment` acepta safe integers negativos, cero o positivos. El resultado también debe ser un safe integer no negativo; un overflow produce `INVALID_NUMERIC_RESULT`. Un contador ausente parte de cero, el underflow se limita a cero y las keys persistidas en cero no se eliminan.

## Acontecimientos recientes

`recentEventIds` debe utilizarse posteriormente para evitar repeticiones cercanas.

Se recomienda conservar inicialmente los últimos diez acontecimientos.

---

# 11. Consecuencias programadas

```ts
type EventCondition =
  | StateCondition
  | FlagCondition
  | CounterCondition
  | RelationshipCondition
  | EventHistoryCondition;

type EventConditionGroup = {
  mode: "all" | "any";
  conditions: EventCondition[];
  negate?: boolean;
};

type ScheduledEventCommon = {
  id: string;
  eventId: string;
  sourceEventId: string;
  priority: number;
  createdAtTurn: number;
  consumed: boolean;
};

type ScheduledEvent = ScheduledEventCommon & (
  | { triggerType: "turn"; triggerValue: number }
  | { triggerType: "age"; triggerValue: number }
  | { triggerType: "season"; triggerValue: number }
  | { triggerType: "condition"; conditions: EventConditionGroup }
);
```

`EventCondition` es una unión controlada. Las rutas consultables están enumeradas explícitamente y no se admiten paths arbitrarios. Los operadores y sus valores dependen del tipo del campo. Los grupos utilizan `all` o `any`, deben contener al menos una condición y no pueden anidarse en esta versión. El contrato detallado se encuentra en la especificación funcional del sistema de acontecimientos.

En TypeScript, `AllowedStateConditionField` es la unión literal exacta de los 44 campos consultables y `StateCondition` conserva la correlación entre `field`, `operator` y `value`. Los campos numéricos sólo admiten operadores y valores numéricos compatibles; los nueve campos enum conservan individualmente su respectivo tipo; los ocho campos de string libre utilizan strings no vacíos; y `football.isInjured` utiliza `boolean` o `boolean[]`. `exists` y `notExists` admiten cualquiera de los 44 campos y no contienen `value`. Este saneamiento estático también restablece la comprobación exhaustiva del mapa interno de selectores, sin cambiar el evaluador runtime ni el conjunto JSON aceptado o rechazado. Por ello `GAME_VERSION` permanece en `"0.5.0"`.

Para las condiciones sobre flags, `exists` y `notExists` consultan si la clave es una propiedad propia de `history.flags`. `equals` y `notEquals` requieren que la clave exista; por lo tanto, una flag ausente produce false para ambas comparaciones de valor. Los valores false, 0 y string vacío se consideran presentes. No se utiliza truthiness, coerción, trim ni normalización.

Los contadores ausentes se interpretan como 0. Esta regla es específica de los contadores y no debe confundirse con la semántica de existencia de las flags.

`CounterCondition` puede comparar ese valor persistido contra cualquier número finito, incluido un valor fraccionario como `1.5`; su threshold no se restringe a enteros.

`EventHistoryCondition` utiliza exclusivamente `history.decisions`. Cuenta cada DecisionRecord cuyo eventId coincida mediante igualdad estricta: `completed` exige al menos uno, `notCompleted` exige cero y `completedAtLeast` compara el total con el count solicitado. Cada registro coincidente cuenta por separado; eventVersion, choiceId y outcomeId no alteran el conteo. `history.completedEventIds` permanece en el modelo, pero no se consulta ni se combina con decisions para esta evaluación. Su posible derivación, sincronización o eliminación futura queda fuera de este micro-commit.

Estas reglas están implementadas por el evaluador runtime de condiciones. La selección del siguiente evento, la resolución completa de opciones y el scheduler todavía no están implementados. La aplicación de lotes de `GameEffect` se realiza mediante `resolveGameEffects`, pero no constituye por sí sola la resolución completa de un acontecimiento.

La selección determinista de outcomes sí está implementada mediante `selectDeterministicOutcome(outcomes, state, context)`. Su contexto público contiene `sourceEventId`, `sourceEventVersion` y `choiceId`; `OutcomeSelectionError` y `OutcomeSelectionErrorCode` distinguen `INVALID_INPUT` de `NO_ELIGIBLE_OUTCOME`. La frontera valida el `GameState`, un array no vacío de `ProbabilisticOutcome`, el contexto exacto y la unicidad de `OutcomeId` dentro del array, sin deduplicar.

Un outcome sin `availability` es elegible; cuando existe, se evalúa mediante `evaluateEventConditionGroup`. Una condición falsa filtra el outcome, mientras que una condición estructuralmente inválida produce `INVALID_INPUT`. El filtrado conserva el orden original. Si no queda ningún outcome elegible se produce `NO_ELIGIBLE_OUTCOME`: no se devuelve `undefined`, no se elige el primero y no existe fallback implícito. Un outcome sin `availability` puede cumplir narrativamente esa función, pero no hay un flag formal de default o fallback.

La elegibilidad se evalúa funcionalmente sobre el `GameState` posterior a los effects deterministas de la choice. El selector no aplica esos effects: utiliza exclusivamente el estado recibido, que el futuro `ChoiceResolution` deberá proporcionar. El orden futuro es aplicar effects de choice, evaluar availability, seleccionar el outcome y aplicar sus effects.

Los weights son safe integers positivos, no necesitan sumar 100 y expresan proporciones relativas: `1 / 1` equivale proporcionalmente a `50 / 50`. Cero, negativos, fracciones, `NaN`, infinito y unsafe integers son inválidos. El orden original forma parte del contenido versionado; cambiar outcomes, weights u orden puede cambiar el resultado y debe acompañarse de una nueva `eventVersion`, aunque ese incremento no se fuerza automáticamente.

La selección es pura, determinista y read-only. No modifica state, outcomes ni context, no usa estado global mutable y retorna exclusivamente el `ProbabilisticOutcome` seleccionado. No aplica effects, no programa follow-ups, no construye `AppliedEffectSource` ni `DecisionRecord` y no incrementa el turno. Si sólo queda un outcome elegible lo retorna directamente.

El namespace v1 está encabezado por `amateur-app:outcome-selection:v1` y continúa, en orden, con `state.seed`, `state.runId`, `state.currentTurn`, `sourceEventId`, `sourceEventVersion` y `choiceId`. No participan edad, temporada, IDs o contenido de outcomes, weights, availability, effects, follow-ups ni un ordinal RNG. Dos partidas con el mismo seed pueden producir resultados diferentes porque `runId` también participa; no se prometen todavía seeds compartibles entre runs.

Esta capacidad runtime no modificó el JSON persistido, no agregó estado RNG y no cambió `DecisionRecord`; por ello `GAME_VERSION` permanece en `"0.5.0"`.

`FollowUpDefinition` describe una consecuencia relativa al momento de una futura resolución. `ScheduledEvent` representa esa consecuencia después de programarse y utiliza valores absolutos. Las variantes `turn`, `age` y `season` requieren `triggerValue` y no admiten `conditions`; la variante `condition` requiere `EventConditionGroup` y no admite `triggerValue`.

Dentro de un `GameState`, cada `ScheduledEvent.id` debe ser único en `scheduledEvents`, también mediante comparación exacta y sin normalización. La unicidad se evalúa separadamente para `relationships[].id` y `scheduledEvents[].id`: una relación y un evento programado pueden compartir el mismo string sin conflicto.

Las consecuencias programadas permitirán que una decisión tenga efectos posteriores.

Ejemplos:

* una discusión con el equipo aparece dos turnos después;
* un club vuelve a contactar al personaje a los 20 años;
* una expareja reaparece si el personaje regresa a una ciudad;
* un antiguo compañero ofrece incorporarse a otro equipo;
* una lesión vuelve a generar molestias durante una temporada futura.

---

# 12. Información técnica de la partida

```ts
type GameRunStatus = "active" | "finished";

type GameState = {
  runId: string;
  gameVersion: string;
  seed: string;

  profile: PlayerProfile;
  stats: PlayerStats;
  footballAttributes: FootballAttributes;

  life: LifeState;
  football: FootballState;

  relationships: Relationship[];
  history: GameHistory;
  scheduledEvents: ScheduledEvent[];

  currentSeason: number;
  currentTurn: number;
  currentEventId?: string;

  status: GameRunStatus;
  endingId?: string;
};
```

## Reglas técnicas

* `runId` identifica la partida.
* `gameVersion` permite identificar la versión del formato de la partida. En esta etapa el motor utiliza la constante `GAME_VERSION = "0.5.0"` y no recibe la versión desde el llamador.
* `seed` permitirá reproducir resultados.
* `currentSeason` comienza en `1`.
* `currentTurn` comienza en `0`.
* Una partida finalizada debe tener `endingId`.
* Una partida activa no debe tener `endingId`.

Las versiones `0.1.0` declaradas actualmente en los `package.json` son versiones internas de los paquetes y no representan necesariamente el valor de `GAME_VERSION` persistido en una partida.

---

# 13. Valores derivados

Como excepción explícita, `stats.footballLevel` es un valor derivado persistido: se calcula desde los atributos futbolísticos, no se modifica directamente y debe validarse que coincida con ellos. Los demás valores derivados de esta sección no se guardan si pueden calcularse de forma confiable.

## Nivel futbolístico

```ts
function calculateFootballLevel(
  attributes: FootballAttributes
): number;
```

## Agotamiento

```ts
burnout =
  (100 - mood) * 0.4 +
  (100 - energy) * 0.4 +
  (100 - health) * 0.2;
```

## Apoyo familiar

Se calcula a partir de relaciones familiares activas y vivas.

Fórmula inicial por relación:

```ts
relationshipSupport =
  affection * 0.45 +
  trust * 0.45 -
  conflict * 0.30;
```

El apoyo familiar general será el promedio limitado entre `0` y `100`.

Si no existen relaciones familiares, debe devolver `0`.

## Riesgo físico contextual

Posteriormente podrá calcularse combinando:

* `injuryRisk`;
* energía;
* salud;
* condición física;
* edad;
* lesiones anteriores.

No se implementará todavía el cálculo completo de probabilidad de lesión.

---

# 14. Modificación de valores

Debe existir una función central:

```ts
function clampStat(value: number): number {
  return Math.max(0, Math.min(100, value));
}
```

Ningún módulo debe modificar estadísticas sin asegurar el rango válido.

## Resolvedor de efectos implementado

`resolveGameEffects(effects, state, context)` devuelve `nextState` y `appliedEffects`. Los efectos se aplican en el orden exacto del array y cada uno lee el resultado del anterior. No se agrupan ni reordenan. La resolución es atómica sobre una copia de trabajo creada con `structuredClone`: se valida el estado inicial, se comprueban reglas locales durante la aplicación, se recalcula `footballLevel` exactamente una vez al terminar y se valida el estado final. Un error descarta todo el lote y el `GameState` original nunca se modifica. No se valida el estado completo entre efectos porque una transición coordinada puede ser temporalmente inconsistente.

`set` reemplaza, `add` suma, `multiply` multiplica y `clear` elimina una propiedad opcional sin asignar `undefined`. Un resultado `NaN` o infinito será un error. El clamp se aplicará después de cada efecto: las escalas de estadísticas, atributos, confianza, reputación y relaciones quedan entre `0` y `100`; `salary` y `marketValue` tienen mínimo `0` sin máximo; los contadores persisten como safe integers no negativos. Los valores fraccionarios son válidos donde el esquema persistible los admite, multiplicar por cero es válido y los multiplicadores negativos se limitan según el campo. `footballLevel` no se modifica directamente.

`numberOfChildren` sólo admite `set` con entero no negativo o `add` con entero. Un resultado negativo produce error y rollback, sin clamp ni cambios implícitos sobre `relationshipStatus`.

El resolvedor no producirá cascadas implícitas. Cambiar `employmentStatus` no limpia ocupación o empleador; cambiar `retirementStatus` no limpia equipo, club, contrato o salario; cambiar `currentInjuryId` no ajusta `isInjured`; y limpiar un contrato no cambia el salario. El contenido debe declarar todos los efectos necesarios y el resultado final debe cumplir las invariantes existentes de `GameState`.

Las flags nuevas se crean y las existentes sólo pueden sobrescribirse conservando su tipo; el mismo valor produce `no_change` y un cambio de tipo produce error. No existe `clear` para flags. Un contador ausente parte de cero. `set` persiste incluso un cero nuevo; `increment` cero o negativo sobre una clave ausente que permanece en cero produce `no_change` sin crearla; una clave ya existente se conserva aunque termine en cero.

Cada efecto produce al menos un registro auditable con estado `applied`, `no_change` o `ignored`. `ignored` se reserva para un conflicto omitido expresamente por `conflictPolicy`. `RelationshipValueEffect` puede producir varios registros; todos conservan el mismo `sourceEffectIndex`, que es el índice desde cero del `GameEffect` original. Los tres estados podrán formar parte de `DecisionRecord.immediateEffects` cuando se implemente la resolución completa de elecciones.

Los selectores de `RelationshipValueEffect` combinan sus criterios con AND, exigen todos los `requiredTags` y modifican todas las relaciones coincidentes sin alterar su orden, con un registro por relación. No encontrar coincidencias es un error. No se filtran implícitamente relaciones inactivas o fallecidas.

Al crear una relación se completan `startedAtAge` con la edad actual, `isActive: true` e `isAlive: true`, se valida la relación completa y se agrega al final. El resolvedor no genera IDs. Un ID duplicado produce `RELATIONSHIP_ID_CONFLICT` o un registro `ignored` según `conflictPolicy`; incluso una relación idéntica es un conflicto. Esta defensa específica evita construir un estado inválido y no reemplaza la invariante del `GameState`. Un `characterId` puede repetirse con otro ID. Desactivar sólo establece `isActive: false`; una relación ya inactiva produce `no_change` y un ID inexistente produce error. En un estado válido, un selector por `relationshipId` coincide como máximo con una relación, mientras que los selectores por tipo o tags pueden continuar modificando varias.

Los follow-ups de turno se convierten a `currentTurn + afterTurns`; edad y temporada son valores absolutos; y una condición conserva su `EventConditionGroup`. Edad o temporada pasadas producen error. Un valor igual al actual es válido y queda elegible en la próxima evaluación del scheduler. No se consume recursivamente un evento programado durante la misma resolución.

El ID programado es determinista e incluye, con codificación de longitud no ambigua, `runId`, `currentTurn`, `sourceEventId`, `sourceEventVersion`, `choiceId`, la fase `choice` u `outcome`, `outcomeId` cuando corresponde y `sourceEffectIndex`. No utiliza UUID, `Math.random`, `Date` ni hashing externo. Una colisión produce `SCHEDULED_EVENT_ID_CONFLICT` y rollback. Esta defensa evita construir un estado inválido y se conserva además de la validación final del `GameState`. El evento se agrega a `nextState.scheduledEvents`, pero no se ejecuta ni consume recursivamente durante la resolución.

La API pública es una única función `resolveGameEffects(effects, state, context)` que devuelve `nextState` y `appliedEffects`. Acepta un lote vacío y devuelve una copia equivalente sin registros, con `footballLevel` derivado desde los atributos finales. El resolvedor individual es interno; no se devuelven `previousState` ni `scheduledEventIds`, y todavía no se crea `ChoiceResolution` ni `DecisionRecord`.

`AppliedEffect` ya es una unión discriminada según las diez familias de `GameEffect`, con `source: AppliedEffectSource`, `sourceEffectIndex` entero no negativo, `status`, payload solicitado y snapshots anterior y resultante tipados. `AppliedEffectSource` distingue la fase `choice` de la fase `outcome`, que además requiere `outcomeId`; junto con el índice dentro del array de esa fase identifica el origen aun cuando ambos arrays comiencen en cero. Esta misma unión se reutiliza en `EffectResolutionContext`.

`requested` conserva el payload exacto del `GameEffect` original sin repetir `type`. Su obtención distribuye la unión por `type` y preserva las variantes internas de `life_state` y `football_state`, sin colapsar sus combinaciones válidas de campo, operación y valor.

Los registros escalares de `player_stat`, `football_attribute`, `life_state`, `football_state`, `flag`, `counter` y `relationship_value` sólo admiten snapshots ausentes o presentes con `boolean`, número finito o `string`. La creación y desactivación utilizan snapshots ausentes o presentes con una `Relationship` completa. La programación utiliza snapshots ausentes o presentes con un `ScheduledEvent`. No se admiten objetos o arrays arbitrarios en snapshots escalares ni se utiliza `undefined`.

Las siete familias escalares admiten `applied` y `no_change`; `create_relationship` admite `applied` e `ignored`; `deactivate_relationship` admite `applied` y `no_change`; y `schedule_event` sólo admite `applied`.

`create_relationship` es una unión interna: `applied` tiene una relación anterior ausente y una relación completa resultante; `ignored` exige `conflictPolicy: "ignore"` y relaciones existentes en ambos snapshots. `deactivate_relationship` conserva relaciones completas en ambos snapshots y la resultante tiene `isActive: false`. `relationship_value` incluye un `relationshipId` tipado y utiliza números presentes sin paths libres; el resolvedor genera un registro por cada relación modificada. `schedule_event` sólo admite `applied`, con snapshot anterior ausente, `FollowUpDefinition` relativo en `requested` y `ScheduledEvent` absoluto como resultado.

`shared-types` valida la estructura, discriminantes, payload solicitado, origen, índice, status, clase de snapshot, propiedades adicionales y persistibilidad, sin realizar comparaciones profundas. `game-engine` garantiza durante la resolución la correspondencia con el efecto, la igualdad de `no_change` e `ignored`, la diferencia de `applied`, el orden, la cantidad de registros, los snapshots reales y la semántica del resultado.

Los únicos exports públicos de este contrato son `AppliedEffectSchema`, `AppliedEffect`, `AppliedEffectSourceSchema` y `AppliedEffectSource`. Los esquemas auxiliares de status, snapshots, payloads y variantes permanecen internos.

La API lanza `EventEffectResolutionError`, con `code` y campos opcionales `effectIndex`, `effectType` y `cause`. Los códigos son `INVALID_INPUT`, `INVALID_NUMERIC_RESULT`, `RELATIONSHIP_ID_CONFLICT`, `RELATIONSHIP_NOT_FOUND`, `RELATIONSHIP_SELECTOR_NO_MATCH`, `SCHEDULED_EVENT_ID_CONFLICT`, `TRIGGER_IN_THE_PAST` e `INVALID_RESULT_STATE`. Los errores atribuibles a un efecto incluyen su índice y tipo; `INVALID_RESULT_STATE` corresponde a la validación final y no se atribuye a un efecto individual. Los errores internos inesperados se propagan sin convertirse. Todo error controlado implica rollback total y no devuelve resultados parciales.

La evolución de `AppliedEffect` cambió de forma incompatible `DecisionRecord.immediateEffects` y elevó `GAME_VERSION` a `"0.3.0"`. No se implementó una migración porque no existen partidas persistidas de producción. Las versiones de los paquetes son independientes de `GAME_VERSION`.

Posteriormente, el formato controlado de `HistoryKey` y el contrato persistido de contadores como safe integers no negativos elevaron `GAME_VERSION` a `"0.4.0"`. El hardening de objetos runtime que no pueden representarse fielmente como JSON mantuvo esa versión: `GAME_VERSION` versiona cambios incompatibles del formato JSON persistido, no cada endurecimiento de inputs no representables.

Las invariantes de identidad de las colecciones de `GameState` elevaron posteriormente `GAME_VERSION` a `"0.5.0"`. El cambio es incompatible porque un JSON con `Relationship.id` duplicados o `ScheduledEvent.id` duplicados podía aceptarse antes y ahora es inválido. No existe migración automática ni un gate que exija `gameVersion === GAME_VERSION`; un estado anterior sin duplicados puede continuar cumpliendo la estructura, sin que esto prometa compatibilidad general entre versiones.

## Fronteras persistibles

`GameStateSchema`, `GameEventSchema`, `AppliedEffectSchema`, `DecisionRecordSchema`, `ScheduledEventSchema` y `JsonValueSchema` aplican una frontera persistible independiente antes de su validación estructural. Los schemas parciales menores quedan protegidos cuando forman parte de una de estas raíces y no adquieren individualmente esa frontera.

Las fronteras rechazan `undefined`, ciclos, accessors propios, claves o valores `Symbol`, propiedades string no enumerables de objetos, sparse arrays y objetos con prototypes no soportados. Admiten plain objects, objetos con prototype nulo, arrays ordinarios densos y referencias compartidas no circulares. Los arrays no admiten holes, propiedades custom, claves `Symbol` ni índices accessor; un índice data-property no enumerable sí puede ser válido porque JSON serializa arrays por posición. Las class instances, `Date`, `Map`, `Set`, `RegExp`, typed arrays, boxed primitives y objetos con prototype custom no son persistibles.

La prevalidación de objetos ordinarios rechaza accessors sin ejecutar su getter o setter; `safeParse` devuelve `success: false` en lugar de propagar el error del getter. La inspección de Proxies es best-effort: las excepciones reflexivas capturables se convierten en errores de validación, pero JavaScript no permite impedir efectos laterales de traps ni ofrece una sandbox.

`assertNoExplicitUndefined` no implementa esta política completa. Su contrato público se limita a detectar `undefined` explícito y ciclos, conservar paths útiles, aceptar referencias compartidas no circulares y no mutar el input. Inspecciona data descriptors, incluso bajo keys `Symbol` o propiedades no enumerables, y omite accessors sin ejecutarlos.

La serialización de `GameState` ejecuta primero la validación completa y sólo después produce JSON. Esto impide que `JSON.stringify` elimine silenciosamente contenido incompatible.

`GameStateSchema` comprueba la unicidad de `relationships[].id` y `scheduledEvents[].id` sobre el estado completo; los schemas de un elemento aislado no pueden comprobar su colección. Cada duplicado posterior produce una issue sobre `relationships[index].id` o `scheduledEvents[index].id`. `validateGameState`, y por extensión `serializeGameState` y `deserializeGameState`, rechazan esos estados. No se eliminan, fusionan, renombran ni reparan IDs duplicados. `resolveGameEffects` hereda esta validación y rechaza un estado inicial ambiguo con `INVALID_INPUT` antes de aplicar efectos.

## Intensidades narrativas

```ts
type EffectIntensity = "minor" | "medium" | "major";
```

Rangos orientativos:

```text
minor: 2 a 5 puntos
medium: 6 a 12 puntos
major: 13 a 25 puntos
```

Estos rangos servirán más adelante para construir y balancear acontecimientos.

---

# 15. Valores iniciales sugeridos

Antes de aplicar rasgos:

```ts
const baseStats: PlayerStats = {
  mood: 70,
  energy: 75,
  health: 85,
  family: 65,
  friends: 65,
  finances: 45,
  footballLevel: 0
};

const baseFootballAttributes: FootballAttributes = {
  talent: 55,
  technique: 42,
  physicalCondition: 60,
  tacticalUnderstanding: 32,
  discipline: 50,
  currentForm: 50,
  potential: 65,
  injuryRisk: 15
};
```

Después deben aplicarse los modificadores del rasgo positivo y del rasgo desafiante.

Finalmente, debe calcularse `footballLevel`.

---

# 16. Modificadores iniciales de rasgos

## Positivos

```text
disciplined:
discipline +15

talented:
talent +15
potential +10

sociable:
friends +12

resilient:
mood +10

ambitious:
discipline +5
potential +8

family_oriented:
family +12
```

## Desafiantes

```text
impulsive:
discipline -8

undisciplined:
discipline -18

insecure:
mood -10

individualistic:
friends -8

injury_prone:
injuryRisk +20
health -5

low_frustration_tolerance:
mood -8
discipline -4
```

Todos los resultados deben limitarse entre `0` y `100`.

Estos valores serán revisados durante el balance del juego.

---

# 17. Valores iniciales de relaciones

Para el MVP, la función de creación inicial puede recibir relaciones familiares opcionales.

No se debe inventar automáticamente una estructura familiar definitiva dentro del motor.

Si no se reciben relaciones iniciales, la partida comienza con `relationships: []`.

El motor no inventa personajes, nombres, relaciones ni identificadores. Las relaciones recibidas se copian para que el estado creado no conserve referencias mutables del input.

Más adelante, la creación del personaje permitirá configurar o generar esta estructura.

---

# 18. Validaciones e invariantes

El sistema debe garantizar:

1. Todas las estadísticas numéricas de escala permanecen entre `0` y `100`.
2. La edad inicial es exactamente `14`.
3. La edad nunca puede ser menor que la edad inicial.
4. El número de hijos nunca puede ser negativo.
5. Los partidos, goles y asistencias nunca pueden ser negativos.
6. El salario y el valor de mercado nunca pueden ser negativos.
7. Una lesión activa requiere `currentInjuryId`.
8. Si no hay lesión, `currentInjuryId` debe estar vacío.
9. Una partida finalizada requiere `endingId`.
10. Una partida activa no debe tener `endingId`.
11. Una carrera retirada permanentemente debe tener estado futbolístico `retired`.
12. El nivel futbolístico debe coincidir con sus atributos al crear la partida.
13. El personaje debe tener un rasgo positivo y uno desafiante.
14. Los rasgos seleccionados deben pertenecer a sus respectivos grupos.
15. `currentSeason` debe ser mayor o igual que `1`.
16. `currentTurn` debe ser mayor o igual que `0`.
17. Cada `Relationship.id` debe ser único dentro de `relationships`.
18. Cada `ScheduledEvent.id` debe ser único dentro de `scheduledEvents`.

---

# 19. Fuera del alcance de esta etapa

No se implementará todavía:

* selección del siguiente acontecimiento;
* catálogo de acontecimientos;
* validación integral del catálogo;
* resolución de opciones;
* integración de effects de choice, selección de outcome y effects del outcome;
* construcción de `ChoiceResolution` y `DecisionRecord` desde una elección;
* integración de follow-ups declarados directamente por choices y outcomes;
* políticas repeat/cooldown runtime;
* scheduler runtime y consumo de eventos programados;
* clubes reales;
* equipos amateurs;
* contratos;
* representantes concretos;
* lesiones específicas;
* base de datos;
* endpoints;
* autenticación;
* frontend;
* panel administrativo;
* simulación anual;
* finales;
* IA;
* ranking.

---

# 20. Criterios de aceptación

La etapa estará terminada cuando:

* exista un modelo TypeScript completo del estado;
* todos los tipos estén centralizados;
* pueda crearse una partida inicial válida;
* los rasgos modifiquen correctamente los valores;
* el nivel futbolístico se calcule automáticamente;
* exista validación en runtime;
* todos los valores respeten sus rangos;
* puedan calcularse el agotamiento y el apoyo familiar;
* la partida pueda serializarse a JSON y reconstruirse;
* los tests cubran los casos principales;
* TypeScript compile en modo estricto;
* no se haya agregado lógica de interfaz, API ni base de datos.
