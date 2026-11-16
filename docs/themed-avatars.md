# Sidebar y búhos temáticos

Los seis botones del dashboard comparten `sidebar-action`: SVG de 20px a la
izquierda, fuente de 14px, padding 12px/14px, altura mínima 48px y el mismo hover.
El estado activo y Usuarios deshabilitado conservan su significado. Logout tiene
la misma jerarquía visual, junto al perfil. No se cambian handlers ni permisos.

`OwlAvatar.tsx` interpreta la silueta del logo local con lentes, pico amarillo y
contorno blanco. Los diez temas, en orden de ID 0–9, son clásico, ninja, doctor,
graduado, gamer, chef, superhéroe, detective, mago y músico. Se reemplazan los
fondos planos por transparencia y degradados en cabeza/cuerpo, cara y dorado.
`useId` aísla las referencias SVG cuando aparecen varios avatares iguales.

Cada tema flota y parpadea. El clásico ilumina su bombillo; el ninja anima cinta
y katana; doctor, graduado, chef y detective mueven sus accesorios; el gamer mueve
el control; el superhéroe ondea la capa; el mago mueve varita/destello y el músico
la guitarra/notas. Todo se desactiva con `prefers-reduced-motion: reduce`.

Selector, participantes y podio ya comparten el mismo wrapper: los tres reciben
automáticamente estos SVG. Se mantienen los IDs, storage y protocolo de salas;
no se cambia Backend, WebSocket, puntos ni navegación. Sin nuevas dependencias.

Verificado con build, lint y pruebas de frontend. También se hizo un render
aislado en Edge del selector con sus CSS reales, escritorio y 390px, incluyendo
animación y movimiento reducido. No se inició ningún servidor ni se presenta
como una prueba end-to-end de partida.
