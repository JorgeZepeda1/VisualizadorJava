// Plan de evaluación (tarea 2.16, design.md §3.1): la lista de los puntos de una expresión en el ORDEN en que Java los evalúa. `generarIr`
// arma el árbol sin números (`punto: -1`); aquí se recorre en el orden de Java y se devuelve otro árbol con el `punto` de cada nodo:
//   - operaciones binarias: operando izquierdo, operando derecho, la operación (las conversiones de la promoción numérica son nodos
//     padre de su operando, así que quedan justo después de él);
//   - `x op= e`: primero la lectura previa de `x`, luego `e`, luego la asignación compuesta;
//   - una llamada: el objetivo, luego los argumentos en orden (los variables al final), luego la llamada.
// El intérprete anota el valor de cada punto en `Paso.valores[punto]`; un punto que no se evaluó (corto circuito) queda `null`.
import type { ExpresionIr, PuntoDelPlan } from './ir.ts';

export class ConstructorDePlan {
  private readonly lista: PuntoDelPlan[] = [];

  /** Agrega un punto y devuelve su índice. */
  agregar(punto: PuntoDelPlan): number {
    this.lista.push(punto);
    return this.lista.length - 1;
  }

  get puntos(): readonly PuntoDelPlan[] {
    return this.lista;
  }
}

/** Numera `expresion` (y todo lo que contiene) en orden de evaluación de Java, dejando sus puntos en `plan`. Devuelve el árbol con `punto` asignado. */
export function numerarExpresion(expresion: ExpresionIr, plan: ConstructorDePlan): ExpresionIr {
  switch (expresion.forma) {
    case 'constante':
      return { ...expresion, punto: plan.agregar({ forma: 'constante', tipo: expresion.tipo, rango: expresion.rango }) };
    case 'lectura':
      return { ...expresion, punto: plan.agregar({ forma: 'lectura', tipo: expresion.tipo, rango: expresion.rango, nombre: expresion.nombre }) };
    case 'conversion': {
      const operando = numerarExpresion(expresion.operando, plan);
      const punto = plan.agregar({ forma: 'conversion', tipo: expresion.tipo, rango: expresion.rango, de: expresion.de, implicita: expresion.implicita });
      return { ...expresion, operando, punto };
    }
    case 'aritmetica':
    case 'comparacion':
    case 'logica':
    case 'concatenacion': {
      const izquierda = numerarExpresion(expresion.izquierda, plan);
      const derecha = numerarExpresion(expresion.derecha, plan);
      const punto = plan.agregar({ forma: expresion.forma, tipo: expresion.tipo, rango: expresion.rango });
      return { ...expresion, izquierda, derecha, punto };
    }
    case 'menos':
    case 'negacion': {
      const operando = numerarExpresion(expresion.operando, plan);
      const punto = plan.agregar({ forma: expresion.forma, tipo: expresion.tipo, rango: expresion.rango });
      return { ...expresion, operando, punto };
    }
    case 'asignacion': {
      const valor = numerarExpresion(expresion.valor, plan);
      const punto = plan.agregar({ forma: 'asignacion', tipo: expresion.tipo, rango: expresion.rango, nombre: expresion.nombre });
      return { ...expresion, valor, punto };
    }
    case 'asignacion-compuesta': {
      const lectura = numerarExpresion(expresion.lectura, plan);
      const valor = numerarExpresion(expresion.valor, plan);
      const punto = plan.agregar({ forma: 'asignacion-compuesta', tipo: expresion.tipo, rango: expresion.rango, nombre: expresion.nombre });
      return { ...expresion, lectura: lectura as typeof expresion.lectura, valor, punto };
    }
    case 'incremento':
      return { ...expresion, punto: plan.agregar({ forma: 'incremento', tipo: expresion.tipo, rango: expresion.rango, nombre: expresion.nombre }) };
    case 'llamada': {
      const receptor = expresion.receptor === null ? null : numerarExpresion(expresion.receptor, plan);
      const argumentos = expresion.argumentos.map((argumento) => numerarExpresion(argumento, plan));
      const variables = expresion.variables === null ? null : expresion.variables.map((variable) => numerarExpresion(variable, plan));
      const punto = plan.agregar({ forma: 'llamada', tipo: expresion.tipo, rango: expresion.rango });
      return { ...expresion, receptor, argumentos, variables, punto };
    }
    case 'nuevo': {
      const argumentos = expresion.argumentos.map((argumento) => numerarExpresion(argumento, plan));
      const punto = plan.agregar({ forma: 'nuevo', tipo: expresion.tipo, rango: expresion.rango });
      return { ...expresion, argumentos, punto };
    }
  }
}
