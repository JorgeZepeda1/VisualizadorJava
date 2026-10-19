// Controles de reproducción (tarea 4.12, REQ-VIS-012): reiniciar, fin, reproducir/pausa y un deslizador «Paso X de Y». Operables solo con teclado: flechas izquierda/derecha para atrás/adelante,
// Inicio/Fin para los extremos y espacio para reproducir o pausar — siempre que el foco NO esté en un campo de texto, un selector, un deslizador o un botón (para no pisar lo que esos elementos ya
// hacen con esas teclas). Cada botón lleva el glifo Y la palabra, y anuncia su atajo con `aria-keyshortcuts`. Presentacional: recibe la posición y emite acciones; el contenedor las convierte en
// cambios de estado.
//
// Tareas R0.9 y R0.10 (REQ-PANT-003, REQ-PANT-004, ADR 017): «Anterior» y «Siguiente» viven ahora en la ranura bajo el globo (`RanuraDeAcciones`) —aquí quedan SOLO sus atajos de flechas— y la velocidad en
// «Ajustes de la clase». El indicador «Paso N de M» dice el total únicamente cuando se conoce (si no, «Paso N»): el deslizador sigue llegando hasta el último paso ya calculado.
import { useEffect, useId, useRef } from 'react';
import { textosControles } from '../../textos/es-MX/controles.ts';
import { textosPantalla } from '../../textos/es-MX/pantalla.ts';

export interface PropiedadesBarraControles {
  readonly paso: number;
  /** Cuántos pasos hay calculados: hasta ahí llega el deslizador y de ahí depende qué botones se apagan. */
  readonly total: number;
  /** El total que se DICE («Paso 5 de 12»): `null` mientras no se conoce (el programa no terminó) y entonces solo se dice «Paso 5». */
  readonly totalMostrado: number | null;
  readonly reproduciendo: boolean;
  readonly alReiniciar: () => void;
  readonly alAnterior: () => void;
  readonly alSiguiente: () => void;
  readonly alFin: () => void;
  readonly alReproducirOPausar: () => void;
  readonly alIrAlPaso: (paso: number) => void;
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

export function BarraControles({ paso, total, totalMostrado, reproduciendo, alReiniciar, alAnterior, alSiguiente, alFin, alReproducirOPausar, alIrAlPaso }: PropiedadesBarraControles) {
  useAtajosDeTeclado({ alReiniciar, alAnterior, alSiguiente, alFin, alReproducirOPausar });
  const idDeLaAyuda = useId();
  const alPrincipio = paso <= 0;
  const alFinal = paso >= total;
  const textoDelPaso = textosPantalla.posicion.paso(paso, totalMostrado);

  return (
    <div className="barra-controles" role="group" aria-label={textosControles.etiquetaDelGrupo()} aria-describedby={idDeLaAyuda}>
      <button type="button" onClick={alReiniciar} disabled={alPrincipio} aria-keyshortcuts="Home">
        {textosControles.botonReiniciar()}
      </button>
      <button type="button" onClick={alFin} disabled={alFinal} aria-keyshortcuts="End">
        {textosControles.botonFin()}
      </button>
      <button type="button" onClick={alReproducirOPausar} disabled={!reproduciendo && alFinal} aria-keyshortcuts="Space">
        {reproduciendo ? textosControles.botonPausar() : textosControles.botonReproducir()}
      </button>
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
