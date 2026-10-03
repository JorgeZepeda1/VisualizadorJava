// RED de la tarea 1.35: las formas ESTRUCTURALES del generador. Hasta la 1.34 todo lo que el generador inventaba vivía dentro de `main`; la re-verificación del lote 1 halló falsos rechazos
// (y falsos aceptos hallados al revisarlos) en lo que rodea a `main`: un campo sin su `;`, un `main` con otra firma que la del lanzador, una clase sellada, un archivo sin ninguna clase,
// un `import` de un paquete que no existe, un escape Unicode con significado sintáctico. Cada forma de `FORMAS_ESTRUCTURALES` es UNA idea de esas, con los rasgos que el programa
// debe mostrar (para que su familia no salga «sin rasgos») y si javac acepta su sintaxis. Aquí no hay JDK: el veredicto de javac sobre ellas lo mide `generador-javac.test.ts`.
import { describe, expect, it } from 'vitest';
import { crearAzar } from './azar.ts';
import { conLaForma, FASE_DE_LAS_ESTRUCTURAS, FORMAS_ESTRUCTURALES, PERIODO_DE_LAS_ESTRUCTURAS } from './estructuras.ts';
import { etiquetasDe, pretendeErrorDeSintaxis, renderizarPrograma, type Programa } from './programa.ts';

const SEMILLAS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

function programasDe(nombreDeLaForma: string): Programa[] {
  const forma = FORMAS_ESTRUCTURALES.find((candidata) => candidata.nombre === nombreDeLaForma);
  if (forma === undefined) throw new Error(`no hay una forma llamada «${nombreDeLaForma}»`);
  return SEMILLAS.map((semilla) => conLaForma(forma, crearAzar(semilla), [], []));
}

describe('FORMAS_ESTRUCTURALES — el catálogo', () => {
  it('hay al menos 60 formas, cada una con un nombre propio en minúsculas y guiones', () => {
    expect(FORMAS_ESTRUCTURALES.length).toBeGreaterThanOrEqual(60);
    const nombres = FORMAS_ESTRUCTURALES.map((forma) => forma.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    for (const nombre of nombres) expect(nombre, nombre).toMatch(/^[a-z]+(-[a-z0-9]+)*$/);
  });

  it('el programa estructural cae en un índice de la campaña que no choca con las otras estratificaciones (casts cada 8, literales cada 16, clases del JDK cada 20)', () => {
    expect(PERIODO_DE_LAS_ESTRUCTURAS).toBe(12);
    const indices = Array.from({ length: 2000 }, (_, i) => i).filter((i) => i % PERIODO_DE_LAS_ESTRUCTURAS === FASE_DE_LAS_ESTRUCTURAS);
    expect(indices.length).toBeGreaterThan(100);
    for (const i of indices) {
      expect(i % 8, `índice ${i}`).not.toBe(0);
      expect(i % 16, `índice ${i}`).not.toBe(3);
      expect(i % 20, `índice ${i}`).not.toBe(7);
    }
  });

  it.each(FORMAS_ESTRUCTURALES.map((forma) => [forma.nombre] as const))('«%s» muestra los rasgos que declara, con cualquier semilla, y se imprime igual con la misma', (nombre) => {
    const forma = FORMAS_ESTRUCTURALES.find((candidata) => candidata.nombre === nombre)!;
    expect(forma.etiquetas.length, 'toda forma declara al menos un rasgo').toBeGreaterThan(0);
    for (const semilla of SEMILLAS) {
      const programa = conLaForma(forma, crearAzar(semilla), [], []);
      expect(etiquetasDe(programa), `semilla ${semilla}`).toEqual(expect.arrayContaining([...forma.etiquetas]));
      expect(renderizarPrograma(conLaForma(forma, crearAzar(semilla), [], []))).toBe(renderizarPrograma(programa));
    }
  });

  it.each(FORMAS_ESTRUCTURALES.map((forma) => [forma.nombre] as const))('«%s»: el programa pretende un error de sintaxis exactamente cuando la forma lo declara', (nombre) => {
    const forma = FORMAS_ESTRUCTURALES.find((candidata) => candidata.nombre === nombre)!;
    for (const semilla of SEMILLAS) {
      expect(pretendeErrorDeSintaxis(conLaForma(forma, crearAzar(semilla), [], [])), `semilla ${semilla}`).toBe(!forma.sintaxisValida);
    }
  });
});

describe('FORMAS_ESTRUCTURALES — cada familia de la re-verificación del lote 1', () => {
  it('las firmas de `main`: varargs, final, corchetes tras el nombre, dos parámetros, ninguno, un parámetro que no es arreglo, un arreglo de otro tipo, un parámetro que tapa a `System`', () => {
    const firmas = (nombre: string) => programasDe(nombre).map((p) => p.parametrosDeMain);
    expect(firmas('main-con-varargs')).toEqual(SEMILLAS.map(() => 'String... args'));
    expect(firmas('main-con-final')).toEqual(SEMILLAS.map(() => 'final String[] args'));
    expect(firmas('main-con-corchetes-tras-el-nombre')).toEqual(SEMILLAS.map(() => 'String args[]'));
    expect(firmas('main-con-dos-parametros')).toEqual(SEMILLAS.map(() => 'String[] args, int n'));
    expect(firmas('main-sin-parametros')).toEqual(SEMILLAS.map(() => ''));
    expect(firmas('main-con-parametro-que-no-es-arreglo')).toEqual(SEMILLAS.map(() => 'String args'));
    expect(firmas('main-con-arreglo-de-otro-tipo')).toEqual(SEMILLAS.map(() => 'double[] args'));
    expect(firmas('main-con-parametro-llamado-system')).toEqual(SEMILLAS.map(() => 'String[] System'));
    // El que tapa a `System` USA `System.out` (si no, no hay nada que rechazar).
    for (const programa of programasDe('main-con-parametro-llamado-system')) expect(renderizarPrograma(programa)).toContain('System.out.println');
  });

  it('las clases selladas: `sealed`, `non-sealed` y `permits`, con sus clases hijas dentro de la misma clase', () => {
    const texto = (nombre: string) => renderizarPrograma(programasDe(nombre)[0]!);
    expect(texto('sellada-interfaz-con-records')).toContain('sealed interface Forma permits Circulo, Cuadrado { }');
    expect(texto('sellada-clase-con-hija-final')).toContain('static sealed class Base permits Hija { }');
    expect(texto('sellada-clase-con-hija-non-sealed')).toContain('static non-sealed class Hija extends Base { }');
    expect(texto('sellada-sin-permits')).toContain('sealed interface Forma { }');
  });

  it('los campos sin su `;`: el último renglón del campo no lo trae, y lo que sigue (otro miembro, `main` o la `}` de la clase) está más abajo', () => {
    const formas = FORMAS_ESTRUCTURALES.filter((forma) => forma.nombre.startsWith('campo-sin-punto-y-coma-'));
    expect(formas.length).toBeGreaterThanOrEqual(8);
    for (const forma of formas) {
      expect(forma.sintaxisValida, forma.nombre).toBe(false);
      for (const semilla of SEMILLAS) {
        const programa = conLaForma(forma, crearAzar(semilla), [], []);
        expect(etiquetasDe(programa), forma.nombre).toContain('campo-de-la-clase');
        const marcados = (programa.miembros ?? []).filter((miembro) => miembro.sintaxisInvalida === true);
        expect(marcados, `${forma.nombre} (semilla ${semilla})`).toHaveLength(1);
        const ultimo = marcados[0]!.lineas[marcados[0]!.lineas.length - 1]!;
        expect(ultimo.trimEnd().endsWith(';'), `${forma.nombre}: «${ultimo}»`).toBe(false);
        expect(renderizarPrograma(programa), forma.nombre).toContain(ultimo);
      }
    }
  });

  it('los campos mal escritos de otras maneras: dos en el mismo renglón, dos cadenas seguidas, una llave tras el nombre, un modificador tras el `=`', () => {
    for (const nombre of ['campos-en-el-mismo-renglon-sin-punto-y-coma', 'campo-con-dos-cadenas-seguidas', 'campo-con-llave-tras-el-nombre', 'campo-con-modificador-tras-el-igual']) {
      const forma = FORMAS_ESTRUCTURALES.find((candidata) => candidata.nombre === nombre)!;
      expect(forma, nombre).toBeDefined();
      expect(forma.sintaxisValida, nombre).toBe(false);
      expect(etiquetasDe(programasDe(nombre)[0]!), nombre).toContain('campo-de-la-clase');
    }
  });

  it('los campos válidos, con la expresión en varios renglones, un inicializador de arreglo, una clase anónima, una lambda, `int.class`, un `instanceof` con patrón…', () => {
    const validas = FORMAS_ESTRUCTURALES.filter((forma) => forma.nombre.startsWith('campo-valido-'));
    expect(validas.length).toBeGreaterThanOrEqual(8);
    for (const forma of validas) {
      expect(forma.sintaxisValida, forma.nombre).toBe(true);
      expect(etiquetasDe(conLaForma(forma, crearAzar(1), [], [])), forma.nombre).toContain('campo-de-la-clase');
    }
    const continuacion = renderizarPrograma(programasDe('campo-valido-con-la-expresion-en-el-renglon-siguiente')[0]!);
    expect(continuacion).toMatch(/static int x = y\n\s+- z;/);
  });

  it('los `import`: de paquetes que existen y que no (java.sqrt, java.Util, org.junit, un tipo mal escrito) y los que traen un `;` suelto', () => {
    const importsDe = (nombre: string) => programasDe(nombre)[0]!.imports;
    expect(importsDe('import-comodin-de-paquete-inexistente')).toEqual(['import java.sqrt.*;']);
    expect(importsDe('import-comodin-con-mayuscula-de-mas')).toEqual(['import java.Util.*;']);
    expect(importsDe('import-comodin-de-paquete-ajeno-al-jdk')).toEqual(['import org.junit.*;']);
    expect(importsDe('import-tras-un-punto-y-coma-suelto')).toEqual(['import java.util.Scanner;;', 'import java.util.Random;']);
  });

  it('los archivos sin ninguna clase: vacío, con un import y con imports de comodín', () => {
    for (const nombre of ['archivo-vacio', 'archivo-con-un-import', 'archivo-con-imports-con-comodin']) {
      for (const programa of programasDe(nombre)) {
        expect(programa.sinClase, nombre).toBe(true);
        expect(renderizarPrograma(programa), nombre).not.toContain('class');
      }
    }
    expect(renderizarPrograma(programasDe('archivo-vacio')[0]!)).toBe('');
  });

  it('los escapes Unicode: de la comilla, las llaves, el `;`, el `+`, el `&`, un paréntesis, un punto y una letra; y los comentarios con `\\u` bien y mal formado', () => {
    const B = String.fromCharCode(92);
    const texto = (nombre: string, semilla = 0) => renderizarPrograma(programasDe(nombre)[semilla]!);
    expect(texto('escape-de-comilla')).toContain(`${B}u0022`);
    expect(texto('escape-de-llave-que-abre')).toContain(`${B}u007b`);
    expect(texto('escape-de-llave-que-cierra')).toContain(`${B}u007d`);
    expect(texto('escape-de-punto-y-coma')).toContain(`${B}u003b`);
    expect(texto('escape-de-mas')).toContain(`${B}u002b`);
    expect(texto('escape-de-ampersand')).toContain(`${B}u0026`);
    expect(texto('escape-de-letra')).toMatch(new RegExp(`${B}${B}u00[0-9a-f]{2}`));
    // Un `\u` mal formado dentro de un comentario es un error; con la barra duplicada (`\\u`) o bien formado, no.
    const malFormados = FORMAS_ESTRUCTURALES.filter((forma) => forma.nombre.startsWith('comentario-con-escape-mal-formado') || forma.nombre.startsWith('comentario-de-bloque-con-escape-mal-formado'));
    expect(malFormados.length).toBe(2);
    for (const forma of malFormados) expect(forma.sintaxisValida, forma.nombre).toBe(false);
    expect(FORMAS_ESTRUCTURALES.find((forma) => forma.nombre === 'comentario-con-barra-duplicada-antes-de-la-u')!.sintaxisValida).toBe(true);
    expect(FORMAS_ESTRUCTURALES.find((forma) => forma.nombre === 'comentario-con-escape-bien-formado')!.sintaxisValida).toBe(true);
  });

  it('la llamada con argumentos de tipo explícitos usa un método genérico declarado en la clase', () => {
    const programa = programasDe('llamada-generica-explicita')[0]!;
    const texto = renderizarPrograma(programa);
    expect(texto).toContain('static <T> T id(T t)');
    expect(texto).toMatch(/P\.<\w+>id\(/);
    expect(etiquetasDe(programa)).toContain('llamada-generica-explicita');
  });
});
