# Mi dinero (web)

Web estática (Astro + Preact + Tailwind) para llevar lo que debo y lo que me deben sobre una hoja de cálculo
`.ods` o una Hoja de cálculo de Google. Todo ocurre en el navegador: no hay servidor.

- **Resumen**: total que debo, total que me deben y el balance; cada deuda pendiente de los dos lados.
- **Debo / Me deben**: tantas deudas como quieras (el banco por la casa, mi prima por las vacaciones, mi hermana
  por el préstamo del coche…). Cada una con lo que queda, lo devuelto y sus préstamos y pagos; las saldadas van aparte.
- **Ajustes**: idioma y correo para las copias de seguridad.
- **Idiomas**: español e inglés (en la bienvenida, en el menú «⋯» y en Ajustes). Se guarda en el archivo (fila IDIOMA de
  Ajustes), así sale igual en todos tus dispositivos; sin archivo abierto, el del navegador. El archivo no cambia con el idioma: sus hojas y columnas van siempre en español.
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
repositorio `GOOGLE_CLIENT_ID`). Sin él, la web funciona igual pero sin Drive. Cómo conseguirlo, en
[Configurar Google Drive](#configurar-google-drive).

## Configurar Google Drive

`PUBLIC_GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_ID` son **el mismo valor**: el identificador de cliente OAuth de Google
de esta web, algo como `123456789012-abc123def456.apps.googleusercontent.com`. Cambia solo dónde se pone:

| Nombre | Dónde | Para qué |
|---|---|---|
| `PUBLIC_GOOGLE_CLIENT_ID` | archivo `.env.local` en la raíz del proyecto | `bun run dev` y `bun run build` en tu ordenador |
| `GOOGLE_CLIENT_ID` | variable del repositorio en GitHub | la web publicada (el workflow lo pasa a `PUBLIC_GOOGLE_CLIENT_ID` al compilar) |

**No es un secreto**: va dentro de la web publicada y cualquiera puede verlo. Lo que impide que otra web lo use son
los «orígenes autorizados» del paso 4. Lo que sí es secreto es el *client secret* que Google enseña al crearlo: esta
web no lo necesita, no lo copies en ningún sitio.

Hace falta una cuenta de Google (la misma con la que vayas a usar Drive) y unos 10 minutos. Los nombres de los menús
de Google Cloud cambian de vez en cuando; si alguno no coincide, búscalo con el buscador de arriba de la consola.

### 1. Crear un proyecto en Google Cloud

1. Entra en <https://console.cloud.google.com/> con tu cuenta de Google y acepta las condiciones si es la primera vez.
2. Arriba a la izquierda, en el selector de proyectos, pulsa **Nuevo proyecto**.
3. Nombre: por ejemplo `Mi dinero`. Organización: déjala como esté («Sin organización» en una cuenta personal).
   Pulsa **Crear** y, cuando acabe, comprueba que el selector de arriba muestra ese proyecto.

No hace falta tarjeta ni activar la facturación: lo que usa esta web es gratuito.

### 2. Activar la API de Google Drive

1. Menú **☰ › APIs y servicios › Biblioteca**.
2. Busca **Google Drive API**, ábrela y pulsa **Habilitar**.

### 3. Configurar la pantalla de consentimiento

Es la ventana que Google enseña al pulsar «Abrir desde Google Drive» la primera vez.

1. Menú **☰ › APIs y servicios › Pantalla de consentimiento de OAuth** (en la consola nueva se llama
   **Google Auth Platform**). Si pide empezar, pulsa **Comenzar**.
2. **Información de la aplicación**: nombre `Mi dinero` y tu email como correo de asistencia.
3. **Público** (o **Audiencia**): elige **Externo**.
4. **Información de contacto**: tu email. Acepta la política de datos de usuario y pulsa **Crear**.
5. En **Público** / **Audiencia**, deja la aplicación **En prueba** y, en **Usuarios de prueba**, pulsa
   **Añadir usuarios** y pon tu propia dirección de Gmail (y la de quien más vaya a usarla, hasta 100).

En modo de prueba solo pueden entrar esos usuarios, y Google avisará de que «Google no ha verificado esta
aplicación»: es normal, porque es tu propia aplicación. Pulsa **Continuar**. No hace falta publicarla ni que
Google la verifique.

Permisos: la web solo pide `drive.file` (ver y cambiar únicamente los archivos que ella misma crea o sube). No hace
falta añadirlo a mano en la pantalla de consentimiento; si quieres, en **Acceso a los datos** › **Añadir o quitar
permisos** puedes marcar `.../auth/drive.file`.

### 4. Crear el identificador de cliente

1. Menú **☰ › APIs y servicios › Credenciales** (o **Google Auth Platform › Clientes**).
2. **Crear credenciales › ID de cliente de OAuth** (o **Crear cliente**).
3. **Tipo de aplicación**: **Aplicación web**. Nombre: `Mi dinero web`.
4. **Orígenes de JavaScript autorizados**, pulsa **Añadir URI** por cada uno:
   - `http://localhost:4321` (para `bun run dev` y `bun run preview` en tu ordenador)
   - `https://<tu-usuario>.github.io` (la web publicada; pon tu usuario de GitHub en minúsculas)

   Solo el origen: **sin ruta y sin barra al final** (`https://pepe.github.io`, no `https://pepe.github.io/mi-dinero/`).
5. **URIs de redireccionamiento autorizados**: déjalo vacío (la web no usa redirecciones).
6. Pulsa **Crear**. Copia el **ID de cliente** (termina en `.apps.googleusercontent.com`). El *secreto del
   cliente* no lo necesitas.

Los orígenes nuevos pueden tardar unos minutos en funcionar. Si más adelante publicas en otra dirección, vuelve a este
cliente y añade su origen.

### 5. Ponerlo en tu ordenador (`PUBLIC_GOOGLE_CLIENT_ID`)

Crea (o edita) el archivo `.env.local` en la raíz del proyecto, junto a `package.json`, con una sola línea:

```bash
PUBLIC_GOOGLE_CLIENT_ID=123456789012-abc123def456.apps.googleusercontent.com
```

Sin comillas ni espacios. `.env.local` está en `.gitignore`, así que no se sube a GitHub. Reinicia `bun run dev`
(el valor se lee al arrancar) y abre <http://localhost:4321>: debe aparecer el botón **Abrir desde Google Drive**.

El `PUBLIC_` del principio es obligatorio: Astro solo deja llegar a la web las variables que empiezan así.

### 6. Ponerlo en GitHub (`GOOGLE_CLIENT_ID`)

1. En tu repositorio de GitHub: **Settings › Secrets and variables › Actions**.
2. Pestaña **Variables** (no *Secrets*) › **New repository variable**.
3. Name: `GOOGLE_CLIENT_ID`. Value: el mismo ID de cliente. Pulsa **Add variable**.
4. Vuelve a publicar: haz un push a `main` o, en **Actions › Publicar en GitHub Pages › Run workflow**, lánzalo a mano.

Va en *Variables* porque no es secreto y así se puede ver y cambiar. El workflow
(`.github/workflows/deploy.yml`) lo lee como `vars.GOOGLE_CLIENT_ID` y lo pasa a la compilación como
`PUBLIC_GOOGLE_CLIENT_ID`.

### Si algo falla

| Lo que ves | Qué pasa |
|---|---|
| No sale ningún botón de Google Drive | La web se compiló sin el identificador: revisa `.env.local` (y reinicia `bun run dev`) o la variable de GitHub (y vuelve a publicar). |
| Google dice `Error 400: redirect_uri_mismatch` o `origin_mismatch` | El origen desde el que abres la web no está en **Orígenes de JavaScript autorizados** (paso 4), o tiene ruta o barra final. Espera unos minutos tras añadirlo. |
| Google dice `Error 403: access_denied` | Tu cuenta no está en **Usuarios de prueba** (paso 3.5). |
| «Google no ha verificado esta aplicación» | Normal en modo de prueba: **Continuar**. |
| «El navegador ha bloqueado la ventana de Google» | Permite las ventanas emergentes de la web y vuelve a pulsar el botón. |
| Error de que la API de Drive no está activada | Falta el paso 2, o lo hiciste en otro proyecto: comprueba el selector de proyecto de arriba. |

## Publicar en GitHub Pages

Sube el repositorio a GitHub y en **Settings → Pages → Source: GitHub Actions**. El workflow
`.github/workflows/deploy.yml` publica en `https://<usuario>.github.io/<repo>/` en cada push a `main`.
Para que funcione Google Drive en la web publicada, sigue [Configurar Google Drive](#configurar-google-drive):
el origen `https://<usuario>.github.io` en el cliente OAuth (paso 4) y la variable `GOOGLE_CLIENT_ID` (paso 6).
