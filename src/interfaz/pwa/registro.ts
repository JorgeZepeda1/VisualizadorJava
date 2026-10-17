// Registro del service worker y vigilancia de versiones nuevas (design.md §1.2 "pwa/", ADR 014; tareas 0.11 y 5.7, REQ-PLAT-008).
//
// Registra el service worker que genera `vite-plugin-pwa` (con `registerType: 'prompt'`: una versión nueva se instala en segundo plano pero NO se activa sola) respetando `BASE_URL`, para que la ruta
// y el alcance sean los de la subruta de GitHub Pages (`/VisualizadorJava/`, P1). Degrada sin lanzar cuando el navegador no lo soporta o el registro falla (en desarrollo no hay `sw.js`): la app
// nunca deja de cargar por eso (C12).
//
// Versión nueva: busca una al cargar y cada hora, y cuando hay un worker nuevo instalado Y la página ya tenía uno al mando (en la primera visita instalar el worker no es una actualización) la
// ofrece con `alHaberVersionNueva`. NO la activa sola: recargar le borra al alumno el programa del editor. Solo si la persona acepta (la función que recibe el aviso) le manda `SKIP_WAITING` al
// worker nuevo —el mensaje que entiende el `sw.js` generado— y recarga la página cuando el worker nuevo toma el mando. Un cambio de mando que la persona no pidió (otra pestaña aceptó) no recarga.

/** El mensaje con el que el `sw.js` de `vite-plugin-pwa` (registerType 'prompt') sabe que debe saltarse la espera. */
const MENSAJE_PARA_ACTIVAR = { type: 'SKIP_WAITING' } as const;

const UNA_HORA_MS = 60 * 60 * 1000;

export interface OpcionesDeRegistro {
  /** Se llama cuando hay una versión nueva lista. Recibe la función que la activa y recarga; solo hay que llamarla si la persona acepta. */
  readonly alHaberVersionNueva?: (aplicar: () => void) => void;
  /** Ruta base del sitio; por omisión la de Vite (`BASE_PUBLICA`). */
  readonly base?: string;
  /** Cómo recargar la página; por omisión `location.reload()`. */
  readonly recargar?: () => void;
  /** Cada cuánto buscar una versión nueva; por omisión una hora. */
  readonly cadaMs?: number;
}

/** Registra el service worker y vigila las versiones nuevas. Devuelve la función que detiene la vigilancia (el temporizador y los oyentes). */
export function registrarServiceWorker(navegador: Navigator = navigator, opciones: OpcionesDeRegistro = {}): () => void {
  if (!('serviceWorker' in navegador)) return () => undefined;

  const { alHaberVersionNueva, base = import.meta.env.BASE_URL, recargar = () => window.location.reload(), cadaMs = UNA_HORA_MS } = opciones;
  const contenedor = navegador.serviceWorker;
  let detenido = false;
  let temporizador: ReturnType<typeof setInterval> | undefined;
  let recargarAlTomarElMando = false;

  const alCambiarElMando = (): void => {
    if (!recargarAlTomarElMando) return;
    recargarAlTomarElMando = false;
    recargar();
  };
  contenedor.addEventListener('controllerchange', alCambiarElMando);

  const ofrecer = (registro: ServiceWorkerRegistration, nuevo: ServiceWorker): void => {
    if (detenido) return;
    alHaberVersionNueva?.(() => {
      recargarAlTomarElMando = true;
      (registro.waiting ?? nuevo).postMessage(MENSAJE_PARA_ACTIVAR);
    });
  };

  const vigilar = (registro: ServiceWorkerRegistration): void => {
    // Solo es una actualización si la página ya tenía un worker al mando: instalar el primero (primera visita) no lo es.
    const ofrecerSiYaSeInstalo = (registrado: ServiceWorker): void => {
      if (registrado.state === 'installed' && contenedor.controller) ofrecer(registro, registrado);
    };
    const seguir = (nuevo: ServiceWorker): void => nuevo.addEventListener('statechange', () => ofrecerSiYaSeInstalo(nuevo));

    // Un worker que ya esperaba desde una visita anterior, o que el navegador ya había empezado a instalar al recargar (el `updatefound` pasó antes de que este código se enterara del registro).
    if (registro.waiting) {
      if (contenedor.controller) ofrecer(registro, registro.waiting);
    } else if (registro.installing) seguir(registro.installing);

    registro.addEventListener('updatefound', () => {
      if (registro.installing) seguir(registro.installing);
    });

    const buscar = (): void => {
      registro.update().catch(() => undefined); // sin red no pasa nada: se vuelve a intentar en una hora
    };
    buscar();
    temporizador = setInterval(buscar, cadaMs);
  };

  contenedor
    .register(`${base}sw.js`, { scope: base })
    .then((registro) => {
      if (!detenido) vigilar(registro);
    })
    .catch(() => undefined);

  return () => {
    detenido = true;
    clearInterval(temporizador);
    contenedor.removeEventListener('controllerchange', alCambiarElMando);
  };
}
