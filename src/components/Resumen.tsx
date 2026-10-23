// src/components/Resumen.tsx
// Portada: cuánto debo, cuánto me deben y la diferencia; debajo, cada deuda pendiente de los dos lados.
import { deudas, round2, type Datos, type Deuda, type Lado } from '../lib/registro.ts';
import { eur } from '../lib/format.ts';
import { etiqueta, h2, muted, panel } from './ui.ts';

interface Props {
  datos: Datos;
  /** abre una deuda (o la lista de su lado, con null) */
  onIr(lado: Lado, clave: string | null): void;
}

const tarjeta = 'flex cursor-pointer flex-col gap-1 rounded-[10px] bg-paper p-5 text-left shadow-[0_1px_0_var(--color-line)] transition hover:shadow-[0_0_0_1.5px_var(--color-ink)] movil:p-4';
const cifra = 'text-[30px] leading-tight font-bold tracking-[-.02em] tabular-nums';

export function Resumen({ datos, onIr }: Props) {
  const debo = deudas(datos.debo).filter(d => d.pendiente !== 0);
  const meDeben = deudas(datos.meDeben).filter(d => d.pendiente !== 0);
  const total = (ds: Deuda[]) => round2(ds.reduce((s, d) => s + d.pendiente, 0));
  const tDebo = total(debo);
  const tMeDeben = total(meDeben);
  const neto = round2(tMeDeben - tDebo);

  const columna = (lado: Lado, titulo: string, ds: Deuda[], t: number) => {
    const max = Math.max(...ds.map(d => d.pendiente), 1);
    return (
      <section class={panel}>
        <div class="mb-4 flex items-baseline justify-between gap-3">
          <h2 class={h2}>{titulo}</h2>
          <button class="cursor-pointer text-[13px] font-semibold text-muted hover:text-ink" onClick={() => onIr(lado, null)}>Ver todas →</button>
        </div>
        {ds.length ? (
          <ul class="flex flex-col gap-1">
            {[...ds].sort((a, b) => b.pendiente - a.pendiente).map(d => (
              <li key={d.clave}>
                <button class="grid w-full cursor-pointer grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-left text-[13px] hover:bg-field"
                  onClick={() => onIr(lado, d.clave)}>
                  <span class="min-w-0 truncate"><b>{d.quien || 'Sin nombre'}</b>{d.motivo && <span class="text-muted"> · {d.motivo}</span>}</span>
                  <span class="text-right font-semibold tabular-nums">{eur(d.pendiente)}</span>
                  <span class="col-span-2 h-2 rounded-full bg-field">
                    <span class={`block h-2 rounded-full ${lado === 'debo' ? 'bg-danger/60' : 'bg-ok/60'}`} style={{ width: `${Math.max(0, d.pendiente / max) * 100}%` }} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p class={muted}>{lado === 'debo' ? 'No debes nada.' : 'Nadie te debe nada.'}</p>}
        {ds.length > 1 && <p class={`${muted} mt-3 px-2 text-right text-xs`}>Total {eur(t)}</p>}
      </section>
    );
  };

  return (
    <div class="flex flex-col gap-5">
      <div class="grid grid-cols-3 gap-4 tablet:grid-cols-1 movil:gap-3">
        <button class={tarjeta} onClick={() => onIr('debo', null)}>
          <span class={etiqueta}>Debo</span>
          <span class={`${cifra} ${tDebo > 0 ? 'text-danger' : ''}`}>{eur(tDebo)}</span>
          <span class={`${muted} text-xs`}>{debo.length} {debo.length === 1 ? 'deuda pendiente' : 'deudas pendientes'}</span>
        </button>
        <button class={tarjeta} onClick={() => onIr('meDeben', null)}>
          <span class={etiqueta}>Me deben</span>
          <span class={`${cifra} ${tMeDeben > 0 ? 'text-ok' : ''}`}>{eur(tMeDeben)}</span>
          <span class={`${muted} text-xs`}>{meDeben.length} {meDeben.length === 1 ? 'préstamo pendiente' : 'préstamos pendientes'}</span>
        </button>
        <div class="flex flex-col gap-1 rounded-[10px] bg-paper p-5 shadow-[0_1px_0_var(--color-line)] movil:p-4">
          <span class={etiqueta}>Balance</span>
          <span class={`${cifra} ${neto < 0 ? 'text-danger' : neto > 0 ? 'text-ok' : ''}`}>{neto > 0 ? '+' : ''}{eur(neto)}</span>
          <span class={`${muted} text-xs`}>Lo que me deben menos lo que debo</span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-5 tablet:grid-cols-1">
        {columna('debo', 'Lo que debo', debo, tDebo)}
        {columna('meDeben', 'Lo que me deben', meDeben, tMeDeben)}
      </div>
    </div>
  );
}
