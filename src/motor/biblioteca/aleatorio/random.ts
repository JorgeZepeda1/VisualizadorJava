// Tarea 2.7 (REQ-BIB-005, design.md §3.7): `java.util.Random`, el generador congruencial lineal de 48 bits (multiplicador 0x5DEECE66D, incremento 0xB, máscara de 48 bits) en `BigInt`.
// Se reescribe desde la especificación pública de la clase (el algoritmo está en su Javadoc) y lo valida `corpus/datos/random/` (17 semillas × todos los métodos, JDK 17 real).
import { crearExcepcion } from '../excepciones/excepcion-java.ts';
import { potenciaDeDos } from '../numeros/potencia-de-dos.ts';

const MULTIPLICADOR = 0x5deece66dn;
const INCREMENTO = 0xbn;
const MASCARA_DE_48_BITS = (1n << 48n) - 1n;
/** 2^-53: `nextDouble` es un entero de 53 bits entre 2^53. */
const UNIDAD_DE_DOUBLE = potenciaDeDos(-53);
const DOS_A_LA_27 = 134217728;

export class RandomJava {
  /** Así viaja en la traza (`{ objeto: 'Random' }`) y así lo reconoce la instantánea del reintento. */
  readonly claseJava = 'Random' as const;
  private semilla: bigint;

  /** `new Random(semilla)`: la semilla se mezcla con el multiplicador y se enmascara a 48 bits (por eso `new Random(0)` y `new Random(Long.MIN_VALUE)` dan la misma secuencia). */
  constructor(semilla: bigint) {
    this.semilla = (semilla ^ MULTIPLICADOR) & MASCARA_DE_48_BITS;
  }

  /** La instantánea del reintento (hito 1, parte C): una sentencia que se queda sin entrada a medias no debe gastar números al azar. El estado de 48 bits es un `bigint`, inmutable, así que es su propia copia. */
  capturar(): bigint {
    return this.semilla;
  }

  restaurar(estado: bigint): void {
    this.semilla = estado;
  }

  /** `next(bits)`: avanza el estado y devuelve sus `bits` bits altos como `int` CON signo. */
  private siguiente(bits: number): number {
    this.semilla = (this.semilla * MULTIPLICADOR + INCREMENTO) & MASCARA_DE_48_BITS;
    return Number(BigInt.asIntN(32, this.semilla >> BigInt(48 - bits)));
  }

  nextInt(): number;
  nextInt(cota: number): number;
  nextInt(cota?: number): number {
    if (cota === undefined) return this.siguiente(32);
    if (cota <= 0) throw crearExcepcion('Random.nextInt/cota-no-positiva', 'bound must be positive');
    let bits = this.siguiente(31);
    // Potencia de 2: los bits altos bastan.
    if ((cota & -cota) === cota) return Number((BigInt(cota) * BigInt(bits)) >> 31n);
    // Si no, se rechazan los valores que sesgarían el resultado (el desbordamiento de `int` en `bits - valor + (cota - 1)` es la condición de rechazo).
    let valor = bits % cota;
    while (((bits - valor + (cota - 1)) | 0) < 0) {
      bits = this.siguiente(31);
      valor = bits % cota;
    }
    return valor;
  }

  /** Dos `nextInt` pegados: el primero en los 32 bits altos y el segundo SUMADO con su signo (por eso a veces el resultado no es "alto·2^32 + bajo"). */
  nextLong(): bigint {
    const alto = BigInt(this.siguiente(32));
    const bajo = BigInt(this.siguiente(32));
    return BigInt.asIntN(64, (alto << 32n) + bajo);
  }

  nextDouble(): number {
    const alto = this.siguiente(26);
    const bajo = this.siguiente(27);
    return (alto * DOS_A_LA_27 + bajo) * UNIDAD_DE_DOUBLE;
  }

  nextBoolean(): boolean {
    return this.siguiente(1) !== 0;
  }
}
