// Catálogo es-MX de las frases que el robot dice en cada paso (ADR 015, design.md §3.3, tarea 2.19). El motor NO escribe frases: cada `Paso` trae una
// CLAVE de explicación con sus datos (`motor/traza/explicacion.ts`) y este catálogo es el ÚNICO lugar donde se vuelven texto para el alumno.
// Tono (el mismo de `problemas.ts` y `arranque.ts`): español de México, tuteo, frases cortas para un alumno de bachillerato sin experiencia,
// el código entre comillas invertidas y lo que se imprime entre « ». TypeScript exige, por el tipo de `textosExplicacion`, una frase por cada
// clave: imposible agregar una clave al motor sin su texto. Solo puede importar tipos de `motor/vista` (matriz de capas).
//
// Voz (tarea R0.3, REQ-PANT-010, panel 1 H9/H10): el robot señala lo que hace la máquina en TERCERA persona —«Java revisa…», «Java guarda…»—, nunca como si él fuera la computadora («Reviso…»,
// «Guardo…»; Pea 1986: el alumno cree que la computadora «entiende» lo que quiso decir). `true` y `false` se escriben como código, y cada repetición de un ciclo es una «vuelta». La prueba
// `voz.test.ts` rechaza las formas prohibidas en todo el catálogo.
import type { ClaveExplicacion, DatosPorClave, EfectoDeIncremento, ExplicacionPaso, TipoDeCiclo } from '../../motor/vista.ts';
import { textoDeLaDetencion } from './avisos-de-limite.ts';

/**
 * Un valor `boolean` es código, igual que en las condiciones (V1 del maestro, panel R0): «le guarda `false`», «que da `true`». Un `String` "true" lleva comillas y no se confunde. Cualquier otro valor
 * (un número, un carácter, un texto entre comillas) se dice tal cual.
 */
function valorEnTexto(valor: string): string {
  return valor === 'true' || valor === 'false' ? `\`${valor}\`` : valor;
}

/** `a`, `a y b`, `a, b y c`: une las partes sin tocar su contenido (un `String` con comas no se parte; A1 del experto en Java, panel R0). */
function unirConY(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * Lo que Java calcula antes de guardar: el cálculo con sus variables ya sustituidas. Una lectura del teclado no se «calcula»: se dice lo que se escribió (lo tecleó el alumno o venía en la entrada
 * preparada de un ejemplo). Una constante (`17`) no se calcula, y sin variables que sustituir no se repite la expresión. Devuelve `null` si no hay nada que calcular.
 */
function calculo(expresion: string, sustituida: string, valor: string, leeDelTeclado?: true): string | null {
  const dicho = valorEnTexto(valor);
  // A3 del experto en Java (panel R0): con `nextDouble()` y un `8` tecleado, lo que Java OBTIENE (8.0) no es lo que se escribió (8): la frase no afirma que se escribió el valor convertido.
  if (leeDelTeclado === true) return `Java lee con \`${expresion}\` lo que se escribió y obtiene ${dicho}.`;
  if (expresion === valor) return null;
  if (sustituida === expresion) return `Java calcula \`${expresion}\`, que da ${dicho}.`;
  return `Java calcula \`${expresion}\`: con los valores de ahora es \`${sustituida}\`, que da ${dicho}.`;
}

/**
 * Lo que hacen los `++` y `--` que van DENTRO de la expresión, una frase por efecto (C2 del panel 1): «`i++` vale 7 y deja `i` en 8.» Sin esto el alumno ve «`i++ + 8`» y no sabe de dónde
 * sale el 8. Los valores son los que midió el motor.
 */
function frasesDeEfectos(efectos: readonly EfectoDeIncremento[] | undefined): readonly string[] {
  return (efectos ?? []).map((efecto) => `\`${efecto.expresion}\` vale ${efecto.valor} y deja \`${efecto.nombre}\` en ${efecto.nuevo}.`);
}

/** Las frases que preceden a la acción de guardar: el cálculo (si lo hay) y los efectos de `++`/`--`. Si hay alguna, la acción sigue con «Después»; si no, la abre «Java». */
function antesDeGuardar(expresion: string, sustituida: string, valor: string, leeDelTeclado: true | undefined, efectos: readonly EfectoDeIncremento[] | undefined): readonly string[] {
  const dichoElCalculo = calculo(expresion, sustituida, valor, leeDelTeclado);
  return [...(dichoElCalculo === null ? [] : [dichoElCalculo]), ...frasesDeEfectos(efectos)];
}

/** Une las frases previas con la acción: «Java calcula… Después crea…» o, sin nada previo, «Java crea…». */
function conAccion(previas: readonly string[], accion: string): string {
  return [...previas, `${previas.length > 0 ? 'Después' : 'Java'} ${accion}`].join(' ');
}

function nombreCorto(claseCalificada: string): string {
  return claseCalificada.slice(claseCalificada.lastIndexOf('.') + 1);
}

function etiquetaDeCiclo(ciclo: TipoDeCiclo): string {
  return `\`${ciclo}\``;
}

const ES_UN_IDENTIFICADOR = /^[\p{L}_$][\p{L}\p{N}_$]*$/u;

/**
 * ¿La condición es UNA variable `boolean` (`tieneLicencia`)? Sustituirla da solo `true` o `false`, y «queda `true`, que da `true`» diría lo mismo dos veces (V2 del maestro, panel R0). Una condición
 * que ya es el literal (`true`) no cambia al sustituir y se dice como siempre.
 */
function esUnaVariableBoolean(condicion: string, sustituida: string): boolean {
  return sustituida !== condicion && (sustituida === 'true' || sustituida === 'false') && ES_UN_IDENTIFICADOR.test(condicion);
}

/** `Java revisa `<condición>`. Con los valores de ahora queda `<sustituida>`, que da `true`.` — y, si la condición no cambia al sustituir (no lee variables), sin la parte de los valores. */
function revisionDeUnIf(condicion: string, sustituida: string, resultado: boolean): string {
  if (esUnaVariableBoolean(condicion, sustituida)) return `Java revisa \`${condicion}\`, que vale \`${sustituida}\`.`;
  return sustituida === condicion
    ? `Java revisa \`${condicion}\`, que da \`${resultado}\`.`
    : `Java revisa \`${condicion}\`. Con los valores de ahora queda \`${sustituida}\`, que da \`${resultado}\`.`;
}

/**
 * Lo que Java ve de la condición de un ciclo, tras el prefijo que dice qué vuelta es: «<prefijo> `<condición>`: queda `<sustituida>`, que da `true`.» (sin «queda…» si no cambia). Si la condición es una
 * sola variable `boolean`: «<prefijo> `continuar`, que vale `true`.» (con `ahora` —las revisiones que siguen a la primera— «que ahora vale»).
 */
function condicionDeUnCiclo(prefijo: string, condicion: string, sustituida: string, resultado: boolean, ahora = false): string {
  if (esUnaVariableBoolean(condicion, sustituida)) return `${prefijo} \`${condicion}\`, que ${ahora ? 'ahora ' : ''}vale \`${sustituida}\`.`;
  return sustituida === condicion
    ? `${prefijo} \`${condicion}\`, que da \`${resultado}\`.`
    : `${prefijo} \`${condicion}\`: queda \`${sustituida}\`, que da \`${resultado}\`.`;
}

export const textosExplicacion: { readonly [K in ClaveExplicacion]: (datos: DatosPorClave[K]) => string } = {
  'declaracion-con-valor': ({ nombre, tipo, expresion, sustituida, valor, leeDelTeclado, conversion, efectos }) => {
    // Un objeto de la biblioteca no es un valor que se «calcule» ni que se «guarde»: se crea y sirve para algo.
    if (tipo === 'Scanner') return `Java crea la variable \`${nombre}\` de tipo Scanner con \`${expresion}\`. Con ella leerá lo que escribas en el teclado.`;
    if (tipo === 'Random') return `Java crea la variable \`${nombre}\` de tipo Random con \`${expresion}\`. Con ella sacará números aleatorios.`;
    // C1 del panel 1: el cálculo se dice en el tipo de la EXPRESIÓN (`25 / 3` da 8) y la conversión se dice al guardar (como `promedio` es `double`, Java guarda 8.0): el 8.0 nace al guardar, no al calcular.
    const previas = antesDeGuardar(expresion, sustituida, conversion?.antes ?? valor, leeDelTeclado, efectos);
    if (conversion !== undefined) {
      return `${conAccion(previas, `crea la variable \`${nombre}\` de tipo ${tipo}.`)} Como \`${nombre}\` es \`${conversion.tipo}\`, guarda ${valor}.`;
    }
    return conAccion(previas, `crea la variable \`${nombre}\` de tipo ${tipo} y le guarda ${valorEnTexto(valor)}.`);
  },
  'declaracion-sin-valor': ({ nombre, tipo }) =>
    `Java crea la variable \`${nombre}\` de tipo ${tipo}. Todavía no tiene valor: Java no te deja usarla hasta que le guardes algo.`,
  // A1 del experto en Java (panel R0): la lista se arma pieza por pieza; antes una expresión regular cambiaba la última coma del TEXTO y un `String` con comas ("Hola, mundo") salía como «Hola y mundo».
  'declaracion-varias': ({ variables }) =>
    `Java crea estas variables: ${unirConY(
      variables.map((variable) => `\`${variable.nombre}\` (${variable.tipo}) ${variable.valor === null ? 'sin valor todavía' : `con ${valorEnTexto(variable.valor)}`}`),
    )}.`,
  asignacion: ({ nombre, expresion, sustituida, valor, anterior, leeDelTeclado, conversion, efectos }) => {
    const previas = antesDeGuardar(expresion, sustituida, conversion?.antes ?? valor, leeDelTeclado, efectos);
    const antes = anterior === null ? '.' : `; antes valía ${valorEnTexto(anterior)}.`;
    // Con una conversión la frase abre con «Como `g` es `double`, …»: si algo ya nombró a Java, el sujeto sigue; si no, se nombra.
    if (conversion !== undefined) {
      return [...previas, `Como \`${nombre}\` es \`${conversion.tipo}\`, ${previas.length > 0 ? '' : 'Java '}guarda ${valor}${antes}`].join(' ');
    }
    return conAccion(previas, `guarda ${valorEnTexto(valor)} en \`${nombre}\`${antes}`);
  },
  'asignacion-compuesta': ({ nombre, operador, expresion, sustituida, derecho, anterior, valor, recorte, efectos }) => {
    const ladoDerecho = sustituida === expresion || sustituida === derecho ? `el lado derecho vale ${derecho}` : `el lado derecho es \`${sustituida}\`, que da ${derecho},`;
    // C2 del panel 1: `x op= e` es `x = (T)(x op e)`; si guardar recorta (`int x = 10; x += 2.7;` suma 12.7 y se queda con 12), se dice lo que dio la operación y por qué se queda con menos.
    const recortado =
      recorte === undefined ? '' : `\`${anterior} ${operador.slice(0, -1)} ${derecho}\` da ${recorte.operado} y, como \`${nombre}\` es \`${recorte.tipo}\`, se queda con ${valor}. `;
    return `\`${nombre} ${operador} ${expresion}\`: ${ladoDerecho} y \`${nombre}\` valía ${anterior}. ${frasesDeEfectos(efectos).map((frase) => `${frase} `).join('')}${recortado}Java guarda ${valor} en \`${nombre}\`.`;
  },
  incremento: ({ nombre, anterior, valor }) => `Java le suma 1 a \`${nombre}\`: valía ${anterior} y ahora vale ${valor}.`,
  decremento: ({ nombre, anterior, valor }) => `Java le resta 1 a \`${nombre}\`: valía ${anterior} y ahora vale ${valor}.`,
  'acciones-del-for': ({ acciones }) => `Java hace estas acciones, en orden: ${acciones.map((accion) => `\`${accion}\``).join(', ')}.`,
  impresion: ({ texto, flujo, saltoDeLinea }) => {
    const donde = flujo === 'out' ? 'en la consola' : 'en la consola de errores';
    if (texto === '') return saltoDeLinea ? 'Java imprime solamente un salto de línea.' : `Java imprime ${donde} un texto vacío.`;
    return `Java imprime ${donde}: «${texto}» ${saltoDeLinea ? 'y pasa a la línea siguiente' : 'sin pasar a la línea siguiente'}.`;
  },
  expresion: ({ expresion }) => `Java ejecuta \`${expresion}\`.`,
  // T1 del maestro (panel 1): «Java revisa `c`. Con los valores de ahora queda `s`, que da `true`. Entra al `if`.»
  'condicion-if': ({ condicion, sustituida, resultado, tieneSino }) => {
    const salida = resultado ? 'Entra al `if`.' : tieneSino ? 'Se salta el `if` y entra al `else`.' : 'Se salta el bloque del `if` y sigue después de él.';
    return `${revisionDeUnIf(condicion, sustituida, resultado)} ${salida}`;
  },
  // T2 del maestro (panel 1): la primera revisión es «antes de la primera vuelta»; las demás cuentan la vuelta que terminó y la que empieza.
  'condicion-ciclo': ({ ciclo, condicion, sustituida, resultado, vuelta }) => {
    if (ciclo === 'do-while') {
      const revision = condicionDeUnCiclo(`Terminó la vuelta ${vuelta} del ${etiquetaDeCiclo(ciclo)}. Ahora Java revisa`, condicion, sustituida, resultado);
      return `${revision} ${resultado ? `Repite: empieza la vuelta ${vuelta + 1}.` : 'Sale del ciclo.'}`;
    }
    if (vuelta <= 1) {
      const revision = condicionDeUnCiclo('Antes de la primera vuelta, Java revisa', condicion, sustituida, resultado);
      return `${revision} ${resultado ? `Entra al cuerpo del ${etiquetaDeCiclo(ciclo)}.` : `No da ni una vuelta: sigue después del ${etiquetaDeCiclo(ciclo)}.`}`;
    }
    const revision = condicionDeUnCiclo(`Terminó la vuelta ${vuelta - 1}. Java revisa otra vez`, condicion, sustituida, resultado, true);
    return `${revision} ${resultado ? `Empieza la vuelta ${vuelta}.` : `El ciclo termina y el programa sigue después del ${etiquetaDeCiclo(ciclo)}.`}`;
  },
  'switch-elige-caso': ({ expresion, valor, etiqueta }) => `El \`switch\` mira \`${expresion}\`, que vale ${valor}, y salta al \`case ${etiqueta}\`.`,
  'switch-elige-defecto': ({ expresion, valor }) =>
    `El \`switch\` mira \`${expresion}\`, que vale ${valor}. Ningún \`case\` coincide, así que salta al \`default\`.`,
  'switch-sin-coincidencia': ({ expresion, valor }) =>
    `El \`switch\` mira \`${expresion}\`, que vale ${valor}. Ningún \`case\` coincide y no hay \`default\`: sigue con lo que viene después del \`switch\`.`,
  // Al caer, Java NO vuelve a comparar con la etiqueta del grupo de abajo (JLS 14.11.3): se ejecuta aunque no coincida. Un `default` no compara nada, así que ahí no se agrega la aclaración.
  'switch-cae': ({ etiqueta }) =>
    `El grupo de arriba no termina en \`break\`, así que Java sigue de largo y ejecuta también lo del ${etiqueta === null ? '`default`.' : `\`case ${etiqueta}\`, sin revisar si coincide.`}`,
  break: ({ en }) => (en === 'ciclo' ? '`break`: Java sale del ciclo ahora mismo.' : '`break`: Java termina el `switch` ahora mismo.'),
  // A2 del experto en Java (panel R0): en `while` y `do-while` el `continue` salta a REVISAR LA CONDICIÓN, que puede terminar el ciclo («sigue con la siguiente» prometía una vuelta que quizá no ocurre);
  // en el `for` salta a la actualización, y eso sí es exacto.
  continue: ({ ciclo }) =>
    `\`continue\`: Java se salta lo que falta de esta vuelta del ${etiquetaDeCiclo(ciclo)} y ${ciclo === 'for' ? 'sigue con su actualización' : 'pasa a revisar la condición'}.`,
  return: () => '`return` termina `main`, y con eso termina el programa.',
  vacia: () => 'Una sentencia vacía (solo `;`): no hace nada, pero cuenta como un paso.',
  excepcion: ({ clase, mensaje }) =>
    `Java detuvo el programa por un error mientras se ejecutaba (una excepción): \`${nombreCorto(clase)}\`${mensaje === null ? '' : ` (${mensaje})`}.`,
  // Un límite del visualizador: el título del aviso («Se detuvo por seguridad») ya dice que se detuvo, así que el paso solo da el motivo, con la misma frase que la nota del cierre (C7 del panel 1).
  detenido: ({ causa, diagnostico }) => {
    switch (causa) {
      case 'limite-pasos':
      case 'limite-tiempo':
      case 'limite-caracteres':
        return textoDeLaDetencion(causa, diagnostico);
      case 'no-disponible-en-ejecucion':
        return 'El visualizador se detuvo aquí: esta parte todavía no la sabe ejecutar.';
      case 'error-interno':
        return 'Algo falló dentro del visualizador y tuvo que parar.';
    }
  },
};

/** La frase de un paso: despacha por la clave a su función (el tipo de `ExplicacionPaso` garantiza que `datos` es el de esa clave). */
export function textoDeExplicacion(explicacion: ExplicacionPaso): string {
  const generador = textosExplicacion[explicacion.clave] as (datos: ExplicacionPaso['datos']) => string;
  return generador(explicacion.datos);
}
