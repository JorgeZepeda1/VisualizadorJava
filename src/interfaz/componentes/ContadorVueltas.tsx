// Contador de vueltas (tarea 4.9, REQ-VIS-007): el número de vuelta de cada ciclo activo en el paso actual, cada uno por separado cuando hay anidamiento —«ciclo externo: vuelta 2 · ciclo interno:
// vuelta 3»—. Presentacional puro: recibe las vueltas ya derivadas por la presentación (`derivarVueltas`). La misma cuenta aparece como etiqueta junto al encabezado de cada ciclo en el editor.
import { Fragment } from 'react';
import type { VueltaVista } from '../../presentacion/index.ts';
import { textosPaneles } from '../../textos/es-MX/paneles.ts';

export interface PropiedadesContadorVueltas {
  readonly vueltas: readonly VueltaVista[];
}

function textoDeLaVuelta(vuelta: VueltaVista): string {
  const base = textosPaneles.vueltas.vuelta(vuelta.nombre, vuelta.vuelta);
  return vuelta.termino ? `${base} (${textosPaneles.vueltas.yaTermino()})` : base;
}

export function ContadorVueltas({ vueltas }: PropiedadesContadorVueltas) {
  if (vueltas.length === 0) return null;
  return (
    <div data-testid="contador-de-vueltas" className="contador-de-vueltas" role="group" aria-label={textosPaneles.vueltas.titulo()}>
      {vueltas.map((vuelta, indice) => (
        <Fragment key={vuelta.nodoDelCiclo}>
          {indice > 0 && ' · '}
          <span data-ciclo={vuelta.nodoDelCiclo}>{textoDeLaVuelta(vuelta)}</span>
        </Fragment>
      ))}
    </div>
  );
}
