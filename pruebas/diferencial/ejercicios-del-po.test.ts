// El ejercicio del PO (hito 1, parte C): `MaquinaSnacks`, un programa de clase con `Scanner`, `switch` sobre `String`, `toUpperCase`, `if` con `||`, acentos y símbolos (`$`), corrido con cinco entradas
// distintas —una por camino del programa— que el oráculo ejecutó en el JDK 17 real (`corpus/experimentos/ejercicios-del-po/`, goldens generados, nunca escritos a mano). El motor debe producir lo
// MISMO byte a byte: stdout, stderr y código de salida. Las salidas esperadas se escriben aquí a la vista para que el ejemplo se lea sin abrir el corpus; que coincidan con los goldens las vigila la
// segunda prueba (si alguien editara un golden a mano, fallaría).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compilar } from '../../src/motor/index.ts';
import { crearEjecucion } from '../../src/motor/interprete/ejecucion.ts';
import { compararConElGolden } from './comparar-con-el-golden.ts';

const CARPETA = 'corpus/experimentos/ejercicios-del-po';
const ENCABEZADO =
  '=== MÁQUINA DE SNACKS ===\n' + 'A1 Papas      $18\n' + 'A2 Galletas   $15\n' + 'B1 Agua       $12\n' + 'B2 Refresco   $22\n' + 'B3 Jugo       Agotado\n' + 'Código: ';

const CASOS: ReadonlyArray<{ readonly programa: string; readonly entrada: string; readonly salida: string; readonly camino: string }> = [
  {
    programa: 'maquina-snacks-a1-2-50',
    entrada: 'a1\n2\n50\n',
    salida: `${ENCABEZADO}Cantidad (1 a 3): Total: $36\nDinero: Entregando 2 x Papas. Cambio: $14\n`,
    camino: 'compra completa: el código en minúsculas se pasa a mayúsculas, 2 x $18 = $36 y sobran $14',
  },
  {
    programa: 'maquina-snacks-b2-3-40',
    entrada: 'b2\n3\n40\n',
    salida: `${ENCABEZADO}Cantidad (1 a 3): Total: $66\nDinero: Te faltan $26\n`,
    camino: 'el dinero no alcanza: 3 x $22 = $66 y faltan $26',
  },
  {
    programa: 'maquina-snacks-b3',
    entrada: 'b3\n',
    salida: `${ENCABEZADO}Producto agotado\n`,
    camino: 'el producto B3 está agotado: termina con `return` antes de pedir la cantidad',
  },
  {
    programa: 'maquina-snacks-z9',
    entrada: 'z9\n',
    salida: `${ENCABEZADO}Código inválido\n`,
    camino: 'un código que no existe cae en `default` del `switch`',
  },
  {
    programa: 'maquina-snacks-a2-5',
    entrada: 'a2\n5\n',
    salida: `${ENCABEZADO}Cantidad (1 a 3): Cantidad no válida\n`,
    camino: 'la cantidad 5 está fuera de 1 a 3: el `||` de la condición la rechaza',
  },
];

describe('el ejercicio del PO, MaquinaSnacks: el motor lo ejecuta idéntico al JDK 17 real, byte a byte, con cada una de sus cinco entradas', () => {
  it.each(CASOS.map((caso) => [caso.programa, caso] as const))('%s: stdout, stderr y código de salida idénticos al golden del oráculo', (nombre, caso) => {
    const id = `${CARPETA}/${nombre}.java`;
    const resultado = compararConElGolden(id, readFileSync(resolve(id), 'utf-8'));
    expect(resultado.estado, caso.camino).toBe('ejecutado');
    expect(resultado.diferencias.join('\n'), caso.camino).toBe('');
  });

  it.each(CASOS.map((caso) => [caso.programa, caso] as const))('%s: la salida que escribe esta prueba a la vista es la que el JDK produjo (los goldens no se editan a mano)', (nombre, caso) => {
    const base = resolve(CARPETA, nombre);
    expect(readFileSync(`${base}.entrada.txt`, 'utf-8'), `${caso.camino}: la entrada`).toBe(caso.entrada);
    expect(readFileSync(`${base}.salida`, 'utf-8'), caso.camino).toBe(caso.salida);
    expect(readFileSync(`${base}.errores`, 'utf-8'), 'sin errores').toBe('');
    expect((JSON.parse(readFileSync(`${base}.oraculo.json`, 'utf-8')) as { desenlace: string }).desenlace).toBe('normal');
  });

  it('los cinco programas son el MISMO código, tal cual lo escribió el PO: solo cambia la entrada', () => {
    const fuentes = new Set(CASOS.map((caso) => readFileSync(resolve(CARPETA, `${caso.programa}.java`), 'utf-8')));
    expect(fuentes.size).toBe(1);
    expect([...fuentes][0]).toContain('public class MaquinaSnacks');
  });

  // El modo interactivo (ADR 005 punto 4): el alumno teclea un renglón cuando el programa lo pide, y el resultado es el MISMO que con la entrada preparada. Aquí, con el `Scanner` real de la biblioteca.
  it.each(CASOS.map((caso) => [caso.programa, caso] as const))('%s: tecleando un renglón a la vez (modo interactivo) la salida es la misma que con la entrada preparada', (nombre, caso) => {
    const resultado = compilar(readFileSync(resolve(CARPETA, `${nombre}.java`), 'utf-8'));
    if (!resultado.ok) throw new Error('MaquinaSnacks debe compilar');
    const ejecucion = crearEjecucion(resultado.programa, { regional: 'es-MX', semilla: 0n, entradaPreparada: '', entradaInteractiva: true, limitePasos: 100_000, limiteCaracteres: 1_048_576 });
    const renglones = caso.entrada.match(/[^\n]*\n/g) ?? [];
    let salida = '';
    let eco = '';
    let esperas = 0;
    for (;;) {
      const avance = ejecucion.avanzar(1_000);
      for (const paso of avance.pasos) {
        for (const segmento of paso.salida ?? []) {
          if (segmento.flujo === 'out') salida += segmento.texto;
          if (segmento.flujo === 'eco') eco += segmento.texto;
        }
      }
      if (avance.estado === 'fin') {
        expect(avance.fin.causa).toBe('terminado');
        break;
      }
      expect(avance.estado).toBe('espera-entrada');
      ejecucion.darEntrada(renglones[esperas] as string);
      esperas += 1;
    }
    expect(salida, caso.camino).toBe(caso.salida);
    expect(eco, 'lo tecleado queda en el eco de la consola, renglón por renglón').toBe(caso.entrada);
    expect(esperas, 'el programa pide exactamente los renglones que lee').toBe(renglones.length);
  });
});
