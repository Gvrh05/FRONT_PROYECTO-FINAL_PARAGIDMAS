# Fondo global, controles y cierre manual

- `ui-system.css` define tokens y una base común para botones. Navegación,
  selectores e iconos tienen variantes explícitas, no la apariencia de una acción
  primaria. Se mantienen foco visible, controles de al menos 44px y estados disabled.
- `/login` usa un fondo SVG fijo que cubre la ventana y se mueve lentamente con
  transformaciones CSS. Se elimina la caja exterior: solo flota el formulario.
  La animación se detiene si se solicita movimiento reducido.
- `/dashboard` recupera el sidebar izquierdo. El header global se oculta solo en
  esa ruta; el header interno redundante se elimina. Se conservan el perfil,
  logout y los handlers de Quices/Crear partida/Resultados. En móvil se apila.
- Los botones de trivia son grandes, tienen símbolos, relieve y estados hover y
  active. La partida existente sigue siendo exclusivamente Verdadero/Falso: no
  se cambia el contrato booleano ni se simula soporte de opción múltiple en vivo.
- `canvas-confetti` celebra una selección y, al recibir resultados, una respuesta
  correcta. La confirmación de acierto depende de los puntos del servidor, no de
  una suposición del cliente. Una falla de canvas no interrumpe la respuesta.
- El host envía `close-voting` con `{ roomCode, questionId }`. El gateway conserva
  autenticación y cola por socket, comprueba suscripción y bloquea invitados. El
  servicio verifica host, fase y pregunta, y cierra bajo el mismo lock de sala.
  El timer conserva su plazo y usa la misma publicación de resultados. El cierre
  es idempotente: no duplica puntos ni eventos. Después se habilita el avance
  existente, sin saltarse la pantalla de resultados de la pregunta.

## Dependencias y pruebas

Se añadieron `canvas-confetti` y `@types/canvas-confetti` (desarrollo). Para el
fondo no se incorpora una librería de partículas.

Verificar `pnpm build`, `pnpm lint`, `pnpm test` en frontend; en backend usar
`pnpm build`, `pnpm lint`, `pnpm test --runInBand`. Las pruebas cubren cierre
temprano, permisos, pregunta obsoleta, respuesta tardía, idempotencia y fallback
del timer, además de controles host, confeti, movimiento reducido y navegación.
Las versiones actualizadas de ambos proyectos deben ejecutarse juntas para el
nuevo botón de cierre. No se modifica el transporte ni `useSessionLobby.ts`.
