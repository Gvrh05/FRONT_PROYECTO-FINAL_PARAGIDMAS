# Publicar en Netlify con APIs en Railway

Seleccionar `feature/punto4` como rama de despliegue. netlify.toml publica `dist`
y valida las URLs públicas antes de `pnpm build`; no hay proxy de APIs en Netlify.

Configurar en el entorno de compilación del sitio:

```dotenv
VITE_AUTH_API_URL=https://authproyecto-final-paradigmas-production.up.railway.app/auth
VITE_API_URL=https://TU-BACKEND-PUBLICO/kahoot-api
VITE_WS_URL=https://TU-BACKEND-PUBLICO
VITE_PUBLIC_WEB_URL=https://project-deploy-985df3.netlify.app
```

Reemplazar TU-BACKEND-PUBLICO con el dominio real de Railway, no localhost, un
dominio .railway.internal ni el de Netlify. VITE_WS_URL solo contiene el origen;
si se omite, se deriva de VITE_API_URL. Las rutas relativas solo sirven con un
proxy real (Docker Nginx o Vite local), no con el fallback index.html de Netlify.

No colocar JWT_SECRET, contraseñas o secretos OTLP en variables VITE_*. Todas esas
variables son públicas. AUTH y Backend deben permitir
`CORS_ORIGIN=https://project-deploy-985df3.netlify.app`; usar el origen real del sitio
si cambia. Volver a desplegar después de cambiar variables: Vite las compila en JS.

Una página que carga no prueba login/juego. Verificar en Network que /auth/login y
/kahoot-api devuelven JSON desde Railway, no HTML de React. Verificar que /socket.io
se dirige al backend. Probar registro, login, anfitrión y jugador desde dos
dispositivos, QR, reconexión y resultados. Mantener la limitación actual: una sola
instancia de backend, partidas en memoria y resultados persistidos en PostgreSQL.
