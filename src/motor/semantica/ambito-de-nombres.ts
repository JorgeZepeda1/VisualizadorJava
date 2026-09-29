// Ámbito de NOMBRES de clase de un programa (tarea 1.29, JLS 6.4.1/6.5/7.5): qué nombres simples
// designan una clase que el programa realmente VE. Hasta esta tarea el motor solo sabía dos cosas:
// «este nombre es una de las 10 clases de mi catálogo» y «este nombre no lo conozco» — así que
// `StringBuilder`, `Object`, `Boolean.parseBoolean(...)` o `Locale` (tras `import java.util.*;`)
// daban `tipo-no-reconocido`/`variable-no-declarada`, errores FALSOS: javac los compila.
//
// Lo que un programa ve por su nombre simple (JLS 6.4.1), en el subconjunto (un solo archivo, sin
// paquetes propios):
//   1. su propia clase (`Main m = new Main();` — «objetos propios», REQ-SUB-007);
//   2. lo que importa `import p.N;` (import de un solo tipo, JLS 7.5.1);
//   3. lo que importa `import p.*;` (bajo demanda, JLS 7.5.2) y todo `java.lang` (siempre implícito).
// Una VARIABLE con el mismo nombre oculta a la clase (JLS 6.4.2): eso lo decide quien tiene el
// alcance (`atribucion.ts`); aquí solo se responde por las clases.
//
// Las clases reales salen de la lista que generó el oráculo (`catalogo-clases.ts`, ADR 010) — nunca
// de una tabla escrita a mano.
import type { NodoPrograma } from '../sintaxis/ast.ts';
import { clasesDelPaquete, existeClaseDelJdk } from './catalogo-clases.ts';
import { CLASES_QUE_REQUIEREN_IMPORT } from './verificaciones-de-tipo.ts';

export interface AmbitoDeNombres {
  /**
   * Cuáles de las clases de `java.util` que el subconjunto soporta y que exigen import (`Scanner`,
   * `Random`) importó el programa — «exacto» (`import java.util.Scanner;`) o comodín
   * (`import java.util.*;`) cuentan igual (verificado contra javac 17 real, exploracion/03 §6).
   */
  readonly importadasDeJavaUtil: ReadonlySet<string>;
  /** ¿`nombre` (simple, sin punto) es la clase del propio programa? */
  esClaseDelPrograma(nombre: string): boolean;
  /** ¿`nombre` (simple, sin punto) designa una clase REAL del JDK que el programa ve (java.lang o un
   * import, exacto o con comodín), soportada o no? No incluye la clase del propio programa. */
  esClaseDelJdkVisible(nombre: string): boolean;
  /** Cualquiera de las dos: la clase del programa o una del JDK a la vista — lo que vale como TIPO. */
  esClaseVisible(nombre: string): boolean;
}

export function construirAmbito(programa: NodoPrograma): AmbitoDeNombres {
  const importadasDeJavaUtil = new Set<string>();
  for (const clase of CLASES_QUE_REQUIEREN_IMPORT) {
    const estaImportada = programa.importaciones.some(
      (importacion) =>
        (!importacion.comodin && importacion.nombre === `java.util.${clase}`) ||
        (importacion.comodin && importacion.nombre === 'java.util'),
    );
    if (estaImportada) importadasDeJavaUtil.add(clase);
  }

  const nombreDeLaClaseDelPrograma = programa.clase.nombre;
  const javaLang = clasesDelPaquete('java.lang');

  const esClaseDelPrograma = (nombre: string): boolean => nombre === nombreDeLaClaseDelPrograma;
  const esClaseDelJdkVisible = (nombre: string): boolean => {
    if (javaLang.has(nombre)) return true;
    return programa.importaciones.some((importacion) => {
      if (importacion.comodin) return clasesDelPaquete(importacion.nombre).has(nombre);
      // Un import de un solo tipo deja ver el último segmento de su nombre canónico (`Map.Entry` → `Entry`),
      // solo si esa clase existe: un import mal escrito ya es un error en su propia línea.
      return importacion.nombre.endsWith(`.${nombre}`) && existeClaseDelJdk(importacion.nombre);
    });
  };

  return {
    importadasDeJavaUtil,
    esClaseDelPrograma,
    esClaseDelJdkVisible,
    esClaseVisible: (nombre) => esClaseDelPrograma(nombre) || esClaseDelJdkVisible(nombre),
  };
}
