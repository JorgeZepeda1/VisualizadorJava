// RED de las correcciones del panel R0 a los borradores de U6 (maestro L2, L3 y «Puede esperar»; experto en Java A5, B5 y B6). Son los textos exactos que el maestro y el experto en Java pidieron: cada prueba falla
// mientras el catálogo conserve la frase anterior. Las reglas generales (que ninguna frase desmentida vuelva) están en `reglas-del-tema.test.ts`; que los programas y goldens existan y coincidan con el JDK 17 real,
// en `pruebas/libro/` y `pruebas/diferencial/libro.test.ts`.
import { describe, expect, it } from 'vitest';
import type { IdTema, Tema } from './tipos.ts';
import { TEMAS_DE_U6 } from './u6.ts';

function tema(id: IdTema): Tema {
  const encontrado = TEMAS_DE_U6.find((candidato) => candidato.id === id);
  if (encontrado === undefined) throw new Error(`El tema ${id} no tiene contenido.`);
  return encontrado;
}

describe('tema 1, ¿Qué es un ciclo?: no generaliza el `while` a todos los ciclos (maestro L2)', () => {
  const ciclo = tema('u6-que-es-un-ciclo');

  it('«La idea»: la condición se revisa «para decidir si da otra vuelta», sin decir cuándo', () => {
    expect(ciclo.idea[2]).toBe('Para decidir si da otra vuelta, Java revisa una condición: una pregunta que se responde con `true` o con `false`.');
  });

  it('«En resumen»: la segunda viñeta no dice cuándo se revisa y la tercera dice «nunca da `false`», no «el ciclo nunca termina»', () => {
    expect(ciclo.resumen[1]).toBe('Java revisa una condición para decidir: con `true` da otra vuelta y con `false` termina.');
    expect(ciclo.resumen[2]).toBe('Dentro del ciclo algo debe cambiar el valor que mira la condición; si no, nunca da `false`.');
  });

  it('la nota dice que el `while` revisa la condición antes de cada vuelta y que los otros dos ciclos llegan en los siguientes temas', () => {
    const notas = ciclo.comoSeEscribe.flatMap((bloque) => (bloque.tipo === 'nota' ? [bloque.texto] : []));
    expect(notas).toEqual(['Aquí usamos `while`, el ciclo más sencillo: revisa la condición antes de cada vuelta. En este curso verás otros dos, `do-while` y `for`, en los siguientes temas.']);
  });

  it('«Cómo se escribe» nombra las tres partes con el código del programa de «Para empezar» (maestro, «Puede esperar»)', () => {
    const parrafos = ciclo.comoSeEscribe.flatMap((bloque) => (bloque.tipo === 'parrafo' ? [bloque.texto] : []));
    expect(parrafos).toEqual([
      'Casi todo ciclo tiene tres partes, y las tres están en el programa de «Para empezar»: el valor inicial (`int alumno = 1;`), la condición (`alumno <= 3`) y el cambio (`alumno = alumno + 1;`).',
    ]);
  });
});

describe('tema 2, `while`: el paso 3, el límite de las llaves y el 6 que se imprime (maestro y experto en Java)', () => {
  const mientras = tema('u6-while');

  it('el paso 3 dice que el ciclo termina o ni siquiera empieza, y sigue después de la llave que lo cierra', () => {
    const pasos = mientras.comoSeEscribe.flatMap((bloque) => (bloque.tipo === 'lista' ? bloque.elementos : []));
    expect(pasos[2]).toBe('Si da `false`, el ciclo termina (o ni siquiera empieza) y Java sigue con lo que está después de la llave `}` que lo cierra.');
  });

  it('la nota de las llaves dice qué pasa sin ellas (B5)', () => {
    const notas = mientras.comoSeEscribe.flatMap((bloque) => (bloque.tipo === 'nota' ? [bloque.texto] : []));
    expect(notas).toEqual(['Las llaves `{ }` marcan lo que se repite. Lo que queda afuera se ejecuta una sola vez. Sin llaves, solo se repite la primera instrucción, así que escríbelas siempre.']);
  });

  it('el primer error típico explica por qué se imprime el 6 aunque `6 <= 5` da `false`', () => {
    expect(mientras.erroresTipicos[0]?.texto).toBe(
      'El orden importa. Aquí `numero` cambia antes del `println`, así que el primer número que se escribe ya no es el 1. Y fíjate en el 6: se imprime aunque `6 <= 5` da `false`, porque Java solo revisa la condición al empezar cada vuelta, no a la mitad.',
    );
  });

  it('«En resumen» dice «nunca da `false`», como la idea', () => {
    expect(mientras.resumen[2]).toBe('Algo dentro del ciclo debe cambiar lo que la condición mira; si no, nunca da `false`.');
  });
});

describe('tema 3, contador, acumulador y bandera: la forma general con `if` (maestro L3, A5)', () => {
  const tres = tema('u6-contador-acumulador-bandera');

  it('la forma general cambia el valor, cuenta y levanta la bandera dentro de un `if` (hoy es un ciclo infinito y sin `if`)', () => {
    const forma = tres.comoSeEscribe.find((bloque) => bloque.tipo === 'forma');
    expect(forma?.tipo === 'forma' ? forma.texto : '').toBe(
      [
        'int cuantos = 0;',
        'int total = 0;',
        'boolean hubo = false;',
        'while (condición) {',
        '    total = total + valor;',
        '    if (pasó lo que cuentas) {',
        '        cuantos = cuantos + 1;',
        '    }',
        '    if (pasó lo que buscas) {',
        '        hubo = true;',
        '    }',
        '    cambio del valor',
        '}',
      ].join('\n'),
    );
  });

  it('el contador casi siempre va dentro de un `if`, el acumulador no, y la bandera va dentro del `if` que detecta lo buscado y ya no vuelve a `false`', () => {
    const puntos = tres.comoSeEscribe.flatMap((bloque) => (bloque.tipo === 'lista' ? bloque.elementos : []));
    expect(puntos).toEqual([
      'Contador: `cuantos = cuantos + 1;` anota que pasó una vez más; casi siempre va dentro de un `if`.',
      'Acumulador: `total = total + valor;` suma el valor de esta vuelta a lo que ya había.',
      'Bandera: `hubo = true;` va dentro del `if` que detecta lo que buscas; una vez en `true`, ya no vuelve a `false`.',
    ]);
  });

  it('la bandera «suele empezar en `false`» y es «una bandera que se levanta para avisar»', () => {
    expect(tres.idea[4]).toBe('Una bandera es una variable `boolean` que suele empezar en `false` y cambia a `true` cuando algo ocurre, como una bandera que se levanta para avisar.');
    const parrafos = tres.comoSeEscribe.flatMap((bloque) => (bloque.tipo === 'parrafo' ? [bloque.texto] : []));
    expect(parrafos).toEqual([
      'Las tres se crean antes del ciclo, con su valor inicial. El contador y el acumulador de una suma empiezan en 0, y la bandera suele empezar en `false`. Así Java las conserva de una vuelta a la siguiente.',
    ]);
  });

  it('la primera pregunta de «Ponte a prueba» pide anotar cuántas veces Java ejecuta la línea del contador', () => {
    expect(tres.ponteAPrueba[0]?.pregunta).toBe('Con la entrada de prueba, ¿qué imprime? Anota cuántas veces Java ejecuta `mayores = mayores + 1;`.');
  });
});

describe('tema 4, `do-while`: el nuevo «Crear» (maestro, «Puede esperar»)', () => {
  const haz = tema('u6-do-while');

  it('«Crear» pide leer números con un `do-while` hasta un 7 y escribir «Intentos:», un espacio y cuántos leyó', () => {
    const crear = haz.ahoraHazloTu[1];
    expect(crear.tipo).toBe('crear');
    expect(crear.consigna).toBe('Escribe un programa con un `do-while` que lea números hasta que llegue un 7. Al final debe escribir «Intentos:», un espacio y cuántos números leyó. No escribas nada más.');
    expect(crear.solucion).toBe('u6-do-while/intentos-hasta-el-7');
  });

  it('el programa que pedía el doble de un número positivo ya no está en el tema', () => {
    const ids = haz.ahoraHazloTu.map((tarea) => tarea.solucion as string);
    expect(ids).not.toContain('u6-do-while/pedir-numero-positivo');
  });
});

describe('tema 5, `for`: lo que el experto en Java desmintió (A5, B6)', () => {
  const para = tema('u6-for');

  it('`i++` suma 1 igual que `i = i + 1` solo con una variable `int` usada como instrucción', () => {
    const notas = para.comoSeEscribe.flatMap((bloque) => (bloque.tipo === 'nota' ? [bloque.texto] : []));
    expect(notas).toEqual(['Con una variable `int` usada como instrucción, `i++` suma 1 a `i`, igual que `i = i + 1`. Por eso se usa tanto en el cambio.']);
  });

  it('el `for` hace un trabajo «parecido» al del `while`: con `continue` no son iguales', () => {
    expect(para.idea[1]).toBe('Hace un trabajo parecido al de un `while`, pero con las tres partes juntas y a la vista.');
  });
});

describe('las consignas escriben lo que imprime el programa entre « » (maestro, «Puede esperar»)', () => {
  it.each([
    ['u6-que-es-un-ciclo', 1, 'escriba la palabra «Hola», una vez por renglón'],
    ['u6-contador-acumulador-bandera', 0, 'debe empezar con «Reprobados:» y los otros dos'],
    ['u6-contador-acumulador-bandera', 1, 'escriba «Mayores que 100:», un espacio'],
    ['u6-do-while', 0, 'El aviso debe decir «de 12 a 18» y lo demás'],
    ['u6-for', 0, 'El mensaje debe empezar con «El producto es».'],
  ] as const)('%s, tarea %i: «%s»', (id, posicion, fragmento) => {
    expect(tema(id).ahoraHazloTu[posicion]?.consigna).toContain(fragmento);
  });
});
