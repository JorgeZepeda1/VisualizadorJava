// Las 21 formas de anidar que midió el verificador del delta del lote 1 (tarea 1.36, W-12) y la forma de armar un programa con cada una a una profundidad `d`. Las comparten `anidamiento.test.ts` (la
// guarda de `npm test`), el corpus `corpus/experimentos/anidamiento/` y la prueba E2E que las manda, una por una, al trabajador REAL en Chromium, Firefox y WebKit
// (`pruebas/e2e/anidamiento.spec.ts`). Los nombres son los del verificador (`pila-fria2.mjs`), para que sus cifras se puedan comparar con las de aquí.
import { tokenizar } from '../../src/motor/lexico/analizador-lexico.ts';
import { LIMITES_DE_ANIDAMIENTO, MAXIMO_DE_TOKENS_DE_UN_PROGRAMA, ProgramaDemasiadoAnidado } from '../../src/motor/limites.ts';
import { analizarPrograma } from '../../src/motor/sintaxis/analizador-sintactico.ts';

export interface FormaAnidada {
  readonly nombre: string;
  /** El cuerpo (la parte que va dentro de `main`) con la construcción repetida `d` veces. */
  readonly cuerpo: (d: number) => string;
}

export const PREAMBULO = 'public class P {\n    public static void main(String[] args) {\n        int a = 1;\n        boolean b = true;\n        String s = "x";\n';
export const CIERRE = '\n    }\n}\n';
/** La línea (1-based) donde empieza el cuerpo de cada forma dentro del programa armado por `programaConForma`. */
export const LINEA_DEL_CUERPO = 6;

export const FORMAS_ANIDADAS: readonly FormaAnidada[] = [
  { nombre: 'bloques-anidados', cuerpo: (d) => '{'.repeat(d) + '}'.repeat(d) },
  { nombre: 'parentesis-anidados', cuerpo: (d) => 'a = ' + '('.repeat(d) + '1' + ')'.repeat(d) + ';' },
  { nombre: 'suma-izquierda', cuerpo: (d) => 'a = 1' + ' + 1'.repeat(d) + ';' },
  { nombre: 'suma-derecha', cuerpo: (d) => 'a = ' + '1 + ('.repeat(d) + '1' + ')'.repeat(d) + ';' },
  { nombre: 'else-if', cuerpo: (d) => 'if (b) a = 1;' + ' else if (b) a = 2;'.repeat(d) },
  { nombre: 'while-anidados', cuerpo: (d) => 'while (b) '.repeat(d) + ';' },
  { nombre: 'if-anidados', cuerpo: (d) => 'if (b) '.repeat(d) + ';' },
  { nombre: 'unarios-menos', cuerpo: (d) => 'a = ' + '-('.repeat(d) + '1' + ')'.repeat(d) + ';' },
  { nombre: 'negaciones', cuerpo: (d) => 'b = ' + '!('.repeat(d) + 'true' + ')'.repeat(d) + ';' },
  { nombre: 'y-encadenado', cuerpo: (d) => 'b = b' + ' && b'.repeat(d) + ';' },
  { nombre: 'concatenacion-izquierda', cuerpo: (d) => 's = "x"' + ' + "y"'.repeat(d) + ';' },
  { nombre: 'concatenacion-con-variable', cuerpo: (d) => 's = s' + ' + a'.repeat(d) + ';' },
  { nombre: 'llamadas-en-cadena', cuerpo: (d) => 's = s' + '.trim()'.repeat(d) + ';' },
  { nombre: 'casts-en-cadena', cuerpo: (d) => 'a = ' + '(int) '.repeat(d) + '1;' },
  { nombre: 'asignaciones-en-cadena', cuerpo: (d) => 'a = '.repeat(d) + '1;' },
  { nombre: 'do-while-anidados', cuerpo: (d) => 'do '.repeat(d) + ';' + ' while (b);'.repeat(d) },
  { nombre: 'for-anidados', cuerpo: (d) => 'for (int i = 0; i < 1; i++) '.repeat(d) + ';' },
  { nombre: 'bloques-con-if', cuerpo: (d) => 'if (b) {'.repeat(d) + '}'.repeat(d) },
  { nombre: 'switch-anidados', cuerpo: (d) => 'switch (a) { case 1: '.repeat(d) + ';' + ' }'.repeat(d) },
  { nombre: 'o-encadenado', cuerpo: (d) => 'b = b' + ' || b'.repeat(d) + ';' },
  { nombre: 'comparaciones-anidadas', cuerpo: (d) => 'b = ' + '(a < '.repeat(d) + '2' + ')'.repeat(d) + ' == true;' },
];

/** El programa completo con la forma repetida `d` veces (la construcción va en la línea `LINEA_DEL_CUERPO`). */
export function programaConForma(forma: FormaAnidada, d: number): string {
  return `${PREAMBULO}        ${forma.cuerpo(d)}${CIERRE}`;
}

/** La `d` más grande con la que el programa de la forma todavía cabe en el tope de tokens (más allá, `compilar()` da el aviso de tamaño y nunca llega a mirar el anidamiento). */
export function profundidadMaximaQueCabeEnLosTokens(forma: FormaAnidada): number {
  const tokens = (d: number): number => tokenizar(programaConForma(forma, d)).length - 1;
  let bajo = 1;
  let alto = MAXIMO_DE_TOKENS_DE_UN_PROGRAMA;
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (tokens(medio) <= MAXIMO_DE_TOKENS_DE_UN_PROGRAMA) bajo = medio;
    else alto = medio - 1;
  }
  return bajo;
}

/** ¿El analizador deja pasar la forma a esa profundidad con los topes del producto? */
export function cabeEnLosTopes(forma: FormaAnidada, d: number): boolean {
  try {
    analizarPrograma(tokenizar(programaConForma(forma, d)), LIMITES_DE_ANIDAMIENTO);
    return true;
  } catch (error) {
    if (error instanceof ProgramaDemasiadoAnidado) return false;
    throw error;
  }
}

/** La `d` más grande de la forma que pasa los topes del producto (búsqueda binaria: pasar es monótono en `d`), sin pasar de lo que cabe en los tokens. */
export function profundidadMaximaPermitida(forma: FormaAnidada): number {
  let bajo = 0;
  let alto = profundidadMaximaQueCabeEnLosTokens(forma);
  while (bajo < alto) {
    const medio = (bajo + alto + 1) >> 1;
    if (cabeEnLosTopes(forma, medio)) bajo = medio;
    else alto = medio - 1;
  }
  return bajo;
}
