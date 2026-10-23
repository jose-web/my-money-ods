// src/components/Estadisticas.tsx
// Gráficos: lo devuelto de cada lado, los pagos de cada mes, cómo ha ido cambiando lo pendiente y cuánto queda de
// cada deuda; y, con un mes elegido, sus movimientos. Los gráficos son SVG a mano (sin librerías).
import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { cifras, hoy, mesDe, mesesCon, porFecha, totalesDe, type Datos, type Lado } from '../lib/registro.ts';
import { devuelto, porMes, rangoMeses } from '../lib/estadisticas.ts';
import { eur, eurCorto, fecha, mayuscula, mesAnio, mesCorto, porcentaje } from '../lib/format.ts';
import { Selector } from './Selector.tsx';
import { btn, empty, etiqueta, filtro, filtros, h2, lista, listaFila, muted, panel, panelHead } from './ui.ts';
import { t } from '../lib/i18n.ts';

interface Props {
  datos: Datos;
  /** abre una deuda */
  onIr(lado: Lado, id: string): void;
  /** mes con el que se filtra («2026-10»), o vacío */
  mes: string;
  onMes(mes: string): void;
}

// el color de cada lado, como clases (Tailwind solo genera lo que ve escrito)
const COLOR: Record<Lado, { fill: string; stroke: string; bg: string; suave: string }> = {
  debo: { fill: 'fill-serie-debo', stroke: 'stroke-serie-debo', bg: 'bg-serie-debo', suave: 'bg-serie-debo/15' },
  meDeben: { fill: 'fill-serie-medeben', stroke: 'stroke-serie-medeben', bg: 'bg-serie-medeben', suave: 'bg-serie-medeben/15' },
};
const LADOS = ['debo', 'meDeben'] as const;

export function Estadisticas({ datos, onIr, mes, onMes }: Props) {
  const meses = mesesCon(datos.deudas);
  const actual = hoy().slice(0, 7);
  const ultimos12 = porMes(datos.deudas, rangoMeses(datos.deudas, actual, 12));
  const ultimos24 = porMes(datos.deudas, rangoMeses(datos.deudas, actual, 24));
  const nMovs = datos.deudas.reduce((s, d) => s + d.movimientos.length, 0);

  // los movimientos del mes elegido, de todas las deudas, del más reciente al más antiguo
  const delMes = mes ? porFecha(datos.deudas.flatMap(d => d.movimientos.filter(m => mesDe(m.fecha) === mes).map(m => ({ ...m, d })))).reverse() : [];

  const cabecera = (
    <div class={panelHead}>
      <h1 class={h2}>{t.estadisticas.titulo}</h1>
      {meses.length > 0 && (
        <div class={filtros}>
          <Selector clase={`${filtro} cursor-pointer text-left`} valor={mes} vacio={t.filtros.todos} onChange={onMes}
            opciones={meses.map(m => ({ valor: m, texto: mayuscula(mesAnio(m)) }))} />
          {mes && <button class={btn('ghost', 'small')} onClick={() => onMes('')}>{t.filtros.quitar}</button>}
        </div>
      )}
    </div>
  );
  if (!meses.length) return <div>{cabecera}<section class={panel}><p class={empty}>{t.estadisticas.sinDatos}</p></section></div>;

  const deudas = datos.deudas.map(d => ({ d, c: cifras(d) })).filter(({ c }) => c.prestado > 0)
    .sort((a, b) => (a.d.lado === b.d.lado ? b.c.pendiente - a.c.pendiente : a.d.lado === 'debo' ? -1 : 1));

  return (
    <div class="flex flex-col gap-5">
      <div class="-mb-5">{cabecera}</div>

      <div class="grid grid-cols-3 gap-4 tablet:grid-cols-1 movil:gap-3">
        {LADOS.map(lado => {
          const r = devuelto(datos.deudas, lado);
          return (
            <div key={lado} class="flex items-center gap-4 rounded-[10px] bg-paper p-5 shadow-[0_1px_0_var(--color-line)] movil:p-4">
              <Anillo parte={r.parte} lado={lado} />
              <div class="min-w-0">
                <p class={etiqueta}>{lado === 'debo' ? t.estadisticas.devueltoDebo : t.estadisticas.devueltoMeDeben}</p>
                <p class="text-[13px] text-ink-2 tabular-nums">{r.prestado ? t.estadisticas.deTotal(eur(r.pagado), eur(r.prestado)) : t.estadisticas.nadaPrestado}</p>
              </div>
            </div>
          );
        })}
        <div class="flex flex-col justify-center gap-0.5 rounded-[10px] bg-paper p-5 shadow-[0_1px_0_var(--color-line)] movil:p-4">
          <p class={etiqueta}>{t.estadisticas.actividad}</p>
          <p class="text-[26px] leading-tight font-bold tracking-[-.02em] tabular-nums">{t.estadisticas.movimientos(nMovs)}</p>
          <p class={`${muted} text-xs`}>{t.estadisticas.enMeses(datos.deudas.length, meses.length)}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-5 tablet:grid-cols-1">
        <section class={panel}>
          <h2 class={h2}>{t.estadisticas.pagos}</h2>
          <p class={`${muted} mb-3 text-[13px]`}>{t.estadisticas.pagosNota}</p>
          <Leyenda series={[['debo', t.estadisticas.pague], ['meDeben', t.estadisticas.meDevolvieron]]} />
          <GraficoMeses forma="barras" meses={ultimos12.map(m => m.mes)} elegido={mes} onElegir={m => onMes(m === mes ? '' : m)}
            series={[{ lado: 'debo', valores: ultimos12.map(m => m.debo.pagado) }, { lado: 'meDeben', valores: ultimos12.map(m => m.meDeben.pagado) }]}
            detalle={i => {
              const m = ultimos12[i];
              return <>
                <Fila lado="debo" texto={t.estadisticas.pague} valor={m.debo.pagado} />
                <Fila lado="meDeben" texto={t.estadisticas.meDevolvieron} valor={m.meDeben.pagado} />
                {m.debo.prestado > 0 && <Fila texto={t.deudas.debo.tipo.prestamo} valor={m.debo.prestado} />}
                {m.meDeben.prestado > 0 && <Fila texto={t.deudas.meDeben.tipo.prestamo} valor={m.meDeben.prestado} />}
              </>;
            }} />
        </section>
        <section class={panel}>
          <h2 class={h2}>{t.estadisticas.evolucion}</h2>
          <p class={`${muted} mb-3 text-[13px]`}>{t.estadisticas.evolucionNota}</p>
          <Leyenda series={[['debo', t.resumen.debo], ['meDeben', t.resumen.meDeben]]} />
          <GraficoMeses forma="lineas" meses={ultimos24.map(m => m.mes)} elegido={mes}
            series={LADOS.map(lado => ({ lado, valores: ultimos24.map(m => m.pendiente[lado]) }))}
            detalle={i => <>
              <Fila lado="debo" texto={t.resumen.debo} valor={ultimos24[i].pendiente.debo} />
              <Fila lado="meDeben" texto={t.resumen.meDeben} valor={ultimos24[i].pendiente.meDeben} />
            </>} />
        </section>
      </div>

      {mes && (
        <section class={panel}>
          <h2 class={`${h2} mb-4`}>{t.filtros.movimientos(mesAnio(mes))}</h2>
          <div class="mb-4 grid grid-cols-2 gap-4 movil:grid-cols-1">
            {LADOS.map(lado => {
              const r = totalesDe(delMes.filter(m => m.d.lado === lado));
              const l = t.deudas[lado];
              return (
                <div key={lado} class="rounded-xl bg-field px-4 py-3">
                  <p class={`${etiqueta} mb-1`}>{l.titulo}</p>
                  <p class="text-[13px]">{l.tipo.pago}: <b class="tabular-nums">{eur(r.pagado)}</b></p>
                  <p class="text-[13px]">{l.tipo.prestamo}: <b class="tabular-nums">{eur(r.prestado)}</b></p>
                </div>
              );
            })}
          </div>
          {delMes.length ? (
            <ul class={lista}>
              {delMes.map((m, i) => (
                <li key={i}>
                  <button class={`${listaFila} w-full cursor-pointer text-left hover:bg-field`} onClick={() => onIr(m.d.lado, m.d.id)}>
                    <span class={`size-2.5 shrink-0 rounded-full ${COLOR[m.d.lado].bg}`} />
                    <div class="min-w-0 flex-1">
                      <p class="truncate font-semibold">{m.d.quien || t.deudas.sinNombre}{m.d.motivo && <span class="font-normal text-muted"> · {m.d.motivo}</span>}</p>
                      <p class="truncate text-xs text-muted">{[fecha(m.fecha), t.deudas[m.d.lado].tipo[m.tipo], m.concepto].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span class="font-semibold whitespace-nowrap tabular-nums">{m.tipo === 'pago' ? '−' : '+'}{eur(m.importe)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <p class={muted}>{t.filtros.sinMovs}</p>}
        </section>
      )}

      {deudas.length > 0 && (
        <section class={panel}>
          <h2 class={h2}>{t.estadisticas.progreso}</h2>
          <p class={`${muted} mb-4 text-[13px]`}>{t.estadisticas.progresoNota}</p>
          <ul class="flex flex-col gap-1">
            {deudas.map(({ d, c }) => {
              const parte = Math.min(1, c.pagado / c.prestado);
              return (
                <li key={d.id}>
                  <button class="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-field movil:grid-cols-1 movil:gap-y-1"
                    onClick={() => onIr(d.lado, d.id)}>
                    <span class="min-w-0 truncate"><b>{d.quien || t.deudas.sinNombre}</b><span class="text-muted"> · {t.resumen[d.lado]}{d.motivo && ` · ${d.motivo}`}</span></span>
                    <span class="text-right text-muted tabular-nums movil:text-left movil:text-xs">{t.estadisticas.pct(porcentaje(parte))}{c.pendiente > 0 && ` · ${t.estadisticas.queda(eur(c.pendiente))}`}</span>
                    {/* lo devuelto, un hueco de 2 px y lo que queda */}
                    <span class="col-span-2 flex h-2.5 gap-0.5 movil:col-span-1">
                      {parte > 0 && <span class={`h-full rounded-full ${COLOR[d.lado].bg}`} style={{ width: `${parte * 100}%` }} />}
                      {parte < 1 && <span class={`h-full flex-1 rounded-full ${COLOR[d.lado].suave}`} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <details class={`${panel} text-[13px]`}>
        <summary class="cursor-pointer font-semibold">{t.estadisticas.verTabla}</summary>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full border-collapse tabular-nums">
            <thead>
              <tr class="text-left text-[11px] tracking-[.08em] text-muted uppercase">
                {[t.estadisticas.mes, t.estadisticas.pague, t.estadisticas.meDevolvieron, t.resumen.debo, t.resumen.meDeben].map((h, i) => (
                  <th key={h} class={`border-b border-line px-2 py-2 ${i ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...ultimos24].reverse().map(m => (
                <tr key={m.mes}>
                  <td class="border-b border-line px-2 py-1.5 whitespace-nowrap">{mayuscula(mesAnio(m.mes))}</td>
                  {[m.debo.pagado, m.meDeben.pagado, m.pendiente.debo, m.pendiente.meDeben].map((v, i) => (
                    <td key={i} class="border-b border-line px-2 py-1.5 text-right whitespace-nowrap">{eur(v)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

// ------------------------------------------------------------ piezas

/** Lo devuelto de un lado, en un anillo con el porcentaje dentro. */
function Anillo({ parte, lado }: { parte: number; lado: Lado }) {
  const r = 30;
  const largo = 2 * Math.PI * r;
  return (
    <svg class="size-19 shrink-0" viewBox="0 0 76 76" role="img" aria-label={porcentaje(parte)}>
      <circle cx="38" cy="38" r={r} fill="none" class="stroke-field" stroke-width="9" />
      {parte > 0 && (
        <circle cx="38" cy="38" r={r} fill="none" class={COLOR[lado].stroke} stroke-width="9" stroke-linecap="round"
          stroke-dasharray={`${parte * largo} ${largo}`} transform="rotate(-90 38 38)" />
      )}
      <text x="38" y="38" text-anchor="middle" dominant-baseline="central" class="fill-ink text-[15px] font-bold tabular-nums">{porcentaje(parte)}</text>
    </svg>
  );
}

function Leyenda({ series }: { series: [Lado, string][] }) {
  return (
    <div class="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
      {series.map(([lado, texto]) => (
        <span key={lado} class="flex items-center gap-1.5"><span class={`size-2.5 rounded-xs ${COLOR[lado].bg}`} />{texto}</span>
      ))}
    </div>
  );
}

/** Una línea del recuadro que sale al pasar por un mes. */
function Fila({ lado, texto, valor }: { lado?: Lado; texto: string; valor: number }) {
  return (
    <p class={`flex items-center gap-2 ${lado ? '' : 'text-muted'}`}>
      <span class={`size-2 shrink-0 rounded-full ${lado ? COLOR[lado].bg : ''}`} />
      <span class="mr-auto">{texto}</span><b class="pl-3 tabular-nums">{eur(valor)}</b>
    </p>
  );
}

/** El ancho de un elemento, al día (los gráficos se dibujan a su tamaño real para que el texto no se deforme). */
function useAncho() {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setAncho(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho] as const;
}

/** El tope del eje: 1, 2, 2,5 o 5 por una potencia de 10, por encima del máximo. */
function tope(max: number): number {
  if (max <= 0) return 100;
  const p = 10 ** Math.floor(Math.log10(max));
  return [1, 2, 2.5, 5, 10].map(f => f * p).find(v => v >= max)!;
}

const ALTO = 210;
const M = { arriba: 10, abajo: 34, izq: 54, der: 8 };

interface Grafico {
  forma: 'barras' | 'lineas';
  meses: string[];
  series: { lado: Lado; valores: number[] }[];
  /** lo que sale en el recuadro al pasar por el mes i */
  detalle(i: number): ComponentChildren;
  elegido?: string;
  onElegir?(mes: string): void;
}

/** Barras agrupadas o líneas, con un mes por columna, rejilla suave y un recuadro al pasar por cada mes. */
function GraficoMeses({ forma, meses, series, detalle, elegido, onElegir }: Grafico) {
  const [ref, ancho] = useAncho();
  const [encima, setEncima] = useState<number | null>(null);
  const n = meses.length;
  const max = tope(Math.max(0, ...series.flatMap(s => s.valores)));
  const w = Math.max(0, ancho - M.izq - M.der);
  const h = ALTO - M.arriba - M.abajo;
  const banda = n ? w / n : 0;
  const x = (i: number) => M.izq + banda * (i + 0.5);
  const y = (v: number) => M.arriba + h - (Math.max(0, v) / max) * h;
  // con poco sitio, solo algunos meses llevan nombre
  const cada = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 38))));
  const barra = Math.max(3, Math.min(20, (banda - 8) / 2 - 1));

  return (
    <div ref={ref} class="relative" onMouseLeave={() => setEncima(null)}>
      {ancho > 0 && (
        <svg width={ancho} height={ALTO} class="block overflow-visible select-none" role="img" aria-label={meses.map(mesAnio).join(', ')}>
          {/* rejilla y eje */}
          {[0, 1, 2, 3, 4].map(k => {
            const v = (max / 4) * k;
            return (
              <g key={k}>
                <line x1={M.izq} x2={M.izq + w} y1={y(v)} y2={y(v)} class={k ? 'stroke-line' : 'stroke-line-2'} stroke-dasharray={k ? '3 4' : undefined} />
                <text x={M.izq - 8} y={y(v)} text-anchor="end" dominant-baseline="central" class="fill-muted text-[11px] tabular-nums">{eurCorto(v)}</text>
              </g>
            );
          })}
          {meses.map((m, i) => (
            <g key={m}>
              {(m === elegido || (i === encima && forma === 'barras')) && (
                <rect x={M.izq + banda * i + 1} y={M.arriba} width={Math.max(0, banda - 2)} height={h} rx="6"
                  class={m === elegido ? 'fill-primary/60' : 'fill-field'} />
              )}
              {(i % cada === 0 || m === elegido) && (
                <text x={x(i)} y={ALTO - M.abajo + 15} text-anchor="middle" class={`text-[11px] ${m === elegido ? 'fill-ink font-bold' : 'fill-muted'}`}>
                  {mesCorto(m)}
                  {(i === 0 || m.endsWith('-01')) && <tspan x={x(i)} dy="13" class="text-[10px]">{m.slice(0, 4)}</tspan>}
                </text>
              )}
            </g>
          ))}

          {forma === 'barras' && series.map((s, k) => s.valores.map((v, i) => {
            const alto = y(0) - y(v);
            if (alto <= 0) return null;
            // las dos barras del mes, juntas y con 2 px entre ellas
            const bx = x(i) - barra - 1 + k * (barra + 2);
            const r = Math.min(4, barra / 2, alto);
            const by = y(v);
            return <path key={`${k}-${i}`} class={COLOR[s.lado].fill}
              d={`M${bx} ${by + alto}V${by + r}Q${bx} ${by} ${bx + r} ${by}H${bx + barra - r}Q${bx + barra} ${by} ${bx + barra} ${by + r}V${by + alto}Z`} />;
          }))}

          {forma === 'lineas' && series.map(s => {
            const puntos = s.valores.map((v, i) => `${x(i)},${y(v)}`);
            return (
              <g key={s.lado}>
                <path d={`M${x(0)},${y(0)}L${puntos.join('L')}L${x(n - 1)},${y(0)}Z`} class={COLOR[s.lado].fill} fill-opacity="0.08" />
                <path d={`M${puntos.join('L')}`} fill="none" class={COLOR[s.lado].stroke} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
              </g>
            );
          })}
          {forma === 'lineas' && encima !== null && (
            <g>
              <line x1={x(encima)} x2={x(encima)} y1={M.arriba} y2={M.arriba + h} class="stroke-muted" stroke-dasharray="3 3" />
              {series.map(s => <circle key={s.lado} cx={x(encima)} cy={y(s.valores[encima])} r="4.5" class={`${COLOR[s.lado].fill} stroke-paper`} stroke-width="2" />)}
            </g>
          )}
          {/* lo último de cada línea, escrito al final (si coinciden, uno un poco más abajo) */}
          {forma === 'lineas' && encima === null && n > 0 && (() => {
            const fin = series.map(s => ({ s, py: y(s.valores[n - 1]) }));
            if (fin.length === 2 && Math.abs(fin[0].py - fin[1].py) < 16) fin[fin[0].py <= fin[1].py ? 1 : 0].py += 16;
            return fin.map(({ s, py }) => (
              <g key={s.lado}>
                <circle cx={x(n - 1)} cy={y(s.valores[n - 1])} r="4" class={`${COLOR[s.lado].fill} stroke-paper`} stroke-width="2" />
                <text x={x(n - 1) - 8} y={py - 9} text-anchor="end" class="fill-ink text-[11.5px] font-semibold tabular-nums">{eurCorto(s.valores[n - 1])}</text>
              </g>
            ));
          })()}

          {/* zonas para pasar el ratón o tocar: la columna entera de cada mes */}
          {meses.map((m, i) => (
            <rect key={m} x={M.izq + banda * i} y={M.arriba} width={banda} height={h + M.abajo} fill="transparent"
              class={onElegir ? 'cursor-pointer' : ''} onMouseEnter={() => setEncima(i)}
              onClick={() => { setEncima(i); onElegir?.(m); }} />
          ))}
        </svg>
      )}
      {encima !== null && (
        <div class="pointer-events-none absolute top-0 z-10 w-max min-w-44 rounded-lg bg-paper px-3 py-2 text-xs shadow-[0_6px_24px_-6px_rgba(0,0,0,.35)]"
          style={{ left: `${x(encima)}px`, transform: x(encima) > ancho / 2 ? 'translateX(calc(-100% - 14px))' : 'translateX(14px)' }}>
          <p class="mb-1 font-bold">{mayuscula(mesAnio(meses[encima]))}</p>
          {detalle(encima)}
        </div>
      )}
    </div>
  );
}
