# Aplicación de PROMPT_JUEGO_TIRO_AL_ARCO.md

## Uso y alcance

### Crear fútbol sin cuestionario (flujo corregido)

Hay tres accesos al mismo formulario:

1. **Dashboard → Crear partida → Actividad de la sala → Tiro al Arco · sin preguntas**.
2. **Quices → Nuevo cuestionario → Crear Tiro al Arco sin preguntas**.
3. Al agregar una pregunta, **Tipo de actividad → Tiro al Arco**, junto a
   **Opción múltiple (2–5 opciones)** y **Verdadero / Falso**.

Al elegir fútbol se ocultan enunciado, respuestas, puntos y tiempo. Solo se piden
nombre (obligatorio), descripción y foto opcional. Crear lleva al lobby propio;
se comparte código/QR y el host pulsa **Iniciar Tiro al Arco · 40 s** cuando haya
otro jugador conectado. No se inicia el cronómetro mientras se llena el formulario.
Si se vuelve a trivia antes de guardar, se conserva el borrador anterior. No se
permite convertir una pregunta ya guardada en una sala al editarla.

Estas salas no tienen cuestionario (`quizId:null`, `activity:GOAL_KICK` en el
contrato de memoria), ni crean preguntas vacías o resultados ficticios en DB.
El servidor rechaza iniciar trivia en ellas. Se puede repetir el fútbol tras
volver al lobby. Son salas temporales, **no plantillas persistentes en Quices**:
caducan a las 12 horas y se pierden al reiniciar el proceso Backend.

`POST /game-sessions/goal-kick` usa la autenticación existente y multipart con
`name`, `description?`, `image?`. El DTO rechaza campos extra. Se conserva intacto
`POST /game-sessions` con su quizId para la trivia. Las entidades/migraciones y
los tipos de pregunta persistidos no cambian.

Las fotos admiten JPEG/PNG/WebP de hasta 5 MiB y 25 megapíxeles. Se decodifican
con Sharp (dependencia ya existente), sin animación, y se normalizan a WebP de
máximo 960×540 y 512 KiB. Se mantienen únicamente en memoria, con límite global
de 100 salas independientes y dos decodificaciones simultáneas; se liberan al
eliminar/caducar sala. El endpoint de portada está vinculado a la invitación
pública vigente y usa `no-store`/`nosniff`; no se guardan rutas de usuario ni URLs
externas. Nombre, descripción y portada se recuperan en snapshots de host,
cuenta e invitado, sin transmitir el Buffer de imagen por WebSocket.

En una sala en LOBBY, el host puede pulsar **Iniciar Tiro al Arco · 40 s** si hay
otro jugador conectado. Cada jugador, de cuenta o invitado, juega en paralelo.
El host observa el ranking, puede cancelar y después volver al lobby. Solo al
volver al lobby se permite iniciar trivia u otra actividad/admitir nuevos usuarios.
Esta última posibilidad de cambiar a trivia requiere una sala asociada a un
cuestionario; las salas independientes nuevas son exclusivamente de fútbol.

### Selector de actividad del host

Con `VITE_GOAL_KICK_ENABLED=true`, el lobby de una sala de cuestionario muestra
dos tarjetas de selección con radios nativos accesibles: **Trivia** y
**Minijuego: Tiro al Arco**, cada una con descripción.
Trivia está seleccionada por defecto. Un único botón muestra «Comenzar Partida»
o «Iniciar Tiro al Arco · 40 s», según la selección; seleccionar una tarjeta no
inicia la actividad automáticamente.

La trivia conserva su inicio REST autorizado mediante `startSession(roomCode)`;
el fútbol llama `sendGoalKickCommand({ action: 'start' })`, que ya emite
`game:start-minigame` por el socket existente. No se añade un nuevo protocolo de
inicio de trivia. Se conservan las preguntas múltiples de 2–5 opciones y los
modos de puntuación incorporados por los compañeros. Las salas independientes
ya creadas con `activity:GOAL_KICK` siempre inician fútbol, nunca un REST de trivia,
aunque el selector de salas de cuestionario esté oculto por la bandera de build.
Mientras se espera confirmación se bloquean tanto la selección como el inicio.
Se requieren identidad host, conexión y otro participante conectado.

Al llegar el estado del servidor, el selector se reemplaza por `GoalKickHostPanel`
para el profesor observador, mientras invitados/jugadores muestran `GoalKickGame`
y su Canvas automáticamente. El modo elegido no se publica como estado de juego
hasta recibir confirmación; no se modifica la física ni se crea otro socket.

El minijuego conserva su estado en memoria, igual que las salas activas. Reiniciar
el proceso Backend pierde la actividad; no se añade persistencia ni migraciones.
Auth, JWT, CORS, puertos y los datos del usuario no se modifican.

## Panel educativo y avatares

- `TestCredentialsPanel.tsx` muestra Profesor `profesor_test / Profesor123!` y
  Alumno `Invitado por QR`, con tres botones de copia independientes del submit.
- Visible en desarrollo salvo `VITE_EDUCATIONAL_DEMO=false`. En builds normales
  de producción está oculto; para una entrega demo se habilita explícitamente
  con `VITE_EDUCATIONAL_DEMO=true` **antes del build**. Nunca usar con datos reales:
  son credenciales conocidas y la cuenta del sistema puede tener rol MASTER.
- No se restablece una cuenta existente. Si su contraseña difiere, corresponde
  informar al responsable, no sobrescribir su hash.
- Clipboard denegado/ausente muestra instrucciones de selección y copia manual.
  No se añaden timers ni logs con contraseñas.
- Se agregan astronauta, pirata, zombie sin gore, vaquero y científico loco como
  IDs 10–14/variantes 11–15. Los primeros diez mantienen su orden. Se extienden
  rangos de entrada/snapshot/credencial/resultados a 0–14 en ambos proyectos.
  Conservan transparencia, gradientes únicos y movimiento reducido.

| ID del protocolo | Variante SVG | Tema |
|---|---|---|
| 10 | 11 | Astronauta |
| 11 | 12 | Pirata |
| 12 | 13 | Zombie |
| 13 | 14 | Vaquero |
| 14 | 15 | Científico loco |

## Estados y física

```
DIRECTION → (primer clic) CURVE → (segundo clic) SUBMITTING
→ FLIGHT → RESULT → DIRECTION / FINISHED
```

Canvas y botón accesible usan la misma acción, sin pointerdown+click duplicados.
La dirección barre linealmente 200→800→200 en 2400ms, con destino y=104. Al fijarla,
la curva oscila como `260*sin(2π*t/2200)`. El segundo clic congela el frame visible.

Mundo lógico 1000×700; balón circular de radio 8 en (500,620). Para destino P3,
P1 y P2 son los tercios de la recta P0→P3 más `(k,0)`. Se usa una única Bézier
cúbica para la guía y el vuelo de 900ms, sin easing alternativo. La amplitud ±260
desplaza la curva ±195 unidades en el centro. Parámetros cuantizados a 0.01 por
el servidor. Frame rate o DPR no cambian física ni puntos.

Los personajes se dibujan con las dimensiones de cabeza, torso y piernas de sus
colliders. Los nombres/sombras no colisionan. La trayectoria se aplana adaptando
De Casteljau a 0.2 unidades; cada segmento barre el círculo contra círculos y
rectángulos redondeados de Minkowski. Los cuadrados inflados no se usan como
prueba final de esquinas. Se elige el primer contacto con tolerancia conservadora
máxima de 0.2 unidades, sin depender de frames del cliente.

La predicción visual detiene el balón en el mismo contacto mientras llega el
evento, pero **no declara gol ni concede puntos**. Se verifica la paridad de ambas
implementaciones con 189 trayectorias, puntos Bézier y contactos exactos.

Defensas: 2–3 por intento, RNG del servidor, sin solaparse; búsqueda acotada a
20 tableros con ruta curvada viable a una esquina y fallback probado/mirrored.
Después de cada resultado hay 350ms de pausa y otro attemptId/formación.
El portero permanece quieto. Su nombre pertenece a otro jugador inscrito, con
preferencia por conectados; para un solo jugador aparece «Portero de práctica».

## Autoridad, tiempo y puntuación

- El servidor fija `endsAt=startedAt+40000`. No se renueva con sync ni reconexión.
- Se aceptan comandos de tiro antes del deadline, pero un gol cuyo impacto sea
  exactamente en el deadline o después no cuenta. Se liquida como TIMEOUT.
- El motor liquida impactos anteriores al deadline antes del resultado final,
  incluso si los callbacks se retrasan.
- **Fútbol: +10 por gol, 0 por fallo**. Ledger exclusivo `goals*10`.
- **Trivia clásica: 20 por acierto +5 antes de la mitad del tiempo**. También se
  conservan Contrarreloj (`speed`, 25→5 según tiempo) y Precisión (`precision`,
  25 por acierto). El host elige el modo al crear una sala de cuestionario.
  La integración no modifica `live-game.ts` ni mezcla el ledger del fútbol con
  esos modos, contadores de aciertos o resultados persistidos.
- Un vuelo por identidad, caché de commandId/attemptId, límite de intentos y rate
  limit. Un retry no genera otro shotId ni puntúa otra vez. Parámetros cambiados
  para un commandId existente se rechazan.
- Se congelan altas mientras la actividad exista. Las identidades desconectadas
  se conservan para recuperar la sesión. Un socket viejo no desconecta al nuevo.
- Timers de contacto/cooldown/deadline usan el lock de sala y comprueban la
  identidad de instancia. Se limpian al cancelar/volver/eliminar/destruir módulo.

## Eventos y snapshots

Se reutilizan namespace `/game`, handshake y lease existentes. No hay otro socket.

| Cliente → servidor | Campos además de roomCode |
|---|---|
| `game:start-minigame` | commandId |
| `game:shoot` | gameId, attemptId, commandId, aimX, curve |
| `game:sync` | gameId opcional |
| `game:cancel` | gameId, commandId |
| `game:return-lobby` | gameId, commandId |

Servidor: `game:started`, `game:state`, `game:attempt-ready`, `game:shot-accepted`,
`game:shot-result`, `game:goal`, `game:scoreboard`, `game:ended`,
`game:lobby-restored`, `game:error`.

Los eventos privados transportan `state` discriminado host/jugador y los campos
particulares del intento/tiro/resultado. Incluyen roomCode, gameId, eventId y
serverNow. En `game:error`, gameId es opcional porque también hay comandos que
fallan antes de crear o identificar una actividad.
Los broadcasts contienen únicamente ranking/configuración pública, no tableros
privados, tokens o IDs internos de sockets. Un estado privado se envía a todos
los sockets de esa identidad. El snapshot de invitado incluye la actividad sin
hostId/quizId privados nuevos.

`revision` pertenece al jugador; `scoreboardVersion`, al ranking global. No se
descarta un tablero propio nuevo porque otro jugador haya marcado más goles.
`game:sync` permite recuperar vuelo/resultado/READY sin un nuevo intento gratuito.
El hook rechaza salas y actividades retiradas, limpia sus listeners y mantiene
las suscripciones de trivia. Pending/errores del fútbol son independientes.
Si se pierde `game:lobby-restored` estando offline, el siguiente snapshot de sala
sin actividad elimina el minijuego local y descarta sus mensajes tardíos.
Los empates usan ranking competitivo (1,1,3), sin desempate por latencia.

## Archivos

### Frontend: FRONT_PROYECTO-FINAL_PARAGIDMAS

Archivos nuevos, rutas relativas al repositorio:

```text
docs/goal-kick.md
scripts/verify-goal-kick-browser.cjs
scripts/verify-goal-kick-parity.cjs
src/components/TestCredentialsPanel.css
src/components/TestCredentialsPanel.test.tsx
src/components/TestCredentialsPanel.tsx
src/components/ActivityTypeSelect.tsx
src/features/goal-kick/contracts.test.ts
src/features/goal-kick/contracts.ts
src/features/goal-kick/goal-kick.css
src/features/goal-kick/GoalKickCanvas.tsx
src/features/goal-kick/GoalKickGame.tsx
src/features/goal-kick/GoalKickHostPanel.tsx
src/features/goal-kick/GoalKickRoomDetails.tsx
src/features/goal-kick/GoalKickRoomForm.tsx
src/features/goal-kick/physics.test.ts
src/features/goal-kick/physics.ts
src/features/goal-kick/presentation.test.tsx
src/features/goal-kick/room-authoring.test.tsx
src/features/goal-kick/test-fixture.ts
src/features/goal-kick/useGoalKickPresentation.ts
src/vite-env.d.ts
```

Archivos modificados:

```text
.env.example
scripts/verify-login-avatars.cjs
src/api/gameSessions.ts
src/components/AvatarSelector.tsx
src/components/GameExperience.test.tsx
src/components/LoginForm.tsx
src/components/QuestionForm.tsx
src/components/QuizForm.tsx
src/components/OwlAvatar.test.tsx
src/components/OwlAvatar.tsx
src/components/avatars.css
src/pages/GuestJoinPage.tsx
src/pages/HostLobbyPage.tsx
src/pages/HostCreateSessionPage.tsx
src/pages/LobbyExperience.test.tsx
src/pages/PlayerLobbyPage.tsx
src/realtime/guest.test.tsx
src/realtime/useSessionLobby.ts
```

La integración del selector también crea `src/pages/HostLobbyPage.css`, con
tarjetas mate de dos columnas que se apilan en pantallas pequeñas.

### Backend: BACKEND_PROYECTO-FINAL-PARADIGMAS

Archivos nuevos:

```text
src/modules/game-session/dto/goal-kick-command.dto.ts
src/modules/game-session/dto/create-goal-kick-room.dto.ts
src/modules/game-session/engine/goal-kick-game.spec.ts
src/modules/game-session/engine/goal-kick-game.ts
src/modules/game-session/engine/goal-kick-physics.spec.ts
src/modules/game-session/engine/goal-kick-physics.ts
src/modules/game-session/services/goal-kick.integration.spec.ts
src/modules/game-session/services/goal-kick-room-images.service.ts
test/goal-kick.websocket.e2e-spec.ts
```

Archivos modificados:

```text
src/modules/game-session/engine/session-manager.spec.ts
src/modules/game-session/engine/session-manager.ts
src/modules/game-session/gateways/game.gateway.ts
src/modules/game-session/services/game-session.service.ts
src/modules/game-session/controllers/game-session.controller.ts
src/modules/game-session/controllers/public-invitations.controller.ts
src/modules/game-session/dto/session-response.dto.ts
src/modules/game-session/game-session.module.ts
test/game-session.e2e-spec.ts
```

Sin modificaciones a `socket.ts`, `DashboardPage.tsx`, `live-game.ts`, entidades,
migraciones, TokenVerifier ni archivos del repositorio Auth. Sin dependencias nuevas.

## Verificación reproducible y resultados

Frontend: `pnpm build`, `pnpm lint`, `pnpm exec vitest run --maxWorkers=1`,
`pnpm verify:production`. Backend: `pnpm build`, `pnpm lint`,
`pnpm test --runInBand`,
`pnpm test:e2e --runInBand --testPathPatterns=goal-kick.websocket`.

Resultados de la implementación inicial, antes de añadir el selector:

| Comprobación | Resultado |
|---|---|
| Frontend build y lint | Correctos |
| Frontend Vitest, un worker | 27 archivos, 72 pruebas aprobadas |
| Frontend verify:production | Correcto, comprobaciones originales intactas |
| Backend build y lint | Correctos |
| Backend Jest | 26 suites, 146 pruebas aprobadas |
| E2E Socket.IO aislado | 1 prueba aprobada |
| Paridad física v1 | 189 trayectorias aprobadas |
| Smoke de navegador aislado | Aprobado; alcance y fixtures descritos abajo |

El build Frontend advierte un chunk JS de 617.62 kB (194.82 kB gzip), superior
al umbral de aviso de 500 kB; no es un error de compilación. No se modificó el
umbral para ocultarlo. La primera verificación final fue interrumpida por el
reinicio del servidor de herramientas; la ejecución posterior terminó con éxito,
incluida la regresión del retorno al lobby perdido durante desconexión.

Después del build Backend, desde Frontend:

```powershell
node scripts/verify-goal-kick-parity.cjs
# Edge/Playwright instalados; si es externo, configurar PLAYWRIGHT_MODULE:
node scripts/verify-goal-kick-browser.cjs
```

El smoke de navegador inicia HTTP/Socket.IO y Vite en puertos efímeros y los
cierra. Usa la UI, gateway, SessionManager, servicio y física reales; **Auth de
cuenta y repositorio de DB son fixtures en memoria**. No es una validación del
despliegue Railway/Netlify ni del Auth real. No crea cuentas/salas en datos del
usuario. Verifica tres contextos (host, cuenta, invitado móvil), avatares nuevos,
dos clics, gol confirmado, recarga durante vuelo sin renovar deadline, expiración
real de 40s, retorno y ronda de trivia posterior con +25 y un acierto persistido
en el repositorio fixture. No requiere dependencias nuevas de producción.

Medición realizada en Windows x64, Node 22.19.0, Intel i5-12450H (12 hilos), 16GiB,
Edge headless, invitado 390×844. Muestra RAF de ~2 segundos: 270 frames,
intervalo medio 7.41ms, p95 13.8ms. Supera el objetivo de 60fps en esa muestra,
pero no garantiza rendimiento en dispositivos móviles físicos o bajo otra carga.
Captura temporal fuera del repositorio; no se incluyeron credenciales en ella.

Limitaciones: no se ejecutan suites e2e que requieren PostgreSQL real ni se
reinician bases/procesos del usuario. El contrato tiene `physicsVersion`; versiones
incompatibles bloquean el tiro y requieren actualizar la aplicación. No se afirma
protección anti-bot por «dos clics» ni recuperación tras reiniciar el Backend.
No se ha realizado QA en móviles físicos, con lector de pantalla real ni bajo
una simulación exhaustiva de redes degradadas. El smoke aislado no prueba el
despliegue ni la contraseña actual de la cuenta demo existente.

Estado Git en las entregas anteriores: los tres repositorios permanecen en `develop`. La implementación
inicial se dejó local; el responsable autorizó después `git add .` y el commit
Frontend `feat: integrate game mode selector in host lobby to launch trivia or goal kick minigame`,
que incluye el selector y la implementación Frontend previa. Backend continúa
con sus cambios locales sin commit; Auth está limpio. No se hace push.
La corrección posterior del formulario/salas independientes se deja local, sin
un nuevo commit ni push.

### Verificación de la integración del selector

- `pnpm build`, `pnpm lint` y `pnpm verify:production`: aprobados.
- `pnpm exec vitest run src/pages/LobbyExperience.test.tsx src/realtime/guest.test.tsx --maxWorkers=1`:
  11 pruebas aprobadas en 2 archivos. Cubren elección sin inicio automático,
  dispatch separado, bloqueo durante confirmación/desconexión, permisos host y
  cambio del invitado a Canvas al recibir estado, además de reconexión.
- `scripts/verify-goal-kick-browser.cjs`: aprobado con los radios reales del nuevo
  selector; host + cuenta + invitado, gol, deadline, retorno y trivia posterior.
  Conserva las mismas limitaciones de fixtures Auth/DB descritas antes.
- El build mantiene el aviso no bloqueante de chunk grande: 618.88 kB JS,
  195.15 kB gzip. No se repitió la suite completa de Backend porque este ajuste
  no modifica sus archivos.

### Verificación posterior: formulario y salas independientes

- Frontend: build/lint y `verify:production` aprobados; suite completa de Vitest:
  **83 pruebas en 28 archivos**, incluyendo creación sin cuestionarios y el
  selector entre cuatro opciones, V/F y fútbol. Chunk actual: 624.22 kB JS,
  196.94 kB gzip; se mantiene el aviso de tamaño sin ocultarlo.
- Backend: build/lint aprobados y **146 pruebas unitarias/de integración**.
- `pnpm test:e2e --runInBand --testPathPatterns='game-session.e2e|goal-kick.websocket'`:
  **24 pruebas en 2 suites** con Nest HTTP, JWT/Socket.IO y repositorios fixtures.
  Incluye metadatos, foto real, ausencia de quiz, auth obligatoria, campos extra,
  nombre vacío, archivo inválido/sobredimensionado y snapshot de invitado seguro.
  Se actualizó el wiring fixture de PokéAPI y expectativas antiguas de campos de
  participantes/puntuación de trivia; no se cambió el motor 20/+5.
- Smoke Edge aislado aprobado: primero fútbol/trivia de sala tradicional y luego
  creación independiente con foto desde UI, recarga de host, invitado, inicio,
  cancelación y retorno. No se realizó ninguna escritura de sesión DB fixture al
  crear la sala independiente. Auth/DB siguen siendo fixtures, no un despliegue real.
- No se hicieron nuevos commits ni push para esta corrección. Es necesario
  ejecutar/desplegar ambos proyectos actualizados para usar el nuevo endpoint.

### Integración de stash y conflictos (18 de noviembre de 2026)

Se integraron los seis archivos en conflicto sin sustituir una rama completa por
la otra. La trivia mantiene opciones de 2–5 respuestas, modos classic/speed/precision,
validación del servidor y avatar de perfil; GoalKick conserva física, eventos,
formularios independientes, metadatos/foto y retorno al lobby. El selector común
evita duplicar `question-kind` y conserva agregar/quitar opciones y respuesta correcta.

Se mantiene `VITE_GOAL_KICK_ENABLED` para el selector de fútbol dentro de salas
de trivia, mientras una sala independiente de fútbol nunca intenta iniciar trivia.
El smoke usa explícitamente la bandera y la puntuación clásica, y verifica el
avatar de cuenta desde su perfil (no desde un selector de unión eliminado).
El verificador de producción ahora espera el texto genérico de cuestionarios
mixtos; sus comprobaciones originales de secretos y rutas de desarrollo siguen activas.

Resultados de esta integración:

- Backend: build/lint, 152 pruebas y 24 e2e HTTP/WebSocket aprobados.
- Frontend: build/lint, 89 pruebas en 28 archivos y verify:production aprobados;
  además, 19 pruebas focalizadas de autoría/lobby aprobadas tras ampliar regresiones.
- Regresión añadida: jugar/cancelar fútbol, volver e iniciar una pregunta de cinco
  opciones conservando cada uno de los tres modos de puntuación y el avatar 14.
- Paridad: 189 trayectorias. Smoke aislado Edge aprobado con host, cuenta,
  invitado, gol, recarga, 40 s reales, trivia posterior y sala independiente con foto.
  Se mantienen las limitaciones de Auth/DB fixtures, sin verificar el despliegue.
- El build mantiene aviso de bundle grande: 631.67 kB JS, 199.82 kB gzip.

Se autorizan ahora commits separados de Backend y Frontend en `develop`, sin push.
Backend: `c3cef4d` (`feat(backend): integrate goal kick minigame and resolve merge conflicts with trivia logic`).
Antes de eliminar los stash aplicados se verifican sus OIDs y archivos staged;
hay bundles de respaldo verificados fuera de los repositorios, en el directorio
temporal aprobado. Auth no se modifica. Esta etapa también actualiza
`scripts/verify-production.cjs` y `src/vite-env.d.ts`.
