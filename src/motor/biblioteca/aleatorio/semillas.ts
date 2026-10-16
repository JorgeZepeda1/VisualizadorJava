// Tarea 2.7 (REQ-EJEC-008, design.md §3.7): la SEMILLA VISIBLE. Un programa con `new Random(12345)` es determinista y se reproduce idéntico. Pero `new Random()` y `Math.random()` no tienen
// semilla en el programa: la ejecución tiene una semilla visible `S` (6 dígitos por omisión, va en el enlace, con botones «repetir» y «nueva»). La k-ésima instancia sin semilla usa la
// k-ésima `nextLong()` de `new Random(S)` (derivar las semillas con un generador evita la correlación que tendrían semillas consecutivas del LCG) y la instancia oculta de `Math.random()`
// toma la siguiente en su PRIMERA llamada. El oráculo verifica esos programas transformándolos con la misma derivación (design.md §7.2, `transformar-semilla.ts`).
import { RandomJava } from './random.ts';

export class FuenteDeAleatorios {
  private readonly maestro: RandomJava;
  private ocultoDeMath: RandomJava | null = null;

  constructor(semillaVisible: bigint) {
    this.maestro = new RandomJava(semillaVisible);
  }

  /** `new Random()` sin semilla: la siguiente semilla derivada de la visible. */
  nuevoSinSemilla(): RandomJava {
    return new RandomJava(this.maestro.nextLong());
  }

  /** `Math.random()`: `nextDouble()` de la instancia oculta, que nace en la primera llamada. */
  mathRandom(): number {
    if (this.ocultoDeMath === null) this.ocultoDeMath = this.nuevoSinSemilla();
    return this.ocultoDeMath.nextDouble();
  }

  /** Una semilla visible nueva de 6 dígitos (100000–999999). `azar` es un `Math.random` inyectado: el motor no tiene azar propio (design.md §1.3), lo da quien lo usa (la interfaz). */
  static semillaVisibleNueva(azar: () => number): bigint {
    return 100000n + BigInt(Math.floor(azar() * 900000));
  }
}
