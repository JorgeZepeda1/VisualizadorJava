// Tarea 2.9 (REQ-BIB-006, design.md §3.1 y §4.5): la identidad de `String`. En Java `==` compara REFERENCIAS: los literales y las concatenaciones de constantes comparten una instancia
// (el *pool* internado) y cualquier `String` construido en ejecución (`Scanner`, `new String(…)`, concatenación de variables, `substring`…) es una instancia nueva aunque tenga el mismo
// texto. Aquí `CadenaJava` es esa instancia: dos `CadenaJava` son "la misma" si y solo si son el mismo objeto de JavaScript (`===`).
//
// `latin1` es el *coder* de Java (cadenas compactas, JEP 254): una cadena con todos sus caracteres ≤ U+00FF es Latin-1; si no, UTF-16. Se deduce del contenido (Java 17 comprime al
// construir) y decide el mensaje y los marcos de `charAt` fuera de rango.

export class CadenaJava {
  readonly texto: string;
  private esLatin1: boolean | undefined;

  constructor(texto: string) {
    this.texto = texto;
  }

  get latin1(): boolean {
    if (this.esLatin1 === undefined) {
      let todosLatin1 = true;
      for (let i = 0; i < this.texto.length && todosLatin1; i++) todosLatin1 = this.texto.charCodeAt(i) <= 0xff;
      this.esLatin1 = todosLatin1;
    }
    return this.esLatin1;
  }
}

/** Una instancia NUEVA con ese texto (`new String(texto)`, y todo lo que se arma en ejecución). */
export function nuevaCadena(texto: string): CadenaJava {
  return new CadenaJava(texto);
}

/** El *pool* de cadenas internadas de UNA ejecución: literales y constantes de compilación. `internar` devuelve siempre la misma instancia para el mismo texto. */
export class PoolDeCadenas {
  private readonly cadenas = new Map<string, CadenaJava>();

  internar(texto: string): CadenaJava {
    let cadena = this.cadenas.get(texto);
    if (cadena === undefined) {
      cadena = new CadenaJava(texto);
      this.cadenas.set(texto, cadena);
    }
    return cadena;
  }
}
