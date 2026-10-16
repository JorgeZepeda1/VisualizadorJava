// Tarea 1.36 (C-5 y W-10 de la verificación final del lote 1): una constante de texto con un `double` (`"a" + 1.5 == "a1.5"`) es una expresión CONSTANTE para javac (JLS 15.29), de valor `true` o
// `false` que decide su `Double.toString`. El motor la tomaba por «no es constante» —porque no sabe convertir un `double` a texto— y respondía como si lo supiera: no veía el ciclo infinito ni el cuerpo
// inalcanzable que javac ve (C-5, falsos aceptos: `ejecucion-no-disponible` donde javac dice «unreachable statement») y rechazaba programas válidos (W-10, falsos rechazos: una etiqueta `case
// "d" + 1.5:` o una condición `if ("a" + 1.5 == "a1.5") x = 1;` que javac compila). Es el mismo defecto de fondo que cerró la 1.34 para los TIPOS desconocidos, en otra dimensión: el VALOR constante
// desconocido. Ahora hay un tercer estado, y toda decisión que dependa de su valor es un aviso honesto (`constante-de-texto-con-decimal-no-soportada`), nunca una respuesta inventada; el cálculo real
// es de la 2.3/2.4 (`Double.toString` fiel).
//
// `corpus/experimentos/constantes-desconocidas/` (26 programas con goldens del oráculo) lo vigila en `npm test`, sin JDK; ver `guarda-de-corpus-con-tablas.ts` para lo que fija cada tabla.
import { guardaDeCorpusConTablas } from './guarda-de-corpus-con-tablas.ts';

const AVISO = 'constante-de-texto-con-decimal-no-soportada';

// Javac rechaza y el motor sigue dando el error exacto: sin decimales el texto SÍ se pliega y la condición o la etiqueta son conocidas.
const ERRORES: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['k-condicion-conocida-con-un-entero-sigue-plegandose', 'sentencia-inalcanzable'],
  ['k-etiqueta-conocida-repetida-sigue-siendo-un-error', 'etiqueta-de-case-duplicada'],
  ['k-etiqueta-con-un-double-no-constante-sigue-siendo-un-error', 'etiqueta-de-case-no-constante'],
];

// C-5 — javac RECHAZA («unreachable statement») porque la condición es constante; el motor no puede saber su valor: aviso.
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['c5-while-con-un-texto-y-un-decimal-comparados', AVISO],
  ['c5-while-con-distinto-y-un-cuerpo-inalcanzable', AVISO],
  ['c5-do-while-con-un-texto-y-un-decimal', AVISO],
  ['c5-for-con-un-texto-y-un-decimal', AVISO],
  ['c5-while-con-una-variable-final-string', AVISO],
  ['c5-for-con-una-variable-final-boolean', AVISO],
  ['c5-while-con-dos-textos-con-decimal-iguales', AVISO],
  ['c5-while-con-el-decimal-a-la-izquierda', AVISO],
  ['c5-while-con-un-texto-vacio-y-un-decimal', AVISO],
  ['c5-while-con-una-negacion', AVISO],
  ['c5-while-con-un-y-logico-y-una-constante', AVISO],
  ['c5-while-con-un-decimal-dentro-de-un-parentesis-y-un-cast', AVISO],
];

const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]> = [
  // W-10 — javac COMPILA: una etiqueta de `case` constante, y una condición constante que decide qué variable queda asignada. El motor daba un error inventado; ahora, el aviso honesto.
  ['w10-case-con-un-texto-y-un-decimal', AVISO],
  ['w10-case-con-una-variable-final-con-decimal', AVISO],
  ['w10-case-con-un-cast-a-double-en-el-texto', AVISO],
  ['w10-asignacion-definitiva-con-if-y-un-texto-con-decimal', AVISO],
  ['w10-asignacion-definitiva-con-while-y-break', AVISO],
  ['w10-asignacion-definitiva-con-una-variable-final-boolean', AVISO],
  // Controles — javac COMPILA y NINGUNA decisión depende del valor del texto (se declara, se imprime, se compara sin decidir nada, un `if` no mira la condición para la alcanzabilidad):
  // nada cambia, ni aviso ni error.
  ['k-texto-con-un-decimal-solo-declarado-valido', 'ejecucion-no-disponible'],
  ['k-variable-final-con-un-decimal-impresa-valido', 'ejecucion-no-disponible'],
  ['k-comparacion-de-un-texto-con-decimal-sin-decision-valida', 'ejecucion-no-disponible'],
  ['k-if-con-un-texto-con-decimal-valido', 'ejecucion-no-disponible'],
  ['k-texto-con-un-double-que-no-es-constante-en-un-while-valido', 'ejecucion-no-disponible'],
];

guardaDeCorpusConTablas({
  nombre: 'constantes desconocidas',
  ruta: 'corpus/experimentos/constantes-desconocidas',
  errores: ERRORES,
  avisos: AVISOS,
  validos: VALIDOS,
  piso: 26,
});
