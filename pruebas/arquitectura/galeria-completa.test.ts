// RED de la tarea R0.11 (REQ-AULA-001, ADR 017): la galería no deja programas sin texto ni textos sin programa. Todo `.java` de `corpus/curso/` y de `corpus/experimentos/ejercicios-del-po/` tiene su entrada
// en `textos/es-MX/galeria.ts` (título y «Qué observar»); toda entrada del catálogo tiene su programa; y toda `.entrada.txt` termina en salto de línea, como en NetBeans (cada renglón con su `\n`, byte a byte lo
// que usó el oráculo). Falla si alguien agrega un programa al corpus sin escribir su texto. Además, el `import.meta.glob` de esas carpetas vive SOLO en `src/interfaz/datos/` (ADR 017).
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ORDEN_DE_LA_GALERIA, textosGaleria } from '../../src/textos/es-MX/galeria.ts';

const RAIZ = resolve(import.meta.dirname, '..', '..');
const CURSO = join(RAIZ, 'corpus/curso');
const DEL_PO = join(RAIZ, 'corpus/experimentos/ejercicios-del-po');

const archivos = (carpeta: string, sufijo: string): string[] => readdirSync(carpeta).filter((nombre) => nombre.endsWith(sufijo)).sort();

/** Los ids de la galería que salen de una carpeta: el nombre del `.java` sin extensión (la máquina de snacks son cinco archivos con el mismo código y UN id). */
const idsDelCurso = archivos(CURSO, '.java').map((nombre) => nombre.slice(0, -'.java'.length));
const todosLosIdsDelCatalogo = ORDEN_DE_LA_GALERIA.flatMap((seccion) => seccion.programas);

describe('la galería cubre todo el corpus curricular y los ejercicios del PO', () => {
  it('hay 35 programas en corpus/curso y 5 archivos de la máquina de snacks (la prueba no recorre un conjunto vacío)', () => {
    expect(idsDelCurso).toHaveLength(35);
    expect(archivos(DEL_PO, '.java')).toHaveLength(5);
  });

  it('todo `.java` de corpus/curso tiene su entrada en el catálogo de la galería', () => {
    expect(idsDelCurso.filter((id) => !(todosLosIdsDelCatalogo as readonly string[]).includes(id))).toEqual([]);
  });

  it('toda entrada curricular del catálogo tiene su programa en corpus/curso (ningún texto huérfano)', () => {
    const curriculares = todosLosIdsDelCatalogo.filter((id) => id !== 'maquina-snacks');
    expect(curriculares.filter((id) => !idsDelCurso.includes(id))).toEqual([]);
  });

  it('la máquina de snacks del PO tiene sus cinco archivos de datos, los que dice el catálogo', () => {
    const delPo = archivos(DEL_PO, '.java').map((nombre) => nombre.slice(0, -'.java'.length));
    expect(textosGaleria.muestrasDeLaMaquinaDeSnacks.map((muestra) => muestra.archivo).sort()).toEqual(delPo);
  });

  it('el código de los cinco archivos de la máquina de snacks es el mismo (es UN programa con cinco datos de ejemplo)', () => {
    const codigos = archivos(DEL_PO, '.java').map((nombre) => readFileSync(join(DEL_PO, nombre), 'utf-8'));
    expect(new Set(codigos).size).toBe(1);
  });
});

describe('las entradas preparadas terminan en salto de línea (REQ-AULA-001: como en NetBeans)', () => {
  const entradas = [...archivos(CURSO, '.entrada.txt').map((nombre) => join(CURSO, nombre)), ...archivos(DEL_PO, '.entrada.txt').map((nombre) => join(DEL_PO, nombre))];

  it('hay 20 `.entrada.txt` (15 del curso y 5 de la máquina de snacks)', () => {
    expect(entradas).toHaveLength(20);
  });

  it('cada una termina en `\\n`, y su programa existe', () => {
    for (const ruta of entradas) {
      expect(readFileSync(ruta, 'utf-8').endsWith('\n'), ruta).toBe(true);
      expect(existsSync(ruta.replace(/\.entrada\.txt$/, '.java')), ruta).toBe(true);
    }
  });
});

describe('`import.meta.glob` del corpus vive solo en `src/interfaz/datos/` (ADR 017)', () => {
  function archivosDeCodigo(carpeta: string): string[] {
    return readdirSync(carpeta).flatMap((nombre) => {
      const ruta = join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) return archivosDeCodigo(ruta);
      return /\.(ts|tsx)$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
    });
  }

  /** El código sin comentarios: un comentario que nombra `import.meta.glob` (como los de la presentación, que explican por qué NO lo usan) no es un uso. */
  const sinComentarios = (codigo: string): string => codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  it('ningún archivo de `src/` fuera de `interfaz/datos/` usa `import.meta.glob`', () => {
    const archivos = archivosDeCodigo(join(RAIZ, 'src'));
    expect(archivos.length).toBeGreaterThan(100);
    const infractores = archivos
      .filter((ruta) => !ruta.includes(`${join('src', 'interfaz', 'datos')}`))
      .filter((ruta) => sinComentarios(readFileSync(ruta, 'utf-8')).includes('import.meta.glob'));
    expect(infractores).toEqual([]);
  });

  it('y la guarda atrapa un uso de verdad: el archivo de los datos, sin sus comentarios, sí lo contiene', () => {
    expect(sinComentarios(readFileSync(join(RAIZ, 'src/interfaz/datos/programas-crudos.ts'), 'utf-8'))).toContain('import.meta.glob');
  });

  it('y el archivo que sí lo usa existe y lo usa con `?raw` (texto crudo, diferido)', () => {
    const ruta = join(RAIZ, 'src/interfaz/datos/programas-crudos.ts');
    expect(existsSync(ruta)).toBe(true);
    const codigo = readFileSync(ruta, 'utf-8');
    expect(codigo).toContain('import.meta.glob');
    expect(codigo).toContain('?raw');
  });
});
