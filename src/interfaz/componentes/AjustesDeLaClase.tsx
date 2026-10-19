// «Ajustes de la clase» (tarea R0.8, REQ-PANT-006, ADR 017): el encabezado le muestra al alumno solo la navegación, el interruptor del modo reto (R1) y este botón; dentro están lo que el docente ajusta para
// proyectar en el salón: el modo proyector y la velocidad de la reproducción (el momento del aviso del revisor y el nivel de paso se suman cuando existan). Cada ajuste tiene nombre accesible y dice su estado
// EN PALABRAS —«Encendido» / «Apagado»—, nunca solo con un color. Todo se opera con el teclado; Escape cierra el panel y devuelve el foco al botón. Presentacional puro.
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { textosControles, type NivelDeVelocidad } from '../../textos/es-MX/controles.ts';
import { textosPantalla } from '../../textos/es-MX/pantalla.ts';

const NIVELES_DE_VELOCIDAD: readonly NivelDeVelocidad[] = [1, 2, 3, 4, 5];

export interface PropiedadesAjustesDeLaClase {
  readonly proyector: boolean;
  readonly velocidad: NivelDeVelocidad;
  readonly alCambiarProyector: (encendido: boolean) => void;
  readonly alCambiarVelocidad: (velocidad: NivelDeVelocidad) => void;
}

export function AjustesDeLaClase({ proyector, velocidad, alCambiarProyector, alCambiarVelocidad }: PropiedadesAjustesDeLaClase) {
  const [abierto, setAbierto] = useState(false);
  const botonRef = useRef<HTMLButtonElement | null>(null);
  const idDelPanel = useId();
  const idDeLaDescripcion = useId();
  const idDeLaVelocidad = useId();

  function cerrar(): void {
    setAbierto(false);
    botonRef.current?.focus();
  }

  function alPulsar(evento: KeyboardEvent<HTMLDivElement>): void {
    if (evento.key !== 'Escape' || !abierto) return;
    evento.stopPropagation();
    cerrar();
  }

  return (
    <div className="ajustes-de-la-clase" onKeyDown={alPulsar}>
      <button ref={botonRef} type="button" className="boton-ajustes" aria-expanded={abierto} aria-controls={idDelPanel} onClick={() => setAbierto(!abierto)}>
        <span aria-hidden="true">⚙</span> {textosPantalla.ajustes.boton()}
      </button>
      {abierto && (
        <div id={idDelPanel} className="ajustes-panel" role="group" aria-label={textosPantalla.ajustes.titulo()}>
          <label className="ajuste ajuste-proyector">
            <input type="checkbox" role="switch" checked={proyector} aria-describedby={idDeLaDescripcion} onChange={(evento) => alCambiarProyector(evento.target.checked)} />
            <span>
              {textosPantalla.ajustes.proyector.nombre()}
              {': '}
              <strong data-estado={proyector ? 'encendido' : 'apagado'}>{textosPantalla.ajustes.estado(proyector)}</strong>
            </span>
          </label>
          <p id={idDeLaDescripcion} className="ajuste-descripcion">
            {textosPantalla.ajustes.proyector.descripcion()}
          </p>
          <div className="ajuste ajuste-velocidad">
            <label htmlFor={idDeLaVelocidad}>{textosPantalla.ajustes.velocidad.nombre()}</label>
            <select id={idDeLaVelocidad} value={velocidad} onChange={(evento) => alCambiarVelocidad(Number(evento.target.value) as NivelDeVelocidad)}>
              {NIVELES_DE_VELOCIDAD.map((nivel) => (
                <option key={nivel} value={nivel}>
                  {textosControles.nombreDeVelocidad(nivel)}
                </option>
              ))}
            </select>
          </div>
          <button type="button" className="ajustes-cerrar" onClick={cerrar}>
            {textosPantalla.ajustes.cerrar()}
          </button>
        </div>
      )}
    </div>
  );
}
