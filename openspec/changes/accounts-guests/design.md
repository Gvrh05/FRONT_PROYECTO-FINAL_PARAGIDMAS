# Diseño

La ruta pública `/join/:invitationId` vive fuera del layout administrativo y de ProtectedRoute. Usa un cliente Axios sin bearer y guarda credenciales en sessionStorage bajo una clave por invitación (identidad no reciclable de sala). Recarga y reconexión usan la misma credencial y nunca repiten el alta automáticamente. Salir borra esa credencial y desconecta.

El namespace `/game` recibe exclusivamente `{token}` o `{guestToken}`. Invitados no consultan REST privado: el estado se recupera por `session-state`. Se conserva el motor Verdadero/Falso y no se modifica el demo.

La URL QR usa VITE_PUBLIC_WEB_URL validado como origen HTTP(S) sin rutas, credenciales, query ni fragmento; por defecto window.location.origin. qrcode.react genera SVG local. Auth y API usan `/auth` y `/kahoot-api`; WS mismo origen por defecto.

Los dos contextos sincronizan storage y expiración; logout desconecta el socket y cambia generación. Respuestas HTTP cuyo bearer dejó de ser actual se descartan. Cerrar sesión no revoca JWT copiados ni finaliza la sala; el anfitrión recibe confirmación para conservar la posibilidad de reconectar.

Usuarios solo se monta para MASTER. El servidor conserva la autoridad definitiva. Crear profesor no escribe credenciales locales. Desactivar MASTER/sistema no se ofrece; cambios administrativos requieren confirmación. El demo usa controles deshabilitados y guardas en handlers, incluidas imágenes y acceso directo a edición.
