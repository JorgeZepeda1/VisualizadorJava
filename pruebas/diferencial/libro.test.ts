// RED de la tarea R0.13 (REQ-LIBRO-003, REQ-DIFF-009, ADR 010/011): todo programa del libro —ejemplos, errores típicos, «Ponte a prueba» y soluciones de «Ahora hazlo tú»— vive en `corpus/libro/`, lo
// compiló y ejecutó el JDK 17 real (los goldens son del oráculo, nunca escritos a mano) y el motor coincide con él: BYTE A BYTE en la salida estándar, la de error y el código de salida si el programa se
// ejecuta; en veredicto y LÍNEA si enseña un error de compilación. Ninguno que deba ejecutarse da un aviso de fuera de alcance (`ejecucion-no-disponible`) y toda entrada preparada termina cada renglón en
// salto de línea, como en NetBeans. Aquí no hace falta JDK: los goldens ya están en el repositorio y `npm run oraculo:verificar` los regenera en el trabajo del oráculo.
import { describe, expect, it } from 'vitest';
import { idsDeProgramasDelLibro, leerProgramaDelLibro } from '../../herramientas/libro-programas.ts';
import type { ProgramaDelLibro } from '../../herramientas/libro-programas.ts';
import { compilar } from '../../src/motor/index.ts';
import { compararConElGolden } from './comparar-con-el-golden.ts';

const programas: readonly ProgramaDelLibro[] = idsDeProgramasDelLibro().map((id) => leerProgramaDelLibro(id));
const queSeEjecutan = programas.filter((programa) => programa.meta.esperado === 'ejecuta');
const queNoCompilan = programas.filter((programa) => programa.meta.esperado === 'error-compilacion');

describe('el libro contra el JDK 17 real: cada programa de corpus/libro (REQ-LIBRO-003, REQ-DIFF-009)', () => {
  it('hay programas en corpus/libro, de los dos tipos de veredicto que enseña (guarda contra un recorrido vacío): los 43 de los cinco primeros temas de U6, y 4 que javac rechaza', () => {
    expect(programas.length).toBeGreaterThanOrEqual(43);
    expect(queSeEjecutan.length).toBeGreaterThanOrEqual(39);
    expect(queNoCompilan.length).toBeGreaterThanOrEqual(4);
  });

  it('el programa semilla del tema `while` es «Contar del 1 al 5» y el JDK imprimió esos cinco números y «Listo»', () => {
    const semilla = programas.find((programa) => programa.id === 'u6-while/contar-en-voz-alta');
    expect(semilla, 'el programa semilla de R0.13').toBeDefined();
    expect(semilla?.salida).toBe('1\n2\n3\n4\n5\nListo\n');
    expect(semilla?.meta).toEqual({ papel: 'para-empezar', esperado: 'ejecuta' });
  });

  it.each(programas.map((programa) => [programa.id, programa] as const))('%s: lo que dice su .meta.json es lo que el oráculo vio (compiló o no, y nunca se cortó por tiempo)', (_id, programa) => {
    expect(programa.oraculo.compilo, 'compiló según javac').toBe(programa.meta.esperado === 'ejecuta');
    expect(programa.oraculo.desenlace, 'un ciclo infinito no se puede comparar byte a byte (ADR 011)').not.toBe('limite-pasos');
  });

  it.each(queSeEjecutan.map((programa) => [programa.id, programa] as const))('%s: el motor lo ejecuta idéntico al JDK (stdout, stderr y código de salida) y sin aviso de fuera de alcance', (_id, programa) => {
    const resultado = compararConElGolden(programa.rutaFuente, programa.fuente);
    expect(resultado.estado, 'ni «ejecucion-no-disponible» ni otro aviso: el libro solo enseña lo que el motor ejecuta').toBe('ejecutado');
    expect(resultado.diferencias.join('\n')).toBe('');
  });

  it.each(queNoCompilan.map((programa) => [programa.id, programa] as const))('%s: javac lo rechaza y el motor lo rechaza en la MISMA línea, como error de compilación', (_id, programa) => {
    const lineaDeJavac = /\.java:(\d+): error:/.exec(programa.errores);
    expect(lineaDeJavac, 'javac dejó su veredicto en el .errores').not.toBeNull();
    const resultado = compilar(programa.fuente);
    expect(resultado.ok).toBe(false);
    if (resultado.ok) throw new Error('se esperaba ok:false');
    expect(resultado.problema.categoria).toBe('error-compilacion');
    expect(resultado.problema.linea).toBe(Number(lineaDeJavac?.[1]));
  });

  it.each(programas.filter((programa) => programa.entrada !== null).map((programa) => [programa.id, programa.entrada as string] as const))(
    '%s: la entrada preparada no está vacía, no trae retorno de carro y termina en salto de línea',
    (_id, entrada) => {
      expect(entrada.length).toBeGreaterThan(0);
      expect(entrada.includes('\r')).toBe(false);
      expect(entrada.endsWith('\n')).toBe(true);
    },
  );

  it('control: una entrada sin salto de línea final SÍ la detectaría el mismo criterio (no es un filtro que nunca dispara)', () => {
    const terminaBien = (entrada: string): boolean => entrada.length > 0 && !entrada.includes('\r') && entrada.endsWith('\n');
    expect(terminaBien('5\n')).toBe(true);
    expect(terminaBien('5')).toBe(false);
    expect(terminaBien('5\r\n')).toBe(false);
  });

  it('un programa que lee del teclado trae su entrada preparada (sin ella el oráculo no tendría de dónde leer)', () => {
    const leenSinEntrada = programas.filter((programa) => /new\s+Scanner\s*\(\s*System\.in\s*\)/.test(programa.fuente) && programa.entrada === null && programa.meta.esperado === 'ejecuta').map((programa) => programa.id);
    expect(leenSinEntrada).toEqual([]);
  });
});
