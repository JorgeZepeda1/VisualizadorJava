// Controles de reproducción (tarea 4.12, REQ-VIS-012): reiniciar, atrás, adelante, fin, reproducir/pausa, velocidad ajustable y un deslizador «Paso X de Y». Operables solo con teclado: flechas
// izquierda/derecha para atrás/adelante, Inicio/Fin para los extremos y espacio para reproducir o pausar — siempre que el foco NO esté en un campo de texto, un selector, un deslizador o un
// botón (para no pisar lo que esos elementos ya hacen con esas teclas). Cada botón lleva el glifo Y la palabra, y anuncia su atajo con `aria-keyshortcuts`. Presentacional: recibe la posición
// y emite acciones; el contenedor las convierte en cambios de estado.
import { useEffect, useId, useRef, type Ref } from 'react';
import { textosControles, type NivelDeVelocidad } from '../../textos/es-MX/controles.ts';
import { textosInterfaz } from '../../textos/es-MX/interfaz.ts';

const NIVELES_DE_VELOCIDAD: readonly NivelDeVelocidad[] = [1, 2, 3, 4, 5];

export interface PropiedadesBarraControles {
  readonly paso: number;
  readonly total: number;
  readonly reproduciendo: boolean;
  readonly velocidad: NivelDeVelocidad;
  readonly alReiniciar: () => void;
  readonly alAnterior: () => void;
  readonly alSiguiente: () => void;
  readonly alFin: () => void;
  readonly alReproducirOPausar: () => void;
  readonly alIrAlPaso: (paso: number) => void;
  readonly alCambiarVelocidad: (velocidad: NivelDeVelocidad) => void;
  /** Para que el contenedor pueda llevar el foco a «Siguiente» (al empezar y tras escribir un dato). */
  readonly refSiguiente?: Ref<HTMLButtonElement>;
}

/** ¿Es un elemento donde las flechas, Inicio y Fin ya significan otra cosa (editar texto, mover un deslizador, elegir una opción)? */
function esCampoQueUsaLasTeclas(objetivo: EventTarget | null): boolean {
  if (!(objetivo instanceof Element)) return false;
  if (objetivo.closest('input, textarea, select') !== null) return true;
  return objetivo.closest('[contenteditable="true"], [contenteditable=""]') !== null;
}

/** ¿Es un elemento que la barra espaciadora activa por sí mismo (un botón, un enlace)? */
function esActivablePorEspacio(objetivo: EventTarget | null): boolean {
  return objetivo instanceof Element && objetivo.closest('button, a[href], summary, [role="button"]') !== null;
}

function useAtajosDeTeclado(acciones: Pick<PropiedadesBarraControles, 'alReiniciar' | 'alAnterior' | 'alSiguiente' | 'alFin' | 'alReproducirOPausar'>): void {
  const accionesRef = useRef(acciones);
  accionesRef.current = acciones;
  useEffect(() => {
    function alPulsar(evento: KeyboardEvent): void {
      if (evento.defaultPrevented || evento.ctrlKey || evento.metaKey || evento.altKey) return;
      if (esCampoQueUsaLasTeclas(evento.target)) return;
      const actuales = accionesRef.current;
      switch (evento.key) {
        case 'ArrowRight':
          evento.preventDefault();
          actuales.alSiguiente();
          return;
        case 'ArrowLeft':
          evento.preventDefault();
          actuales.alAnterior();
          return;
        case 'Home':
          evento.preventDefault();
          actuales.alReiniciar();
          return;
        case 'End':
          evento.preventDefault();
          actuales.alFin();
          return;
        case ' ':
          if (esActivablePorEspacio(evento.target)) return;
          evento.preventDefault();
          actuales.alReproducirOPausar();
          return;
      }
    }
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);
}

export function BarraControles({
  paso,
  total,
  reproduciendo,
  velocidad,
  alReiniciar,
  alAnterior,
  alSiguiente,
  alFin,
  alReproducirOPausar,
  alIrAlPaso,
  alCambiarVelocidad,
  refSiguiente,
}: PropiedadesBarraControles) {
  useAtajosDeTeclado({ alReiniciar, alAnterior, alSiguiente, alFin, alReproducirOPausar });
  const idDeVelocidad = useId();
  const idDeLaAyuda = useId();
  const alPrincipio = paso <= 0;
  const alFinal = paso >= total;
  const textoDelPaso = textosControles.valorDelDeslizador(paso, total);

  return (
    <div className="barra-controles" role="group" aria-label={textosControles.etiquetaDelGrupo()} aria-describedby={idDeLaAyuda}>
      <button type="button" onClick={alReiniciar} disabled={alPrincipio} aria-keyshortcuts="Home">
        {textosControles.botonReiniciar()}
      </button>
      <button type="button" onClick={alAnterior} disabled={alPrincipio} aria-keyshortcuts="ArrowLeft">
        {textosInterfaz.botonAnterior()}
      </button>
      <button type="button" ref={refSiguiente} onClick={alSiguiente} disabled={alFinal} aria-keyshortcuts="ArrowRight">
        {textosInterfaz.botonSiguiente()}
      </button>
      <button type="button" onClick={alFin} disabled={alFinal} aria-keyshortcuts="End">
        {textosControles.botonFin()}
      </button>
      <button type="button" onClick={alReproducirOPausar} disabled={!reproduciendo && alFinal} aria-keyshortcuts="Space">
        {reproduciendo ? textosControles.botonPausar() : textosControles.botonReproducir()}
      </button>
      <span className="selector-de-velocidad">
        <label htmlFor={idDeVelocidad}>{textosControles.etiquetaDeVelocidad()}</label>{' '}
        <select id={idDeVelocidad} value={velocidad} onChange={(evento) => alCambiarVelocidad(Number(evento.target.value) as NivelDeVelocidad)}>
          {NIVELES_DE_VELOCIDAD.map((nivel) => (
            <option key={nivel} value={nivel}>
              {textosControles.nombreDeVelocidad(nivel)}
            </option>
          ))}
        </select>
      </span>
      <span className="posicion">
        <input
          type="range"
          min={0}
          max={total}
          value={paso}
          aria-label={textosControles.etiquetaDelDeslizador()}
          aria-valuetext={textoDelPaso}
          onChange={(evento) => alIrAlPaso(Number(evento.target.value))}
        />{' '}
        <span className="paso-de-total">{textoDelPaso}</span>
      </span>
      <p id={idDeLaAyuda} className="ayuda-de-atajos">
        {textosControles.ayudaDeAtajos()}
      </p>
    </div>
  );
}
