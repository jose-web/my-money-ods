# Mi dinero (web)

Web estática (Astro + Preact + Tailwind) para llevar las cuentas de casa sobre una hoja de cálculo `.ods`
o una Hoja de cálculo de Google. Todo ocurre en el navegador: no hay servidor.

- **Resumen**: gasto de la casa del mes (y el del anterior), lo que debo y lo que me deben; gastos de los últimos 12 meses y los del mes por categoría.
- **Gastos casa**: gastos por meses con su total, filtros por mes, categoría y texto.
- **Le debo / Me debe**: préstamos y pagos con una persona; lo pendiente y lo que quedaba tras cada movimiento.
- **Ajustes**: nombres de las dos personas, categorías de gastos y correo para las copias de seguridad.
- **Guardar**: en Chrome/Edge sobrescribe el mismo archivo; en otros navegadores descarga el `.ods` actualizado.
  Con el archivo en Google Drive, los cambios se guardan solos y se hace una copia de seguridad al día.

## El archivo

Cuatro hojas. En las tres primeras la cabecera va en la fila 1 y los datos desde la 2; en la columna G hay un
resumen con fórmula para verlo en Hojas de cálculo (la web no lo toca).

| Hoja | Columnas |
|---|---|
| Gastos casa | FECHA, CONCEPTO, CATEGORÍA, IMPORTE, NOTAS |
| Le debo | FECHA, CONCEPTO, TIPO (`PRÉSTAMO` o `PAGO`), IMPORTE, NOTAS |
| Me debe | igual que Le debo |
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
