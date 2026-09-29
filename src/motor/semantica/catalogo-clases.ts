// Catálogo de CLASES reales del JDK (tarea 1.29, design.md §2.3/§2.6, REQ-SUB-007) sobre la lista
// que generó el oráculo (`clases-jdk.generado.ts`, ADR 010): los tipos públicos importables que un
// programa sin módulo ve por omisión. Es lo único que distingue «esta clase existe, pero el
// visualizador todavía no la simula» (aviso: `import java.util.Locale;`, `JOptionPane`,
// `StringBuilder`) de «esta clase no existe» (error de compilación: `import java.util.Scaner;`).
// Antes de esta tarea el motor solo conocía las 10 clases de su catálogo de miembros
// (`firmas-jdk.generado.ts`) y le daba el MISMO error a un import correcto y a uno con una falta de
// ortografía — un error de compilación FALSO para el primero (D2, regla 5 de CLAUDE.md).
//
// La lista guarda, por paquete, los nombres canónicos de sus tipos («Scanner», «Map.Entry»): es el
// único nombre que acepta un `import` (JLS 7.5.1) y el que se resuelve tras un `import p.*;`.
import { CLASES_JDK } from '../biblioteca/datos/clases-jdk.generado.ts';

// Un `Map` (nunca el objeto generado directo): un "paquete" como `constructor` o `__proto__` no
// debe encontrar nada del prototipo de `Object`.
const CLASES_POR_PAQUETE: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(CLASES_JDK).map(([paquete, clases]) => [paquete, new Set(clases.split(','))]),
);

const SIN_CLASES: ReadonlySet<string> = new Set();

/** Los tipos de `paquete` por su nombre canónico dentro del paquete (`Scanner`, `Map.Entry`); vacío
 * si el paquete no existe. Es lo que un `import paquete.*;` (o `java.lang`, siempre implícito) deja
 * ver por su nombre simple. */
export function clasesDelPaquete(paquete: string): ReadonlySet<string> {
  return CLASES_POR_PAQUETE.get(paquete) ?? SIN_CLASES;
}

/**
 * ¿`nombreCalificado` (el nombre canónico completo, `java.util.Map.Entry`) es un tipo real e
 * importable? Un paquete nunca contiene un punto que sea parte de una clase, así que a lo sumo UNA
 * de las particiones «paquete | resto» puede coincidir — se prueban de izquierda a derecha.
 */
export function existeClaseDelJdk(nombreCalificado: string): boolean {
  let punto = nombreCalificado.indexOf('.');
  while (punto !== -1) {
    const clases = CLASES_POR_PAQUETE.get(nombreCalificado.slice(0, punto));
    if (clases?.has(nombreCalificado.slice(punto + 1))) return true;
    punto = nombreCalificado.indexOf('.', punto + 1);
  }
  return false;
}
