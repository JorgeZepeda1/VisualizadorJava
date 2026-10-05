// Tarea 1.36: la guarda común de los corpus de `corpus/experimentos/<familia>/` que se vigilan con tres TABLAS (la forma que usaron las tareas 1.33, 1.34 y 1.35, una vez por archivo, aquí
// escrita una sola vez para los dos corpus de la 1.36). Cada programa trae sus goldens del oráculo (`.oraculo.json` y `.errores`, ADR 011): el veredicto y la LÍNEA de javac salen de ahí,
// nunca escritos a mano. Lo que fija cada tabla es la respuesta de NUESTRO compilador:
//   - ERRORES: javac rechaza y el subconjunto modela la regla → error de compilación con el código propio y la MISMA línea que javac;
//   - AVISOS: javac rechaza y no se puede revisar por completo → aviso honesto (`no-disponible`), nunca `ok` ni «Java sí acepta tu programa»;
//   - VALIDOS: javac compila → nunca un error: `ok` (el programa se ejecuta) o el aviso honesto que se declara.
// Vive en `pruebas/` (capa sin restricción, design.md §1.1): necesita `compilar()` y el catálogo de textos a la vez.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { textoDelProblema } from '../../src/presentacion/texto-del-problema.ts';

export interface Golden {
  readonly fuente: string;
  readonly compilo: boolean;
  /** La línea del primer error de javac, leída del `.errores` real; `null` si compiló. */
  readonly lineaDeJavac: number | null;
}

export interface TablasDelCorpus {
  /** Un nombre corto para los `describe` («bordes del archivo»). */
  readonly nombre: string;
  /** La carpeta del corpus, relativa a la raíz del proyecto. */
  readonly ruta: string;
  readonly errores: ReadonlyArray<readonly [archivo: string, codigo: string]>;
  readonly avisos: ReadonlyArray<readonly [archivo: string, codigo: string]>;
  readonly validos: ReadonlyArray<readonly [archivo: string, resultado: 'ok' | string]>;
  /** Cuántos programas debe haber como mínimo (un directorio vacío o a medias no pasa desapercibido). */
  readonly piso: number;
}

/** `corpus/**` es `-text` (.gitattributes): los `\r` y los caracteres invisibles de los programas llegan intactos. */
export function leerGolden(rutaDelCorpus: string, archivo: string): Golden {
  const base = resolve(rutaDelCorpus, archivo);
  const { compilo } = JSON.parse(readFileSync(`${base}.oraculo.json`, 'utf-8')) as { compilo: boolean };
  const primerError = /\.java:(\d+): error:/.exec(readFileSync(`${base}.errores`, 'utf-8'));
  return {
    fuente: readFileSync(`${base}.java`, 'utf-8'),
    compilo,
    lineaDeJavac: primerError === null ? null : Number(primerError[1]),
  };
}

/** Declara las pruebas de un corpus con tablas: completitud, veredictos de javac, línea, texto, avisos y controles. */
export function guardaDeCorpusConTablas(tablas: TablasDelCorpus): void {
  const ruta = resolve(tablas.ruta);
  const golden = (archivo: string): Golden => leerGolden(ruta, archivo);

  describe(`${tablas.ruta} — el corpus está completo`, () => {
    it('cada programa del directorio aparece en exactamente UNA de las tres tablas (ninguno olvidado, ninguno repetido)', () => {
      const enDisco = readdirSync(ruta)
        .filter((nombre) => nombre.endsWith('.java'))
        .map((nombre) => nombre.slice(0, -'.java'.length))
        .sort();
      const enTablas = [...tablas.errores, ...tablas.avisos, ...tablas.validos].map(([archivo]) => archivo).sort();
      expect(enTablas).toEqual(enDisco);
      expect(enDisco.length).toBeGreaterThanOrEqual(tablas.piso);
    });

    it('las tres tablas coinciden con el veredicto real de javac guardado en cada `.oraculo.json`', () => {
      for (const [archivo] of [...tablas.errores, ...tablas.avisos]) expect(golden(archivo).compilo, `${archivo}: javac debe rechazarlo`).toBe(false);
      for (const [archivo] of tablas.validos) expect(golden(archivo).compilo, `${archivo}: javac debe compilarlo`).toBe(true);
    });
  });

  describe(`${tablas.nombre} — un programa que javac rechaza sale como error en la MISMA línea de javac`, () => {
    it.each(tablas.errores)('%s → [%s]', (archivo, codigo) => {
      const { fuente, lineaDeJavac } = golden(archivo);
      const resultado = compilar(fuente);
      if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza en la línea ${lineaDeJavac}`);
      expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('error-compilacion');
      expect(resultado.problema.codigo).toBe(codigo);
      expect(resultado.problema.linea).toBe(lineaDeJavac);
    });
  });

  describe(`${tablas.nombre} — lo que LEE el alumno: cada error empieza con la línea de javac y ningún texto trae restos`, () => {
    it.each(tablas.errores)('%s → «Línea N: …» con la línea real de javac', (archivo) => {
      const { fuente, lineaDeJavac } = golden(archivo);
      const resultado = compilar(fuente);
      if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó`);
      const texto = textoDelProblema(resultado.problema);
      expect(texto.startsWith(`Línea ${lineaDeJavac}: `), `${archivo}: ${texto}`).toBe(true);
      expect(texto, archivo).not.toMatch(/undefined|\bNaN\b|\[object|\{[a-zA-Z]/);
      expect(texto.length, archivo).toBeGreaterThan(`Línea ${lineaDeJavac}: `.length + 20);
    });
  });

  describe(`${tablas.nombre} — lo que no se puede revisar por completo: aviso, nunca «Java sí acepta tu programa» (D2)`, () => {
    it.each(tablas.avisos)('%s → aviso [%s]', (archivo, codigo) => {
      const { fuente } = golden(archivo);
      const resultado = compilar(fuente);
      if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó (ok: true) y javac lo rechaza`);
      expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo}`).toBe('no-disponible');
      expect(resultado.problema.codigo).toBe(codigo);
    });

    it.each(tablas.avisos)('%s → el texto del aviso empieza con la línea, nombra lo que usa y no afirma que Java acepta el programa', (archivo) => {
      const { fuente } = golden(archivo);
      const resultado = compilar(fuente);
      if (resultado.ok) throw new Error(`${archivo}: el compilador lo aceptó`);
      const texto = textoDelProblema(resultado.problema);
      expect(texto, archivo).not.toMatch(/undefined|\bNaN\b|\[object|\{[a-zA-Z]/);
      expect(texto, archivo).not.toMatch(/Java sí (lo |la )?(acepta|tiene)/);
      expect(texto, archivo).toContain(`línea ${resultado.problema.linea}`);
    });
  });

  describe(`${tablas.nombre} — controles: lo que javac compila no se rechaza`, () => {
    it.each(tablas.validos)('%s → [%s]', (archivo, esperado) => {
      const { fuente } = golden(archivo);
      const resultado = compilar(fuente);
      if (esperado === 'ok') {
        expect(resultado.ok, `${archivo}: ${resultado.ok ? '' : `${resultado.problema.codigo} en la línea ${resultado.problema.linea}`}`).toBe(true);
        return;
      }
      if (resultado.ok) throw new Error(`${archivo}: se esperaba ${esperado} y salió ok: true`);
      expect(resultado.problema.categoria, `${archivo}: ${resultado.problema.codigo} en la línea ${resultado.problema.linea}`).toBe('no-disponible');
      expect(resultado.problema.codigo).toBe(esperado);
    });
  });
}
