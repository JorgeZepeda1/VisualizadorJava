// Cómo se escribe un valor en el panel de variables (tarea 4.6, REQ-VIS-005): tal como Java lo escribe en el código (`5`, `'A'`, `"hola"`, `2.5`, `true`). El motor ya escribe así los
// valores de sus explicaciones (`motor/interprete/explicar.ts`, con el `Double.toString` exacto de la biblioteca); aquí se escriben los de las VARIABLES a partir del `Valor` crudo de la traza
// y del tipo de la variable (un `char` viaja como número: sin su tipo, 65 no sería `'A'`). Puro, sin DOM.
//
// Límite conocido (pendiente de la unión con la parte A): `double` NO usa el `Double.toString` exacto del motor, porque `motor/vista.ts` todavía no lo exporta (su comentario anuncia
// `formatearValorJava` para la primera tarea que lo necesite; esta capa no puede tocar `src/motor`). Aquí se arma la forma de Java —ceros, rango decimal de 10^-3 a 10^7, notación con E—
// sobre los dígitos más cortos que identifican al número: coincide con Java en todo lo corriente; JDK 17 puede añadir un dígito de más en casos rarísimos. Cuando el motor lo exporte, se
// reemplaza `formatearDouble` por esa función.
import type { TipoIr, Valor } from '../motor/vista.ts';
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

const MENOR_DECIMAL = 1e-3;
const MAYOR_DECIMAL = 1e7;

function formatearDouble(numero: number): string {
  if (Number.isNaN(numero)) return 'NaN';
  if (numero === Number.POSITIVE_INFINITY) return 'Infinity';
  if (numero === Number.NEGATIVE_INFINITY) return '-Infinity';
  if (numero === 0) return Object.is(numero, -0) ? '-0.0' : '0.0';
  const magnitud = Math.abs(numero);
  if (magnitud >= MENOR_DECIMAL && magnitud < MAYOR_DECIMAL) {
    const texto = String(numero);
    return texto.includes('.') ? texto : `${texto}.0`;
  }
  const [mantisa = '', exponente = '0'] = numero.toExponential().split('e');
  return `${mantisa.includes('.') ? mantisa : `${mantisa}.0`}E${Number(exponente)}`;
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
      return formatearDouble(Number(valor));
    case 'Scanner':
    case 'Random':
      return nombreDeObjeto(valor);
  }
}
