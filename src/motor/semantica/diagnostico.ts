// Forma compartida de un problema de ATRIBUCIÓN (tarea 1.7+, pasada 2 de ADR 004) — deliberadamente
// angosta, como `NoSoportadoColectado` en `sintaxis/no-soportado.ts`: ni `categoria` explícita
// (normalmente 'error-compilacion' en esta pasada) ni `linea` (la calcula quien la conecte a
// `compilador.ts`, tarea 1.14, igual que ya hace esa tarea con los avisos NO-DISP) — solo lo que
// esta pasada sabe de verdad.
//
// Corrección obligatoria (sub-lote 1-D2c, ADR 004 punto 2): "miembros existentes no soportados de
// clases soportadas" (`s.split`, `Math.sin`…) es un aviso NO-DISP real de la propia pasada de
// ATRIBUCIÓN (design.md §2.6 fila "Atribución"), no de sintaxis — `atribuir` necesita poder
// devolver ESE tipo de problema junto con los errores de tipo/símbolo de siempre, y
// `compilador.ts` necesita saber distinguirlos (`categoria`) para no reportarlos como
// 'error-compilacion'.
//
// Tarea 1.28: unión discriminada (mismo mecanismo que `Problema`, `problemas.ts`) — el código
// estrecha los datos: `problemas.push({ codigo: 'variable-no-declarada', rango, datos: {} })` ya no
// compila. Sin `categoria` (el caso normal, de siempre) es un error de compilación; solo un aviso
// de biblioteca no soportada (sub-lote 1-D2c) trae `categoria: 'no-disponible'` explícita.
import type { Rango } from '../fuente/rango.ts';
import type { CodigoProblema, DatosPorCodigoProblema } from '../problemas.ts';
import type { ConDatosPorCodigo } from '../no-soportado.ts';

export type ProblemaAtribucion =
  | {
      readonly [C in CodigoProblema]: {
        readonly codigo: C;
        readonly categoria?: undefined;
        readonly rango: Rango;
        readonly datos: DatosPorCodigoProblema[C];
      };
    }[CodigoProblema]
  | ConDatosPorCodigo<{ readonly categoria: 'no-disponible'; readonly rango: Rango }>;
