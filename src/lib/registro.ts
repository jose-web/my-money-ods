// src/lib/registro.ts
// Mapea el libro de cuentas (.ods) a objetos y de vuelta. Tres hojas de movimientos (Gastos casa, Le debo,
// Me debe) con la cabecera en la fila 1 y los datos desde la 2, columnas A a E, y la hoja Ajustes con pares
// AJUSTE / VALOR. Las hojas se buscan por nombre sin mirar mayúsculas ni tildes; si falta alguna, se crea
// al guardar. La columna G de cada hoja es para el resumen con fórmula de la plantilla: la web no la toca.
import { OdsDate, OdsDocument, type CellValue, type OdsSheet } from './ods.ts';
import { norm, parseNum } from './format.ts';

export interface Gasto {
  fecha: string; // YYYY-MM-DD
  concepto: string;
  categoria: string;
  importe: number;
  notas: string;
}

/** préstamo: la deuda crece; pago: se devuelve una parte */
export type Tipo = 'prestamo' | 'pago';

export interface Movimiento {
  fecha: string;
  concepto: string;
  tipo: Tipo;
  importe: number;
  notas: string;
}

export interface Ajustes {
  /** nombre de la persona a la que debo (hoja Le debo) */
  leDebo: string;
  /** nombre de la persona que me debe (hoja Me debe) */
  meDebe: string;
  categorias: string[];
  /** a quién se manda la copia de seguridad por correo */
  copiaEmail: string;
  /** cuándo se hizo la última copia de seguridad (ISO, hora local); vacío = nunca */
  copia: string;
}

export interface Datos {
  gastos: Gasto[];
  leDebo: Movimiento[];
  meDebe: Movimiento[];
  ajustes: Ajustes;
}

export const HOJAS = { gastos: 'Gastos casa', leDebo: 'Le debo', meDebe: 'Me debe', ajustes: 'Ajustes' } as const;
const CABECERAS = {
  gastos: ['FECHA', 'CONCEPTO', 'CATEGORÍA', 'IMPORTE', 'NOTAS'],
  leDebo: ['FECHA', 'CONCEPTO', 'TIPO', 'IMPORTE', 'NOTAS'],
  meDebe: ['FECHA', 'CONCEPTO', 'TIPO', 'IMPORTE', 'NOTAS'],
};
// en la hoja el tipo va en texto; los mismos que busca la fórmula de la plantilla (SUMIF … "PRÉSTAMO")
const TIPO_HOJA: Record<Tipo, string> = { prestamo: 'PRÉSTAMO', pago: 'PAGO' };
const AJUSTES_LABELS: [keyof Ajustes, string][] = [
  ['leDebo', 'PERSONA A LA QUE DEBO'],
  ['meDebe', 'PERSONA QUE ME DEBE'],
  ['categorias', 'CATEGORÍAS DE GASTOS'],
  ['copiaEmail', 'EMAIL PARA COPIAS DE SEGURIDAD'],
  ['copia', 'ÚLTIMA COPIA DE SEGURIDAD'],
];
export const CATEGORIAS_INICIALES = ['Alquiler o hipoteca', 'Luz', 'Agua', 'Gas', 'Internet y teléfono', 'Comunidad', 'Supermercado', 'Seguros', 'Reparaciones', 'Otros'];

const TOP = 2;
const COLS = 5;
// hasta dónde se leen las filas de cada hoja
const CAP = 5000;
// la celda del resumen con fórmula de la plantilla (G2)
const RESUMEN: [number, number] = [2, 7];

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

// lo que no empiece por «pag» (pago, pagado, pagué) es un préstamo
const tipoDe = (v: CellValue): Tipo => (norm(str(v)).startsWith('pag') ? 'pago' : 'prestamo');

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
  if (rows.length > CAP) throw new Error(`La hoja «${sh.name}» admite ${CAP} filas como máximo`);
  const out = rows.slice();
  const empty: CellValue[] = Array(COLS).fill(null);
  while (out.length < clearUntil) out.push(empty);
  sh.writeRows(TOP, 1, out);
}

type Tabla = keyof typeof CABECERAS;

export interface Registro {
  ods: OdsDocument;
  /** última fila ocupada de cada hoja, para vaciar las sobrantes al guardar */
  counts: Record<Tabla, number>;
}

export async function abrir(bytes: ArrayBuffer | Uint8Array): Promise<{ registro: Registro; datos: Datos }> {
  const ods = await OdsDocument.open(bytes);
  const g = rowsOf(buscarHoja(ods, HOJAS.gastos));
  const ld = rowsOf(buscarHoja(ods, HOJAS.leDebo));
  const md = rowsOf(buscarHoja(ods, HOJAS.meDebe));
  const movimientos = (rows: CellValue[][]): Movimiento[] => rows.map(r => ({
    fecha: fechaDe(r[0]), concepto: str(r[1]), tipo: tipoDe(r[2]), importe: num(r[3]), notas: str(r[4]),
  }));

  const ajustes: Ajustes = { leDebo: '', meDebe: '', categorias: CATEGORIAS_INICIALES, copiaEmail: '', copia: '' };
  const aSheet = buscarHoja(ods, HOJAS.ajustes);
  for (const [label, valor] of aSheet?.readRows(1, 1, 2, 60) ?? []) {
    const key = AJUSTES_LABELS.find(([, l]) => norm(l) === norm(str(label)))?.[0];
    if (!key) continue;
    if (key === 'categorias') ajustes.categorias = str(valor).split(/[,;\n]/).map(s => s.trim()).filter(Boolean);
    else ajustes[key] = str(valor);
  }

  return {
    registro: { ods, counts: { gastos: g.span, leDebo: ld.span, meDebe: md.span } },
    datos: {
      gastos: g.rows.map(r => ({ fecha: fechaDe(r[0]), concepto: str(r[1]), categoria: str(r[2]), importe: num(r[3]), notas: str(r[4]) })),
      leDebo: movimientos(ld.rows),
      meDebe: movimientos(md.rows),
      ajustes,
    },
  };
}

export async function guardar(registro: Registro, datos: Datos): Promise<Uint8Array> {
  const { ods, counts } = registro;
  const hoja = (t: Tabla) => buscarHoja(ods, HOJAS[t]) ?? crearHoja(ods, HOJAS[t], CABECERAS[t]);

  const sg = hoja('gastos');
  writeTable(sg, datos.gastos.map(x => [d(x.fecha), x.concepto, x.categoria || null, x.importe, x.notas || null]), counts.gastos);
  sg.setFormulaResult(...RESUMEN, round2(datos.gastos.reduce((s, x) => s + x.importe, 0)));
  for (const t of ['leDebo', 'meDebe'] as const) {
    const sh = hoja(t);
    writeTable(sh, datos[t].map(x => [d(x.fecha), x.concepto, TIPO_HOJA[x.tipo], x.importe, x.notas || null]), counts[t]);
    sh.setFormulaResult(...RESUMEN, pendiente(datos[t]));
  }

  const sa = buscarHoja(ods, HOJAS.ajustes) ?? crearHoja(ods, HOJAS.ajustes, ['AJUSTE', 'VALOR']);
  const labels = sa.readRows(1, 1, 1, 60).map(([l]) => norm(str(l)));
  let libre = labels.findLastIndex(l => l !== '') + 2;
  for (const [key, label] of AJUSTES_LABELS) {
    const v = key === 'categorias' ? datos.ajustes.categorias.join(', ') : datos.ajustes[key];
    let fila = labels.indexOf(norm(label)) + 1;
    if (!fila) {
      if (!v) continue;
      fila = libre++;
      sa.write(fila, 1, label);
    }
    sa.write(fila, 2, v || null);
  }

  const bytes = await ods.toBytes();
  registro.counts = { gastos: datos.gastos.length, leDebo: datos.leDebo.length, meDebe: datos.meDebe.length };
  return bytes;
}

/** Hoja nueva con la cabecera en la fila 1, con el estilo de cabecera de otra hoja si lo hay. */
function crearHoja(ods: OdsDocument, nombre: string, cols: string[]): OdsSheet {
  const ref = Object.values(HOJAS).map(n => buscarHoja(ods, n)).find(Boolean);
  const estilo = ref?.styleOf(1, 1) ?? null;
  const sh = ods.addSheet(nombre, Math.max(cols.length, 7));
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

/** «2026-10» de una fecha; vacío si no la tiene. */
export const mesDe = (iso: string): string => (/^\d{4}-\d{2}/.test(iso) ? iso.slice(0, 7) : '');

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
/** «2026-10» → «octubre de 2026» */
export const nombreMes = (mes: string): string => (mes ? `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}` : 'Sin fecha');

/** Ordena por fecha (las que no tienen, al final) sin desordenar las del mismo día. */
export const porFecha = <T extends { fecha: string }>(xs: T[]): T[] =>
  xs.map((x, i) => ({ x, i })).sort((a, b) => (a.x.fecha || '9999').localeCompare(b.x.fecha || '9999') || a.i - b.i).map(({ x }) => x);

export function hoy(): string {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())).toISOString().slice(0, 10);
}
