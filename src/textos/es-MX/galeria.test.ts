// RED de la tarea R0.11 (REQ-AULA-001, ADR 015 y 017): el catálogo de la galería «Ejemplos». Cada programa del curso (corpus/curso, 35) y la máquina de snacks del PO tiene su título y UNA línea de «Qué observar»
// —lo que el alumno debe mirar mientras avanza paso a paso—; algunos son de DEMOSTRACIÓN (abren con el aviso del revisor en «después», REQ-AULA-001). Borradores para la revisión del PO en R0.16. Las
// afirmaciones sobre lo que hace un programa se revisan contra su código y su salida en `pruebas/arquitectura/galeria-completa.test.ts` y a mano en la revisión del PO.
import { describe, expect, it } from 'vitest';
import { ORDEN_DE_LA_GALERIA, textosGaleria, type IdDeGaleria } from './galeria.ts';

const TODOS: readonly IdDeGaleria[] = ORDEN_DE_LA_GALERIA.flatMap((seccion) => seccion.programas);

describe('textosGaleria: el orden de la galería', () => {
  it('empieza con «Ejercicio de la clase» (el ejercicio del PO) y sigue con las unidades 3 a 7, en orden', () => {
    expect(ORDEN_DE_LA_GALERIA.map((seccion) => seccion.unidad)).toEqual([null, 3, 4, 5, 6, 7]);
    expect(ORDEN_DE_LA_GALERIA[0]?.programas).toEqual(['maquina-snacks']);
  });

  // Orden del maestro (panel R0): U6 sigue la progresión del libro (recorrer → acumular → bandera → `do-while` → predecir el `while` → trampas), con el ciclo anidado al final; en U5 la decisión anidada
  // va después de las dos escaleras de `else if`.
  it('U5 y U6 están en el orden que propone el maestro', () => {
    const programasDe = (unidad: number) => ORDEN_DE_LA_GALERIA.find((seccion) => seccion.unidad === unidad)?.programas;
    expect(programasDe(5)).toEqual([
      'u5-if-else-verificar-voto',
      'u5-par-o-impar',
      'u5-escalera-else-if-correcta',
      'u5-escalera-else-if-orden-incorrecto',
      'u5-decision-anidada-licencia',
      'u5-switch-menu-calculadora',
      'u5-switch-sin-break-fallthrough',
    ]);
    expect(programasDe(6)).toEqual([
      'u6-tabla-de-multiplicar',
      'u6-suma-1-a-n',
      'u6-contador-de-pares',
      'u6-acumulador-promedio-calificaciones',
      'u6-bandera-numero-negativo',
      'u6-pedir-numero-positivo',
      'u6-prediccion-while-no-ejecuta',
      'u6-error-por-uno',
      'u6-ciclo-infinito-demo',
      'u6-ciclos-anidados-tabla',
    ]);
  });

  it('son 36 programas, sin repetir: los 35 de corpus/curso y la máquina de snacks', () => {
    expect(TODOS).toHaveLength(36);
    expect(new Set(TODOS).size).toBe(36);
  });

  it('cada programa curricular está en la sección de SU unidad (el id empieza por u3-… a u7-…)', () => {
    for (const seccion of ORDEN_DE_LA_GALERIA) {
      if (seccion.unidad === null) continue;
      for (const id of seccion.programas) expect(id.startsWith(`u${seccion.unidad}-`), id).toBe(true);
    }
  });

  it('las unidades tienen su título y la sección inicial el suyo', () => {
    // P3 (adoptada): el encabezado dice QUÉ es (el ejercicio que el profesor usa en clase), no «Para empezar», que se confundía con la sección del libro.
    expect(textosGaleria.seccion.ejercicioDeLaClase()).toBe('Ejercicio de la clase');
    for (const unidad of [3, 4, 5, 6, 7] as const) expect(textosGaleria.seccion.unidad(unidad).startsWith(`Unidad ${unidad}`), String(unidad)).toBe(true);
  });
});

describe('textosGaleria: un título y una línea de «Qué observar» por programa', () => {
  it('cada programa tiene título y «Qué observar», sin marcadores sin resolver', () => {
    for (const id of TODOS) {
      const { titulo, queObservar } = textosGaleria.programa(id);
      expect(titulo.trim().length, `${id} título`).toBeGreaterThan(3);
      expect(queObservar.trim().length, `${id} qué observar`).toBeGreaterThan(30);
      for (const texto of [titulo, queObservar]) expect(texto, id).not.toMatch(/[{}]|undefined|NaN|\[object/);
    }
  });

  it('«Qué observar» es UNA tarjeta corta (≤ 300 caracteres) y los fragmentos de código van entre comillas invertidas, bien cerradas', () => {
    for (const id of TODOS) {
      const { queObservar } = textosGaleria.programa(id);
      expect(queObservar.length, id).toBeLessThanOrEqual(300);
      expect(queObservar.split('`').length % 2, `${id}: comillas invertidas sin cerrar`).toBe(1);
      expect(queObservar.includes('\n'), id).toBe(false);
    }
  });

  it('los títulos son distintos entre sí', () => {
    const titulos = TODOS.map((id) => textosGaleria.programa(id).titulo);
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it('respeta la voz y el vocabulario de los robots: sin «verdadero»/«falso», «vuelta» y no «iteración», sin primera persona', () => {
    for (const id of TODOS) {
      const { titulo, queObservar } = textosGaleria.programa(id);
      for (const texto of [titulo, queObservar]) {
        expect(texto, id).not.toMatch(/\b(verdader[oa]s?|fals[oa]s?)\b/i);
        expect(texto, id).not.toMatch(/iteraci[oó]n/i);
        expect(texto, id).not.toMatch(/(^|[.:;¡!?]\s+)(Reviso|Guardo|Creo|Calculo|Imprimo)(?![\p{L}])/u);
      }
    }
  });

  it('nunca da por hecho lo que el alumno debe predecir: los programas de predicción preguntan y no cuentan el resultado', () => {
    for (const id of ['u4-prediccion-precedencia', 'u4-prediccion-or-logico', 'u6-prediccion-while-no-ejecuta', 'u5-escalera-else-if-orden-incorrecto', 'u5-switch-sin-break-fallthrough', 'u6-error-por-uno', 'u6-ciclo-infinito-demo'] as const) {
      expect(textosGaleria.programa(id).queObservar, id).toMatch(/[¿?]/);
    }
  });

  // G3 y G4 del maestro (panel R0, bloquean): el TÍTULO de una demostración no cuenta la causa ni el final; todas se anuncian como «Predice: …».
  it('el título de toda demostración invita a predecir («Predice: …») y no responde la pregunta', () => {
    for (const id of textosGaleria.demostraciones) expect(textosGaleria.programa(id).titulo, id).toMatch(/^Predice: /);
    expect(textosGaleria.programa('u6-ciclo-infinito-demo').titulo).toBe('Predice: ¿cuándo termina este `while`?');
    expect(textosGaleria.programa('u6-prediccion-while-no-ejecuta').titulo).toBe('Predice: ¿cuántas vueltas da este `while`?');
    expect(textosGaleria.programa('u6-error-por-uno').titulo).toBe('Predice: tres `for` casi iguales');
    expect(textosGaleria.programa('u5-switch-sin-break-fallthrough').titulo).toBe('Predice: un `switch` sin `break`');
    expect(textosGaleria.programa('u5-escalera-else-if-orden-incorrecto').titulo).toBe('Predice: ¿qué letra le toca al 95?');
  });
});

// Textos aprobados por el maestro en el panel R0 (G1 a G5, que bloqueaban la publicación, y las reescrituras de la regla P4: «Qué observar» señala el MECANISMO y nunca da la salida final) y la
// corrección B5 del experto en Java. Cada afirmación se comprobó contra el programa de `corpus/curso/` y su golden antes de escribirla.
const TEXTOS_APROBADOS: readonly { readonly id: IdDeGaleria; readonly titulo?: string; readonly queObservar: string }[] = [
  {
    id: 'maquina-snacks',
    queObservar:
      'Un `switch` elige el producto según el código; dos `if` con `||` revisan que la cantidad y el dinero estén en rango, y un `if` con `else` decide si alcanza el dinero. Cada `return` termina el programa antes de tiempo. Antes de avanzar, ¿qué camino crees que toma Java con cada dato?',
  },
  { id: 'u3-hola-mundo', queObservar: 'El programa más corto: una sola instrucción, `System.out.println`. El texto entre comillas aparece en la consola tal cual, pero sin las comillas.' },
  { id: 'u3-bienvenida', queObservar: 'Otro `println`: el texto entre comillas sale idéntico en la consola y después Java pasa a la línea siguiente.' },
  {
    id: 'u3-tipos-basicos-y-constantes',
    queObservar: 'Cada variable nace con su tipo (`int`, `double`, `boolean`, `char`, `String`); `contador` se crea sin valor y recibe uno después, e `IVA` es `final`: Java no deja cambiar su valor.',
  },
  // B5 del experto en Java: «siempre con su punto decimal» era falso (`Infinity`, `NaN`, `1.0E7`); lo cierto es que un `double` con valor entero se imprime con `.0`.
  { id: 'u3-area-rectangulo-valores-fijos', queObservar: 'Mira cómo `area` se calcula con `base * altura` y cómo un `double` con valor entero se imprime con `.0`.' },
  {
    id: 'u3-area-rectangulo-con-scanner',
    queObservar: 'Java se detiene en cada `nextDouble()` hasta tener el dato; con los datos de ejemplo, 5.0 y 3.0, mira cómo se calcula `area` con lo que leyó.',
  },
  { id: 'u3-cuadrado-de-un-numero', queObservar: 'El número que se lee del teclado se multiplica por sí mismo, y el resultado es lo que se imprime.' },
  {
    id: 'u4-precedencia-de-operadores',
    queObservar: 'Java multiplica antes de sumar, a menos que los paréntesis le digan otra cosa: mira cómo se calculan `2 + 3 * 4` y `(2 + 3) * 4`.',
  },
  {
    id: 'u4-prediccion-precedencia',
    queObservar: 'Antes de pulsar «Siguiente», calcula a mano `a + b * 3 - 1`, con `a` valiendo 4 y `b` valiendo 2. ¿Qué número crees que imprime? Compáralo con lo que calcula Java.',
  },
  { id: 'u4-casting-basico', queObservar: 'La variable se llama `promedioRedondeado`, pero `(int)` no redondea: corta los decimales. Antes de avanzar, predice qué queda de 8.99.' },
  {
    id: 'u4-calificacion-final',
    queObservar: 'El promedio es un `double`; `(int)` le corta los decimales para la calificación entera, y el resultado de `promedio >= 6.0`, `true` o `false`, se guarda en el `boolean` `aprobado`.',
  },
  {
    id: 'u4-division-entera-y-modulo',
    queObservar: 'Compara `10 / 3`, entre enteros, con `10.0 / 3`: el tipo de los números decide si hay decimales. `%` da el residuo y `numero % 2 == 0` pregunta si un número es par.',
  },
  {
    id: 'u4-cociente-residuo',
    queObservar: '`/` da el cociente y `%` da el residuo de dividir los dos números que se leen. Con los datos de ejemplo, 17 y 5, calcula los dos a mano antes de avanzar.',
  },
  // G5: «vueltos» no es español de México; la tarjeta ya no da los 3 billetes ni los $50 que sobran.
  {
    id: 'u4-calculadora-vueltos',
    titulo: 'Calculadora de cambio',
    queObservar: '`/` y `%` trabajan juntos: `/` cuenta cuántos billetes de $100 caben y `%` da lo que sobra. Con 350 pesos, calcula a mano los dos antes de avanzar.',
  },
  {
    id: 'u4-prediccion-or-logico',
    queObservar: '`edad` vale 16 y `tienePermiso` vale `true`: ¿`puedeEntrar` será `true` o `false`? Decídelo antes de avanzar y compruébalo.',
  },
  {
    id: 'u4-verificar-acceso',
    queObservar: 'Con `||` basta con que uno de los dos lados dé `true`. Con 110 cm de estatura y un adulto que acompaña, mira cuál de los dos lados lo da.',
  },
  {
    id: 'u5-if-else-verificar-voto',
    queObservar: 'Con 17 años, ¿Java entra al `if` o al `else`? Mira qué da `edad >= 18`: de los dos bloques, solo se ejecuta uno.',
  },
  { id: 'u5-par-o-impar', queObservar: '`numero % 2 == 0` pregunta si el residuo de dividir entre 2 es 0: mira qué bloque ejecuta Java con el dato de ejemplo, 8.' },
  // B5 del experto en Java: «salta las de 90» era falso, es UNA sola condición (`calificacion >= 90`).
  {
    id: 'u5-escalera-else-if-correcta',
    queObservar: 'Java revisa de arriba hacia abajo y se queda con la primera condición que da `true`. Con 85, ¿en cuál se queda? Fíjate en que las de abajo ya no se revisan.',
  },
  { id: 'u5-escalera-else-if-orden-incorrecto', titulo: 'Predice: ¿qué letra le toca al 95?', queObservar: 'Con 95, ¿qué letra crees que se imprime? Mira en qué orden revisa Java las condiciones y qué pasa con las que quedan más abajo.' },
  {
    id: 'u5-switch-sin-break-fallthrough',
    titulo: 'Predice: un `switch` sin `break`',
    queObservar: '`diaSemana` vale 2: ¿cuántos textos crees que se imprimen? Mira qué hace Java al llegar al final de un `case` que no tiene `break`.',
  },
  {
    id: 'u6-contador-de-pares',
    queObservar: 'El `if` dentro del `for` decide en cada vuelta si `contador` sube: mira cómo solo cambia cuando `i` es par. Antes de avanzar, ¿cuántos pares hay del 1 al 20?',
  },
  {
    id: 'u6-suma-1-a-n',
    queObservar: '`suma` es un acumulador: en cada vuelta le agrega el valor de `i`. `n` vale 5 con el dato de ejemplo: antes de avanzar, calcula cuánto valdrá `suma` al final.',
  },
  {
    id: 'u6-acumulador-promedio-calificaciones',
    queObservar: '`calificacion` guarda solo la última calificación que se leyó; `suma` es la que las va juntando todas. Al final, `suma` se divide entre 5 para sacar el promedio.',
  },
  {
    id: 'u6-pedir-numero-positivo',
    queObservar: 'El `do-while` revisa al final: pide el número al menos una vez y repite mientras `numero <= 0`. Los datos de ejemplo son -3, 0 y 7: ¿con cuál termina? ¿El 0 hace que repita?',
  },
  {
    id: 'u6-ciclos-anidados-tabla',
    queObservar: 'Por cada vuelta del `for` de `fila`, el `for` de `columna` da sus 3 vueltas completas. Antes de avanzar: ¿cuántas veces se ejecuta el `print` en total?',
  },
  { id: 'u6-error-por-uno', titulo: 'Predice: tres `for` casi iguales', queObservar: 'Tres ciclos casi iguales: ¿cuántas vueltas crees que da cada uno? Compara `<=` con `<` y empezar en 0 o en 1.' },
  // G4: el título «un `while` que no entra» respondía la pregunta de la tarjeta.
  {
    id: 'u6-prediccion-while-no-ejecuta',
    titulo: 'Predice: ¿cuántas vueltas da este `while`?',
    queObservar: '`contador` empieza en 8 y la condición es `contador <= 5`. ¿Cuántas vueltas crees que da el `while`? ¿Qué se imprime?',
  },
  // G3: la tarjeta contaba la causa y el final, lo que C7 del panel 1 había quitado del paso 0.
  {
    id: 'u6-ciclo-infinito-demo',
    titulo: 'Predice: ¿cuándo termina este `while`?',
    queObservar: '¿Cuántas líneas crees que imprime este programa? Avanza unas vueltas y mira el panel de variables: ¿qué tendría que cambiar para que `contador <= 5` dé `false`?',
  },
];

describe('textosGaleria: los textos aprobados por el maestro (G1 a G5, regla P4) y la corrección B5 del experto en Java', () => {
  it('la lista cubre las 29 entradas que el panel cambió (la prueba no recorre un conjunto vacío)', () => {
    expect(TEXTOS_APROBADOS).toHaveLength(29);
    expect(new Set(TEXTOS_APROBADOS.map((texto) => texto.id)).size).toBe(29);
  });

  for (const { id, titulo, queObservar } of TEXTOS_APROBADOS) {
    it(`${id}: texto exacto`, () => {
      expect(textosGaleria.programa(id).queObservar).toBe(queObservar);
      if (titulo !== undefined) expect(textosGaleria.programa(id).titulo).toBe(titulo);
    });
  }

  // P4: ningún «Qué observar» da la salida final del programa. Estos son los resultados que antes aparecían escritos (cada patrón es un resultado que el JDK imprime con los datos de ejemplo).
  it('P4: «Qué observar» no escribe el resultado que el programa imprime', () => {
    const REVELACIONES: readonly (readonly [IdDeGaleria, RegExp])[] = [
      ['u3-area-rectangulo-con-scanner', /vale 15\.0/],
      ['u3-cuadrado-de-un-numero', /imprime 25/],
      ['u4-cociente-residuo', /cociente \(3\)|residuo \(2\)/],
      ['u4-precedencia-de-operadores', /da 14|da 20/],
      ['u4-division-entera-y-modulo', /da 3\b/],
      ['u4-calculadora-vueltos', /3 billetes|sobran \$50/],
      ['u6-suma-1-a-n', /se suman 1, 2, 3, 4 y 5/],
      ['u6-pedir-numero-positivo', /da tres vueltas/],
    ];
    for (const [id, patron] of REVELACIONES) expect(textosGaleria.programa(id).queObservar, id).not.toMatch(patron);
  });
});

describe('textosGaleria: de dónde viene cada programa y qué es una demostración', () => {
  it('distingue el programa del curso del ejercicio del profesor (REQ-AULA-001: el origen se marca)', () => {
    expect(textosGaleria.origen('curricular')).toBe('Del curso');
    expect(textosGaleria.origen('del-po')).toBe('Ejercicio del profesor');
  });

  it('los programas de demostración son los de la propuesta del diseño (§2.5): predicción y trampas', () => {
    expect([...textosGaleria.demostraciones].sort()).toEqual(
      ['u4-prediccion-or-logico', 'u4-prediccion-precedencia', 'u5-escalera-else-if-orden-incorrecto', 'u5-switch-sin-break-fallthrough', 'u6-ciclo-infinito-demo', 'u6-error-por-uno', 'u6-prediccion-while-no-ejecuta'].sort(),
    );
    for (const id of textosGaleria.demostraciones) expect(TODOS, id).toContain(id);
  });
});

describe('textosGaleria: la máquina de snacks y sus cinco datos de ejemplo', () => {
  const MUESTRAS = textosGaleria.muestrasDeLaMaquinaDeSnacks;

  it('tiene cinco datos de ejemplo, empezando por a1 2 50 (el que usa la clase)', () => {
    expect(MUESTRAS.map((muestra) => muestra.archivo)).toEqual([
      'maquina-snacks-a1-2-50',
      'maquina-snacks-b2-3-40',
      'maquina-snacks-b3',
      'maquina-snacks-z9',
      'maquina-snacks-a2-5',
    ]);
  });

  // G2 del maestro (panel R0, bloquea): las descripciones de los cinco datos decían el resultado («Con cambio», «No alcanza el dinero»…) y respondían el reto de la línea 72 de la prueba en papel; ahora
  // solo dicen QUÉ se le da al programa, verificado contra los datos de cada `.entrada.txt`.
  it('cada uno dice qué datos se le dan al programa, sin decir qué resulta (G2)', () => {
    expect(MUESTRAS.map((muestra) => muestra.descripcion)).toEqual([
      'Código a1, 2 piezas, paga con $50',
      'Código b2, 3 piezas, paga con $40',
      'Código b3',
      'Código z9',
      'Código a2 y 5 piezas',
    ]);
  });
});

// Item 6 del diseñador (panel R0): los títulos con comillas invertidas se pintan como código; el nombre accesible de un botón es texto plano, sin las comillas.
describe('textosGaleria: los títulos con código en el nombre accesible de las acciones', () => {
  it('el nombre accesible quita las comillas invertidas del título (el lector de pantalla no las dice)', () => {
    expect(textosGaleria.nombreDeLaAccion('Ver paso a paso', 'Predice: ¿cuándo termina este `while`?')).toBe('Ver paso a paso: Predice: ¿cuándo termina este while?');
    expect(textosGaleria.datosDeEjemplo('Predice: tres `for` casi iguales')).toBe('Datos de ejemplo: Predice: tres for casi iguales');
  });
});

describe('textosGaleria: el resto de la pantalla de ejemplos', () => {
  it('tiene título, ayuda, carga y el nombre de cada acción', () => {
    expect(textosGaleria.titulo()).toBe('Ejemplos');
    expect(textosGaleria.ayuda().length).toBeGreaterThan(20);
    expect(textosGaleria.cargando()).toBe('Cargando los ejemplos…');
    expect(textosGaleria.noSeCargaron()).toBe('No se pudieron cargar los ejemplos. Recarga la página para intentarlo otra vez.');
    expect(textosGaleria.verPasoAPaso()).toBe('Ver paso a paso');
    expect(textosGaleria.conMisDatos()).toBe('Con mis datos');
    expect(textosGaleria.queObservar()).toBe('Qué observar');
  });

  it('las etiquetas de las acciones llevan el título del programa para el lector de pantalla', () => {
    expect(textosGaleria.nombreDeLaAccion('Ver paso a paso', 'Hola, mundo')).toBe('Ver paso a paso: Hola, mundo');
    expect(textosGaleria.datosDeEjemplo('Carlos')).toBe('Datos de ejemplo: Carlos');
  });
});
