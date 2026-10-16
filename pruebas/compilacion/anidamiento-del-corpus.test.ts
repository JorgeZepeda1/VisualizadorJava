// Tarea 1.37 (W-12 de la verificación del delta del lote 1): 17 de las 21 formas de anidar que midió el verificador y que son Java VÁLIDO (se dejan fuera `while`/`do-while` anidados, que no
// terminan, y `for` anidados y `comparaciones-anidadas`, que javac rechaza por otra razón), cada una DENTRO de los topes de anidamiento (30 repeticiones) y FUERA (120 las que recursan en el analizador,
// 250 las cadenas que arma un lazo). Los goldens del oráculo (`corpus/experimentos/anidamiento/`) muestran que javac COMPILA y EJECUTA todos, también los de fuera: el aviso
// `programa-demasiado-anidado` no esconde ningún error de Java, es el límite honesto del visualizador (la pila de los navegadores se agotaba: ver `pruebas/e2e/anidamiento.spec.ts`).
// Lo de dentro se revisa como siempre: pasa todas las revisiones y todavía no se ejecuta (`ejecucion-no-disponible`, lote 2).
import { guardaDeCorpusConTablas } from './guarda-de-corpus-con-tablas.ts';

const ANIDADO = 'programa-demasiado-anidado';

const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]> = [
  // Dentro de los topes: se revisa como siempre.
  ['an-parentesis-anidados-dentro', 'ok'],
  ['an-bloques-anidados-dentro', 'ok'],
  ['an-suma-izquierda-dentro', 'ok'],
  ['an-suma-derecha-dentro', 'ok'],
  ['an-else-if-dentro', 'ok'],
  ['an-if-anidados-dentro', 'ok'],
  ['an-unarios-menos-dentro', 'ok'],
  ['an-negaciones-dentro', 'ok'],
  ['an-y-encadenado-dentro', 'ok'],
  ['an-o-encadenado-dentro', 'ok'],
  ['an-concatenacion-izquierda-dentro', 'ok'],
  ['an-concatenacion-con-variable-dentro', 'ok'],
  ['an-llamadas-en-cadena-dentro', 'ejecucion-no-disponible'],
  ['an-casts-en-cadena-dentro', 'ok'],
  ['an-asignaciones-en-cadena-dentro', 'ok'],
  ['an-bloques-con-if-dentro', 'ok'],
  ['an-switch-anidados-dentro', 'ok'],
  // Fuera de los topes: el aviso honesto de anidamiento, en la línea donde está la forma.
  ['an-parentesis-anidados-fuera', ANIDADO],
  ['an-bloques-anidados-fuera', ANIDADO],
  ['an-suma-izquierda-fuera', ANIDADO],
  ['an-suma-derecha-fuera', ANIDADO],
  ['an-else-if-fuera', ANIDADO],
  ['an-if-anidados-fuera', ANIDADO],
  ['an-unarios-menos-fuera', ANIDADO],
  ['an-negaciones-fuera', ANIDADO],
  ['an-y-encadenado-fuera', ANIDADO],
  ['an-o-encadenado-fuera', ANIDADO],
  ['an-concatenacion-izquierda-fuera', ANIDADO],
  ['an-concatenacion-con-variable-fuera', ANIDADO],
  ['an-llamadas-en-cadena-fuera', ANIDADO],
  ['an-casts-en-cadena-fuera', ANIDADO],
  ['an-asignaciones-en-cadena-fuera', ANIDADO],
  ['an-bloques-con-if-fuera', ANIDADO],
  ['an-switch-anidados-fuera', ANIDADO],
];

guardaDeCorpusConTablas({
  nombre: 'anidamiento',
  ruta: 'corpus/experimentos/anidamiento',
  errores: [],
  avisos: [],
  validos: VALIDOS,
  piso: 34,
});
