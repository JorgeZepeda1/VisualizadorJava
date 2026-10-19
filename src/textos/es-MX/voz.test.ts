// RED de la tarea R0.3 (REQ-PANT-010, panel 1 H9/H10, ADR 017): la voz y el vocabulario de los robots. Los tres robots señalan lo que hace la máquina en TERCERA persona («Java revisa…», «Java guarda…»)
// y nunca hablan como si fueran la computadora («Reviso…», «Guardo…»); `true` y `false` se escriben como código, nunca «verdadero» ni «falso»; cada repetición de un ciclo es una «vuelta», nunca una
// «iteración» ni «revisión N». Esta prueba recorre TODO el catálogo que el robot dice —cada clave de explicación con datos de cada forma, el robot, el aviso de límite— y rechaza las formas prohibidas.
// Los mensajes de error de compilación y de «no disponible» (`problemas.ts`, `no-soportado.ts`) están fuera: los reescribe el revisor en R3 (proposal §3.2).
import { describe, expect, it } from 'vitest';
import type { ExplicacionPaso } from '../../motor/vista.ts';
import { textoDeLaDetencion, textoDelAvisoDeLimite, textoIntrigaDelLimite, tituloDelAvisoDeLimite } from './avisos-de-limite.ts';
import { textoDeExplicacion } from './explicaciones.ts';
import { textosRobot } from './robot.ts';

const DIAGNOSTICO = { ciclo: 'while', linea: 5, condicion: 'contador <= 5', vueltas: 100, sinCambio: [{ nombre: 'contador', valor: '1' }] } as const;
const LECTURAS = [{ nombre: 'cantidad', valor: '2' }];

/** Una explicación de cada clave y de cada forma que cambia la frase (con y sin conversión, recorte, efectos, `else`, cada ciclo, cada causa de detención…). */
const EXPLICACIONES: readonly ExplicacionPaso[] = [
  { clave: 'declaracion-con-valor', datos: { nombre: 'edad', tipo: 'int', expresion: '17', sustituida: '17', valor: '17' } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'total', tipo: 'int', expresion: 'a + b', sustituida: '2 + 3', valor: '5' } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'suma', tipo: 'int', expresion: '2 + 3', sustituida: '2 + 3', valor: '5' } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'x', tipo: 'int', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '25', leeDelTeclado: true } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'sc', tipo: 'Scanner', expresion: 'new Scanner(System.in)', sustituida: 'new Scanner(System.in)', valor: 'un Scanner' } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'azar', tipo: 'Random', expresion: 'new Random(7)', sustituida: 'new Random(7)', valor: 'un Random' } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'promedio', tipo: 'double', expresion: 'suma / 3', sustituida: '25 / 3', valor: '8.0', conversion: { tipo: 'double', antes: '8' } } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'c', tipo: 'int', expresion: 'i++ + i', sustituida: 'i++ + 8', valor: '15', efectos: [{ expresion: 'i++', nombre: 'i', valor: '7', nuevo: '8' }] } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'activo', tipo: 'boolean', expresion: 'false', sustituida: 'false', valor: 'false' } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'aprobado', tipo: 'boolean', expresion: 'promedio >= 6.0', sustituida: '8.5 >= 6.0', valor: 'true' } },
  { clave: 'declaracion-con-valor', datos: { nombre: 'listo', tipo: 'boolean', expresion: 'teclado.nextBoolean()', sustituida: 'teclado.nextBoolean()', valor: 'true', leeDelTeclado: true } },
  { clave: 'declaracion-sin-valor', datos: { nombre: 'total', tipo: 'int' } },
  { clave: 'declaracion-varias', datos: { variables: [{ nombre: 'activo', tipo: 'boolean', valor: 'true' }, { nombre: 'texto', tipo: 'String', valor: '"Hola, mundo"' }] } },
  { clave: 'declaracion-varias', datos: { variables: [{ nombre: 'a', tipo: 'int', valor: '1' }, { nombre: 'b', tipo: 'int', valor: null }] } },
  { clave: 'asignacion', datos: { nombre: 'x', expresion: '6', sustituida: '6', valor: '6', anterior: '5' } },
  { clave: 'asignacion', datos: { nombre: 'y', expresion: 'x + 1', sustituida: '5 + 1', valor: '6', anterior: null } },
  { clave: 'asignacion', datos: { nombre: 'x', expresion: 'sc.nextInt()', sustituida: 'sc.nextInt()', valor: '9', anterior: '4', leeDelTeclado: true } },
  { clave: 'asignacion', datos: { nombre: 'g', expresion: 'a / b', sustituida: '7 / 2', valor: '3.0', anterior: '2.0', conversion: { tipo: 'double', antes: '3' } } },
  { clave: 'asignacion', datos: { nombre: 'seEncontroNegativo', expresion: 'true', sustituida: 'true', valor: 'true', anterior: 'false' } },
  { clave: 'asignacion', datos: { nombre: 'ok', expresion: 'a && b', sustituida: 'true && false', valor: 'false', anterior: null } },
  { clave: 'asignacion-compuesta', datos: { nombre: 'total', operador: '+=', expresion: 'precio', sustituida: '25', derecho: '25', anterior: '100', valor: '125' } },
  { clave: 'asignacion-compuesta', datos: { nombre: 'x', operador: '+=', expresion: '2.7', sustituida: '2.7', derecho: '2.7', anterior: '10', valor: '12', recorte: { tipo: 'int', operado: '12.7' } } },
  { clave: 'incremento', datos: { nombre: 'i', anterior: '3', valor: '4' } },
  { clave: 'decremento', datos: { nombre: 'i', anterior: '3', valor: '2' } },
  { clave: 'acciones-del-for', datos: { acciones: ['i = 0', 'j = 9'] } },
  { clave: 'impresion', datos: { texto: 'Hola', flujo: 'out', saltoDeLinea: true } },
  { clave: 'impresion', datos: { texto: 'Edad: ', flujo: 'out', saltoDeLinea: false } },
  { clave: 'impresion', datos: { texto: '', flujo: 'out', saltoDeLinea: true } },
  { clave: 'impresion', datos: { texto: 'Error', flujo: 'err', saltoDeLinea: true } },
  { clave: 'expresion', datos: { expresion: 'sc.nextLine()' } },
  ...[true, false].flatMap((resultado) => [true, false].map((tieneSino): ExplicacionPaso => ({ clave: 'condicion-if', datos: { condicion: 'cantidad < 1', sustituida: '2 < 1', lecturas: LECTURAS, resultado, tieneSino } }))),
  { clave: 'condicion-if', datos: { condicion: 'true', sustituida: 'true', lecturas: [], resultado: true, tieneSino: false } },
  ...[true, false].map((resultado): ExplicacionPaso => ({ clave: 'condicion-if', datos: { condicion: 'tieneLicencia', sustituida: `${resultado}`, lecturas: [{ nombre: 'tieneLicencia', valor: `${resultado}` }], resultado, tieneSino: true } })),
  ...(['while', 'for', 'do-while'] as const).flatMap((ciclo) =>
    [1, 2, 4].flatMap((vuelta) =>
      [true, false].map((resultado): ExplicacionPaso => ({ clave: 'condicion-ciclo', datos: { ciclo, condicion: 'i < 3', sustituida: '1 < 3', lecturas: [{ nombre: 'i', valor: '1' }], resultado, vuelta } })),
    ),
  ),
  { clave: 'condicion-ciclo', datos: { ciclo: 'while', condicion: 'true', sustituida: 'true', lecturas: [], resultado: true, vuelta: 3 } },
  ...(['while', 'do-while'] as const).flatMap((ciclo) =>
    [1, 4].flatMap((vuelta) => [true, false].map((resultado): ExplicacionPaso => ({ clave: 'condicion-ciclo', datos: { ciclo, condicion: 'continuar', sustituida: `${resultado}`, lecturas: [{ nombre: 'continuar', valor: `${resultado}` }], resultado, vuelta } }))),
  ),
  { clave: 'switch-elige-caso', datos: { expresion: 'opcion', valor: '2', etiqueta: '2' } },
  { clave: 'switch-elige-defecto', datos: { expresion: 'opcion', valor: '9' } },
  { clave: 'switch-sin-coincidencia', datos: { expresion: 'opcion', valor: '9' } },
  { clave: 'switch-cae', datos: { etiqueta: '3' } },
  { clave: 'switch-cae', datos: { etiqueta: null } },
  { clave: 'break', datos: { en: 'ciclo' } },
  { clave: 'break', datos: { en: 'switch' } },
  { clave: 'continue', datos: { ciclo: 'while' } },
  { clave: 'continue', datos: { ciclo: 'do-while' } },
  { clave: 'continue', datos: { ciclo: 'for' } },
  { clave: 'return', datos: {} },
  { clave: 'vacia', datos: {} },
  { clave: 'excepcion', datos: { clase: 'java.lang.ArithmeticException', mensaje: '/ by zero' } },
  { clave: 'excepcion', datos: { clase: 'java.util.NoSuchElementException', mensaje: null } },
  { clave: 'detenido', datos: { causa: 'limite-pasos' } },
  { clave: 'detenido', datos: { causa: 'limite-pasos', diagnostico: DIAGNOSTICO } },
  { clave: 'detenido', datos: { causa: 'limite-tiempo' } },
  { clave: 'detenido', datos: { causa: 'limite-caracteres' } },
  { clave: 'detenido', datos: { causa: 'no-disponible-en-ejecucion' } },
  { clave: 'detenido', datos: { causa: 'error-interno' } },
];

const CAUSAS_DE_FIN = ['terminado', 'excepcion', 'error-arranque', 'no-disponible-en-ejecucion', 'limite-pasos', 'limite-caracteres', 'limite-tiempo', 'error-interno'] as const;

/** Todo lo demás que dicen los robots fuera de la explicación de un paso. */
const OTROS_TEXTOS: readonly string[] = [
  textosRobot.sinEjecutar(),
  textosRobot.compilando(),
  textosRobot.programaCambiado(),
  textosRobot.alInicio(7),
  textosRobot.alInicio(null),
  textosRobot.esperandoUnDato(19),
  textosRobot.calculando(),
  textosRobot.detenida(),
  ...CAUSAS_DE_FIN.map((causa) => textosRobot.resumenDelFin[causa]({ pasos: 4 })),
  tituloDelAvisoDeLimite(),
  textoDeLaDetencion('limite-pasos'),
  textoDeLaDetencion('limite-pasos', DIAGNOSTICO),
  textoDeLaDetencion('limite-tiempo', { ...DIAGNOSTICO, sinCambio: [] }),
  textoDeLaDetencion('limite-caracteres'),
  ...(['limite-pasos', 'limite-tiempo', 'limite-caracteres'] as const).flatMap((causa) => [textoIntrigaDelLimite(causa) ?? '', textoDelAvisoDeLimite({ causa }) ?? '']),
];

const TODAS_LAS_FRASES: readonly string[] = [...EXPLICACIONES.map((explicacion) => textoDeExplicacion(explicacion)), ...OTROS_TEXTOS];

/** Lo que el robot nunca dice. Cada regla trae su porqué para que el mensaje del fallo enseñe. */
const FORMAS_PROHIBIDAS: readonly { readonly regla: string; readonly patron: RegExp }[] = [
  {
    regla: 'el robot no es la computadora: «Java revisa», no «Reviso» (primera persona al principio de la frase)',
    patron: /(^|[.:;¡!?]\s+)(Reviso|Guardo|Creo|Calculo|Imprimo|Sumo|Resto|Ejecuto|Hago|Leo|Salgo|Entro|Sigo|Termino|Repito|Paré|Estoy)(?![\p{L}])/u,
  },
  {
    regla: 'el robot no es la computadora: «Java guarda», no «guardo» (primera persona dentro de la frase)',
    patron: /(?<![\p{L}])(guardo|reviso|salgo|entro|repito|termino|me salto|me detuve|tuve que|no sé|estoy|voy a|sigo con|sigo calculando|imprimo|calculo|creo la)(?![\p{L}])/u,
  },
  { regla: '`true` y `false` son código, no «verdadero» ni «falso»', patron: /\b(verdader[oa]s?|fals[oa]s?)\b/i },
  { regla: 'cada repetición de un ciclo es una «vuelta», no una «iteración»', patron: /iteraci[oó]n/i },
  { regla: 'se dice «vuelta», no «revisión N»', patron: /revisi[oó]n(es)?\s+(\d+|N\b)/i },
];

/** ¿La frase trae `true` o `false` como palabra suelta? No cuenta lo que va como código (comillas invertidas), lo impreso (« ») ni un String entre comillas. */
function trueOFalseSuelto(frase: string): boolean {
  const sinCodigo = frase.replace(/`[^`]*`/g, '').replace(/«[^»]*»/g, '').replace(/"[^"]*"/g, '');
  return /(?<![\p{L}\p{N}_])(true|false)(?![\p{L}\p{N}_])/u.test(sinCodigo);
}

describe('la voz de los robots: tercera persona, `true`/`false` como código y «vuelta»', () => {
  it('la prueba recorre muchas frases de verdad (no un conjunto vacío)', () => {
    expect(TODAS_LAS_FRASES.length).toBeGreaterThan(80);
    expect(TODAS_LAS_FRASES.every((frase) => frase.trim().length > 0)).toBe(true);
  });

  for (const { regla, patron } of FORMAS_PROHIBIDAS) {
    it(`ninguna frase usa una forma prohibida — ${regla}`, () => {
      const infractoras = TODAS_LAS_FRASES.filter((frase) => patron.test(frase));
      expect(infractoras).toEqual([]);
    });
  }

  it('el detector sí atrapa las formas de hoy (para que la prueba no pase por tener un patrón que nunca coincide)', () => {
    const detectadas = (frase: string): boolean => FORMAS_PROHIBIDAS.some(({ patron }) => patron.test(frase));
    expect(detectadas('Reviso `i < 3` (revisión 4): i vale 3, así que es falso y salgo del ciclo.')).toBe(true);
    expect(detectadas('Calculo `2 + 3`, que da 5. Creo la variable `suma` de tipo int y le guardo 5.')).toBe(true);
    expect(detectadas('Cada iteración suma uno.')).toBe(true);
    expect(detectadas('Java revisa `i < 3`. Con los valores de ahora queda `1 < 3`, que da `true`. Entra al cuerpo del `while`.')).toBe(false);
  });

  // V1 del maestro (panel R0): `true` y `false` son código TAMBIÉN cuando son un valor que se guarda o se calcula, no solo en las condiciones. Se quita lo que va entre comillas invertidas, « » y comillas
  // (el código, lo impreso y los String) y lo que queda no puede traer la palabra suelta.
  it('ninguna frase deja `true` o `false` sueltos: como valor van entre comillas invertidas (V1)', () => {
    const infractoras = TODAS_LAS_FRASES.filter((frase) => trueOFalseSuelto(frase));
    expect(infractoras).toEqual([]);
  });

  it('el detector de `true`/`false` sueltos atrapa las frases de antes y no se confunde con código, texto impreso ni String', () => {
    expect(trueOFalseSuelto('Java crea la variable `a` de tipo boolean y le guarda false.')).toBe(true);
    expect(trueOFalseSuelto('Java guarda true en `seEncontroNegativo`; antes valía false.')).toBe(true);
    expect(trueOFalseSuelto('Java calcula `3 > 5`, que da false.')).toBe(true);
    expect(trueOFalseSuelto('Java crea la variable `a` de tipo boolean y le guarda `false`.')).toBe(false);
    expect(trueOFalseSuelto('Java imprime en la consola: «true» y pasa a la línea siguiente.')).toBe(false);
    expect(trueOFalseSuelto('Java crea la variable `s` de tipo String y le guarda "true".')).toBe(false);
    expect(trueOFalseSuelto('Java revisa `activo == true`, que da `true`.')).toBe(false);
  });

  it('las frases con una condición dicen `true` o `false` entre comillas invertidas', () => {
    const deCondicion = EXPLICACIONES.filter((explicacion) => explicacion.clave === 'condicion-if' || explicacion.clave === 'condicion-ciclo').map((explicacion) => textoDeExplicacion(explicacion));
    expect(deCondicion.length).toBeGreaterThan(20);
    for (const frase of deCondicion) expect(frase).toMatch(/que (da|vale|ahora vale) `(true|false)`/);
  });

  it('los ciclos hablan de «vuelta»: toda repetición posterior a la primera cuenta cuál vuelta terminó', () => {
    const repeticiones = EXPLICACIONES.filter((explicacion) => explicacion.clave === 'condicion-ciclo' && explicacion.datos.vuelta > 1).map((explicacion) => textoDeExplicacion(explicacion));
    expect(repeticiones.length).toBeGreaterThan(8);
    for (const frase of repeticiones) expect(frase).toMatch(/Terminó la vuelta \d+/);
  });
});
