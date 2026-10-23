// src/components/Deudas.tsx
// Un lado de las cuentas (lo que debo, o lo que me deben): la lista de deudas (el banco por la casa, mi prima por
// las vacaciones…) con lo que queda de cada una y, al abrir una, sus préstamos y pagos con lo que quedaba después
// de cada uno. Todo se edita en modales. Cada deuda es una hoja del archivo (ver src/lib/registro.ts).
import { useState } from 'preact/hooks';
import { cifras, claveDeuda, hoy, nuevoId, porFecha, round2, type Deuda, type Lado, type Movimiento, type Tipo } from '../lib/registro.ts';
import { eur, fecha, mesAnio, numeroEditable, parseNum } from '../lib/format.ts';
import { estimar } from '../lib/estimacion.ts';
import { detalleEstimacion, fraseEstimacion, textoDeuda } from '../lib/contexto.ts';
import { preguntarUnaVez } from '../lib/ia.ts';
import { idioma, t } from '../lib/i18n.ts';
import { TextoIA } from './Chat.tsx';
import { activarIA, usarIA } from './usarIA.ts';
import { ModalFormulario } from './ModalFormulario.tsx';
import { Selector } from './Selector.tsx';
import { btn, campo, empty, error as errorCls, etiqueta, h2, icon, input, lista, listaFila, muted, panel, panelHead, span2 } from './ui.ts';

interface Props {
  lado: Lado;
  /** todas las deudas, de los dos lados: este componente solo enseña y cambia las de `lado` */
  deudas: Deuda[];
  onChange(deudas: Deuda[]): void;
  /** la deuda abierta (su id) o null para ver la lista; lo lleva App para que el resumen pueda abrir una */
  abierta: string | null;
  onAbrir(id: string | null): void;
}

/** Deuda nueva o editada: `id` es el de la que se edita (null si es nueva). */
interface EdicionDeuda {
  id: string | null;
  quien: string;
  motivo: string;
  importe: string;
  fecha: string;
  notas: string;
}

/** Movimiento abierto en el modal: `i` es su posición en la deuda abierta, o -1 si es nuevo. */
interface EdicionMov {
  i: number;
  m: Movimiento;
  importe: string;
}

const pastilla = 'rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';
const tarjeta = 'flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-paper p-4.5 text-left transition hover:border-ink';

/** Explicación de la IA de una estimación; `datos` es el texto que se le dio, para no enseñarla si la deuda cambió. */
interface Explicacion {
  id: string;
  datos: string;
  texto: string;
  escribiendo: boolean;
  fallo: string;
}

/** Barra de lo devuelto sobre lo prestado. */
function Progreso({ prestado, pagado }: { prestado: number; pagado: number }) {
  const pct = prestado > 0 ? Math.min(100, (pagado / prestado) * 100) : 0;
  return (
    <span class="mt-1.5 block h-2 rounded-full bg-field" title={t.deudas.pctDevuelto(Math.round(pct))}>
      {pct > 0 && <span class="block h-2 rounded-full bg-primary-dark" style={{ width: `${pct}%` }} />}
    </span>
  );
}

export function Deudas({ lado, deudas, onChange, abierta, onAbrir }: Props) {
  const [deuda, setDeuda] = useState<EdicionDeuda | null>(null);
  const [mov, setMov] = useState<EdicionMov | null>(null);
  const [explicacion, setExplicacion] = useState<Explicacion | null>(null);
  const ia = usarIA();
  // textos de este lado
  const l = t.deudas[lado];
  const color = lado === 'debo' ? 'text-danger' : 'text-ok';
  const delLado = deudas.filter(x => x.lado === lado).map(x => ({ x, c: cifras(x) }));
  const activas = delLado.filter(({ c }) => c.pendiente !== 0);
  const saldadas = delLado.filter(({ c }) => c.pendiente === 0);
  const actual = delLado.find(({ x }) => x.id === abierta) ?? null;
  const nombres = [...new Set(delLado.map(({ x }) => x.quien).filter(Boolean))];

  /** Cambia una deuda (por su id) y deja las demás como están. */
  const cambiarDeuda = (id: string, fn: (x: Deuda) => Deuda) => onChange(deudas.map(x => (x.id === id ? fn(x) : x)));

  // ------------------------------------------------------------ deuda nueva o editada
  const importeDeuda = deuda ? parseNum(deuda.importe) : null;
  // dos deudas del mismo lado no pueden llamarse igual: no se sabría cuál es cuál
  const repetida = !!deuda && delLado.some(({ x }) => x.id !== deuda.id && claveDeuda(x.quien, x.motivo) === claveDeuda(deuda.quien.trim(), deuda.motivo.trim()));
  const deudaValida = !!deuda && !!deuda.quien.trim() && !repetida && (deuda.id !== null || (importeDeuda !== null && importeDeuda !== 0));

  function aceptarDeuda() {
    if (!deuda || !deudaValida) return;
    const quien = deuda.quien.trim();
    const motivo = deuda.motivo.trim();
    if (deuda.id === null) {
      const m: Movimiento = { fecha: deuda.fecha, concepto: '', tipo: 'prestamo', importe: Math.abs(importeDeuda!), notas: deuda.notas.trim() };
      const nueva: Deuda = { id: nuevoId(), lado, quien, motivo, movimientos: [m] };
      onChange([...deudas, nueva]);
      onAbrir(nueva.id);
    } else {
      cambiarDeuda(deuda.id, x => ({ ...x, quien, motivo }));
    }
    setDeuda(null);
  }

  function eliminarDeuda(x: Deuda) {
    if (!confirm(t.deudas.confirmarEliminarDeuda(`${x.quien}${x.motivo ? ` · ${x.motivo}` : ''}`, x.movimientos.length))) return;
    onChange(deudas.filter(y => y.id !== x.id));
    onAbrir(null);
  }

  // ------------------------------------------------------------ movimientos de la deuda abierta
  function abrirMov(i: number, tipo: Tipo = 'pago') {
    if (!actual) return;
    const m = i < 0 ? { fecha: hoy(), concepto: '', tipo, importe: 0, notas: '' } : actual.x.movimientos[i];
    setMov({ i, m, importe: i < 0 ? '' : numeroEditable(m.importe) });
  }
  const importeMov = mov ? parseNum(mov.importe) : null;
  function aceptarMov() {
    if (!mov || !actual || importeMov === null) return;
    const m = { ...mov.m, concepto: mov.m.concepto.trim(), notas: mov.m.notas.trim(), importe: Math.abs(importeMov) };
    cambiarDeuda(actual.x.id, x => ({
      ...x, movimientos: porFecha(mov.i < 0 ? [...x.movimientos, m] : x.movimientos.map((y, j) => (j === mov.i ? m : y))),
    }));
    setMov(null);
  }
  const editarMov = (cambio: Partial<Movimiento>) => mov && setMov({ ...mov, m: { ...mov.m, ...cambio } });

  /** Pide a la IA que explique la estimación de la deuda abierta (las cifras ya van calculadas en el texto). */
  async function explicar(x: Deuda) {
    const datos = textoDeuda(x, hoy(), 10);
    const base = { id: x.id, datos, texto: '', escribiendo: true, fallo: '' };
    setExplicacion(base);
    try {
      const texto = await preguntarUnaVez({
        sistema: t.ia.sistemaEstimacion, pregunta: t.ia.pedirEstimacion(datos), idioma,
        onTrozo: a => setExplicacion(e => (e?.id === x.id ? { ...e, texto: a } : e)),
      });
      setExplicacion(e => (e?.id === x.id ? { ...e, texto, escribiendo: false } : e));
    } catch (e) {
      setExplicacion(ex => (ex?.id === x.id ? { ...ex, escribiendo: false, fallo: t.ia.fallo((e as Error).message) } : ex));
    }
  }

  // ------------------------------------------------------------ modales
  const modales = (
    <>
      {deuda && (
        <ModalFormulario titulo={deuda.id === null ? l.nueva : t.deudas.editarDeuda} valido={deudaValida}
          onAceptar={aceptarDeuda} onCancelar={() => setDeuda(null)}>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3.5 movil:grid-cols-1">
            <label class={campo}>
              <span class={etiqueta}>{l.quien}</span>
              <input class={input} list={`nombres-${lado}`} value={deuda.quien} placeholder={l.quienEj}
                onInput={e => setDeuda({ ...deuda, quien: e.currentTarget.value })} />
              <datalist id={`nombres-${lado}`}>{nombres.map(n => <option key={n} value={n} />)}</datalist>
            </label>
            <label class={campo}>
              <span class={etiqueta}>{t.deudas.porQue}</span>
              <input class={input} value={deuda.motivo} placeholder={l.motivoEj} onInput={e => setDeuda({ ...deuda, motivo: e.currentTarget.value })} />
            </label>
            {deuda.id === null && (
              <>
                <label class={campo}>
                  <span class={etiqueta}>{l.inicial} (€)</span>
                  <input class={`${input} text-right tabular-nums`} inputMode="decimal" value={deuda.importe} placeholder={numeroEditable(0, true)}
                    onInput={e => setDeuda({ ...deuda, importe: e.currentTarget.value })} />
                </label>
                <label class={campo}>
                  <span class={etiqueta}>{t.deudas.fecha}</span>
                  <input class={input} type="date" value={deuda.fecha} onInput={e => setDeuda({ ...deuda, fecha: e.currentTarget.value })} />
                </label>
                <label class={`${campo} ${span2}`}>
                  <span class={etiqueta}>{t.deudas.notas}</span>
                  <input class={input} value={deuda.notas} onInput={e => setDeuda({ ...deuda, notas: e.currentTarget.value })} />
                </label>
              </>
            )}
            {repetida && <p class={`${errorCls} ${span2}`}>{t.deudas.repetida}</p>}
            {deuda.id !== null && <p class={`${muted} ${span2} text-xs`}>{t.deudas.renombrarNota}</p>}
          </div>
        </ModalFormulario>
      )}

      {mov && (
        <ModalFormulario titulo={mov.i < 0 ? l.tipo[mov.m.tipo] : t.deudas.editarMov} valido={importeMov !== null && importeMov !== 0}
          onAceptar={aceptarMov} onCancelar={() => setMov(null)}>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3.5 movil:grid-cols-1">
            <label class={campo}>
              <span class={etiqueta}>{t.deudas.tipo}</span>
              <Selector valor={mov.m.tipo} onChange={tipo => editarMov({ tipo: tipo as Tipo })}
                opciones={(['pago', 'prestamo'] as const).map(x => ({ valor: x, texto: l.tipo[x] }))} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>{t.deudas.importe}</span>
              <input class={`${input} text-right tabular-nums`} inputMode="decimal" value={mov.importe} placeholder={numeroEditable(0, true)}
                onInput={e => setMov({ ...mov, importe: e.currentTarget.value })} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>{t.deudas.fecha}</span>
              <input class={input} type="date" value={mov.m.fecha} onInput={e => editarMov({ fecha: e.currentTarget.value })} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>{t.deudas.concepto}</span>
              <input class={input} value={mov.m.concepto} placeholder={mov.m.tipo === 'pago' ? t.deudas.conceptoPago : t.deudas.conceptoPrestamo}
                onInput={e => editarMov({ concepto: e.currentTarget.value })} />
            </label>
            <label class={`${campo} ${span2}`}>
              <span class={etiqueta}>{t.deudas.notas}</span>
              <input class={input} value={mov.m.notas} onInput={e => editarMov({ notas: e.currentTarget.value })} />
            </label>
          </div>
        </ModalFormulario>
      )}
    </>
  );

  // ------------------------------------------------------------ una deuda
  if (actual) {
    const { x, c } = actual;
    // lo que quedaba tras cada movimiento, en orden de fecha; se enseña lo más reciente arriba
    let acumulado = 0;
    const filas = porFecha(x.movimientos.map((m, i) => ({ m, i, fecha: m.fecha }))).map(({ m, i }) => {
      acumulado = round2(acumulado + (m.tipo === 'pago' ? -m.importe : m.importe));
      return { m, i, queda: acumulado };
    }).reverse();
    const p = c.pendiente;

    return (
      <section class={panel}>
        <button class="mb-3 cursor-pointer text-[13px] font-semibold text-muted hover:text-ink" onClick={() => onAbrir(null)}>← {l.titulo}</button>
        <div class={panelHead}>
          <div class="min-w-0">
            <h2 class={`${h2} truncate`}>{x.quien || t.deudas.sinNombre}</h2>
            {x.motivo && <p class={muted}>{x.motivo}</p>}
          </div>
          <div class="flex flex-wrap gap-2">
            <button class={btn()} onClick={() => abrirMov(-1, 'pago')}>{l.pagar}</button>
            <button class={btn('ghost')} onClick={() => abrirMov(-1, 'prestamo')}>{l.sumar}</button>
          </div>
        </div>

        <div class={`mb-6 rounded-xl px-5 py-4 ${p > 0 ? (lado === 'debo' ? 'bg-danger-soft' : 'bg-ok-soft') : 'bg-field'}`}>
          <p class="text-[13px] font-medium text-ink-2">{p > 0 ? t.deudas.quedaPorDevolver : p === 0 ? t.deudas.saldada : t.deudas.deMas(eur(-p))}</p>
          {p > 0 && <p class={`text-[34px] leading-tight font-bold tracking-[-.02em] tabular-nums ${color}`}>{eur(p)}</p>}
          <p class={`${muted} text-xs`}>{l.tipo.prestamo}: {eur(c.prestado)} · {l.tipo.pago}: {eur(c.pagado)}</p>
          <Progreso prestado={c.prestado} pagado={c.pagado} />
        </div>

        {(() => {
          const e = estimar(x, hoy());
          if (e.tipo === 'saldada') return null;
          const vigente = explicacion?.id === x.id && explicacion.datos === textoDeuda(x, hoy(), 10) ? explicacion : null;
          return (
            <div class="mb-6 rounded-xl border border-line px-5 py-4">
              <p class={`${etiqueta} mb-1`}>{t.estimacion.titulo}</p>
              <p class="font-medium">{fraseEstimacion(e)}</p>
              {detalleEstimacion(e).map(d => <p key={d} class={`${muted} text-xs`}>{d}</p>)}
              {ia.estado === 'lista' && e.tipo !== 'de-mas' && !vigente?.escribiendo && (
                <button class={`${btn('ghost', 'small')} mt-3`} onClick={() => explicar(x)}>✦ {t.estimacion.explicar}</button>
              )}
              {ia.estado === 'descargable' && (
                <button class={`${btn('ghost', 'small')} mt-3`} onClick={activarIA}>✦ {t.ia.descargar}</button>
              )}
              {vigente && (
                <div class="mt-3 rounded-lg bg-field px-3.5 py-3 text-[13.5px]">
                  {vigente.texto ? <TextoIA texto={vigente.texto} /> : <p class={muted}>{t.estimacion.explicando}</p>}
                  {vigente.fallo && <p class={`${errorCls} mt-1`}>{vigente.fallo}</p>}
                  {!vigente.escribiendo && vigente.texto && <p class={`${muted} mt-1.5 text-[11px]`}>{t.estimacion.deIA}</p>}
                </div>
              )}
            </div>
          );
        })()}

        <ul class={lista}>
          {filas.map(({ m, i, queda }) => (
            <li key={i} class={listaFila}>
              <div class="min-w-0 flex-1">
                <p class="flex min-w-0 items-center gap-2">
                  <span class="truncate font-semibold">{m.concepto || l.tipo[m.tipo]}</span>
                  {m.concepto && <span class={`${pastilla} ${m.tipo === 'pago' ? 'bg-field text-ink-2' : 'bg-primary text-ink'}`}>{l.tipo[m.tipo]}</span>}
                </p>
                <p class="truncate text-xs text-muted">{[fecha(m.fecha), t.deudas.quedaba(eur(queda)), m.notas].filter(Boolean).join(' · ')}</p>
              </div>
              <span class="font-semibold whitespace-nowrap tabular-nums">{m.tipo === 'pago' ? '−' : '+'}{eur(m.importe)}</span>
              <button class={btn('ghost', 'small')} onClick={() => abrirMov(i)}>{t.comun.editar}</button>
              <button class={icon} title={t.comun.eliminar} onClick={() => {
                if (x.movimientos.length === 1) return eliminarDeuda(x);
                if (confirm(t.deudas.confirmarEliminarMov(m.concepto || l.tipo[m.tipo], eur(m.importe)))) {
                  cambiarDeuda(x.id, y => ({ ...y, movimientos: y.movimientos.filter((_, j) => j !== i) }));
                }
              }}>×</button>
            </li>
          ))}
        </ul>

        <div class="mt-5 flex flex-wrap gap-2">
          <button class={btn('ghost', 'small')} onClick={() => setDeuda({ id: x.id, quien: x.quien, motivo: x.motivo, importe: '', fecha: '', notas: '' })}>
            {t.deudas.cambiarNombre}
          </button>
          <button class={btn('ghost', 'small')} onClick={() => eliminarDeuda(x)}>{t.deudas.eliminarDeuda}</button>
        </div>
        {modales}
      </section>
    );
  }

  // ------------------------------------------------------------ todas
  const total = round2(activas.reduce((s, { c }) => s + c.pendiente, 0));

  return (
    <section class={panel}>
      <div class={panelHead}>
        <div>
          <h2 class={h2}>{l.titulo}</h2>
          <p class={muted}>
            {activas.length ? <>{t.deudas.pendiente} <b class={`tabular-nums ${color}`}>{eur(total)}</b> {t.deudas.enDeudas(activas.length)}</> : t.deudas.nadaPendiente}
          </p>
        </div>
        <button class={btn()} onClick={() => setDeuda({ id: null, quien: '', motivo: '', importe: '', fecha: hoy(), notas: '' })}>{l.nueva}</button>
      </div>

      {activas.length > 0 && (
        <div class="grid grid-cols-3 gap-3 tablet:grid-cols-2 movil:grid-cols-1">
          {activas.map(({ x, c }) => (
            <button key={x.id} class={tarjeta} onClick={() => onAbrir(x.id)}>
              <span class="truncate font-semibold">{x.quien || t.deudas.sinNombre}</span>
              <span class="truncate text-xs text-muted">{x.motivo || t.deudas.sinMotivo}</span>
              <span class={`mt-1 text-[24px] leading-tight font-bold tracking-[-.02em] tabular-nums ${c.pendiente > 0 ? color : ''}`}>{eur(c.pendiente)}</span>
              <span class="text-xs text-muted">{t.deudas.devuelto(eur(c.pagado), eur(c.prestado))}</span>
              <Progreso prestado={c.prestado} pagado={c.pagado} />
              {(() => {
                const e = estimar(x, hoy());
                return e.tipo === 'estimada' && e.meses < 1200 && <span class="mt-1 text-xs text-ink-2">{t.estimacion.corta(mesAnio(e.mes))}</span>;
              })()}
            </button>
          ))}
        </div>
      )}
      {delLado.length === 0 && <p class={empty}>{l.vacio}</p>}
      {delLado.length > 0 && activas.length === 0 && <p class={empty}>{t.deudas.todoSaldado}</p>}

      {saldadas.length > 0 && (
        <div class="mt-7">
          <h3 class={`${etiqueta} mb-1.5`}>{t.deudas.saldadas}</h3>
          <ul class={lista}>
            {saldadas.map(({ x, c }) => (
              <li key={x.id} class={listaFila}>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold">{x.quien || t.deudas.sinNombre}{x.motivo && <span class="font-normal text-muted"> · {x.motivo}</span>}</p>
                  <p class="truncate text-xs text-muted">{eur(c.prestado)}{c.ultimo ? ` · ${t.deudas.ultimaVez(fecha(c.ultimo))}` : ''}</p>
                </div>
                <button class={btn('ghost', 'small')} onClick={() => onAbrir(x.id)}>{t.deudas.ver}</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {modales}
    </section>
  );
}
