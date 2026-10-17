// La cadena de sustitución (REQ-VIS-006, REQ-VIS-011): la expresión tal como se escribió, la misma con cada variable cambiada por su valor y el resultado, unidas con flechas —
// `intentos < 10 → 3 < 10 → true`—. Presentacional puro: recibe las partes ya derivadas por la presentación (`cadenaDeSustitucion`).
import { Fragment } from 'react';

export interface PropiedadesCadenaDeSustitucion {
  readonly cadena: readonly string[];
}

export function CadenaDeSustitucion({ cadena }: PropiedadesCadenaDeSustitucion) {
  return (
    <p data-testid="cadena-de-sustitucion" className="cadena-de-sustitucion">
      {cadena.map((parte, indice) => (
        // El índice basta como key: las partes de una cadena no se reordenan, se reemplazan todas juntas.
        <Fragment key={indice}>
          {indice > 0 && <span className="flecha">{' → '}</span>}
          <code>{parte}</code>
        </Fragment>
      ))}
    </p>
  );
}
