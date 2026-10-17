// Excepción de Java que ocurre al EJECUTAR el programa del alumno (design.md §3.6): lo que el director convierte en el paso final
// `excepcion` y en el `stderr` exacto de la JVM. Vive en `interprete/` porque es el contrato entre quien la lanza (la aritmética de
// `biblioteca/numeros`, la biblioteca de texto y de entrada: todas lanzan `ExcepcionJava`, que la extiende) y quien la presenta; ningún
// otro módulo la inspecciona por dentro.
//
// `clase`: el nombre de clase como lo imprime la JVM (`java.lang.ArithmeticException`). `mensaje`: `null` cuando Java no pone mensaje (la
// JVM imprime solo la clase). `marcos`: los marcos de `java.base` que la JVM imprime ANTES del marco del alumno, ya en el texto exacto de
// cada renglón sin el `\tat ` inicial (p. ej. `java.base/java.lang.StringLatin1.charAt(StringLatin1.java:48)`); vacío para
// `ArithmeticException`, que no deja marcos del JDK.
export class ExcepcionDeEjecucion extends Error {
  readonly clase: string;
  readonly mensaje: string | null;
  readonly marcos: readonly string[];

  constructor(clase: string, mensaje: string | null, marcos: readonly string[] = []) {
    super(mensaje === null ? clase : `${clase}: ${mensaje}`);
    this.name = 'ExcepcionDeEjecucion';
    this.clase = clase;
    this.mensaje = mensaje;
    this.marcos = marcos;
  }
}
