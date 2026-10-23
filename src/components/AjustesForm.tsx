// src/components/AjustesForm.tsx
// Ajustes: el idioma (de este navegador), el correo de las copias de seguridad (hoja Ajustes) y cómo está hecha
// la hoja por si se edita a mano.
import type { ComponentChildren } from 'preact';
import type { Ajustes } from '../lib/registro.ts';
import { t } from '../lib/i18n.ts';
import { AvisoIA } from './Chat.tsx';
import { usarIA } from './usarIA.ts';
import { campo, etiqueta, gridForm, h2, input, muted, panel, panelHead, span2, span4 } from './ui.ts';

interface Props {
  ajustes: Ajustes;
  onChange(ajustes: Ajustes): void;
  /** el selector de idioma, que lleva App */
  idioma: ComponentChildren;
}

export function AjustesForm({ ajustes, onChange, idioma }: Props) {
  const ia = usarIA();
  return (
    <section class={panel}>
      <div class={panelHead}>
        <div>
          <h2 class={h2}>{t.ajustes.titulo}</h2>
          <p class={muted}>{t.ajustes.nota}</p>
        </div>
      </div>
      <div class={gridForm}>
        <div class={`${campo} ${span2}`}>
          <span class={etiqueta}>{t.comun.idioma}</span>
          <div class="self-start">{idioma}</div>
          <span class={`${muted} text-xs`}>{t.ajustes.idiomaNota}</span>
        </div>
        <label class={`${campo} ${span2}`}>
          <span class={etiqueta}>{t.ajustes.email}</span>
          <input class={input} type="email" value={ajustes.copiaEmail} placeholder={t.ajustes.emailEj} onInput={e => onChange({ ...ajustes, copiaEmail: e.currentTarget.value })} />
          <span class={`${muted} text-xs`}>{t.ajustes.emailNota}</span>
        </label>
        <div class={`${campo} ${span4}`}>
          <span class={etiqueta}>{t.ia.ajustes}</span>
          <p class={`${muted} text-xs`}>{t.ia.ajustesNota}</p>
          {ia.estado === 'lista' ? <p class="text-[13px] text-ok">{t.ia.lista}</p> : <AvisoIA conFlags />}
        </div>
        <p class={`${span4} ${muted} text-xs`}>{t.ajustes.ayudaHoja}</p>
      </div>
    </section>
  );
}
