// RED de la tarea 1.36 (C-4a, límites del archivo de clase) · la POSICIÓN que javac le da a un árbol de expresión (`JCTree.pos`), de donde sale la LÍNEA de «constant string too long».
//
// Cada caso lo midió javac 17.0.18 real (un texto de 40 000 o 65 535 caracteres en cada operando y el error de javac en la línea que se ve aquí; los mismos casos, con sus goldens, son los `ls-pos-*` de
// `corpus/experimentos/limites-del-archivo/`). Las reglas:
//   - un literal, un nombre, una conversión `(T) x` y una expresión entre paréntesis: donde EMPIEZAN (el `(` para las dos últimas);
//   - una binaria: la posición de su OPERADOR (`A\n + A\n + A` es la línea del último `+`);
//   - EXCEPCIÓN del analizador de javac (`JavacParser.foldStrings`): si la cadena de `+` de una expresión completa tiene dos literales de texto SEGUIDOS, los junta en un solo literal
//     que empieza donde el primero, y reconstruye las sumas con la posición del INICIO de cada operando derecho (no la del operador). Solo vale para la raíz de la expresión: una binaria que es
//     operando de otro operador (`t == "a" + "b"`) no se pliega.
import { describe, expect, it } from 'vitest';
import { tokenizar } from '../lexico/analizador-lexico.ts';
import { CursorDeTokens } from '../sintaxis/cursor-de-tokens.ts';
import { analizarExpresion } from '../sintaxis/expresiones.ts';
import { inicioDeJavac, posicionDeJavac } from './posiciones-de-javac.ts';

function expresionDe(texto: string) {
  return analizarExpresion(new CursorDeTokens(tokenizar(texto)));
}

/** El desplazamiento de la `n`-ésima aparición (desde 1) de `buscado` en `texto`: así los casos dicen DÓNDE señala javac sin contar caracteres a mano. */
function aparicion(texto: string, buscado: string, n = 1): number {
  let desde = -1;
  for (let i = 0; i < n; i += 1) {
    desde = texto.indexOf(buscado, desde + 1);
    if (desde === -1) throw new Error(`no hay una aparición ${n} de ${buscado} en ${JSON.stringify(texto)}`);
  }
  return desde;
}

describe('posicionDeJavac — un solo operando', () => {
  it('un literal de texto, un nombre y un cast empiezan donde empiezan', () => {
    expect(posicionDeJavac(expresionDe('  "x"'), true)).toBe(2);
    expect(posicionDeJavac(expresionDe('  K'), true)).toBe(2);
    expect(posicionDeJavac(expresionDe('(String)\n"x"'), true)).toBe(0); // javac: el `(` del cast
  });

  it('una expresión entre paréntesis señala el `(` MÁS EXTERNO, también con sumas adentro', () => {
    expect(posicionDeJavac(expresionDe('(\n"x"\n)'), true)).toBe(0);
    expect(posicionDeJavac(expresionDe('(A\n + A)'), true)).toBe(0);
    expect(posicionDeJavac(expresionDe('((A))'), true)).toBe(0);
  });
});

describe('posicionDeJavac — una binaria señala su operador', () => {
  it('`A\\n + A\\n + A`: la raíz es el ÚLTIMO `+`', () => {
    const texto = 'A\n + A\n + A';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, '+', 2));
  });

  it('`A +\\n A +\\n A`: el operador está al final de la línea y esa es la que cuenta', () => {
    const texto = 'A +\n A +\n A';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, '+', 2));
  });

  it('un solo literal de texto y el resto nombres NO se pliega: el operador de la raíz', () => {
    const texto = '"x"\n + A';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, '+'));
  });

  it('literales que NO son vecinos (`A + "x" + A + "y"`) tampoco se pliegan: el último `+`', () => {
    const texto = 'A\n + "x"\n + A\n + "y"';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, '+', 3));
  });

  it('un operando que no es una suma (`==`) usa su propio operador', () => {
    const texto = 'x\n == y';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, '=='));
  });
});

describe('posicionDeJavac — el pliegue de literales de texto vecinos (JavacParser.foldStrings)', () => {
  it('todos literales: un solo literal, que empieza donde el PRIMERO', () => {
    expect(posicionDeJavac(expresionDe('"x"\n + "y"'), true)).toBe(0);
    expect(posicionDeJavac(expresionDe('"x"\n + "y"\n + "z"'), true)).toBe(0);
    expect(posicionDeJavac(expresionDe('"x" +\n "y"'), true)).toBe(0);
  });

  it('literal, literal y un nombre al final: la suma queda en el INICIO del nombre, no en su operador', () => {
    const texto = '"x"\n + "y" +\n A';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, 'A'));
  });

  it('un nombre y después dos literales: la suma queda donde empieza el literal pegado', () => {
    const texto = 'A\n + "x"\n + "y"';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, '"x"'));
  });

  it('literales pegados al principio y dos nombres: el inicio del ÚLTIMO nombre', () => {
    const texto = '"x" +\n "y" +\n A +\n A';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, 'A', 2));
  });

  it('el pliegue solo vale para la RAÍZ de la expresión: como operando de `==` cada suma señala su operador', () => {
    const texto = '"x"\n + "y"';
    expect(posicionDeJavac(expresionDe(texto), false)).toBe(aparicion(texto, '+'));
  });

  it('un literal entre paréntesis ya no es un literal para el pliegue (es un `JCParens`)', () => {
    const texto = '("x")\n + "y"';
    expect(posicionDeJavac(expresionDe(texto), true)).toBe(aparicion(texto, '+'));
  });
});

describe('inicioDeJavac — TreeInfo.getStartPos', () => {
  it('una binaria empieza donde su primer operando; una llamada, donde su receptor; un paréntesis, en el `(`', () => {
    expect(inicioDeJavac(expresionDe('  a + b'))).toBe(2);
    expect(inicioDeJavac(expresionDe('  s.length()'))).toBe(2);
    expect(inicioDeJavac(expresionDe('  (a) + b'))).toBe(2);
    expect(inicioDeJavac(expresionDe('  (a + b)'))).toBe(2);
  });

  it('un incremento POSTFIJO empieza en su operando; uno prefijo, en el operador', () => {
    expect(inicioDeJavac(expresionDe('  i++'))).toBe(2);
    expect(inicioDeJavac(expresionDe('  ++i'))).toBe(2);
  });
});
