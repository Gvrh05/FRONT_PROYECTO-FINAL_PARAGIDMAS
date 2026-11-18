# Navegación, puntos y resultados 3D

## Navegación

`/login` se renderiza fuera de Layout: sin navbar, footer, Volver, Acceder ni
enlaces adicionales. Solo conserva el fondo animado y el formulario.

Dashboard mantiene su sidebar y su estado de edición. Usuarios y Unirse son
vistas internas: los botones cambian la sección sin desmontar el sidebar ni
cambiar a otro layout. `/users` y `/join` siguen siendo accesos directos válidos
al mismo dashboard, inicialmente en su sección correspondiente. Usuarios conserva
las comprobaciones de rol/estado de Auth y la página; el botón está deshabilitado
para profesores. No se amplían permisos. Al unirse a una partida sí se navega al
lobby, como antes.

## Puntos calculados por el servidor

Para cada respuesta aceptada:

```
acierto: 20 + (tiempo_transcurrido < duración_original / 2 ? 5 : 0)
error o ausencia: 0
```

El instante de apertura y la recepción se miden en el servidor, nunca con un
tiempo enviado por el cliente. A los 10 segundos exactos de una ronda de 20 ya no
hay bonus. El cierre manual no altera la duración original usada para el bonus.
Cada ronda se puntúa una sola vez tanto con timer como con cierre manual.
Se mantienen el contador de aciertos separado de los puntos y el JSON de
resultados existente: `correctAnswersCount` no se confunde con el puntaje.
No hay migraciones ni cambios de esquema de base de datos.

Snapshots de ronda agregan `voteCounts: { true, false }` solo al cerrar. Los
eventos privados `round-result` contienen los puntos exactos de ese jugador.
Antes del cierre no se divulgan ni el reparto por opción ni la respuesta correcta.

## Confeti y puntos flotantes

El hook identifica la recepción de `round-result` con una marca exclusivamente
local, `resultReceived`. No se envía al servidor ni se guarda en storage. No hay
confeti al seleccionar, en snapshots de reconexión, al host, ante errores o para
quien no contestó. Un resultado correcto confirmado dispara una sola celebración
por pregunta y muestra +20 o +25 con animación ascendente. Se respeta movimiento
reducido y siempre queda texto legible con el puntaje ganado.

## Volumen CSS

`RoundResultsChart.tsx` dibuja dos prismas con caras superior y lateral mediante
pseudoelementos, perspectiva y transformaciones. Altura = votos de la opción /
máximo de votos * 160px; una opción sin votos tiene altura cero. La base muestra
ícono, nombre, votos y check solo para la correcta. Funciona sin votos.

`Podium.tsx` conserva ranking/empates del servidor y tabla del resto. Las
plataformas tienen altura 120/170/80px para segundo/primero/tercero, situados a
izquierda/centro/derecha. Cada plataforma tiene caras, perspectiva y sombra; los
avatares y nombres quedan encima. Todo se adapta a móvil, sin WebGL ni nuevas
dependencias gráficas.

Se actualizan y verifican builds, lint y pruebas en ambos proyectos. Deben
ejecutarse juntas las versiones nuevas para recibir puntos y votos actualizados.
