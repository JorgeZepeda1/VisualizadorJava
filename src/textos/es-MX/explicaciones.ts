// Catálogo es-MX de las frases que el robot dice en cada paso (ADR 015, design.md §3.3, tarea 2.19). El motor NO escribe frases: cada `Paso` trae una
// CLAVE de explicación con sus datos (`motor/traza/explicacion.ts`) y este catálogo es el ÚNICO lugar donde se vuelven texto para el alumno.
// Tono (el mismo de `problemas.ts` y `arranque.ts`): español de México, tuteo, frases cortas para un alumno de bachillerato sin experiencia,
// el código entre comillas invertidas y lo que se imprime entre « ». TypeScript exige, por el tipo de `textosExplicacion`, una frase por cada
// clave: imposible agregar una clave al motor sin su texto. Solo puede importar tipos de `motor/vista` (matriz de capas).
import type { ClaveExplicacion, DatosPorClave, ExplicacionPaso, LecturaExplicada, TipoDeCiclo } from '../../motor/vista.ts';

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

/** El cálculo de una expresión con sus variables ya sustituidas: lo que se dice antes de guardar el resultado. */
function calculo(expresion: string, sustituida: string, valor: string): string {
  if (expresion === valor) return '';
  if (sustituida === expresion) return `Calculo \`${expresion}\`, que da ${valor}. `;
  return `Calculo \`${expresion}\`: con los valores de ahora es \`${sustituida}\`, que da ${valor}. `;
}

function nombreCorto(claseCalificada: string): string {
  return claseCalificada.slice(claseCalificada.lastIndexOf('.') + 1);
}

function etiquetaDeCiclo(ciclo: TipoDeCiclo): string {
  return `\`${ciclo}\``;
}

export const textosExplicacion: { readonly [K in ClaveExplicacion]: (datos: DatosPorClave[K]) => string } = {
  'declaracion-con-valor': ({ nombre, tipo, expresion, sustituida, valor }) =>
    `${calculo(expresion, sustituida, valor)}Creo la variable \`${nombre}\` de tipo ${tipo} y le guardo ${valor}.`,
  'declaracion-sin-valor': ({ nombre, tipo }) =>
    `Creo la variable \`${nombre}\` de tipo ${tipo}. Todavía no tiene valor: Java no te deja usarla hasta que le guardes algo.`,
  'declaracion-varias': ({ variables }) =>
    `Creo estas variables: ${variables
      .map((variable) => `\`${variable.nombre}\` (${variable.tipo}) ${variable.valor === null ? 'sin valor todavía' : `con ${variable.valor}`}`)
      .join(', ')
      .replace(/, ([^,]*)$/, ' y $1')}.`,
  asignacion: ({ nombre, expresion, sustituida, valor, anterior }) =>
    `${calculo(expresion, sustituida, valor)}Guardo ${valor} en \`${nombre}\`${anterior === null ? '.' : `; antes valía ${anterior}.`}`,
  'asignacion-compuesta': ({ nombre, operador, expresion, sustituida, derecho, anterior, valor }) => {
    const ladoDerecho = sustituida === expresion || sustituida === derecho ? `el lado derecho vale ${derecho}` : `el lado derecho es \`${sustituida}\`, que da ${derecho},`;
    return `\`${nombre} ${operador} ${expresion}\`: ${ladoDerecho} y \`${nombre}\` valía ${anterior}. Guardo ${valor} en \`${nombre}\`.`;
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
  'switch-cae': ({ etiqueta }) =>
    `Como no hubo \`break\`, la ejecución sigue de largo y entra al ${etiqueta === null ? '`default`' : `\`case ${etiqueta}\``}.`,
  break: ({ en }) => (en === 'ciclo' ? '`break`: salgo del ciclo ahora mismo.' : '`break`: termino el `switch` ahora mismo.'),
  continue: ({ ciclo }) =>
    `\`continue\`: me salto lo que falta de esta vuelta del ${etiquetaDeCiclo(ciclo)} y sigo con ${ciclo === 'for' ? 'su actualización' : 'la siguiente'}.`,
  return: () => '`return`: termino el programa aquí.',
  vacia: () => 'Una sentencia vacía (solo `;`): no hace nada, pero cuenta como un paso.',
  excepcion: ({ clase, mensaje }) =>
    `Java detuvo el programa con una excepción: \`${nombreCorto(clase)}\`${mensaje === null ? '' : ` (${mensaje})`}.`,
  detenido: ({ causa }) => {
    switch (causa) {
      case 'limite-pasos':
        return 'Paré el programa: ya llevaba demasiados pasos. ¿Será un ciclo que nunca termina?';
      case 'limite-caracteres':
        return 'Paré el programa: un texto creció demasiado.';
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
