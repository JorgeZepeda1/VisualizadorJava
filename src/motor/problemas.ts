// Modelo de problemas (design.md §2.2). Catálogo cerrado de `CodigoProblema` (tarea 1.11) sobre
// los casos del subconjunto verificados en `exploracion/03-semantica-texto-entrada-errores.md` §4
// que caen en el ALCANCE de esta tarea — REQ-COMP-001 (tipos), REQ-COMP-002/003 (símbolo/alcance/
// sombreado) y un puñado de errores de sintaxis básicos (punto y coma, paréntesis) — MÁS el
// selector de `switch`/`break`/`continue` de la tarea 1.7. Los mensajes en español viven en
// `src/textos/es-MX/problemas.ts` (ADR 015: el motor nunca arma texto, solo emite código + datos).
//
// QUEDA FUERA de este cierre, a propósito (ver el reporte de la tarea 1.11 para el detalle
// completo de motivos por caso):
//   - Asignación definitiva (REQ-COMP-004, tarea 1.13) y alcanzabilidad (REQ-COMP-010, tarea
//     1.12): pasadas propias que todavía no existen — sus códigos se agregan cuando se construyan.
//   - Arranque (REQ-COMP-007/008, tarea 1.15): categoría `error-arranque` sin código propio
//     todavía (se muestra como excepción, design.md §2.2).
//   - Los códigos de "no disponible" (`sintaxis/no-soportado.ts`, el léxico y
//     `sintaxis/expresiones.ts`) — un catálogo YA organizado y probado desde 1.1-1.6/1.17, con su
//     propia tabla `CODIGOS_NO_SOPORTADO`; unificarlo aquí sería una tarea aparte de re-tipado
//     transversal, no lo que pide "errores de TIPO y SÍMBOLO". Por eso `Problema.codigo` sigue
//     aceptando `string` ADEMÁS de `CodigoProblema`: un `Problema` de categoría `no-disponible`
//     trae uno de esos códigos, no uno de los de aquí abajo.
import type { Rango } from './fuente/rango.ts';

export type Categoria = 'error-compilacion' | 'no-disponible' | 'error-arranque';

// Unión cerrada (tarea 1.11) de los códigos de ATRIBUCIÓN (tipo/símbolo/alcance, REQ-COMP-001/
// 002/003 + switch/break/continue de 1.7) y de un primer tramo de errores de SINTAXIS básicos.
export type CodigoProblema =
  // Sintaxis (pasada 1) — mapeados desde `ErrorDeCompilacion.esperado` en `compilador.ts`.
  | 'falta-punto-y-coma' // err01
  | 'falta-parentesis-cierre' // err23, err32
  | 'error-no-clasificado' // cualquier otro fallo de léxico/sintaxis (catch-all honesto, D2)
  // Símbolo y alcance (pasada 2, REQ-COMP-002/003).
  | 'variable-no-declarada' // err02
  | 'metodo-no-declarado' // err03
  | 'variable-ya-definida' // flow13, flow18, flow19
  | 'tipo-no-reconocido' // err18
  // Tipos (pasada 2, REQ-COMP-001).
  | 'conversion-con-perdida' // err04
  | 'tipos-incompatibles-en-asignacion' // err12
  | 'condicion-no-booleana' // err13, err33
  | 'tipos-incomparables' // err28
  | 'operandos-invalidos-operador-binario' // err35
  // `switch` (REQ-COMP-002, design.md §2.7).
  | 'selector-de-switch-invalido'
  | 'etiqueta-de-case-no-constante' // err34
  | 'etiqueta-de-case-duplicada' // flow05
  // Flujo (pendiente heredado 1 del sub-lote 1-B, verificado que vive en esta pasada).
  | 'break-fuera-de-contexto' // err29
  | 'continue-fuera-de-contexto'; // err30

export interface Problema {
  readonly categoria: Categoria;
  // "no disponible" trae un código del catálogo de `sintaxis/no-soportado.ts` (string, catálogo
  // aparte — ver cabecera); "error-compilacion"/"error-arranque" traen uno de `CodigoProblema`.
  readonly codigo: CodigoProblema | string;
  readonly codigoJavac?: string;
  readonly rango: Rango;
  readonly linea: number;
  readonly datos: Readonly<Record<string, unknown>>;
}

export type CausaFin =
  | 'terminado'
  | 'excepcion'
  | 'error-arranque'
  | 'no-disponible-en-ejecucion'
  | 'limite-pasos'
  | 'limite-caracteres'
  | 'limite-tiempo'
  | 'error-interno';
