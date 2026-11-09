# Profelink Kahoot — autoría web

Aplicación React para administrar cuestionarios, preguntas de cuatro opciones e
imágenes privadas a través de `kahoot-api`.

## Configuración

1. Copia `.env.example` a `.env`.
2. Configura las URLs públicas del navegador:

```env
VITE_API_URL=http://localhost:3000/kahoot-api
VITE_AUTH_API_URL=http://localhost:3001/auth
```

Las variables `VITE_*` quedan incluidas en el bundle. **No deben contener**
`JWT_SECRET`, contraseñas, tokens ni otros secretos. La aplicación utiliza las
cuentas ya provisionadas por el servicio de identidad externo; no crea usuarios
ni requiere cambios en `../auth`. Su contrato de acceso es
`POST /auth/login` con `{ "username", "password" }` y respuesta
`{ "accessToken", "user": { "id", "username", "role" } }`.

El token se conserva únicamente en memoria. Recargar, cerrar sesión o recibir
un `401` elimina la sesión y los datos privados visibles.

## Desarrollo y verificación

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm test
pnpm build
pnpm lint
```

La API y el servicio de autenticación deben permitir el origen usado por Vite.

## Flujo de autoría

1. Inicia sesión con una cuenta externa existente.
2. Crea o abre un cuestionario propio.
3. Agrega preguntas con un enunciado, exactamente cuatro opciones y una única
   respuesta correcta. Tiempo y puntos usan 20 y 1000 por defecto.
4. Edita o elimina preguntas y cuestionarios. Las eliminaciones piden
   confirmación y solo actualizan la pantalla tras el `204` de la API.

El contenido se representa como texto literal; no se ejecuta HTML escrito en
enunciados u opciones. Un `404` cierra el editor obsoleto y permite volver al
listado.

## Imágenes privadas

- Formatos admitidos: JPEG, PNG y WebP.
- Límite preliminar del cliente: 5 MiB. La API también valida contenido,
  dimensiones (hasta 25 megapíxeles) y el límite configurado.
- Las imágenes guardadas se descargan como blob con Bearer. El token nunca se
  coloca en la URL y las object URLs se revocan al reemplazar, desmontar o
  cerrar sesión.
- La pregunta se guarda como JSON antes de cargar el archivo multipart. Si la
  segunda etapa falla, la interfaz muestra **“Pregunta guardada; imagen
  pendiente”** y permite reintentar solo el archivo usando el UUID ya creado.
- `413` indica que el archivo excede el límite; `415` indica formato, firma o
  dimensiones no admitidos. En un reemplazo fallido se conserva la imagen
  anterior.
