# Simulador narrativo de vida y fútbol

## Especificación funcional del sistema de acontecimientos — Versión 0.1

## 1. Objetivo

Definir el modelo funcional que permitirá representar, validar y resolver los acontecimientos narrativos del juego.

Un acontecimiento debe poder:

- aparecer solamente cuando el estado de la partida sea compatible;
- presentar una o más opciones;
- ocultar opciones que el personaje no tenga disponibles;
- modificar estadísticas y estados;
- crear o modificar relaciones;
- registrar flags y contadores;
- producir resultados probabilísticos deterministas;
- programar consecuencias futuras;
- formar cadenas narrativas;
- respetar la historia previa del personaje;
- evitar repeticiones excesivas;
- conservar la reproducibilidad de una partida.

El sistema debe permitir construir experiencias profesionales, amateurs y mixtas sin escribir un árbol narrativo rígido.

---

## 2. Principio narrativo

El juego sigue la estructura:

```text
Acontecimiento
      ↓
Opciones disponibles
      ↓
Elección del usuario
      ↓
Efectos inmediatos
      ↓
Posible resultado probabilístico
      ↓
Consecuencias futuras
      ↓
Actualización de la historia
```

Ejemplo:

Tus amigos te invitan a formar un equipo para jugar un torneo barrial. Ese mismo sábado tenés una prueba en las inferiores de un club.

Opciones:

Ir a la prueba.
Jugar con tus amigos.
Intentar hacer ambas cosas.
No participar y estudiar para un examen.

Cada opción puede modificar diferentes dimensiones de la vida del personaje.

3. Principios del sistema
3.1. Contenido previamente validado

Los acontecimientos serán definidos previamente y validados antes de utilizarse.

La inteligencia artificial podrá ayudar durante la creación editorial, pero no generará decisiones, efectos o resultados durante una partida normal.

3.2. Sin funciones dentro del contenido

Los acontecimientos no contendrán:

callbacks;
funciones JavaScript;
código ejecutable;
expresiones evaluadas dinámicamente;
acceso directo al entorno.

Las reglas se expresarán mediante estructuras de datos limitadas y validadas.

3.3. Motor determinista

El sistema no utilizará Math.random().

Cuando exista azar, el resultado dependerá de:

la seed de la partida;
el turno;
el acontecimiento;
la opción;
la posición dentro de la resolución.

La misma partida, con las mismas decisiones y la misma versión del contenido, debe producir el mismo resultado.

3.4. Resolución atómica

Una elección se aplicará como una única operación.

Si alguno de sus efectos deja el estado inválido:

no se guardará una modificación parcial;
no avanzará el turno;
no se registrará la decisión;
se devolverá un error.
3.5. Contenido separado del motor

El motor debe conocer cómo evaluar condiciones y aplicar efectos, pero no debe contener acontecimientos concretos.

Los acontecimientos serán almacenados posteriormente en un paquete de contenido independiente.

4. Alcance de esta especificación

Esta especificación define:

acontecimientos;
categorías;
disponibilidad;
condiciones;
opciones;
efectos;
resultados probabilísticos;
consecuencias futuras;
repetición y cooldown;
selección del siguiente acontecimiento;
registro de decisiones;
validaciones editoriales.

No define todavía:

interfaz;
diseño visual;
API HTTP;
base de datos;
autenticación;
panel de administración;
motor de partidos;
avance automático de edad o temporada;
contenido completo de la historia;
generación narrativa mediante IA.
5. Identificación y versionado

Cada acontecimiento tendrá un identificador estable y una versión.

type ContentId = string;
type EventId = ContentId;
type ChoiceId = ContentId;
type OutcomeId = ContentId;

type GameEvent = {
  id: EventId;
  version: number;

  title: string;
  description: string;

  category: EventCategory;
  tags: string[];

  availability: EventAvailability;
  selection: EventSelection;

  choices: EventChoice[];

  narrative?: EventNarrativeMetadata;
};
Reglas
id no puede cambiar una vez publicado.
version comienza en 1.
Si se modifican efectos, condiciones u opciones, se incrementa la versión.
EventId, ChoiceId, OutcomeId y chainId utilizarán el mismo patrón de identificador de contenido.
Los identificadores utilizarán minúsculas, números y guiones bajos.
El patrón no permite guiones bajos iniciales, finales o consecutivos.
Las opciones deben tener identificadores únicos dentro del acontecimiento.
Los acontecimientos deben tener identificadores únicos dentro del catálogo.

Ejemplos:

friends_team_or_club_trial
aunt_birthday_or_quarterfinal
agent_hides_foreign_offer
former_team_invites_player_back
6. Categorías
type EventCategory =
  | "football"
  | "education"
  | "work"
  | "family"
  | "friendship"
  | "relationship"
  | "health"
  | "finances"
  | "relocation"
  | "retirement";

Un acontecimiento tendrá una categoría principal y podrá utilizar tags para representar temas secundarios.

Ejemplo:

{
  "category": "football",
  "tags": [
    "adolescence",
    "friendship",
    "club_trial",
    "life_conflict"
  ]
}
7. Metadatos narrativos

Los acontecimientos podrán agruparse editorialmente.

type EventNarrativeMetadata = {
  chainId?: string;
  step?: number;
  tone?: EventTone;
};
type EventTone =
  | "positive"
  | "negative"
  | "neutral"
  | "dramatic"
  | "humorous";

Estos datos no determinan por sí solos la lógica de la partida.

chainId utiliza el mismo patrón de identificador de contenido que EventId, ChoiceId y OutcomeId.
narrative.step, cuando exista, debe ser un entero positivo.

Sirven para:

organizar cadenas;
revisar contenido;
evitar repeticiones de tono;
obtener estadísticas editoriales;
facilitar un futuro panel administrativo.

No existirá inicialmente una entidad runtime separada llamada EventChain. Las cadenas se formarán mediante:

chainId;
flags;
condiciones;
consecuencias programadas.
8. Disponibilidad de un acontecimiento
type EventAvailability = {
  minimumAge?: number;
  maximumAge?: number;

  lifeStages?: LifeStage[];
  careerTypes?: CareerType[];
  footballStatuses?: FootballStatus[];

  conditions?: EventConditionGroup;
};
Reglas
minimumAge debe ser igual o mayor que 14.
maximumAge no puede ser inferior a minimumAge.
Las listas vacías no serán válidas.
Los campos específicos son filtros rápidos.
conditions permite comprobar reglas adicionales.
Todos los filtros declarados deben cumplirse.

Ejemplo:

{
  "minimumAge": 14,
  "maximumAge": 17,
  "lifeStages": ["adolescence"],
  "careerTypes": ["undecided"],
  "conditions": {
    "mode": "all",
    "conditions": [
      {
        "type": "state",
        "field": "life.educationStatus",
        "operator": "equals",
        "value": "secondary_school"
      }
    ]
  }
}
9. Lenguaje controlado de condiciones

Las condiciones se representarán mediante una unión discriminada.

type EventCondition =
  | StateCondition
  | FlagCondition
  | CounterCondition
  | RelationshipCondition
  | EventHistoryCondition;

No se permitirán rutas arbitrarias capaces de modificar o ejecutar código.

9.1. Grupos de condiciones
type EventConditionGroup = {
  mode: "all" | "any";
  conditions: EventCondition[];
  negate?: boolean;
};

Comportamiento:

all: todas las condiciones deben cumplirse.
any: al menos una debe cumplirse.
negate: true: invierte el resultado final del grupo.
El grupo debe tener al menos una condición.
En la primera versión no habrá grupos anidados.

El operador in cubrirá muchos casos de alternativas sin necesitar grupos complejos.

9.2. Condiciones sobre el estado
type StateCondition = {
  type: "state";
  field: AllowedStateConditionField;
  operator: StateConditionOperator;
  value?: JsonValue;
};

Operadores:

type StateConditionOperator =
  | "equals"
  | "notEquals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "in"
  | "notIn"
  | "exists"
  | "notExists";

Las rutas permitidas estarán definidas en una unión explícita.

Primera lista aprobada:

type AllowedStateConditionField =
  | "stats.mood"
  | "stats.energy"
  | "stats.health"
  | "stats.family"
  | "stats.friends"
  | "stats.finances"
  | "stats.footballLevel"

  | "footballAttributes.talent"
  | "footballAttributes.technique"
  | "footballAttributes.physicalCondition"
  | "footballAttributes.tacticalUnderstanding"
  | "footballAttributes.discipline"
  | "footballAttributes.currentForm"
  | "footballAttributes.potential"
  | "footballAttributes.injuryRisk"

  | "life.age"
  | "life.currentYear"
  | "life.lifeStage"
  | "life.educationStatus"
  | "life.employmentStatus"
  | "life.relationshipStatus"
  | "life.occupationId"
  | "life.employerId"
  | "life.city"
  | "life.country"
  | "life.numberOfChildren"
  | "life.housingStatus"

  | "football.status"
  | "football.careerType"
  | "football.currentTeamId"
  | "football.currentClubId"
  | "football.currentContractId"
  | "football.currentAgentId"
  | "football.teamRole"
  | "football.teamTrust"
  | "football.coachTrust"
  | "football.professionalReputation"
  | "football.amateurReputation"
  | "football.salary"
  | "football.marketValue"
  | "football.isInjured"
  | "football.retirementStatus"

  | "currentSeason"
  | "currentTurn";

No se permitirá consultar cualquier propiedad mediante un string libre.

9.3. Condiciones sobre flags
type FlagCondition = {
  type: "flag";
  key: string;
  operator:
    | "equals"
    | "notEquals"
    | "exists"
    | "notExists";
  value?: HistoryFlagValue;
};

Ejemplo:

{
  "type": "flag",
  "key": "rejected_first_club_trial",
  "operator": "equals",
  "value": true
}
9.4. Condiciones sobre contadores
type CounterCondition = {
  type: "counter";
  key: string;
  operator:
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "greaterThanOrEqual"
    | "lessThan"
    | "lessThanOrEqual";
  value: number;
};

Ejemplo:

{
  "type": "counter",
  "key": "missed_important_matches",
  "operator": "greaterThanOrEqual",
  "value": 2
}

Un contador inexistente se interpretará como 0 para los operadores numéricos.

9.5. Condiciones sobre relaciones
type RelationshipSelector = {
  relationshipId?: string;
  type?: RelationshipType;
  requiredTags?: string[];
};

Debe existir al menos uno de los siguientes criterios:

relationshipId;
type;
requiredTags.
type RelationshipExistsCondition = {
  type: "relationship";
  mode: "exists";
  selector: RelationshipSelector;

  operator: "exists" | "notExists";
};

type RelationshipValueCondition = {
  type: "relationship";
  mode: "value";
  selector: RelationshipSelector;

  field:
    | "affection"
    | "trust"
    | "conflict"
    | "isActive"
    | "isAlive";

  operator:
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "greaterThanOrEqual"
    | "lessThan"
    | "lessThanOrEqual";

  value: JsonValue;
};

type RelationshipCondition =
  | RelationshipExistsCondition
  | RelationshipValueCondition;

El modo exists comprueba si existe o no una relación que cumpla el selector. No contiene field ni value.

El modo value compara un campo de las relaciones seleccionadas. Los operadores numéricos sólo pueden utilizarse con affection, trust y conflict. isActive e isAlive sólo pueden compararse mediante equals o notEquals y requieren valores booleanos.

Una relación cumple el selector cuando satisface todos los criterios declarados.

La condición se considera verdadera si al menos una relación compatible cumple la comparación.

Ejemplo:

{
  "type": "relationship",
  "mode": "value",
  "selector": {
    "type": "aunt_uncle",
    "requiredTags": ["favorite_aunt"]
  },
  "field": "affection",
  "operator": "greaterThan",
  "value": 70
}
9.6. Condiciones sobre acontecimientos anteriores
type EventHistoryCondition = {
  type: "event_history";
  eventId: string;
  operator:
    | "completed"
    | "notCompleted"
    | "completedAtLeast";
  count?: number;
};

Reglas:

completedAtLeast requiere count.
count debe ser un entero positivo.
Los demás operadores no deben recibir count.
10. Opciones
type EventChoice = {
  id: ChoiceId;
  label: string;
  description?: string;

  availability?: EventConditionGroup;

  effects: GameEffect[];
  outcomes?: ProbabilisticOutcome[];
  followUps?: FollowUpDefinition[];
};
Reglas
Un acontecimiento tendrá al menos una opción.
La mayoría de los acontecimientos debería tener entre dos y cuatro.
Una opción puede estar oculta por condiciones.
Debe quedar al menos una opción disponible cuando el acontecimiento aparece.
Los IDs deben ser únicos dentro del acontecimiento.
Los textos no pueden estar vacíos.
effects puede estar vacío si la opción sólo programa una consecuencia.
Una opción no puede modificar directamente stats.footballLevel.
11. Efectos
type GameEffect =
  | PlayerStatEffect
  | FootballAttributeEffect
  | LifeStateEffect
  | FootballStateEffect
  | FlagEffect
  | CounterEffect
  | RelationshipValueEffect
  | CreateRelationshipEffect
  | DeactivateRelationshipEffect
  | ScheduleEventEffect;
11.1. Estadísticas visibles
type MutablePlayerStatField =
  | "mood"
  | "energy"
  | "health"
  | "family"
  | "friends"
  | "finances";

type PlayerStatEffect = {
  type: "player_stat";
  field: MutablePlayerStatField;
  operation: "add" | "set" | "multiply";
  value: number;
};

footballLevel no es modificable directamente.

Después de alterar atributos futbolísticos, debe recalcularse.

11.2. Atributos futbolísticos
type FootballAttributeField =
  | "talent"
  | "technique"
  | "physicalCondition"
  | "tacticalUnderstanding"
  | "discipline"
  | "currentForm"
  | "potential"
  | "injuryRisk";

type FootballAttributeEffect = {
  type: "football_attribute";
  field: FootballAttributeField;
  operation: "add" | "set" | "multiply";
  value: number;
};

Los resultados se limitarán entre 0 y 100.

11.3. Estado de vida
type MutableLifeStateField =
  | "educationStatus"
  | "employmentStatus"
  | "relationshipStatus"
  | "occupationId"
  | "employerId"
  | "city"
  | "country"
  | "numberOfChildren"
  | "housingStatus";

type LifeStateSetEffect = {
  type: "life_state";
  operation: "set";
} & (
  | { field: "educationStatus"; value: EducationStatus }
  | { field: "employmentStatus"; value: EmploymentStatus }
  | { field: "relationshipStatus"; value: RelationshipStatus }
  | { field: "occupationId"; value: string }
  | { field: "employerId"; value: string }
  | { field: "city"; value: string }
  | { field: "country"; value: string }
  | { field: "numberOfChildren"; value: number }
  | { field: "housingStatus"; value: HousingStatus }
);

type LifeStateAddEffect = {
  type: "life_state";
  field: "numberOfChildren";
  operation: "add";
  value: number;
};

type LifeStateClearEffect = {
  type: "life_state";
  field: "occupationId" | "employerId";
  operation: "clear";
};

type LifeStateEffect =
  | LifeStateSetEffect
  | LifeStateAddEffect
  | LifeStateClearEffect;

Reglas:

add sólo se admite para numberOfChildren.
clear sólo se admite para occupationId y employerId, y no contiene value.
Los demás campos utilizan set con un valor compatible con el campo.
La edad y el año no se modificarán mediante eventos.
El avance temporal tendrá un módulo específico posterior.
11.4. Estado futbolístico
type MutableFootballStateField =
  | "status"
  | "careerType"
  | "currentTeamId"
  | "currentClubId"
  | "currentContractId"
  | "currentAgentId"
  | "teamRole"
  | "teamTrust"
  | "coachTrust"
  | "professionalReputation"
  | "amateurReputation"
  | "salary"
  | "marketValue"
  | "isInjured"
  | "currentInjuryId"
  | "retirementStatus";

type FootballStateEffect = {
  type: "football_state";
  field: MutableFootballStateField;
  operation: "set" | "add" | "clear";
  value?: JsonValue;
};

Reglas:

clear sólo se admite en campos opcionales.
add sólo se admite en campos numéricos.
Los valores de escala se limitan entre 0 y 100.
Salario y valor de mercado no pueden ser negativos.
La resolución completa debe respetar las invariantes de lesión y retiro.
11.5. Flags
type FlagEffect = {
  type: "flag";
  key: string;
  value: HistoryFlagValue;
};
11.6. Contadores
type CounterEffect = {
  type: "counter";
  key: string;
  operation: "increment" | "set";
  value: number;
};

Reglas:

Los contadores serán enteros.
set exige un entero igual o mayor que cero.
increment admite cualquier entero: negativo, cero o positivo.
set e increment rechazan valores fraccionarios.
Durante la futura resolución runtime, el resultado se limitará por defecto a un mínimo de cero. Esa lógica todavía no está implementada.
Las excepciones a esta política quedan fuera de la primera versión.
11.7. Modificación de relaciones
type RelationshipValueEffect = {
  type: "relationship_value";
  selector: RelationshipSelector;

  field:
    | "affection"
    | "trust"
    | "conflict";

  operation: "add" | "set";
  value: number;
};

El resultado se limita entre 0 y 100.

Si el selector coincide con varias relaciones, el efecto se aplica a todas.

11.8. Creación de relaciones
type RelationshipCreationDefinition = {
  id: string;
  characterId: string;
  type: RelationshipType;
  displayName: string;

  affection: number;
  trust: number;
  conflict: number;

  tags: string[];
};

type CreateRelationshipEffect = {
  type: "create_relationship";
  relationship: RelationshipCreationDefinition;
  conflictPolicy: "error" | "ignore";
};

Comportamiento:

error: falla si ya existe el ID.
ignore: no crea una segunda relación.
En esta versión no se reemplazará automáticamente una relación existente.

Durante la resolución futura, el motor completará la relación con:

startedAtAge: state.life.age;
isActive: true;
isAlive: true.

Los identificadores deben venir definidos por el contenido o derivarse de manera determinista durante la resolución.

11.9. Desactivación de relaciones
type DeactivateRelationshipEffect = {
  type: "deactivate_relationship";
  relationshipId: string;
};

No elimina la relación de la historia.

Establece:

isActive: false
11.10. Programación de acontecimientos
type ScheduleEventEffect = {
  type: "schedule_event";
  followUp: FollowUpDefinition;
};

Una opción también puede declarar followUps directamente. Ambas formas producen el mismo resultado interno.

12. Resultados probabilísticos
type ProbabilisticOutcome = {
  id: OutcomeId;
  weight: number;

  availability?: EventConditionGroup;

  effects: GameEffect[];
  followUps?: FollowUpDefinition[];
};
Reglas
weight debe ser un entero positivo.
Un resultado debe contener al menos un efecto o al menos un follow-up.
effects y followUps no pueden estar ambos ausentes o vacíos.
Los pesos no necesitan sumar 100.
Primero se filtran los resultados compatibles.
Después se normalizan sus pesos.
Se elige exactamente uno.
La selección será determinista.
Si no queda ningún resultado compatible, la resolución debe fallar sin modificar el estado.
Todo grupo publicado debería incluir al menos un resultado sin condiciones como alternativa segura.

Ejemplo:

[
  {
    "id": "accepted",
    "weight": 20,
    "effects": [
      {
        "type": "football_state",
        "field": "status",
        "operation": "set",
        "value": "academy"
      }
    ]
  },
  {
    "id": "rejected",
    "weight": 70,
    "effects": [
      {
        "type": "player_stat",
        "field": "mood",
        "operation": "add",
        "value": -8
      }
    ]
  },
  {
    "id": "return_for_second_trial",
    "weight": 10,
    "effects": [
      {
        "type": "flag",
        "key": "invited_to_second_trial",
        "value": true
      }
    ]
  }
]
13. Orden de resolución de una opción

Una elección se resolverá en este orden:

1. Validar el GameState actual.
2. Validar el acontecimiento.
3. Confirmar que el acontecimiento esté disponible.
4. Confirmar que la opción esté disponible.
5. Crear una copia de trabajo del estado.
6. Aplicar los efectos deterministas de la opción.
7. Resolver un resultado probabilístico, si existe.
8. Aplicar los efectos del resultado.
9. Programar consecuencias futuras.
10. Recalcular footballLevel.
11. Validar el estado resultante.
12. Registrar la decisión.
13. Actualizar historial de acontecimientos.
14. Incrementar currentTurn.
15. Devolver el nuevo estado y el resumen de resolución.

Si un paso falla, se devuelve el estado original sin cambios.

14. Consecuencias futuras

FollowUpTrigger representa una definición relativa declarada por el contenido. Todavía no es una consecuencia persistida.

type FollowUpTrigger =
  | {
      type: "turn";
      afterTurns: number;
    }
  | {
      type: "age";
      atAge: number;
    }
  | {
      type: "season";
      atSeason: number;
    }
  | {
      type: "condition";
      conditions: EventConditionGroup;
    };

type FollowUpDefinition = {
  eventId: EventId;
  trigger: FollowUpTrigger;
  priority: number;
};
Reglas
afterTurns debe ser un entero igual o mayor que 1.
atAge debe ser un entero igual o mayor que 14.
atSeason debe ser un entero igual o mayor que 1.
priority debe ser un entero.
El evento referenciado debe existir en el catálogo.
La definición se transforma en un ScheduledEvent persistible.
El ID del ScheduledEvent se genera de forma determinista.

Ejemplo conceptual:

runId
+
currentTurn
+
sourceEventId
+
choiceId
+
followUpIndex
15. Evolución de ScheduledEvent

El ScheduledEvent definido durante la Etapa 1 fue adaptado al sistema formal de condiciones.

FollowUpTrigger es relativo al momento de resolución. ScheduledEvent representa la consecuencia ya programada y persistida, por lo que utiliza valores absolutos.

Debe continuar almacenando:

ID propio;
evento de destino;
tipo de trigger;
valor absoluto de activación;
condiciones;
evento de origen;
prioridad;
turno de creación;
estado consumido.

Los triggers relativos deben convertirse al programarse.

ScheduledEvent es una unión discriminada por triggerType:

type ScheduledEventCommon = {
  id: string;
  eventId: string;
  sourceEventId: string;
  priority: number;
  createdAtTurn: number;
  consumed: boolean;
};

type ScheduledEvent = ScheduledEventCommon & (
  | {
      triggerType: "turn";
      triggerValue: number;
    }
  | {
      triggerType: "age";
      triggerValue: number;
    }
  | {
      triggerType: "season";
      triggerValue: number;
    }
  | {
      triggerType: "condition";
      conditions: EventConditionGroup;
    }
);

Las variantes turn, age y season requieren triggerValue y no admiten conditions.
La variante condition requiere EventConditionGroup y no admite triggerValue.

Ejemplo:

currentTurn: 8
afterTurns: 2
        ↓
triggerValue: 10

No existe todavía información persistida de producción, por lo que esta adaptación no necesita una migración de datos.

El primer contrato técnico del sistema de eventos actualizó `GAME_VERSION` a "0.2.0". DecisionRecord incorporó eventVersion y ScheduledEvent pasó a ser una unión discriminada, por lo que el formato persistible evolucionó de manera incompatible. No se implementaron migraciones porque no existen partidas persistidas de producción.

16. Políticas de selección
type EventSelection =
  | MandatoryEventSelection
  | WeightedEventSelection;

type EventRepeatPolicy =
  | {
      type: "once_per_run";
    }
  | {
      type: "repeatable";
    }
  | {
      type: "cooldown";
      turns?: number;
      seasons?: number;
    };

type MandatoryEventSelection = {
  mode: "mandatory";
  priority: number;
  repeatPolicy: EventRepeatPolicy;
};

type WeightedEventSelection = {
  mode: "weighted";
  priority: number;
  weight: number;
  repeatPolicy: EventRepeatPolicy;
};
Reglas
weight debe ser un entero positivo.
priority debe ser un entero.
Un cooldown debe declarar turnos, temporadas o ambos.
Los cooldowns deben utilizar enteros positivos.
once_per_run excluye el evento después de su primera resolución.
Un acontecimiento programado no depende de su peso normal.
17. Selección del siguiente acontecimiento

El motor seguirá este orden:

1. Buscar consecuencias programadas vencidas.
2. Elegir la de mayor prioridad.
3. Si no hay, buscar acontecimientos obligatorios disponibles.
4. Elegir el obligatorio de mayor prioridad.
5. Si no hay, obtener acontecimientos ponderados disponibles.
6. Excluir los bloqueados por repetición o cooldown.
7. Calcular los pesos vigentes.
8. Elegir mediante el generador determinista.
Desempates

Los desempates deben ser estables.

Orden recomendado:

priority descendente
→ turno de creación ascendente
→ eventId alfabético

Para acontecimientos ponderados, el peso define la selección. El orden del catálogo no debe alterar un resultado para la misma seed.

18. Repetición y cooldown

El motor utilizará:

completedEventIds;
recentEventIds;
registros de decisiones;
turno actual;
temporada actual.

Para aplicar correctamente los cooldowns será necesario conocer la última resolución de cada evento.

La implementación podrá obtenerlo inicialmente desde history.decisions.

No se agregará un índice persistido adicional hasta comprobar que es necesario por rendimiento.

19. Evolución del historial

DecisionRecord incorpora:

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
Motivo

Esto permitirá:

reproducir una partida;
saber qué versión del contenido se utilizó;
registrar el resultado probabilístico;
investigar errores;
mostrar un resumen histórico;
migrar contenido en el futuro.

outcomeId estará ausente cuando la opción no tenga resultados probabilísticos.
eventVersion debe ser un entero positivo y no recibe un valor por defecto silencioso.

20. Resultado de resolución

ChoiceResolution es un diseño futuro. No forma parte del primer commit técnico y todavía no se crearán ChoiceResolutionSchema ni ChoiceResolution.

type ChoiceResolution = {
  previousState: GameState;
  nextState: GameState;

  eventId: string;
  eventVersion: number;
  choiceId: string;
  outcomeId?: string;

  appliedEffects: AppliedEffect[];
  scheduledEventIds: string[];

  turnBefore: number;
  turnAfter: number;
};

ChoiceResolution se implementará junto con el resolvedor de efectos, después de evolucionar AppliedEffect para representar todas las operaciones reales. En ese momento, el motor decidirá si previousState forma parte de la respuesta pública o sólo se utiliza en tests y debugging.

21. Registro de efectos aplicados

Las definiciones de efectos y el registro de efectos son conceptos distintos.

Ejemplo de definición:

{
  "type": "player_stat",
  "field": "mood",
  "operation": "add",
  "value": -8
}

Ejemplo de registro:

{
  "field": "stats.mood",
  "operation": "add",
  "previousValue": 70,
  "appliedValue": -8,
  "resultingValue": 62
}

AppliedEffect continuará siendo una representación serializable del cambio realmente realizado.

AppliedEffect se mantendrá sin cambios en el primer commit técnico. Se evolucionará en el commit de resolución de efectos para representar correctamente:

add;
set;
multiply;
clear;
increment;
create relationship;
deactivate relationship;
schedule event.

22. Almacenamiento del contenido

Los acontecimientos se almacenarán inicialmente fuera del motor.

Estructura futura recomendada:

packages/
  game-content/
    src/
      events/
        adolescence/
        professional/
        amateur/
        family/
        relationships/
        work/
        health/
        retirement/

      event-catalog.ts
      index.ts

La decisión inicial recomendada es utilizar objetos de datos TypeScript con:

satisfies GameEvent

y validación Zod adicional.

Condiciones:

los archivos sólo exportarán datos;
no podrán exportar funciones;
todo el catálogo será validado en tests;
no se incorporará game-content hasta tener finalizado el contrato de eventos.

Más adelante, el contenido podrá migrarse a JSON o a PostgreSQL sin cambiar el motor.

23. Validación del catálogo

GameEventSchema valida públicamente la estructura declarativa mediante Zod. Rechaza propiedades explícitamente iguales a undefined, referencias circulares y valores no persistibles. Acepta referencias compartidas que no formen un ciclo y no transforma ni muta los datos recibidos. `parse` y `safeParse` conservan el comportamiento estándar de Zod: `parse` lanza `ZodError` ante datos inválidos y `safeParse` devuelve un resultado con `success: false`.

Antes de publicar contenido, el catálogo debe comprobar:

IDs únicos de acontecimientos.
Versiones enteras positivas.
IDs únicos de opciones por evento.
IDs únicos de resultados por opción.
Al menos una opción por evento.
Textos obligatorios no vacíos.
Edades válidas.
Operadores compatibles con sus valores.
Campos de estado permitidos.
Pesos positivos.
Repeat policies válidas.
Cooldowns válidos.
Efectos válidos.
Ausencia de modificación directa de footballLevel.
Referencias a eventos existentes.
Al menos una opción disponible para todo evento seleccionable.
Ausencia de valores no serializables.
Ausencia de funciones.
Ausencia de undefined explícito.
Ausencia de ciclos directos imposibles de resolver.
24. Ejemplo funcional resumido
const event: GameEvent = {
  id: "friends_team_or_club_trial",
  version: 1,

  title: "Dos caminos",
  description:
    "Tus amigos forman un equipo, pero ese sábado tenés una prueba en un club.",

  category: "football",
  tags: ["adolescence", "friendship", "club_trial"],

  availability: {
    minimumAge: 14,
    maximumAge: 17,
    careerTypes: ["undecided"],
    conditions: {
      mode: "all",
      conditions: [
        {
          type: "state",
          field: "life.educationStatus",
          operator: "equals",
          value: "secondary_school"
        }
      ]
    }
  },

  selection: {
    mode: "mandatory",
    priority: 100,
    repeatPolicy: {
      type: "once_per_run"
    }
  },

  choices: [
    {
      id: "attend_trial",
      label: "Ir a la prueba",
      effects: [
        {
          type: "player_stat",
          field: "friends",
          operation: "add",
          value: -5
        },
        {
          type: "football_state",
          field: "status",
          operation: "set",
          value: "trying_out"
        }
      ],
      outcomes: [
        {
          id: "accepted",
          weight: 20,
          effects: [
            {
              type: "football_state",
              field: "status",
              operation: "set",
              value: "academy"
            }
          ]
        },
        {
          id: "rejected",
          weight: 80,
          effects: [
            {
              type: "player_stat",
              field: "mood",
              operation: "add",
              value: -8
            },
            {
              type: "counter",
              key: "club_trial_rejections",
              operation: "increment",
              value: 1
            }
          ]
        }
      ]
    },
    {
      id: "join_friends",
      label: "Jugar con tus amigos",
      effects: [
        {
          type: "football_state",
          field: "status",
          operation: "set",
          value: "friends_team"
        },
        {
          type: "football_state",
          field: "careerType",
          operation: "set",
          value: "amateur_path"
        },
        {
          type: "player_stat",
          field: "friends",
          operation: "add",
          value: 10
        }
      ]
    },
    {
      id: "try_both",
      label: "Intentar llegar a los dos",
      effects: [
        {
          type: "player_stat",
          field: "energy",
          operation: "add",
          value: -15
        }
      ]
    }
  ]
};

Este ejemplo es ilustrativo. No constituye todavía el contenido definitivo ni el balance final.

25. Estrategia de implementación por commits

La etapa se dividirá en unidades pequeñas y funcionalmente cerradas.

Orden recomendado:

1. Documentación funcional.
2. Esquemas de acontecimientos y opciones.
3. Evaluador de condiciones.
4. Resolución de efectos deterministas.
5. Resultados probabilísticos deterministas.
6. Consecuencias programadas.
7. Selección del siguiente acontecimiento.
8. Catálogo inicial y validación editorial.

Cada commit debe:

representar una única responsabilidad;
mantener el proyecto compilable;
incluir sus tests;
pasar las verificaciones acordadas;
evitar cambios no relacionados.
26. Fuera del alcance inmediato

El primer commit técnico incluirá exclusivamente:

tipos y esquemas de eventos;
condiciones;
opciones;
efectos declarativos;
outcomes;
follow-ups;
selección;
repeat policies;
evolución de DecisionRecord;
evolución de ScheduledEvent.

No se implementará en el primer commit técnico:

ChoiceResolution;
evolución de AppliedEffect;
evaluador de condiciones;
aplicación de efectos;
selección probabilística;
scheduler;
selector del siguiente acontecimiento;
catálogo real;
interfaz;
API;
base de datos.

El primer commit técnico posterior a esta documentación deberá limitarse a los esquemas y tipos del contrato de acontecimientos y a las evoluciones estructurales persistibles enumeradas. No incluirá evaluación, aplicación, selección runtime ni catálogo.

27. Criterios de aceptación de la especificación

La especificación está aprobada cuando:

los acontecimientos pueden expresarse exclusivamente como datos;
las condiciones no ejecutan código;
los campos consultables están controlados;
los efectos están tipados;
footballLevel no puede modificarse directamente;
las decisiones pueden generar resultados probabilísticos;
el azar será reproducible;
las consecuencias futuras son persistibles;
las cadenas pueden construirse sin un árbol rígido;
la historia registra versión, opción y resultado;
el contenido puede separarse del motor;
la etapa puede dividirse en commits pequeños.

## Commit de documentación

Después de crear el archivo:

```bash
git add ESPECIFICACION_SISTEMA_EVENTOS.md
git diff --cached --check
git diff --cached --stat
git commit -m "AMTR-050826 | docs: define event system functional specification"
git status
```

Este commit debe contener únicamente el documento nuevo.
