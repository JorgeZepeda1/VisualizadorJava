// Tarea 1.36 (C-5 y W-10 de la verificación final del lote 1) y su cierre en la 2.4 (hito 1, parte C): una constante de texto con un `double` (`"a" + 1.5 == "a1.5"`) es una expresión CONSTANTE para javac
// (JLS 15.29), de valor `true` o `false` que decide su `Double.toString`, y de ella dependen la alcanzabilidad de un ciclo, la asignación definitiva y las etiquetas `case`. Antes de la 1.36 el motor la tomaba
// por «no es constante» y respondía como si supiera (no veía el ciclo infinito ni el cuerpo inalcanzable que javac ve, C-5, y rechazaba programas válidos, W-10). La 1.36 agregó un tercer estado, «constante
// de valor desconocido», y las tres decisiones daban un aviso honesto, porque el motor no sabía convertir un `double` a texto. Con el `Double.toString` exacto de la biblioteca (la 2.4) el texto se pliega como
// lo hace Java y el motor decide con el valor real, igual que javac: lo que javac rechaza sale como el error exacto en la MISMA línea, y lo que compila, `ok`.
//
// `corpus/experimentos/constantes-desconocidas/` (26 programas con goldens del oráculo) lo vigila en `npm test`, sin JDK; ver `guarda-de-corpus-con-tablas.ts` para lo que fija cada tabla. Que los programas
// válidos se EJECUTEN igual que Java (`"a" + 1.5 == "a1.5"` es `true`: los dos textos son el mismo objeto internado) lo vigila `pruebas/diferencial/corpus-ejecucion.test.ts`.
import { guardaDeCorpusConTablas } from './guarda-de-corpus-con-tablas.ts';

const INALCANZABLE = 'sentencia-inalcanzable';

// Javac rechaza y el motor da el error exacto, en la MISMA línea que javac.
const ERRORES: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  // C-5 — javac RECHAZA («unreachable statement») porque la condición es constante: un ciclo que no termina deja inalcanzable lo que sigue, o una condición `false` deja inalcanzable el cuerpo.
  ['c5-while-con-un-texto-y-un-decimal-comparados', INALCANZABLE],
  ['c5-while-con-distinto-y-un-cuerpo-inalcanzable', INALCANZABLE],
  ['c5-do-while-con-un-texto-y-un-decimal', INALCANZABLE],
  ['c5-for-con-un-texto-y-un-decimal', INALCANZABLE],
  ['c5-while-con-una-variable-final-string', INALCANZABLE],
  ['c5-for-con-una-variable-final-boolean', INALCANZABLE],
  ['c5-while-con-dos-textos-con-decimal-iguales', INALCANZABLE],
  ['c5-while-con-el-decimal-a-la-izquierda', INALCANZABLE],
  ['c5-while-con-un-texto-vacio-y-un-decimal', INALCANZABLE],
  ['c5-while-con-una-negacion', INALCANZABLE],
  ['c5-while-con-un-y-logico-y-una-constante', INALCANZABLE],
  ['c5-while-con-un-decimal-dentro-de-un-parentesis-y-un-cast', INALCANZABLE],
  // Controles: sin decimales el texto SÍ se pliega desde antes de la 1.36, y una etiqueta con un `double` que NO es constante sigue siendo un error.
  ['k-condicion-conocida-con-un-entero-sigue-plegandose', INALCANZABLE],
  ['k-etiqueta-conocida-repetida-sigue-siendo-un-error', 'etiqueta-de-case-duplicada'],
  ['k-etiqueta-con-un-double-no-constante-sigue-siendo-un-error', 'etiqueta-de-case-no-constante'],
];

// Ya no queda nada que el motor no pueda revisar por completo: el tercer estado y su aviso (`constante-de-texto-con-decimal-no-soportada`) desaparecieron con la 2.4.
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [];

const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]> = [
  // W-10 — javac COMPILA: una etiqueta de `case` constante, y una condición constante que decide qué variable queda asignada. El motor daba un error inventado (antes de la 1.36) y un aviso (1.36); ahora decide.
  ['w10-case-con-un-texto-y-un-decimal', 'ok'],
  ['w10-case-con-una-variable-final-con-decimal', 'ok'],
  ['w10-case-con-un-cast-a-double-en-el-texto', 'ok'],
  ['w10-asignacion-definitiva-con-if-y-un-texto-con-decimal', 'ok'],
  ['w10-asignacion-definitiva-con-while-y-break', 'ok'],
  ['w10-asignacion-definitiva-con-una-variable-final-boolean', 'ok'],
  // Controles — javac COMPILA y NINGUNA decisión depende del valor del texto (se declara, se imprime, se compara sin decidir nada, un `if` no mira la condición para la alcanzabilidad).
  ['k-texto-con-un-decimal-solo-declarado-valido', 'ok'],
  ['k-variable-final-con-un-decimal-impresa-valido', 'ok'],
  ['k-comparacion-de-un-texto-con-decimal-sin-decision-valida', 'ok'],
  ['k-if-con-un-texto-con-decimal-valido', 'ok'],
  ['k-texto-con-un-double-que-no-es-constante-en-un-while-valido', 'ok'],
];

guardaDeCorpusConTablas({
  nombre: 'constantes con decimales',
  ruta: 'corpus/experimentos/constantes-desconocidas',
  errores: ERRORES,
  avisos: AVISOS,
  validos: VALIDOS,
  piso: 26,
});
