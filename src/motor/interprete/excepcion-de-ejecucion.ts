// Excepción de Java que ocurre al EJECUTAR el programa del alumno (design.md §3.6): lo que el director convierte en el paso final
// `excepcion` y en el `stderr` exacto de la JVM. Vive en `interprete/` porque es el contrato entre quien la lanza (la aritmética de
// `biblioteca/numeros`, la biblioteca de texto y de entrada) y quien la presenta; ningún otro módulo la inspecciona por dentro.
//
// `claseCalificada`: el nombre de clase como lo imprime la JVM (`java.lang.ArithmeticException`). `mensajeJava`: `null` cuando Java no
// pone mensaje (la JVM imprime solo la clase). `marcosDeJdk`: los marcos de `java.base` que la JVM imprime ANTES del marco del alumno,
// ya en el texto exacto de cada renglón sin el `\tat ` inicial (p. ej. `java.base/java.lang.StringLatin1.charAt(StringLatin1.java:48)`);
// vacío para `ArithmeticException`, que no deja marcos del JDK.
export class ExcepcionDeEjecucion extends Error {
  readonly claseCalificada: string;
  readonly mensajeJava: string | null;
  readonly marcosDeJdk: readonly string[];

  constructor(claseCalificada: string, mensajeJava: string | null, marcosDeJdk: readonly string[] = []) {
    super(mensajeJava === null ? claseCalificada : `${claseCalificada}: ${mensajeJava}`);
    this.name = 'ExcepcionDeEjecucion';
    this.claseCalificada = claseCalificada;
    this.mensajeJava = mensajeJava;
    this.marcosDeJdk = marcosDeJdk;
  }
}

/** `ArithmeticException: / by zero` — la división o el módulo entero entre cero (JLS 15.17.2, 15.17.3). */
export function divisionEntreCero(): ExcepcionDeEjecucion {
  return new ExcepcionDeEjecucion('java.lang.ArithmeticException', '/ by zero');
}
