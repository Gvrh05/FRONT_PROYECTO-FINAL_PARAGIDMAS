## ADDED Requirements

### Requirement: Demo inmutable
La UI SHALL deshabilitar edición, eliminación, preguntas e imágenes cuando isDemo sea true y SHALL rechazar mutaciones en handlers.

#### Scenario: Abrir demo
- WHEN MASTER o PROFESOR abre el demo
- THEN ve «El cuestionario demo no se puede eliminar» y los controles deshabilitados.

### Requirement: Gestión MASTER
Solo MASTER SHALL acceder a Usuarios. Las altas SHALL crear PROFESOR sin sustituir la sesión actual.

#### Scenario: Profesor abre URL administrativa
- WHEN PROFESOR visita /users
- THEN se redirige al dashboard sin montar el cliente de administración.

### Requirement: Participación pública
Una cuenta SHALL ser necesaria para autoría y administración, pero SHALL NOT ser necesaria para `/join/:invitationId`. Este requisito sustituye cualquier requisito previo de cuenta para todas las conexiones.

#### Scenario: Recargar invitado
- WHEN el invitado recarga una sala
- THEN se recupera la credencial de sessionStorage y se envía join-session tras conectar, sin nuevo POST participants ni REST privado.

#### Scenario: Jugar Verdadero/Falso
- WHEN el anfitrión inicia un quiz propio TRUE_FALSE
- THEN el invitado recibe la ronda segura y envía submit-answer con boolean; no recibe respuesta correcta antes del cierre.

### Requirement: Cambio de sesión
La web SHALL descartar respuestas y eventos de la cuenta anterior al cerrar sesión y desconectar su socket.

#### Scenario: Respuesta tardía
- WHEN A sale y entra B antes de que termine una petición de A
- THEN la respuesta de A no se aplica a B.
