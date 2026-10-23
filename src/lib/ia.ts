// src/lib/ia.ts
// IA integrada en el navegador (Prompt API de Chrome, con el modelo Gemini Nano): funciona en el propio dispositivo,
// sin servidor y sin que los datos salgan de él, como el resto de la web.
//
// La API actual es el global `LanguageModel` (availability → 'unavailable' | 'downloadable' | 'downloading' |
// 'available'; create con `initialPrompts`, el primero con rol 'system'). La de las primeras pruebas era
// `window.ai.languageModel` (capabilities → 'readily' | 'after-download' | 'no'; create con `systemPrompt`): se admite
// también, por si el navegador aún trae esa. Si no hay ninguna, la web funciona igual, sin IA.
//
// El modelo se descarga la primera vez (varios GB) y el navegador solo deja empezar la descarga dentro de un clic:
// por eso `crearSesion` se llama desde un botón.

export type EstadoIA = 'sin-api' | 'no-disponible' | 'descargable' | 'descargando' | 'lista';

export interface Turno {
  rol: 'user' | 'assistant';
  texto: string;
}

interface Opciones {
  /** instrucciones y datos para el modelo */
  sistema: string;
  /** conversación anterior, para seguirla en una sesión nueva */
  historial?: Turno[];
  idioma: string;
  /** progreso de la descarga del modelo, de 0 a 1 */
  onProgreso?: (fraccion: number) => void;
  signal?: AbortSignal;
}

/** Lo que la web usa de una sesión, sea de la API actual o de la antigua. */
export interface SesionIA {
  /** responde a `texto`, llamando a `onTrozo` con la respuesta acumulada según se genera */
  responder(texto: string, onTrozo: (acumulado: string) => void, signal?: AbortSignal): Promise<string>;
  cerrar(): void;
}

interface Sesion {
  prompt(texto: string, o?: { signal?: AbortSignal }): Promise<string>;
  promptStreaming(texto: string, o?: { signal?: AbortSignal }): ReadableStream<string> | AsyncIterable<string>;
  destroy(): void;
}
type Monitor = { addEventListener(tipo: 'downloadprogress', fn: (e: { loaded: number; total?: number }) => void): void };
interface ApiActual {
  availability(o?: object): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(o: object): Promise<Sesion>;
}
interface ApiAntigua {
  capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no' }>;
  create(o: object): Promise<Sesion>;
}
type ConIA = typeof globalThis & { LanguageModel?: ApiActual; ai?: { languageModel?: ApiAntigua } };

const actual = (): ApiActual | undefined => (globalThis as ConIA).LanguageModel;
const antigua = (): ApiAntigua | undefined => (globalThis as ConIA).ai?.languageModel;
export const hayApiIA = (): boolean => !!actual() || !!antigua();

// Gemini Nano entiende y escribe en inglés, español y japonés: se le dice cuál se espera
const idiomas = (idioma: string) => ({
  expectedInputs: [{ type: 'text', languages: [idioma] }],
  expectedOutputs: [{ type: 'text', languages: [idioma] }],
});

export async function estadoIA(idioma: string): Promise<EstadoIA> {
  try {
    const api = actual();
    if (api) {
      const e = await api.availability(idiomas(idioma)).catch(() => api.availability());
      return e === 'available' ? 'lista' : e === 'downloadable' ? 'descargable' : e === 'downloading' ? 'descargando' : 'no-disponible';
    }
    const vieja = antigua();
    if (vieja) {
      const { available } = await vieja.capabilities();
      return available === 'readily' ? 'lista' : available === 'after-download' ? 'descargable' : 'no-disponible';
    }
  } catch {
    return 'no-disponible';
  }
  return 'sin-api';
}

/** Abre una sesión (y, si hace falta, descarga el modelo: llámala dentro de un clic). */
export async function crearSesion({ sistema, historial = [], idioma, onProgreso, signal }: Opciones): Promise<SesionIA> {
  const monitor = (m: Monitor) => m.addEventListener('downloadprogress', e => onProgreso?.(e.total ? e.loaded / e.total : e.loaded));
  const turnos = historial.map(h => ({ role: h.rol, content: h.texto }));
  let s: Sesion;
  const api = actual();
  if (api) {
    const base = { initialPrompts: [{ role: 'system', content: sistema }, ...turnos], monitor, signal };
    // si el navegador no acepta la lista de idiomas, se intenta sin ella
    s = await api.create({ ...base, ...idiomas(idioma) }).catch(e => {
      if ((e as Error).name === 'AbortError') throw e;
      return api.create(base);
    });
  } else {
    const vieja = antigua();
    if (!vieja) throw new Error('sin-api');
    s = await vieja.create({ systemPrompt: sistema, initialPrompts: turnos, monitor, signal });
  }
  return envolver(s);
}

function envolver(s: Sesion): SesionIA {
  return {
    async responder(texto, onTrozo, signal) {
      let acumulado = '';
      const flujo = s.promptStreaming(texto, { signal });
      const iterable: AsyncIterable<string> = Symbol.asyncIterator in flujo
        ? flujo as AsyncIterable<string>
        : leer((flujo as ReadableStream<string>).getReader());
      for await (const trozo of iterable) {
        // las primeras versiones mandaban la respuesta entera hasta ese momento; las de ahora, solo lo nuevo
        acumulado = acumulado && trozo.startsWith(acumulado) ? trozo : acumulado + trozo;
        onTrozo(acumulado);
      }
      return acumulado;
    },
    cerrar: () => s.destroy(),
  };
}

async function* leer(r: ReadableStreamDefaultReader<string>): AsyncIterable<string> {
  for (;;) {
    const { done, value } = await r.read();
    if (done) return;
    yield value;
  }
}

/** El modelo no admite tanto texto: hay que probar con menos datos. */
export const noCabe = (e: unknown): boolean => /quota|too ?large|exceed/i.test(`${(e as Error)?.name} ${(e as Error)?.message}`);

/**
 * Abre una sesión con el primer texto de datos que quepa (`sistemaCon` arma las instrucciones con cada uno):
 * si el modelo dice que no cabe, prueba con el siguiente, más corto.
 */
export async function crearSesionConDatos(o: Omit<Opciones, 'sistema'> & { versiones: string[]; sistemaCon: (datos: string) => string }): Promise<SesionIA> {
  for (let i = 0; ; i++) {
    try {
      return await crearSesion({ ...o, sistema: o.sistemaCon(o.versiones[i]) });
    } catch (e) {
      if (!noCabe(e) || i >= o.versiones.length - 1) throw e;
    }
  }
}

/** Abre una sesión, responde a una sola pregunta y la cierra (para textos sueltos, como la explicación de una estimación). */
export async function preguntarUnaVez(o: Opciones & { pregunta: string; onTrozo: (acumulado: string) => void }): Promise<string> {
  const s = await crearSesion(o);
  try {
    return await s.responder(o.pregunta, o.onTrozo, o.signal);
  } finally {
    s.cerrar();
  }
}
