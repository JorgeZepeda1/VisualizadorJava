// Tarea 1.34 (cerrar por defecto): la matriz VALOR × CONTEXTO de `tablas-de-valor-y-contexto.ts` (40 valores × 81 contextos = 3 240 programas). Para cada celda:
//   - `compilar()` NUNCA lanza;
//   - donde javac 17.0.18 RECHAZA, `compilar()` no da `ok` ni `ejecucion-no-disponible` (el texto de este último dice «Tu programa pasó todas mis revisiones…»: un valor
//     de tipo desconocido en una posición de valor jamás termina ahí; o es un error modelado de U3–U7, o un aviso honesto);
//   - donde javac COMPILA, `compilar()` no da un error de compilación (ok, o un aviso).
// Sin JDK: las celdas de javac son datos; su verificación es `herramientas/oraculo/matriz-de-valores-y-contextos.test.ts` (`npm run test:oraculo`).
// Por qué existe: la re-verificación del lote 1 vio que `int x = System.in;`, `int n = args.length();` y `System.in.nextInt()` terminaban en «Java sí acepta tu programa»:
// el sumidero `'desconocido'` de la atribución tapaba en silencio lo que no sabía tipar. Es un defecto de COMBINACIÓN (qué valor en qué posición), y esta matriz es la
// que lo cierra por defecto: cualquier expresión nueva sin tipo que se cuele en alguna de las 81 posiciones la hace fallar.
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import type { ResultadoCompilacion } from '../../src/motor/index.ts';
import {
  COMPILA_EN_JAVAC_POR_VALOR,
  CONTEXTOS_DE_LA_MATRIZ,
  VALORES_DE_LA_MATRIZ,
  programaDeLaMatriz,
} from './tablas-de-valor-y-contexto.ts';

function javacCompila(indiceDelValor: number, indiceDelContexto: number): boolean {
  return COMPILA_EN_JAVAC_POR_VALOR[indiceDelValor]![indiceDelContexto] === '1';
}

function loDaPorBueno(resultado: ResultadoCompilacion): boolean {
  return resultado.ok || resultado.problema.codigo === 'ejecucion-no-disponible';
}

describe('la matriz valor × contexto — está bien armada', () => {
  it('trae 40 valores, 81 contextos y una fila de javac por valor con un carácter por contexto', () => {
    expect(VALORES_DE_LA_MATRIZ).toHaveLength(40);
    expect(CONTEXTOS_DE_LA_MATRIZ).toHaveLength(81);
    expect(COMPILA_EN_JAVAC_POR_VALOR).toHaveLength(VALORES_DE_LA_MATRIZ.length);
    for (const fila of COMPILA_EN_JAVAC_POR_VALOR) expect(fila).toMatch(new RegExp(`^[01]{${CONTEXTOS_DE_LA_MATRIZ.length}}$`));
    expect(new Set(VALORES_DE_LA_MATRIZ).size).toBe(VALORES_DE_LA_MATRIZ.length);
    expect(new Set(CONTEXTOS_DE_LA_MATRIZ).size).toBe(CONTEXTOS_DE_LA_MATRIZ.length);
    for (const contexto of CONTEXTOS_DE_LA_MATRIZ) expect(contexto, contexto).toContain('$V');
  });

  it('incluye los valores del hallazgo (args, args.length(), System.in, System.out, System.err, System.in.read(), una clase como valor) y los contextos que los exponen', () => {
    for (const valor of ['args', 'args.length', 'args.length()', 'args[0]', 'System.in', 'System.out', 'System.err', 'System.in.read()', 'Math', 'System', 'String', 'null']) {
      expect(VALORES_DE_LA_MATRIZ, valor).toContain(valor);
    }
    for (const contexto of ['int t = $V;', 'if ($V) { }', 'switch ($V) { default: break; }', 'System.out.println($V);', 'Math.abs($V);', 'Scanner t = new Scanner($V);', 'int t = (int) $V;', '$V.length();', '$V;']) {
      expect(CONTEXTOS_DE_LA_MATRIZ, contexto).toContain(contexto);
    }
  });

  it('javac compila una parte de las celdas y rechaza otra (la matriz no es trivial): 982 compilan y 2 258 se rechazan', () => {
    const compilan = COMPILA_EN_JAVAC_POR_VALOR.join('').split('1').length - 1;
    expect(compilan).toBe(982);
    expect(VALORES_DE_LA_MATRIZ.length * CONTEXTOS_DE_LA_MATRIZ.length - compilan).toBe(2258);
  });

  it('el valor se pone en cada hueco `$V` del contexto, en la línea 6 del programa', () => {
    const fuente = programaDeLaMatriz('System.in', 'int t = $V;');
    expect(fuente.split('\n')[5]).toContain('int t = System.in;');
    expect(programaDeLaMatriz('i', '$V++; $V--;')).toContain('i++; i--;');
  });
});

describe('la matriz valor × contexto — compilar() nunca lanza y no contradice a javac', () => {
  it.each(VALORES_DE_LA_MATRIZ.map((valor, i) => [valor, i] as const))('el valor «%s» en las 81 posiciones', (valor, i) => {
    const contradicciones: string[] = [];
    CONTEXTOS_DE_LA_MATRIZ.forEach((contexto, j) => {
      const fuente = programaDeLaMatriz(valor, contexto);
      let resultado: ResultadoCompilacion;
      try {
        resultado = compilar(fuente);
      } catch (error) {
        contradicciones.push(`«${contexto}»: LANZA ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`);
        return;
      }
      if (javacCompila(i, j)) {
        if (!resultado.ok && resultado.problema.categoria === 'error-compilacion') {
          contradicciones.push(`«${contexto}»: javac lo compila y compilar() da el error [${resultado.problema.codigo}] en la línea ${resultado.problema.linea}`);
        }
      } else if (loDaPorBueno(resultado)) {
        contradicciones.push(`«${contexto}»: javac lo rechaza y compilar() lo da por bueno (${resultado.ok ? 'ok' : 'ejecucion-no-disponible'})`);
      }
    });
    expect(contradicciones).toEqual([]);
  });

  it('de las 2 258 celdas que javac rechaza, la mayoría sale como ERROR de compilación (el resto son avisos honestos): la matriz no pasa por pura prudencia', () => {
    let rechazadas = 0;
    let comoError = 0;
    VALORES_DE_LA_MATRIZ.forEach((valor, i) => {
      CONTEXTOS_DE_LA_MATRIZ.forEach((contexto, j) => {
        if (javacCompila(i, j)) return;
        rechazadas += 1;
        const resultado = compilar(programaDeLaMatriz(valor, contexto));
        if (!resultado.ok && resultado.problema.categoria === 'error-compilacion') comoError += 1;
      });
    });
    expect(rechazadas).toBe(2258);
    // Medido con el compilador de la 1.34: 1 546 como error (68 %) y 712 como aviso (un tipo o una construcción fuera del subconjunto: arreglos, `null`, `~`, `System.in`…).
    expect(comoError / rechazadas).toBeGreaterThan(0.6);
  });
});
