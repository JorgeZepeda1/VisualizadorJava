// Generador de programas pequeños del subconjunto U3–U7 (tarea 1.31): una clase `P` con `main` y de 1 a
// 6 sentencias, guiado por tipos y DETERMINISTA por semilla. Cada programa sale de la semilla de la
// campaña y de su posición (`semillaDelPrograma`), así que `generarPrograma(s, k)` no depende de cuántos
// se pidan. Casi la mitad de los programas rompen una regla de Java a propósito: el veredicto de javac
// (no el generador) decide cuáles compilan.
import { crearAzar, semillaDelPrograma } from './azar.ts';
import { cargarCatalogoApi, type CatalogoApi } from './catalogo-api.ts';
import { comenzarSentencia, crearEntorno } from './entorno.ts';
import { PARES_DE_CAST_DEL_SUBCONJUNTO, PLANTILLAS, castConPar } from './plantillas.ts';
import { renderizarPrograma, type Programa, type Sentencia } from './programa.ts';

// Tamaño del cuerpo de `main`, con su peso: pocos de una sentencia, la mayoría de 2 a 4.
const TAMANOS: readonly (readonly [peso: number, sentencias: number])[] = [[8, 1], [22, 2], [26, 3], [22, 4], [14, 5], [8, 6]];

// Estratificación: 1 de cada 8 programas EMPIEZA con un cast cuyo par (origen, destino) recorre los 64 pares
// de los tipos del subconjunto en orden. Así ningún par depende de la suerte del azar: cada uno sale al
// menos una vez cada 512 programas, cualquiera que sea la semilla (pruebas/cobertura: los 64 pares).
const PERIODO_DE_LOS_CASTS_ESTRATIFICADOS = 8;

const PROBABILIDAD_DE_OLVIDAR_EL_IMPORT = 0.08;
const IMPORTS_DE_SOBRA: readonly string[] = ['import java.util.*;', 'import java.util.Scanner;', 'import java.util.Random;', 'import java.io.*;'];

let catalogoCompartido: CatalogoApi | null = null;
/** El catálogo es de solo lectura: compartirlo entre programas no afecta el determinismo. */
function catalogo(): CatalogoApi {
  catalogoCompartido ??= cargarCatalogoApi();
  return catalogoCompartido;
}

function importsDe(cuerpo: readonly Sentencia[], azar: ReturnType<typeof crearAzar>): string[] {
  const texto = renderizarPrograma({ imports: [], sentencias: cuerpo });
  const imports: string[] = [];
  for (const clase of ['Scanner', 'Random']) {
    if (new RegExp(`\\b${clase}\\b`).test(texto) && !azar.probabilidad(PROBABILIDAD_DE_OLVIDAR_EL_IMPORT)) imports.push(`import java.util.${clase};`);
  }
  // A veces un import que el programa no necesita (javac no se queja de los imports de sobra).
  if (azar.probabilidad(0.02)) {
    const sobra = azar.elegir(IMPORTS_DE_SOBRA);
    if (!imports.includes(sobra)) imports.push(sobra);
  }
  return imports;
}

export function generarPrograma(semilla: number, indice: number): Programa {
  const azar = crearAzar(semillaDelPrograma(semilla, indice));
  const entorno = crearEntorno(azar, catalogo());
  const objetivo = azar.ponderado(TAMANOS);
  const sentencias: Sentencia[] = [];
  if (indice % PERIODO_DE_LOS_CASTS_ESTRATIFICADOS === 0) {
    const par = PARES_DE_CAST_DEL_SUBCONJUNTO[(indice / PERIODO_DE_LOS_CASTS_ESTRATIFICADOS) % PARES_DE_CAST_DEL_SUBCONJUNTO.length]!;
    comenzarSentencia(entorno);
    sentencias.push(...castConPar(entorno, par.origen, par.destino));
  }
  while (sentencias.length < objetivo) {
    const plantilla = azar.ponderado(PLANTILLAS.map((p) => [p.peso, p] as const));
    comenzarSentencia(entorno);
    sentencias.push(...plantilla.generar(entorno));
  }
  const cuerpo = sentencias.slice(0, objetivo);
  return { imports: importsDe(cuerpo, azar), sentencias: cuerpo };
}

export function generarProgramas(semilla: number, cantidad: number): Programa[] {
  return Array.from({ length: cantidad }, (_, indice) => generarPrograma(semilla, indice));
}
