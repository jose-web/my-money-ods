// src/lib/estimacion.ts
// Cuándo quedará saldada una deuda, al ritmo al que se ha ido pagando. Se calcula aquí y no con la IA: un modelo
// pequeño como Gemini Nano se equivoca con las cuentas. La IA recibe estas cifras ya hechas y solo las explica.
//
// Ritmo = lo devuelto desde el primer pago, repartido entre los meses que han pasado desde entonces hasta hoy
// (como mínimo uno). Así un pago suelto antiguo da un ritmo bajo, y los pagos que se van parando bajan el ritmo.
// Meses que faltan = pendiente / ritmo, redondeado hacia arriba.
import { cifras, round2, type Deuda } from './registro.ts';

export type Estimacion =
  | { tipo: 'saldada' }
  /** se ha devuelto más de lo prestado */
  | { tipo: 'de-mas' }
  /** sin pagos todavía: no hay ritmo con el que calcular */
  | { tipo: 'sin-pagos'; pendiente: number }
  | {
      tipo: 'estimada';
      pendiente: number;
      /** euros devueltos al mes, de media */
      ritmo: number;
      /** fecha del primer pago (YYYY-MM-DD) */
      desde: string;
      pagos: number;
      /** meses que faltan */
      meses: number;
      /** mes en que quedaría saldada (YYYY-MM) */
      mes: string;
      /** lo mismo si se pagase un 25 % más al mes */
      masRapido: { ritmo: number; meses: number; mes: string };
    };

const DIAS_MES = 365.25 / 12;
// más allá de esto no tiene sentido dar una fecha (y se evitan cuentas absurdas)
const MAX_MESES = 1200;

const diasEntre = (a: string, b: string): number => (Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000;

/** «2026-10» + 5 meses → «2027-03» */
export function sumarMeses(mes: string, n: number): string {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function estimar(x: Deuda, hoy: string): Estimacion {
  const c = cifras(x);
  if (c.pendiente === 0) return { tipo: 'saldada' };
  if (c.pendiente < 0) return { tipo: 'de-mas' };
  const pagos = x.movimientos.filter(m => m.tipo === 'pago' && m.importe > 0 && /^\d{4}-\d{2}-\d{2}$/.test(m.fecha));
  if (!pagos.length) return { tipo: 'sin-pagos', pendiente: c.pendiente };
  const desde = pagos.map(m => m.fecha).sort()[0];
  const meses = Math.max(1, diasEntre(desde, hoy) / DIAS_MES);
  const ritmo = round2(pagos.reduce((s, m) => s + m.importe, 0) / meses);
  const faltan = (r: number) => Math.min(MAX_MESES, Math.ceil(c.pendiente / r));
  const mes = hoy.slice(0, 7);
  const n = faltan(ritmo);
  const rapido = round2(ritmo * 1.25);
  const nr = faltan(rapido);
  return {
    tipo: 'estimada', pendiente: c.pendiente, ritmo, desde, pagos: pagos.length,
    meses: n, mes: sumarMeses(mes, n), masRapido: { ritmo: rapido, meses: nr, mes: sumarMeses(mes, nr) },
  };
}

export const demasiadoLejos = (meses: number): boolean => meses >= MAX_MESES;
