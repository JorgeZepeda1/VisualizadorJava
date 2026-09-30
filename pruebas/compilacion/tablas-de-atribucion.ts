// Tablas de verdad de dos familias de ATRIBUCIÓN (tarea 1.32): los 64 pares (origen, destino) de un cast entre los 8 tipos del
// subconjunto (F1, JLS 5.5) y las etiquetas de un `switch` según el tipo del selector (F4, JLS 14.11). Son DATOS — lo que devolvió javac
// 17.0.18 (sonda del 2026-09-29) — y NO se derivan de la regla del motor: son la prueba independiente de esa regla.
//
// Las usan DOS pruebas, para que nunca puedan divergir:
//   - `tablas-de-atribucion.test.ts` (`npm test`, sin JDK): `compilar()` responde lo mismo que javac en CADA celda, con la línea de javac;
//   - `herramientas/oraculo/atribucion-tablas.test.ts` (`npm run test:oraculo`, con el JDK real): javac sigue diciendo esto mismo, celda
//     por celda — si un JDK distinto cambiara una respuesta, esa prueba lo descubre antes de que el motor se calibre contra un dato viejo.
//
// Cada celda es un programa completo de UNA sentencia (el cast, o el `switch`) en una línea conocida (`LINEA_DEL_CAST`,
// `LINEA_DE_LA_ETIQUETA`), así la línea de javac se compara sin recurrir a un `.errores`.

export const TIPOS_DE_CAST = ['int', 'long', 'double', 'char', 'boolean', 'String', 'Scanner', 'Random'] as const;
export type TipoDeCast = (typeof TIPOS_DE_CAST)[number];

const INICIALIZADOR_DE_CAST: Readonly<Record<TipoDeCast, string>> = {
  int: '0',
  long: '0L',
  double: '0.0',
  char: "'a'",
  boolean: 'true',
  String: '""',
  Scanner: 'new Scanner(System.in)',
  Random: 'new Random()',
};

/** Los 20 pares que javac ACEPTA («origen>destino»): los cuatro numéricos entre sí (16) y la identidad de boolean/String/Scanner/Random. */
export const CASTS_QUE_JAVAC_ACEPTA: ReadonlySet<string> = new Set([
  'int>int', 'int>long', 'int>double', 'int>char',
  'long>int', 'long>long', 'long>double', 'long>char',
  'double>int', 'double>long', 'double>double', 'double>char',
  'char>int', 'char>long', 'char>double', 'char>char',
  'boolean>boolean', 'String>String', 'Scanner>Scanner', 'Random>Random',
]);

export const PARES_DE_CAST: ReadonlyArray<readonly [origen: TipoDeCast, destino: TipoDeCast]> = TIPOS_DE_CAST.flatMap((origen) =>
  TIPOS_DE_CAST.map((destino) => [origen, destino] as const),
);

/** La línea (de 1) del cast dentro de `programaDeCast`; javac reporta `prob.found.req` en ella. */
export const LINEA_DEL_CAST = 7;

export function programaDeCast(origen: TipoDeCast, destino: TipoDeCast): string {
  return [
    'import java.util.Scanner;',
    'import java.util.Random;',
    '',
    'public class P {',
    '    public static void main(String[] args) {',
    `        ${origen} o = ${INICIALIZADOR_DE_CAST[origen]};`,
    `        ${destino} d = (${destino}) o;`,
    '    }',
    '}',
    '',
  ].join('\n');
}

export const SELECTORES_DE_SWITCH = { int: '0', char: "'a'", String: '""' } as const;
export type SelectorDeSwitch = keyof typeof SELECTORES_DE_SWITCH;

/** [texto de la etiqueta, su tipo] — 13 etiquetas que cubren cada tipo y los bordes de `char` (0, 65535, 65536, -1). */
export const ETIQUETAS_DE_SWITCH: ReadonlyArray<readonly [etiqueta: string, tipo: TipoDeCast]> = [
  ['1', 'int'], ['1L', 'long'], ['1.5', 'double'], ['true', 'boolean'], ["'a'", 'char'], ['"x"', 'String'],
  ['70000', 'int'], ['-1', 'int'], ['65535', 'int'], ['65536', 'int'], ['(char) 5', 'char'], ['1 + 1', 'int'], ["'a' + 1", 'int'],
];

/** Lo que javac ACEPTA («selector>etiqueta»): 16 de las 39 celdas. Las otras 23 son `prob.found.req`. */
export const ETIQUETAS_QUE_JAVAC_ACEPTA: ReadonlySet<string> = new Set([
  'int>1', "int>'a'", 'int>70000', 'int>-1', 'int>65535', 'int>65536', 'int>(char) 5', 'int>1 + 1', "int>'a' + 1",
  'char>1', "char>'a'", 'char>65535', 'char>(char) 5', 'char>1 + 1', "char>'a' + 1",
  'String>"x"',
]);

export const CELDAS_DE_SWITCH: ReadonlyArray<readonly [selector: SelectorDeSwitch, etiqueta: string, tipoDeLaEtiqueta: TipoDeCast]> = (
  Object.keys(SELECTORES_DE_SWITCH) as SelectorDeSwitch[]
).flatMap((selector) => ETIQUETAS_DE_SWITCH.map(([etiqueta, tipo]) => [selector, etiqueta, tipo] as const));

/** Selectores que javac 17 (sin `--enable-preview`) rechaza él mismo, con `preview.feature.disabled.plural`, sea cual sea la etiqueta. */
export const SELECTORES_INVALIDOS_DE_SWITCH: ReadonlyArray<readonly [tipo: string, valor: string]> = [
  ['long', '0L'],
  ['double', '0.0'],
  ['boolean', 'true'],
];

/** La línea (de 1) de la etiqueta dentro de `programaDeSwitch`; javac reporta `prob.found.req` en ella. */
export const LINEA_DE_LA_ETIQUETA = 5;

export function programaDeSwitch(tipoDelSelector: string, valorDelSelector: string, etiqueta: string): string {
  return [
    'public class P {',
    '    public static void main(String[] args) {',
    `        ${tipoDelSelector} v = ${valorDelSelector};`,
    '        switch (v) {',
    `            case ${etiqueta}:`,
    '                break;',
    '        }',
    '    }',
    '}',
    '',
  ].join('\n');
}
