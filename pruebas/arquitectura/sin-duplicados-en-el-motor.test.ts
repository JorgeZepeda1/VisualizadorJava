// Guarda de la tarea 2.19 (hito 1, parte C): el intérprete (parte B) y la biblioteca (parte A) se escribieron por separado y declararon dos veces las mismas piezas (`CadenaJava`,
// `FaltaEntrada`, `FlujoDeSalida`…). Dos clases con el mismo nombre son dos tipos distintos para TypeScript y para `instanceof`: una `FaltaEntrada` de la biblioteca no la atrapa el
// `catch` del intérprete, y una `ExcepcionJava` que no sea una `ExcepcionDeEjecucion` termina como `error-interno`. Cada nombre exportado del motor se declara UNA sola vez.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const raiz = resolve(import.meta.dirname, '..', '..');
const motor = join(raiz, 'src', 'motor');

function archivosDeProduccion(directorio: string): string[] {
  return readdirSync(directorio, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) return archivosDeProduccion(ruta);
    return entrada.name.endsWith('.ts') && !entrada.name.endsWith('.test.ts') ? [ruta] : [];
  });
}

const DECLARACION_EXPORTADA = /^export (?:abstract )?(?:class|function|const|type|interface|enum) ([A-Za-z_0-9]+)/gm;

describe('el motor no declara dos veces el mismo nombre exportado (hito 1, parte C)', () => {
  const declaradoEn = new Map<string, string[]>();
  for (const archivo of archivosDeProduccion(motor)) {
    for (const coincidencia of readFileSync(archivo, 'utf-8').matchAll(DECLARACION_EXPORTADA)) {
      const nombre = coincidencia[1] as string;
      declaradoEn.set(nombre, [...(declaradoEn.get(nombre) ?? []), relative(raiz, archivo)]);
    }
  }

  it('el recorrido ve las declaraciones del motor (guarda contra un recorrido vacío)', () => {
    expect(declaradoEn.size).toBeGreaterThan(200);
    expect(declaradoEn.get('ExcepcionDeEjecucion')).toEqual(['src/motor/interprete/excepcion-de-ejecucion.ts']);
  });

  it('ningún nombre exportado aparece en dos archivos', () => {
    const repetidos = [...declaradoEn].filter(([, archivos]) => archivos.length > 1).map(([nombre, archivos]) => `${nombre}: ${archivos.join(' y ')}`);
    expect(repetidos).toEqual([]);
  });
});
