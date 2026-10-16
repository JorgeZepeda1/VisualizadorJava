// RED/GREEN de la tarea 2.8 (REQ-BIB-003, REQ-BIB-010, REQ-DIFF-003): `String.format` contra el JDK 17 REAL en `corpus/datos/printf/formatos-<región>.jsonl` — miles de combinaciones de valor,
// patrón y región (enteros, cadenas, `double` de aula y de las clases raras de `Double.toString`, plantillas de aula, errores de patrón y de tipo). Para los casos marcados `fuera` (válidos en
// Java pero fuera del alcance) el motor puede responder «No disponible» o dar EXACTAMENTE lo que dio Java; nunca otra cosa.
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../../../src/motor/biblioteca/excepciones/excepcion-java.ts';
import { type ArgumentoDeFormato, formatear } from '../../../src/motor/biblioteca/formato/formateador.ts';
import { type Regional } from '../../../src/motor/biblioteca/formato/regional.ts';
import { NoDisponibleEnEjecucion } from '../../../src/motor/biblioteca/no-disponible.ts';
import { doubleDeBits } from '../../../herramientas/oraculo/azar-determinista.ts';
import { desescaparCampo } from '../../../herramientas/oraculo/generar-conjuntos.ts';
import { leerConjunto } from './conjuntos.ts';

interface Registro {
  readonly f: string;
  readonly a: readonly string[];
  readonly r: string;
  readonly fuera?: true;
}

function decodificarArgumento(codificado: string): ArgumentoDeFormato {
  const valor = codificado.slice(2);
  switch (codificado[0]) {
    case 'd':
      return { tipo: 'int', valor: Number(valor) };
    case 'l':
      return { tipo: 'long', valor: BigInt(valor) };
    case 'D':
      return { tipo: 'double', valor: doubleDeBits(BigInt(`0x${valor}`)) };
    case 'c':
      return { tipo: 'char', valor: Number(valor) };
    case 'b':
      return { tipo: 'boolean', valor: valor === 'true' };
    default:
      return { tipo: 'String', valor: desescaparCampo(valor) };
  }
}

/** Lo que el motor contesta, escrito como la sonda: `OK:<texto>`, `EX:<clase>:<mensaje>` o `ND`. */
function contestar(registro: Registro, regional: Regional): string {
  try {
    return `OK:${formatear(registro.f, registro.a.map(decodificarArgumento), regional, 'String.format')}`;
  } catch (error) {
    if (error instanceof ExcepcionJava) return `EX:${error.clase}:${error.mensaje ?? 'null'}`;
    if (error instanceof NoDisponibleEnEjecucion) return 'ND';
    throw error;
  }
}

for (const regional of ['es-MX', 'es-ES'] as const) {
  describe(`printf / String.format contra el JDK 17 real — ${regional}`, () => {
    const registros = leerConjunto('printf', `formatos-${regional}.jsonl`)
      .split('\n')
      .filter((linea) => linea !== '')
      .map((linea) => JSON.parse(linea) as Registro);

    it('el conjunto es grande y trae casos de todas las clases', () => {
      expect(registros.length).toBeGreaterThan(regional === 'es-MX' ? 10_000 : 2_000);
      expect(registros.filter((r) => r.r.startsWith('EX:')).length).toBeGreaterThan(100);
      expect(registros.filter((r) => r.fuera === true).length).toBeGreaterThan(regional === 'es-MX' ? 30 : 5);
    });

    it('el 100 % de los casos dentro del alcance coincide byte a byte (valor o excepción con su mensaje)', () => {
      const fallos: string[] = [];
      let aprobados = 0;
      for (const registro of registros) {
        if (registro.fuera === true) continue;
        const obtenido = contestar(registro, regional);
        if (obtenido === registro.r) aprobados += 1;
        else if (fallos.length < 12) fallos.push(`${JSON.stringify(registro.f)} ${registro.a.join(' ')}\n    Java  ${JSON.stringify(registro.r)}\n    motor ${JSON.stringify(obtenido)}`);
      }
      expect(fallos).toEqual([]);
      expect(aprobados).toBeGreaterThan(regional === 'es-MX' ? 10_000 : 2_000);
    });

    it('fuera del alcance: «No disponible» o exactamente lo de Java, jamás otro valor', () => {
      const fallos: string[] = [];
      for (const registro of registros) {
        if (registro.fuera !== true) continue;
        const obtenido = contestar(registro, regional);
        if (obtenido !== 'ND' && obtenido !== registro.r && fallos.length < 12) fallos.push(`${JSON.stringify(registro.f)}: Java ${JSON.stringify(registro.r)}, motor ${JSON.stringify(obtenido)}`);
      }
      expect(fallos).toEqual([]);
    });
  });
}
