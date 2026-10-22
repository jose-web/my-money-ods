// src/components/Gastos.tsx
// Gastos de la casa: listado por meses con su total, filtros por mes y categoría, y edición en un modal.
import { useState } from 'preact/hooks';
import { hoy, mesDe, nombreMes, porFecha, suma, type Gasto } from '../lib/registro.ts';
import { eur, fecha, norm, parseNum } from '../lib/format.ts';
import { ModalFormulario } from './ModalFormulario.tsx';
import { Selector } from './Selector.tsx';
import { btn, campo, empty, etiqueta, filtro, filtros, h2, icon, input, lista, listaFila, muted, panel, panelHead, span2 } from './ui.ts';

interface Props {
  gastos: Gasto[];
  categorias: string[];
  onChange(gastos: Gasto[]): void;
}

/** Gasto abierto en el modal: `i` es su posición en `gastos`, o -1 si es nuevo. El importe se edita como texto. */
interface Edicion {
  i: number;
  g: Gasto;
  importe: string;
}

const filtroSelector = `${filtro} cursor-pointer text-left`;

export function Gastos({ gastos, categorias, onChange }: Props) {
  const [mes, setMes] = useState('');
  const [categoria, setCategoria] = useState('');
  const [q, setQ] = useState('');
  const [edicion, setEdicion] = useState<Edicion | null>(null);

  const meses = [...new Set(gastos.map(g => mesDe(g.fecha)))].sort().reverse();
  const usadas = [...new Set([...categorias, ...gastos.map(g => g.categoria).filter(Boolean)])];
  const visibles = gastos.map((g, i) => ({ g, i })).filter(({ g }) =>
    (!mes || mesDe(g.fecha) === mes) && (!categoria || g.categoria === categoria)
    && (!q || norm(`${g.concepto} ${g.categoria} ${g.notas}`).includes(norm(q))));
  // lo más reciente arriba, agrupado por meses
  const grupos = new Map<string, { g: Gasto; i: number }[]>();
  for (const v of porFecha(visibles.map(v => ({ ...v, fecha: v.g.fecha }))).reverse()) {
    const m = mesDe(v.g.fecha);
    grupos.set(m, [...(grupos.get(m) ?? []), v]);
  }

  function abrir(i: number) {
    const g = i < 0 ? { fecha: hoy(), concepto: '', categoria: categoria || '', importe: 0, notas: '' } : gastos[i];
    setEdicion({ i, g, importe: i < 0 ? '' : String(g.importe).replace('.', ',') });
  }

  const importe = edicion ? parseNum(edicion.importe) : null;
  function aceptar() {
    if (!edicion || importe === null) return;
    const g = { ...edicion.g, concepto: edicion.g.concepto.trim(), notas: edicion.g.notas.trim(), importe };
    onChange(porFecha(edicion.i < 0 ? [...gastos, g] : gastos.map((x, j) => (j === edicion.i ? g : x))));
    setEdicion(null);
  }
  const editar = (cambio: Partial<Gasto>) => edicion && setEdicion({ ...edicion, g: { ...edicion.g, ...cambio } });

  return (
    <section class={panel}>
      <div class={panelHead}>
        <div>
          <h2 class={h2}>Gastos de la casa</h2>
          <p class={muted}>
            {visibles.length} {visibles.length === 1 ? 'gasto' : 'gastos'} · <b class="text-ink tabular-nums">{eur(suma(visibles.map(v => v.g)))}</b>
            {(mes || categoria || q) && ' con estos filtros'}
          </p>
        </div>
        <button class={btn()} onClick={() => abrir(-1)}>Añadir gasto</button>
      </div>

      <div class={`${filtros} mb-4`}>
        <Selector clase={filtroSelector} valor={mes} vacio="Todos los meses" onChange={setMes}
          opciones={meses.map(m => ({ valor: m, texto: nombreMes(m) }))} />
        <Selector clase={filtroSelector} valor={categoria} vacio="Todas las categorías" onChange={setCategoria} opciones={usadas} />
        <input class={filtro} type="search" placeholder="Buscar…" value={q} onInput={e => setQ(e.currentTarget.value)} />
      </div>

      {[...grupos].map(([m, filas]) => (
        <div key={m} class="mb-5">
          <div class="flex items-baseline justify-between gap-3 pb-1.5">
            <h3 class={`${etiqueta} first-letter:uppercase`}>{nombreMes(m)}</h3>
            <span class="text-[13px] font-semibold tabular-nums">{eur(suma(filas.map(v => v.g)))}</span>
          </div>
          <ul class={lista}>
            {filas.map(({ g, i }) => (
              <li key={i} class={listaFila}>
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold">{g.concepto || 'Sin concepto'}</p>
                  <p class="truncate text-xs text-muted">{[fecha(g.fecha), g.categoria, g.notas].filter(Boolean).join(' · ')}</p>
                </div>
                <span class="font-semibold whitespace-nowrap tabular-nums">{eur(g.importe)}</span>
                <button class={btn('ghost', 'small')} onClick={() => abrir(i)}>Editar</button>
                <button class={icon} title="Eliminar" onClick={() => {
                  if (confirm(`¿Eliminar «${g.concepto || 'este gasto'}» (${eur(g.importe)})?`)) onChange(gastos.filter((_, j) => j !== i));
                }}>×</button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {gastos.length === 0 && <p class={empty}>Todavía no hay gastos. Pulsa «Añadir gasto».</p>}
      {gastos.length > 0 && visibles.length === 0 && <p class={empty}>Nada coincide con los filtros.</p>}

      {edicion && (
        <ModalFormulario titulo={edicion.i < 0 ? 'Nuevo gasto' : 'Editar gasto'} valido={!!edicion.g.concepto.trim() && importe !== null}
          onAceptar={aceptar} onCancelar={() => setEdicion(null)}>
          <div class="grid grid-cols-2 gap-x-4 gap-y-3.5 movil:grid-cols-1">
            <label class={`${campo} ${span2}`}>
              <span class={etiqueta}>Concepto</span>
              <input class={input} value={edicion.g.concepto} placeholder="Recibo de la luz" onInput={e => editar({ concepto: e.currentTarget.value })} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>Fecha</span>
              <input class={input} type="date" value={edicion.g.fecha} onInput={e => editar({ fecha: e.currentTarget.value })} />
            </label>
            <label class={campo}>
              <span class={etiqueta}>Importe (€)</span>
              <input class={`${input} text-right tabular-nums`} inputMode="decimal" value={edicion.importe} placeholder="0,00"
                onInput={e => setEdicion({ ...edicion, importe: e.currentTarget.value })} />
            </label>
            <label class={`${campo} ${span2}`}>
              <span class={etiqueta}>Categoría</span>
              <Selector valor={edicion.g.categoria} vacio="Sin categoría" opciones={categorias} onChange={categoria => editar({ categoria })} />
              <span class={`${muted} text-xs`}>Las categorías se cambian en Ajustes.</span>
            </label>
            <label class={`${campo} ${span2}`}>
              <span class={etiqueta}>Notas</span>
              <input class={input} value={edicion.g.notas} onInput={e => editar({ notas: e.currentTarget.value })} />
            </label>
          </div>
        </ModalFormulario>
      )}
    </section>
  );
}
