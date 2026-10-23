// src/components/Chat.tsx
// Chat con la IA del navegador, abajo a la derecha: se le pregunta por los datos del archivo abierto (cuánto debo,
// a quién, cuándo terminaré de pagar…). Los datos van en las instrucciones de la sesión, en texto (src/lib/contexto.ts);
// si cambian, o cambia el idioma, la siguiente pregunta abre una sesión nueva con la conversación de antes.
// Solo aparece si el navegador tiene la API (ver src/lib/ia.ts).
import { useEffect, useRef, useState } from 'preact/hooks';
import { crearSesionConDatos, type SesionIA, type Turno } from '../lib/ia.ts';
import { versionesDatos } from '../lib/contexto.ts';
import { hoy, type Datos } from '../lib/registro.ts';
import { idioma, t } from '../lib/i18n.ts';
import { activarIA, usarIA } from './usarIA.ts';
import { btn, error as errorCls, iconBase, muted } from './ui.ts';

// turnos de la conversación que se le recuerdan a una sesión nueva
const HISTORIAL = 8;

/** Texto de la IA con lo poco de Markdown que suele usar: **negrita** y listas con «*» o «-». */
export function TextoIA({ texto }: { texto: string }) {
  return (
    <>
      {texto.split('\n').map((linea, i) => {
        const lista = /^\s*[*-]\s+/.test(linea);
        let limpia = linea.replace(/^\s*[*-]\s+/, '');
        // una negrita a medio escribir (o cortada con «Parar»): sin sus asteriscos
        if ((limpia.match(/\*\*/g) ?? []).length % 2) limpia = limpia.replace(/\*\*(?!.*\*\*)/, '');
        const partes = limpia.split(/\*\*(.+?)\*\*/g);
        return (
          <p key={i} class={`${lista ? 'pl-3.5 -indent-3.5' : ''} min-h-[1em]`}>
            {lista && '• '}
            {partes.map((p, j) => (j % 2 ? <b key={j}>{p}</b> : p))}
          </p>
        );
      })}
    </>
  );
}

/** Qué pasa con la IA del navegador y, si se puede, el botón para descargarla. No pinta nada si está lista. */
export function AvisoIA({ conFlags = false }: { conFlags?: boolean }) {
  const ia = usarIA();
  if (ia.estado === 'lista') return null;
  return (
    <div class="flex flex-col gap-2.5 text-[13px]">
      {ia.estado === null && <p class={muted}>{t.ia.comprobando}</p>}
      {ia.estado === 'sin-api' && <p>{t.ia.sinApi}</p>}
      {ia.estado === 'sin-api' && conFlags && <p class={`${muted} text-xs wrap-break-word`}>{t.ia.flags}</p>}
      {ia.estado === 'no-disponible' && <p>{t.ia.noDisponible}</p>}
      {ia.estado === 'descargable' && <p>{t.ia.descargable}</p>}
      {ia.estado === 'descargando' && (
        <>
          <p>{t.ia.descargando(Math.round(ia.progreso * 100))}</p>
          <span class="block h-2 rounded-full bg-field"><span class="block h-2 rounded-full bg-primary-dark transition-[width]" style={{ width: `${ia.progreso * 100}%` }} /></span>
        </>
      )}
      {(ia.estado === 'descargable' || (ia.estado === 'descargando' && ia.progreso === 0)) && (
        <button class={`${btn('primary', 'small')} self-start`} onClick={activarIA}>{t.ia.descargar}</button>
      )}
      {ia.error && <p class={errorCls}>{t.ia.fallo(ia.error)}</p>}
    </div>
  );
}

export function Chat({ datos }: { datos: Datos }) {
  const ia = usarIA();
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Turno[]>([]);
  // la respuesta que se está escribiendo (null si no hay ninguna)
  const [escribiendo, setEscribiendo] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [fallo, setFallo] = useState('');
  const sesion = useRef<{ s: SesionIA; datos: Datos; idioma: string } | null>(null);
  const parar = useRef<AbortController | null>(null);
  const parcial = useRef('');
  const fin = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);

  useEffect(() => () => sesion.current?.s.cerrar(), []);
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }); }, [mensajes, escribiendo, abierto]);
  useEffect(() => { if (abierto) campo.current?.focus(); }, [abierto]);

  // sin IA que usar (navegador sin la API, o dispositivo no compatible) no hay botón: Ajustes explica por qué
  if (ia.estado === null || ia.estado === 'sin-api' || ia.estado === 'no-disponible') return null;

  function cerrarSesion() {
    sesion.current?.s.cerrar();
    sesion.current = null;
  }

  async function enviar(pregunta: string) {
    pregunta = pregunta.trim();
    if (!pregunta || escribiendo !== null) return;
    const antes = mensajes;
    setMensajes([...antes, { rol: 'user', texto: pregunta }]);
    setTexto('');
    setFallo('');
    setEscribiendo('');
    parcial.current = '';
    const ctrl = new AbortController();
    parar.current = ctrl;
    try {
      // datos o idioma distintos de los de la sesión: se abre otra, con la conversación de antes
      if (!sesion.current || sesion.current.datos !== datos || sesion.current.idioma !== idioma) {
        cerrarSesion();
        const s = await crearSesionConDatos({
          versiones: versionesDatos(datos, hoy()), sistemaCon: t.ia.sistemaChat, historial: antes.slice(-HISTORIAL), idioma, signal: ctrl.signal,
        });
        sesion.current = { s, datos, idioma };
      }
      const r = await sesion.current.s.responder(pregunta, a => { parcial.current = a; setEscribiendo(a); }, ctrl.signal);
      setMensajes(m => [...m, { rol: 'assistant', texto: r }]);
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        // se queda lo que llevaba escrito; la sesión, a medias, no se reutiliza
        if (parcial.current) setMensajes(m => [...m, { rol: 'assistant', texto: `${parcial.current}…` }]);
        cerrarSesion();
      } else {
        setFallo(t.ia.fallo((e as Error).message));
        cerrarSesion();
      }
    } finally {
      setEscribiendo(null);
      parar.current = null;
    }
  }

  function nueva() {
    parar.current?.abort();
    cerrarSesion();
    setMensajes([]);
    setFallo('');
  }

  const burbuja = 'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-[1.45] wrap-break-word movil:text-[15px]';
  return (
    <>
      {!abierto && (
        <button class="fixed right-5 bottom-5 z-40 grid size-14 cursor-pointer place-items-center rounded-full bg-ink text-primary shadow-[0_10px_30px_-8px_rgba(0,0,0,.55)] transition hover:scale-105 movil:right-3.5 movil:bottom-[calc(84px+env(safe-area-inset-bottom))] movil:size-13"
          aria-label={t.ia.boton} title={t.ia.boton} onClick={() => setAbierto(true)}>
          <svg class="size-6.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /><path d="M8.5 11h.01M12 11h.01M15.5 11h.01" />
          </svg>
        </button>
      )}

      {abierto && (
        <section role="dialog" aria-label={t.ia.titulo}
          class="fixed right-5 bottom-5 z-50 flex h-[min(620px,calc(100dvh-100px))] w-[min(400px,calc(100vw-40px))] flex-col overflow-hidden rounded-2xl bg-paper shadow-[0_20px_60px_-15px_rgba(0,0,0,.5)] movil:inset-0 movil:h-dvh movil:w-full movil:rounded-none movil:pb-[env(safe-area-inset-bottom)]"
          onKeyDown={e => { if (e.key === 'Escape') setAbierto(false); }}>
          <header class="flex items-start justify-between gap-2 bg-primary py-2.5 pr-2.5 pl-4 movil:pt-[calc(10px+env(safe-area-inset-top))]">
            <div class="min-w-0">
              <p class="font-bold">{t.ia.titulo}</p>
              <p class="text-[11.5px] leading-tight text-ink-2">{t.ia.subtitulo}</p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              {mensajes.length > 0 && <button class={btn('bar', 'small')} onClick={nueva}>{t.ia.nueva}</button>}
              <button class={iconBase} aria-label={t.comun.cerrar} onClick={() => setAbierto(false)}>×</button>
            </div>
          </header>

          <div class="flex flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4">
            {ia.estado !== 'lista' ? <AvisoIA /> : (
              <>
                {mensajes.length === 0 && (
                  <div class="flex flex-col gap-2.5">
                    <p class={`${burbuja} self-start bg-field`}>{t.ia.bienvenida}</p>
                    <div class="flex flex-wrap gap-1.5">
                      {t.ia.sugerencias.map(s => (
                        <button key={s} class={`${btn('ghost', 'small')} whitespace-normal text-left`} onClick={() => enviar(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {mensajes.map((m, i) => (
                  <div key={i} class={`${burbuja} ${m.rol === 'user' ? 'self-end bg-ink whitespace-pre-wrap text-white' : 'self-start bg-field'}`}>
                    {m.rol === 'user' ? m.texto : <TextoIA texto={m.texto} />}
                  </div>
                ))}
                {escribiendo !== null && (
                  <div class={`${burbuja} self-start bg-field`}>{escribiendo ? <TextoIA texto={escribiendo} /> : <span class="text-muted">{t.ia.pensando}</span>}</div>
                )}
                {fallo && <p class={`${errorCls} text-[13px]`}>{fallo}</p>}
              </>
            )}
            <div ref={fin} />
          </div>

          {ia.estado === 'lista' && (
            <form class="border-t border-line p-2.5" onSubmit={e => { e.preventDefault(); enviar(texto); }}>
              <div class="flex items-end gap-2">
                <textarea ref={campo} rows={1} value={texto} placeholder={t.ia.escribe}
                  class="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-transparent bg-field px-3 py-2.25 text-sm outline-none focus:border-ink focus:bg-white movil:text-base"
                  onInput={e => setTexto(e.currentTarget.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(texto); } }} />
                {escribiendo !== null
                  ? <button type="button" class={btn('ghost')} onClick={() => parar.current?.abort()}>{t.ia.parar}</button>
                  : <button type="submit" class={btn()} disabled={!texto.trim()}>{t.ia.enviar}</button>}
              </div>
              <p class={`${muted} mt-1.5 px-1 text-[11px]`}>{t.ia.aviso}</p>
            </form>
          )}
        </section>
      )}
    </>
  );
}
