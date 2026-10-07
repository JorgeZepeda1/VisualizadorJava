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

// Tarea 1.36: las familias que la verificación final del lote 1 halló FUERA de la gramática del generador, y que 448 817 programas propios del verificador sí ejercían: los tres puntos de `main(String
// . . . args)` (C-1), el `package` con el nombre de un paquete del JDK (C-3), los caracteres invisibles dentro de un nombre (W-1), el retorno de carro como fin de línea (C-2/W-2), una constante de texto
// con un decimal (C-5/W-10) y una constante de texto de 65 535 caracteres o 65 535 bytes (C-4). Sin ellas el generador diferencial no habría visto ninguna de las cinco familias de falsos aceptos.
describe('FORMAS_ESTRUCTURALES — las familias de la tarea 1.36', () => {
  const forma = (nombre: string) => {
    const encontrada = FORMAS_ESTRUCTURALES.find((candidata) => candidata.nombre === nombre);
    if (encontrada === undefined) throw new Error(`no hay una forma llamada «${nombre}»`);
    return encontrada;
  };
  const texto = (nombre: string, semilla = 1) => renderizarPrograma(conLaForma(forma(nombre), crearAzar(semilla), [], []));

  it('C-1: los tres puntos separados son un error de sintaxis con su rasgo propio; pegados, aunque con espacios alrededor, son válidos', () => {
    for (const [nombre, parametros] of [
      ['main-con-puntos-separados', 'String . . . args'],
      ['main-con-dos-puntos-pegados-y-uno-suelto', 'String .. . args'],
      ['main-con-un-punto-suelto-y-dos-pegados', 'String . .. args'],
      ['main-con-final-y-puntos-separados', 'final String . . . args'],
    ] as const) {
      expect(forma(nombre).sintaxisValida, nombre).toBe(false);
      for (const semilla of SEMILLAS) {
        const programa = conLaForma(forma(nombre), crearAzar(semilla), [], []);
        expect(programa.parametrosDeMain, nombre).toBe(parametros);
        expect(etiquetasDe(programa), nombre).toEqual(expect.arrayContaining(['main-con-otra-firma', 'varargs-mal-escrito']));
        expect(pretendeErrorDeSintaxis(programa), nombre).toBe(true);
      }
    }
    expect(forma('main-con-varargs-con-espacios').sintaxisValida).toBe(true);
    expect(texto('main-con-varargs-con-espacios')).toContain('main(String ... args)');
    expect(etiquetasDe(conLaForma(forma('main-con-varargs-con-espacios'), crearAzar(1), [], []))).not.toContain('varargs-mal-escrito');
  });

  it('C-3: el `package` de un paquete del JDK, uno propio y uno con nombre de clase van ANTES de los imports, con el rasgo `paquete-declarado`', () => {
    for (const nombre of ['paquete-del-jdk', 'paquete-propio', 'paquete-con-nombre-de-clase']) {
      expect(forma(nombre).sintaxisValida, nombre).toBe(true);
      for (const semilla of SEMILLAS) {
        const fuente = texto(nombre, semilla);
        expect(fuente, nombre).toMatch(/^package [a-z]+(\.[A-Za-z0-9$]+)*;\n/);
        expect(etiquetasDe(conLaForma(forma(nombre), crearAzar(semilla), [], [])), nombre).toContain('paquete-declarado');
      }
    }
    // El del JDK sale de la lista de paquetes que el JDK exporta, con cualquier semilla; el propio, nunca de ahí.
    const paquetesDelJdk = new Set(SEMILLAS.map((semilla) => /^package (.+);/.exec(texto('paquete-del-jdk', semilla))![1]!));
    for (const nombre of ['java.util', 'java.lang', 'java.io', 'javax.swing', 'java.sql']) expect([...paquetesDelJdk, 'java.util', 'java.lang', 'java.io', 'javax.swing', 'java.sql']).toContain(nombre);
    for (const semilla of SEMILLAS) expect(texto('paquete-propio', semilla)).not.toMatch(/^package (java|javax)\.(util|lang|io|swing|sql);/);
    // Los imports del cuerpo van DESPUÉS del `package` (si no, javac da otro error).
    const programa = conLaForma(forma('paquete-propio'), crearAzar(1), [], ['import java.util.Scanner;']);
    const lineas = renderizarPrograma(programa).split('\n');
    expect(lineas.findIndex((l) => l.startsWith('package '))).toBeLessThan(lineas.findIndex((l) => l.startsWith('import ')));
  });

  // Tarea 1.37 (C-6): el generador diferencial sortea también los nombres que la verificación del delta halló aceptados y los hermanos que cierran el hueco (las no públicas de `java.lang`, las
  // anidadas con su `$`, las que javac crea de antemano, un subpaquete de una clase) y, para que el veredicto no se escriba solo de un lado, los que javac COMPILA aunque parezcan iguales.
  it('C-6: el `package` con nombre de clase sortea lo que javac rechaza (no públicas, anidadas, las de antemano, subpaquetes de una clase) Y lo que compila', () => {
    const nombres = new Set(Array.from({ length: 600 }, (_, i) => /^package (.+);\n/.exec(texto('paquete-con-nombre-de-clase', i + 1))![1]!));
    for (const rechazado of ['java.lang.Shutdown', 'java.lang.StringCoding', 'java.lang.Thread$State', 'java.lang.Class$1', 'java.io.Serializable', 'java.util.Iterator', 'java.lang.runtime.SwitchBootstraps', 'java.lang.String.aula', 'java.lang.Shutdown.a.b']) {
      expect(nombres, rechazado).toContain(rechazado);
    }
    for (const compilado of ['java.util.ArraysParallelSortHelpers', 'java.io.FileSystem', 'java.util.Map$Entry', 'java.util.Map.aula', 'java.lang.reflect.Method']) expect(nombres, compilado).toContain(compilado);
    // los de siempre siguen
    for (const publico of ['java.util.Map', 'java.lang.String', 'java.util.Scanner', 'java.io.File']) expect(nombres, publico).toContain(publico);
    for (const nombre of nombres) expect(nombre, nombre).toMatch(/^[a-z]+(\.[A-Za-z0-9$]+)+$/);
  });

  it('W-1: un nombre o una palabra clave con un carácter invisible dentro; los que javac salta y los que no', () => {
    const invisible = /[\u00ad\u200b-\u200f\u2060\ufeff]/;
    for (const nombre of ['nombre-con-un-caracter-invisible', 'palabra-clave-con-un-caracter-invisible', 'nombre-repetido-por-un-caracter-invisible', 'nombre-que-empieza-con-un-caracter-invisible', 'tipo-pegado-a-un-caracter-invisible']) {
      for (const semilla of SEMILLAS) {
        const programa = conLaForma(forma(nombre), crearAzar(semilla), [], []);
        expect(renderizarPrograma(programa), nombre).toMatch(invisible);
        expect(etiquetasDe(programa), nombre).toContain('caracter-ignorable');
      }
    }
    // El que empieza con uno es un error del análisis de javac («illegal character»); los demás son sintaxis válida (lo decide la semántica).
    expect(forma('nombre-que-empieza-con-un-caracter-invisible').sintaxisValida).toBe(false);
    for (const nombre of ['nombre-con-un-caracter-invisible', 'palabra-clave-con-un-caracter-invisible', 'nombre-repetido-por-un-caracter-invisible', 'tipo-pegado-a-un-caracter-invisible']) expect(forma(nombre).sintaxisValida, nombre).toBe(true);
  });

  it('C-2/W-2: el programa termina cada renglón con un retorno de carro, con CRLF, con LF y CR, o mezclados, sin ningún otro cambio', () => {
    const normal = renderizarPrograma(conLaForma(forma('fin-de-linea-cr'), crearAzar(1), [], [])).replace(/\r/g, '\n');
    expect(normal).toContain('public class P {\n');
    expect(texto('fin-de-linea-cr')).not.toContain('\n');
    expect(texto('fin-de-linea-cr')).toContain('public class P {\r    public static void main');
    expect(texto('fin-de-linea-crlf')).toContain('public class P {\r\n');
    expect(texto('fin-de-linea-crlf').replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    expect(texto('fin-de-linea-lf-y-cr')).toContain('public class P {\n\r');
    const mezclado = texto('fin-de-linea-mezclado');
    expect(mezclado).toMatch(/\r\n/);
    expect(mezclado).toMatch(/[^\r]\n/);
    expect(mezclado).toMatch(/\r[^\n]/);
    for (const nombre of ['fin-de-linea-cr', 'fin-de-linea-crlf', 'fin-de-linea-lf-y-cr', 'fin-de-linea-mezclado']) {
      expect(forma(nombre).sintaxisValida, nombre).toBe(true);
      expect(etiquetasDe(conLaForma(forma(nombre), crearAzar(1), [], [])), nombre).toContain('fin-de-linea-especial');
    }
  });

  it('C-5/W-10: una constante de texto con un decimal en una condición de ciclo, una `final`, una etiqueta de `case` o la asignación definitiva', () => {
    for (const nombre of [
      'decimal-en-la-condicion-de-un-while',
      'decimal-en-la-condicion-de-un-for',
      'decimal-en-la-condicion-de-un-do-while',
      'decimal-en-una-final-y-un-while',
      'decimal-en-una-etiqueta-de-case',
      'decimal-en-una-etiqueta-de-case-con-final',
      'decimal-y-asignacion-definitiva-con-if',
      'decimal-y-asignacion-definitiva-con-while-y-break',
      'decimal-en-una-final-booleana',
      'decimal-sin-decision-de-por-medio',
    ]) {
      expect(forma(nombre).sintaxisValida, nombre).toBe(true);
      for (const semilla of SEMILLAS) {
        const programa = conLaForma(forma(nombre), crearAzar(semilla), [], []);
        expect(etiquetasDe(programa), nombre).toContain('constante-de-texto-con-decimal');
        expect(renderizarPrograma(programa), nombre).toMatch(/"\w+" \+ \d+\.\d+|\d+\.\d+ \+ "\w+"/);
      }
    }
  });

  it('C-4: los textos largos arman la constante plegando `final` (cada una es corta), con el largo en la frontera exacta de cada alfabeto', () => {
    const formasDeTextoLargo = FORMAS_ESTRUCTURALES.filter((candidata) => candidata.nombre.startsWith('texto-largo-') || candidata.nombre.startsWith('receta-'));
    expect(formasDeTextoLargo.length).toBeGreaterThanOrEqual(12);
    for (const candidata of formasDeTextoLargo) {
      expect(candidata.sintaxisValida, candidata.nombre).toBe(true);
      for (const semilla of SEMILLAS) {
        const programa = conLaForma(candidata, crearAzar(semilla), [], []);
        const fuente = renderizarPrograma(programa);
        expect(etiquetasDe(programa), candidata.nombre).toContain('texto-largo');
        // Ningún archivo pesa 64 KB: la constante se arma con ~16 `final` encadenadas.
        expect(fuente.length, candidata.nombre).toBeLessThan(5000);
        expect(fuente, candidata.nombre).toMatch(/final String \w+0 = "[^"]+";/);
      }
    }
    // Con las semillas de la prueba salen los largos de la frontera, no solo uno: 65 534 / 65 535 de `a`, 32 767 / 32 768 `é`, 21 845 / 21 846 `€`, 10 922 / 10 923 emojis.
    const largos = new Set<string>();
    for (const candidata of formasDeTextoLargo) for (const semilla of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) largos.add(texto(candidata.nombre, semilla).includes('é') ? 'é' : texto(candidata.nombre, semilla).includes('€') ? '€' : texto(candidata.nombre, semilla).includes('😀') ? '😀' : 'a');
    expect([...largos].sort()).toEqual(['a', 'é', '€', '😀'].sort());
  });
});
