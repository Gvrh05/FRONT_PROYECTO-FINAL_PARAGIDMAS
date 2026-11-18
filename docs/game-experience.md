# Lobby, votos y podio

Esta ampliación incluye cambios aditivos de Backend y hooks autorizados para
sincronizar datos reales. No se sustituyen las credenciales, el transporte, la
reconexión, los guards ni la validación existente de respuestas.

## Interfaz

- La pregunta y los controles viven en `.game-stage`. Los nombres y puntos están
  exclusivamente en `.game-roster`, a la derecha en escritorio y debajo en móvil.
- Host e invitados eligen uno de diez búhos antes de crear/entrar. La preferencia
  del host/jugador autenticado se guarda en sessionStorage; la del invitado se
  guarda junto con su credencial por invitación. El servidor valida IDs 0–9.
- «¡Estoy listo!» es reversible y usa el estado confirmado del servidor. Al perder
  la última conexión en lobby se vuelve a «En espera». No se confunde desconexión
  de una pestaña antigua con desconexión total.
- «Comenzar Partida» mantiene las comprobaciones existentes de host, conexión,
  estado LOBBY y otro jugador conectado. Si no todos están listos, se explica que
  pulsarlo fuerza el comienzo; no se impone una nueva restricción al inicio REST.
- Los puntos de las tarjetas son los acumulados al cerrar rondas, no un cálculo
  del cliente. El podio usa el ranking del servidor, conserva empates y muestra
  hasta tres jugadores; el resto aparece en una tabla.

## Protocolo aditivo

- `join-session`: acepta opcionalmente `avatarId` (entero 0–9), sin identidad
  proporcionada por el cliente. Los payloads anteriores siguen siendo válidos.
- `set-ready`: `{ roomCode, ready: boolean }`. Identidad autenticada, pertenencia
  a la sala, jugador conectado y fase LOBBY se comprueban en el servidor.
- `participants-updated` y snapshots: agregan `avatarId`, `ready`, `score`, `isHost`.
  No contienen credenciales, sockets ni respuestas individuales.
- `answer-progress`: `{ roomCode, game }`, emitido solo tras aceptar una respuesta.
  Los snapshots de ronda incluyen `votesReceived` y `eligiblePlayers`; el total
  se fija al inicio (jugadores inscritos, incluidos desconectados, sin anfitrión).
  El contador vuelve a cero en cada pregunta y se recupera al reconectar.
- `game-finished`: agrega el avatar a las puntuaciones existentes.

Los campos nuevos son opcionales en los esquemas del frontend para tolerar
snapshots anteriores. Para tener todas las funciones hay que ejecutar la versión
actualizada tanto del Backend como del Frontend. No hay migración de tablas.

## Verificación

`pnpm build`, `pnpm lint`, `pnpm test` en frontend; `pnpm build`, `pnpm lint`,
`pnpm test --runInBand` en backend. Se cubren selección, presentación del podio,
separación de participantes/preguntas, botón de inicio, sincronización de Listo,
aislamiento por sala, limpieza de listeners, conservación de respuesta aceptada,
reconexión, permisos y conteo de respuestas únicas. No se iniciaron servidores ni
se presenta esta cobertura como una prueba visual real con varios navegadores.
