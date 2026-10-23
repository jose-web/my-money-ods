// src/components/App.tsx
import { useEffect, useRef, useState } from 'preact/hooks';
import { abrir, guardar, type Datos, type Lado, type Registro } from '../lib/registro.ts';
import { descargar, desdeFile, elegirArchivo, escribir, guardarComo, puedeGuardarEncima, reabrir, type Archivo, type FileHandle } from '../lib/archivo.ts';
import { olvidar, recordar, recuperar, type Recuerdo } from '../lib/recuerdo.ts';
import {
  CARPETA_APP, CARPETA_COPIAS, NoEstaEnDrive, accesoDrive, actualizarDrive, bajarDrive, carpetaApp, conectadoDrive, datosDrive, hayDrive, listarDrive,
  prepararDrive, subirCopia, subirRegistro, type DriveArchivo,
} from '../lib/drive.ts';
import { ElegirDrive } from './ElegirDrive.tsx';
import { PaginaDrive } from './PaginaDrive.tsx';
import { Resumen } from './Resumen.tsx';
import { Estadisticas } from './Estadisticas.tsx';
import { Deudas } from './Deudas.tsx';
import { AjustesForm } from './AjustesForm.tsx';
import { ModalCorreo } from './ModalCorreo.tsx';
import { Chat } from './Chat.tsx';
import { ahoraLocal, fecha, fechaLarga } from '../lib/format.ts';
import { IDIOMAS, idioma, setIdioma, t, type Idioma } from '../lib/i18n.ts';
import { btn, error as errorCls, iconBase, muted } from './ui.ts';

// 'drive' es la página de Google Drive: se llega desde el menú «⋯», no tiene pestaña
type Tab = 'resumen' | 'estadisticas' | Lado | 'ajustes' | 'drive';
// pestaña e icono (trazo SVG de 24×24, para la barra inferior del móvil); el texto y el corto, en t.tabs
const TABS: [Exclude<Tab, 'drive'>, string][] = [
  ['resumen', 'M4 10.5 12 4l8 6.5V20H4zM10 20v-5h4v5'],
  ['estadisticas', 'M4 20V11M10 20V5M16 20v-6M21 20H3'],
  ['debo', 'M12 5v14M6 13l6 6 6-6'],
  ['meDeben', 'M12 19V5M6 11l6-6 6 6'],
  ['ajustes', 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4'],
];
// Pestañas: píldoras en la barra superior; en tablet, en una fila propia; en móvil, barra fija abajo
const NAV = 'flex gap-0.5 rounded-full bg-ink/8 p-0.75 tablet:order-3 tablet:col-span-full tablet:max-w-full tablet:justify-self-start tablet:overflow-x-auto '
  + 'movil:fixed movil:inset-x-0 movil:bottom-0 movil:grid movil:max-w-none movil:grid-cols-5 movil:justify-self-stretch movil:gap-0 movil:overflow-visible '
  + 'movil:rounded-none movil:border-t movil:border-ink/8 movil:bg-paper/85 movil:px-1 movil:pt-1.5 movil:pb-[max(6px,env(safe-area-inset-bottom))] '
  + 'movil:shadow-[0_-10px_30px_-18px_rgba(0,0,0,.35)] movil:backdrop-blur-xl movil:backdrop-saturate-150';
const NAV_TAB = 'cursor-pointer appearance-none rounded-full border-0 px-3.5 py-1.75 text-[13px] font-semibold whitespace-nowrap [-webkit-tap-highlight-color:transparent] '
  + 'group movil:flex movil:min-w-0 movil:flex-col movil:items-center movil:gap-1 movil:rounded-none movil:bg-transparent movil:px-0 movil:py-1 movil:text-[10.5px] movil:font-medium';
// en móvil el icono va en una pastilla, de color solo en la pestaña activa
const NAV_ICONO = 'hidden h-7.5 w-12 max-w-full place-items-center rounded-full transition-[background-color,transform] duration-200 movil:grid movil:group-active:scale-90';

// a partir de cuántos días sin copia de seguridad se avisa
const DIAS_AVISO_COPIA = 60;
// con el archivo en Drive, los cambios se guardan solos tras esta pausa (y, si falla, se reintenta más tarde)
const PAUSA_AUTOGUARDADO = 2500;
const PAUSA_REINTENTO = 30000;
const DONDE_COPIAS = `«${CARPETA_APP} › ${CARPETA_COPIAS}»`;
const ODS_MIME = 'application/vnd.oasis.opendocument.spreadsheet';
const diasDesde = (iso: string): number => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);

interface Copia {
  /** fecha que se apunta si se envía (y que ya lleva dentro el propio archivo) */
  cuando: string;
  archivo: File | null;
  fallo: string;
}

interface Sesion {
  registro: Registro;
  nombre: string;
  handle: FileHandle | null;
  /** el archivo está en Google Drive: «Guardar» guarda allí */
  drive: DriveArchivo | null;
}

/** Un archivo recién abierto: del disco, de una copia o de Google Drive. */
type Abierto = Archivo & { drive?: DriveArchivo | null };

const nombreCopia = (nombre: string, cuando: string): string => `${nombre.replace(/\.ods$/i, '')} (copia ${cuando.slice(0, 10)}).ods`;

export default function App() {
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [datos, setDatos] = useState<Datos | null>(null);
  const [tab, setTab] = useState<Tab>('resumen');
  // al cambiarlo se vuelve a pintar todo (los componentes leen `t`, que ya es el del idioma nuevo)
  const [lengua, setLengua] = useState<Idioma>(idioma);
  /** Con un archivo abierto, el idioma también se apunta en su hoja Ajustes (y se guarda con lo demás). */
  function cambiarIdioma(i: Idioma) {
    setIdioma(i);
    setLengua(i);
    if (datos && datos.ajustes.idioma !== i) cambiar(d => ({ ...d, ajustes: { ...d.ajustes, idioma: i } }));
  }
  useEffect(() => setIdioma(idioma), []);
  // la deuda abierta en cada lado (su clave), o null para ver la lista
  const [abierta, setAbierta] = useState<Record<Lado, string | null>>({ debo: null, meDeben: null });
  // filtro por mes («2026-10»), el mismo en Estadísticas, Debo y Me deben; vacío = todos
  const [mes, setMes] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [drag, setDrag] = useState(false);
  const toastTimer = useRef<number>();
  // al entrar se mira si hay un archivo de otra visita; `pendiente` es uno que necesita permiso para releerse
  const [inicio, setInicio] = useState(true);
  const [pendiente, setPendiente] = useState<Recuerdo | null>(null);
  const [menu, setMenu] = useState(false);
  const [copia, setCopia] = useState<Copia | null>(null);
  // el aviso de copia de seguridad se puede cerrar; vuelve a salir al abrir el archivo otra vez
  const [sinAvisoCopia, setSinAvisoCopia] = useState(false);
  // lista de archivos de Google Drive para elegir uno (null = cerrada)
  const [enDrive, setEnDrive] = useState<{ registros: DriveArchivo[]; copias: DriveArchivo[] } | null>(null);
  // guardado automático en Drive: '' sin novedad; 'parado' si hace falta un clic (entrar en Google o decidir
  // qué hacer porque el archivo cambió en otro dispositivo); 'error' si falló y se reintentará
  const [auto, setAuto] = useState<'' | 'guardando' | 'parado' | 'error'>('');
  // lo último de la sesión y los datos, para el guardado que se lanza con retraso
  const ultimo = useRef({ sesion, datos });
  ultimo.current = { sesion, datos };
  const guardando = useRef(false);

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [dirty]);

  useEffect(() => {
    if (!sesion?.drive || !dirty || auto === 'parado' || auto === 'guardando') return;
    const espera = window.setTimeout(() => guardarEnDrive(false), auto === 'error' ? PAUSA_REINTENTO : PAUSA_AUTOGUARDADO);
    return () => clearTimeout(espera);
  }, [datos, dirty, sesion?.drive?.id, auto]);

  useEffect(() => {
    // la librería de Google se carga ya: la ventana para entrar hay que abrirla dentro del clic
    prepararDrive().catch(() => {});
    (async () => {
      const r = await recuperar();
      if (r?.drive) {
        await retomar(r, false);
      } else if (r?.handle) {
        await retomar(r, false);
      } else if (r?.bytes) {
        await cargar({ nombre: r.nombre, bytes: r.bytes, handle: null }, false);
        avisar(t.app.recuperada(r.nombre, new Date(r.fecha).toLocaleDateString(t.locale)));
      }
    })().finally(() => setInicio(false));
  }, []);

  function avisar(msg: string) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3500);
  }

  async function cargar(a: Abierto | null, recordarlo = true, preguntar = true) {
    if (!a) return;
    if (preguntar && dirty && !confirm(t.app.cambiosAbrir)) return;
    setBusy(true);
    setError('');
    try {
      const { registro, datos } = await abrir(a.bytes);
      setSesion({ registro, nombre: a.nombre, handle: a.handle, drive: a.drive ?? null });
      setDatos(datos);
      // el idioma del archivo manda sobre el del navegador
      if (datos.ajustes.idioma === 'es' || datos.ajustes.idioma === 'en') {
        setIdioma(datos.ajustes.idioma);
        setLengua(datos.ajustes.idioma);
      }
      setDirty(false);
      setTab('resumen');
      setAbierta({ debo: null, meDeben: null });
      setMes('');
      setPendiente(null);
      setSinAvisoCopia(false);
      setAuto('');
      if (recordarlo) recordar({ nombre: a.nombre, handle: a.handle, bytes: a.handle || a.drive ? null : a.bytes, drive: a.drive?.id ?? null });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function retomar(r: Recuerdo, pedir: boolean) {
    if (r.drive) {
      // hay que entrar en Google: sin un token de esta pestaña, solo con un clic («Continuar con…»)
      if (!pedir && !conectadoDrive()) return setPendiente(r);
      const acceso = accesoDrive();
      setBusy(true);
      try {
        await acceso;
        const { archivo, bytes } = await bajarDrive(r.drive);
        setBusy(false);
        return await cargar({ nombre: archivo.nombre, bytes, handle: null, drive: archivo });
      } catch (e) {
        if (e instanceof NoEstaEnDrive) {
          // se borró (o está en la papelera): no tiene sentido seguir ofreciéndolo
          setPendiente(null);
          olvidar();
          setError(t.app.yaNoEstaDrive(r.nombre));
        } else {
          setPendiente(r);
          if (pedir) setError(t.app.noAbrirDrive(r.nombre, (e as Error).message));
        }
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!r.handle) return;
    try {
      const a = await reabrir(r.handle, pedir);
      if (a) return await cargar(a);
      setPendiente(r);
      if (pedir) setError(t.app.sinPermiso(r.nombre));
    } catch {
      setPendiente(null);
      olvidar();
      setError(t.app.noReabrir(r.nombre));
    }
  }

  function cerrar() {
    if (dirty && !confirm(t.app.cambiosCerrar)) return;
    olvidar();
    setSesion(null);
    setDatos(null);
    setDirty(false);
    setError('');
  }

  async function plantilla() {
    const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
    const r = await fetch(`${base}plantilla.ods`);
    await cargar({ nombre: t.app.archivoVacio, bytes: await r.arrayBuffer(), handle: null });
  }

  function cambiar(fn: (d: Datos) => Datos) {
    setDatos(d => (d ? fn(d) : d));
    setDirty(true);
  }

  async function guardarArchivo(copia = false) {
    if (!sesion || !datos) return;
    if (!copia && sesion.drive) return guardarEnDrive(true);
    setBusy(true);
    try {
      const bytes = await guardar(sesion.registro, datos);
      if (!copia && sesion.handle) {
        await escribir(sesion.handle, bytes);
        avisar(t.app.guardadoEn(sesion.nombre));
      } else if (!copia && puedeGuardarEncima()) {
        const handle = await guardarComo(sesion.nombre, bytes);
        if (!handle) return;
        setSesion({ ...sesion, handle, nombre: handle.name });
        recordar({ nombre: handle.name, handle, bytes: null });
        avisar(t.app.guardadoEn(handle.name));
      } else {
        descargar(sesion.nombre, bytes);
        if (!copia) recordar({ nombre: sesion.nombre, handle: null, bytes: bytes.slice().buffer });
        avisar(t.app.descargado);
      }
      if (!copia) setDirty(false);
    } catch (e) {
      setError(t.app.noGuardar((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Guarda encima del archivo de Google Drive. Lo lanza el guardado automático (`manual` = false) o el botón
   * «Guardar». Si alguien lo cambió en Drive desde que se abrió, el automático se para y avisa; el manual
   * pregunta. Después, si hoy no hay copia de seguridad, hace la del día.
   */
  async function guardarEnDrive(manual: boolean) {
    const { sesion: s, datos: d } = ultimo.current;
    if (!s?.drive || !d || guardando.current) return;
    // lo primero: puede abrir la ventana de Google, y eso solo vale dentro de un clic (el automático no puede)
    const acceso = manual || conectadoDrive() ? accesoDrive() : null;
    if (!acceso) {
      setAuto('parado');
      setError(t.app.sesionCaducada);
      return;
    }
    const f = s.drive;
    guardando.current = true;
    setAuto('guardando');
    if (manual) setBusy(true);
    try {
      await acceso;
      const ahora = await datosDrive(f.id);
      if (ahora.modificado !== f.modificado) {
        const aviso = t.app.cambiadoDrive(f.nombre, fechaLarga(ahora.modificado));
        if (!manual || !confirm(t.app.pisar(aviso))) {
          setAuto('parado');
          setError(t.app.pausado(aviso));
          return;
        }
      }
      const nuevo = await actualizarDrive(f.id, await guardar(s.registro, d));
      setSesion(x => (x?.drive?.id === nuevo.id ? { ...x, nombre: nuevo.nombre, drive: nuevo } : x));
      // si se ha cambiado algo mientras se subía, sigue pendiente (y el automático lo volverá a guardar)
      if (ultimo.current.datos === d) setDirty(false);
      setAuto('');
      setError('');
      if (manual) avisar(t.app.guardadoEnDrive(nuevo.nombre));
      if (d.ajustes.copia.slice(0, 10) !== ahoraLocal().slice(0, 10)) await copiaDiaria(s, d);
    } catch (e) {
      if (e instanceof NoEstaEnDrive) {
        // los datos siguen aquí: el archivo pasa a ser local hasta que se vuelva a subir
        setSesion(x => (x?.drive?.id === f.id ? { ...x, drive: null } : x));
        recordar({ nombre: s.nombre, handle: null, bytes: (await guardar(s.registro, d)).slice().buffer, drive: null });
        setAuto('');
        setError(t.app.borradoDeDrive(f.nombre));
      } else {
        setAuto(manual ? '' : 'error');
        setError(t.app.noGuardarDrive((e as Error).message, !manual));
      }
    } finally {
      guardando.current = false;
      if (manual) setBusy(false);
    }
  }

  /** La copia de seguridad del día en Drive (con el archivo en Drive se hace sola al guardar los primeros cambios). */
  async function copiaDiaria(s: Sesion, d: Datos) {
    try {
      const cuando = ahoraLocal();
      await subirCopia(nombreCopia(s.nombre, cuando), await guardar(s.registro, { ...d, ajustes: { ...d.ajustes, copia: cuando } }));
      // la fecha cambia los datos: el guardado automático la guarda enseguida
      copiaHecha(cuando, t.app.copiaDia(DONDE_COPIAS));
    } catch (e) {
      setError(t.app.noCopiaDia((e as Error).message));
    }
  }

  /** Sube el archivo abierto a Google Drive como Hoja de cálculo de Google; desde entonces se guarda allí. */
  async function subirADrive() {
    if (!sesion || !datos) return;
    const acceso = accesoDrive();
    setBusy(true);
    try {
      await acceso;
      const f = await subirRegistro(sesion.nombre, await guardar(sesion.registro, datos));
      setSesion({ ...sesion, nombre: f.nombre, handle: null, drive: f });
      setDirty(false);
      recordar({ nombre: f.nombre, handle: null, bytes: null, drive: f.id });
      setAuto('');
      avisar(t.app.subido(f.nombre, CARPETA_APP));
    } catch (e) {
      setError(t.app.noSubir((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  /** Abre la lista de archivos de Google Drive. */
  async function abrirDeDrive() {
    const acceso = accesoDrive();
    setBusy(true);
    setError('');
    try {
      await acceso;
      const lista = await listarDrive();
      // sin carpeta (la primera vez, o porque se borró): se crea, y la lista ofrecerá crear o subir uno
      if (!lista.carpeta) await carpetaApp();
      setEnDrive(lista);
    } catch (e) {
      setError(t.app.noEntrarDrive((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  /** Archivo nuevo y vacío (la plantilla) en la carpeta de Drive, convertido en Hoja de Google, y lo abre. */
  async function crearEnDrive() {
    if (dirty && !confirm(t.app.cambiosCrear)) return;
    const acceso = accesoDrive();
    setEnDrive(null);
    setBusy(true);
    try {
      await acceso;
      const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
      const bytes = await (await fetch(`${base}plantilla.ods`)).arrayBuffer();
      const f = await subirRegistro(t.app.hojaNueva, new Uint8Array(bytes));
      setBusy(false);
      await cargar({ nombre: f.nombre, bytes, handle: null, drive: f }, true, false);
      avisar(t.app.creado(f.nombre, CARPETA_APP));
    } catch (e) {
      setError(t.app.noCrear((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function elegirDeDrive(f: DriveArchivo) {
    setEnDrive(null);
    setBusy(true);
    try {
      const { archivo, bytes } = await bajarDrive(f.id);
      setBusy(false);
      await cargar({ nombre: archivo.nombre, bytes, handle: null, drive: archivo });
    } catch (e) {
      setError(t.app.noAbrir(f.nombre, (e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  /** Copia de seguridad en la carpeta de copias de Google Drive. */
  async function copiaEnDrive() {
    if (!sesion || !datos) return;
    const acceso = accesoDrive();
    setBusy(true);
    try {
      await acceso;
      const cuando = ahoraLocal();
      const bytes = await guardar(sesion.registro, { ...datos, ajustes: { ...datos.ajustes, copia: cuando } });
      await subirCopia(nombreCopia(sesion.nombre, cuando), bytes);
      copiaHecha(cuando, t.app.copiaEnDrive(DONDE_COPIAS, !sesion.drive));
    } catch (e) {
      setError(t.app.noCopiaDrive((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  /** Prepara el .ods completo (con los cambios sin guardar) para mandarlo por correo como copia de seguridad. */
  async function copiaSeguridad() {
    if (!sesion || !datos) return;
    const cuando = ahoraLocal();
    setCopia({ cuando, archivo: null, fallo: '' });
    try {
      // la copia ya lleva dentro su propia fecha
      const bytes = await guardar(sesion.registro, { ...datos, ajustes: { ...datos.ajustes, copia: cuando } });
      setCopia({ cuando, archivo: new File([bytes as Uint8Array<ArrayBuffer>], nombreCopia(sesion.nombre, cuando), { type: ODS_MIME }), fallo: '' });
    } catch (e) {
      setCopia({ cuando, archivo: null, fallo: t.app.noPrepararCopia((e as Error).message) });
    }
  }

  function copiaHecha(cuando: string, aviso = t.app.copiaEnviada) {
    cambiar(d => ({ ...d, ajustes: { ...d.ajustes, copia: cuando } }));
    avisar(aviso);
  }

  const selectorIdioma = (
    <div class="flex gap-1 rounded-full bg-field p-0.75" role="group" aria-label={t.comun.idioma}>
      {IDIOMAS.map(([id, nombre]) => (
        <button key={id} lang={id} aria-pressed={lengua === id} onClick={() => cambiarIdioma(id)}
          class={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold ${lengua === id ? 'bg-white text-ink shadow-[0_1px_2px_rgba(0,0,0,.15)]' : 'text-muted hover:text-ink'}`}>
          {nombre}
        </button>
      ))}
    </div>
  );

  // ------------------------------------------------------------ sin archivo
  if (inicio && !sesion) return <main class="min-h-screen" />;
  if (!sesion || !datos) {
    return (
      <main
        class={`grid min-h-screen place-items-center px-4 py-6 transition-colors duration-200 ${drag ? 'bg-primary' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={async e => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer?.files[0];
          if (f) await cargar(await desdeFile(f));
        }}
      >
        <div class="w-[min(560px,100%)] rounded-[18px] bg-paper px-10 py-11 shadow-[0_1px_0_var(--color-line),0_30px_60px_-30px_rgba(0,0,0,.25)] movil:px-5.5 movil:py-7.5">
          <div class="flex items-start justify-between gap-3">
            <p class="grid size-14 place-items-center rounded-2xl bg-primary text-[30px] font-bold">€</p>
            {selectorIdioma}
          </div>
          <h1 class="mt-4 mb-3 text-[34px] leading-[1.1] font-bold tracking-[-.02em]">{t.nombre}</h1>
          <p class="mb-6.5 text-[15px] text-ink-2">{t.bienvenida.texto(hayDrive)}</p>
          <div class="mb-3 flex flex-wrap gap-2.5">
            {pendiente && (
              <button class={`${btn('primary', 'big')} movil:w-full`} disabled={busy} onClick={() => retomar(pendiente, true)}>
                {t.bienvenida.continuar(pendiente.nombre, !!pendiente.drive)}
              </button>
            )}
            {hayDrive && <button class={`${btn(pendiente ? 'ghost' : 'primary', 'big')} movil:w-full`} disabled={busy} onClick={abrirDeDrive}>{t.bienvenida.abrirDrive}</button>}
            <button class={`${btn(pendiente || hayDrive ? 'ghost' : 'primary', 'big')} movil:w-full`} disabled={busy} onClick={async () => cargar(await elegirArchivo())}>
              {t.bienvenida.abrirOds}
            </button>
            <button class={`${btn('ghost', 'big')} movil:w-full`} disabled={busy} onClick={plantilla}>{t.bienvenida.vacio}</button>
          </div>
          <p class={`${muted} text-xs`}>{t.bienvenida.arrastra}</p>
          {error && <p class={`${errorCls} mt-2.5`} role="alert">{error}</p>}
        </div>
        {enDrive && <ElegirDrive archivos={enDrive} onElegir={elegirDeDrive} onCrear={crearEnDrive} onCerrar={() => setEnDrive(null)} />}
      </main>
    );
  }

  // ------------------------------------------------------------ app
  // menú «⋯», en bloques: el archivo (disco, descargas, correo), Google Drive (solo si la web tiene configurado
  // Google) y, aparte, cerrar. Los bloques sin título van separados por una raya.
  type Accion = [string, () => unknown];
  const si = (cond: unknown, a: Accion): Accion[] => (cond ? [a] : []);
  const bloques: [string, Accion[]][] = [
    [t.menu.archivo, [
      [t.menu.abrirOtro, async () => cargar(await elegirArchivo())],
      [t.menu.descargar, () => guardarArchivo(true)],
      [t.menu.copiaCorreo, copiaSeguridad],
    ]],
    [t.menu.drive, hayDrive ? [
      [t.menu.abrirDrive, abrirDeDrive],
      ...si(!sesion.drive, [t.menu.subirDrive, subirADrive]),
      ...si(sesion.drive, [t.menu.verHojas, () => window.open(sesion.drive!.enlace, '_blank', 'noopener')]),
      [t.menu.copiaDrive, copiaEnDrive],
      [t.menu.carpetaDrive, () => setTab('drive')],
    ] : []],
    ['', [[t.menu.cerrarArchivo, cerrar]]],
  ];
  const irA = (lado: Lado, id: string | null) => { setAbierta(a => ({ ...a, [lado]: id })); setTab(lado); };
  const diasCopia = datos.ajustes.copia ? diasDesde(datos.ajustes.copia) : null;
  const avisoCopia = !sinAvisoCopia && !sesion.drive && (diasCopia === null || diasCopia >= DIAS_AVISO_COPIA);
  const emailCopia = datos.ajustes.copiaEmail.trim();
  return (
    <div>
      <header class="sticky top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-primary px-5 pt-[calc(10px+env(safe-area-inset-top))] pb-2.5 text-ink tablet:grid-cols-[1fr_auto] movil:gap-2 movil:px-3">
        <span class="flex min-w-0 items-center gap-2 text-lg font-bold tracking-[-.01em]">
          <span class="grid size-8 shrink-0 place-items-center rounded-[10px] bg-ink text-base text-primary">€</span>
          <span class="truncate">{t.nombre}</span>
        </span>
        {/* tablet: fila propia bajo la barra; móvil: barra fija abajo, translúcida como las de iOS, con la
            pestaña activa en una pastilla y por encima de la barrita de inicio del iPhone (zona segura) */}
        <nav class={NAV} role="tablist">
          {TABS.map(([id, icono]) => {
            const activa = tab === id;
            const [label, corto] = t.tabs[id];
            return (
              <button key={id} role="tab" aria-selected={activa} onClick={() => { if (activa && (id === 'debo' || id === 'meDeben')) setAbierta(a => ({ ...a, [id]: null })); setTab(id); }}
                class={`${NAV_TAB} ${activa ? 'bg-white text-ink movil:font-semibold' : 'bg-transparent text-ink-2 hover:text-ink movil:text-muted'}`}>
                <span class={`${NAV_ICONO} ${activa ? 'movil:bg-primary movil:text-ink' : ''}`}>
                  <svg class="size-5.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={activa ? 2 : 1.7} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={icono} /></svg>
                </span>
                <span class="movil:hidden">{label}</span><span class="hidden movil:inline">{corto}</span>
              </button>
            );
          })}
        </nav>
        <div class="flex justify-end gap-2">
          <button class={btn('white')} disabled={busy || !dirty || auto === 'guardando'} onClick={() => guardarArchivo(false)}>
            {busy || auto === 'guardando' ? t.barra.guardando : dirty ? t.barra.guardar : sesion.drive ? t.barra.guardadoDrive : t.barra.guardado}
          </button>
          {/* las acciones de archivo van en un menú, que también dice qué archivo está abierto */}
          <div class="relative">
            <button class={`${btn('bar')} px-3`} aria-label={t.barra.masAcciones} aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(m => !m)}>⋯</button>
            {menu && (
              <>
                <div class="fixed inset-0" onClick={() => setMenu(false)} />
                <div class="absolute top-full right-0 mt-2 flex max-h-[calc(100dvh-90px)] w-64 flex-col overflow-y-auto rounded-xl bg-paper p-1.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)]" role="menu">
                  {/* qué archivo está abierto y dónde */}
                  <div class="px-3 pt-1.5 pb-2.5 text-xs text-muted">
                    <p class="truncate text-[13px] font-semibold text-ink" title={sesion.nombre}>{sesion.nombre}</p>
                    <p>{sesion.drive ? (sesion.drive.hoja ? t.menu.hojaGoogle : t.menu.enDrive) : t.menu.enDispositivo}</p>
                    <p>{datos.ajustes.copia ? t.menu.ultimaCopia(fecha(datos.ajustes.copia.slice(0, 10))) : t.menu.sinCopias}</p>
                  </div>
                  {bloques.filter(([, acciones]) => acciones.length).map(([titulo, acciones]) => (
                    <div key={titulo || 'fin'} class="border-t border-line pt-1 pb-0.5" role="group" aria-label={titulo || undefined}>
                      {titulo && <p class="px-3 pt-1.5 pb-0.5 text-[11px] font-bold tracking-[.08em] text-muted uppercase">{titulo}</p>}
                      {acciones.map(([texto, accion]) => (
                        <button key={texto} role="menuitem" class="w-full cursor-pointer rounded-lg px-3 py-2.5 text-left text-[15px] hover:bg-field disabled:opacity-35"
                          disabled={busy} onClick={() => { setMenu(false); accion(); }}>{texto}</button>
                      ))}
                    </div>
                  ))}
                  <div class="flex items-center justify-between gap-2 border-t border-line px-3 pt-2.5 pb-1.5">
                    <span class="text-[11px] font-bold tracking-[.08em] text-muted uppercase">{t.comun.idioma}</span>
                    {selectorIdioma}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div class="flex items-center justify-between bg-danger px-5 py-2.5 text-white" role="alert">
          {error}<button class={`${iconBase} text-white`} onClick={() => setError('')}>×</button>
        </div>
      )}

      {avisoCopia && (
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-primary/45 px-5 py-2.5 text-ink movil:px-3" role="alert">
          <span class="mr-auto text-sm">
            {diasCopia === null
              ? t.aviso.nuncaCopia
              : t.aviso.haceDias(diasCopia, fecha(datos.ajustes.copia.slice(0, 10)))}
          </span>
          <button class={btn('ghost', 'small')} onClick={copiaSeguridad}>{t.aviso.copiaCorreo}</button>
          {hayDrive && <button class={btn('ghost', 'small')} disabled={busy} onClick={copiaEnDrive}>{t.aviso.copiaDrive}</button>}
          <button class={iconBase} title={t.aviso.ocultar} onClick={() => setSinAvisoCopia(true)}>×</button>
        </div>
      )}

      <main class="mx-auto max-w-295 px-5 pt-6 pb-20 movil:px-3 movil:pt-3.5 movil:pb-[calc(96px+env(safe-area-inset-bottom))]">
        {tab === 'resumen' && <Resumen datos={datos} onIr={irA} />}
        {tab === 'estadisticas' && <Estadisticas datos={datos} mes={mes} onMes={setMes} onIr={irA} />}
        {(tab === 'debo' || tab === 'meDeben') && (
          <Deudas key={tab} lado={tab} deudas={datos.deudas} onChange={deudas => cambiar(d => ({ ...d, deudas }))}
            abierta={abierta[tab]} onAbrir={id => setAbierta(a => ({ ...a, [tab]: id }))} mes={mes} onMes={setMes} />
        )}
        {tab === 'ajustes' && <AjustesForm ajustes={datos.ajustes} onChange={ajustes => cambiar(d => ({ ...d, ajustes }))} idioma={selectorIdioma} />}
        {tab === 'drive' && (
          <PaginaDrive actual={sesion.drive} ultimaCopia={datos.ajustes.copia} pausado={auto === 'parado'} onAbrir={elegirDeDrive}
            onCrear={crearEnDrive} onSubir={sesion.drive ? undefined : subirADrive}
            onCopia={copiaEnDrive} />
        )}
      </main>

      {enDrive && (
        <ElegirDrive archivos={enDrive} onElegir={elegirDeDrive} onCrear={crearEnDrive}
          onSubir={sesion.drive ? undefined : () => { setEnDrive(null); subirADrive(); }} onCerrar={() => setEnDrive(null)} />
      )}

      {copia && (
        <ModalCorreo
          titulo={t.correoCopia.titulo}
          archivos={copia.archivo ? [copia.archivo] : []} total={1} adjuntos={t.correoCopia.adjuntos} fallo={copia.fallo}
          para={emailCopia}
          notaPara={emailCopia ? t.correoCopia.paraAjustes : t.correoCopia.paraVacio}
          asunto={t.correoCopia.asunto(sesion.nombre, fecha(copia.cuando.slice(0, 10)))}
          mensaje={t.correoCopia.mensaje(sesion.nombre, fecha(copia.cuando.slice(0, 10)), copia.cuando.slice(11))}
          onEnviado={() => copiaHecha(copia.cuando)}
          onCerrar={() => setCopia(null)}
        />
      )}

      <Chat datos={datos} />

      {toast && (
        <div class="fixed bottom-5.5 left-1/2 z-60 w-max max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full bg-primary px-4.5 py-2.75 text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,.5)] movil:bottom-[calc(80px+env(safe-area-inset-bottom))] movil:rounded-2xl movil:text-center" role="status">{toast}</div>
      )}
    </div>
  );
}
