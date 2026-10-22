# Mi dinero (web)

Archivo de seguimiento para Claude. Léelo al empezar y **actualízalo al terminar** cualquier cambio que altere el
estado, las convenciones o la lista de pendientes.

## Qué es

Copia adaptada de `C:\Users\ADMINISTRATOR\Desktop\celestina-offline\celestina-facturas-web` (facturas de la tienda
Celestina) para que el usuario gestione su dinero: **gastos de la casa, lo que le debe a una persona y lo que le debe
otra persona**. Se quitó todo lo de facturas (ventas, clientes, productos, descuentos, PDF). Se conservó la
infraestructura: lectura/escritura de `.ods` (`src/lib/ods.ts`, sin cambios), abrir/guardar en disco, recordar el
último archivo, Google Drive como Hoja de cálculo de Google con guardado automático y copia diaria, copia por correo,
PWA. Sin servidor ni backend, como el original.

Pila: Astro 7 (una sola página) + Preact + Tailwind 4 + JSZip. Node 22.

## Comandos

Gestor de paquetes: **bun** (lo pidió el usuario; `bun.lock`, sin `package-lock.json`). `bun run dev` (4321), `bun run test`,
`bun run check`, `bun run build`, `bun run preview`, `bun scripts/plantilla.mjs`. Los scripts siguen llamando a `node`
(como en el original), así que hace falta Node 22 además de bun; el workflow instala los dos.
Antes de dar un cambio por bueno: `check`, `test` y `build`. El usuario suele tener `bun run dev` abierto: si el
4321 está ocupado, úsalo y no lo mates.

## Mapa del código

| Ruta | Qué hace |
|---|---|
| `src/components/App.tsx` | Estado global, barra, menú «⋯», abrir/guardar, Drive, copias |
| `src/components/Resumen.tsx` | Portada: tarjetas (mes, le debo, me debe), gastos por mes y por categoría |
| `src/components/Gastos.tsx` | Gastos por meses, filtros, edición en modal |
| `src/components/Deuda.tsx` | Una deuda (sentido `debo` o `meDebe`): pendiente, movimientos, edición en modal |
| `src/components/AjustesForm.tsx` | Hoja Ajustes |
| `src/components/{Selector,ModalFormulario,ModalCorreo,ElegirDrive,PaginaDrive}.tsx`, `ui.ts` | Del original |
| `src/lib/registro.ts` | Hojas ↔ datos y cálculos (`pendiente`, `suma`, `porFecha`, `nombreMes`) |
| `scripts/plantilla.mjs` | Genera `public/plantilla.ods` (no hay LibreOffice de por medio) |
| `tests/registro.test.ts` | Ida y vuelta, borrado, hojas que faltan y datos escritos a mano |

## Decisiones

- **Estructura propuesta por Claude y aceptada por el usuario** (no se adaptó a las columnas de su hoja antigua):
  Gastos casa / Le debo / Me debe con FECHA, CONCEPTO, CATEGORÍA o TIPO, IMPORTE, NOTAS (fila 1 cabecera, datos
  desde la 2) y Ajustes con pares AJUSTE/VALOR leídos por rótulo. Hojas buscadas por nombre sin mayúsculas ni
  tildes; las que faltan se crean al guardar. G2 lleva una fórmula de resumen (SUM / SUMIF por «PRÉSTAMO» y «PAGO»);
  la web solo actualiza su resultado.
- Lectura tolerante a lo editado a mano en Hojas de cálculo: fechas como texto (`7/10/26`), importes como texto
  (`12,50 €`), TIPO que empiece por «pag» = pago, lo demás préstamo.
- **Acceso a Drive igual que Celestina** (elegido por el usuario frente al Google Picker): permiso `drive.file`, la
  web solo ve lo que sube. Su hoja antigua se pasa copiando los datos a una hoja creada/subida desde la web.
- Al guardar un gasto o movimiento la lista se ordena por fecha (`porFecha`, estable), y así queda en la hoja.
- Nombres propios para no chocar con Celestina en el mismo origen: IndexedDB `mi-dinero-ods`, cachés
  `mi-dinero-ods-*`, token `mi-dinero-ods-drive-token`, carpeta de Drive «Mi dinero».
- Color `primary` = `rgb(196 230 208)` (verde); texto encima en `ink`. Icono «€» (PNG generados con System.Drawing).
- Sin impresión ni fuente caligráfica (eran de las facturas).

## Estado (2026-10-23)

Funciona: `check`, `test` y `build` pasan. Recorrido en Chrome headless (Playwright) a 1280 y 390 px: ajustes, tres
gastos, préstamo y pago en Le debo, préstamo en Me debe, resumen y descarga del `.ods`; sin errores de consola ni
scroll horizontal. El `.ods` descargado abre en LibreOffice con los datos y los totales.
**Sin probar con Google de verdad** (como en el original) ni en un teléfono real. No hay commit todavía.

## Pendiente / ideas

- El cliente OAuth de `.env.local` es el de Celestina (copiado): vale para `localhost:4321`; para publicar hay que
  añadir el nuevo origen en Google Cloud o crear otro cliente.
- Ideas: presupuesto mensual por categoría, gastos repetidos cada mes, exportar a CSV, varias personas por hoja.
- **Caché global de bun dañada** (2026-10-23): con `~/.bun/install/cache` bun deja paquetes vacíos en `node_modules`
  (p. ej. `yargs-parser`) y `bun pm cache rm` da «Acceso denegado». Se instaló con `--cache-dir` en otra carpeta.
  Si vuelve a pasar, borrar esa caché a mano (cerrando antes lo que la use) o usar `--cache-dir`.
