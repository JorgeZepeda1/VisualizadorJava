// Catálogo es-MX de la galería «Ejemplos» (tarea R0.11, REQ-AULA-001, ADR 015 y 017): el título y UNA línea de «Qué observar» de cada programa del curso (corpus/curso, 35) y de la máquina de snacks del PO,
// el orden de las secciones y las palabras de la pantalla. «Qué observar» le dice al alumno qué mirar mientras avanza paso a paso; en los programas de predicción y de trampas NO cuenta el resultado, lo
// pregunta. Tono: español de México, tuteo, el código entre comillas invertidas, voz y vocabulario de REQ-PANT-010 (`true`/`false` como código, «vuelta»). Cada afirmación sobre lo que hace un programa
// se verificó contra su código y la salida que imprimió el JDK 17 real (los goldens de `corpus/`). Borradores para la revisión del PO en R0.16.
// `pruebas/arquitectura/galeria-completa.test.ts` falla si se agrega un programa al corpus sin escribir aquí su texto, o si aquí queda un texto sin programa.

/** Los programas de la galería: el nombre de cada `.java` de `corpus/curso/` sin extensión y, aparte, la máquina de snacks del PO (cinco archivos con el mismo código y cinco datos de ejemplo). */
export type IdDeGaleria =
  | 'maquina-snacks'
  | 'u3-hola-mundo'
  | 'u3-bienvenida'
  | 'u3-tipos-basicos-y-constantes'
  | 'u3-area-rectangulo-valores-fijos'
  | 'u3-area-rectangulo-con-scanner'
  | 'u3-saludo-con-scanner'
  | 'u3-cuadrado-de-un-numero'
  | 'u4-precedencia-de-operadores'
  | 'u4-prediccion-precedencia'
  | 'u4-casting-basico'
  | 'u4-calificacion-final'
  | 'u4-division-entera-y-modulo'
  | 'u4-cociente-residuo'
  | 'u4-calculadora-vueltos'
  | 'u4-operador-logico-and'
  | 'u4-prediccion-or-logico'
  | 'u4-verificar-acceso'
  | 'u5-if-else-verificar-voto'
  | 'u5-par-o-impar'
  | 'u5-decision-anidada-licencia'
  | 'u5-escalera-else-if-correcta'
  | 'u5-escalera-else-if-orden-incorrecto'
  | 'u5-switch-menu-calculadora'
  | 'u5-switch-sin-break-fallthrough'
  | 'u6-contador-de-pares'
  | 'u6-suma-1-a-n'
  | 'u6-acumulador-promedio-calificaciones'
  | 'u6-bandera-numero-negativo'
  | 'u6-pedir-numero-positivo'
  | 'u6-tabla-de-multiplicar'
  | 'u6-ciclos-anidados-tabla'
  | 'u6-error-por-uno'
  | 'u6-prediccion-while-no-ejecuta'
  | 'u6-ciclo-infinito-demo'
  | 'u7-proyecto-cajero-automatico';

export type UnidadDeGaleria = 3 | 4 | 5 | 6 | 7;
export type OrigenDeUnPrograma = 'curricular' | 'del-po';

/** Las secciones en el orden en que se muestran: «Para empezar» (el ejercicio del PO) y las unidades 3 a 7, con sus programas en el orden en que conviene verlos. */
export const ORDEN_DE_LA_GALERIA: readonly { readonly unidad: UnidadDeGaleria | null; readonly programas: readonly IdDeGaleria[] }[] = [
  { unidad: null, programas: ['maquina-snacks'] },
  {
    unidad: 3,
    programas: ['u3-hola-mundo', 'u3-bienvenida', 'u3-tipos-basicos-y-constantes', 'u3-area-rectangulo-valores-fijos', 'u3-area-rectangulo-con-scanner', 'u3-saludo-con-scanner', 'u3-cuadrado-de-un-numero'],
  },
  {
    unidad: 4,
    programas: [
      'u4-precedencia-de-operadores',
      'u4-prediccion-precedencia',
      'u4-casting-basico',
      'u4-calificacion-final',
      'u4-division-entera-y-modulo',
      'u4-cociente-residuo',
      'u4-calculadora-vueltos',
      'u4-operador-logico-and',
      'u4-prediccion-or-logico',
      'u4-verificar-acceso',
    ],
  },
  {
    unidad: 5,
    programas: [
      'u5-if-else-verificar-voto',
      'u5-par-o-impar',
      'u5-decision-anidada-licencia',
      'u5-escalera-else-if-correcta',
      'u5-escalera-else-if-orden-incorrecto',
      'u5-switch-menu-calculadora',
      'u5-switch-sin-break-fallthrough',
    ],
  },
  {
    unidad: 6,
    programas: [
      'u6-contador-de-pares',
      'u6-suma-1-a-n',
      'u6-acumulador-promedio-calificaciones',
      'u6-bandera-numero-negativo',
      'u6-pedir-numero-positivo',
      'u6-tabla-de-multiplicar',
      'u6-ciclos-anidados-tabla',
      'u6-error-por-uno',
      'u6-prediccion-while-no-ejecuta',
      'u6-ciclo-infinito-demo',
    ],
  },
  { unidad: 7, programas: ['u7-proyecto-cajero-automatico'] },
];

interface TextoDeUnPrograma {
  readonly titulo: string;
  readonly queObservar: string;
}

const PROGRAMAS: { readonly [I in IdDeGaleria]: TextoDeUnPrograma } = {
  'maquina-snacks': {
    titulo: 'Máquina de snacks',
    queObservar: 'Un `switch` elige el producto según el código, un `if` con `||` revisa la cantidad y el dinero, y `return` termina el programa: prueba los cinco datos y mira qué camino toma Java en cada uno.',
  },
  'u3-hola-mundo': {
    titulo: '«Hola, mundo»',
    queObservar: 'El programa más corto: una sola instrucción, `System.out.println`, y el texto entre comillas aparece en la consola tal cual.',
  },
  'u3-bienvenida': {
    titulo: 'Bienvenida al curso',
    queObservar: 'Otro `println`: mira cómo el texto que escribiste entre comillas sale idéntico en la consola, con su salto de línea.',
  },
  'u3-tipos-basicos-y-constantes': {
    titulo: 'Tipos básicos y constantes',
    queObservar: 'Cada variable nace con su tipo (`int`, `double`, `boolean`, `char`, `String`); `contador` se crea sin valor y recibe uno después, e `IVA` es `final`: nunca cambia.',
  },
  'u3-area-rectangulo-valores-fijos': {
    titulo: 'Área de un rectángulo con valores fijos',
    queObservar: 'Mira cómo `area` se calcula con `base * altura` y cómo un `double` se imprime siempre con su punto decimal.',
  },
  'u3-area-rectangulo-con-scanner': {
    titulo: 'Área de un rectángulo con datos del teclado',
    queObservar: 'Java se detiene en cada `nextDouble()` hasta tener el dato; con los datos de ejemplo, 5.0 y 3.0, `area` vale 15.0.',
  },
  'u3-saludo-con-scanner': {
    titulo: 'Saludo con tu nombre',
    queObservar: '`nextLine()` lee todo el renglón que se escribió y `+` lo une con el texto del saludo para imprimirlo.',
  },
  'u3-cuadrado-de-un-numero': {
    titulo: 'Cuadrado de un número',
    queObservar: 'El número que se lee del teclado se multiplica por sí mismo: con el dato de ejemplo, 5, imprime 25.',
  },
  'u4-precedencia-de-operadores': {
    titulo: 'Precedencia de operadores',
    queObservar: '`2 + 3 * 4` da 14 y `(2 + 3) * 4` da 20: Java multiplica antes de sumar, a menos que los paréntesis le digan otra cosa.',
  },
  'u4-prediccion-precedencia': {
    titulo: 'Predice: la precedencia',
    queObservar: 'Antes de pulsar «Siguiente», calcula a mano `a + b * 3 - 1` con `a` = 4 y `b` = 2. ¿Qué número crees que imprime? Compáralo con lo que calcula Java.',
  },
  'u4-casting-basico': {
    titulo: 'Conversión de `double` a `int`',
    queObservar: '`(int)` no redondea: corta los decimales. Mira qué le pasa a 8.75 y a 8.99 al convertirlos.',
  },
  'u4-calificacion-final': {
    titulo: 'Calificación final',
    queObservar: 'El promedio es un `double`, `(int)` lo convierte en entero y la comparación `promedio >= 6.0` guarda `true` o `false` en un `boolean`.',
  },
  'u4-division-entera-y-modulo': {
    titulo: 'División entera y módulo',
    queObservar: '`10 / 3` entre enteros da 3, pero `10.0 / 3` da decimales; `%` da el residuo y `numero % 2 == 0` pregunta si un número es par.',
  },
  'u4-cociente-residuo': {
    titulo: 'Cociente y residuo con datos del teclado',
    queObservar: 'Con los datos de ejemplo, 17 y 5, `/` da el cociente (3) y `%` da el residuo (2).',
  },
  'u4-calculadora-vueltos': {
    titulo: 'Calculadora de vueltos',
    queObservar: '`/` y `%` trabajan juntos: de 350 pesos salen 3 billetes de $100 y sobran $50.',
  },
  'u4-operador-logico-and': {
    titulo: 'El operador lógico `&&`',
    queObservar: '`&&` da `true` solo si sus dos lados dan `true`: mira cómo se juntan la edad y la identificación en `puedeEntrar`.',
  },
  'u4-prediccion-or-logico': {
    titulo: 'Predice: el operador lógico `||`',
    queObservar: 'Con `edad` = 16 y `tienePermiso` en `true`, ¿`puedeEntrar` será `true` o `false`? Decídelo antes de avanzar y compruébalo.',
  },
  'u4-verificar-acceso': {
    titulo: 'Verificar el acceso con `||`',
    queObservar: '`||` da `true` si basta con que uno de sus lados lo sea: con 110 cm de estatura y un adulto que acompaña, mira qué lado decide.',
  },
  'u5-if-else-verificar-voto': {
    titulo: '¿Puede votar? (`if` con `else`)',
    queObservar: 'Con 17 años, `edad >= 18` da `false`: Java se salta el bloque del `if` y ejecuta el del `else`. Solo se ejecuta uno de los dos.',
  },
  'u5-par-o-impar': {
    titulo: 'Par o impar',
    queObservar: '`numero % 2 == 0` pregunta si el residuo es 0: mira qué rama toma Java con el dato de ejemplo, 8.',
  },
  'u5-decision-anidada-licencia': {
    titulo: 'Decisiones anidadas: la licencia',
    queObservar: 'Un `if` dentro de otro: primero se revisa la edad y, solo si es mayor de edad, se revisa la licencia.',
  },
  'u5-escalera-else-if-correcta': {
    titulo: 'Escalera de `else if` en orden correcto',
    queObservar: 'Java revisa de arriba hacia abajo y se queda con la primera condición que da `true`: con 85 salta las de 90 y entra a la de 80.',
  },
  'u5-escalera-else-if-orden-incorrecto': {
    titulo: 'Escalera con el orden incorrecto',
    queObservar: 'Con 95, ¿qué letra crees que se imprime? Mira en qué orden revisa Java las condiciones y qué pasa con las que quedan más abajo.',
  },
  'u5-switch-menu-calculadora': {
    titulo: 'Menú con `switch`',
    queObservar: '`switch` salta al `case` que coincide con `opcion` y `break` lo termina; con los datos de ejemplo, 1, 10 y 5, suma.',
  },
  'u5-switch-sin-break-fallthrough': {
    titulo: '`switch` sin `break`',
    queObservar: 'Con `diaSemana` = 2, ¿cuántos textos crees que se imprimen? Mira qué hace Java al llegar al final de un `case` que no tiene `break`.',
  },
  'u6-contador-de-pares': {
    titulo: 'Contador de números pares',
    queObservar: 'El `if` dentro del `for` decide en cada vuelta si `contador` sube: mira cómo solo cambia en las vueltas pares.',
  },
  'u6-suma-1-a-n': {
    titulo: 'Suma de 1 a n',
    queObservar: 'El acumulador `suma` crece una vuelta a la vez; con el dato de ejemplo, n = 5, se suman 1, 2, 3, 4 y 5.',
  },
  'u6-acumulador-promedio-calificaciones': {
    titulo: 'Promedio de cinco calificaciones',
    queObservar: '`suma` acumula cada calificación que se lee dentro del `for`; al final se divide entre 5 para sacar el promedio.',
  },
  'u6-bandera-numero-negativo': {
    titulo: 'Bandera: ¿hubo un número negativo?',
    queObservar: '`seEncontroNegativo` empieza en `false` y pasa a `true` la primera vez que llega un número negativo; después ya no vuelve a `false`.',
  },
  'u6-pedir-numero-positivo': {
    titulo: 'Pedir un número positivo con `do-while`',
    queObservar: 'El `do-while` revisa al final: pide el número al menos una vez y repite mientras sea `<= 0`. Con los datos de ejemplo, -3, 0 y 7, da tres vueltas.',
  },
  'u6-tabla-de-multiplicar': {
    titulo: 'Tabla de multiplicar',
    queObservar: 'El `for` va de 1 a 10 y cada vuelta imprime una línea de la tabla del número elegido; mira cómo cambia `i` en cada vuelta.',
  },
  'u6-ciclos-anidados-tabla': {
    titulo: 'Ciclos anidados: tabla de 3 × 3',
    queObservar: 'El ciclo de adentro da todas sus vueltas por cada vuelta del de afuera: mira cuántas vueltas lleva `columna` en cada `fila`.',
  },
  'u6-error-por-uno': {
    titulo: 'Error por uno',
    queObservar: 'Tres ciclos casi iguales: ¿cuántas vueltas crees que da cada uno? Compara `<=` con `<` y empezar en 0 o en 1.',
  },
  'u6-prediccion-while-no-ejecuta': {
    titulo: 'Predice: un `while` que no entra',
    queObservar: 'Con `contador` = 8 y la condición `contador <= 5`, ¿cuántas vueltas crees que da el `while`? ¿Qué se imprime?',
  },
  'u6-ciclo-infinito-demo': {
    titulo: 'Ciclo infinito',
    queObservar: 'Mira qué variable de la condición nunca cambia: por eso el ciclo no termina y el visualizador lo detiene por seguridad.',
  },
  'u7-proyecto-cajero-automatico': {
    titulo: 'Proyecto: cajero automático',
    queObservar: 'Un `while` repite el menú y un `switch` elige la operación; `continuar` pasa a `false` al elegir la opción 4 y el ciclo termina.',
  },
};

/** Los programas de DEMOSTRACIÓN (REQ-AULA-001): predicciones y trampas. Abren con el aviso del revisor en «después», para que el alumno primero predice y luego ve. Propuesta del diseño (§2.5) para el PO. */
const DEMOSTRACIONES: readonly IdDeGaleria[] = [
  'u5-switch-sin-break-fallthrough',
  'u5-escalera-else-if-orden-incorrecto',
  'u6-error-por-uno',
  'u6-ciclo-infinito-demo',
  'u6-prediccion-while-no-ejecuta',
  'u4-prediccion-or-logico',
  'u4-prediccion-precedencia',
];

/** Los cinco datos de ejemplo de la máquina de snacks: el nombre del archivo del corpus (sin extensión) y qué pasa con esos datos, verificado contra lo que imprimió el JDK. */
const MUESTRAS_DE_LA_MAQUINA_DE_SNACKS: readonly { readonly archivo: string; readonly descripcion: string }[] = [
  { archivo: 'maquina-snacks-a1-2-50', descripcion: 'Compra completa: 2 papas pagadas con $50 y con cambio' },
  { archivo: 'maquina-snacks-b2-3-40', descripcion: 'No alcanza el dinero: 3 refrescos cuestan $66 y se pagan $40' },
  { archivo: 'maquina-snacks-b3', descripcion: 'Producto agotado: el jugo B3' },
  { archivo: 'maquina-snacks-z9', descripcion: 'Código inválido: Z9 no existe' },
  { archivo: 'maquina-snacks-a2-5', descripcion: 'Cantidad no válida: se piden 5 y solo se aceptan de 1 a 3' },
];

const TITULOS_DE_UNIDAD: Readonly<Record<UnidadDeGaleria, string>> = {
  3: 'Unidad 3 · Primeros programas',
  4: 'Unidad 4 · Operadores y expresiones',
  5: 'Unidad 5 · Decisiones',
  6: 'Unidad 6 · Ciclos',
  7: 'Unidad 7 · Proyecto',
};

export const textosGaleria = {
  titulo: (): string => 'Ejemplos',
  ayuda: (): string => 'Elige un programa: se abre en «Paso a paso», listo para que lo veas ejecutarse una instrucción a la vez.',
  cargando: (): string => 'Cargando los ejemplos…',
  noSeCargaron: (): string => 'No se pudieron cargar los ejemplos. Recarga la página para intentarlo otra vez.',
  seccion: {
    paraEmpezar: (): string => 'Para empezar',
    unidad: (unidad: UnidadDeGaleria): string => TITULOS_DE_UNIDAD[unidad],
  },
  programa: (id: IdDeGaleria): TextoDeUnPrograma => PROGRAMAS[id],
  origen: (origen: OrigenDeUnPrograma): string => (origen === 'curricular' ? 'Del curso' : 'Ejercicio del profesor'),
  queObservar: (): string => 'Qué observar',
  verPasoAPaso: (): string => 'Ver paso a paso',
  conMisDatos: (): string => 'Con mis datos',
  /** El nombre accesible de un botón de la galería: la acción y el programa, para que 36 «Ver paso a paso» no suenen todos igual. */
  nombreDeLaAccion: (accion: string, titulo: string): string => `${accion}: ${titulo}`,
  datosDeEjemplo: (datos: string): string => `Datos de ejemplo: ${datos}`,
  demostraciones: DEMOSTRACIONES,
  muestrasDeLaMaquinaDeSnacks: MUESTRAS_DE_LA_MAQUINA_DE_SNACKS,
};
