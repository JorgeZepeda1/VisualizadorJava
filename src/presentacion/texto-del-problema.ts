// Texto que ve el alumno para un problema del motor (tarea 1.28, decisión del PO 2026-09-29: «la
// pantalla muestra el texto real de cada problema (error o aviso) con su línea; el ícono, el título
// y el subrayado siguen en la 4.5»). El motor solo emite `categoria` + `codigo` + `datos` (ADR 015);
// aquí se elige el catálogo es-MX por categoría y se arma la frase — pura, sin DOM:
//   - `error-compilacion` → `textosProblemas`, con la línea antepuesta («Línea 3: …»).
//   - `no-disponible`     → `textosNoSoportado`, que ya dice «en la línea N» (no se antepone otra).
//   - arranque            → `textosArranque`, aparte: NO es un `Problema` (`compilar()` lo deja pasar
//                           con `ok:true`; llega al ejecutar, en `FinEjecucion.arranque`).
//
// Sin `as` ni `any`: `Problema` es una unión discriminada (`motor/problemas.ts`) que estrecha el
// código por categoría y los datos por código, y los catálogos son `Record<código, (datos) =>
// string>`. Las dos funciones genéricas de abajo son el único puente: TypeScript correlaciona el
// código con SUS datos porque el mismo parámetro de tipo `C` indexa el catálogo y los datos.
import type {
  CodigoNoSoportado,
  CodigoProblema,
  DatosPorCodigoNoSoportado,
  DatosPorCodigoProblema,
  Problema,
  ProblemaArranque,
} from '../motor/vista.ts';
import { textosArranque } from '../textos/es-MX/arranque.ts';
import { textosInterfaz } from '../textos/es-MX/interfaz.ts';
import { textosNoSoportado } from '../textos/es-MX/no-soportado.ts';
import { textosProblemas } from '../textos/es-MX/problemas.ts';

function textoDeAviso<C extends CodigoNoSoportado>(codigo: C, linea: number, datos: DatosPorCodigoNoSoportado[C]): string {
  return textosNoSoportado[codigo]({ linea, ...datos });
}

function textoDeError<C extends CodigoProblema>(codigo: C, datos: DatosPorCodigoProblema[C]): string {
  return textosProblemas[codigo](datos);
}

export function textoDelProblema(problema: Problema): string {
  switch (problema.categoria) {
    case 'no-disponible':
      return textoDeAviso(problema.codigo, problema.linea, problema.datos);
    case 'error-compilacion':
      return textosInterfaz.errorEnLinea(problema.linea, textoDeError(problema.codigo, problema.datos));
  }
}

/** El texto amable de un error de arranque (REQ-COMP-007/008), con el nombre REAL de la clase.
 * El detalle secundario, el texto exacto del lanzador de Java (`textoLanzador`), no se mezcla aquí:
 * ADR 015 punto 2 pide mostrarlo tal cual, y su lugar es la consola (lotes 3-4). */
export function textoDelArranque(arranque: ProblemaArranque): string {
  return textosArranque[arranque.codigo]({ nombreClase: arranque.nombreClase });
}
