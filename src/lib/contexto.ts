// src/lib/contexto.ts
// Los datos en texto, para dárselos a la IA (el chat y la explicación de las estimaciones), y la estimación de una
// deuda en una frase, que usan tanto la pantalla como la IA.
import { cifras, porFecha, round2, type Datos, type Deuda, type Lado } from './registro.ts';
import { demasiadoLejos, estimar, type Estimacion } from './estimacion.ts';
import { eur, fecha, mesAnio } from './format.ts';
import { t } from './i18n.ts';

/** La estimación en una frase: «Al ritmo de 650 € al mes, quedaría saldada hacia marzo de 2041 (dentro de 14 años…)». */
export function fraseEstimacion(e: Estimacion): string {
  if (e.tipo === 'saldada') return t.estimacion.saldada;
  if (e.tipo === 'de-mas') return t.estimacion.deMas;
  if (e.tipo === 'sin-pagos') return t.estimacion.sinPagos;
  if (demasiadoLejos(e.meses)) return t.estimacion.lejos(eur(e.ritmo));
  return t.estimacion.estimada(mesAnio(e.mes), t.estimacion.duracion(Math.floor(e.meses / 12), e.meses % 12), eur(e.ritmo));
}

/** Lo que hay detrás de la estimación (de dónde sale el ritmo y cómo sería pagando más), para mostrarlo debajo. */
export function detalleEstimacion(e: Estimacion): string[] {
  if (e.tipo !== 'estimada') return [];
  const out = [t.estimacion.base(e.pagos, fecha(e.desde))];
  if (!demasiadoLejos(e.masRapido.meses) && e.masRapido.mes !== e.mes) out.push(t.estimacion.masRapido(eur(e.masRapido.ritmo), mesAnio(e.masRapido.mes)));
  return out;
}

const nombre = (x: Deuda): string => [x.quien || t.deudas.sinNombre, x.motivo].filter(Boolean).join(' · ');

/** Una deuda en texto: cifras, estimación y (hasta `maxMovs`) sus movimientos más recientes. */
export function textoDeuda(x: Deuda, hoy: string, maxMovs = Infinity): string {
  const c = cifras(x);
  const e = estimar(x, hoy);
  const lineas = [
    t.ia.deuda(nombre(x), eur(c.prestado), eur(c.pagado), eur(c.pendiente)),
    `  ${t.estimacion.titulo}: ${[fraseEstimacion(e), ...detalleEstimacion(e)].join(' ')}`,
  ];
  if (maxMovs > 0 && x.movimientos.length) {
    const movs = porFecha(x.movimientos);
    const vistos = movs.slice(-maxMovs);
    const lista = vistos.map(m => `${fecha(m.fecha) || '?'} ${m.tipo === 'pago' ? t.ia.pago : t.ia.prestamo} ${eur(m.importe)}${m.concepto ? ` (${m.concepto})` : ''}${m.notas ? ` [${m.notas}]` : ''}`);
    const omitidos = movs.length - vistos.length;
    lineas.push(`  ${t.ia.movimientos}: ${omitidos ? `${t.ia.omitidos(omitidos)} ` : ''}${lista.join('; ')}.`);
  }
  return lineas.join('\n');
}

/** Todos los datos en texto. Con `maxMovs` se recortan los movimientos de cada deuda (para que quepan en el modelo). */
export function textoDatos(datos: Datos, hoy: string, maxMovs = Infinity): string {
  const lado = (l: Lado) => datos.deudas.filter(x => x.lado === l);
  const bloque = (l: Lado, titulo: string) => {
    const ds = lado(l);
    return [titulo, ...(ds.length ? ds.map(x => textoDeuda(x, hoy, maxMovs)) : [t.ia.ninguna])].join('\n');
  };
  const total = (l: Lado) => round2(lado(l).reduce((s, x) => s + Math.max(0, cifras(x).pendiente), 0));
  return [
    t.ia.hoy(fecha(hoy)),
    bloque('debo', t.ia.debo),
    bloque('meDeben', t.ia.meDeben),
    t.ia.totales(eur(total('debo')), eur(total('meDeben')), eur(round2(total('meDeben') - total('debo')))),
  ].join('\n\n');
}

// Gemini Nano admite unos pocos miles de «tokens» de entrada; con este tope de caracteres los datos ocupan menos de
// la mitad y queda sitio para la conversación y la respuesta
const MAX_CARACTERES = 9000;

/**
 * Los datos en texto, de más completo a más recortado (menos movimientos por deuda; al final, solo las cifras), sin
 * pasar del tope de caracteres. Quien los use prueba el primero y, si el modelo dice que no cabe, el siguiente.
 */
export function versionesDatos(datos: Datos, hoy: string): string[] {
  const out = [Infinity, 30, 15, 8, 3, 0].map(n => textoDatos(datos, hoy, n));
  const caben = out.filter(s => s.length <= MAX_CARACTERES);
  return [...new Set(caben.length ? caben : [out[out.length - 1]])];
}
