// Plantillas de sentencias del generador diferencial (tarea 1.31). Cada plantilla es UNA idea de qué
// escribe un alumno de U3–U7 (declarar, asignar, castear, llamar un método, un `switch`, un ciclo…) y
// arma de una a tres sentencias con expresiones guiadas por tipos (`expresiones.ts`).
//
// Cada plantilla genera VÁLIDO POR CONSTRUCCIÓN y, cuando a la sentencia le toca (`debeViolar`, una vez
// por sentencia), le inyecta exactamente UNA falla de una lista cerrada. Así la mezcla de programas que
// javac acepta y rechaza queda cerca del 50/50 y las reglas de segundo nivel (validez de un cast,
// miembros de un primitivo, `final` con `++`, void como valor…) reciben casos de sobra. Las pocas
// plantillas que solo tienen sentido rotas (`void-como-valor`, `miembro-de-primitivo`…) pesan poco.
import {
  conAlcance,
  debeViolar,
  elegirNombreCorriente,
  elegirNombreNuevo,
  registrarVariable,
  variablesDeTipo,
  type Entorno,
  type ModoDeNombre,
  type Variable,
} from './entorno.ts';
import {
  asignacionComoValor,
  campoDeBiblioteca,
  castHacia,
  condicion,
  expresion,
  expresionDeCualquierTipo,
  expresionMalTipada,
  literalDe,
  llamada,
  llamadaDeApi,
  llamadaDeBibliotecaAlAzar,
  miembroDeReceptor,
  operadorBinario,
  operadorUnario,
  referenciaAVariable,
  tipoParaCast,
  voidComoValor,
} from './expresiones.ts';
import {
  bloque,
  declaracion,
  haz,
  literal,
  mientras,
  nombre,
  para,
  plantilla,
  salto,
  sentenciaExpr,
  seleccion,
  si,
  type Caso,
  type Etiqueta,
  type Expr,
  type Sentencia,
} from './programa.ts';
import { PLANTILLAS_FUERA_DEL_SUBCONJUNTO } from './plantillas-fuera-del-subconjunto.ts';
import {
  CAMPOS_SOBRE_PRIMITIVOS,
  CONSTANTES_PARA_ESTRECHAR,
  LITERALES_RAROS,
  METODOS_SOBRE_PRIMITIVOS,
  OPERADORES_ARITMETICOS,
  OPERADORES_DE_ASIGNACION_COMPUESTA,
  OPERADORES_DE_BITS,
  OPERADORES_DE_DESPLAZAMIENTO,
  OPERADORES_DE_IGUALDAD,
  OPERADORES_LOGICOS,
  OPERADORES_RELACIONALES,
  TIPOS_DE_DECLARACION,
  TIPOS_DE_VALOR,
  NOMBRES_DE_JAVASCRIPT,
  TIPOS_DEL_SUBCONJUNTO,
  VALORES_DE_TIPO_NO_MODELADO,
  type LiteralRaro,
} from './vocabulario.ts';

export interface PlantillaDeSentencia {
  readonly nombre: string;
  readonly peso: number;
  readonly generar: (entorno: Entorno) => Sentencia[];
}

const TIPOS_QUE_SE_DECLARAN_TAL_CUAL = new Set<string>(TIPOS_DE_DECLARACION);
const NUMERICOS: readonly string[] = ['int', 'long', 'double', 'char'];

// ---- Piezas comunes ----

/** La variable de ese tipo, o una nueva (su declaración se agrega a `previas`). */
function asegurarVariable(entorno: Entorno, tipo: string, previas: Sentencia[]): Variable {
  const existentes = variablesDeTipo(entorno, tipo);
  if (existentes.length > 0) return entorno.azar.elegir(existentes);
  const nuevoNombre = elegirNombreCorriente(entorno);
  const variable: Variable = { nombre: nuevoNombre, tipo, esFinal: false, etiquetas: [] };
  previas.push(declaracion({ tipo, nombre: nuevoNombre, inicial: expresion(entorno, tipo, 0) }));
  registrarVariable(entorno, variable);
  return variable;
}

/** Una variable NUEVA (nunca final) del tipo pedido; su declaración se agrega a `previas`. */
function variableNueva(entorno: Entorno, tipo: string, previas: Sentencia[]): Variable {
  const nuevoNombre = elegirNombreCorriente(entorno);
  const variable: Variable = { nombre: nuevoNombre, tipo, esFinal: false, etiquetas: [] };
  previas.push(declaracion({ tipo, nombre: nuevoNombre, inicial: expresion(entorno, tipo, 0) }));
  registrarVariable(entorno, variable);
  return variable;
}

/** ¿Es una expresión que Java admite como sentencia (llamada, asignación, ++/--, `new`)? */
function puedeSerSentencia(expr: Expr): boolean {
  const etiquetas = expr.etiquetas ?? [];
  if (etiquetas.includes('miembro-de-primitivo')) return expr.partes.join('').includes('(');
  return (
    etiquetas.some((e) => e === 'llamada-de-biblioteca' || e === 'asignacion' || e === 'asignacion-compuesta' || e === 'incremento' || e === 'impresion') ||
    expr.partes[0]!.startsWith('new ')
  );
}

function imprimir(expr: Expr, metodo: 'println' | 'print' = 'println'): Expr {
  return llamada(null, `System.out.${metodo}`, [expr], 'void', { etiquetas: ['impresion'] });
}

function declararConNombre(entorno: Entorno, tipo: string, inicial: Expr | null, opciones: { readonly esFinal?: boolean; readonly modoDeNombre?: ModoDeNombre } = {}): Sentencia {
  const esFinal = opciones.esFinal ?? false;
  const elegido = elegirNombreNuevo(entorno, opciones.modoDeNombre ?? 'valido');
  const tipoEfectivo = tipo === 'var' ? (inicial?.tipo ?? 'desconocido') : tipo;
  if (!elegido.sintaxisInvalida) {
    registrarVariable(entorno, { nombre: elegido.nombre, tipo: tipoEfectivo, esFinal, etiquetas: elegido.etiquetas });
  }
  return declaracion({ tipo, nombre: elegido.nombre, inicial, esFinal, sintaxisInvalida: elegido.sintaxisInvalida, etiquetas: elegido.etiquetas });
}

/**
 * Pone `expr` en una sentencia: como inicial de una declaración (del tipo de la expresión, o de otro si
 * `violar`), como argumento de println o suelta.
 */
function comoSentencia(entorno: Entorno, expr: Expr, violar = false): Sentencia[] {
  const { azar } = entorno;
  const forma = azar.ponderado<'declaracion' | 'impresion' | 'directa'>([[42, 'declaracion'], [33, 'impresion'], [puedeSerSentencia(expr) ? 25 : 0, 'directa']]);
  if (forma === 'directa') return [sentenciaExpr(expr)];
  if (forma === 'impresion') return [sentenciaExpr(imprimir(expr))];
  const tipoDeclarado = TIPOS_QUE_SE_DECLARAN_TAL_CUAL.has(expr.tipo) ? expr.tipo : 'var';
  const declarado = violar ? azar.elegir(TIPOS_DE_VALOR.filter((t) => t !== expr.tipo)) : tipoDeclarado;
  return [declararConNombre(entorno, declarado, expr)];
}

// ---- Declaraciones ----

function declaracionAlAzar(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const violar = debeViolar(entorno);
  const tipo = azar.ponderado<string>([
    [22, 'int'], [13, 'double'], [16, 'String'], [11, 'boolean'], [8, 'char'], [8, 'long'], [6, 'Scanner'], [5, 'Random'],
    [2.5, 'Integer'], [2.5, 'Double'], [2, 'Character'], [2, 'Long'], [1.5, 'Boolean'], [2, 'Object'],
    [0.8, 'float'], [0.8, 'byte'], [0.8, 'short'], [2, 'var'],
  ]);
  const esFinal = azar.probabilidad(0.22);
  const falla = violar ? azar.ponderado<'mal-tipada' | 'reservada' | 'repetido' | 'void' | 'var-sin-valor'>([[46, 'mal-tipada'], [22, 'reservada'], [14, 'repetido'], [9, 'void'], [9, 'var-sin-valor']]) : null;

  if (falla === 'reservada') return [declararConNombre(entorno, tipo === 'var' ? 'int' : tipo, expresion(entorno, tipo === 'var' ? 'int' : tipo, 0), { esFinal, modoDeNombre: 'reservada' })];
  const modoDeNombre: ModoDeNombre = falla === 'repetido' ? 'repetido' : 'valido';
  if (tipo === 'var') {
    const inicial = falla === 'var-sin-valor' ? null : falla === 'void' ? voidComoValor(entorno, 0) : expresionDeCualquierTipo(entorno, 1);
    return [declararConNombre(entorno, 'var', inicial, { esFinal, modoDeNombre })];
  }
  if (falla === 'void') return [declararConNombre(entorno, tipo, voidComoValor(entorno, 0), { esFinal, modoDeNombre })];
  const inicial = falla === 'mal-tipada' ? expresionMalTipada(entorno, tipo, 1) : azar.probabilidad(0.06) ? null : expresion(entorno, tipo, 1);
  return [declararConNombre(entorno, tipo, inicial, { esFinal, modoDeNombre })];
}

// ---- Asignaciones, incremento y decremento ----

function asignacionAlAzar(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const previas: Sentencia[] = [];
  const modificables = entorno.variables.filter((v) => !v.esFinal);
  const finales = entorno.variables.filter((v) => v.esFinal);
  // Con una constante `final` a la mano, a veces se la intenta modificar aunque a la sentencia no le tocara
  // una falla: el `final` con `++`, `--`, `=` y `+=` es de las reglas que más cuesta ver en un programa.
  const violar = debeViolar(entorno) || (finales.length > 0 && azar.probabilidad(0.12));

  const falla = violar
    ? azar.ponderado<'sobre-final' | 'incremento-no-numerico' | 'mal-tipada' | 'compuesta-mala' | 'no-variable' | 'campo-de-biblioteca'>([
        [finales.length > 0 ? 38 : 0, 'sobre-final'],
        [10, 'campo-de-biblioteca'],
        [modificables.some((v) => !NUMERICOS.includes(v.tipo)) ? 22 : 0, 'incremento-no-numerico'],
        [modificables.length > 0 ? 22 : 0, 'mal-tipada'],
        [modificables.length > 0 ? 10 : 0, 'compuesta-mala'],
        [8, 'no-variable'],
      ])
    : null;

  if (falla === 'sobre-final') {
    const objetivo = referenciaAVariable(azar.elegir(finales));
    const forma = azar.ponderado<'incremento' | 'simple' | 'compuesta'>([[45, 'incremento'], [30, 'simple'], [25, 'compuesta']]);
    if (forma === 'incremento') return [sentenciaExpr(plantilla(azar.elegir([['', '++'], ['', '--'], ['++', ''], ['--', '']] as const), [objetivo], objetivo.tipo, { etiquetas: ['incremento'] }))];
    if (forma === 'simple') return [sentenciaExpr(plantilla(['', ' = ', ''], [objetivo, expresion(entorno, objetivo.tipo, 1)], objetivo.tipo, { etiquetas: ['asignacion'] }))];
    return [sentenciaExpr(plantilla(['', ' += ', ''], [objetivo, expresion(entorno, objetivo.tipo, 1)], objetivo.tipo, { etiquetas: ['asignacion-compuesta'] }))];
  }
  if (falla === 'campo-de-biblioteca') {
    // `Math.PI = 3;`, `Integer.MAX_VALUE++;`: los campos de biblioteca son constantes.
    const campo = campoDeBiblioteca(entorno, null, 1);
    if (campo !== null) {
      const forma = azar.ponderado<'incremento' | 'simple' | 'compuesta'>([[36, 'incremento'], [40, 'simple'], [24, 'compuesta']]);
      if (forma === 'incremento') return [sentenciaExpr(plantilla(azar.elegir([['', '++'], ['', '--'], ['++', ''], ['--', '']] as const), [campo], campo.tipo, { etiquetas: ['incremento'] }))];
      if (forma === 'simple') return [sentenciaExpr(plantilla(['', ' = ', ''], [campo, expresion(entorno, campo.tipo, 0)], campo.tipo, { etiquetas: ['asignacion'] }))];
      return [sentenciaExpr(plantilla(['', ' += ', ''], [campo, expresion(entorno, campo.tipo, 0)], campo.tipo, { etiquetas: ['asignacion-compuesta'] }))];
    }
  }
  if (falla === 'no-variable') {
    const base = referenciaAVariable(asegurarVariable(entorno, 'int', previas));
    const izquierdo = azar.elegir<Expr>([
      literal('5', 'int'),
      literal('"a"', 'String'),
      operadorBinario('+', base, literal('1', 'int'), 'int'),
      llamada(base, 'length', [], 'int'),
      plantilla(['', '++'], [base], 'int', { etiquetas: ['incremento'] }),
    ]);
    return [...previas, sentenciaExpr(plantilla(['', ' = ', ''], [izquierdo, literalDe(entorno, 'int')], 'int', { etiquetas: ['asignacion'] }))];
  }
  if (falla === 'incremento-no-numerico') {
    const objetivo = referenciaAVariable(azar.elegir(modificables.filter((v) => !NUMERICOS.includes(v.tipo))));
    return [sentenciaExpr(plantilla(azar.elegir([['', '++'], ['', '--'], ['++', ''], ['--', '']] as const), [objetivo], objetivo.tipo, { etiquetas: ['incremento'] }))];
  }
  if (falla === 'mal-tipada') {
    const objetivo = referenciaAVariable(azar.elegir(modificables));
    return [sentenciaExpr(plantilla(['', ' = ', ''], [objetivo, expresionMalTipada(entorno, objetivo.tipo, 1)], objetivo.tipo, { etiquetas: ['asignacion'] }))];
  }
  if (falla === 'compuesta-mala') {
    const objetivo = referenciaAVariable(azar.elegir(modificables));
    const operador = azar.elegir(OPERADORES_DE_ASIGNACION_COMPUESTA);
    return [sentenciaExpr(plantilla(['', ` ${operador} `, ''], [objetivo, expresionMalTipada(entorno, objetivo.tipo, 1)], objetivo.tipo, { etiquetas: ['asignacion-compuesta'] }))];
  }

  // Válido: sobre una variable modificable, con la forma que su tipo admite.
  if (modificables.length === 0) variableNueva(entorno, azar.elegir(['int', 'double', 'String']), previas);
  const disponibles = entorno.variables.filter((v) => !v.esFinal);
  const numericasDisponibles = disponibles.filter((v) => NUMERICOS.includes(v.tipo));
  const cadenasDisponibles = disponibles.filter((v) => v.tipo === 'String');
  const forma = azar.ponderado<'incremento' | 'compuesta' | 'simple' | 'concatenar'>([
    [numericasDisponibles.length > 0 ? 42 : 0, 'incremento'],
    [numericasDisponibles.length > 0 ? 22 : 0, 'compuesta'],
    [36, 'simple'],
    [cadenasDisponibles.length > 0 ? 8 : 0, 'concatenar'],
  ]);
  if (forma === 'incremento') {
    const objetivo = referenciaAVariable(azar.elegir(numericasDisponibles));
    return [...previas, sentenciaExpr(plantilla(azar.elegir([['', '++'], ['', '--'], ['++', ''], ['--', '']] as const), [objetivo], objetivo.tipo, { etiquetas: ['incremento'] }))];
  }
  if (forma === 'compuesta') {
    const objetivo = referenciaAVariable(azar.elegir(numericasDisponibles));
    const operador = azar.elegir(OPERADORES_ARITMETICOS.map((o) => `${o}=`));
    return [...previas, sentenciaExpr(plantilla(['', ` ${operador} `, ''], [objetivo, expresion(entorno, objetivo.tipo === 'char' ? 'int' : objetivo.tipo, 1)], objetivo.tipo, { etiquetas: ['asignacion-compuesta'] }))];
  }
  if (forma === 'concatenar') {
    const objetivo = referenciaAVariable(azar.elegir(cadenasDisponibles));
    return [...previas, sentenciaExpr(plantilla(['', ' += ', ''], [objetivo, expresionDeCualquierTipo(entorno, 1)], 'String', { etiquetas: ['asignacion-compuesta'] }))];
  }
  const objetivo = referenciaAVariable(azar.elegir(disponibles));
  return [...previas, sentenciaExpr(plantilla(['', ' = ', ''], [objetivo, expresion(entorno, objetivo.tipo, 1)], objetivo.tipo, { etiquetas: ['asignacion'] }))];
}

// ---- Operadores entre tipos mezclados ----

type FamiliaDeOperador = 'aritmetico' | 'relacional' | 'igualdad' | 'logico' | 'bits' | 'desplazamiento';

const OPERADORES_POR_FAMILIA: Readonly<Record<FamiliaDeOperador, readonly string[]>> = {
  aritmetico: OPERADORES_ARITMETICOS,
  relacional: OPERADORES_RELACIONALES,
  igualdad: OPERADORES_DE_IGUALDAD,
  logico: OPERADORES_LOGICOS,
  bits: OPERADORES_DE_BITS,
  desplazamiento: OPERADORES_DE_DESPLAZAMIENTO,
};

function tipoDelResultado(operador: string, izquierdo: string, derecho: string): string {
  if (OPERADORES_RELACIONALES.includes(operador as never) || OPERADORES_DE_IGUALDAD.includes(operador as never) || OPERADORES_LOGICOS.includes(operador as never)) return 'boolean';
  if (operador === '+' && (izquierdo === 'String' || derecho === 'String')) return 'String';
  if (izquierdo === 'boolean' && derecho === 'boolean') return 'boolean';
  if (!NUMERICOS.includes(izquierdo) || !NUMERICOS.includes(derecho)) return 'desconocido';
  if (izquierdo === 'double' || derecho === 'double') return 'double';
  if (izquierdo === 'long' || derecho === 'long') return 'long';
  return 'int';
}

/** Los tipos de los dos operandos que Java acepta para esa familia de operadores. */
function operandosValidos(entorno: Entorno, familia: FamiliaDeOperador): readonly [string, string] {
  const { azar } = entorno;
  switch (familia) {
    case 'aritmetico':
    case 'relacional':
      return [azar.elegir(NUMERICOS), azar.elegir(NUMERICOS)];
    case 'igualdad': {
      const tipo = azar.elegir(['int', 'int', 'char', 'boolean', 'String', 'double', 'long']);
      return [tipo, tipo];
    }
    case 'logico':
      return ['boolean', 'boolean'];
    case 'bits':
      return azar.elegir<readonly [string, string]>([['int', 'int'], ['long', 'long'], ['boolean', 'boolean'], ['int', 'long']]);
    case 'desplazamiento':
      return [azar.elegir(['int', 'long']), 'int'];
  }
}

/** `!x`, `-x`, `+x`, `~x`: casi siempre sobre un tipo que admite el operador; a veces sobre cualquiera (`!5`, `-true`, `~1.5`). */
function operadorUnarioAlAzar(entorno: Entorno, violar: boolean): Expr {
  const { azar } = entorno;
  const operador = azar.elegir(['!', '-', '+', '~']);
  const tipoQueAdmite = operador === '!' ? 'boolean' : operador === '~' ? azar.elegir(['int', 'long', 'char']) : azar.elegir(NUMERICOS);
  const tipoDelOperando = violar ? azar.elegir([...TIPOS_DE_VALOR, 'Scanner', 'Random']) : tipoQueAdmite;
  const resultado = operador === '!' ? 'boolean' : tipoDelOperando === 'char' ? 'int' : tipoDelOperando;
  return operadorUnario(operador, expresion(entorno, tipoDelOperando, 1), resultado);
}

function operadoresMezclados(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const violar = debeViolar(entorno);
  if (azar.probabilidad(0.17)) {
    // Esta forma ES el ejercicio de las reglas de los operadores unarios: a veces prueba un tipo cualquiera.
    const unario = operadorUnarioAlAzar(entorno, violar || azar.probabilidad(0.4));
    if (azar.probabilidad(0.35)) return [sentenciaExpr(imprimir(unario))];
    return [declararConNombre(entorno, TIPOS_QUE_SE_DECLARAN_TAL_CUAL.has(unario.tipo) ? unario.tipo : 'var', unario)];
  }
  const familia = azar.ponderado<FamiliaDeOperador>([[38, 'aritmetico'], [16, 'relacional'], [14, 'igualdad'], [16, 'logico'], [8, 'bits'], [8, 'desplazamiento']]);
  const operador = azar.elegir(OPERADORES_POR_FAMILIA[familia]);
  // Un `+` con un String concatena: la mezcla más común y válida del currículo.
  const concatena = familia === 'aritmetico' && operador === '+' && !violar && azar.probabilidad(0.3);
  const [tipoIzquierdo, tipoDerecho] = concatena
    ? azar.elegir<readonly [string, string]>([['String', azar.elegir(TIPOS_DE_VALOR)], [azar.elegir(TIPOS_DE_VALOR), 'String']])
    : violar
      ? [azar.elegir([...TIPOS_DE_VALOR, 'Scanner', 'Random']), azar.elegir([...TIPOS_DE_VALOR, 'Scanner', 'Random'])]
      : operandosValidos(entorno, familia);
  const operacion = operadorBinario(operador, expresion(entorno, tipoIzquierdo, 1), expresion(entorno, tipoDerecho, 1), tipoDelResultado(operador, tipoIzquierdo, tipoDerecho));
  if (azar.probabilidad(0.35)) return [sentenciaExpr(imprimir(operacion))];
  const tipoDeclarado = TIPOS_QUE_SE_DECLARAN_TAL_CUAL.has(operacion.tipo) ? operacion.tipo : 'var';
  return [declararConNombre(entorno, tipoDeclarado, operacion)];
}

// ---- Casts entre todos los pares de tipos ----

const TODOS_LOS_TIPOS_DE_CAST: readonly string[] = [...TIPOS_DE_VALOR, 'Scanner', 'Random'];

/** Un par (origen, destino) que Java permite: numérico↔numérico, un tipo consigo mismo, o cualquiera hacia Object. */
function parValidoDeCast(entorno: Entorno): { readonly origen: string; readonly destino: string } {
  const { azar } = entorno;
  const forma = azar.ponderado<'numerico' | 'identidad' | 'a-objeto' | 'a-envoltorio' | 'a-estrecho'>([[46, 'numerico'], [30, 'identidad'], [6, 'a-objeto'], [8, 'a-envoltorio'], [10, 'a-estrecho']]);
  if (forma === 'numerico') return { origen: azar.elegir(NUMERICOS), destino: azar.elegir(NUMERICOS) };
  if (forma === 'identidad') {
    const mismo = azar.elegir(TODOS_LOS_TIPOS_DE_CAST);
    return { origen: mismo, destino: mismo };
  }
  if (forma === 'a-objeto') return { origen: azar.elegir(TODOS_LOS_TIPOS_DE_CAST), destino: 'Object' };
  if (forma === 'a-envoltorio') {
    const par = azar.elegir([['int', 'Integer'], ['double', 'Double'], ['char', 'Character'], ['long', 'Long'], ['boolean', 'Boolean']] as const);
    return { origen: par[0], destino: par[1] };
  }
  return { origen: azar.elegir(NUMERICOS), destino: azar.elegir(['byte', 'short', 'float']) };
}

/** Los 64 pares (origen, destino) de los 8 tipos del subconjunto, en un orden fijo. */
export const PARES_DE_CAST_DEL_SUBCONJUNTO: readonly { readonly origen: string; readonly destino: string }[] = TIPOS_DEL_SUBCONJUNTO.flatMap((origen) =>
  TIPOS_DEL_SUBCONJUNTO.map((destino) => ({ origen, destino })),
);

/** `destino x = (destino) <valor de tipo origen>;` en la forma que toque (declaración, impresión, operando, anidado). */
export function castConPar(entorno: Entorno, origen: string, destino: string): Sentencia[] {
  const { azar } = entorno;
  const cast = castHacia(destino, expresion(entorno, origen, 0));
  const forma = azar.ponderado<'declaracion' | 'impresion' | 'operando' | 'anidado'>([[62, 'declaracion'], [16, 'impresion'], [14, 'operando'], [8, 'anidado']]);
  if (forma === 'impresion') return [sentenciaExpr(imprimir(cast))];
  if (forma === 'operando' && NUMERICOS.includes(destino)) {
    const operacion = operadorBinario(azar.elegir(OPERADORES_ARITMETICOS), cast, expresion(entorno, azar.elegir(['int', 'double', 'char']), 0), destino === 'char' ? 'int' : destino);
    return [declararConNombre(entorno, TIPOS_QUE_SE_DECLARAN_TAL_CUAL.has(operacion.tipo) ? operacion.tipo : 'var', operacion)];
  }
  if (forma === 'anidado') return [declararConNombre(entorno, destino, castHacia(destino, castHacia(destino, expresion(entorno, origen, 0))))];
  return [declararConNombre(entorno, TIPOS_QUE_SE_DECLARAN_TAL_CUAL.has(destino) ? destino : 'var', cast)];
}

function castAlAzar(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  // Los 64 pares de tipos del subconjunto salen SIEMPRE por estratificación (`generador.ts`); aquí, al
  // azar: casi siempre un par que Java permite, a veces uno cualquiera (y hacia los tipos de alrededor).
  const violar = debeViolar(entorno) || azar.probabilidad(0.22);
  const { origen, destino } = violar
    ? { origen: azar.elegir(TODOS_LOS_TIPOS_DE_CAST), destino: azar.probabilidad(0.75) ? azar.elegir(TODOS_LOS_TIPOS_DE_CAST) : tipoParaCast(entorno) }
    : parValidoDeCast(entorno);
  return castConPar(entorno, origen, destino);
}

// ---- Un final y su modificación ----

/**
 * `final T x = …;` y, justo después, algo que lo modifica (`x++`, `--x`, `x = …`, `x += …`): la regla F3 de
 * la re-verificación del lote 1. Va en su propia plantilla porque en un programa con otras construcciones
 * (un método de biblioteca fuera del subconjunto, otro error antes) el compilador puede no llegar a
 * revisarla, y entonces nunca se ve.
 */
function finalModificada(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const tipo = azar.ponderado<string>([[40, 'int'], [10, 'long'], [12, 'double'], [8, 'char'], [16, 'String'], [10, 'boolean']]);
  const nuevoNombre = elegirNombreCorriente(entorno);
  registrarVariable(entorno, { nombre: nuevoNombre, tipo, esFinal: true, etiquetas: [] });
  const constante = declaracion({ tipo, nombre: nuevoNombre, inicial: literalDe(entorno, tipo), esFinal: true });
  const objetivo = nombre(nuevoNombre, tipo, { primaria: true });
  const forma = azar.ponderado<'incremento' | 'simple' | 'compuesta'>([[40, 'incremento'], [32, 'simple'], [28, 'compuesta']]);
  if (forma === 'incremento') return [constante, sentenciaExpr(plantilla(azar.elegir([['', '++'], ['', '--'], ['++', ''], ['--', '']] as const), [objetivo], tipo, { etiquetas: ['incremento'] }))];
  if (forma === 'simple') return [constante, sentenciaExpr(plantilla(['', ' = ', ''], [objetivo, expresion(entorno, tipo, 0)], tipo, { etiquetas: ['asignacion'] }))];
  return [constante, sentenciaExpr(plantilla(['', ' += ', ''], [objetivo, expresion(entorno, tipo === 'boolean' ? 'boolean' : tipo === 'String' ? 'String' : 'int', 0)], tipo, { etiquetas: ['asignacion-compuesta'] }))];
}

// ---- Estrechamiento de constantes (JLS 5.2) ----

/**
 * Asignar un entero a `char`, `byte` o `short`: válido solo si es una expresión CONSTANTE que cabe en el
 * tipo (`char c = 65;`, `final int K = 100; byte b = K;`), inválido si no cabe o no es constante
 * (`byte b = 200;`, `int k = 100; byte b = k;`, `char c = 'a' + k;`). También las asignaciones compuestas,
 * que estrechan solas (`c += 1` sí, `c = c + 1` no), y las conversiones entre numéricos.
 */
function estrechamientoDeConstantes(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const destino = azar.ponderado<string>([[60, 'char'], [20, 'byte'], [20, 'short']]);
  const constante = (): Expr => literal(azar.elegir(CONSTANTES_PARA_ESTRECHAR), 'int');
  const forma = azar.ponderado<'literal' | 'constante-final' | 'variable-no-final' | 'expresion-constante' | 'compuesta' | 'entre-numericos'>([
    [30, 'literal'], [22, 'constante-final'], [14, 'variable-no-final'], [12, 'expresion-constante'], [12, 'compuesta'], [10, 'entre-numericos'],
  ]);
  if (forma === 'literal') return [declararConNombre(entorno, destino, constante())];
  if (forma === 'constante-final' || forma === 'variable-no-final') {
    const nuevoNombre = elegirNombreCorriente(entorno);
    const esFinal = forma === 'constante-final';
    registrarVariable(entorno, { nombre: nuevoNombre, tipo: 'int', esFinal, etiquetas: [] });
    return [
      declaracion({ tipo: 'int', nombre: nuevoNombre, inicial: constante(), esFinal }),
      declararConNombre(entorno, destino, nombre(nuevoNombre, 'int', { primaria: true })),
    ];
  }
  if (forma === 'expresion-constante') {
    const previas: Sentencia[] = [];
    const usaVariable = azar.probabilidad(0.4);
    const izquierdo = destino === 'char' ? literal("'a'", 'char') : literal(azar.elegir(['10', '100', '5']), 'int');
    const derecho = usaVariable ? referenciaAVariable(variableNueva(entorno, 'int', previas)) : literal(azar.elegir(['1', '2', '10']), 'int');
    return [...previas, declararConNombre(entorno, destino, operadorBinario(azar.elegir(['+', '-', '*']), izquierdo, derecho, 'int'))];
  }
  if (forma === 'compuesta') {
    const inicial = destino === 'char' ? literal("'a'", 'char') : literal(azar.elegir(['1', '10']), 'int');
    const declarada = declararConNombre(entorno, destino, inicial);
    const variable = entorno.variables[entorno.variables.length - 1]!;
    const referencia = nombre(variable.nombre, destino, { primaria: true });
    const modificacion = azar.ponderado<'compuesta' | 'simple' | 'incremento'>([[45, 'compuesta'], [35, 'simple'], [20, 'incremento']]);
    if (modificacion === 'incremento') return [declarada, sentenciaExpr(plantilla(['', '++'], [referencia], destino, { etiquetas: ['incremento'] }))];
    if (modificacion === 'compuesta') return [declarada, sentenciaExpr(plantilla(['', ' += ', ''], [referencia, literal(azar.elegir(['1', '200', '100000']), 'int')], destino, { etiquetas: ['asignacion-compuesta'] }))];
    return [declarada, sentenciaExpr(plantilla(['', ' = ', ''], [referencia, operadorBinario('+', referencia, literal('1', 'int'), 'int')], destino, { etiquetas: ['asignacion'] }))];
  }
  // Entre numéricos: `long l = 5;` sí, `int i = 5L;` no, `float f = 1;` sí, `float f = 1.5;` no.
  const tipoDelDestino = azar.elegir(['int', 'long', 'double', 'float', 'char']);
  const tipoDelValor = azar.elegir(['int', 'long', 'double', 'float', 'char']);
  return [declararConNombre(entorno, tipoDelDestino, literalDe(entorno, tipoDelValor))];
}

// ---- Tipos envoltorio usados como primitivos y al revés ----

const PARES_PRIMITIVO_ENVOLTORIO: readonly (readonly [string, string])[] = [['int', 'Integer'], ['double', 'Double'], ['char', 'Character'], ['long', 'Long'], ['boolean', 'Boolean']];

/**
 * Empaquetado y desempaquetado (JLS 5.1.7, 5.1.8): `Integer k = 5; int y = k;` (válido), `int n = 5; Integer k = n;`
 * (válido), `Integer k = 5; boolean b = k;` (no), `int n = 5; Long l = n;` (no: un `int` no se empaqueta como `Long`),
 * `Integer a = 1; int r = a + 1;`. El compilador no tipa los envoltorios como los primitivos, y ahí es donde
 * acepta de más.
 */
function envolturaYUso(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const violar = debeViolar(entorno);
  const [primitivo, envoltorio] = azar.elegir(PARES_PRIMITIVO_ENVOLTORIO);
  const forma = azar.ponderado<'desempaquetar' | 'empaquetar' | 'operar'>([[42, 'desempaquetar'], [36, 'empaquetar'], [22, 'operar']]);
  const otrosPrimitivos = PARES_PRIMITIVO_ENVOLTORIO.filter(([p]) => p !== primitivo).map(([p]) => p);

  if (forma === 'empaquetar') {
    const primero = declararConNombre(entorno, primitivo, literalDe(entorno, primitivo));
    const variable = entorno.variables[entorno.variables.length - 1]!;
    const destino = violar ? azar.elegir(PARES_PRIMITIVO_ENVOLTORIO.filter(([, e]) => e !== envoltorio))[1] : envoltorio;
    return [primero, declararConNombre(entorno, destino, referenciaAVariable(variable))];
  }
  const primero = declararConNombre(entorno, envoltorio, literalDe(entorno, envoltorio));
  const variable = entorno.variables[entorno.variables.length - 1]!;
  const referencia = referenciaAVariable(variable);
  if (forma === 'desempaquetar') {
    return [primero, declararConNombre(entorno, violar ? azar.elegir(otrosPrimitivos) : primitivo, referencia)];
  }
  // Operar con un envoltorio: `a + 1`, `!b`.
  const operacion = primitivo === 'boolean' ? operadorUnario('!', referencia, 'boolean') : operadorBinario('+', referencia, literal(primitivo === 'double' ? '1.5' : '1', primitivo === 'double' ? 'double' : 'int'), primitivo === 'char' ? 'int' : primitivo);
  return [primero, declararConNombre(entorno, violar ? azar.elegir(otrosPrimitivos) : operacion.tipo === 'int' && primitivo === 'char' ? 'int' : operacion.tipo, operacion)];
}

// ---- Literales raros ----

/** `T x = <literal>;` con ESA forma de literal poco corriente (tipo y rasgos incluidos). */
function declaracionConLiteralRaro(entorno: Entorno, elegido: LiteralRaro): Sentencia[] {
  const valor = literal(elegido.texto, elegido.tipo, { ...(elegido.valido ? {} : { sintaxisInvalida: true }), ...(elegido.rasgos.length === 0 ? {} : { etiquetas: elegido.rasgos }) });
  return [declararConNombre(entorno, elegido.tipo, valor)];
}

/** `T x = <literal>;` con una forma de literal poco corriente, al azar: válida (`0x1F`, `1_000`, `'\\u0041'`) o no (`1_`, `09`, `'ab'`). */
function literalRaro(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  return declaracionConLiteralRaro(entorno, azar.elegir(azar.probabilidad(0.72) ? LITERALES_RAROS.filter((l) => l.valido) : LITERALES_RAROS.filter((l) => !l.valido)));
}

/**
 * Tarea 1.34: la forma de literal número `k` de `LITERALES_RAROS` (módulo su cantidad), SIN azar. `generador.ts` la pone en uno de cada dieciséis
 * programas recorriendo la lista en orden, como hace con los 64 pares de cast: cada forma sale cada 976 programas con cualquier semilla. Antes
 * dependía del sorteo y una forma (`1_.0`) podía faltar en una muestra de 4 000 programas apenas se tocaba el reparto de las plantillas.
 */
export function literalRaroNumero(entorno: Entorno, k: number): Sentencia[] {
  return declaracionConLiteralRaro(entorno, LITERALES_RAROS[k % LITERALES_RAROS.length]!);
}

// ---- Miembros y llamadas sobre primitivos ----

function miembroDePrimitivo(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const previas: Sentencia[] = [];
  const tipo = azar.ponderado<string>([[26, 'int'], [16, 'double'], [14, 'boolean'], [14, 'char'], [14, 'long'], [10, 'String']]);
  const receptor = azar.probabilidad(0.75) ? referenciaAVariable(asegurarVariable(entorno, tipo, previas)) : expresion(entorno, tipo, 0);
  const esLlamada = azar.probabilidad(0.62);
  if (esLlamada) {
    const miembro = azar.elegir(METODOS_SOBRE_PRIMITIVOS);
    const llamadaAlMiembro = miembroDeReceptor(receptor, miembro.texto, true, miembro.retorno);
    if (azar.probabilidad(0.08)) {
      // `x.length() = 3;`: una llamada no es una variable.
      return [...previas, sentenciaExpr(plantilla(['', ' = ', ''], [llamadaAlMiembro, literalDe(entorno, 'int')], 'int', { etiquetas: ['asignacion'] }))];
    }
    return [...previas, ...comoSentencia(entorno, llamadaAlMiembro)];
  }
  const campo = azar.elegir(CAMPOS_SOBRE_PRIMITIVOS);
  const acceso = miembroDeReceptor(receptor, campo.texto, false, campo.tipo);
  if (azar.probabilidad(0.2)) {
    return [...previas, sentenciaExpr(plantilla(['', ' = ', ''], [acceso, literalDe(entorno, 'int')], 'int', { etiquetas: ['asignacion'] }))];
  }
  return [...previas, ...comoSentencia(entorno, acceso)];
}

// ---- Métodos y campos de la biblioteca ----

function llamadaDeBiblioteca(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  if (azar.probabilidad(0.1)) {
    const campo = campoDeBiblioteca(entorno, null, 1);
    if (campo !== null) return comoSentencia(entorno, campo);
  }
  // `llamadaDeBibliotecaAlAzar` decide su propia violación (receptor o argumentos), una vez por sentencia.
  const call = llamadaDeBibliotecaAlAzar(entorno, 1);
  // Una llamada void solo puede ir suelta; usarla como valor es la plantilla `voidComoValor`.
  if (call.tipo === 'void') return [sentenciaExpr(call)];
  return comoSentencia(entorno, call, debeViolar(entorno));
}

// ---- Llamadas void en posición de valor ----

function voidEnPosicionDeValor(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const previas: Sentencia[] = [];
  const posicion = azar.ponderado<string>([
    [22, 'argumento-de-println'], [10, 'argumento-de-biblioteca'], [22, 'inicializador'], [10, 'operando'],
    [8, 'condicion'], [8, 'cast'], [8, 'asignacion'], [6, 'operando-unario'], [6, 'selector'],
  ]);
  const valorVoid = voidComoValor(entorno, 0);
  switch (posicion) {
    case 'argumento-de-println':
      return [sentenciaExpr(imprimir(valorVoid, azar.probabilidad(0.75) ? 'println' : 'print'))];
    case 'argumento-de-biblioteca': {
      const receptorMath = llamada(null, azar.elegir(['Math.abs', 'Math.sqrt', 'Integer.parseInt', 'String.valueOf', 'Character.isDigit']), [valorVoid], 'int', { etiquetas: ['llamada-de-biblioteca'] });
      return comoSentencia(entorno, receptorMath);
    }
    case 'inicializador': {
      const tipo = azar.elegir<string>(['int', 'String', 'boolean', 'double', 'var']);
      return [declararConNombre(entorno, tipo, valorVoid)];
    }
    case 'operando': {
      const otro = expresion(entorno, azar.elegir(['int', 'String', 'boolean']), 0);
      const operacion = azar.probabilidad(0.5) ? operadorBinario(azar.elegir(['+', '*', '==', '&&']), valorVoid, otro, 'desconocido') : operadorBinario(azar.elegir(['+', '-', '<', '||']), otro, valorVoid, 'desconocido');
      return comoSentencia(entorno, operacion);
    }
    case 'condicion':
      return [azar.probabilidad(0.5) ? si(valorVoid, [], null) : mientras(valorVoid, [])];
    case 'cast':
      return comoSentencia(entorno, castHacia(azar.elegir(['int', 'String', 'double']), valorVoid));
    case 'asignacion': {
      const objetivo = referenciaAVariable(asegurarVariable(entorno, azar.elegir(['int', 'String']), previas));
      return [...previas, sentenciaExpr(plantilla(['', ' = ', ''], [objetivo, valorVoid], objetivo.tipo, { etiquetas: ['asignacion'] }))];
    }
    case 'operando-unario':
      return comoSentencia(entorno, plantilla([azar.elegir(['!', '-', '~']), ''], [valorVoid], 'desconocido', { etiquetas: ['operador'] }));
    default:
      return [seleccion({ selector: valorVoid, casos: [], flecha: false })];
  }
}

// ---- switch ----

function etiquetaDeTipo(entorno: Entorno, tipo: string): Expr {
  const { azar } = entorno;
  switch (tipo) {
    case 'null':
      return literal('null', 'null');
    case 'int': {
      if (azar.probabilidad(0.12)) return operadorBinario('+', literal('1', 'int'), literal(azar.elegir(['1', '2']), 'int'), 'int');
      const constantes = entorno.variables.filter((v) => v.esFinal && v.tipo === 'int');
      if (constantes.length > 0 && azar.probabilidad(0.25)) return referenciaAVariable(azar.elegir(constantes));
      return literalDe(entorno, 'int');
    }
    default:
      return literalDe(entorno, tipo);
  }
}

/** El tipo de etiqueta que admite un selector de cada tipo envoltorio o estrecho (JLS 14.11). */
const TIPO_DE_LA_ETIQUETA_SEGUN_EL_SELECTOR: Readonly<Record<string, string>> = {
  byte: 'int', short: 'int', Integer: 'int', Character: 'char', Long: 'long', Double: 'double', Boolean: 'boolean',
};

type FallaDeSwitch = 'etiqueta-de-otro-tipo' | 'etiqueta-repetida' | 'default-repetido' | 'selector-invalido';

function cuerpoDeCaso(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const forma = azar.ponderado<'break' | 'vacio' | 'imprimir-y-break' | 'imprimir'>([[50, 'break'], [12, 'vacio'], [28, 'imprimir-y-break'], [10, 'imprimir']]);
  const imprimirAlgo = sentenciaExpr(imprimir(expresion(entorno, azar.elegir(['String', 'int']), 0)));
  if (forma === 'break') return [salto('break')];
  if (forma === 'vacio') return [];
  if (forma === 'imprimir') return [imprimirAlgo];
  return [imprimirAlgo, salto('break')];
}

function casosDeSwitch(entorno: Entorno, tipoDelSelector: string, falla: FallaDeSwitch | null): Caso[] {
  const { azar } = entorno;
  const tipoNatural = TIPO_DE_LA_ETIQUETA_SEGUN_EL_SELECTOR[tipoDelSelector] ?? tipoDelSelector;
  const cantidad = 1 + azar.entero(3);
  const etiquetasUsadas = new Set<string>();
  const casos: Caso[] = [];
  const otrosTipos = ['int', 'char', 'String', 'long', 'double', 'boolean', 'null'].filter((t) => t !== tipoNatural);
  const casoQueFalla = azar.entero(cantidad);

  for (let i = 0; i < cantidad; i += 1) {
    const etiquetas: Expr[] = [];
    const etiquetasPorCaso = azar.probabilidad(0.1) ? 2 : 1;
    for (let j = 0; j < etiquetasPorCaso; j += 1) {
      let etiqueta: Expr;
      if (falla === 'etiqueta-de-otro-tipo' && i === casoQueFalla && j === 0) {
        etiqueta = etiquetaDeTipo(entorno, azar.elegir(otrosTipos));
      } else if (falla === 'etiqueta-repetida' && i > 0 && j === 0) {
        etiqueta = literal([...etiquetasUsadas][0]!, tipoNatural);
      } else {
        // Una etiqueta natural que aún no se usó: para `char`, a veces un entero (`case 65:` es válido).
        let candidata = etiquetaDeTipo(entorno, tipoNatural === 'char' && azar.probabilidad(0.2) ? 'int' : tipoNatural);
        for (let intento = 0; intento < 8 && etiquetasUsadas.has(textoDe(candidata)); intento += 1) candidata = etiquetaDeTipo(entorno, tipoNatural);
        etiqueta = candidata;
      }
      etiquetasUsadas.add(textoDe(etiqueta));
      etiquetas.push(etiqueta);
    }
    casos.push({ etiquetas, cuerpo: cuerpoDeCaso(entorno) });
  }
  if (azar.probabilidad(0.55) || falla === 'default-repetido') {
    casos.splice(azar.entero(casos.length + 1), 0, { etiquetas: 'default', cuerpo: cuerpoDeCaso(entorno) });
    if (falla === 'default-repetido') casos.splice(azar.entero(casos.length + 1), 0, { etiquetas: 'default', cuerpo: cuerpoDeCaso(entorno) });
  }
  return casos;
}

function textoDe(expr: Expr): string {
  return expr.partes.reduce((texto, parte, i) => texto + parte + (expr.hijos[i] === undefined ? '' : textoDe(expr.hijos[i]!)), '');
}

function switchAlAzar(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  // Esta plantilla ES el ejercicio de las reglas del switch (tipo del selector, tipo y repetición de las
  // etiquetas): a veces prueba una falla aunque a la sentencia no le tocara.
  const falla: FallaDeSwitch | null =
    debeViolar(entorno) || azar.probabilidad(0.25)
      ? azar.ponderado<FallaDeSwitch>([[36, 'etiqueta-de-otro-tipo'], [24, 'etiqueta-repetida'], [16, 'default-repetido'], [24, 'selector-invalido']])
      : null;
  const previas: Sentencia[] = [];
  const tipo =
    falla === 'selector-invalido'
      ? azar.elegir(['long', 'double', 'boolean'])
      : azar.ponderado<string>([[40, 'int'], [22, 'char'], [22, 'String'], [6, 'byte'], [4, 'short'], [4, 'Integer'], [2, 'Character']]);
  const selector = azar.probabilidad(0.8) ? referenciaAVariable(asegurarVariable(entorno, tipo, previas)) : expresion(entorno, ['byte', 'short', 'Integer', 'Character'].includes(tipo) ? 'int' : tipo, 0);
  const flecha = azar.probabilidad(0.18);
  return [...previas, seleccion({ selector, casos: casosDeSwitch(entorno, tipo, falla), flecha })];
}

// ---- switch con etiquetas que son variables constantes (tarea 1.33) ----

type FallaDeSwitchConConstante = 'variable-sin-final' | 'valor-repetido' | 'de-otro-tipo';

/**
 * `final int s = 3; switch (s) { case s -> { } }`: la etiqueta de un `case` es el NOMBRE de una variable `final` con valor
 * constante (JLS 15.29). La campaña de la 1.32 encontró el falso rechazo de `case s ->` (el analizador leía `s ->` como una lambda)
 * UNA vez en 35 000 programas, porque una `final` casi nunca coincidía con un `switch` del mismo programa. Esta plantilla las
 * declara ANTES y las usa de etiqueta, con flecha o con dos puntos; a veces la variable no es `final` (javac: «constant expression
 * required»), repite el valor de otra (etiqueta duplicada) o es de otro tipo que el selector.
 */
function switchConConstante(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const falla: FallaDeSwitchConConstante | null =
    debeViolar(entorno) || azar.probabilidad(0.12)
      ? azar.ponderado<FallaDeSwitchConConstante>([[45, 'variable-sin-final'], [30, 'valor-repetido'], [25, 'de-otro-tipo']])
      : null;
  const tipo = azar.ponderado<string>([[62, 'int'], [20, 'char'], [18, 'String']]);
  const previas: Sentencia[] = [];
  const usados = new Set<string>();
  const etiquetas: Expr[] = [];
  const cantidad = 1 + azar.entero(3);
  for (let i = 0; i < cantidad; i += 1) {
    const nuevoNombre = elegirNombreCorriente(entorno);
    const tipoDeLaConstante = falla === 'de-otro-tipo' && i === 0 ? azar.elegir(['long', 'double', 'boolean', tipo === 'int' ? 'String' : 'int']) : tipo;
    let valor = literalDe(entorno, tipoDeLaConstante);
    if (falla === 'valor-repetido' && i > 0) valor = literal([...usados][0]!, tipoDeLaConstante);
    else for (let intento = 0; intento < 12 && usados.has(textoDe(valor)); intento += 1) valor = literalDe(entorno, tipoDeLaConstante);
    usados.add(textoDe(valor));
    const esFinal = !(falla === 'variable-sin-final' && i === 0);
    registrarVariable(entorno, { nombre: nuevoNombre, tipo: tipoDeLaConstante, esFinal, etiquetas: [] });
    previas.push(declaracion({ tipo: tipoDeLaConstante, nombre: nuevoNombre, inicial: valor, esFinal }));
    etiquetas.push(nombre(nuevoNombre, tipoDeLaConstante, { primaria: true, etiquetas: ['etiqueta-de-variable'] }));
  }
  const selector = referenciaAVariable(asegurarVariable(entorno, tipo, previas));
  const casos: Caso[] = etiquetas.map((etiqueta) => ({ etiquetas: [etiqueta], cuerpo: cuerpoDeCaso(entorno) }));
  if (azar.probabilidad(0.55)) casos.splice(azar.entero(casos.length + 1), 0, { etiquetas: 'default', cuerpo: cuerpoDeCaso(entorno) });
  return [...previas, seleccion({ selector, casos, flecha: azar.probabilidad(0.7) })];
}

// ---- El resultado de printf usado como valor (tarea 1.33) ----

/**
 * `int b = System.out.printf("a");`, `if (System.out.printf("x")) { }`, `(int) System.out.printf("a")`, `System.out.printf("a").println("b")`:
 * `printf` devuelve un `PrintStream` (el mismo `System.out`), un tipo que el subconjunto no modela. La 1.32 dejó como residual que
 * javac rechaza casi todos esos usos (`PrintStream cannot be converted to int`) y el compilador los daba por buenos; el generador
 * solo usaba `printf` como sentencia y no los veía. Algunos usos SÍ son válidos (argumento de `println`, receptor encadenado,
 * concatenación con un `String`, un `Object`): ahí el compilador debe avisar o aceptar, nunca rechazar.
 */
function printfComoValor(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const previas: Sentencia[] = [];
  const printf = llamadaAPrintf(entorno, ['impresion', 'printf-como-valor']);
  const forma = azar.ponderado<'declaracion' | 'condicion' | 'operando' | 'cast' | 'asignacion' | 'argumento-de-println' | 'receptor' | 'argumento-de-biblioteca'>([
    [26, 'declaracion'], [14, 'condicion'], [12, 'operando'], [8, 'cast'], [10, 'asignacion'], [12, 'argumento-de-println'], [10, 'receptor'], [8, 'argumento-de-biblioteca'],
  ]);
  switch (forma) {
    case 'declaracion':
      return [declararConNombre(entorno, azar.ponderado<string>([[30, 'int'], [20, 'String'], [15, 'boolean'], [10, 'double'], [8, 'Object'], [10, 'var'], [4, 'char'], [3, 'long']]), printf)];
    case 'condicion':
      return [azar.probabilidad(0.6) ? si(printf, [], null) : mientras(printf, [])];
    case 'operando': {
      const otro = azar.elegir<readonly [string, string, string]>([['+', 'int', 'int'], ['+', 'String', 'String'], ['*', 'int', 'int'], ['==', 'int', 'boolean'], ['&&', 'boolean', 'boolean'], ['<', 'int', 'boolean']]);
      const operacion = operadorBinario(otro[0], printf, expresion(entorno, otro[1], 0), otro[2]);
      return [declararConNombre(entorno, otro[2], operacion)];
    }
    case 'cast': {
      const destino = azar.elegir(['int', 'String', 'double', 'Object', 'boolean']);
      return [declararConNombre(entorno, destino, castHacia(destino, printf))];
    }
    case 'asignacion': {
      const objetivo = referenciaAVariable(asegurarVariable(entorno, azar.elegir(['int', 'String', 'boolean']), previas));
      return [...previas, sentenciaExpr(plantilla(['', ' = ', ''], [objetivo, printf], objetivo.tipo, { etiquetas: ['asignacion'] }))];
    }
    case 'argumento-de-println':
      return [sentenciaExpr(imprimir(printf, azar.probabilidad(0.75) ? 'println' : 'print'))];
    case 'receptor':
      return [sentenciaExpr(llamada(printf, azar.elegir(['println', 'print']), [literalDe(entorno, 'String')], 'void', { etiquetas: ['impresion'] }))];
    default:
      return comoSentencia(entorno, llamada(null, azar.elegir(['Math.abs', 'Integer.parseInt', 'String.valueOf', 'Character.isDigit']), [printf], 'int', { etiquetas: ['llamada-de-biblioteca'] }));
  }
}

// ---- Tarea 1.34 (A): una sentencia dentro del switch antes del primer case ----

type FormaDeSentenciaDeAntes = 'break' | 'impresion' | 'declaracion' | 'final' | 'vacia' | 'bloque' | 'incremento' | 'return' | 'if' | 'for' | 'asignaciones';

/**
 * Una (o dos) sentencias de las que un alumno pone, por descuido, entre la llave del `switch` y su primer `case`: `break;`, un `println`, una
 * declaración, `final`, `;`, un bloque, `x++;`, `return;`, un `if`, un `for` o dos asignaciones (las formas que midió el verificador). Java solo
 * admite ahí una etiqueta: el analizador de javac se detiene con «case, default, or '}' expected», así que el programa es un error de sintaxis
 * A PROPÓSITO (`pretendeErrorDeSintaxis` lo reconoce por la estructura). Lo que declaran se olvida al salir: javac ni llega a verlo.
 */
function sentenciasDeAntes(entorno: Entorno, previas: Sentencia[]): Sentencia[] {
  const { azar } = entorno;
  const forma = azar.ponderado<FormaDeSentenciaDeAntes>([
    [20, 'break'], [16, 'impresion'], [14, 'declaracion'], [6, 'final'], [6, 'vacia'], [6, 'bloque'], [10, 'incremento'], [6, 'return'], [6, 'if'], [4, 'for'], [6, 'asignaciones'],
  ]);
  switch (forma) {
    case 'break':
      return [salto('break')];
    case 'impresion':
      return [sentenciaExpr(imprimir(expresionDeCualquierTipo(entorno, 0), azar.probabilidad(0.75) ? 'println' : 'print'))];
    case 'declaracion':
    case 'final': {
      const tipo = azar.ponderado<string>([[60, 'int'], [20, 'String'], [10, 'double'], [10, 'boolean']]);
      return conAlcance(entorno, () => [declararConNombre(entorno, tipo, expresion(entorno, tipo, 0), { esFinal: forma === 'final' })]);
    }
    case 'vacia':
      return [sentenciaExpr(plantilla([''], [], 'void'))];
    case 'bloque':
      return [bloque(azar.probabilidad(0.5) ? [] : [sentenciaExpr(imprimir(expresionDeCualquierTipo(entorno, 0)))])];
    case 'incremento': {
      const objetivo = referenciaAVariable(asegurarVariable(entorno, 'int', previas));
      return [sentenciaExpr(plantilla(azar.elegir([['', '++'], ['', '--'], ['++', ''], ['--', '']] as const), [objetivo], 'int', { etiquetas: ['incremento'] }))];
    }
    case 'return':
      return [sentenciaExpr(literalDeRetorno(null))];
    case 'if':
      return [si(condicion(entorno, 0), [], null)];
    case 'for':
      return [para({ inicial: null, condicion: null, paso: null, cuerpo: [salto('break')] })];
    case 'asignaciones': {
      const objetivo = referenciaAVariable(asegurarVariable(entorno, 'int', previas));
      return [
        sentenciaExpr(plantilla(['', ' = ', ''], [objetivo, literalDe(entorno, 'int')], 'int', { etiquetas: ['asignacion'] })),
        sentenciaExpr(plantilla(['', ' += ', ''], [objetivo, literalDe(entorno, 'int')], 'int', { etiquetas: ['asignacion-compuesta'] })),
      ];
    }
  }
}

/**
 * `switch (x) { <sentencias> case 1: … }`: un `switch` por lo demás NORMAL (selector y etiquetas del mismo tipo, sin repetir) con de una a tres
 * sentencias antes de su primer `case`/`default`, con dos puntos o con flecha. Antes de la 1.34 el analizador aceptaba cualquier elemento de
 * bloque en ese lugar y el programa terminaba en «Java sí acepta tu programa» (familia A de la re-verificación del lote 1).
 */
function switchConSentenciaAntesDelCase(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const previas: Sentencia[] = [];
  const tipo = azar.ponderado<string>([[50, 'int'], [25, 'char'], [25, 'String']]);
  const selector = referenciaAVariable(asegurarVariable(entorno, tipo, previas));
  const antes: Sentencia[] = [];
  const cantidad = azar.ponderado<number>([[62, 1], [28, 2], [10, 3]]);
  for (let i = 0; i < cantidad; i += 1) antes.push(...sentenciasDeAntes(entorno, previas));
  return [...previas, seleccion({ selector, antes, casos: casosDeSwitch(entorno, tipo, null), flecha: azar.probabilidad(0.25) })];
}

// ---- Tarea 1.34 (B): `args` y `System.in`/`System.out`/`System.err` usados como VALOR ----

/** El valor de tipo no modelado de B, marcado con su rasgo. */
function valorSinModelar(entorno: Entorno): Expr {
  const dato = entorno.azar.elegir(VALORES_DE_TIPO_NO_MODELADO);
  return nombre(dato.texto, dato.tipo, { etiquetas: ['valor-de-tipo-no-modelado', ...(dato.rasgos ?? [])] });
}

/**
 * `int x = System.in;`, `int n = args.length();`, `if (args)`, `(int) System.out`, `System.in.nextInt()`, `Math.abs(args)`, `switch (args)`…: un valor
 * cuyo tipo el subconjunto no modela, puesto en cada posición donde Java espera un VALOR (inicializador, condición, operando, cast, asignación
 * —de y hacia el valor—, argumento, receptor, selector). javac rechaza casi todos; acepta los que son del tipo (`Object o = System.in;`,
 * `switch (args.length)`, `new Scanner(System.in)`, `println(System.in)`). Con el compilador anterior los rechazados salían como «Java sí acepta
 * tu programa» (familia B) y, con un nombre de `Object.prototype` como miembro de `System`, hacían LANZAR a `compilar()` (familia E).
 */
function valorDeTipoNoModelado(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const previas: Sentencia[] = [];
  const valor = valorSinModelar(entorno);
  const forma = azar.ponderado<'declaracion' | 'condicion' | 'operando' | 'unario' | 'cast' | 'asignacion' | 'argumento-de-println' | 'argumento-de-biblioteca' | 'receptor' | 'selector' | 'nueva'>([
    [26, 'declaracion'], [8, 'condicion'], [12, 'operando'], [6, 'unario'], [6, 'cast'], [8, 'asignacion'], [10, 'argumento-de-println'], [8, 'argumento-de-biblioteca'], [10, 'receptor'], [4, 'selector'], [4, 'nueva'],
  ]);
  switch (forma) {
    case 'declaracion': {
      const tipo = azar.ponderado<string>([[24, 'int'], [16, 'String'], [8, 'boolean'], [6, 'double'], [12, 'Object'], [10, 'var'], [4, 'char'], [4, 'long'], [4, 'Scanner'], [2, 'Random']]);
      return [declararConNombre(entorno, tipo, valor)];
    }
    case 'condicion':
      return [azar.probabilidad(0.6) ? si(valor, [], null) : mientras(valor, [])];
    case 'operando': {
      const otro = azar.elegir<readonly [string, string, string]>([['+', 'int', 'int'], ['+', 'String', 'String'], ['*', 'int', 'int'], ['-', 'int', 'int'], ['==', 'int', 'boolean'], ['==', 'String', 'boolean'], ['&&', 'boolean', 'boolean'], ['<', 'int', 'boolean']]);
      const operacion = azar.probabilidad(0.5)
        ? operadorBinario(otro[0], valor, expresion(entorno, otro[1], 0), otro[2])
        : operadorBinario(otro[0], expresion(entorno, otro[1], 0), valor, otro[2]);
      return comoSentencia(entorno, operacion);
    }
    case 'unario': {
      const operador = azar.elegir(['!', '-', '~', '++', '--']);
      if (operador === '++' || operador === '--') {
        // `args.length++;`, `--System.in;`: el valor como operando de un incremento (no es una variable, o es final).
        return [sentenciaExpr(plantilla(azar.probabilidad(0.5) ? [operador, ''] : ['', operador], [valor], 'int', { etiquetas: ['incremento'] }))];
      }
      return comoSentencia(entorno, operadorUnario(operador, valor, 'int'));
    }
    case 'cast': {
      const destino = azar.elegir(['int', 'String', 'Object', 'double', 'boolean', 'char', 'long']);
      return [declararConNombre(entorno, destino, castHacia(destino, valor))];
    }
    case 'asignacion': {
      if (azar.probabilidad(0.35)) {
        // El valor como DESTINO: `args = null;` (válido), `args.length = 3;` y `System.in = null;` (finales).
        return [sentenciaExpr(plantilla(['', ' = ', ''], [valor, literal('null', 'null')], valor.tipo, { etiquetas: ['asignacion'] }))];
      }
      const objetivo = referenciaAVariable(asegurarVariable(entorno, azar.elegir(['int', 'String', 'boolean']), previas));
      return [...previas, sentenciaExpr(plantilla(['', ' = ', ''], [objetivo, valor], objetivo.tipo, { etiquetas: ['asignacion'] }))];
    }
    case 'argumento-de-println':
      return [sentenciaExpr(imprimir(valor, azar.probabilidad(0.75) ? 'println' : 'print'))];
    case 'argumento-de-biblioteca':
      return comoSentencia(entorno, llamada(null, azar.elegir(['Math.abs', 'Math.max', 'Math.sqrt', 'Integer.parseInt', 'String.valueOf', 'Character.isDigit']), [valor], 'int', { etiquetas: ['llamada-de-biblioteca'] }));
    case 'receptor': {
      const miembro = azar.elegir<readonly [texto: string, esLlamada: boolean, tipo: string]>([
        ['length()', true, 'int'], ['nextInt()', true, 'int'], ['read()', true, 'int'], ['toString()', true, 'String'], ['hashCode()', true, 'int'], ['equals(null)', true, 'boolean'],
        ['foo()', true, 'int'], ['close()', true, 'void'], ['println("a")', true, 'void'], ['length', false, 'int'], ['constructor', false, 'desconocido'], ['__proto__', false, 'desconocido'],
      ]);
      const miembroDeJavascript = NOMBRES_DE_JAVASCRIPT.includes(miembro[0]);
      const base = miembroDeReceptor(valor, miembro[0], miembro[1], miembro[2]);
      // Un nombre de `Object.prototype` como miembro (`args.constructor`, `System.in.__proto__`): el rasgo de la familia E va en el acceso, no solo en el valor.
      const acceso = miembroDeJavascript ? { ...base, etiquetas: [...(base.etiquetas ?? []), 'nombre-de-javascript' as const] } : base;
      return miembro[2] === 'void' ? [sentenciaExpr(acceso)] : comoSentencia(entorno, acceso);
    }
    case 'selector':
      return [seleccion({ selector: valor, casos: azar.probabilidad(0.5) ? [] : [{ etiquetas: [literal('1', 'int')], cuerpo: [salto('break')] }], flecha: false })];
    default:
      return [declararConNombre(entorno, 'Scanner', plantilla(['new Scanner(', ')'], [valor], 'Scanner', { primaria: true }))];
  }
}

// ---- Tarea 1.34 (D): una expresión entre paréntesis como sentencia ----

/** `(expr)`: la expresión entre paréntesis. */
function entreParentesis(expr: Expr, opciones: { readonly etiquetas?: readonly Etiqueta[]; readonly sintaxisInvalida?: boolean } = {}): Expr {
  return plantilla(['(', ')'], [expr], expr.tipo, { primaria: true, ...opciones });
}

const SENTENCIA_ENTRE_PARENTESIS: Etiqueta = 'sentencia-entre-parentesis';

/**
 * `(x = 2);`, `(x++);`, `(System.out.println(1));`, `((x = 2));`, `(new Scanner(System.in));`, `(x);`: javac exige que una SENTENCIA sea una asignación,
 * un `++`/`--`, una llamada o un `new` SIN paréntesis (JLS 14.8: «not a statement»), así que son errores de sintaxis A PROPÓSITO; también dentro de la
 * cabecera de un `for`. Pero la variable entre paréntesis sí es válida como destino (`(x) = 2;`, `(x)++;`, `(x) += 1;`, `++(x);`) y como receptor
 * (`(s).length();`, `(System.out).println(1);`), y el NOMBRE DE UNA CLASE entre paréntesis no (`(Math).abs(1);`: «illegal parenthesized expression»,
 * un error de tipos). El árbol del motor no guardaba los paréntesis y las aceptaba todas (familia D de la re-verificación del lote 1).
 */
function sentenciaEntreParentesis(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const previas: Sentencia[] = [];
  const forma = azar.ponderado<'asignacion' | 'incremento' | 'llamada' | 'doble' | 'nueva' | 'nombre' | 'destino' | 'receptor-valido' | 'receptor-de-clase' | 'en-for'>([
    [20, 'asignacion'], [12, 'incremento'], [12, 'llamada'], [6, 'doble'], [4, 'nueva'], [4, 'nombre'], [16, 'destino'], [10, 'receptor-valido'], [8, 'receptor-de-clase'], [8, 'en-for'],
  ]);
  const variableEntera = (): Expr => referenciaAVariable(asegurarVariable(entorno, 'int', previas));
  const asignacion = (): Expr => {
    const objetivo = referenciaAVariable(asegurarVariable(entorno, azar.elegir(['int', 'String', 'double', 'boolean']), previas));
    return plantilla(['', ' = ', ''], [objetivo, expresion(entorno, objetivo.tipo, 0)], objetivo.tipo, { etiquetas: ['asignacion'] });
  };
  const incremento = (objetivo: Expr): Expr => plantilla(azar.elegir([['', '++'], ['', '--'], ['++', ''], ['--', '']] as const), [objetivo], 'int', { etiquetas: ['incremento'] });
  const invalida = { etiquetas: [SENTENCIA_ENTRE_PARENTESIS], sintaxisInvalida: true } as const;

  switch (forma) {
    case 'asignacion':
      return [...previas, sentenciaExpr(entreParentesis(asignacion(), invalida))];
    case 'incremento':
      return [...previas, sentenciaExpr(entreParentesis(incremento(variableEntera()), invalida))];
    case 'llamada': {
      const call = azar.probabilidad(0.5) ? llamada(null, 'System.out.println', [expresionDeCualquierTipo(entorno, 0)], 'void', { etiquetas: ['impresion'] }) : llamadaDeBibliotecaAlAzar(entorno, 0);
      return [...previas, sentenciaExpr(entreParentesis(call, invalida))];
    }
    case 'doble':
      return [...previas, sentenciaExpr(entreParentesis(entreParentesis(azar.probabilidad(0.5) ? asignacion() : incremento(variableEntera()), invalida), invalida))];
    case 'nueva':
      return [sentenciaExpr(entreParentesis(plantilla([azar.elegir(['new Scanner(System.in)', 'new Random()', 'new Random(5L)'])], [], 'Scanner', { primaria: true }), invalida))];
    case 'nombre': {
      const objetivo = azar.probabilidad(0.5) ? variableEntera() : literalDe(entorno, azar.elegir(['int', 'String', 'boolean']));
      return [...previas, sentenciaExpr(entreParentesis(objetivo, invalida))];
    }
    case 'destino': {
      // VÁLIDAS: la variable entre paréntesis como destino. El rasgo va en la expresión completa (`(x) = 2`), la que se imprime como sentencia.
      const destino = entreParentesis(variableEntera());
      const forma2 = azar.ponderado<'simple' | 'compuesta' | 'incremento'>([[40, 'simple'], [25, 'compuesta'], [35, 'incremento']]);
      if (forma2 === 'simple') return [...previas, sentenciaExpr(plantilla(['', ' = ', ''], [destino, expresion(entorno, 'int', 0)], 'int', { etiquetas: ['asignacion', SENTENCIA_ENTRE_PARENTESIS] }))];
      if (forma2 === 'compuesta') return [...previas, sentenciaExpr(plantilla(['', ` ${azar.elegir(OPERADORES_ARITMETICOS)}= `, ''], [destino, expresion(entorno, 'int', 0)], 'int', { etiquetas: ['asignacion-compuesta', SENTENCIA_ENTRE_PARENTESIS] }))];
      return [...previas, sentenciaExpr(plantilla(azar.elegir([['', '++'], ['', '--'], ['++', ''], ['--', '']] as const), [destino], 'int', { etiquetas: ['incremento', SENTENCIA_ENTRE_PARENTESIS] }))];
    }
    case 'receptor-valido': {
      // VÁLIDAS: `(s).length();` y `(System.out).println(1);`.
      if (azar.probabilidad(0.5)) {
        const cadena = referenciaAVariable(asegurarVariable(entorno, 'String', previas));
        return [...previas, sentenciaExpr(llamada(entreParentesis(cadena), azar.elegir(['length', 'trim', 'toUpperCase', 'isEmpty']), [], 'int', { etiquetas: ['llamada-de-biblioteca', SENTENCIA_ENTRE_PARENTESIS] }))];
      }
      return [sentenciaExpr(llamada(entreParentesis(nombre('System.out', 'PrintStream', { primaria: true })), azar.elegir(['println', 'print']), [expresionDeCualquierTipo(entorno, 0)], 'void', { etiquetas: ['impresion', SENTENCIA_ENTRE_PARENTESIS] }))];
    }
    case 'receptor-de-clase': {
      // `(Math).abs(1);`, `(System).out.println(1);`: el nombre de una clase entre paréntesis no es un valor (javac: «illegal parenthesized expression»).
      if (azar.probabilidad(0.5)) {
        const clase = azar.elegir(['Math', 'String', 'Integer', 'Character', 'Double']);
        const metodo = azar.elegir(entorno.api.metodos(clase).filter((m) => m.esEstatico));
        return [sentenciaExpr(llamada(entreParentesis(nombre(clase, clase, { primaria: true })), metodo.nombre, metodo.parametros.map((parametro) => literalDe(entorno, parametro === 'CharSequence' ? 'String' : parametro)), metodo.retorno, { etiquetas: ['llamada-de-biblioteca', SENTENCIA_ENTRE_PARENTESIS] }))];
      }
      return [sentenciaExpr(plantilla(['(System).out.println(', ')'], [expresionDeCualquierTipo(entorno, 0)], 'void', { etiquetas: ['impresion', SENTENCIA_ENTRE_PARENTESIS] }))];
    }
    default: {
      // En la cabecera de un `for`: la parte inicial o el paso entre paréntesis.
      const contador = elegirNombreCorriente(entorno);
      const referencia = nombre(contador, 'int', { primaria: true });
      return conAlcance(entorno, () => {
        registrarVariable(entorno, { nombre: contador, tipo: 'int', esFinal: false, etiquetas: [] });
        const condicionDelFor = operadorBinario('<', referencia, literal('3', 'int'), 'boolean');
        const pasoNormal = plantilla(['', '++'], [referencia], 'int', { etiquetas: ['incremento'] });
        if (azar.probabilidad(0.5)) {
          const inicial = sentenciaExpr(entreParentesis(plantilla(['', ' = ', ''], [referencia, literal('0', 'int')], 'int', { etiquetas: ['asignacion'] }), invalida));
          return [declaracion({ tipo: 'int', nombre: contador, inicial: literal('0', 'int') }), para({ inicial, condicion: condicionDelFor, paso: pasoNormal, cuerpo: [] })];
        }
        const inicial = declaracion({ tipo: 'int', nombre: contador, inicial: literal('0', 'int') });
        return [para({ inicial, condicion: condicionDelFor, paso: entreParentesis(pasoNormal, invalida), cuerpo: [] })];
      });
    }
  }
}

// ---- Tarea 1.34 (C): una sentencia que USA el nombre de la clase del programa (que no se llama P) ----

/** Los argumentos de `new Clase(...)` con que el generador construye un objeto de cada clase del JDK. */
const ARGUMENTOS_DE_NEW: Readonly<Record<string, string>> = {
  Scanner: 'System.in', Random: '5L', String: '"hola"', Integer: '5', Double: '1.5', Character: "'a'", Long: '5L', Boolean: 'true',
};

/**
 * La clase del programa se llama como una clase del JDK (`public class Math { … }`): JLS 6.4.1 y 7.5.1 dicen que TAPA a la del JDK, con o sin
 * `import`. Esta sentencia usa ese nombre de las formas que un alumno lo haría: como receptor de un método o de un campo (`Math.abs(1)`,
 * `Integer.MAX_VALUE`), como tipo (`Scanner sc = new Scanner(System.in);`), la clase llamándose a sí misma (`Math.main(args);`) o, solo cuando la clase es
 * `System`, `System.out.println(…)` (la forma que más se escribe). `generador.ts` la pone PRIMERA en los programas de nombre del JDK, estratificados: así cada nombre se
 * ejerce siempre y no por suerte (familia C de la re-verificación del lote 1: antes del 1.34 la clase `System` con `System.out.println` salía `ok`).
 */
export function usoDeLaClase(entorno: Entorno, controlValido = false): Sentencia[] {
  const { azar, clase } = entorno;
  // Tarea 1.35: el CONTROL válido (`Math m = null;`): un tipo con el nombre de la propia clase es siempre válido (el tipo es la clase del programa), con cualquier nombre de variable.
  if (controlValido) return [declararConNombre(entorno, clase, literal('null', 'null'))];
  const delCatalogo = entorno.api.clases.includes(clase);
  const metodos = delCatalogo ? entorno.api.metodos(clase) : [];
  const campos = delCatalogo ? entorno.api.campos(clase) : [];
  const forma = azar.ponderado<'metodo' | 'campo' | 'tipo' | 'ella-misma' | 'impresion' | 'nueva'>([
    [metodos.length > 0 ? 32 : 0, 'metodo'],
    [campos.length > 0 ? 12 : 0, 'campo'],
    [22, 'tipo'],
    [10, 'ella-misma'],
    [clase === 'System' ? 40 : 0, 'impresion'],
    [14, 'nueva'],
  ]);
  switch (forma) {
    case 'metodo':
      // Con receptor `clase` SIEMPRE (`String.length()`, no `"a".length()`): lo que importa es el uso del NOMBRE de la clase.
      return comoSentencia(entorno, llamadaDeApi(entorno, azar.elegir(metodos), 0, 'clase', 'buenos'));
    case 'campo': {
      const campo = azar.elegir(campos);
      return comoSentencia(entorno, plantilla([`${clase}.${campo.nombre}`], [], campo.tipo, { etiquetas: ['campo-de-biblioteca'], primaria: true }));
    }
    case 'tipo': {
      // `Math m = null;` y `Math m;` son VÁLIDOS (el tipo es la clase del programa); `Scanner sc = new Scanner(System.in);` no (la clase no tiene ese constructor).
      const forma = azar.ponderado<'nulo' | 'sin-valor' | 'literal'>([[45, 'nulo'], [15, 'sin-valor'], [40, 'literal']]);
      const inicial = forma === 'nulo' ? literal('null', 'null') : forma === 'sin-valor' ? null : TIPOS_CON_LITERAL.has(clase) ? literalDe(entorno, clase) : literal('null', 'null');
      return [declararConNombre(entorno, clase, inicial)];
    }
    case 'ella-misma':
      return [sentenciaExpr(plantilla([`${clase}.main(args)`], [], 'void', { primaria: true }))];
    case 'impresion':
      return [sentenciaExpr(imprimir(expresionDeCualquierTipo(entorno, 0), azar.probabilidad(0.75) ? 'println' : 'print'))];
    default: {
      const argumentos = ARGUMENTOS_DE_NEW[clase] ?? '';
      return [declararConNombre(entorno, clase, plantilla([`new ${clase}(${azar.probabilidad(0.7) ? argumentos : ''})`], [], clase, { primaria: true }))];
    }
  }
}

const TIPOS_CON_LITERAL: ReadonlySet<string> = new Set(['Scanner', 'Random', 'String', 'Integer', 'Double', 'Character', 'Long', 'Boolean', 'Object']);

// ---- Condicionales, ciclos, break y continue ----

function cuerpoSimple(entorno: Entorno, dentroDeCiclo: boolean): Sentencia[] {
  const { azar } = entorno;
  const forma = azar.ponderado<'vacio' | 'imprimir' | 'asignar' | 'salto' | 'declarar'>([[16, 'vacio'], [34, 'imprimir'], [26, 'asignar'], [dentroDeCiclo ? 16 : 0, 'salto'], [8, 'declarar']]);
  if (forma === 'vacio') return [];
  if (forma === 'imprimir') return [sentenciaExpr(imprimir(expresionDeCualquierTipo(entorno, 1)))];
  if (forma === 'salto') return [salto(azar.elegir(['break', 'continue'] as const))];
  if (forma === 'declarar') return declaracionAlAzar(entorno);
  return asignacionAlAzar(entorno);
}

type FallaDeCiclo = 'condicion-no-booleana' | 'constante' | 'salto-fuera';

function condicionalOCiclo(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const violar = debeViolar(entorno);
  const falla = violar ? azar.ponderado<FallaDeCiclo>([[62, 'condicion-no-booleana'], [22, 'constante'], [16, 'salto-fuera']]) : null;
  const forma = azar.ponderado<'si' | 'mientras' | 'para' | 'haz'>([[36, 'si'], [22, 'mientras'], [24, 'para'], [18, 'haz']]);
  // Condición booleana, salvo que la falla pida otra cosa.
  const laCondicion = (): Expr => {
    if (falla === 'condicion-no-booleana') return azar.probabilidad(0.5) ? asignacionComoValor(entorno, 1) : expresionMalTipada(entorno, 'boolean', 1);
    if (falla === 'constante') return literal(azar.elegir(['true', 'false']), 'boolean');
    return condicion(entorno, 1);
  };
  return conAlcance(entorno, () => {
    const cuerpo = (dentroDeCiclo: boolean): Sentencia[] => (falla === 'salto-fuera' && !dentroDeCiclo ? [salto(azar.elegir(['break', 'continue'] as const))] : cuerpoSimple(entorno, dentroDeCiclo));
    if (forma === 'si') {
      const sino = azar.probabilidad(0.4) ? conAlcance(entorno, () => cuerpo(false)) : null;
      return [si(laCondicion(), cuerpo(false), sino)];
    }
    if (forma === 'mientras') return [mientras(laCondicion(), cuerpo(true))];
    if (forma === 'haz') return [haz(cuerpo(true), laCondicion())];
    if (azar.probabilidad(0.6)) {
      const contador = elegirNombreCorriente(entorno);
      const inicial = declaracion({ tipo: 'int', nombre: contador, inicial: literal('0', 'int') });
      registrarVariable(entorno, { nombre: contador, tipo: 'int', esFinal: false, etiquetas: [] });
      const referenciaAlContador = nombre(contador, 'int', { primaria: true });
      return [
        para({
          inicial,
          condicion: falla === null ? operadorBinario(azar.elegir(OPERADORES_RELACIONALES), referenciaAlContador, literal(azar.elegir(['3', '5', '10']), 'int'), 'boolean') : laCondicion(),
          paso: plantilla(['', '++'], [referenciaAlContador], 'int', { etiquetas: ['incremento'] }),
          cuerpo: cuerpo(true),
        }),
      ];
    }
    // Un `for` con partes sueltas: el `for (;;)` es infinito, así que solo va con la falla que lo permite.
    const infinito = falla === 'constante';
    return [
      para({
        inicial: azar.probabilidad(0.4) || entorno.variables.length === 0 ? null : sentenciaExpr(asignacionComoValor(entorno, 1)),
        condicion: infinito && azar.probabilidad(0.5) ? null : laCondicion(),
        paso: azar.probabilidad(0.5) ? null : plantilla(['', '++'], [referenciaAVariableOEntero(entorno)], 'int', { etiquetas: ['incremento'] }),
        cuerpo: cuerpo(true),
      }),
    ];
  });
}

function referenciaAVariableOEntero(entorno: Entorno): Expr {
  const enteras = variablesDeTipo(entorno, 'int').filter((v) => !v.esFinal);
  return enteras.length > 0 ? referenciaAVariable(entorno.azar.elegir(enteras)) : nombre('i', 'int', { primaria: true });
}

function saltoSuelto(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const palabra = azar.elegir(['break', 'continue'] as const);
  if (azar.probabilidad(0.5)) return [salto(palabra)];
  return [si(condicion(entorno, 0), [salto(palabra)], null)];
}

// ---- Impresión ----

function impresionAlAzar(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const violar = debeViolar(entorno);
  if (violar) {
    // Los errores de llamada más comunes de un alumno: `println("a", x)` (estilo Python) y `print()`.
    if (azar.probabilidad(0.75)) {
      return [sentenciaExpr(llamada(null, azar.elegir(['System.out.println', 'System.out.print']), [literalDe(entorno, 'String'), expresionDeCualquierTipo(entorno, 0)], 'void', { etiquetas: ['impresion'] }))];
    }
    return [sentenciaExpr(llamada(null, 'System.out.print', [], 'void', { etiquetas: ['impresion'] }))];
  }
  const forma = azar.ponderado<'println' | 'print' | 'println-vacio' | 'printf'>([[60, 'println'], [20, 'print'], [8, 'println-vacio'], [12, 'printf']]);
  if (forma === 'println') return [sentenciaExpr(imprimir(expresionDeCualquierTipo(entorno, 1)))];
  if (forma === 'print') return [sentenciaExpr(imprimir(expresionDeCualquierTipo(entorno, 1), 'print'))];
  if (forma === 'println-vacio') return [sentenciaExpr(llamada(null, 'System.out.println', [], 'void', { etiquetas: ['impresion'] }))];
  return [sentenciaExpr(llamadaAPrintf(entorno, ['impresion']))];
}

const FORMATOS_DE_PRINTF = ['"%d%n"', '"%s%n"', '"%.2f%n"', '"%d"', '"hola%n"'] as const;

/** `System.out.printf(formato, valor)`: devuelve un `PrintStream` (por eso su tipo es `PrintStream`, no `void`). */
function llamadaAPrintf(entorno: Entorno, etiquetas: readonly Etiqueta[]): Expr {
  const { azar } = entorno;
  const formato = azar.elegir(FORMATOS_DE_PRINTF);
  const args = azar.probabilidad(0.85) ? [expresionDeCualquierTipo(entorno, 0)] : [];
  return llamada(null, 'System.out.printf', [literal(formato, 'String'), ...args], 'PrintStream', { etiquetas });
}

// ---- Alcance, flujo y misceláneas (casi siempre errores: pesan poco) ----

function alcanceYRepeticion(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const previas: Sentencia[] = [];
  const variable = asegurarVariable(entorno, azar.elegir(['int', 'String', 'double']), previas);
  const interior = conAlcance(entorno, () => [declaracion({ tipo: azar.elegir([variable.tipo, 'int']), nombre: azar.probabilidad(0.6) ? variable.nombre : elegirNombreCorriente(entorno), inicial: null })]);
  return [...previas, bloque(interior)];
}

function literalDeRetorno(valor: Expr | null): Expr {
  return valor === null ? plantilla(['return'], [], 'void') : plantilla(['return ', ''], [valor], 'void');
}

function flujo(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const forma = azar.ponderado<'sin-asignar' | 'asignada-en-las-dos-ramas' | 'retorno' | 'retorno-con-valor' | 'inalcanzable' | 'ciclo-infinito'>([
    [22, 'sin-asignar'], [18, 'asignada-en-las-dos-ramas'], [10, 'retorno'], [14, 'retorno-con-valor'], [18, 'inalcanzable'], [18, 'ciclo-infinito'],
  ]);
  if (forma === 'sin-asignar' || forma === 'asignada-en-las-dos-ramas') {
    const nuevoNombre = elegirNombreCorriente(entorno);
    const tipo = azar.elegir(['int', 'String', 'boolean']);
    const referencia = nombre(nuevoNombre, tipo, { primaria: true });
    registrarVariable(entorno, { nombre: nuevoNombre, tipo, esFinal: false, etiquetas: [] });
    const asignada = sentenciaExpr(plantilla(['', ' = ', ''], [referencia, literalDe(entorno, tipo)], tipo, { etiquetas: ['asignacion'] }));
    return [
      declaracion({ tipo, nombre: nuevoNombre, inicial: null }),
      si(condicion(entorno, 0), [asignada], forma === 'asignada-en-las-dos-ramas' ? [asignada] : null),
      sentenciaExpr(imprimir(referencia)),
    ];
  }
  if (forma === 'retorno') return [sentenciaExpr(literalDeRetorno(null)), ...cuerpoSimple(entorno, false)];
  if (forma === 'retorno-con-valor') return [sentenciaExpr(literalDeRetorno(expresion(entorno, azar.elegir(['int', 'String', 'boolean']), 0)))];
  if (forma === 'inalcanzable') {
    const cuerpo: Sentencia[] = [salto(azar.elegir(['break', 'continue'] as const)), sentenciaExpr(imprimir(literalDe(entorno, 'String')))];
    return [azar.probabilidad(0.5) ? mientras(literal('true', 'boolean'), cuerpo) : haz(cuerpo, literal('true', 'boolean'))];
  }
  const infinito = azar.probabilidad(0.5) ? mientras(literal('true', 'boolean'), cuerpoSimple(entorno, true)) : para({ inicial: null, condicion: null, paso: null, cuerpo: cuerpoSimple(entorno, true) });
  return [infinito, sentenciaExpr(imprimir(literalDe(entorno, 'String')))];
}

function variosAlAzar(entorno: Entorno): Sentencia[] {
  const { azar } = entorno;
  const forma = azar.ponderado<'metodo-inexistente' | 'clase-inexistente' | 'variable-inexistente' | 'nulo' | 'repetida'>([[24, 'metodo-inexistente'], [16, 'clase-inexistente'], [24, 'variable-inexistente'], [16, 'nulo'], [20, 'repetida']]);
  if (forma === 'metodo-inexistente') return [sentenciaExpr(llamada(null, azar.elegir(['calcular', 'imprimir', 'sumar', 'mostrar']), [expresion(entorno, 'int', 0)], 'void', { etiquetas: ['llamada-de-biblioteca'] }))];
  if (forma === 'clase-inexistente') return [declaracion({ tipo: azar.elegir(['Lista', 'Persona', 'ArrayList', 'Scaner']), nombre: elegirNombreCorriente(entorno), inicial: plantilla(['new Lista()'], [], 'Lista', { primaria: true }) })];
  if (forma === 'variable-inexistente') return [sentenciaExpr(imprimir(nombre('resultado', 'int', { primaria: true })))];
  if (forma === 'nulo') return comoSentencia(entorno, llamada(literal('null', 'null'), 'length', [], 'int', { etiquetas: ['llamada-de-biblioteca'] }));
  const previas: Sentencia[] = [];
  const variable = asegurarVariable(entorno, azar.elegir(['int', 'String']), previas);
  return [...previas, declaracion({ tipo: variable.tipo, nombre: variable.nombre, inicial: expresion(entorno, variable.tipo, 0) })];
}

/** Las plantillas con su peso: de aquí sale el reparto de construcciones de un programa. */
export const PLANTILLAS: readonly PlantillaDeSentencia[] = [
  { nombre: 'declaracion', peso: 32, generar: declaracionAlAzar },
  { nombre: 'asignacion', peso: 13, generar: asignacionAlAzar },
  { nombre: 'operadores-mezclados', peso: 6, generar: operadoresMezclados },
  { nombre: 'cast', peso: 4, generar: castAlAzar },
  { nombre: 'final-modificada', peso: 2.5, generar: finalModificada },
  { nombre: 'estrechamiento-de-constantes', peso: 4, generar: estrechamientoDeConstantes },
  { nombre: 'envoltura-y-uso', peso: 3, generar: envolturaYUso },
  { nombre: 'literal-raro', peso: 3, generar: literalRaro },
  { nombre: 'miembro-de-primitivo', peso: 2, generar: miembroDePrimitivo },
  { nombre: 'llamada-de-biblioteca', peso: 16, generar: llamadaDeBiblioteca },
  { nombre: 'void-como-valor', peso: 2, generar: voidEnPosicionDeValor },
  { nombre: 'switch', peso: 5, generar: switchAlAzar },
  { nombre: 'switch-con-constante', peso: 3.3, generar: switchConConstante }, // 2.5 hasta la 1.34; la 1.35 sumó 7.4 de peso a la lista y la muestra de 4 000 bajó a 20 de los 25 programas que exige la cobertura
  { nombre: 'printf-como-valor', peso: 2.5, generar: printfComoValor },
  { nombre: 'switch-con-sentencia-antes-del-case', peso: 1, generar: switchConSentenciaAntesDelCase },
  { nombre: 'valor-de-tipo-no-modelado', peso: 2.4, generar: valorDeTipoNoModelado },
  { nombre: 'sentencia-entre-parentesis', peso: 2.3, generar: sentenciaEntreParentesis }, // 1.8 hasta la 1.34; ver `switch-con-constante`: la forma `(x) += 1;` dejó de salir en la muestra
  { nombre: 'condicional-o-ciclo', peso: 12, generar: condicionalOCiclo },
  { nombre: 'salto-suelto', peso: 0.6, generar: saltoSuelto },
  { nombre: 'impresion', peso: 15, generar: impresionAlAzar },
  { nombre: 'alcance-y-repeticion', peso: 1, generar: alcanceYRepeticion },
  { nombre: 'flujo', peso: 2, generar: flujo },
  { nombre: 'varios', peso: 1, generar: variosAlAzar },
  // Tarea 1.35: `instanceof` con patrón, clases anónimas y `for` mejorado (construcciones que Java acepta y el subconjunto no interpreta).
  ...PLANTILLAS_FUERA_DEL_SUBCONJUNTO,
];
