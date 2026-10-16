// Casos de `Math` para el oráculo (hito 1, parte A; tarea 2.6, REQ-BIB-004, design.md §4.4): `abs`, `max`, `min`, `sqrt`, `floor`, `ceil` y `round` con la sobrecarga que Java elige por tipo
// (`round(int)`, `round(long)` y `round(char)` NO existen: se resuelven a `round(float)`). Aquí solo se ENUMERAN las situaciones; el JDK 17 real dice el resultado.
import { type Azar, crearAzar } from './azar-determinista.ts';
import { type ArgumentoDeFormato } from './casos-de-formato.ts';

export interface CasoDeMatematica {
  readonly operacion: string;
  readonly argumentos: readonly ArgumentoDeFormato[];
}

const MIN_INT = -2147483648;
const MAX_INT = 2147483647;
const MIN_LONG = -9223372036854775808n;
const MAX_LONG = 9223372036854775807n;

const ENTEROS = [0, 1, -1, 5, -5, 100, -100, 16777216, 16777217, -16777217, 123456789, MAX_INT, MIN_INT, MAX_INT - 1, MIN_INT + 1];
const LARGOS = [0n, 1n, -1n, 123456789n, 16777217n, 9007199254740993n, -9007199254740993n, 4611686018427387905n, MAX_LONG, MIN_LONG, MAX_LONG - 1n, MIN_LONG + 1n];
const DOBLES = [
  0, -0, 0.5, -0.5, 1.5, -1.5, 2.5, -2.5, 0.49999999999999994, -0.49999999999999994, 0.2, -0.2, 1, -1, 2, 4, 0.25, 3.7, -3.7, 123456.789, 1e15 + 0.5, 4503599627370495.5, 4503599627370497, 2 ** 52, 2 ** 53, 9.223372036854776e18,
  1e19, -1e19, 9.223372036854775e18, -9.223372036854775e18, 1e300, 1e-300, Number.MIN_VALUE, -Number.MIN_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, Number.NaN, Infinity, -Infinity, 0.1 + 0.2, 2.675, 1 / 3,
];

export function casosDeMatematicas(azar: Azar = crearAzar(606)): CasoDeMatematica[] {
  const casos: CasoDeMatematica[] = [];
  const agregar = (operacion: string, ...argumentos: ArgumentoDeFormato[]): void => {
    casos.push({ operacion, argumentos });
  };
  const enteros = (valores: readonly number[]): ArgumentoDeFormato[] => valores.map((v) => ({ t: 'd', v }));
  const largos = (valores: readonly bigint[]): ArgumentoDeFormato[] => valores.map((v) => ({ t: 'l', v }));
  const dobles = (valores: readonly number[]): ArgumentoDeFormato[] => valores.map((v) => ({ t: 'D', v }));

  const enterosAlAzar = Array.from({ length: 80 }, () => azar.entre(-2_000_000_000, 2_000_000_000));
  const doblesAlAzar = Array.from({ length: 160 }, () => azar.entre(-1_000_000, 1_000_000) / 10 ** azar.entre(0, 5));
  const medios = Array.from({ length: 80 }, () => azar.entre(-1000, 1000) + 0.5);
  const largosAlAzar = Array.from({ length: 80 }, () => (azar.siguiente64() << 1n) >> BigInt(azar.entre(1, 40)));
  const todosLosEnteros = [...ENTEROS, ...enterosAlAzar];
  const todosLosLargos = [...LARGOS, ...largosAlAzar.map((v) => BigInt.asIntN(64, v))];
  const todosLosDobles = [...DOBLES, ...doblesAlAzar, ...medios];

  for (const a of enteros(todosLosEnteros)) agregar('absInt', a);
  for (const a of largos(todosLosLargos)) agregar('absLong', a);
  for (const a of dobles(todosLosDobles)) {
    agregar('absDouble', a);
    agregar('sqrt', a);
    agregar('floor', a);
    agregar('ceil', a);
    agregar('roundDouble', a);
  }
  for (const a of enteros(todosLosEnteros)) agregar('roundInt', a);
  for (const a of largos(todosLosLargos)) agregar('roundLong', a);
  for (const codigo of [65, 241, 0, 0xffff, 0x20ac, 97]) agregar('roundChar', { t: 'c', v: codigo });

  const paresDeEnteros = enteros([...ENTEROS, 7, -7, 3, 3]);
  for (const a of paresDeEnteros) for (const b of paresDeEnteros) for (const operacion of ['maxInt', 'minInt']) agregar(operacion, a, b);
  const paresDeLargos = largos([...LARGOS, 7n]);
  for (const a of paresDeLargos) for (const b of paresDeLargos) for (const operacion of ['maxLong', 'minLong']) agregar(operacion, a, b);
  const paresDeDobles = dobles([0, -0, 1.5, -1.5, Number.NaN, Infinity, -Infinity, Number.MIN_VALUE, 2.5, 100, -100, Number.MAX_VALUE]);
  for (const a of paresDeDobles) for (const b of paresDeDobles) for (const operacion of ['maxDouble', 'minDouble']) agregar(operacion, a, b);
  return casos;
}
