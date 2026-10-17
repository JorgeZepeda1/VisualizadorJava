// RED/GREEN de la tarea 3.7 (REQ-EJEC-009, design.md §3.2, ADR 005 punto 4): con la biblioteca de verdad (`Scanner` del JDK 17 portado), (1) la traza con entrada INTERACTIVA —un renglón a la vez, cuando el
// programa lo pide— es idéntica a la traza con la MISMA entrada PRECARGADA, para cualquier entrada (números, palabras, líneas vacías, entrada que se acaba, tokens que no son del tipo pedido); y (2)
// retroceder con `Traza` a un paso anterior a una lectura ya satisfecha y avanzar de nuevo reproduce el mismo valor SIN volver a pedirlo: la lectura vive en la traza, no en el trabajador.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import type { ConfigEjecucion, Paso } from '../../src/motor/index.ts';
import { crearEjecucion } from '../../src/motor/interprete/ejecucion.ts';
import { Traza } from '../../src/motor/vista.ts';
import type { FinEjecucion, VistaPrograma } from '../../src/motor/vista.ts';
import { programasDelCorpusConVeredicto } from '../compilacion/corpus-con-veredicto.ts';
import { manejarMensaje } from '../../src/trabajador/trabajador.ts';
import type { MensajeTrabajadorAUi } from '../../src/trabajador/protocolo.ts';

const CONFIG_BASE: Omit<ConfigEjecucion, 'entradaPreparada' | 'entradaInteractiva'> = { regional: 'es-MX', semilla: 0n, limitePasos: 100_000, limiteCaracteres: 1_048_576 };

interface Corrida {
  readonly pasos: Paso[];
  readonly fin: FinEjecucion;
  /** Cuántas veces el programa se quedó esperando una línea. */
  readonly esperas: number;
}

function compilado(fuente: string) {
  const resultado = compilar(fuente);
  if (!resultado.ok) throw new Error(`no compiló: ${JSON.stringify(resultado.problema)}`);
  return resultado;
}

/** La entrada precargada: todos los renglones juntos, desde el principio. */
function correrPreparada(fuente: string, renglones: readonly string[]): Corrida {
  const ejecucion = crearEjecucion(compilado(fuente).programa, { ...CONFIG_BASE, entradaPreparada: renglones.join(''), entradaInteractiva: false });
  const pasos: Paso[] = [];
  for (;;) {
    const avance = ejecucion.avanzar(5_000);
    for (const paso of avance.pasos) pasos.push(paso);
    if (avance.estado === 'fin') return { pasos, fin: avance.fin, esperas: 0 };
    if (avance.estado === 'espera-entrada') throw new Error('la entrada preparada no espera');
  }
}

/** La entrada interactiva: un renglón cada vez que el programa lo pide; cuando se acaban, el alumno cierra la entrada (EOF). */
function correrInteractiva(fuente: string, renglones: readonly string[]): Corrida {
  const ejecucion = crearEjecucion(compilado(fuente).programa, { ...CONFIG_BASE, entradaPreparada: '', entradaInteractiva: true });
  const pasos: Paso[] = [];
  let siguiente = 0;
  let esperas = 0;
  for (;;) {
    const avance = ejecucion.avanzar(5_000);
    for (const paso of avance.pasos) pasos.push(paso);
    if (avance.estado === 'fin') return { pasos, fin: avance.fin, esperas };
    if (avance.estado === 'espera-entrada') {
      esperas += 1;
      if (siguiente < renglones.length) ejecucion.darEntrada(renglones[siguiente++]);
      else ejecucion.cerrarEntrada();
    }
  }
}

const LEE_TRES = [
  'import java.util.Scanner;',
  'public class LeeTres {',
  '  public static void main(String[] args) {',
  '    Scanner sc = new Scanner(System.in);',
  '    int a = sc.nextInt();',
  '    int b = sc.nextInt();',
  '    int c = sc.nextInt();',
  '    System.out.println(a + b + c);',
  '  }',
  '}',
  '',
].join('\n');

const MEZCLA = [
  'import java.util.Scanner;',
  'public class Mezcla {',
  '  public static void main(String[] args) {',
  '    Scanner sc = new Scanner(System.in);',
  '    int n = sc.nextInt();',
  '    String resto = sc.nextLine();',
  '    String linea = sc.nextLine();',
  '    double d = sc.nextDouble();',
  '    String palabra = sc.next();',
  '    System.out.println(n + "|" + resto + "|" + linea + "|" + d + "|" + palabra);',
  '  }',
  '}',
  '',
].join('\n');

const ACUMULA = [
  'import java.util.Scanner;',
  'public class Acumula {',
  '  public static void main(String[] args) {',
  '    Scanner sc = new Scanner(System.in);',
  '    int suma = 0;',
  '    while (suma < 50) {',
  '      suma += sc.nextInt();',
  '    }',
  '    System.out.println(suma);',
  '  }',
  '}',
  '',
].join('\n');

// Renglones arbitrarios, cada uno con su `\n` (así los manda la interfaz): enteros (también negativos y enormes), decimales, palabras, tokens raros y renglones vacíos o con varios tokens.
const token = fc.oneof(
  fc.integer({ min: -20, max: 60 }).map(String),
  fc.constantFrom('hola', '3.5', '-0.25', '99999999999', 'x1', '+7', '1e3', 'ñandú', ''),
);
const renglon = fc.array(token, { maxLength: 4 }).chain((tokens) => fc.constantFrom(' ', '\t', '  ').map((separador) => `${tokens.join(separador)}\n`));
const renglones = fc.array(renglon, { maxLength: 8 });

describe('interactiva ≡ preparada: con la misma entrada, la traza es idéntica (REQ-EJEC-009)', () => {
  for (const [nombre, fuente] of [
    ['tres enteros', LEE_TRES],
    ['entero, línea, decimal y palabra', MEZCLA],
    ['un ciclo que acumula hasta 50', ACUMULA],
  ] as const) {
    it(`PROPIEDAD, ${nombre}: para cualquier entrada (con tokens que no son del tipo, líneas vacías y entrada que se acaba) los pasos y el fin son los mismos`, () => {
      fc.assert(
        fc.property(renglones, (lineas) => {
          const preparada = correrPreparada(fuente, lineas);
          const interactiva = correrInteractiva(fuente, lineas);
          expect(interactiva.pasos).toEqual(preparada.pasos);
          expect(interactiva.fin).toEqual(preparada.fin);
        }),
        { numRuns: 200 },
      );
    });
  }

  it('la propiedad no es vacía: hay entradas que hacen que el programa ESPERE (interactiva) y entradas que lo hacen terminar con excepción de Java', () => {
    const completa = correrInteractiva(LEE_TRES, ['1\n', '2\n', '3\n']);
    expect(completa.esperas).toBe(3);
    expect(completa.fin).toEqual({ causa: 'terminado' });
    const sinDatos = correrInteractiva(LEE_TRES, ['1\n']);
    expect(sinDatos.fin).toEqual({ causa: 'excepcion' });
    const equivocada = correrInteractiva(LEE_TRES, ['hola\n']);
    expect(equivocada.fin).toEqual({ causa: 'excepcion' });
    expect(equivocada.pasos.flatMap((p) => p.salida ?? []).map((s) => s.texto).join('')).toContain('java.util.InputMismatchException');
  });

  it('los programas del corpus que leen con Scanner: dándoles su entrada de un renglón a la vez dan la misma traza que con la entrada precargada', () => {
    let comparados = 0;
    for (const programa of programasDelCorpusConVeredicto().filter((p) => p.compilo)) {
      const rutaEntrada = `${resolve(programa.id).slice(0, -'.java'.length)}.entrada.txt`;
      if (!existsSync(rutaEntrada)) continue;
      const resultado = compilar(programa.fuente);
      if (!resultado.ok || resultado.programa.arranque !== null) continue;
      const entrada = readFileSync(rutaEntrada, 'utf-8');
      const lineas = entrada.match(/[^\n]*\n|[^\n]+$/g) ?? [];
      const preparada = correrPreparada(programa.fuente, lineas);
      const interactiva = correrInteractiva(programa.fuente, lineas);
      expect(interactiva.pasos, programa.id).toEqual(preparada.pasos);
      expect(interactiva.fin, programa.id).toEqual(preparada.fin);
      comparados += 1;
    }
    expect(comparados).toBeGreaterThan(30);
  });

  it('PROPIEDAD de punta a punta por el trabajador: los mensajes `pasos` de una ejecución interactiva (espera-entrada → entrada → …) suman los mismos pasos que la preparada', () => {
    fc.assert(
      fc.property(renglones, (lineas) => {
        const emitidos: MensajeTrabajadorAUi[] = [];
        const emitir = (m: MensajeTrabajadorAUi): void => {
          emitidos.push(m);
        };
        const id = 1;
        manejarMensaje({ tipo: 'ejecutar', id, fuente: LEE_TRES, config: { ...CONFIG_BASE, entradaPreparada: '', entradaInteractiva: true } }, emitir);
        let siguiente = 0;
        for (let vuelta = 0; vuelta < 20 && emitidos[emitidos.length - 1].tipo === 'espera-entrada'; vuelta += 1) {
          if (siguiente < lineas.length) manejarMensaje({ tipo: 'entrada', id, renglon: lineas[siguiente++] }, emitir);
          else manejarMensaje({ tipo: 'cerrar-entrada', id }, emitir);
        }
        const delTrabajador = emitidos.flatMap((m) => (m.tipo === 'pasos' ? [...m.pasos] : []));
        expect(delTrabajador).toEqual(correrPreparada(LEE_TRES, lineas).pasos);
        const fin = emitidos[emitidos.length - 1];
        expect(fin.tipo).toBe('fin');
      }),
      { numRuns: 100 },
    );
  });
});

describe('retroceder no vuelve a pedir una entrada ya dada (REQ-EJEC-009)', () => {
  /** La ejecución interactiva por el trabajador, con una `Traza` que va recibiendo los pasos como lo hace la pantalla. */
  function correrPorElTrabajador(valores: readonly number[]): { traza: Traza; vista: VistaPrograma; mensajesDelTrabajador: () => number } {
    const traza = new Traza();
    let mensajes = 0;
    let vista: VistaPrograma | null = null;
    const emitir = (m: MensajeTrabajadorAUi): void => {
      mensajes += 1;
      if (m.tipo === 'compilado' && m.ok) vista = m.vista;
      if (m.tipo === 'pasos') traza.agregar(m.pasos);
    };
    manejarMensaje({ tipo: 'ejecutar', id: 1, fuente: LEE_TRES, config: { ...CONFIG_BASE, entradaPreparada: '', entradaInteractiva: true } }, emitir);
    for (const valor of valores) manejarMensaje({ tipo: 'entrada', id: 1, renglon: `${valor}\n` }, emitir);
    if (vista === null) throw new Error('no llegó la vista del programa');
    return { traza, vista, mensajesDelTrabajador: () => mensajes };
  }

  const valorDe = (traza: Traza, vista: VistaPrograma, n: number, nombre: string): unknown => traza.instantaneaEn(n, vista).variables.find((v) => v.nombre === nombre)?.valor;

  it('PROPIEDAD: ir y venir por la traza en cualquier orden da, en cada paso, el valor que se tecleó en la lectura que ya había pasado — y el trabajador no recibe ni manda nada más', () => {
    fc.assert(
      fc.property(fc.tuple(fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: -1000, max: 1000 })), fc.array(fc.nat(), { minLength: 1, maxLength: 30 }), (tecleados, azar) => {
        const { traza, vista, mensajesDelTrabajador } = correrPorElTrabajador(tecleados);
        const total = traza.total;
        // pasos: 0 Scanner, 1 lee a, 2 lee b, 3 lee c, 4 println
        expect(total).toBe(5);
        const antes = mensajesDelTrabajador();
        for (const numero of [...azar, 5, 0, 3, 1, 5, 2]) {
          const n = numero % (total + 1);
          expect(valorDe(traza, vista, n, 'a') ?? null, `a en ${n}`).toBe(n >= 2 ? tecleados[0] : null);
          expect(valorDe(traza, vista, n, 'b') ?? null, `b en ${n}`).toBe(n >= 3 ? tecleados[1] : null);
          expect(valorDe(traza, vista, n, 'c') ?? null, `c en ${n}`).toBe(n >= 4 ? tecleados[2] : null);
        }
        expect(mensajesDelTrabajador()).toBe(antes);
      }),
      { numRuns: 100 },
    );
  });

  it('retroceder justo antes de la lectura la muestra sin el valor, y avanzar de nuevo lo trae otra vez — el mismo — sin que el programa vuelva a esperar', () => {
    const { traza, vista } = correrPorElTrabajador([10, 20, 30]);
    const entradas = traza.estadoEn(traza.total).filter((paso) => paso.entrada !== undefined);
    expect(entradas).toHaveLength(3); // cada lectura dejó su rastro en la traza: el eco de lo tecleado y el avance del cursor
    expect(entradas.map((paso) => paso.entrada?.agregado)).toEqual(['10\n', '20\n', '30\n']);
    expect(valorDe(traza, vista, 1, 'a') ?? null).toBeNull(); // antes de leer `a`
    expect(valorDe(traza, vista, 2, 'a')).toBe(10); // `a` ya leída
    expect(valorDe(traza, vista, 1, 'a') ?? null).toBeNull(); // se retrocede...
    expect(valorDe(traza, vista, 2, 'a')).toBe(10); // ...y se avanza: el mismo valor
    expect(traza.instantaneaEn(5, vista).salida.map((s) => s.texto).join('')).toBe('10\n20\n30\n60\n');
  });
});
