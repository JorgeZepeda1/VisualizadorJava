// Generador de programas pequeños del subconjunto U3–U7 (tarea 1.31): una clase `P` con `main` y de 1 a
// 6 sentencias, guiado por tipos y DETERMINISTA por semilla. Cada programa sale de la semilla de la
// campaña y de su posición (`semillaDelPrograma`), así que `generarPrograma(s, k)` no depende de cuántos
// se pidan. Casi la mitad de los programas rompen una regla de Java a propósito: el veredicto de javac
// (no el generador) decide cuáles compilan.
import { crearAzar, semillaDelPrograma } from './azar.ts';
import { cargarCatalogoApi, type CatalogoApi } from './catalogo-api.ts';
import { comenzarSentencia, crearEntorno } from './entorno.ts';
import { PARES_DE_CAST_DEL_SUBCONJUNTO, PLANTILLAS, castConPar, literalRaroNumero, usoDeLaClase } from './plantillas.ts';
import { CLASE_POR_OMISION, renderizarPrograma, type Programa, type Sentencia } from './programa.ts';
import { NOMBRES_DE_CLASE_DEL_JDK } from './vocabulario.ts';

// Tamaño del cuerpo de `main`, con su peso: pocos de una sentencia, la mayoría de 2 a 4.
const TAMANOS: readonly (readonly [peso: number, sentencias: number])[] = [[8, 1], [22, 2], [26, 3], [22, 4], [14, 5], [8, 6]];

// Estratificación: 1 de cada 8 programas EMPIEZA con un cast cuyo par (origen, destino) recorre los 64 pares
// de los tipos del subconjunto en orden. Así ningún par depende de la suerte del azar: cada uno sale al
// menos una vez cada 512 programas, cualquiera que sea la semilla (pruebas/cobertura: los 64 pares).
const PERIODO_DE_LOS_CASTS_ESTRATIFICADOS = 8;

// Tarea 1.34: 1 de cada 16 programas (el índice 3 de cada dieciséis) lleva una forma de literal raro, recorriendo `LITERALES_RAROS` en orden: las ocho formas de
// guion bajo y de flotante hexadecimal de la 1.33 salían del sorteo y una faltaba en la muestra apenas se tocaba el reparto de las plantillas.
const PERIODO_DE_LOS_LITERALES_ESTRATIFICADOS = 16;
const FASE_DE_LOS_LITERALES_ESTRATIFICADOS = 3;

// Tarea 1.34 (familia C): 1 de cada 20 programas (el índice 7 de cada veinte) lleva una clase con nombre de una clase del JDK, y el nombre recorre
// `NOMBRES_DE_CLASE_DEL_JDK` en orden: cada uno sale cada 220 programas con cualquier semilla, y la primera sentencia del cuerpo USA ese nombre.
// El índice 7 de cada veinte nunca es múltiplo de 8, así que no choca con el cast estratificado.
const PERIODO_DE_LAS_CLASES_DEL_JDK = 20;
const FASE_DE_LAS_CLASES_DEL_JDK = 7;

const PROBABILIDAD_DE_OLVIDAR_EL_IMPORT = 0.08;
// Tarea 1.34: cuando la CLASE del programa es `Scanner` o `Random`, el import (o su falta) es lo que decide el error («ya está definida» frente a un
// constructor que la clase no tiene): se omite en 4 de cada 10 programas, no en 8 de cada 100, para ver las dos formas en cualquier muestra.
const PROBABILIDAD_DE_OLVIDAR_EL_IMPORT_DE_LA_CLASE = 0.4;
// Tarea 1.34: en 35 de cada 100 programas de nombre del JDK el cuerpo es SOLO el uso de ese nombre. Con otras sentencias al azar, casi todo programa de esa
// familia se rompe por otra cosa (una variable `String` de una clase que se llama `String`…) y no quedan controles válidos de la regla (`Math m = null;`,
// `Math.main(args);`), que son los que revelan un falso rechazo.
const PROBABILIDAD_DE_QUE_LA_CLASE_USE_SOLO_SU_NOMBRE = 0.35;
const IMPORTS_DE_SOBRA: readonly string[] = ['import java.util.*;', 'import java.util.Scanner;', 'import java.util.Random;', 'import java.io.*;'];

let catalogoCompartido: CatalogoApi | null = null;
/** El catálogo es de solo lectura: compartirlo entre programas no afecta el determinismo. */
function catalogo(): CatalogoApi {
  catalogoCompartido ??= cargarCatalogoApi();
  return catalogoCompartido;
}

/** El nombre de la clase del programa `indice`: `P`, salvo uno de cada veinte, que usurpa el nombre de una clase del JDK. */
function claseDelPrograma(indice: number): string {
  if (indice % PERIODO_DE_LAS_CLASES_DEL_JDK !== FASE_DE_LAS_CLASES_DEL_JDK) return CLASE_POR_OMISION;
  return NOMBRES_DE_CLASE_DEL_JDK[Math.floor(indice / PERIODO_DE_LAS_CLASES_DEL_JDK) % NOMBRES_DE_CLASE_DEL_JDK.length]!;
}

function importsDe(cuerpo: readonly Sentencia[], azar: ReturnType<typeof crearAzar>, clase: string): string[] {
  // El texto incluye la declaración de la clase: una clase `Scanner` «usa» Scanner y casi siempre trae su import (el error «ya está definida»).
  const texto = renderizarPrograma({ imports: [], clase, sentencias: cuerpo });
  const imports: string[] = [];
  for (const usada of ['Scanner', 'Random']) {
    const olvido = usada === clase ? PROBABILIDAD_DE_OLVIDAR_EL_IMPORT_DE_LA_CLASE : PROBABILIDAD_DE_OLVIDAR_EL_IMPORT;
    if (new RegExp(`\\b${usada}\\b`).test(texto) && !azar.probabilidad(olvido)) imports.push(`import java.util.${usada};`);
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
  const clase = claseDelPrograma(indice);
  const entorno = crearEntorno(azar, catalogo(), undefined, clase);
  const objetivo = azar.ponderado(TAMANOS);
  const sentencias: Sentencia[] = [];
  if (indice % PERIODO_DE_LOS_CASTS_ESTRATIFICADOS === 0) {
    const par = PARES_DE_CAST_DEL_SUBCONJUNTO[(indice / PERIODO_DE_LOS_CASTS_ESTRATIFICADOS) % PARES_DE_CAST_DEL_SUBCONJUNTO.length]!;
    comenzarSentencia(entorno);
    sentencias.push(...castConPar(entorno, par.origen, par.destino));
  }
  if (indice % PERIODO_DE_LOS_LITERALES_ESTRATIFICADOS === FASE_DE_LOS_LITERALES_ESTRATIFICADOS) {
    comenzarSentencia(entorno);
    sentencias.push(...literalRaroNumero(entorno, Math.floor(indice / PERIODO_DE_LOS_LITERALES_ESTRATIFICADOS)));
  }
  // La clase con nombre del JDK se ejerce SIEMPRE: la primera sentencia usa ese nombre (y no se recorta aunque `usoDeLaClase` traiga dos).
  if (clase !== CLASE_POR_OMISION) {
    comenzarSentencia(entorno);
    sentencias.push(...usoDeLaClase(entorno));
  }
  // Las sentencias estratificadas (cast, literal, uso de la clase) nunca se recortan: son la razón de que el programa exista.
  const minimo = sentencias.length;
  const largo = clase !== CLASE_POR_OMISION && azar.probabilidad(PROBABILIDAD_DE_QUE_LA_CLASE_USE_SOLO_SU_NOMBRE) ? minimo : objetivo;
  while (sentencias.length < largo) {
    const plantilla = azar.ponderado(PLANTILLAS.map((p) => [p.peso, p] as const));
    comenzarSentencia(entorno);
    sentencias.push(...plantilla.generar(entorno));
  }
  const cuerpo = sentencias.slice(0, Math.max(largo, minimo));
  return clase === CLASE_POR_OMISION ? { imports: importsDe(cuerpo, azar, clase), sentencias: cuerpo } : { imports: importsDe(cuerpo, azar, clase), clase, sentencias: cuerpo };
}

export function generarProgramas(semilla: number, cantidad: number): Programa[] {
  return Array.from({ length: cantidad }, (_, indice) => generarPrograma(semilla, indice));
}
