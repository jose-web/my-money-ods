// src/lib/registro.ts
// Mapea el libro de cuentas (.ods) a objetos y de vuelta. **Cada deuda es una hoja** (el banco por la casa, mi
// prima por las vacaciones…), y aparte va la hoja Ajustes con pares AJUSTE / VALOR.
//
// Hoja de una deuda:      A          B
//                     1   QUIÉN      Banco
//                     2   MOTIVO     Hipoteca de la casa
//                     3   LADO       DEBO | ME DEBEN
//                     4   PENDIENTE  =fórmula (préstamos − pagos)
//                     6   FECHA  CONCEPTO  TIPO  IMPORTE  NOTAS      ← cabecera de los movimientos
//                     7…  un movimiento por fila
//
// Una hoja es de deuda si tiene QUIÉN en A1 y LADO en A3: la web la reconoce por lo que tiene dentro, no por el
// nombre de la pestaña, que se pone solo («Debo · Banco · Hipoteca de la casa») y se puede cambiar en Hojas de
// cálculo. Las demás hojas del libro no se tocan. Al crear una deuda se crea su hoja; al borrarla, se borra.
//
// Antes había dos hojas, Debo y Me deben, con una fila por movimiento y QUIÉN y MOTIVO en cada fila: se leen igual y
// al guardar se pasan a una hoja por deuda.
import { OdsDate, OdsDocument, type CellValue, type OdsSheet } from './ods.ts';
import { norm, parseNum } from './format.ts';
import { t } from './i18n.ts';

/** préstamo: la deuda crece; pago: se devuelve una parte */
export type Tipo = 'prestamo' | 'pago';
export type Lado = 'debo' | 'meDeben';

export interface Movimiento {
  fecha: string; // YYYY-MM-DD
  concepto: string;
  tipo: Tipo;
  importe: number;
  notas: string;
}

export interface Deuda {
  /** identifica la deuda mientras el archivo está abierto (y con él, su hoja); ver `nuevoId` */
  id: string;
  lado: Lado;
  /** con quién es: «Banco», «Mi prima» */
  quien: string;
  /** por qué: «Hipoteca de la casa», «Vacaciones en Lisboa» */
  motivo: string;
  movimientos: Movimiento[];
}

export interface Ajustes {
  /** a quién se manda la copia de seguridad por correo */
  copiaEmail: string;
  /** cuándo se hizo la última copia de seguridad (ISO, hora local); vacío = nunca */
  copia: string;
  /** idioma de la interfaz guardado en el archivo («es», «en»); vacío = el del navegador */
  idioma: string;
}

export interface Datos {
  deudas: Deuda[];
  ajustes: Ajustes;
}

export const HOJA_AJUSTES = 'Ajustes';
const CABECERA = ['FECHA', 'CONCEPTO', 'TIPO', 'IMPORTE', 'NOTAS'];
const FICHA = ['QUIÉN', 'MOTIVO', 'LADO', 'PENDIENTE'];
// en la hoja el tipo y el lado van en texto; los mismos que busca la fórmula (SUMIF … "PRÉSTAMO")
const TIPO_HOJA: Record<Tipo, string> = { prestamo: 'PRÉSTAMO', pago: 'PAGO' };
const LADO_HOJA: Record<Lado, string> = { debo: 'DEBO', meDeben: 'ME DEBEN' };
// el principio del nombre de la pestaña
const LADO_PESTANA: Record<Lado, string> = { debo: 'Debo', meDeben: 'Me deben' };
const AJUSTES_LABELS: [keyof Ajustes, string][] = [
  ['idioma', 'IDIOMA'],
  ['copiaEmail', 'EMAIL PARA COPIAS DE SEGURIDAD'],
  ['copia', 'ÚLTIMA COPIA DE SEGURIDAD'],
];
// formato antiguo: hojas Debo y Me deben con QUIÉN y MOTIVO en cada fila
const HOJAS_ANTIGUAS: Record<Lado, string> = { debo: 'Debo', meDeben: 'Me deben' };

// fila de la cabecera de movimientos y primera de datos
const FILA_CABECERA = 6;
const TOP = 7;
const COLS = CABECERA.length;
// hasta cuántos movimientos se leen por hoja
const CAP = 5000;
// la celda del pendiente (B4) y su fórmula
const PENDIENTE: [number, number] = [4, 2];
const rango = (c: string) => `[.${c}${TOP}:.${c}${TOP + CAP - 1}]`;
const FORMULA = `of:=SUMIF(${rango('C')};"PRÉSTAMO";${rango('D')})-SUMIF(${rango('C')};"PAGO";${rango('D')})`;
// nombre de pestaña: Google admite 100 caracteres; se deja en 60 para que se lea
const LARGO_PESTANA = 60;

// Estilos de las hojas que crea la web. Llevan nombre propio (md-…) para no chocar con los del libro, que puede venir
// de Hojas de cálculo o de LibreOffice con otros; `addStyles` solo añade los que falten.
const ESTILOS = `
<style:style style:name="md-co-fecha" style:family="table-column"><style:table-column-properties style:column-width="2.6cm"/></style:style>
<style:style style:name="md-co-media" style:family="table-column"><style:table-column-properties style:column-width="3.6cm"/></style:style>
<style:style style:name="md-co-ancha" style:family="table-column"><style:table-column-properties style:column-width="6.5cm"/></style:style>
<number:date-style style:name="md-N-fecha"><number:day number:style="long"/><number:text>/</number:text><number:month number:style="long"/><number:text>/</number:text><number:year number:style="long"/></number:date-style>
<number:number-style style:name="md-N-eur"><number:number number:decimal-places="2" number:min-decimal-places="2" number:min-integer-digits="1" number:grouping="true"/><number:text> €</number:text></number:number-style>
<style:style style:name="md-cab" style:family="table-cell"><style:table-cell-properties fo:background-color="#c4e6d0"/><style:text-properties fo:font-weight="bold"/></style:style>
<style:style style:name="md-fecha" style:family="table-cell" style:data-style-name="md-N-fecha"/>
<style:style style:name="md-eur" style:family="table-cell" style:data-style-name="md-N-eur"/>
<style:style style:name="md-eur-negrita" style:family="table-cell" style:data-style-name="md-N-eur"><style:text-properties fo:font-weight="bold"/></style:style>
`;

const str = (v: CellValue): string => (v === null ? '' : v instanceof OdsDate ? v.iso : String(v)).trim();
const num = (v: CellValue): number => (typeof v === 'number' ? v : parseNum(str(v)) ?? 0);
const d = (iso: string): CellValue => (iso ? new OdsDate(iso) : null);

/** Fecha de una celda: de fecha, o escrita a mano en la hoja (01/10/2026, 1-10-26, 2026-10-01). */
function fechaDe(v: CellValue): string {
  if (v instanceof OdsDate) return v.iso;
  const s = str(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (!m) return s;
  const y = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

// lo que no empiece por «pag» (pago, pagado, pagué) o «pay»/«repa» (en inglés) es un préstamo
const tipoDe = (v: CellValue): Tipo => (/^(pag|pay|repa)/.test(norm(str(v))) ? 'pago' : 'prestamo');
// «ME DEBEN» (o «owed…» a mano); lo demás, «DEBO»
const ladoDe = (v: CellValue): Lado => (/^(me|owed)/.test(norm(str(v))) ? 'meDeben' : 'debo');

// el idioma se escribe con su código; a mano también vale el nombre («Español», «English», «Inglés»)
function idiomaDe(s: string): string {
  const n = norm(s);
  return /^(en|ing)/.test(n) ? 'en' : /^es/.test(n) ? 'es' : '';
}

const filled = (r: CellValue[]): boolean => r.some(v => str(v) !== '');

function buscarHoja(ods: OdsDocument, nombre: string): OdsSheet | null {
  const n = ods.sheetNames().find(x => norm(x) === norm(nombre));
  return n === undefined ? null : ods.sheet(n);
}

/** Filas con datos desde `top` y hasta qué fila (relativa) llega la zona ocupada, por si hay huecos. */
function rowsOf(sh: OdsSheet, top: number, nCols: number): { rows: CellValue[][]; span: number } {
  const all = sh.readRows(top, 1, nCols, CAP);
  let span = 0;
  all.forEach((r, i) => { if (filled(r)) span = i + 1; });
  return { rows: all.filter(filled), span };
}

const movimientoDe = (r: CellValue[]): Movimiento => ({ fecha: fechaDe(r[0]), concepto: str(r[1]), tipo: tipoDe(r[2]), importe: num(r[3]), notas: str(r[4]) });

let contador = 0;
/** Identificador para una deuda nueva (las que vienen del archivo usan el nombre de su hoja). */
export const nuevoId = (): string => `nueva:${Date.now().toString(36)}:${++contador}`;

/** Lo que identifica el nombre de la pestaña: si cambia, se renombra. */
const firmaDe = (x: Deuda): string => `${x.lado}\u0000${x.quien}\u0000${x.motivo}`;

export interface Registro {
  ods: OdsDocument;
  /** por id de deuda: su hoja, con qué QUIÉN/MOTIVO/LADO se guardó (para renombrarla) y cuántas filas de movimientos ocupa */
  hojas: Map<string, { hoja: string; firma: string; filas: number }>;
  /** hojas del formato antiguo que se quitan al guardar (sus deudas pasan a tener hoja propia) */
  antiguas: string[];
}

export async function abrir(bytes: ArrayBuffer | Uint8Array): Promise<{ registro: Registro; datos: Datos }> {
  const ods = await OdsDocument.open(bytes);
  const deudas: Deuda[] = [];
  const hojas: Registro['hojas'] = new Map();
  const antiguas: string[] = [];

  for (const nombre of ods.sheetNames()) {
    const sh = ods.sheet(nombre);
    const ficha = sh.readRows(1, 1, 3, 4);
    const [a1, b1, c1] = ficha[0].map(v => norm(str(v)));
    if (a1 === 'quien' && norm(str(ficha[2][0])) === 'lado') {
      const { rows, span } = rowsOf(sh, TOP, COLS);
      const x: Deuda = { id: `hoja:${nombre}`, lado: ladoDe(ficha[2][1]), quien: str(ficha[0][1]), motivo: str(ficha[1][1]), movimientos: rows.map(movimientoDe) };
      deudas.push(x);
      hojas.set(x.id, { hoja: nombre, firma: firmaDe(x), filas: span });
    } else if (a1 === 'quien' && b1 === 'motivo' && c1 === 'fecha') {
      // formato antiguo: una fila por movimiento, con QUIÉN y MOTIVO; cada pareja es una deuda
      const lado: Lado = norm(nombre) === norm(HOJAS_ANTIGUAS.meDeben) ? 'meDeben' : 'debo';
      const grupos = new Map<string, Deuda>();
      for (const r of rowsOf(sh, 2, 7).rows) {
        const clave = claveDeuda(str(r[0]), str(r[1]));
        if (!grupos.has(clave)) grupos.set(clave, { id: nuevoId(), lado, quien: str(r[0]), motivo: str(r[1]), movimientos: [] });
        grupos.get(clave)!.movimientos.push(movimientoDe(r.slice(2)));
      }
      deudas.push(...grupos.values());
      antiguas.push(nombre);
    }
  }

  const ajustes: Ajustes = { copiaEmail: '', copia: '', idioma: '' };
  for (const [label, valor] of buscarHoja(ods, HOJA_AJUSTES)?.readRows(1, 1, 2, 60) ?? []) {
    const key = AJUSTES_LABELS.find(([, l]) => norm(l) === norm(str(label)))?.[0];
    if (key === 'idioma') ajustes.idioma = idiomaDe(str(valor));
    else if (key) ajustes[key] = str(valor);
  }

  return { registro: { ods, hojas, antiguas }, datos: { deudas, ajustes } };
}

export async function guardar(registro: Registro, datos: Datos): Promise<Uint8Array> {
  const { ods } = registro;
  ods.addStyles(ESTILOS);

  // Ajustes lo primero: así el libro nunca se queda sin hojas al quitar las de deudas
  const sa = buscarHoja(ods, HOJA_AJUSTES) ?? crearAjustes(ods);
  const labels = sa.readRows(1, 1, 1, 60).map(([l]) => norm(str(l)));
  let libre = labels.findLastIndex(l => l !== '') + 2;
  for (const [key, label] of AJUSTES_LABELS) {
    const v = datos.ajustes[key];
    let fila = labels.indexOf(norm(label)) + 1;
    if (!fila) {
      if (!v) continue;
      fila = libre++;
      sa.write(fila, 1, label);
    }
    sa.write(fila, 2, v || null);
  }

  // las deudas borradas se llevan su hoja; las del formato antiguo, también (ya van en hojas propias)
  const vivas = new Set(datos.deudas.map(x => x.id));
  for (const [id, h] of registro.hojas) {
    if (vivas.has(id)) continue;
    if (ods.sheetNames().includes(h.hoja)) ods.removeSheet(h.hoja);
    registro.hojas.delete(id);
  }
  for (const n of registro.antiguas) if (ods.sheetNames().includes(n)) ods.removeSheet(n);
  registro.antiguas = [];

  for (const x of datos.deudas) {
    if (x.movimientos.length > CAP) throw new Error(t.errores.maxFilas(x.quien, CAP));
    let h = registro.hojas.get(x.id);
    const firma = firmaDe(x);
    if (!h || !ods.sheetNames().includes(h.hoja)) {
      const nombre = nombreLibre(ods, nombrePestana(x));
      crearHojaDeuda(ods, nombre);
      h = { hoja: nombre, firma, filas: 0 };
    } else if (h.firma !== firma) {
      // cambió el nombre, el motivo o el lado: la pestaña se llama como ahora
      const nombre = nombreLibre(ods, nombrePestana(x), h.hoja);
      if (nombre !== h.hoja) ods.renameSheet(h.hoja, nombre);
      h = { ...h, hoja: nombre };
    }
    const sh = ods.sheet(h.hoja);
    sh.writeRows(1, 2, [[x.quien], [x.motivo || null], [LADO_HOJA[x.lado]]]);
    sh.setFormula(...PENDIENTE, FORMULA, pendiente(x.movimientos));
    const filas: CellValue[][] = porFecha(x.movimientos).map(m => [d(m.fecha), m.concepto || null, TIPO_HOJA[m.tipo], m.importe, m.notas || null]);
    const vacia: CellValue[] = Array(COLS).fill(null);
    while (filas.length < h.filas) filas.push(vacia);
    sh.writeRows(TOP, 1, filas);
    registro.hojas.set(x.id, { hoja: h.hoja, firma, filas: x.movimientos.length });
  }

  return ods.toBytes();
}

/** «Debo · Banco · Hipoteca de la casa», sin los caracteres que no admiten las pestañas. */
function nombrePestana(x: Deuda): string {
  const crudo = [LADO_PESTANA[x.lado], x.quien, x.motivo].filter(Boolean).join(' · ');
  const limpio = crudo.replace(/[[\]*?:/\\]/g, ' ').replace(/\s+/g, ' ').replace(/^'+|'+$/g, '').trim();
  return limpio.slice(0, LARGO_PESTANA).trim();
}

/** `nombre`, o «nombre (2)», «nombre (3)»… si ya hay otra hoja que se llame así (`propia` no cuenta). */
function nombreLibre(ods: OdsDocument, nombre: string, propia?: string): string {
  const otras = new Set(ods.sheetNames().filter(n => n !== propia).map(n => n.toLowerCase()));
  if (!otras.has(nombre.toLowerCase())) return nombre;
  for (let i = 2; ; i++) {
    const sufijo = ` (${i})`;
    const otro = nombre.slice(0, LARGO_PESTANA - sufijo.length).trim() + sufijo;
    if (!otras.has(otro.toLowerCase())) return otro;
  }
}

function crearHojaDeuda(ods: OdsDocument, nombre: string): OdsSheet {
  const sh = ods.addSheet(nombre, [
    { columna: 'md-co-fecha', celda: 'md-fecha' }, { columna: 'md-co-ancha' }, { columna: 'md-co-media' },
    { columna: 'md-co-media', celda: 'md-eur' }, { columna: 'md-co-ancha' },
  ]);
  sh.writeRows(1, 1, FICHA.map(f => [f]));
  sh.writeRows(FILA_CABECERA, 1, [CABECERA]);
  FICHA.forEach((_, i) => sh.setStyle(i + 1, 1, 'md-cab'));
  CABECERA.forEach((_, i) => sh.setStyle(FILA_CABECERA, i + 1, 'md-cab'));
  // B1 (quién) en negrita no hace falta; el pendiente, sí, y con formato de euros
  sh.setStyle(PENDIENTE[0], PENDIENTE[1], 'md-eur-negrita');
  return sh;
}

function crearAjustes(ods: OdsDocument): OdsSheet {
  const sh = ods.addSheet(HOJA_AJUSTES, [{ columna: 'md-co-ancha' }, { columna: 'md-co-ancha' }]);
  sh.writeRows(1, 1, [['AJUSTE', 'VALOR']]);
  sh.setStyle(1, 1, 'md-cab');
  sh.setStyle(1, 2, 'md-cab');
  return sh;
}

// ------------------------------------------------------------ cálculos

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Lo que queda por devolver: préstamos menos pagos. */
export const pendiente = (movs: Movimiento[]): number =>
  round2(movs.reduce((s, m) => s + (m.tipo === 'pago' ? -m.importe : m.importe), 0));

export const suma = (xs: { importe: number }[]): number => round2(xs.reduce((s, x) => s + x.importe, 0));

/** Cifras de una deuda: lo prestado, lo devuelto, lo que queda y las fechas del primer y del último movimiento. */
export function cifras(x: Deuda): { prestado: number; pagado: number; pendiente: number; desde: string; ultimo: string } {
  const fechas = x.movimientos.map(m => m.fecha).filter(Boolean).sort();
  return {
    prestado: suma(x.movimientos.filter(m => m.tipo === 'prestamo')),
    pagado: suma(x.movimientos.filter(m => m.tipo === 'pago')),
    pendiente: pendiente(x.movimientos),
    desde: fechas[0] ?? '',
    ultimo: fechas[fechas.length - 1] ?? '',
  };
}

/** QUIÉN y MOTIVO sin mayúsculas ni tildes: dos deudas del mismo lado no pueden coincidir (se confundirían). */
export const claveDeuda = (quien: string, motivo: string): string => `${norm(quien)}\u0000${norm(motivo)}`;

/** «2026-10» de una fecha; vacío si no la tiene. */
export const mesDe = (iso: string): string => (/^\d{4}-\d{2}/.test(iso) ? iso.slice(0, 7) : '');

/** Los meses con algún movimiento, del más reciente al más antiguo. */
export const mesesCon = (deudas: Deuda[]): string[] =>
  [...new Set(deudas.flatMap(x => x.movimientos.map(m => mesDe(m.fecha))).filter(Boolean))].sort().reverse();

/** Lo prestado y lo pagado de unos movimientos (p. ej. los de un mes). */
export const totalesDe = (movs: Movimiento[]): { prestado: number; pagado: number } => ({
  prestado: suma(movs.filter(m => m.tipo === 'prestamo')),
  pagado: suma(movs.filter(m => m.tipo === 'pago')),
});

/** Ordena por fecha (las que no tienen, al final) sin desordenar las del mismo día. */
export const porFecha = <T extends { fecha: string }>(xs: T[]): T[] =>
  xs.map((x, i) => ({ x, i })).sort((a, b) => (a.x.fecha || '9999').localeCompare(b.x.fecha || '9999') || a.i - b.i).map(({ x }) => x);

export function hoy(): string {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10);
}
