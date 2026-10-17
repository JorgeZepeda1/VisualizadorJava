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
      const { expresion, sustituida, valor } = explicacion.datos;
      // Un literal (`int edad = 17`) no tiene nada que calcular: la cadena sería «17 → 17».
      return expresion === valor ? null : armar(expresion, sustituida, valor);
    }
    case 'asignacion-compuesta': {
      const { expresion, sustituida, derecho } = explicacion.datos;
      return expresion === derecho ? null : armar(expresion, sustituida, derecho);
    }
    default:
      return null;
  }
}
