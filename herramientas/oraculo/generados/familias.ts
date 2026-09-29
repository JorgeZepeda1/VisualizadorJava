// Familias de discrepancias (tarea 1.31). Una discrepancia REDUCIDA es un programa mínimo; una FAMILIA
// agrupa los que fallan por lo mismo: el tipo de discrepancia, la clave de error de javac, lo que
// respondió nuestro compilador y las construcciones que quedaron en el programa mínimo. Es la unidad de
// trabajo de quien corrige el compilador (tarea 1.32): «falta la regla del cast», no «el programa 4 137».
// Puro: no lanza procesos ni toca el motor.
import { claveDeNuestroVeredicto, type TipoDeDiscrepancia, type VeredictoJavac, type VeredictoNuestro } from './clasificador.ts';
import { etiquetasDe, renderizarCuerpo, renderizarPrograma, type Etiqueta, type Programa } from './programa.ts';

/** Dónde rechaza javac el programa mínimo: al analizar la sintaxis, o después (tipos, símbolos, flujo). */
export type FaseDeJavac = 'sintaxis' | 'semantica' | 'javac-compila';

export interface DiscrepanciaReducida {
  /** Posición del programa original en la campaña (con la semilla se regenera). */
  readonly indice: number;
  readonly tipo: TipoDeDiscrepancia;
  /** Veredicto de javac sobre el programa MÍNIMO. */
  readonly javac: VeredictoJavac;
  /** Veredicto de nuestro compilador sobre el programa MÍNIMO. */
  readonly nuestro: VeredictoNuestro;
  readonly programa: Programa;
  readonly fase: FaseDeJavac;
}

export interface VarianteDeFamilia {
  readonly fuente: string;
  readonly cuerpo: readonly string[];
  readonly veces: number;
}

export interface Familia {
  readonly clave: string;
  readonly tipo: TipoDeDiscrepancia;
  readonly codigoJavac: string;
  /** El mensaje de javac del programa de ejemplo. */
  readonly mensajeJavac: string;
  readonly nuestraClave: string;
  readonly etiquetas: readonly Etiqueta[];
  readonly fase: FaseDeJavac;
  readonly cantidad: number;
  readonly minimo: { readonly fuente: string; readonly cuerpo: readonly string[] };
  /** Los índices más bajos de la campaña donde salió: `generarPrograma(semilla, indice)` regenera el original. */
  readonly indicesDeEjemplo: readonly number[];
  /** Los programas mínimos distintos, del que más salió al que menos. */
  readonly variantes: readonly VarianteDeFamilia[];
}

/**
 * Las etiquetas que identifican a la familia: las del programa mínimo sin las de CONTEXTO. Un `println`
 * alrededor de la expresión no es la regla que falla, y el nombre de una variable (`sealed`, `var`…) solo
 * es la regla en un falso rechazo (el analizador lo trata como palabra reservada); en un falso acepto es
 * incidental.
 */
function etiquetasDeLaFamilia(programa: Programa, tipo: TipoDeDiscrepancia): readonly Etiqueta[] {
  return etiquetasDe(programa).filter((etiqueta) => etiqueta !== 'impresion' && (etiqueta !== 'nombre-contextual' || tipo === 'falso-rechazo'));
}

const MAXIMO_DE_INDICES_DE_EJEMPLO = 5;
const MAXIMO_DE_VARIANTES = 12;

function claveDeFamilia(discrepancia: DiscrepanciaReducida, etiquetas: readonly Etiqueta[]): string {
  return [discrepancia.tipo, discrepancia.javac.codigoJavac || 'javac-compila', claveDeNuestroVeredicto(discrepancia.nuestro), etiquetas.join('+') || 'sin-rasgos'].join(' | ');
}

function agruparVariantes(miembros: readonly DiscrepanciaReducida[]): VarianteDeFamilia[] {
  const porFuente = new Map<string, { programa: Programa; veces: number }>();
  for (const { programa } of miembros) {
    const fuente = renderizarPrograma(programa);
    const previa = porFuente.get(fuente);
    porFuente.set(fuente, { programa, veces: (previa?.veces ?? 0) + 1 });
  }
  return [...porFuente.entries()]
    .map(([fuente, { programa, veces }]) => ({ fuente, cuerpo: renderizarCuerpo(programa), veces }))
    .sort((a, b) => b.veces - a.veces || a.fuente.length - b.fuente.length || (a.fuente < b.fuente ? -1 : 1))
    .slice(0, MAXIMO_DE_VARIANTES);
}

/** Agrupa las discrepancias reducidas en familias, de la más frecuente a la menos; el orden es determinista. */
export function agruparEnFamilias(discrepancias: readonly DiscrepanciaReducida[]): Familia[] {
  const grupos = new Map<string, { etiquetas: readonly Etiqueta[]; miembros: DiscrepanciaReducida[] }>();
  for (const discrepancia of discrepancias) {
    const etiquetas = etiquetasDeLaFamilia(discrepancia.programa, discrepancia.tipo);
    const clave = claveDeFamilia(discrepancia, etiquetas);
    const grupo = grupos.get(clave) ?? { etiquetas, miembros: [] };
    grupo.miembros.push(discrepancia);
    grupos.set(clave, grupo);
  }
  return [...grupos.entries()]
    .map(([clave, { etiquetas, miembros }]): Familia => {
      const ordenados = [...miembros].sort((a, b) => a.indice - b.indice);
      const ejemplo = [...miembros].sort((a, b) => renderizarPrograma(a.programa).length - renderizarPrograma(b.programa).length || a.indice - b.indice)[0]!;
      return {
        clave,
        tipo: ejemplo.tipo,
        codigoJavac: ejemplo.javac.codigoJavac,
        mensajeJavac: ejemplo.javac.mensajeJavac,
        nuestraClave: claveDeNuestroVeredicto(ejemplo.nuestro),
        etiquetas,
        fase: ejemplo.fase,
        cantidad: miembros.length,
        minimo: { fuente: renderizarPrograma(ejemplo.programa), cuerpo: renderizarCuerpo(ejemplo.programa) },
        indicesDeEjemplo: ordenados.slice(0, MAXIMO_DE_INDICES_DE_EJEMPLO).map((m) => m.indice),
        variantes: agruparVariantes(miembros),
      };
    })
    .sort((a, b) => b.cantidad - a.cantidad || (a.clave < b.clave ? -1 : 1));
}

// ---- Las familias conocidas de la re-verificación del lote 1 ----

export interface FamiliaConocida {
  readonly id: string;
  readonly nombre: string;
}

interface Reconocedor extends FamiliaConocida {
  readonly reconoce: (familia: Pick<Familia, 'tipo' | 'codigoJavac' | 'mensajeJavac' | 'etiquetas'>) => boolean;
}

const CLAVES_DE_SWITCH = new Set([
  'compiler.err.prob.found.req',
  'compiler.err.duplicate.default.label',
  'compiler.err.duplicate.case.label',
  'compiler.err.constant.label.not.compatible',
  'compiler.err.selector.type.not.allowed',
  'compiler.err.preview.feature.disabled.plural',
]);

// El orden importa: primero las que se distinguen por su clave de javac o por un rasgo propio, y al final
// las que comparten clave (`incompatible types`) con otras.
const RECONOCEDORES: readonly Reconocedor[] = [
  { id: 'F2', nombre: 'miembro de un primitivo (`int cannot be dereferenced`)', reconoce: (f) => f.tipo === 'falso-acepto' && f.codigoJavac === 'compiler.err.cant.deref' },
  { id: 'F3', nombre: '`final` con `++`, `--` o asignación', reconoce: (f) => f.tipo === 'falso-acepto' && f.codigoJavac === 'compiler.err.cant.assign.val.to.final.var' },
  { id: 'F5', nombre: '`void` usado como valor', reconoce: (f) => f.tipo === 'falso-acepto' && f.etiquetas.includes('void-como-valor') },
  { id: 'F6', nombre: 'método de instancia llamado por el nombre de la clase', reconoce: (f) => f.tipo === 'falso-acepto' && f.codigoJavac === 'compiler.err.non-static.cant.be.ref' },
  { id: 'F4', nombre: '`switch` con etiqueta de otro tipo o `default` repetido', reconoce: (f) => f.tipo === 'falso-acepto' && f.etiquetas.includes('switch') && CLAVES_DE_SWITCH.has(f.codigoJavac) },
  { id: 'F1', nombre: 'cast inválido (JLS 5.5)', reconoce: (f) => f.tipo === 'falso-acepto' && f.codigoJavac === 'compiler.err.prob.found.req' && f.etiquetas.includes('cast') },
  { id: 'V', nombre: '`var`/`yield` (y otras palabras clave contextuales) como nombre de variable', reconoce: (f) => f.tipo === 'falso-rechazo' && f.etiquetas.includes('nombre-contextual') },
];

/** La familia conocida (F1–F6, V) a la que pertenece esta familia, o `null` si es NUEVA. */
export function identificarFamiliaConocida(familia: Pick<Familia, 'tipo' | 'codigoJavac' | 'mensajeJavac' | 'etiquetas'>): FamiliaConocida | null {
  const reconocedor = RECONOCEDORES.find((r) => r.reconoce(familia));
  return reconocedor === undefined ? null : { id: reconocedor.id, nombre: reconocedor.nombre };
}
