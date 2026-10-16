// Fines de línea de Java (tarea 1.36, C-2 y W-2a de la verificación final del lote 1, JLS 3.4): «una línea termina con ASCII LF, ASCII CR o la pareja CR LF» — tres terminadores, y
// la pareja cuenta UNO. Todo el motor (léxico, sintaxis, tabla de líneas) trabaja con `\n`; esta función lleva los otros dos a `\n` antes de leer nada. El editor (CodeMirror) ya los
// entrega así (parte el texto en `\r\n?|\n` y lo une con `\n`), pero `compilar()` también se llama directo (pruebas, enlaces compartidos, el generador diferencial).
//
// La cuenta es la de javac, medida con 17.0.18: `\r\n` es UNA línea, y `\n\r` y `\r\r\n` son DOS (un terminador y luego otro suelto). La expresión `\r\n?` las produce solas: toma
// cada `\r` con el `\n` que le sigue, si lo hay, como UN fin de línea.
const RETORNO_DE_CARRO_Y_SU_SALTO = /\r\n?/g;

/** El texto con todo fin de línea de Java (`\r`, `\r\n`) reducido a `\n`. Pura. Un texto sin `\r` se devuelve tal cual (la misma cadena). */
export function normalizarFinesDeLinea(texto: string): string {
  return texto.includes('\r') ? texto.replace(RETORNO_DE_CARRO_Y_SU_SALTO, '\n') : texto;
}
