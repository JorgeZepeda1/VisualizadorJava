// RED de la tarea R0.13 (REQ-LIBRO-003, REQ-DIFF-009): leer los programas de `corpus/libro/` con todo lo que tienen al lado —su entrada preparada, sus cuatro goldens del oráculo y su `.meta.json`—
// y fallar con la ruta a la vista si algo falta o está mal formado. Lo usan la prueba diferencial del libro, la que cruza el catálogo con el corpus y el guion de borradores. Se prueba sobre un árbol
// temporal: nada de aquí necesita el JDK (los goldens de la muestra son bytes escritos por la propia prueba, no un resultado de Java).
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { idsDeProgramasDelLibro, leerProgramaDelLibro } from './libro-programas.ts';

let raiz = '';

function escribir(ruta: string, contenido: string): void {
  const completa = join(raiz, 'corpus', 'libro', ruta);
  mkdirSync(join(completa, '..'), { recursive: true });
  writeFileSync(completa, contenido, 'utf-8');
}

/** Un programa completo con sus goldens (la prueba los escribe; no pretende ser lo que daría Java). */
function programaCompleto(id: string, extras: { entrada?: string; meta?: string; oraculo?: string } = {}): void {
  escribir(`${id}.java`, 'public class Muestra {}\n');
  escribir(`${id}.salida`, 'salida\n');
  escribir(`${id}.errores`, '');
  escribir(`${id}.combinada`, 'salida\n');
  escribir(`${id}.oraculo.json`, extras.oraculo ?? '{ "compilo": true, "codigoSalida": 0, "agotoTiempo": false, "desenlace": "normal" }\n');
  escribir(`${id}.meta.json`, extras.meta ?? '{ "papel": "para-empezar", "esperado": "ejecuta" }\n');
  if (extras.entrada !== undefined) escribir(`${id}.entrada.txt`, extras.entrada);
}

beforeEach(() => {
  raiz = mkdtempSync(join(tmpdir(), 'libro-programas-'));
});

afterEach(() => {
  rmSync(raiz, { recursive: true, force: true });
});

describe('idsDeProgramasDelLibro: cada .java de corpus/libro, como «tema/programa»', () => {
  it('devuelve los ids ordenados, sin extensión, y no cuenta los archivos que no son .java', () => {
    programaCompleto('u6-while/contar-en-voz-alta');
    programaCompleto('u6-for/suma-de-1-a-n', { entrada: '4\n' });
    programaCompleto('u6-do-while/validar-edad');
    expect(idsDeProgramasDelLibro(raiz)).toEqual(['u6-do-while/validar-edad', 'u6-for/suma-de-1-a-n', 'u6-while/contar-en-voz-alta']);
  });

  it('con la carpeta vacía devuelve una lista vacía (no falla)', () => {
    mkdirSync(join(raiz, 'corpus', 'libro'), { recursive: true });
    expect(idsDeProgramasDelLibro(raiz)).toEqual([]);
  });
});

describe('leerProgramaDelLibro: el programa con su entrada, sus goldens y su meta', () => {
  it('lee la fuente, la entrada, la salida, los errores, el veredicto del oráculo y el meta', () => {
    programaCompleto('u6-for/suma-de-1-a-n', {
      entrada: '4\n',
      meta: '{ "papel": "paso-a-paso", "esperado": "ejecuta" }\n',
      oraculo: '{ "compilo": true, "codigoSalida": 0, "agotoTiempo": false, "desenlace": "normal" }\n',
    });
    const programa = leerProgramaDelLibro('u6-for/suma-de-1-a-n', raiz);
    expect(programa.id).toBe('u6-for/suma-de-1-a-n');
    expect(programa.rutaFuente).toBe('corpus/libro/u6-for/suma-de-1-a-n.java');
    expect(programa.fuente).toBe('public class Muestra {}\n');
    expect(programa.entrada).toBe('4\n');
    expect(programa.salida).toBe('salida\n');
    expect(programa.errores).toBe('');
    expect(programa.meta).toEqual({ papel: 'paso-a-paso', esperado: 'ejecuta' });
    expect(programa.oraculo.desenlace).toBe('normal');
    expect(programa.oraculo.compilo).toBe(true);
  });

  it('si no hay entrada preparada, la entrada es null (el programa no lee del teclado)', () => {
    programaCompleto('u6-while/contar-en-voz-alta');
    expect(leerProgramaDelLibro('u6-while/contar-en-voz-alta', raiz).entrada).toBeNull();
  });

  it('un programa que javac rechazó trae el veredicto de javac en `errores` y `esperado: error-compilacion`', () => {
    programaCompleto('u6-for/variable-fuera-del-for', {
      meta: '{ "papel": "error-tipico", "esperado": "error-compilacion" }\n',
      oraculo: '{ "compilo": false, "codigoSalida": null, "agotoTiempo": false, "desenlace": "error-compilacion" }\n',
    });
    escribir('u6-for/variable-fuera-del-for.errores', 'variable-fuera-del-for.java:6: error: cannot find symbol\n1 error\n');
    const programa = leerProgramaDelLibro('u6-for/variable-fuera-del-for', raiz);
    expect(programa.oraculo.compilo).toBe(false);
    expect(programa.errores).toContain('.java:6: error: cannot find symbol');
    expect(programa.meta.esperado).toBe('error-compilacion');
  });

  it.each(['.salida', '.errores', '.combinada', '.oraculo.json', '.meta.json'])('si falta %s, falla y dice la ruta del archivo', (sufijo) => {
    programaCompleto('u6-while/contar-en-voz-alta');
    rmSync(join(raiz, 'corpus', 'libro', `u6-while/contar-en-voz-alta${sufijo}`));
    expect(() => leerProgramaDelLibro('u6-while/contar-en-voz-alta', raiz)).toThrow(`corpus/libro/u6-while/contar-en-voz-alta${sufijo}`);
  });

  it.each([
    ['un papel que no existe', '{ "papel": "ejemplo", "esperado": "ejecuta" }'],
    ['un esperado que no existe', '{ "papel": "solucion", "esperado": "falla" }'],
    ['sin papel', '{ "esperado": "ejecuta" }'],
    ['un JSON roto', '{ "papel": '],
  ])('un .meta.json con %s se rechaza con la ruta a la vista', (_caso, meta) => {
    programaCompleto('u6-while/contar-en-voz-alta', { meta });
    expect(() => leerProgramaDelLibro('u6-while/contar-en-voz-alta', raiz)).toThrow('corpus/libro/u6-while/contar-en-voz-alta.meta.json');
  });

  it('los cinco papeles del diseño son válidos', () => {
    const papeles = ['para-empezar', 'paso-a-paso', 'error-tipico', 'ponte-a-prueba', 'solucion'] as const;
    for (const papel of papeles) {
      programaCompleto(`u6-while/${papel}`, { meta: `{ "papel": "${papel}", "esperado": "ejecuta" }` });
      expect(leerProgramaDelLibro(`u6-while/${papel}`, raiz).meta.papel).toBe(papel);
    }
  });
});
