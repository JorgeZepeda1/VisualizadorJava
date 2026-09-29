// Tarea 1.28 (agregada por el orquestador, decisión del PO 2026-09-29: «la pantalla muestra el
// texto real de cada problema (error o aviso) con su línea»). Verificación de PUNTA A PUNTA, con el
// mismo método que las tareas 1.25/1.26 (`compilar()` REAL + catálogo REAL, nunca datos
// fabricados): cada fuente del corpus que el motor rechaza produce, vía `textoDelProblema` (lo que
// llama la interfaz), un texto que el alumno puede leer — sin restos de interpolación
// (`undefined`, `NaN`, `[object`, `{nombre}`), sin jerga de JavaScript, con su línea y sin comillas
// invertidas crudas. Es la prueba que ninguna capa por separado puede dar: los datos de cada
// problema los arma el motor (`semantica/*.ts`, `compilador.ts`) y solo aquí se cruzan con los
// textos (`src/textos/es-MX`) de TODOS los códigos que el corpus alcanza. Vive en `pruebas/` porque
// necesita el motor completo y `presentacion` a la vez (matriz de capas, ADR 001).
//
// Fuentes (las de la medición previa de 1.28, más el catálogo de errores del oráculo):
// `corpus/mutantes/veredictos.jsonl` (2 625 mutantes de un solo token sobre los programas del
// curso), `corpus/compilacion/**` (avisos y errores de sintaxis del catálogo), `corpus/curso/*.java`
// (los programas del curso) y `corpus/experimentos/texto/*.java` (las fuentes REALES que compiló
// javac 17 para el catálogo de errores de exploracion/03 §4: la única muestra que alcanza los
// errores de asignación definitiva, `final` reasignada, `switch` mal armado, `break`/`continue`
// fuera de contexto, etc.).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import type { Problema, ProblemaArranque } from '../../src/motor/index.ts';
import { textoDelArranque, textoDelProblema } from '../../src/presentacion/texto-del-problema.ts';
import { segmentarCodigoEnLinea } from '../../src/presentacion/segmentos-de-codigo.ts';

const RAIZ = resolve('.');

interface FuenteDeCorpus {
  readonly id: string;
  readonly fuente: string;
}

function archivosJava(directorio: string): string[] {
  return readdirSync(directorio)
    .sort()
    .flatMap((nombre) => {
      const ruta = join(directorio, nombre);
      if (statSync(ruta).isDirectory()) return archivosJava(ruta);
      return nombre.endsWith('.java') ? [ruta] : [];
    });
}

function fuentesDelCorpus(): FuenteDeCorpus[] {
  const deArchivos = [
    ...archivosJava(resolve(RAIZ, 'corpus/compilacion')),
    ...archivosJava(resolve(RAIZ, 'corpus/curso')),
    ...archivosJava(resolve(RAIZ, 'corpus/experimentos/texto')),
  ].map((ruta) => ({ id: relative(RAIZ, ruta), fuente: readFileSync(ruta, 'utf-8') }));
  const mutantes = readFileSync(resolve(RAIZ, 'corpus/mutantes/veredictos.jsonl'), 'utf-8')
    .split('\n')
    .filter((linea) => linea.length > 0)
    .map((linea) => JSON.parse(linea) as { id: string; fuente: string })
    .map(({ id, fuente }) => ({ id: `corpus/mutantes#${id}`, fuente }));
  return [...deArchivos, ...mutantes];
}

interface ProblemaDeCorpus {
  readonly id: string;
  readonly problema: Problema;
}

function recorrerCorpus(): { problemas: ProblemaDeCorpus[]; arranques: { id: string; arranque: ProblemaArranque }[]; total: number } {
  const problemas: ProblemaDeCorpus[] = [];
  const arranques: { id: string; arranque: ProblemaArranque }[] = [];
  const fuentes = fuentesDelCorpus();
  for (const { id, fuente } of fuentes) {
    const resultado = compilar(fuente);
    if (!resultado.ok) problemas.push({ id, problema: resultado.problema });
    else if (resultado.programa.arranque !== null) arranques.push({ id, arranque: resultado.programa.arranque });
  }
  return { problemas, arranques, total: fuentes.length };
}

// Sin restos de interpolación ni jerga de JavaScript: lo que un bug del motor le dejaría leer al
// alumno. `NaN`/`undefined` como palabra suelta; `{x` es una plantilla sin resolver (`{ }` con
// espacio, que los textos usan para hablar de llaves, no cuenta).
const RESTOS_SIN_RESOLVER = /undefined|\bNaN\b|\[object|\{[a-zA-Z]/;
const JERGA_DE_JAVASCRIPT =
  /TypeError|ReferenceError|RangeError|SyntaxError|Cannot read|is not a function|is not defined|Maximum call stack|\bat \S+ \(/;

const { problemas, arranques, total } = recorrerCorpus();

describe('corpus real → texto en pantalla: cada problema que el motor rechaza se puede leer', () => {
  it('el corpus alcanza muchos problemas reales y varios códigos distintos (guarda contra un recorrido vacío)', () => {
    expect(total).toBeGreaterThanOrEqual(2800);
    expect(problemas.length).toBeGreaterThanOrEqual(2000);
    const codigosDeError = new Set(problemas.filter((p) => p.problema.categoria === 'error-compilacion').map((p) => p.problema.codigo));
    const codigosDeAviso = new Set(problemas.filter((p) => p.problema.categoria === 'no-disponible').map((p) => p.problema.codigo));
    expect(codigosDeError.size).toBeGreaterThanOrEqual(30);
    expect(codigosDeAviso.size).toBeGreaterThanOrEqual(30);
  });

  it('ningún texto queda vacío ni trae restos de interpolación', () => {
    const malos = problemas
      .map(({ id, problema }) => ({ id, problema, texto: textoDelProblema(problema) }))
      .filter(({ texto }) => texto.trim().length === 0 || RESTOS_SIN_RESOLVER.test(texto));
    expect(malos.map(({ id, problema, texto }) => `${id} [${problema.codigo}]: ${texto}`)).toEqual([]);
  });

  it('ningún texto trae jerga de JavaScript (un fallo del motor nunca se presenta como error del alumno)', () => {
    const malos = problemas
      .map(({ id, problema }) => ({ id, problema, texto: textoDelProblema(problema) }))
      .filter(({ texto }) => JERGA_DE_JAVASCRIPT.test(texto));
    expect(malos.map(({ id, problema, texto }) => `${id} [${problema.codigo}]: ${texto}`)).toEqual([]);
  });

  it('un error de compilación empieza con su línea real («Línea N: …»)', () => {
    const errores = problemas.filter((p) => p.problema.categoria === 'error-compilacion');
    expect(errores.length).toBeGreaterThan(0);
    const malos = errores.filter(({ problema }) => !textoDelProblema(problema).startsWith(`Línea ${problema.linea}: `));
    expect(malos.map(({ id }) => id)).toEqual([]);
  });

  it('un aviso de "no disponible" dice su línea real una sola vez, sin anteponer otra', () => {
    const avisos = problemas.filter((p) => p.problema.categoria === 'no-disponible');
    expect(avisos.length).toBeGreaterThan(0);
    const malos = avisos.filter(({ problema }) => {
      const texto = textoDelProblema(problema);
      return !texto.includes(`línea ${problema.linea}`) || texto.startsWith('Línea ');
    });
    expect(malos.map(({ id }) => id)).toEqual([]);
  });

  it('tras segmentar el código en línea no queda ninguna comilla invertida cruda', () => {
    const conComillasCrudas = problemas
      .map(({ id, problema }) => ({ id, problema, texto: textoDelProblema(problema) }))
      .filter(({ texto }) => segmentarCodigoEnLinea(texto).some((segmento) => segmento.texto.includes('`')));
    expect(conComillasCrudas.map(({ id, problema, texto }) => `${id} [${problema.codigo}]: ${texto}`)).toEqual([]);
  });

  it('los avisos con código en línea (p. ej. un arreglo) sí producen tramos de código', () => {
    const arreglos = problemas.filter((p) => p.problema.codigo === 'arreglo-no-soportado');
    expect(arreglos.length).toBeGreaterThan(0);
    for (const { problema } of arreglos) {
      const codigos = segmentarCodigoEnLinea(textoDelProblema(problema))
        .filter((segmento) => segmento.tipo === 'codigo')
        .map((segmento) => segmento.texto);
      expect(codigos.some((c) => c.includes('[]'))).toBe(true);
    }
  });
});

describe('corpus real → texto de arranque: main sin static / sin main', () => {
  it('cada arranque inválido del corpus se explica con el nombre real de la clase, sin restos', () => {
    // Si el corpus no tuviera ninguno, el resto de esta prueba no comprobaría nada.
    expect(arranques.length).toBeGreaterThan(0);
    const malos = arranques.filter(({ arranque }) => {
      const texto = textoDelArranque(arranque);
      return !texto.includes(arranque.nombreClase) || RESTOS_SIN_RESOLVER.test(texto);
    });
    expect(malos.map(({ id }) => id)).toEqual([]);
  });
});
