// Las puertas del saludo (tarea R0.8, REQ-PANT-001, PQ-2, ADR 017): al abrir el visualizador el robot paso a paso saluda en el globo y, bajo él, el alumno elige por dónde empezar —«Leer un tema», «Ver un
// ejemplo paso a paso» o «Probar mi programa»—. Cada puerta lleva el accesorio del robot que ayuda ahí; aparece solo si su destino tiene contenido (lo decide `presentacion/ranura.ts`; aquí se pintan las
// que llegan). Presentacional puro: avisa cuál se eligió; el contenedor lleva al destino. La primera puerta puede recibir el foco inicial (`refPrimera`).
import type { Ref } from 'react';
import type { IdDePuerta, Puerta } from '../../presentacion/index.ts';
import { textosPantalla } from '../../textos/es-MX/pantalla.ts';
import { IconoDeAccesorio } from './IconoDeAccesorio.tsx';

const TEXTO_DE_LA_PUERTA: Readonly<Record<IdDePuerta, () => string>> = {
  'leer-un-tema': textosPantalla.saludo.puertas.leerUnTema,
  'ver-un-ejemplo': textosPantalla.saludo.puertas.verUnEjemplo,
  'probar-mi-programa': textosPantalla.saludo.puertas.probarMiPrograma,
};

export interface PropiedadesSaludo {
  readonly puertas: readonly Puerta[];
  readonly alElegir: (puerta: IdDePuerta) => void;
  /** Para que el contenedor pueda llevar el foco a la primera puerta al abrir el visualizador. */
  readonly refPrimera?: Ref<HTMLButtonElement>;
}

export function Saludo({ puertas, alElegir, refPrimera }: PropiedadesSaludo) {
  return (
    <div className="saludo" role="group" aria-label={textosPantalla.saludo.puertas.etiquetaDelGrupo()}>
      {puertas.map((puerta, indice) => (
        <button key={puerta.id} type="button" className="puerta" data-puerta={puerta.id} ref={indice === 0 ? refPrimera : undefined} onClick={() => alElegir(puerta.id)}>
          <IconoDeAccesorio accesorio={puerta.accesorio} />
          <span>{TEXTO_DE_LA_PUERTA[puerta.id]()}</span>
        </button>
      ))}
    </div>
  );
}
