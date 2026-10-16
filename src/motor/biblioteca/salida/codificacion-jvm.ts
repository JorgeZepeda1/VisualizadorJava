// Tarea 2.13 (REQ-BIB-011, design.md §4.8): lo que hace la JVM al convertir los `char` de `System.out`/`System.err` en los bytes de la consola (UTF-8). Un par de sustitutos
// bien formado sale como UN carácter; un sustituto SUELTO (un `char` entre U+D800 y U+DFFF sin su pareja) sale como `?`, no como U+FFFD. Ejemplo: `print('\uD83D')` seguido de
// `print("b")` escribe `?b`; `print('\uD83D')` seguido de `print('\uDE00')` escribe 😀 — el codificador de la JVM recuerda un sustituto alto entre dos escrituras.

const PRIMER_SUSTITUTO_ALTO = 0xd800;
const ULTIMO_SUSTITUTO_ALTO = 0xdbff;
const PRIMER_SUSTITUTO_BAJO = 0xdc00;
const ULTIMO_SUSTITUTO_BAJO = 0xdfff;
const SUSTITUTO_SUELTO = '?';

function esSustitutoAlto(unidad: number): boolean {
  return unidad >= PRIMER_SUSTITUTO_ALTO && unidad <= ULTIMO_SUSTITUTO_ALTO;
}

function esSustitutoBajo(unidad: number): boolean {
  return unidad >= PRIMER_SUSTITUTO_BAJO && unidad <= ULTIMO_SUSTITUTO_BAJO;
}

/** El codificador de UN flujo (`System.out` y `System.err` tienen cada uno el suyo): convierte texto de Java en el texto que la consola recibe. */
export class CodificadorDeSalida {
  private altoPendiente = '';

  /** Texto que llega a la consola por esta escritura. Un sustituto alto al FINAL queda pendiente hasta la escritura siguiente (por eso puede devolver menos de lo recibido). */
  convertir(texto: string): string {
    const entrada = this.altoPendiente + texto;
    this.altoPendiente = '';
    let resultado = '';
    for (let i = 0; i < entrada.length; i++) {
      const unidad = entrada.charCodeAt(i);
      if (esSustitutoAlto(unidad)) {
        if (i + 1 === entrada.length) {
          this.altoPendiente = entrada[i] as string;
        } else if (esSustitutoBajo(entrada.charCodeAt(i + 1))) {
          resultado += entrada.slice(i, i + 2);
          i += 1;
        } else {
          resultado += SUSTITUTO_SUELTO;
        }
      } else if (esSustitutoBajo(unidad)) {
        resultado += SUSTITUTO_SUELTO;
      } else {
        resultado += entrada[i];
      }
    }
    return resultado;
  }
}
