// Tarea 1.37 (C-6 de la verificación del delta del lote 1): `package java.lang.Shutdown;` (y otros 33 nombres de clase no pública de `java.lang`, más `java.lang.runtime.SwitchBootstraps`) lo rechaza javac —
// «package java.lang.Shutdown clashes with class of same name», `pkg.clashes.with.class.of.same.name`— y el motor lo daba por bueno: solo conocía los tipos PÚBLICOS importables. El chequeo de javac
// (`TypeEnter.checkClassPackageClash`) corre antes de resolver los imports, compara cada PREFIJO del nombre del paquete con las clases que el compilador ya conoce al leer el `package` —todo `java.lang`,
// público o no, anidado o no, y las pocas que él mismo crea de antemano— y no depende del cuerpo del programa. La lista de esas clases sale del oráculo (`GenerarClasesQueChocan.java`).
//
// Esta guarda vigila, en `npm test` y SIN JDK, cada familia con los goldens del oráculo (`corpus/experimentos/paquetes-que-chocan/`): el veredicto y la LÍNEA de javac salen del `.errores` real de
// cada programa. Lo que fija cada tabla es la respuesta de NUESTRO compilador:
//   - ERRORES: javac rechaza y el motor modela la regla → `paquete-con-nombre-de-clase`, un error de compilación con la MISMA línea que javac;
//   - VALIDOS: javac compila → nunca un error: `ok`, o el aviso honesto de una clase pública del JDK en un paquete (`paquete-con-nombre-de-clase-no-soportado`: javac la compila, pero el JDK real
//     no ejecuta un programa en un paquete `java.*` —`SecurityException: Prohibited package name`— y el visualizador no lo presenta como correcto).
import { guardaDeCorpusConTablas } from './guarda-de-corpus-con-tablas.ts';

const ERROR = 'paquete-con-nombre-de-clase';
const AVISO = 'paquete-con-nombre-de-clase-no-soportado';

const ERRORES: ReadonlyArray<readonly [archivo: string, codigo: string]> = [
  // las 33 clases NO públicas de java.lang que halló la verificación del delta: el catálogo de tipos importables no las conocía y el motor daba ok.
  ['c6-no-publica-java-lang-abstractstringbuilder', ERROR],
  ['c6-no-publica-java-lang-applicationshutdownhooks', ERROR],
  ['c6-no-publica-java-lang-assertionstatusdirectives', ERROR],
  ['c6-no-publica-java-lang-characterdata', ERROR],
  ['c6-no-publica-java-lang-characterdata00', ERROR],
  ['c6-no-publica-java-lang-characterdata01', ERROR],
  ['c6-no-publica-java-lang-characterdata02', ERROR],
  ['c6-no-publica-java-lang-characterdata03', ERROR],
  ['c6-no-publica-java-lang-characterdata0e', ERROR],
  ['c6-no-publica-java-lang-characterdatalatin1', ERROR],
  ['c6-no-publica-java-lang-characterdataprivateuse', ERROR],
  ['c6-no-publica-java-lang-characterdataundefined', ERROR],
  ['c6-no-publica-java-lang-charactername', ERROR],
  ['c6-no-publica-java-lang-compoundenumeration', ERROR],
  ['c6-no-publica-java-lang-conditionalspecialcasing', ERROR],
  ['c6-no-publica-java-lang-fdlibm', ERROR],
  ['c6-no-publica-java-lang-livestackframe', ERROR],
  ['c6-no-publica-java-lang-livestackframeinfo', ERROR],
  ['c6-no-publica-java-lang-namedpackage', ERROR],
  ['c6-no-publica-java-lang-processenvironment', ERROR],
  ['c6-no-publica-java-lang-processhandleimpl', ERROR],
  ['c6-no-publica-java-lang-processimpl', ERROR],
  ['c6-no-publica-java-lang-publicmethods', ERROR],
  ['c6-no-publica-java-lang-shutdown', ERROR],
  ['c6-no-publica-java-lang-stackframeinfo', ERROR],
  ['c6-no-publica-java-lang-stackstreamfactory', ERROR],
  ['c6-no-publica-java-lang-stringcoding', ERROR],
  ['c6-no-publica-java-lang-stringconcathelper', ERROR],
  ['c6-no-publica-java-lang-stringlatin1', ERROR],
  ['c6-no-publica-java-lang-stringutf16', ERROR],
  ['c6-no-publica-java-lang-terminator', ERROR],
  ['c6-no-publica-java-lang-versionprops', ERROR],
  ['c6-no-publica-java-lang-weakpairmap', ERROR],
  // una API en vista previa (el catálogo la excluye porque javac no deja usarla, pero el compilador sí la conoce).
  ['c6-vista-previa-java-lang-runtime-switchbootstraps', ERROR],
  // públicas de java.lang: antes un aviso, ahora un error (javac las rechaza siempre).
  ['c6-publica-java-lang-object', ERROR],
  ['c6-publica-java-lang-integer', ERROR],
  ['c6-publica-java-lang-runtime', ERROR],
  // las clases que el compilador crea de antemano, fuera de java.lang.
  ['c6-de-antemano-java-io-serializable', ERROR],
  ['c6-de-antemano-java-util-iterator', ERROR],
  ['c6-de-antemano-java-util-list', ERROR],
  ['c6-de-antemano-java-util-arrays', ERROR],
  ['c6-de-antemano-java-lang-invoke-methodhandle', ERROR],
  ['c6-de-antemano-java-lang-runtime-objectmethods', ERROR],
  ['c6-de-antemano-java-lang-annotation-retention', ERROR],
  ['c6-de-antemano-java-lang-invoke-methodhandles-dolar-lookup', ERROR],
  ['c6-de-antemano-java-util-function-supplier', ERROR],
  // clases anidadas o anónimas de java.lang, con su nombre plano de javac.
  ['c6-anidada-java-lang-thread-dolar-state', ERROR],
  ['c6-anidada-java-lang-class-dolar-1', ERROR],
  ['c6-anidada-java-lang-character-dolar-unicodeblock', ERROR],
  ['c6-anidada-java-lang-shutdown-dolar-lock', ERROR],
  // un subpaquete de una clase: javac compara CADA prefijo del nombre del paquete.
  ['c6-prefijo-java-lang-string-aula', ERROR],
  ['c6-prefijo-java-lang-shutdown-a-b-c', ERROR],
  ['c6-prefijo-java-io-serializable-aula', ERROR],
  ['c6-prefijo-java-lang-thread-dolar-state-x', ERROR],
  ['c6-prefijo-java-lang-thread-state', ERROR],
  ['c6-prefijo-java-lang-runtime-switchbootstraps-curso', ERROR],
  // el cuerpo del programa no cambia el veredicto, y el error del package va primero.
  ['c6-cuerpo-con-scanner', ERROR],
  ['c6-cuerpo-con-import-comodin', ERROR],
  ['c6-cuerpo-con-error-de-tipos-despues', ERROR],
  ['c6-cuerpo-con-import-roto-despues', ERROR],
  // cómo se escribe el package: otra línea, partido en varias, con comentarios dentro.
  ['c6-paquete-en-la-linea-tres', ERROR],
  ['c6-paquete-partido-en-varias-lineas', ERROR],
  ['c6-paquete-con-comentarios-dentro', ERROR],
];

// Cuando javac rechaza y no se puede revisar por completo: ya no queda ninguno (los dos que había, `java.lang.String` y `java.lang.Math`, están en `bordes-del-archivo-del-corpus.test.ts` como errores).
const AVISOS: ReadonlyArray<readonly [archivo: string, codigo: string]> = [];

// Controles: programas que javac COMPILA. El compilador aún no conoce esa clase cuando lee el `package` (no es de `java.lang` ni de las que crea de antemano), o el nombre es de otro paquete.
const VALIDOS: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]> = [
  ['c6-valido-java-util-arraysparallelsorthelpers', 'ok'],
  ['c6-valido-java-io-filesystem', 'ok'],
  ['c6-valido-java-util-map-dolar-entry', 'ok'],
  ['c6-valido-java-util-map-aula', 'ok'],
  ['c6-valido-aula-java-lang-string', 'ok'],
  ['c6-valido-java-lang-strin', 'ok'],
  ['c6-valido-jdk-internal-misc-unsafe', 'ok'],
  ['c6-valido-java-util-concurrent-concurrenthashmap-dolar-node', 'ok'],
  // Clases PÚBLICAS del JDK que javac compila como nombre de paquete: aviso honesto (el JDK real detiene la ejecución de un paquete `java.*`).
  ['c6-valido-con-aviso-java-lang-reflect-method', AVISO],
  ['c6-valido-con-aviso-java-nio-charset-charset', AVISO],
  ['c6-valido-con-aviso-java-util-scanner', AVISO],
  ['c6-valido-con-aviso-java-util-map', AVISO],
  ['c6-valido-con-aviso-javax-swing-jframe', AVISO],
  ['c6-valido-con-aviso-java-io-file', AVISO],
  ['c6-valido-con-aviso-java-io-printstream', AVISO],
];

guardaDeCorpusConTablas({
  nombre: 'paquetes que chocan con una clase',
  ruta: 'corpus/experimentos/paquetes-que-chocan',
  errores: ERRORES,
  avisos: AVISOS,
  validos: VALIDOS,
  piso: 78,
});
