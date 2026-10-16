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

describe('RandomJava — instantánea para el reintento (hito 1, parte C)', () => {
  it('es un objeto de la biblioteca de clase Random (así viaja en la traza: { objeto: "Random" })', () => {
    expect(new RandomJava(1n).claseJava).toBe('Random');
  });

  it('restaurar devuelve el generador a lo que valía al capturar: una sentencia que se reintenta no gasta números al azar', () => {
    const azar = new RandomJava(12345n);
    const estado = azar.capturar();
    const primeros = [azar.nextInt(100), azar.nextInt(100), azar.nextInt(100)];
    azar.restaurar(estado);
    expect([azar.nextInt(100), azar.nextInt(100), azar.nextInt(100)]).toEqual(primeros);
    expect(primeros).toEqual([51, 80, 41]);
  });

  it('lo capturado no cambia aunque el generador siga avanzando (el estado es una copia)', () => {
    const azar = new RandomJava(7n);
    azar.nextLong();
    const estado = azar.capturar();
    const siguiente = azar.nextLong();
    azar.nextLong();
    azar.restaurar(estado);
    expect(azar.nextLong()).toBe(siguiente);
  });
});

describe('FuenteDeAleatorios — instantánea para el reintento (hito 1, parte C)', () => {
  it('es un objeto de la biblioteca de clase Random', () => {
    expect(new FuenteDeAleatorios(1n).claseJava).toBe('Random');
  });

  it('restaurar deshace las semillas que se derivaron: el new Random() de una sentencia reintentada vuelve a recibir la misma', () => {
    const fuente = new FuenteDeAleatorios(555n);
    const estado = fuente.capturar();
    const primera = fuente.nuevoSinSemilla().nextInt();
    fuente.restaurar(estado);
    expect(fuente.nuevoSinSemilla().nextInt()).toBe(primera);
  });

  it('restaurar deshace también el nacimiento del Random oculto de Math.random(): si no existía al capturar, vuelve a nacer con la misma semilla', () => {
    const fuente = new FuenteDeAleatorios(321n);
    const estado = fuente.capturar();
    const primero = fuente.mathRandom();
    const segundo = fuente.mathRandom();
    fuente.restaurar(estado);
    expect(fuente.mathRandom()).toBe(primero);
    expect(fuente.mathRandom()).toBe(segundo);
  });

  it('si el Random oculto ya existía al capturar, restaurar lo regresa a donde iba (no a su nacimiento)', () => {
    const fuente = new FuenteDeAleatorios(321n);
    fuente.mathRandom();
    const estado = fuente.capturar();
    const siguiente = fuente.mathRandom();
    fuente.mathRandom();
    fuente.restaurar(estado);
    expect(fuente.mathRandom()).toBe(siguiente);
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
