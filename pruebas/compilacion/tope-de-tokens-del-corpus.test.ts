// Tarea 1.37 (S-10 de la verificación del delta del lote 1: «el valor del tope — 4 001 o 3 999 en vez de 4 000— no lo fija ninguna prueba; no produce falsos aceptos ni rechazos porque el aviso es
// honesto en los dos lados, pero cambia el producto»). El tope de tamaño (4 000 tokens, una decisión del PO, `motor/limites.ts`) se vigila con programas de EXACTAMENTE 3 999, 4 000 y 4 001
// tokens, de seis formas de relleno (los del conjunto d07 del verificador), con los goldens del oráculo: javac COMPILA todos, así que el aviso `programa-demasiado-grande` no esconde ningún
// error de Java. Con 4 001 es el aviso de tamaño; con 4 000 o menos se revisa como siempre (aquí, `ejecucion-no-disponible`: lo que usan los rellenos todavía no se ejecuta), salvo la suma
// larga, que cabe en tokens pero es un árbol de casi 2 000 niveles y pasa del tope de PROFUNDIDAD (`programa-demasiado-anidado`): el de tamaño se revisa primero.
// Los números van escritos aquí, no importados de `limites.ts`: la prueba existe para que cambiar el valor del tope sea una decisión visible.
import { guardaDeCorpusConTablas } from './guarda-de-corpus-con-tablas.ts';

const GRANDE = 'programa-demasiado-grande';
const ANIDADO = 'programa-demasiado-anidado';
const NO_DISPONIBLE = 'ejecucion-no-disponible';

const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]> = [
  // 3 999 tokens: caben.
  ['tope-3999-tokens-puntos-y-coma', NO_DISPONIBLE],
  ['tope-3999-tokens-println', NO_DISPONIBLE],
  ['tope-3999-tokens-declaraciones', NO_DISPONIBLE],
  ['tope-3999-tokens-incremento', NO_DISPONIBLE],
  ['tope-3999-tokens-if-chico', NO_DISPONIBLE],
  ['tope-3999-tokens-suma-larga', ANIDADO],
  // 4 000 tokens: justo el tope, todavía caben.
  ['tope-4000-tokens-puntos-y-coma', NO_DISPONIBLE],
  ['tope-4000-tokens-println', NO_DISPONIBLE],
  ['tope-4000-tokens-declaraciones', NO_DISPONIBLE],
  ['tope-4000-tokens-incremento', NO_DISPONIBLE],
  ['tope-4000-tokens-if-chico', NO_DISPONIBLE],
  ['tope-4000-tokens-suma-larga', ANIDADO],
  // 4 001 tokens: un token de más, el aviso de tamaño (también la suma larga: el tamaño se revisa antes que la profundidad).
  ['tope-4001-tokens-puntos-y-coma', GRANDE],
  ['tope-4001-tokens-println', GRANDE],
  ['tope-4001-tokens-declaraciones', GRANDE],
  ['tope-4001-tokens-incremento', GRANDE],
  ['tope-4001-tokens-if-chico', GRANDE],
  ['tope-4001-tokens-suma-larga', GRANDE],
];

guardaDeCorpusConTablas({
  nombre: 'tope de tokens',
  ruta: 'corpus/experimentos/tope-de-tokens',
  errores: [],
  avisos: [],
  validos: VALIDOS,
  piso: 18,
});
