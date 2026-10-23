// src/components/ElegirDrive.tsx
// Lista de registros de Google Drive para abrir uno. Solo salen los que ha subido la propia web
// (permiso `drive.file`: ver src/lib/drive.ts).
import { CARPETA_APP, type DriveArchivo } from '../lib/drive.ts';
import { fechaLarga } from '../lib/format.ts';
import { btn, muted } from './ui.ts';
import { t } from '../lib/i18n.ts';

interface Props {
  archivos: { registros: DriveArchivo[]; copias: DriveArchivo[] };
  onElegir(a: DriveArchivo): void;
  /** crea un registro nuevo (vacío, de la plantilla) en la carpeta de Drive y lo abre */
  onCrear(): void;
  /** sube el registro abierto (si hay uno abierto que no esté ya en Drive) */
  onSubir?: () => void;
  onCerrar(): void;
}

const titulo = 'mb-1.5 text-[11px] font-bold tracking-[.08em] text-muted uppercase';

export function ElegirDrive({ archivos: { registros, copias }, onElegir, onCrear, onSubir, onCerrar }: Props) {
  const fila = (a: DriveArchivo) => (
    <li key={a.id} class="flex items-center gap-3 border-b border-line py-2.5">
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold" title={a.nombre}>{a.nombre}</p>
        <p class={`${muted} text-xs`}>{a.hoja ? t.elegirDrive.hojaGoogle : t.elegirDrive.archivoOds} · {t.elegirDrive.modificado(fechaLarga(a.modificado))}</p>
      </div>
      <button class={btn('primary', 'small')} onClick={() => onElegir(a)}>{t.elegirDrive.abrir}</button>
    </li>
  );
  return (
    <div class="fixed inset-0 z-50 grid place-items-center bg-ink/55 p-5 movil:p-0" role="dialog" aria-modal="true" aria-label={t.elegirDrive.titulo}
      onKeyDown={e => { if (e.key === 'Escape') onCerrar(); }}>
      {/* en móvil ocupa toda la pantalla */}
      <div class="flex max-h-[calc(100dvh-40px)] w-[min(560px,100%)] flex-col overflow-hidden rounded-[14px] bg-paper movil:h-dvh movil:max-h-none movil:rounded-none movil:pb-[env(safe-area-inset-bottom)]">
        <div class="flex items-center justify-between gap-3 bg-primary py-2.5 pr-3.5 pl-5 text-ink movil:px-3 movil:pt-[calc(10px+env(safe-area-inset-top))]">
          <span class="min-w-0 truncate font-bold">{t.elegirDrive.titulo}</span>
          <button type="button" class={btn('bar')} onClick={onCerrar}>{t.comun.cerrar}</button>
        </div>
        <div class="overflow-auto p-5.5 movil:p-4">
          {registros.length === 0 && (
            // sin registros (la primera vez, o porque se borró la carpeta): la carpeta ya se ha creado; falta el registro
            <div class="mb-5 rounded-lg bg-field px-4 py-3.5">
              <p class="mb-3">{t.elegirDrive.vacio(CARPETA_APP)}</p>
              <div class="flex flex-wrap gap-2 movil:flex-col">
                {onSubir && <button class={btn('primary')} onClick={onSubir}>{t.elegirDrive.subirAbierto}</button>}
                <button class={btn(onSubir ? 'ghost' : 'primary')} onClick={onCrear}>{t.elegirDrive.crear}</button>
              </div>
              <p class={`${muted} mt-3 text-xs`}>{t.elegirDrive.ayudaVacio}</p>
            </div>
          )}
          {registros.length + copias.length > 0 && (
            <>
              {registros.length > 0 && (
                <section class="mb-5">
                  <h3 class={titulo}>{t.elegirDrive.hojas}</h3>
                  <ul class="border-t border-line">{registros.map(fila)}</ul>
                </section>
              )}
              {copias.length > 0 && (
                <section>
                  <h3 class={titulo}>{t.elegirDrive.copias}</h3>
                  <p class={`${muted} mb-2 text-xs`}>{t.elegirDrive.copiasNota}</p>
                  <ul class="border-t border-line">{copias.map(fila)}</ul>
                </section>
              )}
              <p class={`${muted} mt-3 text-xs`}>{t.elegirDrive.soloSubidas}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
