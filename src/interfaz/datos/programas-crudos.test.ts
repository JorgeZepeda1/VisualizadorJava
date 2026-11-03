// RED de la tarea R0.11 (REQ-AULA-001, ADR 017): el fragmento DIFERIDO con el texto crudo de los programas de la galería. Es el único lugar con `import.meta.glob(…?raw)` de `corpus/curso/` y de los ejercicios
// del PO. Aquí se comprueba que trae TODOS los archivos, byte a byte lo que hay en el corpus (el oráculo usó esos mismos bytes), por nombre de archivo sin carpeta.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { archivosCrudos } from './programas-crudos.ts';

const RAIZ = resolve(import.meta.dirname, '..', '..', '..');
const CARPETAS = [join(RAIZ, 'corpus/curso'), join(RAIZ, 'corpus/experimentos/ejercicios-del-po')];

const delDisco = CARPETAS.flatMap((carpeta) => readdirSync(carpeta).filter((nombre) => nombre.endsWith('.java') || nombre.endsWith('.entrada.txt')).map((nombre) => ({ nombre, ruta: join(carpeta, nombre) })));

describe('archivosCrudos: el texto de los programas de la galería', () => {
  it('trae los 40 `.java` (35 del curso y 5 de la máquina de snacks) y las 20 entradas preparadas', () => {
    const nombres = Object.keys(archivosCrudos);
    expect(nombres.filter((nombre) => nombre.endsWith('.java'))).toHaveLength(40);
    expect(nombres.filter((nombre) => nombre.endsWith('.entrada.txt'))).toHaveLength(20);
  });

  it('cada archivo es idéntico, byte a byte, al del corpus (con los finales de línea de NetBeans)', () => {
    expect(delDisco).toHaveLength(60);
    for (const { nombre, ruta } of delDisco) expect(archivosCrudos[nombre], nombre).toBe(readFileSync(ruta, 'utf-8'));
  });

  it('las claves son nombres de archivo, sin carpeta ni ruta', () => {
    for (const nombre of Object.keys(archivosCrudos)) expect(nombre.includes('/'), nombre).toBe(false);
  });
});
