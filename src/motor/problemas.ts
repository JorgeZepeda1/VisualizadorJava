// Modelo de problemas (design.md §2.2). Catálogo cerrado de `CodigoProblema` (tarea 1.11) sobre
// los casos del subconjunto verificados en `exploracion/03-semantica-texto-entrada-errores.md` §4
// que caen en el ALCANCE de esta tarea — REQ-COMP-001 (tipos), REQ-COMP-002/003 (símbolo/alcance/
// sombreado) y un puñado de errores de sintaxis básicos (punto y coma, paréntesis) — MÁS el
// selector de `switch`/`break`/`continue` de la tarea 1.7. Los mensajes en español viven en
// `src/textos/es-MX/problemas.ts` (ADR 015: el motor nunca arma texto, solo emite código + datos).
//
// Alcanzabilidad (REQ-COMP-010, JLS 14.22, pasada 3 de ADR 004) se agregó en la tarea 1.12
// (sub-lote 1-D1, `semantica/alcanzabilidad.ts`) — un único código, `sentencia-inalcanzable`, sin
// distinguir la CAUSA (tras "return"/"break"/"continue", cuerpo de ciclo con condición constante
// `false`, cola de un ciclo con condición constante `true` sin `break`): el mensaje amable
// ("esta línea nunca se ejecuta") es el mismo en los 4 casos, igual que exige el escenario
// verificado de REQ-COMP-010.
//
// QUEDA FUERA de este cierre, a propósito (ver el reporte de la tarea 1.11 para el detalle
// completo de motivos por caso):
//   - Asignación definitiva (REQ-COMP-004, tarea 1.13): pasada propia que todavía no existe — sus
//     códigos se agregan cuando se construya.
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
  | 'continue-fuera-de-contexto' // err30
  // Deuda del commit 999a8ca (sub-lote 1-D1): 5 errores de sintaxis básicos + Scanner sin import,
  // los MÁS frecuentes de un alumno (exploracion/03 §4) — antes caían en el catch-all
  // "error-no-clasificado" (veredicto y línea correctos, sin texto propio).
  | 'else-sin-if' // err14
  | 'cadena-sin-cerrar' // err15
  | 'fin-de-archivo-inesperado' // err16
  | 'llave-de-cierre-sobrante' // err17
  | 'llave-de-metodo-faltante' // err22
  | 'paquete-despues-de-import' // struct07
  | 'tipo-requiere-import' // err20 (atribución, no sintaxis — Scanner/Random sin import)
  // Alcanzabilidad (pasada 3 de ADR 004, tarea 1.12, JLS 14.22, REQ-COMP-010).
  | 'sentencia-inalcanzable'
  // Asignación definitiva (pasada 4 de ADR 004, tarea 1.13, JLS 16, REQ-COMP-004). Un solo código
  // por causa (igual que "sentencia-inalcanzable" unifica 4 causas de JLS 14.22): el mensaje
  // amable no distingue "nunca se asignó" de "solo en una rama" de "el ciclo podría no correr" —
  // todas dicen lo mismo con la palabra correcta ("podría no tener un valor").
  | 'variable-posiblemente-no-asignada' // err05, err06, err09, err10, switch sin "default"
  | 'variable-final-reasignada'; // err10c (JLS 4.12.4 + 16.1: una "final" solo admite un valor)

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

// Tarea 1.15 (REQ-COMP-007/008, ADR 004 pasada 5 "arranque"; decisión del orquestador, design.md
// §2.2): a diferencia de `CodigoProblema` (categoría `error-compilacion`), esto NUNCA hace que
// `compilar()` devuelva `ok:false` -- javac SÍ compila un `main` sin `static` o una clase sin
// `main` (verificado, exploracion/03 §4.2). El problema real solo aparece al EJECUTAR, por eso
// vive junto a `CausaFin` (que ya tenía `'error-arranque'` reservado desde la rebanada vertical) y
// no junto a `CodigoProblema`.
export type CodigoArranque = 'sin-main' | 'main-no-static';

export interface ProblemaArranque {
  readonly codigo: CodigoArranque;
  /** El nombre REAL de la clase del alumno (`NodoClase.nombre`) -- nunca el nombre de ejemplo que
   * usó el oráculo para capturar `textoLanzador` (design.md §2.2: "se muestra tal cual" se refiere
   * a la ESTRUCTURA del mensaje real de Java, no a mostrarle al alumno la clase de otro). */
  readonly nombreClase: string;
  /** El texto EXACTO que capturó el oráculo del lanzador de JDK 17 real (es-MX), con el nombre de
   * clase de ejemplo sustituido por `nombreClase` -- incluidas sus rarezas (el `\n` LITERAL del
   * caso "sin main", ver `marcos-arranque.generado.ts`), sin reinterpretar nada más. Es el
   * "detalle secundario" de la decisión del orquestador; el texto amable ("texto principal") sale
   * del catálogo es-MX (`src/textos/es-MX/arranque.ts`) a partir de `codigo` + `nombreClase`. */
  readonly textoLanzador: string;
}
