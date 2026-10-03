// Reductor de discrepancias (tarea 1.31): delta debugging por sentencias y subexpresiones. Dado un
// programa que exhibe una discrepancia con javac, encuentra el programa MÁS CHICO que sigue exhibiéndola.
// «Sigue exhibiéndola» lo decide un predicado inyectado (`Conserva`), que en la campaña real vuelve a
// preguntarle a javac y a nuestro compilador; aquí no se sabe nada de ninguno de los dos.
//
// Cada ronda propone TODOS los candidatos de un paso y los evalúa con UN solo llamado al predicado (cada
// llamado real cuesta el arranque de una JVM), a todos los programas en curso a la vez. Se toma el primer
// candidato que sirve: la lista va de lo más agresivo (quedarse con una sentencia) a lo más fino (cambiar
// una subexpresión por un literal), así que la reducción avanza a saltos grandes y termina en un mínimo
// local. Etapas por programa: primero solo sentencias; cuando ninguna se puede quitar, subexpresiones; si
// una expresión se simplifica, se vuelve a intentar con sentencias. Todo candidato es ESTRICTAMENTE más
// corto que el programa actual, así que el bucle siempre termina.
import {
  CLASE_POR_OMISION,
  literal,
  renderizarPrograma,
  type Caso,
  type Declaracion,
  type Expr,
  type Programa,
  type Sentencia,
  type SentenciaDeExpr,
} from './programa.ts';

/** Un candidato a evaluar: el programa ya impreso y la posición, entre los que se reducen, del programa del que salió. */
export interface CandidatoDeReduccion {
  readonly indice: number;
  readonly fuente: string;
}

/** ¿Cada uno de estos candidatos conserva la discrepancia de SU programa? Un veredicto por candidato, en orden. */
export type Conserva = (candidatos: readonly CandidatoDeReduccion[]) => Promise<readonly boolean[]>;

// ---- Candidatos que quitan sentencias ----

/** Alternativas de UNA sentencia compuesta (cada una es la lista de sentencias que la reemplaza). */
function variantesDeSentencia(sentencia: Sentencia): (readonly Sentencia[])[] {
  switch (sentencia.k) {
    case 'si': {
      const variantes: (readonly Sentencia[])[] = [sentencia.entonces];
      if (sentencia.sino !== null) variantes.push(sentencia.sino, [{ ...sentencia, sino: null }]);
      for (const cuerpo of variantesDeLista(sentencia.entonces)) variantes.push([{ ...sentencia, entonces: cuerpo }]);
      if (sentencia.sino !== null) for (const cuerpo of variantesDeLista(sentencia.sino)) variantes.push([{ ...sentencia, sino: cuerpo }]);
      return variantes;
    }
    case 'mientras':
    case 'haz':
      return [sentencia.cuerpo, ...variantesDeLista(sentencia.cuerpo).map((cuerpo) => [{ ...sentencia, cuerpo }])];
    case 'para': {
      const conInicial: readonly Sentencia[] = sentencia.inicial === null ? sentencia.cuerpo : [sentencia.inicial, ...sentencia.cuerpo];
      return [sentencia.cuerpo, conInicial, ...variantesDeLista(sentencia.cuerpo).map((cuerpo) => [{ ...sentencia, cuerpo }])];
    }
    case 'seleccion': {
      const variantes: (readonly Sentencia[])[] = sentencia.casos.map((_, i) => [{ ...sentencia, casos: sentencia.casos.filter((__, j) => j !== i) }]);
      // Tarea 1.34: las sentencias de antes del primer `case`: quitarlas todas, quitar una o entrar a lo que contiene una compuesta.
      const antes = sentencia.antes ?? [];
      if (antes.length > 0) {
        variantes.push([{ ...sentencia, antes: [] }]);
        for (const lista of variantesDeLista(antes)) variantes.push([{ ...sentencia, antes: lista }]);
      }
      sentencia.casos.forEach((caso, i) => {
        for (const cuerpo of variantesDeLista(caso.cuerpo)) {
          variantes.push([{ ...sentencia, casos: sentencia.casos.map((c, j): Caso => (j === i ? { ...c, cuerpo } : c)) }]);
        }
      });
      return variantes;
    }
    case 'bloque':
      return [sentencia.sentencias, ...variantesDeLista(sentencia.sentencias).map((sentencias) => [{ ...sentencia, sentencias }])];
    case 'declaracion':
    case 'expresion':
    case 'salto':
      return [];
  }
}

/** Alternativas de una lista de sentencias: quedarse con una, quitar una, o reducir por dentro una compuesta. */
function variantesDeLista(lista: readonly Sentencia[]): (readonly Sentencia[])[] {
  const variantes: (readonly Sentencia[])[] = [];
  if (lista.length >= 2) lista.forEach((sentencia) => variantes.push([sentencia]));
  lista.forEach((_, i) => variantes.push(lista.filter((__, j) => j !== i)));
  lista.forEach((sentencia, i) => {
    for (const reemplazo of variantesDeSentencia(sentencia)) variantes.push([...lista.slice(0, i), ...reemplazo, ...lista.slice(i + 1)]);
  });
  return variantes;
}

function soloLosMasCortos(original: Programa, candidatos: readonly Programa[]): Programa[] {
  const largo = renderizarPrograma(original).length;
  const vistos = new Set<string>();
  return candidatos.filter((candidato) => {
    const texto = renderizarPrograma(candidato);
    if (texto.length >= largo || vistos.has(texto)) return false;
    vistos.add(texto);
    return true;
  });
}

/**
 * Candidatos de un paso que solo tocan la estructura: quitar sentencias, bajar al cuerpo de una compuesta, quitar imports y (tarea 1.34)
 * devolverle a la clase el nombre `P`. Este último va al FINAL: primero se quita todo lo que se pueda y solo entonces se prueba si la
 * discrepancia depende del nombre de la clase; si no depende, el mínimo sale con `P` y la familia no se atribuye al nombre.
 */
export function variantesDeSentencias(programa: Programa): Programa[] {
  const conOtrasSentencias = variantesDeLista(programa.sentencias).map((sentencias): Programa => ({ ...programa, sentencias }));
  const sinUnImport = programa.imports.map((_, i): Programa => ({ ...programa, imports: programa.imports.filter((__, j) => j !== i) }));
  const conClasePorOmision: Programa[] =
    programa.clase === undefined || programa.clase === CLASE_POR_OMISION ? [] : [{ imports: programa.imports, sentencias: programa.sentencias }];
  return soloLosMasCortos(programa, [...conOtrasSentencias, ...sinUnImport, ...conClasePorOmision]);
}

// ---- Candidatos que simplifican expresiones ----

const LITERAL_MINIMO_POR_TIPO: Readonly<Record<string, string>> = {
  int: '0', long: '0L', double: '0.0', boolean: 'true', char: "'a'", String: '""',
  Integer: '0', Long: '0L', Double: '0.0', Boolean: 'true', Character: "'a'", float: '0f', byte: '0', short: '0',
};

/** Alternativas de una expresión: su literal mínimo, cada una de sus partes, o una de sus partes simplificada. */
function variantesDeExpr(expr: Expr): Expr[] {
  const variantes: Expr[] = [];
  const minimo = LITERAL_MINIMO_POR_TIPO[expr.tipo];
  if (minimo !== undefined) variantes.push(literal(minimo, expr.tipo));
  variantes.push(...expr.hijos);
  expr.hijos.forEach((hijo, i) => {
    for (const variante of variantesDeExpr(hijo)) variantes.push({ ...expr, hijos: expr.hijos.map((h, j) => (j === i ? variante : h)) });
  });
  return variantes;
}

function esDeclaracionOExpresion(sentencia: Sentencia): sentencia is Declaracion | SentenciaDeExpr {
  return sentencia.k === 'declaracion' || sentencia.k === 'expresion';
}

/** Alternativas de UNA sentencia en las que solo cambia una de sus expresiones (o su `final` o su valor inicial). */
function variantesDeExpresionesDeSentencia(sentencia: Sentencia): Sentencia[] {
  switch (sentencia.k) {
    case 'declaracion': {
      const variantes: Sentencia[] = [];
      if (sentencia.inicial !== null) {
        variantes.push({ ...sentencia, inicial: null });
        for (const inicial of variantesDeExpr(sentencia.inicial)) variantes.push({ ...sentencia, inicial });
      }
      if (sentencia.esFinal) variantes.push({ ...sentencia, esFinal: false });
      return variantes;
    }
    case 'expresion':
      return variantesDeExpr(sentencia.expr).map((expr) => ({ ...sentencia, expr }));
    case 'si':
      return [
        ...variantesDeExpr(sentencia.condicion).map((condicion) => ({ ...sentencia, condicion })),
        ...variantesDeExpresionesEnLista(sentencia.entonces).map((entonces) => ({ ...sentencia, entonces })),
        ...(sentencia.sino === null ? [] : variantesDeExpresionesEnLista(sentencia.sino).map((sino) => ({ ...sentencia, sino }))),
      ];
    case 'mientras':
    case 'haz':
      return [
        ...variantesDeExpr(sentencia.condicion).map((condicion) => ({ ...sentencia, condicion })),
        ...variantesDeExpresionesEnLista(sentencia.cuerpo).map((cuerpo) => ({ ...sentencia, cuerpo })),
      ];
    case 'para': {
      const variantes: Sentencia[] = [];
      if (sentencia.inicial !== null) {
        variantes.push({ ...sentencia, inicial: null });
        for (const inicial of variantesDeExpresionesDeSentencia(sentencia.inicial)) {
          if (esDeclaracionOExpresion(inicial)) variantes.push({ ...sentencia, inicial });
        }
      }
      if (sentencia.condicion !== null) {
        variantes.push({ ...sentencia, condicion: null });
        for (const condicion of variantesDeExpr(sentencia.condicion)) variantes.push({ ...sentencia, condicion });
      }
      if (sentencia.paso !== null) {
        variantes.push({ ...sentencia, paso: null });
        for (const paso of variantesDeExpr(sentencia.paso)) variantes.push({ ...sentencia, paso });
      }
      for (const cuerpo of variantesDeExpresionesEnLista(sentencia.cuerpo)) variantes.push({ ...sentencia, cuerpo });
      return variantes;
    }
    case 'seleccion': {
      const variantes: Sentencia[] = variantesDeExpr(sentencia.selector).map((selector) => ({ ...sentencia, selector }));
      for (const antes of variantesDeExpresionesEnLista(sentencia.antes ?? [])) variantes.push({ ...sentencia, antes });
      sentencia.casos.forEach((caso, i) => {
        const conCaso = (nuevo: Caso): Sentencia => ({ ...sentencia, casos: sentencia.casos.map((c, j) => (j === i ? nuevo : c)) });
        if (caso.etiquetas !== 'default') {
          const etiquetas = caso.etiquetas;
          if (etiquetas.length > 1) etiquetas.forEach((_, k) => variantes.push(conCaso({ ...caso, etiquetas: etiquetas.filter((__, m) => m !== k) })));
          etiquetas.forEach((etiqueta, k) => {
            for (const variante of variantesDeExpr(etiqueta)) variantes.push(conCaso({ ...caso, etiquetas: etiquetas.map((e, m) => (m === k ? variante : e)) }));
          });
        }
        for (const cuerpo of variantesDeExpresionesEnLista(caso.cuerpo)) variantes.push(conCaso({ ...caso, cuerpo }));
      });
      return variantes;
    }
    case 'bloque':
      return variantesDeExpresionesEnLista(sentencia.sentencias).map((sentencias) => ({ ...sentencia, sentencias }));
    case 'salto':
      return [];
  }
}

function variantesDeExpresionesEnLista(lista: readonly Sentencia[]): (readonly Sentencia[])[] {
  return lista.flatMap((sentencia, i) => variantesDeExpresionesDeSentencia(sentencia).map((variante) => [...lista.slice(0, i), variante, ...lista.slice(i + 1)]));
}

/** Candidatos de un paso que solo tocan una expresión: su literal mínimo, una de sus partes, sin valor inicial, sin `final`. */
export function variantesDeExpresiones(programa: Programa): Programa[] {
  return soloLosMasCortos(
    programa,
    variantesDeExpresionesEnLista(programa.sentencias).map((sentencias): Programa => ({ ...programa, sentencias })),
  );
}

// ---- El bucle de reducción por rondas ----

type Etapa = 'sentencias' | 'expresiones';

interface EstadoDeReduccion {
  readonly indice: number;
  actual: Programa;
  etapa: Etapa;
  terminado: boolean;
}

const MAXIMO_DE_RONDAS = 400;

/**
 * Reduce cada programa de `iniciales` al más chico que conserva la propiedad de `conserva`. Devuelve
 * los programas reducidos, en el mismo orden. Cada ronda hace UN llamado a `conserva` con los
 * candidatos de todos los programas que aún se pueden reducir.
 */
export async function reducirEnRondas(iniciales: readonly Programa[], conserva: Conserva): Promise<Programa[]> {
  const estados: EstadoDeReduccion[] = iniciales.map((actual, indice) => ({ indice, actual, etapa: 'sentencias', terminado: false }));
  for (let ronda = 0; ronda < MAXIMO_DE_RONDAS; ronda += 1) {
    const enCurso = estados.filter((estado) => !estado.terminado);
    if (enCurso.length === 0) break;
    const propuestas = enCurso.map((estado) => ({
      estado,
      candidatos: estado.etapa === 'sentencias' ? variantesDeSentencias(estado.actual) : variantesDeExpresiones(estado.actual),
    }));
    const evaluables = propuestas.flatMap(({ estado, candidatos }) => candidatos.map((candidato) => ({ indice: estado.indice, fuente: renderizarPrograma(candidato) })));
    const veredictos = evaluables.length === 0 ? [] : await conserva(evaluables);
    let cursor = 0;
    for (const { estado, candidatos } of propuestas) {
      const propios = veredictos.slice(cursor, cursor + candidatos.length);
      cursor += candidatos.length;
      const elegido = propios.findIndex((sirve) => sirve);
      if (elegido !== -1) {
        estado.actual = candidatos[elegido]!;
        estado.etapa = 'sentencias';
      } else if (estado.etapa === 'sentencias') {
        estado.etapa = 'expresiones';
      } else {
        estado.terminado = true;
      }
    }
  }
  return estados.map((estado) => estado.actual);
}
