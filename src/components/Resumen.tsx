// src/components/Resumen.tsx
// Portada: gasto del mes, lo que debo y lo que me deben; debajo, los gastos de los últimos meses y, del mes
// en curso, por categoría.
import { hoy, mesDe, nombreMes, pendiente, suma, type Datos } from '../lib/registro.ts';
import { eur } from '../lib/format.ts';
import { etiqueta, h2, muted, panel } from './ui.ts';

export type Destino = 'gastos' | 'ledebo' | 'medebe';

interface Props {
  datos: Datos;
  onIr(tab: Destino): void;
}

const tarjeta = 'flex cursor-pointer flex-col gap-1 rounded-[10px] bg-paper p-5 text-left shadow-[0_1px_0_var(--color-line)] transition hover:shadow-[0_0_0_1.5px_var(--color-ink)] movil:p-4';
const cifra = 'text-[30px] leading-tight font-bold tracking-[-.02em] tabular-nums';
const barra = 'h-2 rounded-full bg-primary-dark';

/** Los `n` meses hasta `mes` incluido, del más reciente al más antiguo: «2026-10», «2026-09»… */
function mesesHasta(mes: string, n: number): string[] {
  const [y, m] = mes.split('-').map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return d.toISOString().slice(0, 7);
  });
}

export function Resumen({ datos, onIr }: Props) {
  const mes = mesDe(hoy());
  const delMes = datos.gastos.filter(g => mesDe(g.fecha) === mes);
  const totalMes = suma(delMes);
  const anterior = mesesHasta(mes, 2)[1];
  const totalAnterior = suma(datos.gastos.filter(g => mesDe(g.fecha) === anterior));
  const debo = pendiente(datos.leDebo);
  const meDeben = pendiente(datos.meDebe);
  const { leDebo, meDebe } = datos.ajustes;

  const ultimos = mesesHasta(mes, 12).map(m => ({ m, total: suma(datos.gastos.filter(g => mesDe(g.fecha) === m)) }));
  const maxMes = Math.max(...ultimos.map(x => x.total), 1);
  const porCategoria = [...delMes.reduce((acc, g) => acc.set(g.categoria || 'Sin categoría', (acc.get(g.categoria || 'Sin categoría') ?? 0) + g.importe), new Map<string, number>())]
    .sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(...porCategoria.map(([, t]) => t), 1);

  return (
    <div class="flex flex-col gap-5">
      <div class="grid grid-cols-3 gap-4 tablet:grid-cols-1 movil:gap-3">
        <button class={tarjeta} onClick={() => onIr('gastos')}>
          <span class={etiqueta}>Gastos de casa · {nombreMes(mes).split(' ')[0]}</span>
          <span class={cifra}>{eur(totalMes)}</span>
          <span class={`${muted} text-xs`}>
            {delMes.length} {delMes.length === 1 ? 'gasto' : 'gastos'} · el mes pasado, {eur(totalAnterior)}
          </span>
        </button>
        <button class={tarjeta} onClick={() => onIr('ledebo')}>
          <span class={etiqueta}>Le debo{leDebo ? ` a ${leDebo}` : ''}</span>
          <span class={`${cifra} ${debo > 0 ? 'text-danger' : ''}`}>{eur(Math.max(debo, 0))}</span>
          <span class={`${muted} text-xs`}>{debo > 0 ? 'Pendiente de devolver' : 'No le debes nada'}</span>
        </button>
        <button class={tarjeta} onClick={() => onIr('medebe')}>
          <span class={etiqueta}>{meDebe ? `${meDebe} me debe` : 'Me debe'}</span>
          <span class={`${cifra} ${meDeben > 0 ? 'text-ok' : ''}`}>{eur(Math.max(meDeben, 0))}</span>
          <span class={`${muted} text-xs`}>{meDeben > 0 ? 'Pendiente de que te devuelva' : 'No te debe nada'}</span>
        </button>
      </div>

      <div class="grid grid-cols-2 gap-5 tablet:grid-cols-1">
        <section class={panel}>
          <h2 class={`${h2} mb-4`}>Gastos por mes</h2>
          <ul class="flex flex-col gap-2.5">
            {ultimos.map(({ m, total }) => (
              <li key={m} class="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-[13px] movil:grid-cols-[84px_1fr_80px]">
                <span class="truncate text-ink-2 first-letter:uppercase">{nombreMes(m).replace(' de ', ' ')}</span>
                <span class="h-2 rounded-full bg-field">
                  {total > 0 && <span class={`block ${barra}`} style={{ width: `${(total / maxMes) * 100}%` }} />}
                </span>
                <span class="text-right font-semibold tabular-nums">{total ? eur(total) : '—'}</span>
              </li>
            ))}
          </ul>
        </section>

        <section class={panel}>
          <h2 class={`${h2} mb-4`}>Este mes, por categoría</h2>
          {porCategoria.length ? (
            <ul class="flex flex-col gap-2.5">
              {porCategoria.map(([c, total]) => (
                <li key={c} class="grid grid-cols-[1fr_90px] items-center gap-x-3 gap-y-1 text-[13px]">
                  <span class="truncate text-ink-2">{c}</span>
                  <span class="text-right font-semibold tabular-nums">{eur(total)}</span>
                  <span class="col-span-2 h-2 rounded-full bg-field">
                    <span class={`block ${barra}`} style={{ width: `${(total / maxCat) * 100}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          ) : <p class={muted}>Ningún gasto este mes todavía.</p>}
        </section>
      </div>
    </div>
  );
}
