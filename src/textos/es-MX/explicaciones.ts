// Catálogo es-MX de las frases que el robot dice en cada paso (ADR 015, design.md §3.3, tarea 2.19). El motor NO escribe frases: cada `Paso` trae una
// CLAVE de explicación con sus datos (`motor/traza/explicacion.ts`) y este catálogo es el ÚNICO lugar donde se vuelven texto para el alumno.
// Tono (el mismo de `problemas.ts` y `arranque.ts`): español de México, tuteo, frases cortas para un alumno de bachillerato sin experiencia,
// el código entre comillas invertidas y lo que se imprime entre « ». TypeScript exige, por el tipo de `textosExplicacion`, una frase por cada
// clave: imposible agregar una clave al motor sin su texto. Solo puede importar tipos de `motor/vista` (matriz de capas).
import type { ClaveExplicacion, DatosPorClave, EfectoDeIncremento, ExplicacionPaso, LecturaExplicada, TipoDeCiclo } from '../../motor/vista.ts';
import { textoDeLaDetencion } from './avisos-de-limite.ts';

/** `cantidad vale 2`, `a vale 1 y b vale 2`, `a vale 1, b vale 2 y c vale 3`. */
function enumerarLecturas(lecturas: readonly LecturaExplicada[]): string {
  const partes = lecturas.map((lectura) => `${lectura.nombre} vale ${lectura.valor}`);
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/** `Reviso <condición>: <variables>, así que...` — o sin variables, `Reviso <condición>: es...`. */
function veredicto(lecturas: readonly LecturaExplicada[], resultado: boolean, continuacion: string): string {
  const palabra = resultado ? 'verdadero' : 'falso';
  return lecturas.length === 0 ? `es ${palabra} ${continuacion}` : `${enumerarLecturas(lecturas)}, así que es ${palabra} ${continuacion}`;
}

/** El cálculo de una expresión con sus variables ya sustituidas: lo que se dice antes de guardar el resultado. Una lectura del teclado no se «calcula»: se dice lo que el usuario escribió. */
function calculo(expresion: string, sustituida: string, valor: string, leeDelTeclado?: true): string {
  if (leeDelTeclado === true) return `Leo lo que escribiste en el teclado con \`${expresion}\`: ${valor}. `;
  if (expresion === valor) return '';
  if (sustituida === expresion) return `Calculo \`${expresion}\`, que da ${valor}. `;
  return `Calculo \`${expresion}\`: con los valores de ahora es \`${sustituida}\`, que da ${valor}. `;
}

/**
 * Lo que hacen los `++` y `--` que van DENTRO de la expresión, una frase por efecto, con su espacio al final (C2 del panel 1): «`i++` vale 7 y deja `i` en 8.» Sin esto el alumno ve «`i++ + 8`» y no sabe de dónde
 * sale el 8. Los valores son los que midió el motor.
 */
function frasesDeEfectos(efectos: readonly EfectoDeIncremento[] | undefined): string {
  return (efectos ?? []).map((efecto) => `\`${efecto.expresion}\` vale ${efecto.valor} y deja \`${efecto.nombre}\` en ${efecto.nuevo}. `).join('');
}

function nombreCorto(claseCalificada: string): string {
  return claseCalificada.slice(claseCalificada.lastIndexOf('.') + 1);
}

function etiquetaDeCiclo(ciclo: TipoDeCiclo): string {
  return `\`${ciclo}\``;
}

export const textosExplicacion: { readonly [K in ClaveExplicacion]: (datos: DatosPorClave[K]) => string } = {
  'declaracion-con-valor': ({ nombre, tipo, expresion, sustituida, valor, leeDelTeclado, conversion, efectos }) => {
    // Un objeto de la biblioteca no es un valor que se «calcule» ni que se «guarde»: se crea y sirve para algo.
    if (tipo === 'Scanner') return `Creo la variable \`${nombre}\` de tipo Scanner con \`${expresion}\`. Con ella voy a leer lo que escribas en el teclado.`;
    if (tipo === 'Random') return `Creo la variable \`${nombre}\` de tipo Random con \`${expresion}\`. Con ella voy a sacar números aleatorios.`;
    // C1 del panel 1: el cálculo se dice en el tipo de la EXPRESIÓN (`25 / 3` da 8) y la conversión se dice al guardar (como `promedio` es `double`, guardo 8.0): el 8.0 nace al guardar, no al calcular.
    const calculado = `${calculo(expresion, sustituida, conversion?.antes ?? valor, leeDelTeclado)}${frasesDeEfectos(efectos)}`;
    if (conversion !== undefined) return `${calculado}Creo la variable \`${nombre}\` de tipo ${tipo}. Como \`${nombre}\` es \`${conversion.tipo}\`, guardo ${valor}.`;
    return `${calculado}Creo la variable \`${nombre}\` de tipo ${tipo} y le guardo ${valor}.`;
  },
  'declaracion-sin-valor': ({ nombre, tipo }) =>
    `Creo la variable \`${nombre}\` de tipo ${tipo}. Todavía no tiene valor: Java no te deja usarla hasta que le guardes algo.`,
  'declaracion-varias': ({ variables }) =>
    `Creo estas variables: ${variables
      .map((variable) => `\`${variable.nombre}\` (${variable.tipo}) ${variable.valor === null ? 'sin valor todavía' : `con ${variable.valor}`}`)
      .join(', ')
      .replace(/, ([^,]*)$/, ' y $1')}.`,
  asignacion: ({ nombre, expresion, sustituida, valor, anterior, leeDelTeclado, conversion, efectos }) => {
    const calculado = `${calculo(expresion, sustituida, conversion?.antes ?? valor, leeDelTeclado)}${frasesDeEfectos(efectos)}`;
    const guarda = conversion === undefined ? `Guardo ${valor} en \`${nombre}\`` : `Como \`${nombre}\` es \`${conversion.tipo}\`, guardo ${valor}`;
    return `${calculado}${guarda}${anterior === null ? '.' : `; antes valía ${anterior}.`}`;
  },
  'asignacion-compuesta': ({ nombre, operador, expresion, sustituida, derecho, anterior, valor, recorte, efectos }) => {
    const ladoDerecho = sustituida === expresion || sustituida === derecho ? `el lado derecho vale ${derecho}` : `el lado derecho es \`${sustituida}\`, que da ${derecho},`;
    // C2 del panel 1: `x op= e` es `x = (T)(x op e)`; si guardar recorta (`int x = 10; x += 2.7;` suma 12.7 y se queda con 12), se dice lo que dio la operación y por qué se queda con menos.
    const recortado =
      recorte === undefined ? '' : `\`${anterior} ${operador.slice(0, -1)} ${derecho}\` da ${recorte.operado} y, como \`${nombre}\` es \`${recorte.tipo}\`, se queda con ${valor}. `;
    return `\`${nombre} ${operador} ${expresion}\`: ${ladoDerecho} y \`${nombre}\` valía ${anterior}. ${frasesDeEfectos(efectos)}${recortado}Guardo ${valor} en \`${nombre}\`.`;
  },
  incremento: ({ nombre, anterior, valor }) => `Sumo 1 a \`${nombre}\`: valía ${anterior} y ahora vale ${valor}.`,
  decremento: ({ nombre, anterior, valor }) => `Resto 1 a \`${nombre}\`: valía ${anterior} y ahora vale ${valor}.`,
  'acciones-del-for': ({ acciones }) => `Hago estas acciones, en orden: ${acciones.map((accion) => `\`${accion}\``).join(', ')}.`,
  impresion: ({ texto, flujo, saltoDeLinea }) => {
    const donde = flujo === 'out' ? 'en la consola' : 'en la consola de errores';
    if (texto === '') return saltoDeLinea ? 'Imprimo solamente un salto de línea.' : `Imprimo ${donde} un texto vacío.`;
    return `Imprimo ${donde}: «${texto}» ${saltoDeLinea ? 'y paso a la línea siguiente' : 'sin pasar a la línea siguiente'}.`;
  },
  expresion: ({ expresion }) => `Ejecuto \`${expresion}\`.`,
  'condicion-if': ({ condicion, lecturas, resultado, tieneSino }) => {
    const salida = resultado ? 'y entro al `if`' : tieneSino ? ', no entro al `if` y sigo con el `else`' : 'y no entro al `if`';
    // «es falso, no entro…» lleva coma; «es falso y no entro…» no.
    return `Reviso \`${condicion}\`: ${veredicto(lecturas, resultado, salida).replace(' ,', ',')}.`;
  },
  'condicion-ciclo': ({ ciclo, condicion, lecturas, resultado, vuelta }) => {
    if (ciclo === 'do-while') {
      const accion = resultado ? 'y repito' : 'y salgo del ciclo';
      return `Terminó el cuerpo del ${etiquetaDeCiclo(ciclo)} (vuelta ${vuelta}). Reviso \`${condicion}\`: ${veredicto(lecturas, resultado, accion)}.`;
    }
    const accion = resultado ? `y entro al cuerpo del ${etiquetaDeCiclo(ciclo)}` : 'y salgo del ciclo';
    return `Reviso \`${condicion}\` (revisión ${vuelta}): ${veredicto(lecturas, resultado, accion)}.`;
  },
  'switch-elige-caso': ({ expresion, valor, etiqueta }) => `El \`switch\` mira \`${expresion}\`, que vale ${valor}, y salta al \`case ${etiqueta}\`.`,
  'switch-elige-defecto': ({ expresion, valor }) =>
    `El \`switch\` mira \`${expresion}\`, que vale ${valor}. Ningún \`case\` coincide, así que salta al \`default\`.`,
  'switch-sin-coincidencia': ({ expresion, valor }) =>
    `El \`switch\` mira \`${expresion}\`, que vale ${valor}. Ningún \`case\` coincide y no hay \`default\`: sigo con lo que viene después del \`switch\`.`,
  // Al caer, Java NO vuelve a comparar con la etiqueta del grupo de abajo (JLS 14.11.3): se ejecuta aunque no coincida. Un `default` no compara nada, así que ahí no se agrega la aclaración.
  'switch-cae': ({ etiqueta }) =>
    `El grupo de arriba no termina en \`break\`, así que Java sigue de largo y ejecuta también lo del ${etiqueta === null ? '`default`.' : `\`case ${etiqueta}\`, sin revisar si coincide.`}`,
  break: ({ en }) => (en === 'ciclo' ? '`break`: salgo del ciclo ahora mismo.' : '`break`: termino el `switch` ahora mismo.'),
  continue: ({ ciclo }) =>
    `\`continue\`: me salto lo que falta de esta vuelta del ${etiquetaDeCiclo(ciclo)} y sigo con ${ciclo === 'for' ? 'su actualización' : 'la siguiente'}.`,
  return: () => '`return`: termino el programa aquí.',
  vacia: () => 'Una sentencia vacía (solo `;`): no hace nada, pero cuenta como un paso.',
  excepcion: ({ clase, mensaje }) =>
    `Java detuvo el programa con una excepción: \`${nombreCorto(clase)}\`${mensaje === null ? '' : ` (${mensaje})`}.`,
  // Un límite del visualizador: el título del aviso («Se detuvo por seguridad») ya dice que se detuvo, así que el paso solo da el motivo, con la misma frase que la nota del cierre (C7 del panel 1).
  detenido: ({ causa, diagnostico }) => {
    switch (causa) {
      case 'limite-pasos':
      case 'limite-tiempo':
      case 'limite-caracteres':
        return textoDeLaDetencion(causa, diagnostico);
      case 'no-disponible-en-ejecucion':
        return 'Paré aquí: esta parte todavía no sé ejecutarla.';
      case 'error-interno':
        return 'Algo falló dentro del visualizador y tuve que parar.';
    }
  },
};

/** La frase de un paso: despacha por la clave a su función (el tipo de `ExplicacionPaso` garantiza que `datos` es el de esa clave). */
export function textoDeExplicacion(explicacion: ExplicacionPaso): string {
  const generador = textosExplicacion[explicacion.clave] as (datos: ExplicacionPaso['datos']) => string;
  return generador(explicacion.datos);
}
