// Unidad 6 del libro, ciclos (R0.14, REQ-LIBRO-002, REQ-LIBRO-004): borradores de los cinco primeros temas —`¿Qué es un ciclo?`, `while`, contador/acumulador/bandera, `do-while` y `for`—, que el PO lee antes de
// aprobar nada (`npm run libro:borradores`). Estado: BORRADOR, sin publicar. Los cinco restantes de U6 llegan en R1.17.
//
// Cómo está escrito (panel 1, maestro §5 y panel-1-java «El libro contra el subconjunto»):
// - Cada tema empieza por el ejemplo (PRIMM): el alumno predice «¿Qué crees que imprime?» antes de leer la idea, y cierra con «Ponte a prueba» y «Ahora hazlo tú» (modificar y crear).
// - Voz del producto (REQ-PANT-010): «Java revisa…», `true`/`false` como código, «vuelta»; español de México, de tú, frases cortas, una idea por frase, cada término explicado la primera vez.
// - NINGUNA salida de consola está escrita aquí: toda salida que el libro muestre sale del golden del programa (`corpus/libro/<tema>/<programa>.salida`), y las consignas de «Ahora hazlo tú» fijan el formato de lo
//   que se imprime con el texto exacto entre « » (lo que el programa escribe; el código va entre comillas invertidas), porque el alumno solo ve la salida esperada, no la solución (PQ-5).
// - Corregidos con el panel R0 (2026-10-19): el nombre de la clase no contesta la predicción; el `while` no se generaliza a todos los ciclos; ninguna frase que Java desmienta (regla `afirmaciones` de
//   `reglas-del-tema.ts`).
// - Todo programa está dentro del subconjunto U3–U7: sin métodos propios, arreglos, `static final` de clase, `Math.pow`, `break` con etiqueta, `for` mejorado ni ternario. Cada uno lo compiló y ejecutó el JDK 17 real
//   y el motor da lo mismo (`pruebas/diferencial/libro.test.ts`).
import { temaCompleto } from './indice.ts';
import type { Tema } from './tipos.ts';

const QUE_ES_UN_CICLO = temaCompleto('u6-que-es-un-ciclo', {
  paraEmpezar: {
    situacion: 'Una maestra pasa lista a tres alumnos, uno por uno. Este programa hace lo mismo.',
    programa: 'u6-que-es-un-ciclo/pasar-lista',
  },
  idea: [
    'Un ciclo es una parte del programa que Java repite, para que no tengas que copiar las mismas instrucciones muchas veces.',
    'Cada vez que la repite, da una vuelta.',
    'Para decidir si da otra vuelta, Java revisa una condición: una pregunta que se responde con `true` o con `false`.',
    'Si la condición da `true`, Java da otra vuelta.',
    'Si da `false`, el ciclo termina y el programa sigue con lo que viene después.',
  ],
  comoSeEscribe: [
    {
      tipo: 'parrafo',
      texto: 'Casi todo ciclo tiene tres partes, y las tres están en el programa de «Para empezar»: el valor inicial (`int alumno = 1;`), la condición (`alumno <= 3`) y el cambio (`alumno = alumno + 1;`).',
    },
    { tipo: 'forma', texto: 'valor inicial\nwhile (condición) {\n    instrucciones que se repiten\n    cambio del valor\n}' },
    {
      tipo: 'lista',
      elementos: [
        'Antes del ciclo, Java guarda el valor inicial. Eso pasa una sola vez.',
        'Java revisa la condición. Con `true` hace una vuelta; con `false` sale del ciclo.',
        'En cada vuelta, el cambio mueve el valor y Java vuelve a revisar la condición.',
      ],
    },
    {
      tipo: 'nota',
      texto: 'Aquí usamos `while`, el ciclo más sencillo: revisa la condición antes de cada vuelta. En este curso verás otros dos, `do-while` y `for`, en los siguientes temas.',
    },
  ],
  pasoAPaso: {
    queObservar: 'Fíjate en cómo cambia `segundos` y en qué momento Java revisa la condición por última vez.',
    programa: 'u6-que-es-un-ciclo/cuenta-regresiva',
    sugerirReto: true,
  },
  erroresTipicos: [
    {
      texto: 'Todo lo que está entre las llaves se repite en cada vuelta. Aquí el último `println` quedó adentro, y por eso Java lo ejecuta tres veces en lugar de una.',
      programa: 'u6-que-es-un-ciclo/llaves-de-mas',
    },
  ],
  ponteAPrueba: [
    { pregunta: '¿Qué imprime? Fíjate en cuánto aumenta `piso` en cada vuelta.', programa: 'u6-que-es-un-ciclo/pisos-de-3-en-3' },
    { pregunta: '¿Qué imprime? Observa el orden de las instrucciones dentro del ciclo.', programa: 'u6-que-es-un-ciclo/contador-que-empieza-en-0' },
  ],
  ahoraHazloTu: [
    {
      tipo: 'modificar',
      consigna: 'Abre la cuenta regresiva de «Míralo paso a paso» y cámbiala para que empiece en 6 y baje de 2 en 2. El mensaje final se queda igual.',
      solucion: 'u6-que-es-un-ciclo/cuenta-regresiva-de-2-en-2',
    },
    {
      tipo: 'crear',
      consigna: 'Escribe un programa que lea un número entero `n` con `Scanner` y escriba la palabra «Hola», una vez por renglón, `n` veces. No escribas nada más.',
      solucion: 'u6-que-es-un-ciclo/saludos-n-veces',
    },
  ],
  resumen: [
    'Un ciclo repite instrucciones, y cada repetición es una vuelta.',
    'Java revisa una condición para decidir: con `true` da otra vuelta y con `false` termina.',
    'Dentro del ciclo algo debe cambiar el valor que mira la condición; si no, nunca da `false`.',
  ],
  relacionados: ['u6-while'],
});

const WHILE = temaCompleto('u6-while', {
  paraEmpezar: {
    situacion: 'Cuentas en voz alta: dices un número, le sumas 1 y dices el siguiente, hasta llegar a la meta. Este programa lo hace con un `while`.',
    programa: 'u6-while/contar-en-voz-alta',
  },
  idea: [
    'El `while` repite sus instrucciones mientras su condición dé `true`.',
    'Java revisa la condición antes de cada vuelta, incluso antes de la primera.',
    'Si la condición da `false` desde el principio, el ciclo no da ni una vuelta.',
    'Dentro del ciclo algo debe cambiar lo que la condición mira; si no, nunca da `false`.',
  ],
  comoSeEscribe: [
    { tipo: 'forma', texto: 'while (condición) {\n    instrucciones\n}' },
    { tipo: 'parrafo', texto: 'Java sigue siempre este orden:' },
    {
      tipo: 'lista',
      elementos: [
        'Revisa la condición.',
        'Si da `true`, ejecuta las instrucciones de adentro. Eso es una vuelta. Luego regresa al paso 1.',
        'Si da `false`, el ciclo termina (o ni siquiera empieza) y Java sigue con lo que está después de la llave `}` que lo cierra.',
      ],
    },
    {
      tipo: 'nota',
      texto: 'Las llaves `{ }` marcan lo que se repite. Lo que queda afuera se ejecuta una sola vez. Sin llaves, solo se repite la primera instrucción, así que escríbelas siempre.',
    },
  ],
  pasoAPaso: {
    queObservar: 'Mira qué valor tiene `numero` cada vez que Java revisa la condición, incluida la última, la que da `false`.',
    programa: 'u6-while/cuenta-hasta-n',
    sugerirReto: true,
  },
  erroresTipicos: [
    {
      texto:
        'El orden importa. Aquí `numero` cambia antes del `println`, así que el primer número que se escribe ya no es el 1. Y fíjate en el 6: se imprime aunque `6 <= 5` da `false`, porque Java solo revisa la condición al empezar cada vuelta, no a la mitad.',
      programa: 'u6-while/orden-del-cuerpo',
    },
    {
      texto: 'Con `<` la condición no acepta el valor del límite. Aquí el 5 no cumple `numero < 5`, y Java ya no da esa vuelta. Si quieres incluirlo, usa `<=`.',
      programa: 'u6-while/se-queda-corto',
    },
  ],
  ponteAPrueba: [
    { pregunta: '¿Qué imprime? Calcula cuánto vale `x` cada vez que Java revisa la condición, hasta que da `false`.', programa: 'u6-while/de-3-en-3' },
    { pregunta: '¿Cuánto valen `potencia` y `vueltas` cuando termina el ciclo? Cuenta las vueltas una por una.', programa: 'u6-while/potencias-de-2' },
    { pregunta: '¿Qué imprime? Revisa primero si la condición da `true` la primera vez.', programa: 'u6-while/pagar-con-el-saldo' },
  ],
  ahoraHazloTu: [
    {
      tipo: 'modificar',
      consigna: 'Abre el programa de «Míralo paso a paso» y cámbialo para que cuente de 2 en 2, empezando en 2. Los mensajes se quedan igual.',
      solucion: 'u6-while/cuenta-de-2-en-2',
    },
    {
      tipo: 'crear',
      consigna: 'Escribe un programa que lea un número entero `n` y escriba los múltiplos de 5 que hay desde el 5 hasta `n`, uno por renglón. No escribas nada más.',
      solucion: 'u6-while/multiplos-de-5',
    },
  ],
  resumen: [
    'El `while` revisa su condición antes de cada vuelta: con `true` da otra vuelta y con `false` termina.',
    'Si la condición da `false` desde el principio, no da ni una vuelta.',
    'Algo dentro del ciclo debe cambiar lo que la condición mira; si no, nunca da `false`.',
  ],
  relacionados: ['u6-que-es-un-ciclo', 'u6-error-por-uno-y-ciclo-infinito'],
});

const CONTADOR_ACUMULADOR_BANDERA = temaCompleto('u6-contador-acumulador-bandera', {
  paraEmpezar: {
    situacion: 'Una cajera cobra tres productos. Para saber cuánto debe cobrar, va sumando cada precio que escribe.',
    programa: 'u6-contador-acumulador-bandera/total-de-la-compra',
  },
  idea: [
    'A veces un ciclo da muchas vueltas, pero tú necesitas un solo resultado al final.',
    'Para eso se usan variables que se crean antes del ciclo y se actualizan en cada vuelta.',
    'Un contador cuenta cuántas veces pasa algo: le suma 1 cada vez.',
    'Un acumulador junta valores: le suma el valor que lee o que calcula.',
    'Una bandera es una variable `boolean` que suele empezar en `false` y cambia a `true` cuando algo ocurre, como una bandera que se levanta para avisar.',
  ],
  comoSeEscribe: [
    {
      tipo: 'forma',
      texto:
        'int cuantos = 0;\nint total = 0;\nboolean hubo = false;\nwhile (condición) {\n    total = total + valor;\n    if (pasó lo que cuentas) {\n        cuantos = cuantos + 1;\n    }\n    if (pasó lo que buscas) {\n        hubo = true;\n    }\n    cambio del valor\n}',
    },
    {
      tipo: 'lista',
      elementos: [
        'Contador: `cuantos = cuantos + 1;` anota que pasó una vez más; casi siempre va dentro de un `if`.',
        'Acumulador: `total = total + valor;` suma el valor de esta vuelta a lo que ya había.',
        'Bandera: `hubo = true;` va dentro del `if` que detecta lo que buscas; una vez en `true`, ya no vuelve a `false`.',
      ],
    },
    {
      tipo: 'parrafo',
      texto: 'Las tres se crean antes del ciclo, con su valor inicial. El contador y el acumulador de una suma empiezan en 0, y la bandera suele empezar en `false`. Así Java las conserva de una vuelta a la siguiente.',
    },
  ],
  pasoAPaso: {
    queObservar: 'Mira cómo cambian `suma` y `aprobados` en cada vuelta, y en qué momento `hubo10` pasa a `true`.',
    programa: 'u6-contador-acumulador-bandera/resumen-de-calificaciones',
    sugerirReto: false,
  },
  erroresTipicos: [
    {
      texto: 'Un acumulador necesita un valor inicial. Sin él, Java no sabe cuánto vale `total` la primera vez que lo usa, y no compila el programa.',
      programa: 'u6-contador-acumulador-bandera/total-sin-valor-inicial',
    },
    {
      texto: 'Si creas el acumulador dentro del ciclo, vuelve a empezar en 0 en cada vuelta. Aquí `total` nunca junta nada: en cada vuelta vale solo el precio de esa vuelta.',
      programa: 'u6-contador-acumulador-bandera/total-que-se-reinicia',
    },
  ],
  ponteAPrueba: [
    { pregunta: 'Con la entrada de prueba, ¿qué imprime? Anota cuántas veces Java ejecuta `mayores = mayores + 1;`.', programa: 'u6-contador-acumulador-bandera/mayores-que-10' },
    { pregunta: '¿Qué imprime? Escribe cuánto vale `suma` al final de cada vuelta.', programa: 'u6-contador-acumulador-bandera/suma-de-cuadrados' },
    { pregunta: 'Con la entrada de prueba, ¿qué valor tiene la bandera al final? Revisa los números uno por uno.', programa: 'u6-contador-acumulador-bandera/hubo-un-negativo' },
  ],
  ahoraHazloTu: [
    {
      tipo: 'modificar',
      consigna:
        'Abre el programa de «Míralo paso a paso» y cámbialo para que cuente los reprobados (los que sacan menos de 6) en lugar de los aprobados. El mensaje de esa línea debe empezar con «Reprobados:» y los otros dos se quedan igual.',
      solucion: 'u6-contador-acumulador-bandera/resumen-con-reprobados',
    },
    {
      tipo: 'crear',
      consigna: 'Escribe un programa que lea 5 números enteros y escriba «Mayores que 100:», un espacio y cuántos de los números fueron mayores que 100. No escribas nada más.',
      solucion: 'u6-contador-acumulador-bandera/mayores-que-100',
    },
  ],
  resumen: [
    'Un contador suma 1 cuando pasa algo, un acumulador suma valores y una bandera guarda `true` o `false` si algo ocurrió.',
    'Las tres se crean antes del ciclo, con su valor inicial.',
    'Si las creas dentro del ciclo, vuelven a empezar en cada vuelta.',
  ],
  relacionados: ['u6-while'],
});

const DO_WHILE = temaCompleto('u6-do-while', {
  paraEmpezar: {
    situacion: 'Aquí hay un ciclo con una forma distinta a la que conoces. Léelo con calma antes de predecir.',
    programa: 'u6-do-while/primer-do-while',
  },
  idea: [
    'El `do-while` es un ciclo que revisa su condición al final de cada vuelta, no al principio.',
    'Por eso siempre da al menos una vuelta, aunque la condición sea `false` desde el inicio.',
    'Sirve para pedir un dato y volver a pedirlo mientras no sea válido.',
    'Termina con un punto y coma después de la condición.',
  ],
  comoSeEscribe: [
    { tipo: 'forma', texto: 'do {\n    instrucciones\n} while (condición);' },
    { tipo: 'parrafo', texto: 'Java sigue este orden:' },
    {
      tipo: 'lista',
      elementos: [
        'Ejecuta las instrucciones de adentro. Eso es una vuelta.',
        'Revisa la condición.',
        'Si da `true`, regresa al paso 1. Si da `false`, sigue con lo que está después.',
      ],
    },
    { tipo: 'nota', texto: 'Compara: el `while` revisa antes de cada vuelta y el `do-while` revisa después. No olvides el `;` del final.' },
  ],
  pasoAPaso: {
    queObservar: 'Mira en qué momento revisa Java la condición: después de pedir la edad, no antes.',
    programa: 'u6-do-while/validar-la-edad',
    sugerirReto: true,
  },
  erroresTipicos: [
    {
      texto: 'Una variable creada dentro de las llaves solo existe ahí. La condición está afuera, así que no la ve. Crea la variable antes del `do`.',
      programa: 'u6-do-while/variable-del-bloque',
      mensajeDelVisualizadorPendiente: true,
    },
    {
      texto: 'El `do-while` termina con `;` después de la condición. Si lo olvidas, Java no compila el programa.',
      programa: 'u6-do-while/falta-el-punto-y-coma',
    },
  ],
  ponteAPrueba: [
    { pregunta: '¿Qué imprime? Toma en cuenta en qué momento revisa Java la condición.', programa: 'u6-do-while/vidas-en-cero' },
    { pregunta: '¿Qué imprime? Escribe cuánto vale `n` al empezar cada vuelta.', programa: 'u6-do-while/doblar-un-numero' },
    { pregunta: 'Con la entrada de prueba, ¿qué imprime? Cuenta cuántas veces se repite la petición.', programa: 'u6-do-while/pedir-la-clave' },
  ],
  ahoraHazloTu: [
    {
      tipo: 'modificar',
      consigna: 'Abre el programa de «Míralo paso a paso» y cámbialo para que acepte solo edades de 12 a 18. El aviso debe decir «de 12 a 18» y lo demás se queda igual.',
      solucion: 'u6-do-while/validar-edad-de-12-a-18',
    },
    {
      tipo: 'crear',
      consigna: 'Escribe un programa con un `do-while` que lea números hasta que llegue un 7. Al final debe escribir «Intentos:», un espacio y cuántos números leyó. No escribas nada más.',
      solucion: 'u6-do-while/intentos-hasta-el-7',
    },
  ],
  resumen: [
    'El `do-while` ejecuta las instrucciones y después revisa la condición.',
    'Siempre da al menos una vuelta, aunque la condición sea `false` desde el principio.',
    'Se usa para pedir un dato hasta que sea válido, y termina con `;`.',
  ],
  relacionados: ['u6-while', 'u6-repetir-hasta-que-el-usuario-quiera'],
});

const FOR = temaCompleto('u6-for', {
  paraEmpezar: {
    situacion: 'Una alumna quiere estudiar la tabla de multiplicar del 3 y le pide a Java que la escriba.',
    programa: 'u6-for/tabla-del-3',
  },
  idea: [
    'El `for` es un ciclo que junta en un solo renglón sus tres partes: el valor inicial, la condición y el cambio.',
    'Hace un trabajo parecido al de un `while`, pero con las tres partes juntas y a la vista.',
    'Se usa cuando sabes cuántas vueltas quieres o hasta dónde vas a contar.',
    'La variable que se crea en el `for` solo existe dentro del ciclo.',
  ],
  comoSeEscribe: [
    { tipo: 'forma', texto: 'for (inicio; condición; cambio) {\n    instrucciones\n}' },
    { tipo: 'parrafo', texto: 'Las tres partes van separadas por `;`. Java sigue este orden:' },
    {
      tipo: 'lista',
      elementos: [
        'Ejecuta el inicio, una sola vez.',
        'Revisa la condición. Si da `false`, el ciclo termina.',
        'Si da `true`, ejecuta las instrucciones. Eso es una vuelta.',
        'Ejecuta el cambio y regresa al paso 2.',
      ],
    },
    { tipo: 'nota', texto: 'Con una variable `int` usada como instrucción, `i++` suma 1 a `i`, igual que `i = i + 1`. Por eso se usa tanto en el cambio.' },
  ],
  pasoAPaso: {
    queObservar: 'Mira el orden: el inicio ocurre una vez, y el cambio ocurre al final de cada vuelta, antes de revisar otra vez la condición.',
    programa: 'u6-for/suma-de-1-a-n',
    sugerirReto: true,
  },
  erroresTipicos: [
    {
      texto: 'La variable que se crea en el `for` solo existe dentro del ciclo. Fuera de él, Java no la conoce y no compila el programa. Si la necesitas después, créala antes del `for`.',
      programa: 'u6-for/variable-fuera-del-for',
      mensajeDelVisualizadorPendiente: true,
    },
    {
      texto: 'Un `;` justo después del paréntesis es el cuerpo completo del `for`: una instrucción vacía. Las llaves de abajo ya no forman parte del ciclo y se ejecutan una sola vez.',
      programa: 'u6-for/punto-y-coma-de-mas',
    },
  ],
  ponteAPrueba: [
    { pregunta: '¿Qué imprime? Anota el valor de `i` cada vez que Java revisa la condición.', programa: 'u6-for/de-4-en-4' },
    { pregunta: '¿Qué imprime? Revisa la condición antes de dar por hecho que hay vueltas.', programa: 'u6-for/for-que-empieza-en-5' },
    { pregunta: '¿Qué imprime? Escribe cuánto vale `suma` al terminar cada vuelta.', programa: 'u6-for/suma-de-pares' },
  ],
  ahoraHazloTu: [
    {
      tipo: 'modificar',
      consigna: 'Abre el programa de «Míralo paso a paso» y cámbialo para que escriba el producto de los números del 1 al `n`, en lugar de la suma. El mensaje debe empezar con «El producto es».',
      solucion: 'u6-for/producto-de-1-a-n',
    },
    {
      tipo: 'crear',
      consigna: 'Escribe un programa que lea un número entero `n` y escriba su tabla del 1 al 10, un renglón por producto. Cada renglón tiene la forma `n x i = resultado`, con los valores en lugar de las letras.',
      solucion: 'u6-for/tabla-de-n',
    },
  ],
  resumen: [
    'El `for` junta en un renglón el inicio, la condición y el cambio.',
    'Java hace el inicio una vez, revisa la condición antes de cada vuelta y hace el cambio al final de cada vuelta.',
    'La variable del `for` solo existe dentro del ciclo.',
  ],
  relacionados: ['u6-while', 'u6-ciclos-incrementales-y-decrementales'],
});

/** Los cinco primeros temas de U6 (R0.14), en el orden del libro. */
export const TEMAS_DE_U6: readonly Tema[] = [QUE_ES_UN_CICLO, WHILE, CONTADOR_ACUMULADOR_BANDERA, DO_WHILE, FOR];
