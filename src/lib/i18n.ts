// src/lib/i18n.ts
// Textos de la interfaz en español e inglés. `t` es el diccionario del idioma actual: como es un `export let`,
// quien lo importa ve siempre el actual (enlace vivo de los módulos), y `App` vuelve a pintarlo todo al cambiarlo.
// El inglés tiene el tipo del español, así que TypeScript avisa si falta o sobra algún texto.
// Lo que va dentro del .ods (nombres de hojas, columnas, PRÉSTAMO/PAGO) y las carpetas de Drive no se traducen:
// son el formato de los datos, y así el mismo archivo vale en los dos idiomas.

export type Idioma = 'es' | 'en';
export const IDIOMAS: [Idioma, string][] = [['es', 'Español'], ['en', 'English']];

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

const es = {
  locale: 'es-ES',
  nombre: 'Mi dinero',

  tabs: {
    resumen: ['Resumen', 'Resumen'],
    estadisticas: ['Estadísticas', 'Gráficas'],
    debo: ['Debo', 'Debo'],
    meDeben: ['Me deben', 'Me deben'],
    ajustes: ['Ajustes', 'Ajustes'],
  },

  comun: {
    aceptar: 'Aceptar',
    cancelar: 'Cancelar',
    cerrar: 'Cerrar',
    editar: 'Editar',
    eliminar: 'Eliminar',
    buscar: 'Buscar…',
    buscarEtiqueta: 'Buscar',
    sinResultados: 'Sin resultados',
    idioma: 'Idioma',
  },

  bienvenida: {
    texto: (drive: boolean) => 'Lo que debes y lo que te deben (al banco por la casa, a tu prima por las vacaciones…), sobre tu hoja '
      + `de cálculo. Los datos se leen y se guardan en ese mismo archivo, en tu dispositivo${drive ? ' o como Hoja de cálculo en tu Google Drive' : ''}: `
      + 'no pasan por ningún servidor nuestro.',
    continuar: (nombre: string, drive: boolean) => `Continuar con ${nombre}${drive ? ' (Google Drive)' : ''}`,
    abrirDrive: 'Abrir desde Google Drive',
    abrirOds: 'Abrir un .ods',
    vacio: 'Empezar con uno vacío',
    arrastra: 'o arrastra el archivo aquí',
  },

  barra: {
    guardar: 'Guardar',
    guardando: 'Guardando…',
    guardado: 'Guardado',
    guardadoDrive: 'Guardado en Drive',
    masAcciones: 'Más acciones',
  },

  menu: {
    archivo: 'Archivo',
    abrirOtro: 'Abrir otro archivo',
    descargar: 'Descargar una copia (.ods)',
    copiaCorreo: 'Copia de seguridad por correo',
    drive: 'Google Drive',
    abrirDrive: 'Abrir una hoja de Drive',
    subirDrive: 'Subir este archivo a Drive',
    verHojas: 'Ver en Hojas de cálculo',
    copiaDrive: 'Copia de seguridad en Drive',
    carpetaDrive: 'Carpeta y copias de Drive',
    cerrarArchivo: 'Cerrar el archivo',
    hojaGoogle: 'Hoja de Google · se guarda sola',
    enDrive: 'En Google Drive · se guarda sola',
    enDispositivo: 'En este dispositivo',
    ultimaCopia: (f: string) => `Última copia de seguridad: ${f}`,
    sinCopias: 'Sin copias de seguridad',
  },

  aviso: {
    nuncaCopia: 'Todavía no has hecho ninguna copia de seguridad de este archivo.',
    haceDias: (dias: number, f: string) => `Hace ${dias} días de tu última copia de seguridad (${f}).`,
    copiaCorreo: 'Hacer copia por correo',
    copiaDrive: 'Copia en Drive',
    ocultar: 'Ocultar el aviso',
  },

  // avisos y errores de App
  app: {
    cambiosAbrir: 'Hay cambios sin guardar. ¿Abrir otro archivo igualmente?',
    cambiosCerrar: 'Hay cambios sin guardar. ¿Cerrar el archivo igualmente?',
    cambiosCrear: 'Hay cambios sin guardar. ¿Crear y abrir uno nuevo igualmente?',
    archivoVacio: 'mi dinero.ods',
    hojaNueva: 'Mi dinero',
    recuperada: (nombre: string, f: string) => `Recuperada la copia de ${nombre} del ${f}`,
    yaNoEstaDrive: (nombre: string) => `${nombre} ya no está en Google Drive (se ha borrado o está en la papelera). Ábrelo desde «Abrir desde Google Drive» o crea uno nuevo.`,
    noAbrirDrive: (nombre: string, e: string) => `No se pudo abrir ${nombre} de Google Drive: ${e}`,
    sinPermiso: (nombre: string) => `Sin permiso para leer ${nombre}.`,
    noReabrir: (nombre: string) => `No se pudo reabrir ${nombre}: puede que se haya movido o borrado.`,
    guardadoEn: (nombre: string) => `Guardado en ${nombre}`,
    descargado: 'Descargado. Sustituye tu archivo por este.',
    noGuardar: (e: string) => `No se pudo guardar: ${e}`,
    sesionCaducada: 'La sesión de Google ha caducado y los cambios no se guardan solos: pulsa «Guardar» para volver a entrar.',
    cambiadoDrive: (nombre: string, f: string) => `${nombre} ha cambiado en Google Drive desde que lo abriste (el ${f}), quizá desde otro dispositivo o en Hojas de cálculo.`,
    pisar: (aviso: string) => `${aviso} Si guardas, esos cambios se perderán. ¿Guardar igualmente?`,
    pausado: (aviso: string) => `${aviso} Para no pisarlo, los cambios ya no se guardan solos: pulsa «Guardar» para guardar los tuyos encima, o ábrelo de nuevo para ver los otros.`,
    guardadoEnDrive: (nombre: string) => `Guardado en Google Drive (${nombre})`,
    borradoDeDrive: (nombre: string) => `«${nombre}» ya no está en Google Drive (se ha borrado o está en la papelera), así que no se ha guardado. `
      + 'Tus datos siguen aquí: súbelo otra vez con «⋯ › Subir este archivo a Drive» o descarga una copia.',
    noGuardarDrive: (e: string, reintento: boolean) => `No se pudo guardar en Google Drive: ${e}${reintento ? ' Se volverá a intentar solo.' : ''}`,
    copiaDia: (donde: string) => `Copia de seguridad del día guardada en Google Drive, en ${donde}.`,
    noCopiaDia: (e: string) => `No se pudo hacer la copia de seguridad del día en Google Drive: ${e}`,
    subido: (nombre: string, carpeta: string) => `Subido a Google Drive como Hoja de cálculo «${nombre}», en la carpeta «${carpeta}»: desde ahora los cambios se guardan solos allí.`,
    noSubir: (e: string) => `No se pudo subir a Google Drive: ${e}`,
    noEntrarDrive: (e: string) => `No se pudo entrar en Google Drive: ${e}`,
    creado: (nombre: string, carpeta: string) => `Creado «${nombre}» en la carpeta «${carpeta}» de Google Drive. Los cambios se guardan solos.`,
    noCrear: (e: string) => `No se pudo crear la hoja en Google Drive: ${e}`,
    noAbrir: (nombre: string, e: string) => `No se pudo abrir ${nombre}: ${e}`,
    copiaEnDrive: (donde: string, local: boolean) => `Copia guardada en Google Drive, en ${donde}.${local ? ' Guarda el archivo para que recuerde la fecha.' : ''}`,
    noCopiaDrive: (e: string) => `No se pudo hacer la copia en Google Drive: ${e}`,
    noPrepararCopia: (e: string) => `No se pudo preparar la copia: ${e}`,
    copiaEnviada: 'Copia de seguridad enviada. Guarda el archivo para que recuerde la fecha.',
  },

  correoCopia: {
    titulo: 'Copia de seguridad por correo',
    adjuntos: 'el archivo',
    paraAjustes: 'El de las copias de seguridad, en Ajustes.',
    paraVacio: 'Pon tu email (o guárdalo en Ajustes para la próxima vez).',
    asunto: (nombre: string, f: string) => `Copia de seguridad · ${nombre} · ${f}`,
    mensaje: (nombre: string, f: string, hora: string) => `Copia de seguridad de mis cuentas (${nombre}) del ${f} a las ${hora}.

Para recuperarla, descarga el archivo adjunto y ábrelo en la web, en LibreOffice o súbelo a Google Drive.`,
  },

  correo: {
    listo: (nombres: string) => `Listo para adjuntar: ${nombres}`,
    preparando: (adjuntos: string, n: number, total: number) => `Preparando ${adjuntos}… ${n} de ${total}`,
    para: 'Para',
    asunto: 'Asunto',
    mensaje: 'Mensaje',
    compartir: (adjuntos: string) => `Compartir ${adjuntos}`,
    abrirCorreo: (adjuntos: string) => `Descargar ${adjuntos} y abrir el correo`,
    noCompartir: (adjuntos: string, ods: boolean) => `Este navegador no deja compartir ${adjuntos}${ods ? ' (Chrome y Edge no admiten archivos .ods; Safari sí)' : ''}. `
      + `Usa «Descargar ${adjuntos} y abrir el correo».`,
    falloCompartir: (e: string) => `No se pudo compartir: ${e}`,
    ayudaCompartir: (adjuntos: string) => `«Compartir» abre el menú del sistema con ${adjuntos} como adjunto y el mensaje: elige Correo, Gmail u `
      + 'Outlook. No puede poner el destinatario, y algunas apps (Outlook en Windows) tampoco el asunto: el destinatario se copia al '
      + 'portapapeles para que lo pegues en «Para». ',
    ayudaAbrir: (adjuntos: string) => `«Abrir el correo» descarga ${adjuntos} y abre tu programa de correo con el destinatario, el asunto y el mensaje; `
      + 'un enlace de correo no puede adjuntar archivos, así que arrastra al mensaje lo que se ha descargado.',
  },

  deudas: {
    debo: {
      titulo: 'Lo que debo', nueva: 'Nueva deuda', tipo: { prestamo: 'Me prestaron', pago: 'Pagué' },
      quien: 'A quién', quienEj: 'El banco', motivoEj: 'Hipoteca de la casa', inicial: 'Cuánto me prestaron',
      vacio: 'No tienes ninguna deuda apuntada. Pulsa «Nueva deuda» para la primera: a quién le debes, por qué y cuánto.',
      pagar: 'Apuntar un pago', sumar: 'Me prestó más',
    },
    meDeben: {
      titulo: 'Lo que me deben', nueva: 'Nuevo préstamo', tipo: { prestamo: 'Le presté', pago: 'Me devolvió' },
      quien: 'Quién', quienEj: 'Mi prima', motivoEj: 'Vacaciones en Lisboa', inicial: 'Cuánto le presté',
      vacio: 'Nadie te debe nada apuntado. Pulsa «Nuevo préstamo» para el primero: quién te debe, por qué y cuánto.',
      pagar: 'Apuntar lo que me devolvió', sumar: 'Le presté más',
    },
    editarDeuda: 'Editar deuda',
    editarMov: 'Editar movimiento',
    porQue: 'Por qué',
    tipo: 'Tipo',
    importe: 'Importe (€)',
    fecha: 'Fecha',
    concepto: 'Concepto',
    notas: 'Notas',
    conceptoPago: 'Cuota de octubre',
    conceptoPrestamo: 'Para el coche',
    repetida: 'Ya tienes una deuda con ese nombre y motivo: ábrela para apuntar en ella, o cambia el motivo.',
    renombrarNota: 'El cambio se aplica a todos sus movimientos.',
    confirmarEliminarDeuda: (nombre: string, n: number) => `¿Eliminar «${nombre}» con ${plural(n, 'su movimiento', 'sus movimientos')}?`,
    confirmarEliminarMov: (nombre: string, importe: string) => `¿Eliminar «${nombre}» (${importe})?`,
    quedaPorDevolver: 'Queda por devolver',
    saldada: 'Saldada: no queda nada pendiente.',
    deMas: (importe: string) => `Se ha devuelto ${importe} de más.`,
    quedaba: (importe: string) => `quedaba ${importe}`,
    cambiarNombre: 'Cambiar nombre o motivo',
    eliminarDeuda: 'Eliminar la deuda',
    sinNombre: 'Sin nombre',
    sinMotivo: 'Sin motivo',
    devuelto: (pagado: string, prestado: string) => `Devuelto ${pagado} de ${prestado}`,
    pctDevuelto: (pct: number) => `${pct} % devuelto`,
    pendiente: 'Pendiente:',
    enDeudas: (n: number) => `en ${plural(n, 'deuda', 'deudas')}`,
    nadaPendiente: 'Nada pendiente',
    todoSaldado: 'Todo saldado.',
    saldadas: 'Saldadas',
    ultimaVez: (f: string) => `última vez el ${f}`,
    ver: 'Ver',
  },

  resumen: {
    debo: 'Debo',
    meDeben: 'Me deben',
    balance: 'Balance',
    balanceNota: 'Lo que me deben menos lo que debo',
    deudasPendientes: (n: number) => plural(n, 'deuda pendiente', 'deudas pendientes'),
    prestamosPendientes: (n: number) => plural(n, 'préstamo pendiente', 'préstamos pendientes'),
    verTodas: 'Ver todas →',
    noDebes: 'No debes nada.',
    nadieTeDebe: 'Nadie te debe nada.',
    total: (importe: string) => `Total ${importe}`,
  },

  ajustes: {
    titulo: 'Ajustes',
    nota: 'Se guardan en la hoja «Ajustes» del archivo: al abrirlo en otro dispositivo, saldrá en el mismo idioma.',
    email: 'Email para copias de seguridad',
    emailEj: 'tu@correo.com',
    emailNota: 'A quién se manda la copia con «⋯ › Copia de seguridad por correo».',
    idiomaNota: 'Se guarda en el archivo (fila IDIOMA de Ajustes). Sus hojas y columnas siguen en español.',
    ayudaHoja: 'En Hojas de cálculo de Google cada deuda es una pestaña. Arriba van QUIÉN, MOTIVO, LADO («DEBO» o «ME DEBEN») y '
      + 'PENDIENTE (se calcula solo); desde la fila 7, un movimiento por fila: FECHA, CONCEPTO, TIPO («PRÉSTAMO» o «PAGO»), IMPORTE, '
      + 'NOTAS. Puedes cambiar los datos y el nombre de la pestaña a mano, pero no muevas esas celdas ni el orden de las columnas.',
  },

  elegirDrive: {
    titulo: 'Abrir desde Google Drive',
    hojaGoogle: 'Hoja de cálculo de Google',
    archivoOds: 'Archivo .ods',
    modificado: (f: string) => `modificado el ${f}`,
    abrir: 'Abrir',
    vacio: (carpeta: string) => `No hay ninguna hoja en la carpeta «${carpeta}» de tu Google Drive.`,
    subirAbierto: 'Subir el archivo abierto',
    crear: 'Crear una hoja nueva en Drive',
    ayudaVacio: 'Si tienes tu .ods en el ordenador (o descargado de Hojas de cálculo), ábrelo aquí y usa «⋯ › Subir este archivo a Drive»: '
      + 'luego aparecerá aquí en todos tus dispositivos. «Crear una hoja nueva» empieza una vacía.',
    hojas: 'Hojas',
    copias: 'Copias de seguridad',
    copiasNota: 'Para recuperar una. Lo que guardes con una copia abierta se guarda en esa copia, no en la hoja.',
    soloSubidas: 'Solo salen las hojas subidas desde esta web: es lo único de tu Drive que puede ver.',
  },

  paginaDrive: {
    abierto: 'Abierto',
    abrirAqui: 'Abrir aquí',
    abrirEnDrive: 'Abrir en Drive',
    sub: (carpeta: string, copias: string) => `La carpeta «${carpeta}» de tu Drive: tus hojas y, dentro, «${copias}».`,
    abrirCarpeta: 'Abrir la carpeta en Drive',
    copiaAhora: 'Hacer una copia ahora',
    actualizar: 'Actualizar',
    autoPausa: 'Guardado automático en pausa.',
    autoActivo: 'Guardado automático activado.',
    pausaNota: ' Mira el aviso de arriba; pulsa «Guardar» para seguir.',
    autoTexto: (nombre: string, copias: string) => ` Los cambios de «${nombre}» se guardan solos en Drive a los pocos segundos. `
      + `Cada día, al guardar los primeros cambios, se hace una copia de seguridad en «${copias}».`,
    ultimaCopia: (f: string) => ` Última copia: ${f}.`,
    sinCopia: ' Todavía no hay ninguna copia.',
    noEnDrive: 'El archivo abierto no está en Drive. Con «⋯ › Subir este archivo a Drive» se sube a esta carpeta y desde entonces se guarda solo.',
    entrarNota: 'Entra en Google para ver la carpeta.',
    entrar: 'Entrar en Google',
    cargando: 'Cargando…',
    sinHojas: 'No hay ninguna hoja en la carpeta.',
    copiasNota: 'Para recuperar una: «Abrir aquí» la abre como cualquier hoja (lo que guardes irá a esa copia).',
    ninguna: 'Ninguna todavía.',
  },

  estadisticas: {
    titulo: 'Estadísticas',
    sinDatos: 'Todavía no hay movimientos con fecha. Cuando apuntes alguno, aquí verás los gráficos.',
    devueltoDebo: 'Lo que debo, ya pagado',
    devueltoMeDeben: 'Lo que me deben, ya recuperado',
    deTotal: (pagado: string, prestado: string) => `${pagado} de ${prestado}`,
    nadaPrestado: 'Nada apuntado todavía',
    actividad: 'Actividad',
    movimientos: (n: number) => plural(n, 'movimiento', 'movimientos'),
    enMeses: (deudas: number, meses: number) => `en ${plural(deudas, 'deuda', 'deudas')} y ${plural(meses, 'mes', 'meses')}`,
    pagos: 'Pagos de cada mes',
    pagosNota: 'Lo que pagaste y lo que te devolvieron en los últimos meses. Pulsa un mes para ver sus movimientos.',
    pague: 'Pagué',
    meDevolvieron: 'Me devolvieron',
    evolucion: 'Lo pendiente, mes a mes',
    evolucionNota: 'Lo que debías y lo que te debían al acabar cada mes.',
    progreso: 'Cuánto llevas de cada deuda',
    progresoNota: 'La parte oscura es lo devuelto; la clara, lo que queda.',
    pct: (pct: string) => `${pct} devuelto`,
    queda: (importe: string) => `queda ${importe}`,
    verTabla: 'Ver los datos en una tabla',
    mes: 'Mes',
  },

  filtros: {
    todos: 'Todos los meses',
    mes: 'Mes',
    enMes: (mes: string) => `En ${mes}:`,
    sinMovs: 'Ningún movimiento en ese mes.',
    sinDeudas: 'Ninguna deuda con movimientos en ese mes.',
    movimientos: (mes: string) => `Movimientos de ${mes}`,
    quitar: 'Ver todos los meses',
  },

  estimacion: {
    titulo: 'Estimación',
    saldada: 'Saldada.',
    deMas: 'Se ha devuelto de más: no queda nada por pagar.',
    sinPagos: 'Todavía no hay pagos: con el primero se podrá estimar cuándo quedará saldada.',
    estimada: (mes: string, duracion: string, ritmo: string) => `Al ritmo de ${ritmo} al mes, quedaría saldada hacia ${mes} (dentro de ${duracion}).`,
    lejos: (ritmo: string) => `Al ritmo de ${ritmo} al mes tardaría más de 100 años en quedar saldada.`,
    base: (n: number, desde: string) => `Media de ${plural(n, 'pago', 'pagos')} desde el ${desde}.`,
    masRapido: (ritmo: string, mes: string) => `Con ${ritmo} al mes (un 25 % más), hacia ${mes}.`,
    corta: (mes: string) => `≈ ${mes}`,
    duracion: (anios: number, meses: number) =>
      [anios ? plural(anios, 'año', 'años') : '', meses ? plural(meses, 'mes', 'meses') : ''].filter(Boolean).join(' y ') || 'menos de un mes',
    explicar: 'Explicar con IA',
    explicando: 'La IA está escribiendo…',
    deIA: 'Escrito por la IA de tu navegador: puede equivocarse.',
  },

  ia: {
    boton: 'Asistente',
    titulo: 'Asistente',
    subtitulo: 'IA en tu dispositivo (Gemini Nano): tus datos no salen de aquí.',
    nueva: 'Nueva conversación',
    comprobando: 'Comprobando la IA del navegador…',
    sinApi: 'Este navegador no trae IA integrada. Funciona en Google Chrome de escritorio reciente (Windows, macOS, Linux o '
      + 'ChromeOS); en el móvil, todavía no.',
    flags: 'Si usas Chrome de escritorio y no aparece, activa chrome://flags/#prompt-api-for-gemini-nano y '
      + 'chrome://flags/#optimization-guide-on-device-model, y reinicia Chrome.',
    noDisponible: 'Chrome tiene la IA integrada, pero no puede usarla en este dispositivo: necesita espacio libre en el disco, '
      + 'memoria y una tarjeta gráfica o un procesador compatibles.',
    descargable: 'Para usar la IA, Chrome tiene que descargar una sola vez su modelo (Gemini Nano, unos GB). Después funciona '
      + 'sin conexión.',
    descargar: 'Descargar y activar',
    descargando: (pct: number) => `Descargando el modelo… ${pct} %`,
    lista: 'La IA está lista en este navegador.',
    bienvenida: 'Pregúntame lo que quieras de tus deudas: cuánto debes, a quién, cuándo terminarás de pagar…',
    sugerencias: ['¿Cuánto debo en total?', '¿Cuándo terminaré de pagar todo?', '¿Quién me debe más dinero?'],
    escribe: 'Escribe tu pregunta…',
    enviar: 'Enviar',
    parar: 'Parar',
    pensando: 'Pensando…',
    fallo: (e: string) => `La IA ha fallado: ${e}`,
    aviso: 'La IA puede equivocarse: comprueba las cifras importantes en tus deudas.',
    ajustes: 'Asistente con IA',
    ajustesNota: 'El chat de abajo a la derecha y las explicaciones de las estimaciones usan la IA integrada del navegador. '
      + 'Funciona en el propio dispositivo: tus datos no se envían a ningún sitio.',

    // lo que se le da al modelo
    sistemaChat: (datos: string) => 'Eres el asistente de «Mi dinero», una web en la que el usuario apunta lo que debe y lo que le deben. '
      + 'Responde siempre en español, de forma breve y clara, tratando al usuario de tú. Usa SOLO los datos de abajo; si algo no '
      + 'está, dilo. Si la cifra que te piden ya aparece, cópiala tal cual en vez de calcularla. Las fechas en que quedará saldada '
      + 'cada deuda ya están calculadas en «Estimación»: usa esas. No inventes deudas, personas ni movimientos.\n\nDATOS:\n' + datos,
    sistemaEstimacion: 'Eres un asesor de finanzas personales amable y prudente. Escribes en español, tratando al usuario de tú, '
      + 'en 2 o 3 frases cortas y sin listas. Usas solo las cifras que te dan, copiándolas tal cual: no calculas otras.',
    pedirEstimacion: (datos: string) => 'Explícame cuándo quedará saldada esta deuda y si el ritmo es bueno; si se puede, '
      + 'di cómo acabar antes con la opción de pagar más. Datos:\n' + datos,

    // los datos, en texto
    hoy: (f: string) => `Fecha de hoy: ${f}. Importes en euros.`,
    debo: 'LO QUE DEBO (deudas del usuario con otros):',
    meDeben: 'LO QUE ME DEBEN (lo que otros deben al usuario):',
    ninguna: '(ninguna)',
    deuda: (nombre: string, prestado: string, pagado: string, pendiente: string) => `- ${nombre}: prestado ${prestado}, devuelto ${pagado}, pendiente ${pendiente}.`,
    movimientos: 'Movimientos',
    omitidos: (n: number) => `(${plural(n, 'movimiento anterior omitido', 'movimientos anteriores omitidos')})`,
    prestamo: 'préstamo',
    pago: 'pago',
    totales: (debo: string, meDeben: string, balance: string) => `TOTALES: debo ${debo}; me deben ${meDeben}; balance (me deben − debo) ${balance}.`,
  },

  // errores de src/lib
  errores: {
    popup: 'El navegador ha bloqueado la ventana de Google. Vuelve a pulsar el botón.',
    noEntrar: 'No se ha podido entrar en Google.',
    sinPermisoDrive: 'Google no ha dado permiso para usar Drive.',
    caducada: 'La sesión de Google ha caducado: vuelve a pulsar el botón.',
    noEstaEnDrive: 'Ya no está en Google Drive: se ha borrado o está en la papelera.',
    noCargarGoogle: 'No se ha podido cargar Google (¿sin conexión?).',
    noEsOds: 'El archivo no es una hoja de cálculo .ods',
    faltaHoja: (nombre: string) => `Falta la hoja «${nombre}»`,
    celdaCombinada: (hoja: string, col: number) => `${hoja}: la celda ${col} está combinada`,
    xmlDanado: 'content.xml dañado',
    maxFilas: (hoja: string, max: number) => `La hoja «${hoja}» admite ${max} filas como máximo`,
    tipoOds: 'Hoja de cálculo ODS',
  },
};

export type Textos = typeof es;

const en: Textos = {
  locale: 'en-GB',
  nombre: 'My money',

  tabs: {
    resumen: ['Summary', 'Summary'],
    estadisticas: ['Statistics', 'Stats'],
    debo: ['I owe', 'I owe'],
    meDeben: ['Owed to me', 'Owed me'],
    ajustes: ['Settings', 'Settings'],
  },

  comun: {
    aceptar: 'OK',
    cancelar: 'Cancel',
    cerrar: 'Close',
    editar: 'Edit',
    eliminar: 'Delete',
    buscar: 'Search…',
    buscarEtiqueta: 'Search',
    sinResultados: 'No results',
    idioma: 'Language',
  },

  bienvenida: {
    texto: (drive: boolean) => 'What you owe and what you are owed (the bank for the house, your cousin for the holidays…), on your own '
      + `spreadsheet. The data is read from and saved to that same file, on your device${drive ? ' or as a Google Sheet in your Google Drive' : ''}: `
      + 'it never goes through any server of ours.',
    continuar: (nombre: string, drive: boolean) => `Continue with ${nombre}${drive ? ' (Google Drive)' : ''}`,
    abrirDrive: 'Open from Google Drive',
    abrirOds: 'Open an .ods file',
    vacio: 'Start with an empty one',
    arrastra: 'or drop the file here',
  },

  barra: {
    guardar: 'Save',
    guardando: 'Saving…',
    guardado: 'Saved',
    guardadoDrive: 'Saved to Drive',
    masAcciones: 'More actions',
  },

  menu: {
    archivo: 'File',
    abrirOtro: 'Open another file',
    descargar: 'Download a copy (.ods)',
    copiaCorreo: 'Back up by email',
    drive: 'Google Drive',
    abrirDrive: 'Open a sheet from Drive',
    subirDrive: 'Upload this file to Drive',
    verHojas: 'View in Google Sheets',
    copiaDrive: 'Back up to Drive',
    carpetaDrive: 'Drive folder and backups',
    cerrarArchivo: 'Close the file',
    hojaGoogle: 'Google Sheet · saves automatically',
    enDrive: 'In Google Drive · saves automatically',
    enDispositivo: 'On this device',
    ultimaCopia: (f: string) => `Last backup: ${f}`,
    sinCopias: 'No backups yet',
  },

  aviso: {
    nuncaCopia: 'You haven’t backed up this file yet.',
    haceDias: (dias: number, f: string) => `Your last backup was ${dias} days ago (${f}).`,
    copiaCorreo: 'Back up by email',
    copiaDrive: 'Back up to Drive',
    ocultar: 'Hide this notice',
  },

  app: {
    cambiosAbrir: 'You have unsaved changes. Open another file anyway?',
    cambiosCerrar: 'You have unsaved changes. Close the file anyway?',
    cambiosCrear: 'You have unsaved changes. Create and open a new one anyway?',
    archivoVacio: 'my money.ods',
    hojaNueva: 'My money',
    recuperada: (nombre: string, f: string) => `Restored the copy of ${nombre} from ${f}`,
    yaNoEstaDrive: (nombre: string) => `${nombre} is no longer in Google Drive (it was deleted or is in the bin). Open it from “Open from Google Drive” or create a new one.`,
    noAbrirDrive: (nombre: string, e: string) => `Couldn’t open ${nombre} from Google Drive: ${e}`,
    sinPermiso: (nombre: string) => `No permission to read ${nombre}.`,
    noReabrir: (nombre: string) => `Couldn’t reopen ${nombre}: it may have been moved or deleted.`,
    guardadoEn: (nombre: string) => `Saved to ${nombre}`,
    descargado: 'Downloaded. Replace your file with this one.',
    noGuardar: (e: string) => `Couldn’t save: ${e}`,
    sesionCaducada: 'Your Google session has expired, so changes are no longer saved automatically: press “Save” to sign in again.',
    cambiadoDrive: (nombre: string, f: string) => `${nombre} has changed in Google Drive since you opened it (on ${f}), maybe from another device or in Google Sheets.`,
    pisar: (aviso: string) => `${aviso} If you save, those changes will be lost. Save anyway?`,
    pausado: (aviso: string) => `${aviso} To avoid overwriting it, changes are no longer saved automatically: press “Save” to save yours over it, or open it again to see the other changes.`,
    guardadoEnDrive: (nombre: string) => `Saved to Google Drive (${nombre})`,
    borradoDeDrive: (nombre: string) => `“${nombre}” is no longer in Google Drive (it was deleted or is in the bin), so it hasn’t been saved. `
      + 'Your data is still here: upload it again with “⋯ › Upload this file to Drive” or download a copy.',
    noGuardarDrive: (e: string, reintento: boolean) => `Couldn’t save to Google Drive: ${e}${reintento ? ' It will try again by itself.' : ''}`,
    copiaDia: (donde: string) => `Today’s backup has been saved to Google Drive, in ${donde}.`,
    noCopiaDia: (e: string) => `Couldn’t make today’s backup in Google Drive: ${e}`,
    subido: (nombre: string, carpeta: string) => `Uploaded to Google Drive as the Google Sheet “${nombre}”, in the “${carpeta}” folder: from now on changes are saved there automatically.`,
    noSubir: (e: string) => `Couldn’t upload to Google Drive: ${e}`,
    noEntrarDrive: (e: string) => `Couldn’t access Google Drive: ${e}`,
    creado: (nombre: string, carpeta: string) => `Created “${nombre}” in the “${carpeta}” folder of Google Drive. Changes are saved automatically.`,
    noCrear: (e: string) => `Couldn’t create the sheet in Google Drive: ${e}`,
    noAbrir: (nombre: string, e: string) => `Couldn’t open ${nombre}: ${e}`,
    copiaEnDrive: (donde: string, local: boolean) => `Backup saved to Google Drive, in ${donde}.${local ? ' Save the file so it remembers the date.' : ''}`,
    noCopiaDrive: (e: string) => `Couldn’t back up to Google Drive: ${e}`,
    noPrepararCopia: (e: string) => `Couldn’t prepare the backup: ${e}`,
    copiaEnviada: 'Backup sent. Save the file so it remembers the date.',
  },

  correoCopia: {
    titulo: 'Back up by email',
    adjuntos: 'the file',
    paraAjustes: 'The backup address, from Settings.',
    paraVacio: 'Enter your email (or save it in Settings for next time).',
    asunto: (nombre: string, f: string) => `Backup · ${nombre} · ${f}`,
    mensaje: (nombre: string, f: string, hora: string) => `Backup of my accounts (${nombre}) from ${f} at ${hora}.

To restore it, download the attached file and open it in the web app or LibreOffice, or upload it to Google Drive.`,
  },

  correo: {
    listo: (nombres: string) => `Ready to attach: ${nombres}`,
    preparando: (adjuntos: string, n: number, total: number) => `Preparing ${adjuntos}… ${n} of ${total}`,
    para: 'To',
    asunto: 'Subject',
    mensaje: 'Message',
    compartir: (adjuntos: string) => `Share ${adjuntos}`,
    abrirCorreo: (adjuntos: string) => `Download ${adjuntos} and open email`,
    noCompartir: (adjuntos: string, ods: boolean) => `This browser can’t share ${adjuntos}${ods ? ' (Chrome and Edge don’t accept .ods files; Safari does)' : ''}. `
      + `Use “Download ${adjuntos} and open email”.`,
    falloCompartir: (e: string) => `Couldn’t share: ${e}`,
    ayudaCompartir: (adjuntos: string) => `“Share” opens the system menu with ${adjuntos} attached and the message: choose Mail, Gmail or `
      + 'Outlook. It can’t fill in the recipient, and some apps (Outlook on Windows) ignore the subject too: the recipient is copied to the '
      + 'clipboard so you can paste it into “To”. ',
    ayudaAbrir: (adjuntos: string) => `“Open email” downloads ${adjuntos} and opens your email app with the recipient, subject and message; `
      + 'an email link can’t attach files, so drag the downloaded file into the message.',
  },

  deudas: {
    debo: {
      titulo: 'What I owe', nueva: 'New debt', tipo: { prestamo: 'Borrowed', pago: 'I paid' },
      quien: 'Who to', quienEj: 'The bank', motivoEj: 'House mortgage', inicial: 'How much I borrowed',
      vacio: 'You have no debts yet. Press “New debt” to add the first one: who you owe, what for and how much.',
      pagar: 'Add a payment', sumar: 'Borrowed more',
    },
    meDeben: {
      titulo: 'What I’m owed', nueva: 'New loan', tipo: { prestamo: 'I lent', pago: 'Paid back' },
      quien: 'Who', quienEj: 'My cousin', motivoEj: 'Holiday in Lisbon', inicial: 'How much I lent',
      vacio: 'Nobody owes you anything yet. Press “New loan” to add the first one: who owes you, what for and how much.',
      pagar: 'Add a repayment', sumar: 'Lent more',
    },
    editarDeuda: 'Edit debt',
    editarMov: 'Edit entry',
    porQue: 'What for',
    tipo: 'Type',
    importe: 'Amount (€)',
    fecha: 'Date',
    concepto: 'Description',
    notas: 'Notes',
    conceptoPago: 'October instalment',
    conceptoPrestamo: 'For the car',
    repetida: 'You already have a debt with that name and reason: open it to add to it, or change the reason.',
    renombrarNota: 'The change applies to all its entries.',
    confirmarEliminarDeuda: (nombre: string, n: number) => `Delete “${nombre}” and its ${n === 1 ? 'entry' : `${n} entries`}?`,
    confirmarEliminarMov: (nombre: string, importe: string) => `Delete “${nombre}” (${importe})?`,
    quedaPorDevolver: 'Still to pay back',
    saldada: 'Settled: nothing left to pay.',
    deMas: (importe: string) => `${importe} has been overpaid.`,
    quedaba: (importe: string) => `${importe} left`,
    cambiarNombre: 'Change name or reason',
    eliminarDeuda: 'Delete the debt',
    sinNombre: 'No name',
    sinMotivo: 'No reason',
    devuelto: (pagado: string, prestado: string) => `Paid back ${pagado} of ${prestado}`,
    pctDevuelto: (pct: number) => `${pct}% paid back`,
    pendiente: 'Outstanding:',
    enDeudas: (n: number) => `across ${n} ${n === 1 ? 'debt' : 'debts'}`,
    nadaPendiente: 'Nothing outstanding',
    todoSaldado: 'All settled.',
    saldadas: 'Settled',
    ultimaVez: (f: string) => `last entry on ${f}`,
    ver: 'View',
  },

  resumen: {
    debo: 'I owe',
    meDeben: 'Owed to me',
    balance: 'Balance',
    balanceNota: 'What I’m owed minus what I owe',
    deudasPendientes: (n: number) => `${n} outstanding ${n === 1 ? 'debt' : 'debts'}`,
    prestamosPendientes: (n: number) => `${n} outstanding ${n === 1 ? 'loan' : 'loans'}`,
    verTodas: 'See all →',
    noDebes: 'You don’t owe anything.',
    nadieTeDebe: 'Nobody owes you anything.',
    total: (importe: string) => `Total ${importe}`,
  },

  ajustes: {
    titulo: 'Settings',
    nota: 'They’re saved in the file’s “Ajustes” sheet: when you open it on another device, it will be in the same language.',
    email: 'Email for backups',
    emailEj: 'you@example.com',
    emailNota: 'Where the backup is sent with “⋯ › Back up by email”.',
    idiomaNota: 'It’s saved in the file (IDIOMA row in Ajustes). Its sheets and columns stay in Spanish.',
    ayudaHoja: 'In Google Sheets each debt is a tab. At the top are QUIÉN (who), MOTIVO (reason), LADO («DEBO» I owe or «ME DEBEN» '
      + 'owed to me) and PENDIENTE (outstanding, calculated by itself); from row 7, one entry per row: FECHA (date), CONCEPTO (description), '
      + 'TIPO («PRÉSTAMO» loan or «PAGO» payment), IMPORTE (amount), NOTAS (notes). You can edit the data and rename the tab by hand, '
      + 'but don’t move those cells or reorder the columns.',
  },

  elegirDrive: {
    titulo: 'Open from Google Drive',
    hojaGoogle: 'Google Sheet',
    archivoOds: '.ods file',
    modificado: (f: string) => `modified ${f}`,
    abrir: 'Open',
    vacio: (carpeta: string) => `There are no sheets in the “${carpeta}” folder of your Google Drive.`,
    subirAbierto: 'Upload the open file',
    crear: 'Create a new sheet in Drive',
    ayudaVacio: 'If your .ods is on your computer (or downloaded from Google Sheets), open it here and use “⋯ › Upload this file to Drive”: '
      + 'it will then show up here on all your devices. “Create a new sheet” starts an empty one.',
    hojas: 'Sheets',
    copias: 'Backups',
    copiasNota: 'To restore one. Whatever you save with a backup open is saved to that backup, not to the sheet.',
    soloSubidas: 'Only sheets uploaded from this web app are listed: it’s all it can see in your Drive.',
  },

  paginaDrive: {
    abierto: 'Open',
    abrirAqui: 'Open here',
    abrirEnDrive: 'Open in Drive',
    sub: (carpeta: string, copias: string) => `The “${carpeta}” folder in your Drive: your sheets and, inside, “${copias}” (backups).`,
    abrirCarpeta: 'Open the folder in Drive',
    copiaAhora: 'Back up now',
    actualizar: 'Refresh',
    autoPausa: 'Autosave paused.',
    autoActivo: 'Autosave on.',
    pausaNota: ' See the notice above; press “Save” to continue.',
    autoTexto: (nombre: string, copias: string) => ` Changes to “${nombre}” are saved to Drive automatically after a few seconds. `
      + `Every day, when the first changes are saved, a backup is made in “${copias}”.`,
    ultimaCopia: (f: string) => ` Last backup: ${f}.`,
    sinCopia: ' No backups yet.',
    noEnDrive: 'The open file isn’t in Drive. “⋯ › Upload this file to Drive” uploads it to this folder, and from then on it saves automatically.',
    entrarNota: 'Sign in to Google to see the folder.',
    entrar: 'Sign in to Google',
    cargando: 'Loading…',
    sinHojas: 'There are no sheets in the folder.',
    copiasNota: 'To restore one: “Open here” opens it like any sheet (whatever you save goes to that backup).',
    ninguna: 'None yet.',
  },

  estadisticas: {
    titulo: 'Statistics',
    sinDatos: 'No dated entries yet. Once you add some, the charts will show up here.',
    devueltoDebo: 'What I owe, already paid',
    devueltoMeDeben: 'What I’m owed, already recovered',
    deTotal: (pagado: string, prestado: string) => `${pagado} of ${prestado}`,
    nadaPrestado: 'Nothing added yet',
    actividad: 'Activity',
    movimientos: (n: number) => `${n} ${n === 1 ? 'entry' : 'entries'}`,
    enMeses: (deudas: number, meses: number) => `in ${deudas} ${deudas === 1 ? 'debt' : 'debts'} and ${meses} ${meses === 1 ? 'month' : 'months'}`,
    pagos: 'Payments each month',
    pagosNota: 'What you paid and what you were paid back in recent months. Press a month to see its entries.',
    pague: 'I paid',
    meDevolvieron: 'Paid back to me',
    evolucion: 'Outstanding, month by month',
    evolucionNota: 'What you owed and what you were owed at the end of each month.',
    progreso: 'How far along each debt is',
    progresoNota: 'The dark part is what has been paid; the light part, what is left.',
    pct: (pct: string) => `${pct} paid`,
    queda: (importe: string) => `${importe} left`,
    verTabla: 'See the data as a table',
    mes: 'Month',
  },

  filtros: {
    todos: 'All months',
    mes: 'Month',
    enMes: (mes: string) => `In ${mes}:`,
    sinMovs: 'No entries in that month.',
    sinDeudas: 'No debts with entries in that month.',
    movimientos: (mes: string) => `Entries in ${mes}`,
    quitar: 'Show all months',
  },

  estimacion: {
    titulo: 'Estimate',
    saldada: 'Settled.',
    deMas: 'It has been overpaid: nothing left to pay.',
    sinPagos: 'No payments yet: after the first one, it can estimate when it will be settled.',
    estimada: (mes: string, duracion: string, ritmo: string) => `At ${ritmo} a month, it would be settled around ${mes} (in ${duracion}).`,
    lejos: (ritmo: string) => `At ${ritmo} a month it would take more than 100 years to settle.`,
    base: (n: number, desde: string) => `Average of ${n} ${n === 1 ? 'payment' : 'payments'} since ${desde}.`,
    masRapido: (ritmo: string, mes: string) => `With ${ritmo} a month (25% more), around ${mes}.`,
    corta: (mes: string) => `≈ ${mes}`,
    duracion: (anios: number, meses: number) =>
      [anios ? `${anios} ${anios === 1 ? 'year' : 'years'}` : '', meses ? `${meses} ${meses === 1 ? 'month' : 'months'}` : ''].filter(Boolean).join(' and ') || 'less than a month',
    explicar: 'Explain with AI',
    explicando: 'The AI is writing…',
    deIA: 'Written by your browser’s AI: it can make mistakes.',
  },

  ia: {
    boton: 'Assistant',
    titulo: 'Assistant',
    subtitulo: 'On-device AI (Gemini Nano): your data never leaves this device.',
    nueva: 'New conversation',
    comprobando: 'Checking the browser’s AI…',
    sinApi: 'This browser has no built-in AI. It works in recent desktop Google Chrome (Windows, macOS, Linux or ChromeOS); '
      + 'not on mobile yet.',
    flags: 'If you use desktop Chrome and it doesn’t show up, enable chrome://flags/#prompt-api-for-gemini-nano and '
      + 'chrome://flags/#optimization-guide-on-device-model, then restart Chrome.',
    noDisponible: 'Chrome has built-in AI but can’t use it on this device: it needs free disk space, memory and a compatible '
      + 'graphics card or processor.',
    descargable: 'To use the AI, Chrome has to download its model once (Gemini Nano, a few GB). After that it works offline.',
    descargar: 'Download and enable',
    descargando: (pct: number) => `Downloading the model… ${pct}%`,
    lista: 'The AI is ready in this browser.',
    bienvenida: 'Ask me anything about your debts: how much you owe, to whom, when you’ll finish paying…',
    sugerencias: ['How much do I owe in total?', 'When will I finish paying everything?', 'Who owes me the most?'],
    escribe: 'Type your question…',
    enviar: 'Send',
    parar: 'Stop',
    pensando: 'Thinking…',
    fallo: (e: string) => `The AI failed: ${e}`,
    aviso: 'The AI can make mistakes: check important figures in your debts.',
    ajustes: 'AI assistant',
    ajustesNota: 'The chat at the bottom right and the estimate explanations use the browser’s built-in AI. It runs on the '
      + 'device itself: your data isn’t sent anywhere.',

    sistemaChat: (datos: string) => 'You are the assistant of “My money”, a web app where the user records what they owe and what they are owed. '
      + 'Always answer in English, briefly and clearly. Use ONLY the data below; if something isn’t there, say so. If the figure '
      + 'you are asked for already appears, copy it as is instead of calculating it. The dates when each debt will be settled are '
      + 'already calculated under “Estimate”: use those. Don’t make up debts, people or entries.\n\nDATA:\n' + datos,
    sistemaEstimacion: 'You are a friendly, careful personal finance adviser. You write in English, in 2 or 3 short sentences and '
      + 'no lists. You only use the figures you are given, copying them as they are: you don’t calculate new ones.',
    pedirEstimacion: (datos: string) => 'Explain when this debt will be settled and whether the pace is good; if possible, say '
      + 'how to finish sooner using the pay-more option. Data:\n' + datos,

    hoy: (f: string) => `Today’s date: ${f}. Amounts in euros.`,
    debo: 'WHAT I OWE (the user’s debts to others):',
    meDeben: 'WHAT I’M OWED (what others owe the user):',
    ninguna: '(none)',
    deuda: (nombre: string, prestado: string, pagado: string, pendiente: string) => `- ${nombre}: lent ${prestado}, paid back ${pagado}, outstanding ${pendiente}.`,
    movimientos: 'Entries',
    omitidos: (n: number) => `(${n} earlier ${n === 1 ? 'entry' : 'entries'} left out)`,
    prestamo: 'loan',
    pago: 'payment',
    totales: (debo: string, meDeben: string, balance: string) => `TOTALS: I owe ${debo}; I’m owed ${meDeben}; balance (owed to me − I owe) ${balance}.`,
  },

  errores: {
    popup: 'The browser blocked the Google window. Press the button again.',
    noEntrar: 'Couldn’t sign in to Google.',
    sinPermisoDrive: 'Google didn’t grant permission to use Drive.',
    caducada: 'Your Google session has expired: press the button again.',
    noEstaEnDrive: 'It’s no longer in Google Drive: it was deleted or is in the bin.',
    noCargarGoogle: 'Couldn’t load Google (offline?).',
    noEsOds: 'The file isn’t an .ods spreadsheet',
    faltaHoja: (nombre: string) => `The “${nombre}” sheet is missing`,
    celdaCombinada: (hoja: string, col: number) => `${hoja}: cell ${col} is merged`,
    xmlDanado: 'content.xml is damaged',
    maxFilas: (hoja: string, max: number) => `The “${hoja}” sheet holds ${max} rows at most`,
    tipoOds: 'ODS spreadsheet',
  },
};

const DICCIONARIOS: Record<Idioma, Textos> = { es, en };
// en GitHub Pages el origen se comparte con las demás webs de la cuenta: la clave debe ser propia de esta
const CLAVE = 'mi-dinero-ods-idioma';

function inicial(): Idioma {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'es' || guardado === 'en') return guardado;
  } catch { /* sin almacenamiento */ }
  // en Node (el test) no hay navigator con idioma: español
  const nav = typeof navigator !== 'undefined' ? navigator.language ?? '' : '';
  return nav && !nav.toLowerCase().startsWith('es') ? 'en' : 'es';
}

export let idioma: Idioma = inicial();
export let t: Textos = DICCIONARIOS[idioma];

/** Cambia el idioma (y lo recuerda en este navegador). Quien llame debe volver a pintar la interfaz. */
export function setIdioma(i: Idioma): void {
  idioma = i;
  t = DICCIONARIOS[i];
  try { localStorage.setItem(CLAVE, i); } catch { /* sin almacenamiento */ }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = i;
    document.title = t.nombre;
  }
}
