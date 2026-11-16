# Login y búhos SVG ProfeLink

## Referencia y alcance

Se revisó el logo local `public/getanyui/profelinkicon.png`: cuerpo azul muy
oscuro, cara/contorno blancos, lentes redondos, libro y bombillo/pico amarillos.
`OwlAvatar.tsx` es una interpretación vectorial manual de esos rasgos, no un
trazado exacto del PNG. El área visual del login sí usa el PNG oficial, sin
alterarlo. No había una segunda imagen adjunta de login para comparar píxeles;
el layout sigue la descripción de dos columnas con constelaciones.

## Archivos

- `src/components/OwlAvatar.tsx`: SVG local con `variant={1..10}`. Birrete,
  audífonos, corona, capa, guiño, libro azul, pincel, bufanda, moño y corbata roja.
  No usa recursos remotos, fuentes de emoji ni IDs SVG globales repetidos.
- `AvatarSelector.tsx`: conserva labels e IDs 0–9 de las salas. Solo transforma
  cada ID en su variante 1–10; no cambia credenciales ni estado de preparación.
- `LoginForm.tsx` y `LoginForm.css`: formulario izquierdo, visual derecho,
  inputs claros, botones azules, composición móvil apilada y fondo de red local.
  Se mantienen submit, estados, validación, aviso de sesión, errores, pending,
  alternador de contraseña y callback onSuccess.
- `public/getanyui/constellations.svg`: líneas y puntos decorativos locales.
- `game-experience.css`: SVGs nítidos y selector más grande; tres columnas en móvil.

Las animaciones CSS no afectan al formulario y se desactivan con
`prefers-reduced-motion: reduce`. El fondo no captura eventos del ratón/teclado.
La copia `.env.development.local.bak` permanece local e ignorada por Git.

## Verificación

```powershell
pnpm build
pnpm lint
pnpm test
# Contra servicios YA iniciados, con Edge y Playwright:
$env:VERIFY_ENV_FILE='../AUTH_PROYECTO-FINAL-PARADIGMAS/.env'
node scripts/verify-login-avatars.cjs
```

Si Playwright está instalado externamente, pasar `PLAYWRIGHT_MODULE`. Opcionalmente
usar `VERIFY_SCREENSHOT_DIR` fuera del repo. El smoke no muestra credenciales ni
crea cuentas/salas: verifica login/logout reales, toggle de contraseña, logo,
columnas sin solaparse, móvil sin overflow, reducción de movimiento y los diez
botones de avatar. Las capturas no se incluyen en el commit.
