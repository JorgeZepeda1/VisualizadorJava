// RED de la tarea 1.31: el reductor (delta debugging por sentencias y subexpresiones). Reduce un
// programa que exhibe una discrepancia al programa MÁS CHICO que sigue exhibiéndola. Aquí se prueba con
// predicados falsos («conserva si el texto contiene …»), sin JDK ni compilador: lo que importa es que
// proponga los candidatos correctos, que se quede con la reducción más grande que conserve la propiedad,
// que termine siempre y que trabaje en rondas por lotes (un solo llamado al predicado por ronda para
// todos los programas, porque cada llamado real cuesta el arranque de una JVM). La prueba de que la
// discrepancia se conserva de verdad, contra javac, vive en `campana.test.ts`.
import { describe, expect, it } from 'vitest';
import {
  declaracion,
  literal,
  mientras,
  nombre,
  plantilla,
  renderizarPrograma,
  salto,
  sentenciaExpr,
  seleccion,
  si,
  type Programa,
  type Sentencia,
} from './programa.ts';
import { reducirEnRondas, variantesDeExpresiones, variantesDeSentencias, type CandidatoDeReduccion } from './reductor.ts';

function programa(...sentencias: Sentencia[]): Programa {
  return { imports: [], sentencias };
}

const castDeCadena = () => plantilla(['(int) ', ''], [literal('"5"', 'String')], 'int', { etiquetas: ['cast'] });
const imprimir = (texto: string) => sentenciaExpr(plantilla(['System.out.println(', ')'], [literal(texto, 'String')], 'void', { etiquetas: ['impresion'] }));
const cuerpoDe = (p: Programa): string => renderizarPrograma(p).split('\n').slice(2, -3).map((l) => l.trim()).join(' ');

describe('variantesDeSentencias — los candidatos que quitan sentencias', () => {
  const original = programa(
    declaracion({ tipo: 'int', nombre: 'a', inicial: literal('1', 'int') }),
    declaracion({ tipo: 'int', nombre: 'x', inicial: castDeCadena() }),
    imprimir('"fin"'),
  );

  it('propone quedarse con UNA sola sentencia (lo más agresivo, primero) y también quitar UNA', () => {
    const cuerpos = variantesDeSentencias(original).map(cuerpoDe);
    expect(cuerpos.slice(0, 3)).toEqual(['int a = 1;', 'int x = (int) "5";', 'System.out.println("fin");']);
    expect(cuerpos).toContain('int x = (int) "5"; System.out.println("fin");');
    expect(cuerpos).toContain('int a = 1; System.out.println("fin");');
    expect(cuerpos).toContain('int a = 1; int x = (int) "5";');
  });

  it('cada candidato es estrictamente más chico que el original (así la reducción termina)', () => {
    const largo = renderizarPrograma(original).length;
    for (const candidato of variantesDeSentencias(original)) expect(renderizarPrograma(candidato).length).toBeLessThan(largo);
  });

  it('un programa de una sola sentencia puede quedar sin ninguna, pero no propone «quedarse con la única»', () => {
    const uno = programa(imprimir('"a"'));
    const cuerpos = variantesDeSentencias(uno).map(cuerpoDe);
    expect(cuerpos).toEqual(['']);
  });

  it('baja al cuerpo de una sentencia compuesta: un if se sustituye por lo que contiene, y se le puede quitar el else', () => {
    const conIf = programa(si(nombre('c', 'boolean'), [imprimir('"a"')], [imprimir('"b"')]));
    const cuerpos = variantesDeSentencias(conIf).map(cuerpoDe);
    expect(cuerpos).toContain('System.out.println("a");');
    expect(cuerpos).toContain('System.out.println("b");');
    expect(cuerpos).toContain('if (c) { System.out.println("a"); }');
  });

  it('entra en los cuerpos de los ciclos y de los casos de un switch', () => {
    const p = programa(
      mientras(nombre('c', 'boolean'), [imprimir('"a"'), salto('break')]),
      seleccion({ selector: nombre('n', 'int'), casos: [{ etiquetas: [literal('1', 'int')], cuerpo: [imprimir('"x"'), salto('break')] }], flecha: false }),
    );
    const cuerpos = variantesDeSentencias(p).map(cuerpoDe);
    expect(cuerpos).toContain('while (c) { break; } switch (n) { case 1: System.out.println("x"); break; }');
    expect(cuerpos).toContain('while (c) { System.out.println("a"); break; } switch (n) { case 1: break; }');
  });

  it('también propone quitar cada import', () => {
    const conImport: Programa = { imports: ['import java.util.Scanner;'], sentencias: [imprimir('"a"')] };
    const sinImport = variantesDeSentencias(conImport).find((c) => c.imports.length === 0 && c.sentencias.length === 1);
    expect(sinImport).toBeDefined();
  });
});

describe('variantesDeExpresiones — los candidatos que simplifican una expresión', () => {
  const original = programa(declaracion({ tipo: 'int', nombre: 'x', inicial: castDeCadena() }));

  it('sustituye la expresión por un literal de su tipo, o por una de sus partes', () => {
    const cuerpos = variantesDeExpresiones(original).map(cuerpoDe);
    expect(cuerpos).toContain('int x = 0;');
    expect(cuerpos).toContain('int x = "5";');
  });

  it('propone quitar el valor inicial de una declaración y el final', () => {
    const conFinal = programa(declaracion({ tipo: 'int', nombre: 'x', inicial: literal('1000', 'int'), esFinal: true }));
    const cuerpos = variantesDeExpresiones(conFinal).map(cuerpoDe);
    expect(cuerpos).toContain('final int x;');
    expect(cuerpos).toContain('int x = 1000;');
  });

  it('simplifica una subexpresión anidada sin tocar el resto (la suma de adentro de una llamada)', () => {
    const suma = plantilla(['', ' + ', ''], [literal('1', 'int'), literal('2', 'int')], 'int');
    const llamada = plantilla(['Math.abs(', ')'], [suma], 'int', { primaria: true });
    const p = programa(declaracion({ tipo: 'int', nombre: 'x', inicial: llamada }));
    const cuerpos = variantesDeExpresiones(p).map(cuerpoDe);
    expect(cuerpos).toContain('int x = Math.abs(0);');
    expect(cuerpos).toContain('int x = Math.abs(1);');
  });

  it('nunca propone un candidato que no sea estrictamente más chico', () => {
    const largo = renderizarPrograma(original).length;
    for (const candidato of variantesDeExpresiones(original)) expect(renderizarPrograma(candidato).length).toBeLessThan(largo);
  });

  it('un literal ya mínimo no genera candidatos', () => {
    const minimo = programa(declaracion({ tipo: 'int', nombre: 'x', inicial: literal('0', 'int') }));
    expect(variantesDeExpresiones(minimo).map(cuerpoDe)).toEqual(['int x;']);
  });
});

describe('reducirEnRondas — el bucle de reducción por lotes', () => {
  const contiene = (patron: string) => async (candidatos: readonly CandidatoDeReduccion[]): Promise<boolean[]> => candidatos.map((c) => c.fuente.includes(patron));

  const grande = programa(
    declaracion({ tipo: 'int', nombre: 'a', inicial: literal('1', 'int') }),
    imprimir('"hola"'),
    declaracion({ tipo: 'int', nombre: 'x', inicial: plantilla(['(int) ', ''], [plantilla(['', ' + ', ''], [literal('"5"', 'String'), literal('1', 'int')], 'String')], 'int', { etiquetas: ['cast'] }) }),
    si(nombre('c', 'boolean'), [imprimir('"a"')], null),
  );

  it('reduce al programa más chico que conserva la propiedad (aquí, contener el cast de una cadena)', async () => {
    const [reducido] = await reducirEnRondas([grande], contiene('(int) '));
    // Quedó una sola sentencia y su operando (`"5" + 1`, de tipo String) se redujo a la cadena vacía.
    expect(cuerpoDe(reducido!)).toBe('int x = (int) "";');
  });

  it('el resultado sigue teniendo la propiedad y no es más grande que el original', async () => {
    const [reducido] = await reducirEnRondas([grande], contiene('(int) '));
    expect(renderizarPrograma(reducido!)).toContain('(int) ');
    expect(renderizarPrograma(reducido!).length).toBeLessThan(renderizarPrograma(grande).length);
  });

  it('es determinista: dos corridas dan el mismo programa', async () => {
    const primera = await reducirEnRondas([grande], contiene('(int) '));
    const segunda = await reducirEnRondas([grande], contiene('(int) '));
    expect(primera.map(renderizarPrograma)).toEqual(segunda.map(renderizarPrograma));
  });

  it('si ningún candidato conserva la propiedad, devuelve el programa tal cual', async () => {
    const [reducido] = await reducirEnRondas([grande], async (candidatos) => candidatos.map(() => false));
    expect(renderizarPrograma(reducido!)).toBe(renderizarPrograma(grande));
  });

  it('termina aunque todo candidato sirva: llega al programa vacío', async () => {
    const [reducido] = await reducirEnRondas([grande], async (candidatos) => candidatos.map(() => true));
    expect(reducido!.sentencias).toEqual([]);
  });

  it('trabaja en rondas por lotes: UN llamado al predicado por ronda para todos los programas a la vez', async () => {
    const otro = programa(imprimir('"z"'), declaracion({ tipo: 'int', nombre: 'y', inicial: castDeCadena() }));
    let llamados = 0;
    const tamanosDeLote: number[] = [];
    const predicado = async (candidatos: readonly CandidatoDeReduccion[]): Promise<boolean[]> => {
      llamados += 1;
      tamanosDeLote.push(candidatos.length);
      return candidatos.map((c) => c.fuente.includes('(int) '));
    };
    const reducidos = await reducirEnRondas([grande, otro], predicado);
    expect(reducidos.map(cuerpoDe)).toEqual(['int x = (int) "";', 'int y = (int) "";']);
    // Con dos programas y un predicado por lote, las rondas no se multiplican por el número de programas.
    expect(llamados).toBeLessThanOrEqual(10);
    expect(tamanosDeLote[0]).toBeGreaterThan(5);
  });

  it('con una lista vacía no llama al predicado', async () => {
    let llamados = 0;
    await reducirEnRondas([], async (candidatos) => {
      llamados += 1;
      return candidatos.map(() => true);
    });
    expect(llamados).toBe(0);
  });

  it('a cada candidato le pone el índice del programa del que salió (el predicado real necesita saber contra qué discrepancia comparar)', async () => {
    const otro = programa(imprimir('"z"'), declaracion({ tipo: 'int', nombre: 'y', inicial: castDeCadena() }));
    const vistos = new Map<number, Set<string>>();
    await reducirEnRondas([grande, otro], async (candidatos) => {
      for (const { indice, fuente } of candidatos) vistos.set(indice, (vistos.get(indice) ?? new Set()).add(fuente));
      return candidatos.map(() => false);
    });
    expect([...vistos.keys()].sort()).toEqual([0, 1]);
    // Los candidatos del programa 1 salen del programa `otro`: ninguno menciona el `if` ni «hola» del programa 0.
    expect([...vistos.get(1)!].every((fuente) => !fuente.includes('"hola"'))).toBe(true);
    expect([...vistos.get(0)!].some((fuente) => fuente.includes('"hola"'))).toBe(true);
  });
});

// ---- Tarea 1.34: la clase con nombre del JDK y las sentencias antes del primer `case` también se reducen ----
describe('variantesDeSentencias — el nombre de la clase y las sentencias de `antes` (tarea 1.34)', () => {
  const conClase = (clase: string, ...sentencias: Sentencia[]): Programa => ({ imports: [], clase, sentencias });

  it('propone devolverle a la clase el nombre P: si la discrepancia no depende del nombre, el mínimo ya no lo lleva', () => {
    const candidatos = variantesDeSentencias(conClase('Scanner', imprimir('"a"'), imprimir('"b"')));
    const sinNombre = candidatos.filter((c) => c.clase === undefined || c.clase === 'P');
    expect(sinNombre.length).toBeGreaterThan(0);
    expect(sinNombre.map((c) => renderizarPrograma(c).split('\n')[0])).toContain('public class P {');
    // Y sigue proponiendo quitar sentencias CONSERVANDO el nombre: así se ve cuándo la discrepancia SÍ depende de él.
    expect(candidatos.some((c) => c.clase === 'Scanner' && c.sentencias.length === 1)).toBe(true);
  });

  it('un programa que ya se llama P no propone ningún candidato sobre la clase', () => {
    const candidatos = variantesDeSentencias(programa(imprimir('"a"'), imprimir('"b"')));
    expect(candidatos.every((c) => c.clase === undefined)).toBe(true);
  });

  it('propone quitar cada sentencia de `antes`, todas juntas, y entrar a lo que contienen', () => {
    const p = programa(
      seleccion({
        selector: nombre('n', 'int'),
        antes: [salto('break'), si(nombre('c', 'boolean'), [imprimir('"x"')], null)],
        casos: [{ etiquetas: [literal('1', 'int')], cuerpo: [salto('break')] }],
        flecha: false,
      }),
    );
    const cuerpos = variantesDeSentencias(p).map(cuerpoDe);
    expect(cuerpos).toContain('switch (n) { if (c) { System.out.println("x"); } case 1: break; }');
    expect(cuerpos).toContain('switch (n) { break; case 1: break; }');
    expect(cuerpos).toContain('switch (n) { case 1: break; }');
    expect(cuerpos).toContain('switch (n) { break; if (c) { } case 1: break; }');
  });

  it('simplifica también las expresiones de las sentencias de `antes`', () => {
    const p = programa(
      seleccion({ selector: nombre('n', 'int'), antes: [declaracion({ tipo: 'int', nombre: 'x', inicial: castDeCadena() })], casos: [], flecha: false }),
    );
    const cuerpos = variantesDeExpresiones(p).map(cuerpoDe);
    expect(cuerpos).toContain('switch (n) { int x = 0; }');
    expect(cuerpos).toContain('switch (n) { int x; }');
  });

  it('todo candidato sigue siendo estrictamente más chico que el original (la reducción termina)', () => {
    const p = conClase('System', seleccion({ selector: nombre('n', 'int'), antes: [salto('break')], casos: [{ etiquetas: 'default', cuerpo: [] }], flecha: false }));
    const largo = renderizarPrograma(p).length;
    for (const candidato of [...variantesDeSentencias(p), ...variantesDeExpresiones(p)]) expect(renderizarPrograma(candidato).length).toBeLessThan(largo);
  });
});
