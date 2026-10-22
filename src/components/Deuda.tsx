// src/components/Deuda.tsx
// Una deuda con una persona (lo que le debo, o lo que me debe): lo pendiente arriba y, debajo, los préstamos
// y pagos con lo que quedaba pendiente después de cada uno. Se edita en un modal, como los gastos.
import { useState } from 'preact/hooks';
import { hoy, pendiente, porFecha, round2, suma, type Movimiento, type Tipo } from '../lib/registro.ts';
import { eur, fecha, parseNum } from '../lib/format.ts';
import { ModalFormulario } from './ModalFormulario.tsx';
import { Selector } from './Selector.tsx';
import { btn, campo, empty, etiqueta, h2, icon, input, lista, listaFila, muted, panel, panelHead, span2 } from './ui.ts';

export type Sentido = 'debo' | 'meDebe';

interface Props {
  sentido: Sentido;
  /** nombre de la persona (de Ajustes); vacío si no se ha puesto */
  persona: string;
  movimientos: Movimiento[];
  onChange(movimientos: Movimiento[]): void;
  /** lleva a Ajustes para poner el nombre */
  onAjustes(): void;
}

interface Edicion {
  i: number;
  m: Movimiento;
  importe: string;
}

/** Cómo se dice cada tipo según el sentido de la deuda. */
const TEXTOS: Record<Sentido, Record<Tipo, string>> = {
  debo: { prestamo: 'Me prestó', pago: 'Le pagué' },
  meDebe: { prestamo: 'Le presté', pago: 'Me pagó' },
};
const pastilla = 'rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';

export function Deuda({ sentido, persona, movimientos, onChange, onAjustes }: Props) {
  const [edicion, setEdicion] = useState<Edicion | null>(null);
  const quien = persona || (sentido === 'debo' ? 'la persona a la que debes' : 'la persona que te debe');
  const textos = TEXTOS[sentido];
  const total = pendiente(movimientos);
  const prestado = suma(movimientos.filter(m => m.tipo === 'prestamo'));
  const pagado = suma(movimientos.filter(m => m.tipo === 'pago'));

  // lo que quedaba pendiente tras cada movimiento, en orden de fecha; se enseña lo más reciente arriba
  let acumulado = 0;
  const filas = porFecha(movimientos.map((m, i) => ({ m, i, fecha: m.fecha }))).map(({ m, i }) => {
    acumulado = round2(acumulado + (m.tipo === 'pago' ? -m.importe : m.importe));
    return { m, i, queda: acumulado };
  }).reverse();

  function abrir(i: number, tipo: Tipo = 'prestamo') {
    const m = i < 0 ? { fecha: hoy(), concepto: '', tipo, importe: 0, notas: '' } : movimientos[i];
    setEdicion({ i, m, importe: i < 0 ? '' : String(m.importe).replace('.', ',') });
  }

  const importe = edicion ? parseNum(edicion.importe) : null;
  function aceptar() {
    if (!edicion || importe === null) return;
    const m = { ...edicion.m, concepto: edicion.m.concepto.trim(), notas: edicion.m.notas.trim(), importe: Math.abs(importe) };
    onChange(porFecha(edicion.i < 0 ? [...movimientos, m] : movimientos.map((x, j) => (j === edicion.i ? m : x))));
    setEdicion(null);
  }
  const editar = (cambio: Partial<Movimiento>) => edicion && setEdicion({ ...edicion, m: { ...edicion.m, ...cambio } });

  const titulo = sentido === 'debo' ? `Lo que le debo${persona ? ` a ${persona}` : ''}` : `Lo que me debe${persona ? ` ${persona}` : ''}`;
  const frase = total === 0 ? 'Estáis en paz: no queda nada pendiente.'
    : total < 0 ? (sentido === 'debo' ? `Has pagado ${eur(-total)} de más a ${quien}.` : `${quien} te ha pagado ${eur(-total)} de más.`)
    : sentido === 'debo' ? `Le debes a ${quien}` : persona ? `${persona} te debe` : 'Te debe';

  return (
    <section class={panel}>
      <div class={panelHead}>
        <div>
          <h2 class={h2}>{titulo}</h2>
          {!persona && (
            <p class={muted}>
              ¿Cómo se llama? <button class="cursor-pointer underline" onClick={onAjustes}>Ponlo en Ajustes</button>.
            </p>
          )}
        </div>
        <div class="flex flex-wrap gap-2">
          <button class={btn()} onClick={() => abrir(-1, 'prestamo')}>Apuntar «{textos.prestamo.toLowerCase()}»</button>
          <button class={btn('ghost')} onClick={() => abrir(-1, 'pago')}>Apuntar «{textos.pago.toLowerCase()}»</button>
        </div>
      </div>

      {movimientos.length > 0 && (
        <div class={`mb-6 rounded-xl px-5 py-4 ${total > 0 ? (sentido === 'debo' ? 'bg-danger-soft' : 'bg-ok-soft') : 'bg-field'}`}>
          <p class="text-[13px] font-medium text-ink-2">{frase}</p>
          {total > 0 && <p class={`text-[34px] leading-tight font-bold tracking-[-.02em] tabular-nums ${sentido === 'debo' ? 'text-danger' : 'text-ok'}`}>{eur(total)}</p>}
          <p class={`${muted} text-xs`}>{textos.prestamo}: {eur(prestado)} · {textos.pago}: {eur(pagado)}</p>
        </div>
      )}

      {filas.length > 0 && (
        <ul class={lista}>
          {filas.map(({ m, i, queda }) => (
            <li key={i} class={listaFila}>
              <div class="min-w-0 flex-1">
                <p class="flex min-w-0 items-center gap-2">
                  <span class="truncate font-semibold">{m.concepto || textos[m.tipo]}</span>
                  {m.concepto && <span class={`${pastilla} ${m.tipo === 'pago' ? 'bg-field text-ink-2' : 'bg-primary text-ink'}`}>{textos[m.tipo]}</span>}
                </p>
                <p class="truncate text-xs text-muted">{[fecha(m.fecha), `quedaba ${eur(queda)}`, m.notas].filter(Boolean).join(' · ')}</p>
              </div>
              <span class="font-semibold whitespace-nowrap tabular-nums">{m.tipo === 'pago' ? '−' : '+'}{eur(m.importe)}</span>
              <button class={btn('ghost', 'small')} onClick={() => abrir(i)}>Editar</button>
              <button class={icon} title="Eliminar" onClick={() => {
                if (confirm(`¿Eliminar «${m.concepto || textos[m.tipo]}» (${eur(m.importe)})?`)) onChange(movimientos.filter((_, j) => j !== i));
              }}>×</button>
            </li>
          ))}
        </ul>
      )}
      {filas.length === 0 && <p class={empty}>Apunta lo que {sentido === 'debo' ? 'te prestó' : 'le prestaste'} y lo que {sentido === 'debo' ? 'le vas devolviendo' : 'te va devolviendo'}.</p>}

      {edicion && (
        <ModalFormulario titulo={edicion.i < 0 ? `Apuntar «${textos[edicion.m.tipo].toLowerCase()}»` : 'Editar movimiento'} valido={importe !== null && importe !== 0}
          onAceptar={aceptar} onCancelar={() => setEdicion(null)}>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3.5 movil:grid-cols-1">
            <label class={campo}>
              <span class={etiqueta}>Tipo</span>
              <Selector valor={edicion.m.tipo} onChange={tipo => editar({ tipo: tipo as Tipo })}
                opciones={(['prestamo', 'pago'] as const).map(t => ({ valor: t, texto: textos[t] }))} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>Importe (€)</span>
              <input class={`${input} text-right tabular-nums`} inputMode="decimal" value={edicion.importe} placeholder="0,00"
                onInput={e => setEdicion({ ...edicion, importe: e.currentTarget.value })} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>Fecha</span>
              <input class={input} type="date" value={edicion.m.fecha} onInput={e => editar({ fecha: e.currentTarget.value })} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>Concepto</span>
              <input class={input} value={edicion.m.concepto} placeholder={edicion.m.tipo === 'pago' ? 'Bizum' : 'Para el coche'}
                onInput={e => editar({ concepto: e.currentTarget.value })} />
            </label>
            <label class={`${campo} ${span2}`}>
              <span class={etiqueta}>Notas</span>
              <input class={input} value={edicion.m.notas} onInput={e => editar({ notas: e.currentTarget.value })} />
            </label>
          </div>
        </ModalFormulario>
      )}
    </section>
  );
}
