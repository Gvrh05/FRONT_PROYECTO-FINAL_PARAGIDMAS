# Desarrollo local: proxy y verificación

Vite conserva los destinos predeterminados API `127.0.0.1:3000` y Auth
`127.0.0.1:3001`. Para otro mapeo Docker, usar `.env.development.local`:

```dotenv
DEV_API_PROXY_TARGET=http://127.0.0.1:43000
DEV_AUTH_PROXY_TARGET=http://127.0.0.1:43001
VITE_API_URL=/kahoot-api
VITE_AUTH_API_URL=/auth
VITE_WS_URL=
```

Estos overrides locales están ignorados por Git. Las variables DEV_* solo las
lee el servidor Vite; no cambian Netlify/Railway. Reiniciar Vite después de
cambiar el entorno si no se reinicia automáticamente. No se reescriben los
prefijos: las APIs esperan `/kahoot-api` y `/auth`. Uploads y Socket.IO usan el
mismo destino que la API, con soporte de upgrade WebSocket.

Diagnóstico comprobado: 3000/3001 sin listeners; Docker publica 43000/43001.
Tras configurar el proxy, ambas rutas de salud en 5173 responden 200.
Los contenedores de verificación actuales anuncian CORS_ORIGIN para 45173.
Para acceso directo desde 5173, incluir `http://localhost:5173` en CORS_ORIGIN
de ambos servicios y recrearlos con su configuración de despliegue. El código
fuente ya contempla ese origen por defecto. Las pruebas realizadas usan rutas
relativas y el proxy, sin necesitar acceso HTTP directo entre orígenes.

Pruebas reales sobre localhost:5173:
- `scripts/verify-quiz-crud-browser.cjs`: crear, guardar, editar, abrir y eliminar
  exclusivamente un cuestionario temporal propio.
- `scripts/verify-teacher-guests-browser.cjs`: docente, sala, QR, invitado móvil,
  WebSocket, respuesta y recarga.

Ambos requieren PLAYWRIGHT_MODULE (si es externo) y VERIFY_ENV_FILE con las
credenciales de verificación. No restablecen contraseñas existentes.

La revisión visual utiliza los code.css originales de las exportaciones de la
raíz, no el directorio public/getanyui (que solo contiene assets). Se ajustaron
tokens, superficies, sombras y menú horizontal; no se certifica identidad visual
píxel a píxel ni equivalencia entre cursos de la referencia y cuestionarios.
