// Puerto fiel de java.util.Random (JDK 17, algoritmo LCG de 48 bits) a JavaScript con BigInt.
// Fuente verificada: java.base/java/util/Random.java del JDK 17 real (src.zip de Temurin 17.0.18).
'use strict';

const MULTIPLIER = 0x5DEECE66Dn;
const ADDEND = 0xBn;
const MASK = (1n << 48n) - 1n;

// Java `long` (64-bit) firmado, replicado con BigInt
function toSignedLong(x) {
  x = BigInt.asIntN(64, x);
  return x;
}

// Java `int` (32-bit) firmado, replicado con Number normal usando |0 tras enmascarar
function toSignedInt32(x) {
  // x puede venir como BigInt o Number
  if (typeof x === 'bigint') x = Number(BigInt.asIntN(32, x));
  return x | 0;
}

class JavaRandom {
  constructor(seed) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    // seed puede ser BigInt (recomendado) o Number entero seguro
    let s = typeof seed === 'bigint' ? seed : BigInt(seed);
    s = BigInt.asIntN(64, s); // normaliza a long de 64 bits con signo
    this.seed = (s ^ MULTIPLIER) & MASK;
  }

  next(bits) {
    this.seed = (this.seed * MULTIPLIER + ADDEND) & MASK;
    // (int)(seed >>> (48 - bits))  — desplazamiento sin signo de 48 bits, luego angosta a int de 32 bits
    const shifted = this.seed >> BigInt(48 - bits); // seed es no-negativo (0..2^48-1) asi que >> normal ya es >>> aqui
    return toSignedInt32(shifted);
  }

  nextInt() {
    return this.next(32);
  }

  nextIntBound(bound) {
    if (bound <= 0) throw new Error('bound debe ser positivo');
    let r = this.next(31);
    const m = bound - 1;
    if ((bound & m) === 0) {
      // bound es potencia de 2: (int)((bound * (long) r) >> 31)
      const prod = BigInt(bound) * BigInt(r); // r siempre >=0 (next(31) da 31 bits, no negativo)
      r = toSignedInt32(prod >> 31n);
    } else {
      // bucle de rechazo con aritmetica de 32 bits con signo (el punto clave del puerto)
      let u = r;
      r = u % bound;
      while (((u - r + m) | 0) < 0) {
        u = this.next(31);
        r = u % bound;
      }
    }
    return r;
  }

  nextDouble() {
    const hi = BigInt(this.next(26));
    const lo = BigInt(this.next(27));
    const combinado = (hi << 27n) + lo; // cabe holgado en Number (<=2^53)
    return Number(combinado) / Math.pow(2, 53);
  }

  nextBoolean() {
    return this.next(1) !== 0;
  }

  nextLong() {
    // ((long) next(32) << 32) + next(32)  — el segundo next(32) se SUMA como long
    // con signo (sign-extended), NO se enmascara a 32 bits sin signo. Enmascarar
    // aqui fue un bug real de este puerto, detectado al comparar contra el JDK real.
    const hi = BigInt.asIntN(32, BigInt(this.next(32)));
    const lo = BigInt.asIntN(32, BigInt(this.next(32)));
    const combinado = (hi << 32n) + lo;
    return BigInt.asIntN(64, combinado);
  }

  nextFloat() {
    return this.next(24) / Math.pow(2, 24);
  }
}

module.exports = { JavaRandom, toSignedInt32 };

// Si se ejecuta directamente, imprime las mismas secuencias que Test09Random.java
// para comparacion manual/automatica.
if (require.main === module) {
  const semillas = [0n, 1n, 42n, 12345n, -7n, 9223372036854775807n, -9223372036854775808n, -1n];
  for (const semilla of semillas) {
    console.log('semilla=' + semilla.toString());
    let r = new JavaRandom(semilla);
    let out = '  nextInt(): ';
    for (let i = 0; i < 6; i++) out += r.nextInt() + ' ';
    console.log(out);

    r = new JavaRandom(semilla);
    out = '  nextInt(100): ';
    for (let i = 0; i < 6; i++) out += r.nextIntBound(100) + ' ';
    console.log(out);

    r = new JavaRandom(semilla);
    out = '  nextInt(64) [potencia de 2]: ';
    for (let i = 0; i < 6; i++) out += r.nextIntBound(64) + ' ';
    console.log(out);

    r = new JavaRandom(semilla);
    out = '  nextDouble(): ';
    for (let i = 0; i < 5; i++) out += r.nextDouble() + ' ';
    console.log(out);

    r = new JavaRandom(semilla);
    out = '  nextBoolean(): ';
    for (let i = 0; i < 8; i++) out += r.nextBoolean() + ' ';
    console.log(out);

    r = new JavaRandom(semilla);
    out = '  nextLong(): ';
    for (let i = 0; i < 4; i++) out += r.nextLong().toString() + ' ';
    console.log(out);

    r = new JavaRandom(semilla);
    out = '  nextFloat(): ';
    for (let i = 0; i < 4; i++) out += r.nextFloat() + ' ';
    console.log(out);
  }
  console.log('=== patron clasico juego de adivinar con Random(semilla) ===');
  let rj = new JavaRandom(12345n);
  for (let i = 0; i < 5; i++) console.log('  nextInt(100)+1 = ' + (rj.nextIntBound(100) + 1));
  console.log('=== nextInt(bound) NO potencia de 2, semilla 1, buscar rechazo ===');
  let rr = new JavaRandom(1n);
  for (let i = 0; i < 10; i++) console.log('  nextInt(7) = ' + rr.nextIntBound(7));
}
