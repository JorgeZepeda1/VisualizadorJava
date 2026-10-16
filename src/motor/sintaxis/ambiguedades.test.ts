// RED de la tarea 1.4 (ambigüedades del parser, design.md §2.5): cast-vs-paréntesis (JLS 15.16),
// declaración-vs-expresión, y los literales enteros/largos válidos SOLO como operando directo de
// un "-" unario (JLS 3.10.1: MIN_VALUE de int/long).
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from './analizador-sintactico.ts';
import { CursorDeTokens } from './cursor-de-tokens.ts';
import { analizarExpresion } from './expresiones.ts';
import { ErrorDeCompilacion } from '../error-de-compilacion.ts';
import type { NodoDeclaracionLocal } from './ast.ts';

function analizar(fuente: string) {
  return analizarPrograma(tokenizar(fuente));
}

function expresionDe(texto: string) {
  return analizarExpresion(new CursorDeTokens(tokenizar(texto)));
}

describe('ambigüedades — cast vs. paréntesis (design.md §2.5.1, JLS 15.16)', () => {
  it('"(Foo) x" es un cast: tras "(Nombre)" sigue algo que abre una expresión unaria', () => {
    expect(expresionDe('(Foo) x')).toMatchObject({
      tipo: 'conversion',
      nombreTipo: 'Foo',
      operando: { tipo: 'nombre', nombre: 'x' },
    });
  });

  it('"(Foo) - x" NO es un cast: "-" no abre una expresión unaria sin signo, es resta', () => {
    const expr = expresionDe('(Foo) - x');
    expect(expr).toMatchObject({
      tipo: 'binaria',
      operador: '-',
      izquierda: { tipo: 'nombre', nombre: 'Foo' },
      derecha: { tipo: 'nombre', nombre: 'x' },
    });
  });

  it('"(Foo) + x" tampoco es un cast, por la misma razón (triangulación de +)', () => {
    const expr = expresionDe('(Foo) + x');
    expect(expr).toMatchObject({ tipo: 'binaria', operador: '+' });
  });

  it('"(x)" solo (nada después) es agrupación, no cast', () => {
    expect(expresionDe('(x)')).toMatchObject({ tipo: 'nombre', nombre: 'x' });
  });

  it('un tipo primitivo entre paréntesis SIEMPRE es cast, incluso si lo que sigue es inusual', () => {
    // "(int) -x" es cast de "-x" (unario soportado), no depende de la regla de Nombre.
    expect(expresionDe('(int) -x')).toMatchObject({
      tipo: 'conversion',
      nombreTipo: 'int',
      operando: { tipo: 'unaria', operador: '-' },
    });
  });

  it('paréntesis normales con una expresión aritmética adentro siguen funcionando (regresión)', () => {
    expect(expresionDe('(1 + 2)')).toMatchObject({ tipo: 'binaria', operador: '+' });
  });
});

describe('ambigüedades — declaración vs. expresión (design.md §2.5.2)', () => {
  it('"Nombre Id" es declaración incluso con un nombre de tipo que no existe (err18: "string" minúscula)', () => {
    // La validez del tipo la juzga atribución (tarea 1.7+); aquí solo importa que "string nombre"
    // se reconoce sintácticamente como intento de declaración, igual que "String nombre".
    const fuente = 'class C { public static void main(String[] a) { string nombre = "Ana"; } }';
    const programa = analizar(fuente);
    const [declaracion] = programa.clase.main!.cuerpo.elementos as [NodoDeclaracionLocal];
    expect(declaracion.tipo).toBe('declaracion-local');
    expect(declaracion.nombreTipo).toBe('string');
  });

  it('una asignación "x = 5;" como sentencia suelta NO se confunde con una declaración (actualizada en 1.5)', () => {
    // Actualización de approval test (sub-lote 1-B): la tarea 1.5 agregó soporte real de
    // ExprSentencia, así que "x = 5;" ahora SÍ compila (ya no lanza) — lo que sigue probando esta
    // ambigüedad es que "x" (un solo identificador seguido de "=", no de OTRO identificador) nunca
    // se malinterpreta como intento de DeclLocal: se analiza como una sentencia de asignación.
    const fuente = 'class C { public static void main(String[] a) { x = 5; } }';
    const programa = analizar(fuente);
    const [sentencia] = programa.clase.main!.cuerpo.elementos;
    expect(sentencia.tipo).toBe('sentencia-expresion');
    expect((sentencia as { expresion: { tipo: string } }).expresion.tipo).toBe('asignacion');
  });

  it('una declaración de tipo primitivo sigue funcionando (regresión, sin ambigüedad real)', () => {
    const fuente = 'class C { public static void main(String[] a) { int x = 1; } }';
    const programa = analizar(fuente);
    expect(programa.clase.main!.cuerpo.elementos[0].tipo).toBe('declaracion-local');
  });
});

describe('ambigüedades — literales en el borde de int/long (design.md §2.5.3, JLS 3.10.1)', () => {
  it('-2147483648 (MIN_VALUE de int) es válido SOLO tras "-" unario', () => {
    expect(expresionDe('-2147483648')).toMatchObject({ tipo: 'literal-entero', valor: -2147483648n });
  });

  it('-9223372036854775808L (MIN_VALUE de long) es válido tras "-" unario (triangulación de long)', () => {
    expect(expresionDe('-9223372036854775808L')).toMatchObject({
      tipo: 'literal-largo',
      valor: -9223372036854775808n,
    });
  });

  it('2147483648 SIN el "-" unario es "integer number too large": error de compilación', () => {
    expect(() => expresionDe('2147483648')).toThrow(ErrorDeCompilacion);
  });

  it('9223372036854775808L sin "-" unario también es demasiado grande (triangulación de long)', () => {
    expect(() => expresionDe('9223372036854775808L')).toThrow(ErrorDeCompilacion);
  });

  it('5000000000 sin "L" no compila: excede el rango de int aunque quepa en long (REQ-SUB-002)', () => {
    // Un literal decimal sin "L" siempre es de tipo int en Java, sin importar a qué se asigne.
    expect(() => expresionDe('5000000000')).toThrow(ErrorDeCompilacion);
  });

  it('el mismo valor SÍ compila con el sufijo "L" (contraste directo)', () => {
    expect(expresionDe('5000000000L')).toMatchObject({ tipo: 'literal-largo', valor: 5000000000n });
  });

  it('2147483647 (int MAX_VALUE) compila sin "-" (límite exacto permitido)', () => {
    expect(expresionDe('2147483647')).toMatchObject({ tipo: 'literal-entero', valor: 2147483647n });
  });

  it('-2147483649 (un valor MÁS que MIN_VALUE) sigue siendo demasiado grande incluso con "-"', () => {
    expect(() => expresionDe('-2147483649')).toThrow(ErrorDeCompilacion);
  });

  it('el "-" unario sobre una variable (no literal) nunca activa el caso especial (regresión)', () => {
    expect(expresionDe('-x')).toMatchObject({ tipo: 'unaria', operador: '-', operando: { nombre: 'x' } });
  });
});
