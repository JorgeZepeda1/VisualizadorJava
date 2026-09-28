// RED de la tarea 1.7 (Atribución — símbolos, alcance, sombreado, `switch`, REQ-COMP-002/003) +
// pendiente heredado 1 (break/continue fuera de contexto, verificado contra javac 17 real: AMBOS
// casos viven en la MISMA pasada que un error de tipos — ver engram — así que `atribuir` los
// reporta junto con el resto, "el primero en el texto" cuando hay más de uno).
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { analizarPrograma } from '../sintaxis/analizador-sintactico.ts';
import { atribuir } from './atribucion.ts';

function atribuirCuerpo(cuerpoDeMain: string) {
  const programa = analizarPrograma(tokenizar(`class C { public static void main(String[] a) { ${cuerpoDeMain} } }`));
  return atribuir(programa);
}

describe('atribuir — programa válido no produce ningún problema', () => {
  it('declaraciones, if/while/for/switch e impresión de un literal: sin problemas', () => {
    const problemas = atribuirCuerpo(`
      int x = 5;
      if (x > 0) { int y = x + 1; }
      while (x > 0) { x = x - 1; }
      for (int i = 0; i < 3; i++) { int z = i; }
      switch (x) { case 1: break; default: break; }
    `);
    expect(problemas).toEqual([]);
  });
});

describe('atribuir — variable no declarada (REQ-COMP-002, "cannot find symbol")', () => {
  it('usar una variable que nunca se declaró', () => {
    const problemas = atribuirCuerpo('int y = edad + 1;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-no-declarada', datos: { nombre: 'edad' } });
  });

  it('triangulación: la variable de un "for" usada DESPUÉS de cerrarlo (REQ-COMP-002 escenario propio)', () => {
    const problemas = atribuirCuerpo('for (int i = 0; i < 3; i++) { } System.out.println("hecho"); int y = i;');
    expect(problemas.some((p) => p.codigo === 'variable-no-declarada' && p.datos['nombre'] === 'i')).toBe(true);
  });

  it('control: una variable SÍ declarada y usada dentro de su bloque no produce error', () => {
    expect(atribuirCuerpo('int edad = 5; int y = edad + 1;')).toEqual([]);
  });
});

describe('atribuir — método no declarado (err03 de exploracion/03: ningún método propio existe en el subconjunto)', () => {
  it('llamar una función libre nunca definida', () => {
    const problemas = atribuirCuerpo('saludar();');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'metodo-no-declarado', datos: { nombre: 'saludar' } });
  });
});

describe('atribuir — redeclaración en el mismo bloque (flow13 de exploracion/03)', () => {
  it('declarar "x" dos veces en el cuerpo de main', () => {
    const problemas = atribuirCuerpo('int x = 1; int x = 2;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-ya-definida', datos: { nombre: 'x' } });
  });
});

describe('atribuir — sombreado en bloque anidado (flow18/flow19 de exploracion/03)', () => {
  it('declarar "x" dentro de un "if" mientras la "x" externa sigue viva', () => {
    const problemas = atribuirCuerpo('int x = 5; if (true) { int x = 10; }');
    expect(problemas).toHaveLength(1);
    expect(problemas[0].codigo).toBe('variable-ya-definida');
  });

  it('triangulación: el índice de un "for" anidado coincide con una variable externa viva (flow19)', () => {
    const problemas = atribuirCuerpo('int i = 0; for (int i = 0; i < 3; i++) { }');
    expect(problemas.some((p) => p.codigo === 'variable-ya-definida')).toBe(true);
  });

  it('control: redeclarar en un bloque HERMANO (no anidado al mismo tiempo) es válido', () => {
    expect(atribuirCuerpo('if (true) { int y = 1; } if (true) { int y = 2; }')).toEqual([]);
  });
});

describe('atribuir — selector de switch inválido, integrado (REQ-COMP-002)', () => {
  it('switch sobre una variable "long" se reporta con el tipo real', () => {
    const problemas = atribuirCuerpo('long n = 5L; switch (n) { default: break; }');
    expect(problemas.some((p) => p.codigo === 'selector-de-switch-invalido' && p.datos['tipo'] === 'long')).toBe(true);
  });

  it('control: switch sobre int/char/String no produce problema', () => {
    expect(atribuirCuerpo('int x = 1; switch (x) { default: break; }')).toEqual([]);
  });
});

describe('atribuir — break fuera de contexto (err29 de exploracion/03, "break outside switch or loop")', () => {
  it('un "break" suelto en el cuerpo de main', () => {
    const problemas = atribuirCuerpo('break;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0].codigo).toBe('break-fuera-de-contexto');
  });

  it('control: "break" dentro de un while sí es válido', () => {
    expect(atribuirCuerpo('while (true) { break; }')).toEqual([]);
  });

  it('control: "break" dentro de un switch (sin ciclo) también es válido', () => {
    expect(atribuirCuerpo('int x = 1; switch (x) { default: break; }')).toEqual([]);
  });
});

describe('atribuir — continue fuera de contexto (err30 de exploracion/03, "continue outside of loop")', () => {
  it('un "continue" suelto', () => {
    const problemas = atribuirCuerpo('continue;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0].codigo).toBe('continue-fuera-de-contexto');
  });

  it('triangulación: "continue" dentro de un switch SIN ciclo envolvente también se rechaza (verificado contra javac)', () => {
    const problemas = atribuirCuerpo('int x = 1; switch (x) { case 1: continue; }');
    expect(problemas.some((p) => p.codigo === 'continue-fuera-de-contexto')).toBe(true);
  });

  it('control: "continue" dentro de un switch DENTRO de un while sí es válido (pasa a través del switch)', () => {
    expect(atribuirCuerpo('while (true) { int x = 1; switch (x) { default: continue; } }')).toEqual([]);
  });

  it('control: "continue" dentro de un for es válido', () => {
    expect(atribuirCuerpo('for (int i = 0; i < 3; i++) { continue; }')).toEqual([]);
  });
});

describe('atribuir — nombres de clase reconocidos nunca se marcan "variable no declarada"', () => {
  it('Math.round(x) no reporta "Math" como variable, solo revisa el argumento real', () => {
    expect(atribuirCuerpo('int x = 5; int r = Math.round(3.5);')).toEqual([]);
  });

  it('triangulación: Scanner declarado y usado (sc.nextInt()) no reporta "sc" como no declarado', () => {
    const problemas = atribuirCuerpo('Scanner sc = new Scanner(System.in); int x = sc.nextInt();');
    expect(problemas.filter((p) => p.codigo === 'variable-no-declarada')).toEqual([]);
  });

  it('control: el OBJETO de un acceso a miembro que SÍ es una variable no declarada se reporta igual', () => {
    const problemas = atribuirCuerpo('int x = noDeclarada.length();');
    expect(problemas.some((p) => p.codigo === 'variable-no-declarada' && p.datos['nombre'] === 'noDeclarada')).toBe(true);
  });
});

describe('atribuir — varios problemas: se devuelven TODOS, ordenados por posición en el texto', () => {
  it('dos variables no declaradas en líneas distintas aparecen en orden de aparición', () => {
    const problemas = atribuirCuerpo('int uno = primera + 1; int dos = segunda + 1;');
    expect(problemas).toHaveLength(2);
    expect(problemas[0].datos['nombre']).toBe('primera');
    expect(problemas[1].datos['nombre']).toBe('segunda');
    expect(problemas[0].rango.inicio).toBeLessThan(problemas[1].rango.inicio);
  });
});

describe('atribuir — redeclarar el parámetro de main ("a" en estas pruebas) también se rechaza (design.md §2.7: "incluido args")', () => {
  it('verificado contra javac 17 real: "int a = 5;" cuando main(String[] a) ya lo declaró', () => {
    const problemas = atribuirCuerpo('int a = 5;');
    expect(problemas).toHaveLength(1);
    expect(problemas[0]).toMatchObject({ codigo: 'variable-ya-definida', datos: { nombre: 'a' } });
  });
});
