// RED de la tarea 2.7 (REQ-BIB-005, REQ-EJEC-008, design.md §3.7): `java.util.Random` — el generador congruencial lineal de 48 bits — y la SEMILLA VISIBLE para los `new Random()` sin
// semilla y `Math.random()`. Los valores esperados son los de la especificación y los del JDK 17.0.18 (`pruebas/diferencial/biblioteca/random.test.ts` compara 17 semillas × todos los métodos).
import { describe, expect, it } from 'vitest';
import { ExcepcionJava } from '../excepciones/excepcion-java.ts';
import { RandomJava } from './random.ts';
import { FuenteDeAleatorios } from './semillas.ts';

describe('RandomJava — el LCG de java.util.Random', () => {
  it('la secuencia reproducible de la especificación: semilla 12345L, nextInt(100) + 1 → 52, 81, 42, 29, 56', () => {
    const azar = new RandomJava(12345n);
    expect([1, 2, 3, 4, 5].map(() => azar.nextInt(100) + 1)).toEqual([52, 81, 42, 29, 56]);
  });

  it('new Random(0) y new Random(Long.MIN_VALUE) dan la misma secuencia (la semilla se enmascara a 48 bits)', () => {
    const a = new RandomJava(0n);
    const b = new RandomJava(-9223372036854775808n);
    expect([a.nextInt(), a.nextInt(), a.nextInt()]).toEqual([b.nextInt(), b.nextInt(), b.nextInt()]);
    expect(new RandomJava(0n).nextInt()).toBe(-1155484576);
  });

  it('nextInt(bound) con bound potencia de 2 usa los bits altos y con otro bound rechaza los valores sesgados', () => {
    const potencia = new RandomJava(42n);
    expect([potencia.nextInt(16), potencia.nextInt(16), potencia.nextInt(16)]).toEqual([11, 0, 10]);
    const rechazo = new RandomJava(7n);
    // 1073741825 hace que el bucle de rechazo se dispare con frecuencia (más de la mitad de los valores de 31 bits se descartan).
    const valores = [0, 1, 2, 3, 4].map(() => rechazo.nextInt(1073741825));
    expect(valores.every((valor) => valor >= 0 && valor < 1073741825)).toBe(true);
  });

  it('nextLong junta dos nextInt con extensión de signo, nextDouble usa 53 bits y nextBoolean el bit más alto', () => {
    expect(new RandomJava(0n).nextLong()).toBe(-4962768465676381896n);
    expect(new RandomJava(0n).nextDouble()).toBe(0.730967787376657);
    expect(new RandomJava(0n).nextBoolean()).toBe(true);
  });

  it('nextInt(0) y nextInt(-5) lanzan IllegalArgumentException: bound must be positive', () => {
    let capturada: unknown;
    try {
      new RandomJava(1n).nextInt(0);
    } catch (error) {
      capturada = error;
    }
    expect(capturada).toBeInstanceOf(ExcepcionJava);
    expect((capturada as ExcepcionJava).clase).toBe('java.lang.IllegalArgumentException');
    expect((capturada as ExcepcionJava).mensaje).toBe('bound must be positive');
    expect((capturada as ExcepcionJava).sitio).toBe('Random.nextInt/cota-no-positiva');
  });
});

describe('FuenteDeAleatorios — la semilla visible (design.md §3.7)', () => {
  it('la k-ésima instancia sin semilla usa la k-ésima nextLong() de new Random(S)', () => {
    const fuente = new FuenteDeAleatorios(123456n);
    const maestro = new RandomJava(123456n);
    const primera = fuente.nuevoSinSemilla();
    const segunda = fuente.nuevoSinSemilla();
    expect(primera.nextInt()).toBe(new RandomJava(maestro.nextLong()).nextInt());
    expect(segunda.nextInt()).toBe(new RandomJava(maestro.nextLong()).nextInt());
  });

  it('la misma semilla visible repite la ejecución completa; otra semilla da otra', () => {
    const corrida = (semilla: bigint): number[] => {
      const fuente = new FuenteDeAleatorios(semilla);
      return [fuente.nuevoSinSemilla().nextInt(1000), fuente.nuevoSinSemilla().nextInt(1000), fuente.mathRandom() > 0 ? 1 : 0];
    };
    expect(corrida(777n)).toEqual(corrida(777n));
    expect(corrida(777n)).not.toEqual(corrida(778n));
  });

  it('Math.random() usa una instancia oculta que toma la siguiente semilla en su PRIMERA llamada y después sigue su propia secuencia', () => {
    const fuente = new FuenteDeAleatorios(99n);
    const maestro = new RandomJava(99n);
    const esperado = new RandomJava(maestro.nextLong());
    expect(fuente.mathRandom()).toBe(esperado.nextDouble());
    expect(fuente.mathRandom()).toBe(esperado.nextDouble());
    // Una instancia sin semilla creada después toma la semilla que sigue a la de Math.random().
    expect(fuente.nuevoSinSemilla().nextLong()).toBe(new RandomJava(maestro.nextLong()).nextLong());
  });

  it('la semilla visible por omisión tiene 6 dígitos (la que muestra la interfaz)', () => {
    expect(FuenteDeAleatorios.semillaVisibleNueva(() => 0.5)).toBe(550000n);
    const generada = FuenteDeAleatorios.semillaVisibleNueva(() => 0.123456789);
    expect(generada >= 100000n && generada <= 999999n).toBe(true);
  });
});
