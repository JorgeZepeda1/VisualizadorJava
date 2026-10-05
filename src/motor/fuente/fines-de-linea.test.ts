// Tarea 1.36 (C-2 de la verificación final del lote 1, JLS 3.4): un fin de línea es `\n`, `\r` o la pareja `\r\n` (UNO solo). El visualizador, el léxico y la tabla de líneas
// solo conocían `\n`, así que un retorno de carro suelto no cerraba una cadena, un `char` ni un comentario `//` (javac: «unclosed string literal», `;` que faltaba dentro del
// comentario…), y los números de línea de un archivo con `\r` salían mal. `normalizarFinesDeLinea` los lleva todos a `\n` ANTES de leer nada, con la cuenta de javac: una pareja
// `\r\n` es UNA línea, pero `\n\r` son DOS (el `\n` y luego un `\r` suelto), igual que `\r\r\n`.
import { describe, expect, it } from 'vitest';
import { normalizarFinesDeLinea } from './fines-de-linea.ts';
import { TablaDeLineas } from './tabla-de-lineas.ts';

describe('normalizarFinesDeLinea — todo fin de línea de Java queda como un solo `\\n` (JLS 3.4)', () => {
  it.each([
    ['sin ningún retorno de carro (el caso del editor: CodeMirror ya entrega `\\n`)', 'a\nb\nc', 'a\nb\nc'],
    ['una pareja `\\r\\n` es UN fin de línea', 'a\r\nb\r\nc', 'a\nb\nc'],
    ['un `\\r` suelto es un fin de línea', 'a\rb\rc', 'a\nb\nc'],
    ['`\\n\\r` son DOS fines de línea (un `\\n` y un `\\r` suelto)', 'a\n\rb', 'a\n\nb'],
    ['`\\r\\r\\n` son DOS (un `\\r` suelto y una pareja)', 'a\r\r\nb', 'a\n\nb'],
    ['`\\r\\n\\r` son DOS (una pareja y un `\\r` suelto)', 'a\r\n\rb', 'a\n\nb'],
    ['`\\r\\r` son DOS', 'a\r\rb', 'a\n\nb'],
    ['un `\\r` al final del texto', 'a\r', 'a\n'],
    ['un `\\r\\n` al final del texto', 'a\r\n', 'a\n'],
    ['el texto vacío', '', ''],
    ['solo un `\\r`', '\r', '\n'],
    ['mezcla de los tres en el mismo archivo', 'a\r\nb\rc\nd', 'a\nb\nc\nd'],
  ])('%s', (_descripcion, entrada, salida) => {
    expect(normalizarFinesDeLinea(entrada)).toBe(salida);
  });

  it('no toca nada más: tabuladores, saltos de página, `\\u2028`, `\\u0085` y el resto del texto quedan como están', () => {
    const texto = 'a\tb\fc d\u0085e\u000bf "x\\r\\n" // \\r';
    expect(normalizarFinesDeLinea(texto)).toBe(texto);
  });

  it('un texto sin `\\r` se devuelve tal cual (la misma cadena)', () => {
    const texto = 'public class C {\n}\n';
    expect(normalizarFinesDeLinea(texto)).toBe(texto);
  });

  it('después de normalizar, la tabla de líneas cuenta como javac: la línea de un error tras cada combinación de fines de línea', () => {
    // javac (17.0.18, medido): el `int x = 2;` de abajo es la línea 4 con `\n`, `\r` y `\r\n`, y la 7 con `\n\r`, `\r\r\n`, `\r\n\r`, `\n\n` y `\r\r` (cada uno cuenta DOS fines de línea).
    const lineas = ['public class P {', '    public static void main(String[] args) {', '        int x = 1;', '        int x = 2;'];
    const lineaDeLaCuarta = (fin: string): number => {
      const normalizado = normalizarFinesDeLinea(lineas.join(fin));
      return new TablaDeLineas(normalizado).ubicar(normalizado.indexOf('int x = 2;')).linea;
    };
    expect(lineaDeLaCuarta('\n')).toBe(4);
    expect(lineaDeLaCuarta('\r')).toBe(4);
    expect(lineaDeLaCuarta('\r\n')).toBe(4);
    for (const fin of ['\n\r', '\r\r\n', '\r\n\r', '\n\n', '\r\r']) expect(lineaDeLaCuarta(fin), JSON.stringify(fin)).toBe(7);
  });
});
