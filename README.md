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
vacío. El motor utiliza internamente `GAME_VERSION`, actualmente `"0.2.0"`.

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
- `DecisionRecord` con versión del acontecimiento y outcome opcional;
- `ScheduledEvent` como unión discriminada de triggers absolutos;
- `GAME_VERSION = "0.2.0"`.

Todavía no está implementado:

- evaluación de condiciones;
- aplicación de efectos;
- resolución de elecciones;
- selección determinista de outcomes;
- scheduler runtime;
- selector del siguiente acontecimiento;
- catálogo real de acontecimientos;
- API o servidor HTTP;
- frontend;
- base de datos o persistencia externa.

El contrato permite describir y validar acontecimientos como datos, pero el juego
todavía no puede resolverlos. Tampoco incluye migraciones entre versiones de
partidas.
