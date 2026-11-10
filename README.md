# Quiz en vivo — Punto 3

Frontend React/Vite para crear salas, unirse, observar participantes y comenzar
una partida. No implementa respuestas, puntajes ni clasificación (Puntos 4/5).

## Cómo probar el Punto 3

### 1. Preparación local

En el backend hermano `BACKEND_PROYECTO-FINAL-PARADIGMAS`, prepara `.env` a partir
de `.env.example` sin compartir secretos reales. Arranca Postgres con
`docker compose up -d postgres`, ejecuta **manualmente** `pnpm seed` si aún no
existe el quiz de demo y luego `pnpm start:dev`. El seed no se ejecuta desde
main, Compose ni el frontend y es idempotente.

En este frontend usa `.env.example` como referencia:

```dotenv
VITE_API_URL=http://localhost:3000
VITE_WS_URL=http://localhost:3000
```

Ejecuta `pnpm dev` y abre la URL que indica Vite (normalmente
`http://localhost:5173`). No es necesario reinstalar paquetes si ya se instalaron.
El cliente añade `/kahoot-api` a la base HTTP; Socket.IO usa `/game` sin ese prefijo.

### 2. JWT de demo sin Auth Service

**Solo con `pnpm dev`**, abre `/dev-login` o `/login` y elige:

- **Soy host (test-host-id)**: abre la creación de sala.
- **Soy player (test-player-id)**: abre el formulario de unión.

La página `/login` solo anuncia **Integración con Auth Service pendiente**; no
hay formulario de usuario/contraseña ni implementación de registro. Los botones
generan un JWT HS256 de una hora con Web Crypto y guardan `localStorage.token`
y `localStorage.user`, consumidos por AuthProvider. Usa localhost o HTTPS para
que esté disponible `crypto.subtle`.

**DEV ONLY:** `src/auth/dev-token.ts` contiene una clave **pública de ejemplo**
hardcodeada por pedido de la demo. No es un secreto ni autenticación segura para
usuarios reales. Para la demo local el backend debe usar exactamente:

```dotenv
JWT_SECRET=super_secret_jwt_key_change_in_production
JWT_ISSUER=kahoot-auth-dev
JWT_AUDIENCE=kahoot-game
```

Nunca pongas claves reales en el frontend ni uses esta clave en producción. Si
el backend usa otra clave/issuer/audience, los botones de ejemplo recibirán 401:
usa la alternativa Node de abajo, no copies tu secreto real al navegador.
HS256 compartido se mantiene **solo para dev/demo**, a la espera del Auth Service
y de una eventual integración RS256/JWKS. El backend siempre verifica el token;
los claims leídos localmente solo sirven para presentación.

En `pnpm build`, `import.meta.env.DEV` es false: se eliminan `/dev-login`, los
botones, el módulo de firma y su clave. `/login` permanece como placeholder de
integración. El contexto expone `setSession(token, user)` y `logout()` al compañero
de Auth. Un 401 limpia la sesión y redirige a `/login`.

### Alternativa: generar JWT con Node

Desde el **backend**, con su `.env` local configurado (Node 22):

```powershell
pnpm exec node --env-file=.env -e "const {JwtService}=require('@nestjs/jwt'); console.log(new JwtService().sign({sub:'test-host-id',name:'Host demo'},{secret:process.env.JWT_SECRET,algorithm:'HS256',issuer:process.env.JWT_ISSUER||undefined,audience:process.env.JWT_AUDIENCE||undefined,expiresIn:'1h'}))"
```

Para el jugador cambia `sub` por `test-player-id` y su nombre. No publiques los
tokens generados. En la consola del navegador del frontend guarda el JWT del
usuario correspondiente y recarga:

```js
localStorage.setItem('token', 'PEGA_AQUI_EL_JWT');
localStorage.setItem('user', JSON.stringify({sub: 'test-host-id', name: 'Host demo'}));
location.href = '/host/create';
```

Para el jugador usa su JWT, `sub: 'test-player-id'` y `/join`. Cuando esté listo
el Auth Service, los tokens vendrán de allí; esta alternativa no lo reemplaza.

### 3. Dos navegadores y una sala

1. Usa dos perfiles/navegadores o uno normal y otro privado: **dos pestañas del
   mismo perfil comparten localStorage** y no representan dos usuarios distintos.
2. En el navegador host, entra por el botón de host, selecciona el quiz del seed,
   pulsa **Crear sala** y copia el código de seis dígitos.
3. En el navegador jugador, entra por su botón, pega el código y pulsa **Unirse**.
4. El host verá ambos participantes en línea. El host cuenta en la lista, pero el
   botón **Iniciar partida** solo se habilita con
   `participants.some(p => p.userId !== hostId && p.connected)`, en LOBBY y sin
   otra solicitud pendiente. No depende del tamaño de la lista.
5. Pulsa **Iniciar partida**. Se usa REST y el backend notifica `session-started`
   por WS a la sala. Ambos lobbies muestran **Partida en curso** y no navegan a
   un juego todavía no implementado.

El selector consulta **exclusivamente** `GET /game-sessions/available-quizzes`,
que delega en `QuizzesService.findAllByOwner(sub)`. El seed con
`ownerId='test-host-id'` alimenta esta demo. `findAll()` público sigue devolviendo
`[]`; su implementación real corresponde al compañero de quizzes. Nunca hay
fallback a `GET /quizzes`. Si falta el seed o la identidad no tiene quizzes, se
muestra en DEV: **No hay quizzes. Ejecuta `pnpm seed` en el backend con ownerId=test-host-id.**
En producción muestra **No hay cuestionarios disponibles. Contacta al administrador.**
Los IDs e instrucciones de demo se excluyen de los JS de producción, no solo los botones de acceso.

### 4. Reconexión, cleanup y aislamiento

- Recarga el jugador en LOBBY: recupera el snapshot y reemite `join-session`
  aunque ya figure en participantes. No se duplica la identidad.
- Recarga después del inicio: conserva **Partida en curso**, sin reiniciar ni
  navegar al Punto 4. Un GET atrasado no puede revertir un `session-started`
  reciente (protección mínima de 2 segundos y estado monotónico).
- Sal de la ruta de lobby: se retiran sus listeners y se libera el socket.
  En LOBBY el jugador se retira; en IN_PROGRESS queda sin conexión. Logout limpia
  credenciales y desconecta. StrictMode permanece activado; el lease con `useRef`
  y cleanup diferido evita conexiones duplicadas por su doble montaje de prueba.
- Crea una segunda sala y únete con otro perfil; verifica que participantes y
  eventos de inicio no aparecen en la otra sala.
- Reconexión funciona mientras vive el proceso backend. Un reinicio conserva
  registros de sesión en BD, pero no restaura participantes/lobbies en memoria.

Las filas de verificación de Fase B **157464** (REST) y **981597** (WS) quedaron
deliberadamente en Postgres dev. No son PIN reutilizables tras detener sus procesos.
No se borran automáticamente; los scripts pueden dejar otras filas de prueba.

### 5. Comandos de verificación

```powershell
# Frontend
pnpm build
pnpm lint
pnpm verify:production

# Backend
pnpm build
pnpm test -- --runInBand
pnpm test:e2e

# Opcional: Postgres real dedicado, separado del e2e sin BD
pnpm test:persistence
```

`test:persistence` del backend prepara, si falta, la BD local `kahoot_punto3_test`
(requiere CREATE DATABASE la primera vez) o usa TEST_DATABASE_URL apuntando a esa
BD ya preparada. Crea fixtures en un esquema aleatorio propio y elimina solo ese
esquema al terminar; no ejecuta el seed, no borra public ni salas de desarrollo.
Los e2e habituales usan repositorios controlados y no necesitan `.env`/Postgres.

Cuando Auth esté disponible se sustituirán los accesos de demo por su contrato.
Ejemplo **placeholder** (la ruta y body deben confirmarse con el compañero):

```powershell
curl.exe -X POST "http://localhost:4000/auth/login" -H "Content-Type: application/json" --data '{"email":"USUARIO_DEMO","password":"PASSWORD_DEMO"}'
```

Usa AUTH_SERVICE_URL del backend y el formato real acordado; este frontend no
implementa ni invoca automáticamente ese login.

Verificación opcional de navegador en Windows (Node 22, Edge instalado, Postgres
local preparado y backend previamente compilado):

```powershell
# Desde este frontend, después de pnpm build
node scripts/verify-phase-c.cjs
```

El script usa dos contextos aislados de Edge headless a 320px con CDP nativo,
servidores temporales y Postgres real. No instala Playwright, no ejecuta seed,
no modifica `.env` ni mata los servidores del usuario. Solo para su proceso de
verificación usa la clave pública de demo e issuer/audience de arriba. Cierra sus
sockets/servidores, pero conserva filas de prueba y su perfil temporal de Edge.
Puedes indicar `EDGE_PATH` si Edge está en otra ruta. Se comprueban StrictMode,
presencia, reload, GET atrasado, logout/401, selector vacío, mobile y exclusión
del código de demo en el bundle de producción.

El backend incorpora un stub OTel no-op (`src/tracing.ts`); no exporta métricas
ni spans todavía. El compañero de OTel lo sustituirá por el SDK real.

---

## Referencia del scaffold React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.
You can also try [the experimental native React Compiler support in plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md#rust-react-compiler) by using `compiler: true` in the plugin options instead of using the Babel plugin.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
