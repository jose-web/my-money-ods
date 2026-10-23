// src/components/AjustesForm.tsx
// Hoja Ajustes: el correo de las copias de seguridad, y cómo está hecha la hoja por si se edita a mano.
import type { Ajustes } from '../lib/registro.ts';
import { campo, etiqueta, gridForm, h2, input, muted, panel, panelHead, span2, span4 } from './ui.ts';

interface Props {
  ajustes: Ajustes;
  onChange(ajustes: Ajustes): void;
}

export function AjustesForm({ ajustes, onChange }: Props) {
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
          <span class={etiqueta}>Email para copias de seguridad</span>
          <input class={input} type="email" value={ajustes.copiaEmail} placeholder="tu@correo.com" onInput={e => onChange({ ...ajustes, copiaEmail: e.currentTarget.value })} />
          <span class={`${muted} text-xs`}>A quién se manda la copia con «⋯ › Copia de seguridad por correo».</span>
        </label>
        <p class={`${span4} ${muted} text-xs`}>
          En Hojas de cálculo de Google puedes ver y cambiar los datos a mano en las hojas «Debo» y «Me deben»: cada fila es un
          movimiento, y las filas con el mismo QUIÉN y MOTIVO son una misma deuda. Columnas: QUIÉN, MOTIVO, FECHA, CONCEPTO,
          TIPO («PRÉSTAMO» o «PAGO»), IMPORTE, NOTAS. No cambies los nombres de las hojas ni el orden de las columnas.
        </p>
      </div>
    </section>
  );
}
