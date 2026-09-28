// Catálogo es-MX — mensajes de `Problema` (ADR 015; design.md línea 89, tarea 1.11). Funciones
// tipadas por sus datos (ADR 015 punto 1): el motor (`src/motor/problemas.ts`,
// `src/motor/semantica/*.ts`) SOLO emite `codigo` + `datos`, nunca texto; `textosProblemas` es el
// ÚNICO lugar que arma la frase en español de México — TypeScript exige, por el tipo
// `Record<CodigoProblema, ...>`, que existan las 17 claves del catálogo cerrado
// (`src/motor/problemas.ts`), así que no hay manera de olvidar una al agregarla allá sin que esto
// deje de compilar.
//
// Tono (revisado por el PO, proposal.md): tuteo, directo, nunca "incorrecto" a secas — explica QUÉ
// pasó y, cuando aplica, una pista de cómo arreglarlo. Solo puede importar tipos de `motor/vista`
// (matriz de capas, herramientas/eslint/matriz-capas.ts).
import type { CodigoProblema, Tipo } from '../../motor/vista.ts';

interface DatosNombre {
  readonly nombre: string;
}

interface DatosNombreConSugerencia {
  readonly nombre: string;
  readonly sugerencia?: string;
}

interface DatosConversion {
  readonly origen: Tipo;
  readonly destino: Tipo;
}

interface DatosCondicion {
  readonly tipo: Tipo;
}

interface DatosComparacion {
  readonly izquierda: Tipo;
  readonly derecha: Tipo;
}

interface DatosOperadorBinario {
  readonly operador: string;
  readonly izquierda: Tipo;
  readonly derecha: Tipo;
}

interface DatosMensajeCrudo {
  readonly mensaje: string;
}

// Sub-lote 1-D2c (REQ-SUB-005/007, task_c0cf2e6c): "clase"/"nombre" identifican el receptor real
// (el "Math" de "Math.raiz", el "String" de "s.lenght") — nunca solo el nombre suelto, a
// diferencia de "metodo-no-declarado" (que SÍ es un nombre suelto, sin receptor: REQ-SUB-007 dice
// "ningún método propio existe en el subconjunto").
interface DatosMiembro {
  readonly clase: string;
  readonly nombre: string;
}

interface DatosSinSobrecarga {
  readonly clase: string;
  readonly nombre: string;
  readonly argumentos: readonly Tipo[];
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- vacío a propósito: estos 6 códigos no llevan datos
interface DatosVacios {}

// El mapeo código -> forma de sus datos: si `CodigoProblema` (motor/problemas.ts) alguna vez
// agrega o quita una clave sin actualizar esto, `textosProblemas` de abajo deja de compilar — la
// garantía real de ADR 015 punto 1 ("TypeScript exige que existan todas las claves").
interface DatosPorCodigo {
  'falta-punto-y-coma': DatosVacios;
  'falta-parentesis-cierre': DatosVacios;
  'error-no-clasificado': DatosMensajeCrudo;
  'variable-no-declarada': DatosNombreConSugerencia;
  'metodo-no-declarado': DatosNombre;
  'variable-ya-definida': DatosNombre;
  'tipo-no-reconocido': DatosNombre;
  'campo-no-declarado': DatosMiembro;
  'miembro-no-declarado': DatosMiembro;
  'sin-sobrecarga-aplicable': DatosSinSobrecarga;
  'conversion-con-perdida': DatosConversion;
  'tipos-incompatibles-en-asignacion': DatosConversion;
  'condicion-no-booleana': DatosCondicion;
  'tipos-incomparables': DatosComparacion;
  'operandos-invalidos-operador-binario': DatosOperadorBinario;
  'selector-de-switch-invalido': DatosCondicion;
  'etiqueta-de-case-no-constante': DatosVacios;
  'etiqueta-de-case-duplicada': DatosVacios;
  'break-fuera-de-contexto': DatosVacios;
  'continue-fuera-de-contexto': DatosVacios;
  'else-sin-if': DatosVacios;
  'cadena-sin-cerrar': DatosVacios;
  'fin-de-archivo-inesperado': DatosVacios;
  'llave-de-cierre-sobrante': DatosVacios;
  'llave-de-metodo-faltante': DatosVacios;
  'paquete-despues-de-import': DatosVacios;
  'tipo-requiere-import': DatosNombre;
  'sentencia-inalcanzable': DatosVacios;
  'variable-posiblemente-no-asignada': DatosNombre;
  'variable-final-reasignada': DatosNombre;
}

export const textosProblemas: { readonly [K in CodigoProblema]: (datos: DatosPorCodigo[K]) => string } = {
  'falta-punto-y-coma': () => 'Te falta un punto y coma ";" al final de esta línea.',
  'falta-parentesis-cierre': () => 'Te falta cerrar un paréntesis ")".',
  'error-no-clasificado': ({ mensaje }) => `Hay un error de sintaxis aquí: ${mensaje}.`,
  'variable-no-declarada': ({ nombre, sugerencia }) =>
    sugerencia === undefined
      ? `No existe una variable llamada "${nombre}". ¿La declaraste antes? ¿Se te fue un error de dedo?`
      : `No existe una variable llamada "${nombre}". ¿Quisiste decir "${sugerencia}" (con mayúscula)?`,
  'metodo-no-declarado': ({ nombre }) => `No existe un método llamado "${nombre}()". ¿Lo definiste?`,
  'variable-ya-definida': ({ nombre }) => `Ya existe una variable llamada "${nombre}" visible en este punto; usa otro nombre.`,
  'tipo-no-reconocido': ({ nombre }) =>
    `No reconozco el tipo "${nombre}". Revisa que esté bien escrito (en Java los tipos casi siempre empiezan con mayúscula, como "String").`,
  'campo-no-declarado': ({ clase, nombre }) =>
    `"${clase}" no tiene ningún valor llamado "${nombre}". Revisa que esté bien escrito y que no le falten los paréntesis "()" si en realidad es un método.`,
  'miembro-no-declarado': ({ clase, nombre }) =>
    `"${clase}" no tiene ningún método llamado "${nombre}()". Revisa que esté bien escrito.`,
  'sin-sobrecarga-aplicable': ({ clase, nombre, argumentos }) =>
    `Ningún "${nombre}(...)" de "${clase}" acepta los argumentos que le diste (${argumentos.join(', ')}). Revisa el tipo de cada uno.`,
  'conversion-con-perdida': ({ origen, destino }) =>
    `Estás guardando un valor de tipo "${origen}" en una variable "${destino}"; puedes perder información. Usa "(${destino})" si es a propósito.`,
  'tipos-incompatibles-en-asignacion': ({ origen, destino }) =>
    `No puedes guardar un valor de tipo "${origen}" en una variable "${destino}": son tipos incompatibles.`,
  'condicion-no-booleana': ({ tipo }) =>
    `La condición debe ser verdadera o falsa ("boolean"), no un valor de tipo "${tipo}". Prueba comparando con algo, por ejemplo "!= 0".`,
  'tipos-incomparables': ({ izquierda, derecha }) =>
    `No puedes comparar un valor de tipo "${izquierda}" con uno de tipo "${derecha}" usando "=="/"!=".`,
  'operandos-invalidos-operador-binario': ({ operador, izquierda, derecha }) =>
    `El operador "${operador}" no se puede usar entre un valor de tipo "${izquierda}" y uno de tipo "${derecha}".`,
  'selector-de-switch-invalido': ({ tipo }) => `El valor de un "switch" debe ser "int", "char" o "String", no "${tipo}".`,
  'etiqueta-de-case-no-constante': () => 'Cada "case" necesita un valor fijo (constante), no una variable ni un cálculo.',
  'etiqueta-de-case-duplicada': () => 'Ya existe un "case" con este mismo valor más arriba; cada valor solo puede aparecer una vez.',
  'break-fuera-de-contexto': () => '"break" solo tiene sentido dentro de un ciclo o un "switch".',
  'continue-fuera-de-contexto': () => '"continue" solo tiene sentido dentro de un ciclo.',
  'else-sin-if': () => 'Este "else" no tiene un "if" al cual pertenecer; revisa las llaves "{ }".',
  'cadena-sin-cerrar': () => 'Te faltó cerrar las comillas " de este texto.',
  'fin-de-archivo-inesperado': () => 'El archivo terminó y todavía falta cerrar una o más llaves "}".',
  'llave-de-cierre-sobrante': () =>
    'Sobra una llave de cierre "}": hay una de más después de que la clase ya había cerrado.',
  'llave-de-metodo-faltante': () => 'Falta abrir una llave "{" después de esto — probablemente la del método.',
  'paquete-despues-de-import': () => 'La línea "package" debe ir antes que cualquier "import".',
  'tipo-requiere-import': ({ nombre }) => `Falta la línea "import java.util.${nombre};" al principio del archivo.`,
  'sentencia-inalcanzable': () => 'Esta línea nunca se ejecuta.',
  'variable-posiblemente-no-asignada': ({ nombre }) =>
    `La variable "${nombre}" podría no tener un valor asignado en este punto. Asegúrate de que SIEMPRE reciba uno antes de usarla.`,
  'variable-final-reasignada': ({ nombre }) => `"${nombre}" es "final": su valor se fija una sola vez y no se puede cambiar.`,
};
