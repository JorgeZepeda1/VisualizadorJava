// C1 y C2 del panel 1 (2026-10-17), contra programas REALES del corpus y el motor real: el robot nunca afirma algo falso de Java (D2). El panel encontró que el narrador decía «`25 / 3`, que da 8.0» cuando
// en Java `25 / 3` da 8 y el 8.0 aparece al guardarlo en un `double` (JLS 5.2). Aquí no se prueba con datos armados a mano: se corre el programa del corpus con el intérprete, se toma la frase de cada paso por el
// mismo camino que la pantalla (`Paso.explicacion` → catálogo es-MX) y se compara con lo que el JDK 17 real imprimió (los goldens del oráculo, sin necesitar el JDK).
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { crearEjecucion } from '../../src/motor/interprete/ejecucion.ts';
import type { Paso } from '../../src/motor/vista.ts';
import { textoDeExplicacion } from '../../src/textos/es-MX/explicaciones.ts';
import { programasDelCorpusConVeredicto } from '../compilacion/corpus-con-veredicto.ts';

/** Ejecuta un programa del corpus con la entrada de su golden y devuelve sus pasos (a lo más `tope`). */
function pasosDe(id: string, fuente: string, tope = 3_000): Paso[] | null {
  const compilado = compilar(fuente);
  if (!compilado.ok || compilado.programa.arranque !== null) return null;
  const entradaDelGolden = `${resolve(id.slice(0, -'.java'.length))}.entrada.txt`;
  const ejecucion = crearEjecucion(compilado.programa, {
    regional: 'es-MX',
    semilla: 0n,
    entradaPreparada: existsSync(entradaDelGolden) ? readFileSync(entradaDelGolden, 'utf-8') : '',
    entradaInteractiva: false,
    limitePasos: tope,
    limiteCaracteres: 1_048_576,
  });
  const pasos: Paso[] = [];
  for (;;) {
    const avance = ejecucion.avanzar(500);
    pasos.push(...avance.pasos);
    if (avance.estado !== 'continua' || pasos.length >= tope) return pasos;
  }
}

function delCorpus(ruta: string): { id: string; fuente: string; salidaDelJdk: string[] } {
  const id = `corpus/${ruta}`;
  return { id, fuente: readFileSync(resolve(id), 'utf-8'), salidaDelJdk: readFileSync(resolve(`${id.slice(0, -'.java'.length)}.salida`), 'utf-8').split('\n').slice(0, -1) };
}

describe('C1: el narrador separa el cálculo de la conversión al guardar, con un programa de división entera del corpus', () => {
  const { id, fuente, salidaDelJdk } = delCorpus('experimentos/numeros/candidatos/Candidato02_DivisionYModulo.java');
  const pasos = pasosDe(id, fuente) ?? [];
  const frases = pasos.map((paso) => ({ linea: paso.linea, texto: textoDeExplicacion(paso.explicacion) }));

  it('el programa tiene `double d = 5 / 2;` en la línea 9 y se ejecutó completo (8 pasos: 7 impresiones, la declaración y la impresión de `d`)', () => {
    expect(pasos).toHaveLength(8);
    expect(fuente.split('\n')[8]).toBe('        double d = 5 / 2;');
  });

  it('en la línea 9 el robot dice que `5 / 2` da 2 y que el 2.0 es lo que se guarda en el `double`', () => {
    const frase = frases.find((f) => f.linea === 9);
    expect(frase?.texto).toBe('Calculo `5 / 2`, que da 2. Creo la variable `d` de tipo double. Como `d` es `double`, guardo 2.0.');
  });

  it('coincide con el JDK real: un `7 / 2` impreso da 3 (división entera, sin «.0») y la `d` que se guardó se imprime 2.0', () => {
    expect(salidaDelJdk[0]).toBe('3'); // System.out.println(7 / 2): Java divide como enteros y NO escribe «3.0»
    expect(salidaDelJdk[salidaDelJdk.length - 1]).toBe('2.0'); // System.out.println(d): lo guardado en el double
    const impresion = frases.filter((f) => f.linea === 4).map((f) => f.texto);
    expect(impresion).toEqual(['Imprimo en la consola: «-3» y paso a la línea siguiente.']); // el robot también imprime -3, no -3.0
  });
});

describe('C1: `double suma = 0;` (acumulador del currículo, U6) guarda un 0 que se vuelve 0.0 al guardarlo', () => {
  const { id, fuente } = delCorpus('curso/u6-acumulador-promedio-calificaciones.java');

  it('el robot dice que se guarda 0.0 porque `suma` es `double`, no que el cálculo dé 0.0', () => {
    const paso = (pasosDe(id, fuente) ?? []).find((p) => p.linea === 6);
    expect(paso && textoDeExplicacion(paso.explicacion)).toBe('Creo la variable `suma` de tipo double. Como `suma` es `double`, guardo 0.0.');
  });
});

// C2 contra el JDK real: el corpus trae `e09-orden-de-evaluacion` (el orden de evaluación de `i++ + ++i`, `j = j++`, `y += y++`…) y `e10-asignacion-compuesta` (`x *= 1000000000L` recorta a `int`), con la salida
// que el JDK 17 imprimió. Lo que el robot cuenta de cada paso tiene que ser lo que el JDK dejó a la vista.
describe('C2: los efectos de `++` y los recortes que cuenta el robot coinciden con la salida del JDK real', () => {
  const frasesDe = (ruta: string): { linea: number; texto: string }[] => {
    const { id, fuente } = delCorpus(ruta);
    return (pasosDe(id, fuente) ?? []).map((paso) => ({ linea: paso.linea, texto: textoDeExplicacion(paso.explicacion) }));
  };

  it('`int r = i++ + ++i;` con `i = 5`: el robot dice 5, 7 y 12, y el JDK imprimió «r = 12 i = 7»', () => {
    const { salidaDelJdk } = delCorpus('experimentos/ejecucion/e09-orden-de-evaluacion.java');
    expect(salidaDelJdk[0]).toBe('i++ + ++i: r = 12 i = 7');
    expect(frasesDe('experimentos/ejecucion/e09-orden-de-evaluacion.java').find((f) => f.linea === 4)?.texto).toBe(
      'Calculo `i++ + ++i`, que da 12. `i++` vale 5 y deja `i` en 6. `++i` vale 7 y deja `i` en 7. Creo la variable `r` de tipo int y le guardo 12.',
    );
  });

  it('`j = j++;` con `j = 3`: el `j++` sube `j` a 4 pero se guarda el 3 de antes (por eso «antes valía 4»); el JDK imprimió 3', () => {
    const { salidaDelJdk } = delCorpus('experimentos/ejecucion/e09-orden-de-evaluacion.java');
    expect(salidaDelJdk[1]).toBe('j = j++: 3');
    expect(frasesDe('experimentos/ejecucion/e09-orden-de-evaluacion.java').find((f) => f.linea === 7)?.texto).toBe(
      'Calculo `j++`, que da 3. `j++` vale 3 y deja `j` en 4. Guardo 3 en `j`; antes valía 4.',
    );
  });

  it('`y += y++;` con `y = 4`: lee `y` (4), el `y++` vale 4 y deja `y` en 5, y se guarda 4 + 4 = 8; el JDK imprimió 8', () => {
    const { salidaDelJdk } = delCorpus('experimentos/ejecucion/e09-orden-de-evaluacion.java');
    expect(salidaDelJdk[4]).toBe('y += y++: 8');
    expect(frasesDe('experimentos/ejecucion/e09-orden-de-evaluacion.java').find((f) => f.linea === 16)?.texto).toBe(
      '`y += y++`: el lado derecho vale 4 y `y` valía 4. `y++` vale 4 y deja `y` en 5. Guardo 8 en `y`.',
    );
  });

  it('`x *= 1000000000L;` con `int x = 104`: la multiplicación da 104000000000 (un `long`) y el `int` se queda con 920784896, que es lo que el JDK imprimió', () => {
    const { salidaDelJdk } = delCorpus('experimentos/ejecucion/e10-asignacion-compuesta.java');
    expect(salidaDelJdk[7]).toBe('920784896');
    expect(frasesDe('experimentos/ejecucion/e10-asignacion-compuesta.java').find((f) => f.linea === 18)?.texto).toBe(
      '`x *= 1000000000L`: el lado derecho vale 1000000000 y `x` valía 104. `104 * 1000000000` da 104000000000 y, como `x` es `int`, se queda con 920784896. Guardo 920784896 en `x`.',
    );
  });

  it("`char d = 'b'; d += 2;`: la suma da 100 (un `int`) y el `char` se queda con 'd', que es lo que el JDK imprimió", () => {
    const { salidaDelJdk } = delCorpus('experimentos/ejecucion/e04-char-aritmetica.java');
    expect(salidaDelJdk).toContain('d');
    expect(frasesDe('experimentos/ejecucion/e04-char-aritmetica.java').find((f) => f.linea === 15)?.texto).toBe(
      "`d += 2`: el lado derecho vale 2 y `d` valía 'b'. `'b' + 2` da 100 y, como `d` es `char`, se queda con 'd'. Guardo 'd' en `d`.",
    );
  });
});

describe('C1 y C2 sobre TODO el corpus que el motor ejecuta: cada conversión, recorte y efecto que el robot cuenta es consistente con los valores del motor', () => {
  const programas = programasDelCorpusConVeredicto().filter((programa) => programa.compilo);
  const todos = programas.flatMap((programa) => (pasosDe(programa.id, programa.fuente) ?? []).map((paso) => ({ programa: programa.id, paso })));

  it('hay pasos con conversión, con recorte y con efectos de `++` en el corpus (la revisión no recorre un conjunto vacío)', () => {
    const con = (cual: 'conversion' | 'recorte' | 'efectos'): number => todos.filter(({ paso }) => cual in (paso.explicacion.datos as object)).length;
    expect(con('conversion')).toBeGreaterThan(5);
    expect(con('recorte')).toBeGreaterThan(5);
    expect(con('efectos')).toBeGreaterThan(5);
  });

  it('una conversión al guardar: el robot dice «Como `x` es `T`, guardo V» y NUNCA «que da V» con el valor ya convertido', () => {
    const conConversion = todos.filter(({ paso }) => 'conversion' in paso.explicacion.datos);
    expect(conConversion.length).toBeGreaterThan(5);
    for (const { programa, paso } of conConversion) {
      if (paso.explicacion.clave !== 'declaracion-con-valor' && paso.explicacion.clave !== 'asignacion') continue;
      const { nombre, valor, conversion } = paso.explicacion.datos;
      if (conversion === undefined) continue;
      const texto = textoDeExplicacion(paso.explicacion);
      expect(texto, `${programa} L${paso.linea}`).toContain(`Como \`${nombre}\` es \`${conversion.tipo}\`, guardo ${valor}`);
      expect(texto, `${programa} L${paso.linea}`).not.toContain(`que da ${valor}`);
      expect(conversion.antes, `${programa} L${paso.linea}`).not.toBe(valor);
    }
  });

  it('un ensanchamiento numérico conserva el número: lo que dio el cálculo (8) y lo guardado (8.0) valen lo mismo, solo cambia cómo se escribe', () => {
    for (const { programa, paso } of todos) {
      if (paso.explicacion.clave !== 'declaracion-con-valor' && paso.explicacion.clave !== 'asignacion') continue;
      const { valor, conversion } = paso.explicacion.datos;
      if (conversion === undefined || conversion.tipo === 'char' || /^'/.test(conversion.antes) || /^'/.test(valor)) continue;
      expect(Number(conversion.antes), `${programa} L${paso.linea}: ${conversion.antes} → ${valor}`).toBe(Number(valor));
    }
  });

  it('un recorte: el robot dice «se queda con V» y lo que dio la operación (operado) es distinto de lo guardado', () => {
    for (const { programa, paso } of todos) {
      if (paso.explicacion.clave !== 'asignacion-compuesta') continue;
      const { recorte, valor } = paso.explicacion.datos;
      if (recorte === undefined) continue;
      expect(recorte.operado, `${programa} L${paso.linea}`).not.toBe(valor);
      expect(textoDeExplicacion(paso.explicacion), `${programa} L${paso.linea}`).toContain(`se queda con ${valor}.`);
    }
  });

  it('un efecto de `++`/`--`: lo que la expresión vale y lo que deja en la variable difieren en uno, y el robot lo dice', () => {
    const conEfectos = todos.filter(({ paso }) => 'efectos' in paso.explicacion.datos);
    expect(conEfectos.length).toBeGreaterThan(0);
    for (const { programa, paso } of conEfectos) {
      const efectos = (paso.explicacion.datos as { efectos: readonly { expresion: string; nombre: string; valor: string; nuevo: string }[] }).efectos;
      const texto = textoDeExplicacion(paso.explicacion);
      for (const efecto of efectos) {
        // Un `char` se escribe entre comillas ('a' → 'b'): ahí no hay un número que restar.
        if (!efecto.valor.startsWith("'")) {
          expect(Math.abs(Number(efecto.nuevo) - Number(efecto.valor)), `${programa} L${paso.linea}: ${efecto.expresion}`).toBeLessThanOrEqual(1);
        }
        expect(texto, `${programa} L${paso.linea}`).toContain(`\`${efecto.expresion}\` vale ${efecto.valor} y deja \`${efecto.nombre}\` en ${efecto.nuevo}.`);
      }
    }
  });
});
