# Integración visual GetAnyUI (sin cambios de lógica)

## Referencias proporcionadas

Se inspeccionaron las tres exportaciones de la raíz, con sufijos `ead8`, `cce4`
y `0bcb`. Las dos primeras contienen cabecera, registro y pie; la tercera el
dashboard. Se revisaron `source.html`, especificaciones, CSS y captura del panel.
Las referencias usan sans-serif de sistema, fondo casi negro, paneles pizarra,
bordes traslúcidos y acentos azules/violetas.

Solo se copiaron `profelinkicon.png` y `graduation-cap.svg` a `public/getanyui`.
No se importó HTML ejecutable, scripts ni datos de la web capturada. No hay
dependencia de fuentes o imágenes remotas.

## Alcance de los cambios

- Nueva capa `src/getanyui.css`, cargada después de los estilos existentes.
- Solo JSX/clases/elementos decorativos en cabecera/pie, login, registro,
  dashboard, lobby de anfitrión y acceso/juego de invitado.
- No se eliminan estados, funciones, efectos, guards ni handlers existentes.
- `socket.ts` y `useSessionLobby.ts` quedan idénticos a la versión entrante.
- No hay números inventados de usuarios, puntuaciones o partidas en la nueva UI.
- QR conserva fondo blanco/contraste; los controles deshabilitados y el foco de
  teclado siguen siendo visibles. Se comprueba escritorio y viewport de 390px.

## Verificación reproducible

```powershell
pnpm build
pnpm lint
pnpm test
pnpm verify:production
# Durante la integración:
node scripts/verify-ui-logic.cjs MERGE_HEAD
# Tras el commit de merge:
node scripts/verify-ui-logic.cjs HEAD^2
```

La auditoría analiza el AST de TypeScript: compara cuerpos de funciones sin JSX,
llamadas a hooks y expresiones de handlers. También compara los archivos de
conexión completos. Una diferencia de lógica hace fallar el comando.

`verify-getanyui.cjs` es un smoke visual opcional con Edge/Playwright contra
`vite preview` en 45200. Intercepta las APIs con fixtures y comprueba login,
dashboard, logo, logout, contraste y ausencia de overflow móvil. No se presenta
como una prueba de partida real. Usar `VERIFY_SCREENSHOT_DIR` fuera del repo para
guardar capturas y `PLAYWRIGHT_MODULE` si Playwright está instalado externamente.

Netlify usa las URLs Railway de `netlify.toml` y ejecuta la validación de entorno
antes del build. Los localhost en Vite corresponden únicamente al proxy de
desarrollo y al entorno de pruebas; no son URLs de API de producción.
