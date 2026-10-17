// Perro guardián del cliente (tarea 3.6, ADR 007 punto 4, design.md §5). Es solo el RELOJ de dos plazos; qué hacer al vencer lo decide `cliente.ts`:
//   - silencio: si pasan 2 s sin que el trabajador mande un solo mensaje MIENTRAS CALCULA, el cliente lo termina y activa el de repuesto. El trabajador cede el turno cada ≤ 8 ms y manda pasos cada
//     ≤ 16 ms, así que 2 s de silencio solo pueden ser un trabajador atorado (un ciclo del que el límite cooperativo no lo sacó, o un fallo del motor);
//   - acuse: tras un `detener`, el trabajador tiene 300 ms para responder `detenido`; si no, también se termina.
// No vigila cuando el programa espera una línea del alumno (eso puede tardar lo que sea) ni cuando ya terminó.

/** Cuánto silencio del trabajador mientras calcula se tolera (ADR 007 punto 4). */
export const SILENCIO_MAXIMO_MS = 2_000;
/** Cuánto se espera el `detenido` que acusa un `detener` (design.md §5). */
export const ACUSE_MAXIMO_MS = 300;

export interface PerroGuardian {
  /** El trabajador está calculando: si pasan `SILENCIO_MAXIMO_MS` sin un `latido`, vence el silencio. Volver a llamarla reinicia el plazo. */
  vigilar(): void;
  /** Llegó un mensaje del trabajador: si se está vigilando, el plazo vuelve a empezar completo. */
  latido(): void;
  /** Ya no hay nada que vigilar (espera una línea del alumno, o terminó). */
  descansar(): void;
  /** Se mandó `detener`: si no llega el acuse en `ACUSE_MAXIMO_MS`, vence el plazo del acuse. */
  esperarAcuse(): void;
  /** Llegó el acuse (o ya no importa): se cancela el plazo. */
  acuseRecibido(): void;
}

export interface OpcionesDelPerroGuardian {
  readonly alVencerElSilencio: () => void;
  readonly alVencerElAcuse: () => void;
}

export function crearPerroGuardian({ alVencerElSilencio, alVencerElAcuse }: OpcionesDelPerroGuardian): PerroGuardian {
  let silencio: ReturnType<typeof setTimeout> | null = null;
  let acuse: ReturnType<typeof setTimeout> | null = null;

  const quitarSilencio = (): void => {
    if (silencio !== null) clearTimeout(silencio);
    silencio = null;
  };
  const quitarAcuse = (): void => {
    if (acuse !== null) clearTimeout(acuse);
    acuse = null;
  };
  const armarSilencio = (): void => {
    quitarSilencio();
    silencio = setTimeout(() => {
      silencio = null;
      alVencerElSilencio();
    }, SILENCIO_MAXIMO_MS);
  };

  return {
    vigilar: armarSilencio,
    latido() {
      if (silencio !== null) armarSilencio();
    },
    descansar: quitarSilencio,
    esperarAcuse() {
      quitarAcuse();
      acuse = setTimeout(() => {
        acuse = null;
        alVencerElAcuse();
      }, ACUSE_MAXIMO_MS);
    },
    acuseRecibido: quitarAcuse,
  };
}
