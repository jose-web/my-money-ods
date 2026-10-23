// src/lib/registro.ts
// Mapea el libro de cuentas (.ods) a objetos y de vuelta. Dos hojas de movimientos, Debo y Me deben, con la
// cabecera en la fila 1 y los datos desde la 2, columnas A a G; y la hoja Ajustes con pares AJUSTE / VALOR.
// Cada fila es un movimiento de una deuda; la deuda es QUIÉN + MOTIVO (el banco por la casa, mi prima por las
// vacaciones…), así que las filas de una misma deuda se reconocen por esas dos columnas y no hace falta otra hoja.
// Las hojas se buscan por nombre sin mirar mayúsculas ni tildes; si falta alguna, se crea al guardar.
// La columna I de cada hoja es para el resumen con fórmula de la plantilla: la web solo actualiza su resultado.
import { t } from './i18n.ts';
import { OdsDate, OdsDocument, type CellValue, type OdsSheet } from './ods.ts';
import { norm, parseNum } from './format.ts';

/** préstamo: la deuda crece; pago: se devuelve una parte */
export type Tipo = 'prestamo' | 'pago';

export interface Movimiento {
  /** con quién es la deuda: «Banco», «Mi prima» */
  quien: string;
  /** por qué: «Hipoteca de la casa», «Vacaciones en Lisboa» */
  motivo: string;
  fecha: string; // YYYY-MM-DD
  concepto: string;
  tipo: Tipo;
  importe: number;
  notas: string;
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
  debo: Movimiento[];
  meDeben: Movimiento[];
  ajustes: Ajustes;
}

/** Una deuda: sus movimientos (en el orden de la hoja) y lo que queda. */
export interface Deuda {
  /** QUIÉN y MOTIVO normalizados: identifica la deuda */
  clave: string;
  quien: string;
  motivo: string;
  movimientos: Movimiento[];
  prestado: number;
  pagado: number;
  pendiente: number;
  /** fecha del primer y del último movimiento */
  desde: string;
  ultimo: string;
}

export type Lado = 'debo' | 'meDeben';

export const HOJAS = { debo: 'Debo', meDeben: 'Me deben', ajustes: 'Ajustes' } as const;
const CABECERA = ['QUIÉN', 'MOTIVO', 'FECHA', 'CONCEPTO', 'TIPO', 'IMPORTE', 'NOTAS'];
// en la hoja el tipo va en texto; los mismos que busca la fórmula de la plantilla (SUMIF … "PRÉSTAMO")
const TIPO_HOJA: Record<Tipo, string> = { prestamo: 'PRÉSTAMO', pago: 'PAGO' };
const AJUSTES_LABELS: [keyof Ajustes, string][] = [
  ['idioma', 'IDIOMA'],
  ['copiaEmail', 'EMAIL PARA COPIAS DE SEGURIDAD'],
  ['copia', 'ÚLTIMA COPIA DE SEGURIDAD'],
];

const TOP = 2;
const COLS = CABECERA.length;
// hasta dónde se leen las filas de cada hoja
const CAP = 5000;
// la celda del resumen con fórmula de la plantilla (I2)
const RESUMEN: [number, number] = [2, 9];

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

/** Filas con datos y hasta qué fila (relativa) llega la zona ocupada, por si hay huecos. */
function rowsOf(sh: OdsSheet | null): { rows: CellValue[][]; span: number } {
  if (!sh) return { rows: [], span: 0 };
  const all = sh.readRows(TOP, 1, COLS, CAP);
  let span = 0;
  all.forEach((r, i) => { if (filled(r)) span = i + 1; });
  return { rows: all.filter(filled), span };
}

/** Escribe `rows` desde la fila 2 y vacía las sobrantes hasta `clearUntil` filas. */
function writeTable(sh: OdsSheet, rows: CellValue[][], clearUntil: number): void {
  if (rows.length > CAP) throw new Error(t.errores.maxFilas(sh.name, CAP));
  const out = rows.slice();
  const empty: CellValue[] = Array(COLS).fill(null);
  while (out.length < clearUntil) out.push(empty);
  sh.writeRows(TOP, 1, out);
}

export interface Registro {
  ods: OdsDocument;
  /** última fila ocupada de cada hoja, para vaciar las sobrantes al guardar */
  counts: Record<Lado, number>;
}

export async function abrir(bytes: ArrayBuffer | Uint8Array): Promise<{ registro: Registro; datos: Datos }> {
  const ods = await OdsDocument.open(bytes);
  const db = rowsOf(buscarHoja(ods, HOJAS.debo));
  const md = rowsOf(buscarHoja(ods, HOJAS.meDeben));
  const movimientos = (rows: CellValue[][]): Movimiento[] => rows.map(r => ({
    quien: str(r[0]), motivo: str(r[1]), fecha: fechaDe(r[2]), concepto: str(r[3]), tipo: tipoDe(r[4]), importe: num(r[5]), notas: str(r[6]),
  }));

  const ajustes: Ajustes = { copiaEmail: '', copia: '', idioma: '' };
  for (const [label, valor] of buscarHoja(ods, HOJAS.ajustes)?.readRows(1, 1, 2, 60) ?? []) {
    const key = AJUSTES_LABELS.find(([, l]) => norm(l) === norm(str(label)))?.[0];
    if (key === 'idioma') ajustes.idioma = idiomaDe(str(valor));
    else if (key) ajustes[key] = str(valor);
  }

  return {
    registro: { ods, counts: { debo: db.span, meDeben: md.span } },
    datos: { debo: movimientos(db.rows), meDeben: movimientos(md.rows), ajustes },
  };
}

export async function guardar(registro: Registro, datos: Datos): Promise<Uint8Array> {
  const { ods, counts } = registro;
  for (const lado of ['debo', 'meDeben'] as const) {
    const sh = buscarHoja(ods, HOJAS[lado]) ?? crearHoja(ods, HOJAS[lado], CABECERA);
    writeTable(sh, datos[lado].map(x =>
      [x.quien, x.motivo || null, d(x.fecha), x.concepto || null, TIPO_HOJA[x.tipo], x.importe, x.notas || null]), counts[lado]);
    sh.setFormulaResult(...RESUMEN, pendiente(datos[lado]));
  }

  const sa = buscarHoja(ods, HOJAS.ajustes) ?? crearHoja(ods, HOJAS.ajustes, ['AJUSTE', 'VALOR']);
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

  const bytes = await ods.toBytes();
  registro.counts = { debo: datos.debo.length, meDeben: datos.meDeben.length };
  return bytes;
}

/** Hoja nueva con la cabecera en la fila 1, con el estilo de cabecera de otra hoja si lo hay. */
function crearHoja(ods: OdsDocument, nombre: string, cols: string[]): OdsSheet {
  const ref = Object.values(HOJAS).map(n => buscarHoja(ods, n)).find(Boolean);
  const estilo = ref?.styleOf(1, 1) ?? null;
  const sh = ods.addSheet(nombre, Math.max(cols.length, 9));
  sh.writeRows(1, 1, [cols]);
  cols.forEach((_, i) => sh.setStyle(1, i + 1, estilo));
  return sh;
}

// ------------------------------------------------------------ cálculos

export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Lo que queda por devolver: préstamos menos pagos. */
export const pendiente = (movs: Movimiento[]): number =>
  round2(movs.reduce((s, m) => s + (m.tipo === 'pago' ? -m.importe : m.importe), 0));

export const suma = (xs: { importe: number }[]): number => round2(xs.reduce((s, x) => s + x.importe, 0));

export const claveDeuda = (quien: string, motivo: string): string => `${norm(quien)}\u0000${norm(motivo)}`;
export const esDe = (m: Movimiento, clave: string): boolean => claveDeuda(m.quien, m.motivo) === clave;

/** Agrupa los movimientos en deudas, en el orden en que aparece cada una por primera vez. */
export function deudas(movs: Movimiento[]): Deuda[] {
  const grupos = new Map<string, Movimiento[]>();
  for (const m of movs) {
    const k = claveDeuda(m.quien, m.motivo);
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }
  return [...grupos].map(([clave, ms]) => {
    const fechas = ms.map(m => m.fecha).filter(Boolean).sort();
    return {
      clave, quien: ms[0].quien, motivo: ms[0].motivo, movimientos: ms,
      prestado: suma(ms.filter(m => m.tipo === 'prestamo')), pagado: suma(ms.filter(m => m.tipo === 'pago')),
      pendiente: pendiente(ms), desde: fechas[0] ?? '', ultimo: fechas[fechas.length - 1] ?? '',
    };
  });
}

/** Ordena por fecha (las que no tienen, al final) sin desordenar las del mismo día. */
export const porFecha = <T extends { fecha: string }>(xs: T[]): T[] =>
  xs.map((x, i) => ({ x, i })).sort((a, b) => (a.x.fecha || '9999').localeCompare(b.x.fecha || '9999') || a.i - b.i).map(({ x }) => x);

/**
 * Deja los movimientos agrupados por deuda (en el orden en que aparece cada una) y, dentro, por fecha: así
 * se leen bien también en la hoja de cálculo.
 */
export const ordenar = (movs: Movimiento[]): Movimiento[] => deudas(movs).flatMap(x => porFecha(x.movimientos));

export function hoy(): string {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10);
}
