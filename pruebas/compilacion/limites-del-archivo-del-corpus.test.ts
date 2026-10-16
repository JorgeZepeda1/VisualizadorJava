// Tarea 1.36 (C-4a de la verificación final del lote 1): javac 17 rechaza una constante de texto de 65 535 caracteres o más (`limit.string`, «constant string too long») y una entrada de más de 65 535
// BYTES en el archivo de clase (`limit.string.overflow`, «UTF8 representation … is too long for the constant pool»); el motor las aceptaba y las ejecutaba. Desde esta tarea la pasada
// `semantica/limites-del-archivo.ts` modela las dos reglas, medidas al byte con javac real: la frontera (65 534 / 65 535 caracteres; 65 535 / 65 536 bytes con acentos, euros y emojis), la POSICIÓN del error
// (el operador de una suma, el literal que junta el analizador de javac, el paréntesis, la palabra `switch`, la palabra `class`), el ORDEN en que javac genera el código, la receta de una concatenación
// que no es constante (con operandos que ocupan dos ranuras, con marcas `\u0001`, partida cada 200 ranuras), lo que `Lower` poda y lo que el motor no puede decidir (un decimal en el texto, condiciones
// constantes alrededor): aviso honesto, nunca `ok` ni un error inventado.
//
// Los goldens son del oráculo, que compila con `javac -g` (ADR 011, como NetBeans): con `-g` una `final` constante también se genera, así que una `final` de más de 65 535 bytes da el exceso aunque nadie la use.
// Para que ningún archivo pese 64 KB, los textos largos se ARMAN plegando constantes (`final String A3 = A2 + A2;`): javac los pliega igual que un literal enorme.
//
// `corpus/experimentos/limites-del-archivo/` (92 programas) lo vigila en `npm test`, sin JDK; ver `guarda-de-corpus-con-tablas.ts` para lo que fija cada tabla.
import { guardaDeCorpusConTablas } from './guarda-de-corpus-con-tablas.ts';

const CARACTERES = 'texto-con-demasiados-caracteres';
const BYTES = 'texto-con-demasiados-bytes';
const AVISO = 'tamano-de-texto-no-revisable';
const ANIDADO = 'programa-demasiado-anidado';

// Javac rechaza y el motor da el error exacto, en la MISMA línea que javac (la línea es la del `.errores` de cada golden).
const ERRORES: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  // limit.string — en qué sitios se revisa una constante de 65 535 caracteres: un inicializador, una `final` aunque nadie la use, una asignación, un argumento, un formato de `printf`, un operando de una
  // comparación, un receptor, el cuerpo de un ciclo, la etiqueta de un `switch` (en la línea del `switch`), un número pegado al texto, un carácter delante.
  ['ls-final-sin-uso-65535', CARACTERES],
  ['ls-inicializador-65535', CARACTERES],
  ['ls-println-65535', CARACTERES],
  ['ls-asignacion-65535', CARACTERES],
  ['ls-argumento-de-equals-65535', CARACTERES],
  ['ls-receptor-entre-parentesis-65535', CARACTERES],
  ['ls-operando-de-una-comparacion-65535', CARACTERES],
  ['ls-formato-de-printf-65535', CARACTERES],
  ['ls-cuerpo-de-un-while-65535', CARACTERES],
  ['ls-numero-pegado-65533-mas-12', CARACTERES],
  ['ls-caracter-pegado-delante-65534', CARACTERES],
  ['ls-etiqueta-de-switch-65535', CARACTERES],
  ['ls-etiqueta-con-una-final-larga', CARACTERES],
  ['ls-dos-textos-largos-gana-el-primero', CARACTERES],
  // La POSICIÓN que javac le da al árbol (JCTree.pos): el último operador de una suma, el literal que junta el analizador, el inicio del nombre que sigue a los literales juntados, el `(` de un paréntesis o de
  // un cast.
  ['ls-pos-suma-de-nombres-en-tres-lineas', CARACTERES],
  ['ls-pos-operador-al-final-de-linea', CARACTERES],
  ['ls-pos-dos-literales-y-un-nombre', CARACTERES],
  ['ls-pos-nombre-y-dos-literales', CARACTERES],
  ['ls-pos-literales-que-no-son-vecinos', CARACTERES],
  ['ls-pos-dos-literales-y-dos-nombres', CARACTERES],
  ['ls-pos-solo-un-literal-y-un-nombre', CARACTERES],
  ['ls-pos-parentesis-en-otra-linea', CARACTERES],
  ['ls-pos-cast-en-otra-linea', CARACTERES],
  ['ls-pos-argumento-en-otra-linea', CARACTERES],
  ['ls-pos-argumento-de-println-en-otra-linea', CARACTERES],
  ['ls-pos-asignacion-en-otra-linea', CARACTERES],
  ['ls-pos-inicializador-final-con-suma', CARACTERES],
  // El ORDEN en que `Gen` genera el código: un `for` genera su cuerpo antes que su paso, un `switch` sobre texto genera todas sus etiquetas antes que los cuerpos, y `limit.string` (de `Gen`) gana al
  // exceso de bytes (de `ClassWriter`) aunque este aparezca antes en el programa.
  ['ls-orden-for-cuerpo-antes-que-paso', CARACTERES],
  ['ls-orden-switch-etiquetas-antes-que-cuerpos', CARACTERES],
  ['ls-orden-limit-string-antes-que-bytes', CARACTERES],
  // Un `&&` con el lado izquierdo NO constante genera el derecho: error normal.
  ['poda-y-con-el-lado-izquierdo-no-constante', CARACTERES],
  // Un decimal en el texto: con 65 532 caracteres el decimal mide al menos 3 y la suma llega a 65 535 sí o sí.
  ['dec-65532-mas-un-decimal-excede', CARACTERES],
  ['dec-final-65532-mas-un-decimal-excede', CARACTERES],

  // limit.string.overflow — más de 65 535 BYTES en una entrada, anclado en la palabra `class` (línea 1, o la de `class` si hay comentarios y `public` en otra línea): letras con acento (2 bytes), euros (3),
  // emojis (6), una `final` aunque nadie la use (con `-g`), una `final` usada, una etiqueta de `switch`.
  ['ob-acentos-32768', BYTES],
  ['ob-euro-21846', BYTES],
  ['ob-emoji-10923', BYTES],
  ['ob-clase-en-otra-linea', BYTES],
  ['ob-final-sin-uso-con-bytes-de-mas', BYTES],
  ['ob-final-usada-en-println', BYTES],
  ['ob-final-usada-en-una-variable', BYTES],
  ['ob-final-usada-en-equals', BYTES],
  ['ob-etiqueta-con-acentos', BYTES],
  // La receta de una concatenación que no es constante: las constantes más un byte por operando dinámico; una marca `\u0001` va aparte; `+=` y `s = s + …`; partida cada 200 ranuras (90 y 150 operandos no
  // se parten, 250 sí pero la primera receta ya pasa).
  ['ob-receta-65535-mas-un-operando', BYTES],
  ['ob-receta-dos-operandos-65534', BYTES],
  ['ob-receta-acentos-32768', BYTES],
  ['ob-receta-en-println-65535', BYTES],
  ['ob-receta-con-mas-igual-65535', BYTES],
  ['ob-receta-s-mas-un-texto-65535', BYTES],
  ['ob-receta-con-una-final-de-40000-dos-veces', BYTES],
  ['ob-receta-con-marca-u0001-excede', BYTES],
  ['ob-receta-90-operandos-65450', BYTES],
  ['ob-receta-150-operandos-65450', BYTES],
  // Tarea 1.37 (S-10: sabotajes que sobrevivían — la guarda faltaba, no la producción). El cuerpo de un `if` cuya condición NO es constante genera su texto como cualquier otro (S37), la
  // actualización de un `for` también (S38), y la receta se parte cuando las ranuras llegan a 200 —un `long` o un `double` ocupa dos— (S19): 98 operandos `long` ya no caben con 65 440 de
  // texto; con 99, sí si la constante va al final (el texto va en la última receta) y no si va al principio; 100 también, y 65 535 ya no. Son programas de los conjuntos d06b/c/d del verificador.
  ['cx-if-sin-poda-65535-caracteres', CARACTERES],
  ['cx-if-sin-poda-acentos-65536-bytes', BYTES],
  ['cx-actualizacion-del-for-65535-caracteres', CARACTERES],
  ['cx-actualizacion-del-for-acentos-65536-bytes', BYTES],
  ['cx-receta-98-long-constante-al-final-65440', BYTES],
  ['cx-receta-99-long-constante-al-principio-65440', BYTES],
  ['cx-receta-100-long-constante-al-final-65535', BYTES],
  ['dec-receta-excede', BYTES],
];

// Javac rechaza y el motor no puede decidir cuál es el primer error (o si lo hay): aviso honesto, nunca `ok`. Un `if (true)` o `true && …` alrededor del texto: javac poda código que el motor no sigue más
// allá de la rama que se descarta; una condición constante junto a una `final` de más de 65 535 bytes, igual.
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  ['poda-if-true-con-texto-largo-aviso', AVISO],
  ['poda-true-y-un-texto-largo-aviso', AVISO],
  ['ob-final-con-bytes-de-mas-solo-en-una-condicion-constante', AVISO],
  // Tarea 1.37 (W-12): 250 operandos son un árbol de 250 niveles, más del tope de profundidad del árbol (200, `motor/limites.ts`): antes de llegar a esta pasada el aviso es el de anidamiento. La pasada
  // sigue probada sola con 250 y 400 operandos (`semantica/limites-del-archivo.test.ts`, con los topes levantados).
  ['ob-receta-250-operandos-65450', ANIDADO],
];

// Javac COMPILA: nunca un error. Un programa de clase sin nada que contar sale `ejecucion-no-disponible` mientras el lote 2 no baje esos `String` al IR; los que el motor no puede medir con seguridad,
// el aviso del tamaño del texto.
const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: string]> = [
  // La frontera de limit.string: con 65 534 caracteres, en cada forma, Java lo acepta.
  ['ls-final-sin-uso-65534-valido', 'ejecucion-no-disponible'],
  ['ls-inicializador-65534-valido', 'ejecucion-no-disponible'],
  ['ls-println-65534-valido', 'ok'],
  ['ls-numero-pegado-65533-mas-1-valido', 'ejecucion-no-disponible'],
  ['ls-etiqueta-de-switch-65534-valida', 'ok'],
  ['ls-comparacion-plegada-no-genera-sus-textos-valida', 'ok'],
  // La frontera de los bytes: un byte menos, en cada alfabeto; una `final` justa; una condición plegada con finales cortas (un boolean no carga sus textos); una etiqueta justa.
  ['ob-acentos-32767-valido', 'ejecucion-no-disponible'],
  ['ob-euro-21845-valido', 'ejecucion-no-disponible'],
  ['ob-emoji-10922-valido', 'ejecucion-no-disponible'],
  ['ob-final-con-bytes-justos-valida', 'ok'],
  ['ob-condicion-plegada-con-finales-cortas-valida', 'ok'],
  ['ob-etiqueta-con-acentos-32767-valida', 'ok'],
  // La receta justa: un operando, dos, con acentos, con `+=`, con una `final`, con una marca (la constante con `\u0001` o `\u0002` va aparte), partida por muchos operandos y por operandos `long` (2 ranuras).
  ['ob-receta-65534-mas-un-operando-valida', 'ejecucion-no-disponible'],
  ['ob-receta-dos-operandos-65533-valida', 'ejecucion-no-disponible'],
  ['ob-receta-acentos-32767-valida', 'ejecucion-no-disponible'],
  ['ob-receta-con-mas-igual-65534-valida', 'ejecucion-no-disponible'],
  ['ob-receta-con-una-final-de-40000-valida', 'ejecucion-no-disponible'],
  ['ob-receta-con-una-final-y-println-valida', 'ejecucion-no-disponible'],
  ['ob-receta-con-marca-u0001-valida', 'ejecucion-no-disponible'],
  ['ob-receta-con-marca-u0002-valida', 'ejecucion-no-disponible'],
  ['ob-receta-150-operandos-65300-valida', 'ejecucion-no-disponible'],
  ['ob-receta-400-operandos-valida', ANIDADO], // tarea 1.37: 400 operandos pasan del tope de profundidad del árbol (200)
  // Tarea 1.37 (S-10): un byte menos que los de arriba, y las recetas que caben. Un `if` con condición variable y la actualización de un `for` generan su texto: 65 534 caracteres caben.
  ['cx-if-sin-poda-65534-caracteres-valido', 'ok'],
  ['cx-actualizacion-del-for-65534-caracteres-valida', 'ok'],
  ['cx-receta-99-long-constante-al-final-65440-valida', 'ok'],
  ['cx-receta-99-double-constante-al-final-65535-valida', 'ejecucion-no-disponible'],
  ['cx-receta-100-long-constante-al-final-65534-valida', 'ok'],
  ['ob-receta-con-operandos-long-ocupan-dos-ranuras', 'ejecucion-no-disponible'],
  // Lo que `Lower` poda y `Gen` no genera: la rama que no se toma de un `if` con condición constante, el lado derecho de `false && …` y de `true || …`.
  ['poda-if-false-con-texto-largo-valido', 'ok'],
  ['poda-else-de-un-if-true-valido', 'ok'],
  ['poda-final-false-valido', 'ok'],
  ['poda-false-y-un-texto-largo-valido', 'ejecucion-no-disponible'],
  ['poda-true-o-un-texto-largo-valido', 'ejecucion-no-disponible'],
  ['poda-sin-texto-largo-no-cambia-nada-valido', 'ok'],
  // Javac compila el código que `Gen` descarta tras un `if (true) return;` o tras un ciclo cuyo `break` está podado, pero el motor no sigue esa poda: con un texto largo ahí no puede decidir, avisa.
  ['poda-return-despues-de-if-true-valido-con-aviso', AVISO],
  ['poda-while-true-con-if-false-break-valido-con-aviso', AVISO],
  // Un decimal en el texto (su largo lo decide `Double.toString`, lote 2): lejos del límite no importa; si el límite cae dentro de lo que puede medir (de 3 a 25 caracteres), avisa.
  ['dec-lejos-del-limite-valido', 'ejecucion-no-disponible'],
  ['dec-65520-mas-un-decimal-valido-con-aviso', AVISO],
  ['dec-65531-mas-un-decimal-cabe-valido-con-aviso', AVISO],
  ['dec-receta-justa-valida-con-aviso', AVISO],
];

guardaDeCorpusConTablas({
  nombre: 'límites del archivo',
  ruta: 'corpus/experimentos/limites-del-archivo',
  errores: ERRORES,
  avisos: AVISOS,
  validos: VALIDOS,
  piso: 104,
});
