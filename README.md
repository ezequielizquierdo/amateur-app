# Amateur App

Bibliotecas TypeScript para el modelo de dominio y el contrato declarativo de un
simulador narrativo de vida y carrera futbolística. El proyecto todavía no incluye
frontend, servidor HTTP ni persistencia externa.

## Arquitectura

El repositorio es un monorepo administrado con pnpm workspaces:

- `packages/shared-types`: esquemas Zod, tipos inferidos, validación estructural e
  invariantes locales del estado.
- `packages/game-engine`: cálculos puros, valores iniciales, modificadores de
  rasgos, fábrica determinista, validación calculada y serialización.

La única dependencia entre paquetes es
`@amateur-app/game-engine → @amateur-app/shared-types`.

## Requisitos y comandos

Se requiere Node.js 22 o superior y pnpm 11.20.0.

```bash
pnpm install
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

`pnpm check` ejecuta formato, lint, tipos, tests y build en ese orden.

## Crear una partida inicial

Todos los identificadores, el seed y el año son entradas explícitas. La fábrica
no consulta el reloj, el entorno ni fuentes de aleatoriedad.

```ts
import { createInitialGameState } from "@amateur-app/game-engine";

const state = createInitialGameState({
  runId: "run-001",
  profileId: "player-001",
  seed: "example-seed",
  name: "Alex",
  gender: "woman",
  birthCountry: "Argentina",
  birthCity: "Rosario",
  preferredPosition: "midfielder",
  dominantFoot: "right",
  positiveTrait: "disciplined",
  challengingTrait: "insecure",
  currentYear: 2026,
  city: "Rosario",
  country: "Argentina",
});
```

Si no se proporciona `initialRelationships`, la partida comienza con un array
vacío. El motor utiliza internamente `GAME_VERSION`, actualmente `"0.5.0"`.

Las versiones `0.1.0` de los `package.json` corresponden a las versiones internas
de los paquetes y no tienen que coincidir con `GAME_VERSION`.

## Serializar y reconstruir

La serialización valida el estado antes de producir JSON:

```ts
import { serializeGameState } from "@amateur-app/game-engine";

const serialized = serializeGameState(state);
```

La deserialización captura JSON mal formado y valida tanto la estructura como el
nivel futbolístico derivado:

```ts
import { deserializeGameState } from "@amateur-app/game-engine";

const restoredState = deserializeGameState(serialized);
```

La validación ocurre antes de `JSON.stringify`. Las fronteras persistibles
independientes son `GameStateSchema`, `GameEventSchema`, `AppliedEffectSchema`,
`DecisionRecordSchema`, `ScheduledEventSchema` y `JsonValueSchema`. Aceptan datos
JSON sin pérdida semántica de contenido: rechazan ciclos, accessors propios,
claves o valores `Symbol`, propiedades ocultas de objetos, prototipos no
soportados y sparse arrays. Las referencias compartidas no circulares son
válidas, aunque el JSON round-trip no conserva su identidad.

Los objetos planos, los objetos con prototype nulo y los arrays ordinarios son
válidos. En objetos, una propiedad string no enumerable es inválida; en arrays,
un índice data-property no enumerable puede ser válido porque JSON serializa por
posición. Los arrays no admiten holes, propiedades custom, claves `Symbol` ni
índices accessor. La inspección de Proxies es best-effort: se convierten en
errores de validación las excepciones reflexivas capturables, pero JavaScript no
permite impedir los efectos laterales de traps ni convertir la validación en una
sandbox.

`assertNoExplicitUndefined` no es el validador persistible completo. Conserva su
contrato focalizado en `undefined` explícito, ciclos, paths útiles y referencias
compartidas válidas. Inspecciona data descriptors y omite accessors sin
ejecutarlos.

Dentro de un `GameState`, cada `Relationship.id` debe ser único en
`relationships` y cada `ScheduledEvent.id` debe ser único en `scheduledEvents`.
La comparación es exacta y case-sensitive, sin trim ni normalización. Son
namespaces independientes: una relación y un evento programado pueden compartir
el mismo string. `Relationship.characterId` sí puede repetirse cuando los IDs de
las relaciones son diferentes. La validación rechaza duplicados; no los elimina,
fusiona, renombra ni repara.

Las claves dinámicas de flags y contadores usan internamente el contrato
`HistoryKey`: segmentos alfanuméricos en minúsculas separados por un único guion
bajo, sin trim, coerción ni normalización. Los nombres `__proto__`, `prototype` y
`constructor` están reservados. Los contadores persistidos son safe integers no
negativos; sus incrementos pueden ser safe integers negativos, cero o positivos.

## Estado actual

Está implementado:

- modelo de dominio y `GameState`;
- fábrica determinista del estado inicial;
- validación y serialización de partidas;
- contrato declarativo de acontecimientos;
- condiciones tipadas y efectos declarativos;
- opciones y resultados probabilísticos declarativos;
- follow-ups;
- políticas de selección y repetición;
- evaluación pura y determinista de condiciones;
- selección pura y determinista de outcomes elegibles mediante pesos relativos;
- `AllowedStateConditionField` como unión TypeScript exacta de los 44 campos permitidos y `StateCondition` con correlación estática entre campo, operador y valor;
- `AppliedEffect` como unión persistible estricta de las diez familias de efectos;
- origen e índice de cada efecto aplicado, payload solicitado y snapshots tipados;
- `DecisionRecord` con versión del acontecimiento, outcome opcional e `immediateEffects` evolucionado;
- `ScheduledEvent` como unión discriminada de triggers absolutos;
- evaluadores internos para las diez familias de efectos;
- `resolveGameEffects` como frontera pública, pura, determinista y atómica;
- aplicación secuencial de lotes de efectos sobre una copia de trabajo validada;
- registros `AppliedEffect`, programación persistida y errores tipados del resolvedor;
- claves dinámicas `HistoryKey` y contadores persistidos como safe integers no negativos;
- hardening de las seis fronteras persistibles;
- unicidad de `Relationship.id` y `ScheduledEvent.id` dentro de sus respectivas colecciones de `GameState`;
- `GAME_VERSION = "0.5.0"`.

Todavía no está implementado:

- resolución completa de elecciones y outcomes;
- integración de choice effects → selección de outcome → outcome effects;
- construcción de `DecisionRecord` a partir de una elección resuelta;
- integración de los follow-ups declarados directamente por opciones y outcomes;
- scheduler runtime;
- selector del siguiente acontecimiento;
- políticas repeat/cooldown runtime;
- catálogo real de acontecimientos;
- validación integral del catálogo;
- selección y consumo runtime de eventos programados;
- API o servidor HTTP;
- frontend;
- base de datos o persistencia externa.

El motor ya puede aplicar de forma determinista un lote de `GameEffect`, devolver
el nuevo estado junto con sus registros auditables y seleccionar un
`ProbabilisticOutcome` elegible mediante `selectDeterministicOutcome`. El selector
valida el estado, los outcomes y su contexto, pero no resuelve un `GameEvent`
completo ni construye el registro de una decisión. Tampoco incluye migraciones
entre versiones de partidas.

`selectDeterministicOutcome(outcomes, state, context)` es una API pública pura y
read-only. `OutcomeSelectionContext` contiene `sourceEventId`,
`sourceEventVersion` y `choiceId`; los fallos controlados utilizan
`OutcomeSelectionError` y `OutcomeSelectionErrorCode`. La función evalúa la
availability contra el estado recibido, conserva el orden de los outcomes y
retorna exclusivamente el seleccionado. El futuro `ChoiceResolution` deberá
entregarle el estado posterior a los effects de la choice y después aplicar los
effects del outcome.

Un outcome sin `availability` es elegible. Si ninguno resulta elegible se produce
`NO_ELIGIBLE_OUTCOME`, sin fallback implícito. Los inputs inválidos, incluidos IDs
duplicados dentro del array, producen `INVALID_INPUT`. El namespace determinista
incluye seed y runId, por lo que se garantiza reproducibilidad con los mismos
inputs dentro de una partida, pero no se prometen todavía seeds compartibles entre
runs distintos.

`resolveGameEffects` implementa el orden secuencial, la atomicidad sobre una copia,
las operaciones numéricas, las relaciones, la programación mediante efectos, la
auditoría y los errores tipados. Valida el estado antes y después del lote y
recalcula `footballLevel` una sola vez al finalizar. Esta capacidad no equivale a
la resolución completa de acontecimientos.
La evolución de `AppliedEffect` elevó históricamente `GAME_VERSION` a `"0.3.0"`.
El contrato posterior de `HistoryKey` y safe counters lo elevó a la versión
`"0.4.0"`. El hardening de objetos runtime no representables fielmente en JSON
no cambió el formato persistido y mantuvo esa versión. Las invariantes de
identidad de las colecciones de `GameState` elevaron la versión actual a
`"0.5.0"`, porque documentos JSON antes aceptados con IDs duplicados pasaron a
ser inválidos. `GAME_VERSION` versiona cambios incompatibles del formato JSON,
no cada endurecimiento de la validación. No se implementaron migraciones ni un
gate automático que exija que todo estado tenga la versión actual.
