// La cadena de sustitución de un paso (tarea 4.2, REQ-VIS-006, REQ-VIS-011): la expresión tal como se escribió, la misma con cada variable cambiada por su valor y el resultado —lo que el
// alumno lee como `intentos < 10 → 3 < 10 → true`—. Sale SOLO de los datos de la explicación que el motor calculó (`Paso.explicacion`): aquí no se evalúa nada. Puro, sin DOM.
import type { ExplicacionPaso } from '../motor/vista.ts';

/** La expresión, su sustitución (solo si es distinta: sin variables no hay nada que sustituir) y el resultado. */
function armar(expresion: string, sustituida: string, resultado: string): readonly string[] {
  return sustituida === expresion ? [expresion, resultado] : [expresion, sustituida, resultado];
}

export function cadenaDeSustitucion(explicacion: ExplicacionPaso): readonly string[] | null {
  switch (explicacion.clave) {
    case 'condicion-if':
    case 'condicion-ciclo': {
      const { condicion, sustituida, resultado } = explicacion.datos;
      return armar(condicion, sustituida, String(resultado));
    }
    case 'declaracion-con-valor':
    case 'asignacion': {
      const { expresion, sustituida, valor, conversion } = explicacion.datos;
      // La cadena termina en lo que dio el CÁLCULO: si guardar lo convierte (`double promedio = suma / 3;`), el 8.0 no es el resultado de `suma / 3` (da 8) y lo cuenta el robot (panel 1, C1).
      const calculado = conversion?.antes ?? valor;
      // Un literal (`int edad = 17`) no tiene nada que calcular: la cadena sería «17 → 17».
      return expresion === calculado ? null : armar(expresion, sustituida, calculado);
    }
    case 'asignacion-compuesta': {
      const { expresion, sustituida, derecho } = explicacion.datos;
      return expresion === derecho ? null : armar(expresion, sustituida, derecho);
    }
    default:
      return null;
  }
}
