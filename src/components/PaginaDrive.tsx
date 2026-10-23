// src/components/PaginaDrive.tsx
// Página «Google Drive» (menú «⋯»): la carpeta «Mi dinero» con los registros y las copias de seguridad,
// para abrir cualquiera aquí o en Google Drive, y el estado del guardado y las copias automáticas.
import { useEffect, useState } from 'preact/hooks';
import { CARPETA_APP, CARPETA_COPIAS, accesoDrive, carpetaApp, conectadoDrive, listarDrive, type CarpetaDrive, type DriveArchivo } from '../lib/drive.ts';
import { fecha, fechaLarga } from '../lib/format.ts';
import { btn, error as errorCls, etiqueta, h2, lista, listaFila, muted, panel, panelHead } from './ui.ts';
import { t } from '../lib/i18n.ts';

interface Props {
  /** el registro abierto, si está en Drive */
  actual: DriveArchivo | null;
  /** fecha de la última copia de seguridad (ISO local) o vacío */
  ultimaCopia: string;
  /** el guardado automático está parado (sesión caducada o cambios de otro dispositivo): ver el aviso de arriba */
  pausado: boolean;
  onAbrir(f: DriveArchivo): void;
  /** crea un registro nuevo (de la plantilla) en Drive y lo abre */
  onCrear(): void;
  /** sube el registro abierto, si no está ya en Drive */
  onSubir?: () => void;
  /** hace una copia de seguridad ahora; la lista se refresca al acabar */
  onCopia(): Promise<void>;
}

type Contenido = { carpeta: CarpetaDrive | null; registros: DriveArchivo[]; copias: DriveArchivo[] };

const aviso = 'rounded-lg bg-field px-3.5 py-3 text-[13px]';

export function PaginaDrive({ actual, ultimaCopia, pausado, onAbrir, onCrear, onSubir, onCopia }: Props) {
  const [contenido, setContenido] = useState<Contenido | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fallo, setFallo] = useState('');
  // sin token de esta pestaña hay que entrar en Google con un clic
  const [entrar, setEntrar] = useState(!conectadoDrive());

  async function cargar(acceso: Promise<unknown> = accesoDrive()) {
    setCargando(true);
    setFallo('');
    try {
      await acceso;
      setEntrar(false);
      const lista = await listarDrive();
      // sin carpeta (la primera vez, o porque se borró): se crea
      setContenido(lista.carpeta ? lista : { ...lista, carpeta: await carpetaApp() });
    } catch (e) {
      setFallo((e as Error).message);
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => { if (conectadoDrive()) cargar(); }, []);

  const fila = (f: DriveArchivo) => {
    const abierto = actual?.id === f.id;
    return (
      <li key={f.id} class={listaFila}>
        <div class="min-w-0 flex-1">
          <p class="truncate font-semibold" title={f.nombre}>
            {f.nombre}
            {abierto && <span class="ml-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold">{t.paginaDrive.abierto}</span>}
          </p>
          <p class={`${muted} text-xs`}>{f.hoja ? t.elegirDrive.hojaGoogle : t.elegirDrive.archivoOds} · {t.elegirDrive.modificado(fechaLarga(f.modificado))}</p>
        </div>
        <div class="flex shrink-0 gap-1.5 movil:flex-col">
          {!abierto && <button class={btn('primary', 'small')} onClick={() => onAbrir(f)}>{t.paginaDrive.abrirAqui}</button>}
          <a class={`${btn('ghost', 'small')} text-center no-underline`} href={f.enlace} target="_blank" rel="noopener">{t.paginaDrive.abrirEnDrive}</a>
        </div>
      </li>
    );
  };

  return (
    <section class={panel}>
      <div class={panelHead}>
        <div>
          <h2 class={h2}>Google Drive</h2>
          <p class={muted}>{t.paginaDrive.sub(CARPETA_APP, CARPETA_COPIAS)}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          {contenido?.carpeta && (
            <a class={`${btn('ghost')} no-underline`} href={contenido.carpeta.enlace} target="_blank" rel="noopener">{t.paginaDrive.abrirCarpeta}</a>
          )}
          {actual && !entrar && (
            <button class={btn('ghost')} disabled={cargando} onClick={() => { const a = accesoDrive(); cargar(a.then(onCopia)); }}>{t.paginaDrive.copiaAhora}</button>
          )}
          {!entrar && <button class={btn('ghost')} disabled={cargando} onClick={() => cargar()}>{t.paginaDrive.actualizar}</button>}
        </div>
      </div>

      <div class={`${aviso} mb-5`}>
        {actual ? (
          <>
            <b>{pausado ? t.paginaDrive.autoPausa : t.paginaDrive.autoActivo}</b>{pausado && t.paginaDrive.pausaNota}{t.paginaDrive.autoTexto(actual.nombre, CARPETA_COPIAS)}
            {ultimaCopia ? t.paginaDrive.ultimaCopia(fecha(ultimaCopia.slice(0, 10))) : t.paginaDrive.sinCopia}
          </>
        ) : (
          <>{t.paginaDrive.noEnDrive}</>
        )}
      </div>

      {entrar ? (
        <div class="py-6 text-center">
          <p class={`${muted} mb-3`}>{t.paginaDrive.entrarNota}</p>
          <button class={btn('primary')} disabled={cargando} onClick={() => cargar()}>{t.paginaDrive.entrar}</button>
        </div>
      ) : cargando && !contenido ? (
        <p class={`${muted} py-6 text-center`}>{t.paginaDrive.cargando}</p>
      ) : contenido && (
        <>
          <h3 class={`${etiqueta} mb-1.5`}>{t.elegirDrive.hojas}</h3>
          {contenido.registros.length ? <ul class={`${lista} mb-6`}>{contenido.registros.map(fila)}</ul> : (
            <div class="mb-6">
              <p class={`${muted} mb-3`}>{t.paginaDrive.sinHojas}</p>
              <div class="flex flex-wrap gap-2">
                {onSubir && <button class={btn('primary', 'small')} onClick={onSubir}>{t.elegirDrive.subirAbierto}</button>}
                <button class={btn(onSubir ? 'ghost' : 'primary', 'small')} onClick={onCrear}>{t.elegirDrive.crear}</button>
              </div>
            </div>
          )}
          <h3 class={`${etiqueta} mb-1.5`}>{t.elegirDrive.copias}</h3>
          {contenido.copias.length ? (
            <>
              <p class={`${muted} mb-2 text-xs`}>{t.paginaDrive.copiasNota}</p>
              <ul class={lista}>{contenido.copias.map(fila)}</ul>
            </>
          ) : <p class={muted}>{t.paginaDrive.ninguna}</p>}
        </>
      )}
      {fallo && <p class={`${errorCls} mt-4`} role="alert">{fallo}</p>}
    </section>
  );
}
