// Cómo se escribe un valor en el panel de variables (tarea 4.6, REQ-VIS-005): tal como Java lo escribe en el código (`5`, `'A'`, `"hola"`, `2.5`, `true`). El motor ya escribe así los
// valores de sus explicaciones (`motor/interprete/explicar.ts`, con el `Double.toString` exacto de la biblioteca); aquí se escriben los de las VARIABLES a partir del `Valor` crudo de la traza
// y del tipo de la variable (un `char` viaja como número: sin su tipo, 65 no sería `'A'`). Un `double` se escribe con `doubleATexto`, el `Double.toString` EXACTO de JDK 17 que el motor usa en la consola
// y en sus explicaciones (ADR 008): así el panel de variables, la consola y el robot nunca discrepan (`0.1 + 0.2` → `0.30000000000000004`, `1.0E7`, `1e23` → `9.999999999999999E22`). Puro, sin DOM.
import { doubleATexto, type TipoIr, type Valor } from '../motor/vista.ts';
import { textosPaneles } from '../textos/es-MX/paneles.ts';

const ESCAPES_DE_CARACTER: ReadonlyMap<string, string> = new Map([
  ['\n', '\\n'],
  ['\t', '\\t'],
  ['\r', '\\r'],
  ['\\', '\\\\'],
]);

/** El texto como va entre comillas en el código de Java: la barra, los saltos de línea y la comilla que lo encierra se escriben escapados. */
function escapar(texto: string, comilla: string): string {
  let salida = '';
  for (const caracter of texto) {
    salida += caracter === comilla ? `\\${caracter}` : (ESCAPES_DE_CARACTER.get(caracter) ?? caracter);
  }
  return salida;
}

function nombreDeObjeto(valor: Valor): string {
  if (typeof valor === 'object') return textosPaneles.variables.objeto(valor.objeto);
  return String(valor);
}

export function formatearValor(valor: Valor, tipo: TipoIr): string {
  switch (tipo) {
    case 'int':
    case 'long':
    case 'boolean':
      return String(valor);
    case 'char':
      return `'${escapar(String.fromCharCode(Number(valor)), "'")}'`;
    case 'String':
      return `"${escapar(String(valor), '"')}"`;
    case 'double':
      return doubleATexto(Number(valor));
    case 'Scanner':
    case 'Random':
      return nombreDeObjeto(valor);
  }
}
