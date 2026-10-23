// src/components/Deudas.tsx
// Un lado de las cuentas (lo que debo, o lo que me deben): la lista de deudas (el banco por la casa, mi prima por
// las vacaciones…) con lo que queda de cada una y, al abrir una, sus préstamos y pagos con lo que quedaba después
// de cada uno. Todo se edita en modales.
import { useState } from 'preact/hooks';
import { claveDeuda, deudas, esDe, hoy, ordenar, porFecha, round2, type Deuda, type Lado, type Movimiento, type Tipo } from '../lib/registro.ts';
import { eur, fecha, parseNum } from '../lib/format.ts';
import { ModalFormulario } from './ModalFormulario.tsx';
import { Selector } from './Selector.tsx';
import { btn, campo, empty, error as errorCls, etiqueta, h2, icon, input, lista, listaFila, muted, panel, panelHead, span2 } from './ui.ts';

interface Props {
  lado: Lado;
  movimientos: Movimiento[];
  onChange(movimientos: Movimiento[]): void;
  /** la deuda abierta (su clave) o null para ver la lista; lo lleva App para que el resumen pueda abrir una */
  abierta: string | null;
  onAbrir(clave: string | null): void;
}

/** Textos de cada lado. */
const TEXTOS = {
  debo: {
    titulo: 'Lo que debo', nueva: 'Nueva deuda', tipo: { prestamo: 'Me prestaron', pago: 'Pagué' },
    quien: 'El banco', motivo: 'Hipoteca de la casa', inicial: 'Cuánto me prestaron',
    vacio: 'No tienes ninguna deuda apuntada. Pulsa «Nueva deuda» para la primera: a quién le debes, por qué y cuánto.',
    pagar: 'Apuntar un pago', sumar: 'Me prestó más',
  },
  meDeben: {
    titulo: 'Lo que me deben', nueva: 'Nuevo préstamo', tipo: { prestamo: 'Le presté', pago: 'Me devolvió' },
    quien: 'Mi prima', motivo: 'Vacaciones en Lisboa', inicial: 'Cuánto le presté',
    vacio: 'Nadie te debe nada apuntado. Pulsa «Nuevo préstamo» para el primero: quién te debe, por qué y cuánto.',
    pagar: 'Apuntar lo que me devolvió', sumar: 'Le presté más',
  },
} as const;

/** Deuda nueva o editada: `original` es la clave de la que se edita (null si es nueva). */
interface EdicionDeuda {
  original: string | null;
  quien: string;
  motivo: string;
  importe: string;
  fecha: string;
  notas: string;
}

/** Movimiento abierto en el modal: `i` es su posición en `movimientos`, o -1 si es nuevo. */
interface EdicionMov {
  i: number;
  m: Movimiento;
  importe: string;
}

const pastilla = 'rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';
const tarjeta = 'flex cursor-pointer flex-col gap-1 rounded-xl border border-line bg-paper p-4.5 text-left transition hover:border-ink';

/** Barra de lo devuelto sobre lo prestado. */
function Progreso({ d }: { d: Deuda }) {
  const pct = d.prestado > 0 ? Math.min(100, (d.pagado / d.prestado) * 100) : 0;
  return (
    <span class="mt-1.5 block h-2 rounded-full bg-field" title={`${Math.round(pct)} % devuelto`}>
      {pct > 0 && <span class="block h-2 rounded-full bg-primary-dark" style={{ width: `${pct}%` }} />}
    </span>
  );
}

export function Deudas({ lado, movimientos, onChange, abierta, onAbrir }: Props) {
  const [deuda, setDeuda] = useState<EdicionDeuda | null>(null);
  const [mov, setMov] = useState<EdicionMov | null>(null);
  const t = TEXTOS[lado];
  const color = lado === 'debo' ? 'text-danger' : 'text-ok';
  const todas = deudas(movimientos);
  const activas = todas.filter(d => d.pendiente !== 0);
  const saldadas = todas.filter(d => d.pendiente === 0);
  const actual = abierta ? todas.find(d => d.clave === abierta) ?? null : null;
  const nombres = [...new Set(todas.map(d => d.quien).filter(Boolean))];

  // ------------------------------------------------------------ deuda nueva o editada
  const importeDeuda = deuda ? parseNum(deuda.importe) : null;
  const claveNueva = deuda ? claveDeuda(deuda.quien.trim(), deuda.motivo.trim()) : '';
  // dos deudas no pueden llamarse igual: sus filas se mezclarían
  const repetida = !!deuda && claveNueva !== deuda.original && todas.some(d => d.clave === claveNueva);
  const deudaValida = !!deuda && !!deuda.quien.trim() && !repetida && (deuda.original !== null || (importeDeuda !== null && importeDeuda !== 0));

  function aceptarDeuda() {
    if (!deuda || !deudaValida) return;
    const quien = deuda.quien.trim();
    const motivo = deuda.motivo.trim();
    if (deuda.original === null) {
      const m: Movimiento = { quien, motivo, fecha: deuda.fecha, concepto: '', tipo: 'prestamo', importe: Math.abs(importeDeuda!), notas: deuda.notas.trim() };
      onChange(ordenar([...movimientos, m]));
    } else {
      // se renombra en todas sus filas
      onChange(movimientos.map(m => (esDe(m, deuda.original!) ? { ...m, quien, motivo } : m)));
    }
    onAbrir(claveDeuda(quien, motivo));
    setDeuda(null);
  }

  function eliminarDeuda(d: Deuda) {
    if (!confirm(`¿Eliminar «${d.quien}${d.motivo ? ` · ${d.motivo}` : ''}» con sus ${d.movimientos.length} movimientos?`)) return;
    onChange(movimientos.filter(m => !esDe(m, d.clave)));
    onAbrir(null);
  }

  // ------------------------------------------------------------ movimientos de la deuda abierta
  function abrirMov(i: number, tipo: Tipo = 'pago') {
    if (!actual) return;
    const m = i < 0 ? { quien: actual.quien, motivo: actual.motivo, fecha: hoy(), concepto: '', tipo, importe: 0, notas: '' } : movimientos[i];
    setMov({ i, m, importe: i < 0 ? '' : String(m.importe).replace('.', ',') });
  }
  const importeMov = mov ? parseNum(mov.importe) : null;
  function aceptarMov() {
    if (!mov || importeMov === null) return;
    const m = { ...mov.m, concepto: mov.m.concepto.trim(), notas: mov.m.notas.trim(), importe: Math.abs(importeMov) };
    onChange(ordenar(mov.i < 0 ? [...movimientos, m] : movimientos.map((x, j) => (j === mov.i ? m : x))));
    setMov(null);
  }
  const editarMov = (cambio: Partial<Movimiento>) => mov && setMov({ ...mov, m: { ...mov.m, ...cambio } });

  // ------------------------------------------------------------ modales
  const modales = (
    <>
      {deuda && (
        <ModalFormulario titulo={deuda.original === null ? t.nueva : 'Editar deuda'} valido={deudaValida}
          onAceptar={aceptarDeuda} onCancelar={() => setDeuda(null)}>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3.5 movil:grid-cols-1">
            <label class={campo}>
              <span class={etiqueta}>{lado === 'debo' ? 'A quién' : 'Quién'}</span>
              <input class={input} list={`nombres-${lado}`} value={deuda.quien} placeholder={t.quien}
                onInput={e => setDeuda({ ...deuda, quien: e.currentTarget.value })} />
              <datalist id={`nombres-${lado}`}>{nombres.map(n => <option key={n} value={n} />)}</datalist>
            </label>
            <label class={campo}>
              <span class={etiqueta}>Por qué</span>
              <input class={input} value={deuda.motivo} placeholder={t.motivo} onInput={e => setDeuda({ ...deuda, motivo: e.currentTarget.value })} />
            </label>
            {deuda.original === null && (
              <>
                <label class={campo}>
                  <span class={etiqueta}>{t.inicial} (€)</span>
                  <input class={`${input} text-right tabular-nums`} inputMode="decimal" value={deuda.importe} placeholder="0,00"
                    onInput={e => setDeuda({ ...deuda, importe: e.currentTarget.value })} />
                </label>
                <label class={campo}>
                  <span class={etiqueta}>Fecha</span>
                  <input class={input} type="date" value={deuda.fecha} onInput={e => setDeuda({ ...deuda, fecha: e.currentTarget.value })} />
                </label>
                <label class={`${campo} ${span2}`}>
                  <span class={etiqueta}>Notas</span>
                  <input class={input} value={deuda.notas} onInput={e => setDeuda({ ...deuda, notas: e.currentTarget.value })} />
                </label>
              </>
            )}
            {repetida && <p class={`${errorCls} ${span2}`}>Ya tienes una deuda con ese nombre y motivo: ábrela para apuntar en ella, o cambia el motivo.</p>}
            {deuda.original !== null && <p class={`${muted} ${span2} text-xs`}>El cambio se aplica a todos sus movimientos.</p>}
          </div>
        </ModalFormulario>
      )}

      {mov && (
        <ModalFormulario titulo={mov.i < 0 ? t.tipo[mov.m.tipo] : 'Editar movimiento'} valido={importeMov !== null && importeMov !== 0}
          onAceptar={aceptarMov} onCancelar={() => setMov(null)}>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3.5 movil:grid-cols-1">
            <label class={campo}>
              <span class={etiqueta}>Tipo</span>
              <Selector valor={mov.m.tipo} onChange={tipo => editarMov({ tipo: tipo as Tipo })}
                opciones={(['pago', 'prestamo'] as const).map(x => ({ valor: x, texto: t.tipo[x] }))} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>Importe (€)</span>
              <input class={`${input} text-right tabular-nums`} inputMode="decimal" value={mov.importe} placeholder="0,00"
                onInput={e => setMov({ ...mov, importe: e.currentTarget.value })} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>Fecha</span>
              <input class={input} type="date" value={mov.m.fecha} onInput={e => editarMov({ fecha: e.currentTarget.value })} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>Concepto</span>
              <input class={input} value={mov.m.concepto} placeholder={mov.m.tipo === 'pago' ? 'Cuota de octubre' : 'Para el coche'}
                onInput={e => editarMov({ concepto: e.currentTarget.value })} />
            </label>
            <label class={`${campo} ${span2}`}>
              <span class={etiqueta}>Notas</span>
              <input class={input} value={mov.m.notas} onInput={e => editarMov({ notas: e.currentTarget.value })} />
            </label>
          </div>
        </ModalFormulario>
      )}
    </>
  );

  // ------------------------------------------------------------ una deuda
  if (actual) {
    // lo que quedaba tras cada movimiento, en orden de fecha; se enseña lo más reciente arriba
    let acumulado = 0;
    const filas = porFecha(movimientos.map((m, i) => ({ m, i, fecha: m.fecha })).filter(({ m }) => esDe(m, actual.clave))).map(({ m, i }) => {
      acumulado = round2(acumulado + (m.tipo === 'pago' ? -m.importe : m.importe));
      return { m, i, queda: acumulado };
    }).reverse();
    const p = actual.pendiente;

    return (
      <section class={panel}>
        <button class="mb-3 cursor-pointer text-[13px] font-semibold text-muted hover:text-ink" onClick={() => onAbrir(null)}>← {t.titulo}</button>
        <div class={panelHead}>
          <div class="min-w-0">
            <h2 class={`${h2} truncate`}>{actual.quien || 'Sin nombre'}</h2>
            {actual.motivo && <p class={muted}>{actual.motivo}</p>}
          </div>
          <div class="flex flex-wrap gap-2">
            <button class={btn()} onClick={() => abrirMov(-1, 'pago')}>{t.pagar}</button>
            <button class={btn('ghost')} onClick={() => abrirMov(-1, 'prestamo')}>{t.sumar}</button>
          </div>
        </div>

        <div class={`mb-6 rounded-xl px-5 py-4 ${p > 0 ? (lado === 'debo' ? 'bg-danger-soft' : 'bg-ok-soft') : 'bg-field'}`}>
          <p class="text-[13px] font-medium text-ink-2">
            {p > 0 ? 'Queda por devolver' : p === 0 ? 'Saldada: no queda nada pendiente.' : `Se ha devuelto ${eur(-p)} de más.`}
          </p>
          {p > 0 && <p class={`text-[34px] leading-tight font-bold tracking-[-.02em] tabular-nums ${color}`}>{eur(p)}</p>}
          <p class={`${muted} text-xs`}>{t.tipo.prestamo}: {eur(actual.prestado)} · {t.tipo.pago}: {eur(actual.pagado)}</p>
          <Progreso d={actual} />
        </div>

        <ul class={lista}>
          {filas.map(({ m, i, queda }) => (
            <li key={i} class={listaFila}>
              <div class="min-w-0 flex-1">
                <p class="flex min-w-0 items-center gap-2">
                  <span class="truncate font-semibold">{m.concepto || t.tipo[m.tipo]}</span>
                  {m.concepto && <span class={`${pastilla} ${m.tipo === 'pago' ? 'bg-field text-ink-2' : 'bg-primary text-ink'}`}>{t.tipo[m.tipo]}</span>}
                </p>
                <p class="truncate text-xs text-muted">{[fecha(m.fecha), `quedaba ${eur(queda)}`, m.notas].filter(Boolean).join(' · ')}</p>
              </div>
              <span class="font-semibold whitespace-nowrap tabular-nums">{m.tipo === 'pago' ? '−' : '+'}{eur(m.importe)}</span>
              <button class={btn('ghost', 'small')} onClick={() => abrirMov(i)}>Editar</button>
              <button class={icon} title="Eliminar" onClick={() => {
                if (actual.movimientos.length === 1) return eliminarDeuda(actual);
                if (confirm(`¿Eliminar «${m.concepto || t.tipo[m.tipo]}» (${eur(m.importe)})?`)) onChange(movimientos.filter((_, j) => j !== i));
              }}>×</button>
            </li>
          ))}
        </ul>

        <div class="mt-5 flex flex-wrap gap-2">
          <button class={btn('ghost', 'small')} onClick={() => setDeuda({ original: actual.clave, quien: actual.quien, motivo: actual.motivo, importe: '', fecha: '', notas: '' })}>
            Cambiar nombre o motivo
          </button>
          <button class={btn('ghost', 'small')} onClick={() => eliminarDeuda(actual)}>Eliminar la deuda</button>
        </div>
        {modales}
      </section>
    );
  }

  // ------------------------------------------------------------ todas
  const tarjetaDe = (d: Deuda) => (
    <button key={d.clave} class={tarjeta} onClick={() => onAbrir(d.clave)}>
      <span class="truncate font-semibold">{d.quien || 'Sin nombre'}</span>
      <span class="truncate text-xs text-muted">{d.motivo || 'Sin motivo'}</span>
      <span class={`mt-1 text-[24px] leading-tight font-bold tracking-[-.02em] tabular-nums ${d.pendiente > 0 ? color : ''}`}>{eur(d.pendiente)}</span>
      <span class="text-xs text-muted">Devuelto {eur(d.pagado)} de {eur(d.prestado)}</span>
      <Progreso d={d} />
    </button>
  );
  const total = round2(activas.reduce((s, d) => s + d.pendiente, 0));

  return (
    <section class={panel}>
      <div class={panelHead}>
        <div>
          <h2 class={h2}>{t.titulo}</h2>
          <p class={muted}>
            {activas.length ? <>Pendiente: <b class={`tabular-nums ${color}`}>{eur(total)}</b> en {activas.length} {activas.length === 1 ? 'deuda' : 'deudas'}</> : 'Nada pendiente'}
          </p>
        </div>
        <button class={btn()} onClick={() => setDeuda({ original: null, quien: '', motivo: '', importe: '', fecha: hoy(), notas: '' })}>{t.nueva}</button>
      </div>

      {activas.length > 0 && <div class="grid grid-cols-3 gap-3 tablet:grid-cols-2 movil:grid-cols-1">{activas.map(tarjetaDe)}</div>}
      {todas.length === 0 && <p class={empty}>{t.vacio}</p>}
      {todas.length > 0 && activas.length === 0 && <p class={empty}>Todo saldado.</p>}

      {saldadas.length > 0 && (
        <div class="mt-7">
          <h3 class={`${etiqueta} mb-1.5`}>Saldadas</h3>
          <ul class={lista}>
            {saldadas.map(d => (
              <li key={d.clave} class={listaFila}>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold">{d.quien || 'Sin nombre'}{d.motivo && <span class="font-normal text-muted"> · {d.motivo}</span>}</p>
                  <p class="truncate text-xs text-muted">{eur(d.prestado)}{d.ultimo ? ` · última vez el ${fecha(d.ultimo)}` : ''}</p>
                </div>
                <button class={btn('ghost', 'small')} onClick={() => onAbrir(d.clave)}>Ver</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {modales}
    </section>
  );
}
