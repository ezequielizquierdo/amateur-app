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

type AppliedEffect = {
  field: string;
  operation: "add" | "set" | "multiply";
  previousValue?: JsonValue;
  appliedValue: JsonValue;
  resultingValue?: JsonValue;
};

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

type GameHistory = {
  decisions: DecisionRecord[];
  flags: Record<string, HistoryFlagValue>;
  counters: Record<string, number>;

  completedEventIds: string[];
  recentEventIds: string[];

  formerTeamIds: string[];
  formerClubIds: string[];
};
```

`eventVersion` es un entero positivo obligatorio y no recibe un valor por defecto silencioso. `outcomeId` está ausente cuando la decisión no produjo un resultado probabilístico.

## Flags

Las flags representan hechos concretos.

Ejemplos:

```ts
{
  rejectedFirstClubTrial: true,
  apologizedToFormerTeam: false,
  abandonedSecondarySchoolForFootball: false,
  agentHidOffer: true,
  promisedPartnerNotToRelocate: true
}
```

## Contadores

Los contadores representan conductas acumuladas.

Ejemplos:

```ts
{
  missedMatches: 3,
  missedImportantMatches: 1,
  brokenPromises: 2,
  clubTrialRejections: 2,
  majorInjuries: 1,
  familySacrificesForFootball: 4,
  footballSacrificesForFamily: 2
}
```

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

Para las condiciones sobre flags, `exists` y `notExists` consultan si la clave es una propiedad propia de `history.flags`. `equals` y `notEquals` requieren que la clave exista; por lo tanto, una flag ausente produce false para ambas comparaciones de valor. Los valores false, 0 y string vacío se consideran presentes. No se utiliza truthiness, coerción, trim ni normalización.

Los contadores ausentes se interpretan como 0. Esta regla es específica de los contadores y no debe confundirse con la semántica de existencia de las flags.

`EventHistoryCondition` utiliza exclusivamente `history.decisions`. Cuenta cada DecisionRecord cuyo eventId coincida mediante igualdad estricta: `completed` exige al menos uno, `notCompleted` exige cero y `completedAtLeast` compara el total con el count solicitado. Cada registro coincidente cuenta por separado; eventVersion, choiceId y outcomeId no alteran el conteo. `history.completedEventIds` permanece en el modelo, pero no se consulta ni se combina con decisions para esta evaluación. Su posible derivación, sincronización o eliminación futura queda fuera de este micro-commit.

Estas reglas corresponden al contrato funcional del evaluador futuro. La evaluación runtime de condiciones, la selección de eventos, la aplicación de efectos, la resolución de opciones, el scheduler y el azar todavía no están implementados.

`FollowUpDefinition` describe una consecuencia relativa al momento de una futura resolución. `ScheduledEvent` representa esa consecuencia después de programarse y utiliza valores absolutos. Las variantes `turn`, `age` y `season` requieren `triggerValue` y no admiten `conditions`; la variante `condition` requiere `EventConditionGroup` y no admite `triggerValue`.

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
* `gameVersion` permite identificar la versión del formato de la partida. En esta etapa el motor utiliza la constante `GAME_VERSION = "0.2.0"` y no recibe la versión desde el llamador.
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

## Contrato del futuro resolvedor de efectos

Los efectos se aplicarán en el orden exacto del array y cada uno leerá el resultado del anterior. No se agruparán ni reordenarán. La resolución será atómica sobre una copia de trabajo: se validará el estado inicial, se comprobarán reglas locales durante la aplicación, se recalculará `footballLevel` al terminar y se validará el estado final. Un error descartará todo el lote y el `GameState` original nunca será modificado. No se validará el estado completo entre efectos porque una transición coordinada puede ser temporalmente inconsistente.

`set` reemplaza, `add` suma, `multiply` multiplica y `clear` elimina una propiedad opcional sin asignar `undefined`. Un resultado `NaN` o infinito será un error. El clamp se aplicará después de cada efecto: las escalas de estadísticas, atributos, confianza, reputación y relaciones quedan entre `0` y `100`; `salary` y `marketValue` tienen mínimo `0` sin máximo; los contadores son enteros con mínimo `0`. Los valores fraccionarios son válidos donde el esquema persistible los admite, multiplicar por cero es válido y los multiplicadores negativos se limitan según el campo. `footballLevel` no se modifica directamente.

`numberOfChildren` sólo admite `set` con entero no negativo o `add` con entero. Un resultado negativo produce error y rollback, sin clamp ni cambios implícitos sobre `relationshipStatus`.

El resolvedor no producirá cascadas implícitas. Cambiar `employmentStatus` no limpia ocupación o empleador; cambiar `retirementStatus` no limpia equipo, club, contrato o salario; cambiar `currentInjuryId` no ajusta `isInjured`; y limpiar un contrato no cambia el salario. El contenido debe declarar todos los efectos necesarios y el resultado final debe cumplir las invariantes existentes de `GameState`.

Las flags nuevas se crean y las existentes sólo pueden sobrescribirse conservando su tipo; el mismo valor produce `no_change` y un cambio de tipo produce error. No existe `clear` para flags. Un contador ausente parte de cero. `set` persiste incluso un cero nuevo; `increment` cero o negativo sobre una clave ausente que permanece en cero produce `no_change` sin crearla; una clave ya existente se conserva aunque termine en cero.

Cada efecto producirá un registro auditable con estado `applied`, `no_change` o `ignored`. `ignored` se reserva para un conflicto omitido expresamente por `conflictPolicy`. Los tres estados formarán parte de `DecisionRecord.immediateEffects`.

Los selectores de `RelationshipValueEffect` combinan sus criterios con AND, exigen todos los `requiredTags` y modifican todas las relaciones coincidentes sin alterar su orden, con un registro por relación. No encontrar coincidencias es un error. No se filtran implícitamente relaciones inactivas o fallecidas.

Al crear una relación se completan `startedAtAge` con la edad actual, `isActive: true` e `isAlive: true`, se valida la relación completa y se agrega al final. El resolvedor no genera IDs. Un ID duplicado produce error o un registro `ignored` según `conflictPolicy`; incluso una relación idéntica es un conflicto. Un `characterId` puede repetirse con otro ID. Desactivar sólo establece `isActive: false`; una relación ya inactiva produce `no_change` y un ID inexistente produce error.

Los follow-ups de turno se convierten a `currentTurn + afterTurns`; edad y temporada son valores absolutos; y una condición conserva su `EventConditionGroup`. Edad o temporada pasadas producen error. Un valor igual al actual es válido y queda elegible en la próxima evaluación del scheduler. No se consume recursivamente un evento programado durante la misma resolución.

El ID programado será determinista e incluirá, con codificación de longitud no ambigua, `runId`, `currentTurn`, `sourceEventId`, `sourceEventVersion`, `choiceId`, la fase `choice` u `outcome`, `outcomeId` cuando corresponda y `sourceEffectIndex`. No utilizará UUID, `Math.random`, `Date` ni hashing externo. Una colisión produce error y rollback.

La futura API pública será una única función `resolveGameEffects(effects, state, context)` que devolverá `nextState` y `appliedEffects`. Aceptará un lote vacío y devolverá una copia equivalente sin registros. El resolvedor individual será interno; no se devolverán `previousState` ni `scheduledEventIds`, y no se creará `ChoiceResolution` en este micro-commit.

La forma actual de `AppliedEffect` es insuficiente. Antes de implementar el resolvedor será reemplazada por una unión discriminada según las diez familias de `GameEffect`, con `source: AppliedEffectSource`, `sourceEffectIndex` entero no negativo, `status`, campos y operación tipados, valor solicitado cuando corresponda y snapshots anterior y resultante. `AppliedEffectSource` distingue la fase `choice` de la fase `outcome`, que además requiere `outcomeId`; junto con el índice dentro del array de esa fase identifica el origen aun cuando ambos arrays comiencen en cero. Esta misma unión se reutilizará posteriormente en `EffectResolutionContext`.

`requested` conservará el payload exacto del `GameEffect` original sin repetir `type`. Su obtención deberá distribuir la unión por `type` y preservar las variantes internas de `life_state` y `football_state`, sin colapsar sus combinaciones válidas.

Los registros escalares de `player_stat`, `football_attribute`, `life_state`, `football_state`, `flag`, `counter` y `relationship_value` sólo admitirán snapshots ausentes o presentes con `boolean`, `number` o `string`. La creación y desactivación utilizarán snapshots ausentes o presentes con una `Relationship` completa. La programación utilizará snapshots ausentes o presentes con un `ScheduledEvent`. No se admitirán objetos o arrays arbitrarios en snapshots escalares ni se utilizará `undefined`.

`create_relationship` será una unión interna: `applied` tendrá una relación anterior ausente y una relación completa resultante; `ignored` exigirá `conflictPolicy: "ignore"` y relaciones existentes en ambos snapshots. `deactivate_relationship` conservará relaciones completas en ambos snapshots y la resultante tendrá `isActive: false`. `relationship_value` incluirá un `relationshipId` tipado, generará un registro por relación y utilizará números presentes sin paths libres. `schedule_event` sólo admitirá `applied`, con snapshot anterior ausente, `FollowUpDefinition` relativo en `requested` y `ScheduledEvent` absoluto como resultado.

`shared-types` validará la estructura, discriminantes, payload solicitado, origen, índice, status, clase de snapshot, propiedades adicionales y persistibilidad, sin realizar comparaciones profundas. `game-engine` garantizará después la correspondencia con el efecto, la igualdad de `no_change` e `ignored`, la diferencia de `applied`, el orden, la cantidad de registros, los snapshots reales y la semántica del resultado.

Los únicos exports públicos nuevos serán `AppliedEffectSchema`, `AppliedEffect`, `AppliedEffectSourceSchema` y `AppliedEffectSource`. Los esquemas auxiliares de status, snapshots, payloads y variantes permanecerán internos.

La API futura lanzará `EventEffectResolutionError`, con `code` y campos opcionales `effectIndex`, `effectType` y `cause`. Los códigos iniciales serán `INVALID_INPUT`, `INVALID_NUMERIC_RESULT`, `RELATIONSHIP_ID_CONFLICT`, `RELATIONSHIP_NOT_FOUND`, `RELATIONSHIP_SELECTOR_NO_MATCH`, `SCHEDULED_EVENT_ID_CONFLICT`, `TRIGGER_IN_THE_PAST` e `INVALID_RESULT_STATE`. Todo error implica rollback total.

La evolución de `AppliedEffect` cambiará indirectamente `DecisionRecord.immediateEffects` y requerirá elevar `GAME_VERSION` a `"0.3.0"` en el futuro commit técnico. En este cambio documental `GAME_VERSION` continúa en `"0.2.0"`. No se prevé una migración porque no existen partidas persistidas de producción.

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

---

# 19. Fuera del alcance de esta etapa

No se implementará todavía:

* selección del siguiente acontecimiento;
* catálogo de acontecimientos;
* resolución de opciones;
* probabilidades;
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
