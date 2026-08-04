# Amateur App

Modelo de dominio y estado inicial de un simulador narrativo de vida y carrera
futbolística. Esta etapa implementa únicamente bibliotecas TypeScript: no incluye
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
vacío. El motor utiliza internamente `GAME_VERSION`, actualmente `"0.1.0"`.

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

## Limitaciones actuales

Esta etapa no implementa API, servidor, frontend, base de datos, persistencia
externa, autenticación, eventos narrativos, selección o aplicación de eventos,
avance de turnos o edad, clubes, equipos, contratos, representantes o lesiones
concretas, IA ni rankings. Tampoco incluye migraciones entre versiones de
partidas.
