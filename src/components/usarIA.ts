// src/components/usarIA.ts
// Estado de la IA del navegador compartido por el chat, la explicación de las estimaciones y Ajustes: se mira una
// vez y, si alguno descarga el modelo, todos ven el progreso.
import { useEffect, useState } from 'preact/hooks';
import { crearSesion, estadoIA, hayApiIA, type EstadoIA } from '../lib/ia.ts';
import { idioma } from '../lib/i18n.ts';

interface Estado {
  /** null mientras se comprueba */
  estado: EstadoIA | null;
  /** progreso de la descarga, de 0 a 1 */
  progreso: number;
  error: string;
}

let actual: Estado = { estado: hayApiIA() ? null : 'sin-api', progreso: 0, error: '' };
let comprobando: Promise<void> | null = null;
const avisar = new Set<(e: Estado) => void>();

function poner(cambio: Partial<Estado>) {
  actual = { ...actual, ...cambio };
  avisar.forEach(fn => fn(actual));
}

function comprobar() {
  comprobando ??= estadoIA(idioma).then(estado => poner({ estado }), () => poner({ estado: 'no-disponible' }));
}

/**
 * Descarga el modelo (si hace falta) creando una sesión de prueba. Tiene que llamarse dentro de un clic: el
 * navegador no deja empezar la descarga sin uno.
 */
export async function activarIA(): Promise<void> {
  poner({ estado: 'descargando', progreso: 0, error: '' });
  try {
    const s = await crearSesion({ sistema: '.', idioma, onProgreso: progreso => poner({ progreso }) });
    s.cerrar();
    poner({ estado: 'lista' });
  } catch (e) {
    poner({ estado: await estadoIA(idioma), error: (e as Error).message });
  }
}

export function usarIA(): Estado {
  const [e, setE] = useState(actual);
  useEffect(() => {
    avisar.add(setE);
    comprobar();
    setE(actual);
    return () => { avisar.delete(setE); };
  }, []);
  return e;
}
