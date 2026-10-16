// Los paquetes de los módulos del sistema del JDK que midió el oráculo (tarea 1.39, W-16 de la tarea 1.38): el dato crudo `corpus/datos/api/paquetes-de-modulos.jsonl` (ADR 010), del que el generador
// diferencial saca los nombres de sus `package` de módulo — ningún nombre escrito a mano, para que el vocabulario del generador no pueda quedarse atrás de lo que el JDK real hace. Se lee la primera vez
// que se pide (no al importar) y se guarda.
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DesenlaceDelPaquete } from '../generar-datos.ts';

const RAIZ_PROYECTO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RUTA_PAQUETES_DE_MODULOS = resolve(RAIZ_PROYECTO, 'corpus', 'datos', 'api', 'paquetes-de-modulos.jsonl');

let medidos: ReadonlyMap<DesenlaceDelPaquete, readonly string[]> | null = null;

/** Los paquetes de módulos con ese desenlace, ordenados por nombre (el orden del dato crudo, para que la misma semilla dé el mismo programa). */
export function paquetesDeModulosConDesenlace(desenlace: DesenlaceDelPaquete): readonly string[] {
  if (medidos === null) {
    const porDesenlace = new Map<DesenlaceDelPaquete, string[]>();
    for (const linea of readFileSync(RUTA_PAQUETES_DE_MODULOS, 'utf-8').split('\n')) {
      if (linea === '') continue;
      const { paquete, desenlace: delPaquete } = JSON.parse(linea) as { paquete: string; desenlace: DesenlaceDelPaquete };
      porDesenlace.set(delPaquete, [...(porDesenlace.get(delPaquete) ?? []), paquete]);
    }
    medidos = porDesenlace;
  }
  const paquetes = medidos.get(desenlace);
  if (paquetes === undefined || paquetes.length === 0) {
    throw new Error(`${RUTA_PAQUETES_DE_MODULOS} no trae ningún paquete «${desenlace}»: corre "npm run oraculo:datos" para generarlo con el JDK real.`);
  }
  return paquetes;
}
