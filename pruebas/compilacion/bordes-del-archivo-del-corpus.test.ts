// Tarea 1.36 (agregada por el orquestador, decisión del PO 2026-10-05: «A, corrígelo antes del merge»): los bordes del archivo y del léxico que halló la verificación final
// del lote 1 (1.1–1.35) buscando donde nadie había mirado —los tokens, los fines de línea, los nombres de paquete, los límites del archivo de clase y los caracteres invisibles—:
//   C-1  los tres puntos de `String... args` son UN token de puntos pegados (JLS 3.11); separados, javac rechaza y el motor ejecutaba;
//   C-2  el retorno de carro suelto `\r` es un fin de línea (JLS 3.4), y W-2 el `U+001A` final se ignora (JLS 3.5);
//   C-3  `package java.util;` (cualquier paquete que exporta el JDK) es «package exists in another module»;
//   C-4  los límites del archivo de clase: una constante de texto de 65 535 o más caracteres, o de más de 65 535 bytes en UTF-8 modificado;
//   W-1  los caracteres ignorables de identificador (`U+200B`, `U+00AD`, `U+FEFF`…) DENTRO de un nombre: javac los salta, y el visualizador culpaba al alumno de una variable que sí existe.
//
// Esta guarda vigila, en `npm test` y SIN JDK, el programa mínimo de cada familia (`corpus/experimentos/bordes-del-archivo/`) con los goldens del oráculo: el veredicto y la LÍNEA de
// javac salen del `.errores` real de cada programa (nunca escritos a mano). Lo que fija cada tabla es la respuesta de NUESTRO compilador:
//   - dentro del subconjunto U3–U7 (REQ-COMP-006): un error de compilación con la MISMA línea que javac;
//   - lo que no se puede revisar por completo (D2, ADR 003/004): el aviso honesto, nunca `ok` ni «Java sí acepta tu programa»;
//   - un programa que javac compila (los controles): nunca un error; o ok, o el aviso honesto que se declara.
// `programas-validos.test.ts` y `programas-invalidos.test.ts` recorren además el mismo corpus con la regla general.
import { guardaDeCorpusConTablas } from './guarda-de-corpus-con-tablas.ts';

// Programas que javac RECHAZA y que el subconjunto modela: nuestro error, con la línea de javac.
const ERRORES: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  // C-1 — los tres puntos de un varargs van pegados: javac `expected` («<identifier> expected») o `illegal.dot` («illegal '.'»).
  ['c1-varargs-con-puntos-separados', 'error-no-clasificado'],
  ['c1-varargs-dos-puntos-juntos-y-uno-aparte', 'error-no-clasificado'],
  ['c1-varargs-uno-aparte-y-dos-juntos', 'error-no-clasificado'],
  ['c1-varargs-comentario-entre-los-dos-primeros', 'error-no-clasificado'],
  ['c1-varargs-comentario-entre-los-dos-ultimos', 'error-no-clasificado'],
  ['c1-varargs-salto-de-linea-tras-el-primero', 'error-no-clasificado'],
  ['c1-varargs-salto-de-linea-tras-el-segundo', 'error-no-clasificado'],
  ['c1-varargs-puntos-separados-por-espacios', 'error-no-clasificado'],
  ['c1-varargs-con-final-y-puntos-separados', 'error-no-clasificado'],
  // C-3 — un `package` con el nombre de un paquete que el JDK exporta: javac `package.in.other.module`, en la línea del `package` (antes que cualquier error de tipos).
  ['c3-paquete-java-util', 'paquete-del-jdk'],
  ['c3-paquete-java-lang', 'paquete-del-jdk'],
  ['c3-paquete-java-io', 'paquete-del-jdk'],
  ['c3-paquete-javax-swing', 'paquete-del-jdk'],
  ['c3-paquete-java-sql', 'paquete-del-jdk'],
  ['c3-paquete-java-util-concurrent', 'paquete-del-jdk'],
  ['c3-paquete-com-sun-net-httpserver', 'paquete-del-jdk'],
  ['c3-paquete-org-w3c-dom', 'paquete-del-jdk'],
  ['c3-paquete-del-jdk-y-un-error-de-tipos-despues', 'paquete-del-jdk'],
  // C-3 → 1.37 — el nombre del paquete es el de una CLASE que javac ya conoce al leer el `package` (todo `java.lang`, siempre a la vista): javac `pkg.clashes.with.class.of.same.name`, en la línea del
  // `package`. En la 1.36 era un aviso («depende de lo que cargue el programa»); la tarea 1.37 midió con el oráculo cuáles son, y es un error modelado (ver `paquetes-que-chocan-del-corpus.test.ts`).
  ['c3-paquete-con-nombre-de-clase-java-lang-string', 'paquete-con-nombre-de-clase'],
  ['c3-paquete-con-nombre-de-clase-java-lang-math', 'paquete-con-nombre-de-clase'],
  // C-2 — el `\r` suelto es un fin de línea (JLS 3.4): cierra mal una cadena o un `char`, no esconde el `;` que faltaba en un comentario, y la cuenta de líneas es la de javac
  // (`\r`, `\n` y la pareja `\r\n` cuentan UNO; `\n\r` y `\r\r\n` cuentan DOS).
  ['c2-retorno-de-carro-suelto-en-un-char', 'error-no-clasificado'],
  ['c2-retorno-de-carro-suelto-en-una-cadena', 'cadena-sin-cerrar'],
  ['c2-retorno-de-carro-suelto-al-final-de-una-cadena', 'cadena-sin-cerrar'],
  ['c2-retorno-de-carro-suelto-y-nada-mas-en-una-cadena', 'cadena-sin-cerrar'],
  ['c2-retorno-de-carro-suelto-que-cierra-un-comentario-y-falta-punto-y-coma', 'falta-punto-y-coma'],
  ['c2-error-en-la-cuarta-linea-con-solo-retornos-de-carro', 'variable-ya-definida'],
  ['c2-error-en-la-cuarta-linea-con-parejas-de-windows', 'variable-ya-definida'],
  ['c2-error-tras-un-salto-y-un-retorno-de-carro-por-linea', 'variable-ya-definida'],
  ['c2-error-tras-un-retorno-de-carro-y-una-pareja-por-linea', 'variable-ya-definida'],
  // W-1 — un carácter invisible NO puede abrir un nombre (javac `illegal.char`: «illegal character: '\\u200b'»), y los espacios raros que no son ignorables no se saltan dentro de uno.
  ['w1-invisible-al-inicio-de-un-nombre', 'error-no-clasificado'],
  ['w1-espacio-sin-separacion-dentro-de-un-nombre', 'error-no-clasificado'],
  ['w1-espacio-de-un-cuadratin-dentro-de-un-nombre', 'error-no-clasificado'],
  ['w1-invisible-suelto-entre-dos-palabras', 'error-no-clasificado'],
  // W-2b — el U+001A entre dos sentencias de `main` corta la entrada a la mitad: javac `premature.eof` («reached end of file while parsing»).
  ['w2b-fin-de-archivo-de-ms-dos-a-la-mitad-de-main', 'error-no-clasificado'],
];

// Programas que javac RECHAZA y que no se pueden revisar por completo: aviso, nunca `ok` ni «Java sí acepta tu programa». Desde la tarea 1.37 no queda ninguno en esta carpeta: los dos
// que había (`package java.lang.String;` y `java.lang.Math`) son errores modelados con los nombres que midió el oráculo.
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [];

// Controles: programas que javac COMPILA. Nunca un error: `ok` (el programa se ejecuta) o el aviso honesto de lo que usa.
const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]> = [
  ['c1-varargs-pegado-valido', 'ok'],
  ['c1-varargs-con-espacio-antes-valido', 'ok'],
  ['c1-varargs-sin-espacio-despues-valido', 'ok'],
  ['c1-varargs-con-final-valido', 'ok'],
  ['c1-varargs-con-comentarios-alrededor-valido', 'ok'],
  // C-3 — el `package` de NetBeans y los nombres que se parecen a uno del JDK sin serlo: javac los compila. Tarea 1.38 (W-15): los que están DENTRO de `java` (`java`, `java.utils`, `java.util.foo`,
  // `java.util.Map`) son `paquete-reservado-por-java` —el lanzador real se detiene con «Prohibited package name», está en el `.errores` de cada golden—; los demás (`javax`, `Java.util`, `aula.java`…) siguen en `ok`.
  // Tarea 1.39 (W-16): los dos paquetes de un módulo del JDK que el módulo no exporta (`jdk.internal.misc`, `sun.nio.ch`) los compila javac y el lanzador real tampoco los arranca —el `.errores` de cada golden
  // guardaba el «no se ha encontrado o cargado la clase principal» desde la 1.36, y aquí figuraban como `ok`—: son `paquete-interno-del-jdk`.
  ['c3-paquete-miproyecto-valido', 'ok'],
  ['c3-paquete-con-subpaquetes-valido', 'ok'],
  ['c3-paquete-java-valido', 'paquete-reservado-por-java'],
  ['c3-paquete-javax-valido', 'ok'],
  ['c3-paquete-aula-java-valido', 'ok'],
  ['c3-paquete-java-utils-valido', 'paquete-reservado-por-java'],
  ['c3-paquete-java-util-con-mayuscula-valido', 'ok'],
  ['c3-paquete-java-util-foo-valido', 'paquete-reservado-por-java'],
  ['c3-paquete-interno-no-exportado-valido', 'paquete-interno-del-jdk'],
  ['c3-paquete-sun-no-exportado-valido', 'paquete-interno-del-jdk'],
  ['c3-paquete-con-nombre-de-clase-java-util-map-valido', 'paquete-reservado-por-java'],
  // C-2/W-2a — el `\r` cierra el comentario `//` (no se traga la línea siguiente), y el programa entero con parejas de Windows, con `\r` solos o con los tres mezclados compila.
  ['c2-comentario-cerrado-por-un-retorno-de-carro-valido', 'ok'],
  ['c2-comentario-de-bloque-con-retorno-de-carro-valido', 'ok'],
  ['c2-programa-con-fines-de-linea-de-windows-valido', 'ok'],
  ['c2-programa-con-solo-retornos-de-carro-valido', 'ok'],
  ['c2-programa-con-los-tres-fines-de-linea-mezclados-valido', 'ok'],
  // W-1 — los caracteres ignorables DENTRO de un nombre o de una palabra clave se saltan (`scanIdent` de javac): el programa compila y el nombre es el de siempre.
  ['w1-clase-del-sistema-con-ancho-cero-valido', 'ok'],
  ['w1-ignorable-al-final-de-una-palabra-clave-valido', 'ok'],
  ['w1-metodo-con-guion-blando-valido', 'ok'],
  ['w1-nombre-con-varios-invisibles-valido', 'ok'],
  ['w1-palabra-clave-con-ancho-cero-valido', 'ok'],
  ['w1-palabra-clave-del-encabezado-con-guion-blando-valido', 'ok'],
  ['w1-variable-con-bom-valido', 'ok'],
  ['w1-variable-con-caracter-de-control-valido', 'ok'],
  ['w1-variable-con-espacio-de-ancho-cero-valido', 'ok'],
  ['w1-variable-con-guion-blando-valido', 'ok'],
  ['w1-variable-con-marca-de-izquierda-a-derecha-valido', 'ok'],
  ['w1-variable-con-separador-de-vocales-mongol-valido', 'ok'],
  ['w1-variable-con-unidor-de-palabras-valido', 'ok'],
  ['w1-variable-con-union-de-ancho-cero-valido', 'ok'],
  ['w1-variable-declarada-con-el-invisible-y-usada-sin-el-valido', 'ok'],
  ['w1-variable-declarada-sin-el-invisible-y-usada-con-el-valido', 'ok'],
  // W-2b — el U+001A (Ctrl-Z) donde empezaría un token es el fin de la entrada: lo que sigue no se lee; dentro de un nombre se salta, y en un comentario o una cadena es un carácter más.
  ['w2b-fin-de-archivo-de-ms-dos-al-final-valido', 'ok'],
  ['w2b-fin-de-archivo-de-ms-dos-al-principio-valido', 'archivo-sin-clase'],
  ['w2b-fin-de-archivo-de-ms-dos-dentro-de-un-comentario-valido', 'ok'],
  ['w2b-fin-de-archivo-de-ms-dos-dentro-de-un-nombre-valido', 'ok'],
  ['w2b-fin-de-archivo-de-ms-dos-dentro-de-una-cadena-valido', 'ok'],
  ['w2b-fin-de-archivo-de-ms-dos-seguido-de-basura-valido', 'ok'],
  ['w2b-fin-de-archivo-de-ms-dos-sin-salto-final-valido', 'ok'],
  ['w2b-fin-de-archivo-de-ms-dos-y-otra-clase-despues-valido', 'ok'],
];

guardaDeCorpusConTablas({
  nombre: 'bordes del archivo',
  ruta: 'corpus/experimentos/bordes-del-archivo',
  errores: ERRORES,
  avisos: AVISOS,
  validos: VALIDOS,
  piso: 79,
});
