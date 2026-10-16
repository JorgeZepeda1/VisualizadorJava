// RED/GREEN de la tarea 2.14 (REQ-EJEC-006 biblioteca, REQ-DIFF-003): el `stderr` COMPLETO de cada escenario de `corpus/datos/marcos/excepciones.jsonl` —un programa real corrido en el JDK
// 17.0.18, con la excepción que Java lanza y todos sus marcos de `java.base`— contra el texto que arma la biblioteca al provocar lo mismo: la clase, el mensaje, los marcos (según el modo de
// falla, el *coder* de la cadena y la puerta `String.format`/`printf`) y la línea del marco del alumno. Cada escenario se reconstruye leyendo el `cuerpo` del programa; si alguno no se reconoce,
// la prueba falla (un escenario sin cubrir sería un `stderr` sin comparar).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ScannerJava } from '../../../src/motor/biblioteca/entrada/scanner.ts';
import { divisionEntreCero, ExcepcionJava } from '../../../src/motor/biblioteca/excepciones/excepcion-java.ts';
import { formatearTrazaDePila } from '../../../src/motor/biblioteca/excepciones/traza-de-pila.ts';
import { RandomJava } from '../../../src/motor/biblioteca/aleatorio/random.ts';
import { type ArgumentoDeFormato, formatear, type ViaDeFormato } from '../../../src/motor/biblioteca/formato/formateador.ts';
import { nuevaCadena } from '../../../src/motor/biblioteca/texto/cadena-java.ts';
import { Double, Integer } from '../../../src/motor/biblioteca/texto/envoltorios.ts';
import { StringJava } from '../../../src/motor/biblioteca/texto/string.ts';
import { CLASE_DE_LOS_ESCENARIOS, LINEA_DEL_CUERPO, type ResultadoDeEscenario } from '../../../herramientas/oraculo/escenarios-de-excepciones.ts';

const RAIZ = resolve(import.meta.dirname, '..', '..', '..');
const escenarios: ResultadoDeEscenario[] = readFileSync(resolve(RAIZ, 'corpus', 'datos', 'marcos', 'excepciones.jsonl'), 'utf-8')
  .split('\n')
  .filter((linea) => linea !== '')
  .map((linea) => JSON.parse(linea) as ResultadoDeEscenario);

// ---- Un intérprete de juguete para los cuerpos de una línea de los escenarios ----

function literalDeJava(texto: string): ArgumentoDeFormato {
  if (texto.startsWith('"')) return { tipo: 'String', valor: texto.slice(1, -1) };
  if (texto.startsWith("'")) return { tipo: 'char', valor: texto.charCodeAt(1) };
  if (texto === 'true' || texto === 'false') return { tipo: 'boolean', valor: texto === 'true' };
  if (texto.endsWith('L')) return { tipo: 'long', valor: BigInt(texto.slice(0, -1)) };
  if (texto.includes('.')) return { tipo: 'double', valor: Number(texto) };
  return { tipo: 'int', valor: Number(texto) };
}

/** Parte `"%d", 3.5, "a, b"` en sus literales respetando las comillas. */
function separarArgumentos(lista: string): string[] {
  const partes: string[] = [];
  let actual = '';
  let comillas = false;
  for (const caracter of lista) {
    if (caracter === '"') comillas = !comillas;
    if (caracter === ',' && !comillas) {
      partes.push(actual.trim());
      actual = '';
    } else {
      actual += caracter;
    }
  }
  if (actual.trim() !== '') partes.push(actual.trim());
  return partes;
}

function provocar(escenario: ResultadoDeEscenario): void {
  const { cuerpo, entrada } = escenario;
  let m: RegExpExecArray | null;
  if ((m = /^Scanner sc = new Scanner\(System\.in\); (sc\.close\(\); )?(?:\w+ \w+ = )?sc\.(\w+)\(\);$/.exec(cuerpo))) {
    const scanner = new ScannerJava('es-MX');
    scanner.agregarEntrada(entrada);
    scanner.cerrarEntrada();
    if (m[1] !== undefined) scanner.close();
    (scanner as unknown as Record<string, () => unknown>)[m[2] as string]!();
  } else if ((m = /^String s = "(.*)"; (?:\w+ \w+ = )s\.(charAt|substring)\((-?\d+)(?:, (-?\d+))?\);$/.exec(cuerpo))) {
    const cadena = nuevaCadena(m[1] as string);
    if (m[2] === 'charAt') StringJava.charAt(cadena, Number(m[3]));
    else if (m[4] === undefined) StringJava.substring(cadena, Number(m[3]));
    else StringJava.substring(cadena, Number(m[3]), Number(m[4]));
  } else if (/^(?:int|long) a = \d+L?; (?:int|long) b = 0L?; (?:int|long) c = a [/%] b;$/.test(cuerpo)) {
    throw divisionEntreCero();
  } else if ((m = /^(?:int n|double d) = (Integer\.parseInt|Double\.parseDouble)\("(.*)"\);$/.exec(cuerpo))) {
    if (m[1] === 'Integer.parseInt') Integer.parseInt(m[2] as string);
    else Double.parseDouble(m[2] as string);
  } else if ((m = /^Random r = new Random\((\d+)\); int n = r\.nextInt\((-?\d+)\);$/.exec(cuerpo))) {
    new RandomJava(BigInt(m[1] as string)).nextInt(Number(m[2]));
  } else if ((m = /^(?:String s = String\.format|System\.out\.printf)\((.*)\);$/.exec(cuerpo))) {
    const via: ViaDeFormato = cuerpo.startsWith('String s') ? 'String.format' : 'printf';
    const [formato, ...argumentos] = separarArgumentos(m[1] as string);
    formatear((formato as string).slice(1, -1), argumentos.map(literalDeJava), 'es-MX', via);
  } else {
    throw new Error(`Escenario sin reconocer: ${escenario.id}: ${cuerpo}`);
  }
}

function stderrDeLaBiblioteca(escenario: ResultadoDeEscenario): string {
  try {
    provocar(escenario);
  } catch (error) {
    if (error instanceof ExcepcionJava) {
      return formatearTrazaDePila(error, [{ paquete: null, clase: CLASE_DE_LOS_ESCENARIOS, metodo: 'main', linea: LINEA_DEL_CUERPO }]);
    }
    throw error;
  }
  throw new Error(`El escenario ${escenario.id} no lanzó ninguna excepción en la biblioteca.`);
}

describe('excepciones de la biblioteca contra el stderr del JDK 17 real (corpus/datos/marcos)', () => {
  it('hay escenarios de todas las operaciones con excepción (Scanner, String, parseo, aritmética, Random, formato)', () => {
    expect(escenarios.length).toBeGreaterThan(100);
    const familias = new Set(escenarios.map((e) => e.id.split('-')[0]));
    expect(familias).toEqual(new Set(['scanner', 'string', 'aritmetica', 'integer', 'double', 'random', 'formato']));
  });

  it('el stderr completo de CADA escenario coincide byte a byte', () => {
    const fallos: string[] = [];
    for (const escenario of escenarios) {
      const obtenido = stderrDeLaBiblioteca(escenario);
      if (obtenido !== escenario.stderr && fallos.length < 6) fallos.push(`${escenario.id}\n  Java:\n${escenario.stderr}  motor:\n${obtenido}`);
    }
    expect(fallos).toEqual([]);
  });
});
