// El índice del libro (R0.13, design §5.2, REQ-LIBRO-001, PQ-3): los 34 temas de la lista cerrada, cada uno con su unidad, su oleada, su orden dentro de la unidad y su título. NO trae el contenido de los temas:
// el índice (ids, títulos y estado, unos 2 KB) va en el fragmento principal y el contenido de cada unidad se carga aparte (`u6.ts`…; design §5.5). Los títulos son borradores para el PO (R2.1 revisa la lista).
//
// Oleada 1 (21): los 10 de U6, sus 5 requisitos (`entrada-con-scanner`, `comparaciones`, `operadores-logicos`, `division-entera-y-modulo`, `incremento-y-decremento`) y los 6 de U5. Oleada 2 (13): el resto de U3 y U4 y U7.
// El orden de U5 y U6 es el del maestro (panel 1, §5); el de U3 y U4 es una propuesta de lectura (de lo más básico a lo que se apoya en ello) que el PO confirma en R2.1.
import { IDS_DE_TEMAS } from './tipos.ts';
import type { ContenidoDelTema, EntradaDelIndice, IdTema, Oleada, Tema, Unidad } from './tipos.ts';

type DatosDelIndice = Omit<EntradaDelIndice, 'id'>;

/** Todo tema nace en borrador: solo el PO lo aprueba (REQ-LIBRO-007). */
function borrador(unidad: Unidad, oleada: Oleada, orden: number, titulo: string): DatosDelIndice {
  return { unidad, oleada, orden, titulo, estado: 'borrador' };
}

// El tipo exige exactamente un registro por cada id de `IDS_DE_TEMAS`: agregar o quitar un tema sin tocar los dos no compila.
const DATOS_DEL_INDICE: { readonly [K in IdTema]: DatosDelIndice } = {
  'u3-programa-y-main': borrador(3, 2, 1, 'Tu primer programa: la clase y `main`'),
  'u3-salida': borrador(3, 2, 2, 'Mostrar datos: `print`, `println` y `printf`'),
  'u3-variables-y-tipos': borrador(3, 2, 3, 'Variables y tipos de datos'),
  'u3-asignacion': borrador(3, 2, 4, 'Asignación: guardar y cambiar un valor'),
  'u3-entrada-con-scanner': borrador(3, 1, 5, 'Leer datos con `Scanner`'),
  'u3-tipos-de-errores': borrador(3, 2, 6, 'Tres tipos de errores'),
  'u4-operadores-aritmeticos': borrador(4, 2, 1, 'Operadores aritméticos'),
  'u4-division-entera-y-modulo': borrador(4, 1, 2, 'División entera y módulo'),
  'u4-incremento-y-decremento': borrador(4, 1, 3, 'Incremento y decremento'),
  'u4-precedencia': borrador(4, 2, 4, 'Precedencia: qué se calcula primero'),
  'u4-conversiones': borrador(4, 2, 5, 'Conversiones entre tipos'),
  'u4-math-y-random': borrador(4, 2, 6, '`Math` y `Random`'),
  'u4-textos-y-concatenacion': borrador(4, 2, 7, 'Textos y concatenación'),
  'u4-comparaciones': borrador(4, 1, 8, 'Comparaciones'),
  'u4-operadores-logicos': borrador(4, 1, 9, 'Operadores lógicos: `&&`, `||` y `!`'),
  'u5-el-if': borrador(5, 1, 1, 'Decisiones: el `if`'),
  'u5-if-con-else': borrador(5, 1, 2, '`if` con `else`: dos caminos'),
  'u5-comparar-textos': borrador(5, 1, 3, 'Comparar textos'),
  'u5-else-if': borrador(5, 1, 4, 'Varias opciones: `else if`'),
  'u5-decisiones-anidadas': borrador(5, 1, 5, 'Decisiones dentro de decisiones'),
  'u5-switch': borrador(5, 1, 6, 'El `switch`'),
  'u6-que-es-un-ciclo': borrador(6, 1, 1, '¿Qué es un ciclo?'),
  'u6-while': borrador(6, 1, 2, 'El ciclo `while`'),
  'u6-contador-acumulador-bandera': borrador(6, 1, 3, 'Contador, acumulador y bandera'),
  'u6-do-while': borrador(6, 1, 4, 'El ciclo `do-while`'),
  'u6-for': borrador(6, 1, 5, 'El ciclo `for`'),
  'u6-ciclos-incrementales-y-decrementales': borrador(6, 1, 6, 'Ciclos que suben y ciclos que bajan'),
  'u6-error-por-uno-y-ciclo-infinito': borrador(6, 1, 7, 'El error por uno y el ciclo infinito'),
  'u6-repetir-hasta-que-el-usuario-quiera': borrador(6, 1, 8, 'Repetir hasta que el usuario quiera'),
  'u6-ciclos-anidados': borrador(6, 1, 9, 'Ciclos anidados'),
  'u6-break-y-continue': borrador(6, 1, 10, '`break` y `continue`'),
  'u7-prueba-de-escritorio': borrador(7, 2, 1, 'La prueba de escritorio'),
  'u7-depurar-con-el-visualizador': borrador(7, 2, 2, 'Depurar con el visualizador'),
  'u7-casos-de-prueba': borrador(7, 2, 3, 'Casos de prueba'),
};

/** Los 34 temas ordenados por unidad y, dentro de ella, por orden de lectura. */
export const INDICE_DEL_LIBRO: readonly EntradaDelIndice[] = IDS_DE_TEMAS.map((id): EntradaDelIndice => ({ id, ...DATOS_DEL_INDICE[id] })).toSorted(
  (a, b) => a.unidad - b.unidad || a.orden - b.orden,
);

export function entradaDelIndice(id: IdTema): EntradaDelIndice {
  return { id, ...DATOS_DEL_INDICE[id] };
}

/** Un tema completo: su entrada del índice con el contenido que se redactó. Cada archivo de unidad (`u6.ts`) lo usa para no repetir ni la unidad, ni la oleada, ni el título. */
export function temaCompleto(id: IdTema, contenido: ContenidoDelTema): Tema {
  return { ...entradaDelIndice(id), ...contenido };
}
