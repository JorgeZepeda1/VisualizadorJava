// RED de la tarea 0.12 (rebanada vertical, sin cambios) + tarea 1.1 (léxico completo, design.md
// §2.6): catálogo completo de escapes de cadena/char (incluidos los NO-DISP: \r \b \f \s y octales
// \0-\377, que NO abortan el análisis — ADR 003) y decodificación de literales numéricos (enteros
// con "_", "long" con "L", "double" con punto/exponente/sufijo "d", hex/octal/binario/float como
// NoSoportado).
import { describe, expect, it } from 'vitest';
import { leerCadena, leerCaracter, leerNumero } from './literales.ts';

describe('leerCadena', () => {
  it('lee una cadena simple sin escapes y reporta cuánto texto fuente consumió', () => {
    const resultado = leerCadena('"Hola, mundo"', 0);
    expect(resultado.valor).toBe('Hola, mundo');
    expect(resultado.longitud).toBe(13);
    expect(resultado.noSoportados).toEqual([]);
  });

  it('decodifica \\" y \\\\ dentro de la cadena', () => {
    const resultado = leerCadena(String.raw`"di \"hola\\" `, 0);
    expect(resultado.valor).toBe('di "hola\\');
  });

  it('decodifica \\n y \\t', () => {
    const resultado = leerCadena(String.raw`"a\nb\tc"`, 0);
    expect(resultado.valor).toBe('a\nb\tc');
  });

  it('decodifica \\\' (comilla simple, catálogo completo de la tarea 1.1)', () => {
    const resultado = leerCadena(String.raw`"puede escribir \'"`, 0);
    expect(resultado.valor).toBe("puede escribir '");
  });

  it('lee la cadena a partir de un desplazamiento distinto de 0', () => {
    const resultado = leerCadena('  "ho"', 2);
    expect(resultado).toEqual({ valor: 'ho', longitud: 4, noSoportados: [] });
  });

  it('lanza un error con rango si la cadena no cierra', () => {
    expect(() => leerCadena('"sin cerrar', 0)).toThrow();
  });

  it('lanza un error si el escape no es reconocido ni siquiera por Java (\\q no existe)', () => {
    expect(() => leerCadena(String.raw`"\q"`, 0)).toThrow();
  });

  it('un escape válido en Java pero no soportado (\\r) no aborta: produce NoSoportado y sigue', () => {
    const resultado = leerCadena(String.raw`"antes\rdespues"`, 0);
    expect(resultado.noSoportados).toHaveLength(1);
    expect(resultado.noSoportados[0].codigo).toBe('escape-no-soportado');
    expect(resultado.noSoportados[0].rango).toEqual({ inicio: 6, fin: 8 });
    // El resto de la cadena se sigue leyendo (ADR 003: "deja seguir").
    expect(resultado.longitud).toBe(16);
  });

  it('\\b, \\f y \\s también son NoSoportado, no error (design.md §2.6)', () => {
    expect(leerCadena(String.raw`"\b"`, 0).noSoportados[0].codigo).toBe('escape-no-soportado');
    expect(leerCadena(String.raw`"\f"`, 0).noSoportados[0].codigo).toBe('escape-no-soportado');
    expect(leerCadena(String.raw`"\s"`, 0).noSoportados[0].codigo).toBe('escape-no-soportado');
  });

  it('escape octal (\\0-\\377) es NoSoportado, con el valor decimal en la nota', () => {
    const resultado = leerCadena(String.raw`"\101"`, 0); // octal 101 = 65
    expect(resultado.noSoportados[0].codigo).toBe('escape-octal-no-soportado');
    expect(resultado.noSoportados[0].nota).toContain('65');
  });

  it('escape unicode \\uXXXX dentro de una cadena es NoSoportado, no error', () => {
    // Nota: NO se usa String.raw con "A" literal en el código fuente de esta prueba porque
    // el propio canal de escritura de archivos decodifica silenciosamente un "\uXXXX" bien
    // formado (4 hex) antes de que llegue al disco (hallazgo de esta sesión); la barra invertida
    // doblada en un template NO-raw sí sobrevive y Node la decodifica UNA sola vez al ejecutar.
    const fuente = `"a\\u0041b"`;
    const resultado = leerCadena(fuente, 0);
    expect(resultado.noSoportados).toHaveLength(1);
    expect(resultado.noSoportados[0].codigo).toBe('escape-unicode-no-soportado');
    // Sigue leyendo el resto de la cadena tras el escape (triangulación: dos unidades más).
    expect(resultado.longitud).toBe(10);
  });

  it('\\u sin 4 dígitos hexadecimales completos es un error real (no NoSoportado)', () => {
    expect(() => leerCadena(String.raw`"\u12"`, 0)).toThrow();
  });

  it('bloque de texto (""") es NoSoportado en vez de leerse como dos cadenas vacías', () => {
    const fuente = '"""\n  hola\n  """';
    const resultado = leerCadena(fuente, 0);
    expect(resultado.noSoportados).toHaveLength(1);
    expect(resultado.noSoportados[0].codigo).toBe('bloque-de-texto-no-soportado');
    expect(resultado.longitud).toBe(fuente.length);
  });
});

describe('leerCaracter', () => {
  it('lee un char simple', () => {
    const resultado = leerCaracter("'x'", 0);
    expect(resultado).toEqual({ valor: 'x', longitud: 3, noSoportados: [] });
  });

  it('decodifica un escape válido dentro de un char (\\n)', () => {
    const resultado = leerCaracter(String.raw`'\n'`, 0);
    expect(resultado.valor).toBe('\n');
    expect(resultado.longitud).toBe(4);
  });

  it('decodifica \\\' dentro de un char', () => {
    const resultado = leerCaracter(String.raw`'\''`, 0);
    expect(resultado.valor).toBe("'");
  });

  it('un escape no soportado dentro de un char es NoSoportado, no error', () => {
    const resultado = leerCaracter(String.raw`'\r'`, 0);
    expect(resultado.noSoportados[0].codigo).toBe('escape-no-soportado');
  });

  it('lanza un error si el char está vacío', () => {
    expect(() => leerCaracter("''", 0)).toThrow();
  });

  it('lanza un error si el char tiene más de un carácter', () => {
    expect(() => leerCaracter("'ab'", 0)).toThrow();
  });

  it('lanza un error si el char no cierra', () => {
    expect(() => leerCaracter("'a", 0)).toThrow();
  });
});

describe('leerNumero — enteros', () => {
  it('lee un entero decimal simple', () => {
    const resultado = leerNumero('42', 0);
    expect(resultado.clase).toBe('entero');
    expect(resultado.magnitud).toBe(42n);
    expect(resultado.longitud).toBe(2);
    expect(resultado.noSoportado).toBeUndefined();
  });

  it('quita los guiones bajos de separación (1_000_000)', () => {
    const resultado = leerNumero('1_000_000', 0);
    expect(resultado.magnitud).toBe(1_000_000n);
    expect(resultado.longitud).toBe(9);
  });

  it('un solo "0" es el entero cero, no un octal', () => {
    const resultado = leerNumero('0', 0);
    expect(resultado.clase).toBe('entero');
    expect(resultado.magnitud).toBe(0n);
    expect(resultado.noSoportado).toBeUndefined();
  });

  it('sufijo L produce clase "largo"', () => {
    const resultado = leerNumero('100L', 0);
    expect(resultado.clase).toBe('largo');
    expect(resultado.magnitud).toBe(100n);
    expect(resultado.longitud).toBe(4);
  });

  it('sufijo l minúscula también produce clase "largo" (triangulación)', () => {
    const resultado = leerNumero('7l', 0);
    expect(resultado.clase).toBe('largo');
    expect(resultado.magnitud).toBe(7n);
  });

  it('lee solo el número a partir de un desplazamiento, sin tocar lo que sigue', () => {
    const resultado = leerNumero('123;', 0);
    expect(resultado.longitud).toBe(3);
  });
});

describe('leerNumero — double', () => {
  it('lee un double con punto decimal', () => {
    const resultado = leerNumero('3.14', 0);
    expect(resultado.clase).toBe('doble');
    expect(resultado.valorDoble).toBeCloseTo(3.14);
    expect(resultado.longitud).toBe(4);
  });

  it('lee un double con exponente', () => {
    const resultado = leerNumero('1e10', 0);
    expect(resultado.clase).toBe('doble');
    expect(resultado.valorDoble).toBe(1e10);
  });

  it('lee un double con exponente con signo y punto (triangulación)', () => {
    const resultado = leerNumero('2.5e-3', 0);
    expect(resultado.clase).toBe('doble');
    expect(resultado.valorDoble).toBeCloseTo(2.5e-3);
    expect(resultado.longitud).toBe(6);
  });

  it('sufijo d sin punto ni exponente también es double', () => {
    const resultado = leerNumero('5d', 0);
    expect(resultado.clase).toBe('doble');
    expect(resultado.valorDoble).toBe(5);
    expect(resultado.longitud).toBe(2);
  });

  it('quita los guiones bajos también en la parte decimal', () => {
    const resultado = leerNumero('1_000.5', 0);
    expect(resultado.valorDoble).toBeCloseTo(1000.5);
  });

  it('un "0" seguido de dígitos octales pero con punto decimal es double, no octal (07.5)', () => {
    const resultado = leerNumero('07.5', 0);
    expect(resultado.clase).toBe('doble');
    expect(resultado.valorDoble).toBeCloseTo(7.5);
    expect(resultado.noSoportado).toBeUndefined();
  });
});

describe('leerNumero — no soportado (design.md §2.6, REQ-SUB-007)', () => {
  it('literal octal (010) es NoSoportado con el valor decimal en la nota, texto exacto del ejemplo de la tarea', () => {
    const resultado = leerNumero('010', 0);
    expect(resultado.noSoportado?.codigo).toBe('literal-octal-no-soportado');
    expect(resultado.noSoportado?.nota).toBe('Java lo lee como octal: 8');
    expect(resultado.longitud).toBe(3);
  });

  it('literal hexadecimal (0x1F) es NoSoportado', () => {
    const resultado = leerNumero('0x1F', 0);
    expect(resultado.noSoportado?.codigo).toBe('literal-hexadecimal-no-soportado');
    expect(resultado.longitud).toBe(4);
  });

  it('literal binario (0b101) es NoSoportado (triangulación de base)', () => {
    const resultado = leerNumero('0b101', 0);
    expect(resultado.noSoportado?.codigo).toBe('literal-binario-no-soportado');
    expect(resultado.longitud).toBe(5);
  });

  it('sufijo float (3.5f) es NoSoportado, nunca se reinterpreta como double', () => {
    const resultado = leerNumero('3.5f', 0);
    expect(resultado.noSoportado?.codigo).toBe('literal-float-no-soportado');
    expect(resultado.longitud).toBe(4);
  });
});
