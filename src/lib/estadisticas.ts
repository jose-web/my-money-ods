// src/lib/estadisticas.ts
// Las cifras de la página Estadísticas. Lo de cada mes solo cuenta los movimientos con fecha.
import { mesDe, pendiente, totalesDe, type Deuda, type Lado } from './registro.ts';
import { sumarMeses } from './estimacion.ts';

export interface Mes {
  mes: string;
  /** lo prestado y lo pagado ese mes, por lado */
  debo: { prestado: number; pagado: number };
  meDeben: { prestado: number; pagado: number };
  /** lo pendiente al acabar el mes, por lado */
  pendiente: Record<Lado, number>;
}

/**
 * Meses seguidos (también los que no tienen movimientos) desde el primer movimiento hasta el último o hasta
 * `hasta` (el mes actual), si es más tarde; como mucho los `max` últimos.
 */
export function rangoMeses(deudas: Deuda[], hasta: string, max = 12): string[] {
  const meses = deudas.flatMap(d => d.movimientos.map(m => mesDe(m.fecha))).filter(Boolean).sort();
  if (!meses.length) return [];
  const fin = meses[meses.length - 1] > hasta ? meses[meses.length - 1] : hasta;
  const r: string[] = [];
  for (let m = fin; r.length < max && m >= meses[0]; m = sumarMeses(m, -1)) r.unshift(m);
  return r;
}

export function porMes(deudas: Deuda[], meses: string[]): Mes[] {
  const movs = (lado: Lado) => deudas.filter(d => d.lado === lado).flatMap(d => d.movimientos).filter(m => mesDe(m.fecha));
  const debo = movs('debo');
  const meDeben = movs('meDeben');
  return meses.map(mes => ({
    mes,
    debo: totalesDe(debo.filter(m => mesDe(m.fecha) === mes)),
    meDeben: totalesDe(meDeben.filter(m => mesDe(m.fecha) === mes)),
    pendiente: {
      debo: pendiente(debo.filter(m => mesDe(m.fecha) <= mes)),
      meDeben: pendiente(meDeben.filter(m => mesDe(m.fecha) <= mes)),
    },
  }));
}

/** De todo lo prestado en un lado, cuánto se ha devuelto ya (0–1). */
export function devuelto(deudas: Deuda[], lado: Lado): { prestado: number; pagado: number; parte: number } {
  const { prestado, pagado } = totalesDe(deudas.filter(d => d.lado === lado).flatMap(d => d.movimientos));
  return { prestado, pagado, parte: prestado > 0 ? Math.min(1, pagado / prestado) : 0 };
}
