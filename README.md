# Mi dinero (web)

Web estática (Astro + Preact + Tailwind) para llevar lo que debo y lo que me deben sobre una hoja de cálculo
`.ods` o una Hoja de cálculo de Google. Todo ocurre en el navegador: no hay servidor.

- **Resumen**: total que debo, total que me deben y el balance; cada deuda pendiente de los dos lados.
- **Debo / Me deben**: tantas deudas como quieras (el banco por la casa, mi prima por las vacaciones, mi hermana
  por el préstamo del coche…). Cada una con lo que queda, lo devuelto y sus préstamos y pagos; las saldadas van aparte.
- **Ajustes**: correo para las copias de seguridad.
- **Guardar**: en Chrome/Edge sobrescribe el mismo archivo; en otros navegadores descarga el `.ods` actualizado.
  Con el archivo en Google Drive, los cambios se guardan solos y se hace una copia de seguridad al día.

## El archivo

Tres hojas. En Debo y Me deben la cabecera va en la fila 1 y cada fila desde la 2 es un movimiento; las filas
con el mismo QUIÉN y MOTIVO son una misma deuda. En la columna I hay el total pendiente con fórmula, para verlo en
Hojas de cálculo.

| Hoja | Columnas |
|---|---|
| Debo | QUIÉN, MOTIVO, FECHA, CONCEPTO, TIPO (`PRÉSTAMO` o `PAGO`), IMPORTE, NOTAS |
| Me deben | igual que Debo |
| Ajustes | AJUSTE, VALOR |

Si abres otro `.ods` sin estas hojas, se crean al guardar (las demás hojas se conservan).

## Pasar tu Hoja de Google actual

La web solo puede ver en Drive lo que ella sube (permiso `drive.file`), así que:

1. En la web, **Empezar con uno vacío** y **⋯ › Subir este archivo a Drive** (o **Abrir desde Google Drive › Crear una hoja nueva**).
2. **⋯ › Ver en Hojas de cálculo** y copia ahí tus datos de la hoja antigua respetando las columnas de arriba.
3. Vuelve a abrirla en la web: desde entonces aparece en **Abrir desde Google Drive** en todos tus dispositivos.

## Desarrollo

```bash
bun install
bun run dev      # http://localhost:4321
bun run test     # ida y vuelta del .ods contra public/plantilla.ods
bun run check    # TypeScript
bun run build
bun run preview  # sirve dist/; aquí sí hay service worker
bun scripts/plantilla.mjs    # vuelve a generar public/plantilla.ods
```

Google Drive necesita `PUBLIC_GOOGLE_CLIENT_ID` (en `.env.local` en local; en GitHub, la variable de
repositorio `GOOGLE_CLIENT_ID`). Sin él, la web funciona igual pero sin Drive.

## Publicar en GitHub Pages

Sube el repositorio a GitHub y en **Settings → Pages → Source: GitHub Actions**. El workflow
`.github/workflows/deploy.yml` publica en `https://<usuario>.github.io/<repo>/` en cada push a `main`.
Añade ese origen (`https://<usuario>.github.io`) a los orígenes JavaScript autorizados del cliente OAuth en Google Cloud.
