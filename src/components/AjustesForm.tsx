// src/components/AjustesForm.tsx
// Hoja Ajustes: los nombres de las dos personas, las categorías de gastos y el correo de las copias.
import { useState } from 'preact/hooks';
import type { Ajustes } from '../lib/registro.ts';
import { campo, etiqueta, gridForm, h2, input, muted, panel, panelHead, span2, span4 } from './ui.ts';

interface Props {
  ajustes: Ajustes;
  onChange(ajustes: Ajustes): void;
}

export function AjustesForm({ ajustes, onChange }: Props) {
  // las categorías se escriben una por línea; se aplican al salir del campo para no perder líneas vacías al teclear
  const [categorias, setCategorias] = useState(ajustes.categorias.join('\n'));
  const set = (cambio: Partial<Ajustes>) => onChange({ ...ajustes, ...cambio });

  return (
    <section class={panel}>
      <div class={panelHead}>
        <div>
          <h2 class={h2}>Ajustes</h2>
          <p class={muted}>Se guardan en la hoja «Ajustes» del archivo.</p>
        </div>
      </div>
      <div class={gridForm}>
        <label class={`${campo} ${span2}`}>
          <span class={etiqueta}>Persona a la que debo</span>
          <input class={input} value={ajustes.leDebo} placeholder="Nombre" onInput={e => set({ leDebo: e.currentTarget.value })} />
          <span class={`${muted} text-xs`}>Hoja «Le debo».</span>
        </label>
        <label class={`${campo} ${span2}`}>
          <span class={etiqueta}>Persona que me debe</span>
          <input class={input} value={ajustes.meDebe} placeholder="Nombre" onInput={e => set({ meDebe: e.currentTarget.value })} />
          <span class={`${muted} text-xs`}>Hoja «Me debe».</span>
        </label>
        <label class={`${campo} ${span2}`}>
          <span class={etiqueta}>Categorías de gastos</span>
          <textarea class={`${input} resize-y`} rows={8} value={categorias} onInput={e => setCategorias(e.currentTarget.value)}
            onBlur={() => set({ categorias: [...new Set(categorias.split('\n').map(s => s.trim()).filter(Boolean))] })} />
          <span class={`${muted} text-xs`}>Una por línea. Quitar una no cambia los gastos que ya la tienen.</span>
        </label>
        <label class={`${campo} ${span2} self-start`}>
          <span class={etiqueta}>Email para copias de seguridad</span>
          <input class={input} type="email" value={ajustes.copiaEmail} placeholder="tu@correo.com" onInput={e => set({ copiaEmail: e.currentTarget.value })} />
          <span class={`${muted} text-xs`}>A quién se manda la copia con «⋯ › Copia de seguridad por correo».</span>
        </label>
        <p class={`${span4} ${muted} text-xs`}>
          En Hojas de cálculo de Google puedes ver y cambiar los datos a mano: la web los leerá mientras no cambies los nombres de las
          hojas ni el orden de sus columnas (FECHA, CONCEPTO, CATEGORÍA o TIPO, IMPORTE, NOTAS). En TIPO, «PRÉSTAMO» o «PAGO».
        </p>
      </div>
    </section>
  );
}
