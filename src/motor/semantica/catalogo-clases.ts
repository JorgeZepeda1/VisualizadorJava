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
import { CLASES_QUE_CHOCAN_COMO_PAQUETE } from '../biblioteca/datos/clases-que-chocan.generado.ts';

// Un `Map` (nunca el objeto generado directo): un "paquete" como `constructor` o `__proto__` no
// debe encontrar nada del prototipo de `Object`.
const CLASES_POR_PAQUETE: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(CLASES_JDK).map(([paquete, clases]) => [paquete, new Set(clases.split(','))]),
);

const SIN_CLASES: ReadonlySet<string> = new Set();

// Tarea 1.37 (C-6): los nombres PLANOS de javac (`Shutdown`, `Thread$State`) que escritos como nombre de paquete javac rechaza, por paquete. Otro `Map`, por la misma razón.
const CLASES_QUE_CHOCAN_POR_PAQUETE: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(CLASES_QUE_CHOCAN_COMO_PAQUETE).map(([paquete, nombres]) => [paquete, new Set(nombres.split(','))]),
);

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

/**
 * Tarea 1.35 (JLS 7.5.2): ¿`import nombre.*;` es válido? Lo es si `nombre` es un PAQUETE con tipos visibles (`java.util`) o un TIPO del que se importan los miembros (`java.util.Map`,
 * `java.lang.Math`). Medido con javac 17.0.18 sobre 886 nombres (los 871 paquetes del sistema y 15 más: typos, paquetes de arriba como `java`, bibliotecas ajenas, internos e incubadoras):
 * lo que javac acepta es EXACTAMENTE los paquetes de la lista del oráculo y los tipos que `existeClaseDelJdk` reconoce. Un paquete que solo tiene subpaquetes (`java`) no vale.
 */
export function existePaqueteOTipoDelJdk(nombre: string): boolean {
  return clasesDelPaquete(nombre).size > 0 || existeClaseDelJdk(nombre);
}

/**
 * Tarea 1.37 (C-6, `TypeEnter.checkClassPackageClash` de javac 17.0.18): ¿el nombre de este PAQUETE (`java.lang.Shutdown`) es el de una clase que el compilador ya conoce al leer el `package`, o
 * empieza con uno (`java.lang.String.aula`)? Devuelve el prefijo que es la clase, el MÁS LARGO (javac recorre los prefijos del más largo al más corto y señala el primero), o `null`.
 *
 * Lo que el compilador ya conoce es lo que midió el oráculo (`CLASES_QUE_CHOCAN_COMO_PAQUETE`, `GenerarClasesQueChocan.java`): TODOS los archivos de `java.lang` —públicos o no, anidados como
 * `Thread$State` o anónimos como `Class$1`—, que importa solo, y las pocas clases que él mismo crea de antemano (`java.io.Serializable`, `java.util.List`, `java.lang.runtime.SwitchBootstraps`…). El
 * resto de las clases del JDK se carga cuando el programa las usa, ya con este chequeo hecho: `package java.util.Map;` compila. El veredicto NO depende del cuerpo del programa.
 *
 * Un nombre de un solo segmento nunca se compara (javac tampoco). Pura; consulta tablas `Map`, así que `constructor` o `__proto__` no encuentran nada.
 */
export function claseQueChocaComoPaquete(nombreDelPaquete: string): string | null {
  let fin = nombreDelPaquete.length;
  for (;;) {
    const prefijo = nombreDelPaquete.slice(0, fin);
    const ultimoPunto = prefijo.lastIndexOf('.');
    if (ultimoPunto === -1) return null;
    if (CLASES_QUE_CHOCAN_POR_PAQUETE.get(prefijo.slice(0, ultimoPunto))?.has(prefijo.slice(ultimoPunto + 1)) === true) return prefijo;
    fin = ultimoPunto;
  }
}
